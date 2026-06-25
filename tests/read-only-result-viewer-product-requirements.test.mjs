import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const docsDir = join(repoRoot, "docs");
const pr55DocPath = join(
  "docs",
  "decisions",
  "2026-06-16-read-only-result-viewer-product-requirements.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const roadmapStatusDocPath = join(
  "docs",
  "decisions",
  "2026-06-15-roadmap-status-update.md",
);
const apiContractDocPath = join(
  "docs",
  "decisions",
  "2026-06-15-api-contract-decision.md",
);
const apiPolicyDocPath = join(
  "docs",
  "decisions",
  "2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
);
const apiApprovalDocPath = join(
  "docs",
  "decisions",
  "2026-06-16-minimal-api-server-approval-decision.md",
);
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

let handleMcpJsonRpcMessagePromise;

const requiredSections = [
  "# Read-Only Result Viewer Product Requirements",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Current Verified State",
  "## Product Requirements",
  "## Required Result Visibility",
  "## Source-Truth Boundary",
  "## Read-Only Boundary",
  "## Input Requirements",
  "## Non-Goals",
  "## Future PR56 Plan Requirements",
  "## Validation Policy",
  "## Final Decision",
];

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeTools = [...approvedCallableTools, "norma.analyzeStructuredCompositionV1"];

const existingMcpRemoteDocs = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const blockedRuntimePackageUiDeploymentPaths = [
  "src/ui",
  "src/viewer",
  "src/app",
  "src/server",
  "src/routes",
  "src/http",
  "src/mcp/http-server.ts",
  "src/mcp/streamable-http.ts",
  "src/mcp/sse.ts",
  "src/mcp/websocket.ts",
  "src/mcp/auth.ts",
  "src/mcp/deployment.ts",
  "bin/norma-core-api.mjs",
  "bin/norma-core-server.mjs",
  "bin/norma-core-mcp-http.mjs",
  "bin/norma-core-mcp-server.mjs",
  "Dockerfile",
  "docker-compose.yml",
  "compose.yml",
  ".env",
  ".env.example",
  "serverless.yml",
  "vercel.json",
  "netlify.toml",
  "wrangler.toml",
  "fly.toml",
  "render.yaml",
  "Procfile",
  "nginx.conf",
  "Caddyfile",
  "caddyfile",
];

test("PR55 product requirements doc exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(join(repoRoot, pr55DocPath)), true);
  assert.equal(basename(pr55DocPath), "2026-06-16-read-only-result-viewer-product-requirements.md");

  const doc = readDoc(pr55DocPath);
  assertHeadingsInOrder(doc, requiredSections);
  assertDocMentions(doc, [
    "PR55 is docs/contract-tests only.",
    "PR55 is product-requirements only.",
    "PR55 does not implement UI.",
    "PR55 does not implement runtime behavior.",
    "PR55 does not add routes.",
    "PR55 does not add dependencies.",
    "Product/UI external official references for PR55: Unknown.",
  ]);
});

test("PR55 references current roadmap API policy implementation and golden-envelope source documents", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(join(repoRoot, roadmapStatusDocPath)), true);
  assert.equal(existsSync(join(repoRoot, apiContractDocPath)), true);
  assert.equal(existsSync(join(repoRoot, apiPolicyDocPath)), true);
  assert.equal(existsSync(join(repoRoot, apiApprovalDocPath)), true);

  const doc = readDoc(pr55DocPath);
  assertDocMentions(doc, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-15-roadmap-status-update.md",
    "docs/decisions/2026-06-15-api-contract-decision.md",
    "docs/decisions/2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
    "docs/decisions/2026-06-16-minimal-api-server-approval-decision.md",
    "PR53 minimal local in-process API handler skeleton",
    "PR54 API contract golden envelopes",
    "PR48",
    "PR50",
    "PR51",
    "PR52",
    "PR53",
    "PR54",
  ]);
});

test("PR55 records the current verified product readiness boundary", () => {
  const doc = readDoc(pr55DocPath);
  const currentState = sectionBetween(doc, "## Current Verified State", "## Product Requirements");

  assertDocMentions(currentState, [
    "PR54 is merged.",
    "Merge commit: `979a514bcb5d21f0f16582c294539fc9aa075d8d`.",
    "Local STDIO remains the only approved MCP runtime.",
    "Remote MCP remains blocked.",
    "The current API handler is local in-process only.",
    "No UI implementation exists in PR55.",
    "Current product/UI external official references: Unknown.",
  ]);
});

test("PR55 defines read-only result viewer requirements without UI implementation", () => {
  const doc = readDoc(pr55DocPath);
  const productRequirements = sectionBetween(doc, "## Product Requirements", "## Required Result Visibility");

  assertDocMentions(productRequirements, [
    "The first user-facing product surface must be a read-only result viewer.",
    "The first supported input path must be explicit structured JSON upload or paste.",
    "The viewer must inspect existing Norma result envelopes only.",
    "The viewer must not execute Norma operations.",
    "The viewer must not mutate source data.",
    "The viewer must not create source truth.",
    "The viewer must not collapse results to a generic boolean.",
    "PR55 approves no UI implementation.",
  ]);
});

test("PR55 requires preserving all approved result visibility fields", () => {
  const doc = readDoc(pr55DocPath);
  const visibility = sectionBetween(doc, "## Required Result Visibility", "## Source-Truth Boundary");

  assertDocMentions(visibility, [
    "diagnostics",
    "provenance",
    "source refs",
    "output refs",
    "warnings",
    "errors",
    "mismatch details",
    "artifact freshness",
    "operation context",
    "pack locks",
    "tolerance policy",
    "serialization version",
    "operation version",
    "result identity where applicable",
    "critical warnings",
    "critical errors",
    "must not hide, mute, downgrade, suppress, group away, or summarize away",
    "must not convert warnings, errors, or mismatches into a pass/fail badge only",
  ]);
});

test("PR55 blocks source-truth inference prompt artifact and arbitrary replay behavior", () => {
  const doc = readDoc(pr55DocPath);
  const sourceTruth = sectionBetween(doc, "## Source-Truth Boundary", "## Read-Only Boundary");

  assertDocMentions(sourceTruth, [
    "No source-truth inference is approved.",
    "Structured source objects remain the only source truth.",
    "Artifacts remain derived projections, not source truth.",
    "Prompt text is never source truth.",
    "The viewer must not create packs.",
    "The viewer must not create rules.",
    "The viewer must not create ratios.",
    "The viewer must not create tolerances.",
    "The viewer must not create geometry.",
    "The viewer must not infer intent.",
    "The viewer must not select hidden packs.",
    "The viewer must not select hidden tolerances.",
    "The viewer must not perform arbitrary replay.",
    "`norma.replayRun` remains blocked.",
    "`/replay-run` remains blocked.",
    "`/replay-mvp-demo` remains fixed-demo-only.",
  ]);
});

test("PR55 keeps runtime package deployment remote MCP and UI implementation blocked", () => {
  const doc = readDoc(pr55DocPath);
  const readOnly = sectionBetween(doc, "## Read-Only Boundary", "## Input Requirements");
  const nonGoals = sectionBetween(doc, "## Non-Goals", "## Future PR56 Plan Requirements");

  assertDocMentions(readOnly, [
    "No runtime behavior is approved.",
    "No API route is approved.",
    "No UI implementation is approved.",
    "No package export is approved.",
    "No dependency is approved.",
    "No deployment configuration is approved.",
    "No remote MCP runtime is approved.",
  ]);

  assertDocMentions(nonGoals, [
    "UI implementation",
    "runtime behavior",
    "route changes",
    "dependencies",
    "package exports",
    "deployment config",
    "remote MCP runtime",
    "camera/image/vision",
    "native CAD integration",
    "beauty score",
    "creative recommendation",
    "intent inference",
    "prompt-as-source",
    "artifact-as-source",
  ]);
});

test("PR55 requires PR56 to remain a separate read-only viewer plan", () => {
  const doc = readDoc(pr55DocPath);
  const pr56 = sectionBetween(doc, "## Future PR56 Plan Requirements", "## Validation Policy");

  assertDocMentions(pr56, [
    "PR56 must be a separate PR.",
    "PR56 must remain a read-only result viewer plan.",
    "PR56 must not implement UI unless a later explicit PR approves implementation.",
    "PR56 must preserve the PR55 result visibility requirements.",
    "PR56 must preserve the source-truth boundary.",
  ]);
});

test("PR55 leaves package metadata and dependencies unchanged", () => {
  const packageJson = parseJson("package.json");
  const packageLock = parseJson("package-lock.json");

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.equal(packageJson.devDependencies?.typescript, "^5.8.0");
  assert.equal(packageLock.packages[""].devDependencies?.typescript, "^5.8.0");
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "bin"), false);
  assert.deepEqual(Object.keys(packageJson.exports ?? {}).sort(), ["."]);
  assertNoMcpDependency(packageJson);
  assertNoMcpDependency(packageLock.packages[""]);
});

test("PR55 leaves runtime deployment UI and root MCP remote docs unchanged", () => {
  assert.deepEqual(filesUnder("src/api"), ["src/api/minimal-api-server.ts"]);
  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);
  assertPathsAbsent(blockedRuntimePackageUiDeploymentPaths);

  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();
  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);
});

test("PR55 leaves local STDIO MCP tool exposure unchanged", async () => {
  const mcp = await loadHandleMcpJsonRpcMessage();
  const toolsList = parseMcpResponse(
    mcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr55-tools-list",
        method: "tools/list",
      }),
    ),
  );
  assert.deepEqual(
    [...toolsList.result.tools.map((tool) => tool.name)].sort(),
    [...currentRuntimeTools].sort(),
  );

  const replayRun = parseMcpResponse(
    mcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr55-replay-run-blocked",
        method: "tools/call",
        params: { name: "norma.replayRun", arguments: {} },
      }),
    ),
  );
  assert.equal(mcpError(replayRun).code, -32602);
  assert.equal(mcpError(replayRun).message ?? mcpError(replayRun).msg, "Unknown tool: norma.replayRun");

  const arbitraryReplay = parseMcpResponse(
    mcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr55-arbitrary-replay-blocked",
        method: "tools/call",
        params: { name: "norma.replayMvpDemo", arguments: { run: {} } },
      }),
    ),
  );
  assert.equal(mcpError(arbitraryReplay).code, -32602);
  assert.equal(mcpError(arbitraryReplay).message ?? mcpError(arbitraryReplay).msg, "Invalid params");
});

function readDoc(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function parseJson(path) {
  return JSON.parse(readDoc(path));
}

async function loadHandleMcpJsonRpcMessage() {
  handleMcpJsonRpcMessagePromise ??= import("../dist/src/mcp/stdio-protocol.js").then((mod) => {
    assert.equal(typeof mod.handleMcpJsonRpcMessage, "function");
    return mod.handleMcpJsonRpcMessage;
  });
  return handleMcpJsonRpcMessagePromise;
}

function parseMcpResponse(response) {
  assert.equal(typeof response, "string");
  return JSON.parse(response);
}

function mcpError(response) {
  return response.error ?? response.err;
}

function filesUnder(path) {
  const absolutePath = join(repoRoot, path);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return relativeFiles(absolutePath, path).sort();
}

function relativeFiles(absolutePath, relativePath) {
  const stat = statSync(absolutePath);
  if (stat.isFile()) {
    return [relativePath];
  }

  assert.equal(stat.isDirectory(), true, `${relativePath} should be a file or directory`);
  return readdirSync(absolutePath).flatMap((entry) =>
    relativeFiles(join(absolutePath, entry), `${relativePath}/${entry}`),
  );
}

function assertPathsAbsent(paths) {
  for (const path of paths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }
}

function assertNoMcpDependency(packageJson) {
  for (const dependencyGroup of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]) {
    for (const dependencyName of Object.keys(dependencyGroup ?? {})) {
      assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
    }
  }
}

function assertHeadingsInOrder(doc, headings) {
  let previousIndex = -1;
  for (const heading of headings) {
    const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = headingPattern.exec(doc);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function sectionBetween(doc, startHeading, endHeading) {
  const start = doc.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = doc.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(end, -1, `${endHeading} should exist`);
  assert.ok(end > start, `${endHeading} should appear after ${startHeading}`);
  return doc.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
