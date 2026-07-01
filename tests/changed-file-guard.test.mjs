import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import {
  branchChangedFiles,
  familyRatioPackMeaningSmokeChangedFiles,
  geometryHarmonyPackReportExamplesChangedFiles,
  guardExactSetConsolidationChangedFiles,
  guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles,
  isExactChangedFileSet,
  isExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet,
  localInspectionSurfaceOnboardingChangedFiles,
  localInspectionSurfaceStaticSafetyGuardChangedFiles,
  localCliReportBoundaryFreezeChangedFiles,
  localTruthProjectionConsolidationSmokeChangedFiles,
  localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles,
  localStructuredAnalyzeDemoWorkflowSmokeChangedFiles,
  localInspectionSurfaceBoundaryChangedFiles,
  localStructuredAnalyzeInspectionSurfaceChangedFiles,
  localStructuredAnalyzeProductSurfaceApprovalChangedFiles,
  localStructuredAnalyzeDemoSmokeChangedFiles,
  localStructuredAnalyzeReportKitChangedFiles,
  localStructuredAnalyzeReportKitScopeSummaryChangedFiles,
  mcpProtocolContractLockV2ChangedFiles,
  postR25RoadmapTruthSyncChangedFiles,
  postR31RoadmapTruthSyncChangedFiles,
  postR14RoadmapCheckpointChangedFiles,
  publicApiContractFreezeChangedFiles,
  ratioPackFamilyCatalogBoundaryChangedFiles,
  ratioPackAuthoringContractChangedFiles,
  ratioPackStrictContractChangedFiles,
  realUsecaseStructuredLayoutDemoChangedFiles,
  realUsecaseStructuredLayoutDemoNonSemgrepMaintenanceChangedFiles,
  realUsecaseLocalDemoCommandChangedFiles,
  realUsecaseLocalDemoCommandHardeningChangedFiles,
  roadmapConvergenceAfterR16ChangedFiles,
  r1GeometrySourceIdentityChangedFiles,
  r7StructuredAnalyzeHardeningChangedFiles,
  runnableRatioPackFamilyExamplesChangedFiles,
  runnableRatioPackFamilyExamplesNonSemgrepMaintenanceChangedFiles,
  sharedExactApprovedChangedFiles,
  structuredAnalyzeCliUxLayerChangedFiles,
  structuredAnalyzeConsumerReadinessChangedFiles,
  structuredAnalyzeDeterminismRegressionChangedFiles,
  structuredAnalyzeProductScopeAlignmentChangedFiles,
  structuredAnalyzeReportDashboardInspectionChangedFiles,
  structuredAnalyzeScenarioConsistencyHardeningChangedFiles,
  structuredAnalyzeScenarioPackChangedFiles,
  structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles,
  structuredAnalyzeScenarioRegressionHarnessChangedFiles,
  structuredAnalyzeStdioTimeoutCleanupChangedFiles,
  structuredAnalyzeStdioTimeoutStabilityChangedFiles,
  structuredAnalyzeVisualViewerChangedFiles,
} from "./changed-file-guard.mjs";

test("shared exact changed-file guard accepts the exact approved set", () => {
  assert.deepEqual(sharedExactApprovedChangedFiles(r7StructuredAnalyzeHardeningChangedFiles), r7StructuredAnalyzeHardeningChangedFiles);
});

test("shared exact changed-file guard accepts the guard consolidation set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guardExactSetConsolidationChangedFiles),
    guardExactSetConsolidationChangedFiles,
  );
});

test("shared exact changed-file guard accepts the semgrep-filtered guard consolidation set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles),
    guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles,
  );
});

test("shared exact changed-file guard accepts the local structured analyze report kit set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeReportKitChangedFiles),
    localStructuredAnalyzeReportKitChangedFiles,
  );
});

test("shared exact changed-file guard accepts the local report-kit scope summary set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeReportKitScopeSummaryChangedFiles),
    localStructuredAnalyzeReportKitScopeSummaryChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R16 local Structured Analyze demo smoke set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeDemoSmokeChangedFiles),
    localStructuredAnalyzeDemoSmokeChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R23 local inspection onboarding set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localInspectionSurfaceOnboardingChangedFiles),
    localInspectionSurfaceOnboardingChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R24 Structured Analyze scenario regression set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioRegressionHarnessChangedFiles),
    structuredAnalyzeScenarioRegressionHarnessChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R25 local inspection surface static safety set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localInspectionSurfaceStaticSafetyGuardChangedFiles),
    localInspectionSurfaceStaticSafetyGuardChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R26 post-R25 roadmap truth sync set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postR25RoadmapTruthSyncChangedFiles),
    postR25RoadmapTruthSyncChangedFiles,
  );

  for (const broadPath of ["docs/**", "tests/**", "src/**", "bin/**", "viewer/**", "examples/**"]) {
    assert.equal(
      postR25RoadmapTruthSyncChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R27 family ratio-pack meaning smoke set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(familyRatioPackMeaningSmokeChangedFiles),
    familyRatioPackMeaningSmokeChangedFiles,
  );

  assert.deepEqual(familyRatioPackMeaningSmokeChangedFiles, [
    "docs/local-structured-analyze-report-kit.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/family-ratio-pack-meaning-smoke.test.mjs",
    "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      familyRatioPackMeaningSmokeChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R28 ratio-pack family catalog boundary set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(ratioPackFamilyCatalogBoundaryChangedFiles),
    ratioPackFamilyCatalogBoundaryChangedFiles,
  );

  assert.deepEqual(ratioPackFamilyCatalogBoundaryChangedFiles, [
    "docs/ratio-pack-family-catalog.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/ratio-pack-family-catalog.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      ratioPackFamilyCatalogBoundaryChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R29 runnable ratio-pack family examples set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(runnableRatioPackFamilyExamplesChangedFiles),
    runnableRatioPackFamilyExamplesChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(runnableRatioPackFamilyExamplesNonSemgrepMaintenanceChangedFiles),
    runnableRatioPackFamilyExamplesNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(runnableRatioPackFamilyExamplesChangedFiles, [
    "docs/examples/ratio-pack-family-workflow.md",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "examples/structured-analyze/families/root-two-harmonics-basic.json",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/ratio-pack-family-examples.test.mjs",
  ]);
  assert.deepEqual(runnableRatioPackFamilyExamplesNonSemgrepMaintenanceChangedFiles, [
    "docs/examples/ratio-pack-family-workflow.md",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "examples/structured-analyze/families/root-two-harmonics-basic.json",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/ratio-pack-family-examples.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      runnableRatioPackFamilyExamplesChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R30 local demo workflow smoke set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeDemoWorkflowSmokeChangedFiles),
    localStructuredAnalyzeDemoWorkflowSmokeChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles),
    localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(localStructuredAnalyzeDemoWorkflowSmokeChangedFiles, [
    "docs/examples/local-structured-analyze-demo-workflow.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-structured-analyze-demo-workflow.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);
  assert.deepEqual(localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles, [
    "docs/examples/local-structured-analyze-demo-workflow.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-structured-analyze-demo-workflow.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      localStructuredAnalyzeDemoWorkflowSmokeChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R33 local truth projection consolidation smoke set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localTruthProjectionConsolidationSmokeChangedFiles),
    localTruthProjectionConsolidationSmokeChangedFiles,
  );
  assert.deepEqual(localTruthProjectionConsolidationSmokeChangedFiles, [
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/real-usecase-local-inspection-demo.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      localTruthProjectionConsolidationSmokeChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R34 real-usecase local demo command set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(realUsecaseLocalDemoCommandChangedFiles),
    realUsecaseLocalDemoCommandChangedFiles,
  );

  assert.deepEqual(realUsecaseLocalDemoCommandChangedFiles, [
    "bin/norma-core-real-usecase-demo.mjs",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/real-usecase-local-demo-command.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      realUsecaseLocalDemoCommandChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R35 real-usecase local demo command hardening set exactly", () => {
  assert.notStrictEqual(
    realUsecaseLocalDemoCommandHardeningChangedFiles,
    realUsecaseLocalDemoCommandChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(realUsecaseLocalDemoCommandHardeningChangedFiles),
    realUsecaseLocalDemoCommandHardeningChangedFiles,
  );

  assert.deepEqual(realUsecaseLocalDemoCommandHardeningChangedFiles, [
    "bin/norma-core-real-usecase-demo.mjs",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/real-usecase-local-demo-command.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      realUsecaseLocalDemoCommandHardeningChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R36 local CLI/report boundary freeze set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localCliReportBoundaryFreezeChangedFiles),
    localCliReportBoundaryFreezeChangedFiles,
  );

  assert.deepEqual(localCliReportBoundaryFreezeChangedFiles, [
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-structured-analyze-report-kit.test.mjs",
    "tests/real-usecase-local-demo-command.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      localCliReportBoundaryFreezeChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R31 real-usecase Structured Analyze layout demo set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(realUsecaseStructuredLayoutDemoChangedFiles),
    realUsecaseStructuredLayoutDemoChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(realUsecaseStructuredLayoutDemoNonSemgrepMaintenanceChangedFiles),
    realUsecaseStructuredLayoutDemoNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(realUsecaseStructuredLayoutDemoChangedFiles, [
    "docs/examples/real-usecase-structured-layout-demo.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/real-usecase-structured-layout-demo.test.mjs",
  ]);
  assert.deepEqual(realUsecaseStructuredLayoutDemoNonSemgrepMaintenanceChangedFiles, [
    "docs/examples/real-usecase-structured-layout-demo.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/real-usecase-structured-layout-demo.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      realUsecaseStructuredLayoutDemoChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the R32 post-R31 roadmap truth sync set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postR31RoadmapTruthSyncChangedFiles),
    postR31RoadmapTruthSyncChangedFiles,
  );

  assert.deepEqual(postR31RoadmapTruthSyncChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/PACKAGE_PUBLICATION_READINESS.md",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "docs/decisions/2026-06-30-post-r31-roadmap-truth-sync.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/post-r31-roadmap-truth-sync.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      postR31RoadmapTruthSyncChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the Geometry Harmony pack/report example set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(geometryHarmonyPackReportExamplesChangedFiles),
    geometryHarmonyPackReportExamplesChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze scenario pack set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioPackChangedFiles),
    structuredAnalyzeScenarioPackChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze CLI UX layer set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeCliUxLayerChangedFiles),
    structuredAnalyzeCliUxLayerChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R9 scenario consistency hardening set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioConsistencyHardeningChangedFiles),
    structuredAnalyzeScenarioConsistencyHardeningChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R10 determinism regression set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeDeterminismRegressionChangedFiles),
    structuredAnalyzeDeterminismRegressionChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R11 public API contract freeze set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(publicApiContractFreezeChangedFiles),
    publicApiContractFreezeChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R12 MCP protocol contract lock set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(mcpProtocolContractLockV2ChangedFiles),
    mcpProtocolContractLockV2ChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze visual viewer set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeVisualViewerChangedFiles),
    structuredAnalyzeVisualViewerChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R14 report dashboard inspection set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeReportDashboardInspectionChangedFiles),
    structuredAnalyzeReportDashboardInspectionChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R15 post-R14 roadmap checkpoint set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postR14RoadmapCheckpointChangedFiles),
    postR14RoadmapCheckpointChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R17 roadmap convergence after R16 set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(roadmapConvergenceAfterR16ChangedFiles),
    roadmapConvergenceAfterR16ChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R18 Structured Analyze consumer readiness set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeConsumerReadinessChangedFiles),
    structuredAnalyzeConsumerReadinessChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R19 local inspection surface boundary set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localInspectionSurfaceBoundaryChangedFiles),
    localInspectionSurfaceBoundaryChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R20 product-scope alignment set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeProductScopeAlignmentChangedFiles),
    structuredAnalyzeProductScopeAlignmentChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R21 local product-surface approval set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeProductSurfaceApprovalChangedFiles),
    localStructuredAnalyzeProductSurfaceApprovalChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R22 local Structured Analyze inspection surface set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localStructuredAnalyzeInspectionSurfaceChangedFiles),
    localStructuredAnalyzeInspectionSurfaceChangedFiles,
  );
});

test("shared exact changed-file guard accepts the semgrep-filtered Structured Analyze scenario pack set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles),
    structuredAnalyzeScenarioPackNonSemgrepMaintenanceChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze STDIO timeout stability set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeStdioTimeoutStabilityChangedFiles),
    structuredAnalyzeStdioTimeoutStabilityChangedFiles,
  );
});

test("shared exact changed-file guard accepts the Structured Analyze STDIO timeout cleanup set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(structuredAnalyzeStdioTimeoutCleanupChangedFiles),
    structuredAnalyzeStdioTimeoutCleanupChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R13 ratio pack authoring contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(ratioPackAuthoringContractChangedFiles),
    ratioPackAuthoringContractChangedFiles,
  );
});

test("shared exact changed-file guard accepts the R13 strict ratio pack contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(ratioPackStrictContractChangedFiles),
    ratioPackStrictContractChangedFiles,
  );
});

test("shared exact changed-file guard treats approved files as a set, not an ordered list", () => {
  const reordered = [...guardExactSetConsolidationChangedFiles].reverse();

  assert.equal(isExactChangedFileSet(reordered, guardExactSetConsolidationChangedFiles), true);
  assert.deepEqual(sharedExactApprovedChangedFiles(reordered), guardExactSetConsolidationChangedFiles);
});

test("shared exact changed-file guard normalizes equivalent path spellings", () => {
  const variants = guardExactSetConsolidationChangedFiles.map((file) =>
    file === "tests/changed-file-guard.test.mjs" ? ".\\tests\\changed-file-guard.test.mjs" : `././${file}`,
  );

  assert.equal(isExactChangedFileSet(variants, guardExactSetConsolidationChangedFiles), true);
  assert.deepEqual(sharedExactApprovedChangedFiles(variants), guardExactSetConsolidationChangedFiles);
});

test("shared exact changed-file guard returns defensive copies", () => {
  const approved = sharedExactApprovedChangedFiles(guardExactSetConsolidationChangedFiles);

  assert.notStrictEqual(approved, guardExactSetConsolidationChangedFiles);
  approved.pop();
  assert.deepEqual(sharedExactApprovedChangedFiles(guardExactSetConsolidationChangedFiles), guardExactSetConsolidationChangedFiles);
});

test("shared exact changed-file guard rejects a missing required file", () => {
  const missingRequiredFile = localStructuredAnalyzeReportKitScopeSummaryChangedFiles.filter(
    (file) => file !== "tests/changed-file-guard.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);
});

test("shared exact changed-file guard rejects an incomplete Geometry Harmony pack/report example set", () => {
  const missingRequiredFile = geometryHarmonyPackReportExamplesChangedFiles.filter(
    (file) => file !== "tests/ratio-pack-model.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);
});

test("shared exact changed-file guard rejects an extra unrelated file", () => {
  assert.equal(
    sharedExactApprovedChangedFiles([...localStructuredAnalyzeReportKitScopeSummaryChangedFiles, "tests/unrelated.test.mjs"]),
    null,
  );
});

test("shared exact changed-file guard rejects runtime extras in the R16 demo smoke set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "bin/norma-core-report.mjs",
    "package.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localStructuredAnalyzeDemoSmokeChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects extra files in the Geometry Harmony pack/report example set", () => {
  assert.equal(
    sharedExactApprovedChangedFiles([...geometryHarmonyPackReportExamplesChangedFiles, "src/mcp/stdio-protocol.ts"]),
    null,
  );
});

test("shared exact changed-file guard rejects extra files in the Structured Analyze visual viewer set", () => {
  assert.equal(
    sharedExactApprovedChangedFiles([...structuredAnalyzeVisualViewerChangedFiles, "src/cli/analyze.ts"]),
    null,
  );
});

test("shared exact changed-file guard rejects forbidden extras in the R14 report dashboard inspection set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "package.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...structuredAnalyzeReportDashboardInspectionChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime extras in the R15 roadmap checkpoint set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "package.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postR14RoadmapCheckpointChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime extras in the R17 roadmap convergence set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "bin/norma-core-report.mjs",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "package.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...roadmapConvergenceAfterR16ChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime and package extras in the R18 consumer readiness set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...structuredAnalyzeConsumerReadinessChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the R19 local inspection boundary set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/report-dashboard.html",
    "examples/consumer/structured-analyze-v1.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "docs/local-structured-analyze-report-kit.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localInspectionSurfaceBoundaryChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime and viewer extras in the R20 product-scope alignment set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "docs/plans/2026-06-16-read-only-result-viewer-plan.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...structuredAnalyzeProductScopeAlignmentChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime and viewer extras in the R21 product-surface approval set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/report-dashboard.html",
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "docs/plans/2026-06-16-read-only-result-viewer-plan.md",
    "docs/local-structured-analyze-report-kit.md",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localStructuredAnalyzeProductSurfaceApprovalChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the R22 inspection surface set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "docs/plans/2026-06-16-read-only-result-viewer-plan.md",
    "docs/decisions/2026-06-28-local-inspection-surface-boundary.md",
    "docs/decisions/2026-06-28-structured-analyze-product-scope-alignment.md",
    "docs/decisions/2026-06-28-local-structured-analyze-product-surface-approval.md",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localStructuredAnalyzeInspectionSurfaceChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("R20 product-scope alignment changed-file guard is an exact scoped set", () => {
  assert.deepEqual(structuredAnalyzeProductScopeAlignmentChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-28-structured-analyze-product-scope-alignment.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/roadmap-status-update.test.mjs",
    "tests/structured-analyze-product-scope-alignment.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "tests/**", "src/**", "viewer/**"]) {
    assert.equal(
      structuredAnalyzeProductScopeAlignmentChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("R21 local product-surface approval changed-file guard is an exact scoped set", () => {
  assert.deepEqual(localStructuredAnalyzeProductSurfaceApprovalChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-06-28-local-structured-analyze-product-surface-approval.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-structured-analyze-product-surface-approval.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "tests/**", "src/**", "viewer/**"]) {
    assert.equal(
      localStructuredAnalyzeProductSurfaceApprovalChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("R22 local Structured Analyze inspection surface changed-file guard is an exact scoped set", () => {
  assert.deepEqual(localStructuredAnalyzeInspectionSurfaceChangedFiles, [
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
  ]);

  for (const broadPath of ["docs/**", "tests/**", "src/**", "viewer/**"]) {
    assert.equal(
      localStructuredAnalyzeInspectionSurfaceChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("R23 local inspection onboarding changed-file guard is an exact scoped set", () => {
  assert.deepEqual(localInspectionSurfaceOnboardingChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/examples/read-only-result-viewer-onboarding-fixture.json",
    "docs/examples/read-only-result-viewer-workflow.md",
    "docs/onboarding/README.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-inspection-onboarding-fixture.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "tests/**", "src/**", "viewer/**"]) {
    assert.equal(
      localInspectionSurfaceOnboardingChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("R24 Structured Analyze scenario regression changed-file guard is an exact scoped set", () => {
  assert.deepEqual(structuredAnalyzeScenarioRegressionHarnessChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/structured-analyze-scenario-regression.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      structuredAnalyzeScenarioRegressionHarnessChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("R25 local inspection surface static safety guard is an exact scoped set", () => {
  assert.deepEqual(localInspectionSurfaceStaticSafetyGuardChangedFiles, [
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-inspection-surface-static-safety.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      localInspectionSurfaceStaticSafetyGuardChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the R23 inspection onboarding set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localInspectionSurfaceOnboardingChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the R24 scenario regression set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/scenarios/invalid-duplicate-id.json",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "examples/structured-analyze/scenarios/boundary-case.json",
    "examples/structured-analyze/scenarios/invalid-case.json",
    "examples/structured-analyze/scenarios/ratio-comparison.json",
    "examples/structured-analyze/scenarios/symmetry-test.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...structuredAnalyzeScenarioRegressionHarnessChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the R25 static safety set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "docs/examples/read-only-result-viewer-onboarding-fixture.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localInspectionSurfaceStaticSafetyGuardChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, and example extras in the R26 roadmap truth sync set", () => {
  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "docs/examples/read-only-result-viewer-onboarding-fixture.json",
    "docs/examples/read-only-result-viewer-workflow.md",
    "docs/onboarding/README.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postR25RoadmapTruthSyncChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, and exposure extras in the R27 family ratio-pack smoke set", () => {
  for (const forbiddenFile of [
    "src/ratio-pack.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...familyRatioPackMeaningSmokeChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects missing, extra, and broad files in the R29 runnable family examples set", () => {
  const missingRequiredFile = runnableRatioPackFamilyExamplesChangedFiles.filter(
    (file) => file !== "tests/ratio-pack-family-examples.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/ratio-pack.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "docs/ratio-pack-family-catalog.md",
    "tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json",
    "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json",
    "tests/onboarding-examples-approval.test.mjs.bak",
    "tests/onboarding-examples-docs.test.mjs.bak",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...runnableRatioPackFamilyExamplesChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...runnableRatioPackFamilyExamplesChangedFiles.filter(
          (file) => file !== "docs/examples/ratio-pack-family-workflow.md",
        ),
        broadPath,
      ]),
      null,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects non-R30 files in the R30 local demo workflow smoke set", () => {
  const missingRequiredFile = localStructuredAnalyzeDemoWorkflowSmokeChangedFiles.filter(
    (file) => file !== "tests/local-structured-analyze-demo-workflow.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);
  assert.equal(
    sharedExactApprovedChangedFiles([...localStructuredAnalyzeDemoWorkflowSmokeChangedFiles, "tests/unrelated.test.mjs"]),
    null,
  );
});

test("shared exact changed-file guard rejects runtime, package, and extra files in the R31 real-usecase layout demo set", () => {
  const missingRequiredFile = realUsecaseStructuredLayoutDemoChangedFiles.filter(
    (file) => file !== "tests/real-usecase-structured-layout-demo.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...realUsecaseStructuredLayoutDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, and extra files in the R32 truth sync set", () => {
  const missingRequiredFile = postR31RoadmapTruthSyncChangedFiles.filter(
    (file) => file !== "tests/post-r31-roadmap-truth-sync.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postR31RoadmapTruthSyncChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, docs, and example extras in the R34 demo command set", () => {
  const missingRequiredFile = realUsecaseLocalDemoCommandChangedFiles.filter(
    (file) => file !== "tests/real-usecase-local-demo-command.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "docs/local-structured-analyze-report-kit.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...realUsecaseLocalDemoCommandChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, docs, and example extras in the R35 demo hardening set", () => {
  const missingRequiredFile = realUsecaseLocalDemoCommandHardeningChangedFiles.filter(
    (file) => file !== "tests/real-usecase-local-demo-command.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "docs/local-structured-analyze-report-kit.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...realUsecaseLocalDemoCommandHardeningChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, metadata, docs, examples, and MCP extras in the R36 boundary freeze set", () => {
  const missingRequiredFile = localCliReportBoundaryFreezeChangedFiles.filter(
    (file) => file !== "tests/local-structured-analyze-report-kit.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "bin/norma-cli.mjs",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "docs/local-structured-analyze-report-kit.md",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localCliReportBoundaryFreezeChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("R36 package metadata remains private without bin, export, or dependency expansion", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal("bin" in packageJson, false);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), ["."]);
  assert.equal("dependencies" in packageJson, false);
  assert.deepEqual(Object.keys(packageJson.devDependencies).sort(), ["typescript"]);
});

test("shared exact changed-file guard does not treat broad path globs as approvals", () => {
  for (const broadPath of ["src/**", "docs/**", "bin/**", "tests/**"]) {
    assert.equal(sharedExactApprovedChangedFiles([broadPath]), null);
    assert.equal(isExactChangedFileSet([broadPath], r7StructuredAnalyzeHardeningChangedFiles), false);
  }
});

test("shared exact changed-file guard does not approve future report-kit-like files implicitly", () => {
  const futureReportKitLikeFiles = [
    "docs/local-structured-analyze-report-kit.md",
    "src/local-report/structured-analyze-report.ts",
    "tests/local-structured-analyze-report-kit.test.mjs",
  ];

  assert.equal(sharedExactApprovedChangedFiles(futureReportKitLikeFiles), null);
});

test("shared R6C exact guard preserves legacy R6D metadata approval", () => {
  const r6dChatgptMcpMetadataCompatibilityChangedFiles = [
    "src/mcp/stdio-protocol.ts",
    "tests/mcp-structured-composition-analysis-contract.test.mjs",
    "tests/mcp-tools-call-contract.test.mjs",
    "tests/mcp-tools-list-contract.test.mjs",
    "tests/r6c-structured-analyze-mcp-change-set.mjs",
  ];

  assert.equal(isExactR6CStructuredAnalyzeMcpChangeSet(r6dChatgptMcpMetadataCompatibilityChangedFiles), true);
  assert.equal(
    isExactR6CStructuredAnalyzeMcpChangeSet([...r6dChatgptMcpMetadataCompatibilityChangedFiles, "tests/unrelated.test.mjs"]),
    false,
  );
});

test("shared R1 exact guard preserves filtered geometry source identity approval", () => {
  const r1GeometrySourceIdentitySemgrepGuardMaintenanceFiles = new Set([
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
  const filteredR1GeometrySourceIdentityChangedFiles = r1GeometrySourceIdentityChangedFiles.filter(
    (file) => !r1GeometrySourceIdentitySemgrepGuardMaintenanceFiles.has(file),
  );

  assert.equal(isExactR1GeometrySourceIdentityChangeSet(filteredR1GeometrySourceIdentityChangedFiles), true);
  assert.equal(
    isExactR1GeometrySourceIdentityChangeSet([
      ...filteredR1GeometrySourceIdentityChangedFiles,
      "tests/unrelated.test.mjs",
    ]),
    false,
  );
});

test("branch changed-file detection fails closed when git probes cannot run", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    assert.throws(
      () => branchChangedFiles(repoRoot),
      (error) => {
        assert.doesNotMatch(error.message, /known base refs/);
        assert.equal(error instanceof Error, true);
        assert.match(error.message, /Command failed: git diff --name-only/);
        return true;
      },
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("branch changed-file detection fails closed when known base refs are absent", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "topic"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: repoRoot, stdio: "ignore" });

    assert.throws(
      () => branchChangedFiles(repoRoot),
      /known base refs/,
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("branch changed-file detection includes working tree files when a base ref exists", async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "main"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "topic"], { cwd: repoRoot, stdio: "ignore" });
    await writeFile(join(repoRoot, "local.test.mjs"), "");

    assert.deepEqual(branchChangedFiles(repoRoot), ["local.test.mjs"]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
