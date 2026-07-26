// fallow-ignore-file unused-file
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import * as core from "./index.js";
import {
  assertMatchingPerformanceTruthIdentity,
  runPerformanceTruthCase,
  type PerformanceTruthClock,
  type PerformanceTruthLedgerRow,
  type PerformanceTruthScenario,
} from "./performance-truth-harness.js";
import {
  handleMcpJsonRpcMessage,
  handleMcpJsonRpcRequest,
} from "./mcp/stdio-protocol.js";
import { createRemoteMcpHttpServer } from "./mcp/remote-http-server.js";
import { RemoteMcpAdmissionController } from "./mcp/remote-http-limits.js";

const analyzeToolName = "norma.analyzeStructuredCompositionV1";
const protocolVersion = "2025-11-25";
const localTransportScenario = "mcp-streamable-http-authenticated-simple" as const;

type StructuredAnalysisResult = ReturnType<typeof core.analyzeStructuredCompositionV1>;
type StructuredAnalysisInput = Parameters<typeof core.analyzeStructuredCompositionV1>[0];

interface LocalServer {
  listen(port: number, host: string, callback: () => void): this;
  close(callback: (error?: Error) => void): this;
  once(event: "error", listener: (error: Error) => void): this;
  address(): { readonly port: number } | string | null;
}

interface ProviderFreeScenarioRequest {
  readonly scenario: PerformanceTruthScenario;
  readonly runNumber: number;
  readonly commitSha: string;
  readonly repoRoot: string;
  readonly clock: PerformanceTruthClock;
}

interface ToolResponse {
  readonly result: {
    readonly structuredContent: {
      readonly result: StructuredAnalysisResult;
    };
  };
}

export async function executePerformanceTruthScenario(
  options: ProviderFreeScenarioRequest,
): Promise<PerformanceTruthLedgerRow> {
  const input = await readScenario(
    options.repoRoot,
    options.scenario === "core-direct-boundary" ? "boundary-case" : "alignment-basic",
  );
  const direct = core.analyzeStructuredCompositionV1(structuredClone(input));
  const expectedIdentity = resultIdentity(direct);
  const caseOptions = {
    runNumber: options.runNumber,
    scenario: options.scenario,
    phase: "provider-free-characterization",
    commitSha: options.commitSha,
    clock: options.clock,
    expectedResultIdentity: expectedIdentity,
  };

  if (options.scenario === "core-direct-simple" || options.scenario === "core-direct-boundary") {
    return (await runPerformanceTruthCase({
      ...caseOptions,
      execute: async ({ measureStage, measureRequest }) => {
        const result = await measureRequest(() => measureStage(
          "core_ms",
          () => core.analyzeStructuredCompositionV1(structuredClone(input)),
        ));
        await measureStage("serialization_ms", () => core.serializeCanonicalJson(result));
        return characterizationResult(result);
      },
    })).row;
  }

  if (options.scenario === "mcp-stdio-simple") {
    const request = analyzeRequest(input, `characterization-stdio-${options.runNumber}`);
    const rawRequest = JSON.stringify(request);
    return (await runPerformanceTruthCase({
      ...caseOptions,
      execute: async ({ measureStage, measureRequest }) => {
        await measureStage("request_parse_ms", () => JSON.parse(rawRequest));
        const response = await measureRequest(() => measureStage(
          "mcp_dispatch_ms",
          () => parseToolResponse(handleMcpJsonRpcMessage(rawRequest)),
        ));
        const result = response.result.structuredContent.result;
        await measureStage("serialization_ms", () => core.serializeCanonicalJson(result));
        assertMatchingPerformanceTruthIdentity(expectedIdentity, resultIdentity(result));
        return characterizationResult(result);
      },
    })).row;
  }

  return executeLocalTransportScenario({
    caseOptions: { ...caseOptions, scenario: localTransportScenario },
    input,
    expectedIdentity,
  });
}

async function executeLocalTransportScenario({
  caseOptions,
  input,
  expectedIdentity,
}: {
  readonly caseOptions: {
    readonly runNumber: number;
    readonly scenario: typeof localTransportScenario;
    readonly phase: string;
    readonly commitSha: string;
    readonly clock: PerformanceTruthClock;
    readonly expectedResultIdentity: string;
  };
  readonly input: StructuredAnalysisInput;
  readonly expectedIdentity: string;
}): Promise<PerformanceTruthLedgerRow> {
  const admission = new RemoteMcpAdmissionController(() => 1_000);
  const config = runtimeConfig();
  const server = createRemoteMcpHttpServer(config, {
    verifyAccessToken: deterministicVerifier,
    admissionController: admission,
    log: () => {},
  }) as unknown as LocalServer;
  const port = await openLocalServer(server);
  config.publicUrl = new URL(`http://127.0.0.1:${port}/`);
  config.resourceUrl = new URL("/mcp", config.publicUrl);
  try {
    const initialized = await postLocalJson(port, initializeRequest());
    if (initialized.status !== 200) {
      throw new Error(`Local transport initialization failed with ${initialized.status}`);
    }
    const request = analyzeRequest(input, `characterization-local-${caseOptions.runNumber}`);
    const measured = await runPerformanceTruthCase({
      ...caseOptions,
      execute: async ({ measureStage, measureRequest }) => {
        await measureStage("request_parse_ms", () => JSON.parse(JSON.stringify(request)));
        await measureStage("auth_verify_ms", () => deterministicVerifier("local-characterization-access"));
        await measureStage("admission_ms", () => {
          const result = admission.enterAuthenticatedAttempt("local-characterization-subject");
          if (!result.allowed) throw new Error("Local admission unexpectedly denied");
          result.release();
          return result;
        });
        const localDispatch = await measureStage(
          "mcp_dispatch_ms",
          () => handleMcpJsonRpcRequest(request) as unknown as ToolResponse,
        );
        assertMatchingPerformanceTruthIdentity(
          expectedIdentity,
          resultIdentity(localDispatch.result.structuredContent.result),
        );
        await measureStage("serialization_ms", () => core.serializeCanonicalJson(localDispatch.result.structuredContent));
        const remote = await measureStage("transport_ms", () => measureRequest(() => postLocalJson(port, request)));
        if (remote.status !== 200) {
          throw new Error(`Local transport request failed with ${remote.status}`);
        }
        const result = (remote.json as ToolResponse).result.structuredContent.result;
        assertMatchingPerformanceTruthIdentity(expectedIdentity, resultIdentity(result));
        return characterizationResult(result);
      },
    });
    return measured.row;
  } finally {
    await closeLocalServer(server);
  }
}

function characterizationResult(result: StructuredAnalysisResult) {
  return {
    result,
    resultIdentity: resultIdentity(result),
    notes: "provider-free local characterization",
  };
}

async function readScenario(repoRoot: string, name: string): Promise<StructuredAnalysisInput> {
  return JSON.parse(
    await readFile(join(repoRoot, "examples", "structured-analyze", "scenarios", `${name}.json`), "utf8"),
  ) as StructuredAnalysisInput;
}

function resultIdentity(result: StructuredAnalysisResult): string {
  return `sha256:${createHash("sha256").update(core.serializeCanonicalJson(result)).digest("hex")}`;
}

function analyzeRequest(input: unknown, id: string) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: analyzeToolName, arguments: { input } },
  };
}

function initializeRequest() {
  return {
    jsonrpc: "2.0",
    id: "initialize",
    method: "initialize",
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "performance-characterization", version: "1.0.0" },
    },
  };
}

function runtimeConfig() {
  return {
    port: 3000,
    nodeEnv: "test" as const,
    publicUrl: new URL("http://127.0.0.1/"),
    resourceUrl: new URL("http://127.0.0.1/mcp"),
    issuer: new URL("https://tenant.example/"),
    issuerClaim: "https://tenant.example/",
    authorizationServerUrl: new URL("https://tenant.example/resources/norma"),
    jwksUrl: undefined,
    authorizationScope: "norma:structured-analyze",
    tenantClaim: undefined,
    authorizationDataMode: "disabled" as const,
    revocationMode: "disabled" as const,
    audience: "https://norma.example/api",
    auditHashKey: "performance-truth-local-audit-key-0001",
    revocationHashKey: undefined,
    allowedOrigins: new Set<string>(),
  };
}

async function deterministicVerifier(value: string) {
  if (value !== "local-characterization-access") throw new Error("local verifier rejected access value");
  return {
    rawToken: "local-characterization-access",
    subjectId: "local-characterization-subject",
    scopes: ["norma:structured-analyze"],
    clientId: "performance-characterization-client",
    expiresAt: 2_000,
  };
}

async function postLocalJson(port: number, body: unknown): Promise<{ readonly status: number; readonly json: unknown }> {
  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: {
      host: "127.0.0.1",
      authorization: "Bearer local-characterization-access",
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...(isInitializeRequest(body) ? {} : { "mcp-protocol-version": protocolVersion }),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: text === "" ? null : JSON.parse(text) };
}

function parseToolResponse(value: string | null): ToolResponse {
  if (value === null) throw new Error("Local STDIO dispatch returned no response");
  return JSON.parse(value) as ToolResponse;
}

function isInitializeRequest(value: unknown): value is { readonly method: "initialize" } {
  return typeof value === "object" && value !== null && "method" in value
    && value.method === "initialize";
}

async function openLocalServer(server: LocalServer): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Local server did not expose a TCP port"));
      } else {
        resolve(address.port);
      }
    });
  });
}

async function closeLocalServer(server: LocalServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error));
  });
}
