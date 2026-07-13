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
  localVisualPilotBoundaryChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const businessRoadmapDocPath = path.join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const decisionDocPath = path.join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-07-local-visual-pilot-boundary.md",
);
const corpusPath = path.join(__dirname, "fixtures", "visual-adapter", "static-scenario-corpus-v1.json");
const packageJsonPath = path.join(repoRoot, "package.json");
const scenario = readCorpusScenario("scenario:map-parcel-proportion:v1");

test("PR108 decision doc has required headings and non-goals", () => {
  assert.equal(existsSync(decisionDocPath), true);
  const decisionDoc = readDoc(decisionDocPath);

  assertHeadingsInOrder(decisionDoc, [
    "# Local Visual Pilot Boundary",
    "## Status",
    "## Decision",
    "## Boundary Pipeline",
    "## Untrusted External Evidence Boundary",
    "## Observation Envelope",
    "## Explicit Acceptance Boundary",
    "## Accepted Structured Geometry",
    "## Core And Canonical Result",
    "## Derived Artifacts",
    "## Provider And Connector Outputs",
    "## Non-Goals",
    "## PR109 Decision Point",
    "## Validation Gates",
    "## Rollback",
  ]);

  assertDocMentions(decisionDoc, [
    "Observation Envelope MUST NOT contain executable geometry truth",
    "PR108 does not define provider payload contracts",
    "It does not define OpenAI Vision JSON, CAD import JSON, Figma payloads, ChatGPT connector schemas",
    "PR108 does not add a new metric-policy model",
    "A. OpenAI/vision-style provider pilot contract",
    "B. CAD/Figma geometry pilot contract",
    "C. ChatGPT/MCP product path contract",
  ]);

  for (const nonGoal of [
    "new fixtures",
    "OpenAI calls",
    "image APIs",
    "vision models",
    "CAD import",
    "Figma import",
    "MCP changes",
    "ChatGPT connector runtime",
    "package exports",
    "package publication",
    "dependencies or lockfile changes",
    "runtime adapters",
    "provider SDKs",
    "upload servers",
    "auth, OAuth, or secrets",
    "Core schema widening",
    "Core runtime widening",
    "prompt-derived source truth",
    "artifact-derived source truth",
    "provider-derived source truth",
    "observation-derived source truth",
  ]) {
    assertDocMentions(decisionDoc, [nonGoal]);
  }
});

test("PR108 roadmap records PR106 PR107 and PR108 accurately", () => {
  const roadmapSection = sectionForHeading(
    readDoc(businessRoadmapDocPath),
    "## Visual Fixture Roadmap Truth Sync After PR104",
  );

  assertDocMentions(roadmapSection, [
    "Current boundary reference:",
    "docs/decisions/2026-07-07-local-visual-pilot-boundary.md",
    "PR106 completed the local consumer proof for the PR104 visual fixture demo envelope/result",
    "PR107 completed the static synthetic scenario corpus",
    "PR108 is the current local visual pilot boundary",
    "Observation Envelope",
    "Accepted Structured Geometry",
    "Norma Core / Structured Analyze",
    "result.json",
    "PR106: local consumer proof for PR104 visual fixture demo envelope/result",
    "PR107: static synthetic scenario corpus, 2-3 fixtures, still no recognition",
    "PR108: decision PR for first real external track",
    "PR109",
    "must choose exactly one first real external pilot track",
  ]);

  assert.doesNotMatch(roadmapSection, /\bPR108\s+implements\b/i);
  assert.doesNotMatch(roadmapSection, /\bprovider payload contract implementation\b/i);
});

test("PR108 Observation Envelope is untrusted non-authoritative and not executable geometry truth", () => {
  const envelope = observationEnvelopeForScenario(scenario);

  assert.equal(envelope.trust.untrusted, true);
  assert.equal(envelope.trust.nonAuthoritative, true);
  assert.equal(envelope.trust.executableGeometryTruth, false);
  assert.equal(envelope.trust.sourceTruth, false);
  assert.equal(envelope.trust.coreInput, false);
  assert.equal(envelope.trust.acceptedStructuredGeometry, false);
  assert.equal("acceptedStructuredGeometry" in envelope, false);
  assert.equal("compositionA" in envelope, false);
  assert.equal("compositionB" in envelope, false);
  assert.equal("ratioPack" in envelope, false);
  assert.equal("operationContext" in envelope, false);
});

test("PR108 observation-only input cannot enter Core", () => {
  const envelope = observationEnvelopeForScenario(scenario);
  const acceptedValidation = validateAcceptedGeometryV1(envelope);
  const analysis = core.analyzeStructuredCompositionV1(envelope);

  assert.equal(acceptedValidation.ok, false);
  assert.equal(analysis.status, "invalid");
  assert.equal(analysis.kind, "structured-composition-analysis-result");
  assert.equal(analysis.errors.some((error) => error.code === "InvalidInputShape"), true);
});

test("PR108 reused PR107 observations are evidence only and never source truth", () => {
  const observations = scenario.candidateVisualObservations;

  assert.equal(observations.kind, "candidate-visual-observations");
  assert.equal(observations.candidateEvidenceOnly, true);
  assert.equal(observations.sourceTruth, false);
  assert.equal(observations.coreInput, false);
  assert.equal(observations.packageApiTruth, false);
  assert.equal(observations.connectorTruth, false);
  assert.equal("acceptance" in observations, false);
  assert.equal(scenario.truthBoundary.candidateEvidenceOnly, true);
  assert.equal(scenario.truthBoundary.visualEvidenceIsNotNormaTruth, true);
  assert.equal(scenario.truthBoundary.acceptedStructuredGeometryOnlyCoreHandoff, true);
});

test("PR108 accepted structured geometry validates directly with existing accepted-geometry validator", () => {
  const validation = validateAcceptedGeometryV1(scenario.acceptedStructuredGeometry);

  assert.equal(validation.ok, true);
  assert.deepEqual(validation.diagnostics, []);
  assert.equal(scenario.acceptedStructuredGeometry.contractId, "norma.accepted-geometry@1");
  assert.equal(scenario.acceptedStructuredGeometry.contractVersion, 1);
  assert.equal(scenario.acceptedStructuredGeometry.acceptance.accepted, true);
});

test("PR108 accepted structured geometry enters existing Core Structured Analyze deterministically", () => {
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
  assert.equal(first.operationName, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME);
  assert.equal(first.operationVersion, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION);
  assert.equal(first.replayReadiness.status, "ready");
  assert.equal(input.operationContext.metricPolicy.value, null);
  assert.doesNotMatch(core.serializeCanonicalJson(input), /candidate:|candidate-visual-observations|lossyConversionWarnings/u);
  assert.ok(input.operationContext.sourceRefs.some((ref) => ref.ref === scenario.acceptedStructuredGeometry.acceptedGeometryId));
});

test("PR108 keeps existing Structured Analyze and accepted-geometry invariants unchanged", () => {
  const input = createStructuredAnalyzeInputFromScenario(scenario);
  const result = core.analyzeStructuredCompositionV1(structuredClone(input));

  assert.equal(core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION, "structured-composition-analysis-input.v1");
  assert.equal(core.STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION, "structured-composition-analysis-result.v1");
  assert.equal(core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME, "core.structured-composition-analysis.analyze");
  assert.equal(scenario.metricPolicyInvariant.mayInferPhysicalMeasurementsFromPixels, false);
  assert.equal(scenario.metricPolicyInvariant.mayDropSurfaceOnlyMetricPolicy, false);
  assert.equal(scenario.metricPolicyInvariant.derivedArtifactsMayOverrideMetricPolicy, false);
  assert.equal(scenario.metricPolicyInvariant.metricPolicyMayGenerateGeometry, false);
  assert.equal(input.operationContext.metricPolicy.explicit, true);
  assert.equal(input.operationContext.metricPolicy.value, null);
  assert.equal(result.status, "valid");
  assert.equal(result.provenance.mappingVersion, ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION);
  assert.equal(result.provenance.normalizationVersion, ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION);
});

test("PR108 provider metadata is provenance only", () => {
  const { providerIdentity, adapterIdentity } = scenario.providerAdapterProvenance;

  assert.equal(providerIdentity.provenanceOnly, true);
  assert.equal(providerIdentity.runtimeCallsAllowed, false);
  assert.equal(adapterIdentity.provenanceOnly, true);
  assert.equal(adapterIdentity.runtimeCallsAllowed, false);
  assert.equal(scenario.truthBoundary.providerAdapterIdentityProvenanceOnly, true);
});

test("PR108 artifacts are derived evidence only", () => {
  for (const artifact of scenario.derivedEvidence) {
    assert.equal(artifact.candidateEvidenceOnly, true);
    assert.equal(artifact.sourceTruth, false);
    assert.equal(artifact.coreInput, false);
    assert.equal(artifact.mayOverrideAcceptedGeometry, false);
    assert.equal(artifact.metricPolicyAuthority, false);
  }

  assert.equal(scenario.truthBoundary.derivedArtifactsAreNotSourceTruth, true);
  assert.equal(scenario.truthBoundary.evidenceMetadataCannotOverrideAcceptedGeometry, true);
});

test("PR108 keeps package root exports unchanged", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assertCurrentRemoteMcpPackageBoundary(packageJson);
});

test("PR108 changed-file guard accepts only the PR108 file set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualPilotBoundaryChangedFiles),
    localVisualPilotBoundaryChangedFiles,
  );

  assert.deepEqual(localVisualPilotBoundaryChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-07-local-visual-pilot-boundary.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-visual-pilot-boundary.test.mjs",
  ]);

  for (const missingFile of [
    "docs/decisions/2026-07-07-local-visual-pilot-boundary.md",
    "tests/local-visual-pilot-boundary.test.mjs",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles(
        localVisualPilotBoundaryChangedFiles.filter((file) => file !== missingFile),
      ),
      null,
      missingFile,
    );
  }
});

test("PR108 guard rejects runtime provider package wiki hosted ChatGPT CAD Figma extras", () => {
  for (const forbiddenFile of [
    "tests/fixtures/visual-adapter/new-real-provider-fixture.json",
    "tests/fixtures/visual-adapter/static-scenario-corpus-v1.json",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "src/publication/npm.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "viewer/read-only-result-viewer.html",
    "bin/norma-core-mcp-http.mjs",
    "docs/examples/openai-vision-pilot.md",
    "docs/decisions/2026-07-08-openai-vision-pilot-contract.md",
    "docs/**",
    "tests/**",
    "src/**",
    "bin/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...localVisualPilotBoundaryChangedFiles, forbiddenFile]),
      null,
      forbiddenFile,
    );
  }
});

function observationEnvelopeForScenario(selectedScenario) {
  return {
    kind: "norma.observation-envelope",
    contractVersion: 1,
    envelopeId: `observation-envelope:${selectedScenario.scenarioId}`,
    trust: {
      untrusted: true,
      nonAuthoritative: true,
      executableGeometryTruth: false,
      sourceTruth: false,
      coreInput: false,
      acceptedStructuredGeometry: false,
    },
    evidence: {
      candidateVisualObservations: selectedScenario.candidateVisualObservations,
      providerAdapterProvenance: selectedScenario.providerAdapterProvenance,
      derivedEvidence: selectedScenario.derivedEvidence,
    },
    provenanceOnly: true,
  };
}

function createStructuredAnalyzeInputFromScenario(selectedScenario) {
  const acceptedGeometry = structuredClone(selectedScenario.acceptedStructuredGeometry);
  const acceptedValidation = validateAcceptedGeometryV1(acceptedGeometry);
  assert.equal(acceptedValidation.ok, true);
  assert.deepEqual(acceptedValidation.diagnostics, []);
  const mapped = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(acceptedGeometry)));
  const baseComposition = mapped.mappedGeometry;
  const comparisonComposition = shiftedComposition(baseComposition, selectedScenario.comparisonDelta);
  const base = core.createMvpDemoInput();
  const tolerancePolicy = { ...structuredClone(base.tolerancePolicy), id: `tolerance:${selectedScenario.scenarioId}` };
  const normalization = requiredNormalization(normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: `request:${selectedScenario.scenarioId}:synthetic-shared-unit-surface`,
    mappedCompositionA: baseComposition,
    mappedCompositionB: comparisonComposition,
    normalizedCompositionAId: `composition:${selectedScenario.scenarioId}:mapped:A`,
    normalizedCompositionBId: `composition:${selectedScenario.scenarioId}:mapped:B`,
    sharedSurfaceId: `surface:${selectedScenario.scenarioId}:synthetic-unit`,
    tolerancePolicy,
    transformationStepId: `transformation:${selectedScenario.scenarioId}:shared-unit-surface`,
  }));
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }));
  const evaluationTolerances = { ...structuredClone(base.evaluationTolerances), id: `evaluation-tolerances:${selectedScenario.scenarioId}` };
  const comparisonTolerances = { ...structuredClone(base.comparisonTolerances), id: `comparison-tolerances:${selectedScenario.scenarioId}` };
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: `input:${selectedScenario.scenarioId}` },
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
    featureFlags: { localVisualPilotBoundaryProof: true },
    sourceRefs,
  }));
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "deterministic-test",
    acceptedAt: "2026-07-07T00:00:00Z",
    acceptedSourceIds: normalization.acceptedSourceIds,
    acceptanceRecordId: `acceptance:${selectedScenario.scenarioId}:structured-analyze`,
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: `analysis:${selectedScenario.scenarioId}:pr108-local-visual-pilot-boundary`,
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
      externalSourceRef: { kind: "test-fixture", ref: "visual-adapter-static-scenario-corpus-v1" },
      callerSourceIds: normalization.acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: `transformation:${selectedScenario.scenarioId}:map-accepted-geometry`,
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
    requestId: `request:pr108:${acceptedGeometry.acceptedGeometryId}`,
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

function readCorpusScenario(scenarioId) {
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
  const selectedScenario = corpus.scenarios.find((candidate) => candidate.scenarioId === scenarioId);
  assert.ok(selectedScenario, `${scenarioId} should exist in PR107 corpus`);
  return selectedScenario;
}

function readDoc(filePath) {
  return readFileSync(filePath, "utf8");
}

function assertHeadingsInOrder(doc, headings) {
  let previousIndex = -1;

  for (const heading of headings) {
    const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = headingPattern.exec(doc);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
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
