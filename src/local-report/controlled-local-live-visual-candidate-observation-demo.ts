import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  type AcceptedGeometry,
} from "../geometry-observation.js";
import {
  serializeCanonicalJson,
  STABLE_SERIALIZATION_POLICY,
} from "../serialization.js";
import {
  createControlledLiveProviderCandidateArtifactProofV1,
  createControlledLiveProviderSmokeArtifactProofV1,
  type ControlledLiveProviderCandidateArtifactProofV1,
} from "./controlled-live-provider-smoke-artifact-proof.js";
import {
  createControlledLiveProviderEvidenceEnvelopeV1,
  createControlledLiveProviderSmokeSummaryV1,
  detectControlledLiveProviderSmokeImageV1,
} from "./controlled-live-provider-smoke.js";
import {
  createControlledProviderObservationAcceptanceProofV1,
  computeControlledProviderObservationContractContentIdentityV1,
  type ControlledProviderObservationAcceptanceBoundaryV1,
} from "./controlled-provider-observation-acceptance-proof.js";
import {
  createControlledProviderObservationContractV2,
  restoreControlledProviderObservationContractV2FromReceipt,
  type ControlledProviderObservationContractV2,
} from "./controlled-provider-observation-contract.js";
import {
  createControlledProviderObservationCandidateToCoreExecutionV1,
  type ControlledProviderObservationCandidateToCoreExecutionV1,
} from "./controlled-provider-observation-to-core-handoff.js";
import {
  computeLocalVisualHumanCandidateSelectionContentIdentityV1,
  createAcceptedGeometryFromLocalVisualHumanSelectionV1,
  createLocalVisualCandidateObservationEnvelopeV1,
  createLocalVisualProviderExecutionReceiptV1,
  decodeValidatedLocalVisualImageDimensionsV1,
  validateLocalVisualCandidateObservationEnvelopeV1,
  validateLocalVisualHumanCandidateSelectionV1,
  validateLocalVisualProviderExecutionReceiptV1,
  type LocalVisualCandidateObservationEnvelopeV1,
  type LocalVisualHumanCandidateSelectionV1,
  type LocalVisualProviderExecutionReceiptV1,
  type LocalVisualRectangleCandidateV1,
} from "./controlled-local-live-visual-candidate-observation-contracts.js";
import {
  createLocalStructuredAnalyzeReportBundle,
  type LocalStructuredAnalyzeReportArtifacts,
} from "./structured-analyze-report.js";

export interface ControlledLocalLiveVisualCandidateCaptureV1 {
  readonly kind: "norma.controlled-local-live-visual-candidate-capture.v1";
  readonly version: 1;
  readonly status: "selection_required";
  readonly providerExecutionReceipt: LocalVisualProviderExecutionReceiptV1;
  readonly candidateArtifactProof: ControlledLiveProviderCandidateArtifactProofV1;
  readonly providerObservationContract: ControlledProviderObservationContractV2;
  readonly candidateObservationEnvelope: LocalVisualCandidateObservationEnvelopeV1;
  readonly persistedArtifactNames: readonly [
    "provider-execution-receipt.json",
    "candidate-observation.json",
  ];
  readonly acceptedGeometryProduced: false;
  readonly coreInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
}

export interface ControlledLocalLiveVisualCandidateTraceV1 {
  readonly providerExecutionReceiptContentIdentity: string;
  readonly candidateObservationId: string;
  readonly candidateObservationContentIdentity: string;
  readonly humanSelectionId: string;
  readonly humanSelectionContentIdentity: string;
}

export interface ControlledLocalLiveVisualCandidateResumeV1 {
  readonly kind: "norma.controlled-local-live-visual-candidate-resume.v1";
  readonly version: 1;
  readonly status: "completed";
  readonly trace: ControlledLocalLiveVisualCandidateTraceV1;
  readonly acceptedGeometry: AcceptedGeometry;
  readonly acceptanceBoundary: ControlledProviderObservationAcceptanceBoundaryV1;
  readonly execution: ControlledProviderObservationCandidateToCoreExecutionV1;
  readonly artifacts: Readonly<Record<string, string>>;
}

export type ControlledLocalLiveVisualCandidateDemoErrorCode =
  | "InvalidSourceImage"
  | "InvalidProviderResponseStatus"
  | "InvalidProviderResponseEncoding"
  | "MalformedProviderResponse"
  | "MalformedProviderStatus"
  | "MalformedProviderSchema"
  | "CandidateEvidenceMismatch"
  | "InvalidHumanSelection"
  | "ResultIdentityMismatch";

export class ControlledLocalLiveVisualCandidateDemoError extends Error {
  readonly code: ControlledLocalLiveVisualCandidateDemoErrorCode;

  constructor(code: ControlledLocalLiveVisualCandidateDemoErrorCode) {
    super(code);
    this.name = "ControlledLocalLiveVisualCandidateDemoError";
    this.code = code;
  }
}

const PROVIDER_RECTANGLE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "rectangles"],
  properties: {
    schemaVersion: { type: "string", const: "controlled-rectangle-candidates@1" },
    rectangles: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["x", "y", "width", "height", "providerConfidence"],
        properties: {
          x: { type: "number", minimum: 0, maximum: 1 },
          y: { type: "number", minimum: 0, maximum: 1 },
          width: { type: "number", exclusiveMinimum: 0, maximum: 1 },
          height: { type: "number", exclusiveMinimum: 0, maximum: 1 },
          providerConfidence: {
            anyOf: [
              { type: "number", minimum: 0, maximum: 1 },
              { type: "null" },
            ],
          },
        },
      },
    },
  },
} as const);

export function createControlledLiveProviderCandidateRequestBodyV1({
  model,
  imageDataUrl,
}: {
  readonly model: string;
  readonly imageDataUrl: string;
}): Record<string, unknown> {
  return {
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Identify every visible rectangular region. Return normalized top-left x, y, width, and height only through the required schema. Use null when no provider confidence is available.",
          },
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "low",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "controlled_rectangle_candidates",
        strict: true,
        schema: PROVIDER_RECTANGLE_SCHEMA,
      },
    },
    reasoning: { effort: "low" },
    max_output_tokens: 1_000,
    store: false,
  };
}

export function createControlledLocalLiveVisualCandidateCaptureV1({
  sourceImageBytes,
  sourceImageMediaType,
  rawProviderResponseBytes,
  responseStatusCode,
  timeoutMs,
}: {
  readonly sourceImageBytes: Uint8Array;
  readonly sourceImageMediaType: "image/png" | "image/jpeg" | "image/webp";
  readonly rawProviderResponseBytes: Uint8Array;
  readonly responseStatusCode: number;
  readonly timeoutMs: number;
}): ControlledLocalLiveVisualCandidateCaptureV1 {
  if (!Number.isInteger(responseStatusCode) || responseStatusCode < 200 || responseStatusCode > 299) {
    throw new ControlledLocalLiveVisualCandidateDemoError("InvalidProviderResponseStatus");
  }

  // The receipt hashes the exact bytes before the adapter decodes or parses them.
  const providerExecutionReceipt = createLocalVisualProviderExecutionReceiptV1({
    sourceImageBytes,
    rawProviderResponseBytes,
  });
  const imageFileName = sourceImageMediaType === "image/png"
    ? "source.png"
    : sourceImageMediaType === "image/jpeg"
      ? "source.jpg"
      : "source.webp";
  const image = detectControlledLiveProviderSmokeImageV1(imageFileName, sourceImageBytes);
  if (image === null || image.mediaType !== sourceImageMediaType) {
    throw new ControlledLocalLiveVisualCandidateDemoError("InvalidSourceImage");
  }
  const dimensions = decodeValidatedLocalVisualImageDimensionsV1(
    sourceImageBytes,
    sourceImageMediaType,
  );
  const providerRectangles = parseProviderRectangleResponse(rawProviderResponseBytes);

  const providerEvidenceEnvelope = createControlledLiveProviderEvidenceEnvelopeV1({
    image,
    responseStatusCode,
    responseOk: true,
    providerOutputObserved: true,
    timeoutMs,
  });
  const summary = createControlledLiveProviderSmokeSummaryV1(providerEvidenceEnvelope);
  const receiptOnlyArtifactProof = createControlledLiveProviderSmokeArtifactProofV1({
    providerEvidenceEnvelope,
    summary,
  });
  const candidateArtifactProof = createControlledLiveProviderCandidateArtifactProofV1({
    artifactProof: receiptOnlyArtifactProof,
    providerExecutionReceipt,
    rawProviderResponseBytes,
  });
  const providerObservationContract = createControlledProviderObservationContractV2({
    artifactProof: candidateArtifactProof,
    providerExecutionReceipt,
  });
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
  const rectangleCandidates: readonly LocalVisualRectangleCandidateV1[] =
    providerRectangles.map((rectangle, order) => ({
      candidateId: `candidate:${String(order)}`,
      order,
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height,
      ...(rectangle.providerConfidence === null
        ? {}
        : { diagnosticMetadata: { providerConfidence: rectangle.providerConfidence } }),
    }));
  const lossyWarnings = providerRectangles.flatMap((rectangle, order) =>
    rectangle.providerConfidence === null
      ? []
      : [{
          warningId: `warning:provider-confidence:${String(order)}`,
          code: "provider-confidence-diagnostic-only" as const,
          candidateId: `candidate:${String(order)}`,
        }],
  );
  const candidateObservationEnvelope = createLocalVisualCandidateObservationEnvelopeV1({
    receipt: providerExecutionReceipt,
    sourceReceiptObservationId: providerObservationContract.observationId,
    sourceReceiptObservationContentIdentity: providerObservationContentIdentity,
    ...dimensions,
    rectangleCandidates,
    lossyWarnings,
  });

  return {
    kind: "norma.controlled-local-live-visual-candidate-capture.v1",
    version: 1,
    status: "selection_required",
    providerExecutionReceipt,
    candidateArtifactProof,
    providerObservationContract,
    candidateObservationEnvelope,
    persistedArtifactNames: [
      "provider-execution-receipt.json",
      "candidate-observation.json",
    ],
    acceptedGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
  };
}

export function createControlledLocalLiveVisualCandidateResumeV1({
  providerExecutionReceipt,
  candidateObservationEnvelope,
  humanCandidateSelection,
  acceptedAt,
}: {
  readonly providerExecutionReceipt: LocalVisualProviderExecutionReceiptV1;
  readonly candidateObservationEnvelope: LocalVisualCandidateObservationEnvelopeV1;
  readonly humanCandidateSelection: LocalVisualHumanCandidateSelectionV1;
  readonly acceptedAt: string;
}): ControlledLocalLiveVisualCandidateResumeV1 {
  try {
    const receipt = validateLocalVisualProviderExecutionReceiptV1(providerExecutionReceipt);
    const candidate = validateLocalVisualCandidateObservationEnvelopeV1(candidateObservationEnvelope);
    const selection = structuredClone(humanCandidateSelection);
    validateLocalVisualHumanCandidateSelectionV1(candidate, selection);
    const providerObservationContract =
      restoreControlledProviderObservationContractV2FromReceipt(receipt);
    const providerObservationContentIdentity =
      computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
    requireEqual(
      candidate.provenance.sourceReceiptObservationId,
      providerObservationContract.observationId,
      "CandidateEvidenceMismatch",
    );
    requireEqual(
      candidate.provenance.sourceReceiptObservationContentIdentity,
      providerObservationContentIdentity,
      "CandidateEvidenceMismatch",
    );
    requireEqual(
      candidate.provenance.providerExecutionReceiptContentIdentity,
      receipt.executionReceiptContentIdentity,
      "CandidateEvidenceMismatch",
    );
    requireEqual(
      candidate.sourceImage.contentIdentity,
      receipt.sourceImageContentIdentity,
      "CandidateEvidenceMismatch",
    );

    const acceptedGeometry = createAcceptedGeometryFromLocalVisualHumanSelectionV1({
      candidateObservationEnvelope: candidate,
      humanCandidateSelection: selection,
      acceptedAt,
    });
    const acceptanceBoundary = createHumanAcceptanceBoundary(
      candidate,
      selection,
      acceptedGeometry,
    );
    const proof = createControlledProviderObservationAcceptanceProofV1({
      providerObservationContract,
      candidateObservationEnvelope: candidate,
      humanCandidateSelection: selection,
      acceptanceBoundary,
      acceptedStructuredGeometry: acceptedGeometry,
    });
    if (!("providerExecutionReceiptContentIdentity" in proof)) {
      throw new ControlledLocalLiveVisualCandidateDemoError("CandidateEvidenceMismatch");
    }
    const execution = createControlledProviderObservationCandidateToCoreExecutionV1({
      providerObservationContract,
      candidateObservationEnvelope: candidate,
      humanCandidateSelection: selection,
      acceptanceBoundary,
      acceptedStructuredGeometry: acceptedGeometry,
    });
    const trace = traceFromExecution(execution);
    const reportBundle = createLocalStructuredAnalyzeReportBundle(execution.structuredAnalyzeInput);
    if (reportBundle.artifacts["result.json"] !== execution.canonicalResultJsonBytes
      || reportBundle.result.serializationSummary === null
      || execution.resultJson.serializationSummary === null
      || reportBundle.result.serializationSummary.meaningfulIdentity
        !== execution.resultJson.serializationSummary.meaningfulIdentity) {
      throw new ControlledLocalLiveVisualCandidateDemoError("ResultIdentityMismatch");
    }
    const localResultEvidence = {
      kind: "norma.controlled-local-live-visual-candidate-result-evidence.v1",
      version: 1,
      status: "completed",
      ...trace,
      acceptedGeometryContentIdentity: execution.handoff.acceptedGeometryContentIdentity,
      mappingResultContentIdentity: execution.handoff.mappingResultContentIdentity,
      normalizationResultContentIdentity: execution.handoff.normalizationResultContentIdentity,
      structuredAnalyzeMeaningfulIdentity: execution.handoff.structuredAnalyzeMeaningfulIdentity,
      canonicalResultJsonContentIdentity: execution.handoff.canonicalResultJsonContentIdentity,
      canonicalTruth: "result.json",
    };
    const canonicalResultProof = {
      kind: "norma.controlled-local-live-visual-canonical-result-proof.v1",
      version: 1,
      ...trace,
      canonicalResultJsonContentIdentity: execution.handoff.canonicalResultJsonContentIdentity,
      exactCanonicalBytesIncludeFinalNewline: true,
      resultSchemaWidened: false,
    };
    const derivedArtifactEvidence = {
      kind: "norma.controlled-local-live-visual-derived-artifacts.v1",
      version: 1,
      ...trace,
      authoritative: false,
      providerMetadataInfluencedComputation: false,
      artifacts: ["summary.json", "summary.md", "visual.svg", "report.html"],
    };
    const tracedReportArtifacts = attachCandidateTraceToDerivedArtifacts(
      reportBundle.artifacts,
      trace,
    );
    const artifacts: Record<string, string> = {
      ...tracedReportArtifacts,
      "result.json": execution.canonicalResultJsonBytes,
      "local-result-evidence.json": canonicalBytes(localResultEvidence),
      "canonical-result-proof.json": canonicalBytes(canonicalResultProof),
      "derived-artifacts.json": canonicalBytes(derivedArtifactEvidence),
    };
    return {
      kind: "norma.controlled-local-live-visual-candidate-resume.v1",
      version: 1,
      status: "completed",
      trace,
      acceptedGeometry,
      acceptanceBoundary,
      execution,
      artifacts,
    };
  } catch (error) {
    if (error instanceof ControlledLocalLiveVisualCandidateDemoError) throw error;
    const message = error instanceof Error ? error.message : "";
    throw new ControlledLocalLiveVisualCandidateDemoError(
      message.includes("selection") || message.includes("Selection")
        ? "InvalidHumanSelection"
        : "CandidateEvidenceMismatch",
    );
  }
}

function attachCandidateTraceToDerivedArtifacts(
  artifacts: LocalStructuredAnalyzeReportArtifacts,
  trace: ControlledLocalLiveVisualCandidateTraceV1,
): Record<string, string> {
  const summary = JSON.parse(artifacts["summary.json"] ?? "null") as unknown;
  if (summary === null || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ControlledLocalLiveVisualCandidateDemoError("ResultIdentityMismatch");
  }
  const traceJson = JSON.stringify(trace);
  const traceHex = encodeUtf8Hex(traceJson);
  const visual = artifacts["visual.svg"];
  const report = artifacts["report.html"];
  if (typeof visual !== "string" || !visual.includes("</svg>")
    || typeof report !== "string" || !report.includes("</body>")) {
    throw new ControlledLocalLiveVisualCandidateDemoError("ResultIdentityMismatch");
  }
  return {
    ...artifacts,
    "summary.json": canonicalBytes({ ...summary, ...trace }),
    "summary.md": `${artifacts["summary.md"]?.trimEnd() ?? ""}\n\n## Candidate trace\n\n\`\`\`json\n${traceJson}\n\`\`\`\n`,
    "visual.svg": visual.replace(
      "</svg>",
      `<metadata id="norma-candidate-trace" data-encoding="utf8-hex">${traceHex}</metadata></svg>`,
    ),
    "report.html": report.replace(
      "</body>",
      `<template id="norma-candidate-trace" data-encoding="utf8-hex">${traceHex}</template></body>`,
    ),
  };
}

function encodeUtf8Hex(value: string): string {
  return Array.from(
    new TextEncoder().encode(value),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function finalizeLocalVisualHumanCandidateSelectionIdentityV1(
  selection: Omit<LocalVisualHumanCandidateSelectionV1, "selectionContentIdentity"> & {
    readonly selectionContentIdentity?: string;
  },
): LocalVisualHumanCandidateSelectionV1 {
  const provisional = {
    ...structuredClone(selection),
    selectionContentIdentity: "",
  } as LocalVisualHumanCandidateSelectionV1;
  return {
    ...provisional,
    selectionContentIdentity:
      computeLocalVisualHumanCandidateSelectionContentIdentityV1(provisional),
  };
}

function parseProviderRectangleResponse(rawBytes: Uint8Array): readonly {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly providerConfidence: number | null;
}[] {
  let rawText: string;
  try {
    rawText = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
  } catch {
    throw new ControlledLocalLiveVisualCandidateDemoError("InvalidProviderResponseEncoding");
  }
  let response: unknown;
  try {
    response = JSON.parse(rawText);
  } catch {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderResponse");
  }
  const responseRecord = providerRecord(response, "MalformedProviderResponse");
  if (responseRecord.status !== "completed" || responseRecord.error !== null) {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderStatus");
  }
  if (!Array.isArray(responseRecord.output) || responseRecord.output.length === 0) {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
  const outputItems = responseRecord.output.map((item) =>
    providerRecord(item, "MalformedProviderSchema"));
  const messageItems = outputItems.filter(({ type }) => type === "message");
  if (messageItems.length !== 1) {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
  const message = messageItems[0]!;
  if (message.type !== "message" || message.status !== "completed" || message.role !== "assistant"
    || !Array.isArray(message.content) || message.content.length !== 1) {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
  const content = providerRecord(message.content[0], "MalformedProviderSchema");
  if (content.type !== "output_text" || typeof content.text !== "string") {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
  let structuredOutput: unknown;
  try {
    structuredOutput = JSON.parse(content.text);
  } catch {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
  const output = providerRecord(structuredOutput, "MalformedProviderSchema");
  requireProviderFields(output, ["schemaVersion", "rectangles"]);
  if (output.schemaVersion !== "controlled-rectangle-candidates@1"
    || !Array.isArray(output.rectangles) || output.rectangles.length === 0) {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
  return output.rectangles.map((item) => {
    const rectangle = providerRecord(item, "MalformedProviderSchema");
    requireProviderFields(rectangle, ["x", "y", "width", "height", "providerConfidence"]);
    for (const field of ["x", "y", "width", "height"] as const) {
      if (typeof rectangle[field] !== "number" || !Number.isFinite(rectangle[field])) {
        throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
      }
    }
    if (rectangle.providerConfidence !== null
      && (typeof rectangle.providerConfidence !== "number"
        || !Number.isFinite(rectangle.providerConfidence)
        || rectangle.providerConfidence < 0
        || rectangle.providerConfidence > 1)) {
      throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
    }
    return rectangle as {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly providerConfidence: number | null;
    };
  });
}

function createHumanAcceptanceBoundary(
  candidate: LocalVisualCandidateObservationEnvelopeV1,
  selection: LocalVisualHumanCandidateSelectionV1,
  accepted: AcceptedGeometry,
): ControlledProviderObservationAcceptanceBoundaryV1 {
  return {
    kind: "norma.controlled-provider-observation-acceptance-boundary.v1",
    version: 1,
    acceptanceActor: structuredClone(selection.acceptanceActor),
    acceptanceMode: "explicit_acceptance",
    providerObservationId: candidate.observationId,
    providerObservationContentIdentity: candidate.observationContentIdentity,
    acceptedGeometryId: accepted.acceptedGeometryId,
    acceptedGeometryContentIdentity: computeAcceptedGeometryContentIdentity(accepted),
    acceptedGeometryRevisionContentIdentity:
      computeAcceptedGeometryRevisionContentIdentity(accepted),
    decisionProvenance: {
      source: "non_provider_explicit_acceptance",
      localOnly: true,
      providerGenerated: false,
      promptDerived: false,
      artifactDerived: false,
      confidenceDerived: false,
      diagnosticDerived: false,
      metadataDerived: false,
    },
    localOnly: true,
    outsideProviderBoundary: true,
    nonProviderAuthority: true,
    providerEvidenceOnly: true,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    promptCanAuthorizeAcceptance: false,
    automaticAcceptance: false,
    providerGeometryCreated: false,
  };
}

function traceFromExecution(
  execution: ControlledProviderObservationCandidateToCoreExecutionV1,
): ControlledLocalLiveVisualCandidateTraceV1 {
  const { handoff } = execution;
  return {
    providerExecutionReceiptContentIdentity:
      handoff.providerExecutionReceiptContentIdentity,
    candidateObservationId: handoff.candidateObservationId,
    candidateObservationContentIdentity: handoff.candidateObservationContentIdentity,
    humanSelectionId: handoff.humanSelectionId,
    humanSelectionContentIdentity: handoff.humanSelectionContentIdentity,
  };
}

function providerRecord(
  value: unknown,
  code: Extract<ControlledLocalLiveVisualCandidateDemoErrorCode, "MalformedProviderResponse" | "MalformedProviderSchema">,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ControlledLocalLiveVisualCandidateDemoError(code);
  }
  return value as Record<string, unknown>;
}

function requireProviderFields(record: Record<string, unknown>, fields: readonly string[]): void {
  const keys = Object.keys(record).sort();
  const expected = [...fields].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new ControlledLocalLiveVisualCandidateDemoError("MalformedProviderSchema");
  }
}

function requireEqual(
  actual: unknown,
  expected: unknown,
  code: ControlledLocalLiveVisualCandidateDemoErrorCode,
): void {
  if (actual !== expected) throw new ControlledLocalLiveVisualCandidateDemoError(code);
}

function canonicalBytes(value: unknown): string {
  return `${serializeCanonicalJson(value, STABLE_SERIALIZATION_POLICY)}\n`;
}
