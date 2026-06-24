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
  "2026-06-17-verification-replay-result-viewer-prototype-approval.md",
);
const doc = fs.readFileSync(docPath, "utf8");

const approvedPr60ChangedPaths = [
  "docs/decisions/2026-06-17-verification-replay-result-viewer-prototype-approval.md",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const futureImplementationPaths = [
  "src/verification-replay-result-viewer.ts",
  "tests/verification-replay-result-viewer.test.mjs",
];

const pr62ApprovalBoundaryPaths = [
  "docs/decisions/2026-06-17-onboarding-examples-approval.md",
  "tests/onboarding-examples-approval.test.mjs",
];

// fallow-ignore-next-line code-duplication
const pr63DocumentationPaths = [
  "docs/onboarding/README.md",
  "docs/examples/read-only-result-viewer-workflow.md",
  "docs/examples/structured-json-input-viewer.md",
  "docs/examples/verification-replay-result-viewer.md",
  "tests/onboarding-examples-docs.test.mjs",
];

const pr67ReadOnlyViewerModelPaths = [
  "src/local-viewer/read-only-viewer-model.ts",
  "tests/read-only-viewer-model.test.mjs",
];

const pr68StaticViewerPaths = [
  "viewer/read-only-result-viewer.html",
  "viewer/read-only-result-viewer.js",
  "viewer/read-only-result-viewer.css",
  "tests/read-only-viewer-static.test.mjs",
];

const pr69ReadOnlyViewerFixturePaths = [
  "tests/fixtures/viewer/run-verification.json",
  "tests/fixtures/viewer/run-replay-mismatch.json",
  "tests/fixtures/viewer/artifact-freshness-stale.json",
  "tests/fixtures/viewer/unsupported-prompt-input.json",
  "tests/read-only-viewer-fixtures.test.mjs",
];

const pr70ReadOnlyViewerDemoReadinessPaths = [
  "tests/read-only-viewer-demo-readiness.test.mjs",
];

const pr71ApprovedChangedFiles = [
  "src/index.ts",
  "src/measurements.ts",
  "tests/core-skeleton.test.mjs",
  "tests/measurements.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
];

const pr72ApprovedChangedFiles = [
  "bin/norma-core-mcp-stdio.mjs",
  "src/mcp/stdio-protocol.ts",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/mcp-stdio-server-skeleton.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr73ApprovedChangedFiles = [
  ".github/workflows/ci.yml",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr74ApprovedChangedFiles = [
  "README.md",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr75ApprovedChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-19-post-mvp-product-vision-and-adapter-architecture.md",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr79ApprovedChangedFiles = [
  "src/geometry-observation.ts",
  "src/node-crypto.d.ts",
  "tests/fixtures/geometry-observation/valid-accepted-geometry-v1.json",
  "tests/fixtures/geometry-observation/valid-observation-v1.json",
  "tests/geometry-observation-validator.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr101ReplayChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-stdio-server-skeleton.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const allowedPostPr60ChangedPaths = [
  ...approvedPr60ChangedPaths,
  ...futureImplementationPaths,
  ...pr62ApprovalBoundaryPaths,
  ...pr63DocumentationPaths,
  ...pr67ReadOnlyViewerModelPaths,
  ...pr68StaticViewerPaths,
  ...pr69ReadOnlyViewerFixturePaths,
  ...pr70ReadOnlyViewerDemoReadinessPaths,
];

const forbiddenSurfacePaths = [
  "package.json",
  "package-lock.json",
  "src/index.ts",
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

test("PR60 approval document exists and is approval-only", () => {
  assert.equal(path.basename(docPath), "2026-06-17-verification-replay-result-viewer-prototype-approval.md");
  assertInOrder(doc, [
    "# Verification Replay Result Viewer Prototype Approval",
    "## Status",
    "## Decision",
    "## Source Documents",
    "## Current Verified State",
    "## Approved Future Prototype Boundary",
    "## Approved Future Inputs",
    "## Rejected Future Inputs And Behaviors",
    "## Required Future Visibility",
    "## Runtime Package Deployment Boundary",
    "## Rollback Policy",
    "## Validation Policy",
    "## Final Decision",
  ]);
  assertMentions(doc, [
    "PR60 is docs/contract-tests only.",
    "PR60 is approval-only.",
    "PR60 does not implement the verification/replay result viewer prototype.",
    "A future verification/replay result viewer prototype remains blocked until this approval lands.",
    "PR60 approves only a future package-private, dependency-free, inert display-model helper.",
    "UI paths remain unapproved.",
    "Browser/DOM UI remains unapproved.",
    "Package exports remain unapproved.",
    "Runtime/API/MCP/deployment changes remain unapproved.",
  ]);
});

test("PR60 approves exact future package-private helper file scope only", () => {
  assertMentions(section("## Approved Future Prototype Boundary", "## Approved Future Inputs"), [
    "`src/verification-replay-result-viewer.ts`",
    "`tests/verification-replay-result-viewer.test.mjs`",
    "package-private",
    "dependency-free",
    "no package export",
    "no package script",
    "no package metadata change",
    "no runtime route",
    "no HTTP/server/listener behavior",
    "no DOM/browser APIs",
    "no file reads/writes",
    "no network behavior",
    "no shell/env access",
    "no remote MCP behavior",
    "no Norma operation execution",
    "no source-truth creation",
    "inert display-model code only",
  ]);
  for (const relativePath of futureImplementationPaths) {
    const absolutePath = path.join(root, relativePath);
    if (fs.existsSync(absolutePath)) {
      assert.equal(fs.statSync(absolutePath).isFile(), true, `${relativePath} must be a file`);
    }
  }
});

test("PR60 records accepted and rejected future inputs", () => {
  assertMentions(section("## Approved Future Inputs", "## Rejected Future Inputs And Behaviors"), [
    "existing inert structured JSON display models",
    "run-verification",
    "run-replay",
    "artifact-freshness-verification",
    "mvp-demo-result",
    "approved MCP/API/CLI envelopes carrying those results",
  ]);
  assertMentions(section("## Rejected Future Inputs And Behaviors", "## Required Future Visibility"), [
    "prompt-as-source",
    "artifact-as-source",
    "source-truth inference",
    "arbitrary replay",
    "`norma.replayRun`",
    "`/replay-run`",
    "caller-supplied replay inputs for `/replay-mvp-demo`",
    "camera/image/vision/CAD/plugin/marketplace",
    "URL fetch",
    "arbitrary local file reads",
    "runtime execution requests",
  ]);
});

test("PR60 preserves mandatory future result visibility", () => {
  assertMentions(section("## Required Future Visibility", "## Runtime Package Deployment Boundary"), [
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
    "must not be hidden",
    "must not be collapsed to a generic boolean",
  ]);
});

test("PR60 permits only approval files or approved future prototype files after merge", () => {
  const changed = branchChangedFiles();
  const approvedChangedPaths = approvedChangedPathsFor(changed);
  const forbiddenAllowlist = exactApprovedChangedFiles(changed) ?? [];

  const unexpectedNonApprovalFiles = changed.filter(
    (relativePath) => !isAllowedApprovalScopePath(relativePath, approvedChangedPaths),
  );

  assert.deepEqual(unexpectedNonApprovalFiles, []);
  assert.deepEqual(
    changed.filter((relativePath) => isUnexpectedForbiddenChange(relativePath, forbiddenAllowlist)),
    [],
  );
  assert.deepEqual(
    forbiddenSurfacePaths
      .filter((relativePath) => !["package.json", "package-lock.json", "src/index.ts"].includes(relativePath))
      .filter((relativePath) => fs.existsSync(path.join(root, relativePath))),
    [],
  );
});

test("PR101 replay exact-set guard rejects unrelated MCP package and CI changes", () => {
  for (const unexpectedFile of ["src/mcp/unrelated.ts", "package.json", ".github/workflows/ci.yml"]) {
    assert.equal(exactApprovedChangedFiles([...pr101ReplayChangedFiles, unexpectedFile].sort()), null);
  }
});

test("PR60 keeps package root export and MCP remote docs unchanged", () => {
  const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
  const changed = branchChangedFiles();
  const isPr71ApprovedChangeSet = isExactPr71ApprovedChangeSet(changed);
  const mcpRemoteChanges = changed.filter((relativePath) => /^docs\/MCP_REMOTE_.*\.md$/.test(relativePath));

  assert.equal(changed.includes("package.json"), false);
  assert.equal(changed.includes("package-lock.json"), false);
  assert.deepEqual(
    changed.filter((relativePath) => (
      relativePath === "src/index.ts" &&
      !isPr71ApprovedChangeSet
    )),
    [],
  );
  assert.equal(indexSource.includes("verification-replay-result-viewer"), false);
  assert.deepEqual(mcpRemoteChanges, []);
});

function section(start, end) {
  const startIndex = doc.indexOf(start);
  const endIndex = doc.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} should exist`);
  assert.notEqual(endIndex, -1, `${end} should exist`);
  return doc.slice(startIndex, endIndex);
}

function assertInOrder(value, snippets) {
  let previousIndex = -1;
  for (const snippet of snippets) {
    const index = value.indexOf(snippet);
    assert.ok(index > previousIndex, `${snippet} should appear after the previous snippet`);
    previousIndex = index;
  }
}

function assertMentions(value, snippets) {
  for (const snippet of snippets) {
    assert.match(value, new RegExp(escapeRegExp(snippet), "i"), `${snippet} should be documented`);
  }
}

// fallow-ignore-next-line code-duplication
function branchChangedFiles() {
  const probes = [
    // fallow-ignore-next-line code-duplication
    gitFiles(["diff", "--name-only", "main...HEAD"]),
    gitFiles(["diff", "--name-only", "origin/main...HEAD"]),
    gitFiles(["diff", "--name-only"]),
    gitFiles(["diff", "--cached", "--name-only"]),
    gitFiles(["ls-files", "--others", "--exclude-standard"]),
  ];
  const successful = probes.filter((files) => files !== null);
  assert.notEqual(successful.length, 0, "Unable to inspect changed files with git");
  return successful
    .flat()
    .filter((file, index, files) => files.indexOf(file) === index)
    .sort();
}

function gitFiles(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return null;
  }
}

function isExactPr71ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr71ApprovedChangedFiles);
}

function isExactPr72ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr72ApprovedChangedFiles);
}

function isExactPr73ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr73ApprovedChangedFiles);
}

function isExactPr74ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr74ApprovedChangedFiles);
}

function isExactPr75ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr75ApprovedChangedFiles);
}

function isExactPr79ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr79ApprovedChangedFiles);
}

function isExactPr101ReplayChangeSet(changed) {
  return isExactChangedFileSet(changed, pr101ReplayChangedFiles);
}

function approvedChangedPathsFor(changed) {
  return exactApprovedChangedFiles(changed) ?? allowedPostPr60ChangedPaths;
}

function exactApprovedChangedFiles(changed) {
  if (isExactPr71ApprovedChangeSet(changed)) {
    return pr71ApprovedChangedFiles;
  }
  if (isExactPr72ApprovedChangeSet(changed)) {
    return pr72ApprovedChangedFiles;
  }
  if (isExactPr73ApprovedChangeSet(changed)) {
    return pr73ApprovedChangedFiles;
  }
  if (isExactPr74ApprovedChangeSet(changed)) {
    return pr74ApprovedChangedFiles;
  }
  if (isExactPr75ApprovedChangeSet(changed)) {
    return pr75ApprovedChangedFiles;
  }
  if (isExactPr79ApprovedChangeSet(changed)) {
    return pr79ApprovedChangedFiles;
  }
  if (isExactPr101ReplayChangeSet(changed)) {
    return pr101ReplayChangedFiles;
  }
  return null;
}

function isAllowedApprovalScopePath(relativePath, approvedChangedPaths) {
  return (
    approvedChangedPaths.includes(relativePath) ||
    /^docs\/decisions\/\d{4}-\d{2}-\d{2}-.*\.md$/.test(relativePath) ||
    /^tests\/[^/]*-approval\.test\.mjs$/.test(relativePath)
  );
}

function isUnexpectedForbiddenChange(relativePath, forbiddenAllowlist) {
  return isForbiddenChange(relativePath) && !forbiddenAllowlist.includes(relativePath);
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function isForbiddenChange(file) {
  return forbiddenSurfacePaths.some((forbiddenPath) => file === forbiddenPath || file.startsWith(`${forbiddenPath}/`));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
