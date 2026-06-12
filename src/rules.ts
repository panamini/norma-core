import type {
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  PackLockRef,
  Provenance,
  SourceReference,
} from "./index.js";
import type {
  Ratio,
  RatioPack,
  RatioSequence,
} from "./ratio-pack.js";
import {
  readRatioFromPack,
  readRatioSequenceFromPack,
  validateRatioPackV1,
} from "./ratio-pack.js";

export const CORE_RULE_TYPES_V1 = [
  "divideSurfaceVertical",
  "divideSurfaceHorizontal",
  "createGuidesFromCandidates",
  "createSimpleGrid",
  "createDiagonals",
  "deriveIntersections",
] as const;

export type RuleType = (typeof CORE_RULE_TYPES_V1)[number];
export type RuleRef = string;

export interface RuleDeclaration {
  kind: "rule-declaration";
  id: RuleRef;
  type: string;
  target: "surface";
  ratioRefs: readonly string[];
  sequenceRefs?: readonly string[];
  partitionPatternRefs?: readonly string[];
  requiresCoreSupport: true;
  declarationOnly: true;
}

export interface RuleSet {
  kind: "rule-set";
  id: string;
  ruleRefs: readonly RuleRef[];
  declarationOnly: true;
}

export interface RuleTypeCompatibility {
  kind: "rule-type-compatibility";
  version: "rule-type-registry-v1";
  supported: true;
}

export interface RuleTypeDefinition {
  kind: "rule-type";
  type: RuleType;
  supported: true;
  compatibility: RuleTypeCompatibility;
}

export type RuleTypeRegistry = Readonly<Record<string, RuleTypeDefinition>>;

export interface RuleProvenance {
  kind: "rule-provenance";
  packRef: string;
  ruleSetRef: string;
  ruleRef: RuleRef;
  declarationRef: RuleRef;
  source: SourceReference;
}

export interface Rule {
  kind: "rule";
  ref: RuleRef;
  type: RuleType;
  packRef: string;
  ruleSetRef: string;
  declarationRef: RuleRef;
  ratioRefs: readonly string[];
  ratioSequenceRefs: readonly string[];
  partitionPatternRefs: readonly string[];
  provenance: RuleProvenance;
}

export interface UnsupportedRule {
  kind: "unsupported-rule";
  ref: RuleRef;
  type: string;
  packRef: string;
  ruleSetRef: string;
  reason: "unsupported-rule-type";
}

export interface RuleSetResolutionProvenance {
  kind: "rule-set-resolution-provenance";
  packRef: string;
  ruleSetRef: string;
  ruleRefs: readonly RuleRef[];
  source: SourceReference;
}

export interface ResolvedRuleSet {
  kind: "resolved-rule-set";
  ruleSetRef: string;
  orderedRules: readonly Rule[];
  resolvedRatioRefs: readonly string[];
  unsupportedRules: readonly UnsupportedRule[];
  warnings: readonly CoreWarning[];
  provenance: RuleSetResolutionProvenance;
}

export interface ResolvedRatio {
  kind: "resolved-ratio";
  packRef: string;
  ratioRef: string;
  ratio: Ratio;
  provenance: RuleResolutionProvenance;
}

export interface ResolvedRatioSequence {
  kind: "resolved-ratio-sequence";
  packRef: string;
  sequenceRef: string;
  sequence: RatioSequence;
  provenance: RuleResolutionProvenance;
}

export interface RuleResolutionProvenance {
  kind: "rule-resolution-provenance";
  packRef: string;
  source: SourceReference;
}

interface DiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
  blocking?: boolean;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  output?: TOutput | null;
}

type RuleResolutionStep =
  | {
      ok: true;
      ratioRefs: readonly string[];
      rule: Rule | null;
      unsupportedRule: UnsupportedRule | null;
      warning: CoreWarning | null;
      error: CoreError | null;
    }
  | {
      ok: false;
      result: CoreResult<ResolvedRuleSet>;
    };

interface RuleSetRulesResolution {
  orderedRules: readonly Rule[];
  resolvedRatioRefs: readonly string[];
  unsupportedRules: readonly UnsupportedRule[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
}

type RuleSetRulesResolutionResult =
  | {
      ok: true;
      value: RuleSetRulesResolution;
    }
  | {
      ok: false;
      result: CoreResult<ResolvedRuleSet>;
    };

interface RuleSetResolutionAccumulator {
  orderedRules: Rule[];
  unsupportedRules: UnsupportedRule[];
  warnings: CoreWarning[];
  errors: CoreError[];
  resolvedRatioRefSet: Set<string>;
}

const RULE_RESOLUTION_OPERATION_VERSION = "0.1.0";

const RULE_RESOLUTION_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/rule-resolution-v1",
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

export const CORE_RULE_TYPE_REGISTRY_V1: RuleTypeRegistry = Object.freeze(
  Object.fromEntries(
    CORE_RULE_TYPES_V1.map((ruleType) => [
      ruleType,
      Object.freeze({
        kind: "rule-type",
        type: ruleType,
        supported: true,
        compatibility: Object.freeze({
          kind: "rule-type-compatibility",
          version: "rule-type-registry-v1",
          supported: true,
        }),
      }),
    ]),
  ) as Record<RuleType, RuleTypeDefinition>,
);

export function resolveRatio(pack: unknown, ratioRef: string): CoreResult<ResolvedRatio> {
  const packResult = validateRatioPackV1(pack);
  if (packResult.status !== "ok" || packResult.output === null) {
    return packResult as unknown as CoreResult<ResolvedRatio>;
  }

  const ratioResult = readRatioFromPack(packResult.output, ratioRef);
  if (ratioResult.status !== "ok" || ratioResult.output === null) {
    return ratioResult as unknown as CoreResult<ResolvedRatio>;
  }

  const packRef = ratioPackRef(packResult.output);
  const provenance = createRuleResolutionProvenance("core.rule-resolution-v1.ratio.resolve", [
    { kind: "ratio-pack", ref: packRef },
    { kind: "ratio", ref: ratioRef },
  ]);

  return createRuleResolutionResult({
    status: "ok",
    provenance,
    outputRefs: [{ kind: "ratio", ref: ratioRef }],
    packLockRef: { id: packResult.output.preLock.ref },
    output: {
      kind: "resolved-ratio",
      packRef,
      ratioRef,
      ratio: ratioResult.output,
      provenance: {
        kind: "rule-resolution-provenance",
        packRef,
        source: RULE_RESOLUTION_SOURCE_REFERENCE,
      },
    },
  });
}

export function resolveRatioSequence(pack: unknown, sequenceRef: string): CoreResult<ResolvedRatioSequence> {
  const packResult = validateRatioPackV1(pack);
  if (packResult.status !== "ok" || packResult.output === null) {
    return packResult as unknown as CoreResult<ResolvedRatioSequence>;
  }

  const sequenceResult = readRatioSequenceFromPack(packResult.output, sequenceRef);
  if (sequenceResult.status !== "ok" || sequenceResult.output === null) {
    return sequenceResult as unknown as CoreResult<ResolvedRatioSequence>;
  }

  const packRef = ratioPackRef(packResult.output);
  const provenance = createRuleResolutionProvenance("core.rule-resolution-v1.ratio-sequence.resolve", [
    { kind: "ratio-pack", ref: packRef },
    { kind: "ratio-sequence", ref: sequenceRef },
  ]);

  return createRuleResolutionResult({
    status: "ok",
    provenance,
    outputRefs: [{ kind: "ratio-sequence", ref: sequenceRef }],
    packLockRef: { id: packResult.output.preLock.ref },
    output: {
      kind: "resolved-ratio-sequence",
      packRef,
      sequenceRef,
      sequence: sequenceResult.output,
      provenance: {
        kind: "rule-resolution-provenance",
        packRef,
        source: RULE_RESOLUTION_SOURCE_REFERENCE,
      },
    },
  });
}

export function resolveRuleSet(
  pack: unknown,
  ruleSetRef: string,
  registry: RuleTypeRegistry = CORE_RULE_TYPE_REGISTRY_V1,
): CoreResult<ResolvedRuleSet> {
  const packResult = validateRatioPackV1(pack);
  if (packResult.status !== "ok" || packResult.output === null) {
    return packResult as unknown as CoreResult<ResolvedRuleSet>;
  }

  const ratioPack = packResult.output;
  const packRef = ratioPackRef(ratioPack);
  const ruleSet = ratioPack.ruleSets.find((candidate) => candidate.id === ruleSetRef);
  if (ruleSet === undefined) {
    return missingRuleSet(ruleSetRef);
  }

  const rulesResolution = resolveRuleSetRules(ratioPack, ruleSet, registry);
  if (!rulesResolution.ok) {
    return rulesResolution.result;
  }

  const resolvedRuleSet = createResolvedRuleSet({
    ratioPack,
    ruleSetRef,
    ruleRefs: ruleSet.ruleRefs,
    orderedRules: rulesResolution.value.orderedRules,
    resolvedRatioRefs: rulesResolution.value.resolvedRatioRefs,
    unsupportedRules: rulesResolution.value.unsupportedRules,
    warnings: rulesResolution.value.warnings,
  });

  const provenance = createRuleResolutionProvenance("core.rule-resolution-v1.rule-set.resolve", [
    { kind: "ratio-pack", ref: packRef },
    { kind: "rule-set", ref: ruleSetRef },
  ]);

  return createRuleResolutionResult({
    status: rulesResolution.value.errors.length > 0 ? "failed" : "ok",
    warnings: rulesResolution.value.warnings,
    errors: rulesResolution.value.errors,
    provenance,
    outputRefs: [
      { kind: "ratio-pack", ref: packRef },
      { kind: "rule-set", ref: ruleSetRef },
    ],
    packLockRef: { id: ratioPack.preLock.ref },
    output: resolvedRuleSet,
  });
}

function resolveRuleSetRules(
  ratioPack: RatioPack,
  ruleSet: RuleSet,
  registry: RuleTypeRegistry,
): RuleSetRulesResolutionResult {
  const accumulator = createRuleSetResolutionAccumulator();

  for (const ruleRef of ruleSet.ruleRefs) {
    const resolution = resolveRuleSetRule(ratioPack, ruleSet.id, ruleRef, registry);
    if (!resolution.ok) {
      return resolution;
    }

    appendRuleResolution(accumulator, resolution);
  }

  return {
    ok: true,
    value: {
      orderedRules: accumulator.orderedRules,
      resolvedRatioRefs: ratioPack.ratios
        .map((ratio) => ratio.id)
        .filter((ratioRef) => accumulator.resolvedRatioRefSet.has(ratioRef)),
      unsupportedRules: accumulator.unsupportedRules,
      warnings: accumulator.warnings,
      errors: accumulator.errors,
    },
  };
}

function resolveRuleSetRule(
  ratioPack: RatioPack,
  ruleSetRef: string,
  ruleRef: string,
  registry: RuleTypeRegistry,
): RuleResolutionStep {
  const declaration = ratioPack.ruleDeclarations.find((candidate) => candidate.id === ruleRef);
  if (declaration === undefined) {
    return { ok: false, result: missingRuleDeclaration(ruleRef, ratioPackRef(ratioPack), ruleSetRef) };
  }

  return resolveRuleDeclaration(ratioPack, declaration, ruleSetRef, registry);
}

function createRuleSetResolutionAccumulator(): RuleSetResolutionAccumulator {
  return {
    orderedRules: [],
    unsupportedRules: [],
    warnings: [],
    errors: [],
    resolvedRatioRefSet: new Set<string>(),
  };
}

function appendRuleResolution(
  accumulator: RuleSetResolutionAccumulator,
  resolution: Extract<RuleResolutionStep, { ok: true }>,
): void {
  for (const ratioRef of resolution.ratioRefs) {
    accumulator.resolvedRatioRefSet.add(ratioRef);
  }

  appendIfPresent(accumulator.orderedRules, resolution.rule);
  appendIfPresent(accumulator.unsupportedRules, resolution.unsupportedRule);
  appendIfPresent(accumulator.warnings, resolution.warning);
  appendIfPresent(accumulator.errors, resolution.error);
}

function appendIfPresent<TValue>(values: TValue[], value: TValue | null): void {
  if (value !== null) {
    values.push(value);
  }
}

function resolveRuleDeclaration(
  ratioPack: RatioPack,
  declaration: RuleDeclaration,
  ruleSetRef: string,
  registry: RuleTypeRegistry,
): RuleResolutionStep {
  const ratioFailure = firstRatioResolutionFailure(ratioPack, declaration.ratioRefs);
  if (ratioFailure !== null) {
    return { ok: false, result: ratioFailure };
  }

  const sequenceFailure = firstRatioSequenceResolutionFailure(ratioPack, declaration.sequenceRefs ?? []);
  if (sequenceFailure !== null) {
    return { ok: false, result: sequenceFailure };
  }

  const definition = registry[declaration.type];
  if (definition === undefined || definition.supported !== true) {
    return unsupportedRuleResolutionStep(ratioPack, declaration, ruleSetRef);
  }

  return {
    ok: true,
    ratioRefs: declaration.ratioRefs,
    rule: createResolvedRule(ratioPack, declaration, ruleSetRef, definition),
    unsupportedRule: null,
    warning: null,
    error: null,
  };
}

function firstRatioResolutionFailure(
  ratioPack: RatioPack,
  ratioRefs: readonly string[],
): CoreResult<ResolvedRuleSet> | null {
  for (const ratioRef of ratioRefs) {
    const ratioResult = resolveRatio(ratioPack, ratioRef);
    if (ratioResult.status !== "ok") {
      return ratioResult as unknown as CoreResult<ResolvedRuleSet>;
    }
  }

  return null;
}

function firstRatioSequenceResolutionFailure(
  ratioPack: RatioPack,
  sequenceRefs: readonly string[],
): CoreResult<ResolvedRuleSet> | null {
  for (const sequenceRef of sequenceRefs) {
    const sequenceResult = resolveRatioSequence(ratioPack, sequenceRef);
    if (sequenceResult.status !== "ok") {
      return sequenceResult as unknown as CoreResult<ResolvedRuleSet>;
    }
  }

  return null;
}

function unsupportedRuleResolutionStep(
  ratioPack: RatioPack,
  declaration: RuleDeclaration,
  ruleSetRef: string,
): RuleResolutionStep {
  const unsupportedRule = createUnsupportedRule(ratioPack, declaration, ruleSetRef);

  return {
    ok: true,
    ratioRefs: declaration.ratioRefs,
    rule: null,
    unsupportedRule,
    warning: unsupportedRuleTypeWarning(unsupportedRule),
    error: unsupportedRuleTypeError(unsupportedRule),
  };
}

function createResolvedRule(
  ratioPack: RatioPack,
  declaration: RuleDeclaration,
  ruleSetRef: string,
  definition: RuleTypeDefinition,
): Rule {
  const packRef = ratioPackRef(ratioPack);

  return {
    kind: "rule",
    ref: declaration.id,
    type: definition.type,
    packRef,
    ruleSetRef,
    declarationRef: declaration.id,
    ratioRefs: [...declaration.ratioRefs],
    ratioSequenceRefs: [...(declaration.sequenceRefs ?? [])],
    partitionPatternRefs: [...(declaration.partitionPatternRefs ?? [])],
    provenance: {
      kind: "rule-provenance",
      packRef,
      ruleSetRef,
      ruleRef: declaration.id,
      declarationRef: declaration.id,
      source: { kind: "ratio-pack", ref: packRef },
    },
  };
}

function createUnsupportedRule(
  ratioPack: RatioPack,
  declaration: RuleDeclaration,
  ruleSetRef: string,
): UnsupportedRule {
  return {
    kind: "unsupported-rule",
    ref: declaration.id,
    type: declaration.type,
    packRef: ratioPackRef(ratioPack),
    ruleSetRef,
    reason: "unsupported-rule-type",
  };
}

function createResolvedRuleSet(input: {
  ratioPack: RatioPack;
  ruleSetRef: string;
  ruleRefs: readonly RuleRef[];
  orderedRules: readonly Rule[];
  resolvedRatioRefs: readonly string[];
  unsupportedRules: readonly UnsupportedRule[];
  warnings: readonly CoreWarning[];
}): ResolvedRuleSet {
  const packRef = ratioPackRef(input.ratioPack);

  return {
    kind: "resolved-rule-set",
    ruleSetRef: input.ruleSetRef,
    orderedRules: [...input.orderedRules],
    resolvedRatioRefs: [...input.resolvedRatioRefs],
    unsupportedRules: [...input.unsupportedRules],
    warnings: [...input.warnings],
    provenance: {
      kind: "rule-set-resolution-provenance",
      packRef,
      ruleSetRef: input.ruleSetRef,
      ruleRefs: [...input.ruleRefs],
      source: RULE_RESOLUTION_SOURCE_REFERENCE,
    },
  };
}

function missingRuleSet(ruleSetRef: string): CoreResult<ResolvedRuleSet> {
  return createRuleResolutionResult({
    status: "failed",
    errors: [
      createRuleResolutionError({
        code: "MissingRuleSet",
        message: `Rule set is not declared in the ratio pack: ${ruleSetRef}.`,
        targetRef: `ruleSets.${ruleSetRef}`,
        sourceRef: { kind: "rule-set", ref: ruleSetRef },
      }),
    ],
  });
}

function missingRuleDeclaration(ruleRef: string, packRef: string, ruleSetRef: string): CoreResult<ResolvedRuleSet> {
  return createRuleResolutionResult({
    status: "failed",
    errors: [
      createRuleResolutionError({
        code: "MissingRuleDeclaration",
        message: `Rule declaration is not declared in the ratio pack: ${ruleRef}.`,
        targetRef: `ruleSets.${ruleSetRef}.ruleRefs`,
        sourceRef: { kind: "ratio-pack", ref: packRef },
      }),
    ],
  });
}

function unsupportedRuleTypeWarning(rule: UnsupportedRule): CoreWarning {
  return createRuleResolutionWarning({
    code: "UnsupportedRuleType",
    severity: "critical",
    blocking: true,
    message: `Rule type is not supported by the core rule type registry: ${rule.type}.`,
    targetRef: `ruleDeclarations.${rule.ref}.type`,
    sourceRef: { kind: "rule", ref: rule.ref },
  });
}

function unsupportedRuleTypeError(rule: UnsupportedRule): CoreError {
  return createRuleResolutionError({
    code: "UnsupportedRuleType",
    message: `Rule type is not supported by the core rule type registry: ${rule.type}.`,
    targetRef: `ruleDeclarations.${rule.ref}.type`,
    sourceRef: { kind: "rule", ref: rule.ref },
  });
}

function createRuleResolutionError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: RULE_RESOLUTION_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };

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

function createRuleResolutionWarning(input: DiagnosticInput): CoreWarning {
  const diagnostic = { sourceRef: RULE_RESOLUTION_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };
  const severity = warningSeverity(diagnostic.severity);

  return {
    code: diagnostic.code,
    severity,
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: warningBlocking(diagnostic.blocking, severity),
    provenance: diagnostic.provenance,
  };
}

function createRuleResolutionResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createRuleResolutionProvenance(
  operationName: string,
  inputRefs: readonly SourceReference[] = [],
): Provenance {
  return {
    operationName,
    operationVersion: RULE_RESOLUTION_OPERATION_VERSION,
    inputRefs,
    source: RULE_RESOLUTION_SOURCE_REFERENCE,
  };
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function warningSeverity(severity: DiagnosticSeverity | undefined): CoreWarning["severity"] {
  if (severity === "critical" || severity === "info" || severity === "warning") {
    return severity;
  }

  return "warning";
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function warningBlocking(blocking: boolean | undefined, severity: CoreWarning["severity"]): boolean {
  if (blocking !== undefined) {
    return blocking;
  }

  return severity === "critical";
}
