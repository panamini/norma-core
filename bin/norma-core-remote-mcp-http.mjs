#!/usr/bin/env node

import { createRemoteMcpHttpServerFromEnvironment } from "../dist/src/mcp/remote-http-server.js";
import { createPostgreSqlPoolFromEnvironment } from "../dist/src/mcp/remote-http-postgresql-pool.js";

const postgresqlPool = createPostgreSqlPoolFromEnvironment(process.env);
const { config, server } = createRemoteMcpHttpServerFromEnvironment(process.env, {
  postgresqlPool,
});

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
