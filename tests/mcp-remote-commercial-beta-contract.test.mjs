import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const canonicalRelativePath =
  "docs/decisions/2026-07-13-stateless-remote-mcp-commercial-beta-contract.md";
const canonicalPath = join(repoRoot, canonicalRelativePath);
const roadmapPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");

const legacyDecisionPaths = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const requiredSections = [
  "# Stateless Remote MCP Commercial Beta Contract",
  "## Status",
  "## Authorization and Supersession",
  "## Atomic Product Outcome",
  "## Program Sequence",
  "## Tool Contract",
  "## Transport and Lifecycle",
  "## Authentication and Authorization",
  "## Data and Truth Boundaries",
  "## Network and Runtime Side Effects",
  "## Abuse and Resource Limits",
  "## Observability Retention and Privacy",
  "## Package and Supply Chain Decision",
  "## Deployment Policy",
  "## Security Gate Matrix",
  "## Required PR137 Evidence",
  "## PR138 External Mutation Gate",
  "## PR139 Public Release Gate",
  "## Recovery",
  "## Final Decision",
];

test("PR136 canonical commercial beta contract exists with ordered decisions", () => {
  assert.equal(existsSync(canonicalPath), true);
  const contract = read(canonicalPath);

  assertHeadingsInOrder(contract, requiredSections);
  assertMentions(contract, [
    "CP-NORMA-PERMANENT-MCP-COMMERCIAL-V1 v1",
    "CC-PR136-STATELESS-REMOTE-MCP-COMMERCIAL-CONTRACT-V1",
    "REMOTE_RUNTIME_APPROVED_NOT_IMPLEMENTED",
    "APPROVED_CONTRACT_READY_FOR_PR137_AFTER_MERGE",
    "PR136 must merge before PR137 starts",
    "PR136 does not add dependencies, runtime files, deployment files, secrets, external resources, a ChatGPT connector, or a public submission",
  ]);
});

test("PR136 supersedes future sequencing without rewriting historical decisions", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "only current implementation authority",
    "supersedes the future-work sequencing and blocked-default conclusions in PR39 through PR51",
    "authoritative historical records",
    "former eight-PR remote sequence is compressed",
    "first remote runtime implementation must not define its own approval gates",
  ]);

  for (const relativePath of legacyDecisionPaths) {
    const document = read(join(repoRoot, relativePath));
    assertMentions(document, [
      "Current authority, 2026-07-13",
      canonicalRelativePath,
      "supersedes",
      "historical",
    ]);
  }
});

test("PR136 fixes one remote tool and blocks automatic local inheritance", () => {
  const contract = read(canonicalPath);
  const toolSection = sectionBetween(
    contract,
    "## Tool Contract",
    "## Transport and Lifecycle",
  );

  assert.deepEqual(
    bulletValuesMatching(toolSection, /^norma[.][A-Za-z0-9]+$/),
    ["norma.analyzeStructuredCompositionV1"],
  );

  assertMentions(toolSection, [
    "byte-for-byte equivalent to the local STDIO result",
    "readOnlyHint: true",
    "destructiveHint: false",
    "openWorldHint: false",
    "idempotentHint: true",
    "norma:structured-analyze",
    "every other current local STDIO tool",
    "norma.replayRun and arbitrary replay",
    "PR134 and PR135 visual inspect/resume tools",
    "No local tool is inherited automatically",
    "A missing or empty remote allowlist means no remote tools are exposed",
  ]);
});

test("PR136 fixes stateless Streamable HTTP protocol and network boundaries", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "MCP Streamable HTTP on POST /mcp",
    "2025-11-25",
    "2025-06-18",
    "Every other version is rejected before tool dispatch",
    "sessionIdGenerator is undefined",
    "one low-level MCP server and one transport are created per HTTP request",
    "GET /mcp and DELETE /mcp return 405",
    "legacy HTTP plus SSE and WebSocket are absent",
    "native Node HTTP entry boundary",
    "an absent Origin is accepted for authenticated server-to-server clients",
    "the default Origin allowlist is empty",
    "wildcard CORS is forbidden",
  ]);

  assertMentions(contract, [
    "only approved outbound network traffic is HTTPS discovery/JWKS retrieval",
    "redirects to another origin are rejected",
    "JWKS fetch timeout is at most five seconds",
    "no caller-controlled hostname, path, proxy, or redirect target is used",
    "All other outbound network traffic, filesystem access, shell execution, child process creation, background jobs, durable queues, databases, and caches are blocked",
  ]);
});

test("PR136 fixes Auth0 OAuth identity and token handling", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "All /mcp requests require OAuth 2.1 authentication",
    "selected authorization server is Auth0",
    "manual Client ID Metadata Document registration",
    "private_key_jwt token endpoint authentication",
    "PKCE S256",
    "no Dynamic Client Registration",
    "RFC 9728 protected-resource metadata",
    "Bearer WWW-Authenticate challenge",
    "signature against the configured issuer JWKS",
    "token audience exactly equal to the configured NORMA_MCP_AUTH0_AUDIENCE",
    "a resource claim never substitutes for audience validation",
    "missing or wrong audience is rejected even when its resource claim is correct",
    "wrong resource claim is rejected even when its audience is correct",
    "required scope norma:structured-analyze",
    "non-empty subject identity",
    "never persisted, forwarded to the Norma core, placed in tool output, or logged",
    "HMAC-SHA-256",
  ]);
});

test("PR136 preserves Norma truth and multi-user isolation", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "explicit structured request in memory",
    "persist request bodies or responses",
    "accept uploads",
    "fetch caller-provided URLs",
    "call OpenAI",
    "create or change packs, rules, ratios, tolerances, geometry, selections, or accepted evidence",
    "prompt text, tool metadata, artifacts, or model narration as source truth",
    "Norma source truth, artifact derivation, explicit acceptance, canonical serialization, and exact-set semantics remain unchanged",
    "no shared user data or session state",
    "One subject cannot read or alter another subject's request, response, per-subject quota key, or diagnostics",
    "anonymous rejection pressure cannot trigger that limit and neither bucket reveals subject data",
  ]);
});

test("PR136 fixes bounded abuse, privacy, and retention policy", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "maximum request body: 524288 bytes",
    "maximum JSON depth: 64",
    "maximum string length: 65536 code units",
    "maximum aggregate array elements: 4096",
    "maximum two concurrent analysis calls per authenticated subject",
    "maximum 30 analysis calls per authenticated subject per rolling hour",
    "maximum 120 authenticated /mcp admission attempts globally per rolling minute",
    "maximum 600 unauthenticated or unauthorized rejection attempts globally per rolling minute",
    "Exactly two classes of bounded in-memory cross-request state are allowed",
    "per-subject rate and concurrency accounting keyed only by the pseudonymous subject",
    "one global abuse-accounting object containing two independent count/time buckets",
    "Each POST /mcp attempt increments exactly one global bucket, never both",
    "Missing, invalid, or insufficiently scoped credentials increment only the unauthorized-rejection bucket",
    "Successful authentication and authorization increment only the authenticated-admission bucket",
    "Saturating the unauthorized-rejection bucket must never consume authenticated capacity",
    "platform edge protections do not map anonymous pressure onto the authenticated application quota",
    "missing, invalid, or insufficiently scoped credentials count only against the independent rejection bucket",
    "maximum ten seconds end-to-end per request",
    "Application log retention is seven days",
    "Logs must not contain raw request or response bodies",
    "Raw subject, email, username, organization claims, and IP address are not application log fields",
    "Horizontal scaling or a durable rate-limit store requires a new decision",
  ]);

  assert.doesNotMatch(contract, /audience or resource equal/iu);
  assert.doesNotMatch(
    contract,
    /every POST \/mcp admission attempt increments the global counter exactly once/iu,
  );
});

test("PR136 approves an exact supply chain and no npm publication", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "@modelcontextprotocol/sdk at 1.29.0",
    "zod at 4.4.3",
    "jose at 6.2.3",
    "No semver ranges are allowed",
    "package.json stays private",
    "gains no package export, package bin, publishConfig",
    "npm audit --omit=dev has zero high or critical findings",
    "accepted permissive license",
    "no install script, native binary, or unexpected runtime download",
    "Any version change, additional direct dependency, copyleft/unknown license, high/critical advisory, install script, or native binary requires NEEDS_DECISION",
  ]);
});

test("PR136 defines every PR137 accept and reject gate before runtime", () => {
  const contract = read(canonicalPath);

  for (const gate of [
    "G0 authority",
    "G1 inventory",
    "G2 transport",
    "G3 host/origin",
    "G4 auth",
    "G5 identity",
    "G6 truth",
    "G7 side effects",
    "G8 limits",
    "G9 errors",
    "G10 observability",
    "G11 supply chain",
    "G12 deployment",
  ]) {
    assert.match(contract, new RegExp(escapeRegExp(gate)), gate + " should be documented");
  }

  assertMentions(contract, [
    "Every PR137 gate requires accept-path and reject-path tests",
    "A failing required gate blocks PR137 merge",
    "No live provider, Auth0 tenant, Render service, or ChatGPT connector is needed to merge PR137",
    "local deterministic keys and fixtures",
    "HIGH-risk context-separated review with no P0/P1 findings",
  ]);
});

test("PR136 keeps deployment and public submission behind separate exact gates", () => {
  const contract = read(canonicalPath);

  assertMentions(contract, [
    "one paid Render Web Service",
    "approved total cap of 100 EUR per month",
    "PR136 and PR137 create no Render or Auth0 resources",
    "separate exact confirmation",
    "private beta is limited to ten invited users",
    "at least two distinct invited users",
    "at least 25 successful analysis calls",
    "seven calendar days of observation",
    "runtime error rate below one percent",
    "separate exact confirmation before ChatGPT submission",
  ]);
});

test("business roadmap records PR135 completion and the serialized commercial program", () => {
  const roadmap = read(roadmapPath);

  assertMentions(roadmap, [
    "PR135 is complete",
    "CP-NORMA-PERMANENT-MCP-COMMERCIAL-V1 v1",
    "PR136 - approve one stateless authenticated commercial-beta contract",
    "PR137 - implement one permanent-capable Streamable HTTP runtime",
    "PR138 - add deployment configuration",
    "PR139 - after the beta threshold",
    canonicalRelativePath,
    "PR136 is docs/contract-tests only",
    "Local STDIO tools are not inherited",
  ]);
});

function read(path) {
  return readFileSync(path, "utf8");
}

function assertHeadingsInOrder(document, headings) {
  let previousIndex = -1;

  for (const heading of headings) {
    const index = document.indexOf(heading);
    assert.notEqual(index, -1, heading + " should exist");
    assert.ok(index > previousIndex, heading + " should follow the prior required heading");
    previousIndex = index;
  }
}

function assertMentions(document, snippets) {
  const normalizedDocument = normalizeWhitespace(document);

  for (const snippet of snippets) {
    assert.match(
      normalizedDocument,
      new RegExp(escapeRegExp(normalizeWhitespace(snippet)), "i"),
      snippet + " should be documented",
    );
  }
}

function sectionBetween(document, startHeading, endHeading) {
  const start = document.indexOf(startHeading);
  const end = document.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(start, -1, startHeading + " should exist");
  assert.notEqual(end, -1, endHeading + " should exist after " + startHeading);
  return document.slice(start, end);
}

function bulletValuesMatching(document, pattern) {
  return document
    .split("\n")
    .map((line) => line.match(/^[-] (.+)$/)?.[1])
    .filter((value) => typeof value === "string" && pattern.test(value));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
