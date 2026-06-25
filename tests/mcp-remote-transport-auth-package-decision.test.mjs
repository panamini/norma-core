import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
let handleMcpJsonRpcMessagePromise;

const pr41DecisionDocPath = join(
  repoRoot,
  "docs",
  "MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
);
const pr39ThreatModelDocPath = join(repoRoot, "docs", "MCP_REMOTE_THREAT_MODEL.md");
const pr40ApprovalDecisionDocPath = join(repoRoot, "docs", "MCP_REMOTE_APPROVAL_DECISION.md");
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

const requiredDecisionSections = [
  "# MCP Remote Transport/Auth/Package Decision",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Official References Checked",
  "## Transport Decision",
  "## Auth Decision",
  "## Package / Dependency Decision",
  "## Runtime Non-Approval Boundary",
  "## Tool Exposure Boundary",
  "## Resources / Prompts Boundary",
  "## Required Future PRs",
  "## Required Security Tests",
  "## Final Decision",
];

test("PR41 remote MCP transport auth package decision doc exists and references PR39 and PR40", () => {
  assert.equal(existsSync(pr41DecisionDocPath), true);
  assert.equal(existsSync(pr39ThreatModelDocPath), true);
  assert.equal(existsSync(pr40ApprovalDecisionDocPath), true);

  const decisionDoc = readDoc(pr41DecisionDocPath);

  assertHeadingsInOrder(decisionDoc, requiredDecisionSections);
  assertDocMentions(decisionDoc, [
    "PR41 is docs/contract-tests only",
    "PR41 decides the future remote MCP transport/auth/package path in principle only",
    "Remote MCP remains blocked after PR41 unless future-candidate language is explicitly scoped",
    "docs/MCP_REMOTE_THREAT_MODEL.md",
    "docs/MCP_REMOTE_APPROVAL_DECISION.md",
    "Reference PR39",
    "Reference PR40",
  ]);
});

test("PR41 checks current official transport auth package references without approving runtime", () => {
  const decisionDoc = readDoc(pr41DecisionDocPath);

  assertDocMentions(decisionDoc, [
    "Access date: 2026-06-15",
    "https://modelcontextprotocol.io/specification/2025-11-25/changelog",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/transports",
    "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization",
    "https://modelcontextprotocol.io/specification/2025-11-25/server/tools",
    "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
    "https://developers.openai.com/api/docs/mcp",
    "https://code.claude.com/docs/en/mcp",
    "https://platform.claude.com/docs/en/agents-and-tools/mcp-connector",
    "Streamable HTTP is approved as a future candidate only",
    "MCP HTTP authorization is approved as a future candidate only",
    "No package/dependency candidate or change is approved by PR41",
    "No runtime implementation is approved by PR41",
  ]);

  assert.doesNotMatch(decisionDoc, /^remote MCP is approved$/im);
  assert.doesNotMatch(decisionDoc, /^runtime is approved$/im);
  assert.doesNotMatch(decisionDoc, /^auth is implemented$/im);
  assert.doesNotMatch(decisionDoc, /^transport is implemented$/im);
  assert.doesNotMatch(decisionDoc, /^dependencies are approved now$/im);
});

test("PR41 keeps remote MCP runtime package resources prompts and logging blocked", () => {
  const decisionDoc = readDoc(pr41DecisionDocPath);

  assertDocMentions(decisionDoc, [
    "Remote MCP remains blocked after PR41",
    "Local STDIO remains the only approved MCP runtime",
    "PR41 does not approve HTTP, SSE, Streamable HTTP, or WebSocket runtime",
    "PR41 does not approve OAuth, auth, or token runtime",
    "PR41 approves no package metadata change, dependency change, package `bin` change, package export change, MCP SDK dependency, or exact future package/dependency candidate",
    "Resources remain blocked",
    "Prompts remain blocked",
    "Sampling remains blocked",
    "Elicitation remains blocked",
    "Logging remains blocked",
  ]);
});

test("PR41 documents exact future PR gates and required security tests", () => {
  const decisionDoc = readDoc(pr41DecisionDocPath);

  assertDocMentions(decisionDoc, [
    "transport approval PR",
    "auth approval PR",
    "package/dependency approval PR",
    "package-only install PR",
    "runtime skeleton PR",
    "security test matrix PR",
    "deployment policy PR",
    "tool exposure review PR",
    "Origin validation",
    "protected resource metadata",
    "audience/resource validation",
    "token passthrough prevention",
    "`WWW-Authenticate` behavior",
    "allowed-tools enforcement",
    "no `norma.replayRun` MCP exposure",
    "arbitrary replay rejection",
    "no package/dependency/bin/export drift unless separately approved",
    "no MCP SDK dependency unless separately approved",
  ]);
});

test("PR41 keeps local STDIO tools unchanged and arbitrary replay blocked", async () => {
  const decisionDoc = readDoc(pr41DecisionDocPath);
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr41-tools-list",
    method: "tools/list",
  });

  assertDocMentions(decisionDoc, approvedCallableTools);
  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    currentRuntimeTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr41-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr41-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr41-arbitrary-replay-blocked",
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
    id: "pr41-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
});

test("PR41 keeps runtime files package metadata dependencies and MCP SDK unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);
  const runtimeSource = [readDoc(protocolSourcePath), readDoc(wrapperPath)].join("\n");

  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);
  assert.equal(existsSync(wrapperPath), true);

  for (const path of [
    "src/mcp/http-server.ts",
    "src/mcp/streamable-http.ts",
    "src/mcp/sse.ts",
    "src/mcp/websocket.ts",
    "src/mcp/auth.ts",
    "bin/norma-core-mcp-http.mjs",
    "bin/norma-core-mcp-server.mjs",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  assert.doesNotMatch(
    runtimeSource,
    /createServer|listen\(|app\.get|app\.post|router|route|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate/,
  );
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:sse|streamable|websocket|express|fastify|cors|oauth)\b|https?|auth|token|fetch\(|XMLHttpRequest|WebSocket/i,
  );
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:readFile|writeFile|deleteFile|networkFetch|shell|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
  );

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
        `Build output is required before PR41 MCP runtime contract validation: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

  return handleMcpJsonRpcMessagePromise;
}

async function parseRequiredResponse(message) {
  const handleMcpJsonRpcMessage = await loadHandleMcpJsonRpcMessage();
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
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
