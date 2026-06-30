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
import {
  reportCommandFailureTextLimit,
  runRealUsecaseDemoCli,
} from "../bin/norma-core-real-usecase-demo.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const demoCommandPath = join(repoRoot, "bin/norma-core-real-usecase-demo.mjs");
const examplePath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const expectedOutputFiles = [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort();

test("R34 real-usecase local demo command preserves explicit --output success envelope", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-r34-real-usecase-demo-"));
  const firstOutputDir = join(tempRoot, "first-report");
  const secondOutputDir = join(tempRoot, "second-report");

  try {
    assert.equal((await stat(demoCommandPath)).isFile(), true);
    assert.equal((await stat(examplePath)).isFile(), true);

    const inputBeforeHash = await fileHash(examplePath);
    const input = await readJson(examplePath);
    const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));

    const first = await runDemoCommand(["--output", firstOutputDir]);
    const second = await runDemoCommand(["--output", secondOutputDir]);

    assert.equal(first.parsed.status, "ok");
    assert.equal(first.parsed.input, examplePath);
    assert.equal(first.parsed.outputDir, firstOutputDir);
    assert.equal(first.parsed.resultJson, join(firstOutputDir, "result.json"));
    assert.equal(first.parsed.canonicalTruth, "result.json");
    assert.equal(first.parsed.derivedArtifacts, true);
    assert.equal("kind" in first.parsed, false);
    assert.deepEqual(Object.keys(first.parsed.files).sort(), expectedOutputFiles);
    assert.deepEqual(
      Object.values(first.parsed.files).sort(),
      expectedOutputFiles.map((fileName) => join(firstOutputDir, fileName)).sort(),
    );

    for (const [fileName, fieldName] of [
      ["report.html", "reportHtml"],
      ["visual.svg", "visualSvg"],
      ["summary.json", "summaryJson"],
      ["summary.md", "summaryMarkdown"],
    ]) {
      if (expectedOutputFiles.includes(fileName)) {
        assert.equal(first.parsed[fieldName], join(firstOutputDir, fileName), fieldName);
      } else {
        assert.equal(fieldName in first.parsed, false, fieldName);
      }
    }

    assert.equal(second.parsed.status, first.parsed.status);
    assert.equal(second.parsed.input, first.parsed.input);
    assert.equal(second.parsed.outputDir, secondOutputDir);
    assert.deepEqual(Object.keys(second.parsed.files).sort(), expectedOutputFiles);

    assert.deepEqual((await readdir(firstOutputDir)).sort(), expectedOutputFiles);
    assert.deepEqual((await readdir(secondOutputDir)).sort(), expectedOutputFiles);

    const resultText = await readFile(join(firstOutputDir, "result.json"), "utf8");
    const result = JSON.parse(resultText);

    assert.deepEqual(result, directResult);
    assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);
    assert.equal(
      await readFile(join(secondOutputDir, "result.json"), "utf8"),
      resultText,
    );

    await assertGeneratedArtifactsStayDerivedOnly(first.stdout, firstOutputDir);
    assert.equal(await fileHash(examplePath), inputBeforeHash);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("R35 no-arg real-usecase local demo command uses unique temp dirs with deterministic result.json", async () => {
  const createdOutputDirs = [];

  try {
    const input = await readJson(examplePath);
    const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));

    const first = await runDemoCommand();
    const second = await runDemoCommand();
    createdOutputDirs.push(first.parsed.outputDir, second.parsed.outputDir);

    assert.equal(first.parsed.status, "ok");
    assert.equal(second.parsed.status, "ok");
    assert.notEqual(first.parsed.outputDir, second.parsed.outputDir);
    assert.equal(first.parsed.input, examplePath);
    assert.equal(second.parsed.input, examplePath);
    assert.equal(first.parsed.resultJson, join(first.parsed.outputDir, "result.json"));
    assert.equal(second.parsed.resultJson, join(second.parsed.outputDir, "result.json"));
    assert.equal(first.parsed.canonicalTruth, "result.json");
    assert.equal(second.parsed.canonicalTruth, "result.json");
    assert.equal(first.parsed.derivedArtifacts, true);
    assert.equal(second.parsed.derivedArtifacts, true);
    assert.equal("kind" in first.parsed, false);
    assert.equal("kind" in second.parsed, false);

    assert.deepEqual((await readdir(first.parsed.outputDir)).sort(), expectedOutputFiles);
    assert.deepEqual((await readdir(second.parsed.outputDir)).sort(), expectedOutputFiles);
    assert.deepEqual(Object.keys(first.parsed.files).sort(), expectedOutputFiles);
    assert.deepEqual(Object.keys(second.parsed.files).sort(), expectedOutputFiles);

    const firstResultText = await readFile(first.parsed.resultJson, "utf8");
    const secondResultText = await readFile(second.parsed.resultJson, "utf8");

    assert.equal(firstResultText, secondResultText);
    assert.deepEqual(JSON.parse(firstResultText), directResult);
    assert.equal(firstResultText, `${core.serializeCanonicalJson(directResult)}\n`);
  } finally {
    await Promise.all(createdOutputDirs.map((outputDir) => rm(outputDir, { recursive: true, force: true })));
  }
});

test("R35 report subprocess timeout failure emits bounded stderr JSON and non-zero exit", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-r35-real-usecase-failure-"));
  const outputDir = join(tempRoot, "report");
  const stdoutText = "child stdout ".repeat(reportCommandFailureTextLimit);
  const stderrText = "child stderr ".repeat(reportCommandFailureTextLimit);
  const timeoutError = Object.assign(new Error("report command timed out"), {
    killed: true,
    signal: "SIGTERM",
    stdout: stdoutText,
    stderr: stderrText,
  });
  const stdoutWrites = [];
  const stderrWrites = [];
  const observedCalls = [];

  try {
    const exitCode = await runRealUsecaseDemoCli({
      args: ["--output", outputDir],
      stdout: { write: (value) => stdoutWrites.push(value) },
      stderr: { write: (value) => stderrWrites.push(value) },
      options: {
        reportCommandTimeoutMs: 12,
        execFileAsync: async (...call) => {
          observedCalls.push(call);
          throw timeoutError;
        },
      },
    });

    assert.equal(exitCode, 3);
    assert.equal(stdoutWrites.join(""), "");
    assert.equal(observedCalls.length, 1);
    assert.equal(observedCalls[0][0], process.execPath);
    assert.deepEqual(observedCalls[0][1], [reportCommandPath, examplePath, outputDir]);
    assert.equal(observedCalls[0][2].cwd, repoRoot);
    assert.equal(observedCalls[0][2].timeout, 12);

    const payload = JSON.parse(stderrWrites.join(""));
    assert.equal(payload.status, "error");
    assert.equal(payload.error.code, "RealUsecaseDemoFailed");
    assert.match(payload.error.message, /report command timed out/u);

    const reportCommand = payload.error.reportCommand;
    assert.equal(reportCommand.timeoutMs, 12);
    assert.equal(reportCommand.killed, true);
    assert.equal(reportCommand.signal, "SIGTERM");
    assert.equal(reportCommand.timedOut, true);
    assert.equal(reportCommand.stdout.text.length, reportCommandFailureTextLimit);
    assert.equal(reportCommand.stdout.length, stdoutText.length);
    assert.equal(reportCommand.stdout.truncated, true);
    assert.equal(reportCommand.stderr.text.length, reportCommandFailureTextLimit);
    assert.equal(reportCommand.stderr.length, stderrText.length);
    assert.equal(reportCommand.stderr.truncated, true);
    assert.equal(reportCommand.error.name.text, "Error");
    assert.match(reportCommand.error.message.text, /report command timed out/u);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

async function runDemoCommand(args = []) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [demoCommandPath, ...args],
    {
      cwd: repoRoot,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  assert.equal(stderr, "");

  return {
    stdout,
    parsed: JSON.parse(stdout),
  };
}

async function assertGeneratedArtifactsStayDerivedOnly(stdout, outputDir) {
  assertNoForbiddenAuthorityClaims(stdout, "stdout");

  for (const fileName of expectedOutputFiles) {
    const artifactText = await readFile(join(outputDir, fileName), "utf8");

    assertNoForbiddenAuthorityClaims(artifactText, fileName);
  }
}

function assertNoForbiddenAuthorityClaims(text, label) {
  const forbiddenPatterns = [
    [/\binference\s+(?:enabled|implemented|supported|available|performed|created)\b/iu, "inference claim"],
    [/\brecommendation\s+(?:engine|enabled|implemented|supported|available|performed|created)\b/iu, "recommendation claim"],
    [/\boptim(?:ization|isation)\s+(?:engine|enabled|implemented|supported|available|performed|created)\b/iu, "optimization claim"],
    [/\bcorrection\s+(?:engine|enabled|implemented|supported|available|performed|created)\b/iu, "correction claim"],
    [/\bbeauty\s+scor(?:e|ing)\s+(?:computed|enabled|implemented|supported|available)\b/iu, "beauty scoring claim"],
    [/\b(?:image|cad|figma|photoshop|illustrator)\s+(?:adapter|input|support|ingestion|inference)\s+(?:enabled|implemented|supported|available)\b/iu, "adapter support claim"],
    [/\bhosted\s+dashboard\s+(?:enabled|implemented|supported|available)\b/iu, "hosted dashboard claim"],
    [/\bapi\s+runtime\s+(?:enabled|implemented|supported|available)\b/iu, "API runtime claim"],
    [/\bmcp\s+(?:expansion|runtime|server|adapter)\s+(?:enabled|implemented|supported|available)\b/iu, "MCP expansion claim"],
    [/\bpublic\s+npm\s+publication\s+(?:enabled|implemented|supported|available)\b/iu, "public npm publication claim"],
  ];

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    assert.doesNotMatch(text, pattern, `${label} must not include a ${forbiddenLabel}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function fileHash(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}
