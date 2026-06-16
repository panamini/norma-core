import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const readinessDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-remote-mcp-api-readiness-checkpoint.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const roadmapStatusDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-roadmap-status-update.md",
);
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

const requiredReadinessSections = [
  "# Remote MCP API Readiness Checkpoint",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Official References Checked",
  "## Completed Governance Gates",
  "## Remaining Gates",
  "## Next PR Map",
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

const blockedRuntimeDeploymentApiUiPaths = [
  "src/mcp/http-server.ts",
  "src/mcp/streamable-http.ts",
  "src/mcp/sse.ts",
  "src/mcp/websocket.ts",
  "src/mcp/auth.ts",
  "src/mcp/deployment.ts",
  "src/api",
  "src/server",
  "src/ui",
  "src/viewer",
  "src/app",
  "bin/norma-core-mcp-http.mjs",
  "bin/norma-core-mcp-server.mjs",
  "bin/norma-core-api.mjs",
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

test("PR49 readiness checkpoint doc exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(readinessDocPath), true);
  assert.equal(
    basename(readinessDocPath),
    "2026-06-15-remote-mcp-api-readiness-checkpoint.md",
  );

  const readinessDoc = readDoc(readinessDocPath);
  assertHeadingsInOrder(readinessDoc, requiredReadinessSections);
  assertDocMentions(readinessDoc, [
    "PR49 is docs/contract-tests only",
    "Repo may proceed to PR50 API contract decision",
    "PR49 does not approve API implementation",
    "PR49 does not approve remote MCP runtime",
    "Remaining gates PR50/PR51/PR52/later still required",
  ]);
});

test("PR49 references the primary roadmap and PR48 boundary without duplicating roadmap authority", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(roadmapStatusDocPath), true);

  const readinessDoc = readDoc(readinessDocPath);
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(readinessDoc, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-15-roadmap-status-update.md",
    "The original roadmap PR numbers are historical",
    "The original Business Readiness Roadmap remains a planning document",
    "the roadmap does not authorize scope by itself",
    "Historical PR numbers in `docs/BUSINESS_READINESS_ROADMAP.md` must not be treated as current PR numbers",
    "current repository history wins",
  ]);
  assertDocMentions(roadmapStatusDoc, [
    "PR48 is docs/contract-tests only",
    "PR49 - remote MCP/API readiness checkpoint, still no runtime",
  ]);
});

test("PR49 records the official docs refresh boundary for PR50 and PR51", () => {
  const readinessDoc = readDoc(readinessDocPath);
  const officialReferencesSection = sectionBetween(
    readinessDoc,
    "## Official References Checked",
    "## Completed Governance Gates",
  );

  assertDocMentions(officialReferencesSection, [
    "Access date: 2026-06-16",
    "https://modelcontextprotocol.io/specification/2025-11-25/changelog",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/transports",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization",
    "https://modelcontextprotocol.io/specification/2025-11-25/server/tools",
    "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
    "https://developers.openai.com/api/docs/mcp",
    "https://code.claude.com/docs/en/mcp",
    "https://platform.claude.com/docs/en/agents-and-tools/mcp-connector",
    "PR50/PR51 must refresh",
    "PR49 changes no approval decision",
  ]);
});

test("PR49 references PR39 through PR48 completed governance gates", () => {
  const readinessDoc = readDoc(readinessDocPath);
  const completedGatesSection = sectionBetween(
    readinessDoc,
    "## Completed Governance Gates",
    "## Remaining Gates",
  );

  for (const prNumber of Array.from({ length: 10 }, (_, index) => `PR${39 + index}`)) {
    assert.match(completedGatesSection, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be listed`);
  }

  assertDocMentions(completedGatesSection, [
    "PR39 defined the remote MCP threat model and approval gate",
    "PR40 recorded that remote MCP remains blocked",
    "PR41 selected future transport/auth candidates only, without runtime approval",
    "PR42 rejected package/dependency approval for remote MCP",
    "PR43 defined the future remote MCP security test matrix",
    "PR44 defined deployment policy gates without deployment approval",
    "PR45 fixed future MCP decision document location policy",
    "PR46 is label/review continuity only",
    "PR47 / PR46-label defined remote MCP tool exposure policy without remote tool exposure",
    "PR48 updated roadmap status",
  ]);
});

test("PR49 keeps remote MCP local STDIO API UI package and deployment boundaries blocked", () => {
  const readinessDoc = readDoc(readinessDocPath);

  assertDocMentions(readinessDoc, [
    "Remote MCP remains blocked",
    "Local STDIO remains the only approved MCP runtime",
    "API implementation remains blocked",
    "UI implementation remains blocked",
    "Package publishing remains blocked",
    "Deployment remains blocked",
    "PR49 does not approve API server implementation",
    "PR49 does not approve remote MCP runtime",
    "remote MCP tool exposure remains blocked",
  ]);

  assert.doesNotMatch(readinessDoc, /\bremote MCP\s+is\s+approved\b/i);
  assert.doesNotMatch(readinessDoc, /\bAPI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(readinessDoc, /\bAPI server implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(readinessDoc, /\bUI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(readinessDoc, /\bpackage publishing\s+is\s+approved\b/i);
});

test("PR49 lists remaining gates and approves only moving to PR50", () => {
  const readinessDoc = readDoc(readinessDocPath);
  const remainingGatesSection = sectionBetween(
    readinessDoc,
    "## Remaining Gates",
    "## Next PR Map",
  );

  assertDocMentions(remainingGatesSection, [
    "API contract",
    "auth",
    "audit logs",
    "rate limits",
    "server implementation approval",
    "API golden envelopes",
    "deployment approval",
    "UI product requirements",
    "public package publishing decision",
    "No remaining gate is satisfied by PR49",
  ]);

  assertDocMentions(readinessDoc, [
    "PR49 approves moving next to PR50 API contract decision only",
    "PR49 approves only moving to PR50 API contract decision",
    "PR49 does not approve PR53 or PR54 implementation work",
  ]);
});

test("PR49 next PR map includes PR50 through PR54 labels", () => {
  const readinessDoc = readDoc(readinessDocPath);
  const nextPrMapSection = sectionBetween(
    readinessDoc,
    "## Next PR Map",
    "## Non-Approval Boundary",
  );

  for (const prNumber of Array.from({ length: 5 }, (_, index) => `PR${50 + index}`)) {
    assert.match(nextPrMapSection, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be listed`);
  }

  assertDocMentions(nextPrMapSection, [
    "PR50 - API contract decision, docs/tests only",
    "PR51 - auth/audit/rate-limit policy for API and future remote MCP, docs/tests only",
    "PR52 - minimal API server approval decision, no implementation unless explicitly approved",
    "PR53 - minimal API server skeleton, conditional on PR50-PR52 gates approving it",
    "PR54 - API contract tests and golden envelopes, conditional on an approved API contract",
  ]);
});

test("PR49 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }
});

test("PR49 keeps package metadata dependencies lockfile API UI runtime and deployment surfaces unchanged", () => {
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

  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);

  for (const path of blockedRuntimeDeploymentApiUiPaths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
});

test("PR49 keeps current MCP tools exactly and replayRun blocked", async () => {
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr49-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    approvedCallableTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr49-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr49-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr49-arbitrary-replay-blocked",
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
    id: "pr49-arbitrary-replay-blocked",
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
        `Build output is required before PR49 MCP runtime contract validation: ${
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
    /\b(?:readFile(?:Sync)?|writeFile(?:Sync)?|deleteFile(?:Sync)?|rm(?:Sync)?|unlink(?:Sync)?|readdir(?:Sync)?|stat(?:Sync)?|open(?:Sync)?|createReadStream|createWriteStream|shell|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
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
