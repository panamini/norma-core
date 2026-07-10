import {
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
  mapAcceptedGeometryToCoreV1,
  type AcceptedGeometryToCoreMappingRequestV1,
  type AcceptedGeometryToCoreMappingResultV1,
} from "../accepted-geometry-to-core-mapping.js";
import type { AcceptedGeometry } from "../geometry-observation.js";
import {
  createControlledProviderObservationAcceptanceProofV1,
  type ControlledProviderObservationAcceptanceBoundaryV1,
  type ControlledProviderObservationAcceptanceProofV1,
} from "./controlled-provider-observation-acceptance-proof.js";
import type { ControlledProviderObservationContractV1 } from "./controlled-provider-observation-contract.js";

type MappedComposition2D = NonNullable<AcceptedGeometryToCoreMappingResultV1["mappedGeometry"]>;

export interface ControlledProviderObservationToCoreHandoffV1 {
  readonly kind: "norma.controlled-provider-observation-to-core-handoff.v1";
  readonly version: 1;
  readonly status: AcceptedGeometryToCoreMappingResultV1["status"];
  readonly ok: boolean;
  readonly providerObservationAuthority: "candidateEvidenceOnly";
  readonly boundarySourceTruth: "acceptedStructuredGeometry";
  readonly coreInputAuthority: "acceptedStructuredGeometry";
  readonly acceptedGeometryIsOnlyCoreInput: true;
  readonly acceptedStructuredGeometryValidated: true;
  readonly acceptanceBoundaryExplicit: true;
  readonly providerSelfAcceptance: false;
  readonly providerGeometryCreated: false;
  readonly coreInputProduced: boolean;
  readonly structuredAnalyzeInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
  readonly mappedGeometryAuthority: "derivedHandoffOutput";
  readonly mappedGeometrySourceTruth: false;
  readonly providerObservationId: string;
  readonly providerObservationContentIdentity: string;
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly acceptedGeometryRevisionContentIdentity: string;
  readonly mappingResult: AcceptedGeometryToCoreMappingResultV1;
  readonly mappedComposition2D?: MappedComposition2D;
  readonly nextAllowedStep: "explicit_comparison_input_construction" | null;
}

const INPUT_FIELDS = Object.freeze([
  "providerObservationContract",
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
] as const);

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
  for (const field of INPUT_FIELDS) {
    requirePlainOwnDataRecord(record, field, `input.${field}`);
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
  const mappingResult = mapAcceptedGeometryToCoreV1(
    createMappingRequest(acceptedStructuredGeometry),
  );

  return createHandoffResult(acceptanceProof, mappingResult);
}

function createMappingRequest(
  acceptedStructuredGeometry: AcceptedGeometry,
): AcceptedGeometryToCoreMappingRequestV1 {
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `controlled-provider-observation-to-core-handoff:v1:${acceptedStructuredGeometry.acceptedGeometryId}`,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry: acceptedStructuredGeometry,
    acceptedGeometryContentIdentity: acceptedStructuredGeometry.contentIdentity,
    sourceObservationId: acceptedStructuredGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedStructuredGeometry.sourceObservationContentIdentity,
    mappingContext: {
      boundary: "synthetic-only",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
  };
}

function createHandoffResult(
  proof: ControlledProviderObservationAcceptanceProofV1,
  mappingResult: AcceptedGeometryToCoreMappingResultV1,
): ControlledProviderObservationToCoreHandoffV1 {
  const mappedComposition2D = mappingResult.ok && mappingResult.mappedGeometry !== null
    ? mappingResult.mappedGeometry
    : undefined;

  return {
    kind: "norma.controlled-provider-observation-to-core-handoff.v1",
    version: 1,
    status: mappingResult.status,
    ok: mappingResult.ok,
    providerObservationAuthority: "candidateEvidenceOnly",
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    acceptedGeometryIsOnlyCoreInput: true,
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    coreInputProduced: mappingResult.ok,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    mappedGeometryAuthority: "derivedHandoffOutput",
    mappedGeometrySourceTruth: false,
    providerObservationId: proof.providerObservationId,
    providerObservationContentIdentity: proof.providerObservationContentIdentity,
    acceptedGeometryId: proof.acceptedGeometryId,
    acceptedGeometryContentIdentity: proof.acceptedGeometryContentIdentity,
    acceptedGeometryRevisionContentIdentity: proof.acceptedGeometryRevisionContentIdentity,
    mappingResult,
    ...(mappedComposition2D === undefined ? {} : { mappedComposition2D }),
    nextAllowedStep: mappingResult.ok ? "explicit_comparison_input_construction" : null,
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

function requirePlainRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(path, "requires plain object");
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }

  return value as Record<string, unknown>;
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
