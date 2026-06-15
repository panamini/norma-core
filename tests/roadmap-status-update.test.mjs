import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const roadmapStatusDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-roadmap-status-update.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
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

const requiredRoadmapSections = [
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

test("PR48 roadmap status update exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(roadmapStatusDocPath), true);
  assert.equal(basename(roadmapStatusDocPath), "2026-06-15-roadmap-status-update.md");

  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);
  assertHeadingsInOrder(roadmapStatusDoc, requiredRoadmapSections);
  assertDocMentions(roadmapStatusDoc, [
    "PR48 is docs/contract-tests only",
    "PR48 updates roadmap status after PR47 / PR46-label",
    "Current official documentation state in PR48: Unknown",
    "PR48 does not re-check current official docs because it makes no transport, auth, package, runtime, deployment, API, UI, provider-compatibility, or tool-exposure decision",
  ]);
});

test("PR48 documents the original roadmap as planning context with historical PR numbers", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(businessRoadmapDoc, [
    "This is a planning document",
    "It does not authorize scope by itself",
    "## Phase 4",
    "## Phase 6",
  ]);
  assertDocMentions(roadmapStatusDoc, [
    "The original Business Readiness Roadmap remains a planning document",
    "The roadmap does not authorize scope by itself",
    "The original PR numbers in the roadmap are historical",
    "Historical PR numbers in `docs/BUSINESS_READINESS_ROADMAP.md` must not be treated as current PR numbers",
    "current repository history wins",
  ]);
});

test("PR48 documents PR39 through PR47 / PR46-label as a cautious Phase 4 extension", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "Current PR39-PR47 / PR46-label sequence is a cautious Phase 4 extension of remote MCP/API readiness",
    "PR39-PR47 / PR46-label are a cautious Phase 4 extension",
    "This extension was intentionally conservative and docs/contract-tests only after local STDIO MCP",
    "The extension does not contradict the roadmap",
    "remote MCP/API readiness phase",
  ]);

  for (const prNumber of ["PR39", "PR40", "PR41", "PR42", "PR43", "PR44", "PR45", "PR47"]) {
    assertDocMentions(roadmapStatusDoc, [prNumber]);
  }
});

test("PR48 keeps remote MCP local STDIO package API and UI boundaries blocked", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "Remote MCP remains blocked",
    "Local STDIO remains the only approved MCP runtime",
    "No remote runtime, API, UI, deployment, package publishing, or remote MCP tool exposure was approved by PR39-PR47 / PR46-label",
    "API implementation is gated behind API contract/auth/rate-limit policy",
    "UI implementation is gated behind product requirements and viewer plan",
    "Package publishing remains blocked until explicit publishing decision",
    "Remote MCP runtime remains blocked unless future explicit approval satisfies gates",
  ]);

  assert.doesNotMatch(roadmapStatusDoc, /^remote MCP is approved$/im);
  assert.doesNotMatch(roadmapStatusDoc, /^API implementation is approved$/im);
  assert.doesNotMatch(roadmapStatusDoc, /^UI implementation is approved$/im);
  assert.doesNotMatch(roadmapStatusDoc, /^package publishing is approved$/im);
});

test("PR48 next PR sequence includes PR48 through PR63 labels", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);
  const nextSequenceSection = sectionBetween(
    roadmapStatusDoc,
    "## Next PR Sequence",
    "## Non-Approval Boundary",
  );

  for (const prNumber of Array.from({ length: 16 }, (_, index) => `PR${48 + index}`)) {
    assert.match(nextSequenceSection, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be listed`);
  }

  assertDocMentions(nextSequenceSection, [
    "PR48 - roadmap status update",
    "PR49 - remote MCP/API readiness checkpoint, still no runtime",
    "PR50 - API contract decision, docs/tests only",
    "PR51 - auth/audit/rate-limit policy for API and future remote MCP, docs/tests only",
    "PR52 - minimal API server approval decision, no implementation unless explicitly approved",
    "PR53 - minimal API server skeleton, conditional on PR50-PR52 gates approving it",
    "PR54 - API contract tests and golden envelopes, conditional on an approved API contract",
    "PR55 - product requirements for read-only result viewer",
    "PR56 - read-only result viewer plan, no UI implementation",
    "PR57 - structured JSON input viewer prototype, conditional on PR55-PR56 approval",
    "PR58 - verification/replay result UI prototype, no source-truth inference",
    "PR59 - onboarding and examples",
    "PR60 - beta pilot readiness checklist",
    "PR61 - privacy/security/support policy",
    "PR62 - pricing/package/public npm decision",
    "PR63 - business launch checklist",
  ]);
});

test("PR48 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }
});

test("PR48 keeps package metadata dependencies lockfile and MCP SDK unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });
  assert.deepEqual(packageJson.devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(packageLock.packages[""].devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(Object.keys(packageLock.packages).sort(), ["", "node_modules/typescript"]);

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

  assertNoMcpDependency(packageJson);
  assertNoMcpDependency(packageLock.packages[""]);
});

test("PR48 keeps runtime and deployment surfaces absent in the MCP boundary", () => {
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

test("PR48 keeps current MCP tools exactly and replayRun blocked", async () => {
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

function sectionBetween(doc, startHeading, endHeading) {
  const start = doc.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = doc.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(end, -1, `${endHeading} should exist`);
  assert.ok(end > start, `${endHeading} should appear after ${startHeading}`);
  return doc.slice(start, end);
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
