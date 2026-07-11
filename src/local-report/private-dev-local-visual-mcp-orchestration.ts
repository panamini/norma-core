import {
  validateLocalVisualCandidateObservationEnvelopeV1,
  validateLocalVisualHumanCandidateSelectionV1,
  validateLocalVisualProviderExecutionReceiptV1,
  type LocalVisualCandidateObservationEnvelopeV1,
  type LocalVisualHumanCandidateSelectionV1,
  type LocalVisualProviderExecutionReceiptV1,
} from "./controlled-local-live-visual-candidate-observation-contracts.js";
import {
  createControlledLocalLiveVisualCandidateResumeV1,
} from "./controlled-local-live-visual-candidate-observation-demo.js";
import {
  computeControlledProviderObservationContractContentIdentityV1,
} from "./controlled-provider-observation-acceptance-proof.js";
import {
  restoreControlledProviderObservationContractV2FromReceipt,
} from "./controlled-provider-observation-contract.js";

export const PRIVATE_DEV_LOCAL_VISUAL_MCP_ARTIFACT_NAMES = Object.freeze({
  providerExecutionReceipt: "provider-execution-receipt.json",
  candidateObservation: "candidate-observation.json",
  humanSelection: "human-candidate-selection.json",
  outputDirectory: "norma-output",
} as const);

export const PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_CANDIDATES = 64;

export const PRIVATE_DEV_LOCAL_VISUAL_MCP_OUTPUT_ARTIFACTS = Object.freeze([
  "canonical-result-proof.json",
  "derived-artifacts.json",
  "local-result-evidence.json",
  "report.html",
  "result.json",
  "summary.json",
  "summary.md",
  "visual.svg",
] as const);

export type PrivateDevLocalVisualMcpErrorCode =
  | "artifact_contract_invalid"
  | "artifact_linkage_mismatch"
  | "invalid_resume_confirmation"
  | "invalid_accepted_at"
  | "stale_provider_execution_receipt"
  | "stale_candidate_observation"
  | "stale_human_selection"
  | "unsafe_canonical_result"
  | "resume_failed";

export class PrivateDevLocalVisualMcpError extends Error {
  readonly code: PrivateDevLocalVisualMcpErrorCode;

  constructor(code: PrivateDevLocalVisualMcpErrorCode) {
    super(code);
    this.name = "PrivateDevLocalVisualMcpError";
    this.code = code;
  }
}

export interface PrivateDevLocalVisualMcpJobArtifactsV1 {
  readonly providerExecutionReceipt: unknown;
  readonly candidateObservationEnvelope: unknown;
  readonly humanCandidateSelection: unknown;
}

export interface PrivateDevLocalVisualMcpInspectionV1 {
  readonly kind: "norma.private-dev-local-visual-mcp-job-inspection.v1";
  readonly version: 1;
  readonly status: "ready_to_resume";
  readonly providerExecutionReceiptContentIdentity: string;
  readonly candidateObservationContentIdentity: string;
  readonly humanSelectionContentIdentity: string;
  readonly candidateCount: number;
  readonly selectedCandidateCount: number;
  readonly resumeAllowed: true;
  readonly logicalArtifacts: typeof PRIVATE_DEV_LOCAL_VISUAL_MCP_ARTIFACT_NAMES;
  readonly acceptedGeometryProduced: false;
  readonly coreInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
  readonly networkTransportUsed: false;
  readonly redacted: true;
}

export interface PrivateDevLocalVisualMcpResumeRequestV1 {
  readonly expectedProviderExecutionReceiptContentIdentity: string;
  readonly expectedCandidateObservationContentIdentity: string;
  readonly expectedHumanSelectionContentIdentity: string;
  readonly acceptedAt: string;
  readonly confirmResumeFinalizedSelection: true;
}

export interface PrivateDevLocalVisualMcpResumeResultV1 {
  readonly kind: "norma.private-dev-local-visual-mcp-resume.v1";
  readonly version: 1;
  readonly status: "completed";
  readonly providerExecutionReceiptContentIdentity: string;
  readonly candidateObservationContentIdentity: string;
  readonly humanSelectionContentIdentity: string;
  readonly canonicalResultJsonContentIdentity: string;
  readonly canonicalResultJson: "result.json";
  readonly artifacts: typeof PRIVATE_DEV_LOCAL_VISUAL_MCP_OUTPUT_ARTIFACTS;
  readonly canonicalTruth: "result.json";
  readonly derivedArtifactsAuthoritative: false;
  readonly mcpEnvelopeAuthoritative: false;
  readonly explicitHumanSelectionValidated: true;
  readonly acceptedGeometryProduced: true;
  readonly coreInputProduced: true;
  readonly structuredAnalyzeRun: true;
  readonly resultJsonProduced: true;
  readonly providerMetadataInfluencedComputation: false;
  readonly networkTransportUsed: false;
  readonly redacted: true;
}

export interface PrivateDevLocalVisualMcpResumeExecutionV1 {
  readonly result: PrivateDevLocalVisualMcpResumeResultV1;
  readonly artifactContents: Readonly<Record<string, string>>;
}

interface ValidatedJobArtifactsV1 {
  readonly receipt: LocalVisualProviderExecutionReceiptV1;
  readonly candidate: LocalVisualCandidateObservationEnvelopeV1;
  readonly selection: LocalVisualHumanCandidateSelectionV1;
}

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const RFC3339_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

export function inspectPrivateDevLocalVisualMcpJobV1(
  artifacts: PrivateDevLocalVisualMcpJobArtifactsV1,
): PrivateDevLocalVisualMcpInspectionV1 {
  const { receipt, candidate, selection } = validateJobArtifacts(artifacts);
  return {
    kind: "norma.private-dev-local-visual-mcp-job-inspection.v1",
    version: 1,
    status: "ready_to_resume",
    providerExecutionReceiptContentIdentity: receipt.executionReceiptContentIdentity,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    humanSelectionContentIdentity: selection.selectionContentIdentity,
    candidateCount: candidate.rectangleCandidates.length,
    selectedCandidateCount: selection.selections.length,
    resumeAllowed: true,
    logicalArtifacts: PRIVATE_DEV_LOCAL_VISUAL_MCP_ARTIFACT_NAMES,
    acceptedGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    networkTransportUsed: false,
    redacted: true,
  };
}

export function resumePrivateDevLocalVisualMcpJobV1(
  artifacts: PrivateDevLocalVisualMcpJobArtifactsV1,
  request: PrivateDevLocalVisualMcpResumeRequestV1,
): PrivateDevLocalVisualMcpResumeExecutionV1 {
  const validated = validateJobArtifacts(artifacts);
  validateResumeRequest(request, validated);

  let resume;
  try {
    resume = createControlledLocalLiveVisualCandidateResumeV1({
      providerExecutionReceipt: validated.receipt,
      candidateObservationEnvelope: validated.candidate,
      humanCandidateSelection: validated.selection,
      acceptedAt: request.acceptedAt,
    });
  } catch {
    throw new PrivateDevLocalVisualMcpError("resume_failed");
  }

  const canonicalResultJson = resume.artifacts["result.json"];
  if (typeof canonicalResultJson !== "string" || canonicalResultJson.length === 0) {
    throw new PrivateDevLocalVisualMcpError("unsafe_canonical_result");
  }

  const artifactNames = Object.keys(resume.artifacts).sort();
  if (artifactNames.join("\0") !== PRIVATE_DEV_LOCAL_VISUAL_MCP_OUTPUT_ARTIFACTS.join("\0")) {
    throw new PrivateDevLocalVisualMcpError("resume_failed");
  }

  return {
    result: {
      kind: "norma.private-dev-local-visual-mcp-resume.v1",
      version: 1,
      status: "completed",
      providerExecutionReceiptContentIdentity: validated.receipt.executionReceiptContentIdentity,
      candidateObservationContentIdentity: validated.candidate.observationContentIdentity,
      humanSelectionContentIdentity: validated.selection.selectionContentIdentity,
      canonicalResultJsonContentIdentity:
        resume.execution.handoff.canonicalResultJsonContentIdentity,
      canonicalResultJson: "result.json",
      artifacts: PRIVATE_DEV_LOCAL_VISUAL_MCP_OUTPUT_ARTIFACTS,
      canonicalTruth: "result.json",
      derivedArtifactsAuthoritative: false,
      mcpEnvelopeAuthoritative: false,
      explicitHumanSelectionValidated: true,
      acceptedGeometryProduced: true,
      coreInputProduced: true,
      structuredAnalyzeRun: true,
      resultJsonProduced: true,
      providerMetadataInfluencedComputation: false,
      networkTransportUsed: false,
      redacted: true,
    },
    artifactContents: resume.artifacts,
  };
}

function validateJobArtifacts(
  artifacts: PrivateDevLocalVisualMcpJobArtifactsV1,
): ValidatedJobArtifactsV1 {
  let receipt: LocalVisualProviderExecutionReceiptV1;
  let candidate: LocalVisualCandidateObservationEnvelopeV1;
  let selection: LocalVisualHumanCandidateSelectionV1;
  try {
    receipt = validateLocalVisualProviderExecutionReceiptV1(artifacts.providerExecutionReceipt);
    candidate = validateLocalVisualCandidateObservationEnvelopeV1(artifacts.candidateObservationEnvelope);
    validateLocalVisualHumanCandidateSelectionV1(candidate, artifacts.humanCandidateSelection);
    selection = structuredClone(artifacts.humanCandidateSelection) as LocalVisualHumanCandidateSelectionV1;
  } catch {
    throw new PrivateDevLocalVisualMcpError("artifact_contract_invalid");
  }

  if (candidate.rectangleCandidates.length > PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_CANDIDATES) {
    throw new PrivateDevLocalVisualMcpError("artifact_contract_invalid");
  }

  try {
    const receiptObservation = restoreControlledProviderObservationContractV2FromReceipt(receipt);
    const receiptObservationContentIdentity =
      computeControlledProviderObservationContractContentIdentityV1(receiptObservation);
    if (candidate.provenance.providerExecutionReceiptContentIdentity
        !== receipt.executionReceiptContentIdentity
      || candidate.provenance.sourceReceiptObservationId !== receiptObservation.observationId
      || candidate.provenance.sourceReceiptObservationContentIdentity
        !== receiptObservationContentIdentity
      || candidate.sourceImage.contentIdentity !== receipt.sourceImageContentIdentity
      || selection.providerExecutionReceiptContentIdentity
        !== receipt.executionReceiptContentIdentity) {
      throw new PrivateDevLocalVisualMcpError("artifact_linkage_mismatch");
    }
  } catch (error) {
    if (error instanceof PrivateDevLocalVisualMcpError) throw error;
    throw new PrivateDevLocalVisualMcpError("artifact_linkage_mismatch");
  }

  return { receipt, candidate, selection };
}

function validateResumeRequest(
  request: PrivateDevLocalVisualMcpResumeRequestV1,
  artifacts: ValidatedJobArtifactsV1,
): void {
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    throw new PrivateDevLocalVisualMcpError("artifact_contract_invalid");
  }
  if (request.confirmResumeFinalizedSelection !== true) {
    throw new PrivateDevLocalVisualMcpError("invalid_resume_confirmation");
  }
  if (!RFC3339_UTC_PATTERN.test(request.acceptedAt)) {
    throw new PrivateDevLocalVisualMcpError("invalid_accepted_at");
  }
  const acceptedAt = new Date(request.acceptedAt);
  const normalizedAcceptedAt = request.acceptedAt.includes(".")
    ? request.acceptedAt
    : request.acceptedAt.replace(/Z$/u, ".000Z");
  if (!Number.isFinite(acceptedAt.getTime()) || acceptedAt.toISOString() !== normalizedAcceptedAt) {
    throw new PrivateDevLocalVisualMcpError("invalid_accepted_at");
  }
  for (const identity of [
    request.expectedProviderExecutionReceiptContentIdentity,
    request.expectedCandidateObservationContentIdentity,
    request.expectedHumanSelectionContentIdentity,
  ]) {
    if (!SHA256_PATTERN.test(identity)) {
      throw new PrivateDevLocalVisualMcpError("artifact_contract_invalid");
    }
  }
  if (request.expectedProviderExecutionReceiptContentIdentity
      !== artifacts.receipt.executionReceiptContentIdentity) {
    throw new PrivateDevLocalVisualMcpError("stale_provider_execution_receipt");
  }
  if (request.expectedCandidateObservationContentIdentity
      !== artifacts.candidate.observationContentIdentity) {
    throw new PrivateDevLocalVisualMcpError("stale_candidate_observation");
  }
  if (request.expectedHumanSelectionContentIdentity
      !== artifacts.selection.selectionContentIdentity) {
    throw new PrivateDevLocalVisualMcpError("stale_human_selection");
  }
}
