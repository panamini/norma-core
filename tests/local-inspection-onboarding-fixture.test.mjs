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

test("R23 onboarding fixture is existing Structured Analyze result JSON inspectable by the viewer model", () => {
  const fixtureText = fixtureJsonText();
  const fixture = JSON.parse(fixtureText);
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: fixtureText });

  assert.equal(fixture.kind, "structured-composition-analysis-result");
  assert.deepEqual(fixture.validation.acceptedSourceIds, [
    "source:r23-onboarding-fixture:A",
    "source:r23-onboarding-fixture:B",
  ]);
  assert.deepEqual(fixture.validation.effectiveSourceIds, [
    "source:r23-onboarding-fixture:A",
    "source:r23-onboarding-fixture:B",
  ]);
  assert.deepEqual(fixture.serializationSummary, {
    serializationVersion: "stable-json-v1",
    meaningfulIdentity: "identity:r23-onboarding-fixture",
  });
  assert.equal(fixture.measurements.a.id, "measurements:A:r23-onboarding-fixture");
  assert.equal(fixture.measurements.b.id, "measurements:B:r23-onboarding-fixture");
  assert.equal(fixture.measurements.compositionA, undefined);
  assert.equal(fixture.measurements.compositionB, undefined);
  assert.equal(fixture.evaluations.a.id, "evaluation:A:r23-onboarding-fixture");
  assert.equal(fixture.evaluations.b.id, "evaluation:B:r23-onboarding-fixture");
  assert.equal(fixture.evaluations.compositionA, undefined);
  assert.equal(fixture.evaluations.compositionB, undefined);
  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(model.sourceMode, "explicit-json-text");
  assert.equal(row(model, "structuredAnalyzeIdentity", "analysisId")?.value, "analysis:r23-onboarding-fixture");
  assertRowIncludes(model, "structuredAnalyzePayloads", "measurements", "measurements:A:r23-onboarding-fixture");
  assertRowIncludes(model, "structuredAnalyzePayloads", "evaluations", "evaluation:B:r23-onboarding-fixture");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "diagnostics", "R23OnboardingDiagnostic");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "warnings", "R23OnboardingWarning");
  assertRowIncludes(model, "structuredAnalyzeRefs", "provenance", "user_supplied_structured_data");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "decision.status")?.value, "a_closer");
  assert.equal(row(model, "unknownFields", "unknownHtmlLikeText")?.value, "<script>alert(1)</script>");
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
  assertRowIncludes(model, "structuredAnalyzePayloads", "measurements", "measurements:B:r23-onboarding-fixture");
  assertRowIncludes(model, "structuredAnalyzePayloads", "evaluations", "evaluation:A:r23-onboarding-fixture");
  assertReadOnlyProvenance(model);
});

test("R23 onboarding fixture renders through the static viewer tree as inert read-only text", () => {
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: fixtureJsonText() });
  const tree = modelToStaticViewTree(model);
  const text = JSON.stringify(tree);

  assertIncludes(text, "Structured Analyze result");
  assertIncludes(text, "structured-analyze-like-result");
  assertIncludes(text, "analysis:r23-onboarding-fixture");
  assertIncludes(text, "measurements:A:r23-onboarding-fixture");
  assertIncludes(text, "R23OnboardingWarning");
  assertIncludes(text, "<script>alert(1)</script>");
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
    "existing Structured Analyze result JSON",
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
    status: "ok",
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
