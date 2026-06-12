import assert from "node:assert/strict";
import test from "node:test";

import {
  BASIC_PROPORTIONS_PACK,
  CORE_DIAGNOSTIC_CODES,
  CORE_RULE_TYPE_REGISTRY_V1,
  CORE_RULE_TYPES_V1,
  CORE_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  resolveRatio,
  resolveRatioSequence,
  resolveRuleSet,
} from "../dist/src/index.js";

const expectedRuleTypes = [
  "divideSurfaceVertical",
  "divideSurfaceHorizontal",
  "createGuidesFromCandidates",
  "createSimpleGrid",
  "createDiagonals",
  "deriveIntersections",
];

const expectedRuleRefs = [
  "verticalThirds",
  "horizontalThirds",
  "centerAxes",
  "thirdGrid",
  "surfaceDiagonals",
  "deriveIntersections",
];

const forbiddenConstructionFields = [
  "construction",
  "guides",
  "zones",
  "grid",
  "gridCells",
  "diagonals",
  "intersections",
  "measurements",
  "evaluation",
  "scoring",
  "artifacts",
];

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertStructuredResult(result) {
  assert.equal(typeof result, "object");
  assert.ok(result.status);
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok("output" in result);
  assert.ok("provenance" in result);
  assert.ok("runRef" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);
}

function assertOk(result) {
  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
  assert.ok(result.output);
}

function assertFailedWithDiagnostic(result, diagnosticCode) {
  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes(diagnosticCode));
}

function clonePack(overrides = {}) {
  return {
    ...structuredClone(BASIC_PROPORTIONS_PACK),
    ...overrides,
  };
}

function replaceRuleDeclaration(ruleRef, overrides) {
  const pack = clonePack();
  pack.ruleDeclarations = pack.ruleDeclarations.map((declaration) => (
    declaration.id === ruleRef ? { ...declaration, ...overrides } : declaration
  ));
  return pack;
}

function replaceRuleSetRefs(ruleRefs) {
  const pack = clonePack();
  pack.ruleSets = pack.ruleSets.map((ruleSet) => (
    ruleSet.id === SURFACE_BASIC_THIRD_GRID_RULE_SET_ID ? { ...ruleSet, ruleRefs } : ruleSet
  ));
  return pack;
}

test("PR7 keeps rule resolution vocabulary, diagnostics, and supported rule types", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr12");
  assert.deepEqual(CORE_RULE_TYPES_V1, expectedRuleTypes);
  assert.deepEqual(Object.keys(CORE_RULE_TYPE_REGISTRY_V1), expectedRuleTypes);

  for (const ruleType of expectedRuleTypes) {
    const definition = CORE_RULE_TYPE_REGISTRY_V1[ruleType];
    assert.equal(definition.type, ruleType);
    assert.equal(definition.supported, true);
    assert.equal("execute" in definition, false);
    assert.equal("algorithm" in definition, false);
  }

  for (const diagnosticCode of [
    "MissingRuleSet",
    "MissingRuleDeclaration",
    "MissingRuleType",
    "UnsupportedRuleType",
    "InvalidRuleDeclaration",
    "InvalidRuleSet",
    "AgentCreatedRuleRejected",
    "ExecutableRuleInPackRejected",
  ]) {
    assert.ok(CORE_DIAGNOSTIC_CODES.includes(diagnosticCode));
  }
});

test("PR5 resolves surface-basic-third-grid into a trace without producing construction", () => {
  const result = resolveRuleSet(BASIC_PROPORTIONS_PACK, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);

  assertOk(result);
  assert.equal(result.output.kind, "resolved-rule-set");
  assert.equal(result.output.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assert.deepEqual(result.output.orderedRules.map((rule) => rule.ref), expectedRuleRefs);
  assert.deepEqual(result.output.orderedRules.map((rule) => rule.type), expectedRuleTypes);
  assert.deepEqual(result.output.resolvedRatioRefs, ["1/2", "1/3", "2/3"]);
  assert.deepEqual(result.output.unsupportedRules, []);
  assert.deepEqual(result.output.warnings, []);

  for (const field of forbiddenConstructionFields) {
    assert.equal(field in result.output, false, `${field} must not be produced by PR5`);
  }

  for (const rule of result.output.orderedRules) {
    assert.equal(rule.kind, "rule");
    assert.equal(rule.packRef, "norma.basic-proportions@0.1.0");
    assert.equal(rule.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
    assert.ok(rule.ratioRefs.length > 0 || rule.ratioSequenceRefs.length > 0);
    assert.equal(rule.provenance.packRef, "norma.basic-proportions@0.1.0");
    assert.equal(rule.provenance.ruleRef, rule.ref);
    assert.equal("execute" in rule, false);
    assert.equal("algorithm" in rule, false);
    assert.equal("construction" in rule, false);
  }
});

test("PR5 resolves ratio and ratio sequence references through the pack", () => {
  const ratio = resolveRatio(BASIC_PROPORTIONS_PACK, "1/3");
  const sequence = resolveRatioSequence(BASIC_PROPORTIONS_PACK, "1:1:1");

  assertOk(ratio);
  assert.equal(ratio.output.kind, "resolved-ratio");
  assert.equal(ratio.output.ratioRef, "1/3");
  assert.equal(ratio.output.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(ratio.output.ratio.normalizedValue, 1 / 3);

  assertOk(sequence);
  assert.equal(sequence.output.kind, "resolved-ratio-sequence");
  assert.equal(sequence.output.sequenceRef, "1:1:1");
  assert.deepEqual(sequence.output.sequence.normalizedParts, [1 / 3, 1 / 3, 1 / 3]);
});

test("PR5 rejects unsupported rule types with compatibility diagnostics and trace", () => {
  const result = resolveRuleSet(
    replaceRuleDeclaration("verticalThirds", { type: "futureSurfaceRule" }),
    SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  );

  assertFailedWithDiagnostic(result, "UnsupportedRuleType");
  assert.ok(result.output);
  assert.equal(result.output.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assert.deepEqual(result.output.unsupportedRules.map((rule) => rule.ref), ["verticalThirds"]);
  assert.equal(result.output.unsupportedRules[0].type, "futureSurfaceRule");
});

test("PR5 rejects absent, ad hoc, incomplete, and executable rule declarations", () => {
  assertFailedWithDiagnostic(
    resolveRuleSet(clonePack({ ruleSets: [] }), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "MissingRuleSet",
  );
  assertFailedWithDiagnostic(
    resolveRuleSet(replaceRuleSetRefs(["verticalThirds", "inventedByPrompt"]), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "MissingRuleDeclaration",
  );
  assertFailedWithDiagnostic(
    resolveRuleSet(replaceRuleDeclaration("verticalThirds", { ratioRefs: [] }), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "InvalidRuleDeclaration",
  );
  assertFailedWithDiagnostic(
    resolveRuleSet(replaceRuleDeclaration("verticalThirds", { type: undefined }), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "MissingRuleType",
  );
  assertFailedWithDiagnostic(
    resolveRuleSet(replaceRuleDeclaration("verticalThirds", { requiresCoreSupport: undefined }), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "InvalidRuleDeclaration",
  );
  assertFailedWithDiagnostic(
    resolveRuleSet(replaceRuleDeclaration("verticalThirds", { createdBy: "agent" }), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "AgentCreatedRuleRejected",
  );
  assertFailedWithDiagnostic(
    resolveRuleSet(replaceRuleDeclaration("verticalThirds", { execute: "client-code" }), SURFACE_BASIC_THIRD_GRID_RULE_SET_ID),
    "ExecutableRuleInPackRejected",
  );
});
