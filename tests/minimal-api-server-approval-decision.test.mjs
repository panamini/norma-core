import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-16-minimal-api-server-approval-decision.md",
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
const apiContractDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-api-contract-decision.md",
);
const authPolicyDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
);
const docsDir = join(repoRoot, "docs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

const requiredDecisionSections = [
  "# Minimal API Server Approval Decision",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Official References Checked",
  "## Completed Gates",
  "## Approval Scope For PR53",
  "## PR53 Required Implementation Constraints",
  "## PR53 Required Route Constraints",
  "## PR53 Required Security Constraints",
  "## PR53 Required Test Constraints",
  "## Explicit Non-Approval Boundary",
  "## Still Blocked After PR52",
  "## Runtime Deployment Package Boundary",
  "## Final Decision",
];

const expectedRootMcpRemoteDocs = [
  "MCP_REMOTE_THREAT_MODEL.md",
  "MCP_REMOTE_APPROVAL_DECISION.md",
  "MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
].sort();

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];

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
  "src/api",
  "src/server",
  "src/routes",
  "src/http",
  "src/auth",
  "src/audit",
  "src/rate-limit",
  "src/rateLimit",
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

test("PR52 approval decision doc exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(decisionDocPath), true);
  assert.equal(basename(decisionDocPath), "2026-06-16-minimal-api-server-approval-decision.md");

  const decisionDoc = readDoc(decisionDocPath);
  assertHeadingsInOrder(decisionDoc, requiredDecisionSections);
  assertDocMentions(decisionDoc, [
    "PR52 is docs/contract-tests only",
    "PR52 is an approval decision only",
    "PR52 is approval-decision-only",
    "PR52 answers whether the PR50 API contract and PR51 auth/audit/rate-limit policy gates approve moving to a future minimal API server skeleton PR",
    "PR52 approves moving to PR53 minimal API server skeleton",
    "PR52 does not implement API server",
    "PR52 does not implement routes",
    "PR52 does not implement auth",
    "PR52 does not implement audit logs",
    "PR52 does not implement rate limits",
    "PR52 does not implement body-size limits",
    "PR52 does not implement timeouts",
    "PR52 does not implement redaction",
    "PR52 does not implement retention",
    "PR52 does not implement remote MCP runtime",
  ]);
});

test("PR52 references PR39 through PR51 and required source documents", () => {
  for (const path of [
    businessRoadmapDocPath,
    roadmapStatusDocPath,
    readinessCheckpointDocPath,
    apiContractDocPath,
    authPolicyDocPath,
  ]) {
    assert.equal(existsSync(path), true, `${path} should exist`);
  }

  const decisionDoc = readDoc(decisionDocPath);
  assertDocMentions(decisionDoc, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-15-roadmap-status-update.md",
    "docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md",
    "docs/decisions/2026-06-15-api-contract-decision.md",
    "docs/decisions/2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md",
    "PR39 through PR51 are source documents for the current remote MCP/API readiness boundary",
  ]);

  for (const prNumber of Array.from({ length: 13 }, (_, index) => `PR${39 + index}`)) {
    assert.match(decisionDoc, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be documented`);
  }
});

test("PR52 records official references with access date and approval-only effects", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const officialReferencesSection = sectionBetween(
    decisionDoc,
    "## Official References Checked",
    "## Completed Gates",
  );

  assertDocMentions(officialReferencesSection, [
    "Access date: 2026-06-16",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/transports",
    "https://modelcontextprotocol.io/specification/2025-11-25/server/tools",
    "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
    "https://developers.openai.com/api/docs/mcp",
    "https://code.claude.com/docs/en/mcp",
    "https://platform.claude.com/docs/en/agents-and-tools/mcp-connector",
    "PR52 uses them to constrain future PR53 review, not to implement runtime behavior",
    "PR52 approves no auth runtime",
    "PR52 approves no Streamable HTTP, SSE, WebSocket, or remote MCP runtime",
    "PR52 approves no deployment or connector compatibility",
  ]);
});

test("PR52 documents completed gates and PR53 approval scope", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const completedGatesSection = sectionBetween(
    decisionDoc,
    "## Completed Gates",
    "## Approval Scope For PR53",
  );
  const approvalScopeSection = sectionBetween(
    decisionDoc,
    "## Approval Scope For PR53",
    "## PR53 Required Implementation Constraints",
  );

  assertDocMentions(completedGatesSection, [
    "PR49 readiness checkpoint exists",
    "PR50 API contract decision exists",
    "PR51 auth/audit/rate-limit policy exists",
    "API candidate routes are defined",
    "Blocked routes are defined",
    "Source-truth rules are defined",
    "Envelope rules are defined",
    "Auth/audit/rate-limit/body-size/timeout/redaction/retention policy is defined",
    "PR53 can be approved only as minimal server skeleton under constraints",
    "These completed gates do not approve implementation in PR52",
  ]);

  assertDocMentions(approvalScopeSection, [
    "A minimal local-only API server skeleton that implements only the approved PR50 route candidates, only if it also implements PR51 policy requirements, adds no remote MCP runtime, adds no deployment, and keeps package publishing blocked",
    "PR53 remains separate and must still be reviewed before merge",
  ]);
});

test("PR52 keeps implementation remote MCP deployment UI and package publishing blocked", () => {
  const decisionDoc = readDoc(decisionDocPath);
  assertDocMentions(decisionDoc, [
    "Local STDIO remains the only approved MCP runtime",
    "Remote MCP remains blocked",
    "Remote MCP tool exposure remains blocked",
    "Deployment remains blocked",
    "UI implementation remains blocked",
    "Package publishing remains blocked",
    "PR52 does not approve deployment",
    "PR52 does not approve UI",
    "PR52 does not approve package publishing",
    "Public npm publishing remains blocked",
  ]);
});

test("PR52 documents PR53 implementation and security constraints", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const implementationSection = sectionBetween(
    decisionDoc,
    "## PR53 Required Implementation Constraints",
    "## PR53 Required Route Constraints",
  );
  const securitySection = sectionBetween(
    decisionDoc,
    "## PR53 Required Security Constraints",
    "## PR53 Required Test Constraints",
  );

  assertDocMentions(implementationSection, [
    "local-only development server unless PR52 explicitly says otherwise",
    "no public hosting",
    "no deployment config",
    "no remote MCP runtime",
    "no MCP HTTP server",
    "no provider compatibility claim",
    "no package publish",
    "no broad SDK",
    "no UI",
    "no filesystem reads/writes",
    "no network fetch",
    "no shell execution",
    "no environment-token behavior unless PR53 explicitly implements testable local config boundaries approved by PR51 policy",
    "no write actions",
    "no agent-created packs/rules/ratios/tolerances/geometry",
    "no prompt-as-source",
    "no artifact-as-source",
    "no arbitrary replay",
  ]);

  assertDocMentions(securitySection, [
    "malformed JSON rejection",
    "invalid payload rejection",
    "extra hidden fields rejection",
    "blocked route rejection",
    "no stack traces in structured errors",
    "max body size",
    "nested object depth limit",
    "array length limit",
    "string length limit",
    "request timeout",
    "route-specific timeout",
    "no tokens in query strings",
    "no token logging",
    "no raw request/response body logging",
    "redaction of Authorization headers and cookies",
    "no audit storage unless explicitly approved",
    "safe audit metadata only if audit logs are introduced",
    "no public remote exposure",
    "no deployment config",
    "If PR53 does not implement auth runtime, it must remain local-only and document the explicit exception",
    "If PR53 implements auth runtime, it must satisfy PR51 policy and include tests",
  ]);
});

test("PR52 route constraints document exactly approved and blocked routes", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const routeConstraintsSection = sectionBetween(
    decisionDoc,
    "## PR53 Required Route Constraints",
    "## PR53 Required Security Constraints",
  );

  const codeBlocks = documentedCodeBlocks(routeConstraintsSection);
  assert.deepEqual(codeBlocks[0], futureRouteCandidates);
  assert.deepEqual(codeBlocks[1], blockedRoutes);
});

test("PR52 requires PR53 tests for routes payloads source-truth envelope and drift", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const testConstraintsSection = sectionBetween(
    decisionDoc,
    "## PR53 Required Test Constraints",
    "## Explicit Non-Approval Boundary",
  );

  assertDocMentions(testConstraintsSection, [
    "accept path for every approved route",
    "reject path for every blocked route",
    "reject malformed JSON",
    "reject invalid payloads",
    "reject hidden fields",
    "reject prompt-as-source",
    "reject artifact-as-source",
    "reject arbitrary replay",
    "preserve status/warnings/errors/diagnostics/provenance/source refs/output refs/artifact freshness/operation context/pack locks/serialization version/operation version",
    "no stack traces",
    "no filesystem/network/shell behavior",
    "no package/dependency drift unless explicitly approved",
  ]);
});

test("PR52 explicit non-approval boundary blocks adjacent scope", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const nonApprovalSection = sectionBetween(
    decisionDoc,
    "## Explicit Non-Approval Boundary",
    "## Still Blocked After PR52",
  );

  assertDocMentions(nonApprovalSection, [
    "API implementation in PR52",
    "remote MCP runtime",
    "remote MCP tool exposure",
    "deployment",
    "public hosting",
    "OpenAI connector compatibility claim",
    "Claude connector compatibility claim",
    "package publishing",
    "UI implementation",
    "package metadata changes",
    "dependency changes",
    "lockfile changes",
    "auth runtime in PR52",
    "audit runtime in PR52",
    "rate-limit runtime in PR52",
    "route implementation in PR52",
  ]);
});

test("PR52 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);
});

test("PR52 keeps package runtime deployment API and UI surfaces absent or unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);

  assertPackageBoundary(packageJson, packageLock);
  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);
  assertPathsAbsent(blockedRuntimeDeploymentApiUiPaths);
  assertNoDeploymentWorkflowFiles();
  assertMcpBoundaryHasNoRemoteRuntimeSurface();
});

test("PR52 keeps current MCP tools exactly and replayRun blocked", async () => {
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr52-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    [...toolsListResponse.result.tools.map((tool) => tool.name)].sort(),
    [...approvedCallableTools].sort(),
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr52-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.equal(replayRunResponse.error.code, -32602);
  assert.equal(replayRunResponse.error.message, "Unknown tool: norma.replayRun");

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr52-arbitrary-replay-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayMvpDemo",
      arguments: {
        run: {},
      },
    },
  });

  assert.equal(arbitraryReplayResponse.error.code, -32602);
  assert.equal(arbitraryReplayResponse.error.message, "Invalid params");
});

function assertPackageBoundary(packageJson, packageLock) {
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
}

function assertPathsAbsent(paths) {
  for (const path of paths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }
}

function assertNoDeploymentWorkflowFiles() {
  for (const path of filesUnder(".github/workflows")) {
    assert.doesNotMatch(path, /(?:deploy|deployment|remote-mcp|server|publish)/i);
  }
}

function assertMcpBoundaryHasNoRemoteRuntimeSurface() {
  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
}

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
        `Build output is required before PR52 MCP runtime contract validation: ${
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
  const startMatch = new RegExp(`^${escapeRegExp(startHeading)}\\s*$`, "m").exec(doc);
  assert.notEqual(startMatch, null, `${startHeading} should exist as a heading`);

  const afterStart = doc.slice(startMatch.index + startMatch[0].length);
  const endMatch = new RegExp(`^${escapeRegExp(endHeading)}\\s*$`, "m").exec(afterStart);
  assert.notEqual(endMatch, null, `${endHeading} should exist as a heading`);

  return afterStart.slice(0, endMatch.index);
}

function documentedCodeBlocks(section) {
  return Array.from(section.matchAll(/```txt\r?\n([\s\S]*?)\r?\n```/g), (match) =>
    match[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== ""),
  );
}

function assertNoRemoteMcpRuntimeSurface(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|listen|app\.get|app\.post|router|route|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*(?:Server|Transport|Endpoint|Client|Request|Response)|sse|streamable|websocket|express|fastify|cors|oauth|authorization|authentication|auth[A-Za-z0-9_]*|[A-Za-z0-9_]*token[A-Za-z0-9_]*|jwt[A-Za-z0-9_]*|fetch|XMLHttpRequest|WebSocket|networkFetch)\b/i,
    `${path} must not contain remote MCP server, package, auth, token, or network behavior`,
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
