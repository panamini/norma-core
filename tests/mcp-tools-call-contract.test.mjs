import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CORE_VERSION } from "../dist/src/core-constants.js";
import {
  STABLE_SERIALIZATION_VERSION,
  serializeCanonicalJson,
} from "../dist/src/serialization.js";
import {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  handleMcpJsonRpcMessage,
  handleMcpJsonRpcRequest,
} from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const packageJsonPath = join(repoRoot, "package.json");

const pr72MaxRequestBytes = 524_288;
const pr72MaxJsonDepth = 64;
const pr72MaxStringLength = 65_536;

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

function complexToolOutputSchema(tool, resultKind) {
  return {
    type: "object",
    required: ["kind", "tool", "status", "result"],
    additionalProperties: false,
    properties: {
      kind: { const: "norma-mcp-tool-result" },
      tool: { const: tool },
      status: { type: "string" },
      result: {
        type: "object",
        required: ["kind", "status"],
        additionalProperties: true,
        properties: {
          kind: { const: resultKind },
          status: { type: "string" },
        },
      },
    },
  };
}

const verifyRunOutputSchema = complexToolOutputSchema("norma.verifyRun", "run-verification");
const verifyArtifactFreshnessOutputSchema = complexToolOutputSchema(
  "norma.verifyArtifactFreshness",
  "artifact-freshness-verification",
);
const replayMvpDemoOutputSchema = complexToolOutputSchema("norma.replayMvpDemo", "run-replay");

const expectedTools = [
  {
    name: "norma.getVersion",
    title: "Get Norma Core version",
    description: "Return Norma Core version and MCP capability metadata.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: getVersionOutputSchema,
  },
  {
    name: "norma.serializeCanonicalJson",
    title: "Serialize canonical JSON",
    description: "Return deterministic canonical JSON for an explicit structured value.",
    inputSchema: {
      type: "object",
      required: ["value"],
      additionalProperties: false,
      properties: {
        value: {},
        policy: {
          type: "string",
        },
      },
    },
    outputSchema: serializeCanonicalJsonOutputSchema,
  },
  {
    name: "norma.verifyRun",
    title: "Verify Norma run",
    description: "Verify an explicit Norma run envelope using existing Norma Core verification semantics.",
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: {},
      },
    },
    outputSchema: verifyRunOutputSchema,
  },
  {
    name: "norma.verifyArtifactFreshness",
    title: "Verify artifact freshness",
    description: "Verify explicit artifact freshness using existing Norma Core artifact freshness semantics.",
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: {},
      },
    },
    outputSchema: verifyArtifactFreshnessOutputSchema,
  },
  {
    name: "norma.replayMvpDemo",
    title: "Replay Norma MVP demo",
    description: "Replay the fixed Norma Core MVP demo using existing in-memory demo data and existing replay semantics.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    outputSchema: replayMvpDemoOutputSchema,
  },
];
const structuredAnalyzeToolName = "norma.analyzeStructuredCompositionV1";
const finalToolNames = [
  ...expectedTools.map((tool) => tool.name),
  structuredAnalyzeToolName,
];
const structuredAnalyzeAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
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

test("R6C tools/list still preserves PR36-PR38 tools before Structured Analyze", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list",
    method: "tools/list",
  });

  assert.deepEqual(response.result.tools.slice(0, 5), expectedTools);
  assert.deepEqual(response.result.tools.map((tool) => tool.name), finalToolNames);
  assert.equal(response.result.tools[5].name, structuredAnalyzeToolName);
  assert.deepEqual(response.result.tools[5].annotations, structuredAnalyzeAnnotations);
});

test("PR36 tools/list descriptions are no longer PR35 discovery-only text", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list-descriptions",
    method: "tools/list",
  });

  for (const tool of response.result.tools) {
    assert.doesNotMatch(tool.description, /PR35/i);
    assert.doesNotMatch(tool.description, /discovery only/i);
    assert.doesNotMatch(tool.description, /implemented in a later PR/i);
  }
});

test("PR38 tools/list does not expose arbitrary replay forbidden tools or rich content fields", () => {
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
  assertNoKeysRecursive(response, [
    "nextCursor",
    "resourceLinks",
    "embeddedResources",
    "uri",
    "mimeType",
  ]);
  for (const tool of response.result.tools.slice(0, 5)) {
    assert.equal(Object.hasOwn(tool, "annotations"), false);
  }
  assert.deepEqual(response.result.tools[5].annotations, structuredAnalyzeAnnotations);
});

test("PR36 tools/call getVersion returns one JSON text item plus structuredContent", () => {
  const response = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "get-version",
    method: "tools/call",
    params: {
      name: "norma.getVersion",
      arguments: {},
    },
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, "get-version");
  assert.equal(response.result.isError, false);
  assert.equal(response.result.content.length, 1);
  assert.equal(response.result.content[0].type, "text");
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
  assertConformsToSchema(response.result.structuredContent, getVersionOutputSchema);
});

test("PR36 getVersion structuredContent has exact version and capability fields", () => {
  const response = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "get-version-shape",
    method: "tools/call",
    params: {
      name: "norma.getVersion",
      arguments: {},
    },
  });

  assert.deepEqual(response.result.structuredContent, {
    kind: "norma-mcp-tool-result",
    tool: "norma.getVersion",
    status: "ok",
    coreVersion: CORE_VERSION,
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverName: MCP_SERVER_NAME,
    serverVersion: MCP_SERVER_VERSION,
    capabilities: {
      toolsList: true,
      getVersion: true,
      serializeCanonicalJson: true,
      verifyRun: true,
      verifyArtifactFreshness: true,
      replayMvpDemo: true,
      resources: false,
      prompts: false,
      remoteMcp: false,
    },
  });
});

test("PR36 getVersion accepts missing arguments and rejects malformed arguments", () => {
  assert.equal(
    parseToolResultResponse({
      jsonrpc: "2.0",
      id: "get-version-missing-arguments",
      method: "tools/call",
      params: {
        name: "norma.getVersion",
      },
    }).result.structuredContent.tool,
    "norma.getVersion",
  );

  for (const toolArguments of [{ extra: true }, "bad", 1, true, null, []]) {
    assertInvalidParams({
      jsonrpc: "2.0",
      id: "get-version-invalid-arguments",
      method: "tools/call",
      params: {
        name: "norma.getVersion",
        arguments: toolArguments,
      },
    });
  }
});

test("PR36 serializeCanonicalJson returns deterministic canonical JSON", () => {
  const value = {
    b: 2,
    a: 1,
  };
  const response = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "serialize",
    method: "tools/call",
    params: {
      name: "norma.serializeCanonicalJson",
      arguments: {
        value,
      },
    },
  });

  assert.deepEqual(response.result.structuredContent, {
    kind: "norma-mcp-tool-result",
    tool: "norma.serializeCanonicalJson",
    status: "ok",
    serializationVersion: STABLE_SERIALIZATION_VERSION,
    canonicalJson: "{\"a\":1,\"b\":2}",
  });
  assert.equal(response.result.structuredContent.canonicalJson, serializeCanonicalJson(value));
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
  assertConformsToSchema(response.result.structuredContent, serializeCanonicalJsonOutputSchema);
});

test("PR36 serializeCanonicalJson accepts the explicit current policy string", () => {
  const response = parseToolResultResponse({
    jsonrpc: "2.0",
    id: "serialize-explicit-policy",
    method: "tools/call",
    params: {
      name: "norma.serializeCanonicalJson",
      arguments: {
        value: {
          b: 2,
          a: 1,
        },
        policy: STABLE_SERIALIZATION_VERSION,
      },
    },
  });

  assert.equal(response.result.structuredContent.serializationVersion, STABLE_SERIALIZATION_VERSION);
  assert.equal(response.result.structuredContent.canonicalJson, "{\"a\":1,\"b\":2}");
});

test("PR36 serializeCanonicalJson rejects invalid arguments", () => {
  const invalidArgumentSets = [
    undefined,
    {},
    { policy: STABLE_SERIALIZATION_VERSION },
    { value: { a: 1 }, policy: "unknown-policy" },
    { value: { a: 1 }, policy: 1 },
    { value: { a: 1 }, extra: true },
    "bad",
    1,
    true,
    null,
    [],
  ];

  for (const toolArguments of invalidArgumentSets) {
    const params =
      toolArguments === undefined
        ? { name: "norma.serializeCanonicalJson" }
        : { name: "norma.serializeCanonicalJson", arguments: toolArguments };

    assertInvalidParams({
      jsonrpc: "2.0",
      id: "serialize-invalid-arguments",
      method: "tools/call",
      params,
    });
  }
});

test("PR36 serializeCanonicalJson rejects direct non JSON-compatible values", () => {
  const circular = {};
  circular.self = circular;

  for (const value of [undefined, Number.NaN, Number.POSITIVE_INFINITY, () => null, Symbol("bad"), 1n, new Date(), circular]) {
    const response = handleMcpJsonRpcRequest({
      jsonrpc: "2.0",
      id: "serialize-direct-invalid-value",
      method: "tools/call",
      params: {
        name: "norma.serializeCanonicalJson",
        arguments: {
          value,
        },
      },
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: "serialize-direct-invalid-value",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    });
  }
});

test("PR72 bounds parsed MCP JSON depth without changing valid canonical serialization", () => {
  const atLimit = parseToolResultResponse(canonicalJsonRequest("serialize-depth-limit", nestedValue(60)));
  assert.equal(atLimit.result.structuredContent.tool, "norma.serializeCanonicalJson");

  assert.deepEqual(parseRequiredResponse(canonicalJsonRequest("serialize-depth-over-limit", nestedValue(61))), {
    jsonrpc: "2.0",
    id: "serialize-depth-over-limit",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
});

test("PR72 bounds MCP string values and object keys", () => {
  const atValueLimit = parseToolResultResponse(
    canonicalJsonRequest("serialize-string-limit", "x".repeat(pr72MaxStringLength)),
  );
  assert.equal(atValueLimit.result.structuredContent.canonicalJson.length > pr72MaxStringLength, true);

  assert.deepEqual(
    parseRequiredResponse(canonicalJsonRequest("serialize-string-over-limit", "x".repeat(pr72MaxStringLength + 1))),
    {
      jsonrpc: "2.0",
      id: "serialize-string-over-limit",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    },
  );

  const atKeyLimit = parseToolResultResponse(
    canonicalJsonRequest("serialize-key-limit", { ["k".repeat(pr72MaxStringLength)]: true }),
  );
  assert.equal(atKeyLimit.result.structuredContent.tool, "norma.serializeCanonicalJson");

  assert.deepEqual(
    parseRequiredResponse(canonicalJsonRequest("serialize-key-over-limit", { ["k".repeat(pr72MaxStringLength + 1)]: true })),
    {
      jsonrpc: "2.0",
      id: "serialize-key-over-limit",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    },
  );
});

test("PR72 bounds JSON-RPC ids used in parsed-limit errors without changing valid ids", () => {
  const longId = "i".repeat(pr72MaxStringLength + 1);
  const longIdResponseText = handleMcpJsonRpcMessage(
    JSON.stringify({
      jsonrpc: "2.0",
      id: longId,
      method: "tools/list",
      params: {},
    }),
  );
  assert.notEqual(longIdResponseText, null);
  assert.equal(longIdResponseText.length < 512, true);
  assert.equal(longIdResponseText.includes(longId), false);
  assert.equal(longIdResponseText.includes(longId.slice(0, 128)), false);
  assert.deepEqual(JSON.parse(longIdResponseText), {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });

  const atLimitId = "i".repeat(pr72MaxStringLength);
  const atLimitResponse = parseToolsListResponse({
    jsonrpc: "2.0",
    id: atLimitId,
    method: "tools/list",
  });
  assert.equal(atLimitResponse.id, atLimitId);

  const shortIdResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "safe-id",
    method: "initialize",
  });
  assert.equal(shortIdResponse.id, "safe-id");

  const numericIdResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: 72,
    method: "initialize",
  });
  assert.equal(numericIdResponse.id, 72);
});

test("PR72 applies the MCP raw request byte limit before oversized payload dispatch", () => {
  const atLimit = parseRawResponse(rawRequestWithTargetBytes(pr72MaxRequestBytes));
  assert.equal(atLimit.jsonrpc, "2.0");
  assert.equal(atLimit.id, "raw-size-boundary");
  assert.equal(atLimit.error.code, -32602);
  assert.equal(atLimit.error.message, "Invalid params");

  const overLimit = parseRawResponse(rawRequestWithTargetBytes(pr72MaxRequestBytes + 1));
  assert.deepEqual(overLimit, {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32600,
      message: "Invalid Request",
    },
  });
  assert.equal(JSON.stringify(overLimit).includes("x".repeat(128)), false);
});

test("PR36 tools/call validates params and unknown tools with JSON-RPC invalid params", () => {
  for (const request of [
    {
      jsonrpc: "2.0",
      id: "missing-params",
      method: "tools/call",
    },
    {
      jsonrpc: "2.0",
      id: "non-object-params",
      method: "tools/call",
      params: "bad",
    },
    {
      jsonrpc: "2.0",
      id: "missing-name",
      method: "tools/call",
      params: {
        arguments: {},
      },
    },
    {
      jsonrpc: "2.0",
      id: "non-string-name",
      method: "tools/call",
      params: {
        name: 1,
        arguments: {},
      },
    },
  ]) {
    assertInvalidParams(request);
  }

  const unknownToolResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "unknown-tool",
    method: "tools/call",
    params: {
      name: "norma.unknown",
      arguments: {},
    },
  });
  assert.equal(Object.hasOwn(unknownToolResponse, "result"), false);
  assert.equal(Object.hasOwn(unknownToolResponse, "structuredContent"), false);

  assert.deepEqual(unknownToolResponse, {
    jsonrpc: "2.0",
    id: "unknown-tool",
    error: {
      code: -32602,
      message: "Unknown tool: norma.unknown",
    },
  });
});

test("PR38 tools/call still rejects arbitrary replay as an unknown tool", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "norma.replayRun-unknown",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: "norma.replayRun-unknown",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });
});

test("PR36 non-tool MCP features remain unimplemented", () => {
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

test("PR36 notification-only input still produces no stdout response", () => {
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

test("PR36 spawned STDIO wrapper handles initialize list and both tool calls before stdin closes", async () => {
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
    ]);
  } finally {
    child.stdin.end();
    child.kill();
  }

  assert.equal(stdoutLines.length, 4);
  for (const line of stdoutLines) {
    assert.doesNotMatch(line, /Usage|help text|diagnostic prose/i);
    assert.equal(JSON.parse(line).jsonrpc, "2.0");
  }

  assert.equal(JSON.parse(stdoutLines[0]).id, "spawn-init");
  assert.deepEqual(JSON.parse(stdoutLines[1]).result.tools.slice(0, 5), expectedTools);
  assert.deepEqual(JSON.parse(stdoutLines[1]).result.tools.map((tool) => tool.name), finalToolNames);
  assert.equal(JSON.parse(stdoutLines[2]).result.structuredContent.tool, "norma.getVersion");
  assert.equal(JSON.parse(stdoutLines[3]).result.structuredContent.canonicalJson, "{\"a\":1,\"b\":2}");
});

test("PR36 package metadata remains unchanged and dependency-free", () => {
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

test("PR36 runtime skeleton reads no env vars and uses no filesystem network or shell APIs", () => {
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

function assertInvalidParams(message) {
  const response = parseRequiredResponse(message);
  assert.equal(Object.hasOwn(response, "result"), false);
  assert.equal(Object.hasOwn(response, "structuredContent"), false);
  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: Object.hasOwn(message, "id") ? message.id : null,
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
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

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function parseRawResponse(rawLine) {
  const response = handleMcpJsonRpcMessage(rawLine);
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function canonicalJsonRequest(id, value) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: "norma.serializeCanonicalJson",
      arguments: {
        value,
      },
    },
  };
}

function nestedValue(depth) {
  let value = "leaf";
  for (let index = 0; index < depth; index += 1) {
    value = { next: value };
  }
  return value;
}

function rawRequestWithTargetBytes(targetBytes) {
  const request = canonicalJsonRequest("raw-size-boundary", "");
  const empty = JSON.stringify(request);
  const overhead = Buffer.byteLength(empty, "utf8");
  const payloadBytes = targetBytes - overhead;
  assert.ok(payloadBytes >= 0);
  request.params.arguments.value = "x".repeat(payloadBytes);
  const raw = JSON.stringify(request);
  assert.equal(Buffer.byteLength(raw, "utf8"), targetBytes);
  return raw;
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
    }, 1_000);

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
