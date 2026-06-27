import type {
  Comparison,
  ComponentDelta,
} from "../comparison.js";
import type {
  ComponentScore,
  Evaluation,
  EvaluationComponentId,
} from "../evaluation.js";
import type {
  Diagnostic,
  SourceReference,
} from "../index.js";
import type {
  MeasurementSet,
} from "../measurements.js";
import type {
  StructuredCompositionAnalysisResultV1,
} from "../structured-composition-analysis.js";
import type {
  LocalStructuredAnalyzeReportSummaryV1,
} from "./structured-analyze-report.js";

export interface VisualComparisonReportHtmlInput {
  readonly summary: LocalStructuredAnalyzeReportSummaryV1;
  readonly result: StructuredCompositionAnalysisResultV1;
  readonly visualSvg: string;
}

export function createVisualComparisonReportHtml(input: VisualComparisonReportHtmlInput): string {
  if (input.result.status !== "valid") {
    return createFallbackReportHtml(input.summary, input.result, input.visualSvg);
  }

  const evaluationA = input.result.evaluations.a;
  const evaluationB = input.result.evaluations.b;
  const selectedComposition = selectedCompositionLabel(
    input.result.decision.selectedEvaluationRef,
    evaluationA.id,
    evaluationB.id,
  );
  const ratioA = scoreForComponent(evaluationA, "area_ratio_match");
  const ratioB = scoreForComponent(evaluationB, "area_ratio_match");
  const alignmentA = scoreForComponent(evaluationA, "alignment");
  const alignmentB = scoreForComponent(evaluationB, "alignment");

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Local Structured Analyze Report</title>",
    "<style>",
    reportCss(),
    "</style>",
    "</head>",
    "<body>",
    "<main class=\"report-shell\">",
    "<header class=\"report-header\">",
    "<div>",
    "<p class=\"kicker\">Local Structured Analyze Report</p>",
    `<h1>${escapeHtml(input.summary.analysisId)}</h1>`,
    "</div>",
    "<dl class=\"status-strip\" aria-label=\"Report status\">",
    metric("status", input.summary.status),
    metric("decision", input.result.decision.summary),
    metric("selected", selectedComposition ?? "none"),
    metric("replay", input.result.replayReadiness.status),
    "</dl>",
    "</header>",
    "<section class=\"report-layout\" aria-label=\"Structured Analyze visual comparison\">",
    "<section class=\"visual-panel\" aria-label=\"Composition A and B comparison\">",
    "<div class=\"visual-frame\">",
    input.visualSvg,
    "</div>",
    "<div class=\"legend\" aria-label=\"Overlay legend\">",
    legendItem("surface", "Surface"),
    legendItem("element", "Element"),
    legendItem("bbox", "Bounding box"),
    legendItem("guide", "Alignment guide"),
    legendItem("anchor", "Anchor"),
    legendItem("selected", "Selected"),
    "</div>",
    "</section>",
    "<aside class=\"summary-panel\" aria-label=\"Structured summary\">",
    "<h2>Input Contract</h2>",
    "<dl>",
    metric("analysis id", input.summary.analysisId),
    metric("contract", input.summary.input.contractVersion ?? "unknown"),
    metric("composition A", input.summary.input.compositionAId ?? "unknown"),
    metric("composition B", input.summary.input.compositionBId ?? "unknown"),
    metric("operation", `${input.summary.operation.name}@${input.summary.operation.version}`),
    metric("boundary", input.summary.operation.boundary),
    metric("ratio pack", input.summary.input.ratioPackRef ?? "unknown"),
    metric("rule set", input.summary.input.ruleSetRef ?? "unknown"),
    metric("evaluation", input.summary.input.evaluationProfileRef ?? "unknown"),
    metric("diagnostics", `${input.summary.diagnostics.errorCount} errors, ${input.summary.diagnostics.warningCount} warnings`),
    "</dl>",
    "</aside>",
    "</section>",
    "<section class=\"detail-grid\" aria-label=\"Structured Analyze inspection details\">",
    detailPanel("Operation Boundary", [
      ["operation", `${input.summary.operation.name}@${input.summary.operation.version}`],
      ["boundary", input.summary.operation.boundary],
      ["pack lock", input.result.packLockRef.id],
      ["operation context", input.result.operationContextRef.id],
    ]),
    detailPanel("Ratio Pack / Rule Set / Evaluation Profile", [
      ["ratio pack", input.summary.input.ratioPackRef ?? "unknown"],
      ["rule set", input.summary.input.ruleSetRef ?? "unknown"],
      ["evaluation profile", input.summary.input.evaluationProfileRef ?? "unknown"],
      ["tie tolerance", formatScore(input.result.comparison.tieTolerance)],
    ]),
    decisionPanel(input.result.decision, selectedComposition),
    replayPanel(input.result),
    "</section>",
    measurementsPanel(input.result.measurements),
    "<section class=\"evaluation-grid\" aria-label=\"Evaluation results\">",
    evaluationCard("Composition A", evaluationA, input.result.decision.selectedEvaluationRef),
    evaluationCard("Composition B", evaluationB, input.result.decision.selectedEvaluationRef),
    "</section>",
    "<section class=\"ratio-compare\" aria-label=\"Ratio and alignment comparison\">",
    "<h2>Comparison Deltas</h2>",
    "<dl class=\"comparison-summary\">",
    metric("comparison", input.result.comparison.status),
    metric("score delta", formatSignedScore(input.result.comparison.scoreDelta)),
    metric("tie tolerance", formatScore(input.result.comparison.tieTolerance)),
    metric("decision", input.result.decision.summary),
    "</dl>",
    "<div class=\"comparison-bars\">",
    scoreBar("A ratio", ratioA),
    scoreBar("B ratio", ratioB),
    scoreBar("A alignment", alignmentA),
    scoreBar("B alignment", alignmentB),
    "</div>",
    componentDeltaTable(input.result.comparison),
    "</section>",
    diagnosticsPanel(input.result),
    provenancePanel(input.summary, input.result),
    artifactPanel(input.summary.outputFiles),
    canonicalResultPanel(),
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function createFallbackReportHtml(
  summary: LocalStructuredAnalyzeReportSummaryV1,
  result: StructuredCompositionAnalysisResultV1,
  visualSvg: string,
): string {
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Local Structured Analyze Report</title>",
    "<style>",
    reportCss(),
    "</style>",
    "</head>",
    "<body>",
    "<main class=\"report-shell report-shell-invalid\">",
    "<header class=\"report-header\">",
    "<div>",
    "<p class=\"kicker\">Local Structured Analyze Report</p>",
    `<h1>${escapeHtml(summary.analysisId)}</h1>`,
    "</div>",
    "<dl class=\"status-strip\" aria-label=\"Report status\">",
    metric("status", summary.status),
    metric("decision", "none"),
    metric("selected", "none"),
    metric("replay", "none"),
    "</dl>",
    "</header>",
    "<section class=\"report-layout\" aria-label=\"Invalid Structured Analyze report inspection\">",
    "<section class=\"visual-panel\" aria-label=\"Invalid report visual artifact\">",
    "<div class=\"visual-frame visual-frame-empty\">",
    visualSvg,
    "</div>",
    "</section>",
    "<aside class=\"summary-panel\" aria-label=\"Invalid report summary\">",
    "<h2>Input Contract</h2>",
    "<dl>",
    metric("analysis id", summary.analysisId),
    metric("contract", summary.input.contractVersion ?? "unknown"),
    metric("operation", `${summary.operation.name}@${summary.operation.version}`),
    metric("boundary", summary.operation.boundary),
    metric("ratio pack", summary.input.ratioPackRef ?? "unknown"),
    metric("rule set", summary.input.ruleSetRef ?? "unknown"),
    metric("evaluation profile", summary.input.evaluationProfileRef ?? "unknown"),
    metric("diagnostics", `${summary.diagnostics.errorCount} errors, ${summary.diagnostics.warningCount} warnings`),
    "</dl>",
    "</aside>",
    "</section>",
    "<section class=\"detail-grid\" aria-label=\"Invalid result inspection details\">",
    detailPanel("Operation Boundary", [
      ["operation", `${summary.operation.name}@${summary.operation.version}`],
      ["boundary", summary.operation.boundary],
      ["pack lock", result.packLockRef?.id ?? "none"],
      ["operation context", result.operationContextRef?.id ?? "none"],
    ]),
    detailPanel("Replay Readiness", [
      ["status", summary.replayReadiness.status ?? result.replayReadiness?.status ?? "none"],
      ["run", result.replayReadiness?.run.runRef.id ?? "none"],
      ["result status", result.status],
      ["output refs", formatSourceRefs(result.outputRefs)],
    ]),
    "</section>",
    diagnosticsPanel(result),
    provenancePanel(summary, result),
    artifactPanel(summary.outputFiles),
    canonicalResultPanel(),
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function reportCss(): string {
  return [
    ":root{color-scheme:light;--ink:#111827;--muted:#4b5563;--line:#d1d5db;--soft:#f8fafc;--panel:#ffffff;--blue:#2563eb;--green:#047857;--amber:#b45309;--red:#b91c1c;--violet:#6d28d9;}",
    "body{font-family:Arial,sans-serif;margin:0;color:var(--ink);background:#eef2f7;}",
    ".report-shell{max-width:1280px;margin:0 auto;padding:28px;}",
    ".report-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:18px;}",
    ".kicker{margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);}",
    "h1{font-size:24px;line-height:1.25;margin:0;}",
    "h2{font-size:16px;line-height:1.3;margin:0 0 12px;}",
    ".status-strip{display:grid;grid-template-columns:repeat(4,minmax(112px,1fr));gap:8px;margin:0;}",
    ".status-strip div,.summary-panel,.visual-panel,.evaluation-card,.ratio-compare,.source-panel,.json-panel,.detail-panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;}",
    ".status-strip div{padding:10px;}",
    "dt{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);}dd{margin:4px 0 0;font-size:13px;line-height:1.35;overflow-wrap:anywhere;}",
    ".report-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start;}",
    ".visual-panel{padding:14px;overflow:hidden;}",
    ".visual-frame{overflow:auto;border:1px solid var(--line);background:#fff;}",
    ".visual-frame svg{display:block;width:100%;min-width:760px;height:auto;margin:0;border:0;}",
    ".visual-frame-empty svg{min-width:0;}",
    ".legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:12px;font-size:12px;color:var(--muted);}",
    ".legend-item{display:inline-flex;align-items:center;gap:6px;}",
    ".legend-swatch{width:14px;height:8px;border:2px solid var(--line);display:inline-block;}",
    ".legend-surface{background:#f9fafb;border-color:var(--ink);}.legend-element{background:#dbeafe;border-color:var(--blue);}.legend-bbox{background:#fff;border-style:dashed;border-color:var(--ink);}.legend-guide{background:#fff;border-color:var(--violet);}.legend-anchor{width:8px;height:8px;border-radius:50%;background:var(--ink);border-color:var(--ink);}.legend-selected{background:#ecfdf5;border-color:var(--green);}",
    ".summary-panel{padding:16px;}",
    ".summary-panel dl{display:grid;grid-template-columns:1fr;gap:10px;margin:0;}",
    ".detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:16px;}",
    ".detail-panel{padding:16px;}.detail-panel dl{display:grid;gap:10px;margin:0;}.detail-panel p{margin:0;color:var(--muted);font-size:13px;line-height:1.45;}",
    ".evaluation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px;}",
    ".evaluation-card{padding:16px;}",
    ".evaluation-card[data-selected=\"true\"]{border-color:var(--green);box-shadow:inset 0 0 0 2px rgba(4,120,87,.18);}",
    ".evaluation-card dl,.comparison-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px;}",
    ".score-line{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;font-size:13px;color:var(--muted);}",
    ".components{display:grid;gap:8px;}",
    ".component-row{display:grid;grid-template-columns:132px 1fr 64px;gap:10px;align-items:center;font-size:12px;}",
    ".bar-track{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;}",
    ".bar-fill{height:100%;background:var(--blue);}",
    ".component-row[data-status=\"match\"] .bar-fill,.score-bar[data-status=\"match\"] .bar-fill{background:var(--green);}",
    ".component-row[data-status=\"near_match\"] .bar-fill,.score-bar[data-status=\"near_match\"] .bar-fill{background:var(--blue);}",
    ".component-row[data-status=\"weak_match\"] .bar-fill,.score-bar[data-status=\"weak_match\"] .bar-fill{background:var(--amber);}",
    ".component-row[data-status=\"no_match\"] .bar-fill,.score-bar[data-status=\"no_match\"] .bar-fill{background:var(--red);}",
    ".ratio-compare{padding:16px;margin-top:16px;}",
    ".comparison-bars{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px;}",
    ".score-bar{display:grid;gap:6px;font-size:12px;}",
    "table{width:100%;border-collapse:collapse;font-size:12px;}th,td{text-align:left;padding:8px;border-top:1px solid var(--line);vertical-align:top;}th{font-size:11px;text-transform:uppercase;color:var(--muted);}",
    ".source-panel{padding:16px;margin-top:16px;}.source-panel ul,.diagnostic-list{display:grid;gap:8px;margin:0;padding-left:18px;font-size:13px;color:var(--muted);}.source-panel ul{display:flex;flex-wrap:wrap;gap:8px 18px;}",
    ".diagnostic-list{margin-top:10px;}.diagnostic-list strong{color:var(--ink);}.empty-state{font-size:13px;color:var(--muted);margin:10px 0 0;}",
    ".json-panel{margin-top:16px;padding:0;}.json-panel summary{cursor:pointer;padding:14px 16px;font-weight:700;}.json-panel pre{margin:0;padding:16px;overflow:auto;border-top:1px solid var(--line);background:#f3f4f6;font-size:12px;}.json-panel p{margin:0;padding:0 16px 16px;font-size:13px;line-height:1.45;color:var(--muted);}",
    "@media (max-width:1100px){.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}",
    "@media (max-width:900px){.report-shell{padding:18px;}.report-header{display:block;}.status-strip{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px;}.report-layout,.evaluation-grid,.detail-grid{grid-template-columns:1fr;}.comparison-bars,.evaluation-card dl,.comparison-summary{grid-template-columns:repeat(2,minmax(0,1fr));}}",
  ].join("");
}

function evaluationCard(
  title: string,
  evaluation: Evaluation,
  selectedEvaluationRef: string | null,
): string {
  const selected = selectedEvaluationRef === evaluation.id;
  const score = evaluation.score?.value ?? null;
  const confidence = evaluation.confidence.value;
  return [
    `<article class="evaluation-card" data-selected="${selected ? "true" : "false"}">`,
    `<h2>${escapeHtml(title)}</h2>`,
    "<dl>",
    metric("evaluation ref", evaluation.id),
    metric("profile ref", evaluation.profileRef),
    metric("pack ref", evaluation.packRef),
    "</dl>",
    "<div class=\"score-line\">",
    `<span>status: ${escapeHtml(evaluation.status)}</span>`,
    `<span>score: ${formatScore(score)}</span>`,
    `<span>confidence: ${formatScore(confidence)}</span>`,
    "</div>",
    "<h2>Evaluation Components</h2>",
    "<div class=\"components\">",
    ...evaluation.componentScores.map(componentRow),
    "</div>",
    "</article>",
  ].join("\n");
}

function componentRow(score: ComponentScore): string {
  const value = score.value;
  return [
    `<div class="component-row" data-status="${escapeHtml(score.status)}">`,
    `<span>${escapeHtml(componentLabel(score.componentId))}</span>`,
    `<span class="bar-track"><span class="bar-fill" style="width:${percentAttr(value)}%"></span></span>`,
    `<span>${formatScore(value)} ${escapeHtml(score.status)}</span>`,
    "</div>",
  ].join("");
}

function scoreBar(label: string, score: ComponentScore | null): string {
  const value = score?.value ?? null;
  const status = score?.status ?? "ambiguous";
  return [
    `<div class="score-bar" data-status="${escapeHtml(status)}">`,
    `<strong>${escapeHtml(label)}</strong>`,
    `<span class="bar-track"><span class="bar-fill" style="width:${percentAttr(value)}%"></span></span>`,
    `<span>${formatScore(value)} ${escapeHtml(status)}</span>`,
    "</div>",
  ].join("");
}

function componentDeltaTable(comparison: Comparison): string {
  const rows = comparison.explanation.componentDeltas.map(componentDeltaRow);

  return [
    "<table>",
    "<thead><tr><th>Component</th><th>A</th><th>B</th><th>Delta</th></tr></thead>",
    "<tbody>",
    ...rows,
    "</tbody>",
    "</table>",
  ].join("\n");
}

function detailPanel(title: string, rows: readonly (readonly [string, string])[]): string {
  return [
    `<section class="detail-panel" aria-label="${escapeHtml(title)}">`,
    `<h2>${escapeHtml(title)}</h2>`,
    "<dl>",
    ...rows.map(([label, value]) => metric(label, value)),
    "</dl>",
    "</section>",
  ].join("\n");
}

function decisionPanel(decision: Comparison["decision"], selectedComposition: string | null): string {
  return detailPanel("Decision", [
    ["status", decision.status],
    ["summary", decision.summary],
    ["selected composition", selectedComposition ?? "none"],
    ["selected evaluation", decision.selectedEvaluationRef ?? "none"],
  ]);
}

function replayPanel(result: StructuredCompositionAnalysisResultV1): string {
  return detailPanel("Replay Readiness", [
    ["status", result.replayReadiness?.status ?? "none"],
    ["run", result.replayReadiness?.run.runRef.id ?? "none"],
    ["pack lock", result.packLockRef?.id ?? "none"],
    ["operation context", result.operationContextRef?.id ?? "none"],
  ]);
}

function measurementsPanel(measurements: { readonly a: MeasurementSet; readonly b: MeasurementSet }): string {
  const aIds = compositionMeasurementIds(measurements.a, "A");
  const bIds = compositionMeasurementIds(measurements.b, "B");

  return [
    "<section class=\"detail-panel\" aria-label=\"Measurement Counts\">",
    "<h2>Measurement Counts</h2>",
    "<dl>",
    metric("A measurement set", measurements.a.id),
    metric("A count", String(aIds.length)),
    metric("A ids", formatList(aIds)),
    metric("B measurement set", measurements.b.id),
    metric("B count", String(bIds.length)),
    metric("B ids", formatList(bIds)),
    "</dl>",
    "</section>",
  ].join("\n");
}

function diagnosticsPanel(result: StructuredCompositionAnalysisResultV1): string {
  const diagnosticCodes = [...new Set(result.diagnostics.map((diagnostic) => diagnostic.code))].sort(compareStableStrings);

  return [
    "<section class=\"detail-panel\" aria-label=\"Diagnostics errors and warnings\">",
    "<h2>Diagnostics / Errors / Warnings</h2>",
    "<dl>",
    metric("diagnostics", String(result.diagnostics.length)),
    metric("errors", String(result.errors.length)),
    metric("warnings", String(result.warnings.length)),
    metric("codes", formatList(diagnosticCodes)),
    "</dl>",
    diagnosticList("errors", result.errors),
    diagnosticList("warnings", result.warnings),
    "</section>",
  ].join("\n");
}

function provenancePanel(
  summary: LocalStructuredAnalyzeReportSummaryV1,
  result: StructuredCompositionAnalysisResultV1,
): string {
  return [
    "<section class=\"detail-panel\" aria-label=\"Provenance and source refs\">",
    "<h2>Provenance / Source Refs</h2>",
    "<dl>",
    metric("source kind", summary.input.sourceKind ?? result.provenance?.sourceKind ?? "none"),
    metric("external source", formatSourceRef(summary.input.externalSourceRef ?? result.provenance?.externalSourceRef ?? null)),
    metric("input refs", formatSourceRefs(result.inputRefs)),
    metric("output refs", formatSourceRefs(result.outputRefs)),
    metric("caller source ids", formatList(result.provenance?.callerSourceIds ?? [])),
    metric("transformation steps", String(result.provenance?.transformationSteps.length ?? 0)),
    "</dl>",
    "</section>",
  ].join("\n");
}

function artifactPanel(files: readonly string[]): string {
  return [
    "<section class=\"source-panel\" aria-label=\"Local Artifacts\">",
    "<h2>Local Artifacts</h2>",
    "<ul>",
    ...files.map((file) => `<li>${escapeHtml(file)}</li>`),
    "</ul>",
    "</section>",
  ].join("\n");
}

function canonicalResultPanel(): string {
  return [
    "<section class=\"detail-panel\" aria-label=\"Canonical result boundary\">",
    "<h2>Canonical Result</h2>",
    "<p><code>result.json</code> is the canonical Norma truth. This static HTML renders existing Structured Analyze fields as a local read-only inspection artifact.</p>",
    "</section>",
  ].join("\n");
}

function diagnosticList(title: "errors" | "warnings", diagnostics: readonly Diagnostic[]): string {
  if (diagnostics.length === 0) {
    return `<p class="empty-state">No ${title}.</p>`;
  }

  return [
    `<ul class="diagnostic-list" aria-label="${title}">`,
    ...diagnostics.map((diagnostic) => [
      "<li>",
      `<strong>${escapeHtml(diagnostic.code)}</strong>`,
      ` ${escapeHtml(diagnostic.severity)}`,
      `: ${escapeHtml(diagnostic.message)}`,
      diagnostic.targetRef === null ? "" : ` <span>target ${escapeHtml(diagnostic.targetRef)}</span>`,
      "</li>",
    ].join("")),
    "</ul>",
  ].join("\n");
}

function compositionMeasurementIds(measurementSet: MeasurementSet, label: "A" | "B"): readonly string[] {
  return (measurementSet.compositions.find((composition) => composition.label === label)?.measurements ?? [])
    .map((measurement) => measurement.id)
    .sort(compareStableStrings);
}

function componentDeltaRow(delta: ComponentDelta): string {
  return [
    "<tr>",
    `<td>${escapeHtml(componentLabel(delta.componentId))}</td>`,
    `<td>${formatScore(delta.valueA)}</td>`,
    `<td>${formatScore(delta.valueB)}</td>`,
    `<td>${formatSignedScore(delta.delta)}</td>`,
    "</tr>",
  ].join("");
}

function scoreForComponent(evaluation: Evaluation, componentId: EvaluationComponentId): ComponentScore | null {
  return evaluation.componentScores.find((score) => score.componentId === componentId) ?? null;
}

function selectedCompositionLabel(
  selectedEvaluationRef: string | null,
  evaluationAId: string,
  evaluationBId: string,
): string | null {
  if (selectedEvaluationRef === null) {
    return null;
  }

  if (selectedEvaluationRef === evaluationAId) {
    return "Composition A";
  }

  if (selectedEvaluationRef === evaluationBId) {
    return "Composition B";
  }

  return selectedEvaluationRef;
}

function componentLabel(componentId: EvaluationComponentId): string {
  return componentId.replaceAll("_", " ");
}

function metric(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function formatSourceRefs(refs: readonly SourceReference[]): string {
  return refs.length === 0 ? "none" : refs.map(formatSourceRef).join(", ");
}

function formatSourceRef(ref: SourceReference | null): string {
  return ref === null ? "none" : `${ref.kind}:${ref.ref}`;
}

function formatList(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

function compareStableStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function legendItem(kind: string, label: string): string {
  return [
    "<span class=\"legend-item\">",
    `<span class="legend-swatch legend-${escapeHtml(kind)}"></span>`,
    `<span>${escapeHtml(label)}</span>`,
    "</span>",
  ].join("");
}

function formatScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }

  return value.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
}

function formatSignedScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }

  const formatted = formatScore(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function percentAttr(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0";
  }

  return String(Math.max(0, Math.min(100, Math.round(value * 100))));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
