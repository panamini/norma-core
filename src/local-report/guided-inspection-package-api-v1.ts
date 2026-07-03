import { createGuidedInspectionArtifactContract } from "./guided-inspection-artifact-contract.js";
import { createGuidedInspectionConsumerProof } from "./guided-inspection-consumer-proof.js";

const CANONICAL_TRUTH = "result.json";
const DERIVED_ARTIFACT_NAMES = Object.freeze([
  "guide.html",
  "report.html",
  "visual.svg",
  "summary.json",
  "summary.md",
] as const);

export interface GuidedInspectionArtifactContractInputV1 {
  readonly outputDir: string;
  readonly artifacts: readonly GuidedInspectionArtifactRefV1["name"][];
}

export interface GuidedInspectionArtifactRefV1 {
  readonly name:
    | "result.json"
    | "guide.html"
    | "report.html"
    | "visual.svg"
    | "summary.json"
    | "summary.md";
  readonly path: string;
  readonly role: "canonical-truth" | "derived-inspection-artifact";
  readonly required: boolean;
}

export interface GuidedInspectionArtifactContractV1 {
  readonly canonicalTruth: "result.json";
  readonly resultJson: GuidedInspectionArtifactRefV1 & {
    readonly name: "result.json";
    readonly role: "canonical-truth";
    readonly required: true;
  };
  readonly derivedArtifacts: readonly GuidedInspectionArtifactRefV1[];
  readonly localOnly: true;
}

export interface GuidedInspectionDemoEnvelopeV1 {
  readonly status: "ok";
  readonly outputDir: string;
  readonly resultJson: string;
  readonly guideHtml: string;
  readonly reportHtml?: string;
  readonly visualSvg?: string;
  readonly summaryJson?: string;
  readonly summaryMarkdown?: string;
  readonly canonicalTruth: "result.json";
  readonly derivedArtifacts: true;
  readonly localOnly: true;
}

export interface GuidedInspectionConsumerProofV1 {
  readonly canonicalTruth: "result.json";
  readonly resultJson: GuidedInspectionArtifactRefV1 & {
    readonly name: "result.json";
    readonly role: "canonical-truth";
    readonly required: true;
  };
  readonly derivedArtifacts: readonly GuidedInspectionArtifactRefV1[];
  readonly localOnly: true;
  readonly outputDir: string;
}

export function createGuidedInspectionArtifactContractV1(
  input: GuidedInspectionArtifactContractInputV1,
): GuidedInspectionArtifactContractV1 {
  const contract = createGuidedInspectionArtifactContract(input);

  return {
    canonicalTruth: contract.canonicalTruth,
    resultJson: canonicalTruthRef(contract.resultJson),
    derivedArtifacts: derivedArtifactRefs(contract.derivedArtifacts, () => false),
    localOnly: contract.localOnly,
  };
}

export function consumeGuidedInspectionDemoEnvelopeV1(
  envelope: GuidedInspectionDemoEnvelopeV1,
): GuidedInspectionConsumerProofV1 {
  const proof = createGuidedInspectionConsumerProof(envelope);

  return {
    canonicalTruth: proof.canonicalTruth,
    resultJson: canonicalTruthRef(proof.resultJson),
    derivedArtifacts: derivedArtifactRefs(proof.derivedArtifacts, (name) => name === "guide.html"),
    localOnly: proof.localOnly,
    outputDir: proof.outputDir,
  };
}

function canonicalTruthRef(path: string): GuidedInspectionConsumerProofV1["resultJson"] {
  return {
    name: CANONICAL_TRUTH,
    path,
    role: "canonical-truth",
    required: true,
  };
}

function derivedArtifactRefs(
  artifacts: Readonly<Record<string, string>>,
  requiredForName: (name: (typeof DERIVED_ARTIFACT_NAMES)[number]) => boolean,
): readonly GuidedInspectionArtifactRefV1[] {
  return DERIVED_ARTIFACT_NAMES.flatMap((name) => {
    const path = artifacts[name];

    return typeof path === "string"
      ? [{
        name,
        path,
        role: "derived-inspection-artifact",
        required: requiredForName(name),
      }]
      : [];
  });
}
