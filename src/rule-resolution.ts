import type {
  CoreError,
  CoreResult,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  PackLockRef,
  Provenance,
  SourceReference,
} from "./index.js";
import type {
  PartitionPattern,
  Ratio,
  RatioPack,
  RatioSequence,
  RuleDeclaration,
} from "./ratio-pack.js";
import { validateRatioPackV1 } from "./ratio-pack.js";

export const RULE_RESOLUTION_V1_SCHEMA_VERSION = "rule-resolution-v1" as const;

export type RuleResolutionV1SchemaVersion = typeof RULE_RESOLUTION_V1_SCHEMA_VERSION;

export interface ResolvedRatioRef {
  kind: "resolved-ratio-ref";
  ratioRef: string;
  normalizedValue: number;
  sourceRef: SourceReference;
}

export interface ResolvedRatioSequenceRef {
  kind: "resolved-ratio-sequence-ref";
  sequenceRef: string;
  normalizedParts: readonly number[];
  sourceRef: SourceReference;
}

export interface ResolvedPartitionPatternRef {
  kind: "resolved-partition-pattern-ref";
  partitionPatternRef: string;
  ratioRefs: readonly string[];
  sequenceRef?: string;
  axis: PartitionPattern["axis"];
  sourceRef: SourceReference;
}

export interface ResolvedRule {
  kind: "resolved-rule";
  ruleRef: string;
  type: "surface.partition-line";
  target: "surface";
  ratioRefs: readonly ResolvedRatioRef[];
  sequenceRefs: readonly ResolvedRatioSequenceRef[];
  partitionPatternRefs: readonly ResolvedPartitionPatternRef[];
  constructionRefs: readonly SourceReference[];
  measurementRefs: readonly SourceReference[];
}

export interface RuleResolutionV1 {
  kind: "rule-resolution";
  schemaVersion: RuleResolutionV1SchemaVersion;
  ruleSetRef: string;
  packRef: string;
  contentIdentity: string;
  ruleRefs: readonly string[];
  rules: readonly ResolvedRule[];
  constructionRefs: readonly SourceReference[];
  measurementRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  scoringRefs: readonly SourceReference[];
}

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
  warnings?: readonly never[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  output?: TOutput | null;
}

type RuleResolutionValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult;
    };

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

const RULE_RESOLUTION_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "ruleSetRef",
  "packRef",
  "contentIdentity",
  "ruleRefs",
  "rules",
  "constructionRefs",
  "measurementRefs",
  "artifactRefs",
  "scoringRefs",
] as const;

const RESOLVED_RULE_ALLOWED_KEYS = [
  "kind",
  "ruleRef",
  "type",
  "target",
  "ratioRefs",
  "sequenceRefs",
  "partitionPatternRefs",
  "constructionRefs",
  "measurementRefs",
] as const;

const SOURCE_REFERENCE_ALLOWED_KEYS = ["kind", "ref"] as const;

const RESOLVED_RATIO_REF_ALLOWED_KEYS = [
  "kind",
  "ratioRef",
  "normalizedValue",
  "sourceRef",
] as const;

const RESOLVED_RATIO_SEQUENCE_REF_ALLOWED_KEYS = [
  "kind",
  "sequenceRef",
  "normalizedParts",
  "sourceRef",
] as const;

const RESOLVED_PARTITION_PATTERN_REF_ALLOWED_KEYS = [
  "kind",
  "partitionPatternRef",
  "ratioRefs",
  "sequenceRef",
  "axis",
  "sourceRef",
] as const;

export function resolveRuleSetV1(pack: unknown, ruleSetRef: string): CoreResult<RuleResolutionV1> {
  if (nonEmptyString(ruleSetRef) === null) {
    return invalidRuleResolution("ruleSetRef", "Rule resolution requires a non-empty ruleSetRef.") as CoreResult<RuleResolutionV1>;
  }

  const packValidation = validateRatioPackV1(pack);
  if (packValidation.status !== "ok" || packValidation.output === null) {
    return packValidation as unknown as CoreResult<RuleResolutionV1>;
  }

  const ratioPack = packValidation.output;
  const ruleSet = ratioPack.ruleSets.find((candidate) => candidate.id === ruleSetRef);
  if (ruleSet === undefined) {
    return missingRuleSet(ruleSetRef) as CoreResult<RuleResolutionV1>;
  }

  const resolvedRules: ResolvedRule[] = [];
  for (const ruleRef of ruleSet.ruleRefs) {
    const declaration = ratioPack.ruleDeclarations.find((candidate) => candidate.id === ruleRef);
    if (declaration === undefined) {
      return missingRuleDeclaration(ruleSet.id, ruleRef) as CoreResult<RuleResolutionV1>;
    }

    const resolvedRule = resolveRuleDeclaration(ratioPack, declaration);
    if (!resolvedRule.ok) {
      return resolvedRule.result as CoreResult<RuleResolutionV1>;
    }

    resolvedRules.push(resolvedRule.value);
  }

  if (resolvedRules.length === 0) {
    return invalidRuleResolution(`ruleSets.${ruleSet.id}`, `Rule set does not declare any resolvable rules: ${ruleSet.id}.`) as CoreResult<RuleResolutionV1>;
  }

  const packRef = ratioPackRef(ratioPack);
  const output: RuleResolutionV1 = {
    kind: "rule-resolution",
    schemaVersion: RULE_RESOLUTION_V1_SCHEMA_VERSION,
    ruleSetRef: ruleSet.id,
    packRef,
    contentIdentity: ratioPack.contentIdentity,
    ruleRefs: [...ruleSet.ruleRefs],
    rules: resolvedRules,
    constructionRefs: [],
    measurementRefs: [],
    artifactRefs: [],
    scoringRefs: [],
  };

  return createRuleResolutionResult({
    status: "ok",
    provenance: createRuleResolutionProvenance("core.rule-resolution-v1.resolve", [
      { kind: "ratio-pack", ref: packRef },
      { kind: "rule-set", ref: ruleSet.id },
    ]),
    outputRefs: [
      { kind: "ratio-pack", ref: packRef },
      { kind: "rule-set", ref: ruleSet.id },
      { kind: "rule-resolution", ref: `${packRef}:${ruleSet.id}` },
    ],
    packLockRef: { id: ratioPack.preLock.ref },
    output,
  });
}

export function validateRuleResolutionV1(value: unknown): CoreResult<RuleResolutionV1> {
  const validation = validateRuleResolutionValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<RuleResolutionV1>;
  }

  return createRuleResolutionResult({
    status: "ok",
    provenance: createRuleResolutionProvenance("core.rule-resolution-v1.validate", [
      { kind: "rule-resolution", ref: validation.value.ruleSetRef },
    ]),
    outputRefs: [{ kind: "rule-resolution", ref: validation.value.ruleSetRef }],
    output: validation.value,
  });
}

function resolveRuleDeclaration(
  pack: RatioPack,
  declaration: RuleDeclaration,
): RuleResolutionValidation<ResolvedRule> {
  if (declaration.type !== "surface.partition-line" || declaration.target !== "surface") {
    return failedRuleResolution(unsupportedRuleDeclaration(declaration.id, declaration.type, declaration.target));
  }

  const ratioRefs = resolveRatioRefs(pack, declaration);
  if (!ratioRefs.ok) {
    return ratioRefs;
  }

  const sequenceRefs = resolveSequenceRefs(pack, declaration);
  if (!sequenceRefs.ok) {
    return sequenceRefs;
  }

  const partitionPatternRefs = resolvePartitionPatternRefs(pack, declaration);
  if (!partitionPatternRefs.ok) {
    return partitionPatternRefs;
  }

  if (ratioRefs.value.length + sequenceRefs.value.length + partitionPatternRefs.value.length === 0) {
    return failedRuleResolution(invalidRuleResolution(
      `ruleDeclarations.${declaration.id}`,
      `Rule declaration has no resolvable ratio, sequence, or partition pattern references: ${declaration.id}.`,
    ));
  }

  return validRuleResolution({
    kind: "resolved-rule",
    ruleRef: declaration.id,
    type: "surface.partition-line",
    target: "surface",
    ratioRefs: ratioRefs.value,
    sequenceRefs: sequenceRefs.value,
    partitionPatternRefs: partitionPatternRefs.value,
    constructionRefs: [],
    measurementRefs: [],
  });
}

function resolveRatioRefs(pack: RatioPack, declaration: RuleDeclaration): RuleResolutionValidation<readonly ResolvedRatioRef[]> {
  const refs: ResolvedRatioRef[] = [];
  for (const ratioRef of declaration.ratioRefs ?? []) {
    const ratio = pack.ratios.find((candidate) => candidate.id === ratioRef);
    if (ratio === undefined) {
      return failedRuleResolution(invalidRuleResolution(`ruleDeclarations.${declaration.id}.ratioRefs`, `Rule declaration references an unresolved ratio: ${ratioRef}.`));
    }

    refs.push({
      kind: "resolved-ratio-ref",
      ratioRef: ratio.id,
      normalizedValue: ratio.normalizedValue,
      sourceRef: ratioSourceRef(pack, ratio),
    });
  }

  return validRuleResolution(refs);
}

function resolveSequenceRefs(
  pack: RatioPack,
  declaration: RuleDeclaration,
): RuleResolutionValidation<readonly ResolvedRatioSequenceRef[]> {
  const refs: ResolvedRatioSequenceRef[] = [];
  for (const sequenceRef of declaration.sequenceRefs ?? []) {
    const sequence = pack.ratioSequences.find((candidate) => candidate.id === sequenceRef);
    if (sequence === undefined) {
      return failedRuleResolution(invalidRuleResolution(`ruleDeclarations.${declaration.id}.sequenceRefs`, `Rule declaration references an unresolved ratio sequence: ${sequenceRef}.`));
    }

    refs.push({
      kind: "resolved-ratio-sequence-ref",
      sequenceRef: sequence.id,
      normalizedParts: [...sequence.normalizedParts],
      sourceRef: sequenceSourceRef(pack, sequence),
    });
  }

  return validRuleResolution(refs);
}

function resolvePartitionPatternRefs(
  pack: RatioPack,
  declaration: RuleDeclaration,
): RuleResolutionValidation<readonly ResolvedPartitionPatternRef[]> {
  const refs: ResolvedPartitionPatternRef[] = [];
  for (const partitionPatternRef of declaration.partitionPatternRefs ?? []) {
    const pattern = pack.partitionPatterns.find((candidate) => candidate.id === partitionPatternRef);
    if (pattern === undefined) {
      return failedRuleResolution(invalidRuleResolution(`ruleDeclarations.${declaration.id}.partitionPatternRefs`, `Rule declaration references an unresolved partition pattern: ${partitionPatternRef}.`));
    }

    refs.push({
      kind: "resolved-partition-pattern-ref",
      partitionPatternRef: pattern.id,
      ratioRefs: [...pattern.ratioRefs],
      ...(pattern.sequenceRef !== undefined ? { sequenceRef: pattern.sequenceRef } : {}),
      axis: pattern.axis,
      sourceRef: partitionPatternSourceRef(pack, pattern),
    });
  }

  return validRuleResolution(refs);
}

function validateRuleResolutionValue(value: unknown): RuleResolutionValidation<RuleResolutionV1> {
  if (!isRecord(value)) {
    return failedRuleResolution(invalidRuleResolution("ruleResolution", "Rule Resolution V1 input must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(value, RULE_RESOLUTION_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedRuleResolution(invalidRuleResolution(unsupportedField, `Rule Resolution V1 field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "rule-resolution" || value.schemaVersion !== RULE_RESOLUTION_V1_SCHEMA_VERSION) {
    return failedRuleResolution(invalidRuleResolution("schemaVersion", "Rule Resolution V1 kind and schemaVersion are required."));
  }

  if ([value.ruleSetRef, value.packRef, value.contentIdentity].some((item) => nonEmptyString(item) === null)) {
    return failedRuleResolution(invalidRuleResolution("ruleResolution", "Rule Resolution V1 requires ruleSetRef, packRef, and contentIdentity."));
  }

  if (!isStringArray(value.ruleRefs) || value.ruleRefs.length === 0) {
    return failedRuleResolution(invalidRuleResolution("ruleRefs", "Rule Resolution V1 requires non-empty ruleRefs."));
  }

  if (!Array.isArray(value.rules) || value.rules.length === 0) {
    return failedRuleResolution(invalidRuleResolution("rules", "Rule Resolution V1 requires non-empty resolved rules."));
  }

  const invalidRule = value.rules.find((rule) => !isResolvedRule(rule));
  if (invalidRule !== undefined) {
    return failedRuleResolution(invalidRuleResolution("rules", "Rule Resolution V1 resolved rules are invalid."));
  }

  if (![value.constructionRefs, value.measurementRefs, value.artifactRefs, value.scoringRefs].every(isEmptyArray)) {
    return failedRuleResolution(invalidRuleResolution("outputRefs", "Rule Resolution V1 output-changing refs must be visible arrays."));
  }

  return validRuleResolution(value as unknown as RuleResolutionV1);
}

function isResolvedRule(value: unknown): value is ResolvedRule {
  if (!isRecord(value)) {
    return false;
  }

  if (firstUnsupportedKey(value, RESOLVED_RULE_ALLOWED_KEYS) !== null) {
    return false;
  }

  const ratioRefs = value.ratioRefs;
  const sequenceRefs = value.sequenceRefs;
  const partitionPatternRefs = value.partitionPatternRefs;

  return [
    value.kind === "resolved-rule",
    nonEmptyString(value.ruleRef) !== null,
    value.type === "surface.partition-line",
    value.target === "surface",
    Array.isArray(ratioRefs) && ratioRefs.every(isResolvedRatioRef),
    Array.isArray(sequenceRefs) && sequenceRefs.every(isResolvedRatioSequenceRef),
    Array.isArray(partitionPatternRefs) && partitionPatternRefs.every(isResolvedPartitionPatternRef),
    isEmptyArray(value.constructionRefs),
    isEmptyArray(value.measurementRefs),
    Array.isArray(ratioRefs) &&
      Array.isArray(sequenceRefs) &&
      Array.isArray(partitionPatternRefs) &&
      ratioRefs.length + sequenceRefs.length + partitionPatternRefs.length > 0,
  ].every(Boolean);
}

function isResolvedRatioRef(value: unknown): value is ResolvedRatioRef {
  return isRecord(value)
    && firstUnsupportedKey(value, RESOLVED_RATIO_REF_ALLOWED_KEYS) === null
    && value.kind === "resolved-ratio-ref"
    && nonEmptyString(value.ratioRef) !== null
    && isFiniteNumber(value.normalizedValue)
    && isSourceReference(value.sourceRef);
}

function isResolvedRatioSequenceRef(value: unknown): value is ResolvedRatioSequenceRef {
  return isRecord(value)
    && firstUnsupportedKey(value, RESOLVED_RATIO_SEQUENCE_REF_ALLOWED_KEYS) === null
    && value.kind === "resolved-ratio-sequence-ref"
    && nonEmptyString(value.sequenceRef) !== null
    && isFiniteNumberArray(value.normalizedParts)
    && value.normalizedParts.length > 0
    && isSourceReference(value.sourceRef);
}

function isResolvedPartitionPatternRef(value: unknown): value is ResolvedPartitionPatternRef {
  return isRecord(value)
    && firstUnsupportedKey(value, RESOLVED_PARTITION_PATTERN_REF_ALLOWED_KEYS) === null
    && value.kind === "resolved-partition-pattern-ref"
    && nonEmptyString(value.partitionPatternRef) !== null
    && isStringArray(value.ratioRefs)
    && value.ratioRefs.length > 0
    && (value.sequenceRef === undefined || nonEmptyString(value.sequenceRef) !== null)
    && isPartitionAxis(value.axis)
    && isSourceReference(value.sourceRef);
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

function createRuleResolutionProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: RULE_RESOLUTION_OPERATION_VERSION,
    inputRefs,
    source: RULE_RESOLUTION_SOURCE_REFERENCE,
  };
}

function missingRuleSet(ruleSetRef: string): CoreResult {
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

function missingRuleDeclaration(ruleSetRef: string, ruleRef: string): CoreResult {
  return createRuleResolutionResult({
    status: "failed",
    errors: [
      createRuleResolutionError({
        code: "MissingRuleDeclaration",
        message: `Rule set references an absent rule declaration: ${ruleRef}.`,
        targetRef: `ruleSets.${ruleSetRef}.ruleRefs`,
        sourceRef: { kind: "rule-declaration", ref: ruleRef },
      }),
    ],
  });
}

function invalidRuleResolution(targetRef: string, message: string): CoreResult {
  return createRuleResolutionResult({
    status: "failed",
    errors: [
      createRuleResolutionError({
        code: "InvalidRuleResolutionV1",
        message,
        targetRef,
      }),
    ],
  });
}

function unsupportedRuleDeclaration(ruleRef: string, ruleType: string, ruleTarget: string): CoreResult {
  return createRuleResolutionResult({
    status: "failed",
    errors: [
      createRuleResolutionError({
        code: "UnsupportedRuleDeclaration",
        message: `Rule declaration is outside Rule Resolution V1: ${ruleType} targeting ${ruleTarget}.`,
        targetRef: `ruleDeclarations.${ruleRef}.type`,
        sourceRef: { kind: "rule-declaration", ref: ruleRef },
      }),
    ],
  });
}

function validRuleResolution<TValue>(value: TValue): RuleResolutionValidation<TValue> {
  return { ok: true, value };
}

function failedRuleResolution(result: CoreResult): RuleResolutionValidation<never> {
  return { ok: false, result };
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function ratioSourceRef(pack: RatioPack, ratio: Ratio): SourceReference {
  return { kind: "ratio", ref: `${ratioPackRef(pack)}:ratios.${ratio.id}` };
}

function sequenceSourceRef(pack: RatioPack, sequence: RatioSequence): SourceReference {
  return { kind: "ratio-sequence", ref: `${ratioPackRef(pack)}:ratioSequences.${sequence.id}` };
}

function partitionPatternSourceRef(pack: RatioPack, pattern: PartitionPattern): SourceReference {
  return { kind: "partition-pattern", ref: `${ratioPackRef(pack)}:partitionPatterns.${pattern.id}` };
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function firstUnsupportedKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function isEmptyArray(value: unknown): value is readonly never[] {
  return Array.isArray(value) && value.length === 0;
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && firstUnsupportedKey(value, SOURCE_REFERENCE_ALLOWED_KEYS) === null
    && nonEmptyString(value.kind) !== null
    && nonEmptyString(value.ref) !== null;
}

function isPartitionAxis(value: unknown): value is PartitionPattern["axis"] {
  return value === "horizontal" || value === "vertical" || value === "both";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
