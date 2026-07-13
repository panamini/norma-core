import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
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
import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

import {
  sharedExactApprovedChangedFiles,
  syntheticExternalEvidenceAcceptanceBoundaryChangedFiles,
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
const decisionDocPath = path.join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-08-synthetic-external-evidence-acceptance-boundary.md",
);
const roadmapPath = path.join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const packageJsonPath = path.join(repoRoot, "package.json");
const envelope = JSON.parse(readFileSync(fixturePath, "utf8"));

test("PR110 decision doc and roadmap define only the synthetic acceptance boundary", () => {
  assert.equal(existsSync(decisionDocPath), true);
  const decisionDoc = readDoc(decisionDocPath);
  const roadmapSection = sectionForHeading(readDoc(roadmapPath), "## Visual Fixture Roadmap Truth Sync After PR104");

  assertDocMentions(decisionDoc, [
    "Accepted synthetic boundary proof",
    "PR110 proves only the trust boundary",
    "External evidence",
    "Observation Envelope",
    "Acceptance Boundary",
    "Accepted Structured Geometry",
    "Existing AcceptedGeometry validation",
    "Existing Structured Analyze",
    "Providers may produce evidence. Providers may not produce Norma truth.",
    "Acceptance is outside the provider boundary.",
    "Accepted Structured Geometry enters Core.",
    "The Structured Analyze result remains canonical computational output.",
    "PR111 chooses whether to:",
  ]);

  for (const nonGoal of [
    "provider runtime",
    "OpenAI API",
    "image recognition",
    "CAD/Figma import",
    "ChatGPT connector runtime",
    "MCP changes",
    "package publication",
    "package exports",
    "package metadata, dependency, or lockfile changes",
    "Core schema widening",
    "Core runtime widening",
  ]) {
    assertDocMentions(decisionDoc, [nonGoal]);
  }

  assertDocMentions(roadmapSection, [
    "PR108 established the external evidence boundary",
    "PR109 selected the vision-style evidence pilot category",
    "PR110 proved the synthetic external evidence acceptance boundary",
    "PR110 does not approve OpenAI integration, image recognition, provider support, product readiness",
  ]);
  assert.doesNotMatch(roadmapSection, /\bPR110\s+implements\b/i);
});

test("Path A rejects observation-only synthetic external evidence before Core", () => {
  const observationEnvelope = envelope.observationEnvelope;
  const acceptedValidation = validateAcceptedGeometryV1(observationEnvelope);
  const analysis = core.analyzeStructuredCompositionV1(observationEnvelope);

  assert.equal(observationEnvelope.trust.untrusted, true);
  assert.equal(observationEnvelope.trust.nonAuthoritative, true);
  assert.equal(observationEnvelope.trust.candidateEvidenceOnly, true);
  assert.equal(observationEnvelope.trust.coreInput, false);
  assert.equal(observationEnvelope.trust.packageApiTruth, false);
  assert.equal(observationEnvelope.trust.connectorTruth, false);
  assert.equal(observationEnvelope.trust.acceptedStructuredGeometry, false);
  assert.equal(acceptedValidation.ok, false);
  assert.equal(analysis.status, "invalid");
  assert.equal(analysis.errors.some((error) => error.code === "InvalidInputShape"), true);
  assertObservationEnvelopeHasNoCoreInput(observationEnvelope);
});

test("Path A blocks candidate geometry provider metadata confidence prompts and artifacts from authorizing acceptance", () => {
  const observationEnvelope = envelope.observationEnvelope;

  for (const suggestion of observationEnvelope.candidateGeometrySuggestions) {
    assert.equal(suggestion.untrusted, true);
    assert.equal(suggestion.nonAuthoritative, true);
    assert.equal(suggestion.candidateEvidenceOnly, true);
    assert.equal(validateAcceptedGeometryV1(suggestion).ok, false);
    assert.equal(core.analyzeStructuredCompositionV1(suggestion).status, "invalid");
  }

  assert.equal(observationEnvelope.diagnosticMetadata.canAuthorizeAcceptance, false);
  assert.equal(observationEnvelope.diagnosticMetadata.canCreateGeometry, false);
  assert.equal(observationEnvelope.diagnosticMetadata.canModifyEvaluation, false);
  assert.equal(envelope.acceptanceBoundary.providerEvidenceSelfAccepted, false);
  assert.equal(envelope.acceptanceBoundary.outsideProviderBoundary, true);
  assert.equal(observationEnvelope.promptText.sourceTruth, false);

  for (const artifact of envelope.derivedArtifacts) {
    assert.equal(artifact.candidateEvidenceOnly, true);
    assert.equal(artifact.sourceTruth, false);
    assert.equal(artifact.coreInput, false);
    assert.equal(artifact.mayAuthorizeAcceptance, false);
    assert.equal(artifact.mayOverrideAcceptedGeometry, false);
  }
});

test("Path B validates accepted geometry directly and reaches the existing mapping path", () => {
  const acceptedGeometry = envelope.acceptedStructuredGeometry;
  const acceptedValidation = validateAcceptedGeometryV1(acceptedGeometry);
  const mapped = mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedGeometry));

  assert.equal(acceptedValidation.ok, true);
  assert.deepEqual(acceptedValidation.diagnostics, []);
  assert.equal(acceptedGeometry.acceptedGeometryId, "accepted:synthetic-external-evidence:parcel-proportion:v1");
  assert.equal(acceptedGeometry.sourceObservationContentIdentity, envelope.evidenceIdentity.observationContentIdentity);
  assert.equal(acceptedGeometry.acceptance.accepted, true);
  assert.equal(acceptedGeometry.acceptance.actorId, envelope.acceptanceBoundary.acceptanceActor.actorId);
  assert.equal(mapped.ok, true);
  assert.equal(mapped.status, "mapped");
  assert.deepEqual(mapped.diagnostics, []);
});

test("Path B Structured Analyze succeeds with deterministic canonical output", () => {
  const input = createStructuredAnalyzeInputFromEnvelope(envelope);
  const inputBefore = core.serializeCanonicalJson(input);
  const first = core.analyzeStructuredCompositionV1(structuredClone(input));
  const second = core.analyzeStructuredCompositionV1(structuredClone(input));
  const firstCanonical = core.serializeCanonicalJson(first);
  const secondCanonical = core.serializeCanonicalJson(second);

  assert.equal(core.serializeCanonicalJson(input), inputBefore);
  assert.equal(first.status, "valid");
  assert.equal(second.status, "valid");
  assert.equal(first.kind, "structured-composition-analysis-result");
  assert.equal(firstCanonical, secondCanonical);
  assert.equal(first.provenance.sourceKind, "user_supplied_structured_data");
  assert.equal(first.provenance.adapter, null);
  assert.equal(first.provenance.mappingVersion, ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION);
  assert.equal(first.provenance.normalizationVersion, ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION);
  assert.equal(first.replayReadiness.status, "ready");
  assert.equal(JSON.parse(firstCanonical).status, "valid");
});

test("PR110 confidence value score warnings and artifacts do not affect Core input or result", () => {
  const input = createStructuredAnalyzeInputFromEnvelope(envelope);
  const result = core.analyzeStructuredCompositionV1(structuredClone(input));
  const coreInputJson = core.serializeCanonicalJson(input);
  const resultJson = core.serializeCanonicalJson(result);

  for (const forbidden of [
    "candidate-geometry:west",
    "candidate-geometry:east",
    "candidate-label:west-portion",
    "candidate-measurement:west-width",
    "synthetic-high",
    "diagnostic-only",
    "providerCertainty",
    "valueMetadata",
    "lossyConversionWarnings",
    "evidenceLimitations",
    "artifact:synthetic-external-evidence:summary:v1",
    envelope.observationEnvelope.promptText.value,
  ]) {
    assert.doesNotMatch(coreInputJson, new RegExp(escapeRegExp(forbidden), "u"), forbidden);
    assert.doesNotMatch(resultJson, new RegExp(escapeRegExp(forbidden), "u"), forbidden);
  }

  assert.equal(envelope.warnings.diagnosticOnly, true);
  assert.equal(input.operationContext.metricPolicy.value, null);
  assert.ok(input.operationContext.sourceRefs.some((ref) => ref.ref === envelope.acceptedStructuredGeometry.acceptedGeometryId));
});

test("PR110 keeps package exports and changed-file guard scope unchanged outside the exact set", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assertCurrentRemoteMcpPackageBoundary(packageJson);

  assert.deepEqual(
    sharedExactApprovedChangedFiles(syntheticExternalEvidenceAcceptanceBoundaryChangedFiles),
    syntheticExternalEvidenceAcceptanceBoundaryChangedFiles,
  );
});

function createStructuredAnalyzeInputFromEnvelope(selectedEnvelope) {
  const acceptedGeometry = structuredClone(selectedEnvelope.acceptedStructuredGeometry);
  const acceptedValidation = validateAcceptedGeometryV1(acceptedGeometry);
  assert.equal(acceptedValidation.ok, true);
  assert.deepEqual(acceptedValidation.diagnostics, []);
  const mapped = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedGeometry)));
  const baseComposition = mapped.mappedGeometry;
  const comparisonComposition = shiftedComposition(baseComposition, 0.08);
  const base = core.createMvpDemoInput();
  const tolerancePolicy = { ...structuredClone(base.tolerancePolicy), id: "tolerance:synthetic-external-evidence:parcel-proportion:v1" };
  const normalization = requiredNormalization(normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: "request:synthetic-external-evidence:shared-unit-surface",
    mappedCompositionA: baseComposition,
    mappedCompositionB: comparisonComposition,
    normalizedCompositionAId: "composition:synthetic-external-evidence:mapped:A",
    normalizedCompositionBId: "composition:synthetic-external-evidence:mapped:B",
    sharedSurfaceId: "surface:synthetic-external-evidence:unit",
    tolerancePolicy,
    transformationStepId: "transformation:synthetic-external-evidence:shared-unit-surface",
  }));
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }));
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: "input:synthetic-external-evidence:parcel-proportion:v1" },
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
    featureFlags: { syntheticExternalEvidenceAcceptanceBoundaryProof: true },
    sourceRefs,
  }));
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: selectedEnvelope.acceptanceBoundary.acceptanceActor.actorId,
    acceptedAt: selectedEnvelope.acceptedStructuredGeometry.acceptance.acceptedAt,
    acceptedSourceIds: normalization.acceptedSourceIds,
    acceptanceRecordId: selectedEnvelope.acceptedStructuredGeometry.acceptance.acceptanceId,
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: "analysis:synthetic-external-evidence:parcel-proportion:v1",
    compositionA: normalization.compositionA,
    compositionB: normalization.compositionB,
    acceptance,
    ratioPack,
    packLock,
    ruleSetRef: base.ruleSetRef,
    evaluationProfile: base.evaluationProfile,
    evaluationTolerances: { ...structuredClone(base.evaluationTolerances), id: "evaluation-tolerances:synthetic-external-evidence" },
    comparisonTolerances: { ...structuredClone(base.comparisonTolerances), id: "comparison-tolerances:synthetic-external-evidence" },
    tolerancePolicy,
    operationContext,
    provenance: {
      kind: "structured-composition-analysis-provenance",
      sourceKind: "user_supplied_structured_data",
      externalSourceRef: { kind: "test-fixture", ref: selectedEnvelope.envelopeId },
      callerSourceIds: normalization.acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: "transformation:synthetic-external-evidence:map-accepted-geometry",
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

function validMappingRequest(acceptedGeometry) {
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:pr110:${acceptedGeometry.acceptedGeometryId}`,
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

function assertObservationEnvelopeHasNoCoreInput(observationEnvelope) {
  for (const forbiddenKey of [
    "compositionA",
    "compositionB",
    "ratioPack",
    "ruleSetRef",
    "evaluationProfile",
    "operationContext",
    "packLock",
  ]) {
    assert.equal(hasKey(observationEnvelope, forbiddenKey), false, forbiddenKey);
  }
}

function hasKey(value, keyName) {
  if (Array.isArray(value)) {
    return value.some((item) => hasKey(item, keyName));
  }

  if (value === null || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, child]) => key === keyName || hasKey(child, keyName));
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

function readDoc(filePath) {
  return readFileSync(filePath, "utf8");
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function sectionForHeading(doc, heading) {
  const start = doc.indexOf(heading);
  assert.notEqual(start, -1, `${heading} should exist`);
  const nextHeading = doc.slice(start + heading.length).match(/\n##\s+/);
  const end = nextHeading ? start + heading.length + nextHeading.index : doc.length;
  return doc.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
