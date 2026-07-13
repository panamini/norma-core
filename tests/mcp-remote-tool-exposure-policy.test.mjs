import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertCurrentMcpRuntimeSourceBoundary,
  assertCurrentRemoteMcpPackageBoundary,
} from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const policyDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-remote-mcp-tool-exposure-policy.md",
);
const pr45PolicyDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-mcp-decision-doc-location-policy.md",
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

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeTools = [...approvedCallableTools, "norma.analyzeStructuredCompositionV1"];

const rejectedToolNames = [
  "norma.replayRun",
  "norma.readFile",
  "norma.writeFile",
  "norma.fetchUrl",
  "norma.runShell",
  "norma.recommend",
  "norma.rankBeauty",
  "norma.inferIntent",
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
  "Procfile",
  "nginx.conf",
  "Caddyfile",
  "caddyfile",
];

const requiredPolicySections = [
  "# Remote MCP Tool Exposure Policy",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Current Local STDIO Tool Allowlist",
  "## Remote Tool Exposure Non-Approval Boundary",
  "## Tool Inheritance Boundary",
  "## Replay Exposure Boundary",
  "## Resources Prompts Sampling Elicitation Logging Boundary",
  "## Prohibited Tool Categories",
  "## Required Future Tool Exposure Gates",
  "## Required Future Tool Exposure Tests",
  "## Package Runtime and Deployment Boundary",
  "## Final Decision",
];

test("PR46 policy doc exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(policyDocPath), true);
  assert.equal(basename(policyDocPath), "2026-06-15-remote-mcp-tool-exposure-policy.md");
  assert.equal(
    policyDocPath.endsWith(join("docs", "decisions", "2026-06-15-remote-mcp-tool-exposure-policy.md")),
    true,
  );

  const policyDoc = readDoc(policyDocPath);
  assertHeadingsInOrder(policyDoc, requiredPolicySections);
  assertDocMentions(policyDoc, [
    "PR46 is docs/contract-tests only",
    "Remote MCP remains blocked after PR46",
    "Local STDIO remains the only approved MCP runtime",
    "PR46 does not approve remote MCP runtime implementation",
    "PR46 does not approve remote tool exposure",
  ]);
});

test("PR46 policy references PR39 through PR45 and follows PR45 decision-doc location policy", () => {
  const policyDoc = readDoc(policyDocPath);
  const pr45PolicyDoc = readDoc(pr45PolicyDocPath);

  for (const prNumber of ["PR39", "PR40", "PR41", "PR42", "PR43", "PR44", "PR45"]) {
    assertDocMentions(policyDoc, [prNumber]);
  }

  assertDocMentions(policyDoc, [
    "docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md",
    "docs/MCP_TOOL_CONTRACT.md",
    "src/mcp/stdio-protocol.ts",
    "bin/norma-core-mcp-stdio.mjs",
    "package.json",
    "package-lock.json",
  ]);

  assertDocMentions(pr45PolicyDoc, [
    "Future new MCP technical decision documents must use `docs/decisions/YYYY-MM-DD-topic.md`",
    "No additional `docs/MCP_REMOTE_*.md` decision document should be added after PR45",
  ]);
});

test("PR46 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }
});

test("PR46 policy keeps remote MCP and remote tool exposure blocked", () => {
  const policyDoc = readDoc(policyDocPath);

  assertDocMentions(policyDoc, [
    "Remote MCP tool exposure remains blocked",
    "No remote MCP tool exposure is approved by PR46",
    "Future remote MCP tool exposure must not inherit tools automatically from local STDIO",
    "Future remote MCP tool exposure must define an exact remote allowlist before implementation",
    "An empty or missing remote allowlist means no remote tools are approved",
    "Any future remote MCP tool exposure requires a separate explicit approval PR and contract tests",
  ]);

  assertDocMentions(policyDoc, [
    "PR46 does not approve remote `tools/list`",
    "remote `tools/call`",
    "remote tool metadata",
    "remote tool execution",
    "remote allowed-tools configuration",
  ]);

  assert.doesNotMatch(policyDoc, /^remote MCP is approved$/im);
  assert.doesNotMatch(policyDoc, /^remote tool exposure is approved$/im);
  assert.doesNotMatch(policyDoc, /^runtime implementation is approved$/im);
});

test("PR46 policy documents the exact local STDIO allowlist and future allowlist and denylist gates", () => {
  const policyDoc = readDoc(policyDocPath);
  const allowlistSection = sectionBetween(
    policyDoc,
    "## Current Local STDIO Tool Allowlist",
    "## Remote Tool Exposure Non-Approval Boundary",
  );

  assert.deepEqual(documentedToolLines(allowlistSection), approvedCallableTools);

  assertDocMentions(policyDoc, [
    "Any future remote MCP tool exposure PR must include exact allowlist tests and denylist tests before implementation",
    "`tools/list` exposes exactly the approved remote allowlist",
    "`tools/call` rejects unapproved tool names",
    "no tool is inherited automatically from local STDIO",
    "package, dependency, runtime, and deployment drift is absent unless separately approved",
  ]);
});

test("PR46 policy keeps replay resources prompts sampling elicitation logging and prohibited tool categories blocked", () => {
  const policyDoc = readDoc(policyDocPath);

  assertDocMentions(policyDoc, [
    "`norma.replayRun` remains blocked as MCP exposure",
    "No future PR may expose `norma.replayRun` unless a separate explicit approval PR changes this policy with security rationale and contract tests",
    "Arbitrary replay remains blocked",
    "`norma.replayMvpDemo` remains fixed-demo-only",
    "`norma.replayMvpDemo` must reject caller-supplied replay inputs",
    "Resources remain blocked",
    "Prompts remain blocked",
    "Sampling remains blocked",
    "Elicitation remains blocked",
    "Logging remains blocked",
  ]);

  assertDocMentions(policyDoc, [
    "PR46 approves no file tools",
    "PR46 approves no network tools",
    "PR46 approves no shell tools",
    "PR46 approves no mutation tools",
    "PR46 approves no creative tools",
    "PR46 approves no recommendation tools",
    "PR46 approves no beauty tools",
    "PR46 approves no intent-inference tools",
  ]);
});

test("PR46 keeps tools/list exactly on the current five local STDIO tools", async () => {
  const response = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr46-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    response.result.tools.map((tool) => tool.name),
    currentRuntimeTools,
  );
});

test("PR46 initialize exposes no resources prompts sampling elicitation or logging capabilities", async () => {
  const response = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr46-initialize",
    method: "initialize",
    params: {},
  });

  assert.deepEqual(response.result.capabilities, {
    tools: {
      listChanged: false,
    },
  });

  for (const capability of ["resources", "prompts", "sampling", "elicitation", "logging"]) {
    assert.equal(
      Object.hasOwn(response.result.capabilities, capability),
      false,
      `${capability} capability must stay absent`,
    );
  }
});

test("PR46 rejects replayRun and obvious unapproved tool names", async () => {
  for (const toolName of rejectedToolNames) {
    const response = await parseRequiredResponse({
      jsonrpc: "2.0",
      id: `pr46-${toolName}`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: {},
      },
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: `pr46-${toolName}`,
      error: {
        code: -32602,
        message: `Unknown tool: ${toolName}`,
      },
    });
  }
});

test("PR46 keeps replayMvpDemo fixed-demo-only by rejecting caller-supplied replay input", async () => {
  const response = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr46-arbitrary-replay-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayMvpDemo",
      arguments: {
        run: {},
      },
    },
  });

  assert.deepEqual(response, {
    jsonrpc: "2.0",
    id: "pr46-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
});

test("PR46 keeps resources prompts sampling elicitation and logging methods blocked", async () => {
  for (const method of [
    "resources/list",
    "resources/read",
    "prompts/list",
    "prompts/get",
    "sampling/createMessage",
    "elicitation/create",
    "logging/setLevel",
  ]) {
    const response = await parseRequiredResponse({
      jsonrpc: "2.0",
      id: `pr46-${method}`,
      method,
      params: {},
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: `pr46-${method}`,
      error: {
        code: -32601,
        message: "Method not found",
      },
    });
  }
});

test("PR46 keeps package metadata dependencies lockfile and MCP SDK unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);

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
});

test("PR46 keeps runtime and deployment surfaces absent in the MCP boundary", () => {
  assertCurrentMcpRuntimeSourceBoundary(filesUnder("src/mcp"));
  assert.equal(existsSync(wrapperPath), true);

  for (const path of blockedRuntimeAndDeploymentPaths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  for (const path of [
    "src/mcp/private-dev-local-visual-mcp-protocol.ts",
    "src/mcp/stdio-protocol.ts",
    "bin/norma-core-mcp-stdio.mjs",
  ]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
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
        `Build output is required before PR46 MCP runtime contract validation: ${
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

function documentedToolLines(section) {
  const codeBlockMatch = /```txt\n([\s\S]*?)\n```/.exec(section);
  assert.notEqual(codeBlockMatch, null, "allowlist should be documented in a txt code block");
  return codeBlockMatch[1].split("\n").filter((line) => line.trim() !== "");
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
