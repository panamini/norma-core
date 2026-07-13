import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const policyDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-mcp-decision-doc-location-policy.md",
);
const agentsDocPath = join(repoRoot, "AGENTS.md");
const docsDir = join(repoRoot, "docs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");

const existingMcpRemoteDocs = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const requiredPolicySections = [
  "# MCP Decision Doc Location Policy",
  "## Status",
  "## Decision",
  "## Repository Rule",
  "## Existing MCP Remote Docs",
  "## Legacy Exception Boundary",
  "## Future Decision Doc Rule",
  "## Migration Boundary",
  "## Non-Approval Boundary",
  "## Required Tests",
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

test("PR45 MCP decision doc location policy exists under docs/decisions with a date-prefixed filename", () => {
  assert.equal(existsSync(policyDocPath), true);

  const policyDoc = readDoc(policyDocPath);

  assertHeadingsInOrder(policyDoc, requiredPolicySections);
  assertDocMentions(policyDoc, [
    "PR45 is docs/contract-tests only",
    "docs/decisions/YYYY-MM-DD-topic.md",
    "Future new MCP technical decision documents must use `docs/decisions/YYYY-MM-DD-topic.md`",
    "Existing PR39 through PR44 MCP remote documents remain in their current `docs/MCP_REMOTE_*.md` paths in PR45",
    "documented legacy/canonical exception",
    "Any migration of PR39 through PR44 MCP remote documents requires a separate explicit migration PR",
    "PR45 does not move or rename existing MCP remote documents",
  ]);
});

test("PR45 policy references AGENTS documentation rules and PR39 through PR44 MCP docs", () => {
  assert.equal(existsSync(agentsDocPath), true);

  const agentsDoc = readDoc(agentsDocPath);
  const policyDoc = readDoc(policyDocPath);

  assertDocMentions(agentsDoc, [
    "Technical decisions go in `docs/decisions/`",
    "docs/decisions/YYYY-MM-DD-topic.md",
  ]);
  assertDocMentions(policyDoc, [
    "`AGENTS.md` states that technical decisions go in `docs/decisions/`",
    "PR39",
    "PR40",
    "PR41",
    "PR42",
    "PR43",
    "PR44",
  ]);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
    assertDocMentions(policyDoc, [docPath]);
  }
});

test("PR45 preserves PR39 through PR44 root-level MCP remote docs as the only legacy exception", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();

  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);
});

test("PR45 does not authorize migrating existing MCP remote docs inside PR45", () => {
  const policyDoc = readDoc(policyDocPath);

  assertDocMentions(policyDoc, [
    "PR45 does not migrate existing MCP remote documents",
    "No future PR may treat PR45 as permission to silently move or rename the existing MCP remote documents",
    "move or copy the affected documents in one reviewed change",
    "update all document references atomically",
    "update all contract tests atomically",
    "preserve the decision chain and rollback path",
  ]);
});

test("PR45 keeps package metadata lockfile and MCP dependency boundary unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });

});

test("PR45 keeps local STDIO tools unchanged and replay exposure blocked", async () => {
  const policyDoc = readDoc(policyDocPath);
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr45-tools-list",
    method: "tools/list",
  });

  assertDocMentions(policyDoc, approvedCallableTools);
  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    currentRuntimeTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr45-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr45-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr45-arbitrary-replay-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayMvpDemo",
      arguments: {
        run: {},
      },
    },
  });

  assert.deepEqual(arbitraryReplayResponse, {
    jsonrpc: "2.0",
    id: "pr45-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });

  assertDocMentions(policyDoc, [
    "Remote MCP remains blocked after PR45",
    "Local STDIO remains the only approved MCP runtime",
    "`norma.replayRun` and arbitrary replay remain blocked as MCP exposure",
    "Resources, prompts, sampling, elicitation, logging, telemetry, and retention remain blocked unless separately approved",
  ]);
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function loadHandleMcpJsonRpcMessage() {
  handleMcpJsonRpcMessagePromise ??= import("../dist/src/mcp/stdio-protocol.js")
    .then((module) => {
      assert.equal(
        typeof module.handleMcpJsonRpcMessage,
        "function",
        "dist/src/mcp/stdio-protocol.js should export handleMcpJsonRpcMessage",
      );
      return module.handleMcpJsonRpcMessage;
    })
    .catch((error) => {
      assert.fail(
        `Build output is required before PR45 MCP runtime contract validation: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

  return handleMcpJsonRpcMessagePromise;
}

async function parseRequiredResponse(message) {
  const handleMcpJsonRpcMessage = await loadHandleMcpJsonRpcMessage();
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.ok(response != null, "Handler must return a non-null/undefined JSON-RPC response");
  return JSON.parse(response);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
