import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import {
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";
import {
  createVisualComparisonReportHtml,
} from "../dist/src/local-report/visual-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const alignmentScenarioPath = join(repoRoot, "examples/structured-analyze/scenarios/alignment-basic.json");

test("visual viewer renders side-by-side Structured Analyze report overlays", async () => {
  const input = await readJson(alignmentScenarioPath);
  const bundle = createLocalStructuredAnalyzeReportBundle(input);
  const reportHtml = bundle.artifacts["report.html"];
  const visualSvg = bundle.artifacts["visual.svg"];

  assert.equal(bundle.result.status, "valid");
  assert.match(reportHtml, /class="report-layout"/u);
  assert.match(reportHtml, /Composition A/u);
  assert.match(reportHtml, /Composition B/u);
  assert.match(reportHtml, /A is closer to the declared system/u);
  assert.match(reportHtml, /Ratio and Alignment/u);
  assert.match(reportHtml, /result\.json/u);
  assert.match(reportHtml, /summary\.json/u);
  assert.match(reportHtml, /summary\.md/u);
  assert.match(reportHtml, /visual\.svg/u);
  assert.match(reportHtml, /Result Source/u);
  assert.doesNotMatch(reportHtml, /id="norma-summary-json"/u);
  assert.doesNotMatch(reportHtml, /<script\s+type="application\/json"/iu);
  assert.match(reportHtml, /area ratio match/u);
  assert.match(reportHtml, /alignment/u);
  assert.match(visualSvg, /data-overlay="surface"/u);
  assert.match(visualSvg, /data-overlay="element-rect"/u);
  assert.match(visualSvg, /data-overlay="bounding-box"/u);
  assert.match(visualSvg, /data-overlay="alignment-guide"/u);
  assert.match(visualSvg, /data-overlay="anchor"/u);
  assert.match(visualSvg, /data-selected="true"/u);
  assert.match(visualSvg, /ratio [0-9.]+/u);
  assert.match(visualSvg, /alignment [0-9.]+/u);
});

test("visual viewer remains fully local with no external assets or network calls", async () => {
  const input = await readJson(alignmentScenarioPath);
  const reportHtml = createLocalStructuredAnalyzeReportBundle(input).artifacts["report.html"];

  assert.doesNotMatch(reportHtml, /<script\b[^>]*\bsrc=/iu);
  assert.doesNotMatch(reportHtml, /<link\b/iu);
  assert.doesNotMatch(reportHtml, /\b(?:src|href|action|poster)\s*=\s*["']\s*(?:https?:)?\/\//iu);
  assert.doesNotMatch(reportHtml, /\b(?:src|href|action|poster)\s*=\s*["']\s*javascript:/iu);
  assert.doesNotMatch(reportHtml, /\burl\(\s*["']?\s*(?:https?:)?\/\//iu);
  assert.doesNotMatch(reportHtml, /\burl\(\s*["']?\s*javascript:/iu);
  assert.doesNotMatch(reportHtml, /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/iu);
  assert.doesNotMatch(reportHtml, /\bfetch\s*\(/u);
  assert.doesNotMatch(reportHtml, /\bXMLHttpRequest\b/u);
  assert.doesNotMatch(reportHtml, /\bimport\s*\(/u);
});

test("visual viewer selected label uses direct evaluation references", async () => {
  const input = await readJson(alignmentScenarioPath);
  const bundle = createLocalStructuredAnalyzeReportBundle(input);
  const result = {
    ...bundle.result,
    decision: {
      ...bundle.result.decision,
      selectedEvaluationRef: "selected-evaluation-beta",
    },
    evaluations: {
      a: {
        ...bundle.result.evaluations.a,
        id: "selected-evaluation-alpha",
      },
      b: {
        ...bundle.result.evaluations.b,
        id: "selected-evaluation-beta",
      },
    },
  };

  const reportHtml = createVisualComparisonReportHtml({
    summary: bundle.summary,
    result,
    visualSvg: bundle.artifacts["visual.svg"],
  });

  assert.match(reportHtml, /<dt>selected<\/dt><dd>Composition B<\/dd>/u);
});

test("visual viewer output is deterministic for the same Structured Analyze input", async () => {
  const firstInput = await readJson(alignmentScenarioPath);
  const secondInput = await readJson(alignmentScenarioPath);
  const first = createLocalStructuredAnalyzeReportBundle(firstInput);
  const second = createLocalStructuredAnalyzeReportBundle(secondInput);

  assert.equal(first.artifacts["report.html"], second.artifacts["report.html"]);
  assert.equal(first.artifacts["visual.svg"], second.artifacts["visual.svg"]);
});

test("visual viewer preserves the invalid input fallback report behavior", () => {
  const bundle = createLocalStructuredAnalyzeReportBundle(null);
  const reportHtml = bundle.artifacts["report.html"];

  assert.equal(bundle.result.status, "invalid");
  assert.match(reportHtml, /Local Structured Analyze Report/u);
  assert.match(reportHtml, /No rectangular Composition2D visual available/u);
  assert.match(reportHtml, /Summary JSON/u);
  assert.doesNotMatch(reportHtml, /class="report-layout"/u);
  assert.doesNotMatch(reportHtml, /Result Source/u);
});

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
