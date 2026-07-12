import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const apiContractDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-api-contract-decision.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const roadmapStatusDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-roadmap-status-update.md",
);
const readinessCheckpointDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-remote-mcp-api-readiness-checkpoint.md",
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

const requiredApiContractSections = [
  "# API Contract Decision",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Official References Checked",
  "## API Contract Non-Approval Boundary",
  "## Contract Envelope Rules",
  "## Source Truth Rules",
  "## Future Route Candidates",
  "## Blocked Routes",
  "## Route Contract Matrix",
  "## Required Future API Tests",
  "## Auth Audit Rate Limit Boundary",
  "## Runtime Deployment Package Boundary",
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

const futureRouteCandidates = [
  "GET /version",
  "POST /canonical-json",
  "POST /verify-run",
  "POST /verify-artifact-freshness",
  "POST /replay-mvp-demo",
];

const blockedRoutes = [
  "POST /replay-run",
  "POST /create-pack",
  "POST /create-rule",
  "POST /create-ratio",
  "POST /create-geometry",
  "POST /infer-intent",
  "POST /recommend",
  "POST /rank-beauty",
  "POST /read-file",
  "POST /write-file",
  "POST /fetch-url",
  "POST /run-shell",
];

const blockedRuntimeDeploymentApiUiPaths = [
  "src/server",
  "src/routes",
  "src/http",
  "src/ui",
  "src/viewer",
  "src/app",
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

test("PR50 API contract decision doc exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(apiContractDocPath), true);
  assert.equal(basename(apiContractDocPath), "2026-06-15-api-contract-decision.md");

  const apiContractDoc = readDoc(apiContractDocPath);
  assertHeadingsInOrder(apiContractDoc, requiredApiContractSections);
  assertDocMentions(apiContractDoc, [
    "PR50 is docs/contract-tests only",
    "PR50 defines API contract only",
    "PR50 documents the minimal future API contract that a later API server would have to implement",
    "PR50 implements no API server",
    "PR50 implements no routes",
    "PR50 makes no package metadata changes",
  ]);
});

test("PR50 references roadmap PR49 and PR39 through PR49 source documents", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(roadmapStatusDocPath), true);
  assert.equal(existsSync(readinessCheckpointDocPath), true);

  const apiContractDoc = readDoc(apiContractDocPath);

  assertDocMentions(apiContractDoc, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-15-roadmap-status-update.md",
    "docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md",
    "PR39 through PR49 are source documents for the current remote MCP/API readiness boundary",
  ]);

  for (const prNumber of Array.from({ length: 11 }, (_, index) => `PR${39 + index}`)) {
    assert.match(apiContractDoc, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be documented`);
  }
});

test("PR50 records official references with access date and implementation-neutral effects", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const officialReferencesSection = sectionBetween(
    apiContractDoc,
    "## Official References Checked",
    "## API Contract Non-Approval Boundary",
  );

  assertDocMentions(officialReferencesSection, [
    "Access date: 2026-06-16",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/transports",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization",
    "https://modelcontextprotocol.io/specification/2025-11-25/server/tools",
    "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
    "https://developers.openai.com/api/docs/mcp",
    "https://code.claude.com/docs/en/mcp",
    "https://platform.claude.com/docs/en/agents-and-tools/mcp-connector",
    "PR50 changes no implementation approval decision",
    "PR50 approves no auth runtime",
    "PR50 approves no remote MCP runtime",
    "PR50 approves no remote MCP runtime, deployment, or provider connector",
  ]);
});

test("PR50 keeps API implementation server skeleton remote MCP auth deployment UI and publishing blocked", () => {
  const apiContractDoc = readDoc(apiContractDocPath);

  assertDocMentions(apiContractDoc, [
    "API implementation remains blocked",
    "API server skeleton remains blocked until PR52 explicitly approves implementation",
    "Remote MCP runtime remains blocked",
    "Local STDIO remains the only approved MCP runtime",
    "Deployment remains blocked",
    "Auth runtime remains blocked until PR51",
    "Audit log runtime remains blocked until PR51",
    "Rate-limit runtime remains blocked until PR51",
    "UI implementation remains blocked",
    "Public npm publishing remains blocked",
  ]);

  assert.doesNotMatch(apiContractDoc, /\bAPI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(apiContractDoc, /\bAPI server skeleton\s+is\s+approved\b/i);
  assert.doesNotMatch(apiContractDoc, /\bremote MCP runtime\s+is\s+approved\b/i);
  assert.doesNotMatch(apiContractDoc, /\bdeployment\s+is\s+approved\b/i);
  assert.doesNotMatch(apiContractDoc, /\bUI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(apiContractDoc, /\bpublic npm publishing\s+is\s+approved\b/i);
});

test("PR50 contract envelope rules preserve structured Norma result fields", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const envelopeRulesSection = sectionBetween(
    apiContractDoc,
    "## Contract Envelope Rules",
    "## Source Truth Rules",
  );

  assertDocMentions(envelopeRulesSection, [
    "structured JSON request and response envelopes",
    "`status`",
    "warnings",
    "errors",
    "diagnostics",
    "provenance",
    "source refs",
    "output refs",
    "artifact freshness data",
    "verification results",
    "replay results where approved",
    "mismatch details",
    "operation context",
    "pack locks",
    "serialization version",
    "operation version",
    "must not collapse results to a generic boolean",
    "must not hide diagnostics",
    "structured errors with no client-visible stack traces",
  ]);
});

test("PR50 source-truth rules block interface-created Norma truth and arbitrary replay", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const sourceTruthSection = sectionBetween(
    apiContractDoc,
    "## Source Truth Rules",
    "## Future Route Candidates",
  );

  assertDocMentions(sourceTruthSection, [
    "create packs",
    "create rules",
    "create ratios",
    "create tolerances",
    "create geometry",
    "infer intent",
    "select hidden packs",
    "select hidden tolerances",
    "treat prompt text as source truth",
    "treat artifacts as source truth",
    "hide diagnostics",
    "collapse results to a generic boolean",
    "perform arbitrary operation replay",
    "Prompt text is never source truth",
    "Artifacts remain derived projections",
  ]);
});

test("PR50 future route candidates are exactly the approved contract candidates", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const routeCandidatesSection = sectionBetween(
    apiContractDoc,
    "## Future Route Candidates",
    "## Blocked Routes",
  );

  assert.deepEqual(documentedCodeBlockLines(routeCandidatesSection), futureRouteCandidates);
});

test("PR50 blocked routes include the full forbidden API route set", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const blockedRoutesSection = sectionBetween(
    apiContractDoc,
    "## Blocked Routes",
    "## Route Contract Matrix",
  );

  assert.deepEqual(documentedCodeBlockLines(blockedRoutesSection), blockedRoutes);
});

test("PR50 route contract matrix documents per-route purpose payload envelope and tests", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const routeMatrixSection = sectionBetween(
    apiContractDoc,
    "## Route Contract Matrix",
    "## Required Future API Tests",
  );

  for (const route of futureRouteCandidates) {
    assertDocMentions(routeMatrixSection, [route]);
  }

  assertDocMentions(routeMatrixSection, [
    "Purpose",
    "Source operation",
    "Request body shape",
    "Response envelope requirements",
    "Forbidden behavior",
    "Accept-path test requirements",
    "Reject-path test requirements",
    "serializeCanonicalJson",
    "verifyRun",
    "verifyArtifactFreshness",
    "fixed MVP demo",
    "Rejects `{ run: {} }`",
  ]);
});

test("PR50 requires future API implementation tests before any server implementation", () => {
  const apiContractDoc = readDoc(apiContractDocPath);
  const requiredTestsSection = sectionBetween(
    apiContractDoc,
    "## Required Future API Tests",
    "## Auth Audit Rate Limit Boundary",
  );

  assertDocMentions(requiredTestsSection, [
    "accept-path tests for each approved route",
    "reject-path tests for malformed JSON",
    "reject-path tests for invalid route payloads",
    "reject-path tests for extra hidden fields",
    "reject-path tests for blocked routes",
    "no-stack-trace structured error tests",
    "provenance preservation tests",
    "source-ref/output-ref preservation tests",
    "artifact freshness preservation tests",
    "pack-lock preservation tests",
    "operation-context preservation tests",
    "no prompt-as-source tests",
    "no artifact-as-source tests",
    "no arbitrary replay tests",
    "These tests must exist before API server implementation, not after it",
  ]);
});

test("PR50 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }
});

test("PR50 keeps package runtime deployment API and UI surfaces absent or unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);

  assertPackageBoundary(packageJson, packageLock);
  assert.deepEqual(filesUnder("src/api"), ["src/api/minimal-api-server.ts"]);
  assert.deepEqual(filesUnder("src/mcp"), [
    "src/mcp/private-dev-local-visual-mcp-protocol.ts",
    "src/mcp/stdio-protocol.ts",
  ]);
  assert.equal(existsSync(wrapperPath), true);
  assertPathsAbsent(blockedRuntimeDeploymentApiUiPaths);
  assertMcpBoundaryHasNoRemoteRuntimeSurface();
});

function assertPackageBoundary(packageJson, packageLock) {
  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });
  assert.equal(packageJson.devDependencies?.typescript, "^5.8.0");
  assert.equal(packageLock.packages[""].devDependencies?.typescript, "^5.8.0");

  for (const fieldName of [
    "publishConfig",
    "bin",
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
}

function assertPathsAbsent(paths) {
  for (const path of paths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }
}

function assertMcpBoundaryHasNoRemoteRuntimeSurface() {
  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
}

test("PR50 keeps current MCP tools exactly and replayRun blocked", async () => {
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr50-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    [...toolsListResponse.result.tools.map((tool) => tool.name)].sort(),
    [...currentRuntimeTools].sort(),
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr50-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr50-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr50-arbitrary-replay-blocked",
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
    id: "pr50-arbitrary-replay-blocked",
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
        `Build output is required before PR50 MCP runtime contract validation: ${
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

function documentedCodeBlockLines(section) {
  const codeBlockMatch = /```txt\r?\n([\s\S]*?)\r?\n```/.exec(section);
  assert.notEqual(codeBlockMatch, null, "routes should be documented in a txt code block");
  return codeBlockMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
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
