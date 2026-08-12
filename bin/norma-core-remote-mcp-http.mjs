#!/usr/bin/env node

import { createRemoteMcpHttpServerFromEnvironment } from "../dist/src/mcp/remote-http-server.js";
import { createPostgreSqlPoolFromEnvironment } from "../dist/src/mcp/remote-http-postgresql-pool.js";
import { PostgreSqlRemoteMcpRevocationRegistry } from "../dist/src/mcp/remote-http-postgresql-revocation.js";
import {
  createPersonalVisualHarmonySegmentationClientFromEnv,
  personalVisualHarmonySourceImageAllowedOriginsFromEnv,
} from "../dist/src/personal-visual-harmony-segmentation.js";
import {
  InMemoryPersonalVisualHarmonyPerceptionJobService,
} from "../dist/src/personal-visual-harmony-perception-jobs.js";

const postgresqlPool = createPostgreSqlPoolFromEnvironment(process.env);
const segmentationClient = createPersonalVisualHarmonySegmentationClientFromEnv(process.env);
const sourceImageAllowedOrigins = segmentationClient === null
  ? undefined
  : personalVisualHarmonySourceImageAllowedOriginsFromEnv(process.env);
const personalVisualHarmonyPerceptionJobs = segmentationClient === null
  ? undefined
  : new InMemoryPersonalVisualHarmonyPerceptionJobService({
      provider: segmentationClient,
      allowedSourceImageOrigins: sourceImageAllowedOrigins,
      onDiagnostic: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
    });
const { config, server } = createRemoteMcpHttpServerFromEnvironment(process.env, {
  postgresqlPool,
  ...(personalVisualHarmonyPerceptionJobs === undefined
    ? {}
    : { personalVisualHarmonyPerceptionJobs }),
  ...(process.env.NORMA_MCP_REVOCATION_MODE === "postgresql"
    ? { revocationRegistry: requiredRevocationRegistry(postgresqlPool) }
    : {}),
});

function requiredRevocationRegistry(pool) {
  if (pool === undefined) {
    throw new Error("NORMA_MCP_REVOCATION_MODE=postgresql requires a PostgreSQL pool");
  }
  return new PostgreSqlRemoteMcpRevocationRegistry(pool);
}

async function start() {
  try {
    if (postgresqlPool !== undefined) {
      const connection = await postgresqlPool.connect();
      connection.release();
    }
    server.listen(config.port, "0.0.0.0", () => {
      process.stdout.write(JSON.stringify({
        event: "remote_mcp_started",
        service: "norma-core-remote-mcp",
        version: "0.1.0-pr137",
      }) + "\n");
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "remote_mcp_startup_failed",
      message: error instanceof Error ? error.message : "database connection failed",
    }));
    await postgresqlPool?.end().catch(() => {});
    process.exitCode = 1;
  }
}

void start();

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  let exitCode = 0;
  try {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  } catch (error) {
    console.error(JSON.stringify({
      event: "remote_mcp_shutdown_error",
      phase: "server_close",
      message: error instanceof Error ? error.message : "server close failed",
    }));
    exitCode = 1;
  }
  try {
    await postgresqlPool?.end();
  } catch (error) {
    console.error(JSON.stringify({
      event: "remote_mcp_shutdown_error",
      phase: "postgres_pool_end",
      message: error instanceof Error ? error.message : "pool close failed",
    }));
    exitCode = 1;
  }
  process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, shutdown);
}
