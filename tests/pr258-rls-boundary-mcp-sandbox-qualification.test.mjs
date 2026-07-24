import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractPath = new URL(
  "../docs/decisions/2026-07-24-pr258-rls-boundary-mcp-sandbox-qualification.md",
  import.meta.url,
);

test("PR258 freezes the Railway boundary and identical Scalekit/Auth0 sandbox matrix", async () => {
  const contract = await readFile(contractPath, "utf8");

  for (const requiredText of [
    "# PR258 RLS Boundary and MCP Sandbox Qualification Contract",
    "`SHORTLISTED_PENDING_SANDBOX` / preparation-only",
    "Scalekit is the first sandbox candidate",
    "Auth0 is the fallback candidate",
    "No provider is locked for production",
    "The authorized sandbox boundary is therefore:",
    "Railway API/runtime",
    "raw MCP JWT must never be forwarded to Supabase",
    "provider-neutral authenticated request context",
    "norma:structured-analyze",
    "role: authenticated",
    "ID token cannot replace the MCP access token",
    "RLS defaults to deny",
    "service/secret-key",
    "## Scalekit-first sandbox qualification and Auth0 fallback",
    "same matrix against Auth0",
    "MCP/OAuth discovery",
    "DCR or CIMD",
    "predefined client",
    "PKCE",
    "S256",
    "Resource to audience",
    "consent, refresh, and revocation",
    "tenant isolation",
    "transaction-local RLS",
    "pooled-connection reset",
    "adapter-neutral rollback",
    "no irreversible migration",
    "If both providers pass",
    "lower residual security and operational risk",
    "NEEDS_DECISION",
    "production provider selection or public/commercial readiness",
  ]) {
    assert.ok(contract.includes(requiredText), `missing contract anchor: ${requiredText}`);
  }

  for (const forbiddenText of [
    "Auth0 is the first sandbox candidate",
    "Auth0-first sandbox qualification",
    "CREATE TABLE",
    "ALTER TABLE",
    "service_role key for user",
    "Scalekit implementation",
    "Auth0 implementation",
  ]) {
    assert.equal(contract.includes(forbiddenText), false, `forbidden scope in contract: ${forbiddenText}`);
  }
});
