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

export const cleanMainValidationAndPr129OperatorProofChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/pr129-operator-proof-checkpoint.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const localVisualCandidateReviewProductSurfaceChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md",
  "docs/decisions/2026-07-11-local-visual-candidate-review-product-surface.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-candidate-review-product-surface.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/pr129-operator-proof-checkpoint.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const localVisualCandidateReviewChangedFiles = Object.freeze([
  "bin/norma-core-local-visual-candidate-selection-finalizer.mjs",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md",
  "docs/examples/local-visual-candidate-review.md",
  "src/local-report/local-visual-candidate-selection-intent.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/local-visual-candidate-review-product-surface.test.mjs",
  "tests/local-visual-candidate-review.test.mjs",
  "tests/local-visual-candidate-selection-intent.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/pr129-operator-proof-checkpoint.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "viewer/local-visual-candidate-review.css",
  "viewer/local-visual-candidate-review.html",
  "viewer/local-visual-candidate-review.js",
].sort());

export const privateDevChatGptMcpVisualPilotGateChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-11-private-dev-chatgpt-mcp-visual-pilot-gate.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/private-dev-chatgpt-mcp-visual-pilot-gate.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const privateDevLocalVisualMcpOrchestrationChangedFiles = Object.freeze([
  "bin/norma-core-private-dev-visual-mcp-stdio.mjs",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-11-pr134-private-dev-local-visual-mcp-orchestration.md",
  "docs/decisions/2026-07-11-private-dev-chatgpt-mcp-visual-pilot-gate.md",
  "docs/examples/private-dev-local-visual-mcp.md",
  "src/local-report/private-dev-local-visual-mcp-orchestration.ts",
  "src/mcp/private-dev-local-visual-mcp-protocol.ts",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/api-contract-decision.test.mjs",
  "tests/api-contract-golden-envelopes.test.mjs",
  "tests/api-remote-mcp-auth-audit-rate-limit-policy.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/mcp-remote-api-readiness-checkpoint.test.mjs",
  "tests/mcp-remote-approval-decision.test.mjs",
  "tests/mcp-remote-deployment-policy-decision.test.mjs",
  "tests/mcp-remote-package-dependency-decision.test.mjs",
  "tests/mcp-remote-security-test-matrix.test.mjs",
  "tests/mcp-remote-tool-exposure-policy.test.mjs",
  "tests/mcp-remote-transport-auth-package-decision.test.mjs",
  "tests/mcp-tool-contract.test.mjs",
  "tests/minimal-api-server-approval-decision.test.mjs",
  "tests/minimal-api-server-skeleton.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/pr132-operator-validation-checkpoint.test.mjs",
  "tests/private-dev-chatgpt-mcp-visual-pilot-gate.test.mjs",
  "tests/private-dev-local-visual-mcp-orchestration.test.mjs",
  "tests/private-dev-local-visual-mcp-stdio.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-result-viewer-plan.test.mjs",
  "tests/read-only-result-viewer-product-requirements.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/roadmap-status-update.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
].sort());

export const privateDevChatGptMcpCompleteLiveProofChangedFiles = Object.freeze([
  "src/mcp/private-dev-local-visual-mcp-protocol.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/private-dev-local-visual-mcp-stdio.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalChatGptVisualHarmonyDemoOriginalChangedFiles = Object.freeze([
  "bin/norma-core-personal-visual-harmony-mcp-http.mjs",
  "bin/norma-core-personal-visual-harmony-mcp-stdio.mjs",
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "examples/personal-visual-harmony/golden-split-poster.png",
  "examples/personal-visual-harmony/golden-split-poster.svg",
  "src/harmonic-relationship-analysis.ts",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/mcp/personal-visual-harmony-http-server.ts",
  "src/personal-visual-harmony.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/current-remote-mcp-boundary.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/mcp-remote-package-dependency-decision.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/personal-visual-harmony-http.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalChatGptVisualHarmonyDemoChangedFiles = Object.freeze([
  ...personalChatGptVisualHarmonyDemoOriginalChangedFiles,
  "src/personal-visual-harmony-pixel-refinement.ts",
  "tests/fixtures/personal-visual-harmony-pixel-refinement/corpus-v1.json",
  "tests/personal-visual-harmony-pixel-refinement.test.mjs",
].sort());

export const personalVisualHarmonyTruthSyncChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  "tests/changed-file-guard.mjs",
].sort());

export const personalVisualHarmonyImageHydrationChangedFiles = Object.freeze([
  "src/mcp/personal-visual-harmony-app.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyPixelRefinementShadowChangedFiles = Object.freeze([
  "src/personal-visual-harmony-pixel-refinement.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/fixtures/personal-visual-harmony-pixel-refinement/corpus-v1.json",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-pixel-refinement.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyPixelRefinementIntegrationChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/personal-visual-harmony-pixel-refinement.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-http.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony-pixel-refinement.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/personal-visual-harmony-pixel-refinement.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony-pixel-refinement.test.mjs",
  "tests/personal-visual-harmony.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyObliqueFormatConstructionsChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/personal-visual-harmony-constructions.ts",
  "src/personal-visual-harmony.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-constructions.test.mjs",
  "tests/personal-visual-harmony-http.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyJunctionAnglesChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/personal-visual-harmony-constructions.ts",
  "src/personal-visual-harmony.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-constructions.test.mjs",
  "tests/personal-visual-harmony-http.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyTriangleConstructionsChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/personal-visual-harmony-constructions.ts",
  "src/personal-visual-harmony.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-constructions.test.mjs",
  "tests/personal-visual-harmony-http.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyRotatedEllipsesChangedFiles = Object.freeze([
  "docs/examples/personal-chatgpt-visual-harmony-demo.md",
  "src/mcp/personal-visual-harmony-app.ts",
  "src/personal-visual-harmony.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-mcp.test.mjs",
  "tests/personal-visual-harmony-pixel-refinement.test.mjs",
  "tests/personal-visual-harmony.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles = Object.freeze([
  "src/personal-visual-harmony-pixel-refinement.ts",
  "src/personal-visual-harmony.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/fixtures/personal-visual-harmony-pixel-refinement/corpus-v1.json",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/personal-visual-harmony-pixel-refinement.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const statelessRemoteMcpCommercialBetaContractChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/decisions/2026-07-13-stateless-remote-mcp-commercial-beta-contract.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/mcp-remote-commercial-beta-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
].sort());

export const permanentRemoteMcpRuntimeChangedFiles = Object.freeze([
  "bin/norma-core-remote-mcp-http.mjs",
  "package-lock.json",
  "package.json",
  "src/mcp/remote-http-auth.ts",
  "src/mcp/remote-http-config.ts",
  "src/mcp/remote-http-limits.ts",
  "src/mcp/remote-http-server.ts",
  "src/mcp/stdio-protocol.ts",
  "src/node-crypto.d.ts",
  "src/node-http.d.ts",
  "tests/api-contract-decision.test.mjs",
  "tests/api-contract-golden-envelopes.test.mjs",
  "tests/api-remote-mcp-auth-audit-rate-limit-policy.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/cli.test.mjs",
  "tests/consumer-compatibility.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/current-remote-mcp-boundary.mjs",
  "tests/disabled-live-provider-experiment-harness.test.mjs",
  "tests/guided-inspection-package-publication-readiness.test.mjs",
  "tests/guided-inspection-package-tarball-local-install.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/local-visual-pilot-boundary.test.mjs",
  "tests/mcp-decision-doc-location-policy.test.mjs",
  "tests/mcp-remote-api-readiness-checkpoint.test.mjs",
  "tests/mcp-remote-approval-decision.test.mjs",
  "tests/mcp-remote-deployment-policy-decision.test.mjs",
  "tests/mcp-remote-http-auth.test.mjs",
  "tests/mcp-remote-http-contract.test.mjs",
  "tests/mcp-remote-http-runtime.test.mjs",
  "tests/mcp-remote-package-dependency-decision.test.mjs",
  "tests/mcp-remote-security-test-matrix.test.mjs",
  "tests/mcp-remote-threat-model.test.mjs",
  "tests/mcp-remote-tool-exposure-policy.test.mjs",
  "tests/mcp-remote-transport-auth-package-decision.test.mjs",
  "tests/mcp-replay-mvp-demo-contract.test.mjs",
  "tests/mcp-stdio-server-skeleton.test.mjs",
  "tests/mcp-tool-contract.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/mcp-tools-list-contract.test.mjs",
  "tests/mcp-verify-tools-contract.test.mjs",
  "tests/minimal-api-server-approval-decision.test.mjs",
  "tests/minimal-api-server-skeleton.test.mjs",
  "tests/openai-vision-style-evidence-pilot-contract.test.mjs",
  "tests/package-api-export-contract-approval.test.mjs",
  "tests/package-consumption.test.mjs",
  "tests/package-publication-candidate-without-publishing.test.mjs",
  "tests/provider-evidence-replay-adapter.test.mjs",
  "tests/publication-gate.test.mjs",
  "tests/read-only-result-viewer-plan.test.mjs",
  "tests/read-only-result-viewer-product-requirements.test.mjs",
  "tests/roadmap-status-update.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/synthetic-external-evidence-acceptance-boundary.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const permanentRemoteMcpQuotaIsolationHotfixChangedFiles = Object.freeze([
  "src/mcp/remote-http-limits.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/mcp-remote-http-runtime.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const remoteMcpRenderPrivateBetaDeploymentChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/REMOTE_MCP_PRIVATE_BETA_RUNBOOK.md",
  "render.yaml",
  "tests/api-contract-decision.test.mjs",
  "tests/api-contract-golden-envelopes.test.mjs",
  "tests/api-remote-mcp-auth-audit-rate-limit-policy.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/mcp-remote-api-readiness-checkpoint.test.mjs",
  "tests/mcp-remote-deployment-policy-decision.test.mjs",
  "tests/mcp-remote-render-private-beta-deployment.test.mjs",
  "tests/mcp-remote-tool-exposure-policy.test.mjs",
  "tests/minimal-api-server-approval-decision.test.mjs",
  "tests/minimal-api-server-skeleton.test.mjs",
  "tests/read-only-result-viewer-plan.test.mjs",
  "tests/read-only-result-viewer-product-requirements.test.mjs",
  "tests/roadmap-status-update.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const pr132ValidationHardeningCheckpointChangedFiles = Object.freeze([
  "bin/norma-core-local-visual-candidate-selection-finalizer.mjs",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-11-pr132-operator-validation-checkpoint.md",
  "docs/decisions/2026-07-11-private-dev-chatgpt-mcp-visual-pilot-gate.md",
  "src/local-report/local-visual-candidate-selection-intent.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/local-visual-candidate-review.test.mjs",
  "tests/local-visual-candidate-selection-intent.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/pr132-operator-validation-checkpoint.test.mjs",
  "tests/private-dev-chatgpt-mcp-visual-pilot-gate.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  "viewer/local-visual-candidate-review.js",
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

export const personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles =
  Object.freeze(
    personalChatGptVisualHarmonyDemoChangedFiles
      .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
      .sort(),
  );

export const personalChatGptVisualHarmonyDemoOriginalNonSemgrepMaintenanceChangedFiles =
  Object.freeze(
    personalChatGptVisualHarmonyDemoOriginalChangedFiles
      .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
      .sort(),
  );

export const statelessRemoteMcpCommercialBetaContractNonSemgrepMaintenanceChangedFiles =
  Object.freeze(
    statelessRemoteMcpCommercialBetaContractChangedFiles
      .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
      .sort(),
  );

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

export const realUsecaseLocalDemoCommandHardeningChangedFiles = Object.freeze([
  ...realUsecaseLocalDemoCommandChangedFiles,
].sort());

export const localCliReportBoundaryFreezeChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-structured-analyze-report-kit.test.mjs",
  "tests/real-usecase-local-demo-command.test.mjs",
].sort());

export const localGuidedInspectionDemoChangedFiles = Object.freeze([
  "bin/norma-core-guided-inspection-demo.mjs",
  "docs/examples/local-guided-inspection-demo.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-guided-inspection-demo.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
].sort());

export const localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles = Object.freeze(
  localGuidedInspectionDemoChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const guidedInspectionPackageApiReadinessGateChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-02-guided-inspection-package-api-readiness-gate.md",
  "docs/examples/local-guided-inspection-demo.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-package-api-readiness.test.mjs",
].sort());

export const guidedInspectionArtifactContractChangedFiles = Object.freeze([
  "src/local-report/guided-inspection-artifact-contract.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-artifact-contract.test.mjs",
].sort());

export const guidedInspectionDemoArtifactContractWiringChangedFiles = Object.freeze([
  "bin/norma-core-guided-inspection-demo.mjs",
  "src/local-report/guided-inspection-artifact-contract.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-artifact-contract.test.mjs",
  "tests/local-guided-inspection-demo.test.mjs",
].sort());

export const guidedInspectionConsumerProofChangedFiles = Object.freeze([
  "src/local-report/guided-inspection-consumer-proof.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-consumer-proof.test.mjs",
].sort());

export const packageApiExportContractApprovalChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/package-api-export-contract-approval.test.mjs",
].sort());

export const guidedInspectionPackageRootApiExportsChangedFiles = Object.freeze([
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
].sort());

export const guidedInspectionPackageRootApiExportsNonSemgrepMaintenanceChangedFiles = Object.freeze(
  guidedInspectionPackageRootApiExportsChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const guidedInspectionPackageRootConsumerCompatibilityChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-package-root-consumer-compatibility.test.mjs",
].sort());

export const guidedInspectionPackagePublicationReadinessChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-02-guided-inspection-package-publication-readiness-gate.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-package-publication-readiness.test.mjs",
].sort());

export const guidedInspectionPackageTarballLocalInstallReadinessChangedFiles = Object.freeze([
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
].sort());

export const guidedInspectionPackageTarballLocalInstallReadinessNonSemgrepMaintenanceChangedFiles = Object.freeze(
  guidedInspectionPackageTarballLocalInstallReadinessChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const guidedInspectionPackageApiTarballHardeningChangedFiles = Object.freeze([
  "docs/decisions/2026-07-02-package-api-export-contract-approval.md",
  "src/local-report/guided-inspection-artifact-contract.ts",
  "src/local-report/guided-inspection-package-api-v1.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/guided-inspection-package-root-api.test.mjs",
  "tests/guided-inspection-package-tarball-local-install.test.mjs",
  "tests/package-api-export-contract-approval.test.mjs",
].sort());

export const packagePublicationCandidateWithoutPublishingChangedFiles = Object.freeze([
  "README.md",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-03-package-publication-candidate-without-publishing.md",
  "package-lock.json",
  "package.json",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/package-publication-candidate-without-publishing.test.mjs",
].sort());

export const visualAdapterFixtureContractChangedFiles = Object.freeze([
  "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/visual-adapter-fixture-contract.test.mjs",
].sort());

export const visualAdapterStaticFixtureHandoffChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/fixtures/visual-adapter/static-handoff-proof-v1.json",
  "tests/visual-adapter-static-fixture-handoff.test.mjs",
].sort());

export const localVisualFixtureGuidedInspectionDemoChangedFiles = Object.freeze([
  "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
  "docs/examples/local-visual-fixture-guided-inspection-demo.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
].sort());

export const localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles = Object.freeze(
  localVisualFixtureGuidedInspectionDemoChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const visualFixtureGuidedInspectionConsumerProofChangedFiles = Object.freeze([
  "src/local-report/visual-fixture-guided-inspection-consumer-proof.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/visual-fixture-guided-inspection-consumer-proof.test.mjs",
].sort());

export const visualAdapterStaticScenarioCorpusChangedFiles = Object.freeze([
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/fixtures/visual-adapter/static-scenario-corpus-v1.json",
  "tests/visual-adapter-static-scenario-corpus.test.mjs",
].sort());

export const postPr104VisualFixtureRoadmapTruthSyncChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/post-pr104-visual-fixture-roadmap-truth-sync.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const localVisualPilotBoundaryChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-07-local-visual-pilot-boundary.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/local-visual-pilot-boundary.test.mjs",
].sort());

export const openaiVisionStyleEvidencePilotContractChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-07-openai-vision-style-evidence-pilot-contract.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/openai-vision-style-evidence-pilot-contract.test.mjs",
].sort());

export const syntheticExternalEvidenceAcceptanceBoundaryChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-synthetic-external-evidence-acceptance-boundary.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
  "tests/synthetic-external-evidence-acceptance-boundary.test.mjs",
].sort());

export const syntheticExternalEvidenceAcceptanceProofChangedFiles = Object.freeze([
  "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const syntheticEvidenceAcceptanceDemoChangedFiles = Object.freeze([
  "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
  "docs/examples/local-synthetic-evidence-acceptance-demo.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/onboarding-examples-docs.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  "tests/synthetic-evidence-acceptance-demo.test.mjs",
].sort());

export const syntheticEvidenceAcceptanceDemoNonSemgrepMaintenanceChangedFiles = Object.freeze(
  syntheticEvidenceAcceptanceDemoChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const realExternalEvidencePilotReadinessGateChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/real-external-evidence-pilot-readiness.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const providerEvidenceReplayAdapterChangedFiles = Object.freeze([
  "src/provider-evidence-replay-adapter.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
  "tests/provider-evidence-replay-adapter.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderExperimentGateChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-controlled-live-provider-experiment-gate.md",
  "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-experiment-gate.test.mjs",
  "tests/real-external-evidence-pilot-readiness.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const disabledLiveProviderExperimentHarnessChangedFiles = Object.freeze([
  "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-disabled-local-live-provider-experiment-harness.md",
  "src/local-report/disabled-live-provider-experiment-harness.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/disabled-live-provider-experiment-harness.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderSmokeChangedFiles = Object.freeze([
  "bin/norma-core-controlled-live-provider-smoke.mjs",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderSmokeDiagnosticsChangedFiles = Object.freeze([
  "bin/norma-core-controlled-live-provider-smoke.mjs",
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderDiagnosticNextActionsChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderSmokeOutcomeCheckpointChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-outcome-checkpoint.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderIncompleteResponseGuardChangedFiles = Object.freeze([
  "bin/norma-core-controlled-live-provider-smoke.mjs",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderSmokeArtifactProofChangedFiles = Object.freeze([
  "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledLiveProviderSmokeResponseStatusGuardChangedFiles = Object.freeze([
  "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
  "src/local-report/controlled-live-provider-smoke-artifact-proof.ts",
  "src/local-report/controlled-live-provider-smoke.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledProviderObservationContractChangedFiles = Object.freeze([
  "src/local-report/controlled-provider-observation-contract.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/mcp-remote-package-dependency-decision.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledProviderObservationAcceptanceProofChangedFiles = Object.freeze([
  "src/local-report/controlled-provider-observation-acceptance-proof.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/mcp-remote-package-dependency-decision.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const controlledProviderObservationToCoreHandoffChangedFiles = Object.freeze([
  "src/local-report/controlled-provider-observation-to-core-handoff.ts",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
].sort());

export const localVisualObservationToCorePilotContractChangedFiles = Object.freeze([
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
].sort());

export const controlledLocalLiveVisualCandidateObservationDemoChangedFiles = Object.freeze([
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
].sort());

export const explicitAcceptedObservationToCoreHandoffChangedFiles = Object.freeze([
  "src/accepted-geometry-to-core-mapping.ts",
  "src/local-report/controlled-provider-observation-to-core-handoff.ts",
  "tests/accepted-geometry-to-core-mapping.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/controlled-provider-observation-to-core-handoff.test.mjs",
  "tests/controlled-live-provider-smoke-artifact-proof.test.mjs",
  "tests/controlled-live-provider-smoke.test.mjs",
  "tests/controlled-provider-observation-acceptance-proof.test.mjs",
  "tests/controlled-provider-observation-contract.test.mjs",
  "tests/local-visual-observation-to-core-pilot-contract.test.mjs",
  "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
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

export const acceptedGeometryToCoreMapperChangedFiles = Object.freeze([
  "src/accepted-geometry-to-core-mapping.ts",
  "tests/accepted-geometry-to-core-mapping.test.mjs",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
].sort());

export const acceptedGeometryToCoreMapperNonSemgrepMaintenanceChangedFiles = Object.freeze(
  acceptedGeometryToCoreMapperChangedFiles
    .filter((file) => !semgrepCiGuardMaintenanceFiles.has(file))
    .sort(),
);

export const acceptedGeometryToCoreMapperReviewFixesChangedFiles = Object.freeze([
  "src/accepted-geometry-to-core-mapping.ts",
  "tests/accepted-geometry-to-core-mapping.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
].sort());

export const acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles = Object.freeze([
  "tests/accepted-geometry-to-structured-analyze-integration.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
].sort());

// Intentionally aliased while PR82 and PR84 share the same exact file set.
// Split this into a dedicated list if the fresh-clone proof scope diverges.
export const acceptedGeometryStructuredAnalyzeFreshCloneProofChangedFiles =
  acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles;

export const acceptedGeometryStructuredAnalyzeNormalizationChangedFiles = Object.freeze([
  "src/accepted-geometry-to-structured-analyze-normalization.ts",
  "tests/accepted-geometry-to-structured-analyze-integration.test.mjs",
  "tests/accepted-geometry-to-structured-analyze-normalization.test.mjs",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
].sort());

// PR86 metric-policy provenance fix intentionally reuses the PR85 normalizer file set.
export const acceptedGeometryStructuredAnalyzeNormalizationMetricPolicyFixChangedFiles =
  acceptedGeometryStructuredAnalyzeNormalizationChangedFiles;

export const postPr82RoadmapTruthSyncChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-01-post-pr82-roadmap-truth-sync.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/post-pr82-roadmap-truth-sync.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const postPr86RoadmapTruthSyncChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-01-post-pr86-roadmap-truth-sync.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/post-pr86-roadmap-truth-sync.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const postPr92RoadmapTruthSyncChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-02-post-pr92-roadmap-truth-sync.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/post-pr92-roadmap-truth-sync.test.mjs",
  "tests/roadmap-status-update.test.mjs",
].sort());

export const integrationUnlockContractsChangedFiles = Object.freeze([
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-07-01-integration-unlock-contracts.md",
  "tests/changed-file-guard.mjs",
  "tests/changed-file-guard.test.mjs",
  "tests/integration-unlock-contracts.test.mjs",
].sort());

const sharedExactApprovedChangedFileSets = [
  personalVisualHarmonyTruthSyncChangedFiles,
  personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles,
  personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
  personalVisualHarmonyRotatedEllipsesChangedFiles,
  personalVisualHarmonyTriangleConstructionsChangedFiles,
  personalVisualHarmonyJunctionAnglesChangedFiles,
  personalVisualHarmonyObliqueFormatConstructionsChangedFiles,
  personalVisualHarmonyPixelRefinementIntegrationChangedFiles,
  personalVisualHarmonyPixelRefinementShadowChangedFiles,
  personalVisualHarmonyImageHydrationChangedFiles,
  personalChatGptVisualHarmonyDemoChangedFiles,
  personalChatGptVisualHarmonyDemoNonSemgrepMaintenanceChangedFiles,
  personalChatGptVisualHarmonyDemoOriginalChangedFiles,
  personalChatGptVisualHarmonyDemoOriginalNonSemgrepMaintenanceChangedFiles,
  remoteMcpRenderPrivateBetaDeploymentChangedFiles,
  permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
  permanentRemoteMcpRuntimeChangedFiles,
  statelessRemoteMcpCommercialBetaContractChangedFiles,
  statelessRemoteMcpCommercialBetaContractNonSemgrepMaintenanceChangedFiles,
  privateDevChatGptMcpCompleteLiveProofChangedFiles,
  privateDevLocalVisualMcpOrchestrationChangedFiles,
  pr132ValidationHardeningCheckpointChangedFiles,
  privateDevChatGptMcpVisualPilotGateChangedFiles,
  localVisualCandidateReviewChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationContractChangedFiles,
  controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  controlledLiveProviderSmokeArtifactProofChangedFiles,
  controlledLiveProviderIncompleteResponseGuardChangedFiles,
  controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  controlledLiveProviderDiagnosticNextActionsChangedFiles,
  controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles,
  controlledLiveProviderSmokeDiagnosticsChangedFiles,
  controlledLiveProviderSmokeChangedFiles,
  disabledLiveProviderExperimentHarnessChangedFiles,
  controlledLiveProviderExperimentGateChangedFiles,
  providerEvidenceReplayAdapterChangedFiles,
  realExternalEvidencePilotReadinessGateChangedFiles,
  syntheticEvidenceAcceptanceDemoNonSemgrepMaintenanceChangedFiles,
  syntheticEvidenceAcceptanceDemoChangedFiles,
  syntheticExternalEvidenceAcceptanceProofChangedFiles,
  syntheticExternalEvidenceAcceptanceBoundaryChangedFiles,
  openaiVisionStyleEvidencePilotContractChangedFiles,
  localVisualPilotBoundaryChangedFiles,
  visualAdapterStaticScenarioCorpusChangedFiles,
  visualFixtureGuidedInspectionConsumerProofChangedFiles,
  postPr104VisualFixtureRoadmapTruthSyncChangedFiles,
  localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  localVisualFixtureGuidedInspectionDemoChangedFiles,
  visualAdapterStaticFixtureHandoffChangedFiles,
  visualAdapterFixtureContractChangedFiles,
  guidedInspectionPackageApiTarballHardeningChangedFiles,
  packagePublicationCandidateWithoutPublishingChangedFiles,
  guidedInspectionPackageTarballLocalInstallReadinessNonSemgrepMaintenanceChangedFiles,
  guidedInspectionPackageTarballLocalInstallReadinessChangedFiles,
  guidedInspectionPackagePublicationReadinessChangedFiles,
  guidedInspectionPackageRootConsumerCompatibilityChangedFiles,
  guidedInspectionPackageRootApiExportsNonSemgrepMaintenanceChangedFiles,
  guidedInspectionPackageRootApiExportsChangedFiles,
  packageApiExportContractApprovalChangedFiles,
  guidedInspectionConsumerProofChangedFiles,
  postPr92RoadmapTruthSyncChangedFiles,
  guidedInspectionDemoArtifactContractWiringChangedFiles,
  guidedInspectionArtifactContractChangedFiles,
  guidedInspectionPackageApiReadinessGateChangedFiles,
  integrationUnlockContractsChangedFiles,
  postPr86RoadmapTruthSyncChangedFiles,
  postPr82RoadmapTruthSyncChangedFiles,
  acceptedGeometryStructuredAnalyzeNormalizationChangedFiles,
  acceptedGeometryStructuredAnalyzeIntegrationProofChangedFiles,
  acceptedGeometryToCoreMapperReviewFixesChangedFiles,
  acceptedGeometryToCoreMapperChangedFiles,
  acceptedGeometryToCoreMapperNonSemgrepMaintenanceChangedFiles,
  localGuidedInspectionDemoChangedFiles,
  localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  localCliReportBoundaryFreezeChangedFiles,
  realUsecaseLocalDemoCommandHardeningChangedFiles,
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

export function isCleanBaseValidationContext(repoRoot = defaultRepoRoot, baseRefs = defaultBaseRefs()) {
  const baseHead = firstSuccessfulGitOutput(
    repoRoot,
    baseRefs.map((ref) => ["rev-parse", "--verify", ref]),
  );
  if (baseHead === null) return false;

  const head = gitOutput(repoRoot, ["rev-parse", "--verify", "HEAD"]);
  const status = gitOutput(repoRoot, ["status", "--porcelain=v1", "-uall"]);
  return head === baseHead && status === "" && branchChangedFiles(repoRoot, baseRefs).length === 0;
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

function firstSuccessfulGitOutput(repoRoot, argSets) {
  for (const args of argSets) {
    try {
      return gitOutput(repoRoot, args);
    } catch (error) {
      if (!isMissingBaseRefGitError(error)) throw error;
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

function gitOutput(repoRoot, args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function isMissingBaseRefGitError(error) {
  const stderr = Buffer.isBuffer(error.stderr) ? error.stderr.toString("utf8") : String(error.stderr ?? "");
  const message = `${error.message}\n${stderr}`;

  return /ambiguous argument .*HEAD|unknown revision|bad revision|no merge base|needed a single revision/i.test(message);
}
