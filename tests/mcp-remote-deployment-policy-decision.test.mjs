import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertCurrentMcpRuntimeSourceBoundary,
  assertCurrentRemoteMcpPackageBoundary,
} from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const pr44DeploymentDocPath = join(repoRoot, "docs", "MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md");
const pr43MatrixDocPath = join(repoRoot, "docs", "MCP_REMOTE_SECURITY_TEST_MATRIX.md");
const pr42DecisionDocPath = join(repoRoot, "docs", "MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md");
const pr41DecisionDocPath = join(
  repoRoot,
  "docs",
  "MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
);
const pr40ApprovalDecisionDocPath = join(repoRoot, "docs", "MCP_REMOTE_APPROVAL_DECISION.md");
const pr39ThreatModelDocPath = join(repoRoot, "docs", "MCP_REMOTE_THREAT_MODEL.md");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");

let handleMcpJsonRpcMessagePromise;

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeTools = [...approvedCallableTools, "norma.analyzeStructuredCompositionV1"];

const blockedDeploymentPaths = [
  "Dockerfile",
  ".dockerignore",
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
  "app.yaml",
  "cloudbuild.yaml",
  "nginx.conf",
  "Caddyfile",
  "caddyfile",
  "k8s",
  "kubernetes",
  "helm",
  "terraform",
  "infra",
  ".github/workflows/deploy.yml",
  ".github/workflows/deploy.yaml",
  ".github/workflows/deploy-prod.yml",
  ".github/workflows/production-deploy.yml",
  ".github/workflows/remote-mcp.yml",
  ".github/workflows/remote-mcp.yaml",
  "src/mcp/http-server.ts",
  "src/mcp/streamable-http.ts",
  "src/mcp/sse.ts",
  "src/mcp/websocket.ts",
  "src/mcp/auth.ts",
  "src/mcp/deployment.ts",
  "bin/norma-core-mcp-http.mjs",
  "bin/norma-core-mcp-server.mjs",
];

const requiredDecisionSections = [
  "# MCP Remote Deployment Policy Decision",
  "## Status",
  "## Source Documents",
  "## Decision",
  "## Non-Approval Boundary",
  "## Deployment Policy Gate Rule",
  "## Minimum Deployment Policy Gates",
  "## Required Future Deployment PR Evidence",
  "## Required Deployment Contract Tests",
  "## Package / Runtime / Tool Boundary",
  "## Final Decision",
];

test("PR44 remote MCP deployment policy decision doc exists and references PR39 through PR43", () => {
  assert.equal(existsSync(pr44DeploymentDocPath), true);
  assert.equal(existsSync(pr43MatrixDocPath), true);
  assert.equal(existsSync(pr42DecisionDocPath), true);
  assert.equal(existsSync(pr41DecisionDocPath), true);
  assert.equal(existsSync(pr40ApprovalDecisionDocPath), true);
  assert.equal(existsSync(pr39ThreatModelDocPath), true);

  const deploymentDoc = readDoc(pr44DeploymentDocPath);

  assertHeadingsInOrder(deploymentDoc, requiredDecisionSections);
  assertDocMentions(deploymentDoc, [
    "PR44 is docs/contract-tests only",
    "Reference PR39 threat model",
    "Reference PR40 approval decision",
    "Reference PR41 transport/auth/package decision",
    "Reference PR42 package dependency decision",
    "Reference PR43 security test matrix",
    "Remote MCP remains blocked after PR44",
    "Local STDIO remains the only approved MCP runtime",
  ]);
});

test("PR44 records deployment non-approval and current official docs as Unknown", () => {
  const deploymentDoc = readDoc(pr44DeploymentDocPath);

  assertDocMentions(deploymentDoc, [
    "PR44 does not approve remote MCP runtime implementation",
    "PR44 does not approve deployment",
    "PR44 does not re-check current official docs because it makes no new transport, auth, package, runtime, provider-compatibility, or deployment-target decision",
    "Current official documentation state in PR44: Unknown",
    "Future remote MCP runtime or deployment approval PRs must re-check current official MCP, provider, hosting, and deployment-platform docs at that time",
    "No deployment target is approved by PR44",
    "No deployment provider is approved by PR44",
    "No deployment configuration file is approved by PR44",
    "No CI/CD deployment workflow is approved by PR44",
    "Unknown deployment decisions remain blocked",
  ]);

  assert.doesNotMatch(deploymentDoc, /^remote MCP is approved$/im);
  assert.doesNotMatch(deploymentDoc, /^deployment is approved$/im);
  assert.doesNotMatch(deploymentDoc, /^runtime implementation is approved$/im);
});

test("PR44 defines the minimum future remote MCP deployment policy gates", () => {
  const deploymentDoc = readDoc(pr44DeploymentDocPath);

  assertDocMentions(deploymentDoc, [
    "Gate D0 - explicit deployment approval state",
    "Gate D1 - deployment target and ownership boundary",
    "Gate D2 - endpoint, DNS, TLS, and transport boundary",
    "Gate D3 - auth, audience, secrets, and environment boundary",
    "Gate D4 - network ingress and egress boundary",
    "Gate D5 - runtime process and resource boundary",
    "Gate D6 - tool exposure and source-truth boundary",
    "Gate D7 - logging, telemetry, redaction, and retention boundary",
    "Gate D8 - CI/CD, artifact, provenance, and rollback boundary",
    "Gate D9 - monitoring, abuse response, and incident boundary",
    "Gate D10 - official docs and provider evidence boundary",
  ]);

  assertDocMentions(deploymentDoc, [
    "deployment provider",
    "hosting product",
    "environment names",
    "owner",
    "operational responsibility",
    "public/private exposure model",
    "endpoint URL shape",
    "domain ownership",
    "DNS policy",
    "TLS termination",
    "certificate ownership",
    "protocol version policy",
    "Origin validation",
    "CORS policy",
    "protected resource metadata",
    "audience/resource validation",
    "secret source",
    "secret rotation",
    "environment variable allowlist",
    "allowed ingress",
    "allowed egress",
    "DNS rebinding controls",
    "concurrency",
    "memory limits",
    "CPU limits",
    "request body limits",
    "timeout behavior",
    "session ID entropy and binding",
    "filesystem policy",
    "allowed tools",
    "per-tool risk classification",
    "tool metadata safety",
    "output prompt-injection controls",
    "replay abuse controls",
    "source-truth preservation",
    "log fields",
    "redaction policy",
    "retention duration",
    "deletion path",
    "build provenance",
    "protected environments",
    "rollback path",
    "removal path",
    "health checks",
    "readiness checks",
    "abuse monitoring",
    "shutdown criteria",
    "access dates",
  ]);
});

test("PR44 requires future deployment evidence and contract test categories before approval", () => {
  const deploymentDoc = readDoc(pr44DeploymentDocPath);

  assertDocMentions(deploymentDoc, [
    "No future PR may combine the first deployment implementation with the first definition of these gates",
    "No future PR may treat PR44 as deployment approval",
    "No future PR may treat PR44 as remote runtime approval",
    "Every approved deployment gate must include accept-path and reject-path tests",
    "A missing, Unknown, or untested deployment policy gate blocks remote MCP deployment approval",
    "command output proving the tests ran",
    "Missing evidence keeps deployment blocked",
  ]);

  assertDocMentions(deploymentDoc, [
    "deployment approval-state tests",
    "deployment target-boundary tests",
    "endpoint, DNS, TLS, and transport tests",
    "Origin and CORS rejection tests",
    "auth, audience, scope, and protected-resource tests",
    "secret and environment allowlist tests",
    "ingress and egress rejection tests",
    "DNS rebinding tests",
    "process, concurrency, body size, timeout, and resource-limit tests",
    "session entropy and binding tests",
    "filesystem, shell, and undeclared network absence tests",
    "deployed tool allowlist tests",
    "per-tool risk and tool-output prompt-injection tests",
    "replay abuse and source-truth preservation tests",
    "logging, telemetry, redaction, retention, and deletion tests",
    "structured error and no-stack-trace tests",
    "CI/CD protected-environment tests",
    "artifact identity and provenance tests",
    "package, dependency, bin, export, lockfile, and publish metadata drift tests",
    "health, readiness, monitoring, abuse response, shutdown, rollback, and removal tests",
    "official-docs evidence tests",
  ]);
});

test("PR44 keeps package metadata lockfile dependencies runtime and deployment files unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);

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
  assertCurrentMcpRuntimeSourceBoundary(filesUnder("src/mcp"));
  assert.equal(existsSync(wrapperPath), true);

  for (const path of blockedDeploymentPaths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  assertNoDeploymentWorkflowFiles();

  const mcpBoundaryPaths = [
    "src/mcp/private-dev-local-visual-mcp-protocol.ts",
    "src/mcp/stdio-protocol.ts",
    "bin/norma-core-mcp-stdio.mjs",
  ];
  for (const path of mcpBoundaryPaths) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoRemoteServerSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
});

test("PR44 keeps the current local STDIO tool allowlist as the only approved exposure", async () => {
  const deploymentDoc = readDoc(pr44DeploymentDocPath);
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr44-tools-list",
    method: "tools/list",
  });

  assertDocMentions(deploymentDoc, approvedCallableTools);
  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    currentRuntimeTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr44-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr44-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr44-arbitrary-replay-blocked",
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
    id: "pr44-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });

  assertDocMentions(deploymentDoc, [
    "Current MCP tool exposure remains exactly the local STDIO allowlist",
    "`norma.replayRun` and arbitrary replay remain blocked as MCP exposure",
    "Resources, prompts, sampling, elicitation, logging, telemetry, and retention remain blocked",
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
        `Build output is required before PR44 MCP runtime contract validation: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

  return handleMcpJsonRpcMessagePromise;
}

async function parseRequiredResponse(message) {
  const handleMcpJsonRpcMessage = await loadHandleMcpJsonRpcMessage();
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null, "MCP handler should return a JSON-RPC response, not null");
  assert.notEqual(response, undefined, "MCP handler should return a JSON-RPC response, not undefined");
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

function assertNoDeploymentWorkflowFiles() {
  const workflowPaths = filesUnder(".github/workflows");
  const blockedWorkflowPattern = /(?:deploy|deployment|remote-mcp|server|publish)/i;

  for (const path of workflowPaths) {
    assert.doesNotMatch(path, blockedWorkflowPattern, `${path} must not be a deployment workflow`);
  }
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

function assertNoRemoteMcpRuntimeSurface(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*(?:Server|Transport|Endpoint)|sse|streamable|websocket|networkFetch|XMLHttpRequest|WebSocket)\b/i,
    `${path} must not contain remote MCP runtime markers`,
  );
}

function assertNoRemoteServerSurface(source, path) {
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
