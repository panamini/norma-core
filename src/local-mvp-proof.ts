import type {
  CoreError,
  CoreWarning,
  Diagnostic,
  MvpDemoResultV1,
  SourceReference,
} from "./index.js";

export const MVP_PROOF_OUTPUT_FILES = {
  result: "result.json",
  summary: "summary.json",
  visual: "visual.svg",
  report: "report.html",
} as const;

export const DEFAULT_MVP_PROOF_OUT_DIR = ".norma/mvp-demo" as const;

export interface MvpProofSummaryV1 {
  kind: "mvp-proof-summary";
  schemaVersion: "mvp-proof-summary-v1";
  demo: {
    ref: string;
    name: string;
    operationVersion: string;
    status: MvpDemoResultV1["status"];
  };
  surface: MvpDemoResultV1["summary"]["surfaceDimensions"] & {
    surfaceRef: string;
  };
  pack: {
    ref: string;
    version: string;
    schemaVersion: string;
    contentIdentity: string;
  };
  packLock: {
    lockRef: string;
    packRef: string;
    packVersion: string;
    packSchemaVersion: string;
    contentIdentity: string;
  };
  constructionCounts: MvpDemoResultV1["summary"]["constructionCounts"];
  measurementCounts: MvpDemoResultV1["summary"]["measurementCounts"];
  evaluationSummaries: MvpDemoResultV1["summary"]["evaluationSummaries"];
  comparison: {
    status: string;
    scoreA: number;
    scoreB: number;
    confidenceA: number;
    confidenceB: number;
    statement: string;
  };
  decision: {
    status: string;
    selectedEvaluationRef: string | null;
    selectedCompositionRef: string | null;
  };
  runRef: string;
  replayReadinessStatus: string;
  warningCount: number;
  errorCount: number;
  generatedFiles: typeof MVP_PROOF_OUTPUT_FILES;
  authoritativeOutput: "result.json";
  derivedOutputs: readonly ["summary.json", "visual.svg", "report.html"];
  boundaryNotes: readonly string[];
}

export type MvpProofParsedArgs =
  | {
      ok: true;
      help: true;
    }
  | {
      ok: true;
      help: false;
      inputPath: string | null;
      outDir: string;
    }
  | {
      ok: false;
      message: string;
    };

const FORBIDDEN_REPORT_TERMS = [
  "better",
  "best",
  "winner",
  "preferred",
  "beautiful",
  "recommendation",
  "optimization",
  "beauty score",
] as const;

export function parseMvpProofArgs(args: readonly string[]): MvpProofParsedArgs {
  let inputPath: string | null = null;
  let outDir: string = DEFAULT_MVP_PROOF_OUT_DIR;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return { ok: true, help: true };
    }
    if (arg === "--input") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, message: "--input requires a path value." };
      }
      inputPath = value;
      index += 1;
      continue;
    }
    if (arg === "--out") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, message: "--out requires a directory value." };
      }
      outDir = value;
      index += 1;
      continue;
    }
    return { ok: false, message: `Unsupported flag or argument: ${arg}.` };
  }

  return { ok: true, help: false, inputPath, outDir };
}

export function mvpProofHelpText(): string {
  return [
    "Usage:",
    "  pnpm demo:mvp",
    "  pnpm demo:mvp -- --input <input.json> --out <output-directory>",
    "  pnpm demo:mvp -- --help",
    "",
    `Default output directory: ${DEFAULT_MVP_PROOF_OUT_DIR}`,
    "",
    "Writes result.json, summary.json, visual.svg, and report.html.",
    "The JSON result is authoritative; summary, SVG, and HTML are derived.",
  ].join("\n");
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Cannot serialize a non-finite number.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError(`Cannot serialize ${typeof value}.`);
}

export function stableJsonFile(value: unknown): string {
  return `${stableJson(value)}\n`;
}

export function createMvpProofSummary(result: MvpDemoResultV1): MvpProofSummaryV1 {
  return {
    kind: "mvp-proof-summary",
    schemaVersion: "mvp-proof-summary-v1",
    demo: {
      ref: result.demoRef,
      name: result.demoName,
      operationVersion: result.demoOperationVersion,
      status: result.status,
    },
    surface: {
      surfaceRef: result.summary.surfaceRef,
      ...result.summary.surfaceDimensions,
    },
    pack: {
      ref: result.pack.id,
      version: result.pack.version,
      schemaVersion: result.pack.schemaVersion,
      contentIdentity: result.pack.contentIdentity,
    },
    packLock: {
      lockRef: result.packLock.lockRef,
      packRef: result.packLock.packRef,
      packVersion: result.packLock.packVersion,
      packSchemaVersion: result.packLock.packSchemaVersion,
      contentIdentity: result.packLock.contentIdentity,
    },
    constructionCounts: result.summary.constructionCounts,
    measurementCounts: result.summary.measurementCounts,
    evaluationSummaries: result.summary.evaluationSummaries,
    comparison: {
      status: result.comparison.status,
      scoreA: result.comparison.scoreA,
      scoreB: result.comparison.scoreB,
      confidenceA: result.comparison.confidenceA,
      confidenceB: result.comparison.confidenceB,
      statement: result.summary.comparisonStatement,
    },
    decision: {
      status: result.decision.status,
      selectedEvaluationRef: result.decision.selectedEvaluationRef,
      selectedCompositionRef: result.decision.selectedCompositionRef,
    },
    runRef: result.run.runRef.id,
    replayReadinessStatus: result.replayReadinessReport.status,
    warningCount: result.warnings.length,
    errorCount: result.errors.length,
    generatedFiles: MVP_PROOF_OUTPUT_FILES,
    authoritativeOutput: MVP_PROOF_OUTPUT_FILES.result,
    derivedOutputs: [MVP_PROOF_OUTPUT_FILES.summary, MVP_PROOF_OUTPUT_FILES.visual, MVP_PROOF_OUTPUT_FILES.report],
    boundaryNotes: result.summary.boundaryNotes,
  };
}

export function createMvpProofFiles(result: MvpDemoResultV1): Record<string, string> {
  const summary = createMvpProofSummary(result);
  return {
    [MVP_PROOF_OUTPUT_FILES.result]: stableJsonFile(result),
    [MVP_PROOF_OUTPUT_FILES.summary]: stableJsonFile(summary),
    [MVP_PROOF_OUTPUT_FILES.visual]: `${result.artifacts.simpleVisual.payload.svg}\n`,
    [MVP_PROOF_OUTPUT_FILES.report]: renderMvpProofReportHtml(result, summary),
  };
}

export function renderMvpProofReportHtml(result: MvpDemoResultV1, summary = createMvpProofSummary(result)): string {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(result.demoName)} MVP proof</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f7f5; color: #181818; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 48px; }
    h1, h2, h3 { margin: 0; line-height: 1.2; }
    h1 { font-size: 32px; }
    h2 { font-size: 20px; margin-top: 32px; padding-bottom: 8px; border-bottom: 1px solid #c9c7c0; }
    h3 { font-size: 16px; margin-top: 20px; }
    p { line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #ffffff; }
    th, td { border: 1px solid #d8d5cd; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #ece9df; font-weight: 700; }
    code, pre { font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; }
    pre { overflow: auto; background: #ffffff; border: 1px solid #d8d5cd; padding: 12px; }
    img { max-width: 100%; height: auto; border: 1px solid #d8d5cd; background: #ffffff; }
    .lede { max-width: 780px; }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 18px; }
    .fact { border-left: 4px solid #2f6f73; background: #ffffff; padding: 12px; }
    .fact strong { display: block; font-size: 13px; color: #555047; margin-bottom: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(result.demoName)}</h1>
    <p class="lede">Local MVP proof for Norma Core. The JSON result is authoritative; the summary, SVG, and HTML report are derived projections for inspection.</p>
    <div class="facts">
      ${fact("Status", result.status)}
      ${fact("RunRef", summary.runRef)}
      ${fact("Replay readiness", summary.replayReadinessStatus)}
      ${fact("Comparison", summary.comparison.statement)}
    </div>

    <h2>Surface And Pack</h2>
    <table>
      <tbody>
        ${row("Surface", summary.surface.surfaceRef)}
        ${row("Dimensions", `${summary.surface.width} x ${summary.surface.height} ${summary.surface.unit}`)}
        ${row("Normalized Bounds", stableJson(summary.surface.normalizedBounds))}
        ${row("Pack", `${summary.pack.ref}@${summary.pack.version}`)}
        ${row("PackLock", summary.packLock.lockRef)}
        ${row("Pack Content Identity", summary.packLock.contentIdentity)}
      </tbody>
    </table>

    <h2>Construction</h2>
    <table>
      <tbody>
        ${row("Guides", summary.constructionCounts.guides)}
        ${row("Zones", summary.constructionCounts.zones)}
        ${row("Grids", summary.constructionCounts.grids)}
        ${row("Cells", summary.constructionCounts.cells)}
        ${row("Intersections", summary.constructionCounts.intersections)}
      </tbody>
    </table>

    <h2>Measurements</h2>
    ${measurementTable("A", result.measurementResultA.measurements)}
    ${measurementTable("B", result.measurementResultB.measurements)}

    <h2>Evaluations</h2>
    ${evaluationTable("A", result.evaluationA)}
    ${evaluationTable("B", result.evaluationB)}

    <h2>Comparison And Decision</h2>
    <table>
      <tbody>
        ${row("Comparison status", result.comparison.status)}
        ${row("Score A", result.comparison.scoreA)}
        ${row("Score B", result.comparison.scoreB)}
        ${row("Confidence A", result.comparison.confidenceA)}
        ${row("Confidence B", result.comparison.confidenceB)}
        ${row("Decision status", result.decision.status)}
        ${row("Decision composition", result.decision.selectedCompositionRef ?? "none")}
      </tbody>
    </table>

    <h2>Structured Explanation</h2>
    <table>
      <tbody>
        ${row("Claim code", result.structuredExplanation.claimCode)}
        ${row("Summary", result.structuredExplanation.summary)}
      </tbody>
    </table>
    <pre>${escapeHtml(stableJson(result.structuredExplanation.facts))}</pre>

    <h2>Diagnostics</h2>
    ${diagnosticTable("Warnings", result.warnings)}
    ${diagnosticTable("Errors", result.errors)}

    <h2>Derived Visual</h2>
    <p>Rendered from <code>${escapeHtml(MVP_PROOF_OUTPUT_FILES.visual)}</code>. It is visual evidence only and is not source geometry.</p>
    <img src="${escapeHtml(MVP_PROOF_OUTPUT_FILES.visual)}" alt="Derived Norma Core SVG projection">

    <h2>Generated Files</h2>
    <table>
      <tbody>
        ${row("Authoritative", summary.authoritativeOutput)}
        ${row("Derived", summary.derivedOutputs.join(", "))}
      </tbody>
    </table>
  </main>
</body>
</html>
`;
  assertReportLanguage(html);
  return html;
}

export function formatProofLine(result: MvpDemoResultV1, reportPath: string): string {
  return `NORMA_MVP_PROOF_PASS run:${result.run.runRef.id} measurements:${result.measurementResultA.measurements.length}/${result.measurementResultB.measurements.length} report:${reportPath}`;
}

export function formatFailureDiagnostic(code: string, message: string, targetRef: string | null = null): string {
  return stableJsonFile({
    kind: "mvp-proof-diagnostic",
    status: "failed",
    code,
    message,
    targetRef,
  });
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function measurementTable(label: string, measurements: MvpDemoResultV1["measurementResultA"]["measurements"]): string {
  const rows = measurements.map((measurement) => `<tr>
    <td>${escapeHtml(measurement.measurementRef)}</td>
    <td>${escapeHtml(measurement.measurementType)}</td>
    <td>${escapeHtml(measurement.unit)}</td>
    <td>${escapeHtml(sourceRefsText(measurement.sourceRefs))}</td>
    <td><code>${escapeHtml(stableJson(measurement.result))}</code></td>
    <td>${escapeHtml(measurement.warnings.join(", ") || "none")}</td>
  </tr>`).join("");
  return `<h3>Composition ${escapeHtml(label)}</h3>
    <table>
      <thead>
        <tr><th>ID</th><th>Type</th><th>Unit</th><th>Source references</th><th>Values</th><th>Warnings</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function evaluationTable(label: string, evaluation: MvpDemoResultV1["evaluationA"]): string {
  const componentRows = evaluation.componentScores.map((score) => `<tr>
    <td>${escapeHtml(score.componentRef)}</td>
    <td>${escapeHtml(score.componentType)}</td>
    <td>${escapeHtml(score.normalizedScore)}</td>
    <td>${escapeHtml(score.effectiveWeight)}</td>
    <td>${escapeHtml(score.weightedContribution)}</td>
  </tr>`).join("");
  return `<h3>Evaluation ${escapeHtml(label)}</h3>
    <table>
      <tbody>
        ${row("EvaluationRef", evaluation.evaluationRef)}
        ${row("CompositionRef", evaluation.compositionRef)}
        ${row("Status", evaluation.status)}
        ${row("Score", evaluation.score.overallScore)}
        ${row("Confidence", evaluation.confidence.value)}
        ${row("Confidence status", evaluation.confidence.status)}
      </tbody>
    </table>
    <table>
      <thead>
        <tr><th>Component</th><th>Type</th><th>Normalized score</th><th>Effective weight</th><th>Weighted contribution</th></tr>
      </thead>
      <tbody>${componentRows}</tbody>
    </table>`;
}

function diagnosticTable(title: string, diagnostics: readonly (Diagnostic | CoreError | CoreWarning)[]): string {
  const rows = diagnostics.length === 0
    ? `<tr><td colspan="4">none</td></tr>`
    : diagnostics.map((diagnostic) => `<tr>
        <td>${escapeHtml(diagnostic.code)}</td>
        <td>${escapeHtml(diagnostic.severity)}</td>
        <td>${escapeHtml(diagnostic.targetRef ?? "none")}</td>
        <td>${escapeHtml(diagnostic.message)}</td>
      </tr>`).join("");
  return `<h3>${escapeHtml(title)}</h3>
    <table>
      <thead><tr><th>Code</th><th>Severity</th><th>Target</th><th>Message</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function fact(label: string, value: unknown): string {
  return `<div class="fact"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`;
}

function row(label: string, value: unknown): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

function sourceRefsText(sourceRefs: readonly SourceReference[]): string {
  return sourceRefs.map((ref) => `${ref.kind}:${ref.ref}`).join(", ");
}

function assertReportLanguage(html: string): void {
  const normalized = html.toLowerCase();
  for (const term of FORBIDDEN_REPORT_TERMS) {
    if (normalized.includes(term)) {
      throw new Error(`Report contains forbidden term: ${term}.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && Object.getPrototypeOf(value) === Object.prototype;
}
