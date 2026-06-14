import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

let pending = "";

process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  pending += chunk;
  flushCompleteLines();
});

process.stdin.on("end", () => {
  if (pending !== "") {
    processLine(pending.replace(/\r$/, ""));
    pending = "";
  }
});

process.stdin.on("error", () => {
  process.exitCode = 1;
});

function flushCompleteLines() {
  while (true) {
    const newlineIndex = pending.indexOf("\n");

    if (newlineIndex === -1) {
      return;
    }

    const rawLine = pending.slice(0, newlineIndex).replace(/\r$/, "");
    pending = pending.slice(newlineIndex + 1);
    processLine(rawLine);
  }
}

function processLine(rawLine) {
  if (rawLine === "") {
    return;
  }

  const response = handleMcpJsonRpcMessage(rawLine);

  if (response !== null) {
    process.stdout.write(`${response}\n`);
  }
}
