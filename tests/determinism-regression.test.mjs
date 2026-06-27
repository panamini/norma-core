import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";
import {
  createVisualComparisonReportHtml,
} from "../dist/src/local-report/visual-viewer.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const scenarioPath = join(repoRoot, "examples", "structured-analyze", "scenarios", "alignment-basic.json");
const analyzeCommandPath = join(repoRoot, "bin", "norma-cli.mjs");
const reportCommandPath = join(repoRoot, "bin", "norma-core-report.mjs");
const analyzeToolName = "norma.analyzeStructuredCompositionV1";
const alignmentBasicResultSha256 = "5bc4528ffc9f31fdc2782e5733f4f869b45e8ae3b0566936d639a70ae428aadc";
const expectedComponentOrder = Object.freeze([
  "guide_proximity",
  "alignment",
  "containment",
  "overlap_penalty",
  "coverage_match",
  "area_ratio_match",
]);

test("R10 keeps Structured Analyze result identical across engine CLI MCP and report kit", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "norma-r10-cross-layer-"));
  const inputPath = join(tempDir, "alignment-basic.json");
  const cliOutputDir = join(tempDir, "cli-report");
  const reportOutputDir = join(tempDir, "report-kit");

  try {
    const inputBytes = await readFile(scenarioPath, "utf8");
    await writeFile(inputPath, inputBytes, "utf8");
    const input = JSON.parse(inputBytes);
    const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));
    const directCanonical = core.serializeCanonicalJson(directResult);

    const cliCommand = await runCliAnalyze(inputPath, cliOutputDir);
    const reportCommand = await runReportKit(inputPath, reportOutputDir);
    const mcpToolResult = callMcpAnalyze(structuredClone(input));
    const reportBundle = createLocalStructuredAnalyzeReportBundle(structuredClone(input));
    const cliResultJson = await readFile(join(cliOutputDir, "result.json"), "utf8");
    const reportResultJson = await readFile(join(reportOutputDir, "result.json"), "utf8");

    assert.equal(directResult.status, "valid");
    assert.equal(cliCommand.status, "ok");
    assert.equal(reportCommand.status, "ok");
    assert.deepEqual(mcpToolResult.result, directResult);
    assert.deepEqual(reportBundle.result, directResult);
    assert.deepEqual(JSON.parse(cliResultJson), directResult);
    assert.deepEqual(JSON.parse(reportResultJson), directResult);
    assert.equal(cliResultJson, `${directCanonical}\n`);
    assert.equal(reportResultJson, `${directCanonical}\n`);
    assert.equal(reportBundle.artifacts["result.json"], `${directCanonical}\n`);
    assert.equal(core.serializeCanonicalJson(mcpToolResult.structuredContent.result), directCanonical);
    assert.equal(hashText(directCanonical), alignmentBasicResultSha256);
    assert.equal(hashText(cliResultJson.trimEnd()), alignmentBasicResultSha256);
    assert.equal(hashText(reportResultJson.trimEnd()), alignmentBasicResultSha256);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("R10 repeated execution preserves result fingerprint and ordering signatures", async () => {
  const input = await readJson(scenarioPath);
  const results = [
    core.analyzeStructuredCompositionV1(structuredClone(input)),
    core.analyzeStructuredCompositionV1(structuredClone(input)),
    core.analyzeStructuredCompositionV1(structuredClone(input)),
  ];
  const canonicalResults = results.map((result) => core.serializeCanonicalJson(result));
  const orderingSignatures = results.map(orderingSignature);

  assert.equal(results[0].status, "valid");
  assert.deepEqual(results[1], results[0]);
  assert.deepEqual(results[2], results[0]);
  assert.equal(canonicalResults[1], canonicalResults[0]);
  assert.equal(canonicalResults[2], canonicalResults[0]);
  assert.deepEqual(orderingSignatures[1], orderingSignatures[0]);
  assert.deepEqual(orderingSignatures[2], orderingSignatures[0]);
  assert.equal(hashText(canonicalResults[0]), alignmentBasicResultSha256);
  assert.deepEqual(results[0].evaluations.a.componentScores.map((score) => score.componentId), expectedComponentOrder);
  assert.deepEqual(results[0].evaluations.b.componentScores.map((score) => score.componentId), expectedComponentOrder);
  assert.deepEqual(
    results[0].comparison.explanation.componentDeltas.map((delta) => delta.componentId),
    expectedComponentOrder,
  );
});

test("R10 canonical result serialization has stable key order and fixed fingerprint", async () => {
  const input = await readJson(scenarioPath);
  const result = core.analyzeStructuredCompositionV1(input);
  const canonical = core.serializeCanonicalJson(result);
  const parsedCanonical = JSON.parse(canonical);

  assert.equal(result.status, "valid");
  assert.equal(core.serializeCanonicalJson(parsedCanonical), canonical);
  assertLexicographicObjectKeys(parsedCanonical);
  assert.equal(hashText(canonical), alignmentBasicResultSha256);
});

test("R10 visual viewer artifacts cannot change Structured Analyze result equality", async () => {
  const input = await readJson(scenarioPath);
  const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));
  const directCanonical = core.serializeCanonicalJson(directResult);
  const bundle = createLocalStructuredAnalyzeReportBundle(structuredClone(input));
  const visualSvg = bundle.artifacts["visual.svg"];
  const originalReportHtml = bundle.artifacts["report.html"];
  assert.ok(visualSvg.includes("Composition A"), "expected label present in visual SVG");
  const modifiedVisualSvg = visualSvg.replace("Composition A", "Composition Alpha");
  const modifiedReportHtml = createVisualComparisonReportHtml({
    summary: bundle.summary,
    result: bundle.result,
    visualSvg: modifiedVisualSvg,
  });

  assert.deepEqual(bundle.result, directResult);
  assert.equal(core.serializeCanonicalJson(bundle.result), directCanonical);
  assert.notEqual(modifiedReportHtml, originalReportHtml);
  assert.equal(core.serializeCanonicalJson(bundle.result), directCanonical);
  assert.equal(hashText(core.serializeCanonicalJson(bundle.result)), alignmentBasicResultSha256);
  assert.match(visualSvg, /data-overlay="surface"/u);
  assert.match(visualSvg, /data-overlay="element-rect"/u);
  assert.match(visualSvg, /data-overlay="alignment-guide"/u);
  assert.match(visualSvg, /data-overlay="anchor"/u);
  assert.doesNotMatch(visualSvg, /<script\b|application\/json|structured-composition-analysis-result|result\.json|summary\.json|data-result/iu);
});

test("R10 CLI leaves input immutable and serializes only the engine result", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "norma-r10-cli-safety-"));
  const inputPath = join(tempDir, "alignment-basic.json");
  const outputDir = join(tempDir, "cli-report");

  try {
    const beforeBytes = await readFile(scenarioPath, "utf8");
    await writeFile(inputPath, beforeBytes, "utf8");
    const inputBefore = JSON.parse(beforeBytes);
    const directResult = core.analyzeStructuredCompositionV1(inputBefore);
    const command = await runCliAnalyze(inputPath, outputDir);
    const afterBytes = await readFile(inputPath, "utf8");
    const cliResultJson = await readFile(join(outputDir, "result.json"), "utf8");

    assert.equal(command.status, "ok");
    assert.equal(afterBytes, beforeBytes);
    assert.deepEqual(JSON.parse(afterBytes), inputBefore);
    assert.deepEqual(JSON.parse(cliResultJson), directResult);
    assert.equal(cliResultJson, `${core.serializeCanonicalJson(directResult)}\n`);
    assert.equal(hashText(cliResultJson.trimEnd()), alignmentBasicResultSha256);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

async function runCliAnalyze(inputPath, outputDir) {
  const { stdout } = await execFileAsync(process.execPath, [
    analyzeCommandPath,
    "analyze",
    inputPath,
    "--out",
    outputDir,
  ], { cwd: repoRoot });

  return JSON.parse(stdout);
}

async function runReportKit(inputPath, outputDir) {
  const { stdout } = await execFileAsync(process.execPath, [
    reportCommandPath,
    "--input",
    inputPath,
    "--out",
    outputDir,
  ], { cwd: repoRoot });

  return JSON.parse(stdout);
}

function callMcpAnalyze(input) {
  const responseText = handleMcpJsonRpcMessage(JSON.stringify({
    jsonrpc: "2.0",
    id: "r10-determinism-cross-layer",
    method: "tools/call",
    params: {
      name: analyzeToolName,
      arguments: {
        input,
      },
    },
  }));
  assert.notEqual(responseText, null);

  const response = JSON.parse(responseText);
  assert.equal(Object.hasOwn(response, "error"), false);
  assert.equal(response.result.structuredContent.kind, "norma-mcp-tool-result");
  assert.equal(response.result.structuredContent.tool, analyzeToolName);
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);

  return {
    structuredContent: response.result.structuredContent,
    result: response.result.structuredContent.result,
  };
}

function orderingSignature(result) {
  assert.equal(result.status, "valid");

  return {
    inputRefs: result.inputRefs.map(refKey),
    outputRefs: result.outputRefs.map(refKey),
    validation: {
      acceptedSourceIds: result.validation.acceptedSourceIds,
      effectiveSourceIds: result.validation.effectiveSourceIds,
      diagnostics: result.validation.diagnostics.map(diagnosticKey),
    },
    measurements: {
      a: measurementSetSignature(result.measurements.a),
      b: measurementSetSignature(result.measurements.b),
    },
    evaluations: {
      a: evaluationSignature(result.evaluations.a),
      b: evaluationSignature(result.evaluations.b),
    },
    comparison: comparisonSignature(result.comparison),
    decision: decisionSignature(result.decision),
  };
}

function measurementSetSignature(measurementSet) {
  return {
    id: measurementSet.id,
    sourceGeometryRefs: measurementSet.sourceGeometryRefs.map(refKey),
    constructionMeasurements: measurementSet.constructionMeasurements.map(measurementKey),
    compositions: measurementSet.compositions.map((composition) => ({
      label: composition.label,
      measurements: composition.measurements.map(measurementKey),
      directionalRelations: composition.directionalRelations.map((relation) => relation.id),
    })),
    directionalRelations: measurementSet.directionalRelations.map((relation) => relation.id),
    surfaceHierarchy: {
      compositionRefs: measurementSet.surfaceHierarchy.compositionRefs.map(refKey),
      elementRefsByComposition: measurementSet.surfaceHierarchy.elementRefsByComposition.map((composition) => ({
        label: composition.label,
        compositionRef: refKey(composition.compositionRef),
        elementRefs: composition.elementRefs.map(refKey),
      })),
    },
  };
}

function evaluationSignature(evaluation) {
  return {
    id: evaluation.id,
    measurementRefs: evaluation.measurementRefs.map(refKey),
    componentScores: evaluation.componentScores.map((score) => ({
      id: score.id,
      componentId: score.componentId,
      measurementSourceRefs: score.measurementSourceRefs.map(refKey),
    })),
    score: evaluation.score === null
      ? null
      : {
          id: evaluation.score.id,
          derivedFromComponentRefs: evaluation.score.derivedFromComponentRefs,
          measurementSourceRefs: evaluation.score.measurementSourceRefs.map(refKey),
        },
    confidence: {
      id: evaluation.confidence.id,
      measurementSourceRefs: evaluation.confidence.measurementSourceRefs.map(refKey),
    },
  };
}

function comparisonSignature(comparison) {
  return {
    id: comparison.id,
    status: comparison.status,
    evaluationARef: comparison.evaluationARef,
    evaluationBRef: comparison.evaluationBRef,
    sharedContextMissingProofs: comparison.sharedContext.missingProofs,
    sharedContextMismatchRefs: comparison.sharedContext.mismatchRefs.map((mismatch) => [
      mismatch.field,
      mismatch.evaluationARef,
      mismatch.evaluationBRef,
    ]),
    explanation: {
      sourceEvaluationRefs: comparison.explanation.sourceEvaluationRefs,
      sourceMeasurementRefs: comparison.explanation.sourceMeasurementRefs.map(refKey),
      componentDeltas: comparison.explanation.componentDeltas.map((delta) => ({
        componentId: delta.componentId,
        evaluationAComponentRef: delta.evaluationAComponentRef,
        evaluationBComponentRef: delta.evaluationBComponentRef,
        sourceMeasurementRefs: delta.sourceMeasurementRefs.map(refKey),
      })),
    },
    decision: decisionSignature(comparison.decision),
  };
}

function decisionSignature(decision) {
  return {
    status: decision.status,
    selectedEvaluationRef: decision.selectedEvaluationRef,
    sourceRefs: decision.sourceRefs.map(refKey),
  };
}

function measurementKey(measurement) {
  return [
    measurement.id,
    measurement.measurementType,
    measurement.metric,
    refKey(measurement.sourceGeometryRef),
    measurement.inputRefs.map(refKey).join("|"),
  ].join("::");
}

function diagnosticKey(diagnostic) {
  return [
    diagnostic.severity,
    diagnostic.blocking,
    diagnostic.code,
    diagnostic.targetRef ?? "",
    refKey(diagnostic.source),
  ].join("::");
}

function refKey(ref) {
  return `${ref.kind}:${ref.ref}`;
}

function assertLexicographicObjectKeys(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertLexicographicObjectKeys(item, `${path}[${index}]`));
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  const keys = Object.keys(value);
  assert.deepEqual(keys, [...keys].sort(), `${path} object keys must be canonicalized`);
  for (const key of keys) {
    assertLexicographicObjectKeys(value[key], `${path}.${key}`);
  }
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
