import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const approvedDocs = [
  "docs/onboarding/README.md",
  "docs/examples/read-only-result-viewer-workflow.md",
  "docs/examples/structured-json-input-viewer.md",
  "docs/examples/verification-replay-result-viewer.md",
];

const requiredVisibilityTerms = [
  "status",
  "diagnostics",
  "warnings",
  "errors",
  "mismatches",
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
  "unknown fields",
];

const requiredBoundaryTerms = [
  "current local inspection workflow",
  "current local-only inspection workflow",
  "inspection-only views",
  "package-private",
  "not public API",
  "displayability is not source-truth validation",
  "source truth",
  "blocked inputs",
  "non-goals",
];

const forbiddenDocSnippets = [
  "```bash",
  "```sh",
  "```shell",
  "```zsh",
  "node ",
  "npm ",
  "rtk ",
  "curl ",
  "readFile",
  "writeFile",
  "FileReader",
  "fetch(",
  "process.env",
  "localStorage",
  "document.",
  "window.",
  "child_process",
  "exec(",
  "spawn(",
  "runtime route",
  "runtime routes",
  "UI implementation",
  "API/MCP behavior",
  "package export",
  "package exports",
  "dependency",
  "dependencies",
  "deployment",
  "remote MCP",
  "public npm",
  "publish",
  "camera",
  "image",
  "vision",
  "CAD",
  "plugin",
  "marketplace",
  "beauty score",
  "creative recommendation",
  "intent inference",
  "prompt-as-source",
  "artifact-as-source",
  "source-truth inference",
  "arbitrary replay",
  "norma.replayRun",
  "/replay-run",
  "/replay-mvp-demo behavior changes",
];

const forbiddenExecutableFencePattern = /^```(?:js|javascript|ts|typescript)\s*$/im;

test("PR63 creates exactly the approved onboarding and examples docs", () => {
  assert.deepEqual(markdownFiles("docs/onboarding"), ["docs/onboarding/README.md"]);
  assert.deepEqual(markdownFiles("docs/examples"), [
    "docs/examples/local-guided-inspection-demo.md",
    "docs/examples/local-structured-analyze-demo-workflow.md",
    "docs/examples/local-visual-fixture-guided-inspection-demo.md",
    "docs/examples/ratio-pack-family-workflow.md",
    "docs/examples/read-only-result-viewer-workflow.md",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "docs/examples/structured-json-input-viewer.md",
    "docs/examples/verification-replay-result-viewer.md",
  ]);

  for (const approvedDoc of approvedDocs) {
    assert.ok(readDoc(approvedDoc).startsWith("# "), `${approvedDoc} should be markdown documentation`);
  }
});

test("PR63 docs keep the workflow local and package-private", () => {
  const allDocs = allApprovedDocs();
  const r19UpdatedDocs = [
    readDoc("docs/onboarding/README.md"),
    readDoc("docs/examples/read-only-result-viewer-workflow.md"),
  ].join("\n");

  for (const term of requiredBoundaryTerms) {
    assert.match(allDocs, new RegExp(escapeRegExp(term), "i"), `${term} should be documented`);
  }

  assert.doesNotMatch(r19UpdatedDocs, /inert documentation only/i);
  assert.doesNotMatch(r19UpdatedDocs, /\bhypothetical\b/i);
  assert.match(allDocs, /helpers? are package-private/i);
  assert.doesNotMatch(allDocs, /package-private helpers? (?:are|as) public API/i);
});

test("PR63 docs preserve required visibility terms", () => {
  const allDocs = allApprovedDocs();

  for (const term of requiredVisibilityTerms) {
    assert.match(allDocs, new RegExp(escapeRegExp(term), "i"), `${term} should remain visible`);
  }

  assert.match(allDocs, /must not collapse/i);
  assert.match(allDocs, /generic boolean/i);
});

test("PR63 docs contain no executable or forbidden surface claims", () => {
  for (const approvedDoc of approvedDocs) {
    const doc = readDoc(approvedDoc);
    assert.doesNotMatch(
      doc,
      forbiddenExecutableFencePattern,
      `${approvedDoc} must not contain executable JavaScript or TypeScript fences`,
    );
    for (const forbiddenSnippet of forbiddenDocSnippets) {
      assert.doesNotMatch(
        doc,
        new RegExp(escapeRegExp(forbiddenSnippet), "i"),
        `${approvedDoc} must not contain ${forbiddenSnippet}`,
      );
    }
  }
});

function allApprovedDocs() {
  return approvedDocs.map((approvedDoc) => readDoc(approvedDoc)).join("\n");
}

function markdownFiles(relativeDir) {
  return readdirSync(join(repoRoot, relativeDir))
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => `${relativeDir}/${entry}`)
    .sort();
}

function readDoc(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
