#!/usr/bin/env node

import { createPersonalVisualHarmonyHttpServerV1 } from "../dist/src/mcp/personal-visual-harmony-http-server.js";

const ENABLE_FLAG = "--enable-personal-visual-harmony-demo";
if (!process.argv.includes(ENABLE_FLAG)) {
  process.stderr.write(`Refusing to start: pass ${ENABLE_FLAG} for the temporary personal demo.\n`);
  process.exit(64);
}

const port = parsePort(process.env.NORMA_PERSONAL_DEMO_PORT ?? "8788");
const accessToken = process.env.NORMA_PERSONAL_DEMO_ACCESS_TOKEN?.trim();
if (!accessToken) {
  process.stderr.write("Refusing to start: set a fresh 256-bit NORMA_PERSONAL_DEMO_ACCESS_TOKEN locally.\n");
  process.exit(64);
}
const { server, mcpPath } = createPersonalVisualHarmonyHttpServerV1({ accessToken });

server.on("error", (error) => {
  process.stderr.write(`Personal demo HTTP server failed: ${error.message}\n`);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  if (address === null || typeof address === "string") return;
  process.stderr.write(`${JSON.stringify({
    event: "personal_visual_harmony_http_started",
    bind: "127.0.0.1",
    port: address.port,
    mcpPathTemplate: mcpPath.replace(accessToken, "<capability>"),
    exposure: "temporary_loopback_personal_demo",
  })}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}

function parsePort(value) {
  if (!/^[0-9]+$/u.test(value)) throw new Error("NORMA_PERSONAL_DEMO_PORT must be an integer.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error("NORMA_PERSONAL_DEMO_PORT must be between 0 and 65535.");
  }
  return parsed;
}
