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
  localGuidedInspectionDemoChangedFiles,
  localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const guidedCommandPath = join(repoRoot, "bin/norma-core-guided-inspection-demo.mjs");
const realUsecaseCommandPath = join(repoRoot, "bin/norma-core-real-usecase-demo.mjs");
const sourceInputPath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const outputFiles = ["guide.html", "report.html", "result.json", "summary.json", "summary.md", "visual.svg"];
const guidedSuccessEnvelopeKeys = [
  "canonicalTruth",
  "derivedArtifacts",
  "guideHtml",
  "localOnly",
  "outputDir",
  "reportHtml",
  "resultJson",
  "status",
  "summaryJson",
  "summaryMarkdown",
  "visualSvg",
];
const realUsecaseSuccessEnvelopeKeys = [
  "canonicalTruth",
  "derivedArtifacts",
  "files",
  "input",
  "outputDir",
  "reportHtml",
  "resultJson",
  "status",
  "summaryJson",
  "summaryMarkdown",
  "visualSvg",
];

test("PR89 guided inspection command works with no args and unique temp output dirs", async () => {
  const createdOutputDirs = [];

  try {
    const first = await runGuidedCommand();
    const second = await runGuidedCommand();
    createdOutputDirs.push(first.parsed.outputDir, second.parsed.outputDir);

    assert.equal(first.parsed.status, "ok");
    assert.equal(second.parsed.status, "ok");
    assert.equal(first.parsed.localOnly, true);
    assert.equal(second.parsed.localOnly, true);
    assert.notEqual(first.parsed.outputDir, second.parsed.outputDir);
    assert.match(first.parsed.outputDir, /norma-core-guided-inspection-demo-/u);
    assert.match(second.parsed.outputDir, /norma-core-guided-inspection-demo-/u);
    await assertGuidedOutput(first.parsed);
    await assertGuidedOutput(second.parsed);
  } finally {
    await removeDirs(createdOutputDirs);
  }
});

test("PR89 guided inspection command works with explicit --output", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr89-guided-explicit-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const result = await runGuidedCommand(["--output", outputDir]);

    assertJsonKeys(result.parsed, guidedSuccessEnvelopeKeys);
    assert.equal(result.parsed.status, "ok");
    assert.equal(result.parsed.outputDir, outputDir);
    assert.equal(result.parsed.guideHtml, join(outputDir, "guide.html"));
    assert.equal(result.parsed.resultJson, join(outputDir, "result.json"));
    assert.equal(result.parsed.reportHtml, join(outputDir, "report.html"));
    assert.equal(result.parsed.visualSvg, join(outputDir, "visual.svg"));
    assert.equal(result.parsed.summaryJson, join(outputDir, "summary.json"));
    assert.equal(result.parsed.summaryMarkdown, join(outputDir, "summary.md"));
    assert.equal(result.parsed.canonicalTruth, "result.json");
    assert.equal(result.parsed.derivedArtifacts, true);
    assert.equal(result.parsed.localOnly, true);
    await assertGuidedOutput(result.parsed);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR89 guided inspection output matches direct result and documents canonical derived boundaries", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr89-guided-boundary-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const { parsed } = await runGuidedCommand(["--output", outputDir]);
    const sourceInput = await readJson(sourceInputPath);
    const directResult = core.analyzeStructuredCompositionV1(structuredClone(sourceInput));
    const resultText = await readFile(parsed.resultJson, "utf8");
    const guideHtml = await readFile(parsed.guideHtml, "utf8");

    assert.deepEqual(JSON.parse(resultText), directResult);
    assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);
    assert.match(guideHtml, /result\.json<\/code> is the canonical Norma truth/u);
    assert.match(guideHtml, /report\.html<\/code>, <code>visual\.svg<\/code>, <code>summary\.json<\/code>, <code>summary\.md<\/code>, and <code>guide\.html<\/code> are derived inspection artifacts/u);
    assert.match(guideHtml, /examples\/structured-analyze\/usecases\/structured-layout-real-usecase\.json/u);
    assert.match(guideHtml, /<dt>Status<\/dt>\s*<dd><code>valid<\/code><\/dd>/u);
    assert.match(guideHtml, /<dt>Comparison<\/dt>\s*<dd><code>a_closer<\/code><\/dd>/u);
    assert.match(guideHtml, /<dt>Decision<\/dt>\s*<dd><code>a_closer<\/code><\/dd>/u);
    assert.match(guideHtml, /<dt>Selected evaluation ref<\/dt>\s*<dd><code>evaluation:A:basic-grid-alignment<\/code><\/dd>/u);
    assert.match(guideHtml, /metricPolicy<\/code> remains existing engine output and context only/u);
    assert.match(guideHtml, /does not infer, modify, optimize, recommend, or reinterpret from <code>metricPolicy<\/code>/u);
    assert.match(guideHtml, /No hosted MCP/u);
    assert.match(guideHtml, /No ChatGPT connector runtime/u);
    assert.match(guideHtml, /No image, CAD, Figma, or provider adapter/u);
    assert.match(guideHtml, /No recommendation, optimization, inference, correction, or beauty scoring/u);
    assert.match(guideHtml, /No package publication/u);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR89 guide is static local HTML without active hosted adapter or package language", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr89-guided-static-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const { parsed } = await runGuidedCommand(["--output", outputDir]);
    const guideHtml = await readFile(parsed.guideHtml, "utf8");

    assert.doesNotMatch(guideHtml, new RegExp(escapeRegExp(outputDir), "u"));
    assertNoForbiddenStaticHtml(guideHtml);

    for (const href of [...guideHtml.matchAll(/href="([^"]+)"/g)].map((match) => match[1])) {
      assert.doesNotMatch(href, /^(?:[a-z]+:|\/)/iu, href);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR89 guided inspection is deterministic across different output dirs", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr89-guided-determinism-"));
  const firstDir = join(tempRoot, "first");
  const secondDir = join(tempRoot, "second");

  try {
    const first = await runGuidedCommand(["--output", firstDir]);
    const second = await runGuidedCommand(["--output", secondDir]);

    assert.equal(await fileHash(first.parsed.resultJson), await fileHash(second.parsed.resultJson));
    assert.equal(await readFile(first.parsed.resultJson, "utf8"), await readFile(second.parsed.resultJson, "utf8"));
    assert.equal(await fileHash(first.parsed.guideHtml), await fileHash(second.parsed.guideHtml));
    assert.equal(await readFile(first.parsed.guideHtml, "utf8"), await readFile(second.parsed.guideHtml, "utf8"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR89 preserves existing real-usecase local demo command output contract", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr89-existing-demo-"));
  const outputDir = join(tempRoot, "real-usecase");

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [realUsecaseCommandPath, "--output", outputDir],
      { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout);

    assert.equal(stderr, "");
    assertJsonKeys(parsed, realUsecaseSuccessEnvelopeKeys);
    assert.equal(parsed.status, "ok");
    assert.equal(parsed.input, sourceInputPath);
    assert.equal(parsed.outputDir, outputDir);
    assert.equal(parsed.resultJson, join(outputDir, "result.json"));
    assert.equal(parsed.canonicalTruth, "result.json");
    assert.equal(parsed.derivedArtifacts, true);
    assert.equal("guideHtml" in parsed, false);
    assert.equal("localOnly" in parsed, false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR89 exact changed-file guard accepts only the guided inspection demo set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localGuidedInspectionDemoChangedFiles),
    localGuidedInspectionDemoChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles),
    localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  );

  assert.deepEqual(localGuidedInspectionDemoChangedFiles, [
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/examples/local-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);
  assert.deepEqual(localGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles, [
    "bin/norma-core-guided-inspection-demo.mjs",
    "docs/examples/local-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);

  const missingRequiredFile = localGuidedInspectionDemoChangedFiles.filter(
    (file) => file !== "tests/local-guided-inspection-demo.test.mjs",
  );
  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "bin/norma-core-real-usecase-demo.mjs",
    "bin/norma-core-mcp-http.mjs",
    ".github/workflows/ci.yml",
    ".env.example",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localGuidedInspectionDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

async function runGuidedCommand(args = []) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [guidedCommandPath, ...args],
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

async function assertGuidedOutput(payload) {
  assertJsonKeys(payload, guidedSuccessEnvelopeKeys);
  assert.deepEqual((await readdir(payload.outputDir)).sort(), outputFiles);
  for (const fileName of outputFiles) {
    assert.equal((await stat(join(payload.outputDir, fileName))).isFile(), true);
  }
}

function assertNoForbiddenStaticHtml(guideHtml) {
  const forbiddenPatterns = [
    [/fetch/u, "fetch"],
    [/XMLHttpRequest/u, "XMLHttpRequest"],
    [/\bstorage\b/iu, "storage"],
    [/http:\/\//iu, "http://"],
    [/https:\/\//iu, "https://"],
    [/<script/iu, "<script"],
    [/\b(?:openai|anthropic|mistral|gemini)\b/iu, "provider calls"],
    [/\bhosted\s+MCP\s+(?:is|now|has|was|enabled|implemented|supported|available)/iu, "active hosted MCP language"],
    [/\badapter\s+(?:is|now|has|was|enabled|implemented|supported|available)/iu, "active adapter language"],
    [/\bpackage\s+publication\s+(?:is|now|has|was|enabled|implemented|supported|available)/iu, "active package language"],
    [/\brecommendation\s+(?:is|now|has|was|enabled|implemented|supported|available)/iu, "active recommendation language"],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert.doesNotMatch(guideHtml, pattern, label);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function fileHash(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function removeDirs(outputDirs) {
  await Promise.all(outputDirs.map((outputDir) => rm(outputDir, { recursive: true, force: true })));
}

function assertJsonKeys(value, expectedKeys) {
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
