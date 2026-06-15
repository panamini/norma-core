import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const roadmapStatusDocPath = join(repoRoot, "docs", "decisions", "2026-06-15-roadmap-status-update.md");
const businessRoadmapPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const docsDir = join(repoRoot, "docs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

const existingMcpRemoteDocs = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];

const blockedRuntimeAndDeploymentPaths = [
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

const requiredRoadmapStatusSections = [
  "# Roadmap Status Update",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## What Remains True From The Original Roadmap",
  "## Historical PR Number Boundary",
  "## Current Position After PR47",
  "## Phase 4 Remote MCP Governance Extension",
  "## Next PR Sequence",
  "## Non-Approval Boundary",
  "## Validation Policy",
  "## Final Decision",
];

const plannedPrLabels = [
  "PR48 — roadmap status update",
  "PR49 — remote MCP/API readiness checkpoint, still no runtime",
  "PR50 — API contract decision, docs/contract-tests only",
  "PR51 — auth, audit-log, and rate-limit policy for API and future remote MCP, docs/contract-tests only",
  "PR52 — minimal API server approval decision, no implementation unless explicitly approved",
  "PR53 — minimal API server skeleton, conditional on PR50 through PR52 approval",
  "PR54 — API contract tests and golden envelopes, conditional on PR53",
  "PR55 — product requirements for read-only result viewer",
  "PR56 — read-only result viewer plan, no UI implementation",
  "PR57 — structured JSON input viewer prototype, conditional on PR55 and PR56",
  "PR58 — verification/replay result UI prototype, no source-truth inference",
  "PR59 — onboarding and examples",
  "PR60 — beta pilot readiness checklist",
  "PR61 — privacy, security, and support policy",
  "PR62 — pricing, packaging, and public npm decision",
  "PR63 — business launch checklist",
];

test("PR48 roadmap status update exists and references the primary roadmap", () => {
  assert.equal(existsSync(roadmapStatusDocPath), true);
  assert.equal(existsSync(businessRoadmapPath), true);

  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);
  const businessRoadmap = readDoc(businessRoadmapPath);

  assertHeadingsInOrder(roadmapStatusDoc, requiredRoadmapStatusSections);
  assertDocMentions(roadmapStatusDoc, [
    "PR48 is docs/contract-tests only",
    "docs/BUSINESS_READINESS_ROADMAP.md remains the primary business readiness roadmap reference",
    "The original roadmap PR numbers are historical",
    "PR39 through GitHub PR47 / PR46-label are now documented as a cautious Phase 4 remote MCP/API readiness extension",
    "Remote MCP remains blocked after PR48",
    "Local STDIO remains the only approved MCP runtime",
  ]);
  assertDocMentions(businessRoadmap, [
    "This is a planning document",
    "It does not authorize scope by itself",
    "This roadmap intentionally lives at `docs/BUSINESS_READINESS_ROADMAP.md`",
  ]);
});

test("PR48 keeps the original roadmap true while treating its PR numbers as historical", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "The original roadmap remains valid as a phase strategy and engineering-discipline document",
    "The original roadmap PR numbers were written before the current PR39 through GitHub PR47 / PR46-label remote MCP governance sequence",
    "Those numbers are historical and must not be read as the current live PR numbering",
    "The current live PR numbers must be taken from GitHub and current repository state",
    "Any future roadmap reference must distinguish between historical roadmap PR labels and actual GitHub PR numbers",
  ]);
});

test("PR48 documents the current Phase 4 extension and next PR sequence", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "After GitHub PR47 / PR46-label, Norma Core is in Phase 4 remote MCP/API readiness governance",
    "This does not mean remote MCP is implemented or approved",
    "Current runtime remains local STDIO only",
    "The following sequence is the current planning path after PR48",
  ]);

  assertDocMentions(roadmapStatusDoc, plannedPrLabels);
  assertDocMentions(roadmapStatusDoc, [
    "API implementation must not happen before API contract, auth, audit-log, and rate-limit gates are accepted",
    "UI implementation must not happen before product requirements and read-only viewer plan are accepted",
    "Public npm publishing must remain blocked until an explicit publishing decision PR approves it",
    "Remote MCP runtime remains blocked unless a future explicit approval PR satisfies the PR39 through PR47 / PR46-label gates",
  ]);
});

test("PR48 preserves MCP remote doc location and package boundaries", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }

  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);

  assert.equal(packageJson.name, "@norma/core");
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
    assert.equal(Object.hasOwn(packageLock.packages[""], fieldName), false, `${fieldName} should stay absent in lock root`);
  }

  assert.equal(packageJson.devDependencies?.typescript, "^5.8.0");
  assert.equal(packageLock.packages[""].devDependencies?.typescript, "^5.8.0");
  assertNoMcpDependency(packageJson);
  assertNoMcpDependency(packageLock.packages[""]);
});

test("PR48 keeps runtime deployment API UI and MCP tool exposure blocked", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "PR48 does not approve",
    "remote MCP runtime implementation",
    "API server implementation",
    "UI implementation",
    "public npm publishing",
    "new MCP tools",
    "arbitrary replay",
    "`norma.replayRun` MCP exposure",
  ]);

  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);

  for (const path of blockedRuntimeAndDeploymentPaths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
});

test("PR48 keeps current local STDIO tool allowlist and replay rejection unchanged", async () => {
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr48-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    approvedCallableTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr48-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr48-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr48-arbitrary-replay-blocked",
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
    id: "pr48-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
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
        `Build output is required before PR48 MCP runtime contract validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function assertNoRemoteMcpRuntimeSurface(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*(?:Server|Transport|Endpoint)|sse|streamable|websocket|networkFetch|XMLHttpRequest|WebSocket)\b/i,
    `${path} must not contain remote MCP runtime markers`,
  );
}

function assertNoMcpRuntimeSideEffects(source, path) {
  assert.doesNotMatch(
    source,
    /\b(?:readFile|writeFile|deleteFile|shell|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
    `${path} must not contain MCP runtime filesystem, shell, or environment behavior`,
  );
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
