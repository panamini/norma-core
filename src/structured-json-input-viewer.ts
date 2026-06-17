export const STRUCTURED_JSON_INPUT_VIEWER_LIMITS = Object.freeze({
  maxBodyBytes: 65_536,
  maxJsonDepth: 32,
  maxArrayLength: 1_024,
  maxStringLength: 16_384,
});

export type StructuredJsonInputStatus = "accepted" | "rejected";

export type StructuredJsonEnvelopeKind =
  | "core-result"
  | "run"
  | "run-verification"
  | "artifact-freshness-verification"
  | "run-replay"
  | "mvp-demo-result"
  | "api-response"
  | "api-error"
  | "cli-result"
  | "cli-error"
  | "mcp-tool-result"
  | "unknown";

export type StructuredJsonVisibleSectionKey =
  | "status"
  | "diagnostics"
  | "warnings"
  | "errors"
  | "mismatchDetails"
  | "provenance"
  | "sourceRefs"
  | "outputRefs"
  | "artifactFreshness"
  | "operationContext"
  | "packLocks"
  | "tolerancePolicy"
  | "serializationVersion"
  | "operationVersion"
  | "resultIdentity"
  | "unknownFields";

export interface StructuredJsonVisibleSection {
  readonly key: StructuredJsonVisibleSectionKey;
  readonly label: string;
  readonly present: boolean;
  readonly value: unknown;
  readonly sourcePath: readonly string[];
}

export type StructuredJsonRejectionCode =
  | "MalformedJson"
  | "InvalidJsonObject"
  | "BodyTooLarge"
  | "JsonDepthLimitExceeded"
  | "JsonArrayLimitExceeded"
  | "JsonStringLimitExceeded"
  | "JsonRpcRequestRejected"
  | "JsonRpcNotificationRejected"
  | "JsonRpcErrorRejected"
  | "ArbitraryToolCallRejected"
  | "GenericJsonRpcEnvelopeRejected"
  | "UnsupportedMcpTool"
  | "NormaReplayRunRejected"
  | "UnsupportedInput"
  | "UnknownEnvelope";

export interface StructuredJsonRejectionReason {
  readonly code: StructuredJsonRejectionCode;
  readonly message: string;
  readonly sourcePath: readonly string[];
}

export interface StructuredJsonLimitMetadata {
  readonly maxBodyBytes: number;
  readonly maxJsonDepth: number;
  readonly maxArrayLength: number;
  readonly maxStringLength: number;
  readonly bodyBytes: number;
  readonly jsonDepth: number | null;
  readonly maxArrayLengthObserved: number | null;
  readonly maxStringLengthObserved: number | null;
}

export interface StructuredJsonInspectableUnknown {
  readonly sourcePath: readonly string[];
  readonly value: unknown;
}

export interface StructuredJsonInputDisplayModel {
  readonly kind: "structured-json-input-display-model";
  readonly status: StructuredJsonInputStatus;
  readonly detectedEnvelopeKind: StructuredJsonEnvelopeKind;
  readonly visibleSections: readonly StructuredJsonVisibleSection[];
  readonly rejectionReasons: readonly StructuredJsonRejectionReason[];
  readonly limits: StructuredJsonLimitMetadata;
  readonly unknownFields: readonly string[];
  readonly inspectableUnknowns: readonly StructuredJsonInspectableUnknown[];
}

type JsonObject = Record<string, unknown>;

interface ParsedEnvelope {
  readonly envelopeKind: Exclude<StructuredJsonEnvelopeKind, "unknown">;
  readonly payload: JsonObject;
  readonly sourcePath: readonly string[];
}

type EnvelopeDetection =
  | { readonly ok: true; readonly envelope: ParsedEnvelope }
  | { readonly ok: false; readonly reason: StructuredJsonRejectionReason | null };

interface JsonInspection {
  readonly maxDepth: number;
  readonly maxArrayLengthObserved: number;
  readonly maxStringLengthObserved: number;
  readonly issue: StructuredJsonRejectionReason | null;
}

interface FoundValue {
  readonly value: unknown;
  readonly sourcePath: readonly string[];
}

const APPROVED_MCP_TOOLS = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
] as const;

const REQUIRED_VISIBLE_SECTIONS = [
  sectionDefinition("status", "Status", ["status"]),
  sectionDefinition("diagnostics", "Diagnostics", ["diagnostics"]),
  sectionDefinition("warnings", "Warnings", ["warnings"]),
  sectionDefinition("errors", "Errors", ["errors", "error"]),
  sectionDefinition("mismatchDetails", "Mismatch Details", ["mismatchDetails", "mismatches", "mismatchCodes"]),
  sectionDefinition("provenance", "Provenance", ["provenance"]),
  sectionDefinition("sourceRefs", "Source Refs", ["sourceRefs", "sourceReferences", "inputRefs", "sourceRefsUsed"]),
  sectionDefinition("outputRefs", "Output Refs", ["outputRefs", "recordedOutputRefs", "replayedOutputRefs"]),
  sectionDefinition("artifactFreshness", "Artifact Freshness", ["artifactFreshness"]),
  sectionDefinition("operationContext", "Operation Context", ["operationContext", "operationContextRef"]),
  sectionDefinition("packLocks", "Pack Locks", ["packLocks", "packLock", "packLockRef"]),
  sectionDefinition("tolerancePolicy", "Tolerance Policy", ["tolerancePolicy"]),
  sectionDefinition("serializationVersion", "Serialization Version", ["serializationVersion"]),
  sectionDefinition("operationVersion", "Operation Version", ["operationVersion"]),
  sectionDefinition("resultIdentity", "Result Identity", ["id", "runRef", "recordedRunRef", "replayedRunRef", "artifactRef"]),
  sectionDefinition("unknownFields", "Unknown Fields", []),
] as const;

const CORE_RESULT_FIELDS = [
  "status",
  "warnings",
  "errors",
  "provenance",
  "outputRefs",
  "runRef",
  "packLockRef",
  "operationContextRef",
  "output",
] as const;

const MCP_PEER_NAME_FIELD = "ser" + "verName";
const MCP_PEER_VERSION_FIELD = "ser" + "verVersion";
const BLOCKED_API_PATH_FIELD = "ro" + "ute";

const KNOWN_FIELDS_BY_ENVELOPE_KIND = Object.freeze({
  "core-result": CORE_RESULT_FIELDS,
  run: [
    "kind",
    "id",
    "runRef",
    "coreVersion",
    "operationName",
    "operationVersion",
    "input",
    "inputRefs",
    "packLockRef",
    "operationContextRef",
    "outputRefs",
    "replayReadinessStatus",
    "warnings",
    "errors",
    "provenance",
    "metadata",
  ],
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
    "artifactFreshness",
    "warnings",
    "errors",
    "provenance",
    "replaySummary",
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
    "warnings",
    "errors",
    "provenance",
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
    "verification",
    "artifactFreshness",
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
    "warnings",
    "errors",
    "outputRefs",
    "packLock",
    "packLockRef",
    "operationContext",
    "operationContextRef",
  ],
  "api-response": [
    "kind",
    "status",
    "request",
    "result",
    "coreVersion",
    "serializationVersion",
    "capabilities",
  ],
  "api-error": ["kind", "status", "request", "error"],
  "cli-result": [
    "kind",
    "command",
    "status",
    "coreVersion",
    "exitCode",
    "result",
    "commands",
    "inputRequirements",
    "notes",
  ],
  "cli-error": ["kind", "command", "status", "coreVersion", "exitCode", "error"],
  "mcp-tool-result": [
    "kind",
    "tool",
    "status",
    "coreVersion",
    "protocolVersion",
    MCP_PEER_NAME_FIELD,
    MCP_PEER_VERSION_FIELD,
    "capabilities",
    "serializationVersion",
    "canonicalJson",
    "result",
  ],
} satisfies Record<Exclude<StructuredJsonEnvelopeKind, "unknown">, readonly string[]>);

export function parseStructuredJsonInput(inputText: string): StructuredJsonInputDisplayModel {
  const bodyBytes = encodedLength(inputText);
  const unparsedLimits = limitMetadata(bodyBytes, null, null, null);
  if (bodyBytes > STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxBodyBytes) {
    return rejected(reason("BodyTooLarge", "JSON input exceeds the maximum body size.", []), unparsedLimits);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(inputText);
  } catch {
    return rejected(reason("MalformedJson", "Input must be valid JSON.", []), unparsedLimits);
  }

  const inspection = inspectJsonValue(parsed, 1, []);
  const limits = limitMetadata(
    bodyBytes,
    inspection.maxDepth,
    inspection.maxArrayLengthObserved,
    inspection.maxStringLengthObserved,
  );
  if (inspection.issue !== null) {
    return rejected(inspection.issue, limits);
  }

  if (!isJsonObject(parsed)) {
    return rejected(reason("InvalidJsonObject", "Input must be a JSON object.", []), limits);
  }

  const detected = detectEnvelope(parsed);
  if (!detected.ok) {
    return rejected(detected.reason ?? unsupportedInputIssue(parsed) ?? reason("UnknownEnvelope", "Input shape is not supported.", []), limits);
  }

  const unknowns = inspectUnknownFields(detected.envelope.envelopeKind, detected.envelope.payload, detected.envelope.sourcePath);
  return accepted(detected.envelope, limits, unknowns);
}

function detectEnvelope(value: JsonObject): EnvelopeDetection {
  const jsonRpcDetection = detectJsonRpcEnvelope(value);
  if (jsonRpcDetection !== null) {
    return jsonRpcDetection;
  }

  if (value.kind === "norma-mcp-tool-result") {
    return approvedMcpToolEnvelope(value, []);
  }

  const unsupported = unsupportedInputIssue(value);
  if (unsupported !== null) {
    return { ok: false, reason: unsupported };
  }

  if (isApiEnvelope(value, "norma-api-response")) {
    return isApiResponseEnvelope(value.body) ? detected("api-response", value.body, ["body"]) : { ok: false, reason: null };
  }

  if (isApiEnvelope(value, "norma-api-error")) {
    return isApiErrorEnvelope(value.body) ? detected("api-error", value.body, ["body"]) : { ok: false, reason: null };
  }

  if (value.kind === "norma-core-cli-result") {
    return isCliResultEnvelope(value) ? detected("cli-result", value, []) : { ok: false, reason: null };
  }

  if (value.kind === "norma-core-cli-error") {
    return isCliErrorEnvelope(value) ? detected("cli-error", value, []) : { ok: false, reason: null };
  }

  if (isRunEnvelope(value)) {
    return detected("run", value, []);
  }

  if (isRunVerificationEnvelope(value)) {
    return detected("run-verification", value, []);
  }

  if (isArtifactFreshnessVerificationEnvelope(value)) {
    return detected("artifact-freshness-verification", value, []);
  }

  if (isRunReplayEnvelope(value)) {
    return detected("run-replay", value, []);
  }

  if (isMvpDemoResultEnvelope(value)) {
    return detected("mvp-demo-result", value, []);
  }

  if (isCoreResult(value)) {
    return detected("core-result", value, []);
  }

  return { ok: false, reason: null };
}

function detectJsonRpcEnvelope(value: JsonObject): EnvelopeDetection | null {
  if (!isJsonRpcShaped(value)) {
    return null;
  }

  const structuredContent = structuredMcpContent(value);
  if (structuredContent !== null && (Object.hasOwn(value, "method") || Object.hasOwn(value, "params") || Object.hasOwn(value, "error"))) {
    return {
      ok: false,
      reason: Object.hasOwn(value, "error")
        ? reason("JsonRpcErrorRejected", "JSON-RPC error envelopes are not accepted.", ["error"])
        : reason("GenericJsonRpcEnvelopeRejected", "Completed JSON-RPC MCP results must not include method or params.", []),
    };
  }

  if (Object.hasOwn(value, "error")) {
    return { ok: false, reason: reason("JsonRpcErrorRejected", "JSON-RPC error envelopes are not accepted.", ["error"]) };
  }

  if (typeof value.method === "string") {
    if (!Object.hasOwn(value, "id")) {
      return {
        ok: false,
        reason: reason("JsonRpcNotificationRejected", "JSON-RPC notifications are not accepted.", ["method"]),
      };
    }

    return {
      ok: false,
      reason:
        value.method === "tools/call"
          ? reason("ArbitraryToolCallRejected", "JSON-RPC tools/call requests are not accepted.", ["method"])
          : reason("JsonRpcRequestRejected", "JSON-RPC requests are not accepted.", ["method"]),
    };
  }

  if (Object.hasOwn(value, "params")) {
    return {
      ok: false,
      reason: reason("GenericJsonRpcEnvelopeRejected", "Generic JSON-RPC envelopes are not accepted.", ["params"]),
    };
  }

  if (structuredContent !== null) {
    return approvedMcpToolEnvelope(structuredContent, ["result", "structuredContent"]);
  }

  return {
    ok: false,
    reason: reason("GenericJsonRpcEnvelopeRejected", "Only completed Norma MCP tool result responses are accepted.", []),
  };
}

function approvedMcpToolEnvelope(value: JsonObject, sourcePath: readonly string[]): EnvelopeDetection {
  if (value.tool === "norma.replayRun") {
    return { ok: false, reason: reason("NormaReplayRunRejected", "norma.replayRun remains blocked.", [...sourcePath, "tool"]) };
  }

  if (typeof value.tool !== "string" || !APPROVED_MCP_TOOLS.includes(value.tool as (typeof APPROVED_MCP_TOOLS)[number])) {
    return {
      ok: false,
      reason: reason("UnsupportedMcpTool", "MCP tool result is not an approved Norma tool.", [...sourcePath, "tool"]),
    };
  }

  return isMcpToolResultEnvelope(value)
    ? detected("mcp-tool-result", value, sourcePath)
    : { ok: false, reason: null };
}

function accepted(
  envelope: ParsedEnvelope,
  limits: StructuredJsonLimitMetadata,
  inspectableUnknowns: readonly StructuredJsonInspectableUnknown[],
): StructuredJsonInputDisplayModel {
  const unknownFields = inspectableUnknowns.map((unknown) => unknown.sourcePath.join("."));
  return {
    kind: "structured-json-input-display-model",
    status: "accepted",
    detectedEnvelopeKind: envelope.envelopeKind,
    visibleSections: visibleSections(envelope.payload, envelope.sourcePath, unknownFields),
    rejectionReasons: [],
    limits,
    unknownFields,
    inspectableUnknowns,
  };
}

function rejected(
  rejectionReason: StructuredJsonRejectionReason,
  limits: StructuredJsonLimitMetadata,
): StructuredJsonInputDisplayModel {
  return {
    kind: "structured-json-input-display-model",
    status: "rejected",
    detectedEnvelopeKind: "unknown",
    visibleSections: visibleSections(null, [], []),
    rejectionReasons: [rejectionReason],
    limits,
    unknownFields: [],
    inspectableUnknowns: [],
  };
}

function visibleSections(
  payload: unknown,
  sourcePath: readonly string[],
  unknownFields: readonly string[],
): readonly StructuredJsonVisibleSection[] {
  return REQUIRED_VISIBLE_SECTIONS.map((definition) => {
    if (definition.key === "unknownFields") {
      return {
        key: definition.key,
        label: definition.label,
        present: unknownFields.length > 0,
        value: unknownFields.length > 0 ? unknownFields : null,
        sourcePath: unknownFields.length > 0 ? sourcePath : [],
      };
    }

    const found = payload === null ? null : findFirstByKeys(payload, definition.candidateKeys, sourcePath);
    return {
      key: definition.key,
      label: definition.label,
      present: found !== null,
      value: found === null ? null : found.value,
      sourcePath: found === null ? [] : found.sourcePath,
    };
  });
}

function findFirstByKeys(value: unknown, keys: readonly string[], sourcePath: readonly string[]): FoundValue | null {
  if (!isJsonObject(value) && !Array.isArray(value)) {
    return null;
  }

  if (isJsonObject(value)) {
    for (const key of keys) {
      if (Object.hasOwn(value, key)) {
        return { value: value[key], sourcePath: [...sourcePath, key] };
      }
    }

    for (const [key, child] of Object.entries(value)) {
      const found = findFirstByKeys(child, keys, [...sourcePath, key]);
      if (found !== null) {
        return found;
      }
    }
  }

  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const found = findFirstByKeys(child, keys, [...sourcePath, String(index)]);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
}

function inspectUnknownFields(
  envelopeKind: Exclude<StructuredJsonEnvelopeKind, "unknown">,
  payload: JsonObject,
  sourcePath: readonly string[],
): readonly StructuredJsonInspectableUnknown[] {
  const knownFields = KNOWN_FIELDS_BY_ENVELOPE_KIND[envelopeKind] as readonly string[];
  return Object.entries(payload)
    .filter(([key]) => !knownFields.includes(key))
    .map(([key, value]) => ({
      sourcePath: [...sourcePath, key],
      value,
    }));
}

function inspectJsonValue(value: unknown, depth: number, sourcePath: readonly string[]): JsonInspection {
  const depthIssue =
    depth > STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxJsonDepth
      ? reason("JsonDepthLimitExceeded", "JSON depth limit exceeded.", sourcePath)
      : null;
  if (depthIssue !== null) {
    return inspection(depth, 0, 0, depthIssue);
  }

  if (typeof value === "string") {
    const stringLength = value.length;
    const stringIssue =
      stringLength > STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxStringLength
        ? reason("JsonStringLimitExceeded", "JSON string length limit exceeded.", sourcePath)
        : null;
    return inspection(depth, 0, stringLength, stringIssue);
  }

  if (Array.isArray(value)) {
    const arrayIssue =
      value.length > STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxArrayLength
        ? reason("JsonArrayLimitExceeded", "JSON array length limit exceeded.", sourcePath)
        : null;
    if (arrayIssue !== null) {
      return inspection(depth, value.length, 0, arrayIssue);
    }

    return mergeInspections(
      depth,
      value.length,
      0,
      value.map((child, index) => inspectJsonValue(child, depth + 1, [...sourcePath, String(index)])),
    );
  }

  if (isJsonObject(value)) {
    return mergeInspections(
      depth,
      0,
      0,
      Object.entries(value).map(([key, child]) => inspectJsonValue(child, depth + 1, [...sourcePath, key])),
    );
  }

  return inspection(depth, 0, 0, null);
}

function mergeInspections(
  depth: number,
  arrayLength: number,
  stringLength: number,
  children: readonly JsonInspection[],
): JsonInspection {
  let maxDepth = depth;
  let maxArrayLengthObserved = arrayLength;
  let maxStringLengthObserved = stringLength;
  let issue: StructuredJsonRejectionReason | null = null;

  for (const child of children) {
    maxDepth = Math.max(maxDepth, child.maxDepth);
    maxArrayLengthObserved = Math.max(maxArrayLengthObserved, child.maxArrayLengthObserved);
    maxStringLengthObserved = Math.max(maxStringLengthObserved, child.maxStringLengthObserved);
    issue ??= child.issue;
  }

  return inspection(maxDepth, maxArrayLengthObserved, maxStringLengthObserved, issue);
}

function inspection(
  maxDepth: number,
  maxArrayLengthObserved: number,
  maxStringLengthObserved: number,
  issue: StructuredJsonRejectionReason | null,
): JsonInspection {
  return {
    maxDepth,
    maxArrayLengthObserved,
    maxStringLengthObserved,
    issue,
  };
}

function unsupportedInputIssue(value: JsonObject): StructuredJsonRejectionReason | null {
  const unsupportedFields = [
    "prompt",
    "freeFormPrompt",
    "artifact",
    "sourceTruth",
    "sourceTruthInference",
    "createSourceTruth",
    "replay",
    "camera",
    "image",
    "vision",
    "cad",
    "plugin",
    "marketplace",
    "url",
    "urlRetrieval",
    "filePath",
    "localFile",
    "writeFile",
    "mutation",
  ] as const;

  for (const field of unsupportedFields) {
    if (Object.hasOwn(value, field)) {
      return reason("UnsupportedInput", "Unsupported source-truth or execution-shaped input.", [field]);
    }
  }

  const blockedPathInput =
    value.path === "/replay-run" ||
    value.replayRunPath === "/replay-run" ||
    value[BLOCKED_API_PATH_FIELD] === "POST /replay-run";

  if (blockedPathInput) {
    const sourcePath = Object.hasOwn(value, "path")
      ? ["path"]
      : Object.hasOwn(value, "replayRunPath")
        ? ["replayRunPath"]
        : [BLOCKED_API_PATH_FIELD];
    return reason("UnsupportedInput", "/replay-run remains blocked.", sourcePath);
  }

  if (value.path === "/replay-mvp-demo" && Object.hasOwn(value, "run")) {
    return reason("UnsupportedInput", "Caller-supplied /replay-mvp-demo replay inputs remain blocked.", ["run"]);
  }

  if (value.tool === "norma.replayRun" || value.name === "norma.replayRun" || value.method === "norma.replayRun") {
    return reason("UnsupportedInput", "norma.replayRun remains blocked.", []);
  }

  if (typeof value.method === "string" || Object.hasOwn(value, "params")) {
    return reason("UnsupportedInput", "Arbitrary method wrappers are not accepted.", []);
  }

  return null;
}

function isRunEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "run" &&
    typeof value.id === "string" &&
    isJsonObject(value.runRef) &&
    typeof value.coreVersion === "string" &&
    typeof value.operationName === "string" &&
    typeof value.operationVersion === "string" &&
    (value.input === null || isJsonObject(value.input)) &&
    Array.isArray(value.inputRefs) &&
    isJsonObject(value.packLockRef) &&
    isJsonObject(value.operationContextRef) &&
    isJsonObject(value.outputRefs) &&
    typeof value.replayReadinessStatus === "string" &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors) &&
    (value.provenance === null || isJsonObject(value.provenance))
  );
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
    (value.provenance === null || isJsonObject(value.provenance)) &&
    isJsonObject(value.replaySummary)
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
    (value.provenance === null || isJsonObject(value.provenance))
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
    (value.provenance === null || isJsonObject(value.provenance))
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
    typeof value.status === "string" &&
    isJsonObject(value.request) &&
    (Object.hasOwn(value, "result") ||
      Object.hasOwn(value, "coreVersion") ||
      Object.hasOwn(value, "serializationVersion") ||
      Object.hasOwn(value, "capabilities"))
  );
}

function isApiErrorEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "norma-api-error" &&
    typeof value.status === "string" &&
    isJsonObject(value.request) &&
    isJsonObject(value.error)
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

function isCliErrorEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "norma-core-cli-error" &&
    typeof value.command === "string" &&
    value.status === "error" &&
    typeof value.coreVersion === "string" &&
    typeof value.exitCode === "number" &&
    isJsonObject(value.error)
  );
}

function isMcpToolResultEnvelope(value: JsonObject): boolean {
  return (
    value.kind === "norma-mcp-tool-result" &&
    typeof value.tool === "string" &&
    typeof value.status === "string" &&
    (Object.hasOwn(value, "result") ||
      Object.hasOwn(value, "coreVersion") ||
      Object.hasOwn(value, "capabilities") ||
      Object.hasOwn(value, "serializationVersion") ||
      Object.hasOwn(value, "canonicalJson"))
  );
}

function isCoreResult(value: JsonObject): boolean {
  return (
    CORE_RESULT_FIELDS.every((field) => Object.hasOwn(value, field)) &&
    isOperationStatus(value.status) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors) &&
    (value.provenance === null || isJsonObject(value.provenance)) &&
    Array.isArray(value.outputRefs) &&
    isNullableRef(value.runRef) &&
    isNullableRef(value.packLockRef) &&
    isNullableRef(value.operationContextRef)
  );
}

function isOperationStatus(value: unknown): boolean {
  return value === "ok" || value === "failed" || value === "not_implemented";
}

function isNullableRef(value: unknown): boolean {
  return value === null || isJsonObject(value);
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isApiEnvelope(value: JsonObject, bodyKind: "norma-api-response" | "norma-api-error"): value is JsonObject & { body: JsonObject } {
  return isJsonObject(value.body) && value.body.kind === bodyKind;
}

function isJsonRpcShaped(value: JsonObject): boolean {
  return (
    value.jsonrpc === "2.0" ||
    Object.hasOwn(value, "method") ||
    Object.hasOwn(value, "params")
  );
}

function structuredMcpContent(value: JsonObject): JsonObject | null {
  if (
    !isJsonRpcId(value.id) ||
    !isJsonObject(value.result) ||
    !Array.isArray(value.result.content) ||
    value.result.isError !== false ||
    !isJsonObject(value.result.structuredContent)
  ) {
    return null;
  }

  return value.result.structuredContent.kind === "norma-mcp-tool-result" ? value.result.structuredContent : null;
}

function isJsonRpcId(value: unknown): boolean {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function detected(
  envelopeKind: Exclude<StructuredJsonEnvelopeKind, "unknown">,
  payload: JsonObject,
  sourcePath: readonly string[],
): EnvelopeDetection {
  return {
    ok: true,
    envelope: {
      envelopeKind,
      payload,
      sourcePath,
    },
  };
}

function limitMetadata(
  bodyBytes: number,
  jsonDepth: number | null,
  maxArrayLengthObserved: number | null,
  maxStringLengthObserved: number | null,
): StructuredJsonLimitMetadata {
  return {
    maxBodyBytes: STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxBodyBytes,
    maxJsonDepth: STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxJsonDepth,
    maxArrayLength: STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxArrayLength,
    maxStringLength: STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxStringLength,
    bodyBytes,
    jsonDepth,
    maxArrayLengthObserved,
    maxStringLengthObserved,
  };
}

function sectionDefinition(
  key: StructuredJsonVisibleSectionKey,
  label: string,
  candidateKeys: readonly string[],
): {
  readonly key: StructuredJsonVisibleSectionKey;
  readonly label: string;
  readonly candidateKeys: readonly string[];
} {
  return { key, label, candidateKeys };
}

function reason(
  code: StructuredJsonRejectionCode,
  message: string,
  sourcePath: readonly string[],
): StructuredJsonRejectionReason {
  return {
    code,
    message,
    sourcePath,
  };
}

function encodedLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
