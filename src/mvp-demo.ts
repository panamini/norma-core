import {
  BASIC_PROPORTIONS_PACK,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  type RatioPack,
} from "./ratio-pack.js";
import { resolveRuleSet } from "./rules.js";
import type { ResolvedRuleSet } from "./rules.js";
import { generateConstruction } from "./construction.js";
import type { Construction } from "./construction.js";
import { measureGeometry } from "./measurements.js";
import type { MeasurementSet } from "./measurements.js";
import {
  BASIC_GRID_ALIGNMENT_PROFILE,
  evaluateCompositionBasic,
  type Evaluation,
  type EvaluationProfile,
  type EvaluationTolerances,
} from "./evaluation.js";
import {
  compareCompositionsBasic,
  type Comparison,
  type Explanation,
  type TiePolicy,
} from "./comparison.js";
import {
  generateConstructionSummaryArtifact,
  generateEvaluationReportArtifact,
  generateExplanationArtifact,
  generateSimpleVisualArtifact,
  generateStructuredResultArtifact,
  type ArtifactGenerationOptions,
  type ConstructionSummaryArtifact,
  type EvaluationReportArtifact,
  type ExplanationArtifact,
  type SimpleVisualArtifact,
  type StructuredResultArtifact,
} from "./artifacts.js";
import {
  createOperationContext,
  createPackLock,
  createRun,
  sortOutputRefsDeterministically,
} from "./runtime.js";
import type {
  Composition2D,
  CoordinateSystem,
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  MetricPolicy,
  NumericPolicy,
  OperationContext,
  OperationContextRef,
  OperationStatus,
  OrderingPolicy,
  PackLock,
  PackLockRef,
  Provenance,
  RoundingPolicy,
  Run,
  RunRef,
  SourceReference,
  SurfaceSpace,
  TolerancePolicy,
} from "./index.js";

export const MVP_DEMO_OPERATION_NAME = "core.mvp-demo.run" as const;
export const MVP_DEMO_OPERATION_VERSION = "0.1.0-pr12" as const;

export const MVP_DEMO_OPERATION_SEQUENCE = [
  "validate-lock-pack",
  "resolve-rule-set",
  "generate-construction",
  "measure-composition-a",
  "measure-composition-b",
  "evaluate-composition-a",
  "evaluate-composition-b",
  "compare-evaluations",
  "generate-explanation",
  "generate-structured-artifacts",
  "generate-simple-visual-artifact",
  "wrap-run",
  "produce-demo-report",
  "execute-negative-cases",
] as const;

export type MvpDemoOperationStep = (typeof MVP_DEMO_OPERATION_SEQUENCE)[number];

export interface MvpDemoInput {
  kind: "mvp-demo-input";
  surface: SurfaceSpace;
  ratioPack: RatioPack;
  packRef: string;
  packLock: PackLock;
  packLockRef: PackLockRef;
  ruleSetRef: string;
  compositionA: Composition2D;
  compositionB: Composition2D;
  evaluationProfile: EvaluationProfile;
  evaluationProfileRef: string;
  tolerancePolicy: TolerancePolicy;
  evaluationTolerances: EvaluationTolerances;
  comparisonTolerances: TiePolicy;
  operationContext: OperationContext;
  operationContextRef: OperationContextRef;
  runOptions: {
    metadata: {
      createdAt: string;
    };
  };
  artifactOptions: MvpDemoArtifactOptions;
  requestedOutputs: readonly string[];
  requestedArtifacts: readonly string[];
  sourceRefs: readonly SourceReference[];
}

export interface MvpDemoArtifactOptions {
  structuredConstruction: ArtifactGenerationOptions;
  structuredEvaluationA: ArtifactGenerationOptions;
  structuredEvaluationB: ArtifactGenerationOptions;
  structuredComparison: ArtifactGenerationOptions;
  constructionSummary: ArtifactGenerationOptions;
  evaluationReportA: ArtifactGenerationOptions;
  evaluationReportB: ArtifactGenerationOptions;
  explanation: ArtifactGenerationOptions;
  simpleVisual: ArtifactGenerationOptions;
}

export interface MvpDemoResult {
  kind: "mvp-demo-result";
  inputSummary: MvpDemoInputSummary;
  constructionResult: CoreResult<Construction>;
  measurementAResult: CoreResult<MeasurementSet>;
  measurementBResult: CoreResult<MeasurementSet>;
  evaluationAResult: CoreResult<Evaluation>;
  evaluationBResult: CoreResult<Evaluation>;
  comparisonResult: CoreResult<Comparison>;
  explanationResult: Explanation;
  artifactResults: MvpDemoArtifactResults;
  visualArtifactResult: CoreResult<SimpleVisualArtifact>;
  runEnvelope: Run;
  demoReport: MvpDemoReport;
  negativeCaseResults: readonly NegativeCaseResult[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  outputRefs: readonly SourceReference[];
  packLock: PackLock;
  packLockRef: PackLockRef;
  operationContext: OperationContext;
  operationContextRef: OperationContextRef;
}

export interface MvpDemoInputSummary {
  kind: "mvp-demo-input-summary";
  surfaceRef: string;
  surfaceSize: { width: number; height: number };
  packRef: string;
  packLockRef: string;
  ruleSetRef: string;
  evaluationProfileRef: string;
  tolerancePolicyRef: string;
  evaluationTolerancesRef: string;
  operationContextRef: string;
  compositionRefs: readonly string[];
  requestedOutputs: readonly string[];
  requestedArtifacts: readonly string[];
}

export interface MvpDemoArtifactResults {
  kind: "mvp-demo-artifact-results";
  structuredResults: readonly CoreResult<StructuredResultArtifact>[];
  constructionSummary: CoreResult<ConstructionSummaryArtifact>;
  evaluationReports: readonly CoreResult<EvaluationReportArtifact>[];
  explanation: CoreResult<ExplanationArtifact>;
}

export interface MvpDemoReport {
  kind: "mvp-demo-report";
  scenario: "surface-proportional-evaluation";
  truthSource: "structured-core-objects";
  surfaceSummary: { surfaceRef: string; width: number; height: number };
  packRef: string;
  packLockRef: string;
  ruleSetRef: string;
  evaluationProfileRef: string;
  operationSequence: readonly MvpDemoOperationStep[];
  truthOrder: readonly string[];
  outputRefs: readonly SourceReference[];
  statuses: {
    construction: OperationStatus;
    measurementA: OperationStatus;
    measurementB: OperationStatus;
    evaluationA: OperationStatus;
    evaluationB: OperationStatus;
    comparison: Comparison["status"];
    runReadiness: Run["replayReadinessStatus"];
  };
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  negativeCaseSummary: readonly NegativeCaseSummary[];
  runRefs: {
    runRef: string;
    packLockRef: string;
    operationContextRef: string;
  };
  deterministicReplayReadiness: {
    sameInputPackRulesTolerancesContextOperationVersion: true;
    outputRefsDeterministic: true;
    operationVersion: typeof MVP_DEMO_OPERATION_VERSION;
  };
  visualArtifactDerived: true;
  noPostMvpSurfaces: true;
}

export interface NegativeCaseSummary {
  caseId: NegativeCaseResult["caseId"];
  actualStatus: string;
  pass: boolean;
  actualDiagnostics: readonly DiagnosticCode[];
}

export interface NegativeCaseResult {
  kind: "negative-case-result";
  caseId:
    | "MissingPackLock"
    | "MissingEvaluationProfile"
    | "DifferentTolerancesForComparison"
    | "BeautyScoreRequested"
    | "RatioAbsentFromPack"
    | "MissingRule"
    | "ImplicitPackRejected"
    | "MismatchContext"
    | "ArtifactAsSourceRejected";
  description: string;
  expectedStatus: string;
  expectedDiagnostic: DiagnosticCode;
  actualStatus: string;
  actualDiagnostics: readonly DiagnosticCode[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  sourceRefs: readonly SourceReference[];
  pass: boolean;
  notes: string | null;
}

interface MvpDemoResultInput<TOutput> {
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

interface MvpDemoDiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
  blocking?: boolean;
}

type MvpDemoValidation =
  | { ok: true; input: MvpDemoInput }
  | { ok: false; result: CoreResult<MvpDemoResult> };

interface MvpDemoCoreOutputs {
  ruleSet: ResolvedRuleSet;
  constructionResult: SuccessfulCoreResult<Construction>;
  measurementAResult: SuccessfulCoreResult<MeasurementSet>;
  measurementBResult: SuccessfulCoreResult<MeasurementSet>;
  evaluationAResult: SuccessfulCoreResult<Evaluation>;
  evaluationBResult: SuccessfulCoreResult<Evaluation>;
  comparisonResult: SuccessfulCoreResult<Comparison>;
}

type SuccessfulCoreResult<TOutput> = CoreResult<TOutput> & { output: TOutput };

const MVP_DEMO_SOURCE_REF: SourceReference = Object.freeze({ kind: "core", ref: "norma-core/mvp-demo" });

const DEFAULT_MVP_DEMO_RESULT_FIELDS = Object.freeze({
  warnings: [] as readonly CoreWarning[],
  errors: [] as readonly CoreError[],
  provenance: null as Provenance | null,
  outputRefs: [] as readonly SourceReference[],
  runRef: null as RunRef | null,
  packLockRef: null as PackLockRef | null,
  operationContextRef: null as OperationContextRef | null,
  output: null,
});

const DEMO_COORDINATE_SYSTEM: CoordinateSystem = Object.freeze({
  kind: "coordinate-system",
  id: "norma-canonical-2d-metric",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "metric",
});

const DEMO_METRIC_POLICY: MetricPolicy = Object.freeze({
  kind: "metric-policy",
  id: "pixel-length-policy",
  quantity: "length",
  unit: "px",
});

const DEMO_TOLERANCE_POLICY: TolerancePolicy = Object.freeze({
  kind: "tolerance-policy",
  id: "mvp-demo-tolerance-policy",
  coordinateTolerance: 0,
  metricTolerance: 1,
});

const DEMO_EVALUATION_TOLERANCES: EvaluationTolerances = Object.freeze({
  kind: "evaluation-tolerances",
  id: "mvp-demo-evaluation-tolerances",
  guideProximity: 0.1,
  alignment: 0,
  containment: 0,
  overlap: 0.01,
  coverage: 0.02,
  areaRatio: 0.05,
});

const DEMO_COMPARISON_TOLERANCES: TiePolicy = Object.freeze({
  kind: "tie-policy",
  id: "mvp-demo-comparison-tolerances",
  scoreTolerance: 0.01,
});

const DEMO_ROUNDING_POLICY: RoundingPolicy = Object.freeze({
  kind: "rounding-policy",
  id: "runtime.rounding.none",
  mode: "none",
  precision: null,
});

const DEMO_NUMERIC_POLICY: NumericPolicy = Object.freeze({
  kind: "numeric-policy",
  id: "runtime.numeric.finite-number",
  precision: "number",
  finiteOnly: true,
});

const DEMO_ORDERING_POLICY: OrderingPolicy = Object.freeze({
  kind: "ordering-policy",
  id: "runtime.ordering.output-refs-v1",
  outputRefs: "kind-rank-then-ref",
  featureFlags: "key-ascending",
});

const DEMO_RUN_OPTIONS = Object.freeze({
  metadata: Object.freeze({
    createdAt: "2026-06-12T00:00:00Z",
  }),
});

const DEMO_REQUESTED_OUTPUTS = Object.freeze([
  "construction",
  "measurements",
  "evaluation",
  "comparison",
  "decision",
  "explanation",
  "artifacts",
  "simple-visual",
  "run",
]);

const DEMO_REQUESTED_ARTIFACTS = Object.freeze([
  "structured-result",
  "construction-summary",
  "evaluation-report",
  "explanation",
  "simple-visual",
]);

export function createMvpDemoInput(): MvpDemoInput {
  const surface = createDemoSurface();
  const ratioPack = BASIC_PROPORTIONS_PACK;
  const packLock = requiredOutput(createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }), "createPackLock");
  const tolerancePolicy = DEMO_TOLERANCE_POLICY;
  const evaluationTolerances = DEMO_EVALUATION_TOLERANCES;
  const ruleSetRef = SURFACE_BASIC_THIRD_GRID_RULE_SET_ID;
  const evaluationProfile = BASIC_GRID_ALIGNMENT_PROFILE;
  const sourceRefs = createDemoSourceRefs(surface, ratioPack, ruleSetRef, evaluationProfile, tolerancePolicy, evaluationTolerances);
  const operationContext = requiredOutput(createOperationContext({
    operationName: MVP_DEMO_OPERATION_NAME,
    operationVersion: MVP_DEMO_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: surface.coordinateSystem,
    metricPolicy: surface.metricPolicy ?? null,
    tolerancePolicy,
    roundingPolicy: DEMO_ROUNDING_POLICY,
    numericPolicy: DEMO_NUMERIC_POLICY,
    orderingPolicy: DEMO_ORDERING_POLICY,
    featureFlags: { mvpDemoHarness: true },
    sourceRefs,
  }), "createOperationContext");

  return {
    kind: "mvp-demo-input",
    surface,
    ratioPack,
    packRef: ratioPackRef(ratioPack),
    packLock,
    packLockRef: packLock.ref,
    ruleSetRef,
    compositionA: createDemoCompositionA(surface),
    compositionB: createDemoCompositionB(surface),
    evaluationProfile,
    evaluationProfileRef: evaluationProfile.ref,
    tolerancePolicy,
    evaluationTolerances,
    comparisonTolerances: DEMO_COMPARISON_TOLERANCES,
    operationContext,
    operationContextRef: operationContext.ref,
    runOptions: DEMO_RUN_OPTIONS,
    artifactOptions: createArtifactOptions(),
    requestedOutputs: DEMO_REQUESTED_OUTPUTS,
    requestedArtifacts: DEMO_REQUESTED_ARTIFACTS,
    sourceRefs,
  };
}

export function runMvpDemo(input: MvpDemoInput | null | undefined): CoreResult<MvpDemoResult> {
  const validation = validateMvpDemoInput(input);
  if (!validation.ok) {
    return validation.result;
  }

  try {
    return runValidatedMvpDemo(validation.input);
  } catch (error) {
    if (error instanceof MvpDemoStageFailure) {
      return failedFromStage(error.result);
    }
    throw error;
  }
}

function runValidatedMvpDemo(demoInput: MvpDemoInput): CoreResult<MvpDemoResult> {
  const coreOutputs = createMvpCoreOutputs(demoInput);
  const runEnvelope = createDemoRun(demoInput, coreOutputs);
  const artifactResults = generateDemoArtifacts({
    input: demoInput,
    runRef: runEnvelope.runRef,
    constructionResult: coreOutputs.constructionResult,
    evaluationAResult: coreOutputs.evaluationAResult,
    evaluationBResult: coreOutputs.evaluationBResult,
    comparisonResult: coreOutputs.comparisonResult,
  });
  ensureArtifactsOk(artifactResults);
  const visualArtifactResult = createDemoVisualArtifact(demoInput, coreOutputs.constructionResult.output, runEnvelope.runRef);
  const visualArtifact = stageOutput(visualArtifactResult);
  const negativeCaseResults = executeNegativeCases({
    input: demoInput,
    ruleSet: coreOutputs.ruleSet,
    construction: coreOutputs.constructionResult.output,
    measurementA: coreOutputs.measurementAResult.output,
    measurementB: coreOutputs.measurementBResult.output,
    evaluationA: coreOutputs.evaluationAResult.output,
    evaluationB: coreOutputs.evaluationBResult.output,
    visualArtifact,
  });
  return createSuccessfulDemoResult({
    input: demoInput,
    coreOutputs,
    artifactResults,
    visualArtifactResult,
    runEnvelope,
    negativeCaseResults,
  });
}

function createMvpCoreOutputs(demoInput: MvpDemoInput): MvpDemoCoreOutputs {
  stageOutput(createPackLock({
    pack: demoInput.ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: demoInput.packRef }],
  }));

  const ruleSet = stageOutput(resolveRuleSet(demoInput.ratioPack, demoInput.ruleSetRef));
  const constructionResult = successfulStage(generateConstruction({
    surface: demoInput.surface,
    pack: demoInput.ratioPack,
    resolvedRuleSet: ruleSet,
    operationContextRef: demoInput.operationContextRef,
  }));
  const measurementAResult = successfulStage(measureGeometry({
    construction: constructionResult.output,
    compositions: [{ label: "A", geometry: demoInput.compositionA }],
    operationContextRef: demoInput.operationContextRef,
    requestedOutputs: ["measurements"],
  }));
  const measurementBResult = successfulStage(measureGeometry({
    construction: constructionResult.output,
    compositions: [{ label: "B", geometry: demoInput.compositionB }],
    operationContextRef: demoInput.operationContextRef,
    requestedOutputs: ["measurements"],
  }));
  const evaluationAResult = successfulStage(evaluateMvpComposition(demoInput, measurementAResult.output, "A"));
  const evaluationBResult = successfulStage(evaluateMvpComposition(demoInput, measurementBResult.output, "B"));
  const comparisonResult = successfulStage(compareCompositionsBasic({
    evaluationA: evaluationAResult.output,
    evaluationB: evaluationBResult.output,
    tiePolicy: demoInput.comparisonTolerances,
    operationContextRef: demoInput.operationContextRef,
    requestedOutputs: ["comparison", "decision", "explanation"],
  }));

  return {
    ruleSet,
    constructionResult,
    measurementAResult,
    measurementBResult,
    evaluationAResult,
    evaluationBResult,
    comparisonResult,
  };
}

function evaluateMvpComposition(
  demoInput: MvpDemoInput,
  measurements: MeasurementSet,
  compositionLabel: "A" | "B",
): CoreResult<Evaluation> {
  return evaluateCompositionBasic({
    measurements,
    compositionLabel,
    profile: demoInput.evaluationProfile,
    pack: demoInput.ratioPack,
    packLock: demoInput.packLock,
    packPreLock: demoInput.ratioPack.preLock,
    tolerancePolicy: demoInput.tolerancePolicy,
    tolerances: demoInput.evaluationTolerances,
    operationContextRef: demoInput.operationContextRef,
    requestedOutputs: ["evaluation"],
    sourceReferences: evaluationSourceRefs(demoInput),
  });
}

function createDemoRun(demoInput: MvpDemoInput, coreOutputs: MvpDemoCoreOutputs): Run {
  const outputRefsBeforeRun = outputRefsForRun([
    ...coreOutputs.constructionResult.outputRefs,
    ...coreOutputs.measurementAResult.outputRefs,
    ...coreOutputs.measurementBResult.outputRefs,
    ...coreOutputs.evaluationAResult.outputRefs,
    ...coreOutputs.evaluationBResult.outputRefs,
    ...coreOutputs.comparisonResult.outputRefs,
    ...anticipatedArtifactRefs(demoInput.artifactOptions),
  ]);

  return stageOutput(createRun({
    operationName: MVP_DEMO_OPERATION_NAME,
    operationVersion: MVP_DEMO_OPERATION_VERSION,
    packLock: demoInput.packLock,
    operationContext: demoInput.operationContext,
    result: createDemoSourceResult(demoInput, outputRefsBeforeRun),
    outputRefs: outputRefsBeforeRun,
    sourceRefs: demoInput.sourceRefs,
    metadata: demoInput.runOptions.metadata,
  }));
}

function createDemoVisualArtifact(
  demoInput: MvpDemoInput,
  construction: Construction,
  runRef: RunRef,
): SuccessfulCoreResult<SimpleVisualArtifact> {
  return successfulStage(generateSimpleVisualArtifact({
    construction,
    options: demoInput.artifactOptions.simpleVisual,
    runRef,
    operationContextRef: demoInput.operationContextRef,
  }));
}

function createSuccessfulDemoResult(input: {
  input: MvpDemoInput;
  coreOutputs: MvpDemoCoreOutputs;
  artifactResults: MvpDemoArtifactResults;
  visualArtifactResult: SuccessfulCoreResult<SimpleVisualArtifact>;
  runEnvelope: Run;
  negativeCaseResults: readonly NegativeCaseResult[];
}): CoreResult<MvpDemoResult> {
  const outputRefs = outputRefsForRun([
    ...input.runEnvelope.outputRefs.refs,
    ...artifactOutputRefs(input.artifactResults),
    ...input.visualArtifactResult.outputRefs,
  ]);
  const warnings = uniqueDiagnostics([
    ...input.coreOutputs.constructionResult.warnings,
    ...input.coreOutputs.measurementAResult.warnings,
    ...input.coreOutputs.measurementBResult.warnings,
    ...input.coreOutputs.evaluationAResult.warnings,
    ...input.coreOutputs.evaluationBResult.warnings,
    ...input.coreOutputs.comparisonResult.warnings,
    ...input.runEnvelope.warnings,
    ...artifactWarnings(input.artifactResults),
    ...input.visualArtifactResult.warnings,
  ]);
  const errors: readonly CoreError[] = [];
  const report = createDemoReport({
    input: input.input,
    constructionResult: input.coreOutputs.constructionResult,
    measurementAResult: input.coreOutputs.measurementAResult,
    measurementBResult: input.coreOutputs.measurementBResult,
    evaluationAResult: input.coreOutputs.evaluationAResult,
    evaluationBResult: input.coreOutputs.evaluationBResult,
    comparison: input.coreOutputs.comparisonResult.output,
    run: input.runEnvelope,
    negativeCaseResults: input.negativeCaseResults,
    outputRefs,
    warnings,
    errors,
  });
  const output: MvpDemoResult = {
    kind: "mvp-demo-result",
    inputSummary: createInputSummary(input.input),
    constructionResult: input.coreOutputs.constructionResult,
    measurementAResult: input.coreOutputs.measurementAResult,
    measurementBResult: input.coreOutputs.measurementBResult,
    evaluationAResult: input.coreOutputs.evaluationAResult,
    evaluationBResult: input.coreOutputs.evaluationBResult,
    comparisonResult: input.coreOutputs.comparisonResult,
    explanationResult: input.coreOutputs.comparisonResult.output.explanation,
    artifactResults: input.artifactResults,
    visualArtifactResult: input.visualArtifactResult,
    runEnvelope: input.runEnvelope,
    demoReport: report,
    negativeCaseResults: input.negativeCaseResults,
    warnings,
    errors,
    outputRefs,
    packLock: input.input.packLock,
    packLockRef: input.input.packLockRef,
    operationContext: input.input.operationContext,
    operationContextRef: input.input.operationContextRef,
  };

  return createMvpDemoResult({
    status: "ok",
    warnings,
    errors,
    provenance: createMvpDemoProvenance("run", input.input.sourceRefs),
    outputRefs,
    runRef: input.runEnvelope.runRef,
    packLockRef: input.input.packLockRef,
    operationContextRef: input.input.operationContextRef,
    output,
  });
}

function generateDemoArtifacts(input: {
  input: MvpDemoInput;
  runRef: RunRef;
  constructionResult: CoreResult<Construction>;
  evaluationAResult: CoreResult<Evaluation>;
  evaluationBResult: CoreResult<Evaluation>;
  comparisonResult: CoreResult<Comparison>;
}): MvpDemoArtifactResults {
  const { input: demoInput, runRef, constructionResult, evaluationAResult, evaluationBResult, comparisonResult } = input;
  return {
    kind: "mvp-demo-artifact-results",
    structuredResults: [
      generateStructuredResultArtifact({
        result: constructionResult,
        sourceResultRef: { kind: "core-result", ref: "mvp-demo:construction" },
        options: demoInput.artifactOptions.structuredConstruction,
        runRef,
        operationContextRef: demoInput.operationContextRef,
      }),
      generateStructuredResultArtifact({
        result: evaluationAResult,
        sourceResultRef: { kind: "core-result", ref: "mvp-demo:evaluation:A" },
        options: demoInput.artifactOptions.structuredEvaluationA,
        runRef,
        operationContextRef: demoInput.operationContextRef,
      }),
      generateStructuredResultArtifact({
        result: evaluationBResult,
        sourceResultRef: { kind: "core-result", ref: "mvp-demo:evaluation:B" },
        options: demoInput.artifactOptions.structuredEvaluationB,
        runRef,
        operationContextRef: demoInput.operationContextRef,
      }),
      generateStructuredResultArtifact({
        result: comparisonResult,
        sourceResultRef: { kind: "core-result", ref: "mvp-demo:comparison" },
        options: demoInput.artifactOptions.structuredComparison,
        runRef,
        operationContextRef: demoInput.operationContextRef,
      }),
    ],
    constructionSummary: generateConstructionSummaryArtifact({
      construction: constructionResult.output,
      options: demoInput.artifactOptions.constructionSummary,
      runRef,
      operationContextRef: demoInput.operationContextRef,
    }),
    evaluationReports: [
      generateEvaluationReportArtifact({
        evaluation: evaluationAResult.output,
        options: demoInput.artifactOptions.evaluationReportA,
        runRef,
        operationContextRef: demoInput.operationContextRef,
      }),
      generateEvaluationReportArtifact({
        evaluation: evaluationBResult.output,
        options: demoInput.artifactOptions.evaluationReportB,
        runRef,
        operationContextRef: demoInput.operationContextRef,
      }),
    ],
    explanation: generateExplanationArtifact({
      explanation: comparisonResult.output?.explanation ?? null,
      sourceExplanationRef: comparisonResult.output === null ? null : { kind: "explanation", ref: `explanation:${comparisonResult.output.id}` },
      options: demoInput.artifactOptions.explanation,
      runRef,
      operationContextRef: demoInput.operationContextRef,
    }),
  };
}

function executeNegativeCases(input: {
  input: MvpDemoInput;
  ruleSet: ResolvedRuleSet;
  construction: Construction;
  measurementA: MeasurementSet;
  measurementB: MeasurementSet;
  evaluationA: Evaluation;
  evaluationB: Evaluation;
  visualArtifact: SimpleVisualArtifact;
}): readonly NegativeCaseResult[] {
  const demoInput = input.input;
  const differentTolerances = {
    ...demoInput.evaluationTolerances,
    id: "mvp-demo-evaluation-tolerances-other",
    guideProximity: demoInput.evaluationTolerances.guideProximity / 2,
  };
  const evaluationBDifferentTolerances = evaluateCompositionBasic({
    measurements: input.measurementB,
    compositionLabel: "B",
    profile: demoInput.evaluationProfile,
    pack: demoInput.ratioPack,
    packLock: demoInput.packLock,
    packPreLock: demoInput.ratioPack.preLock,
    tolerancePolicy: demoInput.tolerancePolicy,
    tolerances: differentTolerances,
    operationContextRef: demoInput.operationContextRef,
    requestedOutputs: ["evaluation"],
    sourceReferences: evaluationSourceRefs(demoInput, { evaluationTolerancesRef: differentTolerances.id }),
  });
  const differentToleranceComparison = evaluationBDifferentTolerances.output === null
    ? evaluationBDifferentTolerances
    : compareCompositionsBasic({
      evaluationA: input.evaluationA,
      evaluationB: evaluationBDifferentTolerances.output,
      tiePolicy: demoInput.comparisonTolerances,
      operationContextRef: demoInput.operationContextRef,
      requestedOutputs: ["comparison", "decision", "explanation"],
    });

  const otherContextRef = { id: "operation-context:mvp-demo-other-context" };
  const evaluationBMismatchedContext = evaluateCompositionBasic({
    measurements: input.measurementB,
    compositionLabel: "B",
    profile: demoInput.evaluationProfile,
    pack: demoInput.ratioPack,
    packLock: demoInput.packLock,
    packPreLock: demoInput.ratioPack.preLock,
    tolerancePolicy: demoInput.tolerancePolicy,
    tolerances: demoInput.evaluationTolerances,
    operationContextRef: otherContextRef,
    requestedOutputs: ["evaluation"],
    sourceReferences: evaluationSourceRefs(demoInput, { operationContextRef: otherContextRef.id }),
  });
  const mismatchContextComparison = evaluationBMismatchedContext.output === null
    ? evaluationBMismatchedContext
    : compareCompositionsBasic({
      evaluationA: input.evaluationA,
      evaluationB: evaluationBMismatchedContext.output,
      tiePolicy: demoInput.comparisonTolerances,
      operationContextRef: demoInput.operationContextRef,
      requestedOutputs: ["comparison", "decision", "explanation"],
    });

  return [
    negativeCase(
      "MissingPackLock",
      "Evaluation is called without an effective pack lock or prelock.",
      "failed",
      "MissingPackLock",
      evaluateCompositionBasic({
        measurements: input.measurementA,
        compositionLabel: "A",
        profile: demoInput.evaluationProfile,
        pack: demoInput.ratioPack,
        tolerancePolicy: demoInput.tolerancePolicy,
        tolerances: demoInput.evaluationTolerances,
        operationContextRef: demoInput.operationContextRef,
        requestedOutputs: ["evaluation"],
        sourceReferences: evaluationSourceRefs(demoInput),
      }),
    ),
    negativeCase(
      "MissingEvaluationProfile",
      "Evaluation is called without the explicit profile.",
      "failed",
      "MissingEvaluationProfile",
      evaluateCompositionBasic({
        measurements: input.measurementA,
        compositionLabel: "A",
        profile: null,
        pack: demoInput.ratioPack,
        packLock: demoInput.packLock,
        packPreLock: demoInput.ratioPack.preLock,
        tolerancePolicy: demoInput.tolerancePolicy,
        tolerances: demoInput.evaluationTolerances,
        operationContextRef: demoInput.operationContextRef,
        requestedOutputs: ["evaluation"],
        sourceReferences: evaluationSourceRefs(demoInput),
      }),
    ),
    negativeCase(
      "DifferentTolerancesForComparison",
      "A and B are compared after being evaluated with different tolerances.",
      "non_comparable",
      "NonComparableEvaluations",
      differentToleranceComparison,
    ),
    negativeCase(
      "BeautyScoreRequested",
      "Evaluation is called with a blocked score output request.",
      "failed",
      "BeautyScoreRejected",
      evaluateCompositionBasic({
        measurements: input.measurementA,
        compositionLabel: "A",
        profile: demoInput.evaluationProfile,
        pack: demoInput.ratioPack,
        packLock: demoInput.packLock,
        packPreLock: demoInput.ratioPack.preLock,
        tolerancePolicy: demoInput.tolerancePolicy,
        tolerances: demoInput.evaluationTolerances,
        operationContextRef: demoInput.operationContextRef,
        requestedOutputs: ["beauty-score"],
        sourceReferences: evaluationSourceRefs(demoInput),
      }),
    ),
    negativeCase(
      "RatioAbsentFromPack",
      "Rule resolution is called with a controlled pack variant missing the required ratio.",
      "failed",
      "MissingRatioReference",
      resolveRuleSet(packWithoutRatio(demoInput.ratioPack, "1/3"), demoInput.ruleSetRef),
    ),
    negativeCase(
      "MissingRule",
      "Rule resolution is called with a controlled rule set variant containing a missing rule ref.",
      "failed",
      "MissingRuleDeclaration",
      resolveRuleSet(packWithMissingRule(demoInput.ratioPack), demoInput.ruleSetRef),
    ),
    negativeCase(
      "ImplicitPackRejected",
      "The harness is called without the explicit pack required by the demo contract.",
      "failed",
      "ImplicitPackNotAllowed",
      runMvpDemo({ ...demoInput, ratioPack: undefined } as unknown as MvpDemoInput),
    ),
    negativeCase(
      "MismatchContext",
      "A and B are compared with different effective operation context refs.",
      "non_comparable",
      "NonComparableEvaluations",
      mismatchContextComparison,
    ),
    negativeCase(
      "ArtifactAsSourceRejected",
      "A derived artifact is passed as if it were a core source result.",
      "failed",
      "ArtifactWouldBecomeSourceOfTruth",
      generateStructuredResultArtifact({
        result: input.visualArtifact as unknown as CoreResult,
        sourceResultRef: { kind: "artifact", ref: input.visualArtifact.id },
        options: demoInput.artifactOptions.structuredComparison,
        runRef: { id: "run:negative-case" },
        operationContextRef: demoInput.operationContextRef,
      }),
    ),
  ];
}

function negativeCase(
  caseId: NegativeCaseResult["caseId"],
  description: string,
  expectedStatus: string,
  expectedDiagnostic: DiagnosticCode,
  result: CoreResult<unknown>,
): NegativeCaseResult {
  const warnings = [...result.warnings];
  const errors = [...result.errors];
  const actualDiagnostics = diagnosticsFor(result);
  const actualStatus = actualStatusForNegativeCase(result);
  return {
    kind: "negative-case-result",
    caseId,
    description,
    expectedStatus,
    expectedDiagnostic,
    actualStatus,
    actualDiagnostics,
    warnings,
    errors,
    sourceRefs: sourceRefsForResult(result),
    pass: negativeCasePassed(actualStatus, expectedStatus, actualDiagnostics, expectedDiagnostic),
    notes: null,
  };
}

function actualStatusForNegativeCase(result: CoreResult<unknown>): string {
  const comparisonStatus = comparisonOutputStatus(result);
  return comparisonStatus === null ? result.status : comparisonStatus;
}

function negativeCasePassed(
  actualStatus: string,
  expectedStatus: string,
  actualDiagnostics: readonly DiagnosticCode[],
  expectedDiagnostic: DiagnosticCode,
): boolean {
  return actualStatus === expectedStatus && actualDiagnostics.includes(expectedDiagnostic);
}

function sourceRefsForResult(result: CoreResult<unknown>): readonly SourceReference[] {
  return result.provenance === null ? [] : result.provenance.inputRefs;
}

function validateMvpDemoInput(input: MvpDemoInput | null | undefined): MvpDemoValidation {
  if (!isRecord(input)) {
    return failedValidation("InvalidInputShape", "MVP demo input must be a structured object.", "input");
  }

  const failedCheck = [
    validationCheck(!("freeFormPrompt" in input), "FreeFormPromptNotAllowed", "MVP demo input must be structured data, not a free-form prompt.", "freeFormPrompt"),
    validationCheck(isRecord(input.ratioPack), "ImplicitPackNotAllowed", "MVP demo requires an explicit ratio pack.", "ratioPack"),
    validationCheck(isRecord(input.packLock), "MissingPackLock", "MVP demo requires an explicit effective pack lock.", "packLock"),
    validationCheck(isRecord(input.evaluationProfile), "MissingEvaluationProfile", "MVP demo requires an explicit evaluation profile.", "evaluationProfile"),
    validationCheck(isRecord(input.evaluationTolerances), "MissingTolerances", "MVP demo requires explicit evaluation tolerances.", "evaluationTolerances"),
    validationCheck(isRecord(input.tolerancePolicy), "MissingTolerancePolicy", "MVP demo requires an explicit tolerance policy.", "tolerancePolicy"),
    validationCheck(isRecord(input.operationContext), "MissingOperationContext", "MVP demo requires an explicit operation context.", "operationContext"),
  ].find((check) => !check.ok);

  if (failedCheck !== undefined) {
    return failedValidation(failedCheck.code, failedCheck.message, failedCheck.targetRef);
  }

  return { ok: true, input };
}

function validationCheck(
  ok: boolean,
  code: DiagnosticCode,
  message: string,
  targetRef: string,
): { ok: boolean; code: DiagnosticCode; message: string; targetRef: string } {
  return { ok, code, message, targetRef };
}

function failedValidation(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
): MvpDemoValidation {
  return {
    ok: false,
    result: createMvpDemoResult({
      status: "failed",
      errors: [mvpError({ code, message, targetRef })],
      provenance: createMvpDemoProvenance("validate", [{ kind: "mvp-demo-input", ref: targetRef }]),
    }),
  };
}

function createDemoSurface(): SurfaceSpace {
  return {
    kind: "surface-space",
    id: "surface:1200x800",
    coordinateSystem: DEMO_COORDINATE_SYSTEM,
    metricPolicy: DEMO_METRIC_POLICY,
    tolerancePolicy: DEMO_TOLERANCE_POLICY,
    bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
  };
}

function createDemoCompositionA(surface: SurfaceSpace): Composition2D {
  return {
    kind: "composition-2d",
    id: "composition:A",
    coordinateSystem: surface.coordinateSystem,
    metricPolicy: surface.metricPolicy ?? null,
    tolerancePolicy: surface.tolerancePolicy ?? null,
    surface,
    elements: [
      { kind: "element", id: "left-third", geometry: { kind: "rect", x: 0, y: 0, width: 400, height: 800 } },
      { kind: "element", id: "middle-third", geometry: { kind: "rect", x: 400, y: 0, width: 400, height: 800 } },
      { kind: "element", id: "right-third", geometry: { kind: "rect", x: 800, y: 0, width: 400, height: 800 } },
    ],
  };
}

function createDemoCompositionB(surface: SurfaceSpace): Composition2D {
  return {
    kind: "composition-2d",
    id: "composition:B",
    coordinateSystem: surface.coordinateSystem,
    metricPolicy: surface.metricPolicy ?? null,
    tolerancePolicy: surface.tolerancePolicy ?? null,
    surface,
    elements: [
      { kind: "element", id: "wide-left", geometry: { kind: "rect", x: 0, y: 0, width: 700, height: 800 } },
      { kind: "element", id: "offset-right", geometry: { kind: "rect", x: 650, y: 0, width: 400, height: 800 } },
    ],
  };
}

function createArtifactOptions(): MvpDemoArtifactOptions {
  return {
    structuredConstruction: artifactOptions("structured-result", "mvp-demo:construction"),
    structuredEvaluationA: artifactOptions("structured-result", "mvp-demo:evaluation:A"),
    structuredEvaluationB: artifactOptions("structured-result", "mvp-demo:evaluation:B"),
    structuredComparison: artifactOptions("structured-result", "mvp-demo:comparison"),
    constructionSummary: artifactOptions("construction-summary", "mvp-demo:construction-summary", { lossy: true }),
    evaluationReportA: artifactOptions("evaluation-report", "mvp-demo:evaluation-report:A", { lossy: true }),
    evaluationReportB: artifactOptions("evaluation-report", "mvp-demo:evaluation-report:B", { lossy: true }),
    explanation: artifactOptions("explanation", "mvp-demo:explanation", { lossy: true }),
    simpleVisual: artifactOptions("simple-visual", "mvp-demo:simple-visual", { lossy: true }),
  };
}

function artifactOptions(
  artifactType: ArtifactGenerationOptions["artifactType"],
  id: string,
  overrides: Partial<ArtifactGenerationOptions> = {},
): ArtifactGenerationOptions {
  return {
    kind: "artifact-generation-options",
    id,
    artifactType,
    ...overrides,
  };
}

function createDemoSourceRefs(
  surface: SurfaceSpace,
  ratioPack: RatioPack,
  ruleSetRef: string,
  evaluationProfile: EvaluationProfile,
  tolerancePolicy: TolerancePolicy,
  evaluationTolerances: EvaluationTolerances,
): readonly SourceReference[] {
  return [
    { kind: "mvp-demo-input", ref: "mvp-demo:structured-input" },
    { kind: "surface", ref: surface.id },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: ruleSetRef },
    { kind: "evaluation-profile", ref: evaluationProfile.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: surface.coordinateSystem.id },
    ...(surface.metricPolicy === undefined || surface.metricPolicy === null ? [] : [{ kind: "metric-policy", ref: surface.metricPolicy.id }]),
  ];
}

function evaluationSourceRefs(
  input: MvpDemoInput,
  overrides: {
    evaluationTolerancesRef?: string;
    operationContextRef?: string;
  } = {},
): readonly SourceReference[] {
  return [
    { kind: "surface", ref: input.surface.id },
    { kind: "coordinate-system", ref: input.surface.coordinateSystem.id },
    ...metricPolicySourceRefs(input.surface.metricPolicy),
    { kind: "evaluation-tolerances", ref: overrideRef(overrides.evaluationTolerancesRef, input.evaluationTolerances.id) },
    { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
    { kind: "operation-context", ref: overrideRef(overrides.operationContextRef, input.operationContextRef.id) },
  ];
}

function metricPolicySourceRefs(metricPolicy: MetricPolicy | null | undefined): readonly SourceReference[] {
  return metricPolicy === undefined || metricPolicy === null ? [] : [{ kind: "metric-policy", ref: metricPolicy.id }];
}

function overrideRef(value: string | undefined, fallback: string): string {
  return value === undefined ? fallback : value;
}

function createInputSummary(input: MvpDemoInput): MvpDemoInputSummary {
  return {
    kind: "mvp-demo-input-summary",
    surfaceRef: input.surface.id,
    surfaceSize: { width: input.surface.bounds.width, height: input.surface.bounds.height },
    packRef: input.packRef,
    packLockRef: input.packLockRef.id,
    ruleSetRef: input.ruleSetRef,
    evaluationProfileRef: input.evaluationProfileRef,
    tolerancePolicyRef: input.tolerancePolicy.id,
    evaluationTolerancesRef: input.evaluationTolerances.id,
    operationContextRef: input.operationContextRef.id,
    compositionRefs: [input.compositionA.id, input.compositionB.id],
    requestedOutputs: [...input.requestedOutputs],
    requestedArtifacts: [...input.requestedArtifacts],
  };
}

function createDemoSourceResult(input: MvpDemoInput, outputRefs: readonly SourceReference[]): CoreResult {
  return createMvpDemoResult({
    status: "ok",
    provenance: createMvpDemoProvenance("source-result", input.sourceRefs),
    outputRefs,
    packLockRef: input.packLockRef,
    operationContextRef: input.operationContextRef,
    output: {
      kind: "mvp-demo-structured-output-envelope",
      source: "structured-core-objects",
    },
  });
}

function createDemoReport(input: {
  input: MvpDemoInput;
  constructionResult: CoreResult<Construction>;
  measurementAResult: CoreResult<MeasurementSet>;
  measurementBResult: CoreResult<MeasurementSet>;
  evaluationAResult: CoreResult<Evaluation>;
  evaluationBResult: CoreResult<Evaluation>;
  comparison: Comparison;
  run: Run;
  negativeCaseResults: readonly NegativeCaseResult[];
  outputRefs: readonly SourceReference[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
}): MvpDemoReport {
  return {
    kind: "mvp-demo-report",
    scenario: "surface-proportional-evaluation",
    truthSource: "structured-core-objects",
    surfaceSummary: {
      surfaceRef: input.input.surface.id,
      width: input.input.surface.bounds.width,
      height: input.input.surface.bounds.height,
    },
    packRef: input.input.packRef,
    packLockRef: input.input.packLockRef.id,
    ruleSetRef: input.input.ruleSetRef,
    evaluationProfileRef: input.input.evaluationProfileRef,
    operationSequence: [...MVP_DEMO_OPERATION_SEQUENCE],
    truthOrder: [
      "input-summary",
      "construction",
      "measurements",
      "evaluations",
      "comparison",
      "explanation",
      "structured-outputs",
      "simple-visual-artifact",
      "run-envelope",
      "negative-cases",
    ],
    outputRefs: input.outputRefs,
    statuses: {
      construction: input.constructionResult.status,
      measurementA: input.measurementAResult.status,
      measurementB: input.measurementBResult.status,
      evaluationA: input.evaluationAResult.status,
      evaluationB: input.evaluationBResult.status,
      comparison: input.comparison.status,
      runReadiness: input.run.replayReadinessStatus,
    },
    warnings: input.warnings,
    errors: input.errors,
    negativeCaseSummary: input.negativeCaseResults.map((negativeCase) => ({
      caseId: negativeCase.caseId,
      actualStatus: negativeCase.actualStatus,
      pass: negativeCase.pass,
      actualDiagnostics: negativeCase.actualDiagnostics,
    })),
    runRefs: {
      runRef: input.run.runRef.id,
      packLockRef: input.run.packLockRef.id,
      operationContextRef: input.run.operationContextRef.id,
    },
    deterministicReplayReadiness: {
      sameInputPackRulesTolerancesContextOperationVersion: true,
      outputRefsDeterministic: true,
      operationVersion: MVP_DEMO_OPERATION_VERSION,
    },
    visualArtifactDerived: true,
    noPostMvpSurfaces: true,
  };
}

function anticipatedArtifactRefs(options: MvpDemoArtifactOptions): readonly SourceReference[] {
  return [
    artifactRef(options.structuredConstruction),
    artifactRef(options.structuredEvaluationA),
    artifactRef(options.structuredEvaluationB),
    artifactRef(options.structuredComparison),
    artifactRef(options.constructionSummary),
    artifactRef(options.evaluationReportA),
    artifactRef(options.evaluationReportB),
    artifactRef(options.explanation),
    artifactRef(options.simpleVisual),
  ];
}

function artifactRef(options: ArtifactGenerationOptions): SourceReference {
  return { kind: "artifact", ref: `artifact:${options.artifactType}:${options.id}` };
}

function artifactOutputRefs(artifactResults: MvpDemoArtifactResults): readonly SourceReference[] {
  return [
    ...artifactResults.structuredResults.flatMap((result) => result.outputRefs),
    ...artifactResults.constructionSummary.outputRefs,
    ...artifactResults.evaluationReports.flatMap((result) => result.outputRefs),
    ...artifactResults.explanation.outputRefs,
  ];
}

function artifactWarnings(artifactResults: MvpDemoArtifactResults): readonly CoreWarning[] {
  return [
    ...artifactResults.structuredResults.flatMap((result) => result.warnings),
    ...artifactResults.constructionSummary.warnings,
    ...artifactResults.evaluationReports.flatMap((result) => result.warnings),
    ...artifactResults.explanation.warnings,
  ];
}

function firstFailedArtifact(artifactResults: MvpDemoArtifactResults): CoreResult<unknown> | null {
  const artifacts: readonly CoreResult<unknown>[] = [
    ...artifactResults.structuredResults,
    artifactResults.constructionSummary,
    ...artifactResults.evaluationReports,
    artifactResults.explanation,
  ];
  return artifacts.find((result) => result.status !== "ok" || result.output === null) ?? null;
}

function ensureArtifactsOk(artifactResults: MvpDemoArtifactResults): void {
  const failure = firstFailedArtifact(artifactResults);
  if (failure !== null) {
    throw new MvpDemoStageFailure(failure);
  }
}

function outputRefsForRun(refs: readonly SourceReference[]): readonly SourceReference[] {
  return sortOutputRefsDeterministically(refs);
}

function packWithoutRatio(pack: RatioPack, ratioId: string): RatioPack {
  return {
    ...pack,
    ratios: pack.ratios.filter((ratio) => ratio.id !== ratioId),
  };
}

function packWithMissingRule(pack: RatioPack): RatioPack {
  return {
    ...pack,
    ruleSets: pack.ruleSets.map((ruleSet) => ruleSet.id === SURFACE_BASIC_THIRD_GRID_RULE_SET_ID
      ? { ...ruleSet, ruleRefs: [...ruleSet.ruleRefs, "missingRule"] }
      : ruleSet),
  };
}

class MvpDemoStageFailure extends Error {
  readonly result: CoreResult<unknown>;

  constructor(result: CoreResult<unknown>) {
    super("MVP demo stage failed.");
    this.result = result;
  }
}

function successfulStage<TOutput>(result: CoreResult<TOutput>): SuccessfulCoreResult<TOutput> {
  stageOutput(result);
  return result as SuccessfulCoreResult<TOutput>;
}

function stageOutput<TOutput>(result: CoreResult<TOutput>): TOutput {
  if (result.status !== "ok" || result.output === null) {
    throw new MvpDemoStageFailure(result);
  }

  return result.output;
}

function failedFromStage(result: CoreResult<unknown>): CoreResult<MvpDemoResult> {
  return createMvpDemoResult({
    status: "failed",
    warnings: result.warnings,
    errors: result.errors,
    provenance: result.provenance,
    outputRefs: result.outputRefs,
    runRef: result.runRef,
    packLockRef: result.packLockRef,
    operationContextRef: result.operationContextRef,
  });
}

function createMvpDemoResult<TOutput = unknown>(input: MvpDemoResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_MVP_DEMO_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createMvpDemoProvenance(stage: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName: `${MVP_DEMO_OPERATION_NAME}.${stage}`,
    operationVersion: MVP_DEMO_OPERATION_VERSION,
    inputRefs,
    source: MVP_DEMO_SOURCE_REF,
  };
}

function mvpError(input: MvpDemoDiagnosticInput): CoreError {
  return {
    code: input.code,
    severity: errorSeverity(input.severity),
    message: input.message,
    targetRef: input.targetRef ?? null,
    source: input.sourceRef ?? MVP_DEMO_SOURCE_REF,
    blocking: true,
    provenance: input.provenance ?? null,
  };
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function diagnosticsFor(result: CoreResult<unknown>): readonly DiagnosticCode[] {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function comparisonOutputStatus(result: CoreResult<unknown>): string | null {
  return isRecord(result.output) && typeof result.output.status === "string" ? result.output.status : null;
}

function uniqueDiagnostics<TDiagnostic extends CoreWarning | CoreError>(diagnostics: readonly TDiagnostic[]): readonly TDiagnostic[] {
  const seen = new Set<string>();
  const unique: TDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.targetRef ?? ""}:${diagnostic.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(diagnostic);
  }
  return unique;
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function requiredOutput<TOutput>(result: CoreResult<TOutput>, operationName: string): TOutput {
  if (result.status !== "ok" || result.output === null) {
    throw new Error(`MVP demo fixture failed during ${operationName}.`);
  }
  return result.output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
