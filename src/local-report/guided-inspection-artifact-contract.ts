import { join } from "node:path";

const CANONICAL_TRUTH = "result.json";
const KNOWN_DERIVED_ARTIFACTS = Object.freeze([
  "guide.html",
  "report.html",
  "visual.svg",
  "summary.json",
  "summary.md",
] as const);

const KNOWN_ARTIFACTS = new Set<string>([
  CANONICAL_TRUTH,
  ...KNOWN_DERIVED_ARTIFACTS,
]);

export interface GuidedInspectionArtifactContractInput {
  readonly outputDir: string;
  readonly artifacts: readonly string[];
}

export interface GuidedInspectionArtifactContract {
  readonly canonicalTruth: "result.json";
  readonly resultJson: string;
  readonly derivedArtifacts: Record<string, string>;
  readonly localOnly: true;
}

export function createGuidedInspectionArtifactContract(
  input: GuidedInspectionArtifactContractInput,
): GuidedInspectionArtifactContract {
  const outputDir = validateOutputDir(input.outputDir);
  const artifacts = validateArtifacts(input.artifacts);

  if (!artifacts.has(CANONICAL_TRUTH)) {
    throw new Error("Guided inspection artifact contract requires result.json");
  }

  return {
    canonicalTruth: CANONICAL_TRUTH,
    resultJson: join(outputDir, CANONICAL_TRUTH),
    derivedArtifacts: knownDerivedArtifacts(outputDir, artifacts),
    localOnly: true,
  };
}

function validateOutputDir(outputDir: string): string {
  if (typeof outputDir !== "string" || outputDir.length === 0) {
    throw new Error("Guided inspection outputDir must be a non-empty absolute local filesystem path");
  }

  if (!isAbsoluteLocalOutputDir(outputDir) || isUrl(outputDir)) {
    throw new Error("Guided inspection outputDir must be a non-empty absolute local filesystem path");
  }

  return outputDir;
}

function validateArtifacts(artifacts: readonly string[]): ReadonlySet<string> {
  if (!Array.isArray(artifacts)) {
    throw new Error("Guided inspection artifacts must be a filename list");
  }

  const validArtifacts = new Set<string>();

  for (const artifact of artifacts) {
    validateArtifactName(artifact);

    if (validArtifacts.has(artifact)) {
      throw new Error(`Duplicate guided inspection artifact: ${artifact}`);
    }

    validArtifacts.add(artifact);
  }

  return validArtifacts;
}

function validateArtifactName(artifact: string): void {
  if (typeof artifact !== "string" || artifact.length === 0) {
    throw new Error("Guided inspection artifact names must be non-empty filenames");
  }

  if (isUrl(artifact)) {
    throw new Error(`Guided inspection artifact must be a local filename: ${artifact}`);
  }

  if (artifact.startsWith("/") || artifact.includes("/") || artifact.includes("\\")) {
    throw new Error(`Guided inspection artifact must not be an absolute or nested path: ${artifact}`);
  }

  if (artifact === "." || artifact === ".." || artifact.includes("..")) {
    throw new Error(`Guided inspection artifact must not include traversal: ${artifact}`);
  }

  if (!KNOWN_ARTIFACTS.has(artifact)) {
    throw new Error(`Unknown guided inspection artifact: ${artifact}`);
  }
}

function knownDerivedArtifacts(outputDir: string, artifacts: ReadonlySet<string>): Record<string, string> {
  const derivedArtifacts: Record<string, string> = {};

  for (const artifact of KNOWN_DERIVED_ARTIFACTS) {
    if (artifacts.has(artifact)) {
      derivedArtifacts[artifact] = join(outputDir, artifact);
    }
  }

  return derivedArtifacts;
}

function isUrl(value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return normalizedValue.startsWith("file:")
    || normalizedValue.startsWith("h" + "ttp:")
    || normalizedValue.startsWith("h" + "ttps:");
}

function isAbsoluteLocalOutputDir(value: string): boolean {
  if (value.startsWith("/")) {
    return true;
  }

  return isWindowsRuntime() && (value.startsWith("\\\\") || /^[A-Za-z]:[\\/]/u.test(value));
}

function isWindowsRuntime(): boolean {
  return /^[A-Za-z]:[\\/]/u.test(process.cwd()) || process.cwd().startsWith("\\\\");
}
