import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
} from "../dist/src/local-report/structured-analyze-report.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const examplePath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const expectedOutputFiles = [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort();

test("R32 real-usecase local inspection demo remains deterministic and derived-only", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-r32-real-usecase-local-inspection-"));
  const firstOutputDir = join(tempRoot, "first-report");
  const secondOutputDir = join(tempRoot, "second-report");

  try {
    assert.equal((await stat(examplePath)).isFile(), true);
    assert.equal((await stat(reportCommandPath)).isFile(), true);

    const inputBeforeHash = await fileHash(examplePath);
    const input = await readJson(examplePath);
    const firstDirectResult = core.analyzeStructuredCompositionV1(structuredClone(input));
    const secondDirectResult = core.analyzeStructuredCompositionV1(structuredClone(input));

    assertValidR31Result(firstDirectResult);
    assert.deepEqual(secondDirectResult, firstDirectResult);

    const firstCommand = await runReportCommand(firstOutputDir);
    const secondCommand = await runReportCommand(secondOutputDir);

    assert.equal(firstCommand.status, "ok");
    assert.equal(firstCommand.resultStatus, "valid");
    assert.equal(firstCommand.analysisId, input.analysisId);
    assert.equal(firstCommand.outputDir, firstOutputDir);
    assert.deepEqual(firstCommand.files, LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES);
    assert.equal(secondCommand.status, firstCommand.status);
    assert.equal(secondCommand.resultStatus, firstCommand.resultStatus);
    assert.equal(secondCommand.analysisId, firstCommand.analysisId);
    assert.equal(secondCommand.outputDir, secondOutputDir);
    assert.deepEqual(secondCommand.files, firstCommand.files);

    assert.deepEqual((await readdir(firstOutputDir)).sort(), expectedOutputFiles);
    assert.deepEqual((await readdir(secondOutputDir)).sort(), expectedOutputFiles);

    const firstResultText = await readFile(join(firstOutputDir, "result.json"), "utf8");
    const firstResult = JSON.parse(firstResultText);

    assert.deepEqual(firstResult, firstDirectResult);
    assert.equal(firstResultText, `${core.serializeCanonicalJson(firstDirectResult)}\n`);
    assert.equal(
      await readFile(join(secondOutputDir, "result.json"), "utf8"),
      firstResultText,
    );

    for (const fileName of expectedOutputFiles) {
      assert.equal(
        await readFile(join(firstOutputDir, fileName), "utf8"),
        await readFile(join(secondOutputDir, fileName), "utf8"),
        fileName,
      );
    }

    await assertDerivedOnlyReportArtifacts(firstOutputDir, input);
    assert.equal(await fileHash(examplePath), inputBeforeHash);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

async function runReportCommand(outputDir) {
  const { stdout } = await execFileAsync(process.execPath, [reportCommandPath, examplePath, outputDir], {
    cwd: repoRoot,
  });
  return JSON.parse(stdout);
}

async function assertDerivedOnlyReportArtifacts(outputDir, input) {
  const summary = await readJson(join(outputDir, "summary.json"));
  const summaryMarkdown = await readFile(join(outputDir, "summary.md"), "utf8");
  const visualSvg = await readFile(join(outputDir, "visual.svg"), "utf8");
  const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");

  assert.equal(summary.kind, "local-structured-analyze-report-kit-summary");
  assert.equal(summary.analysisId, input.analysisId);
  assert.equal(summary.status, "valid");
  assert.equal(summary.operation.boundary, "direct-function");
  assert.equal(summary.input.ratioPackRef, `${input.ratioPack.id}@${input.ratioPack.version}`);
  assert.equal(summary.input.ruleSetRef, input.ruleSetRef);
  assert.equal(summary.replayReadiness.status, "ready");
  assert.deepEqual(summary.outputFiles, LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES);
  assert.deepEqual(summary.scope, {
    localCommandOnly: true,
    directAnalyzeStructuredCompositionV1: true,
    explicitStructuredJsonInput: true,
    mcpRuntimeChange: false,
    hostedMcp: false,
    cloudflare: false,
    publicSubmission: false,
    geometryHarmoniesPack: false,
    newRatioPack: true,
    recommendation: false,
    beautyScore: false,
    promptImageInference: false,
  });

  assert.match(summaryMarkdown, /result\.json is the canonical source of truth/u);
  assert.match(summaryMarkdown, /summary\.json, summary\.md, visual\.svg, and report\.html are derived local inspection artifacts/u);
  assert.match(summaryMarkdown, /visual\.svg is representational only and cannot change result equality/u);
  assert.match(visualSvg, /^<svg/u);
  assert.doesNotMatch(visualSvg, /<script\b/iu);
  assert.match(reportHtml, /result\.json<\/code> is the canonical source of truth/u);
  assert.match(reportHtml, /local read-only inspection artifact/u);
  assert.match(reportHtml, /derived local views/u);
  assert.match(reportHtml, /representational only and cannot change result equality/u);
  assertNoForbiddenAuthorityLanguage(summaryMarkdown, "summary.md");
  assertNoForbiddenAuthorityLanguage(reportHtml, "report.html");
}

function assertValidR31Result(result) {
  assert.equal(result.status, "valid");
  assert.equal(result.analysisId, "analysis:r31-structured-layout-real-usecase");
  assert.equal(result.errors.length, 0);
  assert.equal(result.replayReadiness.status, "ready");
  assert.equal(result.inputRefs.some((ref) => ref.kind === "ratio-pack" && ref.ref === "norma.root-two-harmonics@0.1.0"), true);
  assert.equal(result.inputRefs.some((ref) => ref.kind === "rule-set" && ref.ref === "surface-root-two-section"), true);
}

function assertNoForbiddenAuthorityLanguage(text, label) {
  const forbiddenPatterns = [
    [/\brecommendation\s+engine\b/iu, "recommendation engine"],
    [/\boptim(?:ization|isation)\s+engine\b/iu, "optimization engine"],
    [/\bbeauty\s+scor(?:e|ing)\s+(?:computed|enabled|implemented|supported)\b/iu, "beauty scoring support"],
    [/\bautomatic(?:ally)?\s+correct(?:s|ed|ing|ion)?\s+(?:enabled|implemented|supported)\b/iu, "automatic correction support"],
    [/\b(?:prompt|image|cad|gpt)\s+(?:inference|input|adapter)\s+(?:enabled|implemented|supported)\b/iu, "prompt/image/CAD/GPT inference support"],
  ];

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    assert.doesNotMatch(text, pattern, `${label} must not imply ${forbiddenLabel}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function fileHash(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}
