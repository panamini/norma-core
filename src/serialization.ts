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
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Stable serialization only supports finite numbers.");
    }
    return value;
  }

  if (typeof value === "bigint") {
    throw new TypeError("Stable serialization does not support bigint values.");
  }

  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError("Stable serialization does not support invalid Date values.");
    }
    const timestamp = value.toISOString();
    return timestamp;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const canonicalItem = canonicalizeValue(item, policy, seen);
      return canonicalItem === undefined ? null : canonicalItem;
    });
  }

  if (typeof value !== "object") {
    return undefined;
  }

  if (seen.has(value)) {
    throw new TypeError("Stable serialization does not support circular object graphs.");
  }

  seen.add(value);
  const record = value as Record<string, unknown>;
  const canonicalRecord: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort(compareStrings)) {
    if (isTimestampField(key, policy)) {
      if (policy.timestampPolicy === "omit") {
        continue;
      }
      if (policy.timestampPolicy === "normalize") {
        canonicalRecord[key] = policy.normalizedTimestamp;
        continue;
      }
    }

    const canonicalField = canonicalizeValue(record[key], policy, seen);
    if (canonicalField !== undefined) {
      canonicalRecord[key] = canonicalField;
    }
  }
  seen.delete(value);

  return canonicalRecord;
}

function effectivePolicy(policy: StableSerializationPolicy): EffectiveSerializationPolicy {
  return {
    version: policy.version ?? STABLE_SERIALIZATION_POLICY.version,
    objectKeys: policy.objectKeys ?? STABLE_SERIALIZATION_POLICY.objectKeys,
    arrays: policy.arrays ?? STABLE_SERIALIZATION_POLICY.arrays,
    undefinedValues: policy.undefinedValues ?? STABLE_SERIALIZATION_POLICY.undefinedValues,
    timestampPolicy: policy.timestampPolicy ?? STABLE_SERIALIZATION_POLICY.timestampPolicy,
    timestampFields: policy.timestampFields ?? STABLE_SERIALIZATION_POLICY.timestampFields,
    normalizedTimestamp: policy.normalizedTimestamp ?? "normalized-timestamp",
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
  return severityRank(first.severity) - severityRank(second.severity)
    || booleanRank(first.blocking) - booleanRank(second.blocking)
    || compareStrings(first.code, second.code)
    || compareNullableStrings(first.targetRef, second.targetRef)
    || compareStrings(refKey(first.source), refKey(second.source))
    || compareStrings(provenanceKey(first.provenance), provenanceKey(second.provenance))
    || compareStrings(first.message, second.message);
}

function isTimestampField(key: string, policy: EffectiveSerializationPolicy): boolean {
  return policy.timestampPolicy !== "preserve" && policy.timestampFields.includes(key);
}

function outputRefKindRank(kind: string): number {
  return OUTPUT_REF_KIND_RANK.get(kind) ?? 100;
}

function isOutputRefs(value: readonly SourceReference[] | OutputRefs): value is OutputRefs {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && "kind" in value
    && value.kind === "output-refs";
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

function compareStrings(first: string, second: string): number {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}
