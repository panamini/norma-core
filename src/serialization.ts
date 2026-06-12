import type {
  CoreError,
  CoreWarning,
  Diagnostic,
  OutputRefs,
  SourceReference,
} from "./index.js";

export type StableTimestampPolicy = "preserve" | "omit" | "normalize";

export interface StableSerializationPolicy {
  readonly version?: string;
  readonly objectKeys?: "lexicographic";
  readonly arrays?: "semantic-order";
  readonly undefinedValues?: "omit";
  readonly timestampPolicy?: StableTimestampPolicy;
  readonly timestampFields?: readonly string[];
  readonly normalizedTimestamp?: string;
}

interface EffectiveSerializationPolicy {
  readonly version: string;
  readonly objectKeys: "lexicographic";
  readonly arrays: "semantic-order";
  readonly undefinedValues: "omit";
  readonly timestampPolicy: StableTimestampPolicy;
  readonly timestampFields: readonly string[];
  readonly normalizedTimestamp: string;
}

type CanonicalScalarResult =
  | { readonly handled: true; readonly value: unknown }
  | { readonly handled: false };

type CanonicalFieldResult =
  | { readonly include: true; readonly value: unknown }
  | { readonly include: false };

type DiagnosticComparator = (first: Diagnostic, second: Diagnostic) => number;

export const STABLE_SERIALIZATION_VERSION = "stable-serialization-v1" as const;

export const STABLE_SERIALIZATION_POLICY = Object.freeze({
  version: STABLE_SERIALIZATION_VERSION,
  objectKeys: "lexicographic",
  arrays: "semantic-order",
  undefinedValues: "omit",
  timestampPolicy: "preserve",
  timestampFields: Object.freeze([
    "createdAt",
    "updatedAt",
    "deletedAt",
    "generatedAt",
    "timestamp",
    "timestamps",
  ]),
}) satisfies StableSerializationPolicy;

export const DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY = Object.freeze({
  ...STABLE_SERIALIZATION_POLICY,
  timestampPolicy: "omit",
}) satisfies StableSerializationPolicy;

const OUTPUT_REF_KIND_RANK = new Map<string, number>([
  ["construction", 0],
  ["measurement-set", 1],
  ["measurement", 1],
  ["evaluation", 2],
  ["comparison", 3],
  ["decision", 4],
  ["artifact", 5],
  ["artifacts", 5],
]);

const DIAGNOSTIC_SEVERITY_RANK = new Map<string, number>([
  ["fatal", 0],
  ["error", 1],
  ["critical", 2],
  ["warning", 3],
  ["info", 4],
]);

const SCALAR_CANONICALIZERS = [
  canonicalizeNull,
  canonicalizeStringOrBoolean,
  canonicalizeNumber,
  rejectBigInt,
  canonicalizeOmittedValue,
] as const;

const DIAGNOSTIC_COMPARATORS: readonly DiagnosticComparator[] = Object.freeze([
  (first, second) => severityRank(first.severity) - severityRank(second.severity),
  (first, second) => booleanRank(first.blocking) - booleanRank(second.blocking),
  (first, second) => compareStrings(first.code, second.code),
  (first, second) => compareNullableStrings(first.targetRef, second.targetRef),
  (first, second) => compareStrings(refKey(first.source), refKey(second.source)),
  (first, second) => compareStrings(provenanceKey(first.provenance), provenanceKey(second.provenance)),
  (first, second) => compareStrings(first.message, second.message),
]);

export function serializeCanonicalJson(
  value: unknown,
  policy: StableSerializationPolicy = STABLE_SERIALIZATION_POLICY,
): string {
  return JSON.stringify(canonicalizeForSerialization(value, policy));
}

export function canonicalizeForSerialization(
  value: unknown,
  policy: StableSerializationPolicy = STABLE_SERIALIZATION_POLICY,
): unknown {
  return canonicalizeValue(value, effectivePolicy(policy), new WeakSet<object>());
}

export function canonicalizeRefs(refs: readonly SourceReference[]): readonly SourceReference[] {
  return uniqueRefs(refs).sort(compareRefs);
}

export function canonicalizeOutputRefs(value: readonly SourceReference[] | OutputRefs): OutputRefs {
  const refs = isOutputRefs(value) ? value.refs : value;
  return {
    kind: "output-refs",
    refs: uniqueRefs(refs).sort(compareOutputRefs),
  };
}

export function canonicalizeDiagnostics<TDiagnostic extends Diagnostic>(
  diagnostics: readonly TDiagnostic[],
): readonly TDiagnostic[] {
  return diagnostics
    .map((diagnostic) => canonicalizeForSerialization(diagnostic) as TDiagnostic)
    .sort(compareDiagnostics);
}

export function canonicalizeWarnings(warnings: readonly CoreWarning[]): readonly CoreWarning[] {
  return canonicalizeDiagnostics(warnings);
}

export function canonicalizeErrors(errors: readonly CoreError[]): readonly CoreError[] {
  return canonicalizeDiagnostics(errors);
}

function canonicalizeValue(value: unknown, policy: EffectiveSerializationPolicy, seen: WeakSet<object>): unknown {
  const scalar = canonicalizeScalar(value);
  if (scalar.handled) {
    return scalar.value;
  }
  if (value instanceof Date) {
    return canonicalizeDate(value);
  }
  if (Array.isArray(value)) {
    return canonicalizeArray(value, policy, seen);
  }

  return canonicalizeRecord(value, policy, seen);
}

function canonicalizeRecord(value: unknown, policy: EffectiveSerializationPolicy, seen: WeakSet<object>): unknown {
  const record = recordValue(value);
  if (record === null) {
    return undefined;
  }

  if (seen.has(record)) {
    throw new TypeError("Stable serialization does not support circular object graphs.");
  }

  seen.add(record);
  const canonicalRecord = canonicalizeRecordFields(record, policy, seen);
  seen.delete(record);

  return canonicalRecord;
}

function canonicalizeRecordFields(
  record: Readonly<Record<string, unknown>>,
  policy: EffectiveSerializationPolicy,
  seen: WeakSet<object>,
): Record<string, unknown> {
  const canonicalRecord: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort(compareStrings)) {
    const field = canonicalizeRecordField(key, record[key], policy, seen);
    if (field.include) {
      canonicalRecord[key] = field.value;
    }
  }
  return canonicalRecord;
}

function effectivePolicy(policy: StableSerializationPolicy): EffectiveSerializationPolicy {
  return {
    version: policyValue(policy.version, STABLE_SERIALIZATION_POLICY.version),
    objectKeys: policyValue(policy.objectKeys, STABLE_SERIALIZATION_POLICY.objectKeys),
    arrays: policyValue(policy.arrays, STABLE_SERIALIZATION_POLICY.arrays),
    undefinedValues: policyValue(policy.undefinedValues, STABLE_SERIALIZATION_POLICY.undefinedValues),
    timestampPolicy: policyValue(policy.timestampPolicy, STABLE_SERIALIZATION_POLICY.timestampPolicy),
    timestampFields: policyValue(policy.timestampFields, STABLE_SERIALIZATION_POLICY.timestampFields),
    normalizedTimestamp: policyValue(policy.normalizedTimestamp, "normalized-timestamp"),
  };
}

function uniqueRefs(refs: readonly SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  const unique: SourceReference[] = [];
  for (const ref of refs) {
    const key = refKey(ref);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ kind: ref.kind, ref: ref.ref });
    }
  }
  return unique;
}

function compareRefs(first: SourceReference, second: SourceReference): number {
  return compareStrings(first.ref, second.ref) || compareStrings(first.kind, second.kind);
}

function compareOutputRefs(first: SourceReference, second: SourceReference): number {
  return outputRefKindRank(first.kind) - outputRefKindRank(second.kind)
    || compareStrings(first.kind, second.kind)
    || compareStrings(first.ref, second.ref);
}

function compareDiagnostics(first: Diagnostic, second: Diagnostic): number {
  return compareBy(first, second, DIAGNOSTIC_COMPARATORS);
}

function isTimestampField(key: string, policy: EffectiveSerializationPolicy): boolean {
  return policy.timestampPolicy !== "preserve" && policy.timestampFields.includes(key);
}

function canonicalizeRecordField(
  key: string,
  value: unknown,
  policy: EffectiveSerializationPolicy,
  seen: WeakSet<object>,
): CanonicalFieldResult {
  const timestamp = canonicalizeTimestampField(key, policy);
  if (timestamp.include || isTimestampField(key, policy)) {
    return timestamp;
  }

  const canonicalField = canonicalizeValue(value, policy, seen);
  return canonicalField === undefined
    ? { include: false }
    : { include: true, value: canonicalField };
}

function canonicalizeTimestampField(key: string, policy: EffectiveSerializationPolicy): CanonicalFieldResult {
  if (!isTimestampField(key, policy)) {
    return { include: false };
  }
  if (policy.timestampPolicy === "omit") {
    return { include: false };
  }
  return { include: true, value: policy.normalizedTimestamp };
}

function outputRefKindRank(kind: string): number {
  return OUTPUT_REF_KIND_RANK.get(kind) ?? 100;
}

function isOutputRefs(value: readonly SourceReference[] | OutputRefs): value is OutputRefs {
  return isNonArrayRecord(value) && "kind" in value && value.kind === "output-refs";
}

function severityRank(severity: string): number {
  return DIAGNOSTIC_SEVERITY_RANK.get(severity) ?? 100;
}

function booleanRank(value: boolean): number {
  return value ? 0 : 1;
}

function refKey(ref: SourceReference): string {
  return `${ref.kind}:${ref.ref}`;
}

function provenanceKey(provenance: Diagnostic["provenance"]): string {
  return provenance === null ? "" : serializeCanonicalJson(provenance);
}

function compareNullableStrings(first: string | null, second: string | null): number {
  return compareStrings(first ?? "", second ?? "");
}

function canonicalizeScalar(value: unknown): CanonicalScalarResult {
  for (const canonicalizer of SCALAR_CANONICALIZERS) {
    const result = canonicalizer(value);
    if (result.handled) {
      return result;
    }
  }

  return { handled: false };
}

function canonicalizeNull(value: unknown): CanonicalScalarResult {
  return value === null ? { handled: true, value } : { handled: false };
}

function canonicalizeStringOrBoolean(value: unknown): CanonicalScalarResult {
  return typeof value === "string" || typeof value === "boolean"
    ? { handled: true, value }
    : { handled: false };
}

function canonicalizeNumber(value: unknown): CanonicalScalarResult {
  if (typeof value !== "number") {
    return { handled: false };
  }
  if (!Number.isFinite(value)) {
    throw new TypeError("Stable serialization only supports finite numbers.");
  }
  return { handled: true, value };
}

function rejectBigInt(value: unknown): CanonicalScalarResult {
  if (typeof value === "bigint") {
    throw new TypeError("Stable serialization does not support bigint values.");
  }
  return { handled: false };
}

function canonicalizeOmittedValue(value: unknown): CanonicalScalarResult {
  return value === undefined || typeof value === "function" || typeof value === "symbol"
    ? { handled: true, value: undefined }
    : { handled: false };
}

function canonicalizeDate(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new TypeError("Stable serialization does not support invalid Date values.");
  }
  return value.toISOString();
}

function canonicalizeArray(
  value: readonly unknown[],
  policy: EffectiveSerializationPolicy,
  seen: WeakSet<object>,
): readonly unknown[] {
  return value.map((item) => {
    const canonicalItem = canonicalizeValue(item, policy, seen);
    return canonicalItem === undefined ? null : canonicalItem;
  });
}

function compareBy<TValue>(
  first: TValue,
  second: TValue,
  comparators: readonly ((first: TValue, second: TValue) => number)[],
): number {
  for (const comparator of comparators) {
    const compared = comparator(first, second);
    if (compared !== 0) {
      return compared;
    }
  }
  return 0;
}

function policyValue<TValue>(value: TValue | undefined, fallback: TValue): TValue {
  return value === undefined ? fallback : value;
}

function isNonArrayRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return isNonArrayRecord(value) ? value : null;
}

function compareStrings(first: string, second: string): number {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}
