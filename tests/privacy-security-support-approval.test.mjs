import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const pr65DocPath = join("docs", "decisions", "2026-06-17-privacy-security-support-approval.md");

// fallow-ignore-next-line code-duplication
const expectedPr65ChangedFiles = [
  "docs/decisions/2026-06-17-privacy-security-support-approval.md",
  "tests/privacy-security-support-approval.test.mjs",
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

const allowedPostPr65ChangedFiles = [
  ...expectedPr65ChangedFiles,
  ...pr67ReadOnlyViewerModelPaths,
  ...pr68StaticViewerPaths,
  ...pr69ReadOnlyViewerFixturePaths,
  ...pr70ReadOnlyViewerDemoReadinessPaths,
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
  "# Privacy Security Support Approval",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## Current Verified State",
  "## Future Privacy Policy Boundary",
  "## Future Security Policy Boundary",
  "## Future Support Policy Boundary",
  "## Permitted Data Classification Boundary",
  "## Incident And Stop Process Boundary",
  "## Triage Ownership Boundary",
  "## Validation Gates",
  "## Rejected Claims And Activities",
  "## Runtime Package Deployment Boundary",
  "## Rollback And Stop Criteria",
  "## Validation Policy",
  "## Final Decision",
];

test("PR65 approval document exists and is approval-only", () => {
  assert.equal(existsSync(join(repoRoot, pr65DocPath)), true);
  assert.equal(basename(pr65DocPath), "2026-06-17-privacy-security-support-approval.md");

  const doc = readDoc(pr65DocPath);
  assertHeadingsInOrder(doc, requiredSections);
  assertDocMentions(doc, [
    "PR65 is docs/contract-tests only.",
    "PR65 is approval-only.",
    "PR65 does not implement privacy policy.",
    "PR65 does not implement security policy.",
    "PR65 does not implement support policy.",
    "PR65 approves only future privacy, security, and support policy documentation boundaries.",
    "Privacy/security/support implementation remains blocked.",
  ]);
});

test("PR65 anchors to PR64 blockers and treats existing security docs as constraints only", () => {
  const doc = readDoc(pr65DocPath);
  const sources = sectionBetween(doc, "## Source Documents", "## Current Verified State");
  const currentState = sectionBetween(doc, "## Current Verified State", "## Future Privacy Policy Boundary");

  assertDocMentions(sources, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-17-beta-pilot-readiness-approval.md",
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "docs/plans/2026-06-16-read-only-result-viewer-plan.md",
    "docs/decisions/2026-06-17-onboarding-examples-approval.md",
    "docs/onboarding/README.md",
    "docs/examples/read-only-result-viewer-workflow.md",
    "docs/MCP_REMOTE_THREAT_MODEL.md",
    "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
    "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
    "PR55-PR64",
  ]);
  assertDocMentions(currentState, [
    "PR64 is merged.",
    "PR64 merge commit: `1ef7023c283d1671df54dd9fad3f6bbc449116e7`.",
    "Existing remote-MCP/API security documents are constraint sources only.",
    "Existing remote-MCP/API security documents are not completed general security, privacy, or support policies.",
    "Current external official references for PR65: Unknown.",
    "No general privacy policy is approved.",
    "No general security policy is approved.",
    "No support policy is approved.",
  ]);
});

test("PR65 defines future privacy security support data incident and triage boundaries", () => {
  const doc = readDoc(pr65DocPath);

  assertDocMentions(sectionBetween(doc, "## Future Privacy Policy Boundary", "## Future Security Policy Boundary"), [
    "permitted and blocked data categories",
    "real user data remains blocked",
    "retention requirements",
    "deletion requirements",
    "no collection of real user data is approved",
  ]);
  assertDocMentions(sectionBetween(doc, "## Future Security Policy Boundary", "## Future Support Policy Boundary"), [
    "security review checklist",
    "vulnerability/security contact placeholder marked not implemented",
    "no live security contact is created",
    "no auth, logging, redaction, telemetry, retention, deployment, API, or remote MCP runtime is approved",
  ]);
  assertDocMentions(sectionBetween(doc, "## Future Support Policy Boundary", "## Permitted Data Classification Boundary"), [
    "support owner placeholder marked not implemented",
    "support response expectations placeholder marked not implemented",
    "no support channel is created",
    "no support response times are promised",
  ]);
  assertDocMentions(sectionBetween(doc, "## Permitted Data Classification Boundary", "## Incident And Stop Process Boundary"), [
    "synthetic examples",
    "inert existing Norma result envelopes",
    "public documentation snippets",
    "real user data remains blocked",
    "secrets, tokens, credentials, personal data, customer data, production data, and confidential source files remain blocked",
  ]);
  assertDocMentions(sectionBetween(doc, "## Incident And Stop Process Boundary", "## Triage Ownership Boundary"), [
    "incident and stop criteria placeholder marked not implemented",
    "source-truth boundary violations",
    "privacy concerns",
    "security concerns",
    "real user data collection begins without approval",
  ]);
  assertDocMentions(sectionBetween(doc, "## Triage Ownership Boundary", "## Validation Gates"), [
    "triage owner placeholder marked not implemented",
    "owner for response is not assigned by PR65",
    "future policy PR must name an owner before beta participant access",
  ]);
});

test("PR65 defines validation gates and rejected claims without approving implementation", () => {
  const doc = readDoc(pr65DocPath);

  assertDocMentions(sectionBetween(doc, "## Validation Gates", "## Rejected Claims And Activities"), [
    "approval document exists",
    "focused contract test",
    "full test suite",
    "changed-file scope check",
    "guardrail greps",
    "privacy/security/support policy implementation remains blocked",
  ]);
  assertDocMentions(sectionBetween(doc, "## Rejected Claims And Activities", "## Runtime Package Deployment Boundary"), [
    "privacy policy is complete",
    "security policy is complete",
    "support policy is complete",
    "security contact is live",
    "support response times are promised",
    "data retention is implemented",
    "users may upload real data",
    "user data collection is approved",
    "beta participant access is approved",
    "public beta is open",
    "deployment is approved",
    "remote MCP is approved",
    "public API is approved",
    "public npm is ready",
    "`norma.replayRun`",
    "`/replay-run`",
    "`/replay-mvp-demo` behavior changes",
    "camera/image/vision/CAD/plugin/marketplace",
    "beauty score",
    "creative recommendation",
    "intent inference",
  ]);
});

test("PR65 keeps runtime package API MCP UI docs examples and deployment surfaces blocked", () => {
  const doc = readDoc(pr65DocPath);
  const boundary = sectionBetween(doc, "## Runtime Package Deployment Boundary", "## Rollback And Stop Criteria");

  assertDocMentions(boundary, [
    "No `src/**` changes are approved.",
    "No `src/index.ts` change is approved.",
    "No package metadata, lockfile, export, dependency, or script change is approved.",
    "No UI/app/viewer/server/http/route path is approved.",
    "No API/MCP runtime behavior is approved.",
    "No deployment configuration is approved.",
    "No remote MCP behavior is approved.",
    "No `docs/MCP_REMOTE_*.md` change is approved.",
    "No `docs/onboarding/**` change is approved.",
    "No `docs/examples/**` change is approved.",
    "`norma.replayRun` remains blocked.",
    "`/replay-run` remains blocked.",
    "`/replay-mvp-demo` behavior remains unchanged.",
  ]);

  assertPathsAbsent(forbiddenSurfacePaths);
});

test("PR65 guard permits only approval-doc/test changes and blocks protected surfaces", () => {
  const changed = branchChangedFiles();
  const approvedChangedFiles = approvedChangedFilesFor(changed);
  const protectedFileAllowlist = exactApprovedChangedFiles(changed) ?? [];

  const unexpectedNonApprovalFiles = changed.filter(
    (file) => !isAllowedApprovalScopeFile(file, approvedChangedFiles),
  );

  const unexpectedProtectedFiles = changed.filter(
    (file) => isProtectedChange(file) && !protectedFileAllowlist.includes(file),
  );

  assert.deepEqual(unexpectedNonApprovalFiles, []);
  assert.deepEqual(unexpectedProtectedFiles, []);
  assert.deepEqual(changed.filter((file) => /^docs\/MCP_REMOTE_.*\.md$/.test(file)), []);
});

test("PR101 replay exact-set guard rejects unrelated MCP package and CI changes", () => {
  for (const unexpectedFile of ["src/mcp/unrelated.ts", "package.json", ".github/workflows/ci.yml"]) {
    assert.equal(exactApprovedChangedFiles([...pr101ReplayChangedFiles, unexpectedFile].sort()), null);
  }
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

function approvedChangedFilesFor(changed) {
  return exactApprovedChangedFiles(changed) ?? allowedPostPr65ChangedFiles;
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

function isAllowedApprovalScopeFile(file, approvedChangedFiles) {
  return (
    approvedChangedFiles.includes(file) ||
    /^docs\/decisions\/\d{4}-\d{2}-\d{2}-.*\.md$/.test(file) ||
    /^tests\/[^/]*-approval\.test\.mjs$/.test(file)
  );
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function isProtectedChange(file) {
  const pr67Allowed = pr67ReadOnlyViewerModelPaths.includes(file);
  return isPrivacyProtectedPath(file) && !pr67Allowed;
}

function isPrivacyProtectedPath(file) {
  return protectedExactPaths.includes(file) || protectedPrefixes.some((prefix) => file.startsWith(prefix));
}

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
