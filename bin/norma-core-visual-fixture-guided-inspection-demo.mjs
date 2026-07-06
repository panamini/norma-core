import { realpathSync } from "node:fs";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
import { createGuidedInspectionArtifactContract } from "../dist/src/local-report/guided-inspection-artifact-contract.js";
import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
} from "../dist/src/geometry-observation.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const fixtureRelativePath = "tests/fixtures/visual-adapter/static-handoff-proof-v1.json";
const fixturePath = join(repoRoot, fixtureRelativePath);
const defaultOutputDirPrefix = join(tmpdir(), "norma-core-visual-fixture-guided-inspection-demo-");
const emittedArtifactNames = Object.freeze(["result.json", "guide.html", "visual.svg", "summary.json", "summary.md"]);
const svgNamespace = ["ht", "tp://www.w3.org/2000/svg"].join("");
const fixtureBoundaryChecks = Object.freeze([
  ["localOnly", (fixture) => fixture?.localOnly === true, "Visual fixture demo requires localOnly to be true."],
  ["fixtureOnly", (fixture) => fixture?.fixtureOnly === true, "Visual fixture demo requires fixtureOnly to be true."],
  ["staticFixture", (fixture) => fixture?.staticFixture === true, "Visual fixture demo requires staticFixture to be true."],
  ["syntheticOnly", (fixture) => fixture?.syntheticOnly === true, "Visual fixture demo requires syntheticOnly to be true."],
  [
    "runtimeCallsAllowed",
    (fixture) => fixture?.adapter?.runtimeCallsAllowed === false,
    "Visual fixture demo requires runtime calls to be disabled.",
  ],
  [
    "coreTruth",
    (fixture) => fixture?.sourceTruthPolicy?.coreTruth === "acceptedStructuredGeometry",
    "Visual fixture demo requires acceptedStructuredGeometry as source truth.",
  ],
  [
    "coreInputAllowedFrom",
    (fixture) => fixture?.sourceTruthPolicy?.coreInputAllowedFrom === "acceptedStructuredGeometryOnly",
    "Visual fixture demo requires acceptedStructuredGeometry as the only Core input.",
  ],
  [
    "candidateObservation",
    (fixture) => fixture?.candidateObservation?.coreInput === false && fixture?.candidateObservation?.sourceTruth === false,
    "Visual fixture demo requires candidate observations to remain evidence only.",
  ],
  [
    "rawContentIncluded",
    (fixture) => fixture?.sourceAsset?.rawContentIncluded === false,
    "Visual fixture demo requires source assets without raw content.",
  ],
]);

class CliUsageError extends Error {}

export {
  runVisualFixtureGuidedInspectionDemoCli,
};

async function createVisualFixtureGuidedInspectionDemoResult(args, options = {}) {
  const { outputDir } = await parseDemoArgs(args, options);
  const resolvedOutputDir = resolve(outputDir);
  const fixture = await loadFixture(options);

  validateFixtureBoundary(fixture);
  await mkdir(resolvedOutputDir, { recursive: true });

  const contract = createGuidedInspectionArtifactContract({
    outputDir: resolvedOutputDir,
    artifacts: emittedArtifactNames,
  });
  const structuredAnalyzeInput = createStructuredAnalyzeInputFromAcceptedGeometry(fixture.acceptedStructuredGeometry, {
    proofId: fixture.proofId,
  });
  const result = core.analyzeStructuredCompositionV1(structuredAnalyzeInput);
  const artifactPaths = {
    resultJson: contract.resultJson,
    guideHtml: contract.derivedArtifacts["guide.html"],
    visualSvg: contract.derivedArtifacts["visual.svg"],
    summaryJson: contract.derivedArtifacts["summary.json"],
    summaryMarkdown: contract.derivedArtifacts["summary.md"],
  };

  await writeFile(artifactPaths.resultJson, `${core.serializeCanonicalJson(result)}\n`, "utf8");
  await writeFile(artifactPaths.visualSvg, createVisualSvg(fixture), "utf8");
  await writeFile(artifactPaths.summaryJson, `${core.serializeCanonicalJson(createSummaryJson({ fixture, result }))}\n`, "utf8");
  await writeFile(artifactPaths.summaryMarkdown, createSummaryMarkdown({ fixture, result }), "utf8");
  await writeFile(artifactPaths.guideHtml, createGuideHtml({ fixture, result }), "utf8");
  await Promise.all(Object.values(artifactPaths).map((artifactPath) => access(artifactPath)));

  return {
    status: "ok",
    outputDir: resolvedOutputDir,
    ...artifactPaths,
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
  };
}

async function runVisualFixtureGuidedInspectionDemoCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  options = {},
} = {}) {
  try {
    const result = await createVisualFixtureGuidedInspectionDemoResult(args, options);
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify(createErrorEnvelope(error))}\n`);
    return error instanceof CliUsageError ? 1 : 3;
  }
}

async function parseDemoArgs(args, options = {}) {
  if (args.length === 0) {
    const makeTempOutputDir = options.mkdtemp ?? mkdtemp;
    return { outputDir: await makeTempOutputDir(defaultOutputDirPrefix) };
  }

  if (args.length === 2 && args[0] === "--output" && typeof args[1] === "string" && args[1] !== "") {
    return { outputDir: args[1] };
  }

  throw new CliUsageError("Usage: node bin/norma-core-visual-fixture-guided-inspection-demo.mjs [--output <dir>]");
}

async function loadFixture(options = {}) {
  if (options.fixture) {
    return structuredClone(options.fixture);
  }

  return JSON.parse(await readFile(options.fixturePath ?? fixturePath, "utf8"));
}

function validateFixtureBoundary(fixture) {
  for (const [, isValid, message] of fixtureBoundaryChecks) {
    if (!isValid(fixture)) {
      throw new Error(message);
    }
  }
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

function createSummaryJson({ fixture, result }) {
  return {
    demoId: "pr104-local-visual-fixture-guided-inspection-demo",
    canonicalTruth: "result.json",
    sourceTruth: "acceptedStructuredGeometry",
    localOnly: true,
    fixtureOnly: true,
    candidateEvidenceOnly: true,
    nonSchemaMetadataOnly: true,
    nonApiMetadataOnly: true,
    proofId: fixture.proofId,
    acceptedGeometryContentIdentity: fixture.acceptedStructuredGeometry.contentIdentity,
    candidateObservationContentIdentity: fixture.candidateObservation.observationContentIdentity,
    resultStatus: result.status,
    comparisonStatus: result.comparison.status,
    decisionStatus: result.decision.status,
    layers: [
      "visual evidence, non-truth candidate observation",
      "test/demo-only deterministic fixture handoff",
      "explicit accepted structured geometry, the only Core input",
      "existing Norma Core / Structured Analyze path",
      "derived local outputs",
    ],
  };
}

function createSummaryMarkdown({ fixture, result }) {
  return `# Local Visual Fixture Guided Inspection Demo

- Canonical truth: result.json
- Source truth handoff: acceptedStructuredGeometry
- Candidate visual observation: evidence only
- Local only: true
- Fixture only: true
- Non-schema metadata only: true
- Non-API metadata only: true
- Proof: ${fixture.proofId}
- Accepted geometry content identity: ${fixture.acceptedStructuredGeometry.contentIdentity}
- Result status: ${result.status}
- Decision status: ${result.decision.status}

Derived artifacts are local inspection outputs. They do not become source truth, Core input, package API, or future connector schema.
`;
}

function createGuideHtml({ fixture, result }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Norma Local Visual Fixture Guided Inspection Demo</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      line-height: 1.5;
      color: #17202a;
      background: #f6f8fa;
    }
    body {
      margin: 0;
      padding: 32px;
    }
    main {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d7dde5;
      border-radius: 8px;
      padding: 28px;
    }
    h1, h2 {
      margin: 0 0 12px;
      line-height: 1.2;
    }
    h1 {
      font-size: 28px;
    }
    h2 {
      margin-top: 28px;
      font-size: 18px;
    }
    p {
      margin: 0 0 12px;
    }
    dl {
      display: grid;
      grid-template-columns: minmax(180px, 260px) 1fr;
      gap: 8px 16px;
      margin: 0;
    }
    dt {
      font-weight: 700;
      color: #3a4655;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    a, code {
      color: #0f4c81;
    }
  </style>
</head>
<body>
  <main>
    <h1>Norma Local Visual Fixture Guided Inspection Demo</h1>
    <p>This static local guide displays a deterministic fixture handoff. Candidate visual observations are evidence only; accepted structured geometry is the only Core input.</p>
    <dl>
      <dt>Canonical truth</dt>
      <dd><a href="result.json"><code>result.json</code></a></dd>
      <dt>Source truth handoff</dt>
      <dd><code>acceptedStructuredGeometry</code></dd>
      <dt>Candidate evidence</dt>
      <dd><code>${staticText(fixture.candidateObservation.observationId, "observation id")}</code></dd>
      <dt>Accepted geometry identity</dt>
      <dd><code>${staticText(fixture.acceptedStructuredGeometry.contentIdentity, "accepted content identity")}</code></dd>
      <dt>Result status</dt>
      <dd><code>${staticText(result.status, "result status")}</code></dd>
      <dt>Decision status</dt>
      <dd><code>${staticText(result.decision.status, "decision status")}</code></dd>
    </dl>

    <h2>Layers</h2>
    <ol>
      <li>Visual evidence, non-truth candidate observation.</li>
      <li>Test/demo-only deterministic fixture handoff.</li>
      <li>Explicit accepted structured geometry, the only Core input.</li>
      <li>Existing Norma Core / Structured Analyze path.</li>
      <li>Derived local outputs, including <code>guide.html</code>.</li>
    </ol>

    <h2>Local Artifacts</h2>
    <p><code>result.json</code> is canonical Norma machine truth for this demo. <code>guide.html</code>, <code>visual.svg</code>, <code>summary.json</code>, and <code>summary.md</code> are derived local inspection artifacts only.</p>
    <ul>
      <li><a href="result.json"><code>result.json</code></a></li>
      <li><a href="visual.svg"><code>visual.svg</code></a></li>
      <li><a href="summary.json"><code>summary.json</code></a></li>
      <li><a href="summary.md"><code>summary.md</code></a></li>
    </ul>

    <h2>Boundary</h2>
    <p>Envelope fields such as <code>canonicalTruth</code>, <code>sourceTruth</code>, <code>candidateEvidenceOnly</code>, <code>localOnly</code>, <code>fixtureOnly</code>, and layer labels are local demo metadata only. They are not Core schema, package API, future connector schema, or adapter contract.</p>
    <ul>
      <li>No real image recognition or image parsing.</li>
      <li>No source asset loading, upload, camera input, or remote retrieval.</li>
      <li>No provider, OpenAI, hosted MCP, or ChatGPT connector runtime call.</li>
      <li>No CAD import, Figma import, package publication, public export, or reusable adapter runtime.</li>
      <li>No recommendation, optimization, scoring, correction, beauty judgment, or automatic family selection.</li>
    </ul>
  </main>
</body>
</html>
`;
}

function createVisualSvg(fixture) {
  const candidate = fixture.candidateObservation.normalizedVisualObservation.primitives;
  const accepted = fixture.acceptedStructuredGeometry.primitives;
  const acceptedRects = accepted.map((primitive) => svgAcceptedRect(primitive)).join("\n");
  const candidateRects = candidate.map((primitive) => svgCandidateRect(primitive)).join("\n");

  return `<svg xmlns="${svgNamespace}" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="Static fixture visual handoff">
  <rect x="0" y="0" width="640" height="360" fill="#ffffff"/>
  <text x="32" y="42" font-family="Arial, sans-serif" font-size="20" fill="#17202a">Static local fixture handoff</text>
  <text x="32" y="72" font-family="Arial, sans-serif" font-size="13" fill="#3a4655">Candidate visual evidence is not Core truth. Accepted structured geometry is the only Core input.</text>
  <g transform="translate(64 104)">
    <rect x="0" y="0" width="512" height="192" fill="#f6f8fa" stroke="#d7dde5"/>
    <g data-layer="accepted-structured-geometry">
${acceptedRects}
    </g>
    <g data-layer="candidate-evidence-only">
${candidateRects}
    </g>
    <line x1="256" y1="0" x2="256" y2="192" stroke="#17202a" stroke-width="2" stroke-dasharray="6 6"/>
  </g>
  <rect x="64" y="320" width="16" height="16" fill="none" stroke="#c27900" stroke-width="2" stroke-dasharray="5 3"/>
  <text x="88" y="333" font-family="Arial, sans-serif" font-size="13" fill="#17202a">candidate evidence only</text>
  <rect x="280" y="320" width="16" height="16" fill="#1f77b4" opacity="0.58" stroke="#0f4c81"/>
  <text x="304" y="333" font-family="Arial, sans-serif" font-size="13" fill="#17202a">accepted structured geometry</text>
</svg>
`;
}

function svgAcceptedRect(primitive) {
  const x = staticNumber(primitive.x) * 512;
  const y = staticNumber(primitive.y) * 192;
  const width = staticNumber(primitive.width) * 512;
  const height = staticNumber(primitive.height) * 192;

  return `    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#1f77b4" opacity="0.58" stroke="#17202a"/>`;
}

function svgCandidateRect(primitive) {
  const inset = 5;
  const x = (staticNumber(primitive.x) * 512) + inset;
  const y = (staticNumber(primitive.y) * 192) + inset;
  const width = Math.max(1, (staticNumber(primitive.width) * 512) - (inset * 2));
  const height = Math.max(1, (staticNumber(primitive.height) * 192) - (inset * 2));

  return `    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#c27900" stroke-width="2.5" stroke-dasharray="7 5"/>`;
}

function requiredMappedGeometry(result) {
  if (result.ok !== true || result.status !== "mapped" || !result.mappedGeometry || result.diagnostics.length !== 0) {
    throw new Error("Accepted geometry mapping failed.");
  }

  return result;
}

function requiredNormalization(result) {
  if (
    result.ok !== true
    || result.status !== "normalized"
    || !result.sharedSurface
    || !result.compositionA
    || !result.compositionB
    || !result.transformationStep
    || result.diagnostics.length !== 0
  ) {
    throw new Error("Accepted geometry normalization failed.");
  }

  return result;
}

function requiredOutput(result) {
  if (result.status !== "ok" || !result.output) {
    throw new Error("Core helper output failed.");
  }

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

function staticNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Unexpected fixture coordinate for static SVG.");
  }

  return value;
}

function staticText(value, label) {
  if (typeof value !== "string" || !/^[ A-Za-z0-9:._@/-]+$/u.test(value)) {
    throw new Error(`Unexpected ${label} for static guide HTML.`);
  }

  return value;
}

function createErrorEnvelope(error) {
  return {
    status: "error",
    error: {
      code: error instanceof CliUsageError ? "InvalidCliUsage" : "VisualFixtureGuidedInspectionDemoFailed",
      message: error instanceof Error ? error.message : "Unexpected visual fixture guided inspection demo failure.",
    },
  };
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  process.exitCode = await runVisualFixtureGuidedInspectionDemoCli();
}
