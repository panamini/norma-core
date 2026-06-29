import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";
import {
  modelToStaticViewTree,
} from "../viewer/read-only-result-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const onboardingFixturePath = join(repoRoot, "docs", "examples", "read-only-result-viewer-onboarding-fixture.json");
const workflowDocPath = join(repoRoot, "docs", "examples", "read-only-result-viewer-workflow.md");
const onboardingDocPath = join(repoRoot, "docs", "onboarding", "README.md");
const onboardingSourceIds = [
  "composition:r23-onboarding-fixture:A",
  "composition:r23-onboarding-fixture:B",
  "element:r23-onboarding-fixture:A:panel",
  "element:r23-onboarding-fixture:B:panel",
  "surface:r23-onboarding-fixture:120x80",
];

test("R23 onboarding fixture is existing Structured Analyze result JSON inspectable by the viewer model", () => {
  const fixtureText = fixtureJsonText();
  const fixture = JSON.parse(fixtureText);
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: fixtureText });

  assert.equal(fixture.kind, "structured-composition-analysis-result");
  assert.equal(fixture.status, "invalid");
  assert.deepEqual(fixture.outputRefs, []);
  assert.equal(fixture.measurements, null);
  assert.equal(fixture.evaluations, null);
  assert.equal(fixture.comparison, null);
  assert.equal(fixture.decision, null);
  assert.equal(fixture.replayReadiness, null);
  assert.equal(fixture.serializationSummary, null);
  assert.equal(JSON.stringify(fixture).includes("stable-json-v1"), false);
  assert.equal(Object.hasOwn(fixture, "unknownHtmlLikeText"), false);
  assert.equal(Object.hasOwn(fixture, "summary"), false);
  assert.equal(fixture.validation.status, "invalid");
  assert.deepEqual(fixture.validation.acceptedSourceIds, onboardingSourceIds);
  assert.deepEqual(fixture.validation.effectiveSourceIds, onboardingSourceIds);
  assertDiagnostics(fixture.validation.diagnostics);
  assertDiagnostics(fixture.diagnostics);
  assert.deepEqual(fixture.warnings, []);
  assertDiagnostics(fixture.errors);
  assertAnalysisProvenance(fixture.provenance, fixture.operationContextRef);
  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(model.sourceMode, "explicit-json-text");
  assert.equal(row(model, "structuredAnalyzeIdentity", "analysisId")?.value, "analysis:r23-onboarding-fixture");
  assert.equal(row(model, "structuredAnalyzePayloads", "measurements")?.value, null);
  assert.equal(row(model, "structuredAnalyzePayloads", "evaluations")?.value, null);
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "diagnostics", "MissingMeasurements");
  assert.equal(row(model, "structuredAnalyzeDiagnostics", "warnings")?.value, "[]");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "errors", "MissingMeasurements");
  assertRowIncludes(model, "structuredAnalyzeRefs", "provenance", "user_supplied_structured_data");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "comparison.status")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "decision.status")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeReplayReadiness", "replayReadiness.status")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeReplayReadiness", "replayReadiness.run")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeSerialization", "serializationSummary")?.value, null);
  assert.deepEqual(model.errors, []);
  assertReadOnlyProvenance(model);
});

test("R23 onboarding fixture remains inspectable when wrapped as a completed analyzeStructuredCompositionV1 MCP response", () => {
  const result = JSON.parse(fixtureJsonText());
  const model = createReadOnlyViewerModel({
    kind: "jsonText",
    value: JSON.stringify(analyzeJsonRpcResponse(result)),
  });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(row(model, "structuredAnalyzeIdentity", "analysisId")?.value, "analysis:r23-onboarding-fixture");
  assert.equal(row(model, "structuredAnalyzePayloads", "measurements")?.value, null);
  assert.equal(row(model, "structuredAnalyzePayloads", "evaluations")?.value, null);
  assert.equal(row(model, "structuredAnalyzeReplayReadiness", "replayReadiness.status")?.value, "absent");
  assertReadOnlyProvenance(model);
});

test("R23 onboarding fixture renders through the static viewer tree as inert read-only text", () => {
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: fixtureJsonText() });
  const tree = modelToStaticViewTree(model);
  const text = JSON.stringify(tree);

  assertIncludes(text, "Structured Analyze result");
  assertIncludes(text, "structured-analyze-like-result");
  assertIncludes(text, "analysis:r23-onboarding-fixture");
  assertIncludes(text, "MissingMeasurements");
  assertIncludes(text, "Profile component overlap_penalty references missing overlap measurements.");
  assertIncludes(text, "replayReadiness.status");
  assert.deepEqual(tree.provenance, [
    { label: "source truth", value: "explicit-structured-input" },
    { label: "artifacts", value: "derived display data only" },
    { label: "prompt text", value: "not source truth" },
    { label: "displayability", value: "not source-truth validation" },
  ]);
});

test("R23 workflow docs point to the onboarding fixture without implying execution or broader inputs", () => {
  const workflowDoc = readFileSync(workflowDocPath, "utf8");
  const onboardingDoc = readFileSync(onboardingDocPath, "utf8");
  const docs = `${workflowDoc}\n${onboardingDoc}`;

  for (const required of [
    "read-only-result-viewer-onboarding-fixture.json",
    "existing invalid Structured Analyze result JSON",
    "run the repository build script",
    "dist/src/local-viewer/read-only-viewer-model.js",
    "copy the JSON object text",
    "Do not paste the fixture path",
    "local-only",
    "static",
    "read-only",
    "does not run analysis",
    "does not recompute",
    "canonical truth",
    "derived inspection",
  ]) {
    assertIncludes(docs, required);
  }

  for (const forbidden of [
    "the viewer runs analysis",
    "the viewer recomputes",
    "the viewer creates source truth",
    "hosted dashboard is supported",
    "public webapp is supported",
    "SDK is ready",
    "API runtime is ready",
    "remote tool is supported",
    "paste a URL",
    "paste a local path",
    "image input",
    "vision input",
    "CAD input",
    "provider input",
    "recommend corrections",
    "optimize the result",
    "score aesthetics",
    "can infer from prompts",
  ]) {
    assertNotIncludes(docs, forbidden);
  }
});

function fixtureJsonText() {
  return readFileSync(onboardingFixturePath, "utf8");
}

function analyzeJsonRpcResponse(result) {
  const structuredContent = {
    kind: "norma-mcp-tool-result",
    status: result.status,
    tool: "norma.analyzeStructuredCompositionV1",
    result,
  };

  return {
    jsonrpc: "2.0",
    id: "r23-onboarding-fixture",
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify(structuredContent),
        },
      ],
      isError: false,
      structuredContent,
    },
  };
}

function assertDiagnostics(diagnostics) {
  assert.equal(Array.isArray(diagnostics), true);
  assert.equal(diagnostics.length > 0, true);
  for (const diagnostic of diagnostics) {
    assert.deepEqual(Object.keys(diagnostic).sort(), [
      "blocking",
      "code",
      "message",
      "provenance",
      "severity",
      "source",
      "targetRef",
    ]);
    assert.equal(diagnostic.code, "MissingMeasurements");
    assert.equal(diagnostic.severity, "error");
    assert.equal(diagnostic.blocking, true);
    assert.equal(diagnostic.targetRef, "profile.components.overlap_penalty");
    assert.deepEqual(diagnostic.source, {
      kind: "measurements",
      ref: "profile.components.overlap_penalty",
    });
  }
}

function assertAnalysisProvenance(provenance, operationContextRef) {
  assert.deepEqual(Object.keys(provenance).sort(), [
    "acceptanceRecord",
    "adapter",
    "callerSourceIds",
    "externalSourceRef",
    "kind",
    "mappingVersion",
    "normalizationVersion",
    "operationContextRef",
    "sourceKind",
    "transformationSteps",
  ]);
  assert.equal(provenance.kind, "structured-composition-analysis-provenance");
  assert.equal(provenance.sourceKind, "user_supplied_structured_data");
  assert.deepEqual(provenance.externalSourceRef, {
    kind: "local-fixture",
    ref: "r23-onboarding-fixture",
  });
  assert.deepEqual(provenance.callerSourceIds, onboardingSourceIds);
  assert.equal(provenance.adapter, null);
  assert.equal(provenance.mappingVersion, "r23-onboarding-fixture-mapping-v1");
  assert.equal(provenance.normalizationVersion, null);
  assert.deepEqual(provenance.transformationSteps, []);
  assert.deepEqual(provenance.operationContextRef, operationContextRef);
  assert.deepEqual(provenance.acceptanceRecord, {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "local-onboarding-fixture",
    acceptedAt: "2026-06-29T00:00:00Z",
    acceptedSourceIds: onboardingSourceIds,
    acceptanceRecordId: "acceptance:r23-onboarding-fixture",
  });
}

function section(model, sectionId) {
  return model.sections.find((item) => item.id === sectionId);
}

function row(model, sectionId, label) {
  return section(model, sectionId)?.rows.find((item) => item.label === label);
}

function assertRowIncludes(model, sectionId, label, snippet) {
  const value = row(model, sectionId, label)?.value;
  assert.equal(String(value).includes(snippet), true, `${sectionId}.${label} should include ${snippet}`);
}

function assertReadOnlyProvenance(model) {
  assert.deepEqual(model.provenance, {
    sourceTruth: "explicit-structured-input",
    artifactsAreDerived: true,
    promptIsSourceTruth: false,
    displayabilityIsTruthValidation: false,
  });
}

function assertIncludes(text, snippet) {
  assert.equal(text.includes(snippet), true, `${snippet} should be visible`);
}

function assertNotIncludes(text, snippet) {
  assert.equal(text.includes(snippet), false, `${snippet} should not be visible`);
}
