import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const docPath = join(repoRoot, "docs/examples/local-structured-analyze-demo-workflow.md");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const familyExamplePaths = [
  "examples/structured-analyze/families/harmonic-triads-basic.json",
  "examples/structured-analyze/families/root-two-harmonics-basic.json",
];

test("R30 demo doc exists and references only existing local workflow files", async () => {
  const doc = await readFile(docPath, "utf8");

  assert.match(doc, /Local Structured Analyze Demo Workflow/u);
  assert.match(doc, /local-only workflow/u);
  assert.match(doc, /no hosting required/u);
  assert.match(doc, /local report entrypoint/u);
  assert.match(doc, /not a new public API contract/u);
  assert.match(doc, /`result\.json` is canonical Norma truth/u);
  assert.match(doc, /may also contain additional derived files/u);
  assert.match(doc, /must not redefine engine truth/u);
  assert.match(doc, /explicit structured inputs/u);
  assert.match(doc, /does not select or infer ratio families/u);
  assert.doesNotMatch(doc, /<tmp-output-dir>/u);
  assert.match(doc, /\/tmp\/norma-r30-harmonic-triads-report/u);
  assert.match(doc, /\/tmp\/norma-r30-root-two-harmonics-report/u);

  for (const examplePath of familyExamplePaths) {
    assert.match(doc, new RegExp(escapeRegExp(examplePath), "u"));
    assert.equal(await pathExists(join(repoRoot, examplePath)), true, examplePath);
  }

  assert.equal(await pathExists(reportCommandPath), true);

  const referencedRepoPaths = [...doc.matchAll(/\b(?:bin|docs|examples|src|tests|viewer)\/[A-Za-z0-9._/@-]+(?:\/[A-Za-z0-9._/@-]+)*/gu)]
    .map((match) => match[0]);

  for (const referencedPath of referencedRepoPaths) {
    assert.equal(await pathExists(join(repoRoot, referencedPath)), true, referencedPath);
  }
});

test("R30 local demo workflow produces canonical result.json for both family examples", async () => {
  for (const examplePath of familyExamplePaths) {
    const inputPath = join(repoRoot, examplePath);
    const tempRoot = await mkdtemp(join(tmpdir(), "norma-r30-demo-workflow-"));
    const outputDir = join(tempRoot, "report-output");

    try {
      const inputBeforeHash = await fileHash(inputPath);
      const input = await readJson(inputPath);
      const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));
      const repeatedDirectResult = core.analyzeStructuredCompositionV1(structuredClone(input));

      assert.deepEqual(repeatedDirectResult, directResult, `${examplePath} direct engine output should be stable`);

      await execFileAsync(process.execPath, [reportCommandPath, inputPath, outputDir], {
        cwd: repoRoot,
      });

      assert.equal((await stat(outputDir)).isDirectory(), true);

      const result = await readJson(join(outputDir, "result.json"));

      assert.deepEqual(result, directResult, `${examplePath} result.json should match direct engine output`);
      assert.equal(await fileHash(inputPath), inputBeforeHash, `${examplePath} input JSON must not be mutated`);

      if (await pathExists(join(outputDir, "report.html"))) {
        const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");
        assertNoForbiddenAuthorityLanguage(reportHtml, `${examplePath} report.html`);
      }

      if (await pathExists(join(outputDir, "visual.svg"))) {
        const visualSvg = await readFile(join(outputDir, "visual.svg"), "utf8");
        assert.doesNotMatch(visualSvg, /<script\b/iu, `${examplePath} visual.svg`);
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
});

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function fileHash(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function assertNoForbiddenAuthorityLanguage(text, label) {
  const forbiddenPatterns = [
    [/\brecommend(?:s|ed|ing|ation)?\b/iu, "recommendation"],
    [/\boptim(?:ize|izes|ized|izing|ization|ise|ises|ised|ising|isation)\b/iu, "optimization"],
    [/\bbeauty\s+scor(?:e|ing)\b/iu, "beauty scoring"],
    [/\bautomatic(?:ally)?\s+correct(?:s|ed|ing|ion)?\b/iu, "automatic correction"],
    [/\bautomatic(?:ally)?\s+(?:ratio[- ]?)?family\s+selection\b/iu, "automatic family selection"],
    [/\b(?:prompt|image|cad|gpt)\s+(?:inference|input|adapter)\b/iu, "prompt/image/CAD/GPT inference"],
  ];

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    assert.doesNotMatch(text, pattern, `${label} must not imply ${forbiddenLabel}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
