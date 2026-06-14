import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  handleMcpJsonRpcMessage,
} from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const packageJsonPath = join(repoRoot, "package.json");

const approvedFutureTools = [
  "norma.getVersion",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
  "norma.serializeCanonicalJson",
];

const forbiddenTools = [
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

test("PR34 initialize returns the exact local STDIO skeleton response for string ids", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "init-1",
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "0.0.0",
      },
    },
  });

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: "init-1",
    result: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      serverInfo: {
        name: "norma-core-mcp-stdio-skeleton",
        version: "0.1.0-pr12",
      },
    },
  });
  assert.equal(MCP_PROTOCOL_VERSION, "2025-06-18");
  assert.equal(MCP_SERVER_NAME, "norma-core-mcp-stdio-skeleton");
  assert.equal(MCP_SERVER_VERSION, "0.1.0-pr12");
  assertNoCapabilityOrInstructionFields(response.result);
  assertNoToolNames(JSON.stringify(response));
});

test("PR34 initialize preserves number ids exactly", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: 34,
    method: "initialize",
  });

  assert.equal(response.id, 34);
  assert.equal(typeof response.id, "number");
  assert.deepEqual(response.result.capabilities, {});
});

test("PR34 notifications do not produce stdout responses", () => {
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
        method: "unknown/notification",
      }),
    ),
    null,
  );
});

test("PR34 invalid JSON returns parse error with null id", () => {
  const response = parseRawResponse("{ invalid json");

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32700,
      message: "Parse error",
    },
  });
});

test("PR34 invalid request shapes return invalid request errors", () => {
  const missingMethod = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "bad-shape",
  });
  assert.deepEqual(missingMethod, {
    jsonrpc: "2.0",
    id: "bad-shape",
    error: {
      code: -32600,
      message: "Invalid Request",
    },
  });

  const invalidId = parseRequiredResponse({
    jsonrpc: "2.0",
    id: {},
    method: "initialize",
  });
  assert.deepEqual(invalidId, {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32600,
      message: "Invalid Request",
    },
  });

  const batch = parseRawResponse(
    JSON.stringify([
      {
        jsonrpc: "2.0",
        id: "batch-1",
        method: "initialize",
      },
    ]),
  );
  assert.deepEqual(batch, {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32600,
      message: "Invalid Request",
    },
  });
});

test("PR34 unsupported request methods return method-not-found", () => {
  for (const method of [
    "unknown/method",
    "tools/list",
    "tools/call",
    "resources/list",
    "resources/read",
    "prompts/list",
    "prompts/get",
    "sampling/createMessage",
    "elicitation/create",
    "logging/setLevel",
  ]) {
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id: `${method}-request`,
      method,
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: `${method}-request`,
      error: {
        code: -32601,
        message: "Method not found",
      },
    });
    assertNoToolNames(JSON.stringify(response));
  }
});

test("PR34 invalid ids on error-producing requests use null id", () => {
  for (const id of [null, true, {}, [], Number.NaN, Number.POSITIVE_INFINITY]) {
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id,
      method: "tools/list",
    });

    assert.equal(response.id, null);
    assert.equal(response.error.code, -32600);
  }
});

test("PR34 wrapper imports the built protocol module and reads no env vars", () => {
  const wrapperSource = readFileSync(wrapperPath, "utf8");
  const protocolSource = readFileSync(protocolSourcePath, "utf8");

  assert.match(
    wrapperSource,
    /import\s+\{\s*handleMcpJsonRpcMessage\s*\}\s+from\s+"..\/dist\/src\/mcp\/stdio-protocol\.js";/,
  );

  for (const source of [wrapperSource, protocolSource]) {
    assert.doesNotMatch(source, /process\.env/);
    assert.doesNotMatch(source, /CLAUDE_PROJECT_DIR/);
  }
});

test("PR34 spawned STDIO wrapper writes only JSON-RPC response lines to stdout", () => {
  const result = runStdioServer([
    {
      jsonrpc: "2.0",
      id: "spawn-init",
      method: "initialize",
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    },
    {
      jsonrpc: "2.0",
      id: "spawn-tools-list",
      method: "tools/list",
    },
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.endsWith("\n"), true);

  const lines = result.stdout.trimEnd().split("\n");
  assert.equal(lines.length, 2);

  for (const line of lines) {
    const parsed = JSON.parse(line);
    assert.equal(parsed.jsonrpc, "2.0");
    assert.ok(Object.hasOwn(parsed, "id"));
    assertNoToolNames(line);
  }
});

test("PR34 spawned STDIO wrapper responds before stdin closes", async () => {
  const child = spawn(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stdin.setDefaultEncoding("utf8");

  let stdoutLine;

  try {
    stdoutLine = await readStdoutLineBeforeClosingStdin(child, {
      jsonrpc: "2.0",
      id: "streaming-init",
      method: "initialize",
    });
  } finally {
    child.stdin.end();
    child.kill();
  }

  const response = JSON.parse(stdoutLine);
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, "streaming-init");
  assert.equal(response.result.protocolVersion, "2025-06-18");
});

test("PR34 spawned STDIO wrapper emits empty stdout for notification-only input", () => {
  const result = runStdioServer([
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    },
    {
      jsonrpc: "2.0",
      method: "unknown/notification",
    },
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, "");
});

test("PR34 package metadata stays dependency-free and private", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });

  for (const fieldName of [
    "publishConfig",
    "bin",
    "files",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }

  for (const dependencyGroup of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]) {
    for (const dependencyName of Object.keys(dependencyGroup ?? {})) {
      assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
    }
  }
});

function parseRequiredResponse(message) {
  return parseRawResponse(JSON.stringify(message));
}

function parseRawResponse(rawLine) {
  const response = handleMcpJsonRpcMessage(rawLine);
  assert.notEqual(response, null);
  assert.equal(response.endsWith("\n"), false);
  return JSON.parse(response);
}

function assertNoCapabilityOrInstructionFields(result) {
  for (const fieldName of [
    "tools",
    "resources",
    "prompts",
    "logging",
    "sampling",
    "elicitation",
    "instructions",
  ]) {
    assert.equal(Object.hasOwn(result, fieldName), false, `${fieldName} must not be declared`);
    assert.equal(
      Object.hasOwn(result.capabilities, fieldName),
      false,
      `${fieldName} capability must not be declared`,
    );
  }
}

function assertNoToolNames(text) {
  for (const toolName of [...approvedFutureTools, ...forbiddenTools]) {
    assert.doesNotMatch(text, new RegExp(escapeRegExp(toolName)));
  }
  assert.doesNotMatch(text, /"tools"\s*:/);
}

function runStdioServer(messages) {
  return spawnSync(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input: `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function readStdoutLineBeforeClosingStdin(child, message) {
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
      const newlineIndex = stdout.indexOf("\n");

      if (newlineIndex !== -1) {
        clearTimeout(timeout);
        resolve(stdout.slice(0, newlineIndex));
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
      if (!stdout.includes("\n")) {
        clearTimeout(timeout);
        reject(new Error(`Child exited before stdout line. code=${code ?? ""} signal=${signal ?? ""}`));
      }
    });

    child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
