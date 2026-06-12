import type {
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  OperationContextRef,
  OperationStatus,
  PackLockRef,
  Provenance,
  RunRef,
  SourceReference,
} from "./index.js";
import type { Construction } from "./construction.js";
import type { Evaluation } from "./evaluation.js";
import type { Explanation } from "./comparison.js";

export const ARTIFACT_TYPES = [
  "structured-result",
  "construction-summary",
  "evaluation-report",
  "explanation",
  "simple-visual",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_STATUSES = ["current", "lossy", "stale", "non_replayable"] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export interface ArtifactGenerationOptions {
  kind: "artifact-generation-options";
  id: string;
  artifactType: ArtifactType;
  expectedSourceRefs?: readonly SourceReference[];
  lossy?: boolean;
  presentationHints?: Readonly<Record<string, unknown>>;
}

export interface ArtifactBase {
  kind: "artifact";
  id: string;
  artifactType: ArtifactType;
  status: ArtifactStatus;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  outputRefs: readonly SourceReference[];
  runRef: RunRef | null;
  options: ArtifactGenerationOptions;
  derived: true;
}

export interface StructuredResultArtifact extends ArtifactBase {
  artifactType: "structured-result";
  sourceResultRef: SourceReference;
  resultStatus: OperationStatus;
  resultWarnings: readonly CoreWarning[];
  resultErrors: readonly CoreError[];
  resultProvenance: Provenance | null;
  resultOutputRefs: readonly SourceReference[];
  resultRunRef: RunRef | null;
  resultPackLockRef: PackLockRef | null;
  resultOperationContextRef: OperationContextRef | null;
}

export interface ConstructionSummaryArtifact extends ArtifactBase {
  artifactType: "construction-summary";
  sourceConstructionRef: SourceReference;
  guideCount: number;
  zoneCount: number;
  gridSummary: {
    gridRef: string;
    rows: number;
    columns: number;
    cellCount: number;
  };
  diagonalCount: number;
  intersectionCount: number;
  constructionTraceRefs: readonly SourceReference[];
}

export interface EvaluationReportArtifact extends ArtifactBase {
  artifactType: "evaluation-report";
  sourceEvaluationRef: SourceReference;
  profileRef: string;
  packRef: string;
  packLockRef: string | null;
  packPreLockRef: string | null;
  componentScores: readonly {
    componentRef: string;
    componentId: string;
    status: string;
    value: number;
    measurementSourceRefs: readonly SourceReference[];
  }[];
  score: {
    scoreRef: string;
    value: number;
    derivedFromComponentRefs: readonly string[];
    measurementSourceRefs: readonly SourceReference[];
  } | null;
  confidence: {
    confidenceRef: string;
    value: number;
    measurementSourceRefs: readonly SourceReference[];
  };
  measurementSourceRefs: readonly SourceReference[];
}

export interface ExplanationArtifact extends ArtifactBase {
  artifactType: "explanation";
  sourceExplanationRef: SourceReference;
  summary: string;
  sourceEvaluationRefs: readonly string[];
  sourceMeasurementRefs: readonly SourceReference[];
  componentDeltas: Explanation["componentDeltas"];
}

export interface SimpleVisualArtifact extends ArtifactBase {
  artifactType: "simple-visual";
  sourceConstructionRef: SourceReference;
  descriptor: {
    kind: "simple-visual-descriptor";
    viewBox: { x: number; y: number; width: number; height: number };
    guides: readonly {
      id: string;
      axis: string;
      orientation: string;
      normalizedPosition: number;
      position: number;
      sourceRef: SourceReference;
    }[];
    zones: readonly {
      id: string;
      normalizedBounds: Construction["zones"][number]["normalizedBounds"];
      sourceGuideRefs: readonly string[];
      sourceRef: SourceReference;
    }[];
    gridCells: readonly {
      id: string;
      rowIndex: number;
      columnIndex: number;
      normalizedBounds: Construction["grid"]["cells"][number]["normalizedBounds"];
      sourceGridRef: string;
      sourceGuideRefs: readonly string[];
      sourceRef: SourceReference;
    }[];
    diagonals: readonly {
      id: string;
      normalizedStart: Construction["diagonals"][number]["normalizedStart"];
      normalizedEnd: Construction["diagonals"][number]["normalizedEnd"];
      sourceRef: SourceReference;
    }[];
    intersections: readonly {
      id: string;
      intersectionKind: string;
      normalizedPoint: Construction["intersections"][number]["normalizedPoint"];
      sourceObjectRefs: readonly SourceReference[];
      sourceRef: SourceReference;
    }[];
    presentationHints?: Readonly<Record<string, unknown>>;
  };
}

export type Artifact =
  | StructuredResultArtifact
  | ConstructionSummaryArtifact
  | EvaluationReportArtifact
  | ExplanationArtifact
  | SimpleVisualArtifact;

export interface ArtifactGenerationInput {
  options?: ArtifactGenerationOptions | null;
  runRef?: RunRef | null;
  operationContextRef?: OperationContextRef | null;
}

export interface GenerateStructuredResultArtifactInput extends ArtifactGenerationInput {
  result?: CoreResult | null;
  sourceResultRef?: SourceReference | null;
}

export interface GenerateConstructionSummaryArtifactInput extends ArtifactGenerationInput {
  construction?: Construction | null;
}

export interface GenerateEvaluationReportArtifactInput extends ArtifactGenerationInput {
  evaluation?: Evaluation | null;
}

export interface GenerateExplanationArtifactInput extends ArtifactGenerationInput {
  explanation?: Explanation | null;
  sourceExplanationRef?: SourceReference | null;
}

export interface GenerateSimpleVisualArtifactInput extends ArtifactGenerationInput {
  construction?: Construction | null;
}

interface ArtifactContext {
  artifactType: ArtifactType;
  options: ArtifactGenerationOptions;
  runRef: RunRef | null;
  operationContextRef: OperationContextRef | null;
  sourceRefs: readonly SourceReference[];
  sourceWarnings: readonly CoreWarning[];
  sourceErrors: readonly CoreError[];
}

interface ArtifactResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  runRef?: RunRef | null;
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

const ARTIFACT_OPERATION_VERSION = "0.1.0";
const ARTIFACT_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/artifacts-v1",
});

const STRUCTURED_RESULT_OPERATION = "core.artifacts-v1.structured-result.generate";
const CONSTRUCTION_SUMMARY_OPERATION = "core.artifacts-v1.construction-summary.generate";
const EVALUATION_REPORT_OPERATION = "core.artifacts-v1.evaluation-report.generate";
const EXPLANATION_OPERATION = "core.artifacts-v1.explanation.generate";
const SIMPLE_VISUAL_OPERATION = "core.artifacts-v1.simple-visual.generate";
const VALIDATE_ARTIFACT_OPERATION = "core.artifacts-v1.validate";

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

export function generateStructuredResultArtifact(
  input: GenerateStructuredResultArtifactInput | null | undefined,
): CoreResult<StructuredResultArtifact> {
  if (!isRecord(input)) {
    return resultAs<StructuredResultArtifact>(missingArtifactSource("result", "Structured result artifact requires a CoreResult."));
  }

  const result = input.result;
  if (isArtifact(result)) {
    return resultAs<StructuredResultArtifact>(artifactWouldBecomeSourceOfTruth("result"));
  }

  if (!isCoreResult(result)) {
    return resultAs<StructuredResultArtifact>(unsupportedArtifactSource("result", "Structured result artifact source must be a CoreResult."));
  }

  const sourceResultRef = input.sourceResultRef;
  if (!isSourceReference(sourceResultRef)) {
    return resultAs<StructuredResultArtifact>(missingArtifactSourceRefs("sourceResultRef"));
  }

  if (result.provenance === null) {
    return resultAs<StructuredResultArtifact>(missingArtifactProvenance("result.provenance"));
  }

  const context = artifactContext("structured-result", input, [sourceResultRef], result.warnings, result.errors);
  if (!context.ok) {
    return resultAs<StructuredResultArtifact>(context.result);
  }

  const provenance = createArtifactProvenance(STRUCTURED_RESULT_OPERATION, context.val.sourceRefs);
  const artifact: StructuredResultArtifact = {
    ...artifactBase(context.val, provenance),
    artifactType: "structured-result",
    sourceResultRef,
    resultStatus: result.status,
    resultWarnings: [...result.warnings],
    resultErrors: [...result.errors],
    resultProvenance: result.provenance,
    resultOutputRefs: [...result.outputRefs],
    resultRunRef: result.runRef,
    resultPackLockRef: result.packLockRef,
    resultOperationContextRef: result.operationContextRef,
  };

  return artifactResult(artifact, provenance, context.val);
}

export function generateConstructionSummaryArtifact(
  input: GenerateConstructionSummaryArtifactInput | null | undefined,
): CoreResult<ConstructionSummaryArtifact> {
  const source = constructionArtifactSource(input, "construction-summary");
  if (!source.ok) {
    return resultAs<ConstructionSummaryArtifact>(source.result);
  }

  const { construction } = source.val;
  const context = artifactContext("construction-summary", source.val.input, source.val.sourceRefs, construction.warnings, []);
  if (!context.ok) {
    return resultAs<ConstructionSummaryArtifact>(context.result);
  }

  const provenance = createArtifactProvenance(CONSTRUCTION_SUMMARY_OPERATION, context.val.sourceRefs);
  const artifact: ConstructionSummaryArtifact = {
    ...artifactBase(context.val, provenance),
    artifactType: "construction-summary",
    sourceConstructionRef: { kind: "construction", ref: construction.id },
    guideCount: construction.guides.length,
    zoneCount: construction.zones.length,
    gridSummary: {
      gridRef: construction.grid.id,
      rows: construction.grid.rows,
      columns: construction.grid.columns,
      cellCount: construction.grid.cells.length,
    },
    diagonalCount: construction.diagonals.length,
    intersectionCount: construction.intersections.length,
    constructionTraceRefs: [
      { kind: "construction-trace", ref: construction.constructionTrace.id },
      ...construction.constructionTrace.createdObjectRefs,
    ],
  };

  return artifactResult(artifact, provenance, context.val);
}

export function generateEvaluationReportArtifact(
  input: GenerateEvaluationReportArtifactInput | null | undefined,
): CoreResult<EvaluationReportArtifact> {
  if (!isRecord(input)) {
    return resultAs<EvaluationReportArtifact>(missingArtifactSource("evaluation", "Evaluation report requires a PR8 evaluation."));
  }

  const evaluation = input.evaluation;
  if (isArtifact(evaluation)) {
    return resultAs<EvaluationReportArtifact>(artifactWouldBecomeSourceOfTruth("evaluation"));
  }

  if (!isEvaluation(evaluation)) {
    return resultAs<EvaluationReportArtifact>(unsupportedArtifactSource("evaluation", "Evaluation report source must be a PR8 evaluation."));
  }

  if (!hasSourceRefs(evaluation.provenance.sourceRefs)) {
    return resultAs<EvaluationReportArtifact>(missingArtifactProvenance("evaluation.provenance"));
  }

  const measurementSourceRefs = uniqueSourceReferences([
    ...evaluation.measurementRefs,
    ...evaluation.componentScores.flatMap((componentScore) => componentScore.measurementSourceRefs),
    ...(evaluation.score?.measurementSourceRefs ?? []),
    ...evaluation.confidence.measurementSourceRefs,
  ]);
  const sourceRefs = uniqueSourceReferences([{ kind: "evaluation", ref: evaluation.id }, ...evaluation.provenance.sourceRefs]);
  const context = artifactContext("evaluation-report", input, sourceRefs, evaluation.warnings, []);
  if (!context.ok) {
    return resultAs<EvaluationReportArtifact>(context.result);
  }

  const provenance = createArtifactProvenance(EVALUATION_REPORT_OPERATION, context.val.sourceRefs);
  const artifact: EvaluationReportArtifact = {
    ...artifactBase(context.val, provenance),
    artifactType: "evaluation-report",
    sourceEvaluationRef: { kind: "evaluation", ref: evaluation.id },
    profileRef: evaluation.profileRef,
    packRef: evaluation.packRef,
    packLockRef: evaluation.packLockRef,
    packPreLockRef: evaluation.packPreLockRef,
    componentScores: evaluation.componentScores.map((componentScore) => ({
      componentRef: componentScore.id,
      componentId: componentScore.componentId,
      status: componentScore.status,
      value: componentScore.value,
      measurementSourceRefs: [...componentScore.measurementSourceRefs],
    })),
    score: evaluation.score === null
      ? null
      : {
        scoreRef: evaluation.score.id,
        value: evaluation.score.value,
        derivedFromComponentRefs: [...evaluation.score.derivedFromComponentRefs],
        measurementSourceRefs: [...evaluation.score.measurementSourceRefs],
      },
    confidence: {
      confidenceRef: evaluation.confidence.id,
      value: evaluation.confidence.value,
      measurementSourceRefs: [...evaluation.confidence.measurementSourceRefs],
    },
    measurementSourceRefs,
  };

  return artifactResult(artifact, provenance, context.val);
}

export function generateExplanationArtifact(
  input: GenerateExplanationArtifactInput | null | undefined,
): CoreResult<ExplanationArtifact> {
  if (!isRecord(input)) {
    return resultAs<ExplanationArtifact>(missingArtifactSource("explanation", "Explanation artifact requires a PR9 explanation."));
  }

  const explanation = input.explanation;
  if (isArtifact(explanation)) {
    return resultAs<ExplanationArtifact>(artifactWouldBecomeSourceOfTruth("explanation"));
  }

  if (!isExplanation(explanation)) {
    return resultAs<ExplanationArtifact>(unsupportedArtifactSource("explanation", "Explanation artifact source must be a sourced PR9 explanation."));
  }

  const sourceExplanationRef = input.sourceExplanationRef;
  if (!isSourceReference(sourceExplanationRef)) {
    return resultAs<ExplanationArtifact>(missingArtifactSourceRefs("sourceExplanationRef"));
  }

  const sourceRefs = uniqueSourceReferences([
    sourceExplanationRef,
    ...explanation.sourceEvaluationRefs.map((ref) => ({ kind: "evaluation", ref })),
    ...explanation.sourceMeasurementRefs,
  ]);
  const context = artifactContext("explanation", input, sourceRefs, explanation.warnings, []);
  if (!context.ok) {
    return resultAs<ExplanationArtifact>(context.result);
  }

  const provenance = createArtifactProvenance(EXPLANATION_OPERATION, context.val.sourceRefs);
  const artifact: ExplanationArtifact = {
    ...artifactBase(context.val, provenance),
    artifactType: "explanation",
    sourceExplanationRef,
    summary: explanation.summary,
    sourceEvaluationRefs: [...explanation.sourceEvaluationRefs],
    sourceMeasurementRefs: [...explanation.sourceMeasurementRefs],
    componentDeltas: [...explanation.componentDeltas],
  };

  return artifactResult(artifact, provenance, context.val);
}

export function generateSimpleVisualArtifact(
  input: GenerateSimpleVisualArtifactInput | null | undefined,
): CoreResult<SimpleVisualArtifact> {
  const source = constructionArtifactSource(input, "simple-visual");
  if (!source.ok) {
    return resultAs<SimpleVisualArtifact>(source.result);
  }

  const { construction } = source.val;
  const context = artifactContext("simple-visual", source.val.input, source.val.sourceRefs, construction.warnings, []);
  if (!context.ok) {
    return resultAs<SimpleVisualArtifact>(context.result);
  }

  const provenance = createArtifactProvenance(SIMPLE_VISUAL_OPERATION, context.val.sourceRefs);
  const artifact: SimpleVisualArtifact = {
    ...artifactBase(context.val, provenance),
    artifactType: "simple-visual",
    sourceConstructionRef: { kind: "construction", ref: construction.id },
    descriptor: {
      kind: "simple-visual-descriptor",
      viewBox: viewBoxFromConstruction(construction),
      guides: construction.guides.map((guide) => ({
        id: guide.id,
        axis: guide.axis,
        orientation: guide.orientation,
        normalizedPosition: guide.normalizedPosition,
        position: guide.position,
        sourceRef: { kind: "guide", ref: guide.id },
      })),
      zones: construction.zones.map((zone) => ({
        id: zone.id,
        normalizedBounds: zone.normalizedBounds,
        sourceGuideRefs: [...zone.sourceGuideRefs],
        sourceRef: { kind: "zone", ref: zone.id },
      })),
      gridCells: construction.grid.cells.map((cell) => ({
        id: cell.id,
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
        normalizedBounds: cell.normalizedBounds,
        sourceGridRef: cell.sourceGridRef,
        sourceGuideRefs: [...cell.sourceGuideRefs],
        sourceRef: { kind: "grid-cell", ref: cell.id },
      })),
      diagonals: construction.diagonals.map((diagonal) => ({
        id: diagonal.id,
        normalizedStart: diagonal.normalizedStart,
        normalizedEnd: diagonal.normalizedEnd,
        sourceRef: { kind: "diagonal", ref: diagonal.id },
      })),
      intersections: construction.intersections.map((intersection) => ({
        id: intersection.id,
        intersectionKind: intersection.intersectionKind,
        normalizedPoint: intersection.normalizedPoint,
        sourceObjectRefs: [...intersection.sourceObjectRefs],
        sourceRef: { kind: "intersection-point", ref: intersection.id },
      })),
      ...(context.val.options.presentationHints === undefined
        ? {}
        : { presentationHints: context.val.options.presentationHints }),
    },
  };

  return artifactResult(artifact, provenance, context.val);
}

export function validateArtifact(artifact: unknown): CoreResult<Artifact> {
  if (!isArtifact(artifact)) {
    return resultAs<Artifact>(unsupportedArtifactSource("artifact", "Artifact validation requires an artifact projection."));
  }

  if (!artifact.derived) {
    return resultAs<Artifact>(artifactWouldBecomeSourceOfTruth(artifact.id));
  }

  const failure = firstFailure([
    hasSourceRefs(artifact.sourceRefs) ? null : missingArtifactSourceRefs("artifact.sourceRefs"),
    artifact.provenance === null ? missingArtifactProvenance("artifact.provenance") : null,
    isArtifactOptions(artifact.options) ? null : missingArtifactOptions("artifact.options"),
    criticalWarningsHidden(artifact) ? artifactCriticalWarningHidden(artifact.id) : null,
  ]);

  if (failure !== null) {
    return resultAs<Artifact>(failure);
  }

  return createArtifactResult({
    status: "ok",
    warnings: artifact.warnings,
    errors: artifact.errors,
    provenance: createArtifactProvenance(VALIDATE_ARTIFACT_OPERATION, artifact.sourceRefs),
    outputRefs: [{ kind: "artifact", ref: artifact.id }],
    runRef: artifact.runRef,
    output: artifact,
  });
}

function artifactContext(
  artifactType: ArtifactType,
  input: ArtifactGenerationInput,
  sourceRefs: readonly SourceReference[],
  sourceWarnings: readonly CoreWarning[],
  sourceErrors: readonly CoreError[],
): { ok: true; val: ArtifactContext } | { ok: false; result: CoreResult } {
  if (!isArtifactOptions(input.options) || input.options.artifactType !== artifactType) {
    return { ok: false, result: missingArtifactOptions("options") };
  }

  if (!hasSourceRefs(sourceRefs)) {
    return { ok: false, result: missingArtifactSourceRefs("sourceRefs") };
  }

  return {
    ok: true,
    val: {
      artifactType,
      options: input.options,
      runRef: input.runRef ?? null,
      operationContextRef: input.operationContextRef ?? null,
      sourceRefs: uniqueSourceReferences(sourceRefs),
      sourceWarnings,
      sourceErrors,
    },
  };
}

function constructionArtifactSource(
  input: GenerateConstructionSummaryArtifactInput | GenerateSimpleVisualArtifactInput | null | undefined,
  artifactType: "construction-summary" | "simple-visual",
): {
  ok: true;
  val: {
    input: GenerateConstructionSummaryArtifactInput | GenerateSimpleVisualArtifactInput;
    construction: Construction;
    sourceRefs: readonly SourceReference[];
  };
} | { ok: false; result: CoreResult } {
  const sourceDescription = artifactType === "construction-summary"
    ? "Construction summary requires a PR6 construction."
    : "Simple visual artifact requires a PR6 construction.";
  if (!isRecord(input)) {
    return { ok: false, result: missingArtifactSource("construction", sourceDescription) };
  }

  if (isArtifact(input.construction)) {
    return { ok: false, result: artifactWouldBecomeSourceOfTruth("construction") };
  }

  if (!isConstruction(input.construction)) {
    return {
      ok: false,
      result: unsupportedArtifactSource("construction", `${sourceDescription} Source must be a PR6 construction.`),
    };
  }

  return {
    ok: true,
    val: {
      input,
      construction: input.construction,
      sourceRefs: uniqueSourceReferences([
        { kind: "construction", ref: input.construction.id },
        ...input.construction.provenance.sourceRefs,
      ]),
    },
  };
}

function artifactBase(context: ArtifactContext, provenance: Provenance): ArtifactBase {
  const staleWarning = staleArtifactWarning(context, provenance);
  const runRefWarning = context.runRef === null
    ? artifactWarning("MissingArtifactRunRef", "Artifact has no runRef and is marked non_replayable.", "runRef", provenance, true)
    : null;
  const warnings = [
    ...context.sourceWarnings,
    ...context.sourceErrors.map(errorAsCriticalWarning),
    ...(staleWarning === null ? [] : [staleWarning]),
    ...(runRefWarning === null ? [] : [runRefWarning]),
  ];

  return {
    kind: "artifact",
    id: `artifact:${context.artifactType}:${context.options.id}`,
    artifactType: context.artifactType,
    status: artifactStatus(context, staleWarning !== null),
    sourceRefs: context.sourceRefs,
    provenance,
    warnings,
    errors: [...context.sourceErrors],
    outputRefs: [{ kind: "artifact", ref: `artifact:${context.artifactType}:${context.options.id}` }],
    runRef: context.runRef,
    options: context.options,
    derived: true,
  };
}

function artifactResult<TArtifact extends Artifact>(
  artifact: TArtifact,
  provenance: Provenance,
  context: ArtifactContext,
): CoreResult<TArtifact> {
  const validation = validateArtifact(artifact);
  if (validation.status !== "ok") {
    return resultAs<TArtifact>(validation);
  }

  return createArtifactResult({
    status: "ok",
    warnings: artifact.warnings,
    errors: artifact.errors,
    provenance,
    outputRefs: artifact.outputRefs,
    runRef: context.runRef,
    operationContextRef: context.operationContextRef,
    output: artifact,
  });
}

function artifactStatus(context: ArtifactContext, stale: boolean): ArtifactStatus {
  if (context.runRef === null) {
    return "non_replayable";
  }

  if (stale) {
    return "stale";
  }

  if (context.options.lossy === true || context.artifactType !== "structured-result") {
    return "lossy";
  }

  return "current";
}

function staleArtifactWarning(context: ArtifactContext, provenance: Provenance): CoreWarning | null {
  if (context.options.expectedSourceRefs === undefined) {
    return null;
  }

  return sameSourceRefs(context.sourceRefs, context.options.expectedSourceRefs)
    ? null
    : artifactWarning(
      "InvalidArtifactInput",
      "Artifact source refs differ from expected source refs and are marked stale.",
      "sourceRefs",
      provenance,
      false,
    );
}

function errorAsCriticalWarning(error: CoreError): CoreWarning {
  return {
    ...error,
    severity: "critical",
    blocking: true,
  };
}

function criticalWarningsHidden(artifact: Artifact): boolean {
  return artifact.warnings.some((warning) => warning.severity === "critical" && !warning.blocking);
}

function viewBoxFromConstruction(construction: Construction): SimpleVisualArtifact["descriptor"]["viewBox"] {
  const rects = [...construction.grid.cells, ...construction.zones].map((object) => object.bounds);
  if (rects.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let xStart = Number.POSITIVE_INFINITY;
  let yStart = Number.POSITIVE_INFINITY;
  let xEnd = Number.NEGATIVE_INFINITY;
  let yEnd = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    xStart = Math.min(xStart, rect.x);
    yStart = Math.min(yStart, rect.y);
    xEnd = Math.max(xEnd, rect.x + rect.width);
    yEnd = Math.max(yEnd, rect.y + rect.height);
  }
  return { x: xStart, y: yStart, width: xEnd - xStart, height: yEnd - yStart };
}

function createArtifactResult<TOutput = unknown>(input: ArtifactResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function artifactError(code: DiagnosticCode, message: string, targetRef: string, sourceRef?: SourceReference): CoreError {
  return {
    code,
    severity: "error",
    message,
    targetRef,
    source: sourceRef ?? ARTIFACT_SOURCE_REFERENCE,
    blocking: true,
    provenance: null,
  };
}

function artifactWarning(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  provenance: Provenance,
  blocking: boolean,
): CoreWarning {
  return {
    code,
    severity: blocking ? "critical" : "warning",
    message,
    targetRef,
    source: ARTIFACT_SOURCE_REFERENCE,
    blocking,
    provenance,
  };
}

function createArtifactProvenance(operationName: string, inputRefs: readonly SourceReference[]): Provenance {
  return {
    operationName,
    operationVersion: ARTIFACT_OPERATION_VERSION,
    inputRefs: [...inputRefs],
    source: ARTIFACT_SOURCE_REFERENCE,
  };
}

function missingArtifactSource(targetRef: string, message: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [artifactError("MissingArtifactSource", message, targetRef, { kind: "artifact-source", ref: targetRef })],
  });
}

function missingArtifactSourceRefs(targetRef: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [
      artifactError("MissingArtifactSourceRefs", "Artifact requires visible source refs.", targetRef, {
        kind: "source-refs",
        ref: targetRef,
      }),
    ],
  });
}

function missingArtifactProvenance(targetRef: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [
      artifactError("MissingArtifactProvenance", "Artifact source requires visible provenance.", targetRef, {
        kind: "provenance",
        ref: targetRef,
      }),
    ],
  });
}

function missingArtifactOptions(targetRef: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [
      artifactError("MissingArtifactOptions", "Artifact generation requires explicit options.", targetRef, {
        kind: "artifact-options",
        ref: targetRef,
      }),
    ],
  });
}

function unsupportedArtifactSource(targetRef: string, message: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [artifactError("UnsupportedArtifactSource", message, targetRef, { kind: "artifact-source", ref: targetRef })],
  });
}

function artifactWouldBecomeSourceOfTruth(targetRef: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [
      artifactError("ArtifactWouldBecomeSourceOfTruth", "Artifact cannot be used as a Norma Core source object.", targetRef, {
        kind: "artifact",
        ref: targetRef,
      }),
    ],
  });
}

function artifactCriticalWarningHidden(targetRef: string): CoreResult {
  return createArtifactResult({
    status: "failed",
    errors: [
      artifactError("ArtifactCriticalWarningHidden", "Critical artifact warnings must remain visible and blocking.", targetRef, {
        kind: "artifact",
        ref: targetRef,
      }),
    ],
  });
}

function firstFailure(results: readonly (CoreResult | null)[]): CoreResult | null {
  return results.find((result) => result !== null) ?? null;
}

function resultAs<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return result as unknown as CoreResult<TOutput>;
}

function uniqueSourceReferences(refs: readonly SourceReference[]): readonly SourceReference[] {
  const seen = new Set<string>();
  const uniqueRefs: SourceReference[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.ref}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRefs.push(ref);
    }
  }
  return uniqueRefs;
}

function sameSourceRefs(firstRefs: readonly SourceReference[], secondRefs: readonly SourceReference[]): boolean {
  const first = uniqueSourceReferences(firstRefs).map((ref) => `${ref.kind}:${ref.ref}`).sort();
  const second = uniqueSourceReferences(secondRefs).map((ref) => `${ref.kind}:${ref.ref}`).sort();
  return first.length === second.length && first.every((ref, index) => ref === second[index]);
}

function hasSourceRefs(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.length > 0 && value.every(isSourceReference);
}

function isCoreResult(value: unknown): value is CoreResult {
  if (!isRecord(value)) {
    return false;
  }

  return everyCheck([
    value.status === "ok" || value.status === "failed" || value.status === "not_implemented",
    Array.isArray(value.warnings),
    Array.isArray(value.errors),
    Array.isArray(value.outputRefs),
    hasFields(value, ["output", "provenance", "runRef", "packLockRef", "operationContextRef"]),
  ]);
}

function isArtifact(value: unknown): value is Artifact {
  if (!isRecord(value)) {
    return false;
  }

  return everyCheck([
    value.kind === "artifact",
    value.derived === true,
    typeof value.id === "string",
    ARTIFACT_TYPES.includes(value.artifactType as ArtifactType),
    ARTIFACT_STATUSES.includes(value.status as ArtifactStatus),
    Array.isArray(value.sourceRefs),
    Array.isArray(value.warnings),
    Array.isArray(value.errors),
    Array.isArray(value.outputRefs),
  ]);
}

function isArtifactOptions(value: unknown): value is ArtifactGenerationOptions {
  if (!isRecord(value)) {
    return false;
  }

  return everyCheck([
    value.kind === "artifact-generation-options",
    typeof value.id === "string",
    ARTIFACT_TYPES.includes(value.artifactType as ArtifactType),
    value.expectedSourceRefs === undefined || Array.isArray(value.expectedSourceRefs),
    value.presentationHints === undefined || isRecord(value.presentationHints),
  ]);
}

function isConstruction(value: unknown): value is Construction {
  if (!isRecord(value) || !isRecord(value.provenance) || !isRecord(value.grid) || !isRecord(value.constructionTrace)) {
    return false;
  }

  return everyCheck([
    value.kind === "construction",
    typeof value.id === "string",
    hasSourceRefs(value.provenance.sourceRefs),
    Array.isArray(value.guides),
    Array.isArray(value.zones),
    Array.isArray(value.grid.cells),
    Array.isArray(value.diagonals),
    Array.isArray(value.intersections),
    typeof value.constructionTrace.id === "string",
    Array.isArray(value.constructionTrace.createdObjectRefs),
  ]);
}

function isEvaluation(value: unknown): value is Evaluation {
  if (!isRecord(value) || !isRecord(value.provenance)) {
    return false;
  }

  return everyCheck([
    value.kind === "evaluation",
    typeof value.id === "string",
    typeof value.profileRef === "string",
    typeof value.packRef === "string",
    hasSourceRefs(value.provenance.sourceRefs),
    Array.isArray(value.measurementRefs),
    Array.isArray(value.componentScores),
    isRecord(value.confidence),
  ]);
}

function isExplanation(value: unknown): value is Explanation {
  if (!isRecord(value)) {
    return false;
  }

  const sourceEvaluationRefs = value.sourceEvaluationRefs;
  return everyCheck([
    value.kind === "explanation",
    typeof value.summary === "string",
    Array.isArray(sourceEvaluationRefs),
    Array.isArray(sourceEvaluationRefs) && sourceEvaluationRefs.length > 0,
    hasSourceRefs(value.sourceMeasurementRefs),
    Array.isArray(value.componentDeltas),
    Array.isArray(value.warnings),
    isRecord(value.provenance),
  ]);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && typeof value.kind === "string"
    && typeof value.ref === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => field in value);
}

function everyCheck(checks: readonly boolean[]): boolean {
  return checks.every(Boolean);
}
