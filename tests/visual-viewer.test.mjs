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
  assert.match(reportHtml, /Input Contract/u);
  assert.match(reportHtml, /Operation Boundary/u);
  assert.match(reportHtml, /Ratio Pack \/ Rule Set \/ Evaluation Profile/u);
  assert.match(reportHtml, /Decision/u);
  assert.match(reportHtml, /Measurement Counts/u);
  assert.match(reportHtml, /Evaluation Components/u);
  assert.match(reportHtml, /Comparison Deltas/u);
  assert.match(reportHtml, /Diagnostics \/ Errors \/ Warnings/u);
  assert.match(reportHtml, /Provenance \/ Source Refs/u);
  assert.match(reportHtml, /Replay Readiness/u);
  assert.match(reportHtml, /Local Artifacts/u);
  assert.match(reportHtml, /Canonical Result/u);
  assert.match(reportHtml, /Composition A/u);
  assert.match(reportHtml, /Composition B/u);
  assert.match(reportHtml, /A is closer to the declared system/u);
  assert.match(reportHtml, /norma\.basic-proportions@0\.1\.0/u);
  assert.match(reportHtml, /surface-basic-third-grid/u);
  assert.match(reportHtml, /evaluation-profile:basic-grid-alignment/u);
  assert.match(reportHtml, /tie tolerance/u);
  assert.match(reportHtml, /A count/u);
  assert.match(reportHtml, /B count/u);
  const aMeasurementIds = compositionMeasurementIds(bundle.result.measurements.a, "A");
  const bMeasurementIds = compositionMeasurementIds(bundle.result.measurements.b, "B");
  assert.notDeepEqual(aMeasurementIds, bMeasurementIds);
  assert.equal(detailValue(reportHtml, "A count"), String(aMeasurementIds.length));
  assert.equal(detailValue(reportHtml, "A ids"), aMeasurementIds.join(", "));
  assert.equal(detailValue(reportHtml, "B count"), String(bMeasurementIds.length));
  assert.equal(detailValue(reportHtml, "B ids"), bMeasurementIds.join(", "));
  assert.doesNotMatch(detailValue(reportHtml, "A ids"), /measurement:B/u);
  assert.doesNotMatch(detailValue(reportHtml, "B ids"), /measurement:A/u);
  assert.match(reportHtml, /result\.json/u);
  assert.match(reportHtml, /summary\.json/u);
  assert.match(reportHtml, /summary\.md/u);
  assert.match(reportHtml, /visual\.svg/u);
  assert.match(reportHtml, /report\.html/u);
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
  assert.doesNotMatch(reportHtml, /<script\b/iu);
  assert.doesNotMatch(reportHtml, /<link\b/iu);
  assert.doesNotMatch(reportHtml, /<form\b/iu);
  assert.doesNotMatch(reportHtml, /<input\b/iu);
  assert.doesNotMatch(reportHtml, /\baction\s*=/iu);
  assert.doesNotMatch(reportHtml, /\b(?:src|href|action|poster)\s*=\s*["']\s*(?:https?:)?\/\//iu);
  assert.doesNotMatch(reportHtml, /\b(?:src|href|action|poster)\s*=\s*["']\s*javascript:/iu);
  assert.doesNotMatch(reportHtml, /\burl\(\s*["']?\s*(?:https?:)?\/\//iu);
  assert.doesNotMatch(reportHtml, /\burl\(\s*["']?\s*javascript:/iu);
  assert.doesNotMatch(reportHtml, /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/iu);
  assert.doesNotMatch(reportHtml, /\bfetch\s*\(/u);
  assert.doesNotMatch(reportHtml, /\bXMLHttpRequest\b/u);
  assert.doesNotMatch(reportHtml, /\bimport\s*\(/u);
  assert.doesNotMatch(reportHtml, /\blocalStorage\b/u);
  assert.doesNotMatch(reportHtml, /\bsessionStorage\b/u);
  assert.doesNotMatch(reportHtml, /\brecommend(?:ation|s|ed)?\b|\bbeauty\b|\bbeautiful\b|\boptimization\b|\boptimize\b/iu);
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
  assert.match(reportHtml, /<dt>status<\/dt><dd>invalid<\/dd>/u);
  assert.match(reportHtml, /No rectangular Composition2D visual available/u);
  assert.match(reportHtml, /Diagnostics \/ Errors \/ Warnings/u);
  assert.match(reportHtml, /InvalidInputShape/u);
  assert.match(reportHtml, /errors/u);
  assert.match(reportHtml, /warnings/u);
  assert.match(reportHtml, /Local Artifacts/u);
  assert.doesNotMatch(reportHtml, /class="evaluation-grid"/u);
  assert.doesNotMatch(reportHtml, /A is closer to the declared system/u);
  assert.doesNotMatch(reportHtml, /<article class="evaluation-card" data-selected="true"|<g data-composition="[^"]+" data-selected="true"/u);
});

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function compositionMeasurementIds(measurementSet, label) {
  return measurementSet.compositions
    .find((composition) => composition.label === label)
    .measurements
    .map((measurement) => measurement.id)
    .sort(compareStableStrings);
}

function detailValue(reportHtml, label) {
  const match = reportHtml.match(new RegExp(`<dt>${escapeRegExp(label)}<\\/dt><dd>([^<]*)<\\/dd>`, "u"));
  assert.ok(match, `${label} detail value`);
  return match[1];
}

function compareStableStrings(first, second) {
  return first < second ? -1 : first > second ? 1 : 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
