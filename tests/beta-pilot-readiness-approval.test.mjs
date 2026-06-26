import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  branchChangedFilesExcludingSemgrepMaintenance,
  isExactChangedFileSet,
  isExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet,
  r1GeometrySourceIdentityChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

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

const r4CurrentOperationsRunbookChangedFiles = [
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r5PostMvpAdapterArchitectureChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-24-post-mvp-adapter-architecture.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6aStructuredAnalyzeContractChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-tool-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6a1StructuredAnalyzeExecutableContractChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6bStructuredAnalyzeImplementationChangedFiles = [
  "src/index.ts",
  "src/structured-composition-analysis.ts",
  "tests/package-consumption.test.mjs",
  "tests/structured-composition-analysis.test.mjs",
];

const r6bStructuredAnalyzeGuardMaintenanceChangedFiles = [
  ...r6bStructuredAnalyzeImplementationChangedFiles,
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
].sort();

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

const r2aOutputSchemaChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/mcp-verify-tools-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r2bOutputSchemaChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-replay-mvp-demo-contract.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/mcp-verify-tools-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r3NonCanonicalStructuredInputChangedFiles = [
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mvp-demo-harness.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
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
  const changed = branchChangedFilesExcludingSemgrepMaintenance();
  const approvedChangedFiles = approvedChangedFilesFor(changed);
  const protectedAllowlist = exactApprovedChangedFiles(changed) ?? [];

  const unexpectedNonApprovalFiles = changed.filter(
    (file) => !isAllowedApprovalScopeFile(file, approvedChangedFiles),
  );

  if (changed.includes(pr64DocPath)) {
    for (const expectedFile of expectedPr64ChangedFiles) {
      assert.equal(changed.includes(expectedFile), true, `${expectedFile} should be included in PR64`);
    }
  }

  assert.deepEqual(unexpectedNonApprovalFiles, []);
  assert.deepEqual(
    changed.filter((file) => isUnexpectedProtectedChange(file, protectedAllowlist)),
    [],
  );
  assert.deepEqual(changed.filter((file) => /^docs\/MCP_REMOTE_.*\.md$/.test(file)), []);
});

test("PR101 replay exact-set guard rejects unrelated MCP package and CI changes", () => {
  for (const unexpectedFile of [
    "src/mcp/unrelated.ts",
    "src/runtime.ts",
    "tests/unrelated.test.mjs",
    "package.json",
    ".github/workflows/ci.yml",
    "docs/unrelated.md",
    "bin/unrelated.mjs",
  ]) {
    assert.equal(exactApprovedChangedFiles([...pr101ReplayChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r2aOutputSchemaChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r2bOutputSchemaChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r3NonCanonicalStructuredInputChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r5PostMvpAdapterArchitectureChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r6aStructuredAnalyzeContractChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r6a1StructuredAnalyzeExecutableContractChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r6bStructuredAnalyzeImplementationChangedFiles, unexpectedFile].sort()), null);
    assert.equal(exactApprovedChangedFiles([...r6bStructuredAnalyzeGuardMaintenanceChangedFiles, unexpectedFile].sort()), null);
  }
});

function readDoc(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

// fallow-ignore-next-line code-duplication

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

function isExactR2AOutputSchemaChangeSet(changed) {
  return isExactChangedFileSet(changed, r2aOutputSchemaChangedFiles);
}

function isExactR2BOutputSchemaChangeSet(changed) {
  return isExactChangedFileSet(changed, r2bOutputSchemaChangedFiles);
}

function isExactR3NonCanonicalStructuredInputChangeSet(changed) {
  return isExactChangedFileSet(changed, r3NonCanonicalStructuredInputChangedFiles);
}

function approvedChangedFilesFor(changed) {
  return exactApprovedChangedFiles(changed) ?? allowedPostPr64ChangedFiles;
}

function exactApprovedChangedFiles(changed) {
  const sharedApproved = sharedExactApprovedChangedFiles(changed);
  if (sharedApproved !== null) {
    return sharedApproved;
  }

  if (isExactChangedFileSet(changed, r4CurrentOperationsRunbookChangedFiles)) {
    return r4CurrentOperationsRunbookChangedFiles;
  }
  if (isExactChangedFileSet(changed, r5PostMvpAdapterArchitectureChangedFiles)) {
    return r5PostMvpAdapterArchitectureChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6aStructuredAnalyzeContractChangedFiles)) {
    return r6aStructuredAnalyzeContractChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6a1StructuredAnalyzeExecutableContractChangedFiles)) {
    return r6a1StructuredAnalyzeExecutableContractChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6bStructuredAnalyzeImplementationChangedFiles)) {
    return r6bStructuredAnalyzeImplementationChangedFiles;
  }
  if (isExactChangedFileSet(changed, r6bStructuredAnalyzeGuardMaintenanceChangedFiles)) {
    return r6bStructuredAnalyzeGuardMaintenanceChangedFiles;
  }
  if (isExactR1GeometrySourceIdentityChangeSet(changed)) {
    return r1GeometrySourceIdentityChangedFiles;
  }
  if (isExactR6CStructuredAnalyzeMcpChangeSet(changed)) {
    return r6cStructuredAnalyzeMcpChangedFiles;
  }
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
  if (isExactR2AOutputSchemaChangeSet(changed)) {
    return r2aOutputSchemaChangedFiles;
  }
  if (isExactR2BOutputSchemaChangeSet(changed)) {
    return r2bOutputSchemaChangedFiles;
  }
  if (isExactR3NonCanonicalStructuredInputChangeSet(changed)) {
    return r3NonCanonicalStructuredInputChangedFiles;
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

function isUnexpectedProtectedChange(file, protectedAllowlist) {
  return isProtectedChange(file) && !protectedAllowlist.includes(file);
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
