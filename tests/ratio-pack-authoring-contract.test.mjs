import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const baseInputPath = join(repoRoot, "examples/structured-analyze/basic-grid-alignment.json");
const harmonicTriadsFixturePath = join(repoRoot, "tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json");
const cliCommandPath = join(repoRoot, "bin/norma-cli.mjs");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");

const HARMONIC_TRIADS_PACK_ID = "norma.harmonic-triads";
const HARMONIC_TRIADS_PACK_VERSION = "0.1.0";
const HARMONIC_TRIADS_CONTENT_IDENTITY = "norma.harmonic-triads@0.1.0:ratio-pack-v1:synthetic-1-2-1";
const HARMONIC_TRIADS_RULE_SET_ID = "surface-harmonic-triads";

const EXPECTED_HARMONIC_TRIADS_AUTHORING_CONTRACT = Object.freeze({
  id: HARMONIC_TRIADS_PACK_ID,
  version: HARMONIC_TRIADS_PACK_VERSION,
  schemaVersion: "ratio-pack-v1",
  identity: {
    kind: "ratio-pack-identity",
    id: HARMONIC_TRIADS_PACK_ID,
    concept: "Synthetic harmonic triad partitions",
  },
  contentIdentity: HARMONIC_TRIADS_CONTENT_IDENTITY,
  metadata: {
    name: "Norma Harmonic Triads",
    description: "Minimal synthetic 1:2:1 partition pack for explicit authoring contract tests.",
    owner: "norma-core-tests",
  },
  provenance: {
    kind: "ratio-pack-provenance",
    source: "mathematical",
    sourceRefs: [
      {
        kind: "test-fixture",
        ref: "r13-ratio-pack-authoring-contract",
      },
    ],
  },
  compatibility: {
    schemaVersion: "ratio-pack-v1",
    coreVersionRange: "0.1.0-pr12",
  },
  limits: {
    noBeautyClaims: true,
    noIntentInference: true,
    noUiPreset: true,
  },
  conventions: [
    "ratio-pack-v1",
    "declarative-rules-only",
  ],
  ratios: [
    {
      kind: "ratio",
      id: "1/4",
      numerator: 1,
      denominator: 4,
      normalizedValue: 0.25,
      familyRef: "harmonic-triad",
    },
    {
      kind: "ratio",
      id: "1/2",
      numerator: 1,
      denominator: 2,
      normalizedValue: 0.5,
      familyRef: "harmonic-triad",
    },
    {
      kind: "ratio",
      id: "3/4",
      numerator: 3,
      denominator: 4,
      normalizedValue: 0.75,
      familyRef: "harmonic-triad",
    },
  ],
  ratioFamilies: [
    {
      kind: "ratio-family",
      id: "harmonic-triad",
      ratioRefs: ["1/4", "1/2", "3/4"],
      scope: "surface-partition",
    },
  ],
  ratioSequences: [
    {
      kind: "ratio-sequence",
      id: "1:2:1",
      parts: [1, 2, 1],
      normalizedParts: [0.25, 0.5, 0.25],
    },
  ],
  partitionPatterns: [
    {
      kind: "partition-pattern",
      id: "triadic-quartile",
      ratioRefs: ["1/4", "1/2", "3/4"],
      sequenceRef: "1:2:1",
      axis: "both",
      declarationOnly: true,
    },
  ],
  ruleDeclarations: [
    {
      kind: "rule-declaration",
      id: "verticalHarmonicTriad",
      type: "divideSurfaceVertical",
      target: "surface",
      ratioRefs: ["1/4", "3/4"],
      sequenceRefs: ["1:2:1"],
      partitionPatternRefs: ["triadic-quartile"],
      requiresCoreSupport: true,
      declarationOnly: true,
    },
    {
      kind: "rule-declaration",
      id: "horizontalHarmonicTriad",
      type: "divideSurfaceHorizontal",
      target: "surface",
      ratioRefs: ["1/4", "3/4"],
      sequenceRefs: ["1:2:1"],
      partitionPatternRefs: ["triadic-quartile"],
      requiresCoreSupport: true,
      declarationOnly: true,
    },
    {
      kind: "rule-declaration",
      id: "harmonicTriadAxes",
      type: "createGuidesFromCandidates",
      target: "surface",
      ratioRefs: ["1/4", "1/2", "3/4"],
      partitionPatternRefs: ["triadic-quartile"],
      requiresCoreSupport: true,
      declarationOnly: true,
    },
    {
      kind: "rule-declaration",
      id: "harmonicTriadGrid",
      type: "createSimpleGrid",
      target: "surface",
      ratioRefs: ["1/4", "3/4"],
      sequenceRefs: ["1:2:1"],
      partitionPatternRefs: ["triadic-quartile"],
      requiresCoreSupport: true,
      declarationOnly: true,
    },
    {
      kind: "rule-declaration",
      id: "harmonicTriadDiagonals",
      type: "createDiagonals",
      target: "surface",
      ratioRefs: ["1/2"],
      partitionPatternRefs: ["triadic-quartile"],
      requiresCoreSupport: true,
      declarationOnly: true,
    },
    {
      kind: "rule-declaration",
      id: "harmonicTriadIntersections",
      type: "deriveIntersections",
      target: "surface",
      ratioRefs: ["1/4", "1/2", "3/4"],
      sequenceRefs: ["1:2:1"],
      partitionPatternRefs: ["triadic-quartile"],
      requiresCoreSupport: true,
      declarationOnly: true,
    },
  ],
  ruleSets: [
    {
      kind: "rule-set",
      id: HARMONIC_TRIADS_RULE_SET_ID,
      ruleRefs: [
        "verticalHarmonicTriad",
        "horizontalHarmonicTriad",
        "harmonicTriadAxes",
        "harmonicTriadGrid",
        "harmonicTriadDiagonals",
        "harmonicTriadIntersections",
      ],
      declarationOnly: true,
    },
  ],
  preLock: {
    kind: "pack-lock-prelock",
    ref: "prelock:norma.harmonic-triads@0.1.0",
    packId: HARMONIC_TRIADS_PACK_ID,
    packVersion: HARMONIC_TRIADS_PACK_VERSION,
    schemaVersion: "ratio-pack-v1",
    contentIdentity: HARMONIC_TRIADS_CONTENT_IDENTITY,
    final: false,
  },
});

test("R13 validates a standalone harmonic pack fixture as explicit ratio-pack data", async () => {
  const pack = await readHarmonicTriadsPack();
  const result = core.validateRatioPackV1(pack);

  assert.deepEqual(authoringContractFields(pack), EXPECTED_HARMONIC_TRIADS_AUTHORING_CONTRACT);
  assertOk(result);
  assert.deepEqual(authoringContractFields(result.output), EXPECTED_HARMONIC_TRIADS_AUTHORING_CONTRACT);
  assert.equal("HARMONIC_TRIADS_PACK" in core, false);
});

test("R13 analyzes an explicit authored pack through Structured Analyze without mutating pack data", async () => {
  const input = await createHarmonicTriadsInput();
  const before = core.serializeCanonicalJson(input);
  const first = core.analyzeStructuredCompositionV1(input);
  const second = core.analyzeStructuredCompositionV1(input);

  assertValid(first);
  assert.deepEqual(first, second);
  assert.equal(core.serializeCanonicalJson(input), before);
  assert.deepEqual(authoringContractFields(input.ratioPack), EXPECTED_HARMONIC_TRIADS_AUTHORING_CONTRACT);
  assert.equal(first.inputRefs.some((ref) => ref.kind === "ratio-pack" && ref.ref === ratioPackRef(input.ratioPack)), true);
  assert.equal(first.inputRefs.some((ref) => ref.kind === "rule-set" && ref.ref === HARMONIC_TRIADS_RULE_SET_ID), true);
  assert.equal(first.packLockRef.id, input.packLock.ref.id);
  assertPackLockIdentityOnly(input.packLock);
});

test("R13 keeps CLI and report-kit result parity for an explicit authored pack input", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "norma-r13-pack-authoring-"));
  const input = await createHarmonicTriadsInput();
  const inputPath = join(tempDir, "harmonic-triads-input.json");
  const cliOutputDir = join(tempDir, "cli");
  const reportOutputDir = join(tempDir, "report");
  const inputJson = `${JSON.stringify(input, null, 2)}\n`;

  try {
    await writeFile(inputPath, inputJson, "utf8");

    const directResult = core.analyzeStructuredCompositionV1(input);
    const bundle = createLocalStructuredAnalyzeReportBundle(input);
    assert.deepEqual(bundle.result, directResult);
    assert.equal(bundle.summary.input.ratioPackRef, "norma.harmonic-triads@0.1.0");
    assert.equal(bundle.summary.input.ruleSetRef, HARMONIC_TRIADS_RULE_SET_ID);
    assert.equal(bundle.summary.scope.geometryHarmoniesPack, false);
    assert.equal(bundle.summary.scope.newRatioPack, true);

    const { stdout: cliStdout } = await execFileAsync(process.execPath, [cliCommandPath, "analyze", inputPath, "--out", cliOutputDir], {
      cwd: repoRoot,
    });
    const cliCommandResult = JSON.parse(cliStdout);
    assert.equal(cliCommandResult.status, "ok");
    assert.equal(cliCommandResult.resultStatus, "valid");
    assert.deepEqual(await readJson(join(cliOutputDir, "result.json")), directResult);

    const { stdout: reportStdout } = await execFileAsync(process.execPath, [reportCommandPath, inputPath, reportOutputDir], {
      cwd: repoRoot,
    });
    const reportCommandResult = JSON.parse(reportStdout);
    assert.equal(reportCommandResult.status, "ok");
    assert.equal(reportCommandResult.resultStatus, "valid");

    const reportResult = await readJson(join(reportOutputDir, "result.json"));
    const reportSummary = await readJson(join(reportOutputDir, "summary.json"));
    const summaryMarkdown = await readFile(join(reportOutputDir, "summary.md"), "utf8");
    const reportHtml = await readFile(join(reportOutputDir, "report.html"), "utf8");

    assert.deepEqual(reportResult, directResult);
    assert.equal(reportSummary.input.ratioPackRef, "norma.harmonic-triads@0.1.0");
    assert.equal(reportSummary.input.ruleSetRef, HARMONIC_TRIADS_RULE_SET_ID);
    assert.match(summaryMarkdown, /- ratioPack: norma\.harmonic-triads@0\.1\.0/u);
    assert.match(summaryMarkdown, /- non-basic ratio pack supplied/u);
    assert.match(summaryMarkdown, /- no recommendation/u);
    assert.match(summaryMarkdown, /- no beauty score/u);
    assert.match(summaryMarkdown, /- no prompt\/image inference/u);
    assert.match(reportHtml, /norma\.harmonic-triads@0\.1\.0/u);
    assertNoPositiveInferenceClaims(`${summaryMarkdown}\n${reportHtml}`);
    assert.equal(await readFile(inputPath, "utf8"), inputJson);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

async function createHarmonicTriadsInput() {
  const input = await readJson(baseInputPath);
  const ratioPack = await readHarmonicTriadsPack();
  const sourceRefs = sourceRefsForHarmonicTriadsInput(input, ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }), "harmonic-triads:pack-lock");
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: input.compositionA.coordinateSystem,
    metricPolicy: input.compositionA.metricPolicy,
    tolerancePolicy: input.tolerancePolicy,
    roundingPolicy: input.operationContext.roundingPolicy.value,
    numericPolicy: input.operationContext.numericPolicy.value,
    orderingPolicy: input.operationContext.orderingPolicy.value,
    featureFlags: {
      explicitStructuredJsonInput: true,
      localStructuredAnalyzeReportKit: true,
      r13RatioPackAuthoringFixture: true,
    },
    sourceRefs,
  }), "harmonic-triads:operation-context");

  return {
    ...input,
    analysisId: "analysis:r13-harmonic-triads-authoring",
    ratioPack,
    packLock,
    ruleSetRef: HARMONIC_TRIADS_RULE_SET_ID,
    operationContext,
    provenance: {
      ...input.provenance,
      externalSourceRef: { kind: "test-fixture", ref: "r13-harmonic-triads-authoring" },
      mappingVersion: "r13-ratio-pack-authoring-contract-v1",
      operationContextRef: operationContext.ref,
    },
  };
}

function sourceRefsForHarmonicTriadsInput(input, ratioPack) {
  return [
    { kind: "structured-analysis-input", ref: "r13-harmonic-triads-authoring:structured-input" },
    { kind: "surface", ref: input.compositionA.surface.id },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: HARMONIC_TRIADS_RULE_SET_ID },
    { kind: "evaluation-profile", ref: input.evaluationProfile.id },
    { kind: "coordinate-policy", ref: input.compositionA.coordinateSystem.id },
    { kind: "metric-policy", ref: input.compositionA.metricPolicy.id },
    { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
  ];
}

function authoringContractFields(pack) {
  return {
    id: pack.id,
    version: pack.version,
    schemaVersion: pack.schemaVersion,
    identity: pack.identity,
    contentIdentity: pack.contentIdentity,
    metadata: pack.metadata,
    provenance: pack.provenance,
    compatibility: pack.compatibility,
    limits: pack.limits,
    conventions: pack.conventions,
    ratios: pack.ratios,
    ratioFamilies: pack.ratioFamilies,
    ratioSequences: pack.ratioSequences,
    partitionPatterns: pack.partitionPatterns,
    ruleDeclarations: pack.ruleDeclarations,
    ruleSets: pack.ruleSets,
    preLock: pack.preLock,
  };
}

function assertPackLockIdentityOnly(packLock) {
  assert.equal(packLock.kind, "pack-lock");
  assert.equal(packLock.packId, HARMONIC_TRIADS_PACK_ID);
  assert.equal(packLock.packVersion, HARMONIC_TRIADS_PACK_VERSION);
  assert.equal(packLock.contentIdentity, HARMONIC_TRIADS_CONTENT_IDENTITY);

  for (const executableField of [
    "ratios",
    "ratioFamilies",
    "ratioSequences",
    "partitionPatterns",
    "ruleDeclarations",
    "ruleSets",
  ]) {
    assert.equal(executableField in packLock, false, `PackLock must not carry ${executableField}`);
  }
}

function assertNoPositiveInferenceClaims(text) {
  assert.doesNotMatch(
    text,
    /\b(?:recommends?|recommended)\b|\b(optimization|inferred intent|prompt-derived ratios|more beautiful|beauty score: [0-9])/iu,
  );
}

function assertOk(result) {
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
  assert.ok(result.output);
}

function assertValid(result) {
  assert.equal(result.status, "valid");
  assert.equal(result.errors.length, 0);
  assert.ok(result.decision);
  assert.equal(result.replayReadiness.status, "ready");
}

function requiredOutput(result, label) {
  assertOk(result, label);
  return result.output;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

async function readHarmonicTriadsPack() {
  return readJson(harmonicTriadsFixturePath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
