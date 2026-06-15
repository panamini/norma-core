import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const pr45DecisionDocRelativePath =
  "docs/decisions/2026-06-15-mcp-remote-decision-doc-location-policy.md";
const pr45DecisionDocPath = join(repoRoot, pr45DecisionDocRelativePath);
const docsDir = join(repoRoot, "docs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

const legacyRootMcpRemoteDocs = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const blockedRemoteMcpPaths = [
  "src/mcp/http-server.ts",
  "src/mcp/streamable-http.ts",
  "src/mcp/sse.ts",
  "src/mcp/websocket.ts",
  "src/mcp/auth.ts",
  "src/mcp/deployment.ts",
  "bin/norma-core-mcp-http.mjs",
  "bin/norma-core-mcp-server.mjs",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  ".env",
  ".env.example",
  "fly.toml",
  "railway.json",
  "render.yaml",
  "netlify.toml",
  "vercel.json",
  "wrangler.toml",
  "serverless.yml",
  "serverless.yaml",
  "Procfile",
  ".github/workflows/remote-mcp.yml",
  ".github/workflows/remote-mcp.yaml",
];

const requiredDecisionSections = [
  "# MCP Remote Decision Document Location Policy",
  "## Status",
  "## Source Documents",
  "## Decision",
  "## Legacy / Canonical Exception",
  "## Future Decision Document Rule",
  "## Migration Boundary",
  "## Remote MCP Non-Approval Boundary",
  "## Final Decision",
];

test("PR45 MCP remote decision document location policy exists and cites source documents", () => {
  assert.equal(existsSync(pr45DecisionDocPath), true);

  const decisionDoc = readDoc(pr45DecisionDocPath);

  assertHeadingsInOrder(decisionDoc, requiredDecisionSections);
  assertDocMentions(decisionDoc, [
    "PR45 is docs/contract-tests only",
    "Repository instruction: Technical decisions go in `docs/decisions/`",
    "Repository instruction: decision filenames should use `docs/decisions/YYYY-MM-DD-topic.md`",
    "PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`",
    "PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`",
    "PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`",
    "PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`",
    "PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`",
    "PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`",
  ]);
});

test("PR45 preserves PR39 through PR44 root-level MCP remote docs as the only legacy exception", () => {
  for (const relativePath of legacyRootMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, relativePath)), true, `${relativePath} should remain in place`);
  }

  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = legacyRootMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const relativePath of filesUnder("docs/decisions")) {
    assert.doesNotMatch(relativePath, /^docs\/decisions\/MCP_REMOTE_.*\.md$/);
  }
});

test("PR45 requires future MCP remote decisions to use date-prefixed docs/decisions files", () => {
  const decisionDoc = readDoc(pr45DecisionDocPath);
  const decisionFiles = filesUnder("docs/decisions").filter((path) => path.endsWith(".md")).sort();

  assert.equal(decisionFiles.includes(pr45DecisionDocRelativePath), true);

  for (const relativePath of decisionFiles) {
    assert.match(
      relativePath,
      /^docs\/decisions\/\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
    );
  }

  assertDocMentions(decisionDoc, [
    "Future new technical decision docs must use `docs/decisions/YYYY-MM-DD-topic.md`.",
    "Future new MCP remote decision docs must be created under `docs/decisions/` with date-prefixed kebab-case filenames.",
    "Future new MCP remote decision docs must not be added as root-level `docs/MCP_REMOTE_*.md` files.",
    "Root-level `docs/MCP_REMOTE_*.md` paths are a legacy/canonical exception only for PR39 through PR44.",
    "No future PR may treat the legacy/canonical exception as approval to add new root-level MCP remote decision docs.",
  ]);
});

test("PR45 requires a separate explicit migration PR before moving PR39 through PR44 docs", () => {
  const decisionDoc = readDoc(pr45DecisionDocPath);

  assertDocMentions(decisionDoc, [
    "PR45 does not move, rename, duplicate, or rewrite these documents.",
    "Existing contract tests may continue to reference the PR39-PR44 root-level paths until a separate migration PR changes them.",
    "Any migration of the PR39 through PR44 MCP remote docs must be a separate explicit migration PR.",
    "That migration PR must state the exact migration scope before moving files.",
    "That migration PR must update every current path reference.",
    "That migration PR must include full test updates.",
    "PR45 is not that migration PR.",
  ]);
});

test("PR45 keeps remote MCP runtime package deployment and tool exposure changes blocked", () => {
  const decisionDoc = readDoc(pr45DecisionDocPath);
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);

  assertDocMentions(decisionDoc, [
    "Remote MCP remains blocked after PR45",
    "Local STDIO remains the only approved MCP runtime",
    "PR45 does not approve remote MCP runtime implementation",
    "PR45 does not approve deployment",
    "PR45 does not approve package, dependency, package metadata, lockfile, runtime, deployment, auth, logging, telemetry, retention, resource, prompt, sampling, elicitation, or tool exposure changes.",
    "Current official documentation state in PR45: Unknown",
    "Current MCP tool exposure remains exactly the local STDIO allowlist",
    "Unknown remote MCP decisions remain blocked",
  ]);

  assert.doesNotMatch(decisionDoc, /^remote MCP is approved$/im);
  assert.doesNotMatch(decisionDoc, /^deployment is approved$/im);
  assert.doesNotMatch(decisionDoc, /^runtime implementation is approved$/im);

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });

  for (const fieldName of [
    "publishConfig",
    "bin",
    "files",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
    assert.equal(
      Object.hasOwn(packageLock.packages[""], fieldName),
      false,
      `${fieldName} should stay absent in lock root`,
    );
  }

  assert.deepEqual(packageJson.devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(packageLock.packages[""].devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(Object.keys(packageLock.packages).sort(), ["", "node_modules/typescript"]);
  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);

  for (const relativePath of blockedRemoteMcpPaths) {
    assert.equal(existsSync(join(repoRoot, relativePath)), false, `${relativePath} must not exist`);
  }
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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

function assertHeadingsInOrder(doc, headings) {
  let previousIndex = -1;

  for (const heading of headings) {
    const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = headingPattern.exec(doc);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    const index = match.index;
    assert.ok(index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = index;
  }
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
