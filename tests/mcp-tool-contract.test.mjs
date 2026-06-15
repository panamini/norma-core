import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const contractDocPath = join(repoRoot, "docs", "MCP_TOOL_CONTRACT.md");
const packageJsonPath = join(repoRoot, "package.json");
const protocolSourcePath = join(repoRoot, "src", "mcp", "stdio-protocol.ts");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
];

const approvedFutureTools = [
  "norma.getVersion",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
  "norma.serializeCanonicalJson",
];

const forbiddenTools = [
  "norma.createRule",
  "norma.createPack",
  "norma.createRatio",
  "norma.createTolerancePolicy",
  "norma.createGeometry",
  "norma.modifyGeometry",
  "norma.optimizeComposition",
  "norma.recommendComposition",
  "norma.scoreBeauty",
  "norma.inferIntent",
  "norma.generateDesign",
  "norma.importImage",
  "norma.importCamera",
  "norma.importCAD",
  "norma.exportCAD",
  "norma.readFile",
  "norma.writeFile",
  "norma.deleteFile",
  "norma.networkFetch",
  "norma.shell",
  "norma.exec",
  "norma.publishPackage",
  "norma.npmPublish",
  "norma.gitTag",
  "norma.createSdk",
  "norma.createApi",
  "norma.createMcpServer",
];

test("PR33 MCP contract documents contract-only status", () => {
  const doc = readDoc(contractDocPath);

  assertDocMentions(doc, [
    "contract_only_no_mcp_runtime",
    "PR33 does not implement an MCP server",
    "does not add MCP dependencies",
    "does not expose Norma tools to ChatGPT, Claude, or any agent",
    "future explicit publication PR/action",
    "not a current MCP permission",
    "PR34 adds only a local STDIO skeleton",
    "local_stdio_json_rpc_skeleton_only",
    "PR34 does not implement tool calls",
    "PR34 does not expose tools yet",
    "PR34 does not add MCP SDK/dependencies",
    "PR34 does not add package metadata",
    "local STDIO",
    "remote MCP is not approved",
  ]);
});

test("PR33 MCP contract lists only approved future tools", () => {
  const doc = readDoc(contractDocPath);
  const allowedSection = sectionBetween(doc, "## Allowed Future MCP Tools", "## Forbidden MCP Tools");
  const documentedTools = Array.from(new Set(allowedSection.match(/norma\.[A-Za-z0-9]+/g) ?? []));

  assert.deepEqual(documentedTools.sort(), [...approvedFutureTools].sort());

  for (const toolName of ["norma.run", "norma.execute", "norma.call", "norma.mutate"]) {
    assert.doesNotMatch(allowedSection, new RegExp(`\\b${escapeRegExp(toolName)}\\b`));
  }
});

test("PR33 MCP contract lists forbidden tools", () => {
  const doc = readDoc(contractDocPath);
  const forbiddenSection = sectionBetween(doc, "## Forbidden MCP Tools", "## Tool Naming Rules");
  const documentedTools = Array.from(new Set(forbiddenSection.match(/norma\.[A-Za-z0-9]+/g) ?? []));

  assert.deepEqual(documentedTools.sort(), [...forbiddenTools].sort());
  assertDocMentions(forbiddenSection, forbiddenTools);
});

test("PR33 MCP contract documents source-truth and result-preservation rules", () => {
  const doc = readDoc(contractDocPath);

  assertDocMentions(doc, [
    "Structured source objects are source truth",
    "Refs are traceability, not source truth",
    "artifacts are derived",
    "Prompt text is never source truth",
    "preserve warnings",
    "preserve errors",
    "preserve provenance",
    "preserve mismatches",
    "preserve artifactFreshness",
    "Unknown statuses are non-success",
    "never reduce results to `valid`",
  ]);
});

test("PR33 MCP contract documents resources prompts approval and transport boundaries", () => {
  const doc = readDoc(contractDocPath);

  assertDocMentions(doc, [
    "no MCP resources",
    "no MCP prompts",
    "tools-only",
    "Sampling is not approved",
    "Elicitation is not approved",
    "Logging is not approved",
    "local STDIO",
    "Remote HTTP",
    "not approved",
    "Streamable HTTP",
    "Anthropic Messages API MCP connector expects publicly exposed HTTP servers and does not directly connect local STDIO servers",
    "OpenAI remote MCP requires explicit care around approvals, allowed tools, data sharing, prompt injection, and trusted servers",
  ]);
});

test("PR33 MCP contract documents security approval and prompt-injection boundaries", () => {
  const doc = readDoc(contractDocPath);

  assertDocMentions(doc, [
    "Prompt injection",
    "Tool poisoning",
    "allowed tools",
    "approval flow",
    "Sensitive actions are not approved",
    "No URL fetching",
    "No file reading",
    "No shell execution",
    "No network access",
    "Log/review data shared with remote MCP servers",
    "trusted servers",
  ]);
});

test("PR33 MCP contract keeps package metadata unchanged", () => {
  const packageJson = parsePackageJson();

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
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
  }

  assertNoMcpDependency(packageJson);
});

test("PR34 MCP contract permits only the approved local STDIO skeleton files", () => {
  assert.deepEqual(filesUnder("src/mcp"), ["src/mcp/stdio-protocol.ts"]);

  for (const path of [
    "src/mcp/stdio-protocol.ts",
    "bin/norma-core-mcp-stdio.mjs",
    "tests/mcp-stdio-server-skeleton.test.mjs",
    "tests/mcp-tools-list-contract.test.mjs",
    "tests/mcp-tools-call-contract.test.mjs",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
  }

  for (const path of [
    "src/mcp.ts",
    "src/mcp.js",
    "mcp/",
    "server/",
    "src/server/",
    "src/mcp-server.ts",
    "src/mcp-server.js",
    "src/mcp/http-server.ts",
    "src/mcp/streamable-http.ts",
    "src/mcp/sse.ts",
    "src/mcp/websocket.ts",
    "bin/norma-core-mcp-http.mjs",
    "bin/norma-core-mcp-server.mjs",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  const skeletonSource = [
    readFileSync(protocolSourcePath, "utf8"),
    readFileSync(wrapperPath, "utf8"),
  ].join("\n");

  assert.doesNotMatch(
    skeletonSource,
    /http|https|sse|streamable|websocket|express|fastify|oauth|auth|token|fetch\(|XMLHttpRequest|WebSocket/i,
  );
  assert.doesNotMatch(
    skeletonSource,
    /\b(?:readFile|writeFile|deleteFile|networkFetch|shell|exec|spawn|createMcpServer)\b/,
  );

  assertNoMcpDependency(parsePackageJson());
});

test("PR35 MCP contract exposes only discovery metadata for two PR36 candidate tools", () => {
  const doc = readDoc(contractDocPath);
  const pr35Section = sectionBetween(doc, "## PR35 Discovery Contract", "## PR36 Tool Call Contract");
  const documentedTools = Array.from(new Set(pr35Section.match(/norma\.[A-Za-z0-9]+/g) ?? []));

  assert.deepEqual(documentedTools.sort(), ["norma.getVersion", "norma.serializeCanonicalJson"].sort());
  assertDocMentions(pr35Section, [
    "PR35 enables `tools/list` discovery only",
    "PR35 does not implement `tools/call`",
    "PR35 does not implement tool execution",
    "PR35 does not call Norma Core runtime functions",
    "PR35 does not expose verify/replay tools yet",
    "PR35 keeps resources/prompts blocked",
    "PR35 keeps remote MCP blocked",
    "PR36 is the first candidate for actual tool-call implementation",
  ]);
  assert.doesNotMatch(pr35Section, /norma\.verifyRun/);
  assert.doesNotMatch(pr35Section, /norma\.verifyArtifactFreshness/);
  assert.doesNotMatch(pr35Section, /norma\.replayMvpDemo/);
});

test("PR36 MCP contract documents two-tool call implementation and blocked boundaries", () => {
  const doc = readDoc(contractDocPath);
  const pr36Section = sectionBetween(doc, "## PR36 Tool Call Contract", "## PR37 Tool Call Contract");
  const callableSection = sectionBetween(
    pr36Section,
    "PR36 implements `tools/call` only for:",
    "PR36 keeps `tools/list`",
  );
  const documentedCallableTools = Array.from(new Set(callableSection.match(/norma\.[A-Za-z0-9]+/g) ?? []));

  assert.deepEqual(documentedCallableTools.sort(), ["norma.getVersion", "norma.serializeCanonicalJson"].sort());
  assertDocMentions(pr36Section, [
    "PR36 returns structured MCP tool results with exactly one text content item plus `structuredContent`",
    "The text content item is JSON and parses to the same value as `structuredContent`",
    "Unknown tool names return JSON-RPC `-32602`",
    "Malformed params return JSON-RPC `-32602`",
    "Unexpected internal failures return JSON-RPC `-32603`",
    "PR36 does not use MCP tool-result `isError: true` for input validation errors",
    "PR36 does not expose or implement",
    "norma.verifyRun",
    "norma.verifyArtifactFreshness",
    "norma.replayMvpDemo",
    "filesystem access",
    "network access",
    "shell execution",
    "environment reads",
    "PR36 does not implement resources",
    "remote MCP",
    "PR36 does not add dependencies",
    "package exports",
    "package `bin`",
    "PR36 keeps source-truth rules unchanged",
    "PR37 is the first candidate for `norma.verifyRun` and `norma.verifyArtifactFreshness`",
    "PR38 remains the future candidate for `norma.replayMvpDemo` only",
  ]);
});

test("PR37 MCP contract documents verification tool-call implementation and blocked boundaries", () => {
  const doc = readDoc(contractDocPath);
  const pr37Section = sectionBetween(doc, "## PR37 Tool Call Contract", "## Resources and Prompts Policy");
  const callableSection = sectionBetween(
    pr37Section,
    "PR37 implements `tools/call` only for:",
    "PR37 keeps `tools/list`",
  );
  const documentedCallableTools = Array.from(new Set(callableSection.match(/norma\.[A-Za-z0-9]+/g) ?? []));

  assert.deepEqual(documentedCallableTools.sort(), [...approvedCallableTools].sort());
  assertDocMentions(pr37Section, [
    "PR37 implements `tools/call` for `norma.verifyRun` and `norma.verifyArtifactFreshness` beyond PR36",
    "PR37 keeps `tools/list` at exactly four tools",
    "PR37 does not expose or implement `norma.replayMvpDemo`",
    "PR37 does not implement arbitrary replay",
    "PR37 does not implement resources",
    "PR37 does not implement remote MCP",
    "PR37 does not add dependencies",
    "package exports",
    "package `bin`",
    "filesystem access",
    "network access",
    "shell execution",
    "environment reads",
    "PR37 returns structured MCP tool results with exactly one text content item plus `structuredContent`",
    "PR37 preserves core verification outputs",
    "does not reduce to `valid`",
    "PR37 keeps source-truth rules unchanged",
    "PR38 remains the future candidate for `norma.replayMvpDemo` only",
  ]);
});

test("PR37 runtime implements tools/call only for approved callable tools", () => {
  for (const toolName of approvedCallableTools) {
    const argumentsValue = argumentsForTool(toolName);
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id: `${toolName}-callable`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: argumentsValue,
      },
    });

    assert.equal(response.result.structuredContent.tool, toolName);
    assert.equal(response.result.isError, false);
  }

  for (const toolName of ["norma.replayMvpDemo"]) {
    const response = parseRequiredResponse({
      jsonrpc: "2.0",
      id: `${toolName}-not-callable`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: {},
      },
    });

    assert.deepEqual(response, {
      jsonrpc: "2.0",
      id: `${toolName}-not-callable`,
      error: {
        code: -32602,
        message: `Unknown tool: ${toolName}`,
      },
    });
  }
});

function argumentsForTool(toolName) {
  if (toolName === "norma.getVersion") {
    return {};
  }

  if (toolName === "norma.serializeCanonicalJson") {
    return {
      value: {
        b: 2,
        a: 1,
      },
    };
  }

  return {
    input: null,
  };
}

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parseRequiredResponse(message) {
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.notEqual(response, null);
  return JSON.parse(response);
}

function parsePackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8"));
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

function assertDocMentions(doc, phrases) {
  for (const phrase of phrases) {
    assert.match(doc, new RegExp(escapeRegExp(phrase), "i"), `${phrase} should be documented`);
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

function sectionBetween(doc, startHeading, endHeading) {
  const start = doc.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = doc.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(end, -1, `${endHeading} should exist`);
  assert.ok(end > start, `${endHeading} should appear after ${startHeading}`);
  return doc.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
