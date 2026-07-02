import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import * as packageRoot from "@norma/core";
import * as distIndex from "../dist/src/index.js";
import { createLocalStructuredAnalyzeReportBundle } from "../dist/src/local-report/structured-analyze-report.js";
import { handleMcpJsonRpcMessage } from "../dist/src/mcp/stdio-protocol.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const alignmentScenarioPath = join(repoRoot, "examples", "structured-analyze", "scenarios", "alignment-basic.json");
const analyzeCliPath = join(repoRoot, "bin", "norma-cli.mjs");
const analyzeToolName = "norma.analyzeStructuredCompositionV1";

const expectedPackageExports = Object.freeze({
  ".": {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  },
});

const expectedPackageRootExportNames = Object.freeze([
  "ARTIFACT_STATUSES",
  "ARTIFACT_TYPES",
  "BASIC_GRID_ALIGNMENT_PROFILE",
  "BASIC_GRID_ALIGNMENT_PROFILE_ID",
  "BASIC_PROPORTIONS_PACK",
  "BASIC_PROPORTIONS_PACK_CONTENT_IDENTITY",
  "BASIC_PROPORTIONS_PACK_ID",
  "BASIC_PROPORTIONS_PACK_VERSION",
  "COMPARISON_STATUSES",
  "COMPONENT_SCORE_STATUSES",
  "CORE_CANONICAL_VARIABLES",
  "CORE_DIAGNOSTIC_CODES",
  "CORE_OPERATION_REGISTRY",
  "CORE_OPERATION_STATUSES",
  "CORE_RULE_TYPES_V1",
  "CORE_RULE_TYPE_REGISTRY_V1",
  "CORE_SKELETON_OPERATION_REGISTRY",
  "CORE_VALIDATION_LEVELS",
  "CORE_VERSION",
  "DEFAULT_GEOMETRY_MODEL_VERSION",
  "DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY",
  "EMPTY_OPERATION_REGISTRY",
  "EVALUATION_COMPONENT_IDS",
  "FORBIDDEN_CORE_DEPENDENCY_TERMS",
  "GEOMETRY_HARMONIES_PACK",
  "GEOMETRY_HARMONIES_PACK_CONTENT_IDENTITY",
  "GEOMETRY_HARMONIES_PACK_ID",
  "GEOMETRY_HARMONIES_PACK_VERSION",
  "GEOMETRY_V1_SUPPORTED_KINDS",
  "MEASUREMENT_TYPES_V1",
  "MVP_DEMO_OPERATION_NAME",
  "MVP_DEMO_OPERATION_SEQUENCE",
  "MVP_DEMO_OPERATION_VERSION",
  "NORMA_CANONICAL_COORDINATE_SYSTEM",
  "PR11_RUNTIME_OPERATION_VERSION",
  "RATIO_PACK_V1_SCHEMA_VERSION",
  "REPLAY_READINESS_STATUSES",
  "REQUIRED_PR1_DIAGNOSTIC_CODES",
  "STABLE_SERIALIZATION_POLICY",
  "STABLE_SERIALIZATION_VERSION",
  "STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION",
  "STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME",
  "STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION",
  "STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION",
  "SURFACE_BASIC_THIRD_GRID_RULE_SET_ID",
  "SURFACE_GOLDEN_SECTION_RULE_SET_ID",
  "analyzeStructuredCompositionV1",
  "canonicalizeDiagnostics",
  "canonicalizeErrors",
  "canonicalizeForSerialization",
  "canonicalizeOutputRefs",
  "canonicalizeRefs",
  "canonicalizeWarnings",
  "compareCompositionsBasic",
  "compareRunContext",
  "consumeGuidedInspectionDemoEnvelopeV1",
  "createCoreError",
  "createCoreWarning",
  "createGuidedInspectionArtifactContractV1",
  "createMvpDemoInput",
  "createOperationContext",
  "createPackLock",
  "createRun",
  "createRunInput",
  "createRunOutput",
  "deriveIntersections",
  "evaluateCompositionBasic",
  "executeCoreOperation",
  "generateConstruction",
  "generateConstructionSummaryArtifact",
  "generateDiagonals",
  "generateEvaluationReportArtifact",
  "generateExplanationArtifact",
  "generateGuides",
  "generateSimpleGrid",
  "generateSimpleVisualArtifact",
  "generateStructuredResultArtifact",
  "generateZones",
  "measureAreas",
  "measureGeometry",
  "missingRequiredDiagnosticCodes",
  "notImplementedOperation",
  "operationKey",
  "readPartitionPatternFromPack",
  "readRatioFromPack",
  "readRatioSequenceFromPack",
  "readRuleSetFromPack",
  "replayRun",
  "resolveRatio",
  "resolveRatioSequence",
  "resolveRuleSet",
  "runMvpDemo",
  "serializeCanonicalJson",
  "sortOutputRefsDeterministically",
  "suppressCoreWarnings",
  "unsupportedOperation",
  "validateArtifact",
  "validateCoreDependencyBoundary",
  "validateCoreOperationResult",
  "validateCoreSkeleton",
  "validateGeometryV1",
  "validateOperationCallContract",
  "validateOutputProvenance",
  "validateRatioPackV1",
  "validateRunReadiness",
  "verifyArtifactFreshness",
  "verifyRun",
]);

const expectedStructuredResultKeys = Object.freeze([
  "kind",
  "contractVersion",
  "operationName",
  "operationVersion",
  "status",
  "analysisId",
  "inputRefs",
  "outputRefs",
  "validation",
  "measurements",
  "evaluations",
  "comparison",
  "decision",
  "packLockRef",
  "operationContextRef",
  "replayReadiness",
  "diagnostics",
  "warnings",
  "errors",
  "provenance",
  "serializationSummary",
]);

const expectedMeasurementKeys = Object.freeze([
  "kind",
  "id",
  "constructionRef",
  "sourceGeometryRefs",
  "constructionMeasurements",
  "compositions",
  "directionalRelations",
  "surfaceHierarchy",
  "warnings",
  "provenance",
]);

const expectedEvaluationKeys = Object.freeze([
  "kind",
  "id",
  "profileRef",
  "packRef",
  "packLockRef",
  "packPreLockRef",
  "compositionLabel",
  "measurementRefs",
  "componentScores",
  "score",
  "confidence",
  "status",
  "warnings",
  "provenance",
]);

const expectedComparisonKeys = Object.freeze([
  "kind",
  "id",
  "status",
  "evaluationARef",
  "evaluationBRef",
  "scoreDelta",
  "tieTolerance",
  "sharedContext",
  "decision",
  "explanation",
  "warnings",
  "provenance",
]);

const expectedDecisionKeys = Object.freeze([
  "kind",
  "status",
  "selectedEvaluationRef",
  "summary",
  "sourceRefs",
  "provenance",
]);

const expectedDiagnosticKeys = Object.freeze([
  "blocking",
  "code",
  "message",
  "provenance",
  "severity",
  "source",
  "targetRef",
]);

const expectedReportSummaryKeys = Object.freeze([
  "kind",
  "contractVersion",
  "coreVersion",
  "analysisId",
  "status",
  "operation",
  "input",
  "decision",
  "diagnostics",
  "outputRefs",
  "replayReadiness",
  "outputFiles",
  "scope",
]);

test("R11 package root entrypoint and runtime export surface are frozen", async () => {
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));

  assert.deepEqual(packageJson.exports, expectedPackageExports);
  assert.deepEqual(Object.keys(packageRoot).sort(), expectedPackageRootExportNames);
  assert.deepEqual(Object.keys(distIndex).sort(), expectedPackageRootExportNames);
  assert.equal(typeof packageRoot.analyzeStructuredCompositionV1, "function");
  assert.strictEqual(packageRoot.analyzeStructuredCompositionV1, distIndex.analyzeStructuredCompositionV1);
});

test("R11 analyzeStructuredCompositionV1 result shape is stable and deterministic", async () => {
  const input = await readJson(alignmentScenarioPath);
  const first = packageRoot.analyzeStructuredCompositionV1(structuredClone(input));
  const second = packageRoot.analyzeStructuredCompositionV1(structuredClone(input));
  const invalid = packageRoot.analyzeStructuredCompositionV1(null);

  assert.deepEqual(second, first);
  assert.equal(first.status, "valid");
  assertStructuredResultShape(first);
  assert.deepEqual(Object.keys(first.measurements), ["a", "b"]);
  assert.deepEqual(Object.keys(first.measurements.a), expectedMeasurementKeys);
  assert.deepEqual(Object.keys(first.measurements.b), expectedMeasurementKeys);
  assert.deepEqual(Object.keys(first.evaluations), ["a", "b"]);
  assert.deepEqual(Object.keys(first.evaluations.a), expectedEvaluationKeys);
  assert.deepEqual(Object.keys(first.evaluations.b), expectedEvaluationKeys);
  assert.deepEqual(Object.keys(first.comparison), expectedComparisonKeys);
  assert.deepEqual(Object.keys(first.decision), expectedDecisionKeys);
  for (const diagnostic of first.diagnostics) {
    assert.deepEqual(Object.keys(diagnostic), expectedDiagnosticKeys);
  }

  assert.equal(invalid.status, "invalid");
  assertStructuredResultShape(invalid);
  assert.equal(invalid.measurements, null);
  assert.equal(invalid.evaluations, null);
  assert.equal(invalid.comparison, null);
  assert.equal(invalid.decision, null);
  assert.equal(invalid.diagnostics.length > 0, true);
  assert.deepEqual(Object.keys(invalid.diagnostics[0]), expectedDiagnosticKeys);
});

test("R11 MCP structured analyze result remains direct engine output", async () => {
  const input = await readJson(alignmentScenarioPath);
  const directResult = packageRoot.analyzeStructuredCompositionV1(structuredClone(input));
  const response = callMcpAnalyze(structuredClone(input));

  assert.equal(response.result.isError, false);
  assert.equal(response.result.structuredContent.tool, analyzeToolName);
  assert.equal(response.result.structuredContent.status, directResult.status);
  assert.deepEqual(response.result.structuredContent.result, directResult);
  assert.equal(response.result.content[0].text, packageRoot.serializeCanonicalJson(response.result.structuredContent));
});

test("R11 CLI analyze result.json remains direct engine output", async () => {
  const input = await readJson(alignmentScenarioPath);
  const directResult = packageRoot.analyzeStructuredCompositionV1(structuredClone(input));
  const outputParentDir = await mkdtemp(join(tmpdir(), "norma-r11-cli-contract-"));
  const outputDir = join(outputParentDir, "report");

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      analyzeCliPath,
      "analyze",
      alignmentScenarioPath,
      "--out",
      outputDir,
    ], { cwd: repoRoot });
    const commandResult = JSON.parse(stdout);

    assert.equal(stderr, "");
    assert.equal(commandResult.status, "ok");
    assert.equal(commandResult.resultStatus, directResult.status);
    assert.deepEqual(await readJson(join(outputDir, "result.json")), directResult);
    assert.equal(
      await readFile(join(outputDir, "result.json"), "utf8"),
      `${packageRoot.serializeCanonicalJson(directResult)}\n`,
    );
  } finally {
    await rm(outputParentDir, { recursive: true, force: true });
  }
});

test("R11 local report kit keeps result.json semantic authority in the engine result", async () => {
  const input = await readJson(alignmentScenarioPath);
  const directResult = packageRoot.analyzeStructuredCompositionV1(structuredClone(input));
  const bundle = createLocalStructuredAnalyzeReportBundle(structuredClone(input));
  const summary = JSON.parse(bundle.artifacts["summary.json"]);

  assert.deepEqual(bundle.result, directResult);
  assert.deepEqual(JSON.parse(bundle.artifacts["result.json"]), directResult);
  assert.equal(bundle.artifacts["result.json"], `${packageRoot.serializeCanonicalJson(directResult)}\n`);
  assert.deepEqual(Object.keys(bundle.summary), expectedReportSummaryKeys);
  assert.equal(Object.hasOwn(summary, "measurements"), false);
  assert.equal(Object.hasOwn(summary, "evaluations"), false);
  assert.match(bundle.artifacts["visual.svg"], /^<svg/u);
  assert.doesNotMatch(bundle.artifacts["visual.svg"], /structured-composition-analysis-result|componentScores/u);
  assert.match(bundle.artifacts["report.html"], /<!doctype html>/u);
  assert.doesNotMatch(bundle.artifacts["report.html"], /structured-composition-analysis-result|componentScores/u);
});

function assertStructuredResultShape(result) {
  assert.deepEqual(Object.keys(result), expectedStructuredResultKeys);
  assert.equal(Array.isArray(result.inputRefs), true);
  assert.equal(Array.isArray(result.outputRefs), true);
  assert.equal(Array.isArray(result.diagnostics), true);
  assert.equal(Array.isArray(result.warnings), true);
  assert.equal(Array.isArray(result.errors), true);
}

function callMcpAnalyze(input) {
  const responseText = handleMcpJsonRpcMessage(JSON.stringify({
    jsonrpc: "2.0",
    id: "r11-public-api-contract",
    method: "tools/call",
    params: {
      name: analyzeToolName,
      arguments: {
        input,
      },
    },
  }));

  assert.notEqual(responseText, null);
  return JSON.parse(responseText);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
