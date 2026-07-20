import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

import {
  acceptedGeometryToCoreMapperChangedFiles,
  acceptedGeometryToCoreMapperNonSemgrepMaintenanceChangedFiles,
  acceptedGeometryToCoreMapperReviewFixesChangedFiles,
  acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles,
  acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles,
  acceptedGeometryStructuredAnalyzeNormalizationChangedFiles,
  acceptedGeometryStructuredAnalyzeNormalizationMetricPolicyFixChangedFiles,
  branchChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  declaredImagePlaneMeasurementRatiosChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  localVisualCandidateReviewChangedFiles,
  privateDevChatGptMcpCompleteLiveProofChangedFiles,
  privateDevChatGptMcpVisualPilotGateChangedFiles,
  privateDevLocalVisualMcpOrchestrationChangedFiles,
  personalChatGptVisualHarmonyDemoChangedFiles,
  personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles,
  personalChatGptVisualHarmonyDemoOriginalChangedFiles,
  personalChatGptVisualHarmonyDemoOriginalNonSemgrepMaintenanceChangedFiles,
  personalVisualHarmonyImageHydrationChangedFiles,
  personalVisualHarmonyJunctionAnglesChangedFiles,
  personalVisualHarmonyObliqueFormatConstructionsChangedFiles,
  personalVisualHarmonyPixelRefinementIntegrationChangedFiles,
  personalVisualHarmonyPixelRefinementShadowChangedFiles,
  personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles,
  personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
  personalVisualHarmonyRotatedEllipsesChangedFiles,
  personalVisualHarmonyTriangleConstructionsChangedFiles,
  personalVisualHarmonyTriangleMediansChangedFiles,
  personalVisualHarmonyAngleBisectorsChangedFiles,
  personalVisualHarmonyTriangleAltitudesChangedFiles,
  personalVisualHarmonyTriangleCentroidChangedFiles,
  personalVisualHarmonyBrandIdentityChangedFiles,
  personalVisualHarmonyCandidateLabelLayoutChangedFiles,
  personalVisualHarmonyConfirmationValidationFixChangedFiles,
  personalVisualHarmonyGuidedAnalysisEntryChangedFiles,
  personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles,
  personalVisualHarmonyManualSegmentChangedFiles,
  personalVisualHarmonyMeasurementRatioClarityChangedFiles,
  personalVisualHarmonyMcpToolSchemaCompatibilityChangedFiles,
  personalVisualHarmonyOffFrameEllipseEditingChangedFiles,
  personalVisualHarmonyWidgetEllipseResponsiveChangedFiles,
  personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles,
  personalVisualHarmonyPostPr240TruthClosureChangedFiles,
  personalVisualHarmonyPerpendicularBisectorsChangedFiles,
  personalVisualHarmonyPerpendicularBisectorRegressionFixChangedFiles,
  personalVisualHarmonyPerpendicularBisectorGeometryFixChangedFiles,
  personalVisualHarmonyTruthSyncChangedFiles,
  permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
  permanentRemoteMcpRuntimeChangedFiles,
  remoteMcpRenderPrivateBetaDeploymentChangedFiles,
  statelessRemoteMcpCommercialBetaContractChangedFiles,
  statelessRemoteMcpCommercialBetaContractNonSemgrepMaintenanceChangedFiles,
  pr132ValidationHardeningCheckpointChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationContractChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  controlledLiveProviderDiagnosticNextActionsChangedFiles,
  controlledLiveProviderExperimentGateChangedFiles,
  controlledLiveProviderIncompleteResponseGuardChangedFiles,
  controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles,
  controlledLiveProviderSmokeArtifactProofChangedFiles,
  controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  controlledLiveProviderSmokeChangedFiles,
  controlledLiveProviderSmokeDiagnosticsChangedFiles,
  disabledLiveProviderExperimentHarnessChangedFiles,
  familyRatioPackMeaningSmokeChangedFiles,
  geometryHarmonyPackReportExamplesChangedFiles,
  guidedInspectionArtifactContractChangedFiles,
  guidedInspectionConsumerProofChangedFiles,
  guidedInspectionDemoArtifactContractWiringChangedFiles,
  guidedInspectionPackageRootApiExportsNonSemgrepMaintenanceChangedFiles,
  guidedInspectionPackageRootApiExportsChangedFiles,
  guidedInspectionPackageRootConsumerCompatibilityChangedFiles,
  guidedInspectionPackagePublicationReadinessChangedFiles,
  guidedInspectionPackageApiTarballHardeningChangedFiles,
  guidedInspectionPackageTarballLocalInstallReadinessNonSemgrepMaintenanceChangedFiles,
  guidedInspectionPackageTarballLocalInstallReadinessChangedFiles,
  guidedInspectionPackageApiReadinessGateChangedFiles,
  guardExactSetConsolidationChangedFiles,
  guardExactSetConsolidationNonSemgrepMaintenanceChangedFiles,
  integrationUnlockContractsChangedFiles,
  isExactChangedFileSet,
  isCleanBaseValidationContext,
  isExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet,
  localInspectionSurfaceOnboardingChangedFiles,
  localInspectionSurfaceStaticSafetyGuardChangedFiles,
  localGuidedInspectionDemoChangedFiles,
  localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  localVisualFixtureGuidedInspectionDemoChangedFiles,
  localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  localCliReportBoundaryFreezeChangedFiles,
  localTruthProjectionConsolidationSmokeChangedFiles,
  localStructuredAnalyzeDemoWorkflowSmokeNonSemgrepMaintenanceChangedFiles,
  localStructuredAnalyzeDemoWorkflowSmokeChangedFiles,
  localInspectionSurfaceBoundaryChangedFiles,
  localVisualPilotBoundaryChangedFiles,
  openaiVisionStyleEvidencePilotContractChangedFiles,
  localStructuredAnalyzeInspectionSurfaceChangedFiles,
  localStructuredAnalyzeProductSurfaceApprovalChangedFiles,
  localStructuredAnalyzeDemoSmokeChangedFiles,
  localStructuredAnalyzeReportKitChangedFiles,
  localStructuredAnalyzeReportKitScopeSummaryChangedFiles,
  packagePublicationCandidateWithoutPublishingChangedFiles,
  packageApiExportContractApprovalChangedFiles,
  postPr104VisualFixtureRoadmapTruthSyncChangedFiles,
  postPr82RoadmapTruthSyncChangedFiles,
  postPr86RoadmapTruthSyncChangedFiles,
  postPr92RoadmapTruthSyncChangedFiles,
  mcpProtocolContractLockV2ChangedFiles,
  postR25RoadmapTruthSyncChangedFiles,
  postR31RoadmapTruthSyncChangedFiles,
  postR14RoadmapCheckpointChangedFiles,
  publicApiContractFreezeChangedFiles,
  providerEvidenceReplayAdapterChangedFiles,
  ratioPackFamilyCatalogBoundaryChangedFiles,
  ratioPackAuthoringContractChangedFiles,
  ratioPackStrictContractChangedFiles,
  realExternalEvidencePilotReadinessGateChangedFiles,
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
  syntheticEvidenceAcceptanceDemoChangedFiles,
  syntheticEvidenceAcceptanceDemoNonSemgrepMaintenanceChangedFiles,
  syntheticExternalEvidenceAcceptanceBoundaryChangedFiles,
  syntheticExternalEvidenceAcceptanceProofChangedFiles,
  visualAdapterFixtureContractChangedFiles,
  visualAdapterStaticScenarioCorpusChangedFiles,
  visualAdapterStaticFixtureHandoffChangedFiles,
  visualFixtureGuidedInspectionConsumerProofChangedFiles,
} from "./changed-file-guard.mjs";

test("shared exact changed-file guard accepts the exact approved set", () => {
  assert.deepEqual(sharedExactApprovedChangedFiles(r7StructuredAnalyzeHardeningChangedFiles), r7StructuredAnalyzeHardeningChangedFiles);
});

test("declared image-plane measurement-ratio allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(declaredImagePlaneMeasurementRatiosChangedFiles),
    declaredImagePlaneMeasurementRatiosChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(declaredImagePlaneMeasurementRatiosChangedFiles.slice(1)),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([...declaredImagePlaneMeasurementRatiosChangedFiles, "src/index.ts"]),
    null,
  );
});

test("personal measurement-ratio clarity allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyMeasurementRatioClarityChangedFiles),
    personalVisualHarmonyMeasurementRatioClarityChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyMeasurementRatioClarityChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyMeasurementRatioClarityChangedFiles.filter(
          (file) => file !== missingFile,
        ),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyMeasurementRatioClarityChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal widget ellipse and responsive allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyWidgetEllipseResponsiveChangedFiles),
    personalVisualHarmonyWidgetEllipseResponsiveChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyWidgetEllipseResponsiveChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyWidgetEllipseResponsiveChangedFiles.filter(
          (file) => file !== missingFile,
        ),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyWidgetEllipseResponsiveChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal manual-segment escape-hatch allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyManualSegmentChangedFiles),
    personalVisualHarmonyManualSegmentChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyManualSegmentChangedFiles.slice(1)),
    null,
  );
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyManualSegmentChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal guided-analysis entry allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyGuidedAnalysisEntryChangedFiles),
    personalVisualHarmonyGuidedAnalysisEntryChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyGuidedAnalysisEntryChangedFiles.slice(1)),
    null,
  );
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "docs/examples/personal-chatgpt-visual-harmony-demo.md"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyGuidedAnalysisEntryChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal candidate-label layout allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyCandidateLabelLayoutChangedFiles),
    personalVisualHarmonyCandidateLabelLayoutChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyCandidateLabelLayoutChangedFiles.slice(1)),
    null,
  );
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyCandidateLabelLayoutChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal line-envelope canonicalization allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles),
    personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles.slice(1)),
    null,
  );
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal MCP tool-schema compatibility allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyMcpToolSchemaCompatibilityChangedFiles),
    personalVisualHarmonyMcpToolSchemaCompatibilityChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyMcpToolSchemaCompatibilityChangedFiles.slice(1)),
    null,
  );
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyMcpToolSchemaCompatibilityChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("personal off-frame ellipse editing allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyOffFrameEllipseEditingChangedFiles),
    personalVisualHarmonyOffFrameEllipseEditingChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyOffFrameEllipseEditingChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyOffFrameEllipseEditingChangedFiles.filter(
          (file) => file !== missingFile,
        ),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of ["src/index.ts", "package.json", "package-lock.json", "render.yaml"]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyOffFrameEllipseEditingChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("triangle angle-bisector allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyAngleBisectorsChangedFiles),
    personalVisualHarmonyAngleBisectorsChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyAngleBisectorsChangedFiles.slice(1)),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([...personalVisualHarmonyAngleBisectorsChangedFiles, "src/index.ts"]),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(["src/personal-visual-harmony-constructions.ts"]),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(["src/**", "tests/**"]),
    null,
  );
});

test("triangle altitude allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleAltitudesChangedFiles),
    personalVisualHarmonyTriangleAltitudesChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleAltitudesChangedFiles.slice(1)),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyTriangleAltitudesChangedFiles,
      "src/index.ts",
    ]),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(["src/personal-visual-harmony-constructions.ts"]),
    null,
  );
});

test("triangle centroid allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleCentroidChangedFiles),
    personalVisualHarmonyTriangleCentroidChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleCentroidChangedFiles.slice(1)),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyTriangleCentroidChangedFiles,
      "src/index.ts",
    ]),
    null,
  );
});

test("personal visual-harmony brand identity allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyBrandIdentityChangedFiles),
    personalVisualHarmonyBrandIdentityChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(
      personalVisualHarmonyBrandIdentityChangedFiles.filter(
        (file) => file !== "brand/design-preview.html",
      ),
    ),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyBrandIdentityChangedFiles,
      "src/index.ts",
    ]),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(["brand/**", "src/mcp/**", "tests/**"]),
    null,
  );
});

test("personal confirmation validation fix allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyConfirmationValidationFixChangedFiles),
    personalVisualHarmonyConfirmationValidationFixChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(
      personalVisualHarmonyConfirmationValidationFixChangedFiles.filter(
        (file) => file !== "tests/personal-visual-harmony-http.test.mjs",
      ),
    ),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyConfirmationValidationFixChangedFiles,
      "src/index.ts",
    ]),
    null,
  );
});

test("triangle request diagnostic allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles),
    personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(
      personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles.filter(
        (file) => file !== "tests/personal-visual-harmony-mcp.test.mjs",
      ),
    ),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles,
      "src/personal-visual-harmony-constructions.ts",
    ]),
    null,
  );
});

test("post-PR240 truth-closure allowlist is exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyPostPr240TruthClosureChangedFiles),
    personalVisualHarmonyPostPr240TruthClosureChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(
      personalVisualHarmonyPostPr240TruthClosureChangedFiles.filter(
        (file) => file !== "docs/decisions/2026-07-17-triangle-center-assessment.md",
      ),
    ),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyPostPr240TruthClosureChangedFiles,
      "src/index.ts",
    ]),
    null,
  );
});

test("shared exact changed-file guard accepts only the personal ChatGPT visual harmony demo set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoChangedFiles),
    personalChatGptVisualHarmonyDemoChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoChangedFiles.slice(1)), null);
  for (const extra of [
    "package.json",
    "render.yaml",
    "src/mcp/remote-http-auth.ts",
    "wiki/hot.md",
  ]) {
    assert.equal(sharedExactApprovedChangedFiles([...personalChatGptVisualHarmonyDemoChangedFiles, extra]), null);
  }
});

test("shared exact changed-file guard accepts only the 28-file personal ChatGPT visual harmony aggregate set", () => {
  const expectedAggregate = [
    ...personalChatGptVisualHarmonyDemoOriginalChangedFiles,
    "src/personal-visual-harmony-pixel-refinement.ts",
    "tests/fixtures/personal-visual-harmony-pixel-refinement/corpus-v1.json",
    "tests/personal-visual-harmony-pixel-refinement.test.mjs",
  ].sort();

  assert.equal(personalChatGptVisualHarmonyDemoChangedFiles.length, 28);
  assert.deepEqual(personalChatGptVisualHarmonyDemoChangedFiles, expectedAggregate);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoChangedFiles),
    personalChatGptVisualHarmonyDemoChangedFiles,
  );
  for (const missingFile of personalChatGptVisualHarmonyDemoChangedFiles) {
    const incompleteAggregate = personalChatGptVisualHarmonyDemoChangedFiles.filter(
      (file) => file !== missingFile,
    );
    assert.equal(
      isExactChangedFileSet(incompleteAggregate, personalChatGptVisualHarmonyDemoChangedFiles),
      false,
      missingFile,
    );
  }
  assert.equal(
    sharedExactApprovedChangedFiles(
      personalChatGptVisualHarmonyDemoChangedFiles.filter(
        (file) => file !== "src/harmonic-relationship-analysis.ts",
      ),
    ),
    null,
  );
  for (const extra of [
    "src/index.ts",
    "src/mcp/remote-http-auth.ts",
    "package.json",
    ".github/workflows/ci.yml",
    "wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalChatGptVisualHarmonyDemoChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard preserves the original personal ChatGPT visual harmony demo sets", () => {
  assert.equal(personalChatGptVisualHarmonyDemoOriginalChangedFiles.length, 25);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoOriginalChangedFiles),
    personalChatGptVisualHarmonyDemoOriginalChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoOriginalChangedFiles.slice(1)),
    null,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoOriginalNonSemgrepMaintenanceChangedFiles),
    personalChatGptVisualHarmonyDemoOriginalNonSemgrepMaintenanceChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalChatGptVisualHarmonyDemoOriginalNonSemgrepMaintenanceChangedFiles,
      "tests/unrelated.test.mjs",
    ]),
    null,
  );
});

test("shared exact changed-file guard accepts the semgrep-filtered personal ChatGPT visual harmony demo set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles),
    personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles.slice(1)),
    null,
  );
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles,
      "tests/unrelated.test.mjs",
    ]),
    null,
  );
});

test("shared exact changed-file guard accepts only the personal visual harmony image hydration set", () => {
  assert.equal(personalVisualHarmonyImageHydrationChangedFiles.length, 11);
  for (const requiredFile of [
    "src/mcp/personal-visual-harmony-app.ts",
    "tests/personal-visual-harmony-mcp.test.mjs",
  ]) {
    assert.equal(personalVisualHarmonyImageHydrationChangedFiles.includes(requiredFile), true);
  }
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyImageHydrationChangedFiles),
    personalVisualHarmonyImageHydrationChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(personalVisualHarmonyImageHydrationChangedFiles.slice(1)), null);
  assert.equal(
    sharedExactApprovedChangedFiles([
      ...personalVisualHarmonyImageHydrationChangedFiles,
      "package.json",
    ]),
    null,
  );
});

test("shared exact changed-file guard accepts only the personal visual harmony pixel refinement shadow set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyPixelRefinementShadowChangedFiles),
    personalVisualHarmonyPixelRefinementShadowChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(personalVisualHarmonyPixelRefinementShadowChangedFiles.slice(1)),
    null,
  );
  for (const extra of [
    "src/index.ts",
    "src/mcp/personal-visual-harmony-app.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony-pixel-refinement/user-image.png",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyPixelRefinementShadowChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the personal visual harmony pixel integration set", () => {
  assert.equal(personalVisualHarmonyPixelRefinementIntegrationChangedFiles.length, 15);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyPixelRefinementIntegrationChangedFiles),
    personalVisualHarmonyPixelRefinementIntegrationChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyPixelRefinementIntegrationChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyPixelRefinementIntegrationChangedFiles.filter(
          (file) => file !== missingFile,
        ),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony-pixel-refinement/user-image.png",
    ".github/workflows/ci.yml",
    "render.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyPixelRefinementIntegrationChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the rotated ellipse A/B truth-sync set", () => {
  assert.equal(personalVisualHarmonyTruthSyncChangedFiles.length, 10);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTruthSyncChangedFiles),
    personalVisualHarmonyTruthSyncChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyTruthSyncChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyTruthSyncChangedFiles.filter(
          (file) => file !== missingFile,
        ),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of [
    "src/mcp/personal-visual-harmony-app.ts",
    "src/personal-visual-harmony-pixel-refinement.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony-pixel-refinement/user-image.png",
    "render.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyTruthSyncChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the rotated ellipse pixel integration set", () => {
  assert.equal(personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles.length, 15);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles),
    personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles.filter(
          (file) => file !== missingFile,
        ),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony-pixel-refinement/user-image.png",
    ".github/workflows/ci.yml",
    "render.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the oblique and format construction set", () => {
  assert.equal(personalVisualHarmonyObliqueFormatConstructionsChangedFiles.length, 17);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyObliqueFormatConstructionsChangedFiles),
    personalVisualHarmonyObliqueFormatConstructionsChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyObliqueFormatConstructionsChangedFiles) {
    const approvedSubset = sharedExactApprovedChangedFiles(
      personalVisualHarmonyObliqueFormatConstructionsChangedFiles.filter(
        (file) => file !== missingFile,
      ),
    );
    if (missingFile === "docs/examples/personal-chatgpt-visual-harmony-demo.md") {
      assert.deepEqual(approvedSubset, personalVisualHarmonyTriangleAltitudesChangedFiles);
    } else {
      assert.equal(approvedSubset, null, missingFile);
    }
  }
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony/user-image.png",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyObliqueFormatConstructionsChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the junction-angle construction set", () => {
  assert.equal(personalVisualHarmonyJunctionAnglesChangedFiles.length, 17);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyJunctionAnglesChangedFiles),
    personalVisualHarmonyJunctionAnglesChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyJunctionAnglesChangedFiles) {
    const approvedSubset = sharedExactApprovedChangedFiles(
      personalVisualHarmonyJunctionAnglesChangedFiles.filter((file) => file !== missingFile),
    );
    if (missingFile === "docs/examples/personal-chatgpt-visual-harmony-demo.md") {
      assert.deepEqual(approvedSubset, personalVisualHarmonyTriangleAltitudesChangedFiles);
    } else {
      assert.equal(approvedSubset, null, missingFile);
    }
  }
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony/user-image.png",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyJunctionAnglesChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the rotated ellipse set", () => {
  assert.equal(personalVisualHarmonyRotatedEllipsesChangedFiles.length, 15);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyRotatedEllipsesChangedFiles),
    personalVisualHarmonyRotatedEllipsesChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyRotatedEllipsesChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        personalVisualHarmonyRotatedEllipsesChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
  for (const extra of [
    "src/index.ts",
    "src/personal-visual-harmony-pixel-refinement.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony/user-image.png",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyRotatedEllipsesChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the rotated ellipse pixel kernel set", () => {
  assert.equal(personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles.length, 13);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(
      personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
    ),
    personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles) {
    const approvedSubset = sharedExactApprovedChangedFiles(
      personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles
        .filter((file) => file !== missingFile),
    );
    if (missingFile === "src/personal-visual-harmony.ts") {
      assert.deepEqual(approvedSubset, personalVisualHarmonyPixelRefinementShadowChangedFiles);
    } else {
      assert.equal(
        approvedSubset,
        null,
        missingFile,
      );
    }
  }
  for (const extra of [
    "src/index.ts",
    "src/mcp/personal-visual-harmony-app.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony/user-image.png",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the triangle construction set", () => {
  assert.equal(personalVisualHarmonyTriangleConstructionsChangedFiles.length, 17);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleConstructionsChangedFiles),
    personalVisualHarmonyTriangleConstructionsChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyTriangleConstructionsChangedFiles) {
    const approvedSubset = sharedExactApprovedChangedFiles(
      personalVisualHarmonyTriangleConstructionsChangedFiles.filter(
        (file) => file !== missingFile,
      ),
    );
    if (missingFile === "docs/examples/personal-chatgpt-visual-harmony-demo.md") {
      assert.deepEqual(approvedSubset, personalVisualHarmonyTriangleAltitudesChangedFiles);
    } else {
      assert.equal(approvedSubset, null, missingFile);
    }
  }
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony/user-image.png",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyTriangleConstructionsChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the triangle median set", () => {
  assert.equal(personalVisualHarmonyTriangleMediansChangedFiles.length, 17);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(personalVisualHarmonyTriangleMediansChangedFiles),
    personalVisualHarmonyTriangleMediansChangedFiles,
  );
  for (const missingFile of personalVisualHarmonyTriangleMediansChangedFiles) {
    const approvedSubset = sharedExactApprovedChangedFiles(
      personalVisualHarmonyTriangleMediansChangedFiles.filter((file) => file !== missingFile),
    );
    if (missingFile === "docs/examples/personal-chatgpt-visual-harmony-demo.md") {
      assert.deepEqual(approvedSubset, personalVisualHarmonyTriangleAltitudesChangedFiles);
    } else {
      assert.equal(approvedSubset, null, missingFile);
    }
  }
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "tests/fixtures/personal-visual-harmony/user-image.png",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...personalVisualHarmonyTriangleMediansChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR133 private/dev ChatGPT MCP gate set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(privateDevChatGptMcpVisualPilotGateChangedFiles),
    privateDevChatGptMcpVisualPilotGateChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(privateDevChatGptMcpVisualPilotGateChangedFiles.slice(1)), null);
  for (const extra of [
    "src/mcp/http-server.ts", "src/chatgpt/connector.ts", "src/auth/oauth.ts", "src/providers/openai.ts",
    "src/index.ts", "package.json", "package-lock.json", ".github/workflows/ci.yml", "wiki/hot.md",
  ]) assert.equal(sharedExactApprovedChangedFiles([...privateDevChatGptMcpVisualPilotGateChangedFiles, extra]), null, extra);
});

test("shared exact changed-file guard accepts only the PR134 private/dev local visual MCP set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(privateDevLocalVisualMcpOrchestrationChangedFiles),
    privateDevLocalVisualMcpOrchestrationChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(privateDevLocalVisualMcpOrchestrationChangedFiles.slice(1)), null);
  for (const extra of [
    "src/mcp/stdio-protocol.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "src/providers/openai.ts",
    "src/chatgpt/connector.ts",
    "src/auth/oauth.ts",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...privateDevLocalVisualMcpOrchestrationChangedFiles, extra]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR135 private/dev ChatGPT MCP complete live proof set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(privateDevChatGptMcpCompleteLiveProofChangedFiles),
    privateDevChatGptMcpCompleteLiveProofChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(privateDevChatGptMcpCompleteLiveProofChangedFiles.slice(1)), null);
  for (const extra of [
    "src/mcp/http-server.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "src/providers/openai.ts",
    "src/chatgpt/connector.ts",
    "src/auth/oauth.ts",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...privateDevChatGptMcpCompleteLiveProofChangedFiles, extra]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR136 stateless remote MCP commercial beta contract set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(statelessRemoteMcpCommercialBetaContractChangedFiles),
    statelessRemoteMcpCommercialBetaContractChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(statelessRemoteMcpCommercialBetaContractChangedFiles.slice(1)),
    null,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(
      statelessRemoteMcpCommercialBetaContractNonSemgrepMaintenanceChangedFiles,
    ),
    statelessRemoteMcpCommercialBetaContractNonSemgrepMaintenanceChangedFiles,
  );
  for (const extra of [
    "src/mcp/http-server.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "src/providers/openai.ts",
    "src/chatgpt/connector.ts",
    "src/auth/oauth.ts",
    "render.yaml",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...statelessRemoteMcpCommercialBetaContractChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR137 permanent remote MCP runtime set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(permanentRemoteMcpRuntimeChangedFiles),
    permanentRemoteMcpRuntimeChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(permanentRemoteMcpRuntimeChangedFiles.slice(1)), null);
  for (const extra of [
    "src/index.ts",
    "src/providers/openai.ts",
    "src/chatgpt/connector.ts",
    "render.yaml",
    ".env",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...permanentRemoteMcpRuntimeChangedFiles, extra]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR137A quota isolation hotfix set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(permanentRemoteMcpQuotaIsolationHotfixChangedFiles),
    permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(permanentRemoteMcpQuotaIsolationHotfixChangedFiles.slice(1)),
    null,
  );
  for (const extra of [
    "src/mcp/remote-http-auth.ts",
    "src/mcp/remote-http-server.ts",
    "package.json",
    "render.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR138 Render private-beta package set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(remoteMcpRenderPrivateBetaDeploymentChangedFiles),
    remoteMcpRenderPrivateBetaDeploymentChangedFiles,
  );
  assert.equal(
    sharedExactApprovedChangedFiles(remoteMcpRenderPrivateBetaDeploymentChangedFiles.slice(1)),
    null,
  );
  for (const extra of [
    "src/mcp/remote-http-server.ts",
    "package.json",
    "package-lock.json",
    ".env",
    ".github/workflows/deploy.yml",
    "src/providers/openai.ts",
    "src/chatgpt/connector.ts",
    "../norma-core-wiki/wiki/hot.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...remoteMcpRenderPrivateBetaDeploymentChangedFiles,
        extra,
      ]),
      null,
      extra,
    );
  }
});

test("shared exact changed-file guard accepts only the PR132 hardening checkpoint set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(pr132ValidationHardeningCheckpointChangedFiles),
    pr132ValidationHardeningCheckpointChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(pr132ValidationHardeningCheckpointChangedFiles.slice(1)), null);
  for (const extra of [
    "src/mcp/http-server.ts", "src/chatgpt/connector.ts", "src/providers/openai.ts",
    "src/index.ts", "package.json", "package-lock.json", "wiki/hot.md",
  ]) assert.equal(sharedExactApprovedChangedFiles([...pr132ValidationHardeningCheckpointChangedFiles, extra]), null, extra);
});

test("shared exact changed-file guard accepts the PR81 AcceptedGeometry-to-Core mapper set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryToCoreMapperChangedFiles),
    acceptedGeometryToCoreMapperChangedFiles,
  );
});

test("shared exact changed-file guard accepts the semgrep-filtered PR81 mapper set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryToCoreMapperNonSemgrepMaintenanceChangedFiles),
    acceptedGeometryToCoreMapperNonSemgrepMaintenanceChangedFiles,
  );
});

test("shared exact changed-file guard accepts the PR81 mapper review-fix set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryToCoreMapperReviewFixesChangedFiles),
    acceptedGeometryToCoreMapperReviewFixesChangedFiles,
  );
});

test("shared exact changed-file guard accepts the PR102 visual adapter fixture contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(visualAdapterFixtureContractChangedFiles),
    visualAdapterFixtureContractChangedFiles,
  );

  assert.deepEqual(visualAdapterFixtureContractChangedFiles, [
    "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/visual-adapter-fixture-contract.test.mjs",
  ]);
});

test("shared exact changed-file guard accepts the PR103 visual adapter static fixture handoff set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(visualAdapterStaticFixtureHandoffChangedFiles),
    visualAdapterStaticFixtureHandoffChangedFiles,
  );

  assert.deepEqual(visualAdapterStaticFixtureHandoffChangedFiles, [
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/fixtures/visual-adapter/static-handoff-proof-v1.json",
    "tests/visual-adapter-static-fixture-handoff.test.mjs",
  ]);
});

test("shared exact changed-file guard accepts the PR104 local visual fixture guided inspection demo set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualFixtureGuidedInspectionDemoChangedFiles),
    localVisualFixtureGuidedInspectionDemoChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles),
    localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(localVisualFixtureGuidedInspectionDemoChangedFiles, [
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "docs/examples/local-visual-fixture-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);
  assert.deepEqual(localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles, [
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "docs/examples/local-visual-fixture-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);
});

test("shared exact changed-file guard accepts the PR105 post-PR104 visual fixture roadmap truth sync set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postPr104VisualFixtureRoadmapTruthSyncChangedFiles),
    postPr104VisualFixtureRoadmapTruthSyncChangedFiles,
  );

  assert.deepEqual(postPr104VisualFixtureRoadmapTruthSyncChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/post-pr104-visual-fixture-roadmap-truth-sync.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      postPr104VisualFixtureRoadmapTruthSyncChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR106 visual fixture guided inspection consumer proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(visualFixtureGuidedInspectionConsumerProofChangedFiles),
    visualFixtureGuidedInspectionConsumerProofChangedFiles,
  );

  assert.deepEqual(visualFixtureGuidedInspectionConsumerProofChangedFiles, [
    "src/local-report/visual-fixture-guided-inspection-consumer-proof.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/visual-fixture-guided-inspection-consumer-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/local-report/visual-fixture-guided-inspection-consumer-proof.ts",
    "tests/visual-fixture-guided-inspection-consumer-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        visualFixtureGuidedInspectionConsumerProofChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR106 visual fixture consumer proof set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md",
    "../norma-core-wiki/wiki/hot.md",
    "tests/fixtures/visual-adapter/static-handoff-proof-v1.json",
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/ci.yml",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/providers/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/package-publication.ts",
    "src/publication/npm.ts",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...visualFixtureGuidedInspectionConsumerProofChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR107 static visual scenario corpus set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(visualAdapterStaticScenarioCorpusChangedFiles),
    visualAdapterStaticScenarioCorpusChangedFiles,
  );

  assert.deepEqual(visualAdapterStaticScenarioCorpusChangedFiles, [
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/fixtures/visual-adapter/static-scenario-corpus-v1.json",
    "tests/visual-adapter-static-scenario-corpus.test.mjs",
  ]);

  for (const missingFile of [
    "tests/fixtures/visual-adapter/static-scenario-corpus-v1.json",
    "tests/visual-adapter-static-scenario-corpus.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        visualAdapterStaticScenarioCorpusChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR107 static visual scenario corpus set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/local-report/visual-fixture-guided-inspection-consumer-proof.ts",
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "tests/fixtures/visual-adapter/static-handoff-proof-v1.json",
    "tests/fixtures/visual-adapter/source-image.png",
    "tests/fixtures/visual-adapter/raw/source.png",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/ci.yml",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/providers/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/publication/npm.ts",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
    "tests/fixtures/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...visualAdapterStaticScenarioCorpusChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR108 local visual pilot boundary set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualPilotBoundaryChangedFiles),
    localVisualPilotBoundaryChangedFiles,
  );

  assert.deepEqual(localVisualPilotBoundaryChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-07-local-visual-pilot-boundary.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-visual-pilot-boundary.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-07-local-visual-pilot-boundary.md",
    "tests/local-visual-pilot-boundary.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        localVisualPilotBoundaryChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package wiki hosted ChatGPT CAD Figma extras in the PR108 set", () => {
  const forbiddenFiles = [
    "tests/fixtures/visual-adapter/static-scenario-corpus-v1.json",
    "tests/fixtures/visual-adapter/new-real-provider-fixture.json",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "viewer/read-only-result-viewer.html",
    "bin/norma-core-mcp-http.mjs",
    "docs/examples/openai-vision-pilot.md",
    "docs/decisions/2026-07-08-openai-vision-pilot-contract.md",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
    "tests/fixtures/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localVisualPilotBoundaryChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR109 OpenAI vision-style evidence pilot contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(openaiVisionStyleEvidencePilotContractChangedFiles),
    openaiVisionStyleEvidencePilotContractChangedFiles,
  );

  assert.deepEqual(openaiVisionStyleEvidencePilotContractChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-07-openai-vision-style-evidence-pilot-contract.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/openai-vision-style-evidence-pilot-contract.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-07-openai-vision-style-evidence-pilot-contract.md",
    "tests/openai-vision-style-evidence-pilot-contract.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        openaiVisionStyleEvidencePilotContractChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR110 synthetic external evidence acceptance boundary set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(syntheticExternalEvidenceAcceptanceBoundaryChangedFiles),
    syntheticExternalEvidenceAcceptanceBoundaryChangedFiles,
  );

  assert.deepEqual(syntheticExternalEvidenceAcceptanceBoundaryChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-synthetic-external-evidence-acceptance-boundary.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
    "tests/synthetic-external-evidence-acceptance-boundary.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-08-synthetic-external-evidence-acceptance-boundary.md",
    "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
    "tests/synthetic-external-evidence-acceptance-boundary.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        syntheticExternalEvidenceAcceptanceBoundaryChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR110 synthetic boundary set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "docs/examples/synthetic-external-evidence.md",
    "docs/decisions/2026-07-08-provider-sdk-contract.md",
    "tests/fixtures/visual-adapter/openai-response.json",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...syntheticExternalEvidenceAcceptanceBoundaryChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR111 synthetic evidence acceptance proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(syntheticExternalEvidenceAcceptanceProofChangedFiles),
    syntheticExternalEvidenceAcceptanceProofChangedFiles,
  );

  assert.deepEqual(syntheticExternalEvidenceAcceptanceProofChangedFiles, [
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        syntheticExternalEvidenceAcceptanceProofChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard accepts only the PR129 controlled local live visual candidate demo set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLocalLiveVisualCandidateObservationDemoChangedFiles),
    controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  );
  assert.deepEqual(controlledLocalLiveVisualCandidateObservationDemoChangedFiles, [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
    "src/local-report/controlled-local-live-visual-candidate-observation-contracts.ts",
    "src/local-report/controlled-local-live-visual-candidate-observation-demo.ts",
    "src/local-report/controlled-provider-observation-acceptance-proof.ts",
    "src/local-report/controlled-provider-observation-contract.ts",
    "src/local-report/controlled-provider-observation-to-core-handoff.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-local-live-visual-candidate-observation-demo.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/controlled-provider-observation-to-core-handoff.test.mjs",
    "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "src/index.ts",
    "src/geometry-observation.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/structured-composition-analysis.ts",
    "src/providers/openai.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "../norma-core-wiki/wiki/hot.md",
    "src/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR125 controlled provider observation acceptance proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationAcceptanceProofChangedFiles),
    controlledProviderObservationAcceptanceProofChangedFiles,
  );

  assert.deepEqual(controlledProviderObservationAcceptanceProofChangedFiles, [
    "src/local-report/controlled-provider-observation-acceptance-proof.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/mcp-remote-package-dependency-decision.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/local-report/controlled-provider-observation-acceptance-proof.ts",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledProviderObservationAcceptanceProofChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR125 proof set", () => {
  for (const forbiddenFile of [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-09-controlled-provider-observation-acceptance-proof.md",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/geometry-observation.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/controlled-provider/result.json",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
    ".github/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledProviderObservationAcceptanceProofChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR126 controlled provider observation-to-Core handoff set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationToCoreHandoffChangedFiles),
    controlledProviderObservationToCoreHandoffChangedFiles,
  );

  assert.deepEqual(controlledProviderObservationToCoreHandoffChangedFiles, [
    "src/local-report/controlled-provider-observation-to-core-handoff.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/controlled-provider-observation-to-core-handoff.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of controlledProviderObservationToCoreHandoffChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledProviderObservationToCoreHandoffChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR126 handoff set", () => {
  for (const forbiddenFile of [
    "tests/mcp-remote-package-dependency-decision.test.mjs",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/geometry-observation.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/controlled-provider/result.json",
    ".github/workflows/ci.yml",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/deploy/hosted-mcp.ts",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
    "tests/fixtures/**",
    ".github/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledProviderObservationToCoreHandoffChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the triggered PR127 local visual observation-to-Core pilot contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualObservationToCorePilotContractChangedFiles),
    localVisualObservationToCorePilotContractChangedFiles,
  );
  assert.deepEqual(localVisualObservationToCorePilotContractChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-10-local-visual-observation-to-core-pilot-contract.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/controlled-provider-observation-to-core-handoff.test.mjs",
    "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of localVisualObservationToCorePilotContractChangedFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        localVisualObservationToCorePilotContractChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR128 explicit accepted handoff set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(explicitAcceptedObservationToCoreHandoffChangedFiles),
    explicitAcceptedObservationToCoreHandoffChangedFiles,
  );
  assert.deepEqual(explicitAcceptedObservationToCoreHandoffChangedFiles, [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/local-report/controlled-provider-observation-to-core-handoff.ts",
    "tests/accepted-geometry-to-core-mapping.test.mjs",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-acceptance-proof.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/controlled-provider-observation-to-core-handoff.test.mjs",
    "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
});

test("shared exact changed-file guard rejects forbidden extras in the PR127 pilot contract set", () => {
  for (const forbiddenFile of [
    "src/local-report/controlled-provider-observation-to-core-handoff.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/geometry-observation.ts",
    "src/index.ts",
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "tests/fixtures/provider-response.json",
    "examples/local-live-visual-pilot.json",
    "viewer/read-only-result-viewer.html",
    "reports/local-live-visual/result.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "src/providers/openai.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "bin/**",
    "tests/**",
    "docs/**",
    ".github/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localVisualObservationToCorePilotContractChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR111 synthetic proof set", () => {
  const forbiddenFiles = [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-synthetic-external-evidence-acceptance-boundary.md",
    "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...syntheticExternalEvidenceAcceptanceProofChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR112 synthetic evidence acceptance demo set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(syntheticEvidenceAcceptanceDemoChangedFiles),
    syntheticEvidenceAcceptanceDemoChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(syntheticEvidenceAcceptanceDemoNonSemgrepMaintenanceChangedFiles),
    syntheticEvidenceAcceptanceDemoNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(syntheticEvidenceAcceptanceDemoChangedFiles, [
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/local-synthetic-evidence-acceptance-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/synthetic-evidence-acceptance-demo.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
  assert.deepEqual(syntheticEvidenceAcceptanceDemoNonSemgrepMaintenanceChangedFiles, [
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/local-synthetic-evidence-acceptance-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/synthetic-evidence-acceptance-demo.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/local-synthetic-evidence-acceptance-demo.md",
    "tests/synthetic-evidence-acceptance-demo.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        syntheticEvidenceAcceptanceDemoChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR112 synthetic evidence demo set", () => {
  const forbiddenFiles = [
    "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
    "src/structured-composition-analysis.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "docs/examples/synthetic-external-evidence.md",
    "viewer/read-only-result-viewer.html",
    "src/local-report/visual-viewer.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...syntheticEvidenceAcceptanceDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR113 real external evidence pilot readiness gate set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(realExternalEvidencePilotReadinessGateChangedFiles),
    realExternalEvidencePilotReadinessGateChangedFiles,
  );

  assert.deepEqual(realExternalEvidencePilotReadinessGateChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/real-external-evidence-pilot-readiness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
    "tests/real-external-evidence-pilot-readiness.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        realExternalEvidencePilotReadinessGateChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR113 readiness gate set", () => {
  const forbiddenFiles = [
    "src/structured-composition-analysis.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/index.ts",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "bin/norma-cli.mjs",
    "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
    "tests/fixtures/visual-adapter/openai-response.json",
    "tests/fixtures/provider/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "docs/examples/openai-vision-pilot.md",
    "docs/examples/local-synthetic-evidence-acceptance-demo.md",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...realExternalEvidencePilotReadinessGateChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR114 provider evidence replay adapter set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(providerEvidenceReplayAdapterChangedFiles),
    providerEvidenceReplayAdapterChangedFiles,
  );

  assert.deepEqual(providerEvidenceReplayAdapterChangedFiles, [
    "src/provider-evidence-replay-adapter.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "tests/provider-evidence-replay-adapter.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/provider-evidence-replay-adapter.ts",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "tests/provider-evidence-replay-adapter.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(providerEvidenceReplayAdapterChangedFiles.filter((file) => file !== missingFile)),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package public and wiki extras in the PR114 set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/structured-composition-analysis.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "bin/norma-cli.mjs",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/examples/openai-vision-pilot.md",
    "docs/decisions/2026-07-08-provider-sdk-contract.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...providerEvidenceReplayAdapterChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR115 controlled live provider experiment gate set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderExperimentGateChangedFiles),
    controlledLiveProviderExperimentGateChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderExperimentGateChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-experiment-gate.md",
    "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-experiment-gate.test.mjs",
    "tests/real-external-evidence-pilot-readiness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-08-controlled-live-provider-experiment-gate.md",
    "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
    "tests/controlled-live-provider-experiment-gate.test.mjs",
    "tests/real-external-evidence-pilot-readiness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderExperimentGateChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package MCP ChatGPT CAD Figma wiki and dependency extras in the PR115 set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/structured-composition-analysis.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "bin/norma-core-live-provider-experiment.mjs",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "bin/norma-cli.mjs",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "docs/examples/openai-vision-pilot.md",
    "docs/decisions/2026-07-08-provider-sdk-contract.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLiveProviderExperimentGateChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR116 disabled live provider experiment harness set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(disabledLiveProviderExperimentHarnessChangedFiles),
    disabledLiveProviderExperimentHarnessChangedFiles,
  );

  assert.deepEqual(disabledLiveProviderExperimentHarnessChangedFiles, [
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-disabled-local-live-provider-experiment-harness.md",
    "src/local-report/disabled-live-provider-experiment-harness.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/disabled-live-provider-experiment-harness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "docs/decisions/2026-07-08-disabled-local-live-provider-experiment-harness.md",
    "src/local-report/disabled-live-provider-experiment-harness.ts",
    "tests/disabled-live-provider-experiment-harness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        disabledLiveProviderExperimentHarnessChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package public fixture and integration extras in the PR116 set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "bin/norma-core-live-provider-experiment.mjs",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/disabled-local-live-provider-experiment-harness.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...disabledLiveProviderExperimentHarnessChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR117 controlled live provider smoke set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeChangedFiles),
    controlledLiveProviderSmokeChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderSmokeChangedFiles, [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      isExactChangedFileSet(
        controlledLiveProviderSmokeChangedFiles.filter((file) => file !== missingFile),
        controlledLiveProviderSmokeChangedFiles,
      ),
      false,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package public fixture and integration extras in the PR117 set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/controlled-live-provider-smoke.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "tests/disabled-live-provider-experiment-harness.test.mjs",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLiveProviderSmokeChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR118 controlled live provider smoke diagnostics set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeDiagnosticsChangedFiles),
    controlledLiveProviderSmokeDiagnosticsChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderSmokeDiagnosticsChangedFiles, [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      isExactChangedFileSet(
        controlledLiveProviderSmokeDiagnosticsChangedFiles.filter((file) => file !== missingFile),
        controlledLiveProviderSmokeDiagnosticsChangedFiles,
      ),
      false,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package wiki hosted ChatGPT MCP CAD Figma extras in the PR118 set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/provider/openai-response-parser.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/controlled-live-provider-smoke.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    ".npmrc",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLiveProviderSmokeDiagnosticsChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR119 input compatibility diagnostics set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles),
    controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
  assert.equal(
    controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles.includes(
      "bin/norma-core-controlled-live-provider-smoke.mjs",
    ),
    false,
  );

  for (const missingFile of [
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider request-body and fixture extras in the PR119 set", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/provider/openai-response-parser.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/controlled-live-provider-smoke.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    ".npmrc",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR120 controlled live provider diagnostic next-actions set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderDiagnosticNextActionsChangedFiles),
    controlledLiveProviderDiagnosticNextActionsChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderDiagnosticNextActionsChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
  assert.equal(
    controlledLiveProviderDiagnosticNextActionsChangedFiles.includes(
      "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
    ),
    true,
  );
  assert.equal(
    controlledLiveProviderDiagnosticNextActionsChangedFiles.includes(
      "bin/norma-core-controlled-live-provider-smoke.mjs",
    ),
    false,
  );

  for (const missingFile of [
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/controlled-live-provider-smoke.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderDiagnosticNextActionsChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR120 diagnostic next-actions set", () => {
  const forbiddenFiles = [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/local-report/controlled-live-provider-runtime.ts",
    "src/providers/openai.ts",
    "src/providers/openai-sdk.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/provider/openai-response-parser.ts",
    "src/provider-runtime/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "docs/examples/controlled-live-provider-smoke.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    ".npmrc",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    const changedFiles = [
      ...controlledLiveProviderDiagnosticNextActionsChangedFiles,
      forbiddenFile,
    ];
    assert.equal(
      isExactChangedFileSet(changedFiles, controlledLiveProviderDiagnosticNextActionsChangedFiles),
      false,
      forbiddenFile,
    );
    if (forbiddenFile === "bin/norma-core-controlled-live-provider-smoke.mjs") {
      assert.deepEqual(
        sharedExactApprovedChangedFiles(changedFiles),
        controlledLiveProviderSmokeDiagnosticsChangedFiles,
      );
      continue;
    }

    assert.equal(
      sharedExactApprovedChangedFiles(changedFiles),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR121 controlled live provider smoke outcome checkpoint set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeOutcomeCheckpointChangedFiles),
    controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderSmokeOutcomeCheckpointChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-outcome-checkpoint.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/controlled-live-provider-smoke-outcome-checkpoint.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderSmokeOutcomeCheckpointChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR121 smoke outcome checkpoint set", () => {
  const forbiddenFiles = [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/local-report/controlled-live-provider-runtime.ts",
    "src/providers/openai.ts",
    "src/providers/openai-sdk.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/provider/openai-response-parser.ts",
    "src/provider-runtime/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "docs/examples/controlled-live-provider-smoke.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    ".npmrc",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    const changedFiles = [
      ...controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
      forbiddenFile,
    ];
    assert.equal(
      isExactChangedFileSet(changedFiles, controlledLiveProviderSmokeOutcomeCheckpointChangedFiles),
      false,
      forbiddenFile,
    );
    assert.equal(
      sharedExactApprovedChangedFiles(changedFiles),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR122 controlled live provider incomplete-response guard set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderIncompleteResponseGuardChangedFiles),
    controlledLiveProviderIncompleteResponseGuardChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderIncompleteResponseGuardChangedFiles, [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderIncompleteResponseGuardChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR122 incomplete-response guard set", () => {
  const forbiddenFiles = [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "docs/examples/controlled-live-provider-smoke.md",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/local-report/controlled-live-provider-runtime.ts",
    "src/providers/openai.ts",
    "src/providers/openai-sdk.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/provider/openai-response-parser.ts",
    "src/provider-runtime/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    ".npmrc",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    const changedFiles = [
      ...controlledLiveProviderIncompleteResponseGuardChangedFiles,
      forbiddenFile,
    ];
    assert.equal(
      isExactChangedFileSet(changedFiles, controlledLiveProviderIncompleteResponseGuardChangedFiles),
      false,
      forbiddenFile,
    );
    assert.equal(
      sharedExactApprovedChangedFiles(changedFiles),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR123 controlled live provider smoke artifact proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeArtifactProofChangedFiles),
    controlledLiveProviderSmokeArtifactProofChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderSmokeArtifactProofChangedFiles, [
    "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderSmokeArtifactProofChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard accepts the controlled live provider response-status guard set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeResponseStatusGuardChangedFiles),
    controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  );

  assert.deepEqual(controlledLiveProviderSmokeResponseStatusGuardChangedFiles, [
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledLiveProviderSmokeResponseStatusGuardChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the response-status guard set", () => {
  const forbiddenFiles = [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/providers/openai.ts",
    "src/provider-runtime/openai.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    const changedFiles = [
      ...controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
      forbiddenFile,
    ];
    assert.equal(
      isExactChangedFileSet(changedFiles, controlledLiveProviderSmokeResponseStatusGuardChangedFiles),
      false,
      forbiddenFile,
    );
    assert.equal(sharedExactApprovedChangedFiles(changedFiles), null, forbiddenFile);
  }
});

test("shared exact changed-file guard accepts the PR124 controlled provider observation contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationContractChangedFiles),
    controlledProviderObservationContractChangedFiles,
  );

  assert.deepEqual(controlledProviderObservationContractChangedFiles, [
    "src/local-report/controlled-provider-observation-contract.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/mcp-remote-package-dependency-decision.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  for (const missingFile of [
    "src/local-report/controlled-provider-observation-contract.ts",
    "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/controlled-provider-observation-contract.test.mjs",
    "tests/mcp-remote-package-dependency-decision.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        controlledProviderObservationContractChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR124 observation contract set", () => {
  for (const forbiddenFile of [
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "src/index.ts",
    "src/local-report/controlled-live-provider-smoke.ts",
    "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...controlledProviderObservationContractChangedFiles, forbiddenFile]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard recognizes active controlled provider observation proof branches", () => {
  const changedFiles = activeControlledProviderObservationProofChangedFiles();
  const isCleanBase = isCleanBaseValidationContext();
  const isDeclaredImagePlaneMeasurementRatiosSet = isExactChangedFileSet(
    changedFiles,
    declaredImagePlaneMeasurementRatiosChangedFiles,
  );
  const isPersonalVisualHarmonyWidgetEllipseResponsiveSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyWidgetEllipseResponsiveChangedFiles,
  );
  const isPersonalVisualHarmonyManualSegmentSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyManualSegmentChangedFiles,
  );
  const isPersonalVisualHarmonyGuidedAnalysisEntrySet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyGuidedAnalysisEntryChangedFiles,
  );
  const isPersonalVisualHarmonyCandidateLabelLayoutSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyCandidateLabelLayoutChangedFiles,
  );
  const isPersonalVisualHarmonyLineEnvelopeCanonicalizationSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles,
  );
  const isPersonalVisualHarmonyOffFrameEllipseEditingSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyOffFrameEllipseEditingChangedFiles,
  );
  const isPersonalVisualHarmonyBrandIdentitySet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyBrandIdentityChangedFiles,
  );
  const isPersonalVisualHarmonyTruthSyncSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyTruthSyncChangedFiles,
  );
  const isPersonalVisualHarmonyTriangleRequestDiagnosticsSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles,
  );
  const isPersonalVisualHarmonyPostPr240TruthClosureSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyPostPr240TruthClosureChangedFiles,
  );
  const isPersonalVisualHarmonyTriangleCentroidSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyTriangleCentroidChangedFiles,
  );
  const isPersonalVisualHarmonyConfirmationValidationFixSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyConfirmationValidationFixChangedFiles,
  );
  const isPersonalVisualHarmonyTriangleMediansSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyTriangleMediansChangedFiles,
  );
  const isPersonalVisualHarmonyPerpendicularBisectorsSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyPerpendicularBisectorsChangedFiles,
  );
  const isPersonalVisualHarmonyAngleBisectorsSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyAngleBisectorsChangedFiles,
  );
  const isPersonalVisualHarmonyTriangleAltitudesSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyTriangleAltitudesChangedFiles,
  );
  const isPersonalVisualHarmonyPerpendicularBisectorRegressionFixSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyPerpendicularBisectorRegressionFixChangedFiles,
  );
  const isPersonalVisualHarmonyPerpendicularBisectorGeometryFixSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyPerpendicularBisectorGeometryFixChangedFiles,
  );
  const isPersonalVisualHarmonyImageHydrationSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyImageHydrationChangedFiles,
  );
  const isPersonalVisualHarmonyPixelRefinementShadowSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyPixelRefinementShadowChangedFiles,
  );
  const isPersonalVisualHarmonyPixelRefinementIntegrationSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyPixelRefinementIntegrationChangedFiles,
  );
  const isPersonalVisualHarmonyObliqueFormatConstructionsSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyObliqueFormatConstructionsChangedFiles,
  );
  const isPersonalVisualHarmonyJunctionAnglesSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyJunctionAnglesChangedFiles,
  );
  const isPersonalVisualHarmonyRotatedEllipsesSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyRotatedEllipsesChangedFiles,
  );
  const isPersonalVisualHarmonyRotatedEllipsePixelRefinementKernelSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
  );
  const isPersonalVisualHarmonyRotatedEllipsePixelIntegrationSet = isExactChangedFileSet(
    changedFiles,
    personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles,
  );
  const isPersonalVisualHarmonySet = isExactChangedFileSet(
    changedFiles,
    personalChatGptVisualHarmonyDemoChangedFiles,
  );
  const isPr138Set = isExactChangedFileSet(
    changedFiles,
    remoteMcpRenderPrivateBetaDeploymentChangedFiles,
  );
  const isPr137aSet = isExactChangedFileSet(
    changedFiles,
    permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
  );
  const isPr137Set = isExactChangedFileSet(changedFiles, permanentRemoteMcpRuntimeChangedFiles);
  const isPr136Set = isExactChangedFileSet(
    changedFiles,
    statelessRemoteMcpCommercialBetaContractChangedFiles,
  );
  const isPr135Set = isExactChangedFileSet(changedFiles, privateDevChatGptMcpCompleteLiveProofChangedFiles);
  const isPr134Set = isExactChangedFileSet(changedFiles, privateDevLocalVisualMcpOrchestrationChangedFiles);
  const isPr132HardeningSet = isExactChangedFileSet(changedFiles, pr132ValidationHardeningCheckpointChangedFiles);
  const isPr133Set = isExactChangedFileSet(changedFiles, privateDevChatGptMcpVisualPilotGateChangedFiles);
  const isPr132Set = isExactChangedFileSet(changedFiles, localVisualCandidateReviewChangedFiles);
  const isPr131Set = isExactChangedFileSet(changedFiles, localVisualCandidateReviewProductSurfaceChangedFiles);
  const isPr130Set = isExactChangedFileSet(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
  const isPr129Set = isExactChangedFileSet(changedFiles, controlledLocalLiveVisualCandidateObservationDemoChangedFiles);
  const isPr128Set = isExactChangedFileSet(changedFiles, explicitAcceptedObservationToCoreHandoffChangedFiles);
  const isPr124Set = isExactChangedFileSet(changedFiles, controlledProviderObservationContractChangedFiles);
  const isPr125Set = isExactChangedFileSet(
    changedFiles,
    controlledProviderObservationAcceptanceProofChangedFiles,
  );
  const isPr126Set = isExactChangedFileSet(
    changedFiles,
    controlledProviderObservationToCoreHandoffChangedFiles,
  );
  const isPr127Set = isExactChangedFileSet(
    changedFiles,
    localVisualObservationToCorePilotContractChangedFiles,
  );

  assert.equal(isCleanBase || isDeclaredImagePlaneMeasurementRatiosSet || isPersonalVisualHarmonyCandidateLabelLayoutSet || isPersonalVisualHarmonyGuidedAnalysisEntrySet || isPersonalVisualHarmonyLineEnvelopeCanonicalizationSet || isPersonalVisualHarmonyManualSegmentSet || isPersonalVisualHarmonyOffFrameEllipseEditingSet || isPersonalVisualHarmonyWidgetEllipseResponsiveSet || isPersonalVisualHarmonyBrandIdentitySet || isPersonalVisualHarmonyTruthSyncSet || isPersonalVisualHarmonyTriangleRequestDiagnosticsSet || isPersonalVisualHarmonyPostPr240TruthClosureSet || isPersonalVisualHarmonyTriangleCentroidSet || isPersonalVisualHarmonyConfirmationValidationFixSet || isPersonalVisualHarmonyTriangleMediansSet || isPersonalVisualHarmonyPerpendicularBisectorsSet || isPersonalVisualHarmonyAngleBisectorsSet || isPersonalVisualHarmonyTriangleAltitudesSet || isPersonalVisualHarmonyPerpendicularBisectorRegressionFixSet || isPersonalVisualHarmonyPerpendicularBisectorGeometryFixSet || isPersonalVisualHarmonyRotatedEllipsePixelIntegrationSet || isPersonalVisualHarmonyRotatedEllipsePixelRefinementKernelSet || isPersonalVisualHarmonyRotatedEllipsesSet || isPersonalVisualHarmonyJunctionAnglesSet || isPersonalVisualHarmonyObliqueFormatConstructionsSet || isPersonalVisualHarmonyPixelRefinementIntegrationSet || isPersonalVisualHarmonyPixelRefinementShadowSet || isPersonalVisualHarmonyImageHydrationSet || isPersonalVisualHarmonySet || isPr124Set || isPr125Set || isPr126Set || isPr127Set || isPr128Set || isPr129Set || isPr130Set || isPr131Set || isPr132Set || isPr133Set || isPr132HardeningSet || isPr134Set || isPr135Set || isPr136Set || isPr137Set || isPr137aSet || isPr138Set, true);
  if (isCleanBase) {
    assert.deepEqual(changedFiles, []);
    assert.equal(sharedExactApprovedChangedFiles(changedFiles), null);
    return;
  }
  assert.deepEqual(
    sharedExactApprovedChangedFiles(changedFiles),
    isDeclaredImagePlaneMeasurementRatiosSet
      ? declaredImagePlaneMeasurementRatiosChangedFiles
      : isPersonalVisualHarmonyCandidateLabelLayoutSet
      ? personalVisualHarmonyCandidateLabelLayoutChangedFiles
      : isPersonalVisualHarmonyGuidedAnalysisEntrySet
      ? personalVisualHarmonyGuidedAnalysisEntryChangedFiles
      : isPersonalVisualHarmonyLineEnvelopeCanonicalizationSet
      ? personalVisualHarmonyLineEnvelopeCanonicalizationChangedFiles
      : isPersonalVisualHarmonyManualSegmentSet
      ? personalVisualHarmonyManualSegmentChangedFiles
      : isPersonalVisualHarmonyOffFrameEllipseEditingSet
      ? personalVisualHarmonyOffFrameEllipseEditingChangedFiles
      : isPersonalVisualHarmonyWidgetEllipseResponsiveSet
      ? personalVisualHarmonyWidgetEllipseResponsiveChangedFiles
      : isPersonalVisualHarmonyBrandIdentitySet
      ? personalVisualHarmonyBrandIdentityChangedFiles
      : isPersonalVisualHarmonyTruthSyncSet
      ? personalVisualHarmonyTruthSyncChangedFiles
      : isPersonalVisualHarmonyTriangleRequestDiagnosticsSet
      ? personalVisualHarmonyTriangleRequestDiagnosticsChangedFiles
      : isPersonalVisualHarmonyPostPr240TruthClosureSet
      ? personalVisualHarmonyPostPr240TruthClosureChangedFiles
      : isPersonalVisualHarmonyTriangleCentroidSet
      ? personalVisualHarmonyTriangleCentroidChangedFiles
      : isPersonalVisualHarmonyConfirmationValidationFixSet
      ? personalVisualHarmonyConfirmationValidationFixChangedFiles
      : isPersonalVisualHarmonyTriangleMediansSet
      ? personalVisualHarmonyTriangleMediansChangedFiles
      : isPersonalVisualHarmonyPerpendicularBisectorsSet
      ? personalVisualHarmonyPerpendicularBisectorsChangedFiles
      : isPersonalVisualHarmonyAngleBisectorsSet
      ? personalVisualHarmonyAngleBisectorsChangedFiles
      : isPersonalVisualHarmonyTriangleAltitudesSet
      ? personalVisualHarmonyTriangleAltitudesChangedFiles
      : isPersonalVisualHarmonyPerpendicularBisectorRegressionFixSet
      ? personalVisualHarmonyPerpendicularBisectorRegressionFixChangedFiles
      : isPersonalVisualHarmonyPerpendicularBisectorGeometryFixSet
      ? personalVisualHarmonyPerpendicularBisectorGeometryFixChangedFiles
      : isPersonalVisualHarmonyRotatedEllipsePixelIntegrationSet
      ? personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles
      : isPersonalVisualHarmonyRotatedEllipsePixelRefinementKernelSet
      ? personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles
      : isPersonalVisualHarmonyRotatedEllipsesSet
      ? personalVisualHarmonyRotatedEllipsesChangedFiles
      : isPersonalVisualHarmonyJunctionAnglesSet
      ? personalVisualHarmonyJunctionAnglesChangedFiles
      : isPersonalVisualHarmonyObliqueFormatConstructionsSet
      ? personalVisualHarmonyObliqueFormatConstructionsChangedFiles
      : isPersonalVisualHarmonyPixelRefinementIntegrationSet
      ? personalVisualHarmonyPixelRefinementIntegrationChangedFiles
      : isPersonalVisualHarmonyPixelRefinementShadowSet
      ? personalVisualHarmonyPixelRefinementShadowChangedFiles
      : isPersonalVisualHarmonyImageHydrationSet
      ? personalVisualHarmonyImageHydrationChangedFiles
      : isPersonalVisualHarmonySet
      ? personalChatGptVisualHarmonyDemoChangedFiles
      : isPr138Set
      ? remoteMcpRenderPrivateBetaDeploymentChangedFiles
      : isPr137aSet
      ? permanentRemoteMcpQuotaIsolationHotfixChangedFiles
      : isPr137Set
      ? permanentRemoteMcpRuntimeChangedFiles
      : isPr136Set
      ? statelessRemoteMcpCommercialBetaContractChangedFiles
      : isPr135Set
      ? privateDevChatGptMcpCompleteLiveProofChangedFiles
      : isPr134Set
      ? privateDevLocalVisualMcpOrchestrationChangedFiles
      : isPr132HardeningSet
      ? pr132ValidationHardeningCheckpointChangedFiles
      : isPr133Set
      ? privateDevChatGptMcpVisualPilotGateChangedFiles
      : isPr132Set
      ? localVisualCandidateReviewChangedFiles
      : isPr131Set
      ? localVisualCandidateReviewProductSurfaceChangedFiles
      : isPr130Set
      ? cleanMainValidationAndPr129OperatorProofChangedFiles
      : isPr129Set
      ? controlledLocalLiveVisualCandidateObservationDemoChangedFiles
      : isPr128Set
      ? explicitAcceptedObservationToCoreHandoffChangedFiles
      : isPr127Set
      ? localVisualObservationToCorePilotContractChangedFiles
      : isPr126Set
      ? controlledProviderObservationToCoreHandoffChangedFiles
      : isPr125Set
      ? controlledProviderObservationAcceptanceProofChangedFiles
      : controlledProviderObservationContractChangedFiles,
  );
});

test("PR132 local visual candidate review set remains exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualCandidateReviewChangedFiles),
    localVisualCandidateReviewChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(localVisualCandidateReviewChangedFiles.slice(1)), null);
  for (const extra of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    ".github/workflows/ci.yml",
    "src/provider/live-adapter.ts",
    "src/mcp/hosted-server.ts",
    "wiki/hot.md",
    "tests/**",
  ]) {
    assert.equal(sharedExactApprovedChangedFiles([...localVisualCandidateReviewChangedFiles, extra]), null, extra);
  }
});

test("PR131 local visual candidate review product surface set remains exact and fail-closed", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualCandidateReviewProductSurfaceChangedFiles),
    localVisualCandidateReviewProductSurfaceChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(localVisualCandidateReviewProductSurfaceChangedFiles.slice(1)), null);
  for (const extra of [
    "src/index.ts",
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "viewer/local-visual-candidate-review.html",
    "package.json",
    "package-lock.json",
    ".github/workflows/ci.yml",
    "tests/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...localVisualCandidateReviewProductSurfaceChangedFiles, extra]),
      null,
      extra,
    );
  }
});

test("PR130 clean-main context is test-private while its feature set remains exact and fail-closed", () => {
  assert.equal(sharedExactApprovedChangedFiles([]), null);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(cleanMainValidationAndPr129OperatorProofChangedFiles),
    cleanMainValidationAndPr129OperatorProofChangedFiles,
  );
  assert.equal(sharedExactApprovedChangedFiles(cleanMainValidationAndPr129OperatorProofChangedFiles.slice(1)), null);
  for (const extra of ["src/index.ts", "bin/provider.mjs", "package.json", "package-lock.json", ".github/workflows/ci.yml", "tests/**"]) {
    assert.equal(sharedExactApprovedChangedFiles([...cleanMainValidationAndPr129OperatorProofChangedFiles, extra]), null, extra);
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR123 smoke artifact proof set", () => {
  const forbiddenFiles = [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "bin/norma-core-live-provider-experiment.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
    "docs/examples/controlled-live-provider-smoke.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    ".npmrc",
    ".github/workflows/ci.yml",
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/controlled-live-provider-smoke.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/local-report/controlled-live-provider-runtime.ts",
    "src/providers/openai.ts",
    "src/providers/openai-sdk.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/provider/openai-response-parser.ts",
    "src/provider-runtime/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/provider-evidence-replay/source-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    const changedFiles = [
      ...controlledLiveProviderSmokeArtifactProofChangedFiles,
      forbiddenFile,
    ];
    assert.equal(
      isExactChangedFileSet(changedFiles, controlledLiveProviderSmokeArtifactProofChangedFiles),
      false,
      forbiddenFile,
    );
    assert.equal(
      sharedExactApprovedChangedFiles(changedFiles),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime provider package wiki hosted ChatGPT MCP CAD Figma extras in the PR109 set", () => {
  const forbiddenFiles = [
    "tests/fixtures/visual-adapter/static-scenario-corpus-v1.json",
    "tests/fixtures/visual-adapter/openai-response.json",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "viewer/read-only-result-viewer.html",
    "bin/norma-core-mcp-http.mjs",
    "docs/examples/openai-vision-pilot.md",
    "docs/decisions/2026-07-08-openai-vision-pilot-implementation.md",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
    "tests/fixtures/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...openaiVisionStyleEvidencePilotContractChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR82 AcceptedGeometry integration proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles),
    acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles,
  );
});

test("shared exact changed-file guard accepts the PR84 AcceptedGeometry fresh-clone proof set exactly", () => {
  assert.strictEqual(
    acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles,
    acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles),
    acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles,
  );

  assert.deepEqual(acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles, [
    "tests/accepted-geometry-to-structured-analyze-integration.test.mjs",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR85 AcceptedGeometry normalization set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryStructuredAnalyzeNormalizationChangedFiles),
    acceptedGeometryStructuredAnalyzeNormalizationChangedFiles,
  );

  assert.deepEqual(acceptedGeometryStructuredAnalyzeNormalizationChangedFiles, [
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "tests/accepted-geometry-to-structured-analyze-integration.test.mjs",
    "tests/accepted-geometry-to-structured-analyze-normalization.test.mjs",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      acceptedGeometryStructuredAnalyzeNormalizationChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR86 AcceptedGeometry normalization metric-policy fix set exactly", () => {
  assert.strictEqual(
    acceptedGeometryStructuredAnalyzeNormalizationMetricPolicyFixChangedFiles,
    acceptedGeometryStructuredAnalyzeNormalizationChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(acceptedGeometryStructuredAnalyzeNormalizationMetricPolicyFixChangedFiles),
    acceptedGeometryStructuredAnalyzeNormalizationMetricPolicyFixChangedFiles,
  );
});

test("shared exact changed-file guard accepts the PR83 post-PR82 roadmap truth sync set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postPr82RoadmapTruthSyncChangedFiles),
    postPr82RoadmapTruthSyncChangedFiles,
  );

  assert.deepEqual(postPr82RoadmapTruthSyncChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-01-post-pr82-roadmap-truth-sync.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/post-pr82-roadmap-truth-sync.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      postPr82RoadmapTruthSyncChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR87 post-PR86 roadmap truth sync set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postPr86RoadmapTruthSyncChangedFiles),
    postPr86RoadmapTruthSyncChangedFiles,
  );

  assert.deepEqual(postPr86RoadmapTruthSyncChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-01-post-pr86-roadmap-truth-sync.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/post-pr86-roadmap-truth-sync.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      postPr86RoadmapTruthSyncChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR93 post-PR92 roadmap truth sync set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postPr92RoadmapTruthSyncChangedFiles),
    postPr92RoadmapTruthSyncChangedFiles,
  );

  assert.deepEqual(postPr92RoadmapTruthSyncChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-02-post-pr92-roadmap-truth-sync.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/post-pr92-roadmap-truth-sync.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      postPr92RoadmapTruthSyncChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR88 integration unlock contracts set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(integrationUnlockContractsChangedFiles),
    integrationUnlockContractsChangedFiles,
  );

  assert.deepEqual(integrationUnlockContractsChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-01-integration-unlock-contracts.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/integration-unlock-contracts.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      integrationUnlockContractsChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
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

test("shared exact changed-file guard accepts the PR89 local guided inspection demo set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localGuidedInspectionDemoChangedFiles),
    localGuidedInspectionDemoChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles),
    localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(localGuidedInspectionDemoChangedFiles, [
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/examples/local-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);
  assert.deepEqual(localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles, [
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/examples/local-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      localGuidedInspectionDemoChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR99 package tarball local install proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageTarballLocalInstallReadinessChangedFiles),
    guidedInspectionPackageTarballLocalInstallReadinessChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageTarballLocalInstallReadinessNonSemgrepMaintenanceChangedFiles),
    guidedInspectionPackageTarballLocalInstallReadinessNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(guidedInspectionPackageTarballLocalInstallReadinessChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-03-package-tarball-local-install-readiness.md",
    "package.json",
    "tests/api-contract-decision.test.mjs",
    "tests/api-remote-mcp-auth-audit-rate-limit-policy.test.mjs",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/consumer-compatibility.test.mjs",
    "tests/guided-inspection-package-publication-readiness.test.mjs",
    "tests/guided-inspection-package-tarball-local-install.test.mjs",
    "tests/mcp-decision-doc-location-policy.test.mjs",
    "tests/mcp-remote-api-readiness-checkpoint.test.mjs",
    "tests/mcp-remote-approval-decision.test.mjs",
    "tests/mcp-remote-deployment-policy-decision.test.mjs",
    "tests/mcp-remote-package-dependency-decision.test.mjs",
    "tests/mcp-remote-security-test-matrix.test.mjs",
    "tests/mcp-remote-tool-exposure-policy.test.mjs",
    "tests/mcp-remote-transport-auth-package-decision.test.mjs",
    "tests/mcp-stdio-server-skeleton.test.mjs",
    "tests/mcp-tool-contract.test.mjs",
    "tests/minimal-api-server-approval-decision.test.mjs",
    "tests/post-mvp-product-vision-approval.test.mjs",
    "tests/publication-gate.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      guidedInspectionPackageTarballLocalInstallReadinessChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects publication dependency lockfile runtime and extra files in the PR99 set", () => {
  const missingRequiredFile = guidedInspectionPackageTarballLocalInstallReadinessChangedFiles.filter(
    (file) => file !== "tests/guided-inspection-package-tarball-local-install.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    ".github/workflows/release.yml",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "examples/structured-analyze/basic-grid-alignment.json",
    "tests/fixtures/viewer/structured-analyze-result.json",
    "viewer/read-only-result-viewer.html",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionPackageTarballLocalInstallReadinessChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR101 package API and tarball hardening set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageApiTarballHardeningChangedFiles),
    guidedInspectionPackageApiTarballHardeningChangedFiles,
  );

  assert.deepEqual(guidedInspectionPackageApiTarballHardeningChangedFiles, [
    "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "src/local-report/guided-inspection-package-api-v1.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-package-root-api.test.mjs",
    "tests/guided-inspection-package-tarball-local-install.test.mjs",
    "tests/package-api-export-contract-approval.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**", ".github/**"]) {
    assert.equal(
      guidedInspectionPackageApiTarballHardeningChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR101 package API and tarball hardening set", () => {
  const missingRequiredFile = guidedInspectionPackageApiTarballHardeningChangedFiles.filter(
    (file) => file !== "src/local-report/guided-inspection-package-api-v1.ts",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/local-report/guided-inspection-consumer-proof.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "examples/structured-analyze/basic-grid-alignment.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/release.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionPackageApiTarballHardeningChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR90 guided inspection package/API readiness gate set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageApiReadinessGateChangedFiles),
    guidedInspectionPackageApiReadinessGateChangedFiles,
  );

  assert.deepEqual(guidedInspectionPackageApiReadinessGateChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-02-guided-inspection-package-api-readiness-gate.md",
    "docs/examples/local-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-package-api-readiness.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      guidedInspectionPackageApiReadinessGateChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR91 guided inspection artifact contract set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionArtifactContractChangedFiles),
    guidedInspectionArtifactContractChangedFiles,
  );

  assert.deepEqual(guidedInspectionArtifactContractChangedFiles, [
    "src/local-report/guided-inspection-artifact-contract.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-artifact-contract.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      guidedInspectionArtifactContractChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR91 artifact contract set", () => {
  const missingRequiredFile = guidedInspectionArtifactContractChangedFiles.filter(
    (file) => file !== "src/local-report/guided-inspection-artifact-contract.ts",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/examples/local-guided-inspection-demo.md",
    "docs/decisions/2026-07-02-guided-inspection-package-api-readiness-gate.md",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionArtifactContractChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR92 guided demo artifact-contract wiring set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionDemoArtifactContractWiringChangedFiles),
    guidedInspectionDemoArtifactContractWiringChangedFiles,
  );

  assert.deepEqual(guidedInspectionDemoArtifactContractWiringChangedFiles, [
    "bin/norma-core-guided-inspection-demo.mjs",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-artifact-contract.test.mjs",
    "tests/local-guided-inspection-demo.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      guidedInspectionDemoArtifactContractWiringChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard accepts the PR94 guided inspection consumer proof set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionConsumerProofChangedFiles),
    guidedInspectionConsumerProofChangedFiles,
  );

  assert.deepEqual(guidedInspectionConsumerProofChangedFiles, [
    "src/local-report/guided-inspection-consumer-proof.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-consumer-proof.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(
      guidedInspectionConsumerProofChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR94 consumer proof set", () => {
  const missingRequiredFile = guidedInspectionConsumerProofChangedFiles.filter(
    (file) => file !== "src/local-report/guided-inspection-consumer-proof.ts",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/examples/local-guided-inspection-demo.md",
    "docs/decisions/2026-07-02-guided-inspection-package-api-readiness-gate.md",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionConsumerProofChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR95 package API export contract approval set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(packageApiExportContractApprovalChangedFiles),
    packageApiExportContractApprovalChangedFiles,
  );

  assert.deepEqual(packageApiExportContractApprovalChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/package-api-export-contract-approval.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**", ".github/**"]) {
    assert.equal(
      packageApiExportContractApprovalChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR95 package API export contract approval set", () => {
  const missingRequiredFile = packageApiExportContractApprovalChangedFiles.filter(
    (file) => file !== "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "src/local-report/guided-inspection-consumer-proof.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "src/**",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "bin/**",
    "examples/consumer/structured-analyze-v1.ts",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "examples/**",
    "viewer/index.html",
    "viewer/**",
    ".github/workflows/verify.yml",
    ".github/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...packageApiExportContractApprovalChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR96 guided inspection package-root API exports set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageRootApiExportsChangedFiles),
    guidedInspectionPackageRootApiExportsChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageRootApiExportsNonSemgrepMaintenanceChangedFiles),
    guidedInspectionPackageRootApiExportsNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(guidedInspectionPackageRootApiExportsChangedFiles, [
    "src/index.ts",
    "src/local-report/guided-inspection-package-api-v1.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-artifact-contract.test.mjs",
    "tests/guided-inspection-consumer-proof.test.mjs",
    "tests/guided-inspection-package-root-api.test.mjs",
    "tests/package-api-export-contract-approval.test.mjs",
    "tests/public-api-contract.test.mjs",
    "tests/read-only-viewer-static.test.mjs",
    "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  ]);
  assert.deepEqual(guidedInspectionPackageRootApiExportsNonSemgrepMaintenanceChangedFiles, [
    "src/index.ts",
    "src/local-report/guided-inspection-package-api-v1.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-artifact-contract.test.mjs",
    "tests/guided-inspection-consumer-proof.test.mjs",
    "tests/guided-inspection-package-root-api.test.mjs",
    "tests/package-api-export-contract-approval.test.mjs",
    "tests/public-api-contract.test.mjs",
    "tests/read-only-viewer-static.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**", ".github/**"]) {
    assert.equal(
      guidedInspectionPackageRootApiExportsChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR96 package-root API exports set", () => {
  const missingRequiredFile = guidedInspectionPackageRootApiExportsChangedFiles.filter(
    (file) => file !== "src/local-report/guided-inspection-package-api-v1.ts",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "src/local-report/guided-inspection-consumer-proof.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
    "docs/examples/local-guided-inspection-demo.md",
    "examples/consumer/structured-analyze-v1.ts",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/verify.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionPackageRootApiExportsChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR97 package-root consumer compatibility set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackageRootConsumerCompatibilityChangedFiles),
    guidedInspectionPackageRootConsumerCompatibilityChangedFiles,
  );

  assert.deepEqual(guidedInspectionPackageRootConsumerCompatibilityChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-package-root-consumer-compatibility.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**", ".github/**"]) {
    assert.equal(
      guidedInspectionPackageRootConsumerCompatibilityChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR97 package-root consumer compatibility set", () => {
  const missingRequiredFile = guidedInspectionPackageRootConsumerCompatibilityChangedFiles.filter(
    (file) => file !== "tests/guided-inspection-package-root-consumer-compatibility.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "src/index.ts",
    "src/local-report/guided-inspection-package-api-v1.ts",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "src/local-report/guided-inspection-consumer-proof.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
    "docs/examples/local-guided-inspection-demo.md",
    "examples/consumer/structured-analyze-v1.ts",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/verify.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionPackageRootConsumerCompatibilityChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR98 guided inspection package publication readiness set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(guidedInspectionPackagePublicationReadinessChangedFiles),
    guidedInspectionPackagePublicationReadinessChangedFiles,
  );

  assert.deepEqual(guidedInspectionPackagePublicationReadinessChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-02-guided-inspection-package-publication-readiness-gate.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/guided-inspection-package-publication-readiness.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**", ".github/**"]) {
    assert.equal(
      guidedInspectionPackagePublicationReadinessChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects package runtime hosted provider and adapter extras in the PR98 set", () => {
  const missingRequiredFile = guidedInspectionPackagePublicationReadinessChangedFiles.filter(
    (file) => file !== "tests/guided-inspection-package-publication-readiness.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "src/index.ts",
    "src/local-report/guided-inspection-package-api-v1.ts",
    "src/local-report/guided-inspection-artifact-contract.ts",
    "src/local-report/guided-inspection-consumer-proof.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "docs/PACKAGE_PUBLICATION_READINESS.md",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "docs/examples/local-guided-inspection-demo.md",
    "examples/consumer/structured-analyze-v1.ts",
    "examples/structured-analyze/families/harmonic-triads-basic.json",
    "viewer/read-only-result-viewer.html",
    ".github/workflows/release.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionPackagePublicationReadinessChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard accepts the PR100 package publication candidate set exactly", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(packagePublicationCandidateWithoutPublishingChangedFiles),
    packagePublicationCandidateWithoutPublishingChangedFiles,
  );

  assert.deepEqual(packagePublicationCandidateWithoutPublishingChangedFiles, [
    "README.md",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-03-package-publication-candidate-without-publishing.md",
    "package-lock.json",
    "package.json",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/package-publication-candidate-without-publishing.test.mjs",
  ]);

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**", ".github/**"]) {
    assert.equal(
      packagePublicationCandidateWithoutPublishingChangedFiles.includes(broadPath),
      false,
      broadPath,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR100 package publication candidate set", () => {
  const missingRequiredFile = packagePublicationCandidateWithoutPublishingChangedFiles.filter(
    (file) => file !== "tests/package-publication-candidate-without-publishing.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "LICENSE",
    "LICENSE.md",
    "pnpm-lock.yaml",
    "yarn.lock",
    ".github/workflows/release.yml",
    "src/index.ts",
    "src/local-report/guided-inspection-package-api-v1.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "docs/PACKAGE_PUBLICATION_READINESS.md",
    "examples/consumer/structured-analyze-v1.ts",
    "viewer/read-only-result-viewer.html",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...packagePublicationCandidateWithoutPublishingChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects forbidden extras in the PR92 wiring set", () => {
  const missingRequiredFile = guidedInspectionDemoArtifactContractWiringChangedFiles.filter(
    (file) => file !== "tests/local-guided-inspection-demo.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/examples/local-guided-inspection-demo.md",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionDemoArtifactContractWiringChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime source package provider and deployment extras in the PR90 set", () => {
  const missingRequiredFile = guidedInspectionPackageApiReadinessGateChangedFiles.filter(
    (file) => file !== "tests/guided-inspection-package-api-readiness.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "bin/norma-core-mcp-http.mjs",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    ".github/workflows/ci.yml",
    ".env.example",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...guidedInspectionPackageApiReadinessGateChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime source package provider and deployment extras in the PR89 set", () => {
  const missingRequiredFile = localGuidedInspectionDemoChangedFiles.filter(
    (file) => file !== "tests/local-guided-inspection-demo.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "bin/norma-core-mcp-http.mjs",
    ".github/workflows/ci.yml",
    ".env.example",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localGuidedInspectionDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
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

test("shared exact changed-file guard rejects runtime, package, and extra files in the PR83 truth sync set", () => {
  const missingRequiredFile = postPr82RoadmapTruthSyncChangedFiles.filter(
    (file) => file !== "tests/post-pr82-roadmap-truth-sync.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postPr82RoadmapTruthSyncChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, docs, and example extras in the PR87 truth sync set", () => {
  const missingRequiredFile = postPr86RoadmapTruthSyncChangedFiles.filter(
    (file) => file !== "tests/post-pr86-roadmap-truth-sync.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "docs/local-structured-analyze-report-kit.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postPr86RoadmapTruthSyncChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, docs, and example extras in the PR93 truth sync set", () => {
  const missingRequiredFile = postPr92RoadmapTruthSyncChangedFiles.filter(
    (file) => file !== "tests/post-pr92-roadmap-truth-sync.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/guided-inspection-artifact-contract.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "docs/examples/local-guided-inspection-demo.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postPr92RoadmapTruthSyncChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, provider, and deployment extras in the PR88 unlock set", () => {
  const missingRequiredFile = integrationUnlockContractsChangedFiles.filter(
    (file) => file !== "tests/integration-unlock-contracts.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/auth.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "bin/norma-core-mcp-http.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "docs/local-structured-analyze-report-kit.md",
    ".github/workflows/ci.yml",
    ".env.example",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...integrationUnlockContractsChangedFiles,
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

test("shared exact changed-file guard rejects extras in the PR81 AcceptedGeometry-to-Core mapper set", () => {
  for (const forbiddenFile of [
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "package.json",
    "tests/fixtures/geometry-observation/new-fixture.json",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...acceptedGeometryToCoreMapperChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects extras in the PR81 mapper review-fix set", () => {
  for (const forbiddenFile of [
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "package.json",
    "tests/fixtures/geometry-observation/new-fixture.json",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...acceptedGeometryToCoreMapperReviewFixesChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, docs, and example extras in the PR84 fresh-clone proof set", () => {
  const missingRequiredFile = acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles.filter(
    (file) => file !== "tests/accepted-geometry-to-structured-analyze-integration.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/examples/real-usecase-structured-layout-demo.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/geometry-observation/new-fixture.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("R36 package metadata remains private without bin, export, or dependency expansion", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assertCurrentRemoteMcpPackageBoundary(packageJson);
  assert.deepEqual(Object.keys(packageJson.devDependencies).sort(), ["typescript"]);
});

test("shared exact changed-file guard rejects runtime, package, docs, and example extras in the PR85 normalization set", () => {
  const missingRequiredFile = acceptedGeometryStructuredAnalyzeNormalizationChangedFiles.filter(
    (file) => file !== "src/accepted-geometry-to-structured-analyze-normalization.ts",
  );
  const missingNormalizationTestFile = acceptedGeometryStructuredAnalyzeNormalizationChangedFiles.filter(
    (file) => file !== "tests/accepted-geometry-to-structured-analyze-normalization.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);
  assert.equal(sharedExactApprovedChangedFiles(missingNormalizationTestFile), null);

  for (const forbiddenFile of [
    "src/accepted-geometry-to-core-mapping.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-01-post-pr82-roadmap-truth-sync.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/geometry-observation/new-fixture.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...acceptedGeometryStructuredAnalyzeNormalizationChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, package, provider, and fixture extras in the PR102 visual adapter fixture contract set", () => {
  const missingRequiredFile = visualAdapterFixtureContractChangedFiles.filter(
    (file) => file !== "tests/visual-adapter-fixture-contract.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/visual-adapter/source-image.png",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...visualAdapterFixtureContractChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, provider, package, docs, and wiki extras in the PR103 visual adapter static fixture handoff set", () => {
  const missingRequiredFile = visualAdapterStaticFixtureHandoffChangedFiles.filter(
    (file) => file !== "tests/visual-adapter-static-fixture-handoff.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/visual-adapter/source-image.png",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
    "../norma-core-wiki/wiki/hot.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...visualAdapterStaticFixtureHandoffChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

test("shared exact changed-file guard rejects runtime, provider, package, docs, and wiki extras in the PR104 visual fixture demo set", () => {
  const missingRequiredFile = localVisualFixtureGuidedInspectionDemoChangedFiles.filter(
    (file) => file !== "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
  );

  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/visual-adapter/source-image.png",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
    "../norma-core-wiki/wiki/hot.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localVisualFixtureGuidedInspectionDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
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

test("active proof detection falls back when optional stacked-base refs are absent", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "changed-file-guard-"));

  try {
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["checkout", "-B", "main"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: repoRoot, stdio: "ignore" });

    assert.deepEqual(activeControlledProviderObservationProofChangedFiles(repoRoot), []);
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

function activeControlledProviderObservationProofChangedFiles(repoRoot) {
  let stackedChangedFiles = null;
  try {
    stackedChangedFiles = branchChangedFiles(repoRoot, [
      "origin/codex/personal-chatgpt-visual-harmony-demo",
      "codex/personal-chatgpt-visual-harmony-demo",
    ]);
  } catch {
    // The stacked base is optional outside this PR checkout; default refs remain authoritative.
  }
  return stackedChangedFiles !== null && isExactChangedFileSet(
    stackedChangedFiles,
    personalVisualHarmonyPixelRefinementShadowChangedFiles,
  ) ? stackedChangedFiles : branchChangedFiles(repoRoot);
}
