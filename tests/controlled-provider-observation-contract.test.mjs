import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import {
  createControlledProviderObservationContractV1,
  createControlledProviderObservationContractV2,
  validateControlledProviderObservationContractV2,
} from "../dist/src/local-report/controlled-provider-observation-contract.js";
import {
  createControlledLiveProviderCandidateArtifactProofV1,
  createControlledLiveProviderSmokeArtifactProofV1,
} from "../dist/src/local-report/controlled-live-provider-smoke-artifact-proof.js";
import {
  createLocalVisualProviderExecutionReceiptV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-contracts.js";
import { analyzeStructuredCompositionV1 } from "../dist/src/structured-composition-analysis.js";
import {
  branchChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationContractChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  isExactChangedFileSet,
  isCleanBaseValidationContext,
  localVisualCandidateReviewChangedFiles,
  privateDevChatGptMcpVisualPilotGateChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const helperSourcePath = path.join(
  repoRoot,
  "src",
  "local-report",
  "controlled-provider-observation-contract.ts",
);
const indexSourcePath = path.join(repoRoot, "src", "index.ts");
const packageJsonPath = path.join(repoRoot, "package.json");

test("PR124 valid PR123-style smoke artifacts create an untrusted provider observation envelope", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const proof = createControlledLiveProviderSmokeArtifactProofV1(artifacts);
  const observation = createControlledProviderObservationContractV1(artifacts);

  assert.deepEqual(proof, {
    status: "ok",
    smokeStatus: "ok",
    providerEvidenceOnly: true,
    providerOutputObserved: true,
    providerOutputIsCoreTruth: false,
    providerOutputIsAcceptedGeometry: false,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    resultJsonCanonicalTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    sourceArtifactsRedacted: true,
    rawProviderOutputPersisted: false,
    rawRequestBodyPersisted: false,
    rawImagePersisted: false,
    sourceArtifactKinds: [
      "provider-evidence-envelope.json",
      "summary.json",
    ],
    derivedArtifactRefs: [],
    nextAllowedStep: "controlled_provider_observation_contract",
  });

  assert.deepEqual(observation, {
    kind: "norma.controlled-provider-observation-contract.v1",
    version: 1,
    observationId:
      "controlled-provider-observation:v1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    providerEvidenceOnly: true,
    untrusted: true,
    nonAuthoritative: true,
    sourceArtifactsRedacted: true,
    sourceArtifactKinds: [
      "provider-evidence-envelope.json",
      "summary.json",
    ],
    providerOutputObserved: true,
    redactedDiagnosticClass: null,
    redactedDiagnosticNextAction: null,
    imageContentIdentity: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    mediaTypeClass: "raster_png",
    imageSizeClass: "small",
    providerClass: "controlled_live_provider",
    endpointClass: "responses_api",
    responseStatusClass: "2xx_success",
    acceptedGeometry: false,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    resultJsonCanonicalTruth: false,
    sourceTruth: false,
    packageApiTruth: false,
    connectorTruth: false,
    hostedTruth: false,
    metricPolicyAuthority: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    cannotSelfAccept: true,
    requiresExplicitFutureAcceptance: true,
    nextAllowedStep: "explicit_acceptance_contract_required",
  });
});

test("PR124 existing PR123 proof alone remains provider-evidence-only and cannot self-accept", () => {
  const proof = createControlledLiveProviderSmokeArtifactProofV1(createRedactedSuccessArtifacts());
  const observation = createControlledProviderObservationContractV1(proof);

  assert.equal(observation.providerEvidenceOnly, true);
  assert.equal(observation.untrusted, true);
  assert.equal(observation.nonAuthoritative, true);
  assert.equal(observation.acceptedGeometry, false);
  assert.equal(observation.acceptedStructuredGeometryProduced, false);
  assert.equal(observation.coreInputProduced, false);
  assert.equal(observation.structuredAnalyzeInputProduced, false);
  assert.equal(observation.structuredAnalyzeRun, false);
  assert.equal(observation.resultJsonProduced, false);
  assert.equal(observation.resultJsonCanonicalTruth, false);
  assert.equal(observation.sourceTruth, false);
  assert.equal(observation.packageApiTruth, false);
  assert.equal(observation.connectorTruth, false);
  assert.equal(observation.hostedTruth, false);
  assert.equal(observation.providerSelfAcceptance, false);
  assert.equal(observation.cannotSelfAccept, true);
  assert.equal(observation.requiresExplicitFutureAcceptance, true);
  assert.equal(observation.nextAllowedStep, "explicit_acceptance_contract_required");
  assert.equal(validateAcceptedGeometryV1(observation).ok, false);
  assert.equal(analyzeStructuredCompositionV1(observation).status, "invalid");
});

test("PR129 PR124 v2 requires the strict candidate proof and remains distinct from compatible v1", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const artifactProof = createControlledLiveProviderSmokeArtifactProofV1(artifacts);
  const rawProviderResponseBytes = new TextEncoder().encode('{"status":"completed"}');
  const providerExecutionReceipt = createLocalVisualProviderExecutionReceiptV1({
    sourceImageBytes: Uint8Array.from([1, 2, 3]),
    rawProviderResponseBytes,
  });
  const candidateProof = createControlledLiveProviderCandidateArtifactProofV1({
    artifactProof,
    providerExecutionReceipt,
    rawProviderResponseBytes,
  });
  const v1 = createControlledProviderObservationContractV1(artifactProof);
  const v2 = createControlledProviderObservationContractV2({
    artifactProof: candidateProof,
    providerExecutionReceipt,
  });

  assert.equal(v1.version, 1);
  assert.equal("providerExecutionReceiptContentIdentity" in v1, false);
  assert.equal(v2.version, 2);
  assert.equal(
    v2.observationId,
    `controlled-provider-observation:v2:${providerExecutionReceipt.executionReceiptContentIdentity.slice(7)}`,
  );
  assert.equal(validateControlledProviderObservationContractV2(v2).observationId, v2.observationId);
  assert.throws(
    () => createControlledProviderObservationContractV2({
      artifactProof,
      providerExecutionReceipt,
    }),
    /providerExecutionReceiptContentIdentity/u,
  );
});

test("PR124 artifactProof wrapper ignores unproved envelope metadata instead of corrupting observation facts", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const proof = createControlledLiveProviderSmokeArtifactProofV1(artifacts);
  const mismatchedEnvelope = structuredClone(artifacts.providerEvidenceEnvelope);

  mismatchedEnvelope.image.contentIdentity =
    "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  mismatchedEnvelope.image.mediaType = "image/jpeg";
  mismatchedEnvelope.image.sizeBytes = 900_000;
  mismatchedEnvelope.providerCall.provider = "openai-responses-vision";
  mismatchedEnvelope.providerCall.endpointKind = "openai_responses_api";
  mismatchedEnvelope.providerCall.responseStatusCode = 204;

  const observation = createControlledProviderObservationContractV1({
    artifactProof: proof,
    providerEvidenceEnvelope: mismatchedEnvelope,
    summary: artifacts.summary,
  });

  assert.equal(
    observation.observationId,
    "controlled-provider-observation:v1:provider-evidence-envelope.json+summary.json",
  );
  assert.equal(observation.imageContentIdentity, null);
  assert.equal(observation.mediaTypeClass, "unknown_redacted_media_type");
  assert.equal(observation.imageSizeClass, "unknown_redacted_size");
  assert.equal(observation.providerClass, "unknown_redacted_provider");
  assert.equal(observation.endpointClass, "unknown_redacted_endpoint");
  assert.equal(observation.responseStatusClass, "unknown_redacted_status");
  assert.equal(observation.providerEvidenceOnly, true);
  assert.equal(observation.untrusted, true);
  assert.equal(observation.acceptedGeometry, false);
  assert.equal(observation.coreInputProduced, false);
  assert.equal(observation.structuredAnalyzeRun, false);
  assert.equal(observation.resultJsonProduced, false);
});

test("PR124 status diagnostics confidence provider metadata and artifacts cannot authorize acceptance", () => {
  for (const [name, mutate] of [
    ["status gate", (input) => { input.providerStatusAuthorizedAcceptance = true; }],
    ["diagnostic gate", (input) => { input.providerDiagnosticCanAuthorizeAcceptance = true; }],
    ["confidence gate", (input) => { input.confidenceThresholdAcceptance = true; }],
    ["score gate", (input) => { input.score = 0.99; }],
    ["value metadata", (input) => { input.valueMetadata = "accept"; }],
    ["provider metadata", (input) => { input.providerMetadata = { finish_reason: "stop" }; }],
    ["derived artifact gate", (input) => { input.artifactCanAuthorizeAcceptance = true; }],
    ["metric policy gate", (input) => { input.metricPolicyAuthorizedAcceptance = true; }],
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    mutate(artifacts.providerEvidenceEnvelope);
    assert.throws(
      () => createControlledProviderObservationContractV1(artifacts),
      /Invalid controlled provider observation contract input field|Invalid controlled live provider smoke artifact proof input field/u,
      name,
    );
  }
});

test("PR124 rejects raw provider request image credential identifier prompt reasoning and URL leaks", () => {
  for (const [name, mutate] of [
    ["raw provider output", (input) => { input.rawProviderOutput = "unsafe"; }],
    ["raw provider body", (input) => { input.rawProviderBody = { output_text: "unsafe" }; }],
    ["raw request body", (input) => { input.rawRequestBody = { input: [] }; }],
    ["raw image bytes", (input) => { input.rawImageBytes = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"; }],
    ["base64 image data", (input) => { input.imageBase64 = "data:image/png;base64,AAAA"; }],
    ["API key", (input) => { input.apiKey = "sk-fakeUnsafeCredentialValue000"; }],
    ["uppercase API key assignment", (input) => { input.note = "OPENAI_API_KEY=fake"; }],
    ["lowercase API key assignment", (input) => { input.note = "openai_api_key=fake"; }],
    ["lowercase token assignment", (input) => { input.note = "token=fake"; }],
    ["mixed-case secret assignment", (input) => { input.note = "Client_Secret=fake"; }],
    ["bearer token", (input) => { input.authorization = "Bearer fakeUnsafeToken"; }],
    ["basic token", (input) => { input.authorization = "Basic ZmFrZQ=="; }],
    ["credential-like value", (input) => { input.secret = "fake"; }],
    ["local absolute path", (input) => { input.localPath = "/Users/pana/private/source.png"; }],
    ["provider request ID", (input) => { input.providerRequestId = "req_unsafe"; }],
    ["account ID", (input) => { input.accountId = "acct_unsafe"; }],
    ["exact model env value", (input) => { input.exactModelEnvValue = "gpt-fake"; }],
    ["prompt text", (input) => { input.promptText = "infer geometry"; }],
    ["hidden prompt", (input) => { input.hiddenPrompt = "unsafe hidden prompt"; }],
    ["chain of thought", (input) => { input.chainOfThought = "unsafe"; }],
    ["unredacted URL", (input) => { input.url = "https://example.invalid/source.png"; }],
    ["signed URL", (input) => { input.signedUrl = "https://example.invalid/source.png?sig=unsafe"; }],
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    mutate(artifacts.providerEvidenceEnvelope);
    assert.throws(
      () => createControlledProviderObservationContractV1(artifacts),
      /Invalid controlled provider observation contract input field|Invalid controlled live provider smoke artifact proof input field/u,
      name,
    );
  }
});

test("PR124 rejects provider-error incomplete and tampered source artifacts through PR123 proof", () => {
  for (const [name, mutate] of [
    ["provider error response", (artifacts) => { artifacts.providerEvidenceEnvelope.providerCall.responseClass = "provider_error"; }],
    ["incomplete observation class", (artifacts) => { artifacts.providerEvidenceEnvelope.evidenceSummary.persistedObservationClass = "redacted_provider_error_observed"; }],
    ["provider output missing", (artifacts) => { artifacts.providerEvidenceEnvelope.providerCall.providerOutputObserved = false; }],
    ["result.json produced", (artifacts) => { artifacts.providerEvidenceEnvelope.resultJsonProduced = true; }],
    ["Core input produced", (artifacts) => { artifacts.providerEvidenceEnvelope.coreInputProduced = true; }],
    ["Structured Analyze ran", (artifacts) => { artifacts.providerEvidenceEnvelope.structuredAnalyzeRun = true; }],
    ["accepted structured geometry produced", (artifacts) => { artifacts.providerEvidenceEnvelope.acceptedStructuredGeometryProduced = true; }],
    ["raw request persisted", (artifacts) => { artifacts.providerEvidenceEnvelope.providerCall.requestBodyPersisted = true; }],
    ["summary artifact tampered", (artifacts) => { artifacts.summary.artifacts = [...artifacts.summary.artifacts, "result.json"]; }],
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    mutate(artifacts);
    assert.throws(
      () => createControlledProviderObservationContractV1(artifacts),
      /Invalid controlled provider observation contract input field|Invalid controlled live provider smoke artifact proof input field/u,
      name,
    );
  }
});

test("PR124 helper does not mutate input", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const before = structuredClone(artifacts);

  createControlledProviderObservationContractV1(artifacts);

  assert.deepEqual(artifacts, before);
});

test("PR124 helper is structural package-private and avoids forbidden dependencies", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const importStatements = helperSource
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.match(helperSource, /controlled-live-provider-smoke-artifact-proof/u);
  assert.doesNotMatch(
    importStatements,
    new RegExp(
      [
        "node:fs",
        "node:child_process",
        "node:https?",
        "fetch",
        "XMLHttpRequest",
        "WebSocket",
        "@openai",
        "OpenAI",
        "api\\.openai",
        "provider-sdk",
        "accepted-geometry",
        "structured-composition-analysis",
        "geometry-observation",
        "from \"\\.\\./index",
        "from \"@norma/core\"",
        "mcp",
        "chatgpt",
        "cad",
        "figma",
        "upload",
        "oauth",
      ].join("|"),
      "iu",
    ),
  );
  assert.doesNotMatch(
    helperSource,
    new RegExp(
      [
        "node:fs",
        "node:child_process",
        "node:https?",
        "fetch\\(",
        "XMLHttpRequest",
        "WebSocket",
        "@openai",
        "api\\.openai",
        "provider-sdk",
        "from \"\\.\\./index",
        "from \"@norma/core\"",
      ].join("|"),
      "iu",
    ),
  );
  assert.equal("createControlledProviderObservationContractV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /controlled-provider-observation-contract/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.equal("bin" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
});

test("PR124 no live provider call fixtures package metadata lockfiles or package root drift", async () => {
  const changedFiles = await gitDiffNames();
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), privateDevChatGptMcpVisualPilotGateChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, localVisualCandidateReviewChangedFiles)) return;
  const isCleanBase = isCleanBaseValidationContext(repoRoot);
  const isPr131Set = isExactChangedFileSet(changedFiles, localVisualCandidateReviewProductSurfaceChangedFiles);
  const isPr130Set = isExactChangedFileSet(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
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
      : isPr125Set
        ? controlledProviderObservationAcceptanceProofChangedFiles
        : controlledProviderObservationContractChangedFiles;

  assert.equal(isCleanBase || isPr124Set || isPr125Set || isPr126Set || isPr127Set || isPr128Set || isPr129Set || isPr130Set || isPr131Set, true);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationContractChangedFiles),
    controlledProviderObservationContractChangedFiles,
  );
  assert.deepEqual(sharedExactApprovedChangedFiles(changedFiles), isCleanBase ? null : expectedChangedFiles);
  for (const forbiddenPrefix of [
    "bin/",
    "tests/fixtures/",
    "examples/",
    "viewer/",
    "reports/",
    ".github/",
  ]) {
    if (isPr129Set && forbiddenPrefix === "bin/") continue;
    assert.equal(changedFiles.some((file) => file.startsWith(forbiddenPrefix)), false, forbiddenPrefix);
  }
  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
  ]) {
    assert.equal(changedFiles.includes(forbiddenFile), false, forbiddenFile);
  }
  assert.equal("bin" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
});

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

  return {
    providerEvidenceEnvelope,
    summary,
  };
}

async function gitDiffNames() {
  return branchChangedFiles(repoRoot);
}
