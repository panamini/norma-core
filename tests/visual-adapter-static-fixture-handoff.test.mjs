import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test, { before } from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import {
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
  mapAcceptedGeometryToCoreV1,
} from "../dist/src/accepted-geometry-to-core-mapping.js";
import {
  ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
  normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1,
} from "../dist/src/accepted-geometry-to-structured-analyze-normalization.js";
import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
} from "../dist/src/geometry-observation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(__dirname, "fixtures", "visual-adapter", "static-handoff-proof-v1.json");
let fixture;

before(() => {
  fixture = loadFixture();
});

test("PR103 fixture envelope is static synthetic local-only and fixture-only", () => {
  assert.equal(fixture.contractId, "norma.visual-adapter.static-handoff-proof");
  assert.equal(fixture.contractVersion, 1);
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.staticFixture, true);
  assert.equal(fixture.syntheticOnly, true);
  assert.equal(fixture.sourceAsset.kind, "synthetic-source-asset");
  assert.equal(fixture.sourceAsset.rawContentIncluded, false);
  assert.equal(fixture.adapter.runtimeCallsAllowed, false);
});

test("PR103 fixture recursively excludes forbidden source payload and secret classes", () => {
  const serialized = JSON.stringify(fixture);

  for (const forbiddenPattern of [
    /data:image\//i,
    /base64/i,
    /https?:\/\//i,
    /file:\/\//i,
    /\/Users\//,
    /\/Volumes\//,
    /C:\\\\/i,
    /bearer\s+[a-z0-9._-]+/i,
    /api[_-]?key/i,
    /sk-[a-z0-9]/i,
    /cookie/i,
    /signed[_-]?url/i,
    /private production/i,
    /real-user/i,
  ]) {
    assert.doesNotMatch(serialized, forbiddenPattern, forbiddenPattern.source);
  }
});

test("PR103 fixture preserves provenance identities and lossy conversion warnings", () => {
  assertSha256(fixture.sourceAsset.contentIdentity);
  assertSha256(fixture.candidateObservation.observationContentIdentity);
  assertSha256(fixture.acceptedStructuredGeometry.sourceObservationContentIdentity);
  assertSha256(fixture.acceptedStructuredGeometry.contentIdentity);
  assert.equal(fixture.sourceAsset.contentIdentity, deterministicIdentityWithoutKeys(fixture.sourceAsset, ["contentIdentity"]));
  assert.equal(
    fixture.candidateObservation.observationContentIdentity,
    deterministicIdentityWithoutKeys(fixture.candidateObservation, ["observationContentIdentity"]),
  );
  assert.equal(
    fixture.candidateObservation.provenance.observationContentIdentity,
    fixture.candidateObservation.observationContentIdentity,
  );
  assert.equal(
    fixture.acceptedStructuredGeometry.sourceObservationContentIdentity,
    fixture.candidateObservation.observationContentIdentity,
  );
  assert.equal(
    fixture.acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity,
    fixture.candidateObservation.observationContentIdentity,
  );
  assert.equal(fixture.handoffProvenance.acceptedGeometryContentIdentity, fixture.acceptedStructuredGeometry.contentIdentity);
  assert.equal(fixture.candidateObservation.provenance.sourceAssetIdentity, fixture.sourceAsset.assetId);
  assert.equal(fixture.candidateObservation.provenance.providerIdentity, "provider:synthetic-fixture@0.0.0");
  assert.equal(fixture.candidateObservation.provenance.adapterIdentity, "adapter:fixture-only:visual-static-handoff@1.0.0");
  assert.equal(fixture.candidateObservation.provenance.operationId, "visual-adapter-static-fixture.normalize");
  assert.equal(fixture.handoffProvenance.observationIdentity, fixture.candidateObservation.observationId);
  assert.equal(
    fixture.handoffProvenance.observationContentIdentity,
    fixture.candidateObservation.observationContentIdentity,
  );
  assert.equal(fixture.handoffAcceptance.actorId, "visual-static-fixture-test");
  assert.equal(fixture.handoffAcceptance.mode, "explicit_fixture_acceptance");
  assert.deepEqual(fixture.acceptedStructuredGeometry.correctionHistory, []);
  assert.equal(fixture.handoffProvenance.contractIdentity, "norma.visual-adapter.static-handoff-proof@1");
  assert.deepEqual(fixture.candidateObservation.normalizedVisualObservation.lossyConversionWarnings, [
    "normalized coordinates omit original pixel dimensions",
    "primitive vocabulary is reduced to rectangles",
    "metric meaning remains unitless",
    "pixel-origin conventions are fixture-declared",
    "perspective and cropping are not recoverable from this fixture",
    "provider confidence is diagnostic only",
    "adapter configuration is fixture-only",
  ]);
});

test("PR103 candidate observations and derived artifacts are not Core input or source truth", () => {
  assert.equal(fixture.sourceTruthPolicy.coreTruth, "acceptedStructuredGeometry");
  assert.equal(fixture.sourceTruthPolicy.coreInputAllowedFrom, "acceptedStructuredGeometryOnly");
  assert.equal(fixture.candidateObservation.candidateEvidenceOnly, true);
  assert.equal(fixture.candidateObservation.sourceTruth, false);
  assert.equal(fixture.candidateObservation.coreInput, false);
  assert.equal("acceptance" in fixture.candidateObservation, false);

  for (const forbiddenTruthField of [
    "artifact",
    "observation",
    "image",
    "provider",
    "cad",
    "figma",
    "prompt",
    "report",
  ]) {
    assert.equal(fixture.sourceTruthPolicy.coreTruth.includes(forbiddenTruthField), false, forbiddenTruthField);
  }

  for (const artifact of fixture.derivedArtifacts) {
    assert.equal(artifact.candidateEvidenceOnly, true);
    assert.equal(artifact.sourceTruth, false);
    assert.equal(artifact.coreInput, false);
    assert.equal(artifact.mayOverrideAcceptedGeometry, false);
    assert.equal(artifact.metricPolicyAuthority, false);
  }
});

test("PR103 accepted structured geometry flows through existing package-private Structured Analyze path", () => {
  const input = createStructuredAnalyzeInputFromAcceptedGeometry(fixture.acceptedStructuredGeometry);
  const snapshot = core.serializeCanonicalJson(input);
  const result = core.analyzeStructuredCompositionV1(input);

  assert.equal(core.serializeCanonicalJson(input), snapshot);
  assert.equal(result.status, "valid");
  assert.equal(result.kind, "structured-composition-analysis-result");
  assert.equal(result.operationName, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME);
  assert.equal(result.operationVersion, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION);
  assert.deepEqual(result.errors, []);
  assert.equal(result.replayReadiness.status, "ready");
  assert.ok(result.inputRefs.some((ref) => ref.ref === "composition:pr103:mapped:A"));
  assert.ok(result.inputRefs.some((ref) => ref.ref === "composition:pr103:mapped:B"));
  assert.deepEqual(result.provenance.transformationSteps.map((step) => step.id), [
    "transformation:pr103:map-accepted-geometry",
    "transformation:pr103:shared-unit-surface",
  ]);
});

test("PR103 metric-policy invariants remain aligned across normalized outputs and derived artifacts", () => {
  const metricPolicy = {
    kind: "metric-policy",
    id: "metric-policy:pr103:unit",
    quantity: "length",
    unit: "unit",
  };
  const input = createStructuredAnalyzeInputFromAcceptedGeometry(fixture.acceptedStructuredGeometry, { metricPolicy });
  const result = core.analyzeStructuredCompositionV1(structuredClone(input));

  assert.equal(result.status, "valid");
  assert.deepEqual(input.operationContext.metricPolicy.value, metricPolicy);
  assert.deepEqual(input.compositionA.metricPolicy, metricPolicy);
  assert.deepEqual(input.compositionB.metricPolicy, metricPolicy);
  assert.deepEqual(input.compositionA.surface.metricPolicy, metricPolicy);
  assert.deepEqual(input.compositionB.surface.metricPolicy, metricPolicy);
  assert.equal(fixture.metricPolicyInvariant.unit, "unit");
  assert.equal(fixture.metricPolicyInvariant.mayInferPhysicalMeasurementsFromPixels, false);
  assert.equal(fixture.metricPolicyInvariant.mayDropSurfaceOnlyMetricPolicy, false);
  assert.equal(fixture.metricPolicyInvariant.derivedArtifactsMayOverrideMetricPolicy, false);

  const measurements = [
    ...result.measurements.a.constructionMeasurements,
    ...result.measurements.a.compositions.flatMap((composition) => composition.measurements),
  ];
  assert.ok(measurements.length > 0);
  for (const measurement of measurements) {
    assert.equal(measurement.metricPolicy.sourceMetricPolicyRef, metricPolicy.id);
  }
});

test("PR103 content identities are deterministic test-only projections without src changes", () => {
  const accepted = withComputedAcceptedGeometryIdentities(fixture.acceptedStructuredGeometry);
  const repeated = withComputedAcceptedGeometryIdentities(structuredClone(fixture.acceptedStructuredGeometry));

  assertSha256(accepted.acceptance.acceptedContentIdentity);
  assertSha256(accepted.contentIdentity);
  assert.equal(fixture.acceptedStructuredGeometry.acceptance.acceptedContentIdentity, accepted.acceptance.acceptedContentIdentity);
  assert.equal(fixture.acceptedStructuredGeometry.contentIdentity, accepted.contentIdentity);
  assert.equal(fixture.handoffProvenance.acceptedGeometryContentIdentity, accepted.contentIdentity);
  assert.equal(accepted.acceptance.acceptedContentIdentity, repeated.acceptance.acceptedContentIdentity);
  assert.equal(accepted.contentIdentity, repeated.contentIdentity);
  assert.notEqual(accepted.contentIdentity, fixture.candidateObservation.observationContentIdentity);
});

test("PR103 source-truth policy identity projection is deterministic", () => {
  assertSha256(deterministicIdentity(fixture.sourceTruthPolicy));
});

function createStructuredAnalyzeInputFromAcceptedGeometry(acceptedGeometry, options = {}) {
  const accepted = withComputedAcceptedGeometryIdentities(acceptedGeometry);
  const mapped = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(accepted)));
  const baseComposition = options.metricPolicy ? withMetricPolicy(mapped.mappedGeometry, options.metricPolicy) : mapped.mappedGeometry;
  const comparisonComposition = shiftedComposition(baseComposition, options.metricPolicy);
  const base = core.createMvpDemoInput();
  const tolerancePolicy = {
    ...structuredClone(base.tolerancePolicy),
    id: "tolerance:pr103",
  };
  const normalization = requiredNormalization(normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: "request:pr103:synthetic-shared-unit-surface",
    mappedCompositionA: baseComposition,
    mappedCompositionB: comparisonComposition,
    normalizedCompositionAId: "composition:pr103:mapped:A",
    normalizedCompositionBId: "composition:pr103:mapped:B",
    sharedSurfaceId: "surface:pr103:synthetic-unit",
    tolerancePolicy,
    transformationStepId: "transformation:pr103:shared-unit-surface",
  }));
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }));
  const evaluationTolerances = {
    ...structuredClone(base.evaluationTolerances),
    id: "evaluation-tolerances:pr103",
  };
  const comparisonTolerances = {
    ...structuredClone(base.comparisonTolerances),
    id: "comparison-tolerances:pr103",
  };
  const acceptedSourceIds = normalization.acceptedSourceIds;
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: "input:pr103:visual-static-handoff" },
    { kind: "accepted-geometry", ref: accepted.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: accepted.contentIdentity },
    { kind: "visual-observation", ref: accepted.sourceObservationId },
    { kind: "visual-observation-content-identity", ref: accepted.sourceObservationContentIdentity },
    { kind: "mapping-result", ref: mapped.resultContentIdentity },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: base.ruleSetRef },
    { kind: "evaluation-profile", ref: base.evaluationProfile.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: normalization.sharedSurface.coordinateSystem.id },
    ...(options.metricPolicy ? [{ kind: "metric-policy", ref: options.metricPolicy.id }] : []),
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
  ];
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: normalization.sharedSurface.coordinateSystem,
    metricPolicy: options.metricPolicy ?? null,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { visualAdapterStaticFixtureHandoffProof: true },
    sourceRefs,
  }));
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "deterministic-test",
    acceptedAt: "2026-07-04T00:00:00Z",
    acceptedSourceIds,
    acceptanceRecordId: "acceptance:pr103:structured-analyze",
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: "analysis:pr103:visual-static-fixture-handoff",
    compositionA: normalization.compositionA,
    compositionB: normalization.compositionB,
    acceptance,
    ratioPack,
    packLock,
    ruleSetRef: base.ruleSetRef,
    evaluationProfile: base.evaluationProfile,
    evaluationTolerances,
    comparisonTolerances,
    tolerancePolicy,
    operationContext,
    provenance: {
      kind: "structured-composition-analysis-provenance",
      sourceKind: "user_supplied_structured_data",
      externalSourceRef: { kind: "test-fixture", ref: fixture.proofId },
      callerSourceIds: acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: "transformation:pr103:map-accepted-geometry",
          description: "Map explicitly accepted fixture geometry into Core Composition2D inputs.",
          inputRefs: [{ kind: "accepted-geometry", ref: accepted.acceptedGeometryId }],
          outputRefs: [{ kind: "mapping-result", ref: mapped.resultContentIdentity }],
        },
        normalization.transformationStep,
      ],
      acceptanceRecord: acceptance,
      operationContextRef: operationContext.ref,
    },
  };
}

function validMappingRequest(acceptedGeometry) {
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:pr103:${acceptedGeometry.acceptedGeometryId}`,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry,
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    mappingContext: {
      boundary: "synthetic-only",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
  };
}

function shiftedComposition(composition, metricPolicy) {
  const shifted = {
    ...structuredClone(composition),
    id: "composition:pr103:comparison-source",
    surface: {
      ...structuredClone(composition.surface),
      id: "surface:pr103:comparison-source",
    },
    elements: composition.elements.map((element, index) => ({
      ...structuredClone(element),
      id: `element:pr103:comparison:${index}`,
      geometry: {
        ...element.geometry,
        width: element.geometry.width === 0.5 ? 0.45 : element.geometry.width,
      },
    })),
  };

  return metricPolicy ? withMetricPolicy(shifted, metricPolicy) : shifted;
}

function withMetricPolicy(composition, metricPolicy) {
  return {
    ...structuredClone(composition),
    metricPolicy,
    surface: {
      ...composition.surface,
      metricPolicy,
    },
  };
}

function requiredMappedGeometry(result) {
  assert.equal(result.ok, true);
  assert.equal(result.status, "mapped");
  assert.ok(result.mappedGeometry);
  assert.deepEqual(result.diagnostics, []);
  return result;
}

function requiredNormalization(result) {
  assert.equal(result.ok, true);
  assert.equal(result.status, "normalized");
  assert.ok(result.sharedSurface);
  assert.ok(result.compositionA);
  assert.ok(result.compositionB);
  assert.ok(result.transformationStep);
  assert.deepEqual(result.diagnostics, []);
  return result;
}

function requiredOutput(result) {
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return result.output;
}

function withComputedAcceptedGeometryIdentities(acceptedGeometry) {
  const accepted = structuredClone(acceptedGeometry);
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  return accepted;
}

function assertSha256(value) {
  assert.match(value, /^sha256:[0-9a-f]{64}$/);
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function loadFixture() {
  assert.equal(existsSync(fixturePath), true, "PR103 static handoff fixture should exist");
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

function deterministicIdentity(value) {
  const hash = createHash("sha256");
  hash.update(core.serializeCanonicalJson(value, core.DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY));
  return `sha256:${hash.digest("hex")}`;
}

function deterministicIdentityWithoutKeys(value, keys) {
  return deterministicIdentity(stripKeys(value, new Set(keys)));
}

function stripKeys(value, keys) {
  if (Array.isArray(value)) {
    return value.map((item) => stripKeys(item, keys));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !keys.has(key))
        .map(([key, child]) => [key, stripKeys(child, keys)]),
    );
  }

  return value;
}
