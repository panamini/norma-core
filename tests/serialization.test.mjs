import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

function diagnostic(input) {
  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    targetRef: input.targetRef ?? null,
    source: input.source ?? { kind: "test", ref: "diagnostic-source" },
    blocking: input.blocking,
    provenance: input.provenance ?? null,
  };
}

test("PR18 exports stable serialization helpers while PR21 owns verifyRun and replay remains absent", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr12");
  assert.equal(typeof core.STABLE_SERIALIZATION_VERSION, "string");
  assert.equal(typeof core.canonicalizeForSerialization, "function");
  assert.equal(typeof core.serializeCanonicalJson, "function");
  assert.equal(typeof core.canonicalizeRefs, "function");
  assert.equal(typeof core.canonicalizeOutputRefs, "function");
  assert.equal(typeof core.canonicalizeDiagnostics, "function");
  assert.equal("replayRun" in core, false);
  assert.equal(typeof core.verifyRun, "function");
});

test("PR18 serializes object keys deterministically independent of insertion order", () => {
  const first = { zeta: 3, alpha: 1, middle: 2 };
  const second = { middle: 2, zeta: 3, alpha: 1 };

  assert.equal(core.serializeCanonicalJson(first), "{\"alpha\":1,\"middle\":2,\"zeta\":3}");
  assert.equal(core.serializeCanonicalJson(first), core.serializeCanonicalJson(second));
});

test("PR18 serializes nested object keys deterministically", () => {
  const first = {
    outer: {
      zeta: { b: 2, a: 1 },
      alpha: { d: 4, c: 3 },
    },
  };
  const second = {
    outer: {
      alpha: { c: 3, d: 4 },
      zeta: { a: 1, b: 2 },
    },
  };

  assert.equal(
    core.serializeCanonicalJson(first),
    "{\"outer\":{\"alpha\":{\"c\":3,\"d\":4},\"zeta\":{\"a\":1,\"b\":2}}}",
  );
  assert.equal(core.serializeCanonicalJson(first), core.serializeCanonicalJson(second));
});

test("PR18 preserves semantic array order while canonicalizing nested object keys", () => {
  const value = {
    steps: [
      { rank: 2, name: "second" },
      { name: "first", rank: 1 },
      { rank: 3, name: "third" },
    ],
  };

  assert.equal(
    core.serializeCanonicalJson(value),
    "{\"steps\":[{\"name\":\"second\",\"rank\":2},{\"name\":\"first\",\"rank\":1},{\"name\":\"third\",\"rank\":3}]}",
  );
});

test("PR18 canonicalizes unordered refs and outputRefs with explicit comparator rules", () => {
  const refs = [
    { kind: "ratio-pack", ref: "pack:b" },
    { kind: "surface", ref: "surface:a" },
    { kind: "operation-context", ref: "context:c" },
    { kind: "surface", ref: "surface:a" },
  ];
  const refsBefore = structuredClone(refs);

  assert.deepEqual(core.canonicalizeRefs(refs), [
    { kind: "operation-context", ref: "context:c" },
    { kind: "ratio-pack", ref: "pack:b" },
    { kind: "surface", ref: "surface:a" },
  ]);
  assert.deepEqual(refs, refsBefore);

  const outputRefs = [
    { kind: "artifact", ref: "artifact:summary" },
    { kind: "decision", ref: "decision:comparison:a-b" },
    { kind: "construction", ref: "construction:surface:1200x800:surface-basic-third-grid" },
    { kind: "evaluation", ref: "evaluation:A:basic-grid-alignment" },
    { kind: "measurement", ref: "measurement:A:alignment" },
    { kind: "comparison", ref: "comparison:evaluation:A:evaluation:B" },
    { kind: "measurement", ref: "measurement:A:alignment" },
  ];

  assert.deepEqual(core.canonicalizeOutputRefs(outputRefs), {
    kind: "output-refs",
    refs: [
      { kind: "construction", ref: "construction:surface:1200x800:surface-basic-third-grid" },
      { kind: "measurement", ref: "measurement:A:alignment" },
      { kind: "evaluation", ref: "evaluation:A:basic-grid-alignment" },
      { kind: "comparison", ref: "comparison:evaluation:A:evaluation:B" },
      { kind: "decision", ref: "decision:comparison:a-b" },
      { kind: "artifact", ref: "artifact:summary" },
    ],
  });
});

test("PR18 canonicalizes diagnostics without hiding severity, blocking, or provenance", () => {
  const provenance = {
    operationName: "core.serialization.test",
    operationVersion: "0.1.0",
    inputRefs: [{ kind: "test-input", ref: "input:a" }],
    source: { kind: "test", ref: "serialization" },
  };
  const diagnostics = [
    diagnostic({
      code: "FeatureFlagsMismatch",
      severity: "warning",
      message: "Feature flags differ.",
      targetRef: "featureFlags",
      blocking: false,
      provenance,
    }),
    diagnostic({
      code: "MissingRun",
      severity: "error",
      message: "Run is missing.",
      targetRef: "run",
      blocking: true,
      provenance,
    }),
    diagnostic({
      code: "ArtifactStale",
      severity: "critical",
      message: "Artifact is stale.",
      targetRef: "artifact:stale",
      blocking: true,
      provenance,
    }),
  ];

  const ordered = core.canonicalizeDiagnostics(diagnostics);

  assert.deepEqual(ordered.map((item) => item.code), [
    "MissingRun",
    "ArtifactStale",
    "FeatureFlagsMismatch",
  ]);
  for (const item of ordered) {
    assert.ok("severity" in item);
    assert.ok("blocking" in item);
    assert.deepEqual(item.provenance, provenance);
  }
});

test("PR18 excludes or normalizes timestamp-like metadata only through serialization policy", () => {
  const value = {
    id: "run:test",
    metadata: {
      createdAt: "2026-06-12T08:00:00Z",
      updatedAt: "2027-01-01T00:00:00Z",
      note: "kept",
    },
  };

  assert.equal(
    core.serializeCanonicalJson(value),
    "{\"id\":\"run:test\",\"metadata\":{\"createdAt\":\"2026-06-12T08:00:00Z\",\"note\":\"kept\",\"updatedAt\":\"2027-01-01T00:00:00Z\"}}",
  );

  assert.equal(
    core.serializeCanonicalJson(value, core.DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY),
    "{\"id\":\"run:test\",\"metadata\":{\"note\":\"kept\"}}",
  );

  assert.equal(
    core.serializeCanonicalJson(value, {
      ...core.STABLE_SERIALIZATION_POLICY,
      timestampPolicy: "normalize",
      timestampFields: ["createdAt"],
      normalizedTimestamp: "normalized-timestamp",
    }),
    "{\"id\":\"run:test\",\"metadata\":{\"createdAt\":\"normalized-timestamp\",\"note\":\"kept\",\"updatedAt\":\"2027-01-01T00:00:00Z\"}}",
  );
});

test("PR18 rejects unsupported non-plain objects instead of dropping their data", () => {
  class Box {
    constructor() {
      this.value = 1;
    }
  }

  assert.throws(
    () => core.serializeCanonicalJson(new Map([["a", 1]])),
    /plain JSON-like objects|does not support/,
  );
  assert.throws(
    () => core.serializeCanonicalJson(new Set(["a"])),
    /plain JSON-like objects|does not support/,
  );
  assert.throws(
    () => core.serializeCanonicalJson(new Box()),
    /plain JSON-like objects|does not support/,
  );
});
