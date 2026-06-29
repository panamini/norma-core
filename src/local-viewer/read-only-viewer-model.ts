import {
  parseStructuredJsonInput,
  type StructuredJsonInputDisplayModel,
  type StructuredJsonRejectionReason,
} from "../structured-json-input-viewer.js";
import {
  createVerificationReplayResultDisplayModel,
  type VerificationReplayResultDisplayModel,
  type VerificationReplayResultKind,
  type VerificationReplayResultRejectionReason,
  type VerificationReplayResultSection as VerificationReplaySection,
} from "../verification-replay-result-viewer.js";

export type ReadOnlyViewerInput =
  | { readonly kind: "jsonText"; readonly value: string }
  | { readonly kind: "structured"; readonly value: unknown };

export type ReadOnlyViewerStatus = "empty" | "invalid-json" | "unsupported" | "displayable";

export type ReadOnlyViewerClassification =
  | "empty"
  | "invalid-json"
  | "unsupported-shape"
  | "verification-like-result"
  | "replay-like-result"
  | "artifact-freshness-like-result"
  | "structured-analyze-like-result"
  | "unknown-structured-object";

export type ReadOnlyViewerSourceMode = "explicit-json-text" | "explicit-structured-object";

export interface ReadOnlyViewerModel {
  readonly kind: "readOnlyViewerModel";
  readonly status: ReadOnlyViewerStatus;
  readonly classification: ReadOnlyViewerClassification;
  readonly sourceMode: ReadOnlyViewerSourceMode;
  readonly displayable: boolean;
  readonly notDisplayableReason: string | null;
  readonly title: string;
  readonly summary: string;
  readonly sections: readonly ReadOnlyViewerSection[];
  readonly warnings: readonly ReadOnlyViewerNotice[];
  readonly errors: readonly ReadOnlyViewerNotice[];
  readonly provenance: ReadOnlyViewerProvenance;
}

export interface ReadOnlyViewerSection {
  readonly id: string;
  readonly title: string;
  readonly rows: readonly ReadOnlyViewerRow[];
}

export interface ReadOnlyViewerRow {
  readonly label: string;
  readonly value: string | number | boolean | null;
}

export interface ReadOnlyViewerNotice {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface ReadOnlyViewerProvenance {
  readonly sourceTruth: "explicit-structured-input";
  readonly artifactsAreDerived: true;
  readonly promptIsSourceTruth: false;
  readonly displayabilityIsTruthValidation: false;
}

type JsonObject = Record<string, unknown>;

interface PathValue {
  readonly present: boolean;
  readonly value: unknown;
}

type ParsedJson =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false };

interface StructuredAnalyzePayload {
  readonly result: JsonObject;
  readonly sourcePath: readonly string[];
}

const READ_ONLY_VIEWER_PROVENANCE: ReadOnlyViewerProvenance = Object.freeze({
  sourceTruth: "explicit-structured-input",
  artifactsAreDerived: true,
  promptIsSourceTruth: false,
  displayabilityIsTruthValidation: false,
});

const UNKNOWN_STRUCTURED_OBJECT_NOTICE: ReadOnlyViewerNotice = Object.freeze({
  code: "UnknownStructuredObject",
  severity: "warning",
  message: "Input is structured but is not an approved local display shape.",
});

const STRUCTURED_ANALYZE_RESULT_KIND = "structured-composition-analysis-result";
const STRUCTURED_ANALYZE_MCP_TOOL = "norma." + "analyzeStructured" + "CompositionV1";
const BLOCKED_STRUCTURED_ANALYZE_PATH_FIELD = "ro" + "ute";
const BLOCKED_REPLAY_RUN_PATH_FIELD = "replay" + "RunPath";

const STRUCTURED_ANALYZE_TOP_LEVEL_FIELDS = [
  "kind",
  "contractVersion",
  "operationName",
  "operationVersion",
  "status",
  "analysisId",
  "inputRefs",
  "outputRefs",
  "validation",
  "measurements",
  "evaluations",
  "comparison",
  "decision",
  "packLockRef",
  "operationContextRef",
  "replayReadiness",
  "diagnostics",
  "warnings",
  "errors",
  "provenance",
  "serializationSummary",
] as const;

const STRUCTURED_ANALYZE_TOP_LEVEL_FIELD_SET = new Set<string>(STRUCTURED_ANALYZE_TOP_LEVEL_FIELDS);

export function createReadOnlyViewerModel(input: ReadOnlyViewerInput): ReadOnlyViewerModel {
  if (input.kind === "jsonText") {
    return modelFromJsonText(input.value);
  }

  return modelFromStructuredValue(input.value, "explicit-structured-object");
}

function modelFromJsonText(inputText: string): ReadOnlyViewerModel {
  if (inputText.trim() === "") {
    return nonDisplayable({
      status: "empty",
      classification: "empty",
      sourceMode: "explicit-json-text",
      title: "Empty input",
      summary: "No structured JSON input was provided.",
      notDisplayableReason: "No structured JSON input was provided.",
      sections: [],
      warnings: [],
      errors: [],
    });
  }

  const parsedJson = parseJsonValue(inputText);
  if (parsedJson.ok) {
    const structuredAnalyzeModel = structuredAnalyzeModelFromValue(parsedJson.value, "explicit-json-text");
    if (structuredAnalyzeModel !== null) {
      return structuredAnalyzeModel;
    }
  }

  const structuredModel = parseStructuredJsonInput(inputText);
  if (structuredModel.status === "rejected") {
    return modelFromStructuredJsonRejection(inputText, structuredModel.rejectionReasons);
  }

  const directModel = modelFromParsedJsonText(inputText, "explicit-json-text");
  if (directModel?.status === "displayable") {
    return directModel;
  }

  return modelFromAcceptedStructuredJsonModel(structuredModel, "explicit-json-text");
}

function modelFromParsedJsonText(inputText: string, sourceMode: ReadOnlyViewerSourceMode): ReadOnlyViewerModel | null {
  const parsedValue = parseKnownJson(inputText);
  if (parsedValue === null) {
    return null;
  }

  return modelFromStructuredValue(parsedValue, sourceMode);
}

function modelFromAcceptedStructuredJsonModel(
  structuredModel: StructuredJsonInputDisplayModel,
  sourceMode: ReadOnlyViewerSourceMode,
): ReadOnlyViewerModel {
  const displayModel = createVerificationReplayResultDisplayModel(structuredModel);
  if (displayModel.status === "displayable") {
    return displayableModel(displayModel, sourceMode);
  }

  return modelFromDisplayRejection(displayModel.rejectionReasons, sourceMode, structuredModel);
}

function modelFromStructuredValue(value: unknown, sourceMode: ReadOnlyViewerSourceMode): ReadOnlyViewerModel {
  const displayModel = createVerificationReplayResultDisplayModel(value);
  if (displayModel.status === "displayable") {
    return displayableModel(displayModel, sourceMode);
  }

  const structuredAnalyzeModel = structuredAnalyzeModelFromValue(value, sourceMode);
  if (structuredAnalyzeModel !== null) {
    return structuredAnalyzeModel;
  }

  return modelFromDisplayRejection(displayModel.rejectionReasons, sourceMode, value);
}

function structuredAnalyzeModelFromValue(
  value: unknown,
  sourceMode: ReadOnlyViewerSourceMode,
): ReadOnlyViewerModel | null {
  const payload = structuredAnalyzePayloadFromValue(value);
  if (payload === null) {
    return null;
  }

  const unsupported = structuredAnalyzeUnsupportedInputIssue(payload.result, payload.sourcePath);
  if (unsupported !== null) {
    return modelFromDisplayRejection([unsupported], sourceMode, value);
  }

  return structuredAnalyzeDisplayModel(payload.result, sourceMode);
}

function modelFromStructuredJsonRejection(
  inputText: string,
  rejectionReasons: readonly StructuredJsonRejectionReason[],
): ReadOnlyViewerModel {
  const primaryReason = rejectionReasons[0] ?? {
    code: "UnsupportedInput",
    message: "Input is not displayable.",
    sourcePath: [],
  };

  if (primaryReason.code === "MalformedJson") {
    return nonDisplayable({
      status: "invalid-json",
      classification: "invalid-json",
      sourceMode: "explicit-json-text",
      title: "Invalid JSON",
      summary: primaryReason.message,
      notDisplayableReason: primaryReason.message,
      sections: [],
      warnings: [],
      errors: [noticeFromStructuredReason(primaryReason, "InvalidJsonText", "error")],
    });
  }

  return nonDisplayable({
    status: "unsupported",
    classification: classificationFromStructuredReason(primaryReason),
    sourceMode: "explicit-json-text",
    title: "Unsupported input",
    summary: primaryReason.message,
    notDisplayableReason: primaryReason.message,
    sections: unknownSummarySections(parseKnownJson(inputText)),
    warnings: primaryReason.code === "UnknownEnvelope" || primaryReason.code === "InvalidJsonObject"
      ? [UNKNOWN_STRUCTURED_OBJECT_NOTICE]
      : [],
    errors: primaryReason.code === "UnknownEnvelope" || primaryReason.code === "InvalidJsonObject"
      ? []
      : [noticeFromStructuredReason(primaryReason, primaryReason.code, "error")],
  });
}

function modelFromDisplayRejection(
  rejectionReasons: readonly VerificationReplayResultRejectionReason[],
  sourceMode: ReadOnlyViewerSourceMode,
  value: unknown,
): ReadOnlyViewerModel {
  const primaryReason = rejectionReasons[0] ?? {
    code: "UnsupportedResultKind",
    message: "Input is not displayable.",
    sourcePath: [],
  };
  const unknownStructuredObject = primaryReason.code === "UnsupportedResultKind";

  return nonDisplayable({
    status: "unsupported",
    classification: unknownStructuredObject ? "unknown-structured-object" : "unsupported-shape",
    sourceMode,
    title: "Unsupported input",
    summary: primaryReason.message,
    notDisplayableReason: primaryReason.message,
    sections: unknownSummarySections(value),
    warnings: unknownStructuredObject ? [UNKNOWN_STRUCTURED_OBJECT_NOTICE] : [],
    errors: unknownStructuredObject ? [] : [noticeFromDisplayReason(primaryReason, "error")],
  });
}

function displayableModel(
  displayModel: VerificationReplayResultDisplayModel,
  sourceMode: ReadOnlyViewerSourceMode,
): ReadOnlyViewerModel {
  const classification = classificationFromResultKind(displayModel.resultKind);

  return {
    kind: "readOnlyViewerModel",
    status: "displayable",
    classification,
    sourceMode,
    displayable: true,
    notDisplayableReason: null,
    title: titleFromClassification(classification),
    summary: "Input is displayable as local read-only derived display data.",
    sections: displayModel.sections.map(readOnlySectionFromVerificationSection),
    warnings: [],
    errors: [],
    provenance: READ_ONLY_VIEWER_PROVENANCE,
  };
}

function structuredAnalyzeDisplayModel(
  value: unknown,
  sourceMode: ReadOnlyViewerSourceMode,
): ReadOnlyViewerModel | null {
  if (!isStructuredAnalyzeLikeResult(value)) {
    return null;
  }

  return {
    kind: "readOnlyViewerModel",
    status: "displayable",
    classification: "structured-analyze-like-result",
    sourceMode,
    displayable: true,
    notDisplayableReason: null,
    title: "Structured Analyze result",
    summary: "Existing Structured Analyze result JSON is displayable as local read-only derived inspection data.",
    sections: structuredAnalyzeSections(value),
    warnings: [],
    errors: [],
    provenance: READ_ONLY_VIEWER_PROVENANCE,
  };
}

function nonDisplayable(input: {
  readonly status: Exclude<ReadOnlyViewerStatus, "displayable">;
  readonly classification: ReadOnlyViewerClassification;
  readonly sourceMode: ReadOnlyViewerSourceMode;
  readonly title: string;
  readonly summary: string;
  readonly notDisplayableReason: string;
  readonly sections: readonly ReadOnlyViewerSection[];
  readonly warnings: readonly ReadOnlyViewerNotice[];
  readonly errors: readonly ReadOnlyViewerNotice[];
}): ReadOnlyViewerModel {
  return {
    kind: "readOnlyViewerModel",
    status: input.status,
    classification: input.classification,
    sourceMode: input.sourceMode,
    displayable: false,
    notDisplayableReason: input.notDisplayableReason,
    title: input.title,
    summary: input.summary,
    sections: input.sections,
    warnings: input.warnings,
    errors: input.errors,
    provenance: READ_ONLY_VIEWER_PROVENANCE,
  };
}

function readOnlySectionFromVerificationSection(section: VerificationReplaySection): ReadOnlyViewerSection {
  return {
    id: section.key,
    title: section.label,
    rows: [
      { label: "present", value: section.present },
      { label: "sourcePath", value: section.sourcePath.length === 0 ? null : section.sourcePath.join(".") },
      { label: "value", value: displayValue(section.value) },
    ],
  };
}

function unknownSummarySections(value: unknown): readonly ReadOnlyViewerSection[] {
  if (isJsonObject(value)) {
    const fields = Object.keys(value).sort();
    return [
      {
        id: "unknownFields",
        title: "Unknown Fields",
        rows: [{ label: "fields", value: fields.length === 0 ? null : fields.join(", ") }],
      },
    ];
  }

  return [
    {
      id: "input",
      title: "Input",
      rows: [{ label: "type", value: inputType(value) }],
    },
  ];
}

function classificationFromResultKind(resultKind: VerificationReplayResultKind): ReadOnlyViewerClassification {
  if (resultKind === "run-replay") {
    return "replay-like-result";
  }

  if (resultKind === "artifact-freshness-verification") {
    return "artifact-freshness-like-result";
  }

  return "verification-like-result";
}

function classificationFromStructuredReason(reason: StructuredJsonRejectionReason): ReadOnlyViewerClassification {
  return reason.code === "UnknownEnvelope" || reason.code === "InvalidJsonObject"
    ? "unknown-structured-object"
    : "unsupported-shape";
}

function titleFromClassification(classification: ReadOnlyViewerClassification): string {
  if (classification === "structured-analyze-like-result") {
    return "Structured Analyze result";
  }

  if (classification === "replay-like-result") {
    return "Replay result";
  }

  if (classification === "artifact-freshness-like-result") {
    return "Artifact freshness result";
  }

  return "Verification result";
}

function noticeFromStructuredReason(
  reason: StructuredJsonRejectionReason,
  code: string,
  severity: ReadOnlyViewerNotice["severity"],
): ReadOnlyViewerNotice {
  return {
    code,
    severity,
    message: reason.message,
  };
}

function noticeFromDisplayReason(
  reason: VerificationReplayResultRejectionReason,
  severity: ReadOnlyViewerNotice["severity"],
): ReadOnlyViewerNotice {
  return {
    code: reason.code,
    severity,
    message: reason.message,
  };
}

function parseJsonValue(inputText: string): ParsedJson {
  try {
    return { ok: true, value: JSON.parse(inputText) };
  } catch {
    return { ok: false };
  }
}

function parseKnownJson(inputText: string): unknown {
  const parsed = parseJsonValue(inputText);
  return parsed.ok ? parsed.value : null;
}

function displayValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (value === undefined) {
    return null;
  }

  return stableStringify(value);
}

function structuredAnalyzeSections(result: JsonObject): readonly ReadOnlyViewerSection[] {
  const sections: ReadOnlyViewerSection[] = [
    {
      id: "structuredAnalyzeIdentity",
      title: "Structured Analyze Result",
      rows: [
        rowForPath(result, "kind", ["kind"]),
        rowForPath(result, "contractVersion", ["contractVersion"]),
        rowForPath(result, "operationName", ["operationName"]),
        rowForPath(result, "operationVersion", ["operationVersion"]),
        rowForPath(result, "analysisId", ["analysisId"]),
        rowForPath(result, "status", ["status"]),
      ],
    },
    {
      id: "structuredAnalyzeValidation",
      title: "Validation",
      rows: [
        rowForPath(result, "validation.status", ["validation", "status"]),
        rowForPath(result, "validation.diagnostics", ["validation", "diagnostics"]),
      ],
    },
    {
      id: "structuredAnalyzePayloads",
      title: "Measurements And Evaluations",
      rows: [
        rowForPath(result, "measurements", ["measurements"]),
        rowForPath(result, "evaluations", ["evaluations"]),
      ],
    },
    {
      id: "structuredAnalyzeDecisionComparison",
      title: "Comparison And Decision",
      rows: [
        rowForPath(result, "comparison.status", ["comparison", "status"]),
        rowForPath(result, "decision.status", ["decision", "status"]),
        rowForPath(result, "decision.summary", ["decision", "summary"]),
      ],
    },
    {
      id: "structuredAnalyzeDiagnostics",
      title: "Diagnostics Warnings Errors",
      rows: [
        rowForPath(result, "diagnostics", ["diagnostics"]),
        rowForPath(result, "warnings", ["warnings"]),
        rowForPath(result, "errors", ["errors"]),
      ],
    },
    {
      id: "structuredAnalyzeRefs",
      title: "Provenance And Refs",
      rows: [
        rowForPath(result, "provenance", ["provenance"]),
        rowForPath(result, "inputRefs", ["inputRefs"]),
        rowForPath(result, "outputRefs", ["outputRefs"]),
        rowForPath(result, "packLockRef", ["packLockRef"]),
        rowForPath(result, "operationContextRef", ["operationContextRef"]),
      ],
    },
    {
      id: "structuredAnalyzeReplayReadiness",
      title: "Replay Readiness",
      rows: [
        rowForPath(result, "replayReadiness.status", ["replayReadiness", "status"]),
        rowForFirstPath(result, "replayReadiness.run", [
          ["replayReadiness", "run", "runRef"],
          ["replayReadiness", "run", "id"],
        ]),
      ],
    },
    {
      id: "structuredAnalyzeSerialization",
      title: "Serialization Summary",
      rows: [
        rowForPath(result, "serializationSummary", ["serializationSummary"]),
      ],
    },
  ];

  const unknownRows = unknownStructuredAnalyzeRows(result);
  if (unknownRows.length > 0) {
    sections.push({
      id: "unknownFields",
      title: "Unknown Fields",
      rows: unknownRows,
    });
  }

  return sections;
}

function rowForPath(result: JsonObject, label: string, path: readonly string[]): ReadOnlyViewerRow {
  const found = valueAtPath(result, path);
  return {
    label,
    value: found.present ? displayValue(found.value) : "absent",
  };
}

function rowForFirstPath(
  result: JsonObject,
  label: string,
  paths: readonly (readonly string[])[],
): ReadOnlyViewerRow {
  for (const path of paths) {
    const found = valueAtPath(result, path);
    if (found.present) {
      return {
        label,
        value: displayValue(found.value),
      };
    }
  }

  return {
    label,
    value: "absent",
  };
}

function valueAtPath(value: unknown, path: readonly string[]): PathValue {
  let current = value;
  for (const segment of path) {
    if (!isJsonObject(current) || !Object.hasOwn(current, segment)) {
      return { present: false, value: undefined };
    }

    current = current[segment];
  }

  return { present: true, value: current };
}

function unknownStructuredAnalyzeRows(result: JsonObject): readonly ReadOnlyViewerRow[] {
  return Object.keys(result)
    .filter((field) => !STRUCTURED_ANALYZE_TOP_LEVEL_FIELD_SET.has(field))
    .sort()
    .map((field) => ({
      label: field,
      value: displayValue(result[field]),
    }));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableJsonValue(value, new WeakSet<object>()));
}

function stableJsonValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return String(value);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);
  if (Array.isArray(value)) {
    const stableArray = value.map((item) => stableJsonValue(item, seen));
    seen.delete(value);
    return stableArray;
  }

  const source = value as JsonObject;
  const stableObject: JsonObject = {};
  for (const key of Object.keys(source).sort()) {
    stableObject[key] = stableJsonValue(source[key], seen);
  }
  seen.delete(value);
  return stableObject;
}

function inputType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function structuredAnalyzePayloadFromValue(value: unknown): StructuredAnalyzePayload | null {
  if (isStructuredAnalyzeLikeResult(value)) {
    return { result: value, sourcePath: [] };
  }

  if (!isJsonObject(value)) {
    return null;
  }

  const directMcpPayload = structuredAnalyzePayloadFromMcpToolResult(value, []);
  if (directMcpPayload !== null) {
    return directMcpPayload;
  }

  const structuredContent = structuredAnalyzeMcpContent(value);
  return structuredContent === null
    ? null
    : structuredAnalyzePayloadFromMcpToolResult(structuredContent, ["result", "structuredContent"]);
}

function structuredAnalyzePayloadFromMcpToolResult(
  value: JsonObject,
  sourcePath: readonly string[],
): StructuredAnalyzePayload | null {
  if (
    value.kind !== "norma-mcp-tool-result" ||
    value.tool !== STRUCTURED_ANALYZE_MCP_TOOL ||
    value.status !== "ok" ||
    !isStructuredAnalyzeLikeResult(value.result)
  ) {
    return null;
  }

  return { result: value.result, sourcePath: [...sourcePath, "result"] };
}

function structuredAnalyzeMcpContent(value: JsonObject): JsonObject | null {
  if (
    value.jsonrpc !== "2.0" ||
    Object.hasOwn(value, "method") ||
    Object.hasOwn(value, "params") ||
    Object.hasOwn(value, "error") ||
    !isJsonRpcId(value.id) ||
    !isJsonObject(value.result) ||
    !Array.isArray(value.result.content) ||
    value.result.isError !== false ||
    !isJsonObject(value.result.structuredContent)
  ) {
    return null;
  }

  return value.result.structuredContent;
}

function structuredAnalyzeUnsupportedInputIssue(
  value: JsonObject,
  sourcePath: readonly string[],
): VerificationReplayResultRejectionReason | null {
  const unsupportedKey = Object.keys(value).find(isUnsupportedStructuredAnalyzeInputKey);
  if (unsupportedKey !== undefined) {
    return displayRejectionReason(
      "UnsupportedInput",
      "Unsupported source-truth or execution-shaped input.",
      [...sourcePath, unsupportedKey],
    );
  }

  const blockedPathInput =
    value.path === "/replay-run" ||
    value[BLOCKED_REPLAY_RUN_PATH_FIELD] === "/replay-run" ||
    value[BLOCKED_STRUCTURED_ANALYZE_PATH_FIELD] === "POST /replay-run";
  if (blockedPathInput) {
    const pathKey = Object.hasOwn(value, "path")
      ? "path"
      : Object.hasOwn(value, BLOCKED_REPLAY_RUN_PATH_FIELD)
        ? BLOCKED_REPLAY_RUN_PATH_FIELD
        : BLOCKED_STRUCTURED_ANALYZE_PATH_FIELD;
    return displayRejectionReason("UnsupportedInput", "/replay-run remains blocked.", [...sourcePath, pathKey]);
  }

  const blockedReplayTool = "norma." + "replay" + "Run";
  if (value.tool === blockedReplayTool || value.name === blockedReplayTool || value.method === blockedReplayTool) {
    return displayRejectionReason("UnsupportedInput", "norma.replay" + "Run remains blocked.", sourcePath);
  }

  if (typeof value.method === "string" || Object.hasOwn(value, "params")) {
    return displayRejectionReason("UnsupportedInput", "Arbitrary method wrappers are not accepted.", sourcePath);
  }

  return null;
}

function isUnsupportedStructuredAnalyzeInputKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return [
    "prompt",
    "freeformprompt",
    "artifact",
    "sourcetruth",
    "sourcetruthinference",
    "createsourcetruth",
    "replay",
    "cam" + "era",
    "im" + "age",
    "vision",
    "cad",
    "plug" + "in",
    "market" + "place",
    "url",
    "urlretrieval",
    "filepath",
    "localfile",
    "mutation",
    "runtimeexecution",
  ].includes(normalized) || (normalized.includes("write") && normalized.includes("file"));
}

function displayRejectionReason(
  code: VerificationReplayResultRejectionReason["code"],
  message: string,
  sourcePath: readonly string[],
): VerificationReplayResultRejectionReason {
  return {
    code,
    message,
    sourcePath,
  };
}

function isJsonRpcId(value: unknown): boolean {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStructuredAnalyzeLikeResult(value: unknown): value is JsonObject {
  return isJsonObject(value) && value.kind === STRUCTURED_ANALYZE_RESULT_KIND;
}
