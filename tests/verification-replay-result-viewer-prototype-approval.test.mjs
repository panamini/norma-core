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

const pr71GeometrySourceIdentityPaths = [
  "src/index.ts",
  "src/measurements.ts",
  "tests/core-skeleton.test.mjs",
  "tests/measurements.test.mjs",
];

const pr71GuardMaintenancePaths = [
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
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
  const pr71ChangeSet = isPr71GeometrySourceIdentityChangeSet(changed);
  const allowedChangedPaths = pr71ChangeSet
    ? [...allowedPostPr60ChangedPaths, ...pr71GeometrySourceIdentityPaths, ...pr71GuardMaintenancePaths]
    : allowedPostPr60ChangedPaths;
  const unexpectedNonApprovalFiles = changed.filter(
    (relativePath) =>
      !allowedChangedPaths.includes(relativePath) &&
      !/^docs\/decisions\/\d{4}-\d{2}-\d{2}-.*\.md$/.test(relativePath) &&
      !/^tests\/[^/]*-approval\.test\.mjs$/.test(relativePath),
  );

  assert.deepEqual(unexpectedNonApprovalFiles, []);
  assert.deepEqual(changed.filter((relativePath) => isForbiddenChange(relativePath, pr71ChangeSet)), []);
  assert.deepEqual(
    forbiddenSurfacePaths
      .filter((relativePath) => !["package.json", "package-lock.json", "src/index.ts"].includes(relativePath))
      .filter((relativePath) => fs.existsSync(path.join(root, relativePath))),
    [],
  );
});

test("PR60 keeps package root export and MCP remote docs unchanged", () => {
  const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
  const changed = branchChangedFiles();
  const pr71ChangeSet = isPr71GeometrySourceIdentityChangeSet(changed);
  const mcpRemoteChanges = changed.filter((relativePath) => /^docs\/MCP_REMOTE_.*\.md$/.test(relativePath));

  assert.equal(changed.includes("package.json"), false);
  assert.equal(changed.includes("package-lock.json"), false);
  assert.deepEqual(
    changed.filter((relativePath) => (
      relativePath === "src/index.ts" &&
      !(pr71ChangeSet && pr71GeometrySourceIdentityPaths.includes(relativePath))
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

function isPr71GeometrySourceIdentityChangeSet(files) {
  return pr71GeometrySourceIdentityPaths.every((file) => files.includes(file));
}

function isForbiddenChange(file, allowPr71GeometrySourceIdentity = false) {
  if (allowPr71GeometrySourceIdentity && pr71GeometrySourceIdentityPaths.includes(file)) {
    return false;
  }

  return forbiddenSurfacePaths.some((forbiddenPath) => file === forbiddenPath || file.startsWith(`${forbiddenPath}/`));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
