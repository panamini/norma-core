import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import test from "node:test";

import * as packageRoot from "@norma/core";
import {
  consumeGuidedInspectionDemoEnvelopeV1,
  createGuidedInspectionArtifactContractV1,
} from "@norma/core";

const execFileAsync = promisify(execFile);
const testFilePath = fileURLToPath(import.meta.url);
const testDir = dirname(testFilePath);
const repoRoot = dirname(testDir);
const guidedCommandPath = join(repoRoot, "bin", "norma-core-guided-inspection-demo.mjs");
const cliTestTimeoutMs = 30_000;

test("PR97 consumer proof imports guided inspection V1 only from the package root", async () => {
  const testSource = await readFile(testFilePath, "utf8");
  const importSources = [...testSource.matchAll(/^\s*import(?:[\s\S]*?)\sfrom\s+["']([^"']+)["'];/gmu)]
    .map((match) => match[1]);

  assert.equal(importSources.includes("@norma/core"), true);
  assert.equal(typeof createGuidedInspectionArtifactContractV1, "function");
  assert.equal(typeof consumeGuidedInspectionDemoEnvelopeV1, "function");
  assert.strictEqual(createGuidedInspectionArtifactContractV1, packageRoot.createGuidedInspectionArtifactContractV1);
  assert.strictEqual(consumeGuidedInspectionDemoEnvelopeV1, packageRoot.consumeGuidedInspectionDemoEnvelopeV1);

  for (const importSource of importSources) {
    assert.doesNotMatch(importSource, /(?:^|\/)(?:dist|src)\/local-report(?:\/|$)/u);
    assert.doesNotMatch(importSource, /guided-inspection-(?:artifact-contract|consumer-proof|package-api-v1)/u);
  }
});

test("PR97 package-root consumer proof uses the real guided demo envelope without parsing result.json", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr97-guided-package-root-consumer-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [guidedCommandPath, "--output", outputDir],
      { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024, timeout: cliTestTimeoutMs },
    );
    const envelope = JSON.parse(stdout);
    const artifacts = envelopeArtifactNames(envelope);
    const contract = createGuidedInspectionArtifactContractV1({
      outputDir: envelope.outputDir,
      artifacts,
    });
    const proof = consumeGuidedInspectionDemoEnvelopeV1(envelope);

    assert.equal(stderr, "");
    assert.equal(envelope.outputDir, outputDir);
    assert.deepEqual(artifacts, [
      "result.json",
      "guide.html",
      "report.html",
      "visual.svg",
      "summary.json",
      "summary.md",
    ]);

    assert.equal(contract.canonicalTruth, "result.json");
    assert.deepEqual(contract.resultJson, {
      name: "result.json",
      path: envelope.resultJson,
      role: "canonical-truth",
      required: true,
    });
    assert.equal(contract.localOnly, true);

    assert.equal(proof.canonicalTruth, "result.json");
    assert.deepEqual(proof.resultJson, contract.resultJson);
    assert.equal(proof.outputDir, outputDir);
    assert.equal(proof.localOnly, true);

    assertDerivedArtifact(proof, "guide.html", envelope.guideHtml, true);
    assertDerivedArtifact(proof, "report.html", envelope.reportHtml, false);
    assertDerivedArtifact(proof, "visual.svg", envelope.visualSvg, false);
    assertDerivedArtifact(proof, "summary.json", envelope.summaryJson, false);
    assertDerivedArtifact(proof, "summary.md", envelope.summaryMarkdown, false);
    assert.equal(proof.derivedArtifacts.some((artifact) => artifact.name === "result.json"), false);

    assert.equal("createGuidedInspectionArtifactContract" in packageRoot, false);
    assert.equal("createGuidedInspectionConsumerProof" in packageRoot, false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR97 package-root consumer proof keeps optional outputs derived-only", () => {
  const outputDir = join(tmpdir(), "norma-pr97-guided-optional-envelope");
  const envelope = {
    status: "ok",
    outputDir,
    resultJson: join(outputDir, "result.json"),
    guideHtml: join(outputDir, "guide.html"),
    summaryMarkdown: join(outputDir, "summary.md"),
    canonicalTruth: "result.json",
    derivedArtifacts: true,
    localOnly: true,
  };
  const proof = consumeGuidedInspectionDemoEnvelopeV1(envelope);

  assert.deepEqual(proof.derivedArtifacts, [
    {
      name: "guide.html",
      path: join(outputDir, "guide.html"),
      role: "derived-inspection-artifact",
      required: true,
    },
    {
      name: "summary.md",
      path: join(outputDir, "summary.md"),
      role: "derived-inspection-artifact",
      required: false,
    },
  ]);
});

function envelopeArtifactNames(envelope) {
  return [
    ["resultJson", "result.json"],
    ["guideHtml", "guide.html"],
    ["reportHtml", "report.html"],
    ["visualSvg", "visual.svg"],
    ["summaryJson", "summary.json"],
    ["summaryMarkdown", "summary.md"],
  ].flatMap(([field, artifact]) => envelope[field] === undefined ? [] : [artifact]);
}

function assertDerivedArtifact(proof, name, expectedPath, required) {
  assert.deepEqual(
    proof.derivedArtifacts.find((artifact) => artifact.name === name),
    {
      name,
      path: expectedPath,
      role: "derived-inspection-artifact",
      required,
    },
  );
}
