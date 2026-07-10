import type { AcceptedGeometry } from "../geometry-observation.js";
import {
  createControlledProviderObservationAcceptanceProofV1,
  type ControlledProviderObservationAcceptanceBoundaryV1,
  type ControlledProviderObservationAcceptanceProofV1,
} from "./controlled-provider-observation-acceptance-proof.js";
import type { ControlledProviderObservationContractV1 } from "./controlled-provider-observation-contract.js";

export interface ControlledProviderObservationToCoreHandoffV1 {
  readonly kind: "norma.controlled-provider-observation-to-core-handoff.v1";
  readonly version: 1;
  readonly status: "blocked_unapproved_mapping_boundary";
  readonly ok: false;
  readonly providerObservationAuthority: "candidateEvidenceOnly";
  readonly boundarySourceTruth: "acceptedStructuredGeometry";
  readonly coreInputAuthority: "acceptedStructuredGeometry";
  readonly acceptedGeometryIsOnlyCoreInput: true;
  readonly acceptedStructuredGeometryValidated: true;
  readonly acceptanceBoundaryExplicit: true;
  readonly providerSelfAcceptance: false;
  readonly providerGeometryCreated: false;
  readonly mappingBoundaryApproved: false;
  readonly mappingAttempted: false;
  readonly coreInputProduced: false;
  readonly structuredAnalyzeInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
  readonly providerObservationId: string;
  readonly providerObservationContentIdentity: string;
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly acceptedGeometryRevisionContentIdentity: string;
  readonly blockedReason: "provider_observation_mapping_boundary_unapproved";
  readonly nextAllowedStep: "approve_provider_observation_mapping_boundary";
}

const INPUT_FIELDS = Object.freeze([
  "providerObservationContract",
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
] as const);

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

class ControlledProviderObservationToCoreHandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledProviderObservationToCoreHandoffError";
  }
}

export function createControlledProviderObservationToCoreHandoffV1(
  input: unknown,
): ControlledProviderObservationToCoreHandoffV1 {
  const record = requirePlainRecord(input, "input");
  rejectUnknownFields(record, INPUT_FIELDS, "input");
  const seen = new WeakSet<object>();
  for (const field of INPUT_FIELDS) {
    const path = `input.${field}`;
    const fieldRecord = requirePlainOwnDataRecord(record, field, path);
    requirePlainData(fieldRecord, path, seen, 0);
  }
  const inputSnapshot = snapshotInput(record);

  const providerObservationContract = requirePlainOwnRecord(
    inputSnapshot,
    "providerObservationContract",
    "input.providerObservationContract",
  ) as unknown as ControlledProviderObservationContractV1;
  const acceptanceBoundary = requirePlainOwnRecord(
    inputSnapshot,
    "acceptanceBoundary",
    "input.acceptanceBoundary",
  ) as unknown as ControlledProviderObservationAcceptanceBoundaryV1;
  const acceptedStructuredGeometry = requirePlainOwnRecord(
    inputSnapshot,
    "acceptedStructuredGeometry",
    "input.acceptedStructuredGeometry",
  ) as unknown as AcceptedGeometry;

  const acceptanceProof = createControlledProviderObservationAcceptanceProofV1({
    providerObservationContract,
    acceptanceBoundary,
    acceptedStructuredGeometry,
  });

  return createBlockedHandoffResult(acceptanceProof);
}

function createBlockedHandoffResult(
  proof: ControlledProviderObservationAcceptanceProofV1,
): ControlledProviderObservationToCoreHandoffV1 {
  return {
    kind: "norma.controlled-provider-observation-to-core-handoff.v1",
    version: 1,
    status: "blocked_unapproved_mapping_boundary",
    ok: false,
    providerObservationAuthority: "candidateEvidenceOnly",
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    acceptedGeometryIsOnlyCoreInput: true,
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    mappingBoundaryApproved: false,
    mappingAttempted: false,
    coreInputProduced: false,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    providerObservationId: proof.providerObservationId,
    providerObservationContentIdentity: proof.providerObservationContentIdentity,
    acceptedGeometryId: proof.acceptedGeometryId,
    acceptedGeometryContentIdentity: proof.acceptedGeometryContentIdentity,
    acceptedGeometryRevisionContentIdentity: proof.acceptedGeometryRevisionContentIdentity,
    blockedReason: "provider_observation_mapping_boundary_unapproved",
    nextAllowedStep: "approve_provider_observation_mapping_boundary",
  };
}

function snapshotInput(record: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(record) as Record<string, unknown>;
  } catch {
    throw invalid("input", "requires snapshot-compatible data");
  }
}

function requirePlainOwnRecord(
  record: Record<string, unknown>,
  field: string,
  path = field,
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(record, field)) {
    throw invalid(path, "requires own field");
  }

  return requirePlainRecord(record[field], path);
}

function requirePlainOwnDataRecord(
  record: Record<string, unknown>,
  field: string,
  path: string,
): Record<string, unknown> {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (descriptor === undefined) {
    throw invalid(path, "requires own field");
  }
  if (!("value" in descriptor)) {
    throw invalid(path, "requires own data field");
  }

  return requirePlainRecord(descriptor.value, path);
}

function requirePlainData(
  value: unknown,
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  if (isProxy(value)) {
    throw invalid(path, "must not be a Proxy");
  }
  if (depth > 64) {
    throw invalid(path, "exceeds maximum plain-data depth");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw invalid(path, "requires finite JSON number");
    }
    return;
  }
  if (typeof value !== "object") {
    throw invalid(path, "requires JSON-compatible plain data");
  }
  if (seen.has(value)) {
    throw invalid(path, "must not contain cycles");
  }
  seen.add(value);

  if (Array.isArray(value)) {
    requirePlainArrayData(value, path, seen, depth);
    seen.delete(value);
    return;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }
  requireEnumerableDataProperties(value as Record<string, unknown>, path, seen, depth);
  seen.delete(value);
}

function requirePlainArrayData(
  value: unknown[],
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw invalid(path, "requires plain array");
  }

  let indexCount = 0;
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") {
      continue;
    }
    if (typeof key !== "string" || !isCanonicalArrayIndex(key, value.length)) {
      throw invalid(`${path}.[field]`, "requires array index data only");
    }
    indexCount += 1;
    requireEnumerableDataDescriptor(value, key, `${path}[${key}]`, seen, depth);
  }
  if (indexCount !== value.length) {
    throw invalid(path, "requires dense array data");
  }
}

function requireEnumerableDataProperties(
  value: Record<string, unknown>,
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw invalid(`${path}.[symbol]`, "requires string-keyed plain data");
    }
    requireEnumerableDataDescriptor(value, key, `${path}.${key}`, seen, depth);
  }
}

function requireEnumerableDataDescriptor(
  value: object,
  key: PropertyKey,
  path: string,
  seen: WeakSet<object>,
  depth: number,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
    throw invalid(path, "requires enumerable own data field");
  }
  requirePlainData(descriptor.value, path, seen, depth + 1);
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function requirePlainRecord(value: unknown, path: string): Record<string, unknown> {
  if (isProxy(value)) {
    throw invalid(path, "must not be a Proxy");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(path, "requires plain object");
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }

  return value as Record<string, unknown>;
}

function isProxy(value: unknown): boolean {
  if (nodeUtilTypes?.isProxy === undefined) {
    throw invalid("runtime", "requires Node proxy detection");
  }

  return nodeUtilTypes.isProxy(value);
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  expectedFields: readonly string[],
  path: string,
): void {
  const expected = new Set<string>(expectedFields);
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string" || !expected.has(key)) {
      const fieldPath = typeof key === "string" ? `${path}.${key}` : `${path}.[symbol]`;
      throw invalid(fieldPath, "unknown field");
    }
  }
}

function invalid(field: string, reason: string): ControlledProviderObservationToCoreHandoffError {
  return new ControlledProviderObservationToCoreHandoffError(
    `Invalid controlled provider observation to Core handoff field "${field}": ${reason}.`,
  );
}
