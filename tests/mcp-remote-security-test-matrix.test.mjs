import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

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

const requiredMatrixSections = [
  "# MCP Remote Security Test Matrix",
  "## Status",
  "## Source Documents",
  "## Non-Approval Boundary",
  "## Future Runtime Approval Rule",
  "## Security Gate Matrix",
  "## Contract Test Categories",
  "## Required Runtime PR Evidence",
  "## Package and Dependency Boundary",
  "## Final Decision",
];

test("PR43 remote MCP security test matrix doc exists and references PR39 through PR42", () => {
  assert.equal(existsSync(pr43MatrixDocPath), true);
  assert.equal(existsSync(pr42DecisionDocPath), true);
  assert.equal(existsSync(pr41DecisionDocPath), true);
  assert.equal(existsSync(pr40ApprovalDecisionDocPath), true);
  assert.equal(existsSync(pr39ThreatModelDocPath), true);

  const matrixDoc = readDoc(pr43MatrixDocPath);

  assertHeadingsInOrder(matrixDoc, requiredMatrixSections);
  assertDocMentions(matrixDoc, [
    "PR43 is docs/contract-tests only",
    "Reference PR39 threat model",
    "Reference PR40 approval decision",
    "Reference PR41 transport/auth/package decision",
    "Reference PR42 package dependency decision",
    "Remote MCP remains blocked after PR43",
    "Local STDIO remains the only approved MCP runtime",
  ]);
});

test("PR43 records non-approval and requires future docs to be rechecked before runtime work", () => {
  const matrixDoc = readDoc(pr43MatrixDocPath);

  assertDocMentions(matrixDoc, [
    "PR43 does not approve remote MCP runtime implementation",
    "PR43 does not approve HTTP, SSE, Streamable HTTP, or WebSocket runtime",
    "PR43 does not approve OAuth, auth, or token runtime",
    "PR43 does not approve package metadata, dependency, package `bin`, package export, lockfile, or publish metadata changes",
    "PR43 does not re-check current official docs because it makes no new transport, auth, package, runtime, or provider-compatibility decision",
    "Future runtime approval PRs must re-check current official MCP and provider docs at that time",
  ]);

  assert.doesNotMatch(matrixDoc, /^remote MCP is approved$/im);
  assert.doesNotMatch(matrixDoc, /^runtime implementation is approved$/im);
  assert.doesNotMatch(matrixDoc, /^package changes are approved$/im);
});

test("PR43 defines the minimum future remote MCP security gates", () => {
  const matrixDoc = readDoc(pr43MatrixDocPath);

  assertDocMentions(matrixDoc, [
    "Gate 0 - explicit approval state",
    "Gate 1 - transport and protocol boundary",
    "Gate 2 - authorization and token boundary",
    "Gate 3 - tool exposure and tool-risk boundary",
    "Gate 4 - replay and source-truth boundary",
    "Gate 5 - resources, prompts, sampling, elicitation, and logging boundary",
    "Gate 6 - package, dependency, and publish metadata boundary",
    "Gate 7 - runtime side-effect and deployment boundary",
    "Gate 8 - abuse, denial-of-service, and error boundary",
    "Gate 9 - observability, redaction, and retention boundary",
  ]);

  assertDocMentions(matrixDoc, [
    "explicit remote MCP approval",
    "transport selection and rejection of non-approved transports",
    "Origin validation",
    "CORS policy",
    "localhost binding policy",
    "session model",
    "session ID entropy and binding",
    "protocol version policy",
    "DNS rebinding",
    "MCP HTTP authorization",
    "protected resource metadata",
    "audience/resource validation",
    "scope enforcement",
    "token passthrough prevention",
    "token retention policy",
    "token logging policy",
    "`WWW-Authenticate` behavior",
    "allowed-tools enforcement",
    "per-tool risk classification",
    "tool metadata and output prompt-injection tests",
    "no hidden instructions in tool outputs",
    "no `norma.replayRun` MCP exposure",
    "arbitrary replay rejection",
    "MCP must not create Norma truth",
    "Prompt text is never source truth",
    "Artifacts are derived and never source truth",
    "no resources/prompts unless separately approved",
    "no sampling/elicitation/logging unless separately approved",
    "package/dependency/bin/export/lockfile drift tests",
    "no MCP SDK dependency unless separately approved",
    "no filesystem, network, shell, or environment-driven behavior unless separately approved",
    "deployment policy",
    "rate limits",
    "body size limits",
    "timeout behavior",
    "structured errors with no client-visible stack traces",
    "data retention policy",
    "log redaction policy",
  ]);
});

test("PR43 defines contract test categories future runtime PRs must satisfy before implementation", () => {
  const matrixDoc = readDoc(pr43MatrixDocPath);

  assertDocMentions(matrixDoc, [
    "approval-state tests",
    "transport rejection tests",
    "auth failure tests",
    "allowed-tools tests",
    "tool-risk tests",
    "replay abuse tests",
    "source-truth preservation tests",
    "resource and prompt absence tests",
    "package drift tests",
    "runtime side-effect absence tests",
    "deployment policy tests",
    "abuse limit tests",
    "structured error tests",
    "redaction tests",
    "retention tests",
  ]);

  assertDocMentions(matrixDoc, [
    "These tests must exist before runtime implementation, not after it",
    "No future PR may combine the first remote runtime implementation with the first definition of these gates",
    "Each approved gate must include accept-path and reject-path tests",
    "Each matrix row must identify category, required decision, blocked default, minimum tests, and evidence",
    "A failing gate blocks remote MCP runtime merge",
  ]);
});

test("PR43 keeps current package metadata dependencies lockfile and MCP SDK unchanged", () => {
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

  assertNoMcpDependency(packageJson);
  assertNoMcpDependency(packageLock.packages[""]);
});

test("PR43 keeps runtime files local STDIO only and remote surfaces absent", () => {
  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);

  for (const path of [
    "src/mcp/http-server.ts",
    "src/mcp/streamable-http.ts",
    "src/mcp/sse.ts",
    "src/mcp/websocket.ts",
    "src/mcp/auth.ts",
    "src/mcp/package-dependencies.ts",
    "bin/norma-core-mcp-http.mjs",
    "bin/norma-core-mcp-server.mjs",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  for (const path of [...filesUnder("src"), ...filesUnder("bin")]) {
    assertNoRemoteServerSurface(readDoc(join(repoRoot, path)), path);
  }

  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    assertNoMcpRuntimeSideEffects(readDoc(join(repoRoot, path)), path);
  }
});

test("PR43 keeps the current local STDIO tool allowlist as the only approved exposure", async () => {
  const matrixDoc = readDoc(pr43MatrixDocPath);
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr43-tools-list",
    method: "tools/list",
  });

  assertDocMentions(matrixDoc, approvedCallableTools);
  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    approvedCallableTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr43-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr43-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr43-arbitrary-replay-blocked",
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
    id: "pr43-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });

  assertDocMentions(matrixDoc, [
    "Current MCP tool exposure remains exactly the local STDIO allowlist",
    "`norma.replayRun` and arbitrary replay remain blocked as MCP exposure",
    "Resources, prompts, sampling, elicitation, and logging remain blocked",
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
        `Build output is required before PR43 MCP runtime contract validation: ${error instanceof Error ? error.message : String(error)}`,
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

function assertHeadingsInOrder(doc, headings) {
  let previousIndex = -1;

  for (const heading of headings) {
    const index = doc.indexOf(heading);
    assert.notEqual(index, -1, `${heading} should exist`);
    assert.ok(index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = index;
  }
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function assertNoRemoteServerSurface(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|listen|app\.get|app\.post|router|route|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*|sse|streamable|websocket|express|fastify|cors|oauth|authorization|authentication|auth[A-Za-z0-9_]*|[A-Za-z0-9_]*token[A-Za-z0-9_]*|jwt[A-Za-z0-9_]*|fetch|XMLHttpRequest|WebSocket|networkFetch)\b/i,
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
