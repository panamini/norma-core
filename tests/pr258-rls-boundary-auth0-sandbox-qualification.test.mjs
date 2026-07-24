import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractPath = new URL(
  "../docs/decisions/2026-07-24-pr258-rls-boundary-auth0-sandbox-qualification.md",
  import.meta.url,
);

test("PR258 freezes the Railway authorization boundary and sandbox-only scope", async () => {
  const contract = await readFile(contractPath, "utf8");

  for (const requiredText of [
    "`SHORTLISTED_PENDING_SANDBOX` / preparation-only",
    "The authorized sandbox boundary is therefore:",
    "Railway API/runtime",
    "raw MCP JWT must never be forwarded to Supabase",
    "provider-neutral authenticated request context",
    "norma:structured-analyze",
    "role: authenticated",
    "ID token cannot replace the MCP access token",
    "RLS defaults to deny",
    "service/secret key",
    "Scalekit and WorkOS are comparison/qualification work only",
    "NEEDS_DECISION",
    "production provider selection or public/commercial readiness",
  ]) {
    assert.ok(contract.includes(requiredText), `missing contract anchor: ${requiredText}`);
  }

  for (const forbiddenText of [
    "Create an Auth0 tenant",
    "CREATE TABLE",
    "ALTER TABLE",
    "service_role key for user",
    "Scalekit adapter",
    "WorkOS adapter",
  ]) {
    assert.equal(contract.includes(forbiddenText), false, `forbidden scope in contract: ${forbiddenText}`);
  }
});
