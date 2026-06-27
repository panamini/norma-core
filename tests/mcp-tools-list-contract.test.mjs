import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const packageJsonPath = join(repoRoot, "package.json");

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

const discoveredTools = [
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
  ...discoveredTools.map((tool) => tool.name),
  structuredAnalyzeToolName,
];
const frozenToolInventoryHash = "3bb733561747a1aff3c194f25fc6283511ae7138347ad5b9847dc8ac97e502c4";
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

test("PR36 initialize declares only the static tools capability", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "init-tools-capability",
    method: "initialize",
  });

  assert.deepEqual(response.result.capabilities, {
    tools: {
      listChanged: false,
    },
  });
  assertNoInitializeOnlyFields(response.result);

  const responseText = JSON.stringify(response);
  for (const toolName of finalToolNames) {
    assert.doesNotMatch(responseText, new RegExp(escapeRegExp(toolName)));
  }
});

test("R6C tools/list returns the five existing tools plus Structured Analyze", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list-1",
    method: "tools/list",
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, "tools-list-1");
  assert.deepEqual(response.result.tools.slice(0, 5), discoveredTools);
  assert.deepEqual(response.result.tools.map((tool) => tool.name), finalToolNames);
  assert.equal(Object.hasOwn(response.result, "nextCursor"), false);
});

test("R12 tools/list descriptor inventory remains exactly frozen", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "r12-tools-list-freeze",
    method: "tools/list",
  });
  const analyzeTool = response.result.tools[5];

  assert.deepEqual(response.result.tools.map((tool) => tool.name), [
    "norma.getVersion",
    "norma.serializeCanonicalJson",
    "norma.verifyRun",
    "norma.verifyArtifactFreshness",
    "norma.replayMvpDemo",
    "norma.analyzeStructuredCompositionV1",
  ]);
  assert.deepEqual(Object.keys(analyzeTool), ["name", "title", "description", "inputSchema", "outputSchema", "annotations"]);
  assert.equal(analyzeTool.name, structuredAnalyzeToolName);
  assert.equal(analyzeTool.title, "Analyze structured composition");
  assert.equal(
    analyzeTool.description,
    "Analyze explicitly accepted user-supplied structured composition data with deterministic Norma Core analysis. Requires explicit ratio pack, rule set, tolerances, and operation context; does not accept prompts, images, files, URLs, inferred configuration, recommendations, or optimization, and reports whether composition A or B is closer to the declared proportional system.",
  );
  assert.deepEqual(analyzeTool.annotations, structuredAnalyzeAnnotations);
  assert.equal(toolsInventoryHash(response.result.tools), frozenToolInventoryHash);
});

test("PR38 tools/list schemas are exact", () => {
  const tools = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list-schemas",
    method: "tools/list",
  }).result.tools;

  assert.deepEqual(tools[0].inputSchema, {
    type: "object",
    additionalProperties: false,
    properties: {},
  });
  assert.equal(Object.hasOwn(tools[0].inputSchema, "required"), false);
  assert.deepEqual(tools[0].outputSchema, getVersionOutputSchema);

  assert.deepEqual(tools[1].inputSchema, {
    type: "object",
    required: ["value"],
    additionalProperties: false,
    properties: {
      value: {},
      policy: {
        type: "string",
      },
    },
  });
  assert.deepEqual(tools[1].outputSchema, serializeCanonicalJsonOutputSchema);

  assert.deepEqual(tools[2].inputSchema, {
    type: "object",
    required: ["input"],
    additionalProperties: false,
    properties: {
      input: {},
    },
  });

  assert.deepEqual(tools[3].inputSchema, {
    type: "object",
    required: ["input"],
    additionalProperties: false,
    properties: {
      input: {},
    },
  });

  assert.deepEqual(tools[4].inputSchema, {
    type: "object",
    additionalProperties: false,
    properties: {},
  });
  assert.equal(Object.hasOwn(tools[4].inputSchema, "required"), false);

  assert.deepEqual(tools[2].outputSchema, verifyRunOutputSchema);
  assert.deepEqual(tools[3].outputSchema, verifyArtifactFreshnessOutputSchema);
  assert.deepEqual(tools[4].outputSchema, replayMvpDemoOutputSchema);
  for (const tool of tools.slice(0, 5)) {
    assert.equal(Object.hasOwn(tool, "annotations"), false);
  }
  assert.equal(tools[5].name, structuredAnalyzeToolName);
  assert.deepEqual(tools[5].annotations, structuredAnalyzeAnnotations);
  assert.deepEqual(tools[5].inputSchema.required, ["input"]);
  assert.equal(tools[5].inputSchema.additionalProperties, false);
  assert.equal(tools[5].inputSchema.properties.input.additionalProperties, false);
  assert.equal(tools[5].outputSchema.additionalProperties, false);
});

test("PR38 tools/list does not expose arbitrary replay resources prompts or rich content fields", () => {
  const response = parseToolsListResponse({
    jsonrpc: "2.0",
    id: "tools-list-guardrails",
    method: "tools/list",
  });
  const responseText = JSON.stringify(response);

  for (const toolName of forbiddenToolNames) {
    assert.doesNotMatch(responseText, new RegExp(escapeRegExp(toolName)));
  }

  assertNoKeysRecursive(response, [
    "resourceLinks",
    "embeddedResources",
    "content",
  ]);
  for (const tool of response.result.tools.slice(0, 5)) {
    assert.equal(Object.hasOwn(tool, "annotations"), false);
  }
  assert.deepEqual(response.result.tools[5].annotations, structuredAnalyzeAnnotations);
});

test("PR36 tools/list accepts missing empty and string cursor params without pagination", () => {
  const requestVariants = [
    {
      jsonrpc: "2.0",
      id: "tools-list-missing-params",
      method: "tools/list",
    },
    {
      jsonrpc: "2.0",
      id: "tools-list-empty-params",
      method: "tools/list",
      params: {},
    },
    {
      jsonrpc: "2.0",
      id: "tools-list-string-cursor",
      method: "tools/list",
      params: {
        cursor: "cursor-1",
      },
    },
    {
      jsonrpc: "2.0",
      id: "tools-list-root-meta",
      method: "tools/list",
      params: {
        _meta: {
          progressToken: "progress-1",
        },
      },
    },
    {
      jsonrpc: "2.0",
      id: "tools-list-cursor-root-meta",
      method: "tools/list",
      params: {
        cursor: "cursor-1",
        _meta: {
          progressToken: "progress-1",
        },
      },
    },
  ];

  for (const request of requestVariants) {
    const response = parseToolsListResponse(request);

    assert.deepEqual(response.result.tools.slice(0, 5), discoveredTools);
    assert.deepEqual(response.result.tools.map((tool) => tool.name), finalToolNames);
    assert.equal(Object.hasOwn(response.result, "nextCursor"), false);
  }
});

test("PR36 tools/list rejects malformed params with invalid params", () => {
  for (const params of [
    "cursor-1",
    1,
    true,
    null,
    [],
    { cursor: 1 },
    { cursor: null },
    { extra: true },
    { _meta: { progressToken: "progress-1" }, extra: true },
  ]) {
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id: "bad-tools-list-params",
      method: "tools/list",
      params,
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: "bad-tools-list-params",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    });
  }
});

test("PR36 resources prompts sampling elicitation and logging remain unimplemented", () => {
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

test("PR36 notifications tools list changed produces no response", () => {
  assert.equal(
    handleMcpJsonRpcMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ),
    null,
  );
});

test("PR36 spawned STDIO wrapper returns initialize and tools/list before stdin closes", async () => {
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
    ]);
  } finally {
    child.stdin.end();
    child.kill();
  }

  assert.equal(stdoutLines.length, 2);

  const initializeResponse = JSON.parse(stdoutLines[0]);
  const toolsListResponse = JSON.parse(stdoutLines[1]);

  assert.equal(initializeResponse.jsonrpc, "2.0");
  assert.equal(initializeResponse.id, "spawn-init");
  assert.deepEqual(initializeResponse.result.capabilities, {
    tools: {
      listChanged: false,
    },
  });

  assert.equal(toolsListResponse.jsonrpc, "2.0");
  assert.equal(toolsListResponse.id, "spawn-tools-list");
  assert.deepEqual(toolsListResponse.result.tools.slice(0, 5), discoveredTools);
  assert.deepEqual(toolsListResponse.result.tools.map((tool) => tool.name), finalToolNames);
});

test("PR36 spawned STDIO wrapper emits empty stdout for notification-only input", () => {
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

test("PR36 package metadata remains private and dependency-free", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.private, true);
  assert.equal(Object.hasOwn(packageJson, "bin"), false);
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "optionalDependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "peerDependencies"), false);

  for (const dependencyName of Object.keys(packageJson.devDependencies ?? {})) {
    assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
  }
});

test("PR36 runtime skeleton reads no environment variables", () => {
  const runtimeSource = [
    readFileSync(wrapperPath, "utf8"),
    readFileSync(protocolSourcePath, "utf8"),
  ].join("\n");

  assert.doesNotMatch(runtimeSource, /process\.env/);
  assert.doesNotMatch(runtimeSource, /CLAUDE_PROJECT_DIR/);
});

function parseToolsListResponse(message) {
  const response = parseRequiredResponse(message);

  assert.equal(response.jsonrpc, "2.0");
  assert.ok(Object.hasOwn(response, "result"));
  assert.ok(Array.isArray(response.result.tools));
  assert.equal(response.result.tools.length, finalToolNames.length);

  return response;
}

function toolsInventoryHash(tools) {
  return createHash("sha256").update(JSON.stringify(tools)).digest("hex");
}

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));

  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);

  return JSON.parse(response);
}

function assertNoInitializeOnlyFields(result) {
  for (const fieldName of ["resources", "prompts", "logging", "sampling", "elicitation", "instructions"]) {
    assert.equal(Object.hasOwn(result, fieldName), false, `${fieldName} must not be declared`);
    assert.equal(
      Object.hasOwn(result.capabilities, fieldName),
      false,
      `${fieldName} capability must not be declared`,
    );
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
