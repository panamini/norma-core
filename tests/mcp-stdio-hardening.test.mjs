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

test("PR4 initialize response is transport-only with empty capabilities", () => {
  const response = parseRequiredResponse(validInitializeRequest("init-1"));

  assert.deepEqual(response, {
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

test("PR4 transport-only server does not expose tools/list", () => {
  const response = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "tools-list",
    method: "tools/list",
  });

  assert.deepEqual(response, errorResponse("tools-list", -32601, "Method not found", "MCP_METHOD_NOT_FOUND"));
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
  assert.deepEqual(lines[1].result.capabilities, {});
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
  assert.deepEqual(lines[4].result.capabilities, {});
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
