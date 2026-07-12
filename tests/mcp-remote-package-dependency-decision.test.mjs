import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

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

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeTools = [...approvedCallableTools, "norma.analyzeStructuredCompositionV1"];

const blockedPackageCandidates = [
  "@modelcontextprotocol/sdk",
  "@modelcontextprotocol/server",
  "@modelcontextprotocol/node",
  "@modelcontextprotocol/express",
  "@modelcontextprotocol/hono",
];

const requiredDecisionSections = [
  "# MCP Remote Package Dependency Decision",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Official References Checked",
  "## Recorded NPM Metadata Snapshot",
  "## Current Package State",
  "## Candidate Review",
  "## Package / Dependency Decision",
  "## Package Metadata Boundary",
  "## Runtime Non-Approval Boundary",
  "## Tool Exposure Boundary",
  "## Required Future Reconsideration PR",
  "## Required Future Install PR",
  "## Required Tests Before Any Install",
  "## Final Decision",
];

test("PR42 remote MCP package dependency decision doc exists and references PR39 through PR41", () => {
  assert.equal(existsSync(pr42DecisionDocPath), true);
  assert.equal(existsSync(pr41DecisionDocPath), true);
  assert.equal(existsSync(pr40ApprovalDecisionDocPath), true);
  assert.equal(existsSync(pr39ThreatModelDocPath), true);

  const decisionDoc = readDoc(pr42DecisionDocPath);

  assertHeadingsInOrder(decisionDoc, requiredDecisionSections);
  assertDocMentions(decisionDoc, [
    "PR42 is docs/contract-tests only",
    "Reference PR39 threat model",
    "Reference PR40 approval decision",
    "Reference PR41 transport/auth/package decision",
    "Remote MCP remains blocked after PR42",
    "Local STDIO remains the only approved MCP runtime",
  ]);
});

test("PR42 records official package metadata checks without approving a candidate", () => {
  const decisionDoc = readDoc(pr42DecisionDocPath);

  assertDocMentions(decisionDoc, [
    "Access date: 2026-06-15",
    "https://github.com/modelcontextprotocol/typescript-sdk",
    "npm view @modelcontextprotocol/sdk version dist-tags dependencies peerDependencies engines --json",
    "npm view @modelcontextprotocol/server version dist-tags dependencies peerDependencies engines --json",
    "npm view @modelcontextprotocol/node version dist-tags dependencies peerDependencies engines --json",
    "npm view @modelcontextprotocol/express version dist-tags dependencies peerDependencies engines --json",
    "npm view @modelcontextprotocol/hono version dist-tags dependencies peerDependencies engines --json",
    "@modelcontextprotocol/sdk@1.29.0",
    "@modelcontextprotocol/server@2.0.0-alpha.2",
    "@modelcontextprotocol/node@2.0.0-alpha.2",
    "@modelcontextprotocol/express@2.0.0-alpha.2",
    "@modelcontextprotocol/hono@2.0.0-alpha.2",
    "No remote MCP package/dependency candidate is approved by PR42",
    "No package-only install PR is authorized by PR42",
    "No MCP SDK dependency is approved by PR42",
    "\"@modelcontextprotocol/sdk\":",
    "\"version\": \"1.29.0\"",
    "\"node\": \">=18\"",
    "\"cors\"",
    "\"cross-spawn\"",
    "\"express-rate-limit\"",
    "\"jose\"",
    "\"@modelcontextprotocol/server\":",
    "\"version\": \"2.0.0-alpha.2\"",
    "\"node\": \">=20\"",
    "\"@modelcontextprotocol/node\":",
    "\"@modelcontextprotocol/express\":",
    "\"@modelcontextprotocol/hono\":",
  ]);

  assert.doesNotMatch(decisionDoc, /^dependencies are approved now$/im);
  assert.doesNotMatch(decisionDoc, /^MCP SDK dependency is approved$/im);
  assert.doesNotMatch(decisionDoc, /^package-only install is authorized$/im);
});

test("PR42 keeps all reviewed package candidates blocked", () => {
  const decisionDoc = readDoc(pr42DecisionDocPath);

  for (const packageName of blockedPackageCandidates) {
    assertDocMentions(decisionDoc, [packageName]);
  }

  assertDocMentions(decisionDoc, [
    "`@modelcontextprotocol/sdk@1.29.0` is not approved",
    "`@modelcontextprotocol/server@2.0.0-alpha.2` is not approved",
    "`@modelcontextprotocol/node@2.0.0-alpha.2` is not approved",
    "`@modelcontextprotocol/express@2.0.0-alpha.2` is not approved",
    "`@modelcontextprotocol/hono@2.0.0-alpha.2` is not approved",
    "Dependency-free remote MCP implementation is not approved by PR42",
    "PR42 keeps all package/dependency work blocked",
    "No package/dependency candidate may be installed based on PR42",
  ]);
});

test("PR42 documents future reconsideration install and test gates before package changes", () => {
  const decisionDoc = readDoc(pr42DecisionDocPath);

  assertDocMentions(decisionDoc, [
    "exact package names and versions",
    "stable-vs-alpha status",
    "Node engine compatibility",
    "dependency tree and transitive risk",
    "license compatibility",
    "lockfile impact",
    "runtime surface enabled by each dependency",
    "removal and rollback plan",
    "security test matrix impact",
    "a separate package-only install PR is still required",
    "modify only package metadata and lockfiles",
    "add no runtime implementation",
    "keep remote MCP blocked until a later runtime PR",
    "approved package name and version",
    "rejected package names",
    "dependency and peer-dependency tree",
    "MCP SDK dependency presence only when explicitly approved",
  ]);
});

test("PR42 keeps package metadata lockfile dependencies and MCP SDK unchanged", () => {
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

  for (const packageName of blockedPackageCandidates) {
    assert.equal(
      JSON.stringify(packageJson).includes(packageName),
      false,
      `${packageName} must not appear in package.json`,
    );
    assert.equal(
      JSON.stringify(packageLock).includes(packageName),
      false,
      `${packageName} must not appear in package-lock.json`,
    );
  }
});

test("PR42 keeps runtime files local STDIO only with no remote package-driven behavior", () => {
  assert.deepEqual(filesUnder("src/mcp"), [
    "src/mcp/private-dev-local-visual-mcp-protocol.ts",
    "src/mcp/stdio-protocol.ts",
  ]);
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

  const remoteBoundaryPaths = [...filesUnder("src"), ...filesUnder("bin")].filter(
    (path) =>
      path !== "src/api/minimal-api-server.ts" &&
      path !== "src/local-report/controlled-provider-observation-contract.ts" &&
      path !== "src/local-report/controlled-provider-observation-acceptance-proof.ts",
  );

  for (const path of remoteBoundaryPaths) {
    assertNoRemoteServerSurface(readDoc(join(repoRoot, path)), path);
  }

  for (const path of [...filesUnder("src/mcp"), "bin/norma-core-mcp-stdio.mjs"]) {
    assertNoMcpRuntimeSideEffects(readDoc(join(repoRoot, path)), path);
  }
});

test("PR42 keeps current local STDIO tools unchanged and arbitrary replay blocked", async () => {
  const decisionDoc = readDoc(pr42DecisionDocPath);
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr42-tools-list",
    method: "tools/list",
  });

  assertDocMentions(decisionDoc, approvedCallableTools);
  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    currentRuntimeTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr42-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr42-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr42-arbitrary-replay-blocked",
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
    id: "pr42-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });

  assertDocMentions(decisionDoc, [
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
    .then((mod) => {
      assert.equal(
        typeof mod.handleMcpJsonRpcMessage,
        "function",
        "dist/src/mcp/stdio-protocol.js should export handleMcpJsonRpcMessage",
      );
      return mod.handleMcpJsonRpcMessage;
    })
    .catch((error) => {
      assert.fail(
        `Build output is required before PR42 MCP runtime contract validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

  return handleMcpJsonRpcMessagePromise;
}

async function parseRequiredResponse(message) {
  const handleMcpJsonRpcMessage = await loadHandleMcpJsonRpcMessage();
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  assert.equal(typeof response, "string", "MCP response should be a JSON-RPC response string");
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
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|listen|app\.get|app\.post|router|route|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*|sse|streamable|websocket|express|fastify|cors|oauth|auth|authorization|authentication|token|accessToken|idToken|bearerToken|fetch|XMLHttpRequest|WebSocket|networkFetch)\b/i,
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
