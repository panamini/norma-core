import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const contractDocPath = join(repoRoot, "docs", "MCP_TOOL_CONTRACT.md");
const packageJsonPath = join(repoRoot, "package.json");

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

test("PR33 MCP contract confirms no MCP implementation files exist", () => {
  for (const path of [
    "src/mcp.ts",
    "src/mcp.js",
    "src/mcp/",
    "mcp/",
    "server/",
    "src/server/",
    "src/mcp-server.ts",
    "src/mcp-server.js",
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  assertNoMcpDependency(parsePackageJson());
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parsePackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8"));
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
