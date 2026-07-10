import { createHash } from "node:crypto";
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
} from "../accepted-geometry-to-core-mapping.js";
import {
  ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
  normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1,
} from "../accepted-geometry-to-structured-analyze-normalization.js";
import {
  BASIC_GRID_ALIGNMENT_PROFILE,
  type ComponentScoreStatus,
  type EvaluationProfile,
} from "../evaluation.js";
import type { AcceptedGeometry } from "../geometry-observation.js";
import { createMvpDemoInput } from "../mvp-demo.js";
import { createOperationContext, createPackLock } from "../runtime.js";
import { serializeCanonicalJson, STABLE_SERIALIZATION_POLICY } from "../serialization.js";
import {
  analyzeStructuredCompositionV1,
  STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
} from "../structured-composition-analysis.js";
import {
  createControlledProviderObservationAcceptanceProofV1,
  type ControlledProviderObservationAcceptanceBoundaryV1,
  type ControlledProviderObservationAcceptanceProofV1,
  type ControlledProviderObservationCandidateAcceptanceProofV1,
} from "./controlled-provider-observation-acceptance-proof.js";
import type {
  ControlledProviderObservationContractV1,
  ControlledProviderObservationContractV2,
} from "./controlled-provider-observation-contract.js";
import type {
  LocalVisualCandidateObservationEnvelopeV1,
  LocalVisualHumanCandidateSelectionV1,
} from "./controlled-local-live-visual-candidate-observation-contracts.js";

export interface ControlledProviderObservationToCoreHandoffV1 {
  readonly kind: "norma.controlled-provider-observation-to-core-handoff.v1";
  readonly version: 1;
  readonly status: "completed";
  readonly ok: true;
  readonly providerObservationAuthority: "candidateEvidenceOnly";
  readonly boundarySourceTruth: "acceptedStructuredGeometry";
  readonly externalEvidenceCoreInputAuthority: "acceptedStructuredGeometry";
  readonly acceptedStructuredGeometryIsOnlyExternalEvidenceDerivedCoreInput: true;
  readonly deterministicLocalComparisonDefaultUsed: true;
  readonly deterministicLocalComparisonDefaultRef: "norma.local-comparison-default.mvp-demo-composition-b@1";
  readonly deterministicLocalComparisonDerived: true;
  readonly deterministicLocalComparisonAuthoritative: false;
  readonly deterministicLocalComparisonProviderInfluenced: false;
  readonly deterministicLocalComparisonProvenanceRecorded: true;
  readonly deterministicLocalComparisonTransformationStepId: string;
  readonly structuredAnalyzeCallerSourceIdsSemantics: "effective-analysis-inputs-including-derived-local-comparison";
  readonly acceptedStructuredGeometryValidated: true;
  readonly acceptanceBoundaryExplicit: true;
  readonly providerSelfAcceptance: false;
  readonly providerGeometryCreated: false;
  readonly acceptanceProofCompletedBeforeMapping: true;
  readonly mappingBoundary: "explicit-external-evidence-acceptance@1";
  readonly mappingBoundaryApproved: true;
  readonly mappingAttempted: true;
  readonly mappingCompleted: true;
  readonly normalizationCompleted: true;
  readonly coreInputProduced: true;
  readonly structuredAnalyzeInputProduced: true;
  readonly structuredAnalyzeRun: true;
  readonly resultJsonProduced: true;
  readonly providerObservationId: string;
  readonly providerObservationContentIdentity: string;
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly acceptedGeometryRevisionContentIdentity: string;
  readonly mappingRequestId: string;
  readonly mappingResultContentIdentity: string;
  readonly normalizationRequestId: string;
  readonly normalizationResultContentIdentity: string;
  readonly structuredAnalyzeAnalysisId: string;
  readonly structuredAnalyzeAcceptanceRecordId: string;
  readonly structuredAnalyzeProvenanceExternalSourceRef: string;
  readonly structuredAnalyzeMeaningfulIdentity: string;
  readonly structuredAnalyzeComputationalContentIdentity: string;
  readonly deterministicLocalComparisonContentIdentity: string;
  readonly normalizedCoordinateTolerancePolicyRef: "tolerance:pr128:normalized-coordinate";
  readonly normalizedCoordinateTolerance: number;
  readonly normalizedMetricToleranceOmitted: true;
  readonly evaluationProfileSelection: "full-basic-grid-alignment" | "single-element-without-overlap-penalty";
  readonly evaluationProfileId: "basic-grid-alignment";
  readonly evaluationProfileRef: string;
  readonly evaluationProfileVersion: "0.1.0-pr8";
  readonly evaluationProfileDerived: boolean;
  readonly evaluationProfileOverlapPenaltyIncluded: boolean;
  readonly evaluationProfileProviderInfluenced: false;
  readonly evaluationProfileAdaptationRef: "none" | "norma.local-evaluation-profile-adaptation.single-element-without-overlap@1";
  readonly evaluationProfileContentIdentity: string;
  readonly acceptedGeometryAlignmentComponentStatus: ComponentScoreStatus;
  readonly acceptedGeometryAlignmentComponentValue: number;
  readonly canonicalResultJsonContentIdentity: string;
  readonly canonicalTruth: "result.json";
  readonly derivedArtifactsAuthoritative: false;
  readonly derivedArtifactsProduced: false;
}

export interface ControlledProviderObservationCandidateToCoreHandoffV1
  extends ControlledProviderObservationToCoreHandoffV1 {
  readonly providerExecutionReceiptContentIdentity: string;
  readonly candidateObservationId: string;
  readonly candidateObservationContentIdentity: string;
  readonly humanSelectionId: string;
  readonly humanSelectionContentIdentity: string;
}

export interface ControlledProviderObservationCandidateToCoreExecutionV1 {
  readonly handoff: ControlledProviderObservationCandidateToCoreHandoffV1;
  readonly structuredAnalyzeInput: Parameters<typeof analyzeStructuredCompositionV1>[0];
  readonly resultJson: ReturnType<typeof analyzeStructuredCompositionV1>;
  readonly canonicalResultJsonBytes: string;
}

const INPUT_FIELDS = Object.freeze([
  "providerObservationContract",
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
] as const);

const CANDIDATE_INPUT_FIELDS = Object.freeze([
  "providerObservationContract",
  "candidateObservationEnvelope",
  "humanCandidateSelection",
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
] as const);

const LOCAL_COMPARISON_DEFAULT_REF = "norma.local-comparison-default.mvp-demo-composition-b@1" as const;
const LOCAL_COMPARISON_TRANSFORMATION_STEP_ID = "transformation:pr128:derive-local-comparison-default" as const;
const NORMALIZED_TOLERANCE_POLICY_REF = "tolerance:pr128:normalized-coordinate" as const;
const SINGLE_ELEMENT_PROFILE_ADAPTATION_REF =
  "norma.local-evaluation-profile-adaptation.single-element-without-overlap@1" as const;

type NodeUtilModule = {
  readonly types?: {
    readonly isProxy?: (value: unknown) => boolean;
  };
};

const nodeProcess = globalThis as typeof globalThis & {
  readonly process?: {
    readonly getBuiltinModule?: (id: string) => unknown;
  };
};
const nodeUtilTypes = (
  nodeProcess.process?.getBuiltinModule?.("node:util") as NodeUtilModule | undefined
)?.types;

class ControlledProviderObservationToCoreHandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledProviderObservationToCoreHandoffError";
  }
}

export function createControlledProviderObservationToCoreHandoffV1(
  input: unknown,
): ControlledProviderObservationToCoreHandoffV1 | ControlledProviderObservationCandidateToCoreHandoffV1 {
  return createHandoffExecution(input).handoff;
}

export function createControlledProviderObservationCandidateToCoreExecutionV1(
  input: unknown,
): ControlledProviderObservationCandidateToCoreExecutionV1 {
  const execution = createHandoffExecution(input);
  if (!isCandidateProof(execution.proof) || !("providerExecutionReceiptContentIdentity" in execution.handoff)) {
    throw invalid("input", "requires strict candidate-capable handoff input");
  }
  return {
    handoff: execution.handoff as ControlledProviderObservationCandidateToCoreHandoffV1,
    structuredAnalyzeInput: execution.structuredAnalyzeInput,
    resultJson: execution.analysis,
    canonicalResultJsonBytes: `${serializeCanonicalJson(execution.analysis, STABLE_SERIALIZATION_POLICY)}\n`,
  };
}

function createHandoffExecution(input: unknown): {
  readonly proof: ControlledProviderObservationAcceptanceProofV1 | ControlledProviderObservationCandidateAcceptanceProofV1;
  readonly handoff: ControlledProviderObservationToCoreHandoffV1 | ControlledProviderObservationCandidateToCoreHandoffV1;
  readonly structuredAnalyzeInput: Parameters<typeof analyzeStructuredCompositionV1>[0];
  readonly analysis: ReturnType<typeof analyzeStructuredCompositionV1>;
} {
  const record = requirePlainRecord(input, "input");
  const candidatePath = "candidateObservationEnvelope" in record || "humanCandidateSelection" in record;
  const expectedInputFields = candidatePath ? CANDIDATE_INPUT_FIELDS : INPUT_FIELDS;
  rejectUnknownFields(record, expectedInputFields, "input");
  const seen = new WeakSet<object>();
  for (const field of expectedInputFields) {
    const path = `input.${field}`;
    const fieldRecord = requirePlainOwnDataRecord(record, field, path);
    requirePlainData(fieldRecord, path, seen, 0);
  }
  const inputSnapshot = snapshotInput(record);

  const providerObservationContract = requirePlainOwnRecord(
    inputSnapshot,
    "providerObservationContract",
    "input.providerObservationContract",
  ) as unknown as ControlledProviderObservationContractV1 | ControlledProviderObservationContractV2;
  const acceptanceBoundary = requirePlainOwnRecord(
    inputSnapshot,
    "acceptanceBoundary",
    "input.acceptanceBoundary",
  ) as unknown as ControlledProviderObservationAcceptanceBoundaryV1;
  const acceptedStructuredGeometry = requirePlainOwnRecord(
    inputSnapshot,
    "acceptedStructuredGeometry",
    "input.acceptedStructuredGeometry",
  ) as unknown as AcceptedGeometry;

  const candidateObservationEnvelope = candidatePath
    ? requirePlainOwnRecord(
        inputSnapshot,
        "candidateObservationEnvelope",
        "input.candidateObservationEnvelope",
      ) as unknown as LocalVisualCandidateObservationEnvelopeV1
    : undefined;
  const humanCandidateSelection = candidatePath
    ? requirePlainOwnRecord(
        inputSnapshot,
        "humanCandidateSelection",
        "input.humanCandidateSelection",
      ) as unknown as LocalVisualHumanCandidateSelectionV1
    : undefined;
  const acceptanceProof = createControlledProviderObservationAcceptanceProofV1(candidatePath
    ? {
        providerObservationContract,
        candidateObservationEnvelope,
        humanCandidateSelection,
        acceptanceBoundary,
        acceptedStructuredGeometry,
      }
    : {
        providerObservationContract,
        acceptanceBoundary,
        acceptedStructuredGeometry,
      });

  return createCompletedHandoffExecution(acceptanceProof, acceptanceBoundary, acceptedStructuredGeometry);
}

function createCompletedHandoffExecution(
  proof: ControlledProviderObservationAcceptanceProofV1 | ControlledProviderObservationCandidateAcceptanceProofV1,
  acceptanceBoundary: ControlledProviderObservationAcceptanceBoundaryV1,
  acceptedGeometry: AcceptedGeometry,
): {
  readonly proof: ControlledProviderObservationAcceptanceProofV1 | ControlledProviderObservationCandidateAcceptanceProofV1;
  readonly handoff: ControlledProviderObservationToCoreHandoffV1 | ControlledProviderObservationCandidateToCoreHandoffV1;
  readonly structuredAnalyzeInput: Parameters<typeof analyzeStructuredCompositionV1>[0];
  readonly analysis: ReturnType<typeof analyzeStructuredCompositionV1>;
} {
  const acceptedGeometryToken = identityToken(proof.acceptedGeometryContentIdentity);
  const mappingRequestId = `request:pr128:map:${acceptedGeometryToken}`;
  const mapped = mapAcceptedGeometryToCoreV1({
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: mappingRequestId,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry,
    acceptedGeometryContentIdentity: proof.acceptedGeometryContentIdentity,
    sourceObservationId: proof.providerObservationId,
    sourceObservationContentIdentity: proof.providerObservationContentIdentity,
    mappingContext: {
      boundary: "explicit-external-evidence-acceptance@1",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
  });
  if (!mapped.ok || mapped.status !== "mapped" || mapped.mappedGeometry === null) {
    throw invalid("mapping", "failed closed");
  }

  const base = createMvpDemoInput();
  const mappingResultToken = identityToken(mapped.resultContentIdentity);
  const comparisonTransformationStepId = `${LOCAL_COMPARISON_TRANSFORMATION_STEP_ID}:${mappingResultToken}`;
  const comparison = defaultComparison(mapped.mappedGeometry, base.compositionB, mappingResultToken);
  const deterministicLocalComparisonContentIdentity = contentIdentityFor({
    defaultRef: LOCAL_COMPARISON_DEFAULT_REF,
    coordinateSystem: comparison.coordinateSystem,
    bounds: comparison.surface.bounds,
    elements: comparison.elements.map((element) => ({ geometry: element.geometry })),
  });
  const tolerancePolicy = {
    kind: "tolerance-policy" as const,
    id: NORMALIZED_TOLERANCE_POLICY_REF,
    coordinateTolerance: base.tolerancePolicy.coordinateTolerance,
  };
  const evaluationProfile = selectEvaluationProfile(mapped.mappedGeometry.elements.length);
  const evaluationProfileDerived = evaluationProfile !== BASIC_GRID_ALIGNMENT_PROFILE;
  const evaluationProfileContentIdentity = contentIdentityFor(evaluationProfile);
  const normalizationRequestId = `request:pr128:normalize:${mappingResultToken}`;
  const normalization = normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: normalizationRequestId,
    mappedCompositionA: mapped.mappedGeometry,
    mappedCompositionB: comparison,
    normalizedCompositionAId: `composition:pr128:mapped:A:${mappingResultToken}`,
    normalizedCompositionBId: `composition:pr128:mapped:B:${mappingResultToken}`,
    sharedSurfaceId: `surface:pr128:shared-unit:${mappingResultToken}`,
    tolerancePolicy,
    transformationStepId: `transformation:pr128:shared-unit-surface:${mappingResultToken}`,
  });
  if (!normalization.ok || normalization.status !== "normalized" || normalization.compositionA === null
    || normalization.compositionB === null || normalization.sharedSurface === null
    || normalization.transformationStep === null) {
    throw invalid("normalization", "failed closed");
  }

  const ratioPack = structuredClone(base.ratioPack);
  const packLockResult = createPackLock({ pack: ratioPack, sourceRefs: [{ kind: "ratio-pack", ref: `${ratioPack.id}@${ratioPack.version}` }] });
  if (packLockResult.status !== "ok" || packLockResult.output === null) throw invalid("packLock", "failed closed");
  const evaluationTolerances = { ...structuredClone(base.evaluationTolerances), id: "evaluation-tolerances:pr128" };
  const comparisonTolerances = { ...structuredClone(base.comparisonTolerances), id: "comparison-tolerances:pr128" };
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: `input:pr128:explicit-accepted-observation:${acceptedGeometryToken}` },
    { kind: "accepted-geometry", ref: proof.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: proof.acceptedGeometryContentIdentity },
    { kind: "visual-observation", ref: proof.providerObservationId },
    { kind: "visual-observation-content-identity", ref: proof.providerObservationContentIdentity },
    { kind: "mapping-result", ref: mapped.resultContentIdentity },
    { kind: "comparison-default", ref: LOCAL_COMPARISON_DEFAULT_REF },
    { kind: "ratio-pack", ref: `${ratioPack.id}@${ratioPack.version}` },
    { kind: "rule-set", ref: base.ruleSetRef },
    { kind: "evaluation-profile", ref: evaluationProfile.ref },
    ...(evaluationProfileDerived
      ? [{ kind: "evaluation-profile-adaptation", ref: SINGLE_ELEMENT_PROFILE_ADAPTATION_REF }]
      : []),
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: normalization.sharedSurface.coordinateSystem.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
  ];
  const operationContextResult = createOperationContext({
    operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: normalization.sharedSurface.coordinateSystem,
    metricPolicy: null,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { explicitAcceptedObservationToCoreHandoff: true },
    sourceRefs,
  });
  if (operationContextResult.status !== "ok" || operationContextResult.output === null) throw invalid("operationContext", "failed closed");
  const acceptance = {
    accepted: true as const,
    mode: "user_supplied_structured_data" as const,
    acceptedBy: acceptanceBoundary.acceptanceActor.actorId,
    acceptedAt: acceptedGeometry.acceptance.acceptedAt,
    acceptedSourceIds: normalization.acceptedSourceIds,
    acceptanceRecordId: acceptedGeometry.acceptance.acceptanceId,
  };
  const normalizationResultToken = identityToken(normalization.resultContentIdentity);
  const analysisId = `analysis:pr128:${normalizationResultToken}`;
  const externalSourceRef = proof.providerObservationId;
  const structuredAnalyzeInput: Parameters<typeof analyzeStructuredCompositionV1>[0] = {
    contractVersion: STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId,
    compositionA: normalization.compositionA,
    compositionB: normalization.compositionB,
    acceptance,
    ratioPack,
    packLock: packLockResult.output,
    ruleSetRef: base.ruleSetRef,
    evaluationProfile,
    evaluationTolerances,
    comparisonTolerances,
    tolerancePolicy,
    operationContext: operationContextResult.output,
    provenance: {
      kind: "structured-composition-analysis-provenance",
      sourceKind: "user_supplied_structured_data",
      externalSourceRef: { kind: "controlled-provider-observation", ref: externalSourceRef },
      callerSourceIds: normalization.acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: `transformation:pr128:map-accepted-geometry:${mappingResultToken}`,
          description: "Map explicitly accepted observation geometry into Core Composition2D inputs.",
          inputRefs: [{ kind: "accepted-geometry", ref: proof.acceptedGeometryId }],
          outputRefs: [{ kind: "mapping-result", ref: mapped.resultContentIdentity }],
        },
        {
          kind: "structured-composition-transformation-step",
          id: comparisonTransformationStepId,
          description: "Derive the fixed local comparison input from the existing MVP demo default, without provider influence or authority.",
          inputRefs: [{ kind: "comparison-default", ref: LOCAL_COMPARISON_DEFAULT_REF }],
          outputRefs: [{ kind: "composition-2d", ref: comparison.id }],
        },
        ...(evaluationProfileDerived
          ? [{
              kind: "structured-composition-transformation-step" as const,
              id: `transformation:pr128:derive-single-element-evaluation-profile:${normalizationResultToken}`,
              description: "Derive the local single-element evaluation profile by removing only the structurally inapplicable overlap penalty.",
              inputRefs: [{ kind: "evaluation-profile", ref: BASIC_GRID_ALIGNMENT_PROFILE.ref }],
              outputRefs: [
                { kind: "evaluation-profile", ref: evaluationProfile.ref },
                { kind: "evaluation-profile-adaptation", ref: SINGLE_ELEMENT_PROFILE_ADAPTATION_REF },
              ],
            }]
          : []),
        normalization.transformationStep,
      ],
      acceptanceRecord: acceptance,
      operationContextRef: operationContextResult.output.ref,
    },
  };
  const analysis = analyzeStructuredCompositionV1(structuredAnalyzeInput);
  if (analysis.status !== "valid" || analysis.errors.length !== 0) {
    throw invalid("structuredAnalyze", `failed closed (${analysis.errors.map((error) => error.code).join(",")})`);
  }
  const canonicalResultJsonContentIdentity = computeCanonicalResultJsonContentIdentityV1(analysis);
  const structuredAnalyzeComputationalContentIdentity = contentIdentityFor({
    evaluationA: evaluationComputationalProjection(analysis.evaluations.a),
    evaluationB: evaluationComputationalProjection(analysis.evaluations.b),
    comparison: {
      status: analysis.comparison.status,
      scoreDelta: analysis.comparison.scoreDelta,
      tieTolerance: analysis.comparison.tieTolerance,
    },
    decision: {
      status: analysis.decision.status,
      summary: analysis.decision.summary,
    },
  });
  const acceptedGeometryAlignmentComponent = analysis.evaluations.a.componentScores.find(
    (component) => component.componentId === "alignment",
  );
  if (acceptedGeometryAlignmentComponent === undefined) {
    throw invalid("structuredAnalyze.evaluations.a.alignment", "missing alignment component");
  }

  const handoff: ControlledProviderObservationToCoreHandoffV1 | ControlledProviderObservationCandidateToCoreHandoffV1 = {
    kind: "norma.controlled-provider-observation-to-core-handoff.v1",
    version: 1,
    status: "completed",
    ok: true,
    providerObservationAuthority: "candidateEvidenceOnly",
    boundarySourceTruth: "acceptedStructuredGeometry",
    externalEvidenceCoreInputAuthority: "acceptedStructuredGeometry",
    acceptedStructuredGeometryIsOnlyExternalEvidenceDerivedCoreInput: true,
    deterministicLocalComparisonDefaultUsed: true,
    deterministicLocalComparisonDefaultRef: LOCAL_COMPARISON_DEFAULT_REF,
    deterministicLocalComparisonDerived: true,
    deterministicLocalComparisonAuthoritative: false,
    deterministicLocalComparisonProviderInfluenced: false,
    deterministicLocalComparisonProvenanceRecorded: true,
    deterministicLocalComparisonTransformationStepId: comparisonTransformationStepId,
    structuredAnalyzeCallerSourceIdsSemantics: "effective-analysis-inputs-including-derived-local-comparison",
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    acceptanceProofCompletedBeforeMapping: true,
    mappingBoundary: "explicit-external-evidence-acceptance@1",
    mappingBoundaryApproved: true,
    mappingAttempted: true,
    mappingCompleted: true,
    normalizationCompleted: true,
    coreInputProduced: true,
    structuredAnalyzeInputProduced: true,
    structuredAnalyzeRun: true,
    resultJsonProduced: true,
    providerObservationId: proof.providerObservationId,
    providerObservationContentIdentity: proof.providerObservationContentIdentity,
    acceptedGeometryId: proof.acceptedGeometryId,
    acceptedGeometryContentIdentity: proof.acceptedGeometryContentIdentity,
    acceptedGeometryRevisionContentIdentity: proof.acceptedGeometryRevisionContentIdentity,
    mappingRequestId,
    mappingResultContentIdentity: mapped.resultContentIdentity,
    normalizationRequestId,
    normalizationResultContentIdentity: normalization.resultContentIdentity,
    structuredAnalyzeAnalysisId: analysisId,
    structuredAnalyzeAcceptanceRecordId: acceptance.acceptanceRecordId,
    structuredAnalyzeProvenanceExternalSourceRef: externalSourceRef,
    structuredAnalyzeMeaningfulIdentity: analysis.serializationSummary.meaningfulIdentity,
    structuredAnalyzeComputationalContentIdentity,
    deterministicLocalComparisonContentIdentity,
    normalizedCoordinateTolerancePolicyRef: NORMALIZED_TOLERANCE_POLICY_REF,
    normalizedCoordinateTolerance: tolerancePolicy.coordinateTolerance,
    normalizedMetricToleranceOmitted: true,
    evaluationProfileSelection: evaluationProfileDerived
      ? "single-element-without-overlap-penalty"
      : "full-basic-grid-alignment",
    evaluationProfileId: evaluationProfile.id,
    evaluationProfileRef: evaluationProfile.ref,
    evaluationProfileVersion: evaluationProfile.version,
    evaluationProfileDerived,
    evaluationProfileOverlapPenaltyIncluded: evaluationProfile.components.some(
      (component) => component.id === "overlap_penalty",
    ),
    evaluationProfileProviderInfluenced: false,
    evaluationProfileAdaptationRef: evaluationProfileDerived ? SINGLE_ELEMENT_PROFILE_ADAPTATION_REF : "none",
    evaluationProfileContentIdentity,
    acceptedGeometryAlignmentComponentStatus: acceptedGeometryAlignmentComponent.status,
    acceptedGeometryAlignmentComponentValue: acceptedGeometryAlignmentComponent.value,
    canonicalResultJsonContentIdentity,
    canonicalTruth: "result.json",
    derivedArtifactsAuthoritative: false,
    derivedArtifactsProduced: false,
    ...(isCandidateProof(proof)
      ? {
          providerExecutionReceiptContentIdentity: proof.providerExecutionReceiptContentIdentity,
          candidateObservationId: proof.candidateObservationId,
          candidateObservationContentIdentity: proof.candidateObservationContentIdentity,
          humanSelectionId: proof.humanSelectionId,
          humanSelectionContentIdentity: proof.humanSelectionContentIdentity,
        }
      : {}),
  };
  return { proof, handoff, structuredAnalyzeInput, analysis };
}

function isCandidateProof(
  proof: ControlledProviderObservationAcceptanceProofV1 | ControlledProviderObservationCandidateAcceptanceProofV1,
): proof is ControlledProviderObservationCandidateAcceptanceProofV1 {
  return "providerExecutionReceiptContentIdentity" in proof;
}

export function computeCanonicalResultJsonContentIdentityV1(result: unknown): string {
  const canonicalResultJsonBytes = `${serializeCanonicalJson(result, STABLE_SERIALIZATION_POLICY)}\n`;
  return `sha256:${createHash("sha256").update(canonicalResultJsonBytes).digest("hex")}`;
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, STABLE_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function identityToken(contentIdentity: string): string {
  if (!/^sha256:[0-9a-f]{64}$/u.test(contentIdentity)) {
    throw invalid("contentIdentity", "requires SHA-256 content identity");
  }
  return contentIdentity.slice("sha256:".length);
}

function evaluationComputationalProjection(
  evaluation: NonNullable<ReturnType<typeof analyzeStructuredCompositionV1>["evaluations"]>["a"],
): unknown {
  return {
    status: evaluation.status,
    componentScores: evaluation.componentScores.map((component) => ({
      componentId: component.componentId,
      status: component.status,
      value: component.value,
    })),
    score: evaluation.score?.value ?? null,
    confidence: {
      value: evaluation.confidence.value,
      factors: evaluation.confidence.factors,
    },
  };
}

function selectEvaluationProfile(acceptedElementCount: number): EvaluationProfile {
  if (acceptedElementCount !== 1) {
    return BASIC_GRID_ALIGNMENT_PROFILE;
  }

  const base = BASIC_GRID_ALIGNMENT_PROFILE;
  const ref = "evaluation-profile:basic-grid-alignment:single-element-without-overlap@1";
  return {
    ...structuredClone(base),
    ref,
    components: base.components
      .filter((component) => component.id !== "overlap_penalty")
      .map((component) => structuredClone(component)),
    provenance: {
      ...structuredClone(base.provenance),
      evaluationRef: ref,
      inputRefs: [
        ...structuredClone(base.provenance.inputRefs),
        { kind: "evaluation-profile-adaptation", ref: SINGLE_ELEMENT_PROFILE_ADAPTATION_REF },
      ],
      sourceRefs: [
        ...structuredClone(base.provenance.sourceRefs),
        { kind: "evaluation-profile", ref: base.ref },
      ],
    },
  };
}

function defaultComparison(
  composition: ReturnType<typeof mapAcceptedGeometryToCoreV1>["mappedGeometry"],
  defaultComposition: ReturnType<typeof createMvpDemoInput>["compositionB"],
  stageToken: string,
) {
  if (composition === null) throw invalid("mapping", "missing mapped geometry");
  const bounds = defaultComposition.surface.bounds;
  return {
    ...structuredClone(composition),
    id: `composition:pr128:comparison-source:${stageToken}`,
    surface: { ...structuredClone(composition.surface), id: `surface:pr128:comparison-source:${stageToken}` },
    elements: defaultComposition.elements.map((element, index) => ({
      ...element,
      id: `element:pr128:comparison:${index}:${stageToken}`,
      geometry: {
        ...element.geometry,
        x: element.geometry.x / bounds.width,
        y: element.geometry.y / bounds.height,
        width: element.geometry.width / bounds.width,
        height: element.geometry.height / bounds.height,
      },
    })),
  };
}

function snapshotInput(record: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(record) as Record<string, unknown>;
  } catch {
    throw invalid("input", "requires snapshot-compatible data");
  }
}

function requirePlainOwnRecord(
  record: Record<string, unknown>,
  field: string,
  path = field,
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(record, field)) {
    throw invalid(path, "requires own field");
  }

  return requirePlainRecord(record[field], path);
}

function requirePlainOwnDataRecord(
  record: Record<string, unknown>,
  field: string,
  path: string,
): Record<string, unknown> {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (descriptor === undefined) {
    throw invalid(path, "requires own field");
  }
  if (!("value" in descriptor)) {
    throw invalid(path, "requires own data field");
  }

  return requirePlainRecord(descriptor.value, path);
}

function requirePlainData(
  value: unknown,
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  if (isProxy(value)) {
    throw invalid(path, "must not be a Proxy");
  }
  if (depth > 64) {
    throw invalid(path, "exceeds maximum plain-data depth");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw invalid(path, "requires finite JSON number");
    }
    return;
  }
  if (typeof value !== "object") {
    throw invalid(path, "requires JSON-compatible plain data");
  }
  if (seen.has(value)) {
    throw invalid(path, "must not contain cycles");
  }
  seen.add(value);

  if (Array.isArray(value)) {
    requirePlainArrayData(value, path, seen, depth);
    seen.delete(value);
    return;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }
  requireEnumerableDataProperties(value as Record<string, unknown>, path, seen, depth);
  seen.delete(value);
}

function requirePlainArrayData(
  value: unknown[],
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw invalid(path, "requires plain array");
  }

  let indexCount = 0;
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") {
      continue;
    }
    if (typeof key !== "string" || !isCanonicalArrayIndex(key, value.length)) {
      throw invalid(`${path}.[field]`, "requires array index data only");
    }
    indexCount += 1;
    requireEnumerableDataDescriptor(value, key, `${path}[${key}]`, seen, depth);
  }
  if (indexCount !== value.length) {
    throw invalid(path, "requires dense array data");
  }
}

function requireEnumerableDataProperties(
  value: Record<string, unknown>,
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw invalid(`${path}.[symbol]`, "requires string-keyed plain data");
    }
    requireEnumerableDataDescriptor(value, key, `${path}.${key}`, seen, depth);
  }
}

function requireEnumerableDataDescriptor(
  value: object,
  key: PropertyKey,
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
    throw invalid(path, "requires enumerable own data field");
  }
  requirePlainData(descriptor.value, path, seen, depth + 1);
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function requirePlainRecord(value: unknown, path: string): Record<string, unknown> {
  if (isProxy(value)) {
    throw invalid(path, "must not be a Proxy");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(path, "requires plain object");
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }

  return value as Record<string, unknown>;
}

function isProxy(value: unknown): boolean {
  if (nodeUtilTypes?.isProxy === undefined) {
    throw invalid("runtime", "requires Node proxy detection");
  }

  return nodeUtilTypes.isProxy(value);
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  expectedFields: readonly string[],
  path: string,
): void {
  const expected = new Set<string>(expectedFields);
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string" || !expected.has(key)) {
      const fieldPath = typeof key === "string" ? `${path}.${key}` : `${path}.[symbol]`;
      throw invalid(fieldPath, "unknown field");
    }
  }
}

function invalid(field: string, reason: string): ControlledProviderObservationToCoreHandoffError {
  return new ControlledProviderObservationToCoreHandoffError(
    `Invalid controlled provider observation to Core handoff field "${field}": ${reason}.`,
  );
}
