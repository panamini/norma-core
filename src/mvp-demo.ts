import {
  CORE_VERSION,
  createCoreError,
  validateGeometryV1,
} from "./index.js";
import type {
  Composition2D,
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  Provenance,
  RunRef,
  SourceReference,
  SurfaceSpace,
} from "./index.js";
import {
  BASIC_PROPORTIONS_PACK,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  validateRatioPackV1,
} from "./ratio-pack.js";
import type { RatioPack } from "./ratio-pack.js";
import {
  resolveRuleSetV1,
  validateRuleResolutionV1,
} from "./rule-resolution.js";
import type { RuleResolutionV1 } from "./rule-resolution.js";
import {
  generateConstructionV1,
  validateConstructionV1,
} from "./construction-generation.js";
import type { ConstructionV1 } from "./construction-generation.js";
import {
  measureGeometryV1,
  validateMeasurementResultV1,
} from "./measurements.js";
import type { MeasurementResultV1 } from "./measurements.js";
import {
  EVALUATION_PROFILE_V1_SCHEMA_VERSION,
  evaluateCompositionBasicV1,
  validateEvaluationProfileV1,
  validateEvaluationV1,
} from "./evaluation.js";
import type { EvaluationProfileV1, EvaluationV1 } from "./evaluation.js";
import {
  COMPARISON_POLICY_V1_SCHEMA_VERSION,
  compareCompositionsBasicV1,
  validateComparisonPolicyV1,
  validateComparisonV1,
  validateDecisionV1,
  validateStructuredExplanationV1,
} from "./comparison.js";
import type {
  ComparisonDecisionExplanationV1,
  ComparisonPolicyV1,
  ComparisonStatusV1,
  ComparisonV1,
  DecisionV1,
  StructuredExplanationV1,
} from "./comparison.js";
import {
  createConstructionSummaryArtifactV1,
  createEvaluationReportArtifactV1,
  createExplanationArtifactV1,
  createSimpleVisualArtifactV1,
  createStructuredResultArtifactV1,
  validateArtifactV1,
} from "./artifacts.js";
import type {
  ArtifactSourceBundleV1,
  ConstructionSummaryArtifactOptionsV1,
  ConstructionSummaryArtifactV1,
  EvaluationReportArtifactOptionsV1,
  EvaluationReportArtifactV1,
  ExplanationArtifactOptionsV1,
  ExplanationArtifactV1,
  SimpleVisualArtifactOptionsV1,
  SimpleVisualArtifactV1,
  StructuredResultArtifactOptionsV1,
  StructuredResultArtifactV1,
} from "./artifacts.js";
import {
  REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION,
  RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION,
  assessReplayReadinessV1,
  createOperationContextV1,
  createPackLockV1,
  createRunInputV1,
  createRunOutputV1,
  createRunV1,
  deriveRunRefV1,
  validateOperationContextV1,
  validatePackLockV1,
  validateReplayReadinessReportV1,
  validateRunV1,
} from "./run.js";
import type {
  OperationContextV1,
  PackLockV1,
  ReplayReadinessReportV1,
  RunInputV1,
  RunOutputV1,
  RunSourceBundleV1,
  RunV1,
} from "./run.js";

export const MVP_DEMO_V1_SCHEMA_VERSION = "mvp-demo-v1" as const;
export const MVP_DEMO_OPERATION_VERSION_V1 = "0.1.0" as const;
export const MVP_DEMO_OPERATION_NAME_V1 = "runMvpDemoV1" as const;
export const MVP_DEMO_NAME_V1 = "Surface proportionnelle évaluée" as const;
export const MVP_DEMO_REF_V1 = "mvp-demo:surface-proportionnelle-evaluee" as const;

export const MVP_DEMO_REQUESTED_OUTPUTS_V1 = [
  "construction",
  "measurements",
  "evaluations",
  "comparison",
  "decision",
  "explanation",
  "structured-artifacts",
  "visual-artifact",
  "run",
  "replay-readiness-report",
] as const;

export const MVP_DEMO_TRACE_OPERATION_ORDER_V1 = [
  "validateMvpDemoInputV1",
  "validateRatioPackV1",
  "validatePackLockV1",
  "validateGeometryV1",
  "resolveRuleSetV1",
  "generateConstructionV1",
  "measureGeometryV1:A",
  "measureGeometryV1:B",
  "evaluateCompositionBasicV1:A",
  "evaluateCompositionBasicV1:B",
  "compareCompositionsBasicV1",
  "deriveComparisonDecisionExplanationV1",
  "deriveRunRefV1",
  "createStructuredResultArtifactV1",
  "createConstructionSummaryArtifactV1",
  "createEvaluationReportArtifactV1",
  "createExplanationArtifactV1",
  "createSimpleVisualArtifactV1",
  "createRunV1",
  "assessReplayReadinessV1",
  "validateMvpDemoResultV1",
] as const;

export type MvpDemoV1SchemaVersion = typeof MVP_DEMO_V1_SCHEMA_VERSION;
export type MvpDemoRequestedOutputV1 = (typeof MVP_DEMO_REQUESTED_OUTPUTS_V1)[number];
export type MvpDemoTraceOperationV1 = (typeof MVP_DEMO_TRACE_OPERATION_ORDER_V1)[number];

export interface MvpDemoOperationVersionsV1 {
  kind: "mvp-demo-operation-versions";
  demo: string;
  ratioPackValidation: string;
  packLock: string;
  operationContext: string;
  ruleResolution: string;
  constructionGeneration: string;
  measurement: string;
  evaluation: string;
  comparison: string;
  artifact: string;
  run: string;
  replayReadiness: string;
  resultValidation: string;
}

export interface MvpDemoArtifactOptionsV1 {
  kind: "mvp-demo-artifact-options";
  structuredResult: StructuredResultArtifactOptionsV1;
  constructionSummary: ConstructionSummaryArtifactOptionsV1;
  evaluationReport: EvaluationReportArtifactOptionsV1;
  explanation: ExplanationArtifactOptionsV1;
  simpleVisual: SimpleVisualArtifactOptionsV1;
}

export interface MvpDemoInputV1 {
  kind: "mvp-demo-input";
  schemaVersion: MvpDemoV1SchemaVersion;
  demoRef: string;
  demoName: string;
  demoOperationVersion: string;
  surface: SurfaceSpace;
  metricPolicy: unknown;
  pack: RatioPack;
  packLock: PackLockV1;
  ruleSetRef: string;
  compositions: {
    a: Composition2D;
    b: Composition2D;
  };
  measurementRequests: {
    a: readonly unknown[];
    b: readonly unknown[];
  };
  evaluationProfiles: {
    a: EvaluationProfileV1;
    b: EvaluationProfileV1;
  };
  comparisonPolicy: ComparisonPolicyV1;
  artifactOptions: MvpDemoArtifactOptionsV1;
  operationContext: OperationContextV1;
  operationVersions: MvpDemoOperationVersionsV1;
  requestedOutputs: readonly MvpDemoRequestedOutputV1[];
  sourceRefs: readonly SourceReference[];
  featureFlags: Readonly<Record<string, boolean>>;
  numericPolicy: unknown;
  tolerancePolicy: unknown;
  orderingPolicy: unknown;
  roundingPolicy: unknown;
}

export interface MvpDemoTraceEntryV1 {
  kind: "mvp-demo-trace-entry";
  stepIndex: number;
  operation: MvpDemoTraceOperationV1;
  operationVersion: string;
  status: OperationStatus;
  inputRefs: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
  warningRefs: readonly SourceReference[];
  errorRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface MvpDemoTraceV1 {
  kind: "mvp-demo-trace";
  schemaVersion: "mvp-demo-trace-v1";
  entries: readonly MvpDemoTraceEntryV1[];
}

export interface MvpDemoSummaryV1 {
  kind: "mvp-demo-summary";
  surfaceRef: string;
  surfaceDimensions: {
    width: number;
    height: number;
    unit: string;
    normalizedBounds: SurfaceSpace["bounds"];
  };
  constructionCounts: {
    guides: number;
    zones: number;
    grids: number;
    cells: number;
    intersections: number;
  };
  measurementCounts: {
    a: number;
    b: number;
  };
  evaluationSummaries: {
    a: MvpDemoEvaluationSummaryV1;
    b: MvpDemoEvaluationSummaryV1;
  };
  comparisonStatus: ComparisonStatusV1;
  selectedCompositionRef: string | null;
  comparisonStatement: string;
  artifactStatuses: readonly {
    artifactRef: string;
    artifactType: string;
    status: string;
  }[];
  runRef: string;
  replayReadinessStatus: string;
  warningCount: number;
  errorCount: number;
  boundaryNotes: readonly string[];
}

export interface MvpDemoEvaluationSummaryV1 {
  evaluationRef: string;
  compositionRef: string;
  status: string;
  score: number;
  confidence: number;
}

export interface MvpDemoArtifactsV1 {
  structuredResult: StructuredResultArtifactV1;
  constructionSummary: ConstructionSummaryArtifactV1;
  evaluationReport: EvaluationReportArtifactV1;
  explanation: ExplanationArtifactV1;
  simpleVisual: SimpleVisualArtifactV1;
}

export interface MvpDemoResultV1 {
  kind: "mvp-demo-result";
  schemaVersion: MvpDemoV1SchemaVersion;
  demoRef: string;
  demoName: string;
  demoOperationVersion: string;
  status: "ok";
  requestedOutputs: readonly MvpDemoRequestedOutputV1[];
  inputRefs: readonly SourceReference[];
  surface: SurfaceSpace;
  metricPolicy: unknown;
  pack: RatioPack;
  packLock: PackLockV1;
  operationContext: OperationContextV1;
  ruleResolution: RuleResolutionV1;
  construction: ConstructionV1;
  compositions: {
    a: Composition2D;
    b: Composition2D;
  };
  measurementRequests: {
    a: readonly unknown[];
    b: readonly unknown[];
  };
  measurementResultA: MeasurementResultV1;
  measurementResultB: MeasurementResultV1;
  evaluationProfiles: {
    a: EvaluationProfileV1;
    b: EvaluationProfileV1;
  };
  evaluationA: EvaluationV1;
  evaluationB: EvaluationV1;
  comparisonPolicy: ComparisonPolicyV1;
  comparison: ComparisonV1;
  decision: DecisionV1;
  structuredExplanation: StructuredExplanationV1;
  initialRunRef: RunRef;
  artifacts: MvpDemoArtifactsV1;
  run: RunV1;
  replayReadinessReport: ReplayReadinessReportV1;
  trace: MvpDemoTraceV1;
  summary: MvpDemoSummaryV1;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  runRef?: RunRef | null;
  packLockRef?: { id: string } | null;
  operationContextRef?: { id: string } | null;
  output?: TOutput | null;
}

type MvpValidation<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; result: CoreResult };

const PACK_REF = "norma.basic-proportions@0.1.0";
const PROFILE_REF = "evaluation-profile:basic-grid-alignment";
const POLICY_REF = "comparison-policy:basic-score-delta";
const MEASUREMENT_RESULT_A_REF = "measurement-result:A";
const MEASUREMENT_RESULT_B_REF = "measurement-result:B";
const CONSTRUCTION_REF = "construction:surface:unit:norma.basic-proportions@0.1.0:surface-basic-third-grid:v1";
const VERTICAL_THIRD_GUIDE_REF =
  "guide:construction:surface:unit:norma.basic-proportions@0.1.0:surface-basic-third-grid:v1:surface-thirds-vertical:vertical:sequence:1:1:1:cut:1";

const MVP_DEMO_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/mvp-demo-v1",
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

const MVP_DEMO_INPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "demoRef",
  "demoName",
  "demoOperationVersion",
  "surface",
  "metricPolicy",
  "pack",
  "packLock",
  "ruleSetRef",
  "compositions",
  "measurementRequests",
  "evaluationProfiles",
  "comparisonPolicy",
  "artifactOptions",
  "operationContext",
  "operationVersions",
  "requestedOutputs",
  "sourceRefs",
  "featureFlags",
  "numericPolicy",
  "tolerancePolicy",
  "orderingPolicy",
  "roundingPolicy",
] as const;

const MVP_DEMO_RESULT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "demoRef",
  "demoName",
  "demoOperationVersion",
  "status",
  "requestedOutputs",
  "inputRefs",
  "surface",
  "metricPolicy",
  "pack",
  "packLock",
  "operationContext",
  "ruleResolution",
  "construction",
  "compositions",
  "measurementRequests",
  "measurementResultA",
  "measurementResultB",
  "evaluationProfiles",
  "evaluationA",
  "evaluationB",
  "comparisonPolicy",
  "comparison",
  "decision",
  "structuredExplanation",
  "initialRunRef",
  "artifacts",
  "run",
  "replayReadinessReport",
  "trace",
  "summary",
  "warnings",
  "errors",
  "provenance",
] as const;

const MVP_DEMO_ARTIFACT_KEYS = [
  "structuredResult",
  "constructionSummary",
  "evaluationReport",
  "explanation",
  "simpleVisual",
] as const;

export function createCanonicalMvpDemoInputV1(): MvpDemoInputV1 {
  const pack = cloneJson(BASIC_PROPORTIONS_PACK);
  const packLock = requiredOutput(createPackLockV1(pack), "createPackLockV1");
  const operationContext = requiredOutput(createOperationContextV1(operationContextInput()), "createOperationContextV1");
  const surface = canonicalSurface();
  const metricPolicy = measurementMetricPolicy();

  return {
    kind: "mvp-demo-input",
    schemaVersion: MVP_DEMO_V1_SCHEMA_VERSION,
    demoRef: MVP_DEMO_REF_V1,
    demoName: MVP_DEMO_NAME_V1,
    demoOperationVersion: MVP_DEMO_OPERATION_VERSION_V1,
    surface,
    metricPolicy,
    pack,
    packLock,
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    compositions: {
      a: compositionA(surface),
      b: compositionB(surface),
    },
    measurementRequests: {
      a: canonicalMeasurementRequests(),
      b: canonicalMeasurementRequests(),
    },
    evaluationProfiles: {
      a: canonicalEvaluationProfile(MEASUREMENT_RESULT_A_REF),
      b: canonicalEvaluationProfile(MEASUREMENT_RESULT_B_REF),
    },
    comparisonPolicy: canonicalComparisonPolicy(),
    artifactOptions: canonicalArtifactOptions(),
    operationContext,
    operationVersions: canonicalOperationVersions(),
    requestedOutputs: [...MVP_DEMO_REQUESTED_OUTPUTS_V1],
    sourceRefs: [{ kind: "mvp-demo", ref: MVP_DEMO_REF_V1 }],
    featureFlags: {
      "artifact.simpleVisual": true,
      "evaluation.basicProfile": true,
      "run.staticReadiness": true,
    },
    numericPolicy: numericPolicy(),
    tolerancePolicy: runTolerancePolicy(),
    orderingPolicy: orderingPolicy(),
    roundingPolicy: roundingPolicy(),
  };
}

export function validateMvpDemoInputV1(input: unknown): CoreResult<MvpDemoInputV1> {
  const validation = validateMvpDemoInputValue(input);
  if (!validation.ok) {
    return validation.result as CoreResult<MvpDemoInputV1>;
  }

  return createMvpDemoCoreResult({
    status: "ok",
    provenance: createMvpDemoProvenance("validateMvpDemoInputV1", [
      { kind: "mvp-demo-input", ref: validation.value.demoRef },
    ]),
    outputRefs: [{ kind: "mvp-demo-input", ref: validation.value.demoRef }],
    packLockRef: { id: validation.value.packLock.lockRef },
    operationContextRef: { id: validation.value.operationContext.contextRef },
    output: cloneJson(validation.value),
  });
}

export function runMvpDemoV1(input: unknown = createCanonicalMvpDemoInputV1()): CoreResult<MvpDemoResultV1> {
  const trace: MvpDemoTraceEntryV1[] = [];
  const inputResult = validateMvpDemoInputV1(input);
  if (inputResult.status !== "ok" || inputResult.output === null) {
    return inputResult as unknown as CoreResult<MvpDemoResultV1>;
  }
  const demoInput = inputResult.output;

  trace.push(traceEntry(1, "validateMvpDemoInputV1", demoInput.operationVersions.resultValidation, "ok", demoInput.sourceRefs, [
    { kind: "mvp-demo-input", ref: demoInput.demoRef },
  ]));

  const packResult = validateRatioPackV1(demoInput.pack);
  if (packResult.status !== "ok" || packResult.output === null) {
    return failedFromCoreResult(packResult);
  }
  trace.push(traceFromResult(2, "validateRatioPackV1", demoInput.operationVersions.ratioPackValidation, packResult));

  const packLockResult = validatePackLockV1(demoInput.packLock, demoInput.pack);
  if (packLockResult.status !== "ok" || packLockResult.output === null) {
    return failedFromCoreResult(packLockResult);
  }
  trace.push(traceFromResult(3, "validatePackLockV1", demoInput.operationVersions.packLock, packLockResult));

  const geometryResult = validateDemoGeometry(demoInput);
  if (geometryResult.status !== "ok") {
    return geometryResult as unknown as CoreResult<MvpDemoResultV1>;
  }
  trace.push(traceEntry(4, "validateGeometryV1", "0.1.0", "ok", [
    { kind: "geometry", ref: demoInput.surface.id },
    { kind: "composition", ref: demoInput.compositions.a.id },
    { kind: "composition", ref: demoInput.compositions.b.id },
  ], [
    { kind: "geometry", ref: demoInput.surface.id },
    { kind: "composition", ref: demoInput.compositions.a.id },
    { kind: "composition", ref: demoInput.compositions.b.id },
  ]));

  const ruleResolutionResult = resolveRuleSetV1(demoInput.pack, demoInput.ruleSetRef);
  if (ruleResolutionResult.status !== "ok" || ruleResolutionResult.output === null) {
    return failedFromCoreResult(ruleResolutionResult);
  }
  trace.push(traceFromResult(5, "resolveRuleSetV1", demoInput.operationVersions.ruleResolution, ruleResolutionResult));

  const constructionResult = generateConstructionV1(demoInput.surface, ruleResolutionResult.output);
  if (constructionResult.status !== "ok" || constructionResult.output === null) {
    return failedFromCoreResult(constructionResult);
  }
  trace.push(traceFromResult(6, "generateConstructionV1", demoInput.operationVersions.constructionGeneration, constructionResult));

  const measurementAResult = measureGeometryV1(measurementInput(
    MEASUREMENT_RESULT_A_REF,
    demoInput.compositions.a,
    demoInput.surface,
    constructionResult.output,
    demoInput.metricPolicy,
    demoInput.measurementRequests.a,
  ));
  if (measurementAResult.status !== "ok" || measurementAResult.output === null) {
    return failedFromCoreResult(measurementAResult);
  }
  trace.push(traceFromResult(7, "measureGeometryV1:A", demoInput.operationVersions.measurement, measurementAResult));

  const measurementBResult = measureGeometryV1(measurementInput(
    MEASUREMENT_RESULT_B_REF,
    demoInput.compositions.b,
    demoInput.surface,
    constructionResult.output,
    demoInput.metricPolicy,
    demoInput.measurementRequests.b,
  ));
  if (measurementBResult.status !== "ok" || measurementBResult.output === null) {
    return failedFromCoreResult(measurementBResult);
  }
  trace.push(traceFromResult(8, "measureGeometryV1:B", demoInput.operationVersions.measurement, measurementBResult));

  const profileAResult = validateEvaluationProfileV1(demoInput.evaluationProfiles.a, measurementAResult.output);
  if (profileAResult.status !== "ok" || profileAResult.output === null) {
    return failedFromCoreResult(profileAResult);
  }
  const evaluationAResult = evaluateCompositionBasicV1(evaluationInput(
    "composition:A",
    measurementAResult.output,
    profileAResult.output,
    demoInput,
  ));
  if (evaluationAResult.status !== "ok" || evaluationAResult.output === null) {
    return failedFromCoreResult(evaluationAResult);
  }
  trace.push(traceFromResult(9, "evaluateCompositionBasicV1:A", demoInput.operationVersions.evaluation, evaluationAResult));

  const profileBResult = validateEvaluationProfileV1(demoInput.evaluationProfiles.b, measurementBResult.output);
  if (profileBResult.status !== "ok" || profileBResult.output === null) {
    return failedFromCoreResult(profileBResult);
  }
  const evaluationBResult = evaluateCompositionBasicV1(evaluationInput(
    "composition:B",
    measurementBResult.output,
    profileBResult.output,
    demoInput,
  ));
  if (evaluationBResult.status !== "ok" || evaluationBResult.output === null) {
    return failedFromCoreResult(evaluationBResult);
  }
  trace.push(traceFromResult(10, "evaluateCompositionBasicV1:B", demoInput.operationVersions.evaluation, evaluationBResult));

  const comparisonPolicyResult = validateComparisonPolicyV1(demoInput.comparisonPolicy);
  if (comparisonPolicyResult.status !== "ok" || comparisonPolicyResult.output === null) {
    return failedFromCoreResult(comparisonPolicyResult);
  }
  const comparisonResult = compareCompositionsBasicV1({
    kind: "comparison-input",
    schemaVersion: "comparison-input-v1",
    evaluationA: evaluationAResult.output,
    evaluationB: evaluationBResult.output,
    policy: comparisonPolicyResult.output,
    operationVersion: demoInput.operationVersions.comparison,
    sourceRefs: [
      { kind: "evaluation", ref: evaluationAResult.output.evaluationRef },
      { kind: "evaluation", ref: evaluationBResult.output.evaluationRef },
      { kind: "comparison-policy", ref: comparisonPolicyResult.output.policyRef },
    ],
  });
  if (comparisonResult.status !== "ok" || comparisonResult.output === null) {
    return failedFromCoreResult(comparisonResult);
  }
  trace.push(traceFromResult(11, "compareCompositionsBasicV1", demoInput.operationVersions.comparison, comparisonResult));
  trace.push(traceEntry(12, "deriveComparisonDecisionExplanationV1", demoInput.operationVersions.comparison, "ok", [
    { kind: "comparison", ref: comparisonResult.output.comparison.comparisonRef },
  ], [
    { kind: "decision", ref: comparisonResult.output.decision.decisionRef },
    { kind: "structured-explanation", ref: comparisonResult.output.structuredExplanation.explanationRef },
  ]));

  const artifactSources = artifactSourceBundle(
    demoInput,
    constructionResult.output,
    measurementAResult.output,
    measurementBResult.output,
    evaluationAResult.output,
    evaluationBResult.output,
    comparisonResult.output,
  );
  const runInputResult = createRunInputV1({
    inputs: [
      {
        kind: "run-source-input",
        inputRef: { kind: "geometry", ref: demoInput.surface.id },
        snapshot: demoInput.surface,
      },
      {
        kind: "run-source-input",
        inputRef: { kind: "composition", ref: demoInput.compositions.a.id },
        snapshot: demoInput.compositions.a,
      },
      {
        kind: "run-source-input",
        inputRef: { kind: "composition", ref: demoInput.compositions.b.id },
        snapshot: demoInput.compositions.b,
      },
    ],
    packLock: packLockResult.output,
    orderedRuleRefs: constructionResult.output.appliedRuleRefs,
    ruleSetRef: constructionResult.output.ruleSetRef,
    operationContext: demoInput.operationContext,
  });
  if (runInputResult.status !== "ok" || runInputResult.output === null) {
    return failedFromCoreResult(runInputResult);
  }
  const initialRunRefResult = deriveRunRefV1({
    operation: MVP_DEMO_OPERATION_NAME_V1,
    operationVersion: MVP_DEMO_OPERATION_VERSION_V1,
    runInput: runInputResult.output,
    packLock: packLockResult.output,
    orderedRuleRefs: runInputResult.output.orderedRuleRefs,
    ruleSetRef: runInputResult.output.ruleSetRef,
    operationContext: demoInput.operationContext,
  });
  if (initialRunRefResult.status !== "ok" || initialRunRefResult.output === null) {
    return failedFromCoreResult(initialRunRefResult);
  }
  trace.push(traceFromResult(13, "deriveRunRefV1", demoInput.operationVersions.run, initialRunRefResult, [
    { kind: "run-input", ref: runInputResult.output.inputIdentity },
  ]));

  const structuredArtifactResult = createStructuredResultArtifactV1(artifactRequest(
    artifactSources,
    demoInput.artifactOptions.structuredResult,
    initialRunRefResult.output,
  ));
  if (structuredArtifactResult.status !== "ok" || structuredArtifactResult.output === null) {
    return failedFromCoreResult(structuredArtifactResult);
  }
  trace.push(traceFromResult(14, "createStructuredResultArtifactV1", demoInput.operationVersions.artifact, structuredArtifactResult));

  const constructionSummaryResult = createConstructionSummaryArtifactV1(artifactRequest(
    artifactSources,
    demoInput.artifactOptions.constructionSummary,
    initialRunRefResult.output,
  ));
  if (constructionSummaryResult.status !== "ok" || constructionSummaryResult.output === null) {
    return failedFromCoreResult(constructionSummaryResult);
  }
  trace.push(traceFromResult(15, "createConstructionSummaryArtifactV1", demoInput.operationVersions.artifact, constructionSummaryResult));

  const evaluationReportResult = createEvaluationReportArtifactV1(artifactRequest(
    artifactSources,
    demoInput.artifactOptions.evaluationReport,
    initialRunRefResult.output,
  ));
  if (evaluationReportResult.status !== "ok" || evaluationReportResult.output === null) {
    return failedFromCoreResult(evaluationReportResult);
  }
  trace.push(traceFromResult(16, "createEvaluationReportArtifactV1", demoInput.operationVersions.artifact, evaluationReportResult));

  const explanationArtifactResult = createExplanationArtifactV1(artifactRequest(
    artifactSources,
    demoInput.artifactOptions.explanation,
    initialRunRefResult.output,
  ));
  if (explanationArtifactResult.status !== "ok" || explanationArtifactResult.output === null) {
    return failedFromCoreResult(explanationArtifactResult);
  }
  trace.push(traceFromResult(17, "createExplanationArtifactV1", demoInput.operationVersions.artifact, explanationArtifactResult));

  const visualArtifactResult = createSimpleVisualArtifactV1(artifactRequest(
    artifactSources,
    demoInput.artifactOptions.simpleVisual,
    initialRunRefResult.output,
  ));
  if (visualArtifactResult.status !== "ok" || visualArtifactResult.output === null) {
    return failedFromCoreResult(visualArtifactResult);
  }
  trace.push(traceFromResult(18, "createSimpleVisualArtifactV1", demoInput.operationVersions.artifact, visualArtifactResult));

  const artifacts: MvpDemoArtifactsV1 = {
    structuredResult: structuredArtifactResult.output,
    constructionSummary: constructionSummaryResult.output,
    evaluationReport: evaluationReportResult.output,
    explanation: explanationArtifactResult.output,
    simpleVisual: visualArtifactResult.output,
  };
  const artifactList = Object.values(artifacts);
  const runOutputResult = createRunOutputV1(runOutputInput(artifactSources, artifactList));
  if (runOutputResult.status !== "ok" || runOutputResult.output === null) {
    return failedFromCoreResult(runOutputResult);
  }
  const sourceBundle = runSourceBundle(artifactSources, artifactList);
  const runResult = createRunV1({
    operation: MVP_DEMO_OPERATION_NAME_V1,
    operationVersion: MVP_DEMO_OPERATION_VERSION_V1,
    runInput: runInputResult.output,
    packLock: packLockResult.output,
    orderedRuleRefs: runInputResult.output.orderedRuleRefs,
    ruleSetRef: runInputResult.output.ruleSetRef,
    operationContext: demoInput.operationContext,
    runOutput: runOutputResult.output,
    sourceBundle,
  });
  if (runResult.status !== "ok" || runResult.output === null) {
    return failedFromCoreResult(runResult);
  }
  if (runResult.output.runRef.id !== initialRunRefResult.output.id) {
    return invalidMvpDemoResult("initialRunRef", "Final RunV1 ref changed after artifacts were bound.") as CoreResult<MvpDemoResultV1>;
  }
  trace.push(traceFromResult(19, "createRunV1", demoInput.operationVersions.run, runResult));

  const readinessResult = assessReplayReadinessV1(runResult.output, replayDependencies(runResult.output, artifactList));
  if (readinessResult.status !== "ok" || readinessResult.output === null) {
    return failedFromCoreResult(readinessResult);
  }
  trace.push(traceFromResult(20, "assessReplayReadinessV1", demoInput.operationVersions.replayReadiness, readinessResult));

  const resultWithoutValidationTrace = buildMvpDemoResult(
    demoInput,
    ruleResolutionResult.output,
    constructionResult.output,
    measurementAResult.output,
    measurementBResult.output,
    profileAResult.output,
    profileBResult.output,
    evaluationAResult.output,
    evaluationBResult.output,
    comparisonPolicyResult.output,
    comparisonResult.output,
    initialRunRefResult.output,
    artifacts,
    runResult.output,
    readinessResult.output,
    trace,
  );
  const validationTraceEntry = traceEntry(21, "validateMvpDemoResultV1", demoInput.operationVersions.resultValidation, "ok", [
    { kind: "mvp-demo-result", ref: resultWithoutValidationTrace.demoRef },
  ], [
    { kind: "mvp-demo-result", ref: resultWithoutValidationTrace.demoRef },
  ]);
  const finalResult: MvpDemoResultV1 = {
    ...resultWithoutValidationTrace,
    trace: {
      ...resultWithoutValidationTrace.trace,
      entries: [...resultWithoutValidationTrace.trace.entries, validationTraceEntry],
    },
  };
  const finalValidation = validateMvpDemoResultV1(finalResult);
  if (finalValidation.status !== "ok") {
    return finalValidation;
  }

  return createMvpDemoCoreResult({
    status: "ok",
    provenance: finalResult.provenance,
    outputRefs: resultOutputRefs(finalResult),
    runRef: finalResult.run.runRef,
    packLockRef: { id: finalResult.packLock.lockRef },
    operationContextRef: { id: finalResult.operationContext.contextRef },
    output: cloneJson(finalResult),
  });
}

export function validateMvpDemoResultV1(value: unknown): CoreResult<MvpDemoResultV1> {
  const validation = validateMvpDemoResultValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<MvpDemoResultV1>;
  }

  return createMvpDemoCoreResult({
    status: "ok",
    provenance: createMvpDemoProvenance("validateMvpDemoResultV1", [
      { kind: "mvp-demo-result", ref: validation.value.demoRef },
    ]),
    outputRefs: resultOutputRefs(validation.value),
    runRef: validation.value.run.runRef,
    packLockRef: { id: validation.value.packLock.lockRef },
    operationContextRef: { id: validation.value.operationContext.contextRef },
    output: cloneJson(validation.value),
  });
}

function validateMvpDemoInputValue(input: unknown): MvpValidation<MvpDemoInputV1> {
  if (!isRecord(input)) {
    return failedValidation(invalidMvpDemoInput("input", "MVP demo input must be a structured object."));
  }
  if (containsArtifactObject(input)) {
    return failedValidation(artifactWouldBecomeSource("input", "Artifacts cannot be supplied as MVP demo source input."));
  }
  const unknownField = firstUnknownKey(input, MVP_DEMO_INPUT_ALLOWED_KEYS);
  if (unknownField !== null) {
    return failedValidation(invalidMvpDemoInput(unknownField, `MVP demo input field is outside PR12: ${unknownField}.`));
  }
  if (input.kind !== "mvp-demo-input" || input.schemaVersion !== MVP_DEMO_V1_SCHEMA_VERSION) {
    return failedValidation(invalidMvpDemoInput("schemaVersion", "MVP demo input requires schema mvp-demo-v1."));
  }
  if (input.demoRef !== MVP_DEMO_REF_V1 || input.demoName !== MVP_DEMO_NAME_V1) {
    return failedValidation(invalidMvpDemoInput("demoRef", "MVP demo input must name the canonical demo explicitly."));
  }
  if (input.demoOperationVersion !== MVP_DEMO_OPERATION_VERSION_V1) {
    return failedValidation(invalidMvpDemoInput("demoOperationVersion", "MVP demo operation version is unsupported."));
  }
  for (const [field, message] of [
    ["surface", "MVP demo input requires an explicit surface."],
    ["pack", "MVP demo input requires an explicit ratio pack."],
    ["packLock", "MVP demo input requires an explicit PackLock."],
    ["ruleSetRef", "MVP demo input requires an explicit ruleSetRef."],
    ["compositions", "MVP demo input requires explicit compositions A and B."],
    ["measurementRequests", "MVP demo input requires explicit measurement requests."],
    ["evaluationProfiles", "MVP demo input requires explicit evaluation profiles."],
    ["comparisonPolicy", "MVP demo input requires an explicit comparison policy."],
    ["operationContext", "MVP demo input requires an explicit operation context."],
    ["operationVersions", "MVP demo input requires explicit operation versions."],
    ["requestedOutputs", "MVP demo input requires explicit requested outputs."],
  ] as const) {
    if (!(field in input) || input[field] === undefined || input[field] === null) {
      return failedValidation(missingMvpDependency(field, message));
    }
  }
  if (!Array.isArray(input.requestedOutputs)) {
    return failedValidation(invalidMvpDemoInput("requestedOutputs", "MVP demo requested outputs must be an array."));
  }
  const unsupportedOutput = input.requestedOutputs.find((requestedOutput) =>
    typeof requestedOutput !== "string" || !MVP_DEMO_REQUESTED_OUTPUTS_V1.includes(requestedOutput as MvpDemoRequestedOutputV1)
  );
  if (unsupportedOutput !== undefined) {
    const requested = String(unsupportedOutput);
    return failedValidation(
      requested.toLowerCase().includes("beauty")
        ? beautyScoreRequested(requested)
        : unsupportedMvpDemoRequest(requested),
    );
  }
  if (new Set(input.requestedOutputs).size !== input.requestedOutputs.length) {
    return failedValidation(invalidMvpDemoInput("requestedOutputs", "MVP demo requested outputs must be unique."));
  }
  if (!hasCanonicalOperationVersions(input.operationVersions)) {
    return failedValidation(invalidMvpDemoInput("operationVersions", "MVP demo operation versions are incomplete."));
  }

  const packValidation = validateRatioPackV1(input.pack);
  if (packValidation.status !== "ok" || packValidation.output === null) {
    return failedValidation(packValidation);
  }
  const packLockValidation = validatePackLockV1(input.packLock, input.pack);
  if (packLockValidation.status !== "ok" || packLockValidation.output === null) {
    return failedValidation(packLockValidation);
  }
  if (typeof input.ruleSetRef !== "string" || input.ruleSetRef.length === 0) {
    return failedValidation(missingMvpDependency("ruleSetRef", "MVP demo ruleSetRef must be non-empty."));
  }
  const ruleResolution = resolveRuleSetV1(input.pack, input.ruleSetRef);
  if (ruleResolution.status !== "ok") {
    return failedValidation(ruleResolution);
  }
  const geometryResult = validateDemoGeometry(input as unknown as MvpDemoInputV1);
  if (geometryResult.status !== "ok") {
    return failedValidation(geometryResult);
  }
  if (!isRecord(input.compositions) || !isRecord(input.compositions.a) || !isRecord(input.compositions.b)) {
    return failedValidation(missingMvpDependency("compositions", "MVP demo input requires composition A and composition B."));
  }
  if (!isRecord(input.measurementRequests) || !Array.isArray(input.measurementRequests.a) || !Array.isArray(input.measurementRequests.b)) {
    return failedValidation(missingMvpDependency("measurementRequests", "MVP demo input requires measurement request arrays for A and B."));
  }
  if (input.measurementRequests.a.length === 0 || input.measurementRequests.b.length === 0) {
    return failedValidation(missingMvpDependency("measurementRequests", "MVP demo measurement requests cannot be empty."));
  }
  if (!sameRequestRefs(input.measurementRequests.a, input.measurementRequests.b)) {
    return failedValidation(invalidMvpDemoInput("measurementRequests", "Composition A and B must use the same semantic measurement request set."));
  }
  if (!isRecord(input.evaluationProfiles) || !isRecord(input.evaluationProfiles.a) || !isRecord(input.evaluationProfiles.b)) {
    return failedValidation(missingMvpDependency("evaluationProfiles", "MVP demo input requires evaluation profiles for A and B."));
  }
  if (!isRecord(input.artifactOptions) || input.artifactOptions.kind !== "mvp-demo-artifact-options") {
    return failedValidation(invalidMvpDemoInput("artifactOptions", "MVP demo artifact options must be explicit."));
  }
  const comparisonPolicy = validateComparisonPolicyV1(input.comparisonPolicy);
  if (comparisonPolicy.status !== "ok") {
    return failedValidation(comparisonPolicy);
  }
  const contextValidation = validateOperationContextV1(input.operationContext);
  if (contextValidation.status !== "ok") {
    return failedValidation(contextValidation);
  }
  if (!isSourceReferenceArray(input.sourceRefs)) {
    return failedValidation(invalidMvpDemoInput("sourceRefs", "MVP demo source refs must be structured source references."));
  }
  if (!isBooleanRecord(input.featureFlags)) {
    return failedValidation(invalidMvpDemoInput("featureFlags", "MVP demo feature flags must be explicit booleans."));
  }

  return { ok: true, value: input as unknown as MvpDemoInputV1 };
}

function validateMvpDemoResultValue(value: unknown): MvpValidation<MvpDemoResultV1> {
  if (!isRecord(value)) {
    return failedValidation(invalidMvpDemoResult("result", "MVP demo result must be a structured object."));
  }
  const unknownField = firstUnknownKey(value, MVP_DEMO_RESULT_ALLOWED_KEYS);
  if (unknownField !== null) {
    return failedValidation(invalidMvpDemoResult(unknownField, `MVP demo result field is outside PR12: ${unknownField}.`));
  }
  if (value.kind !== "mvp-demo-result" || value.schemaVersion !== MVP_DEMO_V1_SCHEMA_VERSION || value.status !== "ok") {
    return failedValidation(invalidMvpDemoResult("schemaVersion", "MVP demo result requires an ok mvp-demo-v1 envelope."));
  }
  const result = value as unknown as MvpDemoResultV1;
  const inputValidation = validateMvpDemoInputV1(inputFromResult(result));
  if (inputValidation.status !== "ok") {
    return failedValidation(invalidMvpDemoResult("input", "MVP demo result cannot reconstruct a valid explicit input."));
  }
  for (const nested of [
    validateRatioPackV1(result.pack),
    validatePackLockV1(result.packLock, result.pack),
    validateOperationContextV1(result.operationContext),
    validateRuleResolutionV1(result.ruleResolution),
    validateConstructionV1(result.construction),
    validateMeasurementResultV1(result.measurementResultA),
    validateMeasurementResultV1(result.measurementResultB),
    validateEvaluationProfileV1(result.evaluationProfiles.a, result.measurementResultA),
    validateEvaluationProfileV1(result.evaluationProfiles.b, result.measurementResultB),
    validateEvaluationV1(result.evaluationA),
    validateEvaluationV1(result.evaluationB),
    validateComparisonPolicyV1(result.comparisonPolicy),
    validateComparisonV1(result.comparison),
    validateDecisionV1(result.decision, result.comparison),
    validateStructuredExplanationV1(result.structuredExplanation, result.comparison, result.decision),
    validateRunV1(result.run, runSourceBundle(artifactSourceBundleFromResult(result), Object.values(result.artifacts))),
    validateReplayReadinessReportV1(result.replayReadinessReport),
  ]) {
    if (!isRecord(nested) || nested.status !== "ok") {
      return failedValidation(invalidMvpDemoResult("nested", "MVP demo result contains an invalid nested source object."));
    }
  }
  for (const key of MVP_DEMO_ARTIFACT_KEYS) {
    const artifact = result.artifacts[key];
    if (artifact.runRef?.id !== result.run.runRef.id) {
      return failedValidation(invalidMvpDemoResult(`artifacts.${key}.runRef`, "Artifact runRef must match final RunV1 ref."));
    }
    const artifactValidation = validateArtifactV1(artifact, artifactSourceBundleFromResult(result));
    if (artifactValidation.status !== "ok") {
      return failedValidation(invalidMvpDemoResult(`artifacts.${key}`, "MVP demo artifact does not match its source bundle."));
    }
  }
  const readiness = assessReplayReadinessV1(result.run, replayDependencies(result.run, Object.values(result.artifacts)));
  if (
    readiness.status !== "ok" ||
    readiness.output === null ||
    !sameJson(readiness.output, result.replayReadinessReport)
  ) {
    return failedValidation(invalidMvpDemoResult("replayReadinessReport", "Replay-readiness report must match explicit run dependencies."));
  }
  if (!sameJson(result.run.replayReadiness, {
    kind: "run-replay-readiness",
    status: result.replayReadinessReport.status,
    mismatches: result.replayReadinessReport.mismatches,
    missingSources: result.replayReadinessReport.missingSources,
    staleArtifactRefs: result.replayReadinessReport.staleArtifactRefs,
  })) {
    return failedValidation(invalidMvpDemoResult("run.replayReadiness", "Run replay-readiness must agree with the report."));
  }
  if (result.initialRunRef.id !== result.run.runRef.id) {
    return failedValidation(invalidMvpDemoResult("initialRunRef", "Initial run identity must match final RunV1."));
  }
  if (!validateTrace(result)) {
    return failedValidation(invalidMvpDemoResult("trace", "MVP demo trace is incomplete or contains orphan refs."));
  }
  if (!validateSummary(result)) {
    return failedValidation(invalidMvpDemoResult("summary", "MVP demo summary does not match source facts."));
  }
  if (containsForbiddenClaim(result)) {
    return failedValidation(invalidMvpDemoResult("result", "MVP demo result contains a forbidden beauty, recommendation, or post-MVP claim."));
  }

  return { ok: true, value: result };
}

function buildMvpDemoResult(
  input: MvpDemoInputV1,
  ruleResolution: RuleResolutionV1,
  construction: ConstructionV1,
  measurementResultA: MeasurementResultV1,
  measurementResultB: MeasurementResultV1,
  profileA: EvaluationProfileV1,
  profileB: EvaluationProfileV1,
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
  comparisonPolicy: ComparisonPolicyV1,
  comparisonOutput: ComparisonDecisionExplanationV1,
  initialRunRef: RunRef,
  artifacts: MvpDemoArtifactsV1,
  run: RunV1,
  replayReadinessReport: ReplayReadinessReportV1,
  traceEntries: readonly MvpDemoTraceEntryV1[],
): MvpDemoResultV1 {
  const warnings: readonly CoreWarning[] = [];
  const errors: readonly CoreError[] = [];
  return {
    kind: "mvp-demo-result",
    schemaVersion: MVP_DEMO_V1_SCHEMA_VERSION,
    demoRef: input.demoRef,
    demoName: input.demoName,
    demoOperationVersion: input.demoOperationVersion,
    status: "ok",
    requestedOutputs: cloneJson(input.requestedOutputs),
    inputRefs: [{ kind: "mvp-demo-input", ref: input.demoRef }],
    surface: cloneJson(input.surface),
    metricPolicy: cloneJson(input.metricPolicy),
    pack: cloneJson(input.pack),
    packLock: cloneJson(input.packLock),
    operationContext: cloneJson(input.operationContext),
    ruleResolution: cloneJson(ruleResolution),
    construction: cloneJson(construction),
    compositions: cloneJson(input.compositions),
    measurementRequests: cloneJson(input.measurementRequests),
    measurementResultA: cloneJson(measurementResultA),
    measurementResultB: cloneJson(measurementResultB),
    evaluationProfiles: {
      a: cloneJson(profileA),
      b: cloneJson(profileB),
    },
    evaluationA: cloneJson(evaluationA),
    evaluationB: cloneJson(evaluationB),
    comparisonPolicy: cloneJson(comparisonPolicy),
    comparison: cloneJson(comparisonOutput.comparison),
    decision: cloneJson(comparisonOutput.decision),
    structuredExplanation: cloneJson(comparisonOutput.structuredExplanation),
    initialRunRef: cloneJson(initialRunRef),
    artifacts: cloneJson(artifacts),
    run: cloneJson(run),
    replayReadinessReport: cloneJson(replayReadinessReport),
    trace: {
      kind: "mvp-demo-trace",
      schemaVersion: "mvp-demo-trace-v1",
      entries: cloneJson(traceEntries),
    },
    summary: summaryFor(
      input,
      construction,
      measurementResultA,
      measurementResultB,
      evaluationA,
      evaluationB,
      comparisonOutput.comparison,
      artifacts,
      run,
      replayReadinessReport,
      warnings,
      errors,
    ),
    warnings,
    errors,
    provenance: createMvpDemoProvenance(MVP_DEMO_OPERATION_NAME_V1, [
      { kind: "mvp-demo-input", ref: input.demoRef },
      { kind: "run", ref: run.runRef.id },
    ]),
  };
}

function canonicalSurface(): SurfaceSpace {
  return {
    kind: "surface-space",
    id: "surface:unit",
    coordinateSystem: {
      kind: "coordinate-system",
      id: "norma-canonical-2d-normalized",
      origin: "bottom-left",
      xAxis: "right",
      yAxis: "up",
      dimensions: 2,
      coordinateScale: "normalized",
    },
    tolerancePolicy: {
      kind: "tolerance-policy",
      id: "exact-geometry",
      coordinateTolerance: 0,
      metricTolerance: 0,
    },
    bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
  };
}

function compositionA(surface: SurfaceSpace): Composition2D {
  return {
    kind: "composition-2d",
    id: "composition:A",
    coordinateSystem: cloneJson(surface.coordinateSystem),
    tolerancePolicy: cloneJson(surface.tolerancePolicy ?? null),
    surface: cloneJson(surface),
    elements: [
      { kind: "element", id: "element:header", geometry: { kind: "rect", x: 0, y: 2 / 3, width: 1, height: 1 / 3 } },
      { kind: "element", id: "element:side", geometry: { kind: "rect", x: 0, y: 1 / 3, width: 1 / 3, height: 1 / 3 } },
      { kind: "element", id: "element:main", geometry: { kind: "rect", x: 1 / 3, y: 1 / 3, width: 2 / 3, height: 1 / 3 } },
      { kind: "element", id: "element:footer", geometry: { kind: "rect", x: 0, y: 0, width: 1, height: 1 / 3 } },
    ],
  };
}

function compositionB(surface: SurfaceSpace): Composition2D {
  return {
    kind: "composition-2d",
    id: "composition:B",
    coordinateSystem: cloneJson(surface.coordinateSystem),
    tolerancePolicy: cloneJson(surface.tolerancePolicy ?? null),
    surface: cloneJson(surface),
    elements: [
      { kind: "element", id: "element:header", geometry: { kind: "rect", x: 0.04, y: 0.62, width: 0.92, height: 0.29 } },
      { kind: "element", id: "element:side", geometry: { kind: "rect", x: 0.03, y: 0.29, width: 0.31, height: 0.34 } },
      { kind: "element", id: "element:main", geometry: { kind: "rect", x: 0.38, y: 0.30, width: 0.57, height: 0.35 } },
      { kind: "element", id: "element:footer", geometry: { kind: "rect", x: 0.02, y: 0.02, width: 0.95, height: 0.26 } },
    ],
  };
}

function measurementMetricPolicy(): unknown {
  return {
    kind: "measurement-metric-policy",
    id: "surface-1200x800-px",
    surfaceRef: "surface:unit",
    width: 1200,
    height: 800,
    unit: "px",
  };
}

function canonicalMeasurementRequests(): readonly unknown[] {
  return [
    {
      kind: "measurement-request",
      requestRef: "distance:main-left-third",
      measurementType: "distance",
      sourceRef: "element:main",
      targetRef: VERTICAL_THIRD_GUIDE_REF,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "horizontal",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "alignment:main-left-third",
      measurementType: "alignment",
      sourceRef: "element:main",
      targetRef: VERTICAL_THIRD_GUIDE_REF,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "x",
      tolerance: { kind: "measurement-tolerance", id: "profile-source", value: 0.01 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:header-surface",
      measurementType: "containment",
      childRef: "element:header",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "overlap:side-main",
      measurementType: "overlap",
      sourceRef: "element:side",
      targetRef: "element:main",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "coverage:composition",
      measurementType: "coverage",
      targetRef: "surface:unit",
      contributorRefs: ["element:main", "element:footer", "element:side", "element:header"],
      metric: "both",
      coveragePolicy: "union-clipped",
    },
    {
      kind: "measurement-request",
      requestRef: "ratio:side-main",
      measurementType: "ratio",
      numeratorRef: "element:side",
      denominatorRef: "element:main",
      ratioKind: "area",
      targetRatio: { kind: "ratio-target", targetRef: "target:half", value: 0.5 },
    },
  ];
}

function canonicalEvaluationProfile(measurementResultRef: string): EvaluationProfileV1 {
  return {
    kind: "evaluation-profile",
    schemaVersion: EVALUATION_PROFILE_V1_SCHEMA_VERSION,
    profileRef: PROFILE_REF,
    version: "0.1.0",
    packRef: PACK_REF,
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    weightPolicy: { kind: "evaluation-weight-policy", normalization: "normalize-total-positive" },
    missingMeasurementPolicy: {
      kind: "missing-measurement-policy",
      required: "fail",
      optional: "renormalize_remaining",
    },
    statusThresholds: {
      kind: "evaluation-status-thresholds",
      match: 0.9,
      nearMatch: 0.75,
      weakMatch: 0.5,
      minimumConfidenceForNormalStatus: 0.4,
    },
    confidencePolicy: {
      kind: "evaluation-confidence-policy",
      highThreshold: 0.8,
      mediumThreshold: 0.5,
      optionalMissingPenalty: 0.15,
      ambiguousMeasurementPenalty: 0.2,
      warningPenalty: 0.05,
    },
    limits: {
      kind: "evaluation-profile-limits",
      scoreMin: 0,
      scoreMax: 1,
      minComponents: 1,
    },
    components: [
      componentDefinition("component:guide-proximity", "guide_proximity", "distance", measurementResultRef, "distance:main-left-third", {
        kind: "linear-distance-tolerance",
        distanceBasis: "normalizedDistance",
        targetDistance: 0,
        tolerance: 0.05,
      }, 0.30),
      componentDefinition("component:alignment", "alignment", "alignment", measurementResultRef, "alignment:main-left-third", {
        kind: "linear-alignment-tolerance",
        deltaBasis: "normalizedDelta",
        targetDelta: 0,
        tolerance: 0.05,
      }, 0.25),
      componentDefinition("component:containment", "containment", "containment", measurementResultRef, "containment:header-surface", {
        kind: "containment-status-map",
        statusScores: { inside: 1, on_boundary: 0.95, partially_outside: 0.25, outside: 0 },
      }, 0.15),
      componentDefinition("component:overlap-penalty", "overlap_penalty", "overlap", measurementResultRef, "overlap:side-main", {
        kind: "overlap-linear-penalty",
        overlapBasis: "maxOverlapRatio",
        tolerance: 1,
      }, 0.15),
      componentDefinition("component:coverage-match", "coverage_match", "coverage", measurementResultRef, "coverage:composition", {
        kind: "target-closeness",
        valueBasis: "coverageRatio",
        target: 1,
        tolerance: 0.25,
      }, 0.10),
      componentDefinition("component:area-ratio-match", "area_ratio_match", "ratio", measurementResultRef, "ratio:side-main", {
        kind: "ratio-target-closeness",
        deltaBasis: "absoluteDelta",
        targetRatio: 0.5,
        tolerance: 0.1,
      }, 0.05),
    ],
    sourceRefs: [{ kind: "evaluation-profile", ref: PROFILE_REF }],
    provenance: {
      operationName: "core.mvp-demo-v1.evaluation-profile",
      operationVersion: MVP_DEMO_OPERATION_VERSION_V1,
      inputRefs: [{ kind: "evaluation-profile", ref: PROFILE_REF }],
      source: { kind: "mvp-demo", ref: MVP_DEMO_REF_V1 },
    },
  };
}

function componentDefinition(
  componentRef: string,
  componentType: EvaluationProfileV1["components"][number]["componentType"],
  measurementType: EvaluationProfileV1["components"][number]["measurementType"],
  measurementResultRef: string,
  requestRef: string,
  scoring: EvaluationProfileV1["components"][number]["scoring"],
  weight: number,
): EvaluationProfileV1["components"][number] {
  return {
    kind: "evaluation-component-definition",
    componentRef,
    componentType,
    measurementType,
    measurementRefs: [`${measurementResultRef}:${requestRef}`],
    scoring,
    weight,
    required: true,
    ambiguousMeasurementPolicy: "include_with_confidence_penalty",
    sourceRefs: [{ kind: "evaluation-component", ref: componentRef }],
  };
}

function canonicalComparisonPolicy(): ComparisonPolicyV1 {
  return {
    kind: "comparison-policy",
    schemaVersion: COMPARISON_POLICY_V1_SCHEMA_VERSION,
    policyRef: POLICY_REF,
    tieTolerance: 0.0001,
    minimumConfidence: 0.4,
    ambiguousEvaluationPolicy: "do_not_select",
    sourceRefs: [{ kind: "comparison-policy", ref: POLICY_REF }],
    provenance: {
      operationName: "core.mvp-demo-v1.comparison-policy",
      operationVersion: MVP_DEMO_OPERATION_VERSION_V1,
      inputRefs: [{ kind: "comparison-policy", ref: POLICY_REF }],
      source: { kind: "mvp-demo", ref: MVP_DEMO_REF_V1 },
    },
  };
}

function canonicalArtifactOptions(): MvpDemoArtifactOptionsV1 {
  return {
    kind: "mvp-demo-artifact-options",
    structuredResult: {
      kind: "artifact-options",
      artifactType: "structured-result",
      includeConstruction: true,
      includeMeasurements: true,
      includeEvaluation: true,
      includeComparison: true,
      includeDecision: true,
      includeExplanation: true,
      includeWarnings: true,
      includeProvenance: true,
    },
    constructionSummary: {
      kind: "artifact-options",
      artifactType: "construction-summary",
      includeTraceSummary: true,
      includeWarnings: true,
    },
    evaluationReport: {
      kind: "artifact-options",
      artifactType: "evaluation-report",
      includeComparison: true,
      includeDecision: true,
      includeExplanation: true,
      includeHumanSummary: true,
      includeWarnings: true,
      includeLimits: true,
    },
    explanation: {
      kind: "artifact-options",
      artifactType: "explanation",
      includeStructuredSource: true,
      includeHumanSummary: true,
      includeWarnings: true,
      includeLimits: true,
    },
    simpleVisual: {
      kind: "artifact-options",
      artifactType: "simple-visual",
      format: "svg",
      mediaType: "image/svg+xml",
      viewportWidth: 300,
      viewportHeight: 200,
      padding: 10,
      includeSurface: true,
      includeZones: true,
      includeGridCells: true,
      includeGuides: true,
      includeIntersections: true,
      includeElements: true,
      includeLabels: true,
      includeWarnings: true,
      coordinatePrecision: 3,
      styleVersion: "simple-v1",
    },
  };
}

function operationContextInput(): unknown {
  return {
    coreVersion: CORE_VERSION,
    operation: MVP_DEMO_OPERATION_NAME_V1,
    operationVersion: MVP_DEMO_OPERATION_VERSION_V1,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: {
      kind: "run-coordinate-policy",
      surfaceRef: "surface:unit",
      origin: "bottom-left",
      xAxis: "right",
      yAxis: "up",
      normalizedBounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
      coordinateScale: "normalized",
    },
    metricPolicy: {
      kind: "run-metric-policy",
      surfaceRef: "surface:unit",
      measurement: "both",
      unit: "px",
      distance: "axis-aligned",
      area: "rectangular",
      angle: "radians",
    },
    tolerancePolicy: runTolerancePolicy(),
    roundingPolicy: roundingPolicy(),
    numericPolicy: numericPolicy(),
    orderingPolicy: orderingPolicy(),
    featureFlags: {
      "artifact.simpleVisual": true,
      "evaluation.basicProfile": true,
      "run.staticReadiness": true,
    },
    sourceRefs: [{ kind: "operation", ref: MVP_DEMO_OPERATION_NAME_V1 }],
  };
}

function canonicalOperationVersions(): MvpDemoOperationVersionsV1 {
  return {
    kind: "mvp-demo-operation-versions",
    demo: MVP_DEMO_OPERATION_VERSION_V1,
    ratioPackValidation: "0.1.0",
    packLock: "0.1.0",
    operationContext: "0.1.0",
    ruleResolution: "0.1.0",
    constructionGeneration: "0.1.0",
    measurement: "0.1.0",
    evaluation: "0.1.0",
    comparison: "0.1.0",
    artifact: "0.1.0",
    run: "0.1.0",
    replayReadiness: "0.1.0",
    resultValidation: "0.1.0",
  };
}

function numericPolicy(): unknown {
  return {
    kind: "run-numeric-policy",
    epsilon: 1e-9,
    comparison: "absolute",
    negativeZero: "normalize-to-zero",
    nonFinite: "reject",
  };
}

function runTolerancePolicy(): unknown {
  return {
    kind: "run-tolerance-policy",
    coordinateTolerance: 0,
    metricTolerance: 0,
    angleTolerance: 0,
  };
}

function roundingPolicy(): unknown {
  return { kind: "run-rounding-policy", mode: "none", precision: null };
}

function orderingPolicy(): unknown {
  return {
    kind: "run-ordering-policy",
    inputRefs: "kind-then-ref",
    outputRefs: "category-then-ref",
    rules: "resolved-rule-set-order",
    featureFlags: "key-ascending",
    warnings: "code-path-source",
    errors: "code-path-source",
    mismatches: "precedence-kind-path",
  };
}

function validateDemoGeometry(input: MvpDemoInputV1): CoreResult {
  for (const geometry of [input.surface, input.compositions.a, input.compositions.b]) {
    const result = validateGeometryV1(geometry);
    if (result.status !== "ok") {
      return result;
    }
  }
  return createMvpDemoCoreResult({ status: "ok" });
}

function measurementInput(
  measurementResultRef: string,
  composition: Composition2D,
  surface: SurfaceSpace,
  construction: ConstructionV1,
  metricPolicy: unknown,
  requests: readonly unknown[],
): unknown {
  return {
    kind: "measurement-input",
    schemaVersion: "measurement-input-v1",
    measurementResultRef,
    surface,
    construction,
    composition,
    metricPolicy,
    geometryRefs: [],
    requests,
  };
}

function evaluationInput(
  compositionRef: string,
  measurementResult: MeasurementResultV1,
  profile: EvaluationProfileV1,
  demoInput: MvpDemoInputV1,
): unknown {
  return {
    kind: "evaluation-input",
    schemaVersion: "evaluation-input-v1",
    compositionRef,
    constructionRef: CONSTRUCTION_REF,
    measurementResult,
    profile,
    packRef: profile.packRef,
    ruleSetRef: profile.ruleSetRef,
    operationVersion: demoInput.operationVersions.evaluation,
    sourceRefs: [
      { kind: "composition", ref: compositionRef },
      { kind: "measurement-result", ref: measurementResult.measurementResultRef },
      { kind: "evaluation-profile", ref: profile.profileRef },
    ],
  };
}

function artifactSourceBundle(
  input: MvpDemoInputV1,
  construction: ConstructionV1,
  measurementResultA: MeasurementResultV1,
  measurementResultB: MeasurementResultV1,
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
  comparisonOutput: ComparisonDecisionExplanationV1,
): ArtifactSourceBundleV1 {
  return {
    kind: "artifact-source-bundle",
    schemaVersion: "artifact-source-bundle-v1",
    surface: input.surface,
    construction,
    compositionA: input.compositions.a,
    compositionB: input.compositions.b,
    measurementResultA,
    measurementResultB,
    evaluationA,
    evaluationB,
    comparison: comparisonOutput.comparison,
    decision: comparisonOutput.decision,
    structuredExplanation: comparisonOutput.structuredExplanation,
  };
}

function artifactSourceBundleFromResult(result: MvpDemoResultV1): ArtifactSourceBundleV1 {
  return {
    kind: "artifact-source-bundle",
    schemaVersion: "artifact-source-bundle-v1",
    surface: result.surface,
    construction: result.construction,
    compositionA: result.compositions.a,
    compositionB: result.compositions.b,
    measurementResultA: result.measurementResultA,
    measurementResultB: result.measurementResultB,
    evaluationA: result.evaluationA,
    evaluationB: result.evaluationB,
    comparison: result.comparison,
    decision: result.decision,
    structuredExplanation: result.structuredExplanation,
  };
}

function artifactRequest<TOptions>(
  sources: ArtifactSourceBundleV1,
  options: TOptions,
  runRef: RunRef,
): unknown {
  return {
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options,
    runRef,
  };
}

function runOutputInput(sources: ArtifactSourceBundleV1, artifacts: readonly MvpDemoArtifactsV1[keyof MvpDemoArtifactsV1][]): unknown {
  return {
    constructionRefs: [{ kind: "construction", ref: requireSource(sources.construction).constructionRef }],
    measurementRefs: [
      { kind: "measurement-result", ref: requireSource(sources.measurementResultA).measurementResultRef },
      { kind: "measurement-result", ref: requireSource(sources.measurementResultB).measurementResultRef },
    ],
    evaluationRefs: [
      { kind: "evaluation", ref: requireSource(sources.evaluationA).evaluationRef },
      { kind: "evaluation", ref: requireSource(sources.evaluationB).evaluationRef },
    ],
    comparisonRefs: [{ kind: "comparison", ref: requireSource(sources.comparison).comparisonRef }],
    decisionRefs: [{ kind: "decision", ref: requireSource(sources.decision).decisionRef }],
    explanationRefs: [{ kind: "structured-explanation", ref: requireSource(sources.structuredExplanation).explanationRef }],
    artifactRefs: artifacts.map((artifact) => ({ kind: "artifact", ref: artifact.artifactRef })),
    executionStatus: "success",
  };
}

function runSourceBundle(sources: ArtifactSourceBundleV1, artifacts: readonly MvpDemoArtifactsV1[keyof MvpDemoArtifactsV1][]): RunSourceBundleV1 {
  return {
    kind: "run-source-bundle",
    schemaVersion: RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION,
    surface: requireSource(sources.surface),
    construction: requireSource(sources.construction),
    compositionA: requireSource(sources.compositionA),
    compositionB: requireSource(sources.compositionB),
    measurementResultA: requireSource(sources.measurementResultA),
    measurementResultB: requireSource(sources.measurementResultB),
    evaluationA: requireSource(sources.evaluationA),
    evaluationB: requireSource(sources.evaluationB),
    comparison: requireSource(sources.comparison),
    decision: requireSource(sources.decision),
    structuredExplanation: requireSource(sources.structuredExplanation),
    artifacts,
  };
}

function replayDependencies(run: RunV1, artifacts: readonly MvpDemoArtifactsV1[keyof MvpDemoArtifactsV1][]): unknown {
  return {
    kind: "replay-readiness-dependencies",
    inputIdentity: run.runInput.inputIdentity,
    packLock: run.packLock,
    orderedRuleRefs: run.orderedRuleRefs,
    ruleSetRef: run.ruleSetRef,
    operationContext: run.operationContext,
    sourceRefs: run.runInput.inputRefs,
    artifacts,
  };
}

function summaryFor(
  input: MvpDemoInputV1,
  construction: ConstructionV1,
  measurementResultA: MeasurementResultV1,
  measurementResultB: MeasurementResultV1,
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
  comparison: ComparisonV1,
  artifacts: MvpDemoArtifactsV1,
  run: RunV1,
  replayReadinessReport: ReplayReadinessReportV1,
  warnings: readonly CoreWarning[],
  errors: readonly CoreError[],
): MvpDemoSummaryV1 {
  const metric = input.metricPolicy as { width?: unknown; height?: unknown; unit?: unknown };
  return {
    kind: "mvp-demo-summary",
    surfaceRef: input.surface.id,
    surfaceDimensions: {
      width: typeof metric.width === "number" ? metric.width : 0,
      height: typeof metric.height === "number" ? metric.height : 0,
      unit: typeof metric.unit === "string" ? metric.unit : "unknown",
      normalizedBounds: cloneJson(input.surface.bounds),
    },
    constructionCounts: constructionCounts(construction),
    measurementCounts: {
      a: measurementResultA.measurements.length,
      b: measurementResultB.measurements.length,
    },
    evaluationSummaries: {
      a: evaluationSummary(evaluationA),
      b: evaluationSummary(evaluationB),
    },
    comparisonStatus: comparison.status,
    selectedCompositionRef: comparison.selectedCompositionRef,
    comparisonStatement: comparisonStatement(comparison.status),
    artifactStatuses: Object.values(artifacts).map((artifact) => ({
      artifactRef: artifact.artifactRef,
      artifactType: artifact.artifactType,
      status: artifact.status,
    })),
    runRef: run.runRef.id,
    replayReadinessStatus: replayReadinessReport.status,
    warningCount: warnings.length,
    errorCount: errors.length,
    boundaryNotes: [
      "Structured outputs are authoritative.",
      "Artifacts are derived projections.",
      "The SVG is visual evidence only, not source geometry.",
      "Replay-readiness is static and does not execute replay.",
    ],
  };
}

function constructionCounts(construction: ConstructionV1): MvpDemoSummaryV1["constructionCounts"] {
  return {
    guides: construction.guides.length,
    zones: construction.zones.length,
    grids: construction.grids.length,
    cells: construction.grids.reduce((total, grid) => total + grid.cells.length, 0),
    intersections: construction.intersections.length,
  };
}

function evaluationSummary(evaluation: EvaluationV1): MvpDemoEvaluationSummaryV1 {
  return {
    evaluationRef: evaluation.evaluationRef,
    compositionRef: evaluation.compositionRef,
    status: evaluation.status,
    score: evaluation.score.overallScore,
    confidence: evaluation.confidence.value,
  };
}

function comparisonStatement(status: ComparisonStatusV1): string {
  if (status === "a_closer") {
    return "A is closer to the declared system under the canonical MVP profile.";
  }
  if (status === "b_closer") {
    return "B is closer to the declared system under the canonical MVP profile.";
  }
  if (status === "tie") {
    return "A and B are tied within the explicit comparison tolerance.";
  }
  if (status === "ambiguous") {
    return "The comparison is ambiguous under the explicit comparison policy.";
  }
  return "A and B are not comparable under the explicit comparison context.";
}

function inputFromResult(result: MvpDemoResultV1): MvpDemoInputV1 {
  return {
    kind: "mvp-demo-input",
    schemaVersion: MVP_DEMO_V1_SCHEMA_VERSION,
    demoRef: result.demoRef,
    demoName: result.demoName,
    demoOperationVersion: result.demoOperationVersion,
    surface: result.surface,
    metricPolicy: result.metricPolicy,
    pack: result.pack,
    packLock: result.packLock,
    ruleSetRef: result.ruleResolution.ruleSetRef,
    compositions: result.compositions,
    measurementRequests: result.measurementRequests,
    evaluationProfiles: result.evaluationProfiles,
    comparisonPolicy: result.comparisonPolicy,
    artifactOptions: {
      kind: "mvp-demo-artifact-options",
      structuredResult: result.artifacts.structuredResult.options,
      constructionSummary: result.artifacts.constructionSummary.options,
      evaluationReport: result.artifacts.evaluationReport.options,
      explanation: result.artifacts.explanation.options,
      simpleVisual: result.artifacts.simpleVisual.options,
    },
    operationContext: result.operationContext,
    operationVersions: canonicalOperationVersions(),
    requestedOutputs: result.requestedOutputs,
    sourceRefs: [{ kind: "mvp-demo", ref: result.demoRef }],
    featureFlags: featureFlagRecord(result.operationContext.featureFlags),
    numericPolicy: result.operationContext.numericPolicy,
    tolerancePolicy: result.operationContext.tolerancePolicy,
    orderingPolicy: result.operationContext.orderingPolicy,
    roundingPolicy: result.operationContext.roundingPolicy,
  };
}

function featureFlagRecord(flags: OperationContextV1["featureFlags"]): Readonly<Record<string, boolean>> {
  return Object.fromEntries(flags.map((flag) => [flag.key, flag.value === true]));
}

function traceFromResult(
  stepIndex: number,
  operation: MvpDemoTraceOperationV1,
  operationVersion: string,
  result: CoreResult,
  extraOutputRefs: readonly SourceReference[] = [],
): MvpDemoTraceEntryV1 {
  return traceEntry(
    stepIndex,
    operation,
    operationVersion,
    result.status,
    result.provenance?.inputRefs ?? [],
    [...result.outputRefs, ...extraOutputRefs],
    result.warnings.map((warning) => ({ kind: "warning", ref: `${warning.code}:${warning.targetRef ?? "global"}` })),
    result.errors.map((error) => ({ kind: "error", ref: `${error.code}:${error.targetRef ?? "global"}` })),
    result.provenance ?? undefined,
  );
}

function traceEntry(
  stepIndex: number,
  operation: MvpDemoTraceOperationV1,
  operationVersion: string,
  status: OperationStatus,
  inputRefs: readonly SourceReference[],
  outputRefs: readonly SourceReference[],
  warningRefs: readonly SourceReference[] = [],
  errorRefs: readonly SourceReference[] = [],
  provenance: Provenance = createMvpDemoProvenance(operation, inputRefs),
): MvpDemoTraceEntryV1 {
  return {
    kind: "mvp-demo-trace-entry",
    stepIndex,
    operation,
    operationVersion,
    status,
    inputRefs: cloneJson(inputRefs),
    outputRefs: cloneJson(uniqueSourceRefs(outputRefs)),
    warningRefs: cloneJson(warningRefs),
    errorRefs: cloneJson(errorRefs),
    provenance: cloneJson(provenance),
  };
}

function validateTrace(result: MvpDemoResultV1): boolean {
  if (!isRecord(result.trace) || result.trace.kind !== "mvp-demo-trace" || result.trace.schemaVersion !== "mvp-demo-trace-v1") {
    return false;
  }
  if (result.trace.entries.length !== MVP_DEMO_TRACE_OPERATION_ORDER_V1.length) {
    return false;
  }
  const operationOrder = result.trace.entries.map((entry) => entry.operation);
  if (!sameJson(operationOrder, [...MVP_DEMO_TRACE_OPERATION_ORDER_V1])) {
    return false;
  }
  const knownRefs = new Set(resultOutputRefs(result).map(sourceKey));
  for (const [index, entry] of result.trace.entries.entries()) {
    if (
      entry.kind !== "mvp-demo-trace-entry" ||
      entry.stepIndex !== index + 1 ||
      entry.status !== "ok" ||
      !isSourceReferenceArray(entry.inputRefs) ||
      !isSourceReferenceArray(entry.outputRefs) ||
      !isSourceReferenceArray(entry.warningRefs) ||
      !isSourceReferenceArray(entry.errorRefs)
    ) {
      return false;
    }
    for (const ref of entry.outputRefs) {
      if (!knownRefs.has(sourceKey(ref))) {
        return false;
      }
    }
  }
  return true;
}

function validateSummary(result: MvpDemoResultV1): boolean {
  return [
    result.summary.kind === "mvp-demo-summary",
    result.summary.surfaceRef === result.surface.id,
    result.summary.surfaceDimensions.width === 1200,
    result.summary.surfaceDimensions.height === 800,
    result.summary.surfaceDimensions.unit === "px",
    sameJson(result.summary.surfaceDimensions.normalizedBounds, result.surface.bounds),
    sameJson(result.summary.constructionCounts, constructionCounts(result.construction)),
    result.summary.measurementCounts.a === result.measurementResultA.measurements.length,
    result.summary.measurementCounts.b === result.measurementResultB.measurements.length,
    sameJson(result.summary.evaluationSummaries.a, evaluationSummary(result.evaluationA)),
    sameJson(result.summary.evaluationSummaries.b, evaluationSummary(result.evaluationB)),
    result.summary.comparisonStatus === result.comparison.status,
    result.summary.selectedCompositionRef === result.comparison.selectedCompositionRef,
    result.summary.comparisonStatement === comparisonStatement(result.comparison.status),
    result.summary.runRef === result.run.runRef.id,
    result.summary.replayReadinessStatus === result.replayReadinessReport.status,
  ].every(Boolean);
}

function resultOutputRefs(result: MvpDemoResultV1): readonly SourceReference[] {
  return uniqueSourceRefs([
    { kind: "mvp-demo-result", ref: result.demoRef },
    { kind: "mvp-demo-input", ref: result.demoRef },
    { kind: "geometry", ref: result.surface.id },
    { kind: "ratio-pack", ref: result.packLock.packRef },
    { kind: "pack-lock", ref: result.packLock.lockRef },
    { kind: "operation-context", ref: result.operationContext.contextRef },
    { kind: "rule-set", ref: result.ruleResolution.ruleSetRef },
    { kind: "rule-resolution", ref: `${result.ruleResolution.packRef}:${result.ruleResolution.ruleSetRef}` },
    { kind: "construction", ref: result.construction.constructionRef },
    { kind: "composition", ref: result.compositions.a.id },
    { kind: "composition", ref: result.compositions.b.id },
    { kind: "measurement-result", ref: result.measurementResultA.measurementResultRef },
    { kind: "measurement-result", ref: result.measurementResultB.measurementResultRef },
    ...result.measurementResultA.measurementRefs,
    ...result.measurementResultB.measurementRefs,
    { kind: "evaluation", ref: result.evaluationA.evaluationRef },
    { kind: "evaluation", ref: result.evaluationB.evaluationRef },
    { kind: "score", ref: result.evaluationA.score.scoreRef },
    { kind: "score", ref: result.evaluationB.score.scoreRef },
    { kind: "confidence", ref: result.evaluationA.confidence.confidenceRef },
    { kind: "confidence", ref: result.evaluationB.confidence.confidenceRef },
    ...result.evaluationA.componentScores.map((componentScore) => ({ kind: "component-score", ref: componentScore.componentScoreRef })),
    ...result.evaluationB.componentScores.map((componentScore) => ({ kind: "component-score", ref: componentScore.componentScoreRef })),
    { kind: "comparison", ref: result.comparison.comparisonRef },
    { kind: "decision", ref: result.decision.decisionRef },
    { kind: "structured-explanation", ref: result.structuredExplanation.explanationRef },
    ...Object.values(result.artifacts).map((artifact) => ({ kind: "artifact", ref: artifact.artifactRef })),
    { kind: "run-input", ref: result.run.runInput.inputIdentity },
    { kind: "run", ref: result.run.runRef.id },
    { kind: "replay-readiness-report", ref: result.replayReadinessReport.reportRef },
  ]);
}

function sameRequestRefs(firstRequests: readonly unknown[], secondRequests: readonly unknown[]): boolean {
  const first = firstRequests.map(requestRefFromMeasurementRequest);
  const second = secondRequests.map(requestRefFromMeasurementRequest);
  return first.every((requestRef) => requestRef !== null) && sameJson(first, second);
}

function requestRefFromMeasurementRequest(value: unknown): string | null {
  return isRecord(value) && typeof value.requestRef === "string" && value.requestRef.length > 0
    ? value.requestRef
    : null;
}

function hasCanonicalOperationVersions(value: unknown): value is MvpDemoOperationVersionsV1 {
  if (!isRecord(value) || value.kind !== "mvp-demo-operation-versions") {
    return false;
  }
  return [
    "demo",
    "ratioPackValidation",
    "packLock",
    "operationContext",
    "ruleResolution",
    "constructionGeneration",
    "measurement",
    "evaluation",
    "comparison",
    "artifact",
    "run",
    "replayReadiness",
    "resultValidation",
  ].every((key) => typeof value[key] === "string" && value[key].length > 0);
}

function containsArtifactObject(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsArtifactObject);
  }
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "artifact" || typeof value.artifactRef === "string" || value.schemaVersion === "artifact-v1") {
    return true;
  }
  return Object.entries(value)
    .filter(([key]) => key !== "artifactOptions")
    .some(([, child]) => containsArtifactObject(child));
}

function containsForbiddenClaim(result: MvpDemoResultV1): boolean {
  const serialized = JSON.stringify(result).toLowerCase();
  return [
    "beauty",
    "beautiful",
    "best",
    "better",
    "preferred",
    "winner",
    "recommendation",
    "optimize",
    "authorintent",
    "camera",
    "cad",
    "mcp",
  ].some((term) => serialized.includes(term));
}

function uniqueSourceRefs(refs: readonly SourceReference[]): readonly SourceReference[] {
  const seen = new Set<string>();
  const unique: SourceReference[] = [];
  for (const ref of refs) {
    const key = sourceKey(ref);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(ref);
    }
  }
  return unique;
}

function sourceKey(ref: SourceReference): string {
  return `${ref.kind}:${ref.ref}`;
}

function createMvpDemoCoreResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };
  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function invalidMvpDemoInput(targetRef: string, message: string): CoreResult {
  return createMvpDemoCoreResult({
    status: "failed",
    errors: [mvpError("InvalidMvpDemoInputV1", message, targetRef)],
  });
}

function invalidMvpDemoResult(targetRef: string, message: string): CoreResult {
  return createMvpDemoCoreResult({
    status: "failed",
    errors: [mvpError("InvalidMvpDemoResultV1", message, targetRef)],
  });
}

function missingMvpDependency(targetRef: string, message: string): CoreResult {
  return createMvpDemoCoreResult({
    status: "failed",
    errors: [mvpError("MissingMvpDemoDependency", message, targetRef)],
  });
}

function unsupportedMvpDemoRequest(requested: string): CoreResult {
  return createMvpDemoCoreResult({
    status: "failed",
    errors: [mvpError("UnsupportedMvpDemoRequest", `Unsupported MVP demo requested output: ${requested}.`, "requestedOutputs")],
  });
}

function beautyScoreRequested(requested: string): CoreResult {
  return createMvpDemoCoreResult({
    status: "failed",
    errors: [mvpError("BeautyScoreRequested", `MVP demo rejects beauty-score requests: ${requested}.`, "requestedOutputs")],
  });
}

function artifactWouldBecomeSource(targetRef: string, message: string): CoreResult {
  return createMvpDemoCoreResult({
    status: "failed",
    errors: [mvpError("ArtifactWouldBecomeSourceOfTruth", message, targetRef)],
  });
}

function mvpError(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  severity: DiagnosticSeverity = "error",
): CoreError {
  return createCoreError({
    code,
    severity,
    message,
    targetRef,
    sourceRef: MVP_DEMO_SOURCE_REFERENCE,
    provenance: createMvpDemoProvenance("validateMvpDemoInputV1", [{ kind: "mvp-demo", ref: MVP_DEMO_REF_V1 }]),
  });
}

function failedFromCoreResult<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return createMvpDemoCoreResult({
    status: "failed",
    warnings: result.warnings,
    errors: result.errors,
    provenance: result.provenance,
    outputRefs: result.outputRefs,
    runRef: result.runRef,
    packLockRef: result.packLockRef,
    operationContextRef: result.operationContextRef,
    output: null as TOutput | null,
  });
}

function failedValidation<TValue>(result: CoreResult): MvpValidation<TValue> {
  return { ok: false, result };
}

function createMvpDemoProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: MVP_DEMO_OPERATION_VERSION_V1,
    inputRefs: cloneJson(inputRefs),
    source: MVP_DEMO_SOURCE_REFERENCE,
  };
}

function firstUnknownKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function requiredOutput<TOutput>(result: CoreResult<TOutput>, operation: string): TOutput {
  if (result.status !== "ok" || result.output === null) {
    throw new Error(`Internal invariant failed while building canonical MVP demo input: ${operation}`);
  }
  return cloneJson(result.output);
}

function requireSource<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) {
    throw new Error("Internal invariant failed: source bundle is incomplete.");
  }
  return value;
}

function cloneJson<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function contentIdentityForDemoInput(input: MvpDemoInputV1): string {
  return `mvp-demo-input:v1:${fnv1a64(stableJson(input))}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value) && typeof value.kind === "string" && typeof value.ref === "string";
}

function isBooleanRecord(value: unknown): value is Readonly<Record<string, boolean>> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "boolean");
}
