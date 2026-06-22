import type {
  Composition2D,
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  PackLockRef,
  Provenance,
  Rect,
  RunRef,
  SourceReference,
  SurfaceSpace,
} from "./index.js";
import { validateGeometryV1 } from "./index.js";
import type { ConstructionV1, GridCellV1, GridV1, GuideV1, IntersectionPointV1, ZoneV1 } from "./construction-generation.js";
import { validateConstructionV1 } from "./construction-generation.js";
import type { EvaluationV1 } from "./evaluation.js";
import { validateEvaluationV1 } from "./evaluation.js";
import type { MeasurementResultV1 } from "./measurements.js";
import { validateMeasurementResultV1 } from "./measurements.js";
import type { ComparisonStatusV1, ComparisonV1, DecisionV1, StructuredExplanationClaimCodeV1, StructuredExplanationV1 } from "./comparison.js";
import {
  COMPARISON_V1_STATUSES,
  STRUCTURED_EXPLANATION_V1_CLAIM_CODES,
  validateComparisonV1,
  validateDecisionV1,
  validateStructuredExplanationV1,
} from "./comparison.js";

export const ARTIFACT_V1_SCHEMA_VERSION = "artifact-v1" as const;
export const ARTIFACT_SOURCE_BUNDLE_V1_SCHEMA_VERSION = "artifact-source-bundle-v1" as const;
export const ARTIFACT_REQUEST_V1_SCHEMA_VERSION = "artifact-request-v1" as const;

export const ARTIFACT_V1_STATUSES = [
  "current",
  "lossy",
  "stale",
  "non_replayable",
] as const;

export const ARTIFACT_V1_TYPES = [
  "structured-result",
  "construction-summary",
  "evaluation-report",
  "explanation",
  "simple-visual",
] as const;

export const ARTIFACT_V1_WARNING_CODES = [
  "MissingRunRef",
  "StaleArtifact",
  "LossyProjection",
  "VisualOnlyArtifact",
  "RoundedCoordinates",
  "OmittedSourceObject",
] as const;

export const ARTIFACT_V1_LOSS_CODES = [
  "OmittedSourceObject",
  "OmittedSourceMetadata",
  "SummaryProjection",
  "VisualOnlyArtifact",
  "LossyProjection",
  "RoundedCoordinates",
  "NonReplayableProjection",
] as const;

export type ArtifactV1SchemaVersion = typeof ARTIFACT_V1_SCHEMA_VERSION;
export type ArtifactSourceBundleV1SchemaVersion = typeof ARTIFACT_SOURCE_BUNDLE_V1_SCHEMA_VERSION;
export type ArtifactRequestV1SchemaVersion = typeof ARTIFACT_REQUEST_V1_SCHEMA_VERSION;
export type ArtifactStatusV1 = (typeof ARTIFACT_V1_STATUSES)[number];
export type ArtifactTypeV1 = (typeof ARTIFACT_V1_TYPES)[number];
export type ArtifactWarningCodeV1 = (typeof ARTIFACT_V1_WARNING_CODES)[number];
export type ArtifactLossCodeV1 = (typeof ARTIFACT_V1_LOSS_CODES)[number];

export interface ArtifactWarningV1 {
  kind: "artifact-warning";
  code: ArtifactWarningCodeV1;
  targetRef: string;
  sourceRefs: readonly SourceReference[];
}

export interface ArtifactLossV1 {
  kind: "artifact-loss";
  code: ArtifactLossCodeV1;
  message: string;
  sourceRefs: readonly SourceReference[];
}

export interface ArtifactStaleEvidenceV1 {
  kind: "artifact-stale-evidence";
  reason: string;
  sourceRefs: readonly SourceReference[];
}

export interface ArtifactOptionsBaseV1 {
  kind: "artifact-options";
  artifactType: ArtifactTypeV1;
}

export interface StructuredResultArtifactOptionsV1 extends ArtifactOptionsBaseV1 {
  artifactType: "structured-result";
  includeConstruction: boolean;
  includeMeasurements: boolean;
  includeEvaluation: boolean;
  includeComparison: boolean;
  includeDecision: boolean;
  includeExplanation: boolean;
  includeWarnings: boolean;
  includeProvenance: boolean;
}

export interface ConstructionSummaryArtifactOptionsV1 extends ArtifactOptionsBaseV1 {
  artifactType: "construction-summary";
  includeTraceSummary: boolean;
  includeWarnings: boolean;
}

export interface EvaluationReportArtifactOptionsV1 extends ArtifactOptionsBaseV1 {
  artifactType: "evaluation-report";
  includeComparison: boolean;
  includeDecision: boolean;
  includeExplanation: boolean;
  includeHumanSummary: boolean;
  includeWarnings: boolean;
  includeLimits: boolean;
}

export interface ExplanationArtifactOptionsV1 extends ArtifactOptionsBaseV1 {
  artifactType: "explanation";
  includeStructuredSource: boolean;
  includeHumanSummary: boolean;
  includeWarnings: boolean;
  includeLimits: boolean;
}

export interface SimpleVisualArtifactOptionsV1 extends ArtifactOptionsBaseV1 {
  artifactType: "simple-visual";
  format: "svg";
  mediaType: "image/svg+xml";
  viewportWidth: number;
  viewportHeight: number;
  padding: number;
  includeSurface: boolean;
  includeZones: boolean;
  includeGridCells: boolean;
  includeGuides: boolean;
  includeIntersections: boolean;
  includeElements: boolean;
  includeLabels: boolean;
  includeWarnings: boolean;
  coordinatePrecision: number;
  styleVersion: "simple-v1";
}

export type ArtifactOptionsV1 =
  | StructuredResultArtifactOptionsV1
  | ConstructionSummaryArtifactOptionsV1
  | EvaluationReportArtifactOptionsV1
  | ExplanationArtifactOptionsV1
  | SimpleVisualArtifactOptionsV1;

export interface ArtifactSourceBundleV1 {
  kind: "artifact-source-bundle";
  schemaVersion: ArtifactSourceBundleV1SchemaVersion;
  surface?: SurfaceSpace;
  construction?: ConstructionV1;
  composition?: Composition2D;
  compositionA?: Composition2D;
  compositionB?: Composition2D;
  measurementResult?: MeasurementResultV1;
  measurementResultA?: MeasurementResultV1;
  measurementResultB?: MeasurementResultV1;
  evaluation?: EvaluationV1;
  evaluationA?: EvaluationV1;
  evaluationB?: EvaluationV1;
  comparison?: ComparisonV1;
  decision?: DecisionV1;
  structuredExplanation?: StructuredExplanationV1;
}

export interface ArtifactRequestV1<TOptions extends ArtifactOptionsV1 = ArtifactOptionsV1> {
  kind: "artifact-request";
  schemaVersion: ArtifactRequestV1SchemaVersion;
  sources: ArtifactSourceBundleV1;
  options: TOptions;
  runRef?: RunRef | null;
  staleEvidence?: ArtifactStaleEvidenceV1 | null;
}

export interface ArtifactEnvelopeV1<TType extends ArtifactTypeV1, TOptions extends ArtifactOptionsV1, TPayload> {
  kind: "artifact";
  schemaVersion: ArtifactV1SchemaVersion;
  artifactRef: string;
  artifactType: TType;
  status: ArtifactStatusV1;
  sourceRefs: readonly SourceReference[];
  runRef: RunRef | null;
  options: TOptions;
  warnings: readonly ArtifactWarningV1[];
  losses: readonly ArtifactLossV1[];
  staleEvidence: ArtifactStaleEvidenceV1 | null;
  provenance: Provenance;
  payload: TPayload;
}

export interface StructuredResultArtifactPayloadV1 {
  kind: "structured-result-payload";
  construction: unknown | null;
  measurementResults: readonly unknown[];
  evaluations: readonly unknown[];
  comparison: unknown | null;
  decision: unknown | null;
  structuredExplanation: unknown | null;
  sourceKinds: readonly string[];
  sourceSchemaVersions: readonly SourceReference[];
  omittedSourceRefs: readonly SourceReference[];
}

export interface ConstructionGuideSummaryV1 {
  kind: "construction-guide-summary";
  guideRef: string;
  orientation: GuideV1["orientation"];
  position: number;
  segment: GuideV1["segment"];
}

export interface ConstructionZoneSummaryV1 {
  kind: "construction-zone-summary";
  zoneRef: string;
  partitionAxis: ZoneV1["partitionAxis"];
  bounds: Rect;
  boundingGuideRefs: readonly string[];
}

export interface ConstructionGridSummaryV1 {
  kind: "construction-grid-summary";
  gridRef: string;
  rowCount: number;
  columnCount: number;
  cellRefs: readonly string[];
}

export interface ConstructionIntersectionSummaryV1 {
  kind: "construction-intersection-summary";
  intersectionRef: string;
  point: IntersectionPointV1["point"];
  sourceGeometryRefs: readonly string[];
}

export interface ConstructionSummaryArtifactPayloadV1 {
  kind: "construction-summary-payload";
  constructionRef: string;
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  appliedRuleRefs: readonly string[];
  guideCount: number;
  guideRefs: readonly string[];
  guides: readonly ConstructionGuideSummaryV1[];
  zoneCount: number;
  zoneRefs: readonly string[];
  zones: readonly ConstructionZoneSummaryV1[];
  gridCount: number;
  gridRefs: readonly string[];
  grids: readonly ConstructionGridSummaryV1[];
  cellCount: number;
  cellRefs: readonly string[];
  intersectionCount: number;
  intersectionRefs: readonly string[];
  intersections: readonly ConstructionIntersectionSummaryV1[];
  traceSummary: {
    kind: "construction-trace-summary";
    operationRefs: readonly string[];
    createdObjectRefs: readonly string[];
    warnings: readonly string[];
  } | null;
  constructionWarnings: readonly string[];
}

export interface EvaluationReportArtifactPayloadV1 {
  kind: "evaluation-report-payload";
  evaluation: {
    kind: "evaluation-report-evaluation";
    evaluationRef: string;
    measurementResultRef: string;
    compositionRef: string;
    constructionRef: string | null;
    profileRef: string;
    packRef: string;
    ruleSetRef: string | null;
    overallScore: number;
    confidence: number;
    confidenceStatus: string;
    status: string;
    componentScores: readonly {
      kind: "evaluation-report-component-score";
      componentRef: string;
      componentType: string;
      normalizedScore: number;
      effectiveWeight: number;
      weightedContribution: number;
      measurementRefs: readonly string[];
    }[];
    sourceMeasurementRefs: readonly SourceReference[];
    warnings: readonly unknown[];
    limits: unknown | null;
  };
  comparison: {
    kind: "evaluation-report-comparison";
    comparisonRef: string;
    status: string;
    scoreA: number;
    scoreB: number;
    signedScoreDelta: number;
    absoluteScoreDelta: number;
    confidenceA: number;
    confidenceB: number;
  } | null;
  decision: {
    kind: "evaluation-report-decision";
    decisionRef: string;
    status: string;
    selectedEvaluationRef: string | null;
    selectedCompositionRef: string | null;
  } | null;
  structuredExplanation: {
    kind: "evaluation-report-structured-explanation";
    explanationRef: string;
    claimCode: string;
    facts: unknown;
    warningCodes: readonly string[];
  } | null;
  humanSummary: string | null;
}

export interface ExplanationArtifactPayloadV1 {
  kind: "explanation-payload";
  explanationRef: string;
  comparisonRef: string;
  decisionRef: string;
  claimCode: string;
  facts: unknown;
  warningCodes: readonly string[];
  limits: unknown | null;
  summary: string | null;
  structuredExplanation: unknown | null;
}

export interface SimpleVisualArtifactPayloadV1 {
  kind: "simple-visual-payload";
  format: "svg";
  mediaType: "image/svg+xml";
  styleVersion: "simple-v1";
  coordinateMapping: {
    kind: "coordinate-mapping";
    sourceCoordinateSystem: "norma-bottom-left-normalized";
    targetCoordinateSystem: "svg-top-left";
    normalizedPoint: string;
    normalizedRect: string;
  };
  viewport: {
    kind: "svg-viewport";
    width: number;
    height: number;
    padding: number;
    drawableWidth: number;
    drawableHeight: number;
  };
  svg: string;
}

export type StructuredResultArtifactV1 = ArtifactEnvelopeV1<"structured-result", StructuredResultArtifactOptionsV1, StructuredResultArtifactPayloadV1>;
export type ConstructionSummaryArtifactV1 = ArtifactEnvelopeV1<"construction-summary", ConstructionSummaryArtifactOptionsV1, ConstructionSummaryArtifactPayloadV1>;
export type EvaluationReportArtifactV1 = ArtifactEnvelopeV1<"evaluation-report", EvaluationReportArtifactOptionsV1, EvaluationReportArtifactPayloadV1>;
export type ExplanationArtifactV1 = ArtifactEnvelopeV1<"explanation", ExplanationArtifactOptionsV1, ExplanationArtifactPayloadV1>;
export type SimpleVisualArtifactV1 = ArtifactEnvelopeV1<"simple-visual", SimpleVisualArtifactOptionsV1, SimpleVisualArtifactPayloadV1>;
export type ArtifactV1 =
  | StructuredResultArtifactV1
  | ConstructionSummaryArtifactV1
  | EvaluationReportArtifactV1
  | ExplanationArtifactV1
  | SimpleVisualArtifactV1;

interface DiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  runRef?: RunRef | null;
  output?: TOutput | null;
}

type ArtifactValidation<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; result: CoreResult };

interface ValidArtifactSources {
  sourceRefs: readonly SourceReference[];
  surface?: SurfaceSpace;
  construction?: ConstructionV1;
  composition?: Composition2D;
  compositionA?: Composition2D;
  compositionB?: Composition2D;
  measurementResult?: MeasurementResultV1;
  measurementResultA?: MeasurementResultV1;
  measurementResultB?: MeasurementResultV1;
  evaluation?: EvaluationV1;
  evaluationA?: EvaluationV1;
  evaluationB?: EvaluationV1;
  comparison?: ComparisonV1;
  decision?: DecisionV1;
  structuredExplanation?: StructuredExplanationV1;
}

interface ValidArtifactRequest<TOptions extends ArtifactOptionsV1> {
  sources: ValidArtifactSources;
  sourceBundle: ArtifactSourceBundleV1;
  options: TOptions;
  runRef: RunRef | null;
  staleEvidence: ArtifactStaleEvidenceV1 | null;
}

const ARTIFACT_OPERATION_VERSION = "0.1.0";
const ARTIFACT_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/artifacts-v1",
});

const DEFAULT_RESULT_FIELDS = Object.freeze({
  warnings: [],
  errors: [],
  provenance: null,
  outputRefs: [],
  runRef: null,
  packLockRef: null,
  operationContextRef: null,
  output: null,
});

const SOURCE_REFERENCE_ALLOWED_KEYS = ["kind", "ref"] as const;
const PROVENANCE_ALLOWED_KEYS = ["operationName", "operationVersion", "inputRefs", "source"] as const;
const RUN_REF_ALLOWED_KEYS = ["id"] as const;
const STALE_EVIDENCE_ALLOWED_KEYS = ["kind", "reason", "sourceRefs"] as const;
const ARTIFACT_REQUEST_ALLOWED_KEYS = ["kind", "schemaVersion", "sources", "options", "runRef", "staleEvidence"] as const;
const SOURCE_BUNDLE_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "surface",
  "construction",
  "composition",
  "compositionA",
  "compositionB",
  "measurementResult",
  "measurementResultA",
  "measurementResultB",
  "evaluation",
  "evaluationA",
  "evaluationB",
  "comparison",
  "decision",
  "structuredExplanation",
] as const;
const ARTIFACT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "artifactRef",
  "artifactType",
  "status",
  "sourceRefs",
  "runRef",
  "options",
  "warnings",
  "losses",
  "staleEvidence",
  "provenance",
  "payload",
] as const;
const ARTIFACT_WARNING_ALLOWED_KEYS = ["kind", "code", "targetRef", "sourceRefs"] as const;
const ARTIFACT_LOSS_ALLOWED_KEYS = ["kind", "code", "message", "sourceRefs"] as const;
const STRUCTURED_OPTIONS_ALLOWED_KEYS = [
  "kind",
  "artifactType",
  "includeConstruction",
  "includeMeasurements",
  "includeEvaluation",
  "includeComparison",
  "includeDecision",
  "includeExplanation",
  "includeWarnings",
  "includeProvenance",
] as const;
const SUMMARY_OPTIONS_ALLOWED_KEYS = ["kind", "artifactType", "includeTraceSummary", "includeWarnings"] as const;
const REPORT_OPTIONS_ALLOWED_KEYS = [
  "kind",
  "artifactType",
  "includeComparison",
  "includeDecision",
  "includeExplanation",
  "includeHumanSummary",
  "includeWarnings",
  "includeLimits",
] as const;
const EXPLANATION_OPTIONS_ALLOWED_KEYS = [
  "kind",
  "artifactType",
  "includeStructuredSource",
  "includeHumanSummary",
  "includeWarnings",
  "includeLimits",
] as const;
const VISUAL_OPTIONS_ALLOWED_KEYS = [
  "kind",
  "artifactType",
  "format",
  "mediaType",
  "viewportWidth",
  "viewportHeight",
  "padding",
  "includeSurface",
  "includeZones",
  "includeGridCells",
  "includeGuides",
  "includeIntersections",
  "includeElements",
  "includeLabels",
  "includeWarnings",
  "coordinatePrecision",
  "styleVersion",
] as const;
const STRUCTURED_PAYLOAD_ALLOWED_KEYS = [
  "kind",
  "construction",
  "measurementResults",
  "evaluations",
  "comparison",
  "decision",
  "structuredExplanation",
  "sourceKinds",
  "sourceSchemaVersions",
  "omittedSourceRefs",
] as const;
const SUMMARY_PAYLOAD_ALLOWED_KEYS = [
  "kind",
  "constructionRef",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "appliedRuleRefs",
  "guideCount",
  "guideRefs",
  "guides",
  "zoneCount",
  "zoneRefs",
  "zones",
  "gridCount",
  "gridRefs",
  "grids",
  "cellCount",
  "cellRefs",
  "intersectionCount",
  "intersectionRefs",
  "intersections",
  "traceSummary",
  "constructionWarnings",
] as const;
const REPORT_PAYLOAD_ALLOWED_KEYS = ["kind", "evaluation", "comparison", "decision", "structuredExplanation", "humanSummary"] as const;
const REPORT_EVALUATION_ALLOWED_KEYS = [
  "kind",
  "evaluationRef",
  "measurementResultRef",
  "compositionRef",
  "constructionRef",
  "profileRef",
  "packRef",
  "ruleSetRef",
  "overallScore",
  "confidence",
  "confidenceStatus",
  "status",
  "componentScores",
  "sourceMeasurementRefs",
  "warnings",
  "limits",
] as const;
const REPORT_COMPONENT_SCORE_ALLOWED_KEYS = [
  "kind",
  "componentRef",
  "componentType",
  "normalizedScore",
  "effectiveWeight",
  "weightedContribution",
  "measurementRefs",
] as const;
const REPORT_COMPARISON_ALLOWED_KEYS = [
  "kind",
  "comparisonRef",
  "status",
  "scoreA",
  "scoreB",
  "signedScoreDelta",
  "absoluteScoreDelta",
  "confidenceA",
  "confidenceB",
] as const;
const REPORT_DECISION_ALLOWED_KEYS = [
  "kind",
  "decisionRef",
  "status",
  "selectedEvaluationRef",
  "selectedCompositionRef",
] as const;
const REPORT_STRUCTURED_EXPLANATION_ALLOWED_KEYS = ["kind", "explanationRef", "claimCode", "facts", "warningCodes"] as const;
const EXPLANATION_PAYLOAD_ALLOWED_KEYS = [
  "kind",
  "explanationRef",
  "comparisonRef",
  "decisionRef",
  "claimCode",
  "facts",
  "warningCodes",
  "limits",
  "summary",
  "structuredExplanation",
] as const;
const STRUCTURED_EXPLANATION_FACTS_ALLOWED_KEYS = [
  "kind",
  "status",
  "scoreA",
  "scoreB",
  "signedScoreDelta",
  "absoluteScoreDelta",
  "tieTolerance",
  "confidenceA",
  "confidenceB",
  "selectedEvaluationRef",
  "selectedCompositionRef",
  "contextMismatches",
  "warningCodes",
] as const;
const COMPARISON_CONTEXT_CHECK_ALLOWED_KEYS = ["kind", "field", "aValue", "bValue", "matches"] as const;
const COMPARISON_LIMITS_ALLOWED_KEYS = ["kind", "tieTolerance", "minimumConfidence", "ambiguousEvaluationPolicy", "statusPrecedence"] as const;
const VISUAL_PAYLOAD_ALLOWED_KEYS = ["kind", "format", "mediaType", "styleVersion", "coordinateMapping", "viewport", "svg"] as const;
const VISUAL_COORDINATE_MAPPING_ALLOWED_KEYS = ["kind", "sourceCoordinateSystem", "targetCoordinateSystem", "normalizedPoint", "normalizedRect"] as const;
const VISUAL_VIEWPORT_ALLOWED_KEYS = ["kind", "width", "height", "padding", "drawableWidth", "drawableHeight"] as const;
const CONSTRUCTION_GUIDE_SUMMARY_ALLOWED_KEYS = ["kind", "guideRef", "orientation", "position", "segment"] as const;
const CONSTRUCTION_ZONE_SUMMARY_ALLOWED_KEYS = ["kind", "zoneRef", "partitionAxis", "bounds", "boundingGuideRefs"] as const;
const CONSTRUCTION_GRID_SUMMARY_ALLOWED_KEYS = ["kind", "gridRef", "rowCount", "columnCount", "cellRefs"] as const;
const CONSTRUCTION_INTERSECTION_SUMMARY_ALLOWED_KEYS = ["kind", "intersectionRef", "point", "sourceGeometryRefs"] as const;
const CONSTRUCTION_TRACE_SUMMARY_ALLOWED_KEYS = ["kind", "operationRefs", "createdObjectRefs", "warnings"] as const;
const POINT_ALLOWED_KEYS = ["kind", "x", "y"] as const;
const SEGMENT_ALLOWED_KEYS = ["kind", "start", "end"] as const;
const RECT_ALLOWED_KEYS = ["kind", "x", "y", "width", "height"] as const;
const FORBIDDEN_ARTIFACT_SOURCE_KINDS = ["artifact", "structured-result-artifact", "construction-summary-artifact", "evaluation-report-artifact", "explanation-artifact", "simple-visual-artifact"] as const;
const FORBIDDEN_HUMAN_TERMS = ["better", "best", "beautiful", "aesthetically superior", "recommended", "winner", "authorintent", "optimize"] as const;
const EVALUATION_STATUS_VALUES = ["match", "near_match", "weak_match", "no_match", "ambiguous"] as const;
const CONFIDENCE_STATUS_VALUES = ["high", "medium", "low"] as const;
const NORMALIZED_POINT_MAPPING = "svgX=padding+x*drawableWidth;svgY=padding+(1-y)*drawableHeight";
const NORMALIZED_RECT_MAPPING = "svgX=padding+x*drawableWidth;svgY=padding+(1-y-height)*drawableHeight";

export function createStructuredResultArtifactV1(input: unknown): CoreResult<StructuredResultArtifactV1> {
  const request = validateArtifactRequest(input, "structured-result", validateStructuredOptions);
  if (!request.ok) {
    return request.result as CoreResult<StructuredResultArtifactV1>;
  }

  const sourceRefs = request.value.sources.sourceRefs;
  const sourceCount = [
    request.value.options.includeConstruction && request.value.sources.construction !== undefined,
    request.value.options.includeMeasurements && measurementResultsFor(request.value.sources).length > 0,
    request.value.options.includeEvaluation && evaluationsFor(request.value.sources).length > 0,
    request.value.options.includeComparison && request.value.sources.comparison !== undefined,
    request.value.options.includeDecision && request.value.sources.decision !== undefined,
    request.value.options.includeExplanation && request.value.sources.structuredExplanation !== undefined,
  ].filter(Boolean).length;
  if (sourceCount === 0) {
    return invalidArtifact("options", "StructuredResultArtifact V1 must include at least one supplied source payload.") as CoreResult<StructuredResultArtifactV1>;
  }

  const omittedSourceRefs = omittedSourceRefsForStructured(request.value.sources, request.value.options);
  const losses = [
    ...lossesForOmittedSourceRefs(omittedSourceRefs),
    ...(request.value.options.includeWarnings ? [] : [artifactLoss("OmittedSourceMetadata", "Source warnings were omitted by explicit options.", sourceRefs)]),
    ...(request.value.options.includeProvenance ? [] : [artifactLoss("OmittedSourceMetadata", "Source provenance was omitted by explicit options.", sourceRefs)]),
  ];
  const payload: StructuredResultArtifactPayloadV1 = {
    kind: "structured-result-payload",
    construction: request.value.options.includeConstruction && request.value.sources.construction !== undefined
      ? projectSource(request.value.sources.construction, request.value.options)
      : null,
    measurementResults: request.value.options.includeMeasurements
      ? measurementResultsFor(request.value.sources).map((measurementResult) => projectSource(measurementResult, request.value.options))
      : [],
    evaluations: request.value.options.includeEvaluation
      ? evaluationsFor(request.value.sources).map((evaluation) => projectSource(evaluation, request.value.options))
      : [],
    comparison: request.value.options.includeComparison && request.value.sources.comparison !== undefined
      ? projectSource(request.value.sources.comparison, request.value.options)
      : null,
    decision: request.value.options.includeDecision && request.value.sources.decision !== undefined
      ? projectSource(request.value.sources.decision, request.value.options)
      : null,
    structuredExplanation: request.value.options.includeExplanation && request.value.sources.structuredExplanation !== undefined
      ? projectSource(request.value.sources.structuredExplanation, request.value.options)
      : null,
    sourceKinds: uniqueStrings(sourceRefs.map((sourceRef) => sourceRef.kind)),
    sourceSchemaVersions: sourceSchemaVersionsFor(request.value.sources),
    omittedSourceRefs,
  };

  return artifactOk(createArtifactEnvelope(
    "structured-result",
    request.value,
    losses,
    [],
    payload,
    "core.artifacts-v1.createStructuredResult",
  ));
}

export function createConstructionSummaryArtifactV1(input: unknown): CoreResult<ConstructionSummaryArtifactV1> {
  const request = validateArtifactRequest(input, "construction-summary", validateConstructionSummaryOptions);
  if (!request.ok) {
    return request.result as CoreResult<ConstructionSummaryArtifactV1>;
  }
  const construction = request.value.sources.construction;
  if (construction === undefined) {
    return missingArtifactSource("construction", "ConstructionSummaryArtifact V1 requires ConstructionV1.") as CoreResult<ConstructionSummaryArtifactV1>;
  }

  const payload = constructionSummaryPayload(construction, request.value.options);
  return artifactOk(createArtifactEnvelope(
    "construction-summary",
    request.value,
    [artifactLoss("SummaryProjection", "Construction summary omits full ConstructionV1 structure.", [{ kind: "construction", ref: construction.constructionRef }])],
    request.value.options.includeWarnings ? artifactWarningsFromStrings(construction.constructionTrace.warnings, construction.constructionRef) : [],
    payload,
    "core.artifacts-v1.createConstructionSummary",
  ));
}

export function createEvaluationReportArtifactV1(input: unknown): CoreResult<EvaluationReportArtifactV1> {
  const request = validateArtifactRequest(input, "evaluation-report", validateEvaluationReportOptions);
  if (!request.ok) {
    return request.result as CoreResult<EvaluationReportArtifactV1>;
  }
  const evaluation = primaryEvaluation(request.value.sources);
  if (evaluation === undefined) {
    return missingArtifactSource("evaluation", "EvaluationReportArtifact V1 requires EvaluationV1.") as CoreResult<EvaluationReportArtifactV1>;
  }

  const payload = evaluationReportPayload(evaluation, request.value.sources, request.value.options);
  return artifactOk(createArtifactEnvelope(
    "evaluation-report",
    request.value,
    [artifactLoss("SummaryProjection", "Evaluation report summarizes Evaluation V1 and optional PR9 sources.", [{ kind: "evaluation", ref: evaluation.evaluationRef }])],
    [],
    payload,
    "core.artifacts-v1.createEvaluationReport",
  ));
}

export function createExplanationArtifactV1(input: unknown): CoreResult<ExplanationArtifactV1> {
  const request = validateArtifactRequest(input, "explanation", validateExplanationOptions);
  if (!request.ok) {
    return request.result as CoreResult<ExplanationArtifactV1>;
  }
  const explanation = request.value.sources.structuredExplanation;
  if (explanation === undefined) {
    return missingArtifactSource("structuredExplanation", "ExplanationArtifact V1 requires StructuredExplanationV1.") as CoreResult<ExplanationArtifactV1>;
  }

  const losses = request.value.options.includeStructuredSource
    ? []
    : [artifactLoss("SummaryProjection", "Explanation artifact omitted the complete StructuredExplanationV1 source.", [{ kind: "structured-explanation", ref: explanation.explanationRef }])];
  const payload: ExplanationArtifactPayloadV1 = {
    kind: "explanation-payload",
    explanationRef: explanation.explanationRef,
    comparisonRef: explanation.comparisonRef,
    decisionRef: explanation.decisionRef,
    claimCode: explanation.claimCode,
    facts: deepClone(explanation.facts),
    warningCodes: [...explanation.facts.warningCodes],
    limits: request.value.options.includeLimits ? deepClone(explanation.limits) : null,
    summary: request.value.options.includeHumanSummary ? explanation.summary : null,
    structuredExplanation: request.value.options.includeStructuredSource ? deepClone(explanation) : null,
  };

  return artifactOk(createArtifactEnvelope(
    "explanation",
    request.value,
    losses,
    [],
    payload,
    "core.artifacts-v1.createExplanation",
  ));
}

export function createSimpleVisualArtifactV1(input: unknown): CoreResult<SimpleVisualArtifactV1> {
  const request = validateArtifactRequest(input, "simple-visual", validateSimpleVisualOptions);
  if (!request.ok) {
    return request.result as CoreResult<SimpleVisualArtifactV1>;
  }
  if (request.value.sources.surface === undefined) {
    return missingArtifactSource("surface", "SimpleVisualArtifact V1 requires a SurfaceSpace source.") as CoreResult<SimpleVisualArtifactV1>;
  }
  const needsConstruction = request.value.options.includeZones
    || request.value.options.includeGridCells
    || request.value.options.includeGuides
    || request.value.options.includeIntersections;
  if (needsConstruction && request.value.sources.construction === undefined) {
    return missingArtifactSource("construction", "Requested visual construction primitives require ConstructionV1.") as CoreResult<SimpleVisualArtifactV1>;
  }

  const visualLosses = [
    artifactLoss("VisualOnlyArtifact", "SVG output is a visual projection and cannot become source truth.", request.value.sources.sourceRefs),
    artifactLoss("LossyProjection", "Simple visual artifact omits non-visual source fields.", request.value.sources.sourceRefs),
    ...(request.value.options.coordinatePrecision < 6
      ? [artifactLoss("RoundedCoordinates", "SVG coordinates were rounded using coordinatePrecision.", request.value.sources.sourceRefs)]
      : []),
  ];
  const visualWarnings = [
    artifactWarning("VisualOnlyArtifact", "simple-visual", request.value.sources.sourceRefs),
    ...(request.value.options.coordinatePrecision < 6
      ? [artifactWarning("RoundedCoordinates", "simple-visual", request.value.sources.sourceRefs)]
      : []),
  ];
  const envelopeSeed = envelopeSeedFor("simple-visual", request.value, visualLosses, visualWarnings);
  const payload = simpleVisualPayload(
    envelopeSeed.artifactRef,
    request.value.sources,
    request.value.options,
  );
  const artifact: SimpleVisualArtifactV1 = {
    ...envelopeSeed,
    payload,
  };
  const validation = validateArtifactStructure(artifact);
  if (!validation.ok) {
    return validation.result as CoreResult<SimpleVisualArtifactV1>;
  }
  return artifactResult(artifact);
}

export function validateArtifactV1(value: unknown, sourceBundle?: unknown): CoreResult<ArtifactV1> {
  const validation = validateArtifactStructure(value);
  if (!validation.ok) {
    return validation.result as CoreResult<ArtifactV1>;
  }

  if (sourceBundle !== undefined) {
    const recreated = recreateArtifact(validation.value, sourceBundle);
    if (recreated.status !== "ok" || recreated.output === null) {
      return recreated as CoreResult<ArtifactV1>;
    }
    if (stableJson(recreated.output) !== stableJson(validation.value)) {
      return invalidArtifact("artifact", "Artifact projection does not match the supplied source bundle.") as CoreResult<ArtifactV1>;
    }
  }

  return artifactResult(validation.value);
}

function validateArtifactRequest<TOptions extends ArtifactOptionsV1>(
  input: unknown,
  artifactType: TOptions["artifactType"],
  validateOptions: (options: unknown) => ArtifactValidation<TOptions>,
): ArtifactValidation<ValidArtifactRequest<TOptions>> {
  if (!isRecord(input) || firstUnsupportedKey(input, ARTIFACT_REQUEST_ALLOWED_KEYS) !== null) {
    return failedArtifact(invalidArtifact("artifactRequest", "Artifact request must be closed and structured."));
  }
  if (input.kind !== "artifact-request" || input.schemaVersion !== ARTIFACT_REQUEST_V1_SCHEMA_VERSION) {
    return failedArtifact(invalidArtifact("schemaVersion", "Artifact request requires artifact-request-v1."));
  }

  const sourceValidation = validateArtifactSourceBundle(input.sources);
  if (!sourceValidation.ok) {
    return sourceValidation;
  }
  const optionValidation = validateOptions(input.options);
  if (!optionValidation.ok) {
    return optionValidation;
  }
  if (optionValidation.value.artifactType !== artifactType) {
    return failedArtifact(unsupportedArtifactOption("artifactType", `Artifact options must target ${artifactType}.`));
  }
  const runRefValidation = validateNullableRunRef(input.runRef);
  if (!runRefValidation.ok) {
    return runRefValidation;
  }
  const staleValidation = validateNullableStaleEvidence(input.staleEvidence);
  if (!staleValidation.ok) {
    return staleValidation;
  }

  return validArtifact({
    sources: sourceValidation.value,
    sourceBundle: input.sources as ArtifactSourceBundleV1,
    options: optionValidation.value,
    runRef: runRefValidation.value,
    staleEvidence: staleValidation.value,
  });
}

function validateArtifactSourceBundle(value: unknown): ArtifactValidation<ValidArtifactSources> {
  if (!isRecord(value) || firstUnsupportedKey(value, SOURCE_BUNDLE_ALLOWED_KEYS) !== null) {
    return failedArtifact(missingArtifactSource("sources", "Artifact operations require a closed source bundle."));
  }
  if (value.kind !== "artifact-source-bundle" || value.schemaVersion !== ARTIFACT_SOURCE_BUNDLE_V1_SCHEMA_VERSION) {
    return failedArtifact(missingArtifactSource("sources", "Artifact source bundle requires artifact-source-bundle-v1."));
  }

  for (const key of SOURCE_BUNDLE_ALLOWED_KEYS) {
    if (key !== "kind" && key !== "schemaVersion" && key in value && artifactWouldBecomeSource(value[key])) {
      return failedArtifact(artifactWouldBecomeSourceOfTruth(key));
    }
  }

  const sources: Omit<ValidArtifactSources, "sourceRefs"> = {};
  if (value.surface !== undefined) {
    const surface = validateSurface(value.surface);
    if (!surface.ok) return surface;
    sources.surface = surface.value;
  }
  if (value.construction !== undefined) {
    const construction = validateConstructionSource(value.construction);
    if (!construction.ok) return construction;
    sources.construction = construction.value;
  }
  if (value.composition !== undefined) {
    const composition = validateComposition(value.composition, "composition");
    if (!composition.ok) return composition;
    sources.composition = composition.value;
  }
  if (value.compositionA !== undefined) {
    const composition = validateComposition(value.compositionA, "compositionA");
    if (!composition.ok) return composition;
    sources.compositionA = composition.value;
  }
  if (value.compositionB !== undefined) {
    const composition = validateComposition(value.compositionB, "compositionB");
    if (!composition.ok) return composition;
    sources.compositionB = composition.value;
  }
  if (value.measurementResult !== undefined) {
    const measurement = validateMeasurementSource(value.measurementResult, "measurementResult");
    if (!measurement.ok) return measurement;
    sources.measurementResult = measurement.value;
  }
  if (value.measurementResultA !== undefined) {
    const measurement = validateMeasurementSource(value.measurementResultA, "measurementResultA");
    if (!measurement.ok) return measurement;
    sources.measurementResultA = measurement.value;
  }
  if (value.measurementResultB !== undefined) {
    const measurement = validateMeasurementSource(value.measurementResultB, "measurementResultB");
    if (!measurement.ok) return measurement;
    sources.measurementResultB = measurement.value;
  }
  if (value.evaluation !== undefined) {
    const evaluation = validateEvaluationSource(value.evaluation, "evaluation");
    if (!evaluation.ok) return evaluation;
    sources.evaluation = evaluation.value;
  }
  if (value.evaluationA !== undefined) {
    const evaluation = validateEvaluationSource(value.evaluationA, "evaluationA");
    if (!evaluation.ok) return evaluation;
    sources.evaluationA = evaluation.value;
  }
  if (value.evaluationB !== undefined) {
    const evaluation = validateEvaluationSource(value.evaluationB, "evaluationB");
    if (!evaluation.ok) return evaluation;
    sources.evaluationB = evaluation.value;
  }
  if (value.comparison !== undefined) {
    const comparison = validateComparisonSource(value.comparison, "comparison");
    if (!comparison.ok) return comparison;
    sources.comparison = comparison.value;
  }
  if (value.decision !== undefined) {
    const decision = validateDecisionSource(value.decision, "decision", sources.comparison);
    if (!decision.ok) return decision;
    sources.decision = decision.value;
  }
  if (value.structuredExplanation !== undefined) {
    const explanation = validateExplanationSource(value.structuredExplanation, sources.comparison, sources.decision);
    if (!explanation.ok) return explanation;
    sources.structuredExplanation = explanation.value;
  }

  const sourceRefs = sourceRefsForSources(sources);
  if (sourceRefs.length === 0) {
    return failedArtifact(missingArtifactSource("sources", "Artifact source bundle must include at least one source object."));
  }
  const duplicate = firstDuplicateSourceRef(sourceRefs);
  if (duplicate !== null) {
    return failedArtifact(sourceMismatch("sources", `Duplicate source ref is not allowed: ${duplicate.kind}:${duplicate.ref}.`));
  }

  const sourceValidationFailure = validateSourceConsistency({ ...sources, sourceRefs });
  if (sourceValidationFailure !== null) {
    return failedArtifact(sourceValidationFailure);
  }

  return validArtifact({ ...sources, sourceRefs });
}

function validateSourceConsistency(sources: ValidArtifactSources): CoreResult | null {
  if (sources.surface !== undefined && sources.construction !== undefined && sources.construction.inputRef !== sources.surface.id) {
    return sourceMismatch("construction.inputRef", "Construction inputRef must match supplied SurfaceSpace.");
  }
  for (const measurement of measurementResultsFor(sources)) {
    if (sources.surface !== undefined && measurement.spaceRef !== sources.surface.id) {
      return sourceMismatch("measurementResult.spaceRef", "MeasurementResult spaceRef must match supplied SurfaceSpace.");
    }
    if (sources.construction !== undefined && !sourceRefsInclude(measurement.sourceRefs, { kind: "construction", ref: sources.construction.constructionRef })) {
      return sourceMismatch("measurementResult.sourceRefs", "MeasurementResult must trace to supplied ConstructionV1.");
    }
  }
  const evaluationPairs: readonly [EvaluationV1 | undefined, MeasurementResultV1 | undefined, Composition2D | undefined, string][] = [
    [sources.evaluation, sources.measurementResult, sources.composition, "evaluation"],
    [sources.evaluationA, sources.measurementResultA, sources.compositionA, "evaluationA"],
    [sources.evaluationB, sources.measurementResultB, sources.compositionB, "evaluationB"],
  ];
  for (const [evaluation, measurement, composition, targetRef] of evaluationPairs) {
    if (evaluation === undefined) continue;
    if (measurement !== undefined && evaluation.measurementResultRef !== measurement.measurementResultRef) {
      return sourceMismatch(`${targetRef}.measurementResultRef`, "EvaluationV1 must match supplied MeasurementResultV1.");
    }
    if (composition !== undefined && evaluation.compositionRef !== composition.id) {
      return sourceMismatch(`${targetRef}.compositionRef`, "EvaluationV1 must match supplied Composition2D.");
    }
  }
  if (sources.comparison !== undefined) {
    if (sources.evaluation !== undefined
      && sources.comparison.evaluationARef !== sources.evaluation.evaluationRef
      && sources.comparison.evaluationBRef !== sources.evaluation.evaluationRef) {
      return sourceMismatch("evaluation.evaluationRef", "Singular EvaluationV1 must be one of the supplied ComparisonV1 evaluations.");
    }
    if (sources.evaluationA !== undefined && sources.comparison.evaluationARef !== sources.evaluationA.evaluationRef) {
      return sourceMismatch("comparison.evaluationARef", "ComparisonV1 must match supplied evaluationA.");
    }
    if (sources.evaluationB !== undefined && sources.comparison.evaluationBRef !== sources.evaluationB.evaluationRef) {
      return sourceMismatch("comparison.evaluationBRef", "ComparisonV1 must match supplied evaluationB.");
    }
  }
  if (sources.decision !== undefined && sources.comparison !== undefined && sources.decision.comparisonRef !== sources.comparison.comparisonRef) {
    return sourceMismatch("decision.comparisonRef", "DecisionV1 must match supplied ComparisonV1.");
  }
  if (sources.structuredExplanation !== undefined) {
    if (sources.comparison !== undefined && sources.structuredExplanation.comparisonRef !== sources.comparison.comparisonRef) {
      return sourceMismatch("structuredExplanation.comparisonRef", "StructuredExplanationV1 must match supplied ComparisonV1.");
    }
    if (sources.decision !== undefined && sources.structuredExplanation.decisionRef !== sources.decision.decisionRef) {
      return sourceMismatch("structuredExplanation.decisionRef", "StructuredExplanationV1 must match supplied DecisionV1.");
    }
  }
  return null;
}

function validateSurface(value: unknown): ArtifactValidation<SurfaceSpace> {
  const validation = validateGeometryV1(value);
  if (validation.status !== "ok" || validation.output === null || validation.output.kind !== "surface-space") {
    return failedArtifact(missingArtifactSource("surface", "Artifact surface source must be a valid SurfaceSpace."));
  }
  return validArtifact(validation.output);
}

function validateComposition(value: unknown, targetRef: string): ArtifactValidation<Composition2D> {
  const validation = validateGeometryV1(value);
  if (validation.status !== "ok" || validation.output === null || validation.output.kind !== "composition-2d") {
    return failedArtifact(missingArtifactSource(targetRef, "Artifact composition source must be a valid Composition2D."));
  }
  return validArtifact(validation.output);
}

function validateConstructionSource(value: unknown): ArtifactValidation<ConstructionV1> {
  const validation = validateConstructionV1(value);
  if (validation.status !== "ok" || validation.output === null) {
    return failedArtifact(missingArtifactSource("construction", "Artifact construction source must be a valid ConstructionV1."));
  }
  return validArtifact(validation.output);
}

function validateMeasurementSource(value: unknown, targetRef: string): ArtifactValidation<MeasurementResultV1> {
  const validation = validateMeasurementResultV1(value);
  if (validation.status !== "ok" || validation.output === null) {
    return failedArtifact(missingArtifactSource(targetRef, "Artifact measurement source must be a valid MeasurementResultV1."));
  }
  return validArtifact(validation.output);
}

function validateEvaluationSource(value: unknown, targetRef: string): ArtifactValidation<EvaluationV1> {
  const validation = validateEvaluationV1(value);
  if (validation.status !== "ok" || validation.output === null) {
    return failedArtifact(missingArtifactSource(targetRef, "Artifact evaluation source must be a valid EvaluationV1."));
  }
  return validArtifact(validation.output);
}

function validateComparisonSource(value: unknown, targetRef: string): ArtifactValidation<ComparisonV1> {
  const validation = validateComparisonV1(value);
  if (validation.status !== "ok" || validation.output === null) {
    return failedArtifact(missingArtifactSource(targetRef, "Artifact comparison source must be a valid ComparisonV1."));
  }
  return validArtifact(validation.output);
}

function validateDecisionSource(value: unknown, targetRef: string, comparison?: ComparisonV1): ArtifactValidation<DecisionV1> {
  const validation = comparison === undefined ? validateDecisionV1(value) : validateDecisionV1(value, comparison);
  if (validation.status !== "ok" || validation.output === null) {
    return failedArtifact(sourceMismatch(targetRef, "Artifact decision source must match the supplied ComparisonV1."));
  }
  return validArtifact(validation.output);
}

function validateExplanationSource(
  value: unknown,
  comparison?: ComparisonV1,
  decision?: DecisionV1,
): ArtifactValidation<StructuredExplanationV1> {
  const validation = validateStructuredExplanationV1(value, comparison, decision);
  if (validation.status !== "ok" || validation.output === null) {
    return failedArtifact(sourceMismatch("structuredExplanation", "Artifact explanation source must match supplied PR9 sources."));
  }
  return validArtifact(validation.output);
}

function validateArtifactStructure(value: unknown): ArtifactValidation<ArtifactV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, ARTIFACT_ALLOWED_KEYS) !== null) {
    return failedArtifact(invalidArtifact("artifact", "Artifact V1 must be closed and structured."));
  }
  if (containsNonFiniteNumber(value)) {
    return failedArtifact(invalidArtifact("artifact", "Artifact V1 cannot contain non-finite numeric values."));
  }
  if (value.kind !== "artifact"
    || value.schemaVersion !== ARTIFACT_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.artifactRef)
    || !isArtifactType(value.artifactType)
    || !isArtifactStatus(value.status)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || hasDuplicateSourceRefs(value.sourceRefs)
    || !isValidRunRefOrNull(value.runRef)
    || !isArtifactWarningArray(value.warnings)
    || !isArtifactLossArray(value.losses)
    || !isValidStaleEvidenceOrNull(value.staleEvidence)
    || !isProvenance(value.provenance)
    || !isRecord(value.payload)) {
    return failedArtifact(invalidArtifact("artifact", "Artifact V1 envelope is invalid."));
  }
  const artifact = value as unknown as ArtifactV1;
  if (artifact.sourceRefs.some((sourceRef) => isForbiddenArtifactSourceRef(sourceRef))) {
    return failedArtifact(artifactWouldBecomeSourceOfTruth("sourceRefs"));
  }
  const optionsValidation = validateOptionsForType(artifact.artifactType, artifact.options);
  if (!optionsValidation.ok) {
    return optionsValidation;
  }
  if (stableJson(optionsValidation.value) !== stableJson(artifact.options)) {
    return failedArtifact(invalidArtifact("options", "Artifact options do not match artifact type."));
  }
  const expectedStatus = statusForArtifact(artifact.staleEvidence, artifact.runRef, artifact.losses);
  if (artifact.status !== expectedStatus) {
    return failedArtifact(invalidArtifact("status", "Artifact status is inconsistent with stale evidence, runRef, and losses."));
  }
  if (artifact.status === "stale" && !artifact.warnings.some((warning) => warning.code === "StaleArtifact")) {
    return failedArtifact(invalidArtifact("warnings", "Stale artifacts require a StaleArtifact warning."));
  }
  if (artifact.status === "non_replayable" && !artifact.warnings.some((warning) => warning.code === "MissingRunRef")) {
    return failedArtifact(invalidArtifact("warnings", "Non-replayable artifacts require a MissingRunRef warning."));
  }
  if (!provenanceCoversArtifact(artifact)) {
    return failedArtifact(invalidArtifact("provenance", "Artifact provenance must cover source refs, operation, and runRef when supplied."));
  }
  const expectedRef = artifactRefFor(
    artifact.artifactType,
    artifact.sourceRefs,
    artifact.options,
    artifact.runRef,
    artifact.staleEvidence,
  );
  if (artifact.artifactRef !== expectedRef) {
    return failedArtifact(invalidArtifact("artifactRef", "Artifact ref is not canonical for sources, options, runRef, and stale evidence."));
  }
  const payloadFailure = validatePayloadForArtifact(artifact);
  if (payloadFailure !== null) {
    return failedArtifact(payloadFailure);
  }
  return validArtifact(artifact);
}

function validatePayloadForArtifact(artifact: ArtifactV1): CoreResult | null {
  if (artifact.artifactType === "structured-result") {
    return validateStructuredPayload(artifact.payload);
  }
  if (artifact.artifactType === "construction-summary") {
    return validateSummaryPayload(artifact.payload);
  }
  if (artifact.artifactType === "evaluation-report") {
    return validateReportPayload(artifact.payload);
  }
  if (artifact.artifactType === "explanation") {
    return validateExplanationPayload(artifact.payload);
  }
  return validateVisualPayload(artifact.payload);
}

function validateStructuredPayload(payload: StructuredResultArtifactPayloadV1): CoreResult | null {
  if (!isRecord(payload)
    || firstUnsupportedKey(payload, STRUCTURED_PAYLOAD_ALLOWED_KEYS) !== null
    || payload.kind !== "structured-result-payload"
    || !(payload.construction === null || isRecord(payload.construction))
    || !Array.isArray(payload.measurementResults)
    || !payload.measurementResults.every((item) => isRecord(item))
    || !Array.isArray(payload.evaluations)
    || !payload.evaluations.every((item) => isRecord(item))
    || !(payload.comparison === null || isRecord(payload.comparison))
    || !(payload.decision === null || isRecord(payload.decision))
    || !(payload.structuredExplanation === null || isRecord(payload.structuredExplanation))
    || !isStringArray(payload.sourceKinds)
    || !isSourceReferenceArray(payload.sourceSchemaVersions)
    || !isSourceReferenceArray(payload.omittedSourceRefs)) {
    return invalidArtifact("payload", "StructuredResultArtifact payload is invalid.");
  }
  if (payload.construction !== null && !isConstructionProjection(payload.construction)) {
    return invalidArtifact("payload.construction", "StructuredResultArtifact construction projection is invalid.");
  }
  if (!payload.measurementResults.every(isMeasurementProjection)) {
    return invalidArtifact("payload.measurementResults", "StructuredResultArtifact measurement projections are invalid.");
  }
  if (!payload.evaluations.every(isEvaluationProjection)) {
    return invalidArtifact("payload.evaluations", "StructuredResultArtifact evaluation projections are invalid.");
  }
  if (payload.comparison !== null && !isComparisonProjection(payload.comparison)) {
    return invalidArtifact("payload.comparison", "StructuredResultArtifact comparison projection is invalid.");
  }
  if (payload.decision !== null && !isDecisionProjection(payload.decision)) {
    return invalidArtifact("payload.decision", "StructuredResultArtifact decision projection is invalid.");
  }
  if (payload.structuredExplanation !== null && !isStructuredSourceExplanationProjection(payload.structuredExplanation)) {
    return invalidArtifact("payload.structuredExplanation", "StructuredResultArtifact explanation projection is invalid.");
  }
  return null;
}

function validateSummaryPayload(payload: ConstructionSummaryArtifactPayloadV1): CoreResult | null {
  if (!isRecord(payload)
    || firstUnsupportedKey(payload, SUMMARY_PAYLOAD_ALLOWED_KEYS) !== null
    || payload.kind !== "construction-summary-payload"
    || !isNonEmptyString(payload.constructionRef)
    || !isNonEmptyString(payload.inputRef)
    || !isNonEmptyString(payload.packRef)
    || !isNonEmptyString(payload.ruleSetRef)
    || !isStringArray(payload.appliedRuleRefs)
    || !isNonNegativeInteger(payload.guideCount)
    || !isStringArray(payload.guideRefs)
    || !Array.isArray(payload.guides)
    || !isNonNegativeInteger(payload.zoneCount)
    || !isStringArray(payload.zoneRefs)
    || !Array.isArray(payload.zones)
    || !isNonNegativeInteger(payload.gridCount)
    || !isStringArray(payload.gridRefs)
    || !Array.isArray(payload.grids)
    || !isNonNegativeInteger(payload.cellCount)
    || !isStringArray(payload.cellRefs)
    || !isNonNegativeInteger(payload.intersectionCount)
    || !isStringArray(payload.intersectionRefs)
    || !Array.isArray(payload.intersections)
    || !isStringArray(payload.constructionWarnings)) {
    return invalidArtifact("payload", "ConstructionSummaryArtifact payload is invalid.");
  }
  if (payload.guideCount !== payload.guideRefs.length
    || payload.guideCount !== payload.guides.length
    || payload.zoneCount !== payload.zoneRefs.length
    || payload.zoneCount !== payload.zones.length
    || payload.gridCount !== payload.gridRefs.length
    || payload.gridCount !== payload.grids.length
    || payload.intersectionCount !== payload.intersectionRefs.length
    || payload.intersectionCount !== payload.intersections.length) {
    return invalidArtifact("payload.counts", "Construction summary counts must match projected refs.");
  }
  const gridCellRefs = payload.grids.flatMap((grid) => grid.cellRefs);
  if (payload.cellCount !== payload.cellRefs.length || !sameStringList(payload.cellRefs, gridCellRefs)) {
    return invalidArtifact("payload.cellCount", "Construction summary cell refs must match grid cell refs.");
  }
  if (!payload.guides.every(isConstructionGuideSummary)
    || !payload.zones.every(isConstructionZoneSummary)
    || !payload.grids.every(isConstructionGridSummary)
    || !payload.intersections.every(isConstructionIntersectionSummary)
    || !(payload.traceSummary === null || isConstructionTraceSummary(payload.traceSummary))) {
    return invalidArtifact("payload", "ConstructionSummaryArtifact nested payload is invalid.");
  }
  return null;
}

function validateReportPayload(payload: EvaluationReportArtifactPayloadV1): CoreResult | null {
  if (!isRecord(payload)
    || firstUnsupportedKey(payload, REPORT_PAYLOAD_ALLOWED_KEYS) !== null
    || payload.kind !== "evaluation-report-payload"
    || !isRecord(payload.evaluation)
    || !(payload.comparison === null || isRecord(payload.comparison))
    || !(payload.decision === null || isRecord(payload.decision))
    || !(payload.structuredExplanation === null || isRecord(payload.structuredExplanation))
    || !(payload.humanSummary === null || isNonEmptyString(payload.humanSummary))) {
    return invalidArtifact("payload", "EvaluationReportArtifact payload is invalid.");
  }
  if (!isReportEvaluationProjection(payload.evaluation)) {
    return invalidArtifact("payload.evaluation", "EvaluationReportArtifact evaluation projection is invalid.");
  }
  if (payload.comparison !== null && !isReportComparisonProjection(payload.comparison)) {
    return invalidArtifact("payload.comparison", "EvaluationReportArtifact comparison projection is invalid.");
  }
  if (payload.decision !== null && !isReportDecisionProjection(payload.decision)) {
    return invalidArtifact("payload.decision", "EvaluationReportArtifact decision projection is invalid.");
  }
  if (payload.structuredExplanation !== null && !isReportStructuredExplanationProjection(payload.structuredExplanation)) {
    return invalidArtifact("payload.structuredExplanation", "EvaluationReportArtifact explanation projection is invalid.");
  }
  if (payload.humanSummary !== null && containsForbiddenHumanTerm(payload.humanSummary)) {
    return invalidArtifact("payload.humanSummary", "Evaluation report summary contains unsupported claim language.");
  }
  return null;
}

function validateExplanationPayload(payload: ExplanationArtifactPayloadV1): CoreResult | null {
  if (!isRecord(payload)
    || firstUnsupportedKey(payload, EXPLANATION_PAYLOAD_ALLOWED_KEYS) !== null
    || payload.kind !== "explanation-payload"
    || !isNonEmptyString(payload.explanationRef)
    || !isNonEmptyString(payload.comparisonRef)
    || !isNonEmptyString(payload.decisionRef)
    || !isNonEmptyString(payload.claimCode)
    || !isRecord(payload.facts)
    || !isStringArray(payload.warningCodes)
    || !(payload.summary === null || isNonEmptyString(payload.summary))
    || !(payload.structuredExplanation === null || isRecord(payload.structuredExplanation))) {
    return invalidArtifact("payload", "ExplanationArtifact payload is invalid.");
  }
  if (!isStructuredExplanationFactsProjection(payload.facts)
    || !(payload.limits === null || isComparisonLimitsProjection(payload.limits))
    || !(payload.structuredExplanation === null || isStructuredExplanationProjection(payload.structuredExplanation))) {
    return invalidArtifact("payload", "ExplanationArtifact nested payload is invalid.");
  }
  if (payload.summary !== null && containsForbiddenHumanTerm(payload.summary)) {
    return invalidArtifact("payload.summary", "Explanation summary contains unsupported claim language.");
  }
  return null;
}

function validateVisualPayload(payload: SimpleVisualArtifactPayloadV1): CoreResult | null {
  if (!isRecord(payload)
    || firstUnsupportedKey(payload, VISUAL_PAYLOAD_ALLOWED_KEYS) !== null
    || payload.kind !== "simple-visual-payload"
    || payload.format !== "svg"
    || payload.mediaType !== "image/svg+xml"
    || payload.styleVersion !== "simple-v1"
    || !isRecord(payload.coordinateMapping)
    || !isRecord(payload.viewport)
    || !isNonEmptyString(payload.svg)) {
    return invalidArtifact("payload", "SimpleVisualArtifact payload is invalid.");
  }
  if (!isVisualCoordinateMapping(payload.coordinateMapping) || !isVisualViewport(payload.viewport)) {
    return invalidArtifact("payload", "SimpleVisualArtifact coordinate mapping or viewport is invalid.");
  }
  if (/<script\b/i.test(payload.svg)
    || /\son[a-z]+\s*=/i.test(payload.svg)
    || /<foreignObject\b/i.test(payload.svg)
    || /\shref\s*=/i.test(payload.svg)
    || /<image\b/i.test(payload.svg)) {
    return invalidArtifact("payload.svg", "SimpleVisualArtifact SVG contains forbidden active or external content.");
  }
  return null;
}

function isConstructionProjection(value: unknown): boolean {
  return isSourceProjection(value, "construction", "constructionRef");
}

function isMeasurementProjection(value: unknown): boolean {
  return isSourceProjection(value, "measurement-result", "measurementResultRef");
}

function isEvaluationProjection(value: unknown): boolean {
  return isSourceProjection(value, "evaluation", "evaluationRef");
}

function isComparisonProjection(value: unknown): boolean {
  return isSourceProjection(value, "comparison", "comparisonRef");
}

function isDecisionProjection(value: unknown): boolean {
  return isSourceProjection(value, "decision", "decisionRef");
}

function isStructuredSourceExplanationProjection(value: unknown): boolean {
  return isSourceProjection(value, "structured-explanation", "explanationRef");
}

function isSourceProjection(value: unknown, kind: string, refKey: string): boolean {
  return isRecord(value)
    && value.kind === kind
    && isNonEmptyString(value.schemaVersion)
    && isNonEmptyString(value[refKey])
    && !artifactWouldBecomeSource(value);
}

function isStructuredExplanationProjection(value: unknown, comparison?: ComparisonV1, decision?: DecisionV1): boolean {
  const validation = validateStructuredExplanationV1(value, comparison, decision);
  return validation.status === "ok" && validation.output !== null;
}

function isConstructionGuideSummary(value: unknown): value is ConstructionGuideSummaryV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, CONSTRUCTION_GUIDE_SUMMARY_ALLOWED_KEYS) === null
    && value.kind === "construction-guide-summary"
    && isNonEmptyString(value.guideRef)
    && (value.orientation === "vertical" || value.orientation === "horizontal")
    && isFiniteNumber(value.position)
    && isSegment(value.segment);
}

function isConstructionZoneSummary(value: unknown): value is ConstructionZoneSummaryV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, CONSTRUCTION_ZONE_SUMMARY_ALLOWED_KEYS) === null
    && value.kind === "construction-zone-summary"
    && isNonEmptyString(value.zoneRef)
    && (value.partitionAxis === "vertical" || value.partitionAxis === "horizontal")
    && isRect(value.bounds)
    && isStringArray(value.boundingGuideRefs);
}

function isConstructionGridSummary(value: unknown): value is ConstructionGridSummaryV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, CONSTRUCTION_GRID_SUMMARY_ALLOWED_KEYS) === null
    && value.kind === "construction-grid-summary"
    && isNonEmptyString(value.gridRef)
    && isNonNegativeInteger(value.rowCount)
    && isNonNegativeInteger(value.columnCount)
    && isStringArray(value.cellRefs);
}

function isConstructionIntersectionSummary(value: unknown): value is ConstructionIntersectionSummaryV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, CONSTRUCTION_INTERSECTION_SUMMARY_ALLOWED_KEYS) === null
    && value.kind === "construction-intersection-summary"
    && isNonEmptyString(value.intersectionRef)
    && isPoint(value.point)
    && isStringArray(value.sourceGeometryRefs);
}

function isConstructionTraceSummary(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, CONSTRUCTION_TRACE_SUMMARY_ALLOWED_KEYS) === null
    && value.kind === "construction-trace-summary"
    && isStringArray(value.operationRefs)
    && isStringArray(value.createdObjectRefs)
    && isStringArray(value.warnings);
}

function isReportEvaluationProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, REPORT_EVALUATION_ALLOWED_KEYS) === null
    && value.kind === "evaluation-report-evaluation"
    && isNonEmptyString(value.evaluationRef)
    && isNonEmptyString(value.measurementResultRef)
    && isNonEmptyString(value.compositionRef)
    && isNullableNonEmptyString(value.constructionRef)
    && isNonEmptyString(value.profileRef)
    && isNonEmptyString(value.packRef)
    && isNullableNonEmptyString(value.ruleSetRef)
    && isNormalizedFiniteNumber(value.overallScore)
    && isNormalizedFiniteNumber(value.confidence)
    && isConfidenceStatus(value.confidenceStatus)
    && isEvaluationStatus(value.status)
    && Array.isArray(value.componentScores)
    && value.componentScores.every(isReportComponentScoreProjection)
    && isSourceReferenceArray(value.sourceMeasurementRefs)
    && Array.isArray(value.warnings)
    && value.warnings.every(isRecord)
    && (value.limits === null || isRecord(value.limits));
}

function isReportComponentScoreProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, REPORT_COMPONENT_SCORE_ALLOWED_KEYS) === null
    && value.kind === "evaluation-report-component-score"
    && isNonEmptyString(value.componentRef)
    && isNonEmptyString(value.componentType)
    && isNormalizedFiniteNumber(value.normalizedScore)
    && isNonNegativeFiniteNumber(value.effectiveWeight)
    && isNonNegativeFiniteNumber(value.weightedContribution)
    && isStringArray(value.measurementRefs);
}

function isReportComparisonProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, REPORT_COMPARISON_ALLOWED_KEYS) === null
    && value.kind === "evaluation-report-comparison"
    && isNonEmptyString(value.comparisonRef)
    && isComparisonStatus(value.status)
    && isNormalizedFiniteNumber(value.scoreA)
    && isNormalizedFiniteNumber(value.scoreB)
    && isFiniteNumber(value.signedScoreDelta)
    && isNonNegativeFiniteNumber(value.absoluteScoreDelta)
    && isNormalizedFiniteNumber(value.confidenceA)
    && isNormalizedFiniteNumber(value.confidenceB);
}

function isReportDecisionProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, REPORT_DECISION_ALLOWED_KEYS) === null
    && value.kind === "evaluation-report-decision"
    && isNonEmptyString(value.decisionRef)
    && isComparisonStatus(value.status)
    && isNullableNonEmptyString(value.selectedEvaluationRef)
    && isNullableNonEmptyString(value.selectedCompositionRef);
}

function isReportStructuredExplanationProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, REPORT_STRUCTURED_EXPLANATION_ALLOWED_KEYS) === null
    && value.kind === "evaluation-report-structured-explanation"
    && isNonEmptyString(value.explanationRef)
    && isStructuredExplanationClaimCode(value.claimCode)
    && isStructuredExplanationFactsProjection(value.facts)
    && isStringArray(value.warningCodes);
}

function isStructuredExplanationFactsProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, STRUCTURED_EXPLANATION_FACTS_ALLOWED_KEYS) === null
    && value.kind === "structured-explanation-facts"
    && isComparisonStatus(value.status)
    && isNormalizedFiniteNumber(value.scoreA)
    && isNormalizedFiniteNumber(value.scoreB)
    && isFiniteNumber(value.signedScoreDelta)
    && isNonNegativeFiniteNumber(value.absoluteScoreDelta)
    && isNonNegativeFiniteNumber(value.tieTolerance)
    && isNormalizedFiniteNumber(value.confidenceA)
    && isNormalizedFiniteNumber(value.confidenceB)
    && isNullableNonEmptyString(value.selectedEvaluationRef)
    && isNullableNonEmptyString(value.selectedCompositionRef)
    && Array.isArray(value.contextMismatches)
    && value.contextMismatches.every(isComparisonContextCheck)
    && isStringArray(value.warningCodes);
}

function isComparisonContextCheck(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, COMPARISON_CONTEXT_CHECK_ALLOWED_KEYS) === null
    && value.kind === "comparison-context-check"
    && isNonEmptyString(value.field)
    && isNullableNonEmptyString(value.aValue)
    && isNullableNonEmptyString(value.bValue)
    && typeof value.matches === "boolean";
}

function isComparisonLimitsProjection(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, COMPARISON_LIMITS_ALLOWED_KEYS) === null
    && value.kind === "comparison-limits"
    && isNonNegativeFiniteNumber(value.tieTolerance)
    && isNormalizedFiniteNumber(value.minimumConfidence)
    && value.ambiguousEvaluationPolicy === "do_not_select"
    && Array.isArray(value.statusPrecedence)
    && value.statusPrecedence.length === COMPARISON_V1_STATUSES.length
    && value.statusPrecedence.every(isComparisonStatus);
}

function isVisualCoordinateMapping(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, VISUAL_COORDINATE_MAPPING_ALLOWED_KEYS) === null
    && value.kind === "coordinate-mapping"
    && value.sourceCoordinateSystem === "norma-bottom-left-normalized"
    && value.targetCoordinateSystem === "svg-top-left"
    && value.normalizedPoint === NORMALIZED_POINT_MAPPING
    && value.normalizedRect === NORMALIZED_RECT_MAPPING;
}

function isVisualViewport(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, VISUAL_VIEWPORT_ALLOWED_KEYS) === null
    && value.kind === "svg-viewport"
    && isPositiveFiniteNumber(value.width)
    && isPositiveFiniteNumber(value.height)
    && isNonNegativeFiniteNumber(value.padding)
    && isPositiveFiniteNumber(value.drawableWidth)
    && isPositiveFiniteNumber(value.drawableHeight)
    && numbersEqual(value.drawableWidth, value.width - value.padding * 2)
    && numbersEqual(value.drawableHeight, value.height - value.padding * 2);
}

function validateStructuredOptions(value: unknown): ArtifactValidation<StructuredResultArtifactOptionsV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, STRUCTURED_OPTIONS_ALLOWED_KEYS) !== null) {
    return failedArtifact(unsupportedArtifactOption("options", "Structured result options are closed."));
  }
  if (value.kind !== "artifact-options"
    || value.artifactType !== "structured-result"
    || !areBooleans([
      value.includeConstruction,
      value.includeMeasurements,
      value.includeEvaluation,
      value.includeComparison,
      value.includeDecision,
      value.includeExplanation,
      value.includeWarnings,
      value.includeProvenance,
    ])) {
    return failedArtifact(unsupportedArtifactOption("options", "Structured result options are invalid."));
  }
  return validArtifact(value as unknown as StructuredResultArtifactOptionsV1);
}

function validateConstructionSummaryOptions(value: unknown): ArtifactValidation<ConstructionSummaryArtifactOptionsV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, SUMMARY_OPTIONS_ALLOWED_KEYS) !== null) {
    return failedArtifact(unsupportedArtifactOption("options", "Construction summary options are closed."));
  }
  if (value.kind !== "artifact-options"
    || value.artifactType !== "construction-summary"
    || !areBooleans([value.includeTraceSummary, value.includeWarnings])) {
    return failedArtifact(unsupportedArtifactOption("options", "Construction summary options are invalid."));
  }
  return validArtifact(value as unknown as ConstructionSummaryArtifactOptionsV1);
}

function validateEvaluationReportOptions(value: unknown): ArtifactValidation<EvaluationReportArtifactOptionsV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, REPORT_OPTIONS_ALLOWED_KEYS) !== null) {
    return failedArtifact(unsupportedArtifactOption("options", "Evaluation report options are closed."));
  }
  if (value.kind !== "artifact-options"
    || value.artifactType !== "evaluation-report"
    || !areBooleans([
      value.includeComparison,
      value.includeDecision,
      value.includeExplanation,
      value.includeHumanSummary,
      value.includeWarnings,
      value.includeLimits,
    ])) {
    return failedArtifact(unsupportedArtifactOption("options", "Evaluation report options are invalid."));
  }
  return validArtifact(value as unknown as EvaluationReportArtifactOptionsV1);
}

function validateExplanationOptions(value: unknown): ArtifactValidation<ExplanationArtifactOptionsV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, EXPLANATION_OPTIONS_ALLOWED_KEYS) !== null) {
    return failedArtifact(unsupportedArtifactOption("options", "Explanation artifact options are closed."));
  }
  if (value.kind !== "artifact-options"
    || value.artifactType !== "explanation"
    || !areBooleans([
      value.includeStructuredSource,
      value.includeHumanSummary,
      value.includeWarnings,
      value.includeLimits,
    ])) {
    return failedArtifact(unsupportedArtifactOption("options", "Explanation artifact options are invalid."));
  }
  return validArtifact(value as unknown as ExplanationArtifactOptionsV1);
}

function validateSimpleVisualOptions(value: unknown): ArtifactValidation<SimpleVisualArtifactOptionsV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, VISUAL_OPTIONS_ALLOWED_KEYS) !== null) {
    return failedArtifact(unsupportedArtifactOption("options", "Simple visual options are closed."));
  }
  const viewportWidth = value.viewportWidth;
  const viewportHeight = value.viewportHeight;
  const padding = value.padding;
  const coordinatePrecision = value.coordinatePrecision;
  if (value.kind !== "artifact-options"
    || value.artifactType !== "simple-visual"
    || value.format !== "svg"
    || value.mediaType !== "image/svg+xml"
    || value.styleVersion !== "simple-v1"
    || !isPositiveFiniteNumber(viewportWidth)
    || !isPositiveFiniteNumber(viewportHeight)
    || !isNonNegativeFiniteNumber(padding)
    || typeof coordinatePrecision !== "number"
    || !Number.isInteger(coordinatePrecision)
    || coordinatePrecision < 0
    || coordinatePrecision > 6
    || !areBooleans([
      value.includeSurface,
      value.includeZones,
      value.includeGridCells,
      value.includeGuides,
      value.includeIntersections,
      value.includeElements,
      value.includeLabels,
      value.includeWarnings,
    ])) {
    return failedArtifact(unsupportedArtifactOption("options", "Simple visual options are invalid."));
  }
  if (padding * 2 >= Math.min(viewportWidth, viewportHeight)) {
    return failedArtifact(unsupportedArtifactOption("padding", "Simple visual padding must leave drawable area."));
  }
  return validArtifact(value as unknown as SimpleVisualArtifactOptionsV1);
}

function validateOptionsForType(type: ArtifactTypeV1, options: unknown): ArtifactValidation<ArtifactOptionsV1> {
  if (type === "structured-result") return validateStructuredOptions(options);
  if (type === "construction-summary") return validateConstructionSummaryOptions(options);
  if (type === "evaluation-report") return validateEvaluationReportOptions(options);
  if (type === "explanation") return validateExplanationOptions(options);
  return validateSimpleVisualOptions(options);
}

function createArtifactEnvelope<TType extends ArtifactTypeV1, TOptions extends ArtifactOptionsV1, TPayload>(
  type: TType,
  request: ValidArtifactRequest<TOptions>,
  inputLosses: readonly ArtifactLossV1[],
  inputWarnings: readonly ArtifactWarningV1[],
  payload: TPayload,
  operationName: string,
): ArtifactEnvelopeV1<TType, TOptions, TPayload> {
  const seed = envelopeSeedFor(type, request, inputLosses, inputWarnings, operationName);
  return { ...seed, payload };
}

function envelopeSeedFor<TType extends ArtifactTypeV1, TOptions extends ArtifactOptionsV1>(
  type: TType,
  request: ValidArtifactRequest<TOptions>,
  inputLosses: readonly ArtifactLossV1[],
  inputWarnings: readonly ArtifactWarningV1[],
  operationName = "core.artifacts-v1.createSimpleVisual",
): Omit<ArtifactEnvelopeV1<TType, TOptions, unknown>, "payload"> {
  const replayLosses = request.runRef === null
    ? [artifactLoss("NonReplayableProjection", "Artifact has no conceptual runRef and cannot be replayed.", request.sources.sourceRefs)]
    : [];
  const losses = uniqueLosses([...inputLosses, ...replayLosses]);
  const replayWarnings = request.runRef === null
    ? [artifactWarning("MissingRunRef", type, request.sources.sourceRefs)]
    : [];
  const staleWarnings = request.staleEvidence === null
    ? []
    : [artifactWarning("StaleArtifact", type, request.staleEvidence.sourceRefs)];
  const warnings = uniqueWarnings([...inputWarnings, ...replayWarnings, ...staleWarnings]);
  const artifactRef = artifactRefFor(type, request.sources.sourceRefs, request.options, request.runRef, request.staleEvidence);
  const provenanceInputRefs = uniqueSourceRefs([
    ...request.sources.sourceRefs,
    ...(request.runRef === null ? [] : [{ kind: "run", ref: request.runRef.id }]),
  ]);
  return {
    kind: "artifact",
    schemaVersion: ARTIFACT_V1_SCHEMA_VERSION,
    artifactRef,
    artifactType: type,
    status: statusForArtifact(request.staleEvidence, request.runRef, losses),
    sourceRefs: request.sources.sourceRefs,
    runRef: request.runRef,
    options: request.options,
    warnings,
    losses,
    staleEvidence: request.staleEvidence,
    provenance: createArtifactProvenance(operationName, provenanceInputRefs),
  };
}

function artifactOk<TArtifact extends ArtifactV1>(artifact: TArtifact): CoreResult<TArtifact> {
  const validation = validateArtifactStructure(artifact);
  if (!validation.ok) {
    return validation.result as CoreResult<TArtifact>;
  }
  return artifactResult(artifact);
}

function artifactResult<TArtifact extends ArtifactV1>(artifact: TArtifact): CoreResult<TArtifact> {
  return createArtifactResult({
    status: "ok",
    provenance: artifact.provenance,
    outputRefs: [{ kind: "artifact", ref: artifact.artifactRef }],
    runRef: artifact.runRef,
    output: artifact,
  });
}

function recreateArtifact(artifact: ArtifactV1, sourceBundle: unknown): CoreResult<ArtifactV1> {
  const request = {
    kind: "artifact-request",
    schemaVersion: ARTIFACT_REQUEST_V1_SCHEMA_VERSION,
    sources: sourceBundle,
    options: artifact.options,
    runRef: artifact.runRef,
    staleEvidence: artifact.staleEvidence,
  };
  if (artifact.artifactType === "structured-result") return createStructuredResultArtifactV1(request) as CoreResult<ArtifactV1>;
  if (artifact.artifactType === "construction-summary") return createConstructionSummaryArtifactV1(request) as CoreResult<ArtifactV1>;
  if (artifact.artifactType === "evaluation-report") return createEvaluationReportArtifactV1(request) as CoreResult<ArtifactV1>;
  if (artifact.artifactType === "explanation") return createExplanationArtifactV1(request) as CoreResult<ArtifactV1>;
  return createSimpleVisualArtifactV1(request) as CoreResult<ArtifactV1>;
}

function constructionSummaryPayload(
  construction: ConstructionV1,
  options: ConstructionSummaryArtifactOptionsV1,
): ConstructionSummaryArtifactPayloadV1 {
  const guides = construction.guides.map((guide) => ({
    kind: "construction-guide-summary" as const,
    guideRef: guide.guideRef,
    orientation: guide.orientation,
    position: guide.position,
    segment: deepClone(guide.segment),
  }));
  const zones = construction.zones.map((zone) => ({
    kind: "construction-zone-summary" as const,
    zoneRef: zone.zoneRef,
    partitionAxis: zone.partitionAxis,
    bounds: deepClone(zone.bounds),
    boundingGuideRefs: [...zone.boundingGuideRefs],
  }));
  const grids = construction.grids.map((grid) => ({
    kind: "construction-grid-summary" as const,
    gridRef: grid.gridRef,
    rowCount: grid.rowCount,
    columnCount: grid.columnCount,
    cellRefs: grid.cells.map((cell) => cell.cellRef),
  }));
  const intersections = construction.intersections.map((intersection) => ({
    kind: "construction-intersection-summary" as const,
    intersectionRef: intersection.intersectionRef,
    point: deepClone(intersection.point),
    sourceGeometryRefs: [...intersection.sourceGeometryRefs],
  }));
  const cellRefs = construction.grids.flatMap((grid) => grid.cells.map((cell) => cell.cellRef));

  return {
    kind: "construction-summary-payload",
    constructionRef: construction.constructionRef,
    inputRef: construction.inputRef,
    packRef: construction.packRef,
    ruleSetRef: construction.ruleSetRef,
    appliedRuleRefs: [...construction.appliedRuleRefs],
    guideCount: guides.length,
    guideRefs: guides.map((guide) => guide.guideRef),
    guides,
    zoneCount: zones.length,
    zoneRefs: zones.map((zone) => zone.zoneRef),
    zones,
    gridCount: grids.length,
    gridRefs: grids.map((grid) => grid.gridRef),
    grids,
    cellCount: cellRefs.length,
    cellRefs,
    intersectionCount: intersections.length,
    intersectionRefs: intersections.map((intersection) => intersection.intersectionRef),
    intersections,
    traceSummary: options.includeTraceSummary
      ? {
          kind: "construction-trace-summary",
          operationRefs: [...construction.constructionTrace.operationRefs],
          createdObjectRefs: [...construction.constructionTrace.createdObjectRefs],
          warnings: [...construction.constructionTrace.warnings],
        }
      : null,
    constructionWarnings: options.includeWarnings ? [...construction.constructionTrace.warnings] : [],
  };
}

function evaluationReportPayload(
  evaluation: EvaluationV1,
  sources: ValidArtifactSources,
  options: EvaluationReportArtifactOptionsV1,
): EvaluationReportArtifactPayloadV1 {
  const comparison = options.includeComparison && sources.comparison !== undefined ? sources.comparison : null;
  const decision = options.includeDecision && sources.decision !== undefined ? sources.decision : null;
  const explanation = options.includeExplanation && sources.structuredExplanation !== undefined ? sources.structuredExplanation : null;
  return {
    kind: "evaluation-report-payload",
    evaluation: {
      kind: "evaluation-report-evaluation",
      evaluationRef: evaluation.evaluationRef,
      measurementResultRef: evaluation.measurementResultRef,
      compositionRef: evaluation.compositionRef,
      constructionRef: evaluation.constructionRef,
      profileRef: evaluation.profileRef,
      packRef: evaluation.packRef,
      ruleSetRef: evaluation.ruleSetRef,
      overallScore: evaluation.score.overallScore,
      confidence: evaluation.confidence.value,
      confidenceStatus: evaluation.confidence.status,
      status: evaluation.status,
      componentScores: evaluation.componentScores.map((componentScore) => ({
        kind: "evaluation-report-component-score",
        componentRef: componentScore.componentRef,
        componentType: componentScore.componentType,
        normalizedScore: componentScore.normalizedScore,
        effectiveWeight: componentScore.effectiveWeight,
        weightedContribution: componentScore.weightedContribution,
        measurementRefs: [...componentScore.measurementRefs],
      })),
      sourceMeasurementRefs: evaluation.score.componentScoreRefs,
      warnings: options.includeWarnings ? deepClone(evaluation.warnings) : [],
      limits: options.includeLimits ? deepClone(evaluation.limits) : null,
    },
    comparison: comparison === null
      ? null
      : {
          kind: "evaluation-report-comparison",
          comparisonRef: comparison.comparisonRef,
          status: comparison.status,
          scoreA: comparison.scoreA,
          scoreB: comparison.scoreB,
          signedScoreDelta: comparison.signedScoreDelta,
          absoluteScoreDelta: comparison.absoluteScoreDelta,
          confidenceA: comparison.confidenceA,
          confidenceB: comparison.confidenceB,
        },
    decision: decision === null
      ? null
      : {
          kind: "evaluation-report-decision",
          decisionRef: decision.decisionRef,
          status: decision.status,
          selectedEvaluationRef: decision.selectedEvaluationRef,
          selectedCompositionRef: decision.selectedCompositionRef,
        },
    structuredExplanation: explanation === null
      ? null
      : {
          kind: "evaluation-report-structured-explanation",
          explanationRef: explanation.explanationRef,
          claimCode: explanation.claimCode,
          facts: deepClone(explanation.facts),
          warningCodes: [...explanation.facts.warningCodes],
        },
    humanSummary: options.includeHumanSummary ? humanSummaryForReport(evaluation, comparison, decision, explanation) : null,
  };
}

function humanSummaryForReport(
  evaluation: EvaluationV1,
  comparison: ComparisonV1 | null,
  decision: DecisionV1 | null,
  explanation: StructuredExplanationV1 | null,
): string {
  if (explanation !== null && decision !== null && comparison !== null) {
    return `${explanation.summary} Evaluation ${evaluation.evaluationRef} has score ${formatDeterministicNumber(evaluation.score.overallScore, 6)} and confidence ${formatDeterministicNumber(evaluation.confidence.value, 6)}.`;
  }
  return `Evaluation ${evaluation.evaluationRef} has score ${formatDeterministicNumber(evaluation.score.overallScore, 6)} and confidence ${formatDeterministicNumber(evaluation.confidence.value, 6)}.`;
}

function simpleVisualPayload(
  artifactRef: string,
  sources: ValidArtifactSources,
  options: SimpleVisualArtifactOptionsV1,
): SimpleVisualArtifactPayloadV1 {
  const width = options.viewportWidth;
  const height = options.viewportHeight;
  const padding = options.padding;
  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;
  const viewport = {
    kind: "svg-viewport" as const,
    width,
    height,
    padding,
    drawableWidth,
    drawableHeight,
  };
  const coordinateMapping = {
    kind: "coordinate-mapping" as const,
    sourceCoordinateSystem: "norma-bottom-left-normalized" as const,
    targetCoordinateSystem: "svg-top-left" as const,
    normalizedPoint: NORMALIZED_POINT_MAPPING,
    normalizedRect: NORMALIZED_RECT_MAPPING,
  };
  const parts: string[] = [
    `<svg height="${formatDeterministicNumber(height, 0)}" viewBox="0 0 ${formatDeterministicNumber(width, 0)} ${formatDeterministicNumber(height, 0)}" width="${formatDeterministicNumber(width, 0)}" xmlns="http://www.w3.org/2000/svg">`,
    `<metadata data-artifact-ref="${escapeXml(artifactRef)}" data-style-version="${options.styleVersion}">${coordinateMapping.normalizedRect}</metadata>`,
  ];
  if (options.includeSurface && sources.surface !== undefined) {
    parts.push(svgRect("surface", null, mapRect(sources.surface.bounds, viewport, options.coordinatePrecision), options.coordinatePrecision));
  }
  if (sources.construction !== undefined) {
    if (options.includeZones) {
      for (const zone of sources.construction.zones) {
        parts.push(svgRect("zone", zone.zoneRef, mapRect(zone.bounds, viewport, options.coordinatePrecision), options.coordinatePrecision));
      }
    }
    if (options.includeGridCells) {
      for (const cell of sources.construction.grids.flatMap((grid) => grid.cells)) {
        parts.push(svgRect("grid-cell", cell.cellRef, mapRect(cell.bounds, viewport, options.coordinatePrecision), options.coordinatePrecision));
      }
    }
    if (options.includeGuides) {
      for (const guide of sources.construction.guides) {
        parts.push(svgGuide(guide, viewport, options.coordinatePrecision));
      }
    }
    if (options.includeIntersections) {
      for (const intersection of sources.construction.intersections) {
        parts.push(svgIntersection(intersection, viewport, options.coordinatePrecision));
      }
    }
  }
  if (options.includeElements) {
    for (const element of elementsForVisual(sources)) {
      parts.push(svgRect("element", element.id, mapRect(element.geometry, viewport, options.coordinatePrecision), options.coordinatePrecision));
      if (options.includeLabels) {
        const point = mapPoint(
          { x: element.geometry.x, y: element.geometry.y + element.geometry.height },
          viewport,
          options.coordinatePrecision,
        );
        parts.push(`<text data-ref="${escapeXml(element.id)}" x="${point.x}" y="${point.y}">${escapeXml(element.id)}</text>`);
      }
    }
  }
  parts.push("</svg>");
  return {
    kind: "simple-visual-payload",
    format: "svg",
    mediaType: "image/svg+xml",
    styleVersion: "simple-v1",
    coordinateMapping,
    viewport,
    svg: parts.join(""),
  };
}

function elementsForVisual(sources: ValidArtifactSources): readonly Composition2D["elements"][number][] {
  if (sources.compositionA !== undefined) return sources.compositionA.elements;
  if (sources.composition !== undefined) return sources.composition.elements;
  if (sources.compositionB !== undefined) return sources.compositionB.elements;
  return [];
}

function mapPoint(point: { x: number; y: number }, viewport: SimpleVisualArtifactPayloadV1["viewport"], precision: number): { x: string; y: string } {
  return {
    x: formatDeterministicNumber(viewport.padding + point.x * viewport.drawableWidth, precision),
    y: formatDeterministicNumber(viewport.padding + (1 - point.y) * viewport.drawableHeight, precision),
  };
}

function mapRect(rect: Rect, viewport: SimpleVisualArtifactPayloadV1["viewport"], precision: number): { x: string; y: string; width: string; height: string } {
  return {
    x: formatDeterministicNumber(viewport.padding + rect.x * viewport.drawableWidth, precision),
    y: formatDeterministicNumber(viewport.padding + (1 - rect.y - rect.height) * viewport.drawableHeight, precision),
    width: formatDeterministicNumber(rect.width * viewport.drawableWidth, precision),
    height: formatDeterministicNumber(rect.height * viewport.drawableHeight, precision),
  };
}

function svgRect(kind: string, ref: string | null, rect: { x: string; y: string; width: string; height: string }, precision: number): string {
  void precision;
  if (kind === "surface") {
    return `<rect data-kind="surface" height="${rect.height}" width="${rect.width}" x="${rect.x}" y="${rect.y}" />`;
  }
  return `<rect data-ref="${escapeXml(ref ?? kind)}" height="${rect.height}" width="${rect.width}" x="${rect.x}" y="${rect.y}" />`;
}

function svgGuide(guide: GuideV1, viewport: SimpleVisualArtifactPayloadV1["viewport"], precision: number): string {
  if (guide.orientation === "vertical") {
    const x = formatDeterministicNumber(viewport.padding + guide.position * viewport.drawableWidth, precision);
    return `<line data-ref="${escapeXml(guide.guideRef)}" x1="${x}" x2="${x}" y1="${formatDeterministicNumber(viewport.padding, precision)}" y2="${formatDeterministicNumber(viewport.padding + viewport.drawableHeight, precision)}" />`;
  }
  const y = formatDeterministicNumber(viewport.padding + (1 - guide.position) * viewport.drawableHeight, precision);
  return `<line data-ref="${escapeXml(guide.guideRef)}" x1="${formatDeterministicNumber(viewport.padding, precision)}" x2="${formatDeterministicNumber(viewport.padding + viewport.drawableWidth, precision)}" y1="${y}" y2="${y}" />`;
}

function svgIntersection(intersection: IntersectionPointV1, viewport: SimpleVisualArtifactPayloadV1["viewport"], precision: number): string {
  const point = mapPoint({ x: intersection.point.x, y: intersection.point.y ?? 0 }, viewport, precision);
  return `<circle cx="${point.x}" cy="${point.y}" data-ref="${escapeXml(intersection.intersectionRef)}" r="2" />`;
}

function omittedSourceRefsForStructured(
  sources: ValidArtifactSources,
  options: StructuredResultArtifactOptionsV1,
): readonly SourceReference[] {
  const omitted: SourceReference[] = [];
  if (!options.includeConstruction && sources.construction !== undefined) omitted.push({ kind: "construction", ref: sources.construction.constructionRef });
  if (!options.includeMeasurements) omitted.push(...measurementResultsFor(sources).map((measurementResult) => ({ kind: "measurement-result", ref: measurementResult.measurementResultRef })));
  if (!options.includeEvaluation) omitted.push(...evaluationsFor(sources).map((evaluation) => ({ kind: "evaluation", ref: evaluation.evaluationRef })));
  if (!options.includeComparison && sources.comparison !== undefined) omitted.push({ kind: "comparison", ref: sources.comparison.comparisonRef });
  if (!options.includeDecision && sources.decision !== undefined) omitted.push({ kind: "decision", ref: sources.decision.decisionRef });
  if (!options.includeExplanation && sources.structuredExplanation !== undefined) omitted.push({ kind: "structured-explanation", ref: sources.structuredExplanation.explanationRef });
  return uniqueSourceRefs(omitted);
}

function lossesForOmittedSourceRefs(omittedSourceRefs: readonly SourceReference[]): readonly ArtifactLossV1[] {
  return omittedSourceRefs.length === 0
    ? []
    : [artifactLoss("OmittedSourceObject", "Structured result omitted available source objects by explicit options.", omittedSourceRefs)];
}

function projectSource(source: unknown, options: StructuredResultArtifactOptionsV1): unknown {
  return stripProjection(deepClone(source), options.includeWarnings, options.includeProvenance);
}

function stripProjection(value: unknown, includeWarnings: boolean, includeProvenance: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripProjection(item, includeWarnings, includeProvenance));
  }
  if (!isRecord(value)) {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!includeWarnings && key === "warnings") continue;
    if (!includeProvenance && key === "provenance") continue;
    output[key] = stripProjection(child, includeWarnings, includeProvenance);
  }
  return output;
}

function sourceSchemaVersionsFor(sources: ValidArtifactSources): readonly SourceReference[] {
  const schemaRefs: SourceReference[] = [];
  if (sources.construction !== undefined) schemaRefs.push({ kind: "construction-schema", ref: sources.construction.schemaVersion });
  for (const measurementResult of measurementResultsFor(sources)) schemaRefs.push({ kind: "measurement-result-schema", ref: measurementResult.schemaVersion });
  for (const evaluation of evaluationsFor(sources)) schemaRefs.push({ kind: "evaluation-schema", ref: evaluation.schemaVersion });
  if (sources.comparison !== undefined) schemaRefs.push({ kind: "comparison-schema", ref: sources.comparison.schemaVersion });
  if (sources.decision !== undefined) schemaRefs.push({ kind: "decision-schema", ref: sources.decision.schemaVersion });
  if (sources.structuredExplanation !== undefined) schemaRefs.push({ kind: "structured-explanation-schema", ref: sources.structuredExplanation.schemaVersion });
  return uniqueSourceRefs(schemaRefs);
}

function sourceRefsForSources(sources: Omit<ValidArtifactSources, "sourceRefs">): readonly SourceReference[] {
  const refs: SourceReference[] = [];
  if (sources.surface !== undefined) refs.push({ kind: "geometry", ref: sources.surface.id });
  if (sources.construction !== undefined) refs.push({ kind: "construction", ref: sources.construction.constructionRef });
  if (sources.composition !== undefined) refs.push({ kind: "composition", ref: sources.composition.id });
  if (sources.compositionA !== undefined) refs.push({ kind: "composition", ref: sources.compositionA.id });
  if (sources.compositionB !== undefined) refs.push({ kind: "composition", ref: sources.compositionB.id });
  if (sources.measurementResult !== undefined) refs.push({ kind: "measurement-result", ref: sources.measurementResult.measurementResultRef });
  if (sources.measurementResultA !== undefined) refs.push({ kind: "measurement-result", ref: sources.measurementResultA.measurementResultRef });
  if (sources.measurementResultB !== undefined) refs.push({ kind: "measurement-result", ref: sources.measurementResultB.measurementResultRef });
  if (sources.evaluation !== undefined) refs.push({ kind: "evaluation", ref: sources.evaluation.evaluationRef });
  if (sources.evaluationA !== undefined) refs.push({ kind: "evaluation", ref: sources.evaluationA.evaluationRef });
  if (sources.evaluationB !== undefined) refs.push({ kind: "evaluation", ref: sources.evaluationB.evaluationRef });
  if (sources.comparison !== undefined) refs.push({ kind: "comparison", ref: sources.comparison.comparisonRef });
  if (sources.decision !== undefined) refs.push({ kind: "decision", ref: sources.decision.decisionRef });
  if (sources.structuredExplanation !== undefined) refs.push({ kind: "structured-explanation", ref: sources.structuredExplanation.explanationRef });
  return refs;
}

function measurementResultsFor(sources: ValidArtifactSources): readonly MeasurementResultV1[] {
  return [
    sources.measurementResult,
    sources.measurementResultA,
    sources.measurementResultB,
  ].filter((value): value is MeasurementResultV1 => value !== undefined);
}

function evaluationsFor(sources: ValidArtifactSources): readonly EvaluationV1[] {
  return [
    sources.evaluation,
    sources.evaluationA,
    sources.evaluationB,
  ].filter((value): value is EvaluationV1 => value !== undefined);
}

function primaryEvaluation(sources: ValidArtifactSources): EvaluationV1 | undefined {
  return sources.evaluation ?? sources.evaluationA ?? sources.evaluationB;
}

function statusForArtifact(
  staleEvidence: ArtifactStaleEvidenceV1 | null,
  runRef: RunRef | null,
  losses: readonly ArtifactLossV1[],
): ArtifactStatusV1 {
  if (staleEvidence !== null) return "stale";
  if (runRef === null) return "non_replayable";
  if (losses.length > 0) return "lossy";
  return "current";
}

function artifactRefFor(
  artifactType: ArtifactTypeV1,
  sourceRefs: readonly SourceReference[],
  options: ArtifactOptionsV1,
  runRef: RunRef | null,
  staleEvidence: ArtifactStaleEvidenceV1 | null,
): string {
  const sourcePart = sourceRefs.map((sourceRef) => `${sourceRef.kind}:${sourceRef.ref}`).join("|");
  const runPart = runRef === null ? "run:none" : `run:${runRef.id}`;
  const stalePart = staleEvidence === null ? "stale:none" : `stale:${stableJson(staleEvidence)}`;
  return `artifact:${artifactType}:${sourcePart}:options:${stableJson(options)}:${runPart}:${stalePart}`;
}

function artifactWarning(
  code: ArtifactWarningCodeV1,
  targetRef: string,
  sourceRefs: readonly SourceReference[],
): ArtifactWarningV1 {
  return {
    kind: "artifact-warning",
    code,
    targetRef,
    sourceRefs: uniqueSourceRefs(sourceRefs),
  };
}

function artifactLoss(code: ArtifactLossCodeV1, message: string, sourceRefs: readonly SourceReference[]): ArtifactLossV1 {
  return {
    kind: "artifact-loss",
    code,
    message,
    sourceRefs: uniqueSourceRefs(sourceRefs),
  };
}

function artifactWarningsFromStrings(warnings: readonly string[], targetRef: string): readonly ArtifactWarningV1[] {
  return warnings.map((warning) => artifactWarning("LossyProjection", `${targetRef}:${warning}`, [{ kind: "construction-warning", ref: warning }]));
}

function validateNullableRunRef(value: unknown): ArtifactValidation<RunRef | null> {
  if (value === undefined || value === null) {
    return validArtifact(null);
  }
  if (!isRecord(value) || firstUnsupportedKey(value, RUN_REF_ALLOWED_KEYS) !== null || !isNonEmptyString(value.id)) {
    return failedArtifact(invalidArtifact("runRef", "Artifact runRef must be a conceptual RunRef with a non-empty id."));
  }
  return validArtifact({ id: value.id });
}

function validateNullableStaleEvidence(value: unknown): ArtifactValidation<ArtifactStaleEvidenceV1 | null> {
  if (value === undefined || value === null) {
    return validArtifact(null);
  }
  if (!isValidStaleEvidence(value)) {
    return failedArtifact(invalidArtifact("staleEvidence", "Stale artifacts require non-empty stale evidence."));
  }
  return validArtifact(value);
}

function isValidStaleEvidenceOrNull(value: unknown): value is ArtifactStaleEvidenceV1 | null {
  return value === null || isValidStaleEvidence(value);
}

function isValidStaleEvidence(value: unknown): value is ArtifactStaleEvidenceV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, STALE_EVIDENCE_ALLOWED_KEYS) === null
    && value.kind === "artifact-stale-evidence"
    && isNonEmptyString(value.reason)
    && isSourceReferenceArray(value.sourceRefs)
    && value.sourceRefs.length > 0;
}

function isArtifactWarningArray(value: unknown): value is readonly ArtifactWarningV1[] {
  return Array.isArray(value)
    && value.every((warning) => isRecord(warning)
      && firstUnsupportedKey(warning, ARTIFACT_WARNING_ALLOWED_KEYS) === null
      && warning.kind === "artifact-warning"
      && isArtifactWarningCode(warning.code)
      && isNonEmptyString(warning.targetRef)
      && isSourceReferenceArray(warning.sourceRefs)
      && warning.sourceRefs.length > 0);
}

function isArtifactLossArray(value: unknown): value is readonly ArtifactLossV1[] {
  return Array.isArray(value)
    && value.every((loss) => isRecord(loss)
      && firstUnsupportedKey(loss, ARTIFACT_LOSS_ALLOWED_KEYS) === null
      && loss.kind === "artifact-loss"
      && isArtifactLossCode(loss.code)
      && isNonEmptyString(loss.message)
      && isSourceReferenceArray(loss.sourceRefs)
      && loss.sourceRefs.length > 0);
}

function isArtifactStatus(value: unknown): value is ArtifactStatusV1 {
  return typeof value === "string" && ARTIFACT_V1_STATUSES.includes(value as ArtifactStatusV1);
}

function isArtifactType(value: unknown): value is ArtifactTypeV1 {
  return typeof value === "string" && ARTIFACT_V1_TYPES.includes(value as ArtifactTypeV1);
}

function isArtifactWarningCode(value: unknown): value is ArtifactWarningCodeV1 {
  return typeof value === "string" && ARTIFACT_V1_WARNING_CODES.includes(value as ArtifactWarningCodeV1);
}

function isArtifactLossCode(value: unknown): value is ArtifactLossCodeV1 {
  return typeof value === "string" && ARTIFACT_V1_LOSS_CODES.includes(value as ArtifactLossCodeV1);
}

function isValidRunRefOrNull(value: unknown): value is RunRef | null {
  return value === null || (isRecord(value) && firstUnsupportedKey(value, RUN_REF_ALLOWED_KEYS) === null && isNonEmptyString(value.id));
}

function provenanceCoversArtifact(artifact: ArtifactV1): boolean {
  const requiredRefs = [
    ...artifact.sourceRefs,
    ...(artifact.runRef === null ? [] : [{ kind: "run", ref: artifact.runRef.id }]),
  ];
  return sourceRefsContainAll(artifact.provenance.inputRefs, requiredRefs)
    && artifact.provenance.operationName.startsWith("core.artifacts-v1.");
}

function artifactWouldBecomeSource(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.kind === "artifact" || value.schemaVersion === ARTIFACT_V1_SCHEMA_VERSION) return true;
  if ("sourceRefs" in value && Array.isArray(value.sourceRefs)) {
    return value.sourceRefs.some((sourceRef) => isSourceReference(sourceRef) && isForbiddenArtifactSourceRef(sourceRef));
  }
  return false;
}

function isForbiddenArtifactSourceRef(sourceRef: SourceReference): boolean {
  return FORBIDDEN_ARTIFACT_SOURCE_KINDS.includes(sourceRef.kind as (typeof FORBIDDEN_ARTIFACT_SOURCE_KINDS)[number]);
}

function containsForbiddenHumanTerm(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  return FORBIDDEN_HUMAN_TERMS.some((term) => normalized.includes(term.replace(/[^a-z]/g, "")));
}

function uniqueWarnings(warnings: readonly ArtifactWarningV1[]): readonly ArtifactWarningV1[] {
  const seen = new Set<string>();
  const output: ArtifactWarningV1[] = [];
  for (const warning of warnings) {
    const key = stableJson(warning);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(warning);
    }
  }
  return output;
}

function uniqueLosses(losses: readonly ArtifactLossV1[]): readonly ArtifactLossV1[] {
  const seen = new Set<string>();
  const output: ArtifactLossV1[] = [];
  for (const loss of losses) {
    const key = stableJson(loss);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(loss);
    }
  }
  return output;
}

function firstDuplicateSourceRef(sourceRefs: readonly SourceReference[]): SourceReference | null {
  const seen = new Set<string>();
  for (const sourceRef of sourceRefs) {
    const key = `${sourceRef.kind}:${sourceRef.ref}`;
    if (seen.has(key)) return sourceRef;
    seen.add(key);
  }
  return null;
}

function hasDuplicateSourceRefs(sourceRefs: readonly SourceReference[]): boolean {
  return firstDuplicateSourceRef(sourceRefs) !== null;
}

function sourceRefsContainAll(actual: readonly SourceReference[], expected: readonly SourceReference[]): boolean {
  return expected.every((expectedRef) => sourceRefsInclude(actual, expectedRef));
}

function sourceRefsInclude(actual: readonly SourceReference[], expected: SourceReference): boolean {
  return actual.some((sourceRef) => sourceRef.kind === expected.kind && sourceRef.ref === expected.ref);
}

function sameStringList(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function uniqueSourceRefs(values: readonly SourceReference[]): SourceReference[] {
  const refs: SourceReference[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = `${value.kind}:${value.ref}`;
    if (!seen.has(key)) {
      refs.push({ kind: value.kind, ref: value.ref });
      seen.add(key);
    }
  }
  return refs;
}

function uniqueStrings(values: readonly string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!seen.has(value)) {
      output.push(value);
      seen.add(value);
    }
  }
  return output;
}

function createArtifactResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };
  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createArtifactError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: ARTIFACT_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };
  return {
    code: diagnostic.code,
    severity: errorSeverity(diagnostic.severity),
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: true,
    provenance: diagnostic.provenance,
  };
}

function createArtifactProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: ARTIFACT_OPERATION_VERSION,
    inputRefs: uniqueSourceRefs(inputRefs),
    source: ARTIFACT_SOURCE_REFERENCE,
  };
}

function invalidArtifact(targetRef: string, message: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [createArtifactError({ code: "InvalidArtifactV1", message, targetRef })],
  });
}

function missingArtifactSource(targetRef: string, message: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [createArtifactError({ code: "MissingArtifactSource", message, targetRef })],
  });
}

function sourceMismatch(targetRef: string, message: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [createArtifactError({ code: "ArtifactSourceMismatch", message, targetRef })],
  });
}

function artifactWouldBecomeSourceOfTruth(targetRef: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [createArtifactError({
      code: "ArtifactWouldBecomeSourceOfTruth",
      message: "Artifacts, SVG, and JSON projections cannot be supplied as PR6-PR9 source truth.",
      targetRef,
    })],
  });
}

function unsupportedArtifactOption(targetRef: string, message: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [createArtifactError({ code: "UnsupportedArtifactOption", message, targetRef })],
  });
}

function failedArtifact(result: CoreResult): ArtifactValidation<never> {
  return { ok: false, result };
}

function validArtifact<TValue>(value: TValue): ArtifactValidation<TValue> {
  return { ok: true, value };
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function firstUnsupportedKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function areBooleans(values: readonly unknown[]): boolean {
  return values.every((value) => typeof value === "boolean");
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNormalizedFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isEvaluationStatus(value: unknown): boolean {
  return typeof value === "string" && EVALUATION_STATUS_VALUES.includes(value as (typeof EVALUATION_STATUS_VALUES)[number]);
}

function isConfidenceStatus(value: unknown): boolean {
  return typeof value === "string" && CONFIDENCE_STATUS_VALUES.includes(value as (typeof CONFIDENCE_STATUS_VALUES)[number]);
}

function isComparisonStatus(value: unknown): value is ComparisonStatusV1 {
  return typeof value === "string" && COMPARISON_V1_STATUSES.includes(value as ComparisonStatusV1);
}

function isStructuredExplanationClaimCode(value: unknown): value is StructuredExplanationClaimCodeV1 {
  return typeof value === "string" && STRUCTURED_EXPLANATION_V1_CLAIM_CODES.includes(value as StructuredExplanationClaimCodeV1);
}

function isPoint(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, POINT_ALLOWED_KEYS) === null
    && value.kind === "point"
    && isFiniteNumber(value.x)
    && (value.y === undefined || isFiniteNumber(value.y));
}

function isSegment(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, SEGMENT_ALLOWED_KEYS) === null
    && value.kind === "segment"
    && isPoint(value.start)
    && isPoint(value.end);
}

function isRect(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, RECT_ALLOWED_KEYS) === null
    && value.kind === "rect"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isNonNegativeFiniteNumber(value.width)
    && isNonNegativeFiniteNumber(value.height);
}

function numbersEqual(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= 1e-9;
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && firstUnsupportedKey(value, SOURCE_REFERENCE_ALLOWED_KEYS) === null
    && isNonEmptyString(value.kind)
    && isNonEmptyString(value.ref);
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isProvenance(value: unknown): value is Provenance {
  return isRecord(value)
    && firstUnsupportedKey(value, PROVENANCE_ALLOWED_KEYS) === null
    && isNonEmptyString(value.operationName)
    && isNonEmptyString(value.operationVersion)
    && isSourceReferenceArray(value.inputRefs)
    && isSourceReference(value.source);
}

function containsNonFiniteNumber(value: unknown): boolean {
  if (typeof value === "number") return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(containsNonFiniteNumber);
  if (isRecord(value)) return Object.values(value).some(containsNonFiniteNumber);
  return false;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function deepClone<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function formatDeterministicNumber(value: number, precision: number): string {
  const rounded = Number(value.toFixed(precision));
  if (Object.is(rounded, -0)) return "0";
  return String(rounded);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}
