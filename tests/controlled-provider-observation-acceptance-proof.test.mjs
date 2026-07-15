import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  validateAcceptedGeometryV1,
} from "../dist/src/geometry-observation.js";
import {
  createControlledProviderObservationAcceptanceProofV1,
  computeControlledProviderObservationContractContentIdentityV1,
} from "../dist/src/local-report/controlled-provider-observation-acceptance-proof.js";
import { createControlledProviderObservationContractV1 } from "../dist/src/local-report/controlled-provider-observation-contract.js";
import { createControlledLiveProviderSmokeArtifactProofV1 } from "../dist/src/local-report/controlled-live-provider-smoke-artifact-proof.js";
import { analyzeStructuredCompositionV1 } from "../dist/src/structured-composition-analysis.js";
import {
  branchChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  isExactChangedFileSet,
  isCleanBaseValidationContext,
  localVisualCandidateReviewChangedFiles,
  privateDevChatGptMcpCompleteLiveProofChangedFiles,
  personalChatGptVisualHarmonyDemoChangedFiles,
  personalVisualHarmonyImageHydrationChangedFiles,
  personalVisualHarmonyJunctionAnglesChangedFiles,
  personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles,
  personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles,
  personalVisualHarmonyRotatedEllipsesChangedFiles,
  personalVisualHarmonyTriangleConstructionsChangedFiles,
  personalVisualHarmonyPixelRefinementIntegrationChangedFiles,
  personalVisualHarmonyObliqueFormatConstructionsChangedFiles,
  personalVisualHarmonyPixelRefinementShadowChangedFiles,
  personalVisualHarmonyTruthSyncChangedFiles,
  privateDevChatGptMcpVisualPilotGateChangedFiles,
  privateDevLocalVisualMcpOrchestrationChangedFiles,
  permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
  permanentRemoteMcpRuntimeChangedFiles,
  remoteMcpRenderPrivateBetaDeploymentChangedFiles,
  pr132ValidationHardeningCheckpointChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  sharedExactApprovedChangedFiles,
  statelessRemoteMcpCommercialBetaContractChangedFiles,
} from "./changed-file-guard.mjs";
import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const helperSourcePath = path.join(
  repoRoot,
  "src",
  "local-report",
  "controlled-provider-observation-acceptance-proof.ts",
);
const indexSourcePath = path.join(repoRoot, "src", "index.ts");
const packageJsonPath = path.join(repoRoot, "package.json");

test("PR125 valid PR124 observation plus explicit accepted geometry produces only safe proof facts", () => {
  const input = createValidProofInput();
  const proof = createControlledProviderObservationAcceptanceProofV1(input);

  assert.deepEqual(proof, {
    status: "ok",
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    providerObservationAuthority: "candidateEvidenceOnly",
    acceptedGeometryIsOnlyCoreInput: true,
    providerEvidenceOnly: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerObservationId: input.providerObservationContract.observationId,
    providerObservationContentIdentity: input.acceptanceBoundary.providerObservationContentIdentity,
    acceptedGeometryId: input.acceptedStructuredGeometry.acceptedGeometryId,
    acceptedGeometryContentIdentity: input.acceptedStructuredGeometry.contentIdentity,
    acceptedGeometryRevisionContentIdentity:
      input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity,
    nextAllowedStep: "accepted_geometry_to_core_mapping_or_structured_analyze",
  });
  assert.deepEqual(Object.keys(proof).sort(), [
    "acceptanceBoundaryExplicit",
    "acceptedGeometryContentIdentity",
    "acceptedGeometryId",
    "acceptedGeometryIsOnlyCoreInput",
    "acceptedGeometryRevisionContentIdentity",
    "acceptedStructuredGeometryValidated",
    "boundarySourceTruth",
    "coreInputAuthority",
    "coreInputProduced",
    "nextAllowedStep",
    "providerEvidenceOnly",
    "providerGeometryCreated",
    "providerObservationAuthority",
    "providerObservationContentIdentity",
    "providerObservationId",
    "providerSelfAcceptance",
    "resultJsonProduced",
    "status",
    "structuredAnalyzeRun",
  ]);
});

test("PR125 provider observation remains invalid as accepted geometry and Structured Analyze input", () => {
  const { providerObservationContract } = createValidProofInput();

  assert.equal(validateAcceptedGeometryV1(providerObservationContract).ok, false);
  assert.equal(analyzeStructuredCompositionV1(providerObservationContract).status, "invalid");
  assert.throws(
    () =>
      createControlledProviderObservationAcceptanceProofV1({
        ...createValidProofInput(),
        acceptedStructuredGeometry: providerObservationContract,
      }),
    /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
  );
});

test("PR125 delegates accepted geometry validation and identity checks to existing helpers", async () => {
  const input = createValidProofInput();
  const helperSource = await readFile(helperSourcePath, "utf8");

  assert.equal(validateAcceptedGeometryV1(input.acceptedStructuredGeometry).ok, true);
  assert.match(helperSource, /validateAcceptedGeometryV1/u);
  assert.match(helperSource, /computeAcceptedGeometryRevisionContentIdentity/u);
  assert.match(helperSource, /computeAcceptedGeometryContentIdentity/u);
  assert.equal(
    input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity,
    computeAcceptedGeometryRevisionContentIdentity(input.acceptedStructuredGeometry),
  );
  assert.equal(
    input.acceptedStructuredGeometry.contentIdentity,
    computeAcceptedGeometryContentIdentity(input.acceptedStructuredGeometry),
  );
});

test("PR125 accepted geometry is supplied separately and helper does not repair or rewrite it", () => {
  const input = createValidProofInput();
  const acceptedBefore = structuredClone(input.acceptedStructuredGeometry);
  const staleAccepted = {
    ...structuredClone(input.acceptedStructuredGeometry),
    contentIdentity: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };

  assert.throws(
    () =>
      createControlledProviderObservationAcceptanceProofV1({
        ...input,
        acceptedStructuredGeometry: staleAccepted,
      }),
    /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
  );
  assert.deepEqual(input.acceptedStructuredGeometry, acceptedBefore);
});

test("PR125 acceptance boundary links exact observation and accepted geometry identities", () => {
  const input = createValidProofInput();
  const proof = createControlledProviderObservationAcceptanceProofV1(input);

  assert.equal(proof.providerObservationId, input.providerObservationContract.observationId);
  assert.equal(
    proof.providerObservationContentIdentity,
    computeControlledProviderObservationContractContentIdentityV1(input.providerObservationContract),
  );
  assert.equal(proof.acceptedGeometryId, input.acceptedStructuredGeometry.acceptedGeometryId);
  assert.equal(proof.acceptedGeometryContentIdentity, input.acceptedStructuredGeometry.contentIdentity);
  assert.equal(
    proof.acceptedGeometryRevisionContentIdentity,
    input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity,
  );
});

test("PR125 rejects mismatched observation and accepted geometry links", () => {
  const mismatchIdentity = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  for (const [name, mutate, pattern] of [
    [
      "observation id",
      (input) => {
        input.acceptanceBoundary.providerObservationId = "controlled-provider-observation:v1:mismatch";
      },
      /acceptanceBoundary\.providerObservationId/u,
    ],
    [
      "observation content identity",
      (input) => {
        input.acceptanceBoundary.providerObservationContentIdentity = mismatchIdentity;
      },
      /acceptanceBoundary\.providerObservationContentIdentity/u,
    ],
    [
      "accepted geometry id",
      (input) => {
        input.acceptanceBoundary.acceptedGeometryId = "accepted:mismatch:v1";
      },
      /acceptanceBoundary\.acceptedGeometryId/u,
    ],
    [
      "accepted geometry content identity",
      (input) => {
        input.acceptanceBoundary.acceptedGeometryContentIdentity = mismatchIdentity;
      },
      /acceptanceBoundary\.acceptedGeometryContentIdentity/u,
    ],
    [
      "accepted geometry revision content identity",
      (input) => {
        input.acceptanceBoundary.acceptedGeometryRevisionContentIdentity = mismatchIdentity;
      },
      /acceptanceBoundary\.acceptedGeometryRevisionContentIdentity/u,
    ],
    [
      "accepted source observation id",
      (input) => {
        input.acceptedStructuredGeometry.sourceObservationId = "controlled-provider-observation:v1:mismatch";
      },
      /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
    ],
    [
      "accepted source observation content identity",
      (input) => {
        input.acceptedStructuredGeometry.sourceObservationContentIdentity = mismatchIdentity;
      },
      /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
    ],
  ]) {
    const input = createValidProofInput();
    mutate(input);
    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      pattern,
      name,
    );
  }
});

test("PR125 rejects a forged observation id even when all dependent identities are recomputed", () => {
  for (const imageContentIdentity of [
    "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    null,
  ]) {
    const input = createValidProofInput();
    const forgedObservationId = "controlled-provider-observation:v1:forged";

    input.providerObservationContract.imageContentIdentity = imageContentIdentity;
    input.providerObservationContract.observationId = forgedObservationId;
    const forgedObservationContentIdentity =
      computeControlledProviderObservationContractContentIdentityV1(input.providerObservationContract);
    input.acceptanceBoundary.providerObservationId = forgedObservationId;
    input.acceptanceBoundary.providerObservationContentIdentity = forgedObservationContentIdentity;
    input.acceptedStructuredGeometry.sourceObservationId = forgedObservationId;
    input.acceptedStructuredGeometry.sourceObservationContentIdentity = forgedObservationContentIdentity;
    input.acceptedStructuredGeometry.acceptance.sourceObservationId = forgedObservationId;
    input.acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity = forgedObservationContentIdentity;
    input.acceptedStructuredGeometry.provenance.inputContentIdentity = forgedObservationContentIdentity;
    input.acceptedStructuredGeometry.acceptance.provenance.inputContentIdentity =
      forgedObservationContentIdentity;
    refreshAcceptedGeometryIdentities(input);

    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      /providerObservationContract\.observationId/u,
      String(imageContentIdentity),
    );
  }
});

test("PR125 rejects provider-authored correction history", () => {
  for (const [name, mutate] of [
    ["correction actor", (correction) => { correction.actorType = "provider"; }],
    ["correction provenance actor", (correction) => { correction.provenance.actorType = "provider"; }],
  ]) {
    const input = createValidProofInput();
    const correction = createCorrectionEntry();
    mutate(correction);
    input.acceptedStructuredGeometry.correctionHistory.push(correction);
    refreshAcceptedGeometryIdentities(input);

    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      /acceptedStructuredGeometry\.correctionHistory\.0/u,
      name,
    );
  }
});

test("PR125 validates acceptance provenance against the non-provider acceptance actor and input", () => {
  const mismatchIdentity = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  for (const [name, mutate, pattern] of [
    [
      "acceptance provenance actor type",
      (provenance) => { provenance.actorType = "provider"; },
      /acceptedStructuredGeometry\.acceptance\.provenance\.actorType/u,
    ],
    [
      "acceptance provenance actor id",
      (provenance) => { provenance.actorId = "stale-actor"; },
      /acceptedStructuredGeometry\.acceptance\.provenance\.actorId/u,
    ],
    [
      "acceptance provenance input",
      (provenance) => { provenance.inputContentIdentity = mismatchIdentity; },
      /acceptedStructuredGeometry\.acceptance\.provenance\.inputContentIdentity/u,
    ],
  ]) {
    const input = createValidProofInput();
    input.acceptedStructuredGeometry.acceptance.provenance = structuredClone(
      input.acceptedStructuredGeometry.acceptance.provenance,
    );
    mutate(input.acceptedStructuredGeometry.acceptance.provenance);
    refreshAcceptedGeometryIdentities(input);

    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      pattern,
      name,
    );
  }
});

test("PR125 rejects provider model prompt artifact confidence diagnostic and metadata acceptance actors", () => {
  for (const actorClass of [
    "provider",
    "model",
    "prompt",
    "artifact",
    "confidence",
    "diagnostic",
    "metadata",
  ]) {
    const input = createValidProofInput();
    input.acceptanceBoundary.acceptanceActor.actorClass = actorClass;
    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      /acceptanceBoundary\.acceptanceActor\.actorClass/u,
      actorClass,
    );
  }
});

test("PR125 rejects confidence status diagnostic artifact provider metadata self and automatic acceptance", () => {
  for (const [name, mutate] of [
    ["confidence", (input) => { input.acceptanceBoundary.confidenceScoreValueCanAuthorizeAcceptance = true; }],
    ["status", (input) => { input.acceptanceBoundary.providerStatusCanAuthorizeAcceptance = true; }],
    ["diagnostic", (input) => { input.acceptanceBoundary.providerDiagnosticCanAuthorizeAcceptance = true; }],
    ["artifact", (input) => { input.acceptanceBoundary.artifactCanAuthorizeAcceptance = true; }],
    ["metadata", (input) => { input.acceptanceBoundary.providerMetadataCanAuthorizeAcceptance = true; }],
    ["prompt", (input) => { input.acceptanceBoundary.promptCanAuthorizeAcceptance = true; }],
    ["provider self acceptance", (input) => { input.acceptanceBoundary.providerSelfAcceptance = true; }],
    ["automatic acceptance", (input) => { input.acceptanceBoundary.automaticAcceptance = true; }],
    ["provider geometry creation", (input) => { input.acceptanceBoundary.providerGeometryCreated = true; }],
    ["provider-created accepted geometry", (input) => { input.providerObservationContract.acceptedStructuredGeometryProduced = true; }],
  ]) {
    const input = createValidProofInput();
    mutate(input);
    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      /Invalid controlled provider observation acceptance proof field/u,
      name,
    );
  }
});

test("PR125 rejects unsafe raw data recursively", () => {
  for (const [name, mutate] of [
    ["raw provider output", (input) => { input.acceptanceBoundary.rawProviderOutput = "unsafe"; }],
    ["URL", (input) => { input.acceptanceBoundary.note = "https://example.invalid/source.png"; }],
    ["file URL", (input) => { input.acceptanceBoundary.note = "file:///Users/pana/private/source.png"; }],
    ["local absolute path", (input) => { input.acceptanceBoundary.note = "/Users/pana/private/source.png"; }],
    ["API key", (input) => { input.acceptanceBoundary.apiKey = "sk-fakeUnsafeCredentialValue000"; }],
    ["bearer token", (input) => { input.acceptanceBoundary.authorization = "Bearer [REDACTED:Bearer token]"; }],
    ["provider request ID", (input) => { input.acceptanceBoundary.providerRequestId = "req_unsafe"; }],
    ["account ID", (input) => { input.acceptanceBoundary.accountId = "acct_unsafe"; }],
    ["prompt text", (input) => { input.acceptanceBoundary.promptText = "infer geometry"; }],
    ["reasoning text", (input) => { input.acceptanceBoundary.reasoningText = "unsafe"; }],
    ["chain of thought", (input) => { input.acceptanceBoundary.chainOfThought = "unsafe"; }],
    ["image bytes", (input) => { input.acceptanceBoundary.imageBytes = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"; }],
    ["base64 image", (input) => { input.acceptanceBoundary.imageBase64 = "data:image/png;base64,AAAA"; }],
    ["raw request body", (input) => { input.acceptanceBoundary.rawRequestBody = { input: [] }; }],
    ["raw response body", (input) => { input.acceptanceBoundary.rawResponseBody = { output: [] }; }],
    ["provider-specific payload", (input) => { input.acceptanceBoundary.providerSpecificPayload = { output_text: "unsafe" }; }],
    ["metadata", (input) => { input.acceptanceBoundary.providerMetadata = { finish_reason: "stop" }; }],
  ]) {
    const input = createValidProofInput();
    mutate(input);
    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(input),
      /unsafe field|unsafe value/u,
      name,
    );
  }
});

test("PR125 rejects non-plain missing inherited and unknown fields", () => {
  const input = createValidProofInput();
  const missing = { ...input };
  delete missing.acceptanceBoundary;
  const inherited = Object.create(input);

  for (const value of [null, [], new Date(), inherited]) {
    assert.throws(
      () => createControlledProviderObservationAcceptanceProofV1(value),
      /field "input": requires plain object/u,
    );
  }
  assert.throws(
    () => createControlledProviderObservationAcceptanceProofV1(missing),
    /input\.acceptanceBoundary.*requires own field/u,
  );
  assert.throws(
    () => createControlledProviderObservationAcceptanceProofV1({ ...input, extra: true }),
    /input\.extra.*unknown field/u,
  );
});

test("PR125 helper does not mutate caller input", () => {
  const input = createValidProofInput();
  const before = structuredClone(input);

  createControlledProviderObservationAcceptanceProofV1(input);

  assert.deepEqual(input, before);
});

test("PR125 helper is package-private and avoids forbidden execution dependencies", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const importStatements = helperSource
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.doesNotMatch(
    importStatements,
    /node:fs|node:child_process|node:https?|fetch|XMLHttpRequest|WebSocket|@openai|OpenAI|api\.openai|provider-sdk|provider parser|mcp|chatgpt|cad|figma|upload|oauth|from "\.\.\/index|from "@norma\/core"|analyzeStructuredCompositionV1/iu,
  );
  assert.doesNotMatch(helperSource, /fetch\(|result\.json|analyzeStructuredCompositionV1/iu);
  assert.equal("createControlledProviderObservationAcceptanceProofV1" in packageRoot, false);
  assert.equal("computeControlledProviderObservationContractContentIdentityV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /controlled-provider-observation-acceptance-proof/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assertCurrentRemoteMcpPackageBoundary(packageJson);
});

test("PR125 changed files stay exact and reject forbidden extras", () => {
  const changedFiles = branchChangedFiles(repoRoot);
  assert.equal(personalVisualHarmonyTruthSyncChangedFiles.includes("docs/examples/personal-chatgpt-visual-harmony-demo.md"), true);
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyTruthSyncChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, permanentRemoteMcpQuotaIsolationHotfixChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, remoteMcpRenderPrivateBetaDeploymentChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, permanentRemoteMcpRuntimeChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, statelessRemoteMcpCommercialBetaContractChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, privateDevChatGptMcpCompleteLiveProofChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalChatGptVisualHarmonyDemoChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyImageHydrationChangedFiles)) {
    assert.deepEqual(
      sharedExactApprovedChangedFiles(changedFiles),
      personalVisualHarmonyImageHydrationChangedFiles,
    );
    return;
  }
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyPixelRefinementIntegrationChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyJunctionAnglesChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyRotatedEllipsesChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyRotatedEllipsePixelRefinementKernelChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyRotatedEllipsePixelIntegrationChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyTriangleConstructionsChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyObliqueFormatConstructionsChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, personalVisualHarmonyPixelRefinementShadowChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, privateDevLocalVisualMcpOrchestrationChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, privateDevChatGptMcpVisualPilotGateChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, pr132ValidationHardeningCheckpointChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, localVisualCandidateReviewChangedFiles)) return;
  const isCleanBase = isCleanBaseValidationContext(repoRoot);
  const isPr131Set = isExactChangedFileSet(changedFiles, localVisualCandidateReviewProductSurfaceChangedFiles);
  const isPr130Set = isExactChangedFileSet(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
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
  const isPr128Set = isExactChangedFileSet(changedFiles, explicitAcceptedObservationToCoreHandoffChangedFiles);
  const isPr129Set = isExactChangedFileSet(changedFiles, controlledLocalLiveVisualCandidateObservationDemoChangedFiles);
  const expectedChangedFiles = isPr131Set
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
      : controlledProviderObservationAcceptanceProofChangedFiles;

  assert.equal(isCleanBase || isPr125Set || isPr126Set || isPr127Set || isPr128Set || isPr129Set || isPr130Set || isPr131Set, true);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationAcceptanceProofChangedFiles),
    controlledProviderObservationAcceptanceProofChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(changedFiles),
    isCleanBase ? null : expectedChangedFiles,
  );

  for (const forbiddenFile of [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-09-provider-parser.md",
    "tests/fixtures/provider-evidence-replay/static-provider-evidence-replay-v1.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
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
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/controlled-provider/result.json",
    "src/**",
    "docs/**",
    "tests/**",
    "bin/**",
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

function createValidProofInput() {
  const providerObservationContract = createControlledProviderObservationContractV1(
    createRedactedSuccessArtifacts(),
  );
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
  const acceptedStructuredGeometry = createAcceptedGeometry(
    providerObservationContract.observationId,
    providerObservationContentIdentity,
  );
  const acceptanceBoundary = {
    kind: "norma.controlled-provider-observation-acceptance-boundary.v1",
    version: 1,
    acceptanceActor: {
      actorClass: "deterministic_test",
      actorId: "pr125-test",
    },
    acceptanceMode: "explicit_acceptance",
    providerObservationId: providerObservationContract.observationId,
    providerObservationContentIdentity,
    acceptedGeometryId: acceptedStructuredGeometry.acceptedGeometryId,
    acceptedGeometryContentIdentity: acceptedStructuredGeometry.contentIdentity,
    acceptedGeometryRevisionContentIdentity:
      acceptedStructuredGeometry.acceptance.acceptedContentIdentity,
    decisionProvenance: {
      source: "non_provider_explicit_acceptance",
      localOnly: true,
      providerGenerated: false,
      promptDerived: false,
      artifactDerived: false,
      confidenceDerived: false,
      diagnosticDerived: false,
      metadataDerived: false,
    },
    localOnly: true,
    outsideProviderBoundary: true,
    nonProviderAuthority: true,
    providerEvidenceOnly: true,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    promptCanAuthorizeAcceptance: false,
    automaticAcceptance: false,
    providerGeometryCreated: false,
  };

  return {
    providerObservationContract,
    acceptanceBoundary,
    acceptedStructuredGeometry,
  };
}

function createAcceptedGeometry(sourceObservationId, sourceObservationContentIdentity) {
  const actorType = "deterministic-test";
  const actorId = "pr125-test";
  const createdAt = "2026-07-09T00:00:00Z";
  const provenance = {
    provenanceId: "prov:pr125:test",
    actorType,
    actorId,
    operationId: "controlled-provider-observation.acceptance-boundary",
    operationVersion: "1",
    inputContentIdentity: sourceObservationContentIdentity,
    createdAt,
    notes: null,
  };
  const accepted = {
    contractId: "norma.accepted-geometry@1",
    contractVersion: 1,
    acceptedGeometryId: "accepted:controlled-provider-observation:pr125:v1",
    sourceObservationId,
    sourceObservationContentIdentity,
    acceptedRevision: 1,
    coordinateFrame: {
      dimensions: 2,
      coordinateScale: "normalized",
      origin: "top-left",
      xDirection: "right",
      yDirection: "down",
      bounds: {
        x: [0, 1],
        y: [0, 1],
      },
      sourcePixelWidth: 100,
      sourcePixelHeight: 100,
    },
    primitives: [
      {
        id: "point:center",
        kind: "point",
        x: 0.5,
        y: 0.5,
        confidence: null,
      },
    ],
    correctionHistory: [],
    acceptance: {
      acceptanceId: "acceptance:controlled-provider-observation:pr125:v1",
      accepted: true,
      actorType,
      actorId,
      acceptedAt: createdAt,
      sourceObservationId,
      sourceObservationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      acceptedPrimitiveIds: ["point:center"],
      provenance,
    },
    provenance,
    contentIdentity: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  };

  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  assert.equal(validateAcceptedGeometryV1(accepted).ok, true);
  return accepted;
}

function createCorrectionEntry() {
  return {
    correctionId: "correction:pr125:provider-authorship-check",
    sequence: 0,
    actorType: "deterministic-test",
    operation: "update",
    targetPrimitiveId: "point:center",
    reason: "Exercise correction authorship validation.",
    beforeContentIdentity: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    afterContentIdentity: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    provenance: {
      provenanceId: "prov:pr125:correction",
      actorType: "deterministic-test",
      actorId: "pr125-test",
      operationId: "controlled-provider-observation.acceptance-boundary",
      operationVersion: "1",
      inputContentIdentity: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      createdAt: "2026-07-09T00:00:00Z",
      notes: null,
    },
  };
}

function refreshAcceptedGeometryIdentities(input) {
  input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity =
    computeAcceptedGeometryRevisionContentIdentity(input.acceptedStructuredGeometry);
  input.acceptedStructuredGeometry.contentIdentity =
    computeAcceptedGeometryContentIdentity(input.acceptedStructuredGeometry);
  input.acceptanceBoundary.acceptedGeometryContentIdentity =
    input.acceptedStructuredGeometry.contentIdentity;
  input.acceptanceBoundary.acceptedGeometryRevisionContentIdentity =
    input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity;
}

function createRedactedSuccessArtifacts() {
  const providerEvidenceEnvelope = {
    kind: "norma.controlled-live-provider-smoke.provider-evidence-envelope.v1",
    version: 1,
    liveProviderExecution: true,
    manualOnly: true,
    localOnly: true,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    resultJsonProduced: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    promptArtifactOrMetricPolicyCanAuthorizeAcceptance: false,
    rawProviderOutputPersisted: false,
    rawImagePersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    image: {
      contentIdentity: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      mediaType: "image/png",
      sizeBytes: 128,
      sourcePathPersisted: false,
      rawImagePersisted: false,
      base64Persisted: false,
    },
    providerCall: {
      provider: "openai-responses-vision",
      modelConfigured: true,
      endpointKind: "openai_responses_api",
      timeoutMs: 30_000,
      credentialHeaderPersisted: false,
      requestBodyPersisted: false,
      rawProviderOutputPersisted: false,
      responseStatusCode: 200,
      responseClass: "success",
      providerOutputObserved: true,
      providerOutputTextPersisted: false,
    },
    evidenceSummary: {
      providerOutputObserved: true,
      persistedObservationClass: "redacted_provider_response_observed",
      providerNeutralObservationTextPersisted: false,
      lowCardinalityOnly: true,
    },
  };

  const summary = {
    kind: "norma.controlled-live-provider-smoke.summary.v1",
    liveProviderExecution: true,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    rawProviderOutputPersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    artifacts: [
      "provider-evidence-envelope.json",
      "summary.json",
      "summary.md",
    ],
    nonGoals: [
      "not production OpenAI integration",
      "not provider output truth",
      "not accepted structured geometry",
      "not Core input",
      "not result.json production",
      "not CI live-network behavior",
      "not package API or export expansion",
    ],
  };

  createControlledLiveProviderSmokeArtifactProofV1({
    providerEvidenceEnvelope,
    summary,
  });
  return {
    providerEvidenceEnvelope,
    summary,
  };
}
