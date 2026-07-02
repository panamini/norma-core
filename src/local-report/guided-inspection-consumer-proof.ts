import { join } from "node:path";

import { createGuidedInspectionArtifactContract } from "./guided-inspection-artifact-contract.js";

export interface GuidedInspectionConsumerProof {
  readonly canonicalTruth: "result.json";
  readonly resultJson: string;
  readonly derivedArtifacts: Record<string, string>;
  readonly localOnly: true;
  readonly outputDir: string;
}

interface GuidedInspectionEnvelopeArtifacts {
  readonly outputDir: string;
  readonly resultJson: string;
  readonly artifacts: readonly string[];
  readonly artifactPaths: readonly string[];
}

const DERIVED_ENVELOPE_ARTIFACTS = Object.freeze([
  ["guideHtml", "guide.html"],
  ["reportHtml", "report.html"],
  ["visualSvg", "visual.svg"],
  ["summaryJson", "summary.json"],
  ["summaryMarkdown", "summary.md"],
] as const);

const KNOWN_ENVELOPE_FIELDS = new Set<string>([
  "canonicalTruth",
  "derivedArtifacts",
  "guideHtml",
  "localOnly",
  "outputDir",
  "reportHtml",
  "resultJson",
  "status",
  "summaryJson",
  "summaryMarkdown",
  "visualSvg",
]);

export function createGuidedInspectionConsumerProof(envelope: unknown): GuidedInspectionConsumerProof {
  const record = requireRecord(envelope);
  validateEnvelopeHeader(record);
  const envelopeArtifacts = collectEnvelopeArtifacts(record);
  rejectDuplicateArtifactPaths(envelopeArtifacts.artifactPaths);

  const contract = createGuidedInspectionArtifactContract({
    outputDir: envelopeArtifacts.outputDir,
    artifacts: envelopeArtifacts.artifacts,
  });

  assertEnvelopeArtifactPaths(record, envelopeArtifacts.resultJson, contract);

  return {
    canonicalTruth: contract.canonicalTruth,
    resultJson: contract.resultJson,
    derivedArtifacts: contract.derivedArtifacts,
    localOnly: contract.localOnly,
    outputDir: envelopeArtifacts.outputDir,
  };
}

function validateEnvelopeHeader(record: Record<string, unknown>): void {
  if (record.status !== "ok") {
    throw new Error("Guided inspection consumer proof requires an ok demo envelope");
  }

  rejectUnknownEnvelopeFields(record);

  for (const [passes, message] of [
    [record.canonicalTruth === "result.json", "Guided inspection consumer proof requires canonicalTruth result.json"],
    [record.derivedArtifacts === true, "Guided inspection consumer proof requires derivedArtifacts true"],
    [record.localOnly === true, "Guided inspection consumer proof requires localOnly true"],
  ] as const) {
    if (!passes) {
      throw new Error(message);
    }
  }
}

function collectEnvelopeArtifacts(record: Record<string, unknown>): GuidedInspectionEnvelopeArtifacts {
  const outputDir = requireStringField(record, "outputDir");
  const resultJson = requireStringField(record, "resultJson");
  const guideHtml = requireStringField(record, "guideHtml");
  const artifacts = ["result.json", "guide.html"];
  const artifactPaths = [resultJson, guideHtml];

  for (const [field, artifact] of DERIVED_ENVELOPE_ARTIFACTS) {
    if (field === "guideHtml" || record[field] === undefined) {
      continue;
    }

    artifacts.push(artifact);
    artifactPaths.push(requireStringField(record, field));
  }

  return {
    outputDir,
    resultJson,
    artifacts,
    artifactPaths,
  };
}

function assertEnvelopeArtifactPaths(
  record: Record<string, unknown>,
  resultJson: string,
  contract: ReturnType<typeof createGuidedInspectionArtifactContract>,
): void {
  assertExpectedPath("resultJson", resultJson, contract.resultJson);

  for (const [field, artifact] of DERIVED_ENVELOPE_ARTIFACTS) {
    if (record[field] === undefined) {
      continue;
    }

    assertExpectedPath(field, requireStringField(record, field), contract.derivedArtifacts[artifact]);
  }
}

function rejectUnknownEnvelopeFields(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (!KNOWN_ENVELOPE_FIELDS.has(key)) {
      throw new Error(`Unknown guided inspection demo envelope field: ${key}`);
    }
  }
}

function rejectDuplicateArtifactPaths(paths: readonly string[]): void {
  const seen = new Set<string>();

  for (const artifactPath of paths) {
    if (seen.has(artifactPath)) {
      throw new Error(`Duplicate guided inspection demo artifact path: ${artifactPath}`);
    }

    seen.add(artifactPath);
  }
}

function assertExpectedPath(field: string, actual: string, expected: string | undefined): void {
  if (actual !== expected) {
    throw new Error(`Guided inspection ${field} must match ${join("outputDir", expectedArtifactName(expected))}`);
  }
}

function expectedArtifactName(expected: string | undefined): string {
  if (typeof expected !== "string" || expected.length === 0) {
    return "a known guided inspection artifact";
  }

  return expected.split(/[\\/]/u).at(-1) ?? "a known guided inspection artifact";
}

function requireStringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Guided inspection demo envelope requires ${field}`);
  }

  return value;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Guided inspection consumer proof requires a demo envelope object");
  }

  return value as Record<string, unknown>;
}
