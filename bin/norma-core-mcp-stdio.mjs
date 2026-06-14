import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

let stdin = "";

process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  stdin += chunk;
});

process.stdin.on("end", () => {
  for (const rawLine of stdin.split(/\r?\n/)) {
    if (rawLine === "") {
      continue;
    }

    const response = handleMcpJsonRpcMessage(rawLine);

    if (response !== null) {
      process.stdout.write(`${response}\n`);
    }
  }
});

process.stdin.on("error", () => {
  process.exitCode = 1;
});
