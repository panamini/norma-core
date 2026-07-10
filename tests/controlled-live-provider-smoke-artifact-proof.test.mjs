import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createControlledLiveProviderCandidateArtifactProofV1,
  createControlledLiveProviderSmokeArtifactProofV1,
} from "../dist/src/local-report/controlled-live-provider-smoke-artifact-proof.js";
import {
  createLocalVisualProviderExecutionReceiptV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-contracts.js";
import {
  branchChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationContractChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  controlledLiveProviderSmokeArtifactProofChangedFiles,
  controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  isExactChangedFileSet,
  isCleanBaseValidationContext,
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
  "controlled-live-provider-smoke-artifact-proof.ts",
);
const indexSourcePath = path.join(repoRoot, "src", "index.ts");
const packageJsonPath = path.join(repoRoot, "package.json");

test("PR123 local caller reads temp redacted smoke artifacts and receives only safe proof facts", async () => {
  const { providerEvidenceEnvelope, summary } = createRedactedSuccessArtifacts();
  const outputDir = await mkdtemp(path.join(tmpdir(), "norma-pr123-smoke-artifacts-"));

  try {
    await writeFile(
      path.join(outputDir, "provider-evidence-envelope.json"),
      `${JSON.stringify(providerEvidenceEnvelope)}\n`,
      "utf8",
    );
    await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary)}\n`, "utf8");

    const parsedEnvelope = JSON.parse(
      await readFile(path.join(outputDir, "provider-evidence-envelope.json"), "utf8"),
    );
    const parsedSummary = JSON.parse(await readFile(path.join(outputDir, "summary.json"), "utf8"));

    const proof = createControlledLiveProviderSmokeArtifactProofV1({
      providerEvidenceEnvelope: parsedEnvelope,
      summary: parsedSummary,
    });

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
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("PR123 rejects unvalidated derived summary.md artifact refs", () => {
  const artifacts = createRedactedSuccessArtifacts();

  assert.throws(
    () => createControlledLiveProviderSmokeArtifactProofV1({
      ...artifacts,
      artifactRefs: ["summary.md"],
    }),
    /Invalid controlled live provider smoke artifact proof input field "input\.artifactRefs": unknown field/u,
  );

  const proof = createControlledLiveProviderSmokeArtifactProofV1(artifacts);
  assert.deepEqual(proof.derivedArtifactRefs, []);
});

test("PR123 rejects artifacts that try to cross the evidence-to-truth boundary", () => {
  for (const [name, mutate] of [
    ["provider output as Core truth", (artifacts) => { artifacts.providerEvidenceEnvelope.providerOutputIsCoreTruth = true; }],
    ["provider output as accepted geometry", (artifacts) => { artifacts.providerEvidenceEnvelope.providerOutputIsAcceptedGeometry = true; }],
    ["accepted structured geometry produced", (artifacts) => { artifacts.providerEvidenceEnvelope.acceptedStructuredGeometryProduced = true; }],
    ["accepted structured geometry payload", (artifacts) => { artifacts.providerEvidenceEnvelope.acceptedStructuredGeometry = {}; }],
    ["Core input produced", (artifacts) => { artifacts.providerEvidenceEnvelope.coreInputProduced = true; }],
    ["Core input payload", (artifacts) => { artifacts.providerEvidenceEnvelope.coreInput = {}; }],
    ["Structured Analyze ran", (artifacts) => { artifacts.providerEvidenceEnvelope.structuredAnalyzeRun = true; }],
    ["result.json produced", (artifacts) => { artifacts.providerEvidenceEnvelope.resultJsonProduced = true; }],
    ["result.json artifact", (artifacts) => { artifacts.summary.artifacts = [...artifacts.summary.artifacts, "result.json"]; }],
    ["automatic acceptance", (artifacts) => { artifacts.providerEvidenceEnvelope.automaticAcceptance = true; }],
    ["confidence threshold acceptance", (artifacts) => { artifacts.providerEvidenceEnvelope.confidenceThresholdAcceptance = true; }],
    ["confidence score authorizes acceptance", (artifacts) => { artifacts.providerEvidenceEnvelope.confidenceScoreValueCanAuthorizeAcceptance = true; }],
    ["provider self acceptance", (artifacts) => { artifacts.providerEvidenceEnvelope.providerSelfAcceptance = true; }],
    ["provider output authorized acceptance", (artifacts) => { artifacts.providerEvidenceEnvelope.providerOutputAuthorizedAcceptance = true; }],
    ["artifact output became truth", (artifacts) => { artifacts.summary.artifactOutputBecameTruth = true; }],
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    mutate(artifacts);
    assert.throws(
      () => createControlledLiveProviderSmokeArtifactProofV1(artifacts),
      /Invalid controlled live provider smoke artifact proof input field/u,
      name,
    );
  }
});

test("PR123 rejects raw provider, request, image, credential, path, prompt, and request-id leaks", () => {
  for (const [name, mutate] of [
    ["raw provider output", (artifacts) => { artifacts.providerEvidenceEnvelope.rawProviderOutput = "unsafe"; }],
    ["raw provider body", (artifacts) => { artifacts.providerEvidenceEnvelope.providerBody = { output_text: "unsafe" }; }],
    ["raw request body", (artifacts) => { artifacts.providerEvidenceEnvelope.requestBody = { input: [] }; }],
    ["raw image bytes", (artifacts) => { artifacts.providerEvidenceEnvelope.rawImageBytes = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"; }],
    ["base64 image data", (artifacts) => { artifacts.providerEvidenceEnvelope.imageBase64 = "data:image/png;base64,AAAA"; }],
    ["API key", (artifacts) => { artifacts.providerEvidenceEnvelope.apiKey = "sk-fakeUnsafeCredentialValue000"; }],
    ["bearer token", (artifacts) => { artifacts.providerEvidenceEnvelope.authorization = "Bearer fake-token"; }],
    ["lowercase bearer token in allowed summary array", (artifacts) => { artifacts.summary.nonGoals = [...artifacts.summary.nonGoals, "bearer fake-token"]; }],
    ["basic authorization header in summary", (artifacts) => { artifacts.summary.nonGoals = [...artifacts.summary.nonGoals, "authorization: Basic dGVzdA=="]; }],
    ["API key env assignment in summary", (artifacts) => { artifacts.summary.nonGoals = [...artifacts.summary.nonGoals, "OPENAI_API_KEY=[REDACTED]"]; }],
    ["credential-like value", (artifacts) => { artifacts.providerEvidenceEnvelope.secret = "fake"; }],
    ["local absolute path", (artifacts) => { artifacts.providerEvidenceEnvelope.localPath = "/Users/pana/private/source.png"; }],
    ["file URL local path in summary", (artifacts) => { artifacts.summary.nonGoals = [...artifacts.summary.nonGoals, "file:///Users/pana/private/source.png"]; }],
    ["parenthesized local path in summary", (artifacts) => { artifacts.summary.nonGoals = [...artifacts.summary.nonGoals, "see(/Users/pana/private/source.png)"]; }],
    ["provider request ID", (artifacts) => { artifacts.providerEvidenceEnvelope.providerRequestId = "req_unsafe"; }],
    ["account ID", (artifacts) => { artifacts.providerEvidenceEnvelope.accountId = "acct_unsafe"; }],
    ["hidden prompt", (artifacts) => { artifacts.providerEvidenceEnvelope.hiddenPrompt = "unsafe prompt"; }],
    ["chain of thought", (artifacts) => { artifacts.providerEvidenceEnvelope.chainOfThought = "unsafe"; }],
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    mutate(artifacts);
    assert.throws(
      () => createControlledLiveProviderSmokeArtifactProofV1(artifacts),
      /Invalid controlled live provider smoke artifact proof input field/u,
      name,
    );
  }
});

test("PR123 rejects extra summary nonGoals even when they look harmless", () => {
  for (const extraNonGoal of [
    "provider says image was received",
    "not a provider checkpoint",
    "raw provider text omitted",
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    artifacts.summary.nonGoals = [...artifacts.summary.nonGoals, extraNonGoal];

    assert.throws(
      () => createControlledLiveProviderSmokeArtifactProofV1(artifacts),
      /Invalid controlled live provider smoke artifact proof input field "summary\.nonGoals": requires/u,
      extraNonGoal,
    );
  }
});

test("PR123 accepts exactly the smoke writer summary nonGoals list", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const proof = createControlledLiveProviderSmokeArtifactProofV1(artifacts);

  assert.deepEqual(artifacts.summary.nonGoals, [
    "not production OpenAI integration",
    "not provider output truth",
    "not accepted structured geometry",
    "not Core input",
    "not result.json production",
    "not CI live-network behavior",
    "not package API or export expansion",
  ]);
    assert.equal(proof.sourceArtifactsRedacted, true);
});

test("PR123 rejects incomplete and provider-error artifacts", () => {
  for (const [name, mutate] of [
    ["incomplete response class", (artifacts) => { artifacts.providerEvidenceEnvelope.providerCall.responseClass = "provider_error"; }],
    ["incomplete provider error class", (artifacts) => { artifacts.providerEvidenceEnvelope.providerErrorClass = "incomplete"; }],
    ["incomplete provider diagnostic", (artifacts) => { artifacts.summary.providerErrorClass = "incomplete"; }],
    ["provider error observation class", (artifacts) => { artifacts.providerEvidenceEnvelope.evidenceSummary.persistedObservationClass = "redacted_provider_error_observed"; }],
    ["provider output not observed", (artifacts) => { artifacts.providerEvidenceEnvelope.providerCall.providerOutputObserved = false; }],
    ["non-success status code", (artifacts) => { artifacts.providerEvidenceEnvelope.providerCall.responseStatusCode = 500; }],
  ]) {
    const artifacts = createRedactedSuccessArtifacts();
    mutate(artifacts);
    assert.throws(
      () => createControlledLiveProviderSmokeArtifactProofV1(artifacts),
      /Invalid controlled live provider smoke artifact proof input field/u,
      name,
    );
  }
});

test("PR123 helper is structural and does not mutate parsed artifact input", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const before = structuredClone(artifacts);

  createControlledLiveProviderSmokeArtifactProofV1(artifacts);

  assert.deepEqual(artifacts, before);
});

test("PR129 candidate-capable PR123 proof rehashes exact response bytes while v1 remains receipt-only", () => {
  const artifactProof = createControlledLiveProviderSmokeArtifactProofV1(
    createRedactedSuccessArtifacts(),
  );
  const rawProviderResponseBytes = new TextEncoder().encode('{"status":"completed","padding":"a"}');
  const providerExecutionReceipt = createLocalVisualProviderExecutionReceiptV1({
    sourceImageBytes: Uint8Array.from([1, 2, 3]),
    rawProviderResponseBytes,
  });
  const candidateProof = createControlledLiveProviderCandidateArtifactProofV1({
    artifactProof,
    providerExecutionReceipt,
    rawProviderResponseBytes,
  });

  assert.equal("providerExecutionReceiptContentIdentity" in artifactProof, false);
  assert.equal(
    candidateProof.providerExecutionReceiptContentIdentity,
    providerExecutionReceipt.executionReceiptContentIdentity,
  );
  assert.throws(
    () => createControlledLiveProviderCandidateArtifactProofV1({
      artifactProof,
      providerExecutionReceipt,
      rawProviderResponseBytes: new TextEncoder().encode('{"status":"completed","padding":"b"}'),
    }),
    /providerResponseContentIdentity/u,
  );
});

test("PR129 candidate-capable PR123 helper stays package-private and imports only the closed receipt contract", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.deepEqual(
    [...helperSource.matchAll(/from\s+"([^"]+)"/gu)].map((match) => match[1]),
    ["./controlled-local-live-visual-candidate-observation-contracts.js"],
  );
  assert.doesNotMatch(
    helperSource,
    /node:fs|node:child_process|node:https?|fetch|XMLHttpRequest|WebSocket|@openai|OpenAI|openai-sdk|api\.openai|provider SDK|provider runtime|provider parser|from "\.\.\/index|from "@norma\/core"|accepted-geometry|structured-composition-analysis|mcp|chatgpt|cad|figma|upload|oauth/u,
  );
  assert.equal("createControlledLiveProviderSmokeArtifactProofV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /controlled-live-provider-smoke-artifact-proof/u);
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

test("PR123 changed files stay exact and do not add live provider fixtures or package drift", () => {
  const changedFiles = branchChangedFiles(repoRoot);
  const isCleanBase = isCleanBaseValidationContext(repoRoot);
  const isPr130Set = isExactChangedFileSet(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
  const isArtifactProofSet = isExactChangedFileSet(changedFiles, controlledLiveProviderSmokeArtifactProofChangedFiles);
  const isResponseStatusSet = isExactChangedFileSet(
    changedFiles,
    controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  );
  const isPr124Set = isExactChangedFileSet(
    changedFiles,
    controlledProviderObservationContractChangedFiles,
  );
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
  const isPr129Set = isExactChangedFileSet(
    changedFiles,
    controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  );

  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeArtifactProofChangedFiles),
    controlledLiveProviderSmokeArtifactProofChangedFiles,
  );
  assert.equal(
    isCleanBase || isArtifactProofSet || isResponseStatusSet || isPr124Set || isPr125Set || isPr126Set || isPr127Set || isPr128Set || isPr129Set || isPr130Set,
    true,
    changedFiles.join("\n"),
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(changedFiles),
    isCleanBase
      ? null
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
      : isPr124Set
      ? controlledProviderObservationContractChangedFiles
      : isResponseStatusSet
      ? controlledLiveProviderSmokeResponseStatusGuardChangedFiles
      : controlledLiveProviderSmokeArtifactProofChangedFiles,
  );

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
  if (isPr130Set) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")), [
      "docs/BUSINESS_READINESS_ROADMAP.md",
      "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md",
    ]);
  } else if (isPr127Set) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")), [
      "docs/BUSINESS_READINESS_ROADMAP.md",
      "docs/decisions/2026-07-10-local-visual-observation-to-core-pilot-contract.md",
    ]);
  } else if (isResponseStatusSet) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")), [
      "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    ]);
  } else {
    assert.equal(changedFiles.some((file) => file.startsWith("docs/")), false, "docs/");
  }

  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/provider-evidence-replay-adapter.ts",
  ]) {
    assert.equal(changedFiles.includes(forbiddenFile), false, forbiddenFile);
  }
  if (!isPr128Set) {
    assert.equal(changedFiles.includes("src/accepted-geometry-to-core-mapping.ts"), false);
  }
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
