import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { createGuidedInspectionConsumerProof } from "../dist/src/local-report/guided-inspection-consumer-proof.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const guidedCommandPath = join(repoRoot, "bin/norma-core-guided-inspection-demo.mjs");
const helperSourcePath = join(repoRoot, "src", "local-report", "guided-inspection-consumer-proof.ts");
const outputDir = join(repoRoot, "tmp", "nonexistent-guided-inspection-consumer-output");
const cliTestTimeoutMs = 30_000;

test("PR94 maps a valid local guided demo envelope through the package-private artifact contract", () => {
  const proof = createGuidedInspectionConsumerProof(validEnvelope());

  assert.deepEqual(proof, {
    canonicalTruth: "result.json",
    resultJson: join(outputDir, "result.json"),
    derivedArtifacts: {
      "guide.html": join(outputDir, "guide.html"),
      "report.html": join(outputDir, "report.html"),
      "visual.svg": join(outputDir, "visual.svg"),
      "summary.json": join(outputDir, "summary.json"),
      "summary.md": join(outputDir, "summary.md"),
    },
    localOnly: true,
    outputDir,
  });
});

test("PR94 keeps result.json as canonical truth and derived artifacts as derived-only paths", () => {
  const proof = createGuidedInspectionConsumerProof(validEnvelope({
    reportHtml: undefined,
    visualSvg: undefined,
    summaryJson: undefined,
  }));

  assert.equal(proof.canonicalTruth, "result.json");
  assert.equal(proof.resultJson, join(outputDir, "result.json"));
  assert.deepEqual(proof.derivedArtifacts, {
    "guide.html": join(outputDir, "guide.html"),
    "summary.md": join(outputDir, "summary.md"),
  });
  assert.equal(Object.hasOwn(proof.derivedArtifacts, "result.json"), false);

  assert.throws(
    () => createGuidedInspectionConsumerProof(validEnvelope({ resultJson: join(outputDir, "guide.html") })),
    /Duplicate guided inspection demo artifact path|resultJson must match outputDir\/result\.json/u,
  );
});

test("PR94 enforces localOnly and derivedArtifacts flags from the command envelope", () => {
  for (const [field, value, expectedError] of [
    ["localOnly", false, /requires localOnly true/u],
    ["localOnly", undefined, /requires localOnly true/u],
    ["derivedArtifacts", false, /requires derivedArtifacts true/u],
    ["derivedArtifacts", undefined, /requires derivedArtifacts true/u],
  ]) {
    assert.throws(
      () => createGuidedInspectionConsumerProof(validEnvelope({ [field]: value })),
      expectedError,
      field,
    );
  }
});

test("PR94 rejects malformed unsafe and non-guided envelopes deterministically", () => {
  for (const [label, envelope, expectedError] of [
    ["non-object", null, /requires a demo envelope object/u],
    ["error envelope", { status: "error", error: { message: "failed" } }, /requires an ok demo envelope/u],
    ["missing resultJson", validEnvelope({ resultJson: undefined }), /requires resultJson/u],
    ["missing guideHtml", validEnvelope({ guideHtml: undefined }), /requires guideHtml/u],
    ["wrong canonical truth", validEnvelope({ canonicalTruth: "guide.html" }), /requires canonicalTruth result\.json/u],
    ["unknown field", validEnvelope({ files: ["result.json"] }), /Unknown guided inspection demo envelope field: files/u],
    ["relative outputDir", validEnvelope({ outputDir: "relative/out" }), /absolute local filesystem path/u],
    ["URL outputDir", validEnvelope({ outputDir: "https://example.test/out" }), /absolute local filesystem path/u],
    ["file URL outputDir", validEnvelope({ outputDir: "file:///tmp/out" }), /absolute local filesystem path/u],
    ["relative resultJson", validEnvelope({ resultJson: "result.json" }), /resultJson must match outputDir\/result\.json/u],
    ["URL resultJson", validEnvelope({ resultJson: "https://example.test/result.json" }), /resultJson must match outputDir\/result\.json/u],
    ["file URL resultJson", validEnvelope({ resultJson: "file:///tmp/result.json" }), /resultJson must match outputDir\/result\.json/u],
    ["mismatched derived path", validEnvelope({ summaryJson: undefined, summaryMarkdown: join(outputDir, "summary.json") }), /summaryMarkdown must match outputDir\/summary\.md/u],
    ["unknown artifact path", validEnvelope({ visualSvg: join(outputDir, "unknown.svg") }), /visualSvg must match outputDir\/visual\.svg/u],
    ["duplicate artifact path", validEnvelope({ reportHtml: join(outputDir, "guide.html") }), /Duplicate guided inspection demo artifact path/u],
  ]) {
    assert.throws(
      () => createGuidedInspectionConsumerProof(envelope),
      expectedError,
      label,
    );
  }
});

test("PR94 helper has no filesystem or artifact content parsing dependency", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const proof = createGuidedInspectionConsumerProof(validEnvelope());

  assert.equal(proof.resultJson, join(outputDir, "result.json"));
  assert.doesNotMatch(helperSource, /node:fs|node:fs\/promises|readFile|existsSync|statSync|JSON\.parse|DOMParser/u);
});

test("PR94 helper remains package-private without package root or subpath exports", async () => {
  const packageRoot = await import("../dist/src/index.js");
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const currentIndex = await readFile(join(repoRoot, "src", "index.ts"), "utf8");

  assert.equal("createGuidedInspectionConsumerProof" in packageRoot, false);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.doesNotMatch(currentIndex, /guided-inspection-consumer-proof/u);

  await assert.rejects(
    import("@norma/core/local-report/guided-inspection-consumer-proof"),
    /Package subpath .* is not defined by "exports"/u,
  );
});

test("PR94 real local caller can consume the guided demo envelope and reach canonical result.json", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr94-guided-consumer-"));
  const realOutputDir = join(tempRoot, "guided");

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [guidedCommandPath, "--output", realOutputDir],
      { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024, timeout: cliTestTimeoutMs },
    );
    const envelope = JSON.parse(stdout);
    const proof = createGuidedInspectionConsumerProof(envelope);
    const result = JSON.parse(await readFile(proof.resultJson, "utf8"));

    assert.equal(stderr, "");
    assert.equal(proof.outputDir, realOutputDir);
    assert.equal(proof.resultJson, envelope.resultJson);
    assert.equal(proof.canonicalTruth, "result.json");
    assert.equal(proof.localOnly, true);
    assert.equal(result.status, "valid");
    assert.equal(result.decision.status, "a_closer");
    assert.equal(result.decision.selectedEvaluationRef, "evaluation:A:basic-grid-alignment");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

function validEnvelope(overrides = {}) {
  return withoutUndefined({
    status: "ok",
    outputDir,
    guideHtml: join(outputDir, "guide.html"),
    resultJson: join(outputDir, "result.json"),
    reportHtml: join(outputDir, "report.html"),
    visualSvg: join(outputDir, "visual.svg"),
    summaryJson: join(outputDir, "summary.json"),
    summaryMarkdown: join(outputDir, "summary.md"),
    canonicalTruth: "result.json",
    derivedArtifacts: true,
    localOnly: true,
    ...overrides,
  });
}

function withoutUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
