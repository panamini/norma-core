import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateGeometryV1 } from "../dist/src/index.js";
import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  validateAcceptedGeometryV1,
} from "../dist/src/geometry-observation.js";
import {
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
} from "../dist/src/accepted-geometry-to-core-mapping.js";
import {
  computeControlledProviderObservationContractContentIdentityV1,
  createControlledProviderObservationAcceptanceProofV1,
} from "../dist/src/local-report/controlled-provider-observation-acceptance-proof.js";
import { createControlledProviderObservationContractV1 } from "../dist/src/local-report/controlled-provider-observation-contract.js";
import { createControlledProviderObservationToCoreHandoffV1 } from "../dist/src/local-report/controlled-provider-observation-to-core-handoff.js";
import { createControlledLiveProviderSmokeArtifactProofV1 } from "../dist/src/local-report/controlled-live-provider-smoke-artifact-proof.js";
import {
  branchChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  isExactChangedFileSet,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const helperSourcePath = path.join(
  repoRoot,
  "src",
  "local-report",
  "controlled-provider-observation-to-core-handoff.ts",
);
const indexSourcePath = path.join(repoRoot, "src", "index.ts");
const packageJsonPath = path.join(repoRoot, "package.json");

test("PR126 redacted provider artifacts flow through PR124 and PR125 into valid Core Composition2D", () => {
  const artifacts = createRedactedSuccessArtifacts();
  const providerObservationContract = createControlledProviderObservationContractV1(artifacts);
  const proofInput = createValidHandoffInput({ providerObservationContract });
  const handoff = createControlledProviderObservationToCoreHandoffV1(proofInput);

  assert.deepEqual(createControlledLiveProviderSmokeArtifactProofV1(artifacts), {
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
    sourceArtifactKinds: ["provider-evidence-envelope.json", "summary.json"],
    derivedArtifactRefs: [],
    nextAllowedStep: "controlled_provider_observation_contract",
  });
  assert.equal(providerObservationContract.kind, "norma.controlled-provider-observation-contract.v1");
  assert.equal(providerObservationContract.acceptedStructuredGeometryProduced, false);
  assert.equal(providerObservationContract.coreInputProduced, false);
  assert.equal(validateAcceptedGeometryV1(proofInput.acceptedStructuredGeometry).ok, true);
  assert.equal(handoff.ok, true);
  assert.equal(handoff.status, "mapped");
  assert.equal(handoff.coreInputProduced, true);
  assert.equal(handoff.structuredAnalyzeInputProduced, false);
  assert.equal(handoff.structuredAnalyzeRun, false);
  assert.equal(handoff.resultJsonProduced, false);
  assert.equal(handoff.nextAllowedStep, "explicit_comparison_input_construction");
  assert.equal(validateGeometryV1(handoff.mappedComposition2D).status, "ok");
});

test("PR126 preserves the active mapper coordinate transform", () => {
  const input = createValidHandoffInput({
    primitives: [
      rectanglePrimitive({
        id: "rectangle:frame",
        x: 0.1,
        y: 0.2,
        width: 0.7,
        height: 0.6,
      }),
    ],
  });
  const handoff = createControlledProviderObservationToCoreHandoffV1(input);

  assert.equal(
    handoff.mappingResult.coordinateTransform.coordinateTransform,
    ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  );
  assert.deepEqual(
    handoff.mappingResult.coordinateTransform.rectangleFormula,
    {
      coreX: "observationX",
      coreY: "1 - observationY - observationHeight",
      coreWidth: "observationWidth",
      coreHeight: "observationHeight",
    },
  );
  assert.deepEqual(handoff.mappedComposition2D.coordinateSystem, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM);
  assert.deepEqual(handoff.mappedComposition2D.elements[0].geometry, {
    kind: "rect",
    x: 0.1,
    y: 0.20000000000000007,
    width: 0.7,
    height: 0.6,
  });
});

test("PR126 snapshots accepted geometry before validation so toJSON cannot substitute mapped Core input", () => {
  const input = createValidHandoffInput({
    primitives: [
      rectanglePrimitive({
        id: "rectangle:validated",
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      }),
    ],
  });
  const validatedContentIdentity = input.acceptedStructuredGeometry.contentIdentity;
  const substitutedGeometry = structuredClone(input.acceptedStructuredGeometry);
  substitutedGeometry.primitives[0].x = 0.7;
  substitutedGeometry.acceptance.acceptedContentIdentity =
    computeAcceptedGeometryRevisionContentIdentity(substitutedGeometry);
  substitutedGeometry.contentIdentity = computeAcceptedGeometryContentIdentity(substitutedGeometry);
  assert.equal(validateAcceptedGeometryV1(substitutedGeometry).ok, true);
  assert.notEqual(substitutedGeometry.contentIdentity, validatedContentIdentity);

  Object.defineProperty(input.acceptedStructuredGeometry, "toJSON", {
    configurable: true,
    enumerable: false,
    value: () => substitutedGeometry,
  });

  const handoff = createControlledProviderObservationToCoreHandoffV1(input);

  assert.equal(handoff.ok, true);
  assert.equal(handoff.coreInputProduced, true);
  assert.equal(handoff.acceptedGeometryContentIdentity, validatedContentIdentity);
  assert.equal(
    handoff.mappingResult.primitiveMappings[0].acceptedGeometryContentIdentity,
    handoff.acceptedGeometryContentIdentity,
  );
  assert.equal(handoff.mappedComposition2D.elements[0].geometry.x, 0.1);
  assert.notEqual(handoff.mappedComposition2D.elements[0].geometry.x, 0.7);
});

test("PR126 requires PR125 validation before mapping and rejects provider observation as accepted geometry", () => {
  const input = createValidHandoffInput();

  assert.throws(
    () =>
      createControlledProviderObservationToCoreHandoffV1({
        ...input,
        acceptanceBoundary: {
          ...input.acceptanceBoundary,
          providerObservationContentIdentity:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      }),
    /Invalid controlled provider observation acceptance proof field "acceptanceBoundary\.providerObservationContentIdentity"/u,
  );
  assert.throws(
    () =>
      createControlledProviderObservationToCoreHandoffV1({
        ...input,
        acceptedStructuredGeometry: input.providerObservationContract,
      }),
    /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
  );
});

test("PR126 rejects detached proofs caller mapping authority and caller Core compositions", () => {
  const input = createValidHandoffInput();
  const detachedProof = createControlledProviderObservationAcceptanceProofV1(input);

  for (const [field, value] of [
    ["acceptanceProof", detachedProof],
    ["mappingResult", { ok: true }],
    ["mappedGeometry", { kind: "composition-2d" }],
    ["mappedComposition2D", { kind: "composition-2d" }],
    ["coreComposition", { kind: "composition-2d" }],
    ["coreInput", { kind: "composition-2d" }],
  ]) {
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1({ ...input, [field]: value }),
      new RegExp(`input\\.${field}.*unknown field`, "u"),
      field,
    );
  }
});

test("PR126 rejects non-plain missing inherited and unknown envelope fields", () => {
  const input = createValidHandoffInput();
  const inherited = Object.create(input);
  const missing = { ...input };
  delete missing.acceptedStructuredGeometry;

  for (const value of [null, [], new Date(), inherited]) {
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1(value),
      /field "input": requires plain object/u,
    );
  }
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(missing),
    /input\.acceptedStructuredGeometry.*requires own field/u,
  );
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1({ ...input, extra: true }),
    /input\.extra.*unknown field/u,
  );

  const hiddenExtraInput = { ...input };
  Object.defineProperty(hiddenExtraInput, "hiddenExtra", {
    enumerable: false,
    value: true,
  });
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(hiddenExtraInput),
    /input\.hiddenExtra.*unknown field/u,
  );

  const symbolExtraInput = { ...input, [Symbol("extra")]: true };
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(symbolExtraInput),
    /input\.\[symbol\].*unknown field/u,
  );

  for (const field of [
    "providerObservationContract",
    "acceptanceBoundary",
    "acceptedStructuredGeometry",
  ]) {
    class NestedInputRecord {}
    const classInstance = Object.assign(new NestedInputRecord(), input[field]);
    assert.throws(
      () => createControlledProviderObservationToCoreHandoffV1({ ...input, [field]: classInstance }),
      new RegExp(`input\\.${field}.*requires plain object`, "u"),
      field,
    );
  }

  const accessorInput = { ...input };
  Object.defineProperty(accessorInput, "acceptedStructuredGeometry", {
    enumerable: true,
    get: () => input.acceptedStructuredGeometry,
  });
  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(accessorInput),
    /input\.acceptedStructuredGeometry.*requires own data field/u,
  );
});

test("PR126 reports input snapshot failures in the structured handoff error style", () => {
  const input = createValidHandoffInput();
  input.providerObservationContract.providerClass = Symbol("not-cloneable");

  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(input),
    {
      name: "ControlledProviderObservationToCoreHandoffError",
      message:
        'Invalid controlled provider observation to Core handoff field "input": requires snapshot-compatible data.',
    },
  );
});

test("PR126 observation acceptance actor provenance and accepted geometry identity mismatches fail before mapping", () => {
  for (const [name, mutate, pattern] of [
    [
      "observation id",
      (input) => {
        input.acceptanceBoundary.providerObservationId = "controlled-provider-observation:v1:mismatch";
      },
      /acceptanceBoundary\.providerObservationId/u,
    ],
    [
      "actor id",
      (input) => {
        input.acceptedStructuredGeometry.acceptance.actorId = "stale-actor";
        refreshAcceptedGeometryIdentities(input);
      },
      /acceptedStructuredGeometry\.acceptance\.actorId/u,
    ],
    [
      "provenance actor",
      (input) => {
        input.acceptedStructuredGeometry.provenance.actorType = "provider";
        refreshAcceptedGeometryIdentities(input);
      },
      /acceptedStructuredGeometry\.provenance\.actorType/u,
    ],
    [
      "accepted content identity",
      (input) => {
        input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity =
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      },
      /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
    ],
  ]) {
    const input = createValidHandoffInput();
    mutate(input);
    assert.throws(() => createControlledProviderObservationToCoreHandoffV1(input), pattern, name);
  }
});

test("PR126 provider model prompt artifact confidence diagnostic metadata and self-acceptance cannot authorize mapping", () => {
  for (const [name, mutate, pattern] of [
    [
      "provider actor",
      (input) => {
        input.acceptanceBoundary.acceptanceActor.actorClass = "provider";
      },
      /acceptanceBoundary\.acceptanceActor\.actorClass/u,
    ],
    [
      "model actor",
      (input) => {
        input.acceptanceBoundary.acceptanceActor.actorClass = "model";
      },
      /acceptanceBoundary\.acceptanceActor\.actorClass/u,
    ],
    [
      "prompt actor",
      (input) => {
        input.acceptanceBoundary.acceptanceActor.actorClass = "prompt";
      },
      /acceptanceBoundary\.acceptanceActor\.actorClass/u,
    ],
    [
      "artifact actor",
      (input) => {
        input.acceptanceBoundary.acceptanceActor.actorClass = "artifact";
      },
      /acceptanceBoundary\.acceptanceActor\.actorClass/u,
    ],
    [
      "confidence",
      (input) => {
        input.acceptanceBoundary.confidenceScoreValueCanAuthorizeAcceptance = true;
      },
      /confidenceScoreValueCanAuthorizeAcceptance/u,
    ],
    [
      "diagnostic",
      (input) => {
        input.acceptanceBoundary.providerDiagnosticCanAuthorizeAcceptance = true;
      },
      /providerDiagnosticCanAuthorizeAcceptance/u,
    ],
    [
      "metadata",
      (input) => {
        input.acceptanceBoundary.providerMetadataCanAuthorizeAcceptance = true;
      },
      /providerMetadataCanAuthorizeAcceptance/u,
    ],
    [
      "self acceptance",
      (input) => {
        input.acceptanceBoundary.providerSelfAcceptance = true;
      },
      /providerSelfAcceptance/u,
    ],
    [
      "provider geometry",
      (input) => {
        input.acceptanceBoundary.providerGeometryCreated = true;
      },
      /providerGeometryCreated/u,
    ],
  ]) {
    const input = createValidHandoffInput();
    mutate(input);
    assert.throws(() => createControlledProviderObservationToCoreHandoffV1(input), pattern, name);
  }
});

test("PR126 unsupported point segment and axis accepted geometry returns no partial mapped composition", () => {
  const input = createValidHandoffInput({
    primitives: [
      { id: "point:center", kind: "point", x: 0.5, y: 0.5, confidence: null },
      {
        id: "segment:diagonal",
        kind: "segment",
        start: { x: 0.1, y: 0.1 },
        end: { x: 0.9, y: 0.9 },
        confidence: null,
      },
      {
        id: "axis:vertical",
        kind: "axis",
        start: { x: 0.5, y: 0.1 },
        end: { x: 0.5, y: 0.9 },
        confidence: null,
      },
    ],
  });
  const handoff = createControlledProviderObservationToCoreHandoffV1(input);

  assert.equal(handoff.ok, false);
  assert.equal(handoff.status, "unsupported");
  assert.equal(handoff.coreInputProduced, false);
  assert.equal("mappedComposition2D" in handoff, false);
  assert.equal(handoff.mappingResult.mappedGeometry, null);
  assert.equal(handoff.mappingResult.mappedGeometryContentIdentity, null);
  assert.deepEqual(handoff.mappingResult.primitiveMappings, []);
  assert.deepEqual(
    handoff.mappingResult.diagnostics.map((diagnostic) => diagnostic.code),
    [
      "UnsupportedAcceptedGeometryPrimitiveKind",
      "UnsupportedAcceptedGeometryPrimitiveKind",
      "UnsupportedAcceptedGeometryPrimitiveKind",
    ],
  );
});

test("PR126 invalid accepted geometry fails before mapper output and exposes no partial geometry", () => {
  const input = createValidHandoffInput();
  input.acceptedStructuredGeometry.primitives[0].width = 2;
  refreshAcceptedGeometryIdentities(input);

  assert.throws(
    () => createControlledProviderObservationToCoreHandoffV1(input),
    /acceptedStructuredGeometry.*must satisfy validateAcceptedGeometryV1/u,
  );
});

test("PR126 success sets only Core handoff flags and keeps mapper output derived", () => {
  const handoff = createControlledProviderObservationToCoreHandoffV1(createValidHandoffInput());

  assert.equal(handoff.providerObservationAuthority, "candidateEvidenceOnly");
  assert.equal(handoff.boundarySourceTruth, "acceptedStructuredGeometry");
  assert.equal(handoff.coreInputAuthority, "acceptedStructuredGeometry");
  assert.equal(handoff.acceptedGeometryIsOnlyCoreInput, true);
  assert.equal(handoff.providerSelfAcceptance, false);
  assert.equal(handoff.providerGeometryCreated, false);
  assert.equal(handoff.coreInputProduced, true);
  assert.equal(handoff.structuredAnalyzeInputProduced, false);
  assert.equal(handoff.structuredAnalyzeRun, false);
  assert.equal(handoff.resultJsonProduced, false);
  assert.equal(handoff.mappedGeometryAuthority, "derivedHandoffOutput");
  assert.equal(handoff.mappedGeometrySourceTruth, false);
  assert.equal(handoff.mappingResult.ok, true);
  assert.equal(
    handoff.mappingResult.primitiveMappings[0].acceptedGeometryContentIdentity,
    handoff.acceptedGeometryContentIdentity,
  );
});

test("PR126 repeated calls are deterministic", () => {
  const input = createValidHandoffInput();

  assert.deepEqual(
    createControlledProviderObservationToCoreHandoffV1(input),
    createControlledProviderObservationToCoreHandoffV1(input),
  );
});

test("PR126 does not mutate input and post-return mutation cannot change output", () => {
  const input = createValidHandoffInput();
  const before = structuredClone(input);
  const handoff = createControlledProviderObservationToCoreHandoffV1(input);
  const handoffBeforeMutation = structuredClone(handoff);

  assert.deepEqual(input, before);
  input.acceptedStructuredGeometry.primitives[0].x = 0.42;
  input.providerObservationContract.providerClass = "unknown_redacted_provider";
  input.acceptanceBoundary.acceptanceActor.actorId = "mutated-after-return";

  assert.deepEqual(handoff, handoffBeforeMutation);
});

test("PR126 provider-only observation fields cannot affect mapped coordinates or authorize mapping", () => {
  const first = createValidHandoffInput();
  const second = createValidHandoffInput();

  second.providerObservationContract.mediaTypeClass = "unknown_redacted_media_type";
  second.providerObservationContract.imageSizeClass = "large";
  second.providerObservationContract.providerClass = "unknown_redacted_provider";
  second.providerObservationContract.endpointClass = "unknown_redacted_endpoint";
  second.providerObservationContract.responseStatusClass = "unknown_redacted_status";
  relinkAcceptedGeometry(second);

  const firstHandoff = createControlledProviderObservationToCoreHandoffV1(first);
  const secondHandoff = createControlledProviderObservationToCoreHandoffV1(second);

  assert.equal(firstHandoff.ok, true);
  assert.equal(secondHandoff.ok, true);
  assert.deepEqual(
    secondHandoff.mappedComposition2D.elements.map((element) => element.geometry),
    firstHandoff.mappedComposition2D.elements.map((element) => element.geometry),
  );
  assert.equal(secondHandoff.providerObservationAuthority, "candidateEvidenceOnly");
  assert.equal(secondHandoff.coreInputAuthority, "acceptedStructuredGeometry");
});

test("PR126 helper is package-private and avoids forbidden runtime imports", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const indexSource = await readFile(indexSourcePath, "utf8");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageRoot = await import("../dist/src/index.js");

  assert.match(helperSource, /accepted-geometry-to-core-mapping/u);
  assert.match(helperSource, /createMappingRequest\(acceptedStructuredGeometry\)/u);
  assert.doesNotMatch(helperSource, /createMappingRequest\(acceptanceProof/u);
  assert.equal((helperSource.match(/structuredClone\(/gu) ?? []).length, 1);
  assert.doesNotMatch(helperSource, /JSON\.(?:parse|stringify)/u);
  assert.doesNotMatch(
    helperSource,
    /node:fs|node:child_process|node:https?|fetch|XMLHttpRequest|WebSocket|@openai|OpenAI|api\.openai|provider-sdk|provider parser|mcp|chatgpt|cad|figma|upload|oauth|structured-composition-analysis|from "\.\.\/index|from "@norma\/core"/iu,
  );
  assert.doesNotMatch(
    helperSource,
    /node:fs|node:child_process|node:https?|fetch\(|XMLHttpRequest|WebSocket|@openai|api\.openai|provider-sdk|result\.json|analyzeStructuredCompositionV1/iu,
  );
  assert.equal("createControlledProviderObservationToCoreHandoffV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /controlled-provider-observation-to-core-handoff/u);
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

test("PR126 changed files stay exact and protected runtime surfaces do not drift", async () => {
  const changedFiles = branchChangedFiles(repoRoot);
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  assert.equal(isExactChangedFileSet(changedFiles, controlledProviderObservationToCoreHandoffChangedFiles), true);
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledProviderObservationToCoreHandoffChangedFiles),
    controlledProviderObservationToCoreHandoffChangedFiles,
  );
  assert.deepEqual(sharedExactApprovedChangedFiles(changedFiles), controlledProviderObservationToCoreHandoffChangedFiles);

  for (const forbiddenPrefix of [
    "bin/",
    "docs/",
    "tests/fixtures/",
    "examples/",
    "viewer/",
    "reports/",
    ".github/",
  ]) {
    assert.equal(changedFiles.some((file) => file.startsWith(forbiddenPrefix)), false, forbiddenPrefix);
  }
  for (const forbiddenFile of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/geometry-observation.ts",
  ]) {
    assert.equal(changedFiles.includes(forbiddenFile), false, forbiddenFile);
  }
  assert.equal("bin" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
});

function createValidHandoffInput({
  providerObservationContract = createControlledProviderObservationContractV1(createRedactedSuccessArtifacts()),
  primitives = [
    rectanglePrimitive({
      id: "rectangle:frame",
      x: 0.1,
      y: 0.2,
      width: 0.7,
      height: 0.6,
    }),
  ],
} = {}) {
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
  const acceptedStructuredGeometry = createAcceptedGeometry({
    providerObservationContract,
    providerObservationContentIdentity,
    primitives,
  });
  const acceptanceBoundary = createAcceptanceBoundary({
    providerObservationContract,
    providerObservationContentIdentity,
    acceptedStructuredGeometry,
  });

  return {
    providerObservationContract,
    acceptanceBoundary,
    acceptedStructuredGeometry,
  };
}

function createAcceptanceBoundary({
  providerObservationContract,
  providerObservationContentIdentity,
  acceptedStructuredGeometry,
}) {
  return {
    kind: "norma.controlled-provider-observation-acceptance-boundary.v1",
    version: 1,
    acceptanceActor: {
      actorClass: "deterministic_test",
      actorId: "pr126-test",
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
}

function createAcceptedGeometry({
  providerObservationContract,
  providerObservationContentIdentity,
  primitives,
}) {
  const actorType = "deterministic-test";
  const actorId = "pr126-test";
  const createdAt = "2026-07-10T00:00:00Z";
  const provenance = {
    provenanceId: "prov:pr126:test",
    actorType,
    actorId,
    operationId: "controlled-provider-observation.to-core-handoff",
    operationVersion: "1",
    inputContentIdentity: providerObservationContentIdentity,
    createdAt,
    notes: null,
  };
  const accepted = {
    contractId: "norma.accepted-geometry@1",
    contractVersion: 1,
    acceptedGeometryId: "accepted:controlled-provider-observation:pr126:v1",
    sourceObservationId: providerObservationContract.observationId,
    sourceObservationContentIdentity: providerObservationContentIdentity,
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
    primitives: structuredClone(primitives),
    correctionHistory: [],
    acceptance: {
      acceptanceId: "acceptance:controlled-provider-observation:pr126:v1",
      accepted: true,
      actorType,
      actorId,
      acceptedAt: createdAt,
      sourceObservationId: providerObservationContract.observationId,
      sourceObservationContentIdentity: providerObservationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      acceptedPrimitiveIds: primitives.map((primitive) => primitive.id),
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

function rectanglePrimitive(overrides = {}) {
  return {
    id: "rectangle:frame",
    kind: "rectangle",
    x: 0.1,
    y: 0.2,
    width: 0.7,
    height: 0.6,
    confidence: 0.85,
    ...overrides,
  };
}

function relinkAcceptedGeometry(input) {
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(input.providerObservationContract);
  input.acceptanceBoundary.providerObservationContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.sourceObservationContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.provenance.inputContentIdentity = providerObservationContentIdentity;
  input.acceptedStructuredGeometry.acceptance.provenance.inputContentIdentity =
    providerObservationContentIdentity;
  refreshAcceptedGeometryIdentities(input);
}

function refreshAcceptedGeometryIdentities(input) {
  input.acceptedStructuredGeometry.acceptance.acceptedContentIdentity =
    computeAcceptedGeometryRevisionContentIdentity(input.acceptedStructuredGeometry);
  input.acceptedStructuredGeometry.contentIdentity =
    computeAcceptedGeometryContentIdentity(input.acceptedStructuredGeometry);
  input.acceptanceBoundary.acceptedGeometryContentIdentity = input.acceptedStructuredGeometry.contentIdentity;
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

  return {
    providerEvidenceEnvelope,
    summary,
  };
}
