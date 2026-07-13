import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";
import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const packageJsonPath = join(repoRoot, "package.json");
const missingArguments = Symbol("missingArguments");

const expectedTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const finalToolNames = [
  ...expectedTools,
  "norma.analyzeStructuredCompositionV1",
];

const replayMvpDemoOutputSchema = {
  type: "object",
  required: ["kind", "tool", "status", "result"],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.replayMvpDemo" },
    status: { type: "string" },
    result: {
      type: "object",
      required: ["kind", "status"],
      additionalProperties: true,
      properties: {
        kind: { const: "run-replay" },
        status: { type: "string" },
      },
    },
  },
};

const replayMvpDemoTool = {
  name: "norma.replayMvpDemo",
  title: "Replay Norma MVP demo",
  description: "Replay the fixed Norma Core MVP demo using existing in-memory demo data and existing replay semantics.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  outputSchema: replayMvpDemoOutputSchema,
};

const forbiddenToolNames = [
  "norma.runMvpDemoV1",
  "norma.replayRun",
  "norma.createRule",
  "norma.createPack",
  "norma.createRatio",
  "norma.createTolerancePolicy",
  "norma.createGeometry",
  "norma.modifyGeometry",
  "norma.optimizeComposition",
  "norma.recommendComposition",
  "norma.scoreBeauty",
  "norma.inferIntent",
  "norma.generateDesign",
  "norma.importImage",
  "norma.importCamera",
  "norma.importCAD",
  "norma.exportCAD",
  "norma.readFile",
  "norma.writeFile",
  "norma.deleteFile",
  "norma.networkFetch",
  "norma.shell",
  "norma.exec",
  "norma.publishPackage",
  "norma.npmPublish",
  "norma.gitTag",
  "norma.createSdk",
  "norma.createApi",
  "norma.createMcpServer",
];

test("R6C tools/list keeps fixed MVP replay as the fifth tool", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list",
    method: "tools/list",
  });

  assert.deepEqual(response.result.tools.map((tool) => tool.name), finalToolNames);
  assert.equal(response.result.tools.length, 6);
  assert.deepEqual(response.result.tools[4], replayMvpDemoTool);
  assert.equal(Object.hasOwn(response.result, "nextCursor"), false);
});

test("PR38 norma.replayMvpDemo returns the full core replay result in the MCP tool envelope", () => {
  const expectedCoreResult = expectedReplayResult();
  const response = callReplayMvpDemo({}, "replay-mvp-demo");

  assertToolResultEnvelope(response, "replay-mvp-demo");
  assert.deepEqual(response.result.structuredContent, {
    kind: "norma-mcp-tool-result",
    tool: "norma.replayMvpDemo",
    status: expectedCoreResult.status,
    result: expectedCoreResult,
  });
  assert.equal(response.result.structuredContent.result.kind, "run-replay");
  assert.equal(response.result.structuredContent.result.status, "replayed");
  assert.equal(response.result.structuredContent.result.operationName, "core.mvp-demo.run");
  assert.equal(response.result.structuredContent.result.replayAttempted, true);
  assert.deepEqual(response.result.structuredContent.result.mismatches, []);
  assert.deepEqual(response.result.structuredContent.result.errors, []);
  assert.deepEqual(response.result.structuredContent.result.packLockRef, expectedCoreResult.packLockRef);
  assert.deepEqual(response.result.structuredContent.result.operationContextRef, expectedCoreResult.operationContextRef);
  assert.equal(response.result.structuredContent.status, response.result.structuredContent.result.status);
  assertConformsToSchema(response.result.structuredContent, replayMvpDemoOutputSchema);
});

test("PR38 norma.replayMvpDemo accepts missing or empty arguments only and stays deterministic", () => {
  const expectedCoreResult = expectedReplayResult();
  const missingResponse = callReplayMvpDemo(missingArguments, "replay-missing-arguments");
  const emptyResponse = callReplayMvpDemo({}, "replay-empty-arguments");

  assertToolResultEnvelope(missingResponse, "replay-missing-arguments");
  assertToolResultEnvelope(emptyResponse, "replay-empty-arguments");
  assert.deepEqual(missingResponse.result.structuredContent.result, expectedCoreResult);
  assert.deepEqual(emptyResponse.result.structuredContent.result, expectedCoreResult);
  assert.deepEqual(missingResponse.result.structuredContent.result, emptyResponse.result.structuredContent.result);
  assert.equal(missingResponse.result.structuredContent.status, missingResponse.result.structuredContent.result.status);
  assert.equal(emptyResponse.result.structuredContent.status, emptyResponse.result.structuredContent.result.status);
  assertConformsToSchema(missingResponse.result.structuredContent, replayMvpDemoOutputSchema);
  assertConformsToSchema(emptyResponse.result.structuredContent, replayMvpDemoOutputSchema);
});

test("PR38 norma.replayMvpDemo rejects all caller-supplied replay inputs and options", () => {
  const invalidArgumentSets = [
    { run: {} },
    { mvpDemoInput: {} },
    { recordedMvpResult: {} },
    { sourceObjects: [] },
    { packLock: {} },
    { operationContext: {} },
    { expectedOutputRefs: [] },
    { artifactFreshnessInputs: [] },
    { requireFreshArtifacts: true },
    { mode: "replay_eligible" },
    { input: {} },
    { value: {} },
    { operationName: "core.mvp-demo.run" },
    { extra: true },
    "bad",
    1,
    true,
    null,
    [],
  ];

  for (const toolArguments of invalidArgumentSets) {
    const params =
      toolArguments === missingArguments
        ? { name: "norma.replayMvpDemo" }
        : { name: "norma.replayMvpDemo", arguments: toolArguments };

    assertInvalidParams({
      jsonrpc: "2.0",
      id: "replay-invalid-arguments",
      method: "tools/call",
      params,
    });
  }
});

test("PR38 keeps arbitrary replay and forbidden MCP tools unavailable", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list-guardrails",
    method: "tools/list",
  });
  const responseText = JSON.stringify(response);

  for (const toolName of forbiddenToolNames) {
    assert.doesNotMatch(responseText, new RegExp(escapeRegExp(toolName)));
    assert.deepEqual(
      parseRequiredResponse({
        jsonrpc: "2.0",
        id: `${toolName}-unknown`,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: {},
        },
      }),
      {
        jsonrpc: "2.0",
        id: `${toolName}-unknown`,
        error: {
          code: -32602,
          message: `Unknown tool: ${toolName}`,
        },
      },
    );
  }
});

test("PR38 spawned STDIO wrapper handles the fixed MVP replay demo tool before stdin closes", async () => {
  const child = spawn(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.setDefaultEncoding("utf8");

  let stdoutLines;
  try {
    stdoutLines = await readStdoutLinesBeforeClosingStdin(child, [
      {
        jsonrpc: "2.0",
        id: "spawn-init",
        method: "initialize",
      },
      {
        jsonrpc: "2.0",
        id: "spawn-tools-list",
        method: "tools/list",
      },
      {
        jsonrpc: "2.0",
        id: "spawn-replay-mvp-demo",
        method: "tools/call",
        params: {
          name: "norma.replayMvpDemo",
          arguments: {},
        },
      },
    ]);
  } finally {
    child.stdin.end();
    child.kill();
  }

  assert.equal(stdoutLines.length, 3);
  assert.deepEqual(JSON.parse(stdoutLines[1]).result.tools.map((tool) => tool.name), finalToolNames);
  assert.equal(JSON.parse(stdoutLines[2]).result.structuredContent.tool, "norma.replayMvpDemo");
  assert.equal(JSON.parse(stdoutLines[2]).result.structuredContent.result.status, "replayed");
});

test("PR38 replay MCP runtime stays local dependency-free and side-effect-free", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const runtimeSource = [
    readFileSync(wrapperPath, "utf8"),
    readFileSync(protocolSourcePath, "utf8"),
  ].join("\n");

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assertCurrentRemoteMcpPackageBoundary(packageJson);

  for (const dependencyName of Object.keys(packageJson.devDependencies ?? {})) {
    assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
  }

  assert.doesNotMatch(runtimeSource, /process\.env/);
  assert.doesNotMatch(runtimeSource, /CLAUDE_PROJECT_DIR/);
  assert.doesNotMatch(
    runtimeSource,
    /http|https|sse|streamable|websocket|express|fastify|oauth|auth|token|fetch\(|XMLHttpRequest|WebSocket/i,
  );
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:readFile|writeFile|deleteFile|networkFetch|shell|exec|spawn|child_process)\b/,
  );
});

function expectedReplayResult() {
  const mvpDemoInput = core.createMvpDemoInput();
  const demoResult = core.runMvpDemo(mvpDemoInput);
  assert.equal(demoResult.status, "ok");
  assert.ok(demoResult.output);

  return core.replayRun({
    run: demoResult.output.runEnvelope,
    mvpDemoInput,
    recordedMvpResult: demoResult.output,
    packLock: demoResult.output.packLock,
    operationContext: demoResult.output.operationContext,
  });
}

function callReplayMvpDemo(toolArguments, id) {
  const params = { name: "norma.replayMvpDemo" };
  if (toolArguments !== missingArguments) {
    params.arguments = toolArguments;
  }

  return parseToolResultResponse({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params,
  });
}

function parseToolsListResponse(message) {
  const response = parseRequiredResponse(message);
  assert.equal(response.jsonrpc, "2.0");
  assert.ok(Object.hasOwn(response, "result"));
  assert.ok(Array.isArray(response.result.tools));
  return response;
}

function parseToolResultResponse(message) {
  const response = parseRequiredResponse(message);
  assert.equal(response.jsonrpc, "2.0");
  assert.ok(Object.hasOwn(response, "result"));
  assert.ok(Array.isArray(response.result.content));
  assert.ok(Object.hasOwn(response.result, "structuredContent"));
  return response;
}

function assertToolResultEnvelope(response, id) {
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, id);
  assert.equal(response.result.isError, false);
  assert.equal(response.result.content.length, 1);
  assert.equal(response.result.content[0].type, "text");
  assert.equal(response.result.content[0].text, core.serializeCanonicalJson(response.result.structuredContent));
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
}

function assertConformsToSchema(value, schema, path = "structuredContent") {
  if (Object.hasOwn(schema, "const")) {
    assert.deepEqual(value, schema.const, `${path} must match const`);
  }

  if (schema.type !== undefined) {
    assert.equal(typeof value, schema.type, `${path} must be ${schema.type}`);
  }

  if (schema.type !== "object") {
    return;
  }

  assert.notEqual(value, null, `${path} must be an object`);
  assert.equal(Array.isArray(value), false, `${path} must not be an array`);
  const properties = schema.properties ?? {};

  for (const key of schema.required ?? []) {
    assert.equal(Object.hasOwn(value, key), true, `${path}.${key} is required`);
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      assert.equal(Object.hasOwn(properties, key), true, `${path}.${key} is not declared`);
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (Object.hasOwn(value, key)) {
      assertConformsToSchema(value[key], propertySchema, `${path}.${key}`);
    }
  }
}

function assertInvalidParams(message) {
  assert.deepEqual(parseRequiredResponse(message), {
    jsonrpc: "2.0",
    id: Object.hasOwn(message, "id") ? message.id : null,
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
}

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function readStdoutLinesBeforeClosingStdin(child, messages) {
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for stdout before stdin closed. stderr: ${stderr}`));
    }, 2_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const lines = stdout.split("\n");
      if (lines.length > messages.length) {
        clearTimeout(timeout);
        resolve(lines.slice(0, messages.length));
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (stdout.split("\n").length <= messages.length) {
        clearTimeout(timeout);
        reject(new Error(`Child exited before stdout lines. code=${code ?? ""} signal=${signal ?? ""}`));
      }
    });

    for (const message of messages) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
