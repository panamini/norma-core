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
import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { createSyntheticExternalEvidenceAcceptanceProofV1 } from "../dist/src/local-report/synthetic-external-evidence-acceptance-proof.js";
import {
  createStructuredAnalyzeInputFromAcceptedStructuredGeometry,
  runSyntheticEvidenceAcceptanceDemoCli,
} from "../bin/norma-core-synthetic-evidence-acceptance-demo.mjs";
import {
  sharedExactApprovedChangedFiles,
  syntheticEvidenceAcceptanceDemoChangedFiles,
} from "./changed-file-guard.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const commandPath = join(repoRoot, "bin/norma-core-synthetic-evidence-acceptance-demo.mjs");
const docPath = join(repoRoot, "docs/examples/local-synthetic-evidence-acceptance-demo.md");
const fixturePath = join(repoRoot, "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json");
const packageJsonPath = join(repoRoot, "package.json");
const srcIndexPath = join(repoRoot, "src/index.ts");
const outputFiles = ["proof.json", "result.json", "summary.json"];
const successEnvelopeKeys = [
  "acceptedGeometryIsOnlyCoreInput",
  "artifacts",
  "canonicalComputationalOutput",
  "confidenceAuthority",
  "coreInputAuthority",
  "derivedArtifacts",
  "externalEvidenceAuthority",
  "fixtureOnly",
  "localOnly",
  "observationEnvelopeTrust",
  "outputDir",
  "proofJson",
  "providerSelfAcceptance",
  "publicApi",
  "resultJson",
  "status",
  "summaryJson",
];

test("PR112 docs identify the local-only proof command and build prerequisite", async () => {
  const doc = await readFile(docPath, "utf8");

  assert.match(doc, /local developer proof command/u);
  assert.match(doc, /not a public CLI, product API, package API, provider runtime, or report system/u);
  assert.ok(
    doc.indexOf("npm run build") < doc.indexOf("node bin/norma-core-synthetic-evidence-acceptance-demo.mjs --output"),
    "build prerequisite should appear before the exact demo command",
  );
  assert.match(doc, /result\.json` is the canonical Structured Analyze computational output/u);
  assert.match(doc, /proof\.json` is the derived PR111 boundary proof object/u);
  assert.match(doc, /summary\.json` is a derived local demo summary/u);
  assert.match(doc, /not OpenAI integration, image recognition, provider support, CAD import, Figma import, hosted MCP, ChatGPT connector runtime, package publishing, or public API/u);
});

test("PR112 command runs with explicit --output and writes exactly the JSON artifacts", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-explicit-"));
  const outputDir = join(tempRoot, "demo");

  try {
    const { parsed } = await runCommand(["--output", outputDir]);

    assertJsonKeys(parsed, successEnvelopeKeys);
    assert.equal(parsed.outputDir, outputDir);
    assert.equal(parsed.resultJson, join(outputDir, "result.json"));
    assert.equal(parsed.proofJson, join(outputDir, "proof.json"));
    assert.equal(parsed.summaryJson, join(outputDir, "summary.json"));
    assert.equal(parsed.canonicalComputationalOutput, "result.json");
    assert.deepEqual(parsed.derivedArtifacts, ["proof.json", "summary.json"]);
    await assertOutput(parsed);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 command runs with no args and uses a temp output directory", async () => {
  const { parsed } = await runCommand();

  try {
    assert.equal(parsed.status, "ok");
    assert.match(parsed.outputDir, /norma-core-synthetic-evidence-acceptance-demo-/u);
    await assertOutput(parsed);
  } finally {
    await rm(parsed.outputDir, { recursive: true, force: true });
  }
});

test("PR112 result.json is valid Structured Analyze output from accepted structured geometry only", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-result-"));
  const outputDir = join(tempRoot, "demo");

  try {
    const envelope = await readJson(fixturePath);
    const { parsed } = await runCommand(["--output", outputDir]);
    const directInput = createStructuredAnalyzeInputFromAcceptedStructuredGeometry(
      envelope.acceptedStructuredGeometry,
      { envelopeId: envelope.envelopeId },
    );
    const directResult = core.analyzeStructuredCompositionV1(directInput);
    const resultText = await readFile(parsed.resultJson, "utf8");
    const result = JSON.parse(resultText);

    assert.deepEqual(result, directResult);
    assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);
    assert.equal(result.status, "valid");
    assert.equal(result.provenance.sourceKind, "user_supplied_structured_data");
    assert.equal(result.provenance.adapter, null);
    assert.deepEqual(
      result.provenance.callerSourceIds,
      directInput.acceptance.acceptedSourceIds,
    );
    assert.equal(validateAcceptedGeometryV1(envelope.observationEnvelope).ok, false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 proof.json matches the PR111 helper output shape", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-proof-"));
  const outputDir = join(tempRoot, "demo");

  try {
    const envelope = await readJson(fixturePath);
    const { parsed } = await runCommand(["--output", outputDir]);
    const proofText = await readFile(parsed.proofJson, "utf8");
    const proof = JSON.parse(proofText);
    const directProof = createSyntheticExternalEvidenceAcceptanceProofV1(envelope);

    assert.deepEqual(proof, directProof);
    assert.equal(proofText, `${core.serializeCanonicalJson(directProof)}\n`);
    assert.equal(proof.boundarySourceTruth, "acceptedStructuredGeometry");
    assert.equal(proof.coreInputAuthority, "acceptedStructuredGeometry");
    assert.equal(proof.acceptedGeometryIsOnlyCoreInput, true);
    assert.equal(proof.providerEvidenceOnly, true);
    assert.equal(proof.observationEnvelopeCoreInput, false);
    assert.equal(proof.confidenceAuthority, false);
    assert.equal(proof.providerSelfAcceptance, false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 summary.json is derived and cannot claim source truth", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-summary-"));
  const outputDir = join(tempRoot, "demo");

  try {
    const { parsed } = await runCommand(["--output", outputDir]);
    const summary = await readJson(parsed.summaryJson);

    assert.equal(summary.canonicalComputationalOutput, "result.json");
    assert.equal(summary.resultJsonCanonical, true);
    assert.equal(summary.proofJsonDerivedNonAuthoritative, true);
    assert.equal(summary.summaryJsonDerivedNonAuthoritative, true);
    assert.equal(summary.externalEvidenceAuthority, "candidateEvidenceOnly");
    assert.equal(summary.observationEnvelopeTrust, "untrusted");
    assert.equal(summary.observationEnvelopeCoreInput, false);
    assert.equal(summary.confidenceScoreValueMetadataCanAuthorizeAcceptance, false);
    assert.equal(summary.providerEvidenceCanSelfAccept, false);
    assert.equal(summary.acceptedStructuredGeometryOnlyCoreInput, true);
    assert.equal("sourceTruth" in summary, false);
    assert.equal("providerTruth" in summary, false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 candidate evidence metadata never appears as Core input authority", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-authority-"));
  const outputDir = join(tempRoot, "demo");

  try {
    const envelope = await readJson(fixturePath);
    const { parsed } = await runCommand(["--output", outputDir]);
    const resultText = await readFile(parsed.resultJson, "utf8");
    const summaryText = await readFile(parsed.summaryJson, "utf8");

    for (const forbidden of [
      "candidate-label:west-portion",
      "candidate-measurement:west-width",
      "candidate-geometry:west",
      "synthetic-high",
      "Synthetic prompt text",
      "candidate confidence is diagnostic only",
      "artifact:synthetic-external-evidence:summary:v1",
    ]) {
      assert.doesNotMatch(resultText, new RegExp(escapeRegExp(forbidden), "u"), forbidden);
    }

    assert.match(resultText, new RegExp(escapeRegExp(envelope.acceptedStructuredGeometry.contentIdentity), "u"));
    assert.match(resultText, new RegExp(escapeRegExp(envelope.evidenceIdentity.observationContentIdentity), "u"));
    assert.match(summaryText, /candidateEvidenceOnly/u);
    assert.match(summaryText, /untrusted/u);
    assert.match(summaryText, /acceptedStructuredGeometryOnlyCoreInput/u);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 demo does not create HTML or Markdown report artifacts", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-no-report-"));
  const outputDir = join(tempRoot, "demo");

  try {
    const { parsed } = await runCommand(["--output", outputDir]);
    const files = await readdir(parsed.outputDir);

    assert.deepEqual(files.sort(), outputFiles);
    assert.equal(files.includes("guide.html"), false);
    assert.equal(files.includes("summary.md"), false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 does not mutate the synthetic fixture", async () => {
  const before = await fileHash(fixturePath);
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-fixture-"));
  const outputDir = join(tempRoot, "demo");

  try {
    await runCommand(["--output", outputDir]);
    assert.equal(await fileHash(fixturePath), before);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 cannot run Structured Analyze when the PR111 helper boundary fails", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr112-invalid-"));
  const outputDir = join(tempRoot, "demo");
  const io = createWritableCaptures();
  const fixture = await readJson(fixturePath);
  fixture.acceptanceBoundary.providerEvidenceSelfAccepted = true;

  try {
    const exitCode = await runSyntheticEvidenceAcceptanceDemoCli({
      args: ["--output", outputDir],
      stdout: io.stdout,
      stderr: io.stderr,
      options: { fixture },
    });
    const parsed = JSON.parse(io.stderrText());

    assert.equal(exitCode, 3);
    assert.equal(io.stdoutText(), "");
    assert.equal(parsed.status, "error");
    assert.match(parsed.error.message, /providerEvidenceSelfAccepted/u);
    await assert.rejects(() => readdir(outputDir));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR112 demo source stays local and avoids package-root, provider, network, image, CAD, Figma, MCP, ChatGPT, and dependency imports", async () => {
  const source = await readFile(commandPath, "utf8");
  const importStatements = source
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n");
  const packageJsonBefore = await readFile(packageJsonPath, "utf8");
  const indexBefore = await readFile(srcIndexPath, "utf8");

  assert.doesNotMatch(source, /from "\.\.\/dist\/src\/index\.js"/u);
  assert.doesNotMatch(importStatements, /from "\.\.\/dist\/index\.js"|from "norma-core"|from "\.\.\/dist\/src\/runtime\.js"/u);
  assert.doesNotMatch(importStatements, /providers|openai|vision|image|adapters|cad|figma|mcp|chatgpt|api\/|server|package\.json|node_modules|sdk/iu);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|OAuth|secret|apiKey)\b/iu);
  assert.match(source, /from "\.\.\/dist\/src\/local-report\/synthetic-external-evidence-acceptance-proof\.js"/u);
  assert.match(source, /createSyntheticExternalEvidenceAcceptanceProofV1\(envelope\)[\s\S]+createStructuredAnalyzeInputFromAcceptedStructuredGeometry/u);
  assert.equal(await readFile(packageJsonPath, "utf8"), packageJsonBefore);
  assert.equal(await readFile(srcIndexPath, "utf8"), indexBefore);
});

test("PR112 exact changed-file guard accepts only the approved synthetic evidence demo set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(syntheticEvidenceAcceptanceDemoChangedFiles),
    syntheticEvidenceAcceptanceDemoChangedFiles,
  );
  assert.deepEqual(syntheticEvidenceAcceptanceDemoChangedFiles, [
    "bin/norma-core-synthetic-evidence-acceptance-demo.mjs",
    "docs/examples/local-synthetic-evidence-acceptance-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
    "tests/synthetic-evidence-acceptance-demo.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);

  const missingRequiredFile = syntheticEvidenceAcceptanceDemoChangedFiles.filter(
    (file) => file !== "tests/synthetic-evidence-acceptance-demo.test.mjs",
  );
  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "docs/examples/synthetic-external-evidence.md",
    "viewer/read-only-result-viewer.html",
    "src/local-report/visual-viewer.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...syntheticEvidenceAcceptanceDemoChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

async function runCommand(args = []) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [commandPath, ...args], {
    cwd: repoRoot,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30_000,
  });

  assert.equal(stderr, "");
  return { stdout, parsed: JSON.parse(stdout) };
}

async function assertOutput(payload) {
  assertJsonKeys(payload, successEnvelopeKeys);
  assert.deepEqual((await readdir(payload.outputDir)).sort(), outputFiles);
  for (const fileName of outputFiles) {
    assert.equal((await stat(join(payload.outputDir, fileName))).isFile(), true);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function fileHash(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function assertJsonKeys(value, expectedKeys) {
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort());
}

function createWritableCaptures() {
  const stdoutChunks = [];
  const stderrChunks = [];
  return {
    stdout: { write: (chunk) => stdoutChunks.push(chunk) },
    stderr: { write: (chunk) => stderrChunks.push(chunk) },
    stdoutText: () => stdoutChunks.join(""),
    stderrText: () => stderrChunks.join(""),
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
