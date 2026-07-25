import assert from "node:assert/strict";

export const permanentRemoteMcpDependencies = Object.freeze({
  "@modelcontextprotocol/sdk": "1.29.0",
  jose: "6.2.3",
  pg: "8.22.0",
  zod: "4.4.3",
});

export const currentMcpRuntimeSourceFiles = Object.freeze([
  "src/mcp/personal-visual-harmony-app.ts",
  "src/mcp/personal-visual-harmony-http-server.ts",
  "src/mcp/private-dev-local-visual-mcp-protocol.ts",
  "src/mcp/remote-http-auth.ts",
  "src/mcp/remote-http-authorization-data.ts",
  "src/mcp/remote-http-config.ts",
  "src/mcp/remote-http-limits.ts",
  "src/mcp/remote-http-postgresql-pool.ts",
  "src/mcp/remote-http-postgresql-sandbox.ts",
  "src/mcp/remote-http-server.ts",
  "src/mcp/stdio-protocol.ts",
]);

export function assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock = undefined) {
  assert.equal(packageJson.private, true);
  assert.equal(Object.hasOwn(packageJson, "bin"), false);
  assert.equal(Object.hasOwn(packageJson, "publishConfig"), false);
  assert.equal(Object.hasOwn(packageJson, "optionalDependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "peerDependencies"), false);
  assert.deepEqual(packageJson.dependencies, permanentRemoteMcpDependencies);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), ["."]);
  if (packageLock !== undefined) {
    assert.deepEqual(packageLock.packages[""].dependencies, permanentRemoteMcpDependencies);
  }
}

export function assertCurrentMcpRuntimeSourceBoundary(files) {
  assert.deepEqual([...files].sort(), [...currentMcpRuntimeSourceFiles].sort());
}
