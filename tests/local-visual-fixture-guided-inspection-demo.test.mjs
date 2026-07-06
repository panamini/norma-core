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
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
  mapAcceptedGeometryToCoreV1,
} from "../dist/src/accepted-geometry-to-core-mapping.js";
import {
  ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
  normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1,
} from "../dist/src/accepted-geometry-to-structured-analyze-normalization.js";
import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
} from "../dist/src/geometry-observation.js";
import { runVisualFixtureGuidedInspectionDemoCli } from "../bin/norma-core-visual-fixture-guided-inspection-demo.mjs";
import {
  localVisualFixtureGuidedInspectionDemoChangedFiles,
  localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const commandPath = join(repoRoot, "bin/norma-core-visual-fixture-guided-inspection-demo.mjs");
const fixturePath = join(repoRoot, "tests/fixtures/visual-adapter/static-handoff-proof-v1.json");
const outputFiles = ["guide.html", "result.json", "summary.json", "summary.md", "visual.svg"];
const successEnvelopeKeys = [
  "canonicalTruth",
  "candidateEvidenceOnly",
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

test("PR104 visual fixture guided inspection command works with no args", async () => {
  const { parsed } = await runCommand();

  try {
    assert.equal(parsed.status, "ok");
    assert.match(parsed.outputDir, /norma-core-visual-fixture-guided-inspection-demo-/u);
    await assertOutput(parsed);
  } finally {
    await rm(parsed.outputDir, { recursive: true, force: true });
  }
});

test("PR104 visual fixture guided inspection command works with explicit --output", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-explicit-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const { parsed } = await runCommand(["--output", outputDir]);

    assertJsonKeys(parsed, successEnvelopeKeys);
    assert.equal(parsed.outputDir, outputDir);
    assert.equal(parsed.resultJson, join(outputDir, "result.json"));
    assert.equal(parsed.guideHtml, join(outputDir, "guide.html"));
    assert.equal(parsed.visualSvg, join(outputDir, "visual.svg"));
    assert.equal(parsed.summaryJson, join(outputDir, "summary.json"));
    assert.equal(parsed.summaryMarkdown, join(outputDir, "summary.md"));
    assert.equal(parsed.canonicalTruth, "result.json");
    assert.equal(parsed.sourceTruth, "acceptedStructuredGeometry");
    assert.equal(parsed.candidateEvidenceOnly, true);
    assert.equal(parsed.localOnly, true);
    assert.equal(parsed.fixtureOnly, true);
    await assertOutput(parsed);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 result.json matches direct Structured Analyze result from accepted structured geometry", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-result-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const fixture = await readJson(fixturePath);
    const { parsed } = await runCommand(["--output", outputDir]);
    const directInput = createStructuredAnalyzeInputFromAcceptedGeometry(fixture.acceptedStructuredGeometry, {
      proofId: fixture.proofId,
    });
    const directResult = core.analyzeStructuredCompositionV1(directInput);
    const resultText = await readFile(parsed.resultJson, "utf8");

    assert.deepEqual(JSON.parse(resultText), directResult);
    assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);
    assert.equal(directResult.status, "valid");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 candidate visual observations are never passed as Core input", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-core-input-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const fixture = await readJson(fixturePath);
    const { parsed } = await runCommand(["--output", outputDir]);
    const result = await readJson(parsed.resultJson);
    const resultText = await readFile(parsed.resultJson, "utf8");

    assert.equal(fixture.candidateObservation.coreInput, false);
    assert.equal(fixture.candidateObservation.sourceTruth, false);
    assert.equal(result.provenance.adapter, null);
    assert.equal(result.provenance.sourceKind, "user_supplied_structured_data");
    assert.doesNotMatch(resultText, /candidate:rectangle/u);
    assert.doesNotMatch(resultText, /normalizedVisualObservation/u);
    assert.doesNotMatch(resultText, /lossyConversionWarnings/u);
    assert.match(resultText, new RegExp(escapeRegExp(fixture.acceptedStructuredGeometry.contentIdentity), "u"));
    assert.match(resultText, new RegExp(escapeRegExp(fixture.candidateObservation.observationContentIdentity), "u"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 derived artifacts cannot become source truth and metadata is explicitly non-schema and non-API", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-boundary-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const { parsed } = await runCommand(["--output", outputDir]);
    const guideHtml = await readFile(parsed.guideHtml, "utf8");
    const summaryJson = await readJson(parsed.summaryJson);
    const summaryMarkdown = await readFile(parsed.summaryMarkdown, "utf8");

    assert.equal(parsed.nonSchemaMetadataOnly, true);
    assert.equal(parsed.nonApiMetadataOnly, true);
    assert.equal(summaryJson.nonSchemaMetadataOnly, true);
    assert.equal(summaryJson.nonApiMetadataOnly, true);
    assert.match(guideHtml, /local demo metadata only/u);
    assert.match(guideHtml, /not Core schema, package API, future connector schema, or adapter contract/u);
    assert.match(guideHtml, /Derived local outputs/u);
    assert.match(summaryMarkdown, /do not become source truth, Core input, package API, or future connector schema/u);
    assert.equal(summaryJson.sourceTruth, "acceptedStructuredGeometry");
    assert.equal(summaryJson.candidateEvidenceOnly, true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 fixture and generated outputs exclude forbidden payloads and allow only relative artifact links", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-static-"));
  const outputDir = join(tempRoot, "guided");

  try {
    const { parsed } = await runCommand(["--output", outputDir]);
    const fixtureText = await readFile(fixturePath, "utf8");
    const artifactTexts = await Promise.all(outputFiles.map((fileName) => readFile(join(outputDir, fileName), "utf8")));

    for (const text of [fixtureText, ...artifactTexts]) {
      assertNoForbiddenPayload(text);
    }

    for (const text of artifactTexts) {
      assert.doesNotMatch(text, new RegExp(escapeRegExp(repoRoot), "u"));
      assert.doesNotMatch(text, new RegExp(escapeRegExp(outputDir), "u"));
    }

    const guideHtml = await readFile(parsed.guideHtml, "utf8");
    const visualSvg = await readFile(parsed.visualSvg, "utf8");
    const links = [...new Set([...guideHtml.matchAll(/href="([^"]+)"/gu)].map((match) => match[1]))].sort();
    assert.deepEqual(links, ["result.json", "summary.json", "summary.md", "visual.svg"]);
    for (const href of links) {
      assert.doesNotMatch(href, /^(?:[a-z]+:|\/)/iu);
      assert.equal(outputFiles.includes(href), true);
    }

    assert.match(visualSvg, /candidate evidence only/u);
    assert.match(visualSvg, /fill="none" stroke="#c27900" stroke-width="2\.5" stroke-dasharray="7 5"/u);
    assert.match(visualSvg, /data-layer="accepted-structured-geometry"/u);
    assert.match(visualSvg, /data-layer="candidate-evidence-only"/u);
    assert.ok(
      visualSvg.indexOf('data-layer="accepted-structured-geometry"') < visualSvg.indexOf('data-layer="candidate-evidence-only"'),
      "candidate evidence layer should render above accepted geometry layer",
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 demo is deterministic across output directories except absolute envelope paths", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-determinism-"));
  const firstDir = join(tempRoot, "first");
  const secondDir = join(tempRoot, "second");

  try {
    const first = await runCommand(["--output", firstDir]);
    const second = await runCommand(["--output", secondDir]);
    const pathKeys = ["outputDir", "resultJson", "guideHtml", "visualSvg", "summaryJson", "summaryMarkdown"];
    const firstComparable = withoutKeys(first.parsed, pathKeys);
    const secondComparable = withoutKeys(second.parsed, pathKeys);

    assert.deepEqual(firstComparable, secondComparable);
    for (const fileName of outputFiles) {
      assert.equal(await fileHash(join(firstDir, fileName)), await fileHash(join(secondDir, fileName)), fileName);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 validates fixture-only local-only boundary flags before writing outputs", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-pr104-visual-fixture-invalid-"));
  const outputDir = join(tempRoot, "guided");
  const io = createWritableCaptures();
  const fixture = await readJson(fixturePath);
  fixture.localOnly = false;

  try {
    const exitCode = await runVisualFixtureGuidedInspectionDemoCli({
      args: ["--output", outputDir],
      stdout: io.stdout,
      stderr: io.stderr,
      options: { fixture },
    });
    const parsed = JSON.parse(io.stderrText());

    assert.equal(exitCode, 3);
    assert.equal(io.stdoutText(), "");
    assert.equal(parsed.status, "error");
    assert.match(parsed.error.message, /localOnly/u);
    await assert.rejects(() => readdir(outputDir));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PR104 exact changed-file guard accepts only the approved visual fixture guided demo set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualFixtureGuidedInspectionDemoChangedFiles),
    localVisualFixtureGuidedInspectionDemoChangedFiles,
  );
  assert.deepEqual(
    sharedExactApprovedChangedFiles(localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles),
    localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles,
  );
  assert.deepEqual(localVisualFixtureGuidedInspectionDemoChangedFiles, [
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "docs/examples/local-visual-fixture-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-approval.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);
  assert.deepEqual(localVisualFixtureGuidedInspectionDemoNonSemgrepMaintenanceChangedFiles, [
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "docs/examples/local-visual-fixture-guided-inspection-demo.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
    "tests/onboarding-examples-docs.test.mjs",
  ]);

  const missingRequiredFile = localVisualFixtureGuidedInspectionDemoChangedFiles.filter(
    (file) => file !== "tests/local-visual-fixture-guided-inspection-demo.test.mjs",
  );
  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "../norma-core-wiki/wiki/hot.md",
    ".github/workflows/ci.yml",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-report.mjs",
    "tests/fixtures/visual-adapter/source-image.png",
    "docs/BUSINESS_READINESS_ROADMAP.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...localVisualFixtureGuidedInspectionDemoChangedFiles,
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

function assertNoForbiddenPayload(text) {
  const textWithoutAllowedSvgNamespace = text.replaceAll("http://www.w3.org/2000/svg", "");

  for (const forbiddenPattern of [
    /data:image\//i,
    /base64/i,
    /https?:\/\//i,
    /file:\/\//i,
    /\/Users\//,
    /\/Volumes\//,
    /C:\\\\/i,
    /bearer\s+[a-z0-9._-]+/i,
    /api[_-]?key/i,
    /sk-[a-z0-9]/i,
    /cookie/i,
    /signed[_-]?url/i,
    /private production/i,
    /real-user/i,
  ]) {
    assert.doesNotMatch(textWithoutAllowedSvgNamespace, forbiddenPattern, forbiddenPattern.source);
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

function withoutKeys(value, keys) {
  const blocked = new Set(keys);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !blocked.has(key)));
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

function createStructuredAnalyzeInputFromAcceptedGeometry(acceptedGeometry, options = {}) {
  const accepted = withComputedAcceptedGeometryIdentities(acceptedGeometry);
  const mapped = requiredMappedGeometry(mapAcceptedGeometryToCoreV1(validMappingRequest(accepted)));
  const baseComposition = mapped.mappedGeometry;
  const comparisonComposition = shiftedComposition(baseComposition);
  const base = core.createMvpDemoInput();
  const tolerancePolicy = {
    ...structuredClone(base.tolerancePolicy),
    id: "tolerance:pr104",
  };
  const normalization = requiredNormalization(normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1({
    requestId: "request:pr104:synthetic-shared-unit-surface",
    mappedCompositionA: baseComposition,
    mappedCompositionB: comparisonComposition,
    normalizedCompositionAId: "composition:pr104:mapped:A",
    normalizedCompositionBId: "composition:pr104:mapped:B",
    sharedSurfaceId: "surface:pr104:synthetic-unit",
    tolerancePolicy,
    transformationStepId: "transformation:pr104:shared-unit-surface",
  }));
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }));
  const evaluationTolerances = {
    ...structuredClone(base.evaluationTolerances),
    id: "evaluation-tolerances:pr104",
  };
  const comparisonTolerances = {
    ...structuredClone(base.comparisonTolerances),
    id: "comparison-tolerances:pr104",
  };
  const acceptedSourceIds = normalization.acceptedSourceIds;
  const sourceRefs = [
    { kind: "structured-analysis-input", ref: "input:pr104:visual-fixture-guided-inspection" },
    { kind: "accepted-geometry", ref: accepted.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: accepted.contentIdentity },
    { kind: "visual-observation", ref: accepted.sourceObservationId },
    { kind: "visual-observation-content-identity", ref: accepted.sourceObservationContentIdentity },
    { kind: "mapping-result", ref: mapped.resultContentIdentity },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: base.ruleSetRef },
    { kind: "evaluation-profile", ref: base.evaluationProfile.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: normalization.sharedSurface.coordinateSystem.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
  ];
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: normalization.sharedSurface.coordinateSystem,
    metricPolicy: null,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { visualFixtureGuidedInspectionDemo: true },
    sourceRefs,
  }));
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "deterministic-test",
    acceptedAt: "2026-07-04T00:00:00Z",
    acceptedSourceIds,
    acceptanceRecordId: "acceptance:pr104:structured-analyze",
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: "analysis:pr104:visual-fixture-guided-inspection",
    compositionA: normalization.compositionA,
    compositionB: normalization.compositionB,
    acceptance,
    ratioPack,
    packLock,
    ruleSetRef: base.ruleSetRef,
    evaluationProfile: base.evaluationProfile,
    evaluationTolerances,
    comparisonTolerances,
    tolerancePolicy,
    operationContext,
    provenance: {
      kind: "structured-composition-analysis-provenance",
      sourceKind: "user_supplied_structured_data",
      externalSourceRef: { kind: "test-fixture", ref: options.proofId ?? "visual-adapter-static-handoff-proof-v1" },
      callerSourceIds: acceptedSourceIds,
      adapter: null,
      mappingVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
      normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
      transformationSteps: [
        {
          kind: "structured-composition-transformation-step",
          id: "transformation:pr104:map-accepted-geometry",
          description: "Map explicitly accepted fixture geometry into Core Composition2D inputs.",
          inputRefs: [{ kind: "accepted-geometry", ref: accepted.acceptedGeometryId }],
          outputRefs: [{ kind: "mapping-result", ref: mapped.resultContentIdentity }],
        },
        normalization.transformationStep,
      ],
      acceptanceRecord: acceptance,
      operationContextRef: operationContext.ref,
    },
  };
}

function validMappingRequest(acceptedGeometry) {
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:pr104:${acceptedGeometry.acceptedGeometryId}`,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry,
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    mappingContext: {
      boundary: "synthetic-only",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
  };
}

function shiftedComposition(composition) {
  return {
    ...structuredClone(composition),
    id: "composition:pr104:comparison-source",
    surface: {
      ...structuredClone(composition.surface),
      id: "surface:pr104:comparison-source",
    },
    elements: composition.elements.map((element, index) => ({
      ...structuredClone(element),
      id: `element:pr104:comparison:${index}`,
      geometry: {
        ...element.geometry,
        width: element.geometry.width === 0.5 ? 0.45 : element.geometry.width,
      },
    })),
  };
}

function requiredMappedGeometry(result) {
  assert.equal(result.ok, true);
  assert.equal(result.status, "mapped");
  assert.ok(result.mappedGeometry);
  assert.deepEqual(result.diagnostics, []);
  return result;
}

function requiredNormalization(result) {
  assert.equal(result.ok, true);
  assert.equal(result.status, "normalized");
  assert.ok(result.sharedSurface);
  assert.ok(result.compositionA);
  assert.ok(result.compositionB);
  assert.ok(result.transformationStep);
  assert.deepEqual(result.diagnostics, []);
  return result;
}

function requiredOutput(result) {
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return result.output;
}

function withComputedAcceptedGeometryIdentities(acceptedGeometry) {
  const accepted = structuredClone(acceptedGeometry);
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  return accepted;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}
