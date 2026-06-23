import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_STDIO_MAX_REQUEST_BYTES,
  MCP_STDIO_MAX_STRING_LENGTH,
  handleMcpJsonRpcMessage,
} from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

test("PR4 initialize succeeds and exposes no runtime tools", () => {
  const initializeResponse = parseRequiredResponse({
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

  assert.deepEqual(initializeResponse, {
    jsonrpc: "2.0",
    result: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      serverInfo: {
        name: "norma-core-mcp-stdio",
        version: "0.1.0-pr4",
      },
    },
    id: "init-1",
  });
  assert.equal(MCP_SERVER_NAME, "norma-core-mcp-stdio");
  assert.equal(MCP_SERVER_VERSION, "0.1.0-pr4");

  const toolsListResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "tools-1",
    method: "tools/list",
  });

  assert.deepEqual(toolsListResponse, {
    jsonrpc: "2.0",
    result: {
      tools: [],
    },
    id: "tools-1",
  });
});

test("PR4 malformed JSON returns the structured MCP_INVALID_INPUT contract", () => {
  assert.deepEqual(parseRawResponse("{ invalid json"), {
    jsonrpc: "2.0",
    error: {
      code: "MCP_INVALID_INPUT",
      message: "MCP request is invalid.",
    },
    id: null,
  });
});

test("PR4 excessive depth returns MCP_INPUT_TOO_DEEP without stack leakage", () => {
  const rawResponse = handleMcpJsonRpcMessage(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "depth-2000",
      method: "tools/list",
      params: nestedObject(2_000),
    }),
  );

  assert.notEqual(rawResponse, null);
  assert.doesNotMatch(rawResponse, /RangeError|Maximum call stack|file:\/\/|\/dist\/|\/src\/|\bat\s+/);
  assert.deepEqual(JSON.parse(rawResponse), {
    jsonrpc: "2.0",
    error: {
      code: "MCP_INPUT_TOO_DEEP",
      message: "MCP request JSON exceeds maximum depth.",
    },
    id: null,
  });
});

test("PR4 excessive string length returns MCP_INVALID_INPUT", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "string-over-limit",
    method: "tools/list",
    params: {
      cursor: "x".repeat(MCP_STDIO_MAX_STRING_LENGTH + 1),
    },
  });

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    error: {
      code: "MCP_INVALID_INPUT",
      message: "MCP request is invalid.",
    },
    id: null,
  });
});

test("PR4 raw payload over the byte limit returns MCP_TOO_LARGE", () => {
  const response = parseRawResponse(rawToolsListWithTargetBytes(MCP_STDIO_MAX_REQUEST_BYTES + 1));

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    error: {
      code: "MCP_TOO_LARGE",
      message: "MCP request payload exceeds maximum size.",
    },
    id: null,
  });
});

test("PR4 stdio process survives malformed, deep, long, and oversized input before valid initialize", () => {
  const validRequest = {
    jsonrpc: "2.0",
    id: "after-failures",
    method: "initialize",
  };
  const result = runStdioServerRawLines([
    "{ invalid json",
    JSON.stringify({
      jsonrpc: "2.0",
      id: "depth-2000",
      method: "tools/list",
      params: nestedObject(2_000),
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: "string-over-limit",
      method: "tools/list",
      params: {
        cursor: "x".repeat(MCP_STDIO_MAX_STRING_LENGTH + 1),
      },
    }),
    rawToolsListWithTargetBytes(MCP_STDIO_MAX_REQUEST_BYTES + 1),
    JSON.stringify(validRequest),
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, "");
  assert.doesNotMatch(result.stdout, /RangeError|Maximum call stack|file:\/\/|\/Volumes\/|\/Users\/|\/dist\/|\/src\/|\bat\s+/);

  const lines = result.stdout.trimEnd().split("\n");
  assert.equal(lines.length, 5);
  assert.deepEqual(
    lines.slice(0, 4).map((line) => JSON.parse(line).error.code),
    ["MCP_INVALID_INPUT", "MCP_INPUT_TOO_DEEP", "MCP_INVALID_INPUT", "MCP_TOO_LARGE"],
  );

  const recovered = JSON.parse(lines[4]);
  assert.equal(recovered.jsonrpc, "2.0");
  assert.equal(recovered.id, "after-failures");
  assert.equal(recovered.result.protocolVersion, "2025-06-18");
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

function runStdioServerRawLines(rawLines) {
  return spawnSync(process.execPath, [wrapperPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input: `${rawLines.join("\n")}\n`,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function nestedObject(depth) {
  let value = "leaf";
  for (let index = 0; index < depth; index += 1) {
    value = {
      next: value,
    };
  }
  return value;
}

function rawToolsListWithTargetBytes(targetBytes) {
  const request = {
    jsonrpc: "2.0",
    id: "raw-over-limit",
    method: "tools/list",
    params: {
      cursor: "",
    },
  };
  const overhead = Buffer.byteLength(JSON.stringify(request), "utf8");
  const payloadBytes = targetBytes - overhead;
  assert.ok(payloadBytes >= 0);

  request.params.cursor = "x".repeat(payloadBytes);
  const rawLine = JSON.stringify(request);
  assert.equal(Buffer.byteLength(rawLine, "utf8"), targetBytes);
  return rawLine;
}
