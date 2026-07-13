#!/usr/bin/env node

import { createRemoteMcpHttpServerFromEnvironment } from "../dist/src/mcp/remote-http-server.js";

const { config, server } = createRemoteMcpHttpServerFromEnvironment(process.env);

server.listen(config.port, "0.0.0.0", () => {
  process.stdout.write(JSON.stringify({
    event: "remote_mcp_started",
    service: "norma-core-remote-mcp",
    version: "0.1.0-pr137",
  }) + "\n");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
