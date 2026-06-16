import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath as pathFromFileUrl } from "node:url";

const root = path.resolve(path.dirname(pathFromFileUrl(import.meta.url)), "..");
const docPath = path.join(
  root,
  "docs",
  "decisions",
  "2026-06-16-structured-json-input-viewer-prototype-approval.md",
);
const doc = fs.readFileSync(docPath, "utf8");

test("PR57 approval document exists and is approval-only", () => {
  assert.equal(path.basename(docPath), "2026-06-16-structured-json-input-viewer-prototype-approval.md");
  assertInOrder(doc, [
    "# Structured JSON Input Viewer Prototype Approval",
    "## Status",
    "## Decision",
    "## Source Documents",
    "## Current Verified State",
    "## Approved Future Prototype Boundary",
    "## Approved Input Shapes",
    "## JSON Input Limits",
    "## MCP And JSON-RPC Boundary",
    "## Required Displayed Sections",
    "## Rejected Inputs And Behaviors",
    "## Runtime Package Deployment Boundary",
    "## Rollback Policy",
    "## Validation Policy",
    "## Final Decision",
  ]);
  assertMentions(doc, [
    "PR57 is docs/contract-tests only.",
    "PR57 is approval-only.",
    "PR57 does not implement the structured JSON input viewer prototype.",
    "implementation remains blocked until this approval lands",
    "PR57 is re-scoped to approval-only",
    "Future numbering after this approval is Unknown until current GitHub history assigns it.",
    "PR57 does not start PR58.",
  ]);
});

test("PR57 approves only the narrow future source and test locations", () => {
  const boundary = section("## Approved Future Prototype Boundary", "## Approved Input Shapes");
  assertMentions(boundary, [
    "`src/structured-json-input-viewer.ts`",
    "`tests/structured-json-input-viewer.test.mjs`",
    "pure display-model/parser helper",
    "dependency-free",
    "non-exported",
    "package-private",
    "must not add or require a package export",
    "must not add or require a package script",
    "must not add or require package metadata changes",
    "must not use DOM APIs",
    "must not use browser APIs",
    "must not read files",
    "must not write files",
    "must not fetch URLs",
    "must not use network behavior",
    "must not use shell execution",
    "must not read environment variables",
    "must not add routes",
    "must not add a listener",
    "must not add remote MCP behavior",
    "must not execute Norma operations",
    "must not mutate source data",
    "must not create source truth",
  ]);
});

test("PR57 adopts PR53 JSON limits and exact MCP JSON-RPC boundary", () => {
  assertMentions(section("## JSON Input Limits", "## MCP And JSON-RPC Boundary"), [
    "max body bytes: `65_536`",
    "max JSON depth: `32`",
    "max array length: `1_024`",
    "max string length: `16_384`",
    "must not create a new unbounded parser path",
  ]);
  assertMentions(section("## MCP And JSON-RPC Boundary", "## Required Displayed Sections"), [
    "may accept only exact inert Norma MCP tool result envelopes",
    "must reject JSON-RPC requests",
    "must reject JSON-RPC notifications",
    "must reject arbitrary method wrappers",
    "must reject arbitrary tool calls",
    "must reject generic JSON-RPC envelopes",
    "no method or call execution path is implied",
  ]);
});

test("PR57 preserves required result visibility including unknown fields", () => {
  assertMentions(section("## Required Displayed Sections", "## Rejected Inputs And Behaviors"), [
    "status",
    "diagnostics",
    "warnings",
    "errors",
    "mismatch details",
    "provenance",
    "source refs",
    "output refs",
    "artifact freshness",
    "operation context",
    "pack locks",
    "tolerance policy",
    "serialization version",
    "operation version",
    "result identity",
    "unknown result fields",
    "Unknown result fields must remain inspectable.",
    "Unknown result fields must not be discarded.",
    "Unknown result fields must not be hidden.",
    "must not replace required sections with a single pass/fail summary",
    "Critical warnings and critical errors must remain visible.",
  ]);
});

test("PR57 keeps forbidden inputs and runtime surfaces blocked", () => {
  assertMentions(section("## Rejected Inputs And Behaviors", "## Runtime Package Deployment Boundary"), [
    "prompt-as-source",
    "artifact-as-source",
    "source-truth inference",
    "arbitrary replay",
    "`norma.replayRun`",
    "`/replay-run`",
    "caller-supplied replay inputs for `/replay-mvp-demo`",
    "camera input",
    "image input",
    "vision input",
    "native CAD input",
    "plugin input",
    "marketplace input",
    "URL fetch",
    "arbitrary local file reads",
    "must not change `/replay-mvp-demo` behavior",
  ]);
  assertMentions(section("## Runtime Package Deployment Boundary", "## Rollback Policy"), [
    "PR57 must add no implementation files.",
    "PR57 must add no UI files.",
    "PR57 must add no route files.",
    "PR57 must add no package metadata changes.",
    "PR57 must add no package script changes.",
    "PR57 must add no dependency changes.",
    "PR57 must add no lockfile changes.",
    "PR57 must add no package export changes.",
    "PR57 must not modify root `docs/MCP_REMOTE_*.md` files.",
  ]);
});

const approvedFutureImplementationPaths = [
  "src/structured-json-input-viewer.ts",
  "tests/structured-json-input-viewer.test.mjs",
];

const approvedPr58ChangedPaths = [
  ...approvedFutureImplementationPaths,
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
];

const forbiddenSurfacePaths = [
  "src/ui",
  "src/viewer",
  "src/app",
  "src/server",
  "src/routes",
  "src/http",
  "bin/norma-core-api.mjs",
  "bin/norma-core-server.mjs",
  "Dockerfile",
  "docker-compose.yml",
  "vercel.json",
  "wrangler.toml",
];

const requiredMcpRemoteDocs = [
  "MCP_REMOTE_APPROVAL_DECISION.md",
  "MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
  "MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "MCP_REMOTE_THREAT_MODEL.md",
  "MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
];

test("PR57 keeps package metadata scripts dependencies and exports unchanged", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

  assert.equal(Object.hasOwn(pkg, "dependencies"), false);
  assert.equal(Object.hasOwn(pkg, "bin"), false);
  assert.deepEqual(Object.keys(pkg.exports ?? {}).sort(), ["."]);
  assert.deepEqual(Object.keys(pkg.scripts ?? {}).sort(), ["build", "check", "pretest", "test"]);
  assert.equal(indexSource.includes("structured-json-input-viewer"), false);
  assert.equal(indexSource.includes("parseStructuredJsonInput"), false);
});

test("PR57 allows only the approved PR58 prototype files after implementation", () => {
  assert.deepEqual(
    approvedFutureImplementationPaths.filter((relativePath) => fs.existsSync(path.join(root, relativePath))),
    approvedFutureImplementationPaths,
  );
  assert.deepEqual(
    branchChangedFiles().filter((relativePath) => !approvedPr58ChangedPaths.includes(relativePath)),
    [],
  );
});

test("PR57 keeps implementation UI server route and deployment files absent", () => {
  assert.deepEqual(
    forbiddenSurfacePaths.filter((relativePath) => fs.existsSync(path.join(root, relativePath))),
    [],
  );
});

test("PR57 keeps required root MCP remote decision docs present", () => {
  const mcpRemoteDocs = new Set(
    fs.readdirSync(path.join(root, "docs")).filter((name) => /^MCP_REMOTE_.*\.md$/.test(name)),
  );
  for (const requiredDoc of requiredMcpRemoteDocs) {
    assert.equal(mcpRemoteDocs.has(requiredDoc), true, `${requiredDoc} must exist`);
  }
});

/**
 * Returns the decision document slice between two required headings.
 */
function section(start, end) {
  const startIndex = doc.indexOf(start);
  const endIndex = doc.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} should exist`);
  assert.notEqual(endIndex, -1, `${end} should exist`);
  return doc.slice(startIndex, endIndex);
}

/**
 * Verifies that required decision headings or clauses appear in a stable order.
 */
function assertInOrder(value, snippets) {
  let previousIndex = -1;
  for (const snippet of snippets) {
    const index = value.indexOf(snippet);
    assert.ok(index > previousIndex, `${snippet} should appear after the previous snippet`);
    previousIndex = index;
  }
}

/**
 * Verifies that every required decision phrase is present in the scoped text.
 */
function assertMentions(value, snippets) {
  for (const snippet of snippets) {
    assert.match(value, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

function branchChangedFiles() {
  return [
    ...gitFiles(["diff", "--name-only", "main...HEAD"]),
    ...gitFiles(["diff", "--name-only"]),
    ...gitFiles(["diff", "--cached", "--name-only"]),
    ...gitFiles(["ls-files", "--others", "--exclude-standard"]),
  ].filter((file, index, files) => files.indexOf(file) === index);
}

function gitFiles(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Escapes a literal phrase before compiling it as a regular expression.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
