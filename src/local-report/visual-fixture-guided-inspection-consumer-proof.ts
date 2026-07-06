import { basename, dirname, join } from "node:path";

export interface VisualFixtureGuidedInspectionDerivedArtifactRef {
  readonly name: "guide.html" | "visual.svg" | "summary.json" | "summary.md";
  readonly path: string;
  readonly role: "derived-inspection-evidence";
  readonly sourceTruth: false;
  readonly coreInputAuthority: false;
  readonly packageApiTruth: false;
  readonly futureConnectorSchema: false;
}

export interface VisualFixtureGuidedInspectionConsumerProof {
  readonly canonicalTruth: "result.json";
  readonly sourceTruth: "acceptedStructuredGeometry";
  readonly resultJson: string;
  readonly derivedArtifacts: readonly VisualFixtureGuidedInspectionDerivedArtifactRef[];
  readonly candidateEvidenceOnly: true;
  readonly localOnly: true;
  readonly fixtureOnly: true;
  readonly nonSchemaMetadataOnly: true;
  readonly nonApiMetadataOnly: true;
  readonly outputDir: string;
}

const EXPECTED_ENVELOPE_FIELDS = Object.freeze([
  "canonicalTruth",
  "candidateEvidenceOnly",
  "fixtureOnly",
  "guideHtml",
  "layers",
  "localOnly",
  "nonApiMetadataOnly",
  "nonSchemaMetadataOnly",
  "outputDir",
  "resultJson",
  "sourceTruth",
  "status",
  "summaryJson",
  "summaryMarkdown",
  "visualSvg",
] as const);

const DERIVED_ARTIFACT_FIELDS = Object.freeze([
  ["guideHtml", "guide.html"],
  ["visualSvg", "visual.svg"],
  ["summaryJson", "summary.json"],
  ["summaryMarkdown", "summary.md"],
] as const);

class VisualFixtureGuidedInspectionConsumerProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisualFixtureGuidedInspectionConsumerProofError";
  }
}

export function createVisualFixtureGuidedInspectionConsumerProof(
  envelope: unknown,
): VisualFixtureGuidedInspectionConsumerProof {
  const record = requireEnvelopeRecord(envelope);
  rejectUnknownEnvelopeFields(record);
  requireOwnEnvelopeFields(record);
  validateTruthBoundary(record);

  const outputDir = requireAbsoluteLocalPath(record, "outputDir");
  const resultJsonPath = requireAbsoluteLocalPath(record, "resultJson");
  const derivedArtifactPaths = DERIVED_ARTIFACT_FIELDS.map(([field]) => requireAbsoluteLocalPath(record, field));
  rejectDuplicatePaths([resultJsonPath, ...derivedArtifactPaths]);

  const resultJson = requireArtifactPath("resultJson", resultJsonPath, outputDir, "result.json");
  const derivedArtifacts = DERIVED_ARTIFACT_FIELDS.map(([field, name]) => ({
    name,
    path: requireArtifactPath(field, requireAbsoluteLocalPath(record, field), outputDir, name),
    role: "derived-inspection-evidence" as const,
    sourceTruth: false as const,
    coreInputAuthority: false as const,
    packageApiTruth: false as const,
    futureConnectorSchema: false as const,
  }));

  return {
    canonicalTruth: "result.json",
    sourceTruth: "acceptedStructuredGeometry",
    resultJson,
    derivedArtifacts,
    candidateEvidenceOnly: true,
    localOnly: true,
    fixtureOnly: true,
    nonSchemaMetadataOnly: true,
    nonApiMetadataOnly: true,
    outputDir,
  };
}

function requireEnvelopeRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid("envelope", "requires object");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw invalid("envelope", "requires plain object");
  }

  return value as Record<string, unknown>;
}

function rejectUnknownEnvelopeFields(record: Record<string, unknown>): void {
  const allowed = new Set<string>(EXPECTED_ENVELOPE_FIELDS);

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw invalid(key, "unknown field");
    }
  }
}

function requireOwnEnvelopeFields(record: Record<string, unknown>): void {
  for (const field of EXPECTED_ENVELOPE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      throw invalid(field, "requires own field");
    }
  }
}

function validateTruthBoundary(record: Record<string, unknown>): void {
  const requiredValues = [
    ["status", "ok"],
    ["canonicalTruth", "result.json"],
    ["sourceTruth", "acceptedStructuredGeometry"],
    ["candidateEvidenceOnly", true],
    ["localOnly", true],
    ["fixtureOnly", true],
    ["nonSchemaMetadataOnly", true],
    ["nonApiMetadataOnly", true],
  ] as const;

  for (const [field, expected] of requiredValues) {
    if (record[field] !== expected) {
      throw invalid(field, `requires ${String(expected)}`);
    }
  }

  if (!Array.isArray(record.layers) || record.layers.some((layer) => typeof layer !== "string")) {
    throw invalid("layers", "requires string array");
  }
}

function requireArtifactPath(
  field: string,
  artifactPath: string,
  outputDir: string,
  artifactName: string,
): string {
  if (!matchesOutputArtifactPath(artifactPath, outputDir, artifactName)) {
    throw invalid(field, `must match outputDir/${artifactName}`);
  }

  return artifactPath;
}

function matchesOutputArtifactPath(artifactPath: string, outputDir: string, artifactName: string): boolean {
  if (isWindowsAbsolutePath(outputDir)) {
    return !hasTrailingWindowsPathSeparator(artifactPath)
      && normalizeWindowsArtifactPath(artifactPath) === `${normalizeWindowsOutputDir(outputDir)}\\${artifactName}`;
  }

  return dirname(artifactPath) === outputDir
    && basename(artifactPath) === artifactName
    && artifactPath === join(outputDir, artifactName);
}

function normalizeWindowsOutputDir(value: string): string {
  return normalizeWindowsArtifactPath(value).replace(/\\+$/u, "");
}

function normalizeWindowsArtifactPath(value: string): string {
  return value.replaceAll("/", "\\");
}

function hasTrailingWindowsPathSeparator(value: string): boolean {
  return /[\\/]$/u.test(value);
}

function requireAbsoluteLocalPath(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  if (typeof value !== "string" || value.length === 0 || !isAbsoluteLocalPath(value) || isUrlPath(value)) {
    throw invalid(field, "requires absolute local filesystem path");
  }

  return value;
}

function rejectDuplicatePaths(paths: readonly string[]): void {
  const seen = new Set<string>();

  for (const artifactPath of paths) {
    if (seen.has(artifactPath)) {
      throw invalid("artifactPath", "duplicate path");
    }

    seen.add(artifactPath);
  }
}

function isAbsoluteLocalPath(value: string): boolean {
  if (value.startsWith("/")) {
    return true;
  }

  return isWindowsAbsolutePath(value);
}

function isWindowsAbsolutePath(value: string): boolean {
  return value.startsWith("\\\\") || /^[A-Za-z]:[\\/]/u.test(value);
}

function isUrlPath(value: string): boolean {
  if (/^[A-Za-z]:[\\/]/u.test(value)) {
    return false;
  }

  return /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value);
}

function invalid(field: string, reason: string): VisualFixtureGuidedInspectionConsumerProofError {
  return new VisualFixtureGuidedInspectionConsumerProofError(
    `Invalid visual fixture guided inspection consumer proof envelope field "${field}": ${reason}.`,
  );
}
