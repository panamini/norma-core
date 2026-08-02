#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { privateWebLabBuildIsCurrent } from "./private-web-lab-build-freshness.mjs";

const ENABLE_FLAG = "--enable-private-web-lab";
if (!process.argv.includes(ENABLE_FLAG)) {
  process.stderr.write(`Refusing to start: pass ${ENABLE_FLAG} for the private local Web Lab.\n`);
  process.exit(64);
}

await ensurePrivateWebLabBuild();
const {
  createPrivateWebLabHttpServerV1,
  PRIVATE_WEB_LAB_DEFAULT_PORT,
  PRIVATE_WEB_LAB_RUNTIME_IDENTITY,
} = await import("./private-web-lab-http-server.mjs");
const {
  PRIVATE_WEB_LAB_CONTRACT_ID,
  PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID,
} = await import("../dist/src/private-web-lab.js");

const port = parsePort(process.env.NORMA_PRIVATE_WEB_LAB_PORT ?? String(PRIVATE_WEB_LAB_DEFAULT_PORT));
await startOrReusePrivateWebLab(port);

function ensurePrivateWebLabBuild() {
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  if (privateWebLabBuildIsCurrent(repositoryRoot)) return;
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.stderr.write(`${JSON.stringify({
      event: "private_web_lab_build_failed",
      exposure: "private_loopback_only",
      providerCalls: 0,
    })}\n`);
    process.exit(result.status ?? 1);
  }
}

async function startOrReusePrivateWebLab(requestedPort) {
  const existing = requestedPort === 0
    ? { status: "available" }
    : await inspectLoopbackPort(requestedPort);
  const url = `http://127.0.0.1:${String(requestedPort)}`;
  if (existing.status === "private_web_lab") {
    writeLifecycleEvent("private_web_lab_already_running", url);
    return;
  }
  if (existing.status === "occupied") {
    process.stderr.write(`${JSON.stringify({
      event: "private_web_lab_port_in_use",
      url,
      exposure: "private_loopback_only",
      providerCalls: 0,
    })}\n`);
    process.exitCode = 69;
    return;
  }

  const server = createPrivateWebLabHttpServerV1();
  server.on("error", (error) => {
    process.stderr.write(`Private Web Lab failed: ${error.message}\n`);
    process.exitCode = 1;
  });
  server.listen(requestedPort, "127.0.0.1", () => {
    const address = server.address();
    if (address === null || typeof address === "string") return;
    writeLifecycleEvent(
      "private_web_lab_started",
      `http://127.0.0.1:${String(address.port)}`,
    );
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}

async function inspectLoopbackPort(portToInspect) {
  try {
    const response = await fetch(
      `http://127.0.0.1:${String(portToInspect)}/healthz`,
      {
        redirect: "error",
        signal: AbortSignal.timeout(750),
      },
    );
    if (!response.ok) return { status: "occupied" };
    const body = await response.json();
    return body?.contractId === PRIVATE_WEB_LAB_CONTRACT_ID
      && body?.manualDraftContractId === PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID
      && body?.runtimeIdentity === PRIVATE_WEB_LAB_RUNTIME_IDENTITY
      && body?.exposure === "private_loopback_only"
      && body?.providerCalls === 0
      ? { status: "private_web_lab" }
      : { status: "occupied" };
  } catch (error) {
    return error?.cause?.code === "ECONNREFUSED"
      ? { status: "available" }
      : { status: "occupied" };
  }
}

function writeLifecycleEvent(event, url) {
  process.stderr.write(`${JSON.stringify({
    event,
    url,
    exposure: "private_loopback_only",
    providerCalls: 0,
  })}\n`);
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
