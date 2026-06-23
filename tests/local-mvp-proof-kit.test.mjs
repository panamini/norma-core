import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

import {
  createCanonicalMvpDemoInputV1,
  runMvpDemoV1,
} from "../dist/src/index.js";
import {
  createMvpProofSummary,
  renderMvpProofReportHtml,
  stableJsonFile,
} from "../dist/src/local-mvp-proof.js";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const cliPath = path.join(repoRoot, "bin/norma-core-mvp-demo.mjs");
const forbiddenTerms = [
  "beauty score",
  "recommendation",
  "better",
  "best",
  "winner",
  "preferred",
  "beautiful",
];

test("Post-MVP PR3 canonical command writes the local proof kit", async () => {
  const outDir = await tempDir("norma-proof-canonical-");
  const run = await runDemo(["--out", outDir]);

  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /Input: canonical MVP demo selection\./);
  assert.match(run.stdout, /NORMA_MVP_PROOF_PASS run:run:v1:[a-f0-9]+ measurements:6\/6 report:report\.html/);
  assert.equal(run.stdout.includes(outDir), false);
  assert.equal(run.stderr.includes(outDir), false);

  const files = await readProofFiles(outDir);
  assert.equal(files.result.status, "ok");
  assert.ok(files.result.construction);
  assert.equal(files.result.measurementResultA.measurements.length, 6);
  assert.equal(files.result.measurementResultB.measurements.length, 6);
  assert.ok(files.result.evaluationA);
  assert.ok(files.result.evaluationB);
  assert.ok(files.result.comparison);
  assert.ok(files.result.decision);
  assert.ok(files.result.structuredExplanation);
  assert.ok(files.result.artifacts);
  assert.ok(files.result.run);
  assert.ok(files.result.replayReadinessReport);

  assert.equal(files.summary.measurementCounts.a, 6);
  assert.equal(files.summary.measurementCounts.b, 6);
  assert.equal(files.summary.generatedFiles.result, "result.json");
  assert.match(files.visual, /^<svg /);
  assert.match(files.report, /JSON result is authoritative/);
  assert.match(files.report, /Measurements/);
  assert.match(files.report, /Evaluations/);
  assert.match(files.report, new RegExp(files.result.run.runRef.id));
  assert.match(files.report, /replay_ready/);
});

test("Post-MVP PR3 HTML escapes dynamic values and avoids forbidden claims", () => {
  const input = createCanonicalMvpDemoInputV1();
  input.demoName = "<script>alert('x')</script>";
  const result = structuredClone(input);
  const proof = createCanonicalMvpDemoInputV1();
  assert.equal(proof.demoName.includes("<script>"), false);

  const canonical = createCanonicalResultFixture();
  canonical.demoName = result.demoName;
  const html = renderMvpProofReportHtml(canonical, createMvpProofSummary(canonical));

  assert.equal(html.includes("<script>alert"), false);
  assert.match(html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assertForbiddenTermsAbsent(html);
});

test("Post-MVP PR3 custom valid input succeeds without mutating the input file", async () => {
  const workDir = await tempDir("norma-proof-custom-");
  const outDir = path.join(workDir, "out");
  const inputPath = path.join(workDir, "input.json");
  const input = createCanonicalMvpDemoInputV1();
  input.compositions.a.id = "composition:custom-a";
  const before = stableJsonFile(input);
  await writeFile(inputPath, before, "utf8");

  const run = await runDemo(["--input", inputPath, "--out", outDir]);

  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /NORMA_MVP_PROOF_PASS/);
  assert.equal(run.stdout.includes(inputPath), false);
  assert.equal(run.stdout.includes(outDir), false);
  assert.equal(run.stderr.includes(inputPath), false);
  assert.equal(run.stderr.includes(outDir), false);
  assert.equal(await readFile(inputPath, "utf8"), before);

  const files = await readProofFiles(outDir);
  assert.equal(files.result.compositions.a.id, "composition:custom-a");
  assert.equal(files.result.evaluationA.compositionRef, "composition:custom-a");
});

test("Post-MVP PR3 invalid and malformed inputs fail safely", async () => {
  const invalidDir = await tempDir("norma-proof-invalid-");
  const invalidInputPath = path.join(invalidDir, "invalid.json");
  const invalidOut = path.join(invalidDir, "out");
  await writeFile(invalidInputPath, stableJsonFile({ kind: "mvp-demo-input", schemaVersion: "mvp-demo-v1" }), "utf8");
  await runDemo(["--out", invalidOut]);
  await stat(path.join(invalidOut, "result.json"));

  const invalid = await runDemo(["--input", invalidInputPath, "--out", invalidOut]);

  assert.notEqual(invalid.code, 0);
  assert.match(invalid.stderr, /NORMA_MVP_PROOF_FAIL/);
  assert.match(invalid.stderr, /InvalidMvpDemoInputV1/);
  assert.equal(invalid.stderr.includes(invalidInputPath), false);
  assert.equal(invalid.stderr.includes(invalidOut), false);
  await assert.rejects(stat(path.join(invalidOut, "result.json")));

  const malformedDir = await tempDir("norma-proof-malformed-");
  const malformedInputPath = path.join(malformedDir, "malformed.json");
  const malformedOut = path.join(malformedDir, "out");
  await writeFile(malformedInputPath, "{ nope", "utf8");

  const malformed = await runDemo(["--input", malformedInputPath, "--out", malformedOut]);

  assert.notEqual(malformed.code, 0);
  assert.match(malformed.stderr, /NORMA_MVP_PROOF_FAIL MalformedJson/);
  assert.equal(malformed.stderr.includes("SyntaxError"), false);
  assert.equal(malformed.stderr.includes(malformedInputPath), false);
  assert.equal(malformed.stderr.includes(malformedOut), false);
  await assert.rejects(stat(path.join(malformedOut, "result.json")));
});

test("Post-MVP PR3 output files are deterministic byte-for-byte", async () => {
  const first = await tempDir("norma-proof-first-");
  const second = await tempDir("norma-proof-second-");

  assert.equal((await runDemo(["--out", first])).code, 0);
  assert.equal((await runDemo(["--out", second])).code, 0);

  for (const fileName of ["result.json", "summary.json", "visual.svg", "report.html"]) {
    const firstBytes = await readFile(path.join(first, fileName), "utf8");
    const secondBytes = await readFile(path.join(second, fileName), "utf8");
    assert.equal(firstBytes, secondBytes, fileName);
    assert.equal(firstBytes.includes(first), false, fileName);
    assert.equal(firstBytes.includes(second), false, fileName);
    assertForbiddenTermsAbsent(firstBytes);
  }
});

test("Post-MVP PR3 rejects unsupported flags and output files", async () => {
  const help = await runDemo(["--", "--help"]);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /pnpm demo:mvp -- --input/);

  const unsupported = await runDemo(["--bogus"]);
  assert.notEqual(unsupported.code, 0);
  assert.match(unsupported.stderr, /Unsupported flag or argument/);

  const workDir = await tempDir("norma-proof-output-file-");
  const outputFile = path.join(workDir, "not-a-directory");
  await writeFile(outputFile, "x", "utf8");

  const invalidOut = await runDemo(["--out", outputFile]);
  assert.notEqual(invalidOut.code, 0);
  assert.match(invalidOut.stderr, /InvalidOutputPath/);
  assert.equal(invalidOut.stderr.includes(outputFile), false);
});

function createCanonicalResultFixture() {
  const result = runMvpDemoV1(createCanonicalMvpDemoInputV1());
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return structuredClone(result.output);
}

async function readProofFiles(outDir) {
  return {
    result: JSON.parse(await readFile(path.join(outDir, "result.json"), "utf8")),
    summary: JSON.parse(await readFile(path.join(outDir, "summary.json"), "utf8")),
    visual: await readFile(path.join(outDir, "visual.svg"), "utf8"),
    report: await readFile(path.join(outDir, "report.html"), "utf8"),
  };
}

async function runDemo(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function tempDir(prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  test.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function assertForbiddenTermsAbsent(text) {
  const normalized = text.toLowerCase();
  for (const term of forbiddenTerms) {
    assert.equal(normalized.includes(term), false, term);
  }
}
