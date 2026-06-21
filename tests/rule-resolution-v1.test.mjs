import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  CORE_VERSION,
  RULE_RESOLUTION_V1_SCHEMA_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  resolveRuleSetV1,
  validateRatioPackV1,
  validateRuleResolutionV1,
} from "../dist/src/index.js";

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
  assert.equal(result.output, null);
}

function assertFailedWithDiagnosticTarget(result, diagnosticCode, targetRef) {
  assertFailedWithDiagnostic(result, diagnosticCode);
  assert.ok(result.errors.some((diagnostic) => diagnostic.code === diagnosticCode && diagnostic.targetRef === targetRef));
}

function clonePack(overrides = {}) {
  return {
    ...structuredClone(BASIC_PROPORTIONS_PACK),
    ...overrides,
  };
}

test("PR5 exports Rule Resolution V1 vocabulary and diagnostics", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr5");
  assert.equal(RULE_RESOLUTION_V1_SCHEMA_VERSION, "rule-resolution-v1");
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("MissingRuleSet"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("MissingRuleDeclaration"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("InvalidRuleResolutionV1"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("UnsupportedRuleDeclaration"));
});

test("PR5 resolves the MVP third-grid rule set without generating construction", () => {
  const result = resolveRuleSetV1(BASIC_PROPORTIONS_PACK, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);

  assertOk(result);
  assert.equal(result.output.kind, "rule-resolution");
  assert.equal(result.output.schemaVersion, "rule-resolution-v1");
  assert.equal(result.output.ruleSetRef, "surface-basic-third-grid");
  assert.equal(result.output.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(result.output.contentIdentity, "norma.basic-proportions@0.1.0:ratio-pack-v1:mvp-minimal");
  assert.deepEqual(result.output.ruleRefs, ["surface-thirds-vertical", "surface-thirds-horizontal"]);
  assert.deepEqual(result.output.rules.map((rule) => rule.ruleRef), [
    "surface-thirds-vertical",
    "surface-thirds-horizontal",
  ]);

  const verticalRule = result.output.rules[0];
  assert.equal(verticalRule.kind, "resolved-rule");
  assert.equal(verticalRule.type, "surface.partition-line");
  assert.equal(verticalRule.target, "surface");
  assert.deepEqual(verticalRule.ratioRefs.map((ratio) => ratio.ratioRef), ["1/3", "2/3"]);
  assert.deepEqual(verticalRule.sequenceRefs.map((sequence) => sequence.sequenceRef), ["1:1:1"]);
  assert.deepEqual(verticalRule.partitionPatternRefs.map((pattern) => pattern.partitionPatternRef), ["thirds"]);
  assert.equal(verticalRule.constructionRefs.length, 0);
  assert.equal(verticalRule.measurementRefs.length, 0);

  assert.equal(result.output.constructionRefs.length, 0);
  assert.equal(result.output.measurementRefs.length, 0);
  assert.equal(result.output.artifactRefs.length, 0);
  assert.equal(result.output.scoringRefs.length, 0);
  assert.equal("lines" in result.output, false);
  assert.equal("coordinates" in result.output, false);
  assert.equal("score" in result.output, false);
});

test("PR5 validates resolved rule resolution output shape", () => {
  const resolution = resolveRuleSetV1(BASIC_PROPORTIONS_PACK, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(resolution);

  const validation = validateRuleResolutionV1(resolution.output);
  assertOk(validation);
  assert.equal(validation.output.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);

  assertFailedWithDiagnostic(
    validateRuleResolutionV1({
      ...resolution.output,
      schemaVersion: "rule-resolution-v2",
    }),
    "InvalidRuleResolutionV1",
  );
});

test("PR5 returns MissingRuleSet for absent declared rule sets", () => {
  assertFailedWithDiagnosticTarget(
    resolveRuleSetV1(BASIC_PROPORTIONS_PACK, "missing-rule-set"),
    "MissingRuleSet",
    "ruleSets.missing-rule-set",
  );
});

test("PR5 rejects empty rule set refs and declarations without resolvable refs", () => {
  assertFailedWithDiagnosticTarget(resolveRuleSetV1(BASIC_PROPORTIONS_PACK, ""), "InvalidRuleResolutionV1", "ruleSetRef");

  const emptyDeclarationPack = clonePack({
    ruleDeclarations: [
      {
        kind: "rule-declaration",
        id: "empty-rule",
        type: "surface.partition-line",
        target: "surface",
        declarationOnly: true,
      },
    ],
    ruleSets: [
      {
        kind: "rule-set",
        id: "empty-rule-set",
        ruleRefs: ["empty-rule"],
        declarationOnly: true,
      },
    ],
  });

  assert.equal(validateRatioPackV1(emptyDeclarationPack).status, "ok");
  assertFailedWithDiagnosticTarget(
    resolveRuleSetV1(emptyDeclarationPack, "empty-rule-set"),
    "InvalidRuleResolutionV1",
    "ruleDeclarations.empty-rule",
  );
});
