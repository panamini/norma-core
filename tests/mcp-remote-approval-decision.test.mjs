import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const decisionDocPath = join(repoRoot, "docs", "MCP_REMOTE_APPROVAL_DECISION.md");
const threatModelDocPath = join(repoRoot, "docs", "MCP_REMOTE_THREAT_MODEL.md");
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
  "# MCP Remote Approval Decision",
  "## Status",
  "## Decision",
  "## Non-Approval Boundary",
  "## Required Future PRs",
  "## Required Security Controls",
  "## Tool Exposure Decision",
  "## Resources / Prompts Decision",
  "## Package / Dependency Decision",
  "## Runtime Boundary",
  "## Tests Required Before Runtime",
  "## Final Decision",
];

test("PR40 remote MCP approval decision document exists and references PR39", () => {
  assert.equal(existsSync(decisionDocPath), true);
  assert.equal(existsSync(threatModelDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);
  assertHeadingsInOrder(decisionDoc, requiredDecisionSections);
  assertDocMentions(decisionDoc, [
    "PR40 is docs/contract-tests only",
    "PR39",
    "docs/MCP_REMOTE_THREAT_MODEL.md",
    "Remote MCP remains blocked after PR40",
    "PR40 does not approve remote runtime implementation",
    "Local STDIO remains the only approved MCP runtime",
  ]);
});

test("PR40 decision keeps remote MCP runtime package and adjacent capabilities blocked", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "resources and prompts remain blocked",
    "sampling, elicitation, and logging remain blocked",
    "no package/dependency/bin/export change is approved",
    "no HTTP, SSE, Streamable HTTP, or WebSocket runtime is approved",
    "no OAuth, auth, or token runtime is approved",
    "norma.replayRun and arbitrary replay remain blocked as MCP exposure",
    "PR40 does not approve remote runtime implementation",
  ]);
});

test("PR40 decision requires separate future remote MCP approval gates", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "transport",
    "auth",
    "package/dependencies",
    "runtime",
    "deployment",
    "observability/logging policy",
    "tool exposure",
    "security test matrix",
  ]);
});

test("PR40 keeps package metadata dependencies and runtime boundary unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);
  const runtimeSource = [readDoc(protocolSourcePath), readDoc(wrapperPath)].join("\n");

  assert.deepEqual(filesUnder("src/mcp"), [
    "src/mcp/private-dev-local-visual-mcp-protocol.ts",
    "src/mcp/stdio-protocol.ts",
  ]);
  assert.equal(existsSync(join(repoRoot, "bin", "norma-core-mcp-stdio.mjs")), true);

  for (const path of [
    "src/mcp/http-server.ts",
    "src/mcp/streamable-http.ts",
    "src/mcp/sse.ts",
    "src/mcp/websocket.ts",
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
    /http|https|sse|streamable|websocket|express|fastify|cors|oauth|auth|token|fetch\(|XMLHttpRequest|WebSocket/i,
  );
  assert.doesNotMatch(
    runtimeSource,
    /\b(?:readFile|writeFile|deleteFile|networkFetch|shell|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
  );

  assert.equal(packageJson.private, true);
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
    assert.equal(Object.hasOwn(packageLock.packages[""], fieldName), false, `${fieldName} should stay absent in lock root`);
  }

  assert.deepEqual(packageJson.devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(packageLock.packages[""].devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(Object.keys(packageLock.packages).sort(), ["", "node_modules/typescript"]);
  assertNoMcpDependency(packageJson);
  assertNoMcpDependency(packageLock.packages[""]);
});

test("PR40 keeps local STDIO tools unchanged and arbitrary replay blocked", () => {
  const toolsListResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr40-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(toolsListResponse.result.tools.map((tool) => tool.name), currentRuntimeTools);

  const replayRunResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr40-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr40-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr40-arbitrary-replay-blocked",
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
    id: "pr40-arbitrary-replay-blocked",
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

function parseRequiredResponse(message) {
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
    assert.ok(index > previousIndex, `${heading} should appear after the previous required heading`);
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
