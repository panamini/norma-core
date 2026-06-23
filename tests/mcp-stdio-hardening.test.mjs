import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MCP_PROTOCOL_VERSION,
  MCP_RUN_MVP_DEMO_TOOL_NAME,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_STDIO_MAX_REQUEST_BYTES,
  MCP_STDIO_MAX_STRING_LENGTH,
  handleMcpJsonRpcMessage,
} from "../dist/src/mcp/stdio-protocol.js";
import {
  createCanonicalMvpDemoInputV1,
  runMvpDemoV1,
} from "../dist/src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const demoCliPath = join(repoRoot, "bin", "norma-core-mvp-demo.mjs");

test("PR5 initialize response preserves transport metadata and advertises tools", () => {
  const response = parseRequiredResponse(validInitializeRequest("init-1"));

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    result: {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "norma-core-mcp-stdio",
        version: "0.1.0-pr5",
      },
    },
    id: "init-1",
  });
  assert.equal(MCP_SERVER_NAME, "norma-core-mcp-stdio");
  assert.equal(MCP_SERVER_VERSION, "0.1.0-pr5");
});

test("PR4 initialize requires valid MCP params and preserves request id on invalid params", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "bare-init",
    method: "initialize",
  });

  assert.deepEqual(response, errorResponse("bare-init", -32602, "Invalid params", "MCP_INVALID_INPUT"));
});

test("PR4 JSON-RPC ids accept safe integers and reject decimal or null ids", () => {
  const integerResponse = parseRequiredResponse(validInitializeRequest(42));
  assert.equal(integerResponse.id, 42);
  assert.equal(integerResponse.result.protocolVersion, "2025-06-18");

  const decimalResponse = parseRequiredResponse({
    ...validInitializeRequest(1.5),
    id: 1.5,
  });
  assert.deepEqual(decimalResponse, errorResponse(null, -32600, "Invalid Request", "MCP_INVALID_INPUT"));

  const nullResponse = parseRequiredResponse({
    ...validInitializeRequest(null),
    id: null,
  });
  assert.deepEqual(nullResponse, errorResponse(null, -32600, "Invalid Request", "MCP_INVALID_INPUT"));
});

test("PR5 tools/list exposes only norma.runMvpDemoV1", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "tools-list",
    method: "tools/list",
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, "tools-list");
  assert.deepEqual(response.result.tools.map((tool) => tool.name), [MCP_RUN_MVP_DEMO_TOOL_NAME]);
  assert.equal(response.result.tools[0].inputSchema.properties.input.type, "object");
  assert.equal(response.result.tools[0].inputSchema.additionalProperties, false);
});

test("PR5 tools/call returns compact canonical MVP demo output", () => {
  const response = parseRequiredResponse(validRunMvpDemoToolCallRequest("run-demo"));
  const toolOutput = assertOkToolCallResponse(response);
  const expected = expectedToolOutputFromRun();

  assert.deepEqual(toolOutput, expected);
  assert.deepEqual(toolOutput.measurementCounts, { a: 6, b: 6 });
  assert.equal(toolOutput.status, "ok");
  assert.equal(toolOutput.replayReadiness.status, expected.replayReadiness.status);
  assert.equal("surface" in toolOutput, false);
  assert.equal("artifacts" in toolOutput, false);
  assert.equal("trace" in toolOutput, false);
});

test("PR5 tools/call accepts optional structured MVP demo input", () => {
  const input = createCanonicalMvpDemoInputV1();
  input.compositions.a.id = "composition:custom-a";
  input.compositions.b.id = "composition:custom-b";

  const response = parseRequiredResponse(validRunMvpDemoToolCallRequest("run-custom-demo", input));
  const toolOutput = assertOkToolCallResponse(response);

  assert.deepEqual(toolOutput, expectedToolOutputFromRun(input));
  assert.equal(toolOutput.evaluations.a.compositionRef, "composition:custom-a");
  assert.equal(toolOutput.evaluations.b.compositionRef, "composition:custom-b");
  assert.equal(toolOutput.comparison.selectedCompositionRef, "composition:custom-a");
  assert.equal(toolOutput.decision.selectedCompositionRef, "composition:custom-a");
});

test("PR5 MCP canonical output matches CLI result.json compact projection", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "norma-mcp-cli-parity-"));
  try {
    const cli = runDemoCli(["--out", outDir]);
    assert.equal(cli.status, 0, cli.stderr || cli.stdout);
    assert.match(cli.stdout, /NORMA_MVP_PROOF_PASS run:run:v1:[a-f0-9]+ measurements:6\/6 report:report\.html/);

    const cliResult = JSON.parse(await readFile(join(outDir, "result.json"), "utf8"));
    const response = parseRequiredResponse(validRunMvpDemoToolCallRequest("run-demo-parity"));

    assert.deepEqual(assertOkToolCallResponse(response), compactToolOutputFromMvpResult(cliResult));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("PR5 stdio initialize, tools/list, and tools/call succeed in sequence", () => {
  const result = runStdioServerRawLines([
    JSON.stringify(validInitializeRequest("stdio-init")),
    JSON.stringify({
      jsonrpc: "2.0",
      id: "stdio-list",
      method: "tools/list",
    }),
    JSON.stringify(validRunMvpDemoToolCallRequest("stdio-run")),
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, "");
  assertNoDiagnosticLeak(result.stderr + result.stdout);

  const lines = parseStdoutLines(result.stdout);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0].result.capabilities, { tools: {} });
  assert.deepEqual(lines[1].result.tools.map((tool) => tool.name), [MCP_RUN_MVP_DEMO_TOOL_NAME]);
  assert.deepEqual(assertOkToolCallResponse(lines[2]), expectedToolOutputFromRun());
});

test("PR4 invalid JSON returns JSON-RPC parse error with null id", () => {
  assert.deepEqual(
    parseRawResponse("{ invalid json"),
    errorResponse(null, -32700, "Parse error", "MCP_INVALID_INPUT"),
  );
});

test("PR4 excessive depth returns Invalid params with preserved id and Norma label", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "depth-2000",
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: nestedObject(2_000),
    },
  });

  assert.deepEqual(response, errorResponse("depth-2000", -32602, "Invalid params", "MCP_INPUT_TOO_DEEP"));
});

test("PR4 excessive string length returns Invalid params with preserved id and Norma label", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "string-over-limit",
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "x".repeat(MCP_STDIO_MAX_STRING_LENGTH + 1),
        version: "0.0.0",
      },
    },
  });

  assert.deepEqual(response, errorResponse("string-over-limit", -32602, "Invalid params", "MCP_STRING_TOO_LONG"));
});

test("PR4 raw payload over the byte limit returns request-too-large with null id", () => {
  const response = parseRawResponse(rawInitializeWithTargetBytes(MCP_STDIO_MAX_REQUEST_BYTES + 1));

  assert.deepEqual(response, errorResponse(null, -32000, "Request too large", "MCP_TOO_LARGE"));
});

test("PR4 stdio wrapper normalizes CRLF at the raw byte limit", () => {
  const rawLimitLine = rawInitializeWithTargetBytes(MCP_STDIO_MAX_REQUEST_BYTES);
  const result = runStdioServerRawInput(`${rawLimitLine}\r\n${JSON.stringify(validInitializeRequest("after-crlf"))}\n`);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, "");
  assertNoDiagnosticLeak(result.stderr + result.stdout);

  const lines = parseStdoutLines(result.stdout);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], errorResponse("raw-byte-limit", -32602, "Invalid params", "MCP_STRING_TOO_LONG"));
  assert.equal(lines[1].id, "after-crlf");
  assert.deepEqual(lines[1].result.capabilities, { tools: {} });
});

test("PR4 stdio process survives malformed, deep, long, and oversized input before valid initialize", () => {
  const result = runStdioServerRawLines([
    "{ invalid json",
    JSON.stringify({
      jsonrpc: "2.0",
      id: "depth-2000",
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: nestedObject(2_000),
      },
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: "string-over-limit",
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: "x".repeat(MCP_STDIO_MAX_STRING_LENGTH + 1),
          version: "0.0.0",
        },
      },
    }),
    rawInitializeWithTargetBytes(MCP_STDIO_MAX_REQUEST_BYTES + 1),
    JSON.stringify(validInitializeRequest("after-failures")),
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, "");
  assertNoDiagnosticLeak(result.stderr + result.stdout);

  const lines = parseStdoutLines(result.stdout);
  assert.equal(lines.length, 5);
  assert.deepEqual(lines.slice(0, 4), [
    errorResponse(null, -32700, "Parse error", "MCP_INVALID_INPUT"),
    errorResponse("depth-2000", -32602, "Invalid params", "MCP_INPUT_TOO_DEEP"),
    errorResponse("string-over-limit", -32602, "Invalid params", "MCP_STRING_TOO_LONG"),
    errorResponse(null, -32000, "Request too large", "MCP_TOO_LARGE"),
  ]);

  assert.equal(lines[4].jsonrpc, "2.0");
  assert.equal(lines[4].id, "after-failures");
  assert.equal(lines[4].result.protocolVersion, "2025-06-18");
  assert.deepEqual(lines[4].result.capabilities, { tools: {} });
});

function validInitializeRequest(id) {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "0.0.0",
      },
    },
  };
}

function validRunMvpDemoToolCallRequest(id, input = undefined) {
  const args = input === undefined ? {} : { input };
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: MCP_RUN_MVP_DEMO_TOOL_NAME,
      arguments: args,
    },
  };
}

function errorResponse(id, code, message, normaCode) {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
      data: {
        normaCode,
      },
    },
    id,
  };
}

function parseRequiredResponse(message) {
  return parseRawResponse(JSON.stringify(message));
}

function parseRawResponse(rawLine) {
  const response = handleMcpJsonRpcMessage(rawLine);
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function parseStdoutLines(stdout) {
  return stdout.trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function assertOkToolCallResponse(response) {
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.result.isError, false);
  assert.equal(response.result.content.length, 1);
  assert.equal(response.result.content[0].type, "text");
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
  return response.result.structuredContent;
}

function expectedToolOutputFromRun(input = createCanonicalMvpDemoInputV1()) {
  const result = runMvpDemoV1(input);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return compactToolOutputFromMvpResult(result.output);
}

function compactToolOutputFromMvpResult(result) {
  return {
    status: "ok",
    runRef: result.run.runRef.id,
    measurementCounts: result.summary.measurementCounts,
    evaluations: result.summary.evaluationSummaries,
    comparison: {
      comparisonRef: result.comparison.comparisonRef,
      status: result.comparison.status,
      scoreA: result.comparison.scoreA,
      scoreB: result.comparison.scoreB,
      signedScoreDelta: result.comparison.signedScoreDelta,
      absoluteScoreDelta: result.comparison.absoluteScoreDelta,
      confidenceA: result.comparison.confidenceA,
      confidenceB: result.comparison.confidenceB,
      selectedCompositionRef: result.comparison.selectedCompositionRef,
    },
    decision: {
      decisionRef: result.decision.decisionRef,
      status: result.decision.status,
      selectedEvaluationRef: result.decision.selectedEvaluationRef,
      selectedCompositionRef: result.decision.selectedCompositionRef,
    },
    replayReadiness: {
      reportRef: result.replayReadinessReport.reportRef,
      status: result.replayReadinessReport.status,
      mismatchCount: result.replayReadinessReport.mismatches.length,
      missingSourceCount: result.replayReadinessReport.missingSources.length,
      staleArtifactRefCount: result.replayReadinessReport.staleArtifactRefs.length,
    },
  };
}

function runStdioServerRawLines(rawLines) {
  return runStdioServerRawInput(`${rawLines.join("\n")}\n`);
}

function runStdioServerRawInput(input) {
  return spawnSync(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runDemoCli(args) {
  return spawnSync(process.execPath, [demoCliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function nestedObject(depth) {
  let value = {
    name: "test-client",
    version: "0.0.0",
  };
  for (let index = 0; index < depth; index += 1) {
    value = {
      next: value,
    };
  }
  return value;
}

function rawInitializeWithTargetBytes(targetBytes) {
  const request = validInitializeRequest("raw-byte-limit");
  request.params.clientInfo.name = "";

  const overhead = Buffer.byteLength(JSON.stringify(request), "utf8");
  const payloadBytes = targetBytes - overhead;
  assert.ok(payloadBytes >= 0);

  request.params.clientInfo.name = "x".repeat(payloadBytes);
  const rawLine = JSON.stringify(request);
  assert.equal(Buffer.byteLength(rawLine, "utf8"), targetBytes);
  return rawLine;
}

function assertNoDiagnosticLeak(text) {
  assert.doesNotMatch(text, /RangeError|Maximum call stack|file:\/\/|\/Volumes\/|\/Users\/|\/dist\/|\/src\/|\bat\s+/);
}
