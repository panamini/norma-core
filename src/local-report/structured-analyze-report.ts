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
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
  STABLE_SERIALIZATION_POLICY,
} from "../serialization.js";
import type {
  StructuredCompositionAnalysisInputV1,
  StructuredCompositionAnalysisResultV1,
} from "../structured-composition-analysis.js";
import {
  analyzeStructuredCompositionV1,
} from "../structured-composition-analysis.js";

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
    geometryHarmoniesPack: false;
    newRatioPack: false;
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

export function createLocalStructuredAnalyzeReportBundle(
  input: unknown,
): LocalStructuredAnalyzeReportBundle {
  const result = analyzeStructuredCompositionV1(input as StructuredCompositionAnalysisInputV1 | null | undefined);
  const summary = createSummary(input, result);
  const visualSvg = createVisualSvg(input, result, summary);
  const summaryMarkdown = createSummaryMarkdown(summary);
  const reportHtml = createReportHtml(summary, visualSvg);

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
      geometryHarmoniesPack: false,
      newRatioPack: false,
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
    `- analysisId: ${summary.analysisId}`,
    `- status: ${summary.status}`,
    `- operation: ${summary.operation.name}@${summary.operation.version}`,
    `- boundary: ${summary.operation.boundary}`,
    `- input: ${summary.input.compositionAId ?? "unknown"} vs ${summary.input.compositionBId ?? "unknown"}`,
    `- decision: ${summary.decision?.summary ?? "none"}`,
    `- diagnostics: ${summary.diagnostics.errorCount} errors, ${summary.diagnostics.warningCount} warnings`,
    `- replayReadiness: ${summary.replayReadiness.status ?? "none"}`,
    "",
    "## Output Bundle",
    "",
    ...summary.outputFiles.map((file) => `- ${file}`),
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
    "- no geometry harmonies pack",
    "- no new ratio pack",
    "- no recommendation",
    "- no beauty score",
    "- no prompt/image inference",
    "",
  ].join("\n");
}

function createReportHtml(summary: LocalStructuredAnalyzeReportSummaryV1, visualSvg: string): string {
  const summaryJson = serializeCanonicalJson(summary, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<title>Local Structured Analyze Report</title>",
    "<style>",
    "body{font-family:Arial,sans-serif;margin:32px;color:#111827;background:#ffffff;}",
    "main{max-width:960px;margin:0 auto;}",
    "h1{font-size:24px;line-height:1.2;margin:0 0 16px;}",
    "dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;}",
    "dt{font-weight:700;}dd{margin:0;}",
    "pre{overflow:auto;background:#f3f4f6;padding:16px;border:1px solid #d1d5db;}",
    "svg{display:block;max-width:100%;height:auto;margin:24px 0;border:1px solid #d1d5db;}",
    "</style>",
    "</head>",
    "<body>",
    "<main>",
    "<h1>Local Structured Analyze Report</h1>",
    "<dl>",
    `<dt>analysisId</dt><dd>${escapeHtml(summary.analysisId)}</dd>`,
    `<dt>status</dt><dd>${escapeHtml(summary.status)}</dd>`,
    `<dt>operation</dt><dd>${escapeHtml(`${summary.operation.name}@${summary.operation.version}`)}</dd>`,
    `<dt>boundary</dt><dd>${escapeHtml(summary.operation.boundary)}</dd>`,
    `<dt>decision</dt><dd>${escapeHtml(summary.decision?.summary ?? "none")}</dd>`,
    `<dt>diagnostics</dt><dd>${summary.diagnostics.errorCount} errors, ${summary.diagnostics.warningCount} warnings</dd>`,
    "</dl>",
    visualSvg,
    "<h2>Summary JSON</h2>",
    `<pre>${escapeHtml(summaryJson)}</pre>`,
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
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
  if (!isRect(surfaceBounds) || !isComposition2D(compositionA) || !isComposition2D(compositionB)) {
    return emptyVisualSvg(summary);
  }

  const gap = Math.max(24, surfaceBounds.width * 0.08);
  const labelHeight = 36;
  const width = surfaceBounds.width * 2 + gap;
  const height = surfaceBounds.height + labelHeight;
  const aOffset = 0;
  const bOffset = surfaceBounds.width + gap;

  return [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${numberAttr(width)} ${numberAttr(height)}" role="img" aria-labelledby="title desc">`,
    `<title id="title">Local structured analysis visual for ${escapeXml(summary.analysisId)}</title>`,
    `<desc id="desc">Deterministic rendering of explicit Composition2D rectangles for composition A and composition B.</desc>`,
    "<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>",
    label("Composition A", aOffset, 0),
    label("Composition B", bOffset, 0),
    renderComposition(compositionA, surfaceBounds, aOffset, labelHeight, "#2563eb"),
    renderComposition(compositionB, surfaceBounds, bOffset, labelHeight, "#059669"),
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
): string {
  const elements = composition.elements
    .filter(isRenderableElement)
    .sort((first, second) => compareStableStrings(first.id, second.id));

  return [
    `<g data-composition="${escapeXml(composition.id)}">`,
    `<rect x="${numberAttr(xOffset)}" y="${numberAttr(yOffset)}" width="${numberAttr(surfaceBounds.width)}" height="${numberAttr(surfaceBounds.height)}" fill="#f9fafb" stroke="#111827" stroke-width="1"/>`,
    ...elements.map((element) => renderElement(element.id, element.geometry, surfaceBounds, xOffset, yOffset, fill)),
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

  return [
    `<rect data-element="${escapeXml(id)}" x="${numberAttr(x)}" y="${numberAttr(y)}" width="${numberAttr(rect.width)}" height="${numberAttr(rect.height)}" fill="${fill}" fill-opacity="0.35" stroke="${fill}" stroke-width="2"/>`,
    `<title>${escapeXml(id)}</title>`,
  ].join("");
}

function label(value: string, x: number, y: number): string {
  return `<text x="${numberAttr(x)}" y="${numberAttr(y + 22)}" font-size="16" font-weight="700" fill="#111827">${escapeXml(value)}</text>`;
}

function diagnosticCodes(diagnostics: readonly Diagnostic[]): readonly string[] {
  return [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort(compareStableStrings);
}

function compositionId(value: unknown): string | null {
  return isComposition2D(value) ? value.id : null;
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
    && Number.isFinite((value as Rect).height);
}

function numberAttr(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/u, "").replace(/\.$/u, "");
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
