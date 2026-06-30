import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  isExactR1GeometrySourceIdentityChangeSet as isLegacyExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet as isLegacyExactR6CStructuredAnalyzeMcpChangeSet,
  r1GeometrySourceIdentityChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  r7aPostR1PrivateOperatingModelChangedFiles,
  r7StructuredAnalyzeHardeningChangedFiles,
} from "./r6c-structured-analyze-mcp-change-set.mjs";

export {
  r1GeometrySourceIdentityChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  r7aPostR1PrivateOperatingModelChangedFiles,
  r7StructuredAnalyzeHardeningChangedFiles,
};

const testDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = dirname(testDir);

export const guardExactSetConsolidationChangedFiles = Object.freeze([
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
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
].sort());

const semgrepCiGuardMaintenanceFiles = new Set([
  ".github/workflows/ci.yml",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
]);

export const guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles = Object.freeze(
  guardExactSetConsolidationChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const localStructuredAnalyzeReportKitChangedFiles = Object.freeze([
  "bin/norma-core-report.mjs",
  "docs/local-structured-analyze-report-kit.md",
  "examples/structured-analyze/basic-grid-alignment.json",
  "src/local-report/structured-analyze-report.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-report-kit.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
].sort());

export const localStructuredAnalyzeReportKitScopeSummaryChangedFiles = Object.freeze([
  "docs/local-structured-analyze-report-kit.md",
  "src/local-report/structured-analyze-report.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-report-kit.test.mjs",
].sort());

export const localStructuredAnalyzeDemoSmokeChangedFiles = Object.freeze([
  "docs/local-structured-analyze-report-kit.md",
  "src/local-report/structured-analyze-report.ts",
  "src/local-report/visual-viewer.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-report-kit.test.mjs",
].sort());

export const geometryHarmonyPackReportExamplesChangedFiles = Object.freeze([
  "docs/local-structured-analyze-report-kit.md",
  "examples/structured-analyze/geometry-harmony-basic.json",
  "src/ratio-pack.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-report-kit.test.mjs",
  "tests/ratio-pack-model.test.mjs",
].sort());

export const structuredAnalyzeScenarioPackChangedFiles = Object.freeze([
  "bin/norma-core-report.mjs",
  "examples/structured-analyze/scenarios/alignment-basic.json",
  "examples/structured-analyze/scenarios/boundary-case.json",
  "examples/structured-analyze/scenarios/invalid-case.json",
  "examples/structured-analyze/scenarios/ratio-comparison.json",
  "examples/structured-analyze/scenarios/symmetry-test.json",
  "package.json",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/scenarios.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
].sort());

export const structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles = Object.freeze(
  structuredAnalyzeScenarioPackChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const structuredAnalyzeScenarioConsistencyHardeningChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/scenarios.test.mjs",
].sort());

export const structuredAnalyzeDeterminismRegressionChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/determinism-regression.test.mjs",
].sort());

export const publicApiContractFreezeChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/public-api-contract.test.mjs",
].sort());

export const mcpProtocolContractLockV2ChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
].sort());

export const structuredAnalyzeStdioTimeoutStabilityChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
].sort());

export const structuredAnalyzeStdioTimeoutCleanupChangedFiles = structuredAnalyzeStdioTimeoutStabilityChangedFiles;

export const ratioPackAuthoringContractChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json",
  "tests/ratio-pack-authoring-contract.test.mjs",
].sort());

export const ratioPackStrictContractChangedFiles = Object.freeze([
  "src/ratio-pack.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/ratio-pack-contract.test.mjs",
].sort());

export const structuredAnalyzeCliUxLayerChangedFiles = Object.freeze([
  "bin/norma-cli.mjs",
  "package.json",
  "src/cli/analyze.ts",
  "src/node-cli.d.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/cli.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
].sort());

export const structuredAnalyzeVisualViewerChangedFiles = Object.freeze([
  "src/local-report/structured-analyze-report.ts",
  "src/local-report/visual-viewer.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/visual-viewer.test.mjs",
].sort());

export const structuredAnalyzeReportDashboardInspectionChangedFiles = Object.freeze([
  "docs/local-structured-analyze-report-kit.md",
  "src/local-report/visual-viewer.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-report-kit.test.mjs",
  "tests/visual-viewer.test.mjs",
].sort());

export const postR14RoadmapCheckpointChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-27-post-r14-roadmap-checkpoint.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const roadmapConvergenceAfterR16ChangedFiles = postR14RoadmapCheckpointChangedFiles;

export const structuredAnalyzeConsumerReadinessChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/CONSUMER_COMPATIBILITY.md",
  "docs/PACKAGE_CONSUMPTION.md",
  "examples/consumer/structured-analyze-v1.ts",
  "examples/consumer/tsconfig.json",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/consumer-compatibility.test.mjs",
  "tests/package-consumption.test.mjs",
].sort());

export const localInspectionSurfaceBoundaryChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-28-local-inspection-surface-boundary.md",
  "docs/examples/read-only-result-viewer-workflow.md",
  "docs/onboarding/README.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-inspection-surface-boundary.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const structuredAnalyzeProductScopeAlignmentChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-28-structured-analyze-product-scope-alignment.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/roadmap-status-update.test.mjs",
  "tests/structured-analyze-product-scope-alignment.test.mjs",
].sort());

export const localStructuredAnalyzeProductSurfaceApprovalChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-28-local-structured-analyze-product-surface-approval.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-product-surface-approval.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const localStructuredAnalyzeInspectionSurfaceChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/examples/read-only-result-viewer-workflow.md",
  "docs/onboarding/README.md",
  "src/local-viewer/read-only-viewer-model.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/fixtures/viewer/structured-analyze-result.json",
  "tests/read-only-viewer-demo-readiness.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "viewer/read-only-result-viewer.html",
].sort());

export const localInspectionSurfaceOnboardingChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/examples/read-only-result-viewer-onboarding-fixture.json",
  "docs/examples/read-only-result-viewer-workflow.md",
  "docs/onboarding/README.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-inspection-onboarding-fixture.test.mjs",
].sort());

export const structuredAnalyzeScenarioRegressionHarnessChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/structured-analyze-scenario-regression.test.mjs",
].sort());

export const localInspectionSurfaceStaticSafetyGuardChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-inspection-surface-static-safety.test.mjs",
].sort());

export const postR25RoadmapTruthSyncChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-30-post-r25-roadmap-truth-sync.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/post-r25-roadmap-truth-sync.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const familyRatioPackMeaningSmokeChangedFiles = Object.freeze([
  "docs/local-structured-analyze-report-kit.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/family-ratio-pack-meaning-smoke.test.mjs",
  "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json",
].sort());

export const ratioPackFamilyCatalogBoundaryChangedFiles = Object.freeze([
  "docs/ratio-pack-family-catalog.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/ratio-pack-family-catalog.test.mjs",
].sort());

export const runnableRatioPackFamilyExamplesChangedFiles = Object.freeze([
  "docs/examples/ratio-pack-family-workflow.md",
  "examples/structured-analyze/families/harmonic-triads-basic.json",
  "examples/structured-analyze/families/root-two-harmonics-basic.json",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/ratio-pack-family-examples.test.mjs",
].sort());

export const runnableRatioPackFamilyExamplesNonSemgrepMaintenanceChangedFiles = Object.freeze(
  runnableRatioPackFamilyExamplesChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const localStructuredAnalyzeDemoWorkflowSmokeChangedFiles = Object.freeze([
  "docs/examples/local-structured-analyze-demo-workflow.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-demo-workflow.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
].sort());

export const localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles = Object.freeze(
  localStructuredAnalyzeDemoWorkflowSmokeChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const realUsecaseStructuredLayoutDemoChangedFiles = Object.freeze([
  "docs/examples/real-usecase-structured-layout-demo.md",
  "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/real-usecase-structured-layout-demo.test.mjs",
].sort());

export const realUsecaseStructuredLayoutDemoNonSemgrepMaintenanceChangedFiles = Object.freeze(
  realUsecaseStructuredLayoutDemoChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const localTruthProjectionConsolidationSmokeChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/real-usecase-local-inspection-demo.test.mjs",
].sort());

export const realUsecaseLocalInspectionDemoSmokeChangedFiles = localTruthProjectionConsolidationSmokeChangedFiles;

export const realUsecaseLocalDemoCommandChangedFiles = Object.freeze([
  "bin/norma-core-real-usecase-demo.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/real-usecase-local-demo-command.test.mjs",
].sort());

export const postR31RoadmapTruthSyncChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/PACKAGE_PUBLICATION_READINESS.md",
  "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
  "docs/decisions/2026-06-30-post-r31-roadmap-truth-sync.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/post-r31-roadmap-truth-sync.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

const sharedExactApprovedChangedFileSets = [
  realUsecaseLocalDemoCommandChangedFiles,
  localTruthProjectionConsolidationSmokeChangedFiles,
  postR31RoadmapTruthSyncChangedFiles,
  realUsecaseStructuredLayoutDemoChangedFiles,
  realUsecaseStructuredLayoutDemoNonSemgrepMaintenanceChangedFiles,
  localStructuredAnalyzeDemoWorkflowSmokeChangedFiles,
  localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles,
  familyRatioPackMeaningSmokeChangedFiles,
  ratioPackFamilyCatalogBoundaryChangedFiles,
  runnableRatioPackFamilyExamplesChangedFiles,
  runnableRatioPackFamilyExamplesNonSemgrepMaintenanceChangedFiles,
  guardExactSetConsolidationChangedFiles,
  guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles,
  geometryHarmonyPackReportExamplesChangedFiles,
  localStructuredAnalyzeDemoSmokeChangedFiles,
  localStructuredAnalyzeReportKitChangedFiles,
  localStructuredAnalyzeReportKitScopeSummaryChangedFiles,
  mcpProtocolContractLockV2ChangedFiles,
  publicApiContractFreezeChangedFiles,
  postR14RoadmapCheckpointChangedFiles,
  roadmapConvergenceAfterR16ChangedFiles,
  ratioPackAuthoringContractChangedFiles,
  ratioPackStrictContractChangedFiles,
  structuredAnalyzeCliUxLayerChangedFiles,
  structuredAnalyzeDeterminismRegressionChangedFiles,
  structuredAnalyzeScenarioConsistencyHardeningChangedFiles,
  structuredAnalyzeScenarioPackChangedFiles,
  structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles,
  structuredAnalyzeConsumerReadinessChangedFiles,
  localInspectionSurfaceBoundaryChangedFiles,
  structuredAnalyzeProductScopeAlignmentChangedFiles,
  localStructuredAnalyzeProductSurfaceApprovalChangedFiles,
  localStructuredAnalyzeInspectionSurfaceChangedFiles,
  localInspectionSurfaceOnboardingChangedFiles,
  localInspectionSurfaceStaticSafetyGuardChangedFiles,
  postR25RoadmapTruthSyncChangedFiles,
  structuredAnalyzeScenarioRegressionHarnessChangedFiles,
  structuredAnalyzeStdioTimeoutStabilityChangedFiles,
  structuredAnalyzeReportDashboardInspectionChangedFiles,
  structuredAnalyzeVisualViewerChangedFiles,
  r1GeometrySourceIdentityChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  r7StructuredAnalyzeHardeningChangedFiles,
  r7aPostR1PrivateOperatingModelChangedFiles,
];

export function branchChangedFiles(repoRoot = defaultRepoRoot, baseRefs = defaultBaseRefs()) {
  const baseDiff = firstSuccessfulGitFiles(
    repoRoot,
    baseRefs.map((ref) => ["diff", "--name-only", `${ref}...HEAD`]),
  );

  if (baseDiff === null) {
    throw new Error("Unable to determine changed files from known base refs");
  }

  let workingTreeFiles;

  try {
    workingTreeFiles = [
      gitFiles(repoRoot, ["diff", "--name-only"]),
      gitFiles(repoRoot, ["diff", "--cached", "--name-only"]),
      gitFiles(repoRoot, ["ls-files", "--others", "--exclude-standard"]),
    ];
  } catch (error) {
    throw new Error(`Unable to determine changed files from working tree: ${error.message}`);
  }

  return normalizeChangedFiles([...baseDiff, ...workingTreeFiles.flat()]);
}

export function branchChangedFilesExcludingSemgrepMaintenance(repoRoot = defaultRepoRoot) {
  return branchChangedFiles(repoRoot).filter((file) => !semgrepCiGuardMaintenanceFiles.has(file));
}

export function isExactChangedFileSet(changedFiles, approvedFiles) {
  const changed = normalizeChangedFiles(changedFiles);
  const approved = normalizeChangedFiles(approvedFiles);

  return changed.length === approved.length && approved.every((file) => changed.includes(file));
}

export function sharedExactApprovedChangedFiles(changedFiles) {
  const changed = normalizeChangedFiles(changedFiles);
  const approved = sharedExactApprovedChangedFileSets.find((approvedFiles) => isExactChangedFileSet(changed, approvedFiles));

  return approved ? normalizeChangedFiles(approved) : null;
}

export function isExactR6CStructuredAnalyzeMcpChangeSet(changedFiles) {
  return isLegacyExactR6CStructuredAnalyzeMcpChangeSet(normalizeChangedFiles(changedFiles));
}

export function isExactR1GeometrySourceIdentityChangeSet(changedFiles) {
  return isLegacyExactR1GeometrySourceIdentityChangeSet(normalizeChangedFiles(changedFiles));
}

function normalizeChangedFiles(files) {
  return [...new Set(files.map(normalizeChangedFile))].sort();
}

function normalizeChangedFile(file) {
  return file
    .replaceAll("\\", "/")
    .replace(/^(?:\.\/)+/, "")
    .replace(/\/+/g, "/");
}

function firstSuccessfulGitFiles(repoRoot, argSets) {
  for (const args of argSets) {
    try {
      return gitFiles(repoRoot, args);
    } catch (error) {
      if (!isMissingBaseRefGitError(error)) {
        throw error;
      }

      // Try the next known base ref. Working-tree probes below remain mandatory.
    }
  }

  return null;
}

function defaultBaseRefs() {
  return [
    process.env.GITHUB_BASE_REF && `origin/${process.env.GITHUB_BASE_REF}`,
    process.env.GITHUB_BASE_REF,
    "origin/main",
    "main",
    "origin/master",
    "master",
  ].filter(Boolean);
}

function gitFiles(repoRoot, args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    .split(/\r?\n/u)
    .filter(Boolean);
}

function isMissingBaseRefGitError(error) {
  const stderr = Buffer.isBuffer(error.stderr) ? error.stderr.toString("utf8") : String(error.stderr ?? "");
  const message = `${error.message}\n${stderr}`;

  return /ambiguous argument .*HEAD|unknown revision|bad revision|no merge base/i.test(message);
}
