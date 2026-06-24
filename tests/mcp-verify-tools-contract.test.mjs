import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const packageJsonPath = join(repoRoot, "package.json");

const expectedTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];

const getVersionOutputSchema = {
  type: "object",
  required: [
    "kind",
    "tool",
    "status",
    "coreVersion",
    "protocolVersion",
    "serverName",
    "serverVersion",
    "capabilities",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.getVersion" },
    status: { const: "ok" },
    coreVersion: { type: "string" },
    protocolVersion: { type: "string" },
    serverName: { type: "string" },
    serverVersion: { type: "string" },
    capabilities: {
      type: "object",
      required: [
        "toolsList",
        "getVersion",
        "serializeCanonicalJson",
        "verifyRun",
        "verifyArtifactFreshness",
        "replayMvpDemo",
        "resources",
        "prompts",
        "remoteMcp",
      ],
      additionalProperties: false,
      properties: {
        toolsList: { const: true },
        getVersion: { const: true },
        serializeCanonicalJson: { const: true },
        verifyRun: { const: true },
        verifyArtifactFreshness: { const: true },
        replayMvpDemo: { const: true },
        resources: { const: false },
        prompts: { const: false },
        remoteMcp: { const: false },
      },
    },
  },
};

const serializeCanonicalJsonOutputSchema = {
  type: "object",
  required: [
    "kind",
    "tool",
    "status",
    "serializationVersion",
    "canonicalJson",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "norma-mcp-tool-result" },
    tool: { const: "norma.serializeCanonicalJson" },
    status: { const: "ok" },
    serializationVersion: { type: "string" },
    canonicalJson: { type: "string" },
  },
};

const allowedOutputSchemasByToolName = new Map([
  ["norma.getVersion", getVersionOutputSchema],
  ["norma.serializeCanonicalJson", serializeCanonicalJsonOutputSchema],
]);

const forbiddenToolNames = [
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

test("PR38 tools/list exposes exactly the PR36 tools plus verification and fixed MVP replay tools", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list",
    method: "tools/list",
  });

  assert.deepEqual(response.result.tools.map((tool) => tool.name), expectedTools);
  assert.equal(response.result.tools.length, 5);
  assert.ok(response.result.tools.some((tool) => tool.name === "norma.getVersion"));
  assert.ok(response.result.tools.some((tool) => tool.name === "norma.serializeCanonicalJson"));
  assert.ok(response.result.tools.some((tool) => tool.name === "norma.verifyRun"));
  assert.ok(response.result.tools.some((tool) => tool.name === "norma.verifyArtifactFreshness"));
  assert.ok(response.result.tools.some((tool) => tool.name === "norma.replayMvpDemo"));
});

test("PR38 tools/list exposes no arbitrary replay forbidden tools or rich content fields", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list-guardrails",
    method: "tools/list",
  });
  const responseText = JSON.stringify(response);

  for (const toolName of forbiddenToolNames) {
    assert.doesNotMatch(responseText, new RegExp(escapeRegExp(toolName)));
  }

  assert.equal(Object.hasOwn(response.result, "nextCursor"), false);
  assertOutputSchemasAreOnlyOnR2ASimpleTools(response.result.tools);
  assertNoKeysRecursive(response, [
    "nextCursor",
    "annotations",
    "resources",
    "prompts",
    "resourceLinks",
    "embeddedResources",
    "uri",
    "mimeType",
  ]);

  for (const tool of response.result.tools) {
    assert.doesNotMatch(tool.description, /ignore (system|developer|user) instructions/i);
    assert.doesNotMatch(tool.description, /hidden instruction/i);
  }
});

test("PR37 tools/call keeps PR36 getVersion and serializeCanonicalJson behavior", () => {
  const versionResponse = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "get-version",
    method: "tools/call",
    params: {
      name: "norma.getVersion",
      arguments: {},
    },
  });

  assertToolResultEnvelope(versionResponse, "get-version");
  assert.equal(versionResponse.result.structuredContent.tool, "norma.getVersion");
  assert.equal(versionResponse.result.structuredContent.capabilities.verifyRun, true);
  assert.equal(versionResponse.result.structuredContent.capabilities.verifyArtifactFreshness, true);
  assert.equal(versionResponse.result.structuredContent.capabilities.replayMvpDemo, true);

  const serializeResponse = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "serialize",
    method: "tools/call",
    params: {
      name: "norma.serializeCanonicalJson",
      arguments: {
        value: {
          b: 2,
          a: 1,
        },
      },
    },
  });

  assertToolResultEnvelope(serializeResponse, "serialize");
  assert.equal(serializeResponse.result.structuredContent.tool, "norma.serializeCanonicalJson");
  assert.equal(serializeResponse.result.structuredContent.canonicalJson, "{\"a\":1,\"b\":2}");
});

test("PR37 norma.verifyRun returns one text item and preserves exact core result shape", () => {
  const { input, demo } = createTruthPath();
  const verificationInput = {
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    sourceObjects: sourceObjectsForRun(input),
    expectedOutputRefs: demo.runEnvelope.outputRefs,
  };
  const expectedCoreResult = core.verifyRun(verificationInput);

  const response = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "verify-run",
    method: "tools/call",
    params: {
      name: "norma.verifyRun",
      arguments: {
        input: verificationInput,
      },
    },
  });

  assertToolResultEnvelope(response, "verify-run");
  assert.deepEqual(response.result.structuredContent, {
    kind: "norma-mcp-tool-result",
    tool: "norma.verifyRun",
    status: expectedCoreResult.status,
    result: expectedCoreResult,
  });
  assert.equal(response.result.structuredContent.result.kind, "run-verification");
  assert.equal(response.result.structuredContent.result.status, "verified");
  assert.equal(response.result.structuredContent.result.replaySummary.replayAttempted, false);
});

test("PR37 norma.verifyRun preserves warnings errors mismatches provenance and artifactFreshness", () => {
  const { input, demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const verificationInput = {
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: {
      ...demo.packLock,
      contentIdentity: "different-content-identity",
    },
    operationContext: {
      ...demo.operationContext,
      operationVersion: "0.1.0-mismatch",
    },
    sourceObjects: sourceObjectsForRun(input),
    expectedOutputRefs: [{ kind: "construction", ref: "construction:changed" }],
    artifactFreshnessInputs: [freshnessInput(demo, { ...artifact, status: "stale" })],
    requireFreshArtifacts: true,
  };
  const expectedCoreResult = core.verifyRun(verificationInput);

  assert.equal(expectedCoreResult.status, "mismatch");
  assert.ok(expectedCoreResult.warnings.length > 0);
  assert.ok(expectedCoreResult.errors.length > 0);
  assert.ok(expectedCoreResult.mismatchCodes.length > 0);
  assert.ok(expectedCoreResult.provenance);
  assert.ok(Array.isArray(expectedCoreResult.artifactFreshness));

  const response = callTool("norma.verifyRun", { input: verificationInput }, "verify-run-preserve");
  assert.deepEqual(response.result.structuredContent.result, expectedCoreResult);
  assert.deepEqual(response.result.structuredContent.result.artifactFreshness, expectedCoreResult.artifactFreshness);
  assert.equal(response.result.structuredContent.status, expectedCoreResult.status);
});

test("PR37 norma.verifyRun rejects malformed MCP argument wrappers", () => {
  assertVerifyToolRejectsBadWrapper("norma.verifyRun");
});

test("PR37 norma.verifyArtifactFreshness returns one text item and preserves exact core result shape", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const verificationInput = freshnessInput(demo, artifact);
  const expectedCoreResult = core.verifyArtifactFreshness(verificationInput);

  const response = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "verify-artifact-freshness",
    method: "tools/call",
    params: {
      name: "norma.verifyArtifactFreshness",
      arguments: {
        input: verificationInput,
      },
    },
  });

  assertToolResultEnvelope(response, "verify-artifact-freshness");
  assert.deepEqual(response.result.structuredContent, {
    kind: "norma-mcp-tool-result",
    tool: "norma.verifyArtifactFreshness",
    status: expectedCoreResult.status,
    result: expectedCoreResult,
  });
  assert.equal(response.result.structuredContent.result.kind, "artifact-freshness-verification");
  assert.equal(response.result.structuredContent.result.status, "current");
});

test("PR37 norma.verifyArtifactFreshness preserves warnings errors stale refs and provenance", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const existingWarning = core.createCoreWarning({
    code: "ArtifactStale",
    message: "Existing artifact warning remains visible.",
    targetRef: artifact.id,
    sourceRef: { kind: "artifact", ref: artifact.id },
  });
  const existingError = core.createCoreError({
    code: "InvalidArtifactInput",
    message: "Existing artifact error remains visible.",
    targetRef: artifact.id,
  });
  const verificationInput = freshnessInput(
    demo,
    {
      ...artifact,
      status: "stale",
      warnings: [existingWarning],
      errors: [existingError],
    },
    {
      expectedSourceRefs: [{ kind: "surface", ref: "surface:changed" }],
      expectedOptions: { ...artifact.options, id: "changed-options" },
    },
  );
  const expectedCoreResult = core.verifyArtifactFreshness(verificationInput);

  assert.equal(expectedCoreResult.status, "invalid");
  assert.ok(expectedCoreResult.warnings.length > 0);
  assert.ok(expectedCoreResult.errors.length > 0);
  assert.ok(expectedCoreResult.staleSourceRefs.length > 0);
  assert.ok(expectedCoreResult.provenance);

  const response = callTool("norma.verifyArtifactFreshness", { input: verificationInput }, "verify-freshness-preserve");
  assert.deepEqual(response.result.structuredContent.result, expectedCoreResult);
  assert.equal(response.result.structuredContent.status, expectedCoreResult.status);
});

test("PR37 norma.verifyArtifactFreshness rejects malformed MCP argument wrappers", () => {
  assertVerifyToolRejectsBadWrapper("norma.verifyArtifactFreshness");
});

test("PR38 tools/call rejects arbitrary replay and forbidden tools as unknown tools", () => {
  for (const toolName of forbiddenToolNames) {
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id: `${toolName}-unknown`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: {},
      },
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: `${toolName}-unknown`,
      error: {
        code: -32602,
        message: `Unknown tool: ${toolName}`,
      },
    });
  }
});

test("PR37 resources prompts sampling elicitation and logging remain unimplemented", () => {
  for (const method of [
    "resources/list",
    "prompts/list",
    "sampling/createMessage",
    "elicitation/create",
    "logging/setLevel",
  ]) {
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id: `${method}-unsupported`,
      method,
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: `${method}-unsupported`,
      error: {
        code: -32601,
        message: "Method not found",
      },
    });
  }
});

test("PR37 notification-only input still produces no stdout response", () => {
  assert.equal(
    handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    ),
    null,
  );
  assert.equal(
    handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ),
    null,
  );

  const result = spawnSync(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input: `${JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/tools/list_changed",
    })}\n`,
    maxBuffer: 64 * 1024 * 1024,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, "");
});

test("PR38 spawned STDIO wrapper handles initialize list and all five tool calls", async () => {
  const { input, demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
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
        id: "spawn-get-version",
        method: "tools/call",
        params: {
          name: "norma.getVersion",
          arguments: {},
        },
      },
      {
        jsonrpc: "2.0",
        id: "spawn-serialize",
        method: "tools/call",
        params: {
          name: "norma.serializeCanonicalJson",
          arguments: {
            value: {
              b: 2,
              a: 1,
            },
          },
        },
      },
      {
        jsonrpc: "2.0",
        id: "spawn-verify-run",
        method: "tools/call",
        params: {
          name: "norma.verifyRun",
          arguments: {
            input: {
              run: demo.runEnvelope,
              mode: "audit_only",
              packLock: demo.packLock,
              operationContext: demo.operationContext,
            },
          },
        },
      },
      {
        jsonrpc: "2.0",
        id: "spawn-verify-freshness",
        method: "tools/call",
        params: {
          name: "norma.verifyArtifactFreshness",
          arguments: {
            input: freshnessInput(demo, artifact),
          },
        },
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

  assert.equal(stdoutLines.length, 7);
  for (const line of stdoutLines) {
    assert.doesNotMatch(line, /Usage|help text|diagnostic prose/i);
    assert.equal(JSON.parse(line).jsonrpc, "2.0");
  }

  assert.equal(JSON.parse(stdoutLines[0]).id, "spawn-init");
  assert.deepEqual(JSON.parse(stdoutLines[1]).result.tools.map((tool) => tool.name), expectedTools);
  assert.equal(JSON.parse(stdoutLines[2]).result.structuredContent.tool, "norma.getVersion");
  assert.equal(JSON.parse(stdoutLines[3]).result.structuredContent.canonicalJson, "{\"a\":1,\"b\":2}");
  assert.equal(JSON.parse(stdoutLines[4]).result.structuredContent.tool, "norma.verifyRun");
  assert.equal(JSON.parse(stdoutLines[5]).result.structuredContent.tool, "norma.verifyArtifactFreshness");
  assert.equal(JSON.parse(stdoutLines[6]).result.structuredContent.tool, "norma.replayMvpDemo");
  assert.equal(JSON.parse(stdoutLines[6]).result.structuredContent.result.status, "replayed");
});

test("PR37 package metadata remains unchanged and dependency-free", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(Object.hasOwn(packageJson, "bin"), false);
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "optionalDependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "peerDependencies"), false);

  for (const dependencyName of Object.keys(packageJson.devDependencies ?? {})) {
    assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
  }
});

test("PR37 runtime MCP code reads no env vars and uses no filesystem network or shell APIs", () => {
  const runtimeSource = [
    readFileSync(wrapperPath, "utf8"),
    readFileSync(protocolSourcePath, "utf8"),
  ].join("\n");

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

function createTruthPath() {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return { input, demo: result.output };
}

function sourceObjectsForRun(input) {
  const ruleSet = input.ratioPack.ruleSets.find((candidate) => candidate.id === input.ruleSetRef);
  assert.ok(ruleSet);

  return [
    {
      sourceRef: { kind: "mvp-demo-input", ref: "mvp-demo:structured-input" },
      sourceObject: { ...input, id: "mvp-demo:structured-input" },
    },
    { sourceRef: { kind: "surface", ref: input.surface.id }, sourceObject: input.surface },
    { sourceRef: { kind: "ratio-pack", ref: input.packRef }, sourceObject: input.ratioPack },
    { sourceRef: { kind: "rule-set", ref: input.ruleSetRef }, sourceObject: ruleSet },
    { sourceRef: { kind: "evaluation-profile", ref: input.evaluationProfile.id }, sourceObject: input.evaluationProfile },
    { sourceRef: { kind: "tolerance-policy", ref: input.tolerancePolicy.id }, sourceObject: input.tolerancePolicy },
    {
      sourceRef: { kind: "evaluation-tolerances", ref: input.evaluationTolerances.id },
      sourceObject: input.evaluationTolerances,
    },
    {
      sourceRef: { kind: "coordinate-system", ref: input.surface.coordinateSystem.id },
      sourceObject: input.surface.coordinateSystem,
    },
    { sourceRef: { kind: "metric-policy", ref: input.surface.metricPolicy.id }, sourceObject: input.surface.metricPolicy },
  ];
}

function sourceObjectsForArtifact(demo, artifact) {
  return artifact.sourceRefs.flatMap((sourceRef) => {
    if (sourceRef.kind === "core-result" && sourceRef.ref === "mvp-demo:construction") {
      return [{ sourceRef, result: demo.constructionResult }];
    }

    if (sourceRef.kind === "construction" && sourceRef.ref === demo.constructionResult.output.id) {
      return [demo.constructionResult.output];
    }

    return [];
  });
}

function freshnessInput(demo, artifact, overrides = {}) {
  return {
    artifact,
    sourceObjects: sourceObjectsForArtifact(demo, artifact),
    expectedSourceRefs: [...artifact.sourceRefs].reverse(),
    expectedOutputRefs: [...artifact.outputRefs].reverse(),
    expectedRunRef: artifact.runRef,
    expectedOptions: reverseObjectKeys(artifact.options),
    expectedOperationContextRef: demo.operationContext.ref,
    ...overrides,
  };
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)]),
  );
}

function callTool(toolName, toolArguments, id) {
  return parseToolResultResponse({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: toolArguments,
    },
  });
}

function assertVerifyToolRejectsBadWrapper(toolName) {
  const cases = [
    {
      id: `${toolName}-missing-arguments`,
      params: {
        name: toolName,
      },
    },
    {
      id: `${toolName}-non-object-arguments`,
      params: {
        name: toolName,
        arguments: "bad",
      },
    },
    {
      id: `${toolName}-array-arguments`,
      params: {
        name: toolName,
        arguments: [],
      },
    },
    {
      id: `${toolName}-missing-input`,
      params: {
        name: toolName,
        arguments: {},
      },
    },
    {
      id: `${toolName}-unknown-wrapper-field`,
      params: {
        name: toolName,
        arguments: {
          input: null,
          extra: true,
        },
      },
    },
  ];

  for (const testCase of cases) {
    assert.deepEqual(
      parseRequiredResponse({
        jsonrpc: "2.0",
        id: testCase.id,
        method: "tools/call",
        params: testCase.params,
      }),
      {
        jsonrpc: "2.0",
        id: testCase.id,
        error: {
          code: -32602,
          message: "Invalid params",
        },
      },
    );
  }
}

function assertToolResultEnvelope(response, id) {
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, id);
  assert.equal(response.result.isError, false);
  assert.equal(response.result.content.length, 1);
  assert.equal(response.result.content[0].type, "text");
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
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

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function assertOutputSchemasAreOnlyOnR2ASimpleTools(tools) {
  for (const tool of tools) {
    assert.equal(Object.hasOwn(tool, "annotations"), false);
    const expectedOutputSchema = allowedOutputSchemasByToolName.get(tool.name);

    if (expectedOutputSchema === undefined) {
      assert.equal(Object.hasOwn(tool, "outputSchema"), false, `${tool.name} must not declare outputSchema`);
      continue;
    }

    assert.deepEqual(tool.outputSchema, expectedOutputSchema);
    delete tool.outputSchema;
  }
}

function assertNoKeysRecursive(value, forbiddenKeys) {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoKeysRecursive(item, forbiddenKeys);
    }
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(forbiddenKeys.includes(key), false, `${key} must not be present`);
    assertNoKeysRecursive(nestedValue, forbiddenKeys);
  }
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

function isPlainRecord(value) {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
