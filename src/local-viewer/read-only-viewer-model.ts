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

  return modelFromDisplayRejection(displayModel.rejectionReasons, sourceMode, value);
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

function parseKnownJson(inputText: string): unknown {
  try {
    return JSON.parse(inputText);
  } catch {
    return null;
  }
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

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
