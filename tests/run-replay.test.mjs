import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

function createTruthPath() {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return { input, demo: result.output };
}

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertReplayResult(result, status, replayAttempted) {
  assert.equal(result.kind, "run-replay");
  assert.equal(result.status, status);
  assert.equal(result.replayAttempted, replayAttempted);
  assert.equal(result.replayRequired, true);
  assert.ok("operationName" in result);
  assert.ok("operationVersion" in result);
  assert.ok("recordedRunRef" in result);
  assert.ok("replayedRunRef" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);
  assert.ok(Array.isArray(result.recordedOutputRefs));
  assert.ok(Array.isArray(result.replayedOutputRefs));
  assert.ok(Array.isArray(result.sourceRefsUsed));
  assert.ok(Array.isArray(result.mismatches));
  assert.equal(result.verification.kind, "run-verification");
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.serializationSummary);
  assert.equal(result.serializationSummary.canonicalOrdering, true);
}

function sourceObjectsForRun(input) {
  return [
    {
      sourceRef: { kind: "mvp-demo-input", ref: "mvp-demo:structured-input" },
      sourceObject: { ...input, id: "mvp-demo:structured-input" },
    },
    { sourceRef: { kind: "surface", ref: input.surface.id }, sourceObject: input.surface },
    { sourceRef: { kind: "ratio-pack", ref: input.packRef }, sourceObject: input.ratioPack },
    {
      sourceRef: { kind: "rule-set", ref: input.ruleSetRef },
      sourceObject: input.ratioPack.ruleSets.find((ruleSet) => ruleSet.id === input.ruleSetRef),
    },
    {
      sourceRef: { kind: "evaluation-profile", ref: input.evaluationProfile.id },
      sourceObject: input.evaluationProfile,
    },
    {
      sourceRef: { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
      sourceObject: input.tolerancePolicy,
    },
    {
      sourceRef: { kind: "evaluation-tolerances", ref: input.evaluationTolerances.id },
      sourceObject: input.evaluationTolerances,
    },
    {
      sourceRef: { kind: "coordinate-system", ref: input.surface.coordinateSystem.id },
      sourceObject: input.surface.coordinateSystem,
    },
    {
      sourceRef: { kind: "metric-policy", ref: input.surface.metricPolicy.id },
      sourceObject: input.surface.metricPolicy,
    },
  ];
}

function sourceObjectsForArtifact(demo, artifact) {
  return artifact.sourceRefs.flatMap((sourceRef) => {
    if (sourceRef.kind === "core-result" && sourceRef.ref === "mvp-demo:construction") {
      return [{ sourceRef, result: demo.constructionResult }];
    }

    if (sourceRef.kind === "construction" && sourceRef.ref === demo.constructionResult.output.id) {
      return [demo.constructionResult.output];
    }

    return [];
  });
}

function freshnessInput(demo, artifact, overrides = {}) {
  return {
    artifact,
    sourceObjects: sourceObjectsForArtifact(demo, artifact),
    expectedSourceRefs: [...artifact.sourceRefs].reverse(),
    expectedOutputRefs: [...artifact.outputRefs].reverse(),
    expectedRunRef: artifact.runRef,
    expectedOptions: reverseObjectKeys(artifact.options),
    expectedOperationContextRef: demo.operationContext.ref,
    ...overrides,
  };
}

function replayInput(input, demo, overrides = {}) {
  return {
    run: demo.runEnvelope,
    mvpDemoInput: input,
    recordedMvpResult: demo,
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    ...overrides,
  };
}

function reversedRunOrdering(run) {
  return {
    ...run,
    inputRefs: [...run.inputRefs].reverse(),
    input: {
      ...run.input,
      inputRefs: [...run.input.inputRefs].reverse(),
      sourceRefs: [...run.input.sourceRefs].reverse(),
      requestedOutputRefs: {
        ...run.input.requestedOutputRefs,
        refs: [...run.input.requestedOutputRefs.refs].reverse(),
      },
    },
    outputRefs: {
      ...run.outputRefs,
      refs: [...run.outputRefs.refs].reverse(),
    },
    warnings: [...run.warnings].reverse(),
    errors: [...run.errors].reverse(),
  };
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)]),
  );
}

function canonicalReplay(result) {
  return core.serializeCanonicalJson(result, core.DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function deepFreeze(value) {
  if (!isPlainRecord(value) && !Array.isArray(value)) {
    return value;
  }

  Object.freeze(value);
  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }
  return value;
}

function isPlainRecord(value) {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

test("PR22 exports MVP-only replayRun without adding external surfaces or package churn", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

  assert.equal(core.CORE_VERSION, "0.1.0-pr12");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(typeof core.replayRun, "function");
  assert.equal(typeof core.verifyRun, "function");
  assert.equal(typeof core.verifyArtifactFreshness, "function");
  assert.equal("createCli" in core, false);
  assert.equal("createSdk" in core, false);
  assert.equal("createApi" in core, false);
  assert.equal("createMcp" in core, false);
  assert.equal("createMcpServer" in core, false);
  assert.equal("createAdapter" in core, false);
});

test("PR22 replays the MVP demo truth path from explicit structured source truth", () => {
  const { input, demo } = createTruthPath();
  const result = core.replayRun(replayInput(input, demo));

  assertReplayResult(result, "replayed", true);
  assert.equal(result.operationName, "core.mvp-demo.run");
  assert.equal(result.operationVersion, "0.1.0-pr12");
  assert.deepEqual(result.recordedRunRef, demo.runEnvelope.runRef);
  assert.deepEqual(result.replayedRunRef, demo.runEnvelope.runRef);
  assert.deepEqual(result.recordedOutputRefs, core.canonicalizeOutputRefs(demo.runEnvelope.outputRefs).refs);
  assert.deepEqual(result.replayedOutputRefs, core.canonicalizeOutputRefs(demo.runEnvelope.outputRefs).refs);
  assert.equal(result.verification.status, "verified");
  assert.equal(result.verification.mode, "replay_eligible");
  assert.deepEqual(result.mismatches, []);
  assert.deepEqual(result.errors, []);
  assert.equal("artifactFreshness" in result, false);
});

test("PR22 replays when complete MVP demo input is supplied through sourceObjects only", () => {
  const { input, demo } = createTruthPath();
  const result = core.replayRun({
    run: demo.runEnvelope,
    sourceObjects: [
      {
        sourceRef: { kind: "mvp-demo-input", ref: "mvp-demo:structured-input" },
        sourceObject: { ...input, id: "mvp-demo:structured-input" },
      },
    ],
    packLock: demo.packLock,
    operationContext: demo.operationContext,
  });

  assertReplayResult(result, "replayed", true);
  assert.equal(result.verification.status, "verified");
  assert.deepEqual(result.mismatches, []);
});

test("PR22 preserves non-blocking verification warnings as replayed_with_warnings", () => {
  const { input, demo } = createTruthPath();
  const warning = core.createCoreWarning({
    code: "ArtifactStale",
    message: "Synthetic non-blocking replay warning.",
    targetRef: demo.runEnvelope.id,
    sourceRef: { kind: "run", ref: demo.runEnvelope.id },
  });
  const result = core.replayRun(replayInput(input, demo, {
    run: { ...demo.runEnvelope, warnings: [warning] },
  }));

  assertReplayResult(result, "replayed_with_warnings", true);
  assert.equal(result.verification.status, "verified_with_warnings");
  assert.ok(result.warnings.some((candidate) => candidate.message === warning.message));
});

test("PR22 returns non_replayable when complete MVP source truth is missing", () => {
  const { demo } = createTruthPath();
  const result = core.replayRun({
    run: demo.runEnvelope,
    packLock: demo.packLock,
    operationContext: demo.operationContext,
  });

  assertReplayResult(result, "non_replayable", false);
  assert.ok(diagnosticCodes(result).includes("MissingSource"), diagnosticCodes(result).join(", "));
});

test("PR22 lets PR21 verification block replay before execution", () => {
  const { input, demo } = createTruthPath();

  const malformed = core.replayRun(null);
  assertReplayResult(malformed, "error", false);
  assert.ok(diagnosticCodes(malformed).includes("InvalidInputShape"));

  const unsupported = core.replayRun(replayInput(input, demo, {
    run: { ...demo.runEnvelope, operationName: "core.future.operation" },
  }));
  assertReplayResult(unsupported, "unsupported", false);
  assert.ok(diagnosticCodes(unsupported).includes("UnsupportedOperation"));

  const missingRuntimeObjects = core.replayRun({
    run: demo.runEnvelope,
    mvpDemoInput: input,
  });
  assertReplayResult(missingRuntimeObjects, "non_replayable", false);
  assert.ok(diagnosticCodes(missingRuntimeObjects).includes("MissingPackLock"));
  assert.ok(diagnosticCodes(missingRuntimeObjects).includes("MissingOperationContext"));

  const malformedSourceTruth = core.replayRun(replayInput({ kind: "mvp-demo-input" }, demo));
  assertReplayResult(malformedSourceTruth, "error", false);
  assert.ok(diagnosticCodes(malformedSourceTruth).includes("InvalidInputShape"));

  const explicitMismatch = core.replayRun(replayInput(input, demo, {
    expectedOutputRefs: [{ kind: "construction", ref: "construction:changed" }],
  }));
  assertReplayResult(explicitMismatch, "mismatch", false);
  assert.ok(explicitMismatch.mismatches.length > 0);
  assert.ok(diagnosticCodes(explicitMismatch).includes("MissingOutputRefs"));
});

test("PR22 reports replay mismatch after recomputation when structured MVP source truth differs", () => {
  const { input, demo } = createTruthPath();
  const changedInput = structuredClone(input);
  changedInput.compositionB.elements[0].id = "wide-left-changed";

  const result = core.replayRun(replayInput(changedInput, demo));

  assertReplayResult(result, "mismatch", true);
  assert.equal(result.verification.status, "verified");
  assert.ok(result.mismatches.some((mismatch) => mismatch.code === "OutputRefsMismatch"), result.mismatches.map((mismatch) => mismatch.code).join(", "));
  assert.notDeepEqual(result.replayedOutputRefs, result.recordedOutputRefs);
});

test("PR22 detects replay mismatch when MVP source geometry changes but ids stay stable", () => {
  const { input, demo } = createTruthPath();
  const changedInput = structuredClone(input);
  changedInput.compositionB.elements[0].geometry.width += 1;

  const result = core.replayRun(replayInput(changedInput, demo));

  assertReplayResult(result, "mismatch", true);
  assert.equal(result.verification.status, "verified");
  assert.ok(result.mismatches.some((mismatch) => mismatch.code === "MvpOutputMismatch"), result.mismatches.map((mismatch) => mismatch.code).join(", "));
});

test("PR22 reports specific mismatch codes without duplicate RecordedRunMismatch noise", () => {
  const { input, demo } = createTruthPath();
  const changedInput = structuredClone(input);
  changedInput.compositionB.elements[0].id = "wide-left-changed";

  const result = core.replayRun(replayInput(changedInput, demo));
  const mismatchCodes = result.mismatches.map((mismatch) => mismatch.code);

  assertReplayResult(result, "mismatch", true);
  assert.ok(mismatchCodes.includes("OutputRefsMismatch"), mismatchCodes.join(", "));
  assert.ok(mismatchCodes.includes("RunRefMismatch"), mismatchCodes.join(", "));
  assert.equal(mismatchCodes.includes("RecordedRunMismatch"), false, mismatchCodes.join(", "));
});

test("PR22 treats missing MVP rule-set source truth as explicit non-replayable input", () => {
  const { input, demo } = createTruthPath();
  const changedInput = structuredClone(input);
  changedInput.ruleSetRef = "rule-set:missing";

  const result = core.replayRun(replayInput(changedInput, demo));

  assertReplayResult(result, "non_replayable", false);
  assert.ok(diagnosticCodes(result).includes("MissingSource"), diagnosticCodes(result).join(", "));
});

test("PR22 treats malformed ratio packs without ruleSets as non-replayable instead of throwing", () => {
  const { input, demo } = createTruthPath();
  const changedInput = structuredClone(input);
  changedInput.ratioPack = {
    kind: "ratio-pack",
    id: input.packRef,
  };

  const result = core.replayRun(replayInput(changedInput, demo));

  assertReplayResult(result, "non_replayable", false);
  assert.ok(diagnosticCodes(result).includes("MissingSource"), diagnosticCodes(result).join(", "));
});

test("PR22 integrates explicit artifact freshness without accepting artifacts as source truth", () => {
  const { input, demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;

  const current = core.replayRun(replayInput(input, demo, {
    artifactFreshnessInputs: [freshnessInput(demo, artifact)],
  }));
  assertReplayResult(current, "replayed", true);
  assert.equal(current.artifactFreshness.length, 1);
  assert.equal(current.artifactFreshness[0].status, "current");

  const staleRequired = core.replayRun(replayInput(input, demo, {
    artifactFreshnessInputs: [freshnessInput(demo, { ...artifact, status: "stale" })],
    requireFreshArtifacts: true,
  }));
  assertReplayResult(staleRequired, "mismatch", false);
  assert.equal(staleRequired.artifactFreshness[0].status, "stale");
  assert.ok(diagnosticCodes(staleRequired).includes("ArtifactStale"));

  const nonReplayableRequired = core.replayRun(replayInput(input, demo, {
    artifactFreshnessInputs: [freshnessInput(demo, { ...artifact, status: "non_replayable" })],
    requireFreshArtifacts: true,
  }));
  assertReplayResult(nonReplayableRequired, "non_replayable", false);
  assert.equal(nonReplayableRequired.artifactFreshness[0].status, "non_replayable");
  assert.ok(diagnosticCodes(nonReplayableRequired).includes("ArtifactNonReplayable"));

  const nonReplayableOptional = core.replayRun(replayInput(input, demo, {
    artifactFreshnessInputs: [freshnessInput(demo, { ...artifact, status: "non_replayable" })],
    requireFreshArtifacts: false,
  }));
  assertReplayResult(nonReplayableOptional, "replayed_with_warnings", true);
  assert.equal(nonReplayableOptional.artifactFreshness[0].status, "non_replayable");
  assert.ok(diagnosticCodes(nonReplayableOptional).includes("ArtifactNonReplayable"));

  const artifactAsSource = core.replayRun(replayInput(input, demo, {
    sourceObjects: [demo.visualArtifactResult.output],
  }));
  assertReplayResult(artifactAsSource, "error", false);
  assert.ok(diagnosticCodes(artifactAsSource).includes("ArtifactWouldBecomeSourceOfTruth"));
});

test("PR22 canonicalizes replay results independently of unordered ref and source-object ordering", () => {
  const { input, demo } = createTruthPath();
  const first = core.replayRun(replayInput(input, demo, {
    expectedOutputRefs: demo.runEnvelope.outputRefs,
  }));
  const second = core.replayRun(replayInput(input, demo, {
    run: reversedRunOrdering(demo.runEnvelope),
    packLock: reverseObjectKeys(demo.packLock),
    operationContext: reverseObjectKeys(demo.operationContext),
    sourceObjects: sourceObjectsForRun(input).reverse(),
    expectedOutputRefs: [...demo.runEnvelope.outputRefs.refs].reverse(),
  }));

  assertReplayResult(first, "replayed", true);
  assertReplayResult(second, "replayed", true);
  assert.equal(canonicalReplay(first), canonicalReplay(second));
});

test("PR22 does not mutate recorded run, MVP input, runtime objects, source objects, or artifacts", () => {
  const { input, demo } = createTruthPath();
  const artifact = deepFreeze(structuredClone(demo.visualArtifactResult.output));
  const run = deepFreeze(structuredClone(demo.runEnvelope));
  const mvpDemoInput = deepFreeze(structuredClone(input));
  const packLock = deepFreeze(structuredClone(demo.packLock));
  const operationContext = deepFreeze(structuredClone(demo.operationContext));
  const sourceObjects = deepFreeze(sourceObjectsForRun(input));
  const freshness = deepFreeze(freshnessInput(demo, artifact));
  const before = structuredClone({ run, mvpDemoInput, packLock, operationContext, sourceObjects, artifact, freshness });

  const result = core.replayRun({
    run,
    mvpDemoInput,
    packLock,
    operationContext,
    sourceObjects,
    artifactFreshnessInputs: [freshness],
  });

  assert.ok(["replayed", "replayed_with_warnings"].includes(result.status));
  assert.deepEqual({ run, mvpDemoInput, packLock, operationContext, sourceObjects, artifact, freshness }, before);
});

test("PR22 run-replay runtime does not use filesystem, clock, randomness, or env source truth", () => {
  const source = readFileSync(join(repoRoot, "src", "run-replay.ts"), "utf8");

  assert.equal(/Date\.now|Math\.random|process\.env|fs\.readFile|readFileSync/.test(source), false);
  assert.equal(/createCli|createSdk|createMcp|MCP|adapter|cloud|camera|vision|CAD/.test(source), false);
});
