import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { permanentRemoteMcpDependencies } from "./current-remote-mcp-boundary.mjs";

import {
  loadRemoteMcpRuntimeConfig,
  REMOTE_MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from "../dist/src/mcp/remote-http-config.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("PR137 pins exactly the approved runtime dependencies without widening package publication", async () => {
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(join(repoRoot, "package-lock.json"), "utf8"));

  assert.deepEqual(packageJson.dependencies, permanentRemoteMcpDependencies);
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
    NORMA_MCP_AUTH_ISSUER: "https://tenant.eu.auth0.com/",
    NORMA_MCP_AUTH_JWKS_URL: "https://tenant.eu.auth0.com/.well-known/jwks.json",
    NORMA_MCP_AUTHORIZATION_SERVER_URL: "https://tenant.eu.auth0.com/",
    NORMA_MCP_AUTH_TENANT_CLAIM: "tenant_id",
    NORMA_MCP_AUTH_AUDIENCE: "https://mcp.norma.example/mcp",
    NORMA_MCP_AUDIT_HASH_KEY: "production-placeholder-key-with-32-characters",
  };
  const config = loadRemoteMcpRuntimeConfig(environment);
  assert.equal(config.port, 3100);
  assert.equal(config.resourceUrl.href, "https://mcp.norma.example/mcp");
  assert.equal(config.authorizationServerUrl.href, "https://tenant.eu.auth0.com/");
  assert.equal(config.jwksUrl.href, "https://tenant.eu.auth0.com/.well-known/jwks.json");
  assert.equal(config.authorizationScope, "norma:structured-analyze");
  assert.equal(config.tenantClaim, "tenant_id");
  assert.equal(config.tokenIntrospection, undefined);
  assert.equal(config.revocationMode, "disabled");
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
    NORMA_MCP_AUTH_AUDIENCE: "",
  }), /required/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH_AUDIENCE: "https://mcp.norma.example/api",
  }), /exactly match/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUDIT_HASH_KEY: "short",
  }), /32/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH_TENANT_CLAIM: "tenant id",
  }), /claim name/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH_INTROSPECTION_URL: "https://tenant.eu.auth0.com/oauth/introspect",
  }), /configured together/u);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_REVOCATION_MODE: "postgresql",
  }), /requires NORMA_MCP_AUTHZ_DATA_MODE=postgresql/u);
  const revocationConfig = loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
    NORMA_MCP_REVOCATION_MODE: "postgresql",
  });
  assert.equal(revocationConfig.revocationMode, "postgresql");
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH_INTROSPECTION_URL: "https://other.example/oauth/introspect",
    NORMA_MCP_AUTH_INTROSPECTION_CLIENT_ID: "resource-server",
    NORMA_MCP_AUTH_INTROSPECTION_CLIENT_SECRET: "test-secret",
  }), /issuer origin/u);

  const introspectionConfig = loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH_INTROSPECTION_URL: "https://tenant.eu.auth0.com/oauth/introspect",
    NORMA_MCP_AUTH_INTROSPECTION_CLIENT_ID: "resource-server",
    NORMA_MCP_AUTH_INTROSPECTION_CLIENT_SECRET: "test-secret",
  });
  assert.equal(introspectionConfig.tokenIntrospection.url.href, "https://tenant.eu.auth0.com/oauth/introspect");
  assert.equal(introspectionConfig.tokenIntrospection.clientId, "resource-server");

  const testConfig = loadRemoteMcpRuntimeConfig({
    ...environment,
    NODE_ENV: "test",
    NORMA_MCP_PUBLIC_URL: "http://127.0.0.1:3000/",
    NORMA_MCP_AUTH_ISSUER: "http://127.0.0.1:4000/",
    NORMA_MCP_AUTH_JWKS_URL: "http://127.0.0.1:4000/keys",
    NORMA_MCP_AUTH_AUDIENCE: "http://127.0.0.1:3000/mcp",
    NORMA_MCP_ALLOWED_ORIGINS: "http://127.0.0.1:5000",
  });
  assert.deepEqual([...testConfig.allowedOrigins], ["http://127.0.0.1:5000"]);
});

test("PR258 keeps Auth0 environment names as a rollback-only compatibility alias", () => {
  const config = loadRemoteMcpRuntimeConfig({
    NODE_ENV: "test",
    NORMA_MCP_PUBLIC_URL: "http://127.0.0.1:3000/",
    NORMA_MCP_AUTH0_ISSUER: "http://127.0.0.1:4000/",
    NORMA_MCP_AUTH0_AUDIENCE: "http://127.0.0.1:3000/mcp",
    NORMA_MCP_AUDIT_HASH_KEY: "test-only-audit-key-that-is-at-least-32-characters",
  });
  assert.equal(config.issuer.href, "http://127.0.0.1:4000/");
  assert.equal(config.audience, "http://127.0.0.1:3000/mcp");
  assert.equal(config.jwksUrl, undefined);
  assert.throws(() => loadRemoteMcpRuntimeConfig({
    NODE_ENV: "test",
    NORMA_MCP_PUBLIC_URL: "http://127.0.0.1:3000/",
    NORMA_MCP_AUTH0_ISSUER: "http://127.0.0.1:4000/",
    NORMA_MCP_AUTH0_AUDIENCE: "http://127.0.0.1:3000/api",
    NORMA_MCP_AUDIT_HASH_KEY: "test-only-audit-key-that-is-at-least-32-characters",
  }), /exactly match/u);
});

test("PR259 maps Scalekit environment, JWKS, authorization server, and resource audience without provider naming", () => {
  const config = loadRemoteMcpRuntimeConfig({
    NODE_ENV: "production",
    NORMA_MCP_PUBLIC_URL: "https://norma-sandbox.example/",
    NORMA_MCP_AUTH_ISSUER: "https://twoweeks.scalekit.dev",
    NORMA_MCP_AUTH_JWKS_URL: "https://twoweeks.scalekit.dev/keys",
    NORMA_MCP_AUTHORIZATION_SERVER_URL: "https://twoweeks.scalekit.dev/resources/res_sandbox",
    NORMA_MCP_AUTH_SCOPE: "norma:structured_analyze",
    NORMA_MCP_AUTH_AUDIENCE: "https://norma-sandbox.example/mcp",
    NORMA_MCP_AUDIT_HASH_KEY: "sandbox-only-audit-key-that-is-at-least-32-characters",
  });
  assert.equal(config.issuerClaim, "https://twoweeks.scalekit.dev");
  assert.equal(config.jwksUrl.href, "https://twoweeks.scalekit.dev/keys");
  assert.equal(config.authorizationServerUrl.href, "https://twoweeks.scalekit.dev/resources/res_sandbox");
  assert.equal(config.authorizationScope, "norma:structured_analyze");
  assert.equal(config.audience, config.resourceUrl.href);
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
