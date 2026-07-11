import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { createSyntheticExternalEvidenceAcceptanceProofV1 } from "../dist/src/local-report/synthetic-external-evidence-acceptance-proof.js";
import {
  branchChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationContractChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  controlledLiveProviderDiagnosticNextActionsChangedFiles,
  controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles,
  controlledLiveProviderExperimentGateChangedFiles,
  controlledLiveProviderIncompleteResponseGuardChangedFiles,
  controlledLiveProviderSmokeArtifactProofChangedFiles,
  controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  controlledLiveProviderSmokeDiagnosticsChangedFiles,
  controlledLiveProviderSmokeChangedFiles,
  disabledLiveProviderExperimentHarnessChangedFiles,
  isExactChangedFileSet,
  isCleanBaseValidationContext,
  localVisualCandidateReviewChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  providerEvidenceReplayAdapterChangedFiles,
  realExternalEvidencePilotReadinessGateChangedFiles,
  syntheticEvidenceAcceptanceDemoChangedFiles,
  syntheticExternalEvidenceAcceptanceProofChangedFiles,
} from "./changed-file-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const fixturePath = path.join(
  __dirname,
  "fixtures",
  "visual-adapter",
  "synthetic-external-evidence-envelope-v1.json",
);
const helperSourcePath = path.join(
  repoRoot,
  "src",
  "local-report",
  "synthetic-external-evidence-acceptance-proof.ts",
);
const packageJsonPath = path.join(repoRoot, "package.json");
const indexSourcePath = path.join(repoRoot, "src", "index.ts");

test("PR111 accepts the PR110 fixture and returns only safe boundary facts", async () => {
  const envelope = await readFixture();
  const proof = createSyntheticExternalEvidenceAcceptanceProofV1(envelope);

  assert.deepEqual(proof, {
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    acceptedGeometryIsOnlyCoreInput: true,
    providerEvidenceOnly: true,
    observationEnvelopeCoreInput: false,
    confidenceAuthority: false,
    providerSelfAcceptance: false,
    localOnly: true,
    fixtureOnly: true,
    syntheticOnly: true,
    envelopeId: "external-evidence-envelope:synthetic:parcel-proportion:v1",
    observationIdentity: "observation:synthetic:parcel-proportion:v1",
    observationContentIdentity: "sha256:79330dcca3d6629d91f86b6beece5cf7a4377de5f8208fc7a3c559871c981262",
    acceptedGeometryId: "accepted:synthetic-external-evidence:parcel-proportion:v1",
    acceptedGeometryContentIdentity: "sha256:38e3879a185071c1715e4511304319d8b57ddfee894672d990dca3c66ce8ab75",
  });
  assert.deepEqual(Object.keys(proof).sort(), [
    "acceptedGeometryContentIdentity",
    "acceptedGeometryId",
    "acceptedGeometryIsOnlyCoreInput",
    "boundarySourceTruth",
    "confidenceAuthority",
    "coreInputAuthority",
    "envelopeId",
    "fixtureOnly",
    "localOnly",
    "observationContentIdentity",
    "observationEnvelopeCoreInput",
    "observationIdentity",
    "providerEvidenceOnly",
    "providerSelfAcceptance",
    "syntheticOnly",
  ]);
  assert.equal("sourceTruth" in proof, false);
});

test("PR111 delegates accepted geometry contract validation to validateAcceptedGeometryV1", async () => {
  const envelope = await readFixture();
  const helperSource = await readFile(helperSourcePath, "utf8");
  const acceptedValidation = validateAcceptedGeometryV1(envelope.acceptedStructuredGeometry);

  assert.equal(acceptedValidation.ok, true);
  assert.deepEqual(acceptedValidation.diagnostics, []);
  assert.match(helperSource, /import \{ validateAcceptedGeometryV1 \} from "\.\.\/geometry-observation\.js";/u);
  assert.match(helperSource, /validateAcceptedGeometryV1\(acceptedStructuredGeometry\)/u);
});

test("PR111 rejects observation-only and candidate geometry as accepted Core input", async () => {
  const envelope = await readFixture();

  assert.equal(validateAcceptedGeometryV1(envelope.observationEnvelope).ok, false);
  assert.throws(
    () => createSyntheticExternalEvidenceAcceptanceProofV1({
      ...envelope,
      acceptedStructuredGeometry: envelope.observationEnvelope,
    }),
    /field "acceptedStructuredGeometry\.sourceObservationId": requires observation:synthetic:parcel-proportion:v1/u,
  );

  for (const candidateGeometry of envelope.observationEnvelope.candidateGeometrySuggestions) {
    assert.equal(validateAcceptedGeometryV1(candidateGeometry).ok, false);
    assert.throws(
      () => createSyntheticExternalEvidenceAcceptanceProofV1({
        ...envelope,
        acceptedStructuredGeometry: candidateGeometry,
      }),
      /field "acceptedStructuredGeometry\.sourceObservationId": requires observation:synthetic:parcel-proportion:v1/u,
    );
  }
});

test("PR111 rejects provider suggestion copied into accepted geometry without matching acceptance provenance", async () => {
  const envelope = await readFixture();
  const copiedSuggestion = structuredClone(envelope.observationEnvelope.candidateGeometrySuggestions[0]);
  const mutatedAccepted = {
    ...structuredClone(envelope.acceptedStructuredGeometry),
    acceptedGeometryId: copiedSuggestion.id,
    sourceObservationId: "observation:provider-suggestion:v1",
    sourceObservationContentIdentity: envelope.evidenceIdentity.observationContentIdentity,
    primitives: [copiedSuggestion],
  };

  assert.throws(
    () => createSyntheticExternalEvidenceAcceptanceProofV1({
      ...envelope,
      acceptedStructuredGeometry: mutatedAccepted,
    }),
    /field "acceptedStructuredGeometry\.sourceObservationId": requires observation:synthetic:parcel-proportion:v1/u,
  );
});

test("PR111 rejects confidence value score ranking metadata prompts warnings and artifacts as acceptance authority", async () => {
  const envelope = await readFixture();

  for (const variant of [
    {
      observationEnvelope: {
        ...structuredClone(envelope.observationEnvelope),
        diagnosticMetadata: {
          ...structuredClone(envelope.observationEnvelope.diagnosticMetadata),
          canAuthorizeAcceptance: true,
        },
      },
    },
    {
      observationEnvelope: {
        ...structuredClone(envelope.observationEnvelope),
        diagnosticMetadata: {
          ...structuredClone(envelope.observationEnvelope.diagnosticMetadata),
          canCreateGeometry: true,
        },
      },
    },
    {
      observationEnvelope: {
        ...structuredClone(envelope.observationEnvelope),
        promptText: {
          ...structuredClone(envelope.observationEnvelope.promptText),
          sourceTruth: true,
        },
      },
    },
    {
      warnings: {
        ...structuredClone(envelope.warnings),
        diagnosticOnly: false,
      },
    },
    {
      derivedArtifacts: [
        {
          ...structuredClone(envelope.derivedArtifacts[0]),
          mayOverrideAcceptedGeometry: true,
        },
      ],
    },
  ]) {
    assert.throws(
      () => createSyntheticExternalEvidenceAcceptanceProofV1({ ...envelope, ...variant }),
      /Invalid synthetic external evidence acceptance proof envelope field/u,
    );
  }
});

test("PR111 rejects provider metadata self-acceptance and boundary flag drift", async () => {
  const envelope = await readFixture();

  for (const variant of [
    { acceptanceBoundary: { ...structuredClone(envelope.acceptanceBoundary), providerEvidenceSelfAccepted: true } },
    { acceptanceBoundary: { ...structuredClone(envelope.acceptanceBoundary), outsideProviderBoundary: false } },
    { notProviderResponseJson: false },
    { notProviderSdkResponse: false },
    { notProductionPayload: false },
    { notFutureApiContract: false },
    { localOnly: false },
    { fixtureOnly: false },
    { staticFixture: false },
    { syntheticOnly: false },
  ]) {
    assert.throws(
      () => createSyntheticExternalEvidenceAcceptanceProofV1({ ...envelope, ...variant }),
      /Invalid synthetic external evidence acceptance proof envelope field/u,
    );
  }
});

test("PR111 rejects non-plain objects inherited fields missing fields and unknown version-1 fields", async () => {
  const envelope = await readFixture();
  const inheritedEnvelope = Object.create(envelope);
  const missingKind = { ...envelope };
  delete missingKind.kind;

  for (const value of [null, [], new Date(), inheritedEnvelope]) {
    assert.throws(
      () => createSyntheticExternalEvidenceAcceptanceProofV1(value),
      /field "envelope": requires plain object/u,
    );
  }

  assert.throws(
    () => createSyntheticExternalEvidenceAcceptanceProofV1(missingKind),
    /field "envelope\.kind": requires own field/u,
  );
  assert.throws(
    () => createSyntheticExternalEvidenceAcceptanceProofV1({ ...envelope, extra: true }),
    /field "envelope\.extra": unknown field/u,
  );
  assert.throws(
    () => createSyntheticExternalEvidenceAcceptanceProofV1({ ...envelope, version: 2 }),
    /field "version": requires 1/u,
  );
});

test("PR111 rejects stale accepted geometry identity and acceptance provenance mismatch variants", async () => {
  const envelope = await readFixture();

  for (const variant of [
    {
      acceptedStructuredGeometry: {
        ...structuredClone(envelope.acceptedStructuredGeometry),
        sourceObservationContentIdentity: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    },
    {
      acceptedStructuredGeometry: {
        ...structuredClone(envelope.acceptedStructuredGeometry),
        acceptance: {
          ...structuredClone(envelope.acceptedStructuredGeometry.acceptance),
          sourceObservationId: "observation:mismatch:v1",
        },
      },
    },
    {
      acceptedStructuredGeometry: {
        ...structuredClone(envelope.acceptedStructuredGeometry),
        provenance: {
          ...structuredClone(envelope.acceptedStructuredGeometry.provenance),
          inputContentIdentity: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      },
    },
    {
      acceptanceBoundary: {
        ...structuredClone(envelope.acceptanceBoundary),
        provenance: {
          ...structuredClone(envelope.acceptanceBoundary.provenance),
          inputObservationIdentity: "observation:mismatch:v1",
        },
      },
    },
  ]) {
    assert.throws(
      () => createSyntheticExternalEvidenceAcceptanceProofV1({ ...envelope, ...variant }),
      /Invalid synthetic external evidence acceptance proof envelope field/u,
    );
  }
});

test("PR111 helper does not mutate input", async () => {
  const envelope = await readFixture();
  const before = structuredClone(envelope);

  createSyntheticExternalEvidenceAcceptanceProofV1(envelope);

  assert.deepEqual(envelope, before);
});

test("PR111 helper has no forbidden imports or package-public exposure", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.doesNotMatch(
    helperSource,
    /node:fs|node:child_process|node:https?|fetch|OpenAI|provider SDK|provider runtime|provider parser|image|vision|CAD|Figma|mcp|chatgpt|from "\.\.\/index|from "@norma\/core"/iu,
  );
  assert.equal("createSyntheticExternalEvidenceAcceptanceProofV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /synthetic-external-evidence-acceptance-proof/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.equal("dependencies" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
});

test("PR111 package files lockfiles docs fixtures and metadata remain unchanged", async () => {
  const changedFiles = await gitDiffNames();
  if (isExactChangedFileSet(changedFiles, localVisualCandidateReviewChangedFiles)) return;
  const isCleanBase = isCleanBaseValidationContext(repoRoot);
  const isPr131Set = isExactChangedFileSet(changedFiles, localVisualCandidateReviewProductSurfaceChangedFiles);
  const isPr130Set = isExactChangedFileSet(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
  const isPr111Set = isExactChangedFileSet(changedFiles, syntheticExternalEvidenceAcceptanceProofChangedFiles);
  const isPr112Set = isExactChangedFileSet(changedFiles, syntheticEvidenceAcceptanceDemoChangedFiles);
  const isPr113Set = isExactChangedFileSet(changedFiles, realExternalEvidencePilotReadinessGateChangedFiles);
  const isPr114Set = isExactChangedFileSet(changedFiles, providerEvidenceReplayAdapterChangedFiles);
  const isPr115Set = isExactChangedFileSet(changedFiles, controlledLiveProviderExperimentGateChangedFiles);
  const isPr116Set = isExactChangedFileSet(changedFiles, disabledLiveProviderExperimentHarnessChangedFiles);
  const isPr117Set = isExactChangedFileSet(changedFiles, controlledLiveProviderSmokeChangedFiles);
  const isPr118Set = isExactChangedFileSet(changedFiles, controlledLiveProviderSmokeDiagnosticsChangedFiles);
  const isPr119Set = isExactChangedFileSet(
    changedFiles,
    controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles,
  );
  const isPr120Set = isExactChangedFileSet(
    changedFiles,
    controlledLiveProviderDiagnosticNextActionsChangedFiles,
  );
  const isPr121Set = isExactChangedFileSet(
    changedFiles,
    controlledLiveProviderSmokeOutcomeCheckpointChangedFiles,
  );
  const isPr122Set = isExactChangedFileSet(
    changedFiles,
    controlledLiveProviderIncompleteResponseGuardChangedFiles,
  );
  const isPr123Set = isExactChangedFileSet(
    changedFiles,
    controlledLiveProviderSmokeArtifactProofChangedFiles,
  );
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
  const isPr129Set = isExactChangedFileSet(changedFiles, controlledLocalLiveVisualCandidateObservationDemoChangedFiles);

  assert.equal(
    isCleanBase ||
      isPr131Set ||
      isPr130Set ||
      isPr111Set ||
      isPr112Set ||
      isPr113Set ||
      isPr114Set ||
      isPr115Set ||
      isPr116Set ||
      isPr117Set ||
      isPr118Set ||
      isPr119Set ||
      isPr120Set ||
      isPr121Set ||
      isPr122Set ||
      isPr123Set ||
      isResponseStatusSet ||
      isPr124Set ||
      isPr125Set ||
      isPr126Set ||
      isPr127Set ||
      isPr128Set ||
      isPr129Set,
    true,
    changedFiles.join("\n"),
  );
  if (isCleanBase) {
    assert.deepEqual(changedFiles, []);
  } else if (isPr131Set) {
    assert.deepEqual(changedFiles, localVisualCandidateReviewProductSurfaceChangedFiles);
  } else if (isPr130Set) {
    assert.deepEqual(changedFiles, cleanMainValidationAndPr129OperatorProofChangedFiles);
  } else if (isPr111Set) {
    assert.deepEqual(changedFiles, syntheticExternalEvidenceAcceptanceProofChangedFiles);
  } else if (isPr113Set) {
    assert.deepEqual(changedFiles, realExternalEvidencePilotReadinessGateChangedFiles);
  } else if (isPr114Set) {
    assert.deepEqual(changedFiles, providerEvidenceReplayAdapterChangedFiles);
  } else if (isPr115Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderExperimentGateChangedFiles);
  } else if (isPr116Set) {
    assert.deepEqual(changedFiles, disabledLiveProviderExperimentHarnessChangedFiles);
  } else if (isPr117Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderSmokeChangedFiles);
  } else if (isPr118Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderSmokeDiagnosticsChangedFiles);
  } else if (isPr119Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderInputCompatibilityDiagnosticsChangedFiles);
  } else if (isPr120Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderDiagnosticNextActionsChangedFiles);
  } else if (isPr121Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderSmokeOutcomeCheckpointChangedFiles);
  } else if (isPr122Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderIncompleteResponseGuardChangedFiles);
  } else if (isPr123Set) {
    assert.deepEqual(changedFiles, controlledLiveProviderSmokeArtifactProofChangedFiles);
  } else if (isResponseStatusSet) {
    assert.deepEqual(changedFiles, controlledLiveProviderSmokeResponseStatusGuardChangedFiles);
  } else if (isPr124Set) {
    assert.deepEqual(changedFiles, controlledProviderObservationContractChangedFiles);
  } else if (isPr125Set) {
    assert.deepEqual(changedFiles, controlledProviderObservationAcceptanceProofChangedFiles);
  } else if (isPr126Set) {
    assert.deepEqual(changedFiles, controlledProviderObservationToCoreHandoffChangedFiles);
  } else if (isPr129Set) {
    assert.deepEqual(changedFiles, controlledLocalLiveVisualCandidateObservationDemoChangedFiles);
  } else if (isPr128Set) {
    assert.deepEqual(changedFiles, explicitAcceptedObservationToCoreHandoffChangedFiles);
  } else if (isPr127Set) {
    assert.deepEqual(changedFiles, localVisualObservationToCorePilotContractChangedFiles);
  } else {
    assert.deepEqual(changedFiles, syntheticEvidenceAcceptanceDemoChangedFiles);
  }

  const forbiddenPaths = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    ...(isPr114Set ? [] : ["tests/fixtures/"]),
  ];

  for (const forbidden of forbiddenPaths) {
    assert.equal(changedFiles.some((file) => file.startsWith(forbidden) || file === forbidden), false, forbidden);
  }

  if (isCleanBase) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")), []);
  } else if (isPr131Set) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")).sort(), [
      "docs/BUSINESS_READINESS_ROADMAP.md",
      "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md",
      "docs/decisions/2026-07-11-local-visual-candidate-review-product-surface.md",
    ]);
  } else if (isPr130Set) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")).sort(), [
      "docs/BUSINESS_READINESS_ROADMAP.md",
      "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md",
    ]);
  } else if (
    isPr111Set ||
    isPr114Set ||
    isPr122Set ||
    isPr123Set ||
    isPr124Set ||
    isPr125Set ||
    isPr126Set
  ) {
    assert.equal(changedFiles.some((file) => file.startsWith("docs/")), false, "docs/");
  } else if (isPr128Set || isPr129Set) {
    assert.deepEqual(changedFiles.filter((file) => file.startsWith("docs/")), []);
  } else if (isPr127Set) {
    assert.deepEqual(
      changedFiles.filter((file) => file.startsWith("docs/")).sort(),
      [
        "docs/BUSINESS_READINESS_ROADMAP.md",
        "docs/decisions/2026-07-10-local-visual-observation-to-core-pilot-contract.md",
      ],
    );
  } else if (isPr112Set) {
    assert.deepEqual(
      changedFiles.filter((file) => file.startsWith("docs/")),
      ["docs/examples/local-synthetic-evidence-acceptance-demo.md"],
    );
  } else if (isPr113Set) {
    assert.deepEqual(
      changedFiles.filter((file) => file.startsWith("docs/")).sort(),
      [
        "docs/BUSINESS_READINESS_ROADMAP.md",
        "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
      ],
    );
  } else if (
    isPr116Set ||
    isPr117Set ||
    isPr118Set ||
    isPr119Set ||
    isPr120Set ||
    isPr121Set ||
    isResponseStatusSet
  ) {
    const expectedDocs = isPr116Set
      ? [
          "docs/BUSINESS_READINESS_ROADMAP.md",
          "docs/decisions/2026-07-08-disabled-local-live-provider-experiment-harness.md",
        ]
      : isPr121Set
        ? [
            "docs/BUSINESS_READINESS_ROADMAP.md",
            "docs/decisions/2026-07-09-controlled-live-provider-smoke-outcome-checkpoint.md",
          ]
      : isResponseStatusSet
        ? ["docs/decisions/2026-07-08-controlled-live-provider-smoke.md"]
      : [
          "docs/BUSINESS_READINESS_ROADMAP.md",
          "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
        ];
    assert.deepEqual(
      changedFiles.filter((file) => file.startsWith("docs/")).sort(),
      expectedDocs,
    );
  } else {
    assert.deepEqual(
      changedFiles.filter((file) => file.startsWith("docs/")).sort(),
      [
        "docs/BUSINESS_READINESS_ROADMAP.md",
        "docs/decisions/2026-07-08-controlled-live-provider-experiment-gate.md",
        "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
      ],
    );
  }
});

async function readFixture() {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

async function gitDiffNames() {
  return branchChangedFiles(repoRoot);
}
