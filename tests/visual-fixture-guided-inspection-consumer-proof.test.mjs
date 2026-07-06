import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { createVisualFixtureGuidedInspectionConsumerProof } from "../dist/src/local-report/visual-fixture-guided-inspection-consumer-proof.js";

const execFileAsync = promisify(execFile);
const testFilePath = fileURLToPath(import.meta.url);
const testDir = dirname(testFilePath);
const repoRoot = dirname(testDir);
const commandPath = join(repoRoot, "bin", "norma-core-visual-fixture-guided-inspection-demo.mjs");
const helperSourcePath = join(repoRoot, "src", "local-report", "visual-fixture-guided-inspection-consumer-proof.ts");
const outputDir = join(repoRoot, "tmp", "nonexistent-visual-fixture-guided-inspection-consumer-proof");
const successEnvelopeKeys = [
  "candidateEvidenceOnly",
  "canonicalTruth",
  "fixtureOnly",
  "guideHtml",
  "layers",
  "localOnly",
  "nonApiMetadataOnly",
  "nonSchemaMetadataOnly",
  "outputDir",
  "resultJson",
  "sourceTruth",
  "status",
  "summaryJson",
  "summaryMarkdown",
  "visualSvg",
];

test("PR106 maps the live PR104 visual fixture demo envelope into a package-private consumer proof", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr106-visual-fixture-consumer-"));
  const realOutputDir = join(tempRoot, "guided");

  try {
    const envelope = await runDemo(realOutputDir);
    const proof = createVisualFixtureGuidedInspectionConsumerProof(envelope);

    assert.deepEqual(Object.keys(envelope).sort(), successEnvelopeKeys);
    assert.deepEqual(proof, {
      canonicalTruth: "result.json",
      sourceTruth: "acceptedStructuredGeometry",
      resultJson: join(realOutputDir, "result.json"),
      derivedArtifacts: [
        derived("guide.html", join(realOutputDir, "guide.html")),
        derived("visual.svg", join(realOutputDir, "visual.svg")),
        derived("summary.json", join(realOutputDir, "summary.json")),
        derived("summary.md", join(realOutputDir, "summary.md")),
      ],
      candidateEvidenceOnly: true,
      localOnly: true,
      fixtureOnly: true,
      nonSchemaMetadataOnly: true,
      nonApiMetadataOnly: true,
      outputDir: realOutputDir,
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR106 keeps result.json canonical and excludes it from derived artifacts", () => {
  const proof = createVisualFixtureGuidedInspectionConsumerProof(validEnvelope());

  assert.equal(proof.canonicalTruth, "result.json");
  assert.equal(proof.resultJson, join(outputDir, "result.json"));
  assert.equal(proof.derivedArtifacts.some((artifact) => artifact.name === "result.json"), false);
  assert.deepEqual(proof.derivedArtifacts.map((artifact) => artifact.name), [
    "guide.html",
    "visual.svg",
    "summary.json",
    "summary.md",
  ]);
});

test("PR106 accepts Windows drive-letter generated artifact paths without treating them as URLs", () => {
  const windowsOutputDir = "C:\\out\\visual-fixture-guided-inspection";
  const proof = createVisualFixtureGuidedInspectionConsumerProof(validEnvelope({
    outputDir: windowsOutputDir,
    resultJson: `${windowsOutputDir}\\result.json`,
    guideHtml: `${windowsOutputDir}\\guide.html`,
    visualSvg: `${windowsOutputDir}\\visual.svg`,
    summaryJson: `${windowsOutputDir}\\summary.json`,
    summaryMarkdown: `${windowsOutputDir}\\summary.md`,
  }));

  assert.equal(proof.outputDir, windowsOutputDir);
  assert.equal(proof.resultJson, `${windowsOutputDir}\\result.json`);
  assert.deepEqual(proof.derivedArtifacts.map((artifact) => artifact.path), [
    `${windowsOutputDir}\\guide.html`,
    `${windowsOutputDir}\\visual.svg`,
    `${windowsOutputDir}\\summary.json`,
    `${windowsOutputDir}\\summary.md`,
  ]);

  const forwardSlashOutputDir = "C:/out/visual-fixture-guided-inspection";
  const forwardSlashProof = createVisualFixtureGuidedInspectionConsumerProof(validEnvelope({
    outputDir: forwardSlashOutputDir,
    resultJson: `${forwardSlashOutputDir}/result.json`,
    guideHtml: `${forwardSlashOutputDir}/guide.html`,
    visualSvg: `${forwardSlashOutputDir}/visual.svg`,
    summaryJson: `${forwardSlashOutputDir}/summary.json`,
    summaryMarkdown: `${forwardSlashOutputDir}/summary.md`,
  }));

  assert.equal(forwardSlashProof.outputDir, forwardSlashOutputDir);
  assert.equal(forwardSlashProof.resultJson, `${forwardSlashOutputDir}/result.json`);

  assert.throws(
    () => createVisualFixtureGuidedInspectionConsumerProof(validEnvelope({
      outputDir: windowsOutputDir,
      resultJson: `${windowsOutputDir}\\result.json\\`,
      guideHtml: `${windowsOutputDir}\\guide.html`,
      visualSvg: `${windowsOutputDir}\\visual.svg`,
      summaryJson: `${windowsOutputDir}\\summary.json`,
      summaryMarkdown: `${windowsOutputDir}\\summary.md`,
    })),
    /field "resultJson": must match outputDir\/result\.json/u,
  );
});

test("PR106 derived artifacts are refs only and never source truth or schema authority", () => {
  const proof = createVisualFixtureGuidedInspectionConsumerProof(validEnvelope());

  for (const artifact of proof.derivedArtifacts) {
    assert.equal(artifact.role, "derived-inspection-evidence");
    assert.equal(artifact.sourceTruth, false);
    assert.equal(artifact.coreInputAuthority, false);
    assert.equal(artifact.packageApiTruth, false);
    assert.equal(artifact.futureConnectorSchema, false);
    assert.deepEqual(Object.keys(artifact).sort(), [
      "coreInputAuthority",
      "futureConnectorSchema",
      "name",
      "packageApiTruth",
      "path",
      "role",
      "sourceTruth",
    ]);
  }
});

test("PR106 rejects malformed unsafe and non-visual envelopes deterministically", () => {
  const cases = [
    ["non-object", null, /field "envelope": requires object/u],
    ["non-plain object", Object.create(validEnvelope()), /field "envelope": requires plain object/u],
    ["non-ok", validEnvelope({ status: "error" }), /field "status": requires ok/u],
    ["unknown field", validEnvelope({ extra: true }), /field "extra": unknown field/u],
    ["missing field", validEnvelope({ resultJson: undefined }), /field "resultJson": requires own field/u],
    ["bad layers", validEnvelope({ layers: "Layer 1" }), /field "layers": requires string array/u],
    ["relative outputDir", validEnvelope({ outputDir: "relative/out" }), /field "outputDir": requires absolute local filesystem path/u],
    ["URL outputDir", validEnvelope({ outputDir: "https://example.test/out" }), /field "outputDir": requires absolute local filesystem path/u],
    ["file URL outputDir", validEnvelope({ outputDir: "file:///tmp/out" }), /field "outputDir": requires absolute local filesystem path/u],
    ["relative resultJson", validEnvelope({ resultJson: "result.json" }), /field "resultJson": requires absolute local filesystem path/u],
    ["URL resultJson", validEnvelope({ resultJson: "https://example.test/result.json" }), /field "resultJson": requires absolute local filesystem path/u],
    ["file URL resultJson", validEnvelope({ resultJson: "file:///tmp/result.json" }), /field "resultJson": requires absolute local filesystem path/u],
    ["mismatched result dirname", validEnvelope({ resultJson: join(outputDir, "nested", "result.json") }), /field "resultJson": must match outputDir\/result\.json/u],
    ["mismatched guide basename", validEnvelope({ guideHtml: join(outputDir, "nested", "guide.html") }), /field "guideHtml": must match outputDir\/guide\.html/u],
    ["mismatched visual basename", validEnvelope({ visualSvg: join(outputDir, "nested", "visual.svg") }), /field "visualSvg": must match outputDir\/visual\.svg/u],
    ["mismatched summary json", validEnvelope({ summaryJson: join(outputDir, "nested", "summary.json") }), /field "summaryJson": must match outputDir\/summary\.json/u],
    ["mismatched summary markdown", validEnvelope({ summaryMarkdown: join(outputDir, "nested", "summary.md") }), /field "summaryMarkdown": must match outputDir\/summary\.md/u],
    ["duplicate path", validEnvelope({ guideHtml: join(outputDir, "result.json") }), /field "artifactPath": duplicate path/u],
  ];

  for (const [label, envelope, expectedMessage] of cases) {
    assert.throws(
      () => createVisualFixtureGuidedInspectionConsumerProof(envelope),
      (error) => {
        assert.equal(error.name, "VisualFixtureGuidedInspectionConsumerProofError");
        assert.match(error.message, expectedMessage);
        assert.doesNotMatch(error.stack ?? "", /"status":"ok"|candidate:rectangle|normalizedVisualObservation/u);
        return true;
      },
      label,
    );
  }
});

test("PR106 rejects wrong truth boundary and metadata-only flags", () => {
  for (const [field, value, expected] of [
    ["sourceTruth", "visualObservation", /field "sourceTruth": requires acceptedStructuredGeometry/u],
    ["candidateEvidenceOnly", false, /field "candidateEvidenceOnly": requires true/u],
    ["fixtureOnly", false, /field "fixtureOnly": requires true/u],
    ["localOnly", false, /field "localOnly": requires true/u],
    ["nonSchemaMetadataOnly", false, /field "nonSchemaMetadataOnly": requires true/u],
    ["nonApiMetadataOnly", false, /field "nonApiMetadataOnly": requires true/u],
  ]) {
    assert.throws(
      () => createVisualFixtureGuidedInspectionConsumerProof(validEnvelope({ [field]: value })),
      expected,
      field,
    );
  }
});

test("PR106 rejects duplicate artifact paths after path validation", () => {
  assert.throws(
    () => createVisualFixtureGuidedInspectionConsumerProof(validEnvelope({ summaryMarkdown: join(outputDir, "summary.json") })),
    /field "artifactPath": duplicate path/u,
  );
});

test("PR106 helper has no filesystem artifact-content parsing dependency and does not mutate input", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const envelope = validEnvelope();
  const snapshot = structuredClone(envelope);
  const proof = createVisualFixtureGuidedInspectionConsumerProof(envelope);

  assert.deepEqual(envelope, snapshot);
  assert.equal(proof.resultJson, join(outputDir, "result.json"));
  assert.doesNotMatch(helperSource, /node:fs|node:fs\/promises|readFile|existsSync|statSync|JSON\.parse|DOMParser|fetch|execFile|spawn/u);
});

test("PR106 helper remains package-private without package root or subpath exports", async () => {
  const packageRoot = await import("../dist/src/index.js");
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const currentIndex = await readFile(join(repoRoot, "src", "index.ts"), "utf8");

  assert.equal("createVisualFixtureGuidedInspectionConsumerProof" in packageRoot, false);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.doesNotMatch(currentIndex, /visual-fixture-guided-inspection-consumer-proof/u);

  const blockedSubpath = [
    "@norma/core",
    "local-report",
    "visual-fixture-guided-inspection-consumer-proof",
  ].join("/");

  await assert.rejects(
    import(blockedSubpath),
    /Package subpath .* is not defined by "exports"/u,
  );
});

test("PR106 real local caller can read result.json outside the helper and preserve source-truth boundary", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr106-visual-fixture-real-caller-"));
  const realOutputDir = join(tempRoot, "guided");

  try {
    const envelope = await runDemo(realOutputDir);
    const proof = createVisualFixtureGuidedInspectionConsumerProof(envelope);
    const result = JSON.parse(await readFile(proof.resultJson, "utf8"));
    const resultText = await readFile(proof.resultJson, "utf8");

    assert.equal(result.status, "valid");
    assert.equal(result.provenance.sourceKind, "user_supplied_structured_data");
    assert.equal(result.provenance.adapter, null);
    assert.equal(result.decision.status, "ambiguous");
    assert.equal(proof.sourceTruth, "acceptedStructuredGeometry");
    assert.equal(proof.candidateEvidenceOnly, true);
    assert.doesNotMatch(resultText, /candidate:rectangle|normalizedVisualObservation|lossyConversionWarnings/u);
    assert.equal(proof.derivedArtifacts.every((artifact) => artifact.path !== proof.resultJson), true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR106 source and changed files do not add forbidden runtime or publication surfaces", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const testSource = await readFile(testFilePath, "utf8");
  const forbiddenSourceTerms = /createServer|createMcp|OpenAI|provider|adapter runtime|publishConfig|package-root export|recommend|optimize|score|beauty|correct|CAD|Figma/u;

  assert.doesNotMatch(helperSource, forbiddenSourceTerms);
  assert.doesNotMatch(testSource, /from "\.\.\/dist\/src\/index\.js"|from "@norma\/core"/u);
});

function validEnvelope(overrides = {}) {
  return withoutUndefined({
    status: "ok",
    outputDir,
    resultJson: join(outputDir, "result.json"),
    guideHtml: join(outputDir, "guide.html"),
    visualSvg: join(outputDir, "visual.svg"),
    summaryJson: join(outputDir, "summary.json"),
    summaryMarkdown: join(outputDir, "summary.md"),
    canonicalTruth: "result.json",
    sourceTruth: "acceptedStructuredGeometry",
    candidateEvidenceOnly: true,
    localOnly: true,
    fixtureOnly: true,
    nonSchemaMetadataOnly: true,
    nonApiMetadataOnly: true,
    layers: [
      "Layer 1: visual evidence, non-truth candidate observation",
      "Layer 2: test/demo-only deterministic fixture handoff",
      "Layer 3: explicit accepted structured geometry, the only Core input",
      "Layer 4: existing Norma Core / Structured Analyze path",
      "Layer 5: derived local outputs",
    ],
    ...overrides,
  });
}

function derived(name, path) {
  return {
    name,
    path,
    role: "derived-inspection-evidence",
    sourceTruth: false,
    coreInputAuthority: false,
    packageApiTruth: false,
    futureConnectorSchema: false,
  };
}

async function runDemo(realOutputDir) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [commandPath, "--output", realOutputDir],
    { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
  );

  assert.equal(stderr, "");
  return JSON.parse(stdout);
}

function withoutUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
