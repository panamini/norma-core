import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const exampleInputPath = join(repoRoot, "examples/structured-analyze/basic-grid-alignment.json");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");

test("local structured analyze report bundle calls the direct core operation", async () => {
  const input = await readJson(exampleInputPath);
  const bundle = createLocalStructuredAnalyzeReportBundle(input);
  const directResult = core.analyzeStructuredCompositionV1(input);

  assert.deepEqual(bundle.result, directResult);
  assert.equal(bundle.result.status, "valid");
  assert.equal(bundle.summary.operation.boundary, "direct-function");
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
  assert.deepEqual(Object.keys(bundle.artifacts).sort(), [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort());
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
});

test("local structured analyze report bundle handles invalid primitive input", () => {
  const bundle = createLocalStructuredAnalyzeReportBundle(null);

  assert.equal(bundle.result.status, "invalid");
  assert.equal(bundle.summary.status, "invalid");
  assert.equal(bundle.summary.input.contractVersion, null);
  assert.equal(bundle.summary.input.compositionAId, null);
  assert.equal(bundle.summary.input.compositionBId, null);
  assert.match(bundle.artifacts["result.json"], /"status":"invalid"/u);
  assert.match(bundle.artifacts["summary.json"], /"status":"invalid"/u);
  assert.match(bundle.artifacts["visual.svg"], /No rectangular Composition2D visual available/u);
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
