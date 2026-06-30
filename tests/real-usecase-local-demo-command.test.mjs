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
const demoCommandPath = join(repoRoot, "bin/norma-core-real-usecase-demo.mjs");
const examplePath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const expectedOutputFiles = [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort();

test("R34 real-usecase local demo command produces a canonical deterministic report", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-r34-real-usecase-demo-"));
  const firstOutputDir = join(tempRoot, "first-report");
  const secondOutputDir = join(tempRoot, "second-report");

  try {
    assert.equal((await stat(demoCommandPath)).isFile(), true);
    assert.equal((await stat(examplePath)).isFile(), true);

    const inputBeforeHash = await fileHash(examplePath);
    const input = await readJson(examplePath);
    const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));

    const first = await runDemoCommand(firstOutputDir);
    const second = await runDemoCommand(secondOutputDir);

    assert.equal(first.parsed.status, "ok");
    assert.equal(first.parsed.input, examplePath);
    assert.equal(first.parsed.outputDir, firstOutputDir);
    assert.equal(first.parsed.resultJson, join(firstOutputDir, "result.json"));
    assert.equal(first.parsed.canonicalTruth, "result.json");
    assert.equal(first.parsed.derivedArtifacts, true);
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

async function runDemoCommand(outputDir) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [demoCommandPath, "--output", outputDir],
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
