import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
} from "../dist/src/geometry-observation.js";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "fixtures", "geometry-observation");
const validAcceptedGeometryFixture = readJsonFixture("valid-accepted-geometry-v1.json");

test("PR82 analyzes synthetic mapped AcceptedGeometry rectangles through Structured Analyze", () => {
  const input = createPr82StructuredAnalyzeInput();
  const before = core.serializeCanonicalJson(input);
  const firstInput = structuredClone(input);
  const secondInput = structuredClone(input);
  const firstBefore = core.serializeCanonicalJson(firstInput);
  const secondBefore = core.serializeCanonicalJson(secondInput);
  const firstSnapshot = structuredClone(firstInput);
  const secondSnapshot = structuredClone(secondInput);

  const first = core.analyzeStructuredCompositionV1(firstInput);
  const second = core.analyzeStructuredCompositionV1(secondInput);

  assertValid(first);
  assertValid(second);
  assert.equal(core.serializeCanonicalJson(input), before);
  assert.equal(core.serializeCanonicalJson(firstInput), firstBefore);
  assert.equal(core.serializeCanonicalJson(secondInput), secondBefore);
  assert.deepEqual(firstInput, firstSnapshot);
  assert.deepEqual(secondInput, secondSnapshot);
  assert.equal(first.comparison.status, "ambiguous");
  assert.equal(first.decision.selectedEvaluationRef, null);
  assert.equal(first.replayReadiness.status, "ready");
  assert.equal(first.serializationSummary.meaningfulIdentity, second.serializationSummary.meaningfulIdentity);
  assert.equal(first.replayReadiness.run.id, second.replayReadiness.run.id);
  assert.deepEqual(first.outputRefs, second.outputRefs);
  assert.deepEqual(first.provenance.transformationSteps, [
    {
      kind: "structured-composition-transformation-step",
      id: "transformation:pr82:map-accepted-geometry",
      description: "Map synthetic AcceptedGeometry rectangles into Core Composition2D inputs.",
      inputRefs: [
        { kind: "accepted-geometry", ref: "accepted:pr82:A" },
        { kind: "accepted-geometry", ref: "accepted:pr82:B" },
      ],
      outputRefs: input.provenance.transformationSteps[0].outputRefs,
    },
    {
      kind: "structured-composition-transformation-step",
      id: "transformation:pr82:shared-unit-surface",
      description: "Place both mapped compositions on one explicit synthetic unit surface for pair analysis.",
      inputRefs: [
        { kind: "composition-2d", ref: "composition:accepted-geometry:accepted:pr82:A:rectangles" },
        { kind: "composition-2d", ref: "composition:accepted-geometry:accepted:pr82:B:rectangles" },
      ],
      outputRefs: [
        { kind: "surface", ref: "surface:pr82:synthetic-unit" },
        { kind: "composition-2d", ref: "composition:pr82:mapped:A" },
        { kind: "composition-2d", ref: "composition:pr82:mapped:B" },
      ],
    },
  ]);
  assert.ok(first.inputRefs.some((ref) => ref.kind === "structured-source" && ref.ref === "composition:pr82:mapped:A"));
  assert.ok(first.inputRefs.some((ref) => ref.kind === "structured-source" && ref.ref === "composition:pr82:mapped:B"));
});

test("PR82 keeps rejected AcceptedGeometry primitives out of Structured Analyze", () => {
  const acceptedGeometry = acceptedRectangleGeometry("unsupported", [
    {
      id: "point:unsupported",
      kind: "point",
      x: 0.5,
      y: 0.5,
      confidence: 1,
    },
    rectanglePrimitive({ id: "rectangle:frame", x: 0, y: 0, width: 1, height: 1 }),
  ]);
  const result = mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedGeometry));

  assert.equal(result.ok, false);
  assert.equal(result.status, "unsupported");
  assert.equal(result.mappedGeometry, null);
  assert.deepEqual(result.primitiveMappings, []);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "UnsupportedAcceptedGeometryPrimitiveKind"), true);
});

function createPr82StructuredAnalyzeInput() {
  const acceptedA = acceptedRectangleGeometry("A", [
    rectanglePrimitive({ id: "rectangle:left-panel", x: 0, y: 0, width: 1 / 3, height: 1 }),
    rectanglePrimitive({ id: "rectangle:middle-panel", x: 1 / 3, y: 0, width: 1 / 3, height: 1 }),
    rectanglePrimitive({ id: "rectangle:right-panel", x: 2 / 3, y: 0, width: 1 / 3, height: 1 }),
  ]);
  const acceptedB = acceptedRectangleGeometry("B", [
    rectanglePrimitive({ id: "rectangle:wide-panel", x: 0, y: 0, width: 0.58, height: 1 }),
    rectanglePrimitive({ id: "rectangle:offset-panel", x: 0.55, y: 0, width: 0.28, height: 1 }),
  ]);
  const mappedA = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedA)), "A");
  const mappedB = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedB)), "B");
  const base = core.createMvpDemoInput();
  const tolerancePolicy = {
    ...structuredClone(base.tolerancePolicy),
    id: "pr82:tolerance-policy",
  };
  const sharedSurface = {
    ...mappedA.mappedGeometry.surface,
    id: "surface:pr82:synthetic-unit",
    tolerancePolicy,
  };
  const compositionA = decorateMappedComposition(mappedA.mappedGeometry, "A", sharedSurface, tolerancePolicy);
  const compositionB = decorateMappedComposition(mappedB.mappedGeometry, "B", sharedSurface, tolerancePolicy);
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }), "pr82:pack-lock");
  const evaluationTolerances = {
    ...structuredClone(base.evaluationTolerances),
    id: "pr82:evaluation-tolerances",
  };
  const comparisonTolerances = {
    ...structuredClone(base.comparisonTolerances),
    id: "pr82:comparison-tolerances",
  };
  const acceptedSourceIds = sourceIdsFor(compositionA, compositionB);
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: "pr82:accepted-geometry-structured-input" },
    { kind: "accepted-geometry", ref: acceptedA.acceptedGeometryId },
    { kind: "accepted-geometry", ref: acceptedB.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: acceptedA.contentIdentity },
    { kind: "accepted-geometry-content-identity", ref: acceptedB.contentIdentity },
    { kind: "mapping-result", ref: mappedA.result.resultContentIdentity },
    { kind: "mapping-result", ref: mappedB.result.resultContentIdentity },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: base.ruleSetRef },
    { kind: "evaluation-profile", ref: base.evaluationProfile.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: sharedSurface.coordinateSystem.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
  ];
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: sharedSurface.coordinateSystem,
    metricPolicy: null,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { pr82AcceptedGeometryIntegrationProof: true },
    sourceRefs,
  }), "pr82:operation-context");
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "deterministic-test",
    acceptedAt: "2026-07-01T00:00:00Z",
    acceptedSourceIds,
    acceptanceRecordId: "acceptance:pr82:structured-analyze",
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: "analysis:pr82:accepted-geometry-to-structured-analyze",
    compositionA,
    compositionB,
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
      externalSourceRef: { kind: "test-fixture", ref: "pr82:synthetic-accepted-geometry" },
      callerSourceIds: acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: "pr82-synthetic-shared-unit-surface@1",
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: "transformation:pr82:map-accepted-geometry",
          description: "Map synthetic AcceptedGeometry rectangles into Core Composition2D inputs.",
          inputRefs: [
            { kind: "accepted-geometry", ref: acceptedA.acceptedGeometryId },
            { kind: "accepted-geometry", ref: acceptedB.acceptedGeometryId },
          ],
          outputRefs: [
            { kind: "mapping-result", ref: mappedA.result.resultContentIdentity },
            { kind: "mapping-result", ref: mappedB.result.resultContentIdentity },
          ],
        },
        {
          kind: "structured-composition-transformation-step",
          id: "transformation:pr82:shared-unit-surface",
          description: "Place both mapped compositions on one explicit synthetic unit surface for pair analysis.",
          inputRefs: [
            { kind: "composition-2d", ref: mappedA.mappedGeometry.id },
            { kind: "composition-2d", ref: mappedB.mappedGeometry.id },
          ],
          outputRefs: [
            { kind: "surface", ref: sharedSurface.id },
            { kind: "composition-2d", ref: compositionA.id },
            { kind: "composition-2d", ref: compositionB.id },
          ],
        },
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
    requestId: `request:pr82:${acceptedGeometry.acceptedGeometryId}`,
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

function acceptedRectangleGeometry(caseId, primitives) {
  const accepted = clone(validAcceptedGeometryFixture);
  accepted.acceptedGeometryId = `accepted:pr82:${caseId}`;
  accepted.sourceObservationId = `observation:pr82:${caseId}`;
  accepted.sourceObservationContentIdentity = contentIdentitySeed(caseId);
  accepted.primitives = primitives;
  accepted.correctionHistory = [];
  accepted.acceptance = {
    ...accepted.acceptance,
    acceptanceId: `acceptance:pr82:${caseId}`,
    actorType: "deterministic-test",
    actorId: "pr82-test",
    sourceObservationId: accepted.sourceObservationId,
    sourceObservationContentIdentity: accepted.sourceObservationContentIdentity,
    acceptedRevision: accepted.acceptedRevision,
    acceptedPrimitiveIds: primitives.map((primitive) => primitive.id),
  };
  accepted.provenance = {
    ...accepted.provenance,
    actorId: "pr82-test",
    operationId: "accepted-geometry-to-structured-analyze.synthetic",
    operationVersion: "1.0.0",
  };
  recomputeAcceptedGeometryIdentities(accepted);
  return accepted;
}

function contentIdentitySeed(seed) {
  const hexSeedByCase = {
    A: "a",
    B: "b",
    unsupported: "c",
  };
  return `sha256:${hexSeedByCase[seed].repeat(64)}`;
}

function rectanglePrimitive(overrides = {}) {
  return {
    id: "rectangle:frame",
    kind: "rectangle",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    confidence: 1,
    ...overrides,
  };
}

function decorateMappedComposition(composition, label, sharedSurface, tolerancePolicy) {
  return {
    ...composition,
    id: `composition:pr82:mapped:${label}`,
    surface: sharedSurface,
    tolerancePolicy,
  };
}

function requiredMappedGeometry(result, label) {
  assert.equal(result.ok, true, label);
  assert.equal(result.status, "mapped", label);
  assert.ok(result.mappedGeometry, label);
  assert.deepEqual(result.diagnostics, []);
  return { result, mappedGeometry: result.mappedGeometry };
}

function requiredOutput(result, label) {
  assert.equal(result.status, "ok", label);
  assert.ok(result.output, label);
  return result.output;
}

function sourceIdsFor(...compositions) {
  return [...new Set(compositions.flatMap((composition) => [
    composition.id,
    composition.surface.id,
    ...composition.elements.map((element) => element.id),
    ...(composition.anchors ?? []).map((anchor) => anchor.id),
    ...composition.elements.flatMap((element) => (element.anchors ?? []).map((anchor) => anchor.id)),
  ]))].sort((first, second) => first.localeCompare(second));
}

function assertValid(result) {
  assert.equal(result.status, "valid");
  assert.equal(result.kind, "structured-composition-analysis-result");
  assert.equal(result.operationName, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME);
  assert.equal(result.operationVersion, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION);
  assert.deepEqual(result.errors, []);
  assert.ok(result.measurements);
  assert.ok(result.evaluations);
  assert.ok(result.comparison);
  assert.ok(result.decision);
  assert.ok(result.outputRefs.length > 0);
  assert.ok(result.replayReadiness.run);
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function recomputeAcceptedGeometryIdentities(accepted) {
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
}

function readJsonFixture(fileName) {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
