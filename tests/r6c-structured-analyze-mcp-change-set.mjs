export const r6cStructuredAnalyzeMcpChangedFiles = [
  ".github/workflows/ci.yml",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-26-private-hosted-mcp-operating-model.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "src/index.ts",
  "src/mcp/stdio-protocol.ts",
  "src/structured-composition-analysis.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/api-contract-decision.test.mjs",
  "tests/api-contract-golden-envelopes.test.mjs",
  "tests/api-remote-mcp-auth-audit-rate-limit-policy.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-decision-doc-location-policy.test.mjs",
  "tests/mcp-remote-api-readiness-checkpoint.test.mjs",
  "tests/mcp-remote-approval-decision.test.mjs",
  "tests/mcp-remote-deployment-policy-decision.test.mjs",
  "tests/mcp-remote-package-dependency-decision.test.mjs",
  "tests/mcp-remote-security-test-matrix.test.mjs",
  "tests/mcp-remote-tool-exposure-policy.test.mjs",
  "tests/mcp-remote-transport-auth-package-decision.test.mjs",
  "tests/mcp-replay-mvp-demo-contract.test.mjs",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/mcp-tool-contract.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/mcp-verify-tools-contract.test.mjs",
  "tests/minimal-api-server-approval-decision.test.mjs",
  "tests/minimal-api-server-skeleton.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/package-consumption.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
  "tests/read-only-result-viewer-plan.test.mjs",
  "tests/read-only-result-viewer-product-requirements.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/roadmap-status-update.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/structured-composition-analysis.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
].sort();

export const r1GeometrySourceIdentityChangedFiles = [
  "src/index.ts",
  "src/measurements.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/core-skeleton.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/measurements.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-composition-analysis.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
].sort();

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

const r1GeometrySourceIdentityNonSemgrepGuardMaintenanceChangedFiles =
  r1GeometrySourceIdentityChangedFiles
    .filter((file) => !r1GeometrySourceIdentitySemgrepGuardMaintenanceFiles.has(file))
    .sort();

const pr114LocalMainDriftChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "src/mcp/stdio-protocol.ts",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
].sort();

const r1GeometrySourceIdentityWithPr114LocalMainDriftChangedFiles = [
  ...new Set([...r1GeometrySourceIdentityChangedFiles, ...pr114LocalMainDriftChangedFiles]),
].sort();

const r1GeometrySourceIdentityNonSemgrepGuardMaintenanceWithPr114LocalMainDriftChangedFiles = [
  ...new Set([
    ...r1GeometrySourceIdentityNonSemgrepGuardMaintenanceChangedFiles,
    ...pr114LocalMainDriftChangedFiles,
  ]),
].sort();

const r1MeasurementAnchorTargetRefFollowupChangedFiles = [
  "src/measurements.ts",
  "tests/measurements.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
].sort();

const r6dChatgptMcpMetadataCompatibilityChangedFiles = [
  "src/mcp/stdio-protocol.ts",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
].sort();

const r6dChatgptCheckpointChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
].sort();

export const r7StructuredAnalyzeHardeningChangedFiles = [
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
  "tests/structured-composition-analysis.test.mjs",
].sort();

export const r7bPrivateHostedMcpOperatingModelChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-26-private-hosted-mcp-operating-model.md",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
].sort();

const requiredR6CStructuredAnalyzeMcpChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "src/mcp/stdio-protocol.ts",
  "tests/mcp-structured-composition-analysis-contract.test.mjs",
  "tests/r6c-structured-analyze-mcp-change-set.mjs",
].sort();

export function isExactR6CStructuredAnalyzeMcpChangeSet(changedFiles) {
  return (
    requiredR6CStructuredAnalyzeMcpChangedFiles.every((file) => changedFiles.includes(file))
      && changedFiles.every((file) => r6cStructuredAnalyzeMcpChangedFiles.includes(file))
  ) ||
    isExactChangedFileSet(changedFiles, r6dChatgptMcpMetadataCompatibilityChangedFiles) ||
    isExactChangedFileSet(changedFiles, r6dChatgptCheckpointChangedFiles) ||
    isExactChangedFileSet(changedFiles, r7StructuredAnalyzeHardeningChangedFiles) ||
    isExactChangedFileSet(changedFiles, r7bPrivateHostedMcpOperatingModelChangedFiles);
}

export function isExactR1GeometrySourceIdentityChangeSet(changedFiles) {
  return (
    isExactChangedFileSet(changedFiles, r1GeometrySourceIdentityChangedFiles) ||
    isExactChangedFileSet(changedFiles, r1GeometrySourceIdentityNonSemgrepGuardMaintenanceChangedFiles) ||
    isExactChangedFileSet(changedFiles, r1GeometrySourceIdentityWithPr114LocalMainDriftChangedFiles) ||
    isExactChangedFileSet(
      changedFiles,
      r1GeometrySourceIdentityNonSemgrepGuardMaintenanceWithPr114LocalMainDriftChangedFiles,
    ) ||
    isExactChangedFileSet(
      changedFiles,
      r1MeasurementAnchorTargetRefFollowupChangedFiles,
    )
  );
}

function isExactChangedFileSet(changedFiles, approvedFiles) {
  return changedFiles.length === approvedFiles.length && approvedFiles.every((file) => changedFiles.includes(file));
}
