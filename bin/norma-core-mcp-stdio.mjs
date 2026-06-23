import {
  MCP_STDIO_MAX_REQUEST_BYTES,
  createMcpInputError,
  handleMcpJsonRpcMessage,
} from "../dist/src/mcp/stdio-protocol.js";

let pending = "";
let pendingBytes = 0;
let droppingOversizedLine = false;

const lineEncoder = new TextEncoder();

process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  processChunk(chunk);
});

process.stdin.on("end", () => {
  if (droppingOversizedLine) {
    writeError("MCP_TOO_LARGE", "MCP request payload exceeds maximum size.");
  } else if (pending !== "") {
    processLine(pending.replace(/\r$/, ""));
  }

  resetPendingLine();
});

process.stdin.on("error", () => {
  writeError("MCP_INVALID_INPUT", "MCP request is invalid.");
});

function processChunk(chunk) {
  let start = 0;

  while (start <= chunk.length) {
    const newlineIndex = chunk.indexOf("\n", start);
    if (newlineIndex === -1) {
      appendLineSegment(chunk.slice(start));
      return;
    }

    appendLineSegment(chunk.slice(start, newlineIndex));
    flushPendingLine();
    start = newlineIndex + 1;
  }
}

function appendLineSegment(segment) {
  if (segment === "" || droppingOversizedLine) {
    return;
  }

  const nextPendingBytes = normalizedPendingBytesAfterAppend(segment);
  if (nextPendingBytes > MCP_STDIO_MAX_REQUEST_BYTES) {
    resetPendingLine();
    droppingOversizedLine = true;
    return;
  }

  pending += segment;
  pendingBytes = nextPendingBytes;
}

function normalizedPendingBytesAfterAppend(segment) {
  const previousTrailingCarriageReturnBytes = pending.endsWith("\r") ? 1 : 0;
  const nextTrailingCarriageReturnBytes = segment.endsWith("\r") ? 1 : 0;

  return (
    pendingBytes +
    previousTrailingCarriageReturnBytes +
    lineEncoder.encode(segment).length -
    nextTrailingCarriageReturnBytes
  );
}

function flushPendingLine() {
  if (droppingOversizedLine) {
    writeError("MCP_TOO_LARGE", "MCP request payload exceeds maximum size.");
    resetPendingLine();
    return;
  }

  const rawLine = pending.replace(/\r$/, "");
  resetPendingLine();
  processLine(rawLine);
}

function resetPendingLine() {
  pending = "";
  pendingBytes = 0;
  droppingOversizedLine = false;
}

function processLine(rawLine) {
  if (rawLine === "") {
    return;
  }

  try {
    const response = handleMcpJsonRpcMessage(rawLine);

    if (response !== null) {
      process.stdout.write(`${response}\n`);
    }
  } catch {
    writeError("MCP_INVALID_INPUT", "MCP request is invalid.");
  }
}

function writeError(code, message) {
  process.stdout.write(`${JSON.stringify(createMcpInputError(code, message))}\n`);
}
