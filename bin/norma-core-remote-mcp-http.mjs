#!/usr/bin/env node

import { createRemoteMcpHttpServerFromEnvironment } from "../dist/src/mcp/remote-http-server.js";
import { createPostgreSqlPoolFromEnvironment } from "../dist/src/mcp/remote-http-postgresql-pool.js";

const postgresqlPool = createPostgreSqlPoolFromEnvironment(process.env);
const { config, server } = createRemoteMcpHttpServerFromEnvironment(process.env, {
  postgresqlPool,
});

server.listen(config.port, "0.0.0.0", () => {
  process.stdout.write(JSON.stringify({
    event: "remote_mcp_started",
    service: "norma-core-remote-mcp",
    version: "0.1.0-pr137",
  }) + "\n");
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await new Promise((resolve) => server.close(resolve));
  await postgresqlPool?.end();
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, shutdown);
}
