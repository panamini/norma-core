import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const pr64DocPath = join("docs", "decisions", "2026-06-17-beta-pilot-readiness-approval.md");

const expectedPr64ChangedFiles = [
  "docs/decisions/2026-06-17-beta-pilot-readiness-approval.md",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
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

const protectedExactPaths = [
  "package.json",
  "package-lock.json",
  "src/index.ts",
  "tsconfig.json",
  "README.md",
];

const protectedPrefixes = [
  "src/",
  "bin/",
  "examples/",
  "dist/",
  "docs/onboarding/",
  "docs/examples/",
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

const requiredSections = [
  "# Beta Pilot Readiness Approval",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Current Verified State",
  "## Supported Beta Pilot Workflow",
  "## Prerequisites Before Any Beta",
  "## Allowed Pilot Artifacts",
  "## Blocked Pilot Activities",
  "## Support Expectations",
  "## Known Limitations",
  "## Validation Gates",
  "## Rollback And Stop Criteria",
  "## Runtime Package Deployment Boundary",
  "## Validation Policy",
  "## Final Decision",
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

const allowedPostPr64ChangedFiles = [
  ...expectedPr64ChangedFiles,
  ...pr67ReadOnlyViewerModelPaths,
  ...pr68StaticViewerPaths,
  ...pr69ReadOnlyViewerFixturePaths,
  ...pr70ReadOnlyViewerDemoReadinessPaths,
];

test("PR64 approval document exists and is approval-only", () => {
  assert.equal(existsSync(join(repoRoot, pr64DocPath)), true);
  assert.equal(basename(pr64DocPath), "2026-06-17-beta-pilot-readiness-approval.md");

  const doc = readDoc(pr64DocPath);
  assertHeadingsInOrder(doc, requiredSections);
  assertDocMentions(doc, [
    "PR64 is docs/contract-tests only.",
    "PR64 is approval-only.",
    "PR64 does not implement beta pilot behavior.",
    "PR64 does not launch a beta pilot.",
    "PR64 does not approve public beta access.",
    "PR64 approves only a future beta pilot readiness boundary.",
  ]);
});

test("PR64 anchors beta readiness to the current inert read-only workflow", () => {
  const doc = readDoc(pr64DocPath);
  assertDocMentions(sectionBetween(doc, "## Source Documents", "## Current Verified State"), [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-17-onboarding-examples-approval.md",
    "docs/onboarding/README.md",
    "docs/examples/read-only-result-viewer-workflow.md",
    "docs/examples/structured-json-input-viewer.md",
    "docs/examples/verification-replay-result-viewer.md",
    "PR55-PR63",
  ]);
  assertDocMentions(sectionBetween(doc, "## Supported Beta Pilot Workflow", "## Prerequisites Before Any Beta"), [
    "existing Norma result envelopes",
    "read-only/result-viewer workflow",
    "inert documentation",
    "package-private helpers are not public API",
    "displayability is not source-truth validation",
  ]);
});

test("PR64 defines beta prerequisites and allowed artifacts without launching beta", () => {
  const doc = readDoc(pr64DocPath);
  assertDocMentions(sectionBetween(doc, "## Prerequisites Before Any Beta", "## Allowed Pilot Artifacts"), [
    "support policy",
    "privacy policy",
    "security policy",
    "pricing/package/public npm decision",
    "launch checklist",
    "explicit later approval",
    "validation gates",
  ]);
  assertDocMentions(sectionBetween(doc, "## Allowed Pilot Artifacts", "## Blocked Pilot Activities"), [
    "checklist-style readiness criteria",
    "inert descriptions",
    "validation evidence",
    "known limitations",
    "rollback",
    "stop criteria",
  ]);
});

test("PR64 keeps blocked beta activities explicit", () => {
  const doc = readDoc(pr64DocPath);
  assertDocMentions(sectionBetween(doc, "## Blocked Pilot Activities", "## Support Expectations"), [
    "beta is launched",
    "public beta is open",
    "user recruitment",
    "users may upload real data",
    "public npm is ready",
    "deployment is approved",
    "remote MCP is approved",
    "API is public",
    "UI is implemented",
    "support/privacy/security policy is complete",
    "pricing/package decision is complete",
    "source truth can be inferred",
    "artifacts can be source truth",
    "prompt text can be source truth",
    "arbitrary replay is allowed",
    "`norma.replayRun`",
    "`/replay-run`",
    "`/replay-mvp-demo` behavior changes",
    "camera/image/vision/CAD/plugin/marketplace",
    "beauty score",
    "creative recommendation",
    "intent inference",
  ]);
});

test("PR64 requires support expectations, limitations, validation gates, and stop criteria", () => {
  const doc = readDoc(pr64DocPath);
  assertDocMentions(sectionBetween(doc, "## Support Expectations", "## Known Limitations"), [
    "not implemented",
    "documented owner",
    "response path",
    "triage",
  ]);
  assertDocMentions(sectionBetween(doc, "## Known Limitations", "## Validation Gates"), [
    "no source-truth inference",
    "no public launch",
    "no public npm publishing",
    "no deployment",
    "no remote MCP",
    "no runtime/API/UI expansion",
    "no collection of real user data",
  ]);
  assertDocMentions(sectionBetween(doc, "## Validation Gates", "## Rollback And Stop Criteria"), [
    "build",
    "focused contract test",
    "full test suite",
    "check",
    "guardrail greps",
  ]);
  assertDocMentions(sectionBetween(doc, "## Rollback And Stop Criteria", "## Runtime Package Deployment Boundary"), [
    "revert this PR64 approval document",
    "revert the PR64 contract test",
    "stop",
    "source-truth boundary",
    "forbidden surface",
  ]);
});

test("PR64 keeps runtime package API MCP UI and deployment surfaces blocked", () => {
  const doc = readDoc(pr64DocPath);
  const boundary = sectionBetween(doc, "## Runtime Package Deployment Boundary", "## Validation Policy");

  assertDocMentions(boundary, [
    "No `src/**` changes are approved.",
    "No `src/index.ts` change is approved.",
    "No package metadata, lockfile, export, dependency, or script change is approved.",
    "No UI/app/viewer/server/http/route path is approved.",
    "No API/MCP runtime behavior is approved.",
    "No deployment configuration is approved.",
    "No remote MCP behavior is approved.",
    "No `docs/MCP_REMOTE_*.md` change is approved.",
    "`norma.replayRun` remains blocked.",
    "`/replay-run` remains blocked.",
    "`/replay-mvp-demo` behavior remains unchanged.",
  ]);

  assertPathsAbsent(forbiddenSurfacePaths);
});

test("PR64 changed-file scope remains approval-only when branch changes exist", () => {
  const changed = branchChangedFiles();
  if (isExactPr71ApprovedChangeSet(changed)) {
    return;
  }

  const unexpectedNonApprovalFiles = changed.filter(
    (file) =>
      !allowedPostPr64ChangedFiles.includes(file) &&
      !/^docs\/decisions\/\d{4}-\d{2}-\d{2}-.*\.md$/.test(file) &&
      !/^tests\/[^/]*-approval\.test\.mjs$/.test(file),
  );

  if (changed.includes(pr64DocPath)) {
    for (const expectedFile of expectedPr64ChangedFiles) {
      assert.equal(changed.includes(expectedFile), true, `${expectedFile} should be included in PR64`);
    }
  }

  assert.deepEqual(unexpectedNonApprovalFiles, []);
  assert.deepEqual(changed.filter(isProtectedChange), []);
  assert.deepEqual(changed.filter((file) => /^docs\/MCP_REMOTE_.*\.md$/.test(file)), []);
});

function readDoc(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

// fallow-ignore-next-line code-duplication
function branchChangedFiles() {
  const probes = [
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
    const output = execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split("\n").filter(Boolean).sort();
  } catch {
    return null;
  }
}

function isExactPr71ApprovedChangeSet(changed) {
  if (changed.length !== pr71ApprovedChangedFiles.length) {
    return false;
  }
  for (const approvedFile of pr71ApprovedChangedFiles) {
    if (!changed.includes(approvedFile)) {
      return false;
    }
  }
  return true;
}

function isProtectedChange(file) {
  return !pr67ReadOnlyViewerModelPaths.includes(file) && isProtectedPath(file);
}

function isProtectedPath(file) {
  return protectedExactPaths.includes(file) || protectedPrefixes.some((prefix) => file.startsWith(prefix));
}

// fallow-ignore-next-line code-duplication
function assertPathsAbsent(paths) {
  for (const path of paths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
