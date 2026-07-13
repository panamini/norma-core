import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const renderPath = join(repoRoot, "render.yaml");
const runbookPath = join(repoRoot, "docs", "REMOTE_MCP_PRIVATE_BETA_RUNBOOK.md");
const roadmapPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");

const renderLines = [
  "services:",
  "  - type: web",
  "    name: norma-core-remote-mcp-beta",
  "    runtime: node",
  "    plan: starter",
  "    region: frankfurt",
  "    branch: main",
  "    numInstances: 1",
  "    autoDeployTrigger: off",
  "    buildCommand: \"npm ci --ignore-scripts --include=dev && npm run build && npm prune --omit=dev --ignore-scripts\"",
  "    startCommand: \"node bin/norma-core-remote-mcp-http.mjs\"",
  "    healthCheckPath: /readyz",
  "    maxShutdownDelaySeconds: 15",
  "    maintenanceMode:",
  "      enabled: false",
  "    envVars:",
  "      - key: NODE_VERSION",
  "        value: 22.23.1",
  "      - key: NODE_ENV",
  "        value: production",
  "      - key: NORMA_MCP_PUBLIC_URL",
  "        sync: false",
  "      - key: NORMA_MCP_AUTH0_ISSUER",
  "        sync: false",
  "      - key: NORMA_MCP_AUTH0_AUDIENCE",
  "        sync: false",
  "      - key: NORMA_MCP_AUDIT_HASH_KEY",
  "        generateValue: true",
];

test("PR138 Render Blueprint is one manual single-instance Node 22 service", () => {
  assert.equal(existsSync(renderPath), true);
  const render = readFileSync(renderPath, "utf8");
  assert.deepEqual(render.trimEnd().split("\n"), renderLines);

  assert.equal(existsSync(join(repoRoot, "bin", "norma-core-remote-mcp-http.mjs")), true);
  assert.doesNotMatch(render, /\b(?:disk|databases|workers?|cron|keyvalue|redis|previews|scaling|repo|deployHook)\b/iu);
  assert.doesNotMatch(render, /autoDeploy(?:Trigger)?:\s*(?:commit|checksPass|true)/u);
  assert.doesNotMatch(render, /\b(?:free|standard|pro(?:\s+plus|\s+max|\s+ultra)?)\b/u);
});

test("PR138 Blueprint keeps every deployment-specific value outside Git", () => {
  const render = readFileSync(renderPath, "utf8");

  for (const key of [
    "NORMA_MCP_PUBLIC_URL",
    "NORMA_MCP_AUTH0_ISSUER",
    "NORMA_MCP_AUTH0_AUDIENCE",
  ]) {
    assert.match(render, new RegExp(`- key: ${key}\\n        sync: false`, "u"));
  }
  assert.match(render, /- key: NORMA_MCP_AUDIT_HASH_KEY\n        generateValue: true/u);
  assert.doesNotMatch(render, /(?:auth0\.com|onrender\.com|client[_-]?id|client[_-]?secret|bearer\s|-----BEGIN|[A-Za-z0-9_-]{48,})/iu);
  assert.doesNotMatch(render, /NORMA_MCP_ALLOWED_ORIGINS/u);
  assert.doesNotMatch(render, /\*/u);
});

test("PR138 runbook keeps external mutation and public submission blocked", () => {
  const runbook = readFileSync(runbookPath, "utf8");

  for (const required of [
    "CONFIGURATION_READY_EXTERNAL_MUTATION_BLOCKED",
    "CC-PR138-RENDER-AUTH0-PRIVATE-BETA-LIVE-V1 v1",
    "one Render Web Service",
    "at most ten named invited users",
    "public signup disabled",
    "Blueprint Settings > Auto Sync = No",
    "creation-triggered first deploy",
    "require byte equality with the recorded approved commit SHA",
    "both creates/provisions the",
    "there is no",
    "separate manual-first-deploy boundary",
    "All subsequent Blueprint syncs and service deploys are manual",
    "Enable RBAC",
    "require_client_grant",
    "subject_type=user",
    "only `norma:structured-analyze`",
    "unassigned or eleventh tenant user",
    "disconnect or delete the Blueprint from",
    "Always ask",
    "Allow once",
    "at least two distinct invited users",
    "at least 25 successful analysis calls",
    "seven calendar days of observation",
    "runtime error rate below one percent",
    "disable the private ChatGPT connector",
    "suspend and delete the Render service",
    "Public submission remains a separate PR139 gate",
  ]) {
    assert.match(runbook, new RegExp(escapeRegExp(required), "iu"), required);
  }

  assert.match(runbook, /Render Hobby workspace application logs and service\s+metrics retain seven days/iu);
  assert.match(runbook, /Auth0 Essentials retains identity-provider logs for\s+five days/iu);
  assert.match(runbook, /dedicated database connection/iu);
  assert.match(runbook, /does not\s+disable Blueprint Auto Sync/iu);
  assert.match(runbook, /disable every other\s+connection for that application/iu);
  assert.match(runbook, /Do not enable Auth0 Organizations or organization\s+signup/iu);
  assert.match(runbook, /client\s+without (?:this|the) grant (?:must not obtain API access|are rejected)/iu);
  assert.doesNotMatch(runbook, /Start the first deploy manually/iu);
  assert.ok(
    runbook.indexOf("Complete the Auth0 fail-closed setup") <
      runbook.indexOf("Click **Deploy Blueprint** once"),
  );
  assert.ok(
    runbook.indexOf("Click **Deploy Blueprint** once") <
      runbook.indexOf("Blueprint\n   Settings > Auto Sync = No"),
  );
  assert.match(runbook, /zero remaining Blueprint, service, connector, disk, database, key,\s+role, grant, connection, client, job/iu);
  assert.match(runbook, /Do not export raw Auth0 events/iu);
});

test("PR138 preflight fails closed before any external mutation", () => {
  const runbook = readFileSync(runbookPath, "utf8");
  const preflight = runbook.indexOf("## Mandatory Read-Only Preflight");
  const authSetup = runbook.indexOf("## Auth0 Setup After Approval");
  const renderCreation = runbook.indexOf("## Render Creation And First Deploy After Approval");

  assert.ok(preflight >= 0 && preflight < authSetup && authSetup < renderCreation);
  for (const required of [
    "Render **workspace** is Hobby",
    "Auth0 subscription is Essentials",
    "Node.js `22.23.1` runtime",
    "first external mutation",
  ]) {
    assert.match(runbook, new RegExp(escapeRegExp(required), "iu"), required);
  }
  assert.match(runbook, /Any different or unverifiable plan, retention,\s+runtime version, or access-control capability is `NEEDS_DECISION`/iu);
});

test("PR138 roadmap distinguishes repository readiness from the live beta gate", () => {
  const roadmap = readFileSync(roadmapPath, "utf8");

  for (const required of [
    "CC-PR138-RENDER-PRIVATE-BETA-DEPLOYMENT-PACKAGE-V1 v1",
    "repository-only deployment package",
    "autoDeployTrigger: off",
    "creates no Auth0 tenant, Render service, ChatGPT connector, or spend",
    "CC-PR138-RENDER-AUTH0-PRIVATE-BETA-LIVE-V1 v1",
    "PR138 is not live-complete",
  ]) {
    assert.match(roadmap, new RegExp(escapeRegExp(required), "iu"), required);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
