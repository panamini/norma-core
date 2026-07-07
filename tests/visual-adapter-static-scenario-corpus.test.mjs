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
const repoRoot = path.dirname(__dirname);
const corpusPath = path.join(__dirname, "fixtures", "visual-adapter", "static-scenario-corpus-v1.json");
const pr103FixturePath = path.join(__dirname, "fixtures", "visual-adapter", "static-handoff-proof-v1.json");
const expectedNames = [
  "synthetic map/parcel proportion observation",
  "synthetic facade/elevation proportion observation",
  "synthetic floor-plan/room-layout proportion observation",
];
let corpus;

before(() => {
  assert.equal(existsSync(corpusPath), true);
  corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
});

test("PR107 corpus envelope has the expected static local-only identity", () => {
  assert.equal(corpus.kind, "norma.visual-adapter.static-scenario-corpus");
  assert.equal(corpus.version, 1);
  assert.equal(corpus.corpusId, "visual-adapter-static-scenario-corpus-v1");
  assert.equal(corpus.contractId, "CC-20260707-pr107-static-synthetic-visual-scenario-corpus");
  assert.equal(corpus.operationId, "PR107: add static synthetic visual scenario corpus");
  assert.equal(corpus.localOnly, true);
  assert.equal(corpus.fixtureOnly, true);
  assert.equal(corpus.staticFixture, true);
  assert.equal(corpus.syntheticOnly, true);
  assert.deepEqual(corpus.scenarios.map((scenario) => scenario.name), expectedNames);
  assert.equal(corpus.scenarios.length, 3);
});

test("PR107 corpus and scenario content identities are deterministic stable projections", () => {
  assertSha256(corpus.corpusContentIdentity);
  assert.equal(corpus.corpusContentIdentity, deterministicIdentityWithoutKeys(corpus, ["corpusContentIdentity"]));

  const scenarioIds = new Set();
  const scenarioIdentities = new Set();
  for (const scenario of corpus.scenarios) {
    assert.match(scenario.scenarioId, /^scenario:[a-z0-9-]+:v1$/u);
    assert.equal(scenarioIds.has(scenario.scenarioId), false);
    assert.equal(scenarioIdentities.has(scenario.scenarioContentIdentity), false);
    scenarioIds.add(scenario.scenarioId);
    scenarioIdentities.add(scenario.scenarioContentIdentity);
    assert.equal(scenario.scenarioContentIdentity, deterministicIdentityWithoutKeys(scenario, ["scenarioContentIdentity"]));
    assert.equal(scenario.syntheticSourceAsset.contentIdentity, deterministicIdentityWithoutKeys(scenario.syntheticSourceAsset, ["contentIdentity"]));
    assert.equal(
      scenario.candidateVisualObservations.observationContentIdentity,
      deterministicIdentityWithoutKeys(scenario.candidateVisualObservations, ["observationContentIdentity"]),
    );
  }
});

test("PR107 scenarios are synthetic-only local-only fixture-only with complete provenance", () => {
  for (const scenario of corpus.scenarios) {
    assert.equal(scenario.syntheticSourceAsset.syntheticOnly, true);
    assert.equal(scenario.syntheticSourceAsset.localOnly, true);
    assert.equal(scenario.syntheticSourceAsset.fixtureOnly, true);
    assert.equal(scenario.syntheticSourceAsset.staticFixture, true);
    assert.equal(scenario.syntheticSourceAsset.rawContentIncluded, false);
    assert.equal(scenario.providerAdapterProvenance.providerIdentity.provenanceOnly, true);
    assert.equal(scenario.providerAdapterProvenance.providerIdentity.runtimeCallsAllowed, false);
    assert.equal(scenario.providerAdapterProvenance.adapterIdentity.provenanceOnly, true);
    assert.equal(scenario.providerAdapterProvenance.adapterIdentity.runtimeCallsAllowed, false);
    assert.ok(scenario.candidateVisualObservations.observationId);
    assert.ok(scenario.acceptance.actorId);
    assert.equal(scenario.acceptance.mode, "explicit_fixture_acceptance");
    assert.deepEqual(scenario.acceptance.correctionHistory, []);
    assert.ok(scenario.acceptedStructuredGeometry.acceptedGeometryId);
    assert.equal(scenario.handoffProvenance.contractIdentity, `${corpus.contractId}@1`);
  }
});

test("PR107 corpus recursively excludes forbidden data classes", () => {
  const serialized = JSON.stringify(corpus);
  for (const forbiddenPattern of [
    /data:image\//i,
    /base64/i,
    /https?:\/\//i,
    /file:\/\//i,
    /\/Users\//,
    /\/Volumes\//,
    /C:\\/i,
    /bearer\s+[a-z0-9._-]+/i,
    /api[_-]?key/i,
    /sk-[a-z0-9]/i,
    /cookie/i,
    /signed[_-]?url/i,
    /private production/i,
    /real-user/i,
    /screenshot/i,
    /photo payload/i,
    /cad file/i,
    /figma file/i,
    /prompt.*source truth/i,
  ]) {
    assert.doesNotMatch(serialized, forbiddenPattern, forbiddenPattern.source);
  }
});

test("PR107 candidate visual observations are evidence only and not Core/package/connector truth", () => {
  assert.equal(corpus.sourceTruthPolicy.coreTruth, "acceptedStructuredGeometry");
  assert.equal(corpus.sourceTruthPolicy.coreInputAllowedFrom, "acceptedStructuredGeometryOnly");

  for (const scenario of corpus.scenarios) {
    const observations = scenario.candidateVisualObservations;
    assert.equal(observations.candidateEvidenceOnly, true);
    assert.equal(observations.sourceTruth, false);
    assert.equal(observations.coreInput, false);
    assert.equal(observations.packageApiTruth, false);
    assert.equal(observations.connectorTruth, false);
    assert.ok(observations.lossyConversionWarnings.length > 0);
    assert.equal("acceptance" in observations, false);
    assert.notDeepEqual(
      observations.observations.map((observation) => observation.id),
      scenario.acceptedStructuredGeometry.primitives.map((primitive) => primitive.id),
    );
  }
});

test("PR107 accepted structured geometry is the only Core handoff and analyzes deterministically", () => {
  for (const scenario of corpus.scenarios) {
    assert.equal(scenario.truthBoundary.acceptedStructuredGeometryOnlyCoreHandoff, true);
    assert.equal(scenario.acceptedGeometryContentIdentity, scenario.acceptedStructuredGeometry.contentIdentity);
    assert.equal(scenario.acceptedStructuredGeometry.sourceObservationContentIdentity, scenario.candidateVisualObservations.observationContentIdentity);

    const input = createStructuredAnalyzeInputFromScenario(scenario);
    const inputBefore = core.serializeCanonicalJson(input);
    const first = core.analyzeStructuredCompositionV1(structuredClone(input));
    const second = core.analyzeStructuredCompositionV1(structuredClone(input));

    assert.equal(core.serializeCanonicalJson(input), inputBefore);
    assert.equal(first.status, "valid");
    assert.equal(second.status, "valid");
    assert.equal(core.serializeCanonicalJson(first), core.serializeCanonicalJson(second));
    assert.equal(first.kind, "structured-composition-analysis-result");
    assert.equal(first.provenance.sourceKind, "user_supplied_structured_data");
    assert.equal(first.provenance.adapter, null);
    assert.equal(first.replayReadiness.status, "ready");
    assert.equal(JSON.parse(core.serializeCanonicalJson(first)).status, "valid");
    assert.doesNotMatch(core.serializeCanonicalJson(input), /candidate:|candidate-visual-observations|lossyConversionWarnings/u);
    assert.ok(input.operationContext.sourceRefs.some((ref) => ref.ref === scenario.acceptedStructuredGeometry.acceptedGeometryId));
    assert.ok(input.provenance.transformationSteps[0].inputRefs.some((ref) => ref.ref === scenario.acceptedStructuredGeometry.acceptedGeometryId));
  }
});

test("PR107 derived evidence and lossy warnings cannot override accepted geometry or metric policy", () => {
  for (const scenario of corpus.scenarios) {
    for (const artifact of scenario.derivedEvidence) {
      assert.equal(artifact.candidateEvidenceOnly, true);
      assert.equal(artifact.sourceTruth, false);
      assert.equal(artifact.coreInput, false);
      assert.equal(artifact.mayOverrideAcceptedGeometry, false);
      assert.equal(artifact.metricPolicyAuthority, false);
    }
    assert.equal(scenario.truthBoundary.evidenceMetadataCannotOverrideAcceptedGeometry, true);
    assert.equal(scenario.metricPolicyInvariant.mayInferPhysicalMeasurementsFromPixels, false);
    assert.equal(scenario.metricPolicyInvariant.mayDropSurfaceOnlyMetricPolicy, false);
    assert.equal(scenario.metricPolicyInvariant.derivedArtifactsMayOverrideMetricPolicy, false);
    assert.equal(scenario.metricPolicyInvariant.metricPolicyMayGenerateGeometry, false);
  }
});

test("PR107 makes no forbidden real-recognition provider publication or judgment claims", () => {
  const serialized = JSON.stringify(corpus);
  for (const forbiddenPattern of [
    /real image recognition/i,
    /OpenAI call/i,
    /provider call/i,
    /CAD import/i,
    /Figma import/i,
    /hosted MCP/i,
    /ChatGPT connector runtime/i,
    /package publication/i,
    /public export/i,
    /recommendation/i,
    /correction authority/i,
    /optimization/i,
    /scoring/i,
    /beauty judgment/i,
    /automatic family selection/i,
  ]) {
    assert.doesNotMatch(serialized, forbiddenPattern, forbiddenPattern.source);
  }
});

test("PR107 keeps PR103 fixture compatibility and PR106 consumer helper package-private", async () => {
  assert.equal(existsSync(pr103FixturePath), true);
  const pr103 = JSON.parse(readFileSync(pr103FixturePath, "utf8"));
  assert.equal(pr103.proofId, "visual-adapter-static-handoff-proof-v1");
  assert.equal(pr103.sourceTruthPolicy.coreInputAllowedFrom, "acceptedStructuredGeometryOnly");

  const packageRoot = await import("../dist/src/index.js");
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const currentIndex = readFileSync(path.join(repoRoot, "src", "index.ts"), "utf8");
  const testSource = readFileSync(__filename, "utf8");

  assert.equal("createVisualFixtureGuidedInspectionConsumerProof" in packageRoot, false);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.doesNotMatch(currentIndex, /visual-fixture-guided-inspection-consumer-proof/u);
  assert.doesNotMatch(testSource, /visual-fixture-guided-inspection-consumer-proof\.js/u);
});

function createStructuredAnalyzeInputFromScenario(scenario) {
  const acceptedGeometry = withComputedAcceptedGeometryIdentities(scenario.acceptedStructuredGeometry);
  const mapped = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedGeometry)));
  const baseComposition = mapped.mappedGeometry;
  const comparisonComposition = shiftedComposition(baseComposition, scenario.comparisonDelta);
  const base = core.createMvpDemoInput();
  const tolerancePolicy = { ...structuredClone(base.tolerancePolicy), id: `tolerance:${scenario.scenarioId}` };
  const normalization = requiredNormalization(normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: `request:${scenario.scenarioId}:synthetic-shared-unit-surface`,
    mappedCompositionA: baseComposition,
    mappedCompositionB: comparisonComposition,
    normalizedCompositionAId: `composition:${scenario.scenarioId}:mapped:A`,
    normalizedCompositionBId: `composition:${scenario.scenarioId}:mapped:B`,
    sharedSurfaceId: `surface:${scenario.scenarioId}:synthetic-unit`,
    tolerancePolicy,
    transformationStepId: `transformation:${scenario.scenarioId}:shared-unit-surface`,
  }));
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }));
  const evaluationTolerances = { ...structuredClone(base.evaluationTolerances), id: `evaluation-tolerances:${scenario.scenarioId}` };
  const comparisonTolerances = { ...structuredClone(base.comparisonTolerances), id: `comparison-tolerances:${scenario.scenarioId}` };
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: `input:${scenario.scenarioId}` },
    { kind: "accepted-geometry", ref: acceptedGeometry.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: acceptedGeometry.contentIdentity },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: base.ruleSetRef },
    { kind: "evaluation-profile", ref: base.evaluationProfile.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
  ];
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: normalization.sharedSurface.coordinateSystem,
    metricPolicy: null,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { visualAdapterStaticScenarioCorpusProof: true },
    sourceRefs,
  }));
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "deterministic-test",
    acceptedAt: "2026-07-07T00:00:00Z",
    acceptedSourceIds: normalization.acceptedSourceIds,
    acceptanceRecordId: `acceptance:${scenario.scenarioId}:structured-analyze`,
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: `analysis:${scenario.scenarioId}`,
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
      externalSourceRef: { kind: "test-fixture", ref: corpus.corpusId },
      callerSourceIds: normalization.acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: `transformation:${scenario.scenarioId}:map-accepted-geometry`,
          description: "Map explicitly accepted fixture geometry into Core Composition2D inputs.",
          inputRefs: [{ kind: "accepted-geometry", ref: acceptedGeometry.acceptedGeometryId }],
          outputRefs: [{ kind: "mapping-result", ref: mapped.resultContentIdentity }],
        },
        normalization.transformationStep,
      ],
      acceptanceRecord: acceptance,
      operationContextRef: operationContext.ref,
    },
  };
}

function withComputedAcceptedGeometryIdentities(acceptedGeometry) {
  const accepted = structuredClone(acceptedGeometry);
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  return accepted;
}

function validMappingRequest(acceptedGeometry) {
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:pr107:${acceptedGeometry.acceptedGeometryId}`,
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

function shiftedComposition(composition, delta) {
  return {
    ...structuredClone(composition),
    id: `${composition.id}:comparison-source`,
    surface: {
      ...structuredClone(composition.surface),
      id: `${composition.surface.id}:comparison-source`,
    },
    elements: composition.elements.map((element, index) => ({
      ...structuredClone(element),
      id: `${element.id}:comparison:${index}`,
      geometry: {
        ...element.geometry,
        width: Math.max(0.1, element.geometry.width - delta),
      },
    })),
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
  assert.deepEqual(result.diagnostics, []);
  return result;
}

function requiredOutput(result) {
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return result.output;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function deterministicIdentityWithoutKeys(value, keys) {
  return deterministicIdentity(stripKeys(value, new Set(keys)));
}

function deterministicIdentity(value) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(stable(value)));
  return `sha256:${hash.digest("hex")}`;
}

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }

  return value;
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

function assertSha256(value) {
  assert.match(value, /^sha256:[0-9a-f]{64}$/u);
}
