import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  BASIC_PROPORTIONS_PACK_ID,
  BASIC_PROPORTIONS_PACK_VERSION,
  CORE_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  readPartitionPatternFromPack,
  readRatioFromPack,
  readRatioSequenceFromPack,
  readRuleSetFromPack,
  validateRatioPackV1,
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

function clonePack(overrides = {}) {
  return {
    ...structuredClone(BASIC_PROPORTIONS_PACK),
    ...overrides,
  };
}

test("PR4 exports ratio pack vocabulary, diagnostics, and version", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr4");
  assert.equal(BASIC_PROPORTIONS_PACK_ID, "norma.basic-proportions");
  assert.equal(BASIC_PROPORTIONS_PACK_VERSION, "0.1.0");
  assert.equal(SURFACE_BASIC_THIRD_GRID_RULE_SET_ID, "surface-basic-third-grid");
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("MissingRatioPack"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("UnsupportedRatioPackClaim"));
});

test("PR4 validates the norma.basic-proportions MVP pack", () => {
  const result = validateRatioPackV1(BASIC_PROPORTIONS_PACK);

  assertOk(result);
  assert.equal(result.output.id, "norma.basic-proportions");
  assert.equal(result.output.version, "0.1.0");
  assert.equal(result.output.schemaVersion, "ratio-pack-v1");
  assert.equal(result.output.contentIdentity, "norma.basic-proportions@0.1.0:ratio-pack-v1:mvp-minimal");
  assert.equal(result.output.preLock.contentIdentity, result.output.contentIdentity);
  assert.deepEqual(
    result.output.ratios.map((ratio) => ratio.id),
    ["1/2", "1/3", "2/3"],
  );
  assert.equal(result.output.ratios.some((ratio) => ratio.id === "1:1:1"), false);
});

test("PR4 reads declared ratios from the pack without hardcoded operation ratios", () => {
  const oneThird = readRatioFromPack(BASIC_PROPORTIONS_PACK, "1/3");
  const twoThirds = readRatioFromPack(BASIC_PROPORTIONS_PACK, "2/3");

  assertOk(oneThird);
  assertOk(twoThirds);
  assert.equal(oneThird.output.normalizedValue, 1 / 3);
  assert.equal(twoThirds.output.normalizedValue, 2 / 3);
});

test("PR4 keeps 1:1:1 as a ratio sequence with normalized parts", () => {
  const result = readRatioSequenceFromPack(BASIC_PROPORTIONS_PACK, "1:1:1");

  assertOk(result);
  assert.deepEqual(result.output.parts, [1, 1, 1]);
  assert.deepEqual(result.output.normalizedParts, [1 / 3, 1 / 3, 1 / 3]);
});

test("PR4 validates halves and thirds as partition patterns", () => {
  const halves = readPartitionPatternFromPack(BASIC_PROPORTIONS_PACK, "halves");
  const thirds = readPartitionPatternFromPack(BASIC_PROPORTIONS_PACK, "thirds");

  assertOk(halves);
  assertOk(thirds);
  assert.equal(halves.output.kind, "partition-pattern");
  assert.equal(thirds.output.sequenceRef, "1:1:1");
});

test("PR4 declares surface-basic-third-grid without executing it", () => {
  const result = readRuleSetFromPack(BASIC_PROPORTIONS_PACK, "surface-basic-third-grid");

  assertOk(result);
  assert.equal(result.output.kind, "rule-set");
  assert.equal(result.output.declarationOnly, true);
  assert.equal("algorithm" in result.output, false);
  assert.equal("execute" in result.output, false);
});

test("PR4 rejects missing required pack identity fields", () => {
  assertFailedWithDiagnostic(validateRatioPackV1(null), "MissingRatioPack");
  assertFailedWithDiagnostic(validateRatioPackV1(clonePack({ version: "" })), "MissingRatioPackVersion");
  assertFailedWithDiagnostic(validateRatioPackV1(clonePack({ identity: undefined })), "MissingRatioPackIdentity");
  assertFailedWithDiagnostic(
    validateRatioPackV1(clonePack({ contentIdentity: "" })),
    "MissingRatioPackContentIdentity",
  );
});

test("PR4 rejects duplicate and invalid ratio definitions", () => {
  const duplicateRatio = clonePack({
    ratios: [...BASIC_PROPORTIONS_PACK.ratios, structuredClone(BASIC_PROPORTIONS_PACK.ratios[0])],
  });
  const invalidRatio = clonePack({
    ratios: [{ kind: "ratio", id: "broken", numerator: 1, denominator: 0 }],
  });

  assertFailedWithDiagnostic(validateRatioPackV1(duplicateRatio), "DuplicateRatioDefinition");
  assertFailedWithDiagnostic(validateRatioPackV1(invalidRatio), "InvalidRatioValue");
});

test("PR4 rejects invalid ratio sequences", () => {
  const invalidSequence = clonePack({
    ratioSequences: [{ kind: "ratio-sequence", id: "bad", parts: [1, 0, 1] }],
  });

  assertFailedWithDiagnostic(validateRatioPackV1(invalidSequence), "InvalidRatioSequence");
});

test("PR4 rejects missing ratio references", () => {
  const readMissing = readRatioFromPack(BASIC_PROPORTIONS_PACK, "golden");
  const readMissingSequence = readRatioSequenceFromPack(BASIC_PROPORTIONS_PACK, "missing-sequence");
  const readMissingPattern = readPartitionPatternFromPack(BASIC_PROPORTIONS_PACK, "missing-pattern");
  const readMissingRuleSet = readRuleSetFromPack(BASIC_PROPORTIONS_PACK, "missing-rule-set");
  const partitionMissingRatio = clonePack({
    partitionPatterns: [
      {
        kind: "partition-pattern",
        id: "bad-thirds",
        ratioRefs: ["1/3", "3/3"],
        sequenceRef: "1:1:1",
        axis: "both",
        declarationOnly: true,
      },
    ],
  });

  assertFailedWithDiagnostic(readMissing, "MissingRatioReference");
  assertFailedWithDiagnostic(readMissingSequence, "MissingRatioReference");
  assertFailedWithDiagnostic(readMissingPattern, "MissingRatioReference");
  assertFailedWithDiagnostic(readMissingRuleSet, "MissingRatioReference");
  assertFailedWithDiagnostic(validateRatioPackV1(partitionMissingRatio), "MissingRatioReference");
});

test("PR4 rejects rule declarations that reference absent ratios", () => {
  const badRuleDeclaration = clonePack({
    ruleDeclarations: [
      {
        kind: "rule-declaration",
        id: "bad-rule",
        type: "surface.partition-line",
        target: "surface",
        ratioRefs: ["4/5"],
        partitionPatternRefs: ["thirds"],
        declarationOnly: true,
      },
    ],
  });

  assertFailedWithDiagnostic(validateRatioPackV1(badRuleDeclaration), "MissingRatioReference");
});

test("PR4 rejects beauty and UI preset claims", () => {
  assertOk(validateRatioPackV1(clonePack({
    metadata: {
      ...BASIC_PROPORTIONS_PACK.metadata,
      description: "Better composition of halves as a neutral metadata phrase.",
    },
  })));
  assertFailedWithDiagnostic(
    validateRatioPackV1(clonePack({ claims: ["rend beau"] })),
    "UnsupportedRatioPackClaim",
  );
  assertFailedWithDiagnostic(
    validateRatioPackV1(clonePack({ claims: ["UI style rendering preset"] })),
    "UnsupportedRatioPackClaim",
  );
});
