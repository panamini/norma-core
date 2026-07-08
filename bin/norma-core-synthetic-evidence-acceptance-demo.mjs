import { realpathSync } from "node:fs";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
import { createSyntheticExternalEvidenceAcceptanceProofV1 } from "../dist/src/local-report/synthetic-external-evidence-acceptance-proof.js";
import { createMvpDemoInput } from "../dist/src/mvp-demo.js";
import { serializeCanonicalJson } from "../dist/src/serialization.js";
import {
  analyzeStructuredCompositionV1,
  STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
} from "../dist/src/structured-composition-analysis.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRelativePath = "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json";
const fixturePath = join(repoRoot, fixtureRelativePath);
const defaultOutputDirPrefix = join(tmpdir(), "norma-core-synthetic-evidence-acceptance-demo-");
const outputArtifactNames = Object.freeze(["proof.json", "result.json", "summary.json"]);

class CliUsageError extends Error {}

export {
  createStructuredAnalyzeInputFromAcceptedStructuredGeometry,
  runSyntheticEvidenceAcceptanceDemoCli,
};

async function createSyntheticEvidenceAcceptanceDemoResult(args, options = {}) {
  const { outputDir } = await parseDemoArgs(args, options);
  const resolvedOutputDir = resolve(outputDir);
  const envelope = await loadFixture(options);
  const proof = createSyntheticExternalEvidenceAcceptanceProofV1(envelope);
  const structuredAnalyzeInput = createStructuredAnalyzeInputFromAcceptedStructuredGeometry(
    envelope.acceptedStructuredGeometry,
    { envelopeId: proof.envelopeId },
  );
  const result = analyzeStructuredCompositionV1(structuredAnalyzeInput);
  const summary = createSummaryJson({ envelope, proof, result });

  await mkdir(resolvedOutputDir, { recursive: true });
  const artifactPaths = {
    resultJson: join(resolvedOutputDir, "result.json"),
    proofJson: join(resolvedOutputDir, "proof.json"),
    summaryJson: join(resolvedOutputDir, "summary.json"),
  };

  await writeFile(artifactPaths.resultJson, `${serializeCanonicalJson(result)}\n`, "utf8");
  await writeFile(artifactPaths.proofJson, `${serializeCanonicalJson(proof)}\n`, "utf8");
  await writeFile(artifactPaths.summaryJson, `${serializeCanonicalJson(summary)}\n`, "utf8");
  await Promise.all(Object.values(artifactPaths).map((artifactPath) => access(artifactPath)));

  return {
    status: "ok",
    outputDir: resolvedOutputDir,
    ...artifactPaths,
    artifacts: [...outputArtifactNames],
    canonicalComputationalOutput: "result.json",
    derivedArtifacts: ["proof.json", "summary.json"],
    externalEvidenceAuthority: "candidateEvidenceOnly",
    observationEnvelopeTrust: "untrusted",
    coreInputAuthority: "acceptedStructuredGeometry",
    acceptedGeometryIsOnlyCoreInput: true,
    confidenceAuthority: false,
    providerSelfAcceptance: false,
    localOnly: true,
    fixtureOnly: true,
    publicApi: false,
  };
}

async function runSyntheticEvidenceAcceptanceDemoCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  options = {},
} = {}) {
  try {
    const result = await createSyntheticEvidenceAcceptanceDemoResult(args, options);
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify(createErrorEnvelope(error))}\n`);
    return error instanceof CliUsageError ? 1 : 3;
  }
}

async function parseDemoArgs(args, options = {}) {
  if (args.length === 0) {
    const makeTempOutputDir = options.mkdtemp ?? mkdtemp;
    return { outputDir: await makeTempOutputDir(defaultOutputDirPrefix) };
  }

  const outputDir = parseOutputDirArg(args);
  if (outputDir !== null) {
    return { outputDir };
  }

  throw new CliUsageError("Usage: node bin/norma-core-synthetic-evidence-acceptance-demo.mjs [--output <dir>]");
}

function parseOutputDirArg(args) {
  const isValid = [
    args.length === 2,
    args[0] === "--output",
    typeof args[1] === "string",
    args[1] !== "",
  ].every(Boolean);

  return isValid ? args[1] : null;
}

async function loadFixture(options = {}) {
  if (options.fixture) {
    return structuredClone(options.fixture);
  }

  return JSON.parse(await readFile(options.fixturePath ?? fixturePath, "utf8"));
}

function createStructuredAnalyzeInputFromAcceptedStructuredGeometry(acceptedGeometry, options = {}) {
  const accepted = withComputedAcceptedGeometryIdentities(acceptedGeometry);
  const mapped = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(accepted)));
  const baseComposition = mapped.mappedGeometry;
  const comparisonComposition = shiftedComposition(baseComposition);
  const base = createMvpDemoInput();
  const tolerancePolicy = {
    ...structuredClone(base.tolerancePolicy),
    id: "tolerance:pr112",
  };
  const normalization = requiredNormalization(normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: "request:pr112:synthetic-evidence-acceptance",
    mappedCompositionA: baseComposition,
    mappedCompositionB: comparisonComposition,
    normalizedCompositionAId: "composition:pr112:mapped:A",
    normalizedCompositionBId: "composition:pr112:mapped:B",
    sharedSurfaceId: "surface:pr112:synthetic-unit",
    tolerancePolicy,
    transformationStepId: "transformation:pr112:shared-unit-surface",
  }));
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = structuredClone(base.packLock);
  const evaluationTolerances = {
    ...structuredClone(base.evaluationTolerances),
    id: "evaluation-tolerances:pr112",
  };
  const comparisonTolerances = {
    ...structuredClone(base.comparisonTolerances),
    id: "comparison-tolerances:pr112",
  };
  const acceptedSourceIds = normalization.acceptedSourceIds;
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: "input:pr112:synthetic-evidence-acceptance-demo" },
    { kind: "accepted-geometry", ref: accepted.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: accepted.contentIdentity },
    { kind: "accepted-source-observation", ref: accepted.sourceObservationId },
    { kind: "accepted-source-observation-content-identity", ref: accepted.sourceObservationContentIdentity },
    { kind: "acceptance-proof-envelope", ref: options.envelopeId ?? "external-evidence-envelope:synthetic" },
    { kind: "mapping-result", ref: mapped.resultContentIdentity },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: base.ruleSetRef },
    { kind: "evaluation-profile", ref: base.evaluationProfile.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: normalization.sharedSurface.coordinateSystem.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
  ];
  const operationContext = createStructuredAnalyzeOperationContext(base.operationContext, {
    sourceRefs,
    coordinatePolicy: normalization.sharedSurface.coordinateSystem,
    tolerancePolicy,
  });
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "deterministic-test",
    acceptedAt: "2026-07-08T00:00:00Z",
    acceptedSourceIds,
    acceptanceRecordId: "acceptance:pr112:structured-analyze",
  };

  return {
    contractVersion: STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: "analysis:pr112:synthetic-evidence-acceptance-demo",
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
      externalSourceRef: { kind: "test-fixture", ref: options.envelopeId ?? "synthetic-external-evidence-envelope-v1" },
      callerSourceIds: acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: "transformation:pr112:map-accepted-geometry",
          description: "Map PR111-accepted structured geometry into Core Composition2D inputs.",
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

function createSummaryJson({ envelope, proof, result }) {
  return {
    demoId: "pr112-local-synthetic-evidence-acceptance-demo",
    localDeveloperProofCommand: true,
    publicCli: false,
    publicApi: false,
    canonicalComputationalOutput: "result.json",
    proofArtifact: "proof.json",
    summaryArtifact: "summary.json",
    resultJsonCanonical: true,
    proofJsonDerivedNonAuthoritative: true,
    summaryJsonDerivedNonAuthoritative: true,
    externalEvidenceAuthority: "candidateEvidenceOnly",
    observationEnvelopeTrust: "untrusted",
    observationEnvelopeCoreInput: false,
    confidenceScoreValueMetadataCanAuthorizeAcceptance: false,
    providerEvidenceCanSelfAccept: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    coreInputAuthority: proof.coreInputAuthority,
    envelopeId: proof.envelopeId,
    observationIdentity: proof.observationIdentity,
    observationContentIdentity: proof.observationContentIdentity,
    acceptedGeometryId: proof.acceptedGeometryId,
    acceptedGeometryContentIdentity: proof.acceptedGeometryContentIdentity,
    candidateObservationArtifactIds: envelope.derivedArtifacts.map((artifact) => artifact.artifactId),
    candidateWarningCount: envelope.warnings.lossyConversionWarnings.length + envelope.warnings.evidenceLimitations.length,
    resultStatus: result.status,
    comparisonStatus: result.comparison.status,
    decisionStatus: result.decision.status,
    nonGoals: [
      "not OpenAI integration",
      "not image recognition",
      "not provider support",
      "not CAD import",
      "not Figma import",
      "not hosted MCP",
      "not ChatGPT connector runtime",
      "not package publishing",
      "not public API",
    ],
  };
}

function createStructuredAnalyzeOperationContext(baseOperationContext, { sourceRefs, coordinatePolicy, tolerancePolicy }) {
  const operationContext = structuredClone(baseOperationContext);
  operationContext.id = "operation-context:pr112:synthetic-evidence-acceptance-demo";
  operationContext.ref = { id: operationContext.id };
  operationContext.operationName = STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME;
  operationContext.operationVersion = STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION;
  operationContext.coordinatePolicy = {
    ...structuredClone(operationContext.coordinatePolicy),
    value: structuredClone(coordinatePolicy),
    sourceRefs: [{ kind: "coordinate-system", ref: coordinatePolicy.id }],
  };
  operationContext.metricPolicy = {
    ...structuredClone(operationContext.metricPolicy),
    value: null,
    sourceRefs: [],
  };
  operationContext.tolerancePolicy = {
    ...structuredClone(operationContext.tolerancePolicy),
    value: structuredClone(tolerancePolicy),
    sourceRefs: [{ kind: "tolerance-policy", ref: tolerancePolicy.id }],
  };
  operationContext.featureFlags = { syntheticEvidenceAcceptanceDemo: true };
  operationContext.sourceRefs = [...sourceRefs];

  return operationContext;
}

function validMappingRequest(acceptedGeometry) {
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:pr112:${acceptedGeometry.acceptedGeometryId}`,
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

function shiftedComposition(composition) {
  return {
    ...structuredClone(composition),
    id: "composition:pr112:comparison-source",
    surface: {
      ...structuredClone(composition.surface),
      id: "surface:pr112:comparison-source",
    },
    elements: composition.elements.map((element, index) => ({
      ...structuredClone(element),
      id: `element:pr112:comparison:${index}`,
      geometry: {
        ...element.geometry,
        width: element.geometry.width === 0.4 ? 0.45 : element.geometry.width,
      },
    })),
  };
}

function requiredMappedGeometry(result) {
  const isMapped = [
    result.ok === true,
    result.status === "mapped",
    Boolean(result.mappedGeometry),
    result.diagnostics.length === 0,
  ].every(Boolean);

  if (!isMapped) {
    throw new Error("Accepted geometry mapping failed.");
  }

  return result;
}

function requiredNormalization(result) {
  const isNormalized = [
    result.ok === true,
    result.status === "normalized",
    Boolean(result.sharedSurface),
    Boolean(result.compositionA),
    Boolean(result.compositionB),
    Boolean(result.transformationStep),
    result.diagnostics.length === 0,
  ].every(Boolean);

  if (!isNormalized) {
    throw new Error("Accepted geometry normalization failed.");
  }

  return result;
}

function withComputedAcceptedGeometryIdentities(acceptedGeometry) {
  const accepted = structuredClone(acceptedGeometry);
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  return accepted;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function createErrorEnvelope(error) {
  return {
    status: "error",
    error: {
      code: error instanceof CliUsageError ? "InvalidCliUsage" : "SyntheticEvidenceAcceptanceDemoFailed",
      message: error instanceof Error ? error.message : "Unexpected synthetic evidence acceptance demo failure.",
    },
  };
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  process.exitCode = await runSyntheticEvidenceAcceptanceDemoCli();
}
