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
import {
  handleMcpJsonRpcMessage,
} from "../dist/src/mcp/stdio-protocol.js";

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

test("R13 follow-up rejects malformed authored ratio-pack contract fields", async () => {
  const pack = await readHarmonicTriadsPack();
  const validResult = core.validateRatioPackV1(pack);

  assertOk(validResult);
  assert.deepEqual(ratioPackContractFields(validResult.output), ratioPackContractFields(pack));

  const cases = [
    ["missing id", { id: "" }, "MissingRatioPackIdentity"],
    ["missing version", { version: "" }, "MissingRatioPackVersion"],
    ["missing contentIdentity", { contentIdentity: "" }, "MissingRatioPackContentIdentity"],
    ["missing metadata.name", { metadata: { ...pack.metadata, name: "" } }, "InvalidRatioPackV1"],
    ["missing provenance", { provenance: null }, "InvalidRatioPackV1"],
    ["missing ruleDeclarations", { ruleDeclarations: undefined }, "InvalidRatioPackV1"],
    ["missing ruleSets", { ruleSets: undefined }, "InvalidRatioPackV1"],
    [
      "preLock contentIdentity drift",
      { preLock: { ...pack.preLock, contentIdentity: "different-content-identity" } },
      "InvalidRatioPackV1",
    ],
    [
      "executable rule declaration",
      { ruleDeclarations: [{ ...pack.ruleDeclarations[0], algorithm: "return inferredRatio();" }] },
      "ExecutableRuleInPackRejected",
    ],
    [
      "agent-authored rule declaration",
      { ruleDeclarations: [{ ...pack.ruleDeclarations[0], source: "prompt" }] },
      "AgentCreatedRuleRejected",
    ],
    ["style preset field", { style: "golden-section-ui" }, "UnsupportedRatioPackClaim"],
    ["positive claim field", { claims: ["beauty score: 10"] }, "UnsupportedRatioPackClaim"],
  ];

  for (const [label, overrides, diagnosticCode] of cases) {
    assertFailedWithDiagnostic(core.validateRatioPackV1(clonePack(pack, overrides)), diagnosticCode, label);
  }
});

test("R13 follow-up keeps pack identity authored and packLock identity-only", async () => {
  const pack = await readHarmonicTriadsPack();
  const firstLock = requiredOutput(core.createPackLock({
    pack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(pack) }],
  }), "first-lock");
  const secondLock = requiredOutput(core.createPackLock({
    pack: structuredClone(pack),
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(pack) }],
  }), "second-lock");
  const metadataOnlyVariant = clonePack(pack, {
    metadata: {
      ...pack.metadata,
      description: "Changed authored metadata with the same authored identity boundary.",
    },
  });
  const metadataOnlyLock = requiredOutput(core.createPackLock({
    pack: metadataOnlyVariant,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(metadataOnlyVariant) }],
  }), "metadata-only-lock");
  const newPackVersion = "0.1.1";
  const newContentIdentity = "norma.harmonic-triads@0.1.1:ratio-pack-v1:synthetic-1-2-1-v2";
  const newVersionVariant = clonePack(pack, {
    version: newPackVersion,
    contentIdentity: newContentIdentity,
    compatibility: {
      ...pack.compatibility,
      coreVersionRange: "0.1.0-pr12",
    },
    preLock: {
      ...pack.preLock,
      ref: `prelock:norma.harmonic-triads@${newPackVersion}`,
      packVersion: newPackVersion,
      contentIdentity: newContentIdentity,
    },
  });
  const newVersionLock = requiredOutput(core.createPackLock({
    pack: newVersionVariant,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(newVersionVariant) }],
  }), "new-version-lock");

  assert.deepEqual(secondLock, firstLock);
  assert.equal(metadataOnlyLock.id, firstLock.id);
  assert.equal(metadataOnlyLock.contentIdentity, firstLock.contentIdentity);
  assert.notEqual(newVersionLock.id, firstLock.id);
  assert.equal(newVersionLock.packId, HARMONIC_TRIADS_PACK_ID);
  assert.equal(newVersionLock.packVersion, newPackVersion);
  assert.equal(newVersionLock.contentIdentity, newContentIdentity);
  assertPackLockCarriesIdentityOnly(newVersionLock);
});

test("R13 follow-up treats authored ratio packs as immutable across direct CLI MCP and report-kit layers", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "norma-r13-contract-pass-through-"));
  const input = await createHarmonicTriadsInput();
  const before = core.serializeCanonicalJson(input);
  deepFreeze(input);

  try {
    const directResult = core.analyzeStructuredCompositionV1(input);
    const bundle = createLocalStructuredAnalyzeReportBundle(input);
    const mcpResult = callMcpAnalyzeStructuredComposition(input);
    const mutableInput = await createHarmonicTriadsInput();
    const inputPath = join(tempDir, "harmonic-triads-input.json");
    const cliOutputDir = join(tempDir, "cli");
    const reportOutputDir = join(tempDir, "report");
    const inputJson = `${JSON.stringify(mutableInput, null, 2)}\n`;

    assertValid(directResult);
    assert.equal(core.serializeCanonicalJson(input), before);
    assert.deepEqual(bundle.result, directResult);
    assert.deepEqual(mcpResult, directResult);
    assertIdentityOnlyReportSummary(bundle.summary);
    assertNoPositiveInferenceClaims(`${bundle.artifacts["summary.md"]}\n${bundle.artifacts["report.html"]}`);

    await writeFile(inputPath, inputJson, "utf8");

    const { stdout: cliStdout } = await execFileAsync(process.execPath, [cliCommandPath, "analyze", inputPath, "--out", cliOutputDir], {
      cwd: repoRoot,
    });
    const cliCommandResult = JSON.parse(cliStdout);
    assert.equal(cliCommandResult.status, "ok");
    assert.equal(cliCommandResult.resultStatus, "valid");
    assert.deepEqual(await readJson(join(cliOutputDir, "result.json")), directResult);
    assert.equal(await readFile(inputPath, "utf8"), inputJson);

    const { stdout: reportStdout } = await execFileAsync(process.execPath, [reportCommandPath, inputPath, reportOutputDir], {
      cwd: repoRoot,
    });
    const reportCommandResult = JSON.parse(reportStdout);
    assert.equal(reportCommandResult.status, "ok");
    assert.equal(reportCommandResult.resultStatus, "valid");
    assert.deepEqual(await readJson(join(reportOutputDir, "result.json")), directResult);
    assertIdentityOnlyReportSummary(await readJson(join(reportOutputDir, "summary.json")));
    assertNoPositiveInferenceClaims(
      `${await readFile(join(reportOutputDir, "summary.md"), "utf8")}\n${await readFile(join(reportOutputDir, "report.html"), "utf8")}`,
    );
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
      r13RatioPackContractPassThrough: true,
    },
    sourceRefs,
  }), "harmonic-triads:operation-context");

  return {
    ...input,
    analysisId: "analysis:r13-harmonic-triads-contract-pass-through",
    ratioPack,
    packLock,
    ruleSetRef: HARMONIC_TRIADS_RULE_SET_ID,
    operationContext,
    provenance: {
      ...input.provenance,
      externalSourceRef: { kind: "test-fixture", ref: "r13-harmonic-triads-contract-pass-through" },
      mappingVersion: "r13-ratio-pack-contract-pass-through-v1",
      operationContextRef: operationContext.ref,
    },
  };
}

function sourceRefsForHarmonicTriadsInput(input, ratioPack) {
  return [
    { kind: "structured-analysis-input", ref: "r13-harmonic-triads-contract-pass-through:structured-input" },
    { kind: "surface", ref: input.compositionA.surface.id },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: HARMONIC_TRIADS_RULE_SET_ID },
    { kind: "evaluation-profile", ref: input.evaluationProfile.id },
    { kind: "coordinate-policy", ref: input.compositionA.coordinateSystem.id },
    { kind: "metric-policy", ref: input.compositionA.metricPolicy.id },
    { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
  ];
}

function callMcpAnalyzeStructuredComposition(input) {
  const rawResponse = handleMcpJsonRpcMessage(JSON.stringify({
    jsonrpc: "2.0",
    id: "r13-harmonic-triads-contract-pass-through",
    method: "tools/call",
    params: {
      name: "norma.analyzeStructuredCompositionV1",
      arguments: { input },
    },
  }));

  assert.notEqual(rawResponse, null);
  const response = JSON.parse(rawResponse);
  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, "r13-harmonic-triads-contract-pass-through");
  assert.equal(response.result.isError, false);
  assert.equal(response.result.structuredContent.kind, "norma-mcp-tool-result");
  assert.equal(response.result.structuredContent.tool, "norma.analyzeStructuredCompositionV1");
  assert.equal(response.result.structuredContent.status, "valid");
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
  return response.result.structuredContent.result;
}

function assertIdentityOnlyReportSummary(summary) {
  assert.equal(summary.input.ratioPackId, HARMONIC_TRIADS_PACK_ID);
  assert.equal(summary.input.ratioPackVersion, HARMONIC_TRIADS_PACK_VERSION);
  assert.equal(summary.input.ratioPackRef, ratioPackRef({ id: HARMONIC_TRIADS_PACK_ID, version: HARMONIC_TRIADS_PACK_VERSION }));
  assert.equal(summary.input.ruleSetRef, HARMONIC_TRIADS_RULE_SET_ID);
  assert.equal(summary.scope.newRatioPack, true);
  assert.equal(summary.scope.recommendation, false);
  assert.equal(summary.scope.beautyScore, false);
  assert.equal(summary.scope.promptImageInference, false);

  for (const forbiddenPackField of [
    "metadata",
    "provenance",
    "compatibility",
    "limits",
    "conventions",
    "ratios",
    "ratioFamilies",
    "ratioSequences",
    "partitionPatterns",
    "ruleDeclarations",
    "ruleSets",
    "preLock",
    "contentIdentity",
  ]) {
    assert.equal(forbiddenPackField in summary.input, false, `report summary must not carry ${forbiddenPackField}`);
  }
}

function ratioPackContractFields(pack) {
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

function assertPackLockCarriesIdentityOnly(packLock) {
  for (const executableField of [
    "metadata",
    "ratios",
    "ratioFamilies",
    "ratioSequences",
    "partitionPatterns",
    "ruleDeclarations",
    "ruleSets",
    "preLock",
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

function assertFailedWithDiagnostic(result, diagnosticCode, label) {
  assert.equal(result.status, "failed", label);
  assert.equal(result.output, null, label);
  assert.equal(
    [...result.errors, ...result.warnings].some((diagnostic) => diagnostic.code === diagnosticCode),
    true,
    label,
  );
}

function requiredOutput(result, label) {
  assertOk(result, label);
  return result.output;
}

function clonePack(pack, overrides = {}) {
  return {
    ...structuredClone(pack),
    ...overrides,
  };
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

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value);
}
