#!/usr/bin/env node

import {
  createPrivateWebLabHttpServerV1,
  PRIVATE_WEB_LAB_DEFAULT_PORT,
} from "./private-web-lab-http-server.mjs";

const ENABLE_FLAG = "--enable-private-web-lab";
if (!process.argv.includes(ENABLE_FLAG)) {
  process.stderr.write(`Refusing to start: pass ${ENABLE_FLAG} for the private local Web Lab.\n`);
  process.exit(64);
}

const port = parsePort(process.env.NORMA_PRIVATE_WEB_LAB_PORT ?? String(PRIVATE_WEB_LAB_DEFAULT_PORT));
const server = createPrivateWebLabHttpServerV1();

server.on("error", (error) => {
  process.stderr.write(`Private Web Lab failed: ${error.message}\n`);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  if (address === null || typeof address === "string") return;
  process.stderr.write(`${JSON.stringify({
    event: "private_web_lab_started",
    url: `http://127.0.0.1:${String(address.port)}`,
    exposure: "private_loopback_only",
    providerCalls: 0,
  })}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}

function parsePort(value) {
  if (!/^[0-9]+$/u.test(value)) {
    throw new Error("NORMA_PRIVATE_WEB_LAB_PORT must be an integer.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error("NORMA_PRIVATE_WEB_LAB_PORT must be between 0 and 65535.");
  }
  return parsed;
}
