import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "../serialization.js";
import {
  decodeValidatedLocalVisualImageDimensionsV1,
  sha256ContentIdentityV1,
  validateLocalVisualCandidateObservationEnvelopeV1,
  validateLocalVisualHumanCandidateSelectionV1,
  validateLocalVisualProviderExecutionReceiptV1,
  type LocalVisualCandidateObservationEnvelopeV1,
  type LocalVisualHumanCandidateSelectionV1,
  type LocalVisualProviderExecutionReceiptV1,
} from "./controlled-local-live-visual-candidate-observation-contracts.js";
import { finalizeLocalVisualHumanCandidateSelectionIdentityV1 } from "./controlled-local-live-visual-candidate-observation-demo.js";

type NodeUtilModule = {
  readonly types?: {
    readonly isProxy?: (value: unknown) => boolean;
  };
};

const nodeProcess = globalThis as typeof globalThis & {
  readonly process?: {
    readonly getBuiltinModule?: (id: string) => unknown;
  };
};
const nodeUtilTypes = (
  nodeProcess.process?.getBuiltinModule?.("node:util") as NodeUtilModule | undefined
)?.types;

export const LOCAL_VISUAL_CANDIDATE_OBSERVATION_MAX_BYTES = 256 * 1024;
export const LOCAL_VISUAL_SELECTION_INTENT_MAX_BYTES = 64 * 1024;
export const LOCAL_VISUAL_SOURCE_PNG_MAX_BYTES = 2 * 1024 * 1024;
export const LOCAL_VISUAL_SELECTION_MAX_CANDIDATES = 64;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const INTENT_FIELDS = Object.freeze([
  "contractId",
  "contractVersion",
  "candidateObservationId",
  "candidateObservationContentIdentity",
  "providerExecutionReceiptContentIdentity",
  "reviewedSourceImageContentIdentity",
  "acceptanceActor",
  "geometryAction",
  "selectedCandidateIds",
] as const);

export interface LocalVisualCandidateSelectionIntentV1 {
  readonly contractId: "norma.local-visual-candidate-selection-intent@1";
  readonly contractVersion: 1;
  readonly candidateObservationId: string;
  readonly candidateObservationContentIdentity: string;
  readonly providerExecutionReceiptContentIdentity: string;
  readonly reviewedSourceImageContentIdentity: string;
  readonly acceptanceActor: {
    readonly actorClass: "human";
    readonly actorId: string;
  };
  readonly geometryAction: "accept_exact";
  readonly selectedCandidateIds: readonly string[];
}

export function validateLocalVisualCandidateSelectionIntentV1(
  value: unknown,
): LocalVisualCandidateSelectionIntentV1 {
  requirePlainJsonData(value, "selectionIntent", new WeakSet<object>(), 0);
  const intent = structuredClone(value) as LocalVisualCandidateSelectionIntentV1;
  requireExactFields(intent, INTENT_FIELDS, "selectionIntent");
  requireValue(intent.contractId, "norma.local-visual-candidate-selection-intent@1", "selectionIntent.contractId");
  requireValue(intent.contractVersion, 1, "selectionIntent.contractVersion");
  requireIdentifier(intent.candidateObservationId, "selectionIntent.candidateObservationId");
  requireSha256(intent.candidateObservationContentIdentity, "selectionIntent.candidateObservationContentIdentity");
  requireSha256(intent.providerExecutionReceiptContentIdentity, "selectionIntent.providerExecutionReceiptContentIdentity");
  requireSha256(intent.reviewedSourceImageContentIdentity, "selectionIntent.reviewedSourceImageContentIdentity");
  requireValue(intent.geometryAction, "accept_exact", "selectionIntent.geometryAction");
  requireExactFields(intent.acceptanceActor, ["actorClass", "actorId"], "selectionIntent.acceptanceActor");
  requireValue(intent.acceptanceActor.actorClass, "human", "selectionIntent.acceptanceActor.actorClass");
  requireIdentifier(intent.acceptanceActor.actorId, "selectionIntent.acceptanceActor.actorId");
  if (!Array.isArray(intent.selectedCandidateIds)
    || intent.selectedCandidateIds.length < 1
    || intent.selectedCandidateIds.length > LOCAL_VISUAL_SELECTION_MAX_CANDIDATES) {
    throw invalid("selectionIntent.selectedCandidateIds", "requires between 1 and 64 candidate IDs");
  }
  const selectedIds = new Set<string>();
  intent.selectedCandidateIds.forEach((candidateId, index) => {
    requireIdentifier(candidateId, `selectionIntent.selectedCandidateIds.${String(index)}`);
    if (selectedIds.has(candidateId)) throw invalid("selectionIntent.selectedCandidateIds", "must be unique");
    selectedIds.add(candidateId);
  });
  return intent;
}

export function finalizeLocalVisualCandidateSelectionIntentV1({
  providerExecutionReceipt,
  candidateObservationEnvelope,
  sourcePngBytes,
  selectionIntent,
  confirmExactSelection,
}: {
  readonly providerExecutionReceipt: unknown;
  readonly candidateObservationEnvelope: unknown;
  readonly sourcePngBytes: Uint8Array;
  readonly selectionIntent: unknown;
  readonly confirmExactSelection: boolean;
}): LocalVisualHumanCandidateSelectionV1 {
  if (confirmExactSelection !== true) throw invalid("confirmExactSelection", "requires explicit confirmation");
  if (!(sourcePngBytes instanceof Uint8Array)
    || sourcePngBytes.byteLength < 1
    || sourcePngBytes.byteLength > LOCAL_VISUAL_SOURCE_PNG_MAX_BYTES) {
    throw invalid("sourcePngBytes", "requires a PNG of at most 2 MiB");
  }

  const receipt = validateLocalVisualProviderExecutionReceiptV1(providerExecutionReceipt);
  const candidate = validateLocalVisualCandidateObservationEnvelopeV1(candidateObservationEnvelope);
  if (candidate.rectangleCandidates.length > LOCAL_VISUAL_SELECTION_MAX_CANDIDATES) {
    throw invalid("candidateObservationEnvelope.rectangleCandidates", "requires at most 64 candidates");
  }
  const intent = validateLocalVisualCandidateSelectionIntentV1(selectionIntent);
  validateLinkage(receipt, candidate, intent, sourcePngBytes);

  const candidatesById = new Map(candidate.rectangleCandidates.map((item, index) => [item.candidateId, index]));
  let previousCandidateIndex = -1;
  const selections = intent.selectedCandidateIds.map((candidateId, order) => {
    const candidateIndex = candidatesById.get(candidateId);
    if (candidateIndex === undefined) throw invalid("selectionIntent.selectedCandidateIds", "contains unknown candidate ID");
    if (candidateIndex <= previousCandidateIndex) {
      throw invalid("selectionIntent.selectedCandidateIds", "must preserve candidate envelope order");
    }
    previousCandidateIndex = candidateIndex;
    return {
      order,
      candidateId,
      acceptedPrimitiveId: `accepted-rectangle:${String(order + 1)}`,
    };
  });

  const intentIdentity = sha256ContentIdentityV1(serializeCanonicalJson(
    intent,
    DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  ));
  const selection = finalizeLocalVisualHumanCandidateSelectionIdentityV1({
    contractId: "norma.local-visual-human-candidate-selection@1",
    contractVersion: 1,
    selectionId: `local-visual-selection:v1:${intentIdentity.slice("sha256:".length)}`,
    candidateObservationId: candidate.observationId,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    providerExecutionReceiptContentIdentity: receipt.executionReceiptContentIdentity,
    acceptanceActor: structuredClone(intent.acceptanceActor),
    geometryAction: "accept_exact",
    selections,
    authority: {
      explicitHumanSelection: true,
      providerAuthority: false,
      confidenceAuthority: false,
      automaticAcceptance: false,
      coordinateCorrectionAllowed: false,
      coordinateRepairAllowed: false,
    },
  });
  validateLocalVisualHumanCandidateSelectionV1(candidate, selection);
  return selection;
}

function validateLinkage(
  receipt: LocalVisualProviderExecutionReceiptV1,
  candidate: LocalVisualCandidateObservationEnvelopeV1,
  intent: LocalVisualCandidateSelectionIntentV1,
  sourcePngBytes: Uint8Array,
): void {
  const imageIdentity = sha256ContentIdentityV1(sourcePngBytes);
  const dimensions = decodeValidatedLocalVisualImageDimensionsV1(sourcePngBytes, "image/png");
  requireValue(receipt.sourceImageContentIdentity, imageIdentity, "providerExecutionReceipt.sourceImageContentIdentity");
  requireValue(candidate.sourceImage.contentIdentity, imageIdentity, "candidateObservationEnvelope.sourceImage.contentIdentity");
  requireValue(intent.reviewedSourceImageContentIdentity, imageIdentity, "selectionIntent.reviewedSourceImageContentIdentity");
  requireValue(candidate.provenance.providerExecutionReceiptContentIdentity, receipt.executionReceiptContentIdentity, "candidateObservationEnvelope.provenance.providerExecutionReceiptContentIdentity");
  requireValue(intent.providerExecutionReceiptContentIdentity, receipt.executionReceiptContentIdentity, "selectionIntent.providerExecutionReceiptContentIdentity");
  requireValue(intent.candidateObservationId, candidate.observationId, "selectionIntent.candidateObservationId");
  requireValue(intent.candidateObservationContentIdentity, candidate.observationContentIdentity, "selectionIntent.candidateObservationContentIdentity");
  requireValue(dimensions.sourcePixelWidth, candidate.coordinateFrame.sourcePixelWidth, "sourcePngBytes.sourcePixelWidth");
  requireValue(dimensions.sourcePixelHeight, candidate.coordinateFrame.sourcePixelHeight, "sourcePngBytes.sourcePixelHeight");
}

function requirePlainJsonData(value: unknown, path: string, seen: WeakSet<object>, depth: number): void {
  if (depth > 64) throw invalid(path, "exceeds maximum depth");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw invalid(path, "requires finite number");
    return;
  }
  if (typeof value !== "object") throw invalid(path, "requires JSON-compatible data");
  if (nodeUtilTypes?.isProxy === undefined) throw invalid("runtime", "requires Node proxy detection");
  if (nodeUtilTypes.isProxy(value)) throw invalid(path, "must not be a Proxy");
  if (seen.has(value)) throw invalid(path, "must not be cyclic or aliased");
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw invalid(`${path}.${String(index)}`, "must not be sparse");
    }
  } else if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === "length") continue;
    if (typeof key !== "string") throw invalid(path, "contains symbol property");
    if (!Array.isArray(value) && ["__proto__", "prototype", "constructor"].includes(key)) {
      throw invalid(`${path}.${key}`, "contains unsafe key");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw invalid(`${path}.${key}`, "requires enumerable data property");
    }
    requirePlainJsonData(descriptor.value, `${path}.${key}`, seen, depth + 1);
  }
}

function requireExactFields(value: object, fields: readonly string[], path: string): void {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")
    || (keys as string[]).sort().join("\0") !== [...fields].sort().join("\0")) {
    throw invalid(path, "requires exact closed fields");
  }
}

function requireIdentifier(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) throw invalid(path, "requires local identifier");
}

function requireSha256(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) throw invalid(path, "requires SHA-256 content identity");
}

function requireValue(actual: unknown, expected: unknown, path: string): void {
  if (actual !== expected) throw invalid(path, `requires ${String(expected)}`);
}

function invalid(path: string, reason: string): Error {
  return new Error(`Invalid local visual candidate selection field "${path}": ${reason}.`);
}
