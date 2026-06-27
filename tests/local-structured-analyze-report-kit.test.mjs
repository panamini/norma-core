import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";
import {
  createVisualComparisonReportHtml,
} from "../dist/src/local-report/visual-viewer.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const exampleInputPath = join(repoRoot, "examples/structured-analyze/basic-grid-alignment.json");
const geometryHarmonyExampleInputPath = join(repoRoot, "examples/structured-analyze/geometry-harmony-basic.json");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");

test("local structured analyze report bundle calls the direct core operation", async () => {
  const input = await readJson(exampleInputPath);
  const bundle = createLocalStructuredAnalyzeReportBundle(input);
  const directResult = core.analyzeStructuredCompositionV1(input);

  assert.deepEqual(bundle.result, directResult);
  assert.equal(bundle.result.status, "valid");
  assert.equal(bundle.summary.operation.boundary, "direct-function");
  assert.equal(bundle.summary.input.ratioPackId, "norma.basic-proportions");
  assert.equal(bundle.summary.input.ratioPackVersion, "0.1.0");
  assert.equal(bundle.summary.input.ratioPackRef, "norma.basic-proportions@0.1.0");
  assert.equal(bundle.summary.input.ruleSetRef, "surface-basic-third-grid");
  assert.equal(bundle.summary.input.evaluationProfileRef, "evaluation-profile:basic-grid-alignment");
  assert.equal(bundle.summary.scope.localCommandOnly, true);
  assert.equal(bundle.summary.scope.directAnalyzeStructuredCompositionV1, true);
  assert.equal(bundle.summary.scope.explicitStructuredJsonInput, true);
  assert.equal(bundle.summary.scope.mcpRuntimeChange, false);
  assert.equal(bundle.summary.scope.hostedMcp, false);
  assert.equal(bundle.summary.scope.cloudflare, false);
  assert.equal(bundle.summary.scope.publicSubmission, false);
  assert.equal(bundle.summary.scope.geometryHarmoniesPack, false);
  assert.equal(bundle.summary.scope.newRatioPack, false);
  assert.equal(bundle.summary.scope.recommendation, false);
  assert.equal(bundle.summary.scope.beautyScore, false);
  assert.equal(bundle.summary.scope.promptImageInference, false);
  assert.match(bundle.artifacts["summary.md"], /- ratioPack: norma\.basic-proportions@0\.1\.0/u);
  assert.match(bundle.artifacts["summary.md"], /- no geometry harmonies pack/u);
  assert.match(bundle.artifacts["summary.md"], /- no new ratio pack/u);
  assert.deepEqual(Object.keys(bundle.artifacts).sort(), [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort());
});

test("local structured analyze report summary derives non-basic pack scope from input", async () => {
  const input = usePackIdentity(await readJson(exampleInputPath), {
    id: "norma.geometry-harmonies",
    concept: "Declared mathematical ratio systems",
    contentIdentity: "norma.geometry-harmonies@0.1.0:ratio-pack-v1:test-scope-summary",
    description: "Declared mathematical ratios for report scope testing.",
    name: "Norma Geometry Harmonies",
    source: "mathematical",
  });
  const bundle = createLocalStructuredAnalyzeReportBundle(input);

  assert.equal(bundle.result.status, "valid");
  assert.equal(bundle.summary.input.ratioPackId, "norma.geometry-harmonies");
  assert.equal(bundle.summary.input.ratioPackVersion, "0.1.0");
  assert.equal(bundle.summary.input.ratioPackRef, "norma.geometry-harmonies@0.1.0");
  assert.equal(bundle.summary.input.ruleSetRef, "surface-basic-third-grid");
  assert.equal(bundle.summary.input.evaluationProfileRef, "evaluation-profile:basic-grid-alignment");
  assert.equal(bundle.summary.scope.geometryHarmoniesPack, true);
  assert.equal(bundle.summary.scope.newRatioPack, true);
  assert.match(bundle.artifacts["summary.md"], /- geometry harmonies pack supplied/u);
  assert.match(bundle.artifacts["summary.md"], /- non-basic ratio pack supplied/u);
  assert.doesNotMatch(bundle.artifacts["summary.md"], /- no geometry harmonies pack/u);
  assert.doesNotMatch(bundle.artifacts["summary.md"], /- no new ratio pack/u);
  assert.match(bundle.artifacts["report.html"], /norma\.geometry-harmonies@0\.1\.0/u);
});

test("local structured analyze report command writes the deterministic output bundle", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "norma-report-kit-"));

  try {
    const { stdout } = await execFileAsync(process.execPath, [reportCommandPath, exampleInputPath, outputDir], {
      cwd: repoRoot,
    });
    const commandResult = JSON.parse(stdout);

    assert.equal(commandResult.status, "ok");
    assert.equal(commandResult.resultStatus, "valid");
    assert.deepEqual(commandResult.files, LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES);

    const result = await readJson(join(outputDir, "result.json"));
    const summary = await readJson(join(outputDir, "summary.json"));
    const summaryMarkdown = await readFile(join(outputDir, "summary.md"), "utf8");
    const visualSvg = await readFile(join(outputDir, "visual.svg"), "utf8");
    const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");
    const directResult = core.analyzeStructuredCompositionV1(await readJson(exampleInputPath));

    assert.deepEqual(result, directResult);
    assert.equal(summary.status, "valid");
    assert.equal(summary.operation.boundary, "direct-function");
    assert.match(summaryMarkdown, /# Local Structured Analyze Report/u);
    assert.match(summaryMarkdown, /no MCP runtime change/u);
    assert.match(visualSvg, /^<svg/u);
    assert.match(visualSvg, /Composition A/u);
    assert.match(visualSvg, /Composition B/u);
    assert.match(reportHtml, /<!doctype html>/u);
    assert.match(reportHtml, /Local Structured Analyze Report/u);
    assert.match(reportHtml, /result\.json<\/code> is the canonical Norma truth/u);
    assert.match(reportHtml, /local read-only inspection artifact/u);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("local structured analyze report command writes the Geometry Harmony example bundle", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "norma-geometry-harmony-report-"));

  try {
    const input = await readJson(geometryHarmonyExampleInputPath);
    const directResult = core.analyzeStructuredCompositionV1(input);
    const { stdout } = await execFileAsync(process.execPath, [reportCommandPath, geometryHarmonyExampleInputPath, outputDir], {
      cwd: repoRoot,
    });
    const commandResult = JSON.parse(stdout);

    assert.equal(directResult.status, "valid");
    assert.equal(directResult.comparison.status, "a_closer");
    assert.equal(directResult.decision.status, "a_closer");
    assert.equal(directResult.decision.selectedEvaluationRef, "evaluation:A:basic-grid-alignment");
    assert.equal(directResult.replayReadiness.status, "ready");
    assert.equal(commandResult.status, "ok");
    assert.equal(commandResult.resultStatus, "valid");
    assert.deepEqual(commandResult.files, LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES);

    const result = await readJson(join(outputDir, "result.json"));
    const summary = await readJson(join(outputDir, "summary.json"));
    const summaryMarkdown = await readFile(join(outputDir, "summary.md"), "utf8");
    const visualSvg = await readFile(join(outputDir, "visual.svg"), "utf8");
    const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");

    assert.deepEqual(result, directResult);
    assert.equal(summary.status, "valid");
    assert.equal(summary.input.ratioPackId, "norma.geometry-harmonies");
    assert.equal(summary.input.ratioPackVersion, "0.1.0");
    assert.equal(summary.input.ratioPackRef, "norma.geometry-harmonies@0.1.0");
    assert.equal(summary.input.ruleSetRef, "surface-golden-section");
    assert.equal(summary.input.evaluationProfileRef, "evaluation-profile:basic-grid-alignment");
    assert.equal(summary.scope.geometryHarmoniesPack, true);
    assert.equal(summary.scope.newRatioPack, true);
    assert.match(summaryMarkdown, /- geometry harmonies pack supplied/u);
    assert.match(summaryMarkdown, /- non-basic ratio pack supplied/u);
    assert.match(visualSvg, /^<svg/u);
    assert.match(reportHtml, /norma\.geometry-harmonies@0\.1\.0/u);
    assert.doesNotMatch(`${summaryMarkdown}\n${reportHtml}`, /\bbetter\b|\bbeautiful\b|\brecommends?\b/iu);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("local structured analyze report command emits structured usage errors", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [reportCommandPath], { cwd: repoRoot }),
    (error) => {
      assert.equal(error.code, 1);
      const errorPayload = JSON.parse(error.stderr);
      assert.equal(errorPayload.status, "error");
      assert.equal(errorPayload.error.code, "InvalidCliUsage");
      assert.doesNotMatch(error.stderr, /ReferenceError/u);
      return true;
    },
  );

  await assert.rejects(
    execFileAsync(process.execPath, [reportCommandPath, exampleInputPath, tmpdir(), "extra"], { cwd: repoRoot }),
    (error) => {
      assert.equal(error.code, 1);
      const errorPayload = JSON.parse(error.stderr);
      assert.equal(errorPayload.status, "error");
      assert.equal(errorPayload.error.code, "InvalidCliUsage");
      return true;
    },
  );
});

test("local structured analyze report command writes invalid bundle for primitive JSON input", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "norma-report-kit-invalid-"));
  const inputPath = join(tempDir, "null.json");
  const outputDir = join(tempDir, "out");
  await writeFile(inputPath, "null", "utf8");

  try {
    await assert.rejects(
      execFileAsync(process.execPath, [reportCommandPath, inputPath, outputDir], { cwd: repoRoot }),
      (error) => {
        assert.equal(error.code, 2);
        const commandResult = JSON.parse(error.stdout);
        assert.equal(commandResult.status, "ok");
        assert.equal(commandResult.resultStatus, "invalid");
        assert.equal(error.stderr, "");
        return true;
      },
    );

    assert.equal((await readJson(join(outputDir, "result.json"))).status, "invalid");
    assert.equal((await readJson(join(outputDir, "summary.json"))).status, "invalid");
    assert.match(await readFile(join(outputDir, "visual.svg"), "utf8"), /No rectangular Composition2D visual available/u);
    const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");
    assert.match(reportHtml, /<dt>status<\/dt><dd>invalid<\/dd>/u);
    assert.match(reportHtml, /Diagnostics \/ Errors \/ Warnings/u);
    assert.match(reportHtml, /InvalidInputShape/u);
    assert.doesNotMatch(reportHtml, /class="evaluation-grid"/u);
    assert.doesNotMatch(reportHtml, /A is closer to the declared system/u);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("local structured analyze report bundle handles invalid primitive input", () => {
  const bundle = createLocalStructuredAnalyzeReportBundle(null);

  assert.equal(bundle.result.status, "invalid");
  assert.equal(bundle.summary.status, "invalid");
  assert.equal(bundle.summary.input.contractVersion, null);
  assert.equal(bundle.summary.input.compositionAId, null);
  assert.equal(bundle.summary.input.compositionBId, null);
  assert.equal(bundle.summary.input.ratioPackRef, null);
  assert.equal(bundle.summary.scope.geometryHarmoniesPack, false);
  assert.equal(bundle.summary.scope.newRatioPack, false);
  assert.match(bundle.artifacts["result.json"], /"status":"invalid"/u);
  assert.match(bundle.artifacts["summary.json"], /"status":"invalid"/u);
  assert.match(bundle.artifacts["visual.svg"], /No rectangular Composition2D visual available/u);
});

test("local structured analyze report visual skips invalid element geometry", async () => {
  const input = await readJson(exampleInputPath);
  input.compositionA.elements = [
    { kind: "element", id: "missing-geometry" },
    input.compositionA.elements[0],
  ];

  const visualSvg = createLocalStructuredAnalyzeReportBundle(input).artifacts["visual.svg"];

  assert.doesNotMatch(visualSvg, /NaN/u);
  assert.doesNotMatch(visualSvg, /data-element="missing-geometry"/u);
  assert.match(visualSvg, /data-element="grid-left-column"/u);
});

test("local structured analyze report visual skips non-positive rect geometry", async () => {
  const input = await readJson(exampleInputPath);
  input.compositionA.elements = [
    {
      ...input.compositionA.elements[0],
      id: "negative-width",
      geometry: { ...input.compositionA.elements[0].geometry, width: -300 },
    },
    input.compositionA.elements[1],
  ];

  const visualSvg = createLocalStructuredAnalyzeReportBundle(input).artifacts["visual.svg"];

  assert.doesNotMatch(visualSvg, /width="-300"/u);
  assert.doesNotMatch(visualSvg, /data-element="negative-width"/u);
  assert.match(visualSvg, /data-element="grid-middle-column"/u);
});

test("local structured analyze report visual suppresses mismatched surfaces", async () => {
  const input = await readJson(exampleInputPath);
  input.compositionB.surface = {
    ...input.compositionB.surface,
    bounds: { ...input.compositionB.surface.bounds, width: input.compositionB.surface.bounds.width + 120 },
  };

  const bundle = createLocalStructuredAnalyzeReportBundle(input);

  assert.equal(bundle.result.status, "invalid");
  assert.match(bundle.artifacts["visual.svg"], /No rectangular Composition2D visual available/u);
  assert.doesNotMatch(bundle.artifacts["visual.svg"], /Composition B/u);
});

test("local structured analyze report visual uses stable codepoint element order", async () => {
  const input = await readJson(exampleInputPath);
  input.compositionA.elements = [
    { ...input.compositionA.elements[0], id: "b" },
    { ...input.compositionA.elements[1], id: "A" },
  ];

  const visualSvg = createLocalStructuredAnalyzeReportBundle(input).artifacts["visual.svg"];

  assert.ok(
    visualSvg.indexOf('data-element="A"') < visualSvg.indexOf('data-element="b"'),
    "visual.svg element order should not depend on runtime locale collation",
  );
});

test("local structured analyze report markdown keeps user strings on one line", async () => {
  const input = await readJson(exampleInputPath);
  input.analysisId = "analysis:ok\n- status: spoofed";
  input.compositionA.id = "composition:a\n- decision: spoofed";

  const summaryMarkdown = createLocalStructuredAnalyzeReportBundle(input).artifacts["summary.md"];

  assert.match(summaryMarkdown, /- analysisId: analysis:ok\\n- status: spoofed/u);
  assert.match(summaryMarkdown, /- input: composition:a\\n- decision: spoofed vs/u);
  assert.doesNotMatch(summaryMarkdown, /^- status: spoofed$/mu);
  assert.doesNotMatch(summaryMarkdown, /^- decision: spoofed$/mu);
});

test("local structured analyze report command is deterministic for the same input", async () => {
  const firstDir = await mkdtemp(join(tmpdir(), "norma-report-kit-a-"));
  const secondDir = await mkdtemp(join(tmpdir(), "norma-report-kit-b-"));

  try {
    await execFileAsync(process.execPath, [reportCommandPath, exampleInputPath, firstDir], { cwd: repoRoot });
    await execFileAsync(process.execPath, [reportCommandPath, exampleInputPath, secondDir], { cwd: repoRoot });

    for (const fileName of LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES) {
      assert.equal(
        await readFile(join(firstDir, fileName), "utf8"),
        await readFile(join(secondDir, fileName), "utf8"),
        fileName,
      );
    }
  } finally {
    await rm(firstDir, { recursive: true, force: true });
    await rm(secondDir, { recursive: true, force: true });
  }
});

test("local structured analyze report command is deterministic for the Geometry Harmony example", async () => {
  const firstDir = await mkdtemp(join(tmpdir(), "norma-harmony-report-a-"));
  const secondDir = await mkdtemp(join(tmpdir(), "norma-harmony-report-b-"));

  try {
    await execFileAsync(process.execPath, [reportCommandPath, geometryHarmonyExampleInputPath, firstDir], { cwd: repoRoot });
    await execFileAsync(process.execPath, [reportCommandPath, geometryHarmonyExampleInputPath, secondDir], { cwd: repoRoot });

    for (const fileName of LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES) {
      assert.equal(
        await readFile(join(firstDir, fileName), "utf8"),
        await readFile(join(secondDir, fileName), "utf8"),
        fileName,
      );
    }
  } finally {
    await rm(firstDir, { recursive: true, force: true });
    await rm(secondDir, { recursive: true, force: true });
  }
});

test("local structured analyze report generation preserves input and result objects", async () => {
  const input = await readJson(exampleInputPath);
  const inputBefore = canonicalSnapshot(input);
  const directResult = core.analyzeStructuredCompositionV1(input);
  const directResultBefore = canonicalSnapshot(directResult);
  const bundle = createLocalStructuredAnalyzeReportBundle(input);
  const summaryBefore = canonicalSnapshot(bundle.summary);
  const reportKitResultBefore = canonicalSnapshot(bundle.result);
  const firstReportHtml = createVisualComparisonReportHtml({
    summary: bundle.summary,
    result: directResult,
    visualSvg: bundle.artifacts["visual.svg"],
  });

  assert.equal(canonicalSnapshot(input), inputBefore);
  assert.deepEqual(bundle.result, directResult);

  const secondReportHtml = createVisualComparisonReportHtml({
    summary: bundle.summary,
    result: directResult,
    visualSvg: bundle.artifacts["visual.svg"],
  });
  const reportKitResultHtml = createVisualComparisonReportHtml({
    summary: bundle.summary,
    result: bundle.result,
    visualSvg: bundle.artifacts["visual.svg"],
  });

  assert.equal(firstReportHtml, secondReportHtml);
  assert.equal(reportKitResultHtml, bundle.artifacts["report.html"]);
  assert.equal(canonicalSnapshot(input), inputBefore);
  assert.equal(canonicalSnapshot(directResult), directResultBefore);
  assert.equal(canonicalSnapshot(bundle.summary), summaryBefore);
  assert.equal(canonicalSnapshot(bundle.result), reportKitResultBefore);
});

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function canonicalSnapshot(value) {
  return core.serializeCanonicalJson(value);
}

function usePackIdentity(input, packIdentity) {
  const nextInput = structuredClone(input);
  const version = "0.1.0";
  const ratioPack = {
    ...nextInput.ratioPack,
    id: packIdentity.id,
    version,
    identity: {
      ...nextInput.ratioPack.identity,
      id: packIdentity.id,
      concept: packIdentity.concept,
    },
    contentIdentity: packIdentity.contentIdentity,
    metadata: {
      ...nextInput.ratioPack.metadata,
      name: packIdentity.name,
      description: packIdentity.description,
    },
    provenance: {
      ...nextInput.ratioPack.provenance,
      source: packIdentity.source,
      sourceRefs: [{ kind: "test-fixture", ref: "local-report-pack-scope-summary" }],
    },
    preLock: {
      ...nextInput.ratioPack.preLock,
      ref: `prelock:${packIdentity.id}@${version}`,
      packId: packIdentity.id,
      packVersion: version,
      contentIdentity: packIdentity.contentIdentity,
    },
  };
  const packLock = core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: `${packIdentity.id}@${version}` }],
  });

  assert.equal(packLock.status, "ok");
  nextInput.ratioPack = ratioPack;
  nextInput.packLock = packLock.output;

  return nextInput;
}
