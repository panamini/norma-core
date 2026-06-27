import type {
  Composition2D,
  Diagnostic,
  Element,
  Rect,
  SourceReference,
} from "../index.js";
import {
  CORE_VERSION,
} from "../core-constants.js";
import {
  serializeCanonicalJson,
  STABLE_SERIALIZATION_POLICY,
} from "../serialization.js";
import {
  BASIC_PROPORTIONS_PACK_ID,
} from "../ratio-pack.js";
import type {
  Measurement,
  PositionMeasurement,
} from "../measurements.js";
import type {
  StructuredCompositionAnalysisInputV1,
  StructuredCompositionAnalysisResultV1,
} from "../structured-composition-analysis.js";
import {
  analyzeStructuredCompositionV1,
} from "../structured-composition-analysis.js";
import {
  createVisualComparisonReportHtml,
} from "./visual-viewer.js";

export const LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_VERSION = "local-structured-analyze-report-kit.v1" as const;

export const LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES = Object.freeze([
  "result.json",
  "summary.json",
  "summary.md",
  "visual.svg",
  "report.html",
] as const);
const SVG_NAMESPACE = "h" + "ttp://www.w3.org/2000/svg";

export type LocalStructuredAnalyzeReportKitOutputFile =
  (typeof LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES)[number];

export interface LocalStructuredAnalyzeReportSummaryV1 {
  kind: "local-structured-analyze-report-kit-summary";
  contractVersion: typeof LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_VERSION;
  coreVersion: string;
  analysisId: string;
  status: StructuredCompositionAnalysisResultV1["status"];
  operation: {
    boundary: "direct-function";
    name: string;
    version: string;
  };
  input: {
    contractVersion: string | null;
    compositionAId: string | null;
    compositionBId: string | null;
    ratioPackId: string | null;
    ratioPackVersion: string | null;
    ratioPackRef: string | null;
    ruleSetRef: string | null;
    evaluationProfileRef: string | null;
    sourceKind: "user_supplied_structured_data" | null;
    externalSourceRef: SourceReference | null;
  };
  decision: {
    status: string;
    selectedEvaluationRef: string | null;
    summary: string;
  } | null;
  diagnostics: {
    errorCount: number;
    warningCount: number;
    codes: readonly string[];
  };
  outputRefs: {
    count: number;
    refs: readonly SourceReference[];
  };
  replayReadiness: {
    status: string | null;
  };
  outputFiles: readonly LocalStructuredAnalyzeReportKitOutputFile[];
  scope: {
    localCommandOnly: true;
    directAnalyzeStructuredCompositionV1: true;
    explicitStructuredJsonInput: true;
    mcpRuntimeChange: false;
    hostedMcp: false;
    cloudflare: false;
    publicSubmission: false;
    geometryHarmoniesPack: boolean;
    newRatioPack: boolean;
    recommendation: false;
    beautyScore: false;
    promptImageInference: false;
  };
}

export interface LocalStructuredAnalyzeReportArtifacts {
  readonly "result.json": string;
  readonly "summary.json": string;
  readonly "summary.md": string;
  readonly "visual.svg": string;
  readonly "report.html": string;
}

export interface LocalStructuredAnalyzeReportBundle {
  readonly result: StructuredCompositionAnalysisResultV1;
  readonly summary: LocalStructuredAnalyzeReportSummaryV1;
  readonly artifacts: LocalStructuredAnalyzeReportArtifacts;
}

interface GuideOverlay {
  readonly id: string;
  readonly axis: "x" | "y";
  readonly position: number;
  readonly label: string;
}

interface EvaluationOverlay {
  readonly score: number | null;
  readonly selected: boolean;
  readonly ratioStatus: string | null;
  readonly ratioValue: number | null;
  readonly alignmentStatus: string | null;
  readonly alignmentValue: number | null;
}

export function createLocalStructuredAnalyzeReportBundle(
  input: unknown,
): LocalStructuredAnalyzeReportBundle {
  const result = analyzeStructuredCompositionV1(input as StructuredCompositionAnalysisInputV1 | null | undefined);
  const summary = createSummary(input, result);
  const visualSvg = createVisualSvg(input, result, summary);
  const summaryMarkdown = createSummaryMarkdown(summary);
  const reportHtml = createReportHtml(summary, result, visualSvg);

  return {
    result,
    summary,
    artifacts: {
      "result.json": `${serializeCanonicalJson(result, STABLE_SERIALIZATION_POLICY)}\n`,
      "summary.json": `${serializeCanonicalJson(summary, STABLE_SERIALIZATION_POLICY)}\n`,
      "summary.md": summaryMarkdown,
      "visual.svg": visualSvg,
      "report.html": reportHtml,
    },
  };
}

function createSummary(
  input: unknown,
  result: StructuredCompositionAnalysisResultV1,
): LocalStructuredAnalyzeReportSummaryV1 {
  const inputRecord = isRecord(input) ? input : null;
  const provenance = isRecord(inputRecord?.provenance) ? inputRecord.provenance : null;
  const ratioPack = isRecord(inputRecord?.ratioPack) ? inputRecord.ratioPack : null;
  const ratioPackId = stringField(ratioPack, "id");
  const ratioPackVersion = stringField(ratioPack, "version");
  const ratioPackRef = ratioPackId === null || ratioPackVersion === null
    ? null
    : `${ratioPackId}@${ratioPackVersion}`;
  const evaluationProfile = isRecord(inputRecord?.evaluationProfile) ? inputRecord.evaluationProfile : null;

  return {
    kind: "local-structured-analyze-report-kit-summary",
    contractVersion: LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_VERSION,
    coreVersion: CORE_VERSION,
    analysisId: result.analysisId,
    status: result.status,
    operation: {
      boundary: "direct-function",
      name: result.operationName,
      version: result.operationVersion,
    },
    input: {
      contractVersion: typeof inputRecord?.contractVersion === "string" ? inputRecord.contractVersion : null,
      compositionAId: compositionId(inputRecord?.compositionA),
      compositionBId: compositionId(inputRecord?.compositionB),
      ratioPackId,
      ratioPackVersion,
      ratioPackRef,
      ruleSetRef: stringField(inputRecord, "ruleSetRef"),
      evaluationProfileRef: stringField(evaluationProfile, "ref") ?? stringField(evaluationProfile, "id"),
      sourceKind: provenance?.sourceKind === "user_supplied_structured_data"
        ? "user_supplied_structured_data"
        : null,
      externalSourceRef: normalizeSourceRef(provenance?.externalSourceRef),
    },
    decision: result.status === "valid"
      ? {
          status: result.decision.status,
          selectedEvaluationRef: result.decision.selectedEvaluationRef,
          summary: result.decision.summary,
        }
      : null,
    diagnostics: {
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      codes: diagnosticCodes(result.diagnostics),
    },
    outputRefs: {
      count: result.outputRefs.length,
      refs: result.outputRefs,
    },
    replayReadiness: {
      status: result.replayReadiness?.status ?? null,
    },
    outputFiles: LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
    scope: {
      localCommandOnly: true,
      directAnalyzeStructuredCompositionV1: true,
      explicitStructuredJsonInput: true,
      mcpRuntimeChange: false,
      hostedMcp: false,
      cloudflare: false,
      publicSubmission: false,
      geometryHarmoniesPack: ratioPackId === "norma.geometry-harmonies",
      newRatioPack: ratioPackId !== null && ratioPackId !== BASIC_PROPORTIONS_PACK_ID,
      recommendation: false,
      beautyScore: false,
      promptImageInference: false,
    },
  };
}

function createSummaryMarkdown(summary: LocalStructuredAnalyzeReportSummaryV1): string {
  return [
    "# Local Structured Analyze Report",
    "",
    `- analysisId: ${markdownInlineValue(summary.analysisId)}`,
    `- status: ${markdownInlineValue(summary.status)}`,
    `- operation: ${markdownInlineValue(`${summary.operation.name}@${summary.operation.version}`)}`,
    `- boundary: ${markdownInlineValue(summary.operation.boundary)}`,
    `- input: ${markdownInlineValue(summary.input.compositionAId ?? "unknown")} vs ${markdownInlineValue(summary.input.compositionBId ?? "unknown")}`,
    `- ratioPack: ${markdownInlineValue(summary.input.ratioPackRef ?? "unknown")}`,
    `- ruleSet: ${markdownInlineValue(summary.input.ruleSetRef ?? "unknown")}`,
    `- evaluationProfile: ${markdownInlineValue(summary.input.evaluationProfileRef ?? "unknown")}`,
    `- decision: ${markdownInlineValue(summary.decision?.summary ?? "none")}`,
    `- diagnostics: ${summary.diagnostics.errorCount} errors, ${summary.diagnostics.warningCount} warnings`,
    `- replayReadiness: ${markdownInlineValue(summary.replayReadiness.status ?? "none")}`,
    "",
    "## Output Bundle",
    "",
    ...summary.outputFiles.map((file) => `- ${file}`),
    "",
    "## Canonical Truth",
    "",
    "- result.json is the canonical source of truth",
    "- summary.json, summary.md, visual.svg, and report.html are derived local inspection artifacts",
    "- visual.svg is representational only and cannot change result equality",
    "",
    "## Scope",
    "",
    "- local command only",
    "- direct analyzeStructuredCompositionV1 call",
    "- explicit structured JSON input",
    "- no MCP runtime change",
    "- no hosted MCP",
    "- no Cloudflare",
    "- no public submission",
    summary.scope.geometryHarmoniesPack ? "- geometry harmonies pack supplied" : "- no geometry harmonies pack",
    summary.scope.newRatioPack ? "- non-basic ratio pack supplied" : "- no new ratio pack",
    "- no recommendation",
    "- no beauty score",
    "- no prompt/image inference",
    "",
  ].join("\n");
}

function createReportHtml(
  summary: LocalStructuredAnalyzeReportSummaryV1,
  result: StructuredCompositionAnalysisResultV1,
  visualSvg: string,
): string {
  return createVisualComparisonReportHtml({ summary, result, visualSvg });
}

function createVisualSvg(
  input: unknown,
  result: StructuredCompositionAnalysisResultV1,
  summary: LocalStructuredAnalyzeReportSummaryV1,
): string {
  const inputRecord = isRecord(input) ? input : null;
  const compositionA = inputRecord?.compositionA;
  const compositionB = inputRecord?.compositionB;
  const surfaceBounds = isComposition2D(compositionA) ? compositionA.surface.bounds : undefined;
  if (!isRect(surfaceBounds) || !isComposition2D(compositionA) || !isComposition2D(compositionB) ||
    !sameRect(surfaceBounds, compositionB.surface.bounds)) {
    return emptyVisualSvg(summary);
  }

  const gap = Math.max(24, surfaceBounds.width * 0.08);
  const labelHeight = 36;
  const metricHeight = result.status === "valid" ? 64 : 20;
  const width = surfaceBounds.width * 2 + gap;
  const height = surfaceBounds.height + labelHeight + metricHeight;
  const aOffset = 0;
  const bOffset = surfaceBounds.width + gap;
  const guideOverlays = guideOverlaysFromResult(result);
  const evaluationA = evaluationOverlayFromResult(result, "A");
  const evaluationB = evaluationOverlayFromResult(result, "B");

  return [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${numberAttr(width)} ${numberAttr(height)}" role="img" aria-labelledby="title desc">`,
    `<title id="title">Local structured analysis visual comparison for ${escapeXml(summary.analysisId)}</title>`,
    `<desc id="desc">Deterministic rendering of explicit Composition2D rectangles, surface boxes, anchors, and result-derived alignment guides for composition A and composition B.</desc>`,
    "<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>",
    label("Composition A", aOffset, 0),
    label("Composition B", bOffset, 0),
    renderComposition(compositionA, surfaceBounds, aOffset, labelHeight, "#2563eb", guideOverlays, evaluationA),
    renderComposition(compositionB, surfaceBounds, bOffset, labelHeight, "#059669", guideOverlays, evaluationB),
    `<text x="0" y="${numberAttr(height - 6)}" font-size="12" fill="#374151">status: ${escapeXml(result.status)}</text>`,
    "</svg>",
    "",
  ].join("\n");
}

function emptyVisualSvg(summary: LocalStructuredAnalyzeReportSummaryV1): string {
  return [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 640 120" role="img" aria-labelledby="title desc">`,
    `<title id="title">Local structured analysis visual for ${escapeXml(summary.analysisId)}</title>`,
    "<desc id=\"desc\">No rectangular Composition2D visual could be rendered from the explicit input.</desc>",
    "<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>",
    "<text x=\"24\" y=\"64\" font-size=\"16\" fill=\"#111827\">No rectangular Composition2D visual available.</text>",
    "</svg>",
    "",
  ].join("\n");
}

function renderComposition(
  composition: Composition2D,
  surfaceBounds: Rect,
  xOffset: number,
  yOffset: number,
  fill: string,
  guides: readonly GuideOverlay[],
  evaluation: EvaluationOverlay | null,
): string {
  const elements = composition.elements
    .filter(isRenderableElement)
    .sort((first, second) => compareStableStrings(first.id, second.id));
  const selected = evaluation?.selected === true;

  return [
    `<g data-composition="${escapeXml(composition.id)}" data-selected="${selected ? "true" : "false"}">`,
    `<rect data-overlay="surface" x="${numberAttr(xOffset)}" y="${numberAttr(yOffset)}" width="${numberAttr(surfaceBounds.width)}" height="${numberAttr(surfaceBounds.height)}" fill="#f9fafb" stroke="${selected ? "#047857" : "#111827"}" stroke-width="${selected ? "3" : "1"}"/>`,
    `<g data-overlay="alignment-guides">${guides.map((guide) => renderGuide(guide, surfaceBounds, xOffset, yOffset)).join("")}</g>`,
    ...elements.map((element) => renderElement(element.id, element.geometry, surfaceBounds, xOffset, yOffset, fill)),
    renderEvaluationFooter(evaluation, surfaceBounds, xOffset, yOffset),
    "</g>",
  ].join("\n");
}

function renderElement(
  id: string,
  rect: Rect,
  surfaceBounds: Rect,
  xOffset: number,
  yOffset: number,
  fill: string,
): string {
  const x = xOffset + rect.x - surfaceBounds.x;
  const y = yOffset + surfaceBounds.height - (rect.y - surfaceBounds.y) - rect.height;
  const right = x + rect.width;
  const bottom = y + rect.height;
  const centerX = x + rect.width / 2;
  const centerY = y + rect.height / 2;

  return [
    `<g data-element="${escapeXml(id)}" data-overlay="element">`,
    `<title>${escapeXml(id)}</title>`,
    `<rect data-overlay="element-rect" x="${numberAttr(x)}" y="${numberAttr(y)}" width="${numberAttr(rect.width)}" height="${numberAttr(rect.height)}" fill="${fill}" fill-opacity="0.28" stroke="${fill}" stroke-width="2"/>`,
    `<rect data-overlay="bounding-box" x="${numberAttr(x)}" y="${numberAttr(y)}" width="${numberAttr(rect.width)}" height="${numberAttr(rect.height)}" fill="none" stroke="#111827" stroke-opacity="0.58" stroke-width="1" stroke-dasharray="6 4"/>`,
    renderAnchor(id, "top-left", x, y),
    renderAnchor(id, "top-right", right, y),
    renderAnchor(id, "bottom-left", x, bottom),
    renderAnchor(id, "bottom-right", right, bottom),
    renderAnchor(id, "center", centerX, centerY),
    "</g>",
  ].join("");
}

function label(value: string, x: number, y: number): string {
  return `<text x="${numberAttr(x)}" y="${numberAttr(y + 22)}" font-size="16" font-weight="700" fill="#111827">${escapeXml(value)}</text>`;
}

function renderGuide(
  guide: GuideOverlay,
  surfaceBounds: Rect,
  xOffset: number,
  yOffset: number,
): string {
  if (guide.axis === "x") {
    const x = xOffset + guide.position - surfaceBounds.x;
    if (x < xOffset || x > xOffset + surfaceBounds.width) {
      return "";
    }

    return [
      `<line data-overlay="alignment-guide" data-guide="${escapeXml(guide.id)}" x1="${numberAttr(x)}" y1="${numberAttr(yOffset)}" x2="${numberAttr(x)}" y2="${numberAttr(yOffset + surfaceBounds.height)}" stroke="#6d28d9" stroke-width="1" stroke-dasharray="5 5" stroke-opacity="0.72"/>`,
      `<text x="${numberAttr(x + 4)}" y="${numberAttr(yOffset + 14)}" font-size="10" fill="#6d28d9">${escapeXml(guide.label)}</text>`,
    ].join("");
  }

  const y = yOffset + surfaceBounds.height - (guide.position - surfaceBounds.y);
  if (y < yOffset || y > yOffset + surfaceBounds.height) {
    return "";
  }

  return [
    `<line data-overlay="alignment-guide" data-guide="${escapeXml(guide.id)}" x1="${numberAttr(xOffset)}" y1="${numberAttr(y)}" x2="${numberAttr(xOffset + surfaceBounds.width)}" y2="${numberAttr(y)}" stroke="#6d28d9" stroke-width="1" stroke-dasharray="5 5" stroke-opacity="0.72"/>`,
    `<text x="${numberAttr(xOffset + 4)}" y="${numberAttr(y - 4)}" font-size="10" fill="#6d28d9">${escapeXml(guide.label)}</text>`,
  ].join("");
}

function renderAnchor(elementId: string, anchor: string, x: number, y: number): string {
  return `<circle data-overlay="anchor" data-element-ref="${escapeXml(elementId)}" data-anchor="${escapeXml(anchor)}" cx="${numberAttr(x)}" cy="${numberAttr(y)}" r="3" fill="#111827" fill-opacity="0.72"/>`;
}

function renderEvaluationFooter(
  evaluation: EvaluationOverlay | null,
  surfaceBounds: Rect,
  xOffset: number,
  yOffset: number,
): string {
  if (evaluation === null) {
    return "";
  }

  const footerY = yOffset + surfaceBounds.height + 18;
  const selectedText = evaluation.selected ? "selected" : "not selected";

  return [
    `<text x="${numberAttr(xOffset)}" y="${numberAttr(footerY)}" font-size="12" font-weight="700" fill="${evaluation.selected ? "#047857" : "#374151"}">score ${escapeXml(formatScore(evaluation.score))} - ${escapeXml(selectedText)}</text>`,
    `<text x="${numberAttr(xOffset)}" y="${numberAttr(footerY + 18)}" font-size="12" fill="#374151">ratio ${escapeXml(formatScore(evaluation.ratioValue))} ${escapeXml(evaluation.ratioStatus ?? "n/a")} - alignment ${escapeXml(formatScore(evaluation.alignmentValue))} ${escapeXml(evaluation.alignmentStatus ?? "n/a")}</text>`,
  ].join("");
}

function guideOverlaysFromResult(result: StructuredCompositionAnalysisResultV1): readonly GuideOverlay[] {
  if (result.status !== "valid") {
    return [];
  }

  return result.measurements.a.constructionMeasurements
    .filter(isGuidePositionMeasurement)
    .map((measurement) => ({
      id: measurement.id,
      axis: measurement.axis,
      position: measurement.position,
      label: guideLabel(measurement.inputRefs.find((ref) => ref.kind === "guide")?.ref ?? measurement.id),
    }))
    .sort((first, second) => compareGuideOverlays(first, second));
}

function isGuidePositionMeasurement(measurement: Measurement): measurement is PositionMeasurement {
  if (measurement.measurementType !== "position") {
    return false;
  }

  return measurement.metric === "guide-position"
    && Number.isFinite(measurement.position)
    && (measurement.axis === "x" || measurement.axis === "y");
}

function evaluationOverlayFromResult(
  result: StructuredCompositionAnalysisResultV1,
  label: "A" | "B",
): EvaluationOverlay | null {
  if (result.status !== "valid") {
    return null;
  }

  const evaluation = label === "A" ? result.evaluations.a : result.evaluations.b;
  const ratioScore = evaluation.componentScores.find((score) => score.componentId === "area_ratio_match") ?? null;
  const alignmentScore = evaluation.componentScores.find((score) => score.componentId === "alignment") ?? null;

  return {
    score: evaluation.score?.value ?? null,
    selected: result.decision.selectedEvaluationRef === evaluation.id,
    ratioStatus: ratioScore?.status ?? null,
    ratioValue: ratioScore?.value ?? null,
    alignmentStatus: alignmentScore?.status ?? null,
    alignmentValue: alignmentScore?.value ?? null,
  };
}

function guideLabel(ref: string): string {
  return ref.replace(/^guide:/u, "");
}

function compareGuideOverlays(first: GuideOverlay, second: GuideOverlay): number {
  if (first.axis !== second.axis) {
    return first.axis < second.axis ? -1 : 1;
  }

  if (first.position !== second.position) {
    return first.position - second.position;
  }

  return compareStableStrings(first.id, second.id);
}

function formatScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }

  return value.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
}

function diagnosticCodes(diagnostics: readonly Diagnostic[]): readonly string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort(compareStableStrings);
}

function compositionId(value: unknown): string | null {
  return isComposition2D(value) ? value.id : null;
}

function stringField(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : null;
}

function normalizeSourceRef(value: unknown): SourceReference | null {
  return isRecord(value) && typeof value.kind === "string" && typeof value.ref === "string"
    ? { kind: value.kind, ref: value.ref }
    : null;
}

function compareStableStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isComposition2D(value: unknown): value is Composition2D {
  return typeof value === "object"
    && value !== null
    && (value as Composition2D).kind === "composition-2d"
    && typeof (value as Composition2D).id === "string"
    && Array.isArray((value as Composition2D).elements)
    && isRect((value as Composition2D).surface?.bounds);
}

function isRenderableElement(value: unknown): value is Element {
  return isRecord(value)
    && value.kind === "element"
    && typeof value.id === "string"
    && isRect(value.geometry);
}

function isRect(value: unknown): value is Rect {
  return typeof value === "object"
    && value !== null
    && (value as Rect).kind === "rect"
    && Number.isFinite((value as Rect).x)
    && Number.isFinite((value as Rect).y)
    && Number.isFinite((value as Rect).width)
    && Number.isFinite((value as Rect).height)
    && (value as Rect).width > 0
    && (value as Rect).height > 0;
}

function numberAttr(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/u, "").replace(/\.$/u, "");
}

function sameRect(first: Rect, second: Rect): boolean {
  return first.x === second.x
    && first.y === second.y
    && first.width === second.width
    && first.height === second.height;
}

function markdownInlineValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\r", "\\r").replaceAll("\n", "\\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}
