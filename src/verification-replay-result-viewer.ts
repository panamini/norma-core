export const VERIFICATION_REPLAY_RESULT_VIEWER_SECTION_KEYS = [
  "status",
  "diagnostics",
  "warnings",
  "errors",
  "mismatches",
  "provenance",
  "sourceRefs",
  "outputRefs",
  "artifactFreshness",
  "operationContext",
  "packLocks",
  "tolerancePolicy",
  "serializationVersion",
  "operationVersion",
  "resultIdentity",
  "unknownFields",
] as const;

export type VerificationReplayResultViewerStatus = "displayable" | "rejected";

export type VerificationReplayResultKind =
  | "run-verification"
  | "run-replay"
  | "artifact-freshness-verification"
  | "mvp-demo-result"
  | "unknown";

export type VerificationReplaySourceEnvelopeKind =
  | VerificationReplayResultKind
  | "structured-json-input-display-model"
  | "api-response"
  | "cli-result"
  | "mcp-tool-result"
  | "unknown";

export type VerificationReplayResultSectionKey = (typeof VERIFICATION_REPLAY_RESULT_VIEWER_SECTION_KEYS)[number];

export interface VerificationReplayResultSection {
  readonly key: VerificationReplayResultSectionKey;
  readonly label: string;
  readonly present: boolean;
  readonly value: unknown;
  readonly sourcePath: readonly string[];
}

export type VerificationReplayResultRejectionCode =
  | "MalformedDisplayModel"
  | "MalformedResultEnvelope"
  | "MalformedWrapperEnvelope"
  | "RejectedStructuredJsonInput"
  | "UnsupportedResultKind"
  | "GenericJsonRpcInputRejected"
  | "UnsupportedInput";

export interface VerificationReplayResultRejectionReason {
  readonly code: VerificationReplayResultRejectionCode;
  readonly message: string;
  readonly sourcePath: readonly string[];
}

export interface VerificationReplayInspectableUnknown {
  readonly sourcePath: readonly string[];
  readonly value: unknown;
}

export interface VerificationReplayResultDisplayModel {
  readonly kind: "verification-replay-result-display-model";
  readonly status: VerificationReplayResultViewerStatus;
  readonly resultKind: VerificationReplayResultKind;
  readonly sourceEnvelopeKind: VerificationReplaySourceEnvelopeKind;
  readonly sections: readonly VerificationReplayResultSection[];
  readonly rejectionReasons: readonly VerificationReplayResultRejectionReason[];
  readonly unknownFields: readonly string[];
  readonly inspectableUnknowns: readonly VerificationReplayInspectableUnknown[];
}

type JsonObject = Record<string, unknown>;

interface FoundValue {
  readonly value: unknown;
  readonly sourcePath: readonly string[];
}

interface DirectDisplayInput {
  readonly payload: JsonObject;
  readonly resultKind: Exclude<VerificationReplayResultKind, "unknown">;
  readonly sourceEnvelopeKind: VerificationReplaySourceEnvelopeKind;
  readonly sourcePath: readonly string[];
}

interface StructuredDisplayInput {
  readonly model: StructuredJsonInputDisplayModelLike;
  readonly resultKind: Exclude<VerificationReplayResultKind, "unknown">;
}

interface StructuredJsonInputDisplayModelLike {
  readonly kind: "structured-json-input-display-model";
  readonly status: unknown;
  readonly detectedEnvelopeKind: unknown;
  readonly visibleSections: unknown;
  readonly unknownFields: unknown;
  readonly inspectableUnknowns: unknown;
}

type ResolvedInput =
  | { readonly ok: true; readonly input: DirectDisplayInput | StructuredDisplayInput }
  | { readonly ok: false; readonly reason: VerificationReplayResultRejectionReason };

const BLOCKED_PATH_FIELD = "ro" + "ute";

const RESULT_KIND_SET = new Set<Exclude<VerificationReplayResultKind, "unknown">>([
  "run-verification",
  "run-replay",
  "artifact-freshness-verification",
  "mvp-demo-result",
]);

const APPROVED_MCP_TOOLS = new Set([
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
]);

const STRUCTURED_JSON_VISIBLE_SECTION_KEYS = [
  "status",
  "diagnostics",
  "warnings",
  "errors",
  "mismatchDetails",
  "provenance",
  "sourceRefs",
  "outputRefs",
  "artifactFreshness",
  "operationContext",
  "packLocks",
  "tolerancePolicy",
  "serializationVersion",
  "operationVersion",
  "resultIdentity",
  "unknownFields",
] as const;

const STRUCTURED_JSON_VISIBLE_SECTION_KEY_SET = new Set<string>(STRUCTURED_JSON_VISIBLE_SECTION_KEYS);

const KNOWN_FIELDS_BY_RESULT_KIND = Object.freeze({
  "run-verification": [
    "kind",
    "status",
    "mode",
    "runRef",
    "operationName",
    "operationVersion",
    "packLockRef",
    "operationContextRef",
    "sourceRefs",
    "missingSourceRefs",
    "outputRefs",
    "mismatchCodes",
    "diagnostics",
    "artifactFreshness",
    "warnings",
    "errors",
    "provenance",
    "replaySummary",
    "serializationSummary",
  ],
  "run-replay": [
    "kind",
    "status",
    "replayAttempted",
    "replayRequired",
    "operationName",
    "operationVersion",
    "recordedRunRef",
    "replayedRunRef",
    "packLockRef",
    "operationContextRef",
    "recordedOutputRefs",
    "replayedOutputRefs",
    "sourceRefsUsed",
    "mismatches",
    "diagnostics",
    "verification",
    "artifactFreshness",
    "tolerancePolicy",
    "warnings",
    "errors",
    "provenance",
    "serializationSummary",
  ],
  "artifact-freshness-verification": [
    "kind",
    "status",
    "artifactRef",
    "sourceRefs",
    "missingSourceRefs",
    "staleSourceRefs",
    "outputRefs",
    "diagnostics",
    "warnings",
    "errors",
    "provenance",
    "serializationSummary",
  ],
  "mvp-demo-result": [
    "kind",
    "inputSummary",
    "constructionResult",
    "measurementAResult",
    "measurementBResult",
    "evaluationAResult",
    "evaluationBResult",
    "comparisonResult",
    "explanationResult",
    "artifactResults",
    "visualArtifactResult",
    "runEnvelope",
    "demoReport",
    "negativeCaseResults",
    "diagnostics",
    "warnings",
    "errors",
    "outputRefs",
    "packLock",
    "packLockRef",
    "operationContext",
    "operationContextRef",
  ],
} satisfies Record<Exclude<VerificationReplayResultKind, "unknown">, readonly string[]>);

const SECTION_LABELS = Object.freeze({
  status: "Status",
  diagnostics: "Diagnostics",
  warnings: "Warnings",
  errors: "Errors",
  mismatches: "Mismatches",
  provenance: "Provenance",
  sourceRefs: "Source Refs",
  outputRefs: "Output Refs",
  artifactFreshness: "Artifact Freshness",
  operationContext: "Operation Context",
  packLocks: "Pack Locks",
  tolerancePolicy: "Tolerance Policy",
  serializationVersion: "Serialization Version",
  operationVersion: "Operation Version",
  resultIdentity: "Result Identity",
  unknownFields: "Unknown Fields",
} satisfies Record<VerificationReplayResultSectionKey, string>);

const SECTION_PATHS: Partial<Record<VerificationReplayResultSectionKey, readonly (readonly string[])[]>> = Object.freeze({
  status: [["status"], ["runEnvelope", "replayReadinessStatus"], ["demoReport", "status"]],
  warnings: [["warnings"]],
  errors: [["errors"]],
  mismatches: [["mismatches"], ["mismatchCodes"], ["replaySummary", "replayMismatches"], ["negativeCaseResults"]],
  provenance: [["provenance"], ["runEnvelope", "provenance"]],
  sourceRefs: [
    ["sourceRefs"],
    ["missingSourceRefs"],
    ["staleSourceRefs"],
    ["sourceRefsUsed"],
    ["replaySummary", "sourceRefsUsed"],
    ["runEnvelope", "inputRefs"],
  ],
  outputRefs: [
    ["outputRefs"],
    ["recordedOutputRefs"],
    ["replayedOutputRefs"],
    ["replaySummary", "recordedOutputRefs"],
    ["replaySummary", "replayOutputRefs"],
    ["runEnvelope", "outputRefs"],
  ],
  artifactFreshness: [["artifactFreshness"]],
  operationContext: [["operationContext"], ["operationContextRef"], ["runEnvelope", "operationContextRef"]],
  packLocks: [["packLocks"], ["packLock"], ["packLockRef"], ["runEnvelope", "packLockRef"]],
  tolerancePolicy: [["tolerancePolicy"], ["operationContext", "tolerancePolicy"], ["runEnvelope", "input", "explicitPolicies", "tolerancePolicy"]],
  serializationVersion: [["serializationVersion"], ["serializationSummary", "serializationVersion"]],
  operationVersion: [["operationVersion"], ["provenance", "operationVersion"], ["runEnvelope", "operationVersion"]],
  resultIdentity: [["id"], ["runRef"], ["recordedRunRef"], ["replayedRunRef"], ["artifactRef"], ["runEnvelope", "runRef"]],
});

export function createVerificationReplayResultDisplayModel(input: unknown): VerificationReplayResultDisplayModel {
  const resolved = resolveInput(input);
  if (!resolved.ok) {
    return rejected(resolved.reason);
  }

  if ("model" in resolved.input) {
    return displayableStructuredModel(resolved.input);
  }

  return displayableDirectInput(resolved.input);
}

function resolveInput(input: unknown): ResolvedInput {
  if (isStructuredJsonInputDisplayModel(input)) {
    return resolveStructuredModel(input);
  }

  if (!isJsonObject(input)) {
    return rejectedResolution(reason("UnsupportedResultKind", "Input must be an approved result envelope or display model.", []));
  }

  const unsupported = unsupportedInputIssue(input);
  if (unsupported !== null) {
    return rejectedResolution(unsupported);
  }

  const directKind = resultKind(input.kind);
  if (directKind !== "unknown") {
    if (!isResultEnvelope(input, directKind)) {
      return rejectedResolution(reason("MalformedResultEnvelope", "Result envelope is missing required display fields.", []));
    }
    return acceptedDirect(input, directKind, directKind, []);
  }

  const wrapper = wrappedResult(input);
  if (wrapper !== null) {
    return wrapper;
  }

  return rejectedResolution(reason("UnsupportedResultKind", "Input does not carry an approved verification or replay result.", []));
}

function resolveStructuredModel(model: StructuredJsonInputDisplayModelLike): ResolvedInput {
  if (model.status !== "accepted") {
    return rejectedResolution(reason("RejectedStructuredJsonInput", "Rejected structured JSON models cannot be displayed as verification results.", []));
  }

  if (!Array.isArray(model.visibleSections)) {
    return rejectedResolution(reason("MalformedDisplayModel", "Structured JSON display model is missing visible sections.", ["visibleSections"]));
  }

  if (!hasCompleteStructuredVisibleSections(model.visibleSections)) {
    return rejectedResolution(reason("MalformedDisplayModel", "Structured JSON display model visible sections are incomplete or malformed.", ["visibleSections"]));
  }

  const detectedKind = resultKind(model.detectedEnvelopeKind);
  if (detectedKind === "unknown") {
    return rejectedResolution(reason("UnsupportedResultKind", "Structured JSON display model is not a verification or replay result.", ["detectedEnvelopeKind"]));
  }

  return { ok: true, input: { model, resultKind: detectedKind } };
}

function wrappedResult(input: JsonObject): ResolvedInput | null {
  const body = isJsonObject(input.body) ? input.body : null;
  if (body?.kind === "norma-api-response") {
    if (!isApiResponseEnvelope(body)) {
      return rejectedResolution(reason("MalformedWrapperEnvelope", "API wrapper is missing required inert result fields.", ["body"]));
    }
    return wrappedResultFromValue(body.result, "api-response", ["body", "result"]);
  }

  if (input.kind === "norma-core-cli-result") {
    if (!isCliResultEnvelope(input)) {
      return rejectedResolution(reason("MalformedWrapperEnvelope", "CLI wrapper is missing required inert result fields.", []));
    }
    return wrappedResultFromValue(input.result, "cli-result", ["result"]);
  }

  if (input.kind === "norma-mcp-tool-result") {
    if (!isMcpToolResultEnvelope(input)) {
      return rejectedResolution(reason("MalformedWrapperEnvelope", "MCP wrapper is missing required inert result fields.", []));
    }
    return wrappedResultFromValue(input.result, "mcp-tool-result", ["result"]);
  }

  return null;
}

function wrappedResultFromValue(
  value: unknown,
  sourceEnvelopeKind: VerificationReplaySourceEnvelopeKind,
  sourcePath: readonly string[],
): ResolvedInput {
  if (!isJsonObject(value)) {
    return rejectedResolution(reason("UnsupportedResultKind", "Wrapper result must be an approved verification or replay result.", sourcePath));
  }

  const kind = resultKind(value.kind);
  if (kind === "unknown") {
    return rejectedResolution(reason("UnsupportedResultKind", "Wrapper result kind is not approved for this display model.", [...sourcePath, "kind"]));
  }

  if (!isResultEnvelope(value, kind)) {
    return rejectedResolution(reason("MalformedResultEnvelope", "Wrapper result envelope is missing required display fields.", sourcePath));
  }

  return acceptedDirect(value, kind, sourceEnvelopeKind, sourcePath);
}

function acceptedDirect(
  payload: JsonObject,
  resultKindValue: Exclude<VerificationReplayResultKind, "unknown">,
  sourceEnvelopeKind: VerificationReplaySourceEnvelopeKind,
  sourcePath: readonly string[],
): ResolvedInput {
  return {
    ok: true,
    input: {
      payload,
      resultKind: resultKindValue,
      sourceEnvelopeKind,
      sourcePath,
    },
  };
}

function isResultEnvelope(value: JsonObject, resultKindValue: Exclude<VerificationReplayResultKind, "unknown">): boolean {
  if (resultKindValue === "run-verification") {
    return isRunVerificationEnvelope(value);
  }

  if (resultKindValue === "run-replay") {
    return isRunReplayEnvelope(value);
  }

  if (resultKindValue === "artifact-freshness-verification") {
    return isArtifactFreshnessVerificationEnvelope(value);
  }

  return isMvpDemoResultEnvelope(value);
}

function isRunVerificationEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "run-verification" &&
    typeof value.status === "string" &&
    typeof value.mode === "string" &&
    isNullableRef(value.runRef) &&
    isStringOrNull(value.operationName) &&
    isStringOrNull(value.operationVersion) &&
    isNullableRef(value.packLockRef) &&
    isNullableRef(value.operationContextRef) &&
    Array.isArray(value.sourceRefs) &&
    Array.isArray(value.missingSourceRefs) &&
    Array.isArray(value.outputRefs) &&
    Array.isArray(value.mismatchCodes) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors) &&
    isObjectOrNull(value.provenance) &&
    isJsonObject(value.replaySummary)
  );
}

function isRunReplayEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "run-replay" &&
    typeof value.status === "string" &&
    typeof value.replayAttempted === "boolean" &&
    value.replayRequired === true &&
    isStringOrNull(value.operationName) &&
    isStringOrNull(value.operationVersion) &&
    isNullableRef(value.recordedRunRef) &&
    isNullableRef(value.replayedRunRef) &&
    isNullableRef(value.packLockRef) &&
    isNullableRef(value.operationContextRef) &&
    Array.isArray(value.recordedOutputRefs) &&
    Array.isArray(value.replayedOutputRefs) &&
    Array.isArray(value.sourceRefsUsed) &&
    Array.isArray(value.mismatches) &&
    isJsonObject(value.verification) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors) &&
    isObjectOrNull(value.provenance)
  );
}

function isArtifactFreshnessVerificationEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "artifact-freshness-verification" &&
    typeof value.status === "string" &&
    isNullableRef(value.artifactRef) &&
    Array.isArray(value.sourceRefs) &&
    Array.isArray(value.missingSourceRefs) &&
    Array.isArray(value.staleSourceRefs) &&
    Array.isArray(value.outputRefs) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors) &&
    isObjectOrNull(value.provenance)
  );
}

function isMvpDemoResultEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "mvp-demo-result" &&
    isJsonObject(value.inputSummary) &&
    isJsonObject(value.constructionResult) &&
    isJsonObject(value.measurementAResult) &&
    isJsonObject(value.measurementBResult) &&
    isJsonObject(value.evaluationAResult) &&
    isJsonObject(value.evaluationBResult) &&
    isJsonObject(value.comparisonResult) &&
    isJsonObject(value.explanationResult) &&
    isJsonObject(value.artifactResults) &&
    isJsonObject(value.visualArtifactResult) &&
    isJsonObject(value.runEnvelope) &&
    isJsonObject(value.demoReport) &&
    Array.isArray(value.negativeCaseResults) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors) &&
    Array.isArray(value.outputRefs) &&
    isJsonObject(value.packLock) &&
    isJsonObject(value.packLockRef) &&
    isJsonObject(value.operationContext) &&
    isJsonObject(value.operationContextRef)
  );
}

function isApiResponseEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "norma-api-response" &&
    value.status === "ok" &&
    isJsonObject(value.request) &&
    Object.hasOwn(value, "result")
  );
}

function isCliResultEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "norma-core-cli-result" &&
    typeof value.command === "string" &&
    value.status === "ok" &&
    typeof value.coreVersion === "string" &&
    typeof value.exitCode === "number" &&
    Object.hasOwn(value, "result")
  );
}

function isMcpToolResultEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "norma-mcp-tool-result" &&
    typeof value.tool === "string" &&
    APPROVED_MCP_TOOLS.has(value.tool) &&
    value.status === "ok" &&
    Object.hasOwn(value, "result")
  );
}

function displayableDirectInput(input: DirectDisplayInput): VerificationReplayResultDisplayModel {
  const inspectableUnknowns = inspectUnknownFields(input.resultKind, input.payload, input.sourcePath);
  const unknownFields = inspectableUnknowns.map((unknown) => unknown.sourcePath.slice(input.sourcePath.length).join("."));
  return {
    kind: "verification-replay-result-display-model",
    status: "displayable",
    resultKind: input.resultKind,
    sourceEnvelopeKind: input.sourceEnvelopeKind,
    sections: visibleSections(input.payload, input.resultKind, unknownFields, input.sourcePath),
    rejectionReasons: [],
    unknownFields,
    inspectableUnknowns,
  };
}

function displayableStructuredModel(input: StructuredDisplayInput): VerificationReplayResultDisplayModel {
  const unknownFields = stringArray(input.model.unknownFields);
  return {
    kind: "verification-replay-result-display-model",
    status: "displayable",
    resultKind: input.resultKind,
    sourceEnvelopeKind: "structured-json-input-display-model",
    sections: visibleSectionsFromStructuredModel(input.model, unknownFields),
    rejectionReasons: [],
    unknownFields,
    inspectableUnknowns: inspectableUnknownsFromStructuredModel(input.model.inspectableUnknowns),
  };
}

function rejected(rejectionReason: VerificationReplayResultRejectionReason): VerificationReplayResultDisplayModel {
  return {
    kind: "verification-replay-result-display-model",
    status: "rejected",
    resultKind: "unknown",
    sourceEnvelopeKind: "unknown",
    sections: visibleSections(null, "unknown", [], []),
    rejectionReasons: [rejectionReason],
    unknownFields: [],
    inspectableUnknowns: [],
  };
}

function visibleSections(
  payload: JsonObject | null,
  resultKindValue: VerificationReplayResultKind,
  unknownFields: readonly string[],
  sourcePath: readonly string[],
): readonly VerificationReplayResultSection[] {
  return VERIFICATION_REPLAY_RESULT_VIEWER_SECTION_KEYS.map((key) => {
    if (key === "unknownFields") {
      return section(key, unknownFields.length > 0, unknownFields.length > 0 ? unknownFields : null, unknownFields.length > 0 ? sourcePath : []);
    }

    if (key === "diagnostics") {
      const diagnostics = payload === null ? null : diagnosticsForPayload(payload);
      return section(key, diagnostics !== null, diagnostics, diagnostics === null ? [] : sourcePath);
    }

    if (key === "artifactFreshness" && resultKindValue === "artifact-freshness-verification" && payload !== null) {
      return section(key, true, payload, sourcePath);
    }

    const found = payload === null ? null : sectionValueByPaths(key, payload, SECTION_PATHS[key] ?? [], sourcePath);
    return section(key, found !== null, found?.value ?? null, found?.sourcePath ?? []);
  });
}

function visibleSectionsFromStructuredModel(
  model: StructuredJsonInputDisplayModelLike,
  unknownFields: readonly string[],
): readonly VerificationReplayResultSection[] {
  return VERIFICATION_REPLAY_RESULT_VIEWER_SECTION_KEYS.map((key) => {
    if (key === "unknownFields") {
      return section(key, unknownFields.length > 0, unknownFields.length > 0 ? unknownFields : null, []);
    }

    const sourceSection = structuredVisibleSection(model.visibleSections, key);
    return section(
      key,
      sourceSection?.present === true,
      sourceSection?.value ?? null,
      stringArray(sourceSection?.sourcePath),
    );
  });
}

function structuredVisibleSection(visibleSectionsValue: unknown, key: VerificationReplayResultSectionKey): JsonObject | null {
  if (!Array.isArray(visibleSectionsValue)) {
    return null;
  }

  const sourceKey = key === "mismatches" ? "mismatchDetails" : key;
  const visibleSection = visibleSectionsValue.find((item) => isJsonObject(item) && item.key === sourceKey);
  return isJsonObject(visibleSection) ? visibleSection : null;
}

function hasCompleteStructuredVisibleSections(visibleSectionsValue: readonly unknown[]): boolean {
  const seenKeys = new Set<string>();
  for (const visibleSection of visibleSectionsValue) {
    if (!isStructuredVisibleSection(visibleSection)) {
      return false;
    }
    seenKeys.add(visibleSection.key as string);
  }

  return STRUCTURED_JSON_VISIBLE_SECTION_KEYS.every((key) => seenKeys.has(key));
}

function isStructuredVisibleSection(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    typeof value.key === "string" &&
    STRUCTURED_JSON_VISIBLE_SECTION_KEY_SET.has(value.key) &&
    typeof value.present === "boolean" &&
    Object.hasOwn(value, "value") &&
    Array.isArray(value.sourcePath) &&
    value.sourcePath.every((part) => typeof part === "string")
  );
}

function diagnosticsForPayload(payload: JsonObject): unknown {
  const directDiagnostics = findFirstByPaths(payload, [["diagnostics"], ["replaySummary", "replayDiagnostics"]], []);
  return directDiagnostics?.value ?? null;
}

function sectionValueByPaths(
  key: VerificationReplayResultSectionKey,
  value: unknown,
  paths: readonly (readonly string[])[],
  sourcePath: readonly string[],
): FoundValue | null {
  const foundValues = findValuesByPaths(value, paths, sourcePath);
  if (foundValues.length === 0) {
    return null;
  }

  if (!usesCompositeSectionValue(key) || foundValues.length === 1) {
    return foundValues[0] ?? null;
  }

  return {
    value: compositeSectionValue(foundValues),
    sourcePath,
  };
}

function usesCompositeSectionValue(key: VerificationReplayResultSectionKey): boolean {
  return key === "sourceRefs" || key === "outputRefs" || key === "resultIdentity";
}

function compositeSectionValue(foundValues: readonly FoundValue[]): JsonObject {
  const composite: JsonObject = {};
  for (const found of foundValues) {
    const fieldKey = found.sourcePath.at(-1) ?? "value";
    composite[Object.hasOwn(composite, fieldKey) ? found.sourcePath.join(".") : fieldKey] = found.value;
  }
  return composite;
}

function findFirstByPaths(
  value: unknown,
  paths: readonly (readonly string[])[],
  sourcePath: readonly string[],
): FoundValue | null {
  for (const candidatePath of paths) {
    const found = valueAtPath(value, candidatePath, sourcePath);
    if (found !== null) {
      return found;
    }
  }

  return null;
}

function findValuesByPaths(
  value: unknown,
  paths: readonly (readonly string[])[],
  sourcePath: readonly string[],
): readonly FoundValue[] {
  return paths
    .map((candidatePath) => valueAtPath(value, candidatePath, sourcePath))
    .filter((found): found is FoundValue => found !== null);
}

function valueAtPath(value: unknown, candidatePath: readonly string[], sourcePath: readonly string[]): FoundValue | null {
  let current = value;
  const resolvedPath = [...sourcePath];
  for (const part of candidatePath) {
    if (!isJsonObject(current) || !Object.hasOwn(current, part)) {
      return null;
    }
    current = current[part];
    resolvedPath.push(part);
  }

  return { value: current, sourcePath: resolvedPath };
}

function inspectUnknownFields(
  resultKindValue: Exclude<VerificationReplayResultKind, "unknown">,
  payload: JsonObject,
  sourcePath: readonly string[],
): readonly VerificationReplayInspectableUnknown[] {
  const knownFields = KNOWN_FIELDS_BY_RESULT_KIND[resultKindValue] as readonly string[];
  return Object.entries(payload)
    .filter(([key]) => !knownFields.includes(key))
    .map(([key, value]) => ({
      sourcePath: [...sourcePath, key],
      value,
    }));
}

function unsupportedInputIssue(input: JsonObject): VerificationReplayResultRejectionReason | null {
  if (isJsonRpcShaped(input)) {
    return reason("GenericJsonRpcInputRejected", "JSON-RPC-shaped input is not accepted by this display helper.", []);
  }

  const unsupportedKey = Object.keys(input).find(isUnsupportedInputKey);
  if (unsupportedKey !== undefined) {
    return reason("UnsupportedInput", "Unsupported source-truth or execution-shaped input.", [unsupportedKey]);
  }

  if (input.path === "/replay-run" || input.replayRunPath === "/replay-run" || input[BLOCKED_PATH_FIELD] === "POST /replay-run") {
    return reason("UnsupportedInput", "/replay-run remains blocked.", []);
  }

  if (input.path === "/replay-mvp-demo" && Object.hasOwn(input, "run")) {
    return reason("UnsupportedInput", "Caller-supplied replay input remains blocked.", ["run"]);
  }

  if (input.tool === "norma.replayRun" || input.name === "norma.replayRun" || input.method === "norma.replayRun") {
    return reason("UnsupportedInput", "norma.replayRun remains blocked.", []);
  }

  return null;
}

function isUnsupportedInputKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return [
    "prompt",
    "freeformprompt",
    "artifact",
    "sourcetruth",
    "sourcetruthinference",
    "createsourcetruth",
    "replay",
    "camera",
    "image",
    "vision",
    "cad",
    "plugin",
    "marketplace",
    "url",
    "urlretrieval",
    "filepath",
    "localfile",
    "mutation",
    "runtimeexecution",
  ].includes(normalized) || (normalized.includes("write") && normalized.includes("file"));
}

function isJsonRpcShaped(input: JsonObject): boolean {
  return input.jsonrpc === "2.0" || Object.hasOwn(input, "method") || Object.hasOwn(input, "params") || Object.hasOwn(input, "error");
}

function resultKind(value: unknown): VerificationReplayResultKind {
  return typeof value === "string" && RESULT_KIND_SET.has(value as Exclude<VerificationReplayResultKind, "unknown">)
    ? value as Exclude<VerificationReplayResultKind, "unknown">
    : "unknown";
}

function isStructuredJsonInputDisplayModel(value: unknown): value is StructuredJsonInputDisplayModelLike {
  return isJsonObject(value) && value.kind === "structured-json-input-display-model";
}

function inspectableUnknownsFromStructuredModel(value: unknown): readonly VerificationReplayInspectableUnknown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isInspectableUnknown);
}

function isInspectableUnknown(value: unknown): value is VerificationReplayInspectableUnknown {
  return isJsonObject(value) && Array.isArray(value.sourcePath) && value.sourcePath.every((part) => typeof part === "string") && Object.hasOwn(value, "value");
}

function section(
  key: VerificationReplayResultSectionKey,
  present: boolean,
  value: unknown,
  sourcePath: readonly string[],
): VerificationReplayResultSection {
  return {
    key,
    label: SECTION_LABELS[key],
    present,
    value,
    sourcePath,
  };
}

function reason(
  code: VerificationReplayResultRejectionCode,
  message: string,
  sourcePath: readonly string[],
): VerificationReplayResultRejectionReason {
  return {
    code,
    message,
    sourcePath,
  };
}

function rejectedResolution(reasonValue: VerificationReplayResultRejectionReason): ResolvedInput {
  return { ok: false, reason: reasonValue };
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function isStringOrNull(value: unknown): boolean {
  return typeof value === "string" || value === null;
}

function isObjectOrNull(value: unknown): boolean {
  return isJsonObject(value) || value === null;
}

function isNullableRef(value: unknown): boolean {
  return isJsonObject(value) || value === null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
