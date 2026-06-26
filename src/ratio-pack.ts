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
  RuleDeclaration,
  RuleSet,
} from "./rules.js";

export const RATIO_PACK_V1_SCHEMA_VERSION = "ratio-pack-v1" as const;
export const BASIC_PROPORTIONS_PACK_ID = "norma.basic-proportions" as const;
export const BASIC_PROPORTIONS_PACK_VERSION = "0.1.0" as const;
export const BASIC_PROPORTIONS_PACK_CONTENT_IDENTITY =
  "norma.basic-proportions@0.1.0:ratio-pack-v1:mvp-rule-resolution" as const;
export const SURFACE_BASIC_THIRD_GRID_RULE_SET_ID = "surface-basic-third-grid" as const;
export const GEOMETRY_HARMONIES_PACK_ID = "norma.geometry-harmonies" as const;
export const GEOMETRY_HARMONIES_PACK_VERSION = "0.1.0" as const;
export const GEOMETRY_HARMONIES_PACK_CONTENT_IDENTITY =
  "norma.geometry-harmonies@0.1.0:ratio-pack-v1:golden-section" as const;
export const SURFACE_GOLDEN_SECTION_RULE_SET_ID = "surface-golden-section" as const;

export type RatioPackSchemaVersion = typeof RATIO_PACK_V1_SCHEMA_VERSION;
export type RatioPackIdentityRef = string;
export type RatioPackContentIdentity = string;

export interface RatioPackIdentity {
  kind: "ratio-pack-identity";
  id: RatioPackIdentityRef;
  concept: string;
}

export interface Ratio {
  kind: "ratio";
  id: string;
  numerator: number;
  denominator: number;
  normalizedValue: number;
  familyRef?: string;
}

export interface RatioFamily {
  kind: "ratio-family";
  id: string;
  ratioRefs: readonly string[];
  scope: "surface-partition";
}

export interface RatioSequence {
  kind: "ratio-sequence";
  id: string;
  parts: readonly number[];
  normalizedParts: readonly number[];
}

export interface PartitionPattern {
  kind: "partition-pattern";
  id: string;
  ratioRefs: readonly string[];
  sequenceRef?: string;
  axis: "horizontal" | "vertical" | "both";
  declarationOnly: true;
}

export interface RatioPackMetadata {
  name: string;
  description: string;
  owner: string;
}

export interface RatioPackProvenance {
  kind: "ratio-pack-provenance";
  source: "mathematical" | "norma-basic";
  sourceRefs: readonly SourceReference[];
}

export interface RatioPackCompatibility {
  schemaVersion: RatioPackSchemaVersion;
  coreVersionRange: string;
}

export interface RatioPackLimits {
  noBeautyClaims: true;
  noIntentInference: true;
  noUiPreset: true;
}

export interface RatioPackPreLock {
  kind: "pack-lock-prelock";
  ref: string;
  packId: string;
  packVersion: string;
  schemaVersion: RatioPackSchemaVersion;
  contentIdentity: RatioPackContentIdentity;
  final: false;
}

export interface RatioPack {
  kind: "ratio-pack";
  id: string;
  version: string;
  schemaVersion: RatioPackSchemaVersion;
  identity: RatioPackIdentity;
  contentIdentity: RatioPackContentIdentity;
  metadata: RatioPackMetadata;
  provenance: RatioPackProvenance;
  compatibility: RatioPackCompatibility;
  limits: RatioPackLimits;
  conventions: readonly string[];
  ratios: readonly Ratio[];
  ratioFamilies: readonly RatioFamily[];
  ratioSequences: readonly RatioSequence[];
  partitionPatterns: readonly PartitionPattern[];
  ruleDeclarations: readonly RuleDeclaration[];
  ruleSets: readonly RuleSet[];
  preLock: RatioPackPreLock;
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

type RatioPackValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult;
    };

interface RuleDeclarationRefs {
  ratioRefs: readonly string[];
  sequenceRefs: readonly string[];
  partitionPatternRefs: readonly string[];
}

type RuleDeclarationGuardrailCheck = (
  declaration: Record<string, unknown>,
  declarationId: string,
) => CoreResult | null;

const RATIO_PACK_MODEL_OPERATION_VERSION = "0.1.0";

const RATIO_PACK_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/ratio-pack-v1",
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

const UNSUPPORTED_RATIO_PACK_CLAIMS = [
  "aesthetic score",
  "beauty score",
  "better composition",
  "creative recommendation",
  "intended design",
  "more beautiful",
  "plus beau",
  "rend beau",
  "ui preset",
  "ui style",
  "rendering preset",
] as const;

const UNSUPPORTED_RATIO_PACK_FIELDS = [
  "camera",
  "image",
  "plugin",
  "render",
  "rendering",
  "renderer",
  "style",
  "styles",
  "theme",
  "ui",
] as const;

const EXECUTABLE_RULE_DECLARATION_FIELDS = [
  "algorithm",
  "clientCode",
  "code",
  "execute",
  "function",
  "handler",
  "implementation",
  "sourceCode",
] as const;

const AGENT_CREATED_RULE_SOURCES = [
  "adapter",
  "agent",
  "interface",
  "prompt",
] as const;

const RULE_DECLARATION_GUARDRAIL_CHECKS = [
  executableRuleDeclarationFailure,
  agentCreatedRuleFailure,
  missingRuleTypeFailure,
  missingRequiredRatioFailure,
  missingCoreSupportFailure,
  invalidRuleRefFieldsFailure,
] as const satisfies readonly RuleDeclarationGuardrailCheck[];

export const BASIC_PROPORTIONS_PACK: RatioPack = Object.freeze({
  kind: "ratio-pack",
  id: BASIC_PROPORTIONS_PACK_ID,
  version: BASIC_PROPORTIONS_PACK_VERSION,
  schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
  identity: Object.freeze({
    kind: "ratio-pack-identity",
    id: BASIC_PROPORTIONS_PACK_ID,
    concept: "Basic proportional partitions",
  }),
  contentIdentity: BASIC_PROPORTIONS_PACK_CONTENT_IDENTITY,
  metadata: Object.freeze({
    name: "Norma Basic Proportions",
    description: "Minimal declarative proportions pack for halves and thirds.",
    owner: "norma-core",
  }),
  provenance: Object.freeze({
    kind: "ratio-pack-provenance",
    source: "norma-basic",
    sourceRefs: Object.freeze([{ kind: "spec", ref: "PR4 Minimal ratio pack model" }]),
  }),
  compatibility: Object.freeze({
    schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
    coreVersionRange: "0.1.0-pr5",
  }),
  limits: Object.freeze({
    noBeautyClaims: true,
    noIntentInference: true,
    noUiPreset: true,
  }),
  conventions: Object.freeze(["ratio-pack-v1", "declarative-rules-only"]),
  ratios: Object.freeze([
    Object.freeze({ kind: "ratio", id: "1/2", numerator: 1, denominator: 2, normalizedValue: 1 / 2, familyRef: "halves" }),
    Object.freeze({ kind: "ratio", id: "1/3", numerator: 1, denominator: 3, normalizedValue: 1 / 3, familyRef: "thirds" }),
    Object.freeze({ kind: "ratio", id: "2/3", numerator: 2, denominator: 3, normalizedValue: 2 / 3, familyRef: "thirds" }),
  ]),
  ratioFamilies: Object.freeze([
    Object.freeze({ kind: "ratio-family", id: "halves", ratioRefs: Object.freeze(["1/2"]), scope: "surface-partition" }),
    Object.freeze({ kind: "ratio-family", id: "thirds", ratioRefs: Object.freeze(["1/3", "2/3"]), scope: "surface-partition" }),
  ]),
  ratioSequences: Object.freeze([
    Object.freeze({
      kind: "ratio-sequence",
      id: "1:1:1",
      parts: Object.freeze([1, 1, 1]),
      normalizedParts: Object.freeze([1 / 3, 1 / 3, 1 / 3]),
    }),
  ]),
  partitionPatterns: Object.freeze([
    Object.freeze({
      kind: "partition-pattern",
      id: "halves",
      ratioRefs: Object.freeze(["1/2"]),
      axis: "both",
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "partition-pattern",
      id: "thirds",
      ratioRefs: Object.freeze(["1/3", "2/3"]),
      sequenceRef: "1:1:1",
      axis: "both",
      declarationOnly: true,
    }),
  ]),
  ruleDeclarations: Object.freeze([
    Object.freeze({
      kind: "rule-declaration",
      id: "verticalThirds",
      type: "divideSurfaceVertical",
      target: "surface",
      ratioRefs: Object.freeze(["1/3", "2/3"]),
      sequenceRefs: Object.freeze(["1:1:1"]),
      partitionPatternRefs: Object.freeze(["thirds"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "horizontalThirds",
      type: "divideSurfaceHorizontal",
      target: "surface",
      ratioRefs: Object.freeze(["1/3", "2/3"]),
      sequenceRefs: Object.freeze(["1:1:1"]),
      partitionPatternRefs: Object.freeze(["thirds"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "centerAxes",
      type: "createGuidesFromCandidates",
      target: "surface",
      ratioRefs: Object.freeze(["1/2"]),
      partitionPatternRefs: Object.freeze(["halves"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "thirdGrid",
      type: "createSimpleGrid",
      target: "surface",
      ratioRefs: Object.freeze(["1/3", "2/3"]),
      sequenceRefs: Object.freeze(["1:1:1"]),
      partitionPatternRefs: Object.freeze(["thirds"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "surfaceDiagonals",
      type: "createDiagonals",
      target: "surface",
      ratioRefs: Object.freeze(["1/2"]),
      partitionPatternRefs: Object.freeze(["halves"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "deriveIntersections",
      type: "deriveIntersections",
      target: "surface",
      ratioRefs: Object.freeze(["1/2", "1/3", "2/3"]),
      sequenceRefs: Object.freeze(["1:1:1"]),
      partitionPatternRefs: Object.freeze(["halves", "thirds"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
  ]),
  ruleSets: Object.freeze([
    Object.freeze({
      kind: "rule-set",
      id: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
      ruleRefs: Object.freeze([
        "verticalThirds",
        "horizontalThirds",
        "centerAxes",
        "thirdGrid",
        "surfaceDiagonals",
        "deriveIntersections",
      ]),
      declarationOnly: true,
    }),
  ]),
  preLock: Object.freeze({
    kind: "pack-lock-prelock",
    ref: `prelock:${BASIC_PROPORTIONS_PACK_ID}@${BASIC_PROPORTIONS_PACK_VERSION}`,
    packId: BASIC_PROPORTIONS_PACK_ID,
    packVersion: BASIC_PROPORTIONS_PACK_VERSION,
    schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
    contentIdentity: BASIC_PROPORTIONS_PACK_CONTENT_IDENTITY,
    final: false,
  }),
});

const GEOMETRY_HARMONIES_PHI = (1 + Math.sqrt(5)) / 2;
const GEOMETRY_HARMONIES_PHI_MINOR = 1 / (GEOMETRY_HARMONIES_PHI + 1);
const GEOMETRY_HARMONIES_PHI_MAJOR = GEOMETRY_HARMONIES_PHI / (GEOMETRY_HARMONIES_PHI + 1);

export const GEOMETRY_HARMONIES_PACK: RatioPack = Object.freeze({
  kind: "ratio-pack",
  id: GEOMETRY_HARMONIES_PACK_ID,
  version: GEOMETRY_HARMONIES_PACK_VERSION,
  schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
  identity: Object.freeze({
    kind: "ratio-pack-identity",
    id: GEOMETRY_HARMONIES_PACK_ID,
    concept: "Declared mathematical ratio systems",
  }),
  contentIdentity: GEOMETRY_HARMONIES_PACK_CONTENT_IDENTITY,
  metadata: Object.freeze({
    name: "Norma Geometry Harmonies",
    description: "Declared mathematical ratios for deterministic structured examples.",
    owner: "norma-core",
  }),
  provenance: Object.freeze({
    kind: "ratio-pack-provenance",
    source: "mathematical",
    sourceRefs: Object.freeze([{ kind: "mathematical-ratio", ref: "golden-section" }]),
  }),
  compatibility: Object.freeze({
    schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
    coreVersionRange: "0.1.0-pr5",
  }),
  limits: Object.freeze({
    noBeautyClaims: true,
    noIntentInference: true,
    noUiPreset: true,
  }),
  conventions: Object.freeze(["ratio-pack-v1", "declarative-rules-only"]),
  ratios: Object.freeze([
    Object.freeze({
      kind: "ratio",
      id: "phi-minor",
      numerator: 1,
      denominator: GEOMETRY_HARMONIES_PHI + 1,
      normalizedValue: GEOMETRY_HARMONIES_PHI_MINOR,
      familyRef: "golden-section",
    }),
    Object.freeze({
      kind: "ratio",
      id: "phi-major",
      numerator: GEOMETRY_HARMONIES_PHI,
      denominator: GEOMETRY_HARMONIES_PHI + 1,
      normalizedValue: GEOMETRY_HARMONIES_PHI_MAJOR,
      familyRef: "golden-section",
    }),
    Object.freeze({ kind: "ratio", id: "1/2", numerator: 1, denominator: 2, normalizedValue: 1 / 2, familyRef: "halves" }),
  ]),
  ratioFamilies: Object.freeze([
    Object.freeze({ kind: "ratio-family", id: "golden-section", ratioRefs: Object.freeze(["phi-minor", "phi-major"]), scope: "surface-partition" }),
    Object.freeze({ kind: "ratio-family", id: "halves", ratioRefs: Object.freeze(["1/2"]), scope: "surface-partition" }),
  ]),
  ratioSequences: Object.freeze([
    Object.freeze({
      kind: "ratio-sequence",
      id: "phi:1",
      parts: Object.freeze([GEOMETRY_HARMONIES_PHI, 1]),
      normalizedParts: Object.freeze([GEOMETRY_HARMONIES_PHI_MAJOR, GEOMETRY_HARMONIES_PHI_MINOR]),
    }),
  ]),
  partitionPatterns: Object.freeze([
    Object.freeze({
      kind: "partition-pattern",
      id: "golden-section",
      ratioRefs: Object.freeze(["phi-minor", "phi-major"]),
      sequenceRef: "phi:1",
      axis: "both",
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "partition-pattern",
      id: "halves",
      ratioRefs: Object.freeze(["1/2"]),
      axis: "both",
      declarationOnly: true,
    }),
  ]),
  ruleDeclarations: Object.freeze([
    Object.freeze({
      kind: "rule-declaration",
      id: "verticalGoldenSection",
      type: "divideSurfaceVertical",
      target: "surface",
      ratioRefs: Object.freeze(["phi-major"]),
      sequenceRefs: Object.freeze(["phi:1"]),
      partitionPatternRefs: Object.freeze(["golden-section"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "horizontalGoldenSection",
      type: "divideSurfaceHorizontal",
      target: "surface",
      ratioRefs: Object.freeze(["phi-major"]),
      sequenceRefs: Object.freeze(["phi:1"]),
      partitionPatternRefs: Object.freeze(["golden-section"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "goldenSectionAxes",
      type: "createGuidesFromCandidates",
      target: "surface",
      ratioRefs: Object.freeze(["phi-minor", "phi-major", "1/2"]),
      partitionPatternRefs: Object.freeze(["golden-section", "halves"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "goldenSectionGrid",
      type: "createSimpleGrid",
      target: "surface",
      ratioRefs: Object.freeze(["phi-major"]),
      sequenceRefs: Object.freeze(["phi:1"]),
      partitionPatternRefs: Object.freeze(["golden-section"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "goldenSectionDiagonals",
      type: "createDiagonals",
      target: "surface",
      ratioRefs: Object.freeze(["1/2"]),
      partitionPatternRefs: Object.freeze(["halves"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
    Object.freeze({
      kind: "rule-declaration",
      id: "goldenSectionIntersections",
      type: "deriveIntersections",
      target: "surface",
      ratioRefs: Object.freeze(["phi-minor", "phi-major", "1/2"]),
      sequenceRefs: Object.freeze(["phi:1"]),
      partitionPatternRefs: Object.freeze(["golden-section", "halves"]),
      requiresCoreSupport: true,
      declarationOnly: true,
    }),
  ]),
  ruleSets: Object.freeze([
    Object.freeze({
      kind: "rule-set",
      id: SURFACE_GOLDEN_SECTION_RULE_SET_ID,
      ruleRefs: Object.freeze([
        "verticalGoldenSection",
        "horizontalGoldenSection",
        "goldenSectionAxes",
        "goldenSectionGrid",
        "goldenSectionDiagonals",
        "goldenSectionIntersections",
      ]),
      declarationOnly: true,
    }),
  ]),
  preLock: Object.freeze({
    kind: "pack-lock-prelock",
    ref: `prelock:${GEOMETRY_HARMONIES_PACK_ID}@${GEOMETRY_HARMONIES_PACK_VERSION}`,
    packId: GEOMETRY_HARMONIES_PACK_ID,
    packVersion: GEOMETRY_HARMONIES_PACK_VERSION,
    schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
    contentIdentity: GEOMETRY_HARMONIES_PACK_CONTENT_IDENTITY,
    final: false,
  }),
});

export function validateRatioPackV1(pack: unknown): CoreResult<RatioPack> {
  const validation = validateRatioPackValue(pack);
  if (!validation.ok) {
    return validation.result as CoreResult<RatioPack>;
  }

  return ratioPackOk(validation.value, "core.ratio-pack-v1.validate", validation.value);
}

export function readRatioFromPack(pack: unknown, ratioId: string): CoreResult<Ratio> {
  const validation = validateRatioPackValue(pack);
  if (!validation.ok) {
    return validation.result as CoreResult<Ratio>;
  }

  const ratio = validation.value.ratios.find((candidate) => candidate.id === ratioId);
  if (ratio === undefined) {
    return missingRatioReference(`ratios.${ratioId}`, `Ratio is not declared in the ratio pack: ${ratioId}.`) as CoreResult<Ratio>;
  }

  return ratioPackOk(ratio, "core.ratio-pack-v1.ratio.read", validation.value);
}

export function readRatioSequenceFromPack(pack: unknown, sequenceId: string): CoreResult<RatioSequence> {
  const validation = validateRatioPackValue(pack);
  if (!validation.ok) {
    return validation.result as CoreResult<RatioSequence>;
  }

  const sequence = validation.value.ratioSequences.find((candidate) => candidate.id === sequenceId);
  if (sequence === undefined) {
    return missingRatioReference(`ratioSequences.${sequenceId}`, `Ratio sequence is not declared in the ratio pack: ${sequenceId}.`) as CoreResult<RatioSequence>;
  }

  return ratioPackOk(sequence, "core.ratio-pack-v1.sequence.read", validation.value);
}

export function readPartitionPatternFromPack(pack: unknown, patternId: string): CoreResult<PartitionPattern> {
  const validation = validateRatioPackValue(pack);
  if (!validation.ok) {
    return validation.result as CoreResult<PartitionPattern>;
  }

  const pattern = validation.value.partitionPatterns.find((candidate) => candidate.id === patternId);
  if (pattern === undefined) {
    return missingRatioReference(`partitionPatterns.${patternId}`, `Partition pattern is not declared in the ratio pack: ${patternId}.`) as CoreResult<PartitionPattern>;
  }

  return ratioPackOk(pattern, "core.ratio-pack-v1.partition-pattern.read", validation.value);
}

export function readRuleSetFromPack(pack: unknown, ruleSetId: string): CoreResult<RuleSet> {
  const validation = validateRatioPackValue(pack);
  if (!validation.ok) {
    return validation.result as CoreResult<RuleSet>;
  }

  const ruleSet = validation.value.ruleSets.find((candidate) => candidate.id === ruleSetId);
  if (ruleSet === undefined) {
    return missingRatioReference(`ruleSets.${ruleSetId}`, `Rule set is not declared in the ratio pack: ${ruleSetId}.`) as CoreResult<RuleSet>;
  }

  return ratioPackOk(ruleSet, "core.ratio-pack-v1.rule-set.read", validation.value);
}

function validateRatioPackValue(pack: unknown): RatioPackValidation<RatioPack> {
  if (pack === null || pack === undefined) {
    return failedRatioPack(missingRatioPack());
  }

  if (!isRecord(pack)) {
    return failedRatioPack(invalidRatioPack("ratioPack", "Ratio pack must be a structured object."));
  }

  if (!hasNonEmptyString(pack, "id") || !isRatioPackIdentity(pack.identity)) {
    return failedRatioPack(missingRatioPackIdentity());
  }

  if (!hasNonEmptyString(pack, "version")) {
    return failedRatioPack(missingRatioPackVersion());
  }

  if (!hasNonEmptyString(pack, "contentIdentity")) {
    return failedRatioPack(missingRatioPackContentIdentity());
  }

  const packId = pack.id as string;
  const packVersion = pack.version as string;
  const contentIdentity = pack.contentIdentity as string;

  if (pack.schemaVersion !== RATIO_PACK_V1_SCHEMA_VERSION) {
    return failedRatioPack(unsupportedRatioPack("schemaVersion", "Ratio pack schemaVersion is not supported by RatioPack V1."));
  }

  const unsupportedClaim = firstUnsupportedPackClaim(pack);
  if (unsupportedClaim !== null) {
    return failedRatioPack(unsupportedRatioPackClaim(unsupportedClaim));
  }

  if (!hasRatioPackRequiredObjects(pack)) {
    return failedRatioPack(invalidRatioPack("ratioPack", "Ratio pack V1 requires metadata, provenance, compatibility, limits, conventions, ratios, ratioFamilies, ratioSequences, partitionPatterns, ruleDeclarations, ruleSets, and preLock."));
  }

  const ratios = validateRatios(pack.ratios);
  if (!ratios.ok) {
    return ratios;
  }

  const ratioIds = new Set(ratios.value.map((ratio) => ratio.id));
  const ratioFamilies = validateRatioFamilies(pack.ratioFamilies, ratioIds);
  if (!ratioFamilies.ok) {
    return ratioFamilies;
  }

  const ratioSequences = validateRatioSequences(pack.ratioSequences);
  if (!ratioSequences.ok) {
    return ratioSequences;
  }

  const sequenceIds = new Set(ratioSequences.value.map((sequence) => sequence.id));
  const partitionPatterns = validatePartitionPatterns(pack.partitionPatterns, ratioIds, sequenceIds);
  if (!partitionPatterns.ok) {
    return partitionPatterns;
  }

  const partitionPatternIds = new Set(partitionPatterns.value.map((pattern) => pattern.id));
  const ruleDeclarations = validateRuleDeclarations(
    pack.ruleDeclarations,
    ratioIds,
    sequenceIds,
    partitionPatternIds,
  );
  if (!ruleDeclarations.ok) {
    return ruleDeclarations;
  }

  const ruleDeclarationIds = new Set(ruleDeclarations.value.map((rule) => rule.id));
  const ruleSets = validateRuleSets(pack.ruleSets, ruleDeclarationIds);
  if (!ruleSets.ok) {
    return ruleSets;
  }

  if (!isRatioPackMetadata(pack.metadata) || !isRatioPackProvenance(pack.provenance) || !isRatioPackCompatibility(pack.compatibility) || !isRatioPackLimits(pack.limits) || !isStringArray(pack.conventions) || !isRatioPackPreLock(pack.preLock, pack)) {
    return failedRatioPack(invalidRatioPack("ratioPack", "Ratio pack V1 metadata, provenance, compatibility, limits, conventions, or preLock are invalid."));
  }

  return validRatioPack({
    kind: "ratio-pack",
    id: packId,
    version: packVersion,
    schemaVersion: RATIO_PACK_V1_SCHEMA_VERSION,
    identity: pack.identity,
    contentIdentity,
    metadata: pack.metadata,
    provenance: pack.provenance,
    compatibility: pack.compatibility,
    limits: pack.limits,
    conventions: pack.conventions,
    ratios: ratios.value,
    ratioFamilies: ratioFamilies.value,
    ratioSequences: ratioSequences.value,
    partitionPatterns: partitionPatterns.value,
    ruleDeclarations: ruleDeclarations.value,
    ruleSets: ruleSets.value,
    preLock: pack.preLock,
  });
}

function validateRatios(value: unknown): RatioPackValidation<readonly Ratio[]> {
  if (!Array.isArray(value)) {
    return failedRatioPack(invalidRatioPack("ratios", "Ratio pack ratios must be an array."));
  }

  const duplicateRatioId = firstDuplicate(value.map((ratio) => (isRecord(ratio) ? ratio.id : undefined)));
  if (duplicateRatioId !== null) {
    return failedRatioPack(duplicateRatioDefinition(duplicateRatioId));
  }

  const ratios: Ratio[] = [];
  for (const ratio of value) {
    if (!isRecord(ratio) || ratio.kind !== "ratio" || !hasNonEmptyString(ratio, "id") || !isPositiveFiniteNumber(ratio.numerator) || !isPositiveFiniteNumber(ratio.denominator)) {
      return failedRatioPack(invalidRatioValue("ratios", "Ratio definitions require kind, id, positive numerator, and positive denominator."));
    }

    const ratioId = ratio.id as string;
    ratios.push({
      kind: "ratio",
      id: ratioId,
      numerator: ratio.numerator,
      denominator: ratio.denominator,
      normalizedValue: ratio.numerator / ratio.denominator,
      ...(typeof ratio.familyRef === "string" ? { familyRef: ratio.familyRef } : {}),
    });
  }

  return validRatioPack(ratios);
}

function validateRatioFamilies(value: unknown, ratioIds: ReadonlySet<string>): RatioPackValidation<readonly RatioFamily[]> {
  if (!Array.isArray(value)) {
    return failedRatioPack(invalidRatioPack("ratioFamilies", "Ratio pack ratioFamilies must be an array."));
  }

  const families: RatioFamily[] = [];
  for (const family of value) {
    if (!isRecord(family) || family.kind !== "ratio-family" || !hasNonEmptyString(family, "id") || family.scope !== "surface-partition" || !isStringArray(family.ratioRefs)) {
      return failedRatioPack(invalidRatioPack("ratioFamilies", "Ratio family declarations are invalid."));
    }

    const familyId = family.id as string;
    const missingRatioRef = firstMissingRef(family.ratioRefs, ratioIds);
    if (missingRatioRef !== null) {
      return failedRatioPack(missingRatioReference(`ratioFamilies.${familyId}.ratioRefs`, `Ratio family references an absent ratio: ${missingRatioRef}.`));
    }

    families.push({
      kind: "ratio-family",
      id: familyId,
      ratioRefs: family.ratioRefs,
      scope: "surface-partition",
    });
  }

  return validRatioPack(families);
}

function validateRatioSequences(value: unknown): RatioPackValidation<readonly RatioSequence[]> {
  if (!Array.isArray(value)) {
    return failedRatioPack(invalidRatioSequence("ratioSequences", "Ratio pack ratioSequences must be an array."));
  }

  const sequences: RatioSequence[] = [];
  for (const sequence of value) {
    if (!isRecord(sequence) || sequence.kind !== "ratio-sequence" || !hasNonEmptyString(sequence, "id") || !isPositiveNumberArray(sequence.parts) || sequence.parts.length < 2) {
      return failedRatioPack(invalidRatioSequence("ratioSequences", "Ratio sequences require kind, id, and at least two positive parts."));
    }

    const sequenceId = sequence.id as string;
    const total = sequence.parts.reduce((sum, part) => sum + part, 0);
    sequences.push({
      kind: "ratio-sequence",
      id: sequenceId,
      parts: sequence.parts,
      normalizedParts: sequence.parts.map((part) => part / total),
    });
  }

  return validRatioPack(sequences);
}

function validatePartitionPatterns(
  value: unknown,
  ratioIds: ReadonlySet<string>,
  sequenceIds: ReadonlySet<string>,
): RatioPackValidation<readonly PartitionPattern[]> {
  if (!Array.isArray(value)) {
    return failedRatioPack(invalidRatioPack("partitionPatterns", "Ratio pack partitionPatterns must be an array."));
  }

  const patterns: PartitionPattern[] = [];
  for (const pattern of value) {
    if (!isRecord(pattern) || pattern.kind !== "partition-pattern" || !hasNonEmptyString(pattern, "id") || !isStringArray(pattern.ratioRefs) || !isPartitionAxis(pattern.axis) || pattern.declarationOnly !== true) {
      return failedRatioPack(invalidRatioPack("partitionPatterns", "Partition pattern declarations are invalid."));
    }

    const patternId = pattern.id as string;
    const missingRatioRef = firstMissingRef(pattern.ratioRefs, ratioIds);
    if (missingRatioRef !== null) {
      return failedRatioPack(missingRatioReference(`partitionPatterns.${patternId}.ratioRefs`, `Partition pattern references an absent ratio: ${missingRatioRef}.`));
    }

    if (typeof pattern.sequenceRef === "string" && !sequenceIds.has(pattern.sequenceRef)) {
      return failedRatioPack(invalidRatioSequence(`partitionPatterns.${patternId}.sequenceRef`, `Partition pattern references an absent ratio sequence: ${pattern.sequenceRef}.`));
    }

    patterns.push({
      kind: "partition-pattern",
      id: patternId,
      ratioRefs: pattern.ratioRefs,
      ...(typeof pattern.sequenceRef === "string" ? { sequenceRef: pattern.sequenceRef } : {}),
      axis: pattern.axis,
      declarationOnly: true,
    });
  }

  return validRatioPack(patterns);
}

function validateRuleDeclarations(
  value: unknown,
  ratioIds: ReadonlySet<string>,
  sequenceIds: ReadonlySet<string>,
  partitionPatternIds: ReadonlySet<string>,
): RatioPackValidation<readonly RuleDeclaration[]> {
  if (!Array.isArray(value)) {
    return failedRatioPack(invalidRatioPack("ruleDeclarations", "Ratio pack ruleDeclarations must be an array."));
  }

  const duplicateRuleDeclarationId = firstDuplicate(value.map((declaration) => (isRecord(declaration) ? declaration.id : undefined)));
  if (duplicateRuleDeclarationId !== null) {
    return failedRatioPack(invalidRuleDeclaration(`ruleDeclarations.${duplicateRuleDeclarationId}`, `Rule declaration is declared more than once in the ratio pack: ${duplicateRuleDeclarationId}.`));
  }

  const declarations: RuleDeclaration[] = [];
  for (const declaration of value) {
    const declarationValidation = validateRuleDeclaration(
      declaration,
      ratioIds,
      sequenceIds,
      partitionPatternIds,
    );
    if (!declarationValidation.ok) {
      return declarationValidation;
    }

    declarations.push(declarationValidation.value);
  }

  return validRatioPack(declarations);
}

function validateRuleDeclaration(
  value: unknown,
  ratioIds: ReadonlySet<string>,
  sequenceIds: ReadonlySet<string>,
  partitionPatternIds: ReadonlySet<string>,
): RatioPackValidation<RuleDeclaration> {
  if (!isRuleDeclarationBaseRecord(value)) {
    return failedRatioPack(invalidRuleDeclaration("ruleDeclarations", "Rule declarations require kind, id, surface target, and declarationOnly true."));
  }

  const declarationId = value.id as string;
  const guardrailFailure = firstRuleDeclarationGuardrailFailure(value, declarationId);
  if (guardrailFailure !== null) {
    return failedRatioPack(guardrailFailure);
  }

  const refs = ruleDeclarationRefs(value);
  const referenceFailure = firstRuleDeclarationReferenceFailure(
    declarationId,
    refs,
    ratioIds,
    sequenceIds,
    partitionPatternIds,
  );
  if (referenceFailure !== null) {
    return failedRatioPack(referenceFailure);
  }

  return validRatioPack(normalizeRuleDeclaration(value, declarationId, refs));
}

function firstRuleDeclarationGuardrailFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  for (const check of RULE_DECLARATION_GUARDRAIL_CHECKS) {
    const failure = check(declaration, declarationId);
    if (failure !== null) {
      return failure;
    }
  }

  return null;
}

function executableRuleDeclarationFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  const executableField = firstExecutableRuleDeclarationField(declaration);
  if (executableField !== null) {
    return executableRuleInPackRejected(declarationId, executableField);
  }

  return null;
}

function agentCreatedRuleFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  if (isAgentCreatedRuleDeclaration(declaration)) {
    return agentCreatedRuleRejected(declarationId);
  }

  return null;
}

function missingRuleTypeFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  if (!hasNonEmptyString(declaration, "type")) {
    return missingRuleType(declarationId);
  }

  return null;
}

function missingRequiredRatioFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  if (!isStringArray(declaration.ratioRefs) || declaration.ratioRefs.length === 0) {
    return invalidRuleDeclaration(`ruleDeclarations.${declarationId}.ratioRefs`, "Rule declarations must declare at least one required ratio reference.");
  }

  return null;
}

function missingCoreSupportFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  if (declaration.requiresCoreSupport !== true) {
    return invalidRuleDeclaration(`ruleDeclarations.${declarationId}.requiresCoreSupport`, "Rule declarations must require explicit core support.");
  }

  return null;
}

function invalidRuleRefFieldsFailure(
  declaration: Record<string, unknown>,
  declarationId: string,
): CoreResult | null {
  if (!hasOptionalStringArray(declaration, "sequenceRefs") || !hasOptionalStringArray(declaration, "partitionPatternRefs")) {
    return invalidRuleDeclaration(`ruleDeclarations.${declarationId}`, "Rule declaration refs must be string arrays.");
  }

  return null;
}

function firstRuleDeclarationReferenceFailure(
  declarationId: string,
  refs: RuleDeclarationRefs,
  ratioIds: ReadonlySet<string>,
  sequenceIds: ReadonlySet<string>,
  partitionPatternIds: ReadonlySet<string>,
): CoreResult | null {
  const missingRatioRef = firstMissingRef(refs.ratioRefs, ratioIds);
  if (missingRatioRef !== null) {
    return missingRatioReference(`ruleDeclarations.${declarationId}.ratioRefs`, `Rule declaration references an absent ratio: ${missingRatioRef}.`);
  }

  if (firstMissingRef(refs.sequenceRefs, sequenceIds) !== null) {
    return invalidRatioSequence(`ruleDeclarations.${declarationId}.sequenceRefs`, "Rule declaration references an absent ratio sequence.");
  }

  if (firstMissingRef(refs.partitionPatternRefs, partitionPatternIds) !== null) {
    return invalidRuleDeclaration(`ruleDeclarations.${declarationId}.partitionPatternRefs`, "Rule declaration references an absent partition pattern.");
  }

  return null;
}

function ruleDeclarationRefs(declaration: Record<string, unknown>): RuleDeclarationRefs {
  return {
    ratioRefs: declaration.ratioRefs as readonly string[],
    sequenceRefs: (declaration.sequenceRefs ?? []) as readonly string[],
    partitionPatternRefs: (declaration.partitionPatternRefs ?? []) as readonly string[],
  };
}

function isRuleDeclarationBaseRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && value.kind === "rule-declaration"
    && hasNonEmptyString(value, "id")
    && value.target === "surface"
    && value.declarationOnly === true;
}

function normalizeRuleDeclaration(
  declaration: Record<string, unknown>,
  declarationId: string,
  refs: RuleDeclarationRefs,
): RuleDeclaration {
  return {
    kind: "rule-declaration",
    id: declarationId,
    type: declaration.type as string,
    target: "surface",
    ratioRefs: refs.ratioRefs,
    ...(refs.sequenceRefs.length > 0 ? { sequenceRefs: refs.sequenceRefs } : {}),
    ...(refs.partitionPatternRefs.length > 0 ? { partitionPatternRefs: refs.partitionPatternRefs } : {}),
    requiresCoreSupport: true,
    declarationOnly: true,
  };
}

function validateRuleSets(value: unknown, ruleDeclarationIds: ReadonlySet<string>): RatioPackValidation<readonly RuleSet[]> {
  if (!Array.isArray(value)) {
    return failedRatioPack(invalidRatioPack("ruleSets", "Ratio pack ruleSets must be an array."));
  }

  const duplicateRuleSetId = firstDuplicate(value.map((ruleSet) => (isRecord(ruleSet) ? ruleSet.id : undefined)));
  if (duplicateRuleSetId !== null) {
    return failedRatioPack(invalidRuleSet(`ruleSets.${duplicateRuleSetId}`, `Rule set is declared more than once in the ratio pack: ${duplicateRuleSetId}.`));
  }

  const ruleSets: RuleSet[] = [];
  for (const ruleSet of value) {
    if (!isRecord(ruleSet) || ruleSet.kind !== "rule-set" || !hasNonEmptyString(ruleSet, "id") || !isStringArray(ruleSet.ruleRefs) || ruleSet.ruleRefs.length === 0 || ruleSet.declarationOnly !== true) {
      return failedRatioPack(invalidRuleSet("ruleSets", "Rule sets require kind, id, at least one ruleRef, and declarationOnly true."));
    }

    const ruleSetId = ruleSet.id as string;
    const duplicateRuleRef = firstDuplicate(ruleSet.ruleRefs);
    if (duplicateRuleRef !== null) {
      return failedRatioPack(invalidRuleSet(`ruleSets.${ruleSetId}.ruleRefs`, `Rule set references the same rule more than once: ${duplicateRuleRef}.`));
    }

    const missingRuleRef = firstMissingRef(ruleSet.ruleRefs, ruleDeclarationIds);
    if (missingRuleRef !== null) {
      return failedRatioPack(missingRuleDeclaration(missingRuleRef, ruleSetId));
    }

    ruleSets.push({
      kind: "rule-set",
      id: ruleSetId,
      ruleRefs: ruleSet.ruleRefs,
      declarationOnly: true,
    });
  }

  return validRatioPack(ruleSets);
}

function ratioPackOk<TOutput>(output: TOutput, operationName: string, pack: RatioPack): CoreResult<TOutput> {
  const packRef = ratioPackRef(pack);
  return createRatioPackResult({
    status: "ok",
    provenance: createRatioPackProvenance(operationName, [{ kind: "ratio-pack", ref: packRef }]),
    outputRefs: [{ kind: "ratio-pack", ref: packRef }],
    packLockRef: { id: pack.preLock.ref },
    output,
  });
}

function createRatioPackResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createRatioPackError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: RATIO_PACK_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };

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

function createRatioPackProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: RATIO_PACK_MODEL_OPERATION_VERSION,
    inputRefs,
    source: RATIO_PACK_SOURCE_REFERENCE,
  };
}

function missingRatioPack(): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "MissingRatioPack",
        message: "Ratio pack is required.",
        targetRef: "ratioPack",
      }),
    ],
  });
}

function missingRatioPackVersion(): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "MissingRatioPackVersion",
        message: "Ratio pack version is required.",
        targetRef: "version",
      }),
    ],
  });
}

function missingRatioPackIdentity(): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "MissingRatioPackIdentity",
        message: "Ratio pack identity is required.",
        targetRef: "identity",
      }),
    ],
  });
}

function missingRatioPackContentIdentity(): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "MissingRatioPackContentIdentity",
        message: "Ratio pack contentIdentity is required.",
        targetRef: "contentIdentity",
      }),
    ],
  });
}

function invalidRatioPack(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "InvalidRatioPackV1", message, targetRef })],
  });
}

function unsupportedRatioPack(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "UnsupportedRatioPackV1", message, targetRef })],
  });
}

function duplicateRatioDefinition(ratioId: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "DuplicateRatioDefinition",
        message: `Ratio is declared more than once in the ratio pack: ${ratioId}.`,
        targetRef: `ratios.${ratioId}`,
      }),
    ],
  });
}

function invalidRatioValue(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "InvalidRatioValue", message, targetRef })],
  });
}

function invalidRatioSequence(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "InvalidRatioSequence", message, targetRef })],
  });
}

function missingRatioReference(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "MissingRatioReference", message, targetRef })],
  });
}

function missingRuleType(ruleRef: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "MissingRuleType",
        message: `Rule declaration is missing an explicit rule type: ${ruleRef}.`,
        targetRef: `ruleDeclarations.${ruleRef}.type`,
      }),
    ],
  });
}

function missingRuleDeclaration(ruleRef: string, ruleSetRef: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "MissingRuleDeclaration",
        message: `Rule set references an absent rule declaration: ${ruleRef}.`,
        targetRef: `ruleSets.${ruleSetRef}.ruleRefs`,
      }),
    ],
  });
}

function invalidRuleDeclaration(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "InvalidRuleDeclaration", message, targetRef })],
  });
}

function invalidRuleSet(targetRef: string, message: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [createRatioPackError({ code: "InvalidRuleSet", message, targetRef })],
  });
}

function agentCreatedRuleRejected(ruleRef: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "AgentCreatedRuleRejected",
        message: `Rule declaration cannot be created by an agent, interface, adapter, or prompt: ${ruleRef}.`,
        targetRef: `ruleDeclarations.${ruleRef}`,
      }),
    ],
  });
}

function executableRuleInPackRejected(ruleRef: string, field: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "ExecutableRuleInPackRejected",
        message: `Rule declaration contains executable client code in pack field: ${field}.`,
        targetRef: `ruleDeclarations.${ruleRef}.${field}`,
      }),
    ],
  });
}

function unsupportedRatioPackClaim(claim: string): CoreResult {
  return createRatioPackResult({
    status: "failed",
    errors: [
      createRatioPackError({
        code: "UnsupportedRatioPackClaim",
        message: `Ratio pack contains an unsupported claim or presentation surface: ${claim}.`,
        targetRef: "claims",
      }),
    ],
  });
}

function validRatioPack<TValue>(value: TValue): RatioPackValidation<TValue> {
  return { ok: true, value };
}

function failedRatioPack<TValue>(result: CoreResult): RatioPackValidation<TValue> {
  return { ok: false, result };
}

function firstUnsupportedPackClaim(value: unknown, fieldPath = ""): string | null {
  if (typeof value === "string") {
    if (!isClaimTextField(fieldPath)) {
      return null;
    }

    const normalizedValue = value.toLowerCase();
    return UNSUPPORTED_RATIO_PACK_CLAIMS.find((claim) => normalizedValue.includes(claim)) ?? null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const unsupportedClaim = firstUnsupportedPackClaim(item, fieldPath);
      if (unsupportedClaim !== null) {
        return unsupportedClaim;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (UNSUPPORTED_RATIO_PACK_FIELDS.includes(normalizedKey as (typeof UNSUPPORTED_RATIO_PACK_FIELDS)[number])) {
      return key;
    }

    const unsupportedClaim = firstUnsupportedPackClaim(item, key);
    if (unsupportedClaim !== null) {
      return unsupportedClaim;
    }
  }

  return null;
}

function isClaimTextField(fieldPath: string): boolean {
  return fieldPath === "claims" || fieldPath === "claim" || fieldPath === "concept";
}

function hasRatioPackRequiredObjects(value: Record<string, unknown>): boolean {
  return isRecord(value.metadata)
    && isRecord(value.provenance)
    && isRecord(value.compatibility)
    && isRecord(value.limits)
    && Array.isArray(value.conventions)
    && Array.isArray(value.ratios)
    && Array.isArray(value.ratioFamilies)
    && Array.isArray(value.ratioSequences)
    && Array.isArray(value.partitionPatterns)
    && Array.isArray(value.ruleDeclarations)
    && Array.isArray(value.ruleSets)
    && isRecord(value.preLock);
}

function isRatioPackIdentity(value: unknown): value is RatioPackIdentity {
  return isRecord(value)
    && value.kind === "ratio-pack-identity"
    && hasNonEmptyString(value, "id")
    && hasNonEmptyString(value, "concept");
}

function isRatioPackMetadata(value: unknown): value is RatioPackMetadata {
  return isRecord(value)
    && hasNonEmptyString(value, "name")
    && hasNonEmptyString(value, "description")
    && hasNonEmptyString(value, "owner");
}

function isRatioPackProvenance(value: unknown): value is RatioPackProvenance {
  return isRecord(value)
    && value.kind === "ratio-pack-provenance"
    && (value.source === "mathematical" || value.source === "norma-basic")
    && isSourceReferenceArray(value.sourceRefs);
}

function isRatioPackCompatibility(value: unknown): value is RatioPackCompatibility {
  return isRecord(value)
    && value.schemaVersion === RATIO_PACK_V1_SCHEMA_VERSION
    && hasNonEmptyString(value, "coreVersionRange");
}

function isRatioPackLimits(value: unknown): value is RatioPackLimits {
  return isRecord(value)
    && value.noBeautyClaims === true
    && value.noIntentInference === true
    && value.noUiPreset === true;
}

function isRatioPackPreLock(value: unknown, pack: Record<string, unknown>): value is RatioPackPreLock {
  return isRecord(value)
    && value.kind === "pack-lock-prelock"
    && hasNonEmptyString(value, "ref")
    && value.packId === pack.id
    && value.packVersion === pack.version
    && value.schemaVersion === RATIO_PACK_V1_SCHEMA_VERSION
    && value.contentIdentity === pack.contentIdentity
    && value.final === false;
}

function firstExecutableRuleDeclarationField(value: Record<string, unknown>): string | null {
  for (const field of EXECUTABLE_RULE_DECLARATION_FIELDS) {
    if (field in value) {
      return field;
    }
  }

  return null;
}

function isAgentCreatedRuleDeclaration(value: Record<string, unknown>): boolean {
  if (isAgentCreatedRuleSource(value.createdBy)) {
    return true;
  }

  const source = value.source;
  return isRecord(source) && isAgentCreatedRuleSource(source.kind);
}

function isAgentCreatedRuleSource(value: unknown): boolean {
  return typeof value === "string" && AGENT_CREATED_RULE_SOURCES.includes(value as (typeof AGENT_CREATED_RULE_SOURCES)[number]);
}

function firstDuplicate(values: readonly unknown[]): string | null {
  const seenValues = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    if (seenValues.has(value)) {
      return value;
    }

    seenValues.add(value);
  }

  return null;
}

function firstMissingRef(refs: readonly string[], availableRefs: ReadonlySet<string>): string | null {
  return refs.find((ref) => !availableRefs.has(ref)) ?? null;
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function hasOptionalStringArray(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || isStringArray(value[key]);
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string" && value[key].length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPositiveNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every(isPositiveFiniteNumber);
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value) && typeof value.kind === "string" && typeof value.ref === "string";
}

function isPartitionAxis(value: unknown): value is PartitionPattern["axis"] {
  return value === "horizontal" || value === "vertical" || value === "both";
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
