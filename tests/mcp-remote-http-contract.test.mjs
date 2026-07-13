import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadRemoteMcpRuntimeConfig,
  REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from "../dist/src/mcp/remote-http-config.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("PR137 pins exactly the approved runtime dependencies without widening package publication", async () => {
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(join(repoRoot, "package-lock.json"), "utf8"));

  assert.deepEqual(packageJson.dependencies, {
    "@modelcontextprotocol/sdk": "1.29.0",
    jose: "6.2.3",
    zod: "4.4.3",
  });
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.bin, undefined);
  assert.equal(packageJson.publishConfig, undefined);
  assert.equal(packageJson.optionalDependencies, undefined);
  assert.equal(packageJson.peerDependencies, undefined);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.deepEqual(packageLock.packages[""].dependencies, packageJson.dependencies);

  for (const [path, metadata] of Object.entries(packageLock.packages)) {
    if (path === "" || metadata.dev === true) continue;
    assert.notEqual(metadata.hasInstallScript, true, `${path} must not run install scripts`);
    assert.equal(metadata.os, undefined, `${path} must not select a native OS artifact`);
    assert.equal(metadata.cpu, undefined, `${path} must not select a native CPU artifact`);
  }
});

test("PR137 configuration is exact HTTPS production fail-closed with empty default Origin allowlist", () => {
  const environment = {
    PORT: "3100",
    NODE_ENV: "production",
    NORMA_MCP_PUBLIC_URL: "https://mcp.norma.example/",
    NORMA_MCP_AUTH0_ISSUER: "https://tenant.eu.auth0.com/",
    NORMA_MCP_AUTH0_AUDIENCE: "https://mcp.norma.example/api",
    NORMA_MCP_AUDIT_HASH_KEY: "production-placeholder-key-with-32-characters",
  };
  const config = loadRemoteMcpRuntimeConfig(environment);
  assert.equal(config.port, 3100);
  assert.equal(config.resourceUrl.href, "https://mcp.norma.example/mcp");
  assert.equal(config.allowedOrigins.size, 0);
  assert.deepEqual(REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS, ["2025-11-25", "2025-06-18"]);

  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_PUBLIC_URL: "http://mcp.norma.example/",
  }), /HTTPS/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_ALLOWED_ORIGINS: "*",
  }), /Wildcard/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH0_AUDIENCE: "",
  }), /required/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUDIT_HASH_KEY: "short",
  }), /32/u);

  const testConfig = loadRemoteMcpRuntimeConfig({
    ...environment,
    NODE_ENV: "test",
    NORMA_MCP_PUBLIC_URL: "http://127.0.0.1:3000/",
    NORMA_MCP_AUTH0_ISSUER: "http://127.0.0.1:4000/",
    NORMA_MCP_ALLOWED_ORIGINS: "http://127.0.0.1:5000",
  });
  assert.deepEqual([...testConfig.allowedOrigins], ["http://127.0.0.1:5000"]);
});

test("PR137 runtime source contains no provider file shell storage upload or public export widening", async () => {
  const sourcePaths = [
    "src/mcp/remote-http-config.ts",
    "src/mcp/remote-http-auth.ts",
    "src/mcp/remote-http-limits.ts",
    "src/mcp/remote-http-server.ts",
  ];
  const source = (await Promise.all(sourcePaths.map((path) => readFile(join(repoRoot, path), "utf8")))).join("\n");
  for (const blocked of [
    "node:fs",
    "node:child_process",
    "node:worker_threads",
    "openai",
    "anthropic",
    "upload",
    "WebSocket",
    "EventStore",
    "sessionIdGenerator: ()",
  ]) {
    assert.equal(source.includes(blocked), false, blocked);
  }
  assert.match(source, /sessionIdGenerator: undefined/u);
  assert.match(source, /REMOTE_TOOL_NAME = "norma[.]analyzeStructuredCompositionV1"/u);
  assert.doesNotMatch(await readFile(join(repoRoot, "src", "index.ts"), "utf8"), /remote-http/u);
});
