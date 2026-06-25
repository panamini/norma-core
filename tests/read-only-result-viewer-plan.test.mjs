import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const docsDir = join(repoRoot, "docs");
const pr56PlanPath = join("docs", "plans", "2026-06-16-read-only-result-viewer-plan.md");
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
const apiContractDocPath = join("docs", "decisions", "2026-06-15-api-contract-decision.md");
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
  "# Read-Only Result Viewer Plan",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Current Verified State",
  "## Viewer Purpose",
  "## Allowed Inputs",
  "## Rejected Inputs",
  "## Required Displayed Result Sections",
  "## Visibility Requirements",
  "## Source-Truth Boundary",
  "## Read-Only Boundary",
  "## Future PR57 Implementation Gates",
  "## Rollback Policy",
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

test("PR56 read-only result viewer plan exists under docs/plans with required headings", () => {
  assert.equal(existsSync(join(repoRoot, pr56PlanPath)), true);
  assert.equal(basename(pr56PlanPath), "2026-06-16-read-only-result-viewer-plan.md");

  const doc = readDoc(pr56PlanPath);
  assertHeadingsInOrder(doc, requiredSections);
  assertDocMentions(doc, [
    "PR56 is docs/contract-tests only.",
    "PR56 is viewer-plan only.",
    "PR56 does not implement UI.",
    "PR56 does not implement runtime behavior.",
    "PR56 does not add routes.",
    "PR56 does not add dependencies.",
    "PR56 does not start PR57.",
    "Product/UI external official references for PR56: Unknown.",
  ]);
});

test("PR56 references PR55 requirements and current roadmap API source documents", () => {
  assert.equal(existsSync(join(repoRoot, pr55DocPath)), true);
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(join(repoRoot, roadmapStatusDocPath)), true);
  assert.equal(existsSync(join(repoRoot, apiContractDocPath)), true);
  assert.equal(existsSync(join(repoRoot, apiPolicyDocPath)), true);
  assert.equal(existsSync(join(repoRoot, apiApprovalDocPath)), true);

  const doc = readDoc(pr56PlanPath);
  assertDocMentions(doc, [
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-15-roadmap-status-update.md",
    "docs/decisions/2026-06-15-api-contract-decision.md",
    "docs/decisions/2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
    "docs/decisions/2026-06-16-minimal-api-server-approval-decision.md",
    "PR50",
    "PR51",
    "PR52",
    "PR53",
    "PR54",
    "PR55",
  ]);
});

test("PR56 records current verified state and keeps unknowns explicit", () => {
  const doc = readDoc(pr56PlanPath);
  const currentState = sectionBetween(doc, "## Current Verified State", "## Viewer Purpose");

  assertDocMentions(currentState, [
    "PR55 is merged.",
    "PR55 merge commit: `88419aeb843130a68863330a1446a42bc41bdc9b`.",
    "Local STDIO remains the only approved MCP runtime.",
    "Remote MCP remains blocked.",
    "The current API handler is local in-process only.",
    "No UI implementation exists in PR56.",
    "Current product/UI external official references: Unknown.",
  ]);
});

test("PR56 defines viewer purpose allowed inputs and rejected inputs", () => {
  const doc = readDoc(pr56PlanPath);
  const purpose = sectionBetween(doc, "## Viewer Purpose", "## Allowed Inputs");
  const allowedInputs = sectionBetween(doc, "## Allowed Inputs", "## Rejected Inputs");
  const rejectedInputs = sectionBetween(doc, "## Rejected Inputs", "## Required Displayed Result Sections");

  assertDocMentions(purpose, [
    "The future viewer must inspect existing Norma result envelopes.",
    "The future viewer must be read-only.",
    "The future viewer must not execute Norma operations.",
    "The future viewer must not create Norma truth.",
    "The future viewer must not define Norma logic.",
  ]);

  assertDocMentions(allowedInputs, [
    "explicit structured JSON upload",
    "explicit structured JSON paste",
    "Norma result envelope",
    "API response envelope",
    "CLI output envelope",
    "MCP tool result envelope",
  ]);

  assertDocMentions(rejectedInputs, [
    "prompt text as source truth",
    "artifact-as-source",
    "camera",
    "image",
    "vision",
    "native CAD",
    "plugin",
    "marketplace",
    "URL fetch",
    "arbitrary local file reads",
    "arbitrary replay",
    "`norma.replayRun`",
    "`/replay-run`",
  ]);
});

test("PR56 requires displayed result sections and visibility for critical details", () => {
  const doc = readDoc(pr56PlanPath);
  const sections = sectionBetween(doc, "## Required Displayed Result Sections", "## Visibility Requirements");
  const visibility = sectionBetween(doc, "## Visibility Requirements", "## Source-Truth Boundary");

  assertDocMentions(sections, [
    "status",
    "diagnostics",
    "warnings",
    "errors",
    "mismatch details",
    "provenance",
    "source refs",
    "output refs",
    "artifact freshness",
    "operation context",
    "pack locks",
    "tolerance policy",
    "serialization version",
    "operation version",
    "result identity where applicable",
  ]);

  assertDocMentions(visibility, [
    "diagnostics visibility",
    "warnings/errors visibility",
    "mismatch details visibility",
    "provenance/source refs visibility",
    "artifact freshness visibility",
    "operation context visibility",
    "pack lock and tolerance policy visibility",
    "serialization version and operation version visibility",
    "result identity display where applicable",
    "must not hide, mute, downgrade, suppress, group away, summarize away, or boolean-collapse",
    "critical warnings",
    "critical errors",
  ]);
});

test("PR56 preserves source truth and read-only boundaries", () => {
  const doc = readDoc(pr56PlanPath);
  const sourceTruth = sectionBetween(doc, "## Source-Truth Boundary", "## Read-Only Boundary");
  const readOnly = sectionBetween(doc, "## Read-Only Boundary", "## Future PR57 Implementation Gates");

  assertDocMentions(sourceTruth, [
    "No source-truth inference is approved.",
    "Structured source objects remain the only source truth.",
    "Artifacts remain derived projections, not source truth.",
    "Prompt text is never source truth.",
    "The viewer plan must not create packs.",
    "The viewer plan must not create rules.",
    "The viewer plan must not create ratios.",
    "The viewer plan must not create tolerances.",
    "The viewer plan must not create geometry.",
    "The viewer plan must not infer intent.",
    "The viewer plan must not select hidden packs.",
    "The viewer plan must not select hidden tolerances.",
  ]);

  assertDocMentions(readOnly, [
    "No UI implementation is approved.",
    "No runtime behavior is approved.",
    "No route is approved.",
    "No public HTTP listener is approved.",
    "No dependency is approved.",
    "No package export is approved.",
    "No deployment configuration is approved.",
    "No remote MCP runtime is approved.",
    "`/replay-mvp-demo` behavior remains unchanged.",
  ]);
});

test("PR56 defines future PR57 gates and rollback without starting implementation", () => {
  const doc = readDoc(pr56PlanPath);
  const pr57 = sectionBetween(doc, "## Future PR57 Implementation Gates", "## Rollback Policy");
  const rollback = sectionBetween(doc, "## Rollback Policy", "## Validation Policy");

  assertDocMentions(pr57, [
    "PR57 must be a separate PR.",
    "PR57 remains blocked until PR56 is accepted.",
    "PR57 must be conditional on PR55 and PR56 approval.",
    "PR57 must preserve every PR56 required displayed result section.",
    "PR57 must include tests before UI implementation.",
    "PR57 must not add remote MCP runtime.",
    "PR57 must not expose `norma.replayRun`.",
    "PR57 must not allow `/replay-run`.",
  ]);

  assertDocMentions(rollback, [
    "Revert the PR56 plan document and PR56 contract test.",
    "No runtime rollback should be required.",
    "No UI rollback should be required.",
  ]);
});

test("PR56 leaves package metadata and dependencies unchanged", () => {
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

test("PR56 leaves runtime deployment UI and root MCP remote docs unchanged", () => {
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

test("PR56 leaves local STDIO MCP tool exposure unchanged", async () => {
  const mcp = await loadHandleMcpJsonRpcMessage();
  const toolsList = parseMcpResponse(
    mcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr56-tools-list",
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
        id: "pr56-replay-run-blocked",
        method: "tools/call",
        params: { name: "norma.replayRun", arguments: {} },
      }),
    ),
  );
  assert.equal(mcpError(replayRun).code, -32602);
  assert.equal(mcpError(replayRun).message, "Unknown tool: norma.replayRun");

  const arbitraryReplay = parseMcpResponse(
    mcp(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "pr56-arbitrary-replay-blocked",
        method: "tools/call",
        params: { name: "norma.replayMvpDemo", arguments: { run: {} } },
      }),
    ),
  );
  assert.equal(mcpError(arbitraryReplay).code, -32602);
  assert.equal(mcpError(arbitraryReplay).message, "Invalid params");
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
  assert.equal(typeof response.error, "object");
  return response.error;
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
