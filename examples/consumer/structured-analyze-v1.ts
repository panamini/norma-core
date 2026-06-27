import {
  BASIC_GRID_ALIGNMENT_PROFILE,
  GEOMETRY_HARMONIES_PACK,
  STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
  STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
  SURFACE_GOLDEN_SECTION_RULE_SET_ID,
  analyzeStructuredCompositionV1,
  createOperationContext,
  createPackLock,
  type Composition2D,
  type CoreResult,
  type EvaluationTolerances,
  type NumericPolicy,
  type OperationContext,
  type OrderingPolicy,
  type PackLock,
  type RoundingPolicy,
  type SourceReference,
  type StructuredCompositionAnalysisInputV1,
  type SurfaceSpace,
  type TiePolicy,
  type TolerancePolicy,
} from "@norma/core";

type StructuredAnalyzeConsumerSummary = {
  readonly status: "valid";
  readonly comparisonStatus: "a_closer" | "b_closer" | "tie" | "ambiguous" | "non_comparable";
  readonly decisionStatus: "a_closer" | "b_closer" | "tie" | "ambiguous" | "non_comparable";
  readonly diagnostics: ReturnType<typeof analyzeStructuredCompositionV1>["diagnostics"];
  readonly warnings: ReturnType<typeof analyzeStructuredCompositionV1>["warnings"];
  readonly errors: ReturnType<typeof analyzeStructuredCompositionV1>["errors"];
  readonly provenance: ReturnType<typeof analyzeStructuredCompositionV1>["provenance"];
  readonly outputRefs: ReturnType<typeof analyzeStructuredCompositionV1>["outputRefs"];
  readonly packLockRef: PackLock["ref"];
  readonly operationContextRef: OperationContext["ref"];
  readonly replayReadinessStatus: "ready" | "ready_with_warnings" | "mismatch" | "non_replayable";
};

const coordinateSystem = {
  kind: "coordinate-system",
  id: "geometry-harmony-consumer:2d-metric",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "metric",
} as const;

const metricPolicy = {
  kind: "metric-policy",
  id: "geometry-harmony-consumer:pixel-length-policy",
  quantity: "length",
  unit: "px",
} as const;

const tolerancePolicy: TolerancePolicy = {
  kind: "tolerance-policy",
  id: "geometry-harmony-consumer:tolerance-policy",
  coordinateTolerance: 0,
  metricTolerance: 1,
};

const evaluationTolerances: EvaluationTolerances = {
  kind: "evaluation-tolerances",
  id: "geometry-harmony-consumer:evaluation-tolerances",
  guideProximity: 1,
  alignment: 1,
  containment: 0.01,
  overlap: 0.01,
  coverage: 0.02,
  areaRatio: 0.05,
};

const comparisonTolerances: TiePolicy = {
  kind: "tie-policy",
  id: "geometry-harmony-consumer:comparison-tolerances",
  scoreTolerance: 0.01,
};

const roundingPolicy: RoundingPolicy = {
  kind: "rounding-policy",
  id: "geometry-harmony-consumer:rounding-none",
  mode: "none",
  precision: null,
};

const numericPolicy: NumericPolicy = {
  kind: "numeric-policy",
  id: "geometry-harmony-consumer:numeric-finite",
  precision: "number",
  finiteOnly: true,
};

const orderingPolicy: OrderingPolicy = {
  kind: "ordering-policy",
  id: "geometry-harmony-consumer:ordering-output-refs-v1",
  outputRefs: "kind-rank-then-ref",
  featureFlags: "key-ascending",
};

const surface: SurfaceSpace = {
  kind: "surface-space",
  id: "surface:geometry-harmony-consumer:1000x618",
  bounds: { kind: "rect", x: 0, y: 0, width: 1000, height: 618 },
  coordinateSystem,
  metricPolicy,
  tolerancePolicy,
};

const compositionA: Composition2D = {
  kind: "composition-2d",
  id: "composition:geometry-harmony-consumer:A",
  coordinateSystem,
  metricPolicy,
  tolerancePolicy,
  surface,
  elements: [
    {
      kind: "element",
      id: "golden-major-panel",
      geometry: { kind: "rect", x: 0, y: 0, width: 618.0339887498949, height: 618 },
    },
    {
      kind: "element",
      id: "golden-minor-panel",
      geometry: { kind: "rect", x: 618.0339887498949, y: 0, width: 381.96601125010517, height: 618 },
    },
  ],
};

const compositionB: Composition2D = {
  kind: "composition-2d",
  id: "composition:geometry-harmony-consumer:B",
  coordinateSystem,
  metricPolicy,
  tolerancePolicy,
  surface,
  elements: [
    {
      kind: "element",
      id: "offset-major-panel",
      geometry: { kind: "rect", x: 0, y: 0, width: 570, height: 618 },
    },
    {
      kind: "element",
      id: "offset-minor-panel",
      geometry: { kind: "rect", x: 570, y: 0, width: 430, height: 618 },
    },
  ],
};

const packLock = requiredOutput(createPackLock({
  pack: GEOMETRY_HARMONIES_PACK,
  sourceRefs: [{ kind: "ratio-pack", ref: `${GEOMETRY_HARMONIES_PACK.id}@${GEOMETRY_HARMONIES_PACK.version}` }],
}), "createPackLock");

const sourceRefs: readonly SourceReference[] = [
  { kind: "structured-analysis-input", ref: "geometry-harmony-consumer:structured-input" },
  { kind: "surface", ref: surface.id },
  { kind: "ratio-pack", ref: `${GEOMETRY_HARMONIES_PACK.id}@${GEOMETRY_HARMONIES_PACK.version}` },
  { kind: "rule-set", ref: SURFACE_GOLDEN_SECTION_RULE_SET_ID },
  { kind: "evaluation-profile", ref: BASIC_GRID_ALIGNMENT_PROFILE.id },
  { kind: "tolerance-policy", ref: tolerancePolicy.id },
  { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
  { kind: "coordinate-system", ref: coordinateSystem.id },
  { kind: "metric-policy", ref: metricPolicy.id },
];

const operationContext = requiredOutput(createOperationContext({
  operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
  operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
  geometryModelVersion: "geometry-v1",
  coordinatePolicy: coordinateSystem,
  metricPolicy,
  tolerancePolicy,
  roundingPolicy,
  numericPolicy,
  orderingPolicy,
  featureFlags: { structuredAnalyzeConsumerExample: true },
  sourceRefs,
}), "createOperationContext");

const acceptedSourceIds = acceptedIds(compositionA, compositionB);
const acceptance = {
  accepted: true,
  mode: "user_supplied_structured_data",
  acceptedBy: "local-consumer-example",
  acceptedAt: "2026-06-28T00:00:00Z",
  acceptedSourceIds,
  acceptanceRecordId: "acceptance:geometry-harmony-consumer",
} as const;

const input: StructuredCompositionAnalysisInputV1 = {
  contractVersion: STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
  analysisId: "analysis:geometry-harmony-consumer",
  compositionA,
  compositionB,
  acceptance,
  ratioPack: GEOMETRY_HARMONIES_PACK,
  packLock,
  ruleSetRef: SURFACE_GOLDEN_SECTION_RULE_SET_ID,
  evaluationProfile: BASIC_GRID_ALIGNMENT_PROFILE,
  evaluationTolerances,
  comparisonTolerances,
  tolerancePolicy,
  operationContext,
  provenance: {
    kind: "structured-composition-analysis-provenance",
    sourceKind: "user_supplied_structured_data",
    externalSourceRef: { kind: "local-consumer-example", ref: "examples/consumer/structured-analyze-v1.ts" },
    callerSourceIds: acceptedSourceIds,
    adapter: null,
    mappingVersion: "structured-analyze-consumer-example-v1",
    normalizationVersion: null,
    transformationSteps: [],
    acceptanceRecord: acceptance,
    operationContextRef: operationContext.ref,
  },
};

const result = analyzeStructuredCompositionV1(input);

if (result.status !== "valid") {
  throw new Error(`Unexpected Structured Analyze status: ${result.status}`);
}

export const structuredAnalyzeConsumerSummary: StructuredAnalyzeConsumerSummary = {
  status: result.status,
  comparisonStatus: result.comparison.status,
  decisionStatus: result.decision.status,
  diagnostics: result.diagnostics,
  warnings: result.warnings,
  errors: result.errors,
  provenance: result.provenance,
  outputRefs: result.outputRefs,
  packLockRef: result.packLockRef,
  operationContextRef: result.operationContextRef,
  replayReadinessStatus: result.replayReadiness.status,
};

function requiredOutput<TOutput>(result: CoreResult<TOutput>, label: string): TOutput {
  if (result.status !== "ok" || result.output === null) {
    throw new Error(`Unexpected ${label} status: ${result.status}`);
  }

  return result.output;
}

function acceptedIds(first: Composition2D, second: Composition2D): readonly string[] {
  return [...new Set([
    ...compositionIds(first),
    ...compositionIds(second),
  ])].sort((left, right) => left.localeCompare(right));
}

function compositionIds(composition: Composition2D): readonly string[] {
  return [
    composition.id,
    composition.surface.id,
    ...composition.elements.map((element) => element.id),
    ...(composition.anchors ?? []).map((anchor) => anchor.id),
    ...composition.elements.flatMap((element) => (element.anchors ?? []).map((anchor) => anchor.id)),
  ];
}
