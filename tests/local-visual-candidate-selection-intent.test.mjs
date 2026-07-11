import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createControlledLocalLiveVisualCandidateCaptureV1,
  createControlledLocalLiveVisualCandidateResumeV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-demo.js";
import {
  finalizeLocalVisualCandidateSelectionIntentV1,
  validateLocalVisualCandidateSelectionIntentV1,
} from "../dist/src/local-report/local-visual-candidate-selection-intent.js";
import { runLocalVisualCandidateSelectionFinalizerCli, writeAtomicExclusive } from "../bin/norma-core-local-visual-candidate-selection-finalizer.mjs";

test("PR132 finalizes closed browser intent through the existing PR129 selection and resume gates", () => {
  const fixture = createFixture();
  const selection = finalize(fixture);

  assert.equal(selection.contractId, "norma.local-visual-human-candidate-selection@1");
  assert.equal(selection.acceptanceActor.actorId, "operator:local");
  assert.deepEqual(selection.selections.map(({ candidateId }) => candidateId), ["candidate:0", "candidate:1"]);
  assert.deepEqual(selection.authority, {
    explicitHumanSelection: true,
    providerAuthority: false,
    confidenceAuthority: false,
    automaticAcceptance: false,
    coordinateCorrectionAllowed: false,
    coordinateRepairAllowed: false,
  });

  const resume = createControlledLocalLiveVisualCandidateResumeV1({
    providerExecutionReceipt: fixture.capture.providerExecutionReceipt,
    candidateObservationEnvelope: fixture.capture.candidateObservationEnvelope,
    humanCandidateSelection: selection,
    acceptedAt: "2026-07-11T12:00:00.000Z",
  });
  assert.equal(resume.status, "completed");
  assert.equal(resume.execution.handoff.status, "completed");
  assert.equal(typeof resume.artifacts["result.json"], "string");
});

test("PR132 finalizer is deterministic and does not mutate inputs", () => {
  const fixture = createFixture();
  const before = structuredClone(fixture);
  assert.deepEqual(finalize(fixture), finalize(fixture));
  assert.deepEqual(fixture, before);
});

test("PR132 rejects missing confirmation, identity drift, unknown IDs, and reordered IDs", () => {
  const fixture = createFixture();
  assert.throws(() => finalize(fixture, { confirmExactSelection: false }), /explicit confirmation/u);
  const wrongImage = fixture.imageBytes.slice();
  wrongImage[24] ^= 1;
  assert.throws(() => finalize(fixture, { imageBytes: wrongImage }), /sourceImageContentIdentity/u);
  assert.throws(() => finalize(fixture, { selectedCandidateIds: ["candidate:missing"] }), /unknown candidate/u);
  assert.throws(() => finalize(fixture, { selectedCandidateIds: ["candidate:1", "candidate:0"] }), /preserve candidate envelope order/u);
});

test("PR132 finalizer rejects otherwise valid observations above the 64-candidate ceiling", () => {
  const fixture = createFixture(65);
  assert.throws(() => finalize(fixture), /at most 64 candidates/u);
});

test("PR132 intent validator rejects extras, accessors, proxies, sparse arrays, aliases, and unsafe values", () => {
  const fixture = createFixture();
  const intent = fixture.intent;
  assert.throws(() => validateLocalVisualCandidateSelectionIntentV1({ ...intent, confidence: 0.9 }), /closed fields/u);
  assert.throws(() => validateLocalVisualCandidateSelectionIntentV1(new Proxy(intent, {})), /Proxy/u);
  const accessor = { ...intent };
  Object.defineProperty(accessor, "geometryAction", { enumerable: true, get: () => "accept_exact" });
  assert.throws(() => validateLocalVisualCandidateSelectionIntentV1(accessor), /enumerable data property/u);
  const sparse = { ...intent, selectedCandidateIds: new Array(2) };
  sparse.selectedCandidateIds[1] = "candidate:0";
  assert.throws(() => validateLocalVisualCandidateSelectionIntentV1(sparse), /must not be sparse/u);
  const shared = { actorClass: "human", actorId: "operator:local" };
  assert.throws(() => validateLocalVisualCandidateSelectionIntentV1({ ...intent, acceptanceActor: shared, extra: shared }), /closed fields|aliased/u);
  assert.throws(() => validateLocalVisualCandidateSelectionIntentV1({ ...intent, contractVersion: Number.NaN }), /finite number/u);
});

test("PR132 CLI requires exact confirmation and writes one redacted selection record", async () => {
  const fixture = createFixture();
  const values = new Map([
    ["/receipt.json", fixture.capture.providerExecutionReceipt],
    ["/candidate.json", fixture.capture.candidateObservationEnvelope],
    ["/image.png", fixture.imageBytes],
    ["/intent.json", fixture.intent],
  ]);
  const writes = [];
  const stdout = captureStdout();
  const exitCode = await runLocalVisualCandidateSelectionFinalizerCli({
    args: [
      "--receipt", "/receipt.json",
      "--candidate", "/candidate.json",
      "--image", "/image.png",
      "--intent", "/intent.json",
      "--output", "/selection.json",
      "--confirm-exact-selection",
    ],
    stdout,
    options: {
      helpers: { finalizeLocalVisualCandidateSelectionIntentV1 },
      readSnapshot: async (path) => {
        const value = values.get(path);
        if (value instanceof Uint8Array) return value.slice();
        return new TextEncoder().encode(JSON.stringify(value));
      },
      writeFile: async (...args) => writes.push(args),
    },
  });
  assert.equal(exitCode, 0);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], "/selection.json");
  assert.deepEqual(writes[0][2], { encoding: "utf8", flag: "wx" });
  assert.equal(JSON.parse(stdout.text).status, "completed");
  assert.equal(JSON.parse(stdout.text).networkTransportUsed, false);

  const blocked = captureStdout();
  assert.equal(await runLocalVisualCandidateSelectionFinalizerCli({ args: [], stdout: blocked }), 1);
  assert.equal(JSON.parse(blocked.text).status, "invalid_cli_usage");
});

test("PR132 CLI remains package-private and contains no provider or network execution", async () => {
  const source = await readFile(new URL("../bin/norma-core-local-visual-candidate-selection-finalizer.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /api\.openai|Authorization|process\.env|\bfetch\b|XMLHttpRequest|WebSocket|node:https?|analyzeStructuredCompositionV1/u);
  assert.match(source, /flag:\s*"wx"/u);
  assert.match(source, /InputChangedDuringRead/u);
});

test("PR132 atomic output never replaces an existing file and removes partial temporaries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "norma-pr132-atomic-"));
  try {
    const output = join(directory, "selection.json");
    await writeFile(output, "existing", "utf8");
    await assert.rejects(() => writeAtomicExclusive(output, "replacement"));
    assert.equal(await readFile(output, "utf8"), "existing");

    let linked = false;
    let removed = false;
    await assert.rejects(() => writeAtomicExclusive(output, "partial", {
      open: async () => ({
        writeFile: async () => { throw new Error("DiskFull"); },
        sync: async () => undefined,
        close: async () => undefined,
      }),
      link: async () => { linked = true; },
      unlink: async () => { removed = true; },
    }), /DiskFull/u);
    assert.equal(linked, false);
    assert.equal(removed, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function createFixture(candidateCount = 2) {
  const imageBytes = pngBytes(640, 480);
  const rawProviderResponseBytes = providerResponseBytes(Array.from({ length: candidateCount }, (_, index) => ({
    x: (index % 8) / 10,
    y: (Math.floor(index / 8) % 8) / 10,
    width: 0.05,
    height: 0.05,
    providerConfidence: null,
  })));
  const capture = createControlledLocalLiveVisualCandidateCaptureV1({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    rawProviderResponseBytes,
    responseStatusCode: 200,
    timeoutMs: 30_000,
  });
  const candidate = capture.candidateObservationEnvelope;
  return {
    imageBytes,
    capture,
    intent: {
      contractId: "norma.local-visual-candidate-selection-intent@1",
      contractVersion: 1,
      candidateObservationId: candidate.observationId,
      candidateObservationContentIdentity: candidate.observationContentIdentity,
      providerExecutionReceiptContentIdentity: capture.providerExecutionReceipt.executionReceiptContentIdentity,
      reviewedSourceImageContentIdentity: candidate.sourceImage.contentIdentity,
      acceptanceActor: { actorClass: "human", actorId: "operator:local" },
      geometryAction: "accept_exact",
      selectedCandidateIds: candidate.rectangleCandidates.map(({ candidateId }) => candidateId),
    },
  };
}

function finalize(fixture, overrides = {}) {
  const intent = {
    ...fixture.intent,
    selectedCandidateIds: overrides.selectedCandidateIds ?? fixture.intent.selectedCandidateIds,
  };
  return finalizeLocalVisualCandidateSelectionIntentV1({
    providerExecutionReceipt: fixture.capture.providerExecutionReceipt,
    candidateObservationEnvelope: fixture.capture.candidateObservationEnvelope,
    sourcePngBytes: overrides.imageBytes ?? fixture.imageBytes,
    selectionIntent: intent,
    confirmExactSelection: overrides.confirmExactSelection ?? true,
  });
}

function pngBytes(width, height) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  setUint32Be(bytes, 8, 13);
  bytes.set([73, 72, 68, 82], 12);
  setUint32Be(bytes, 16, width);
  setUint32Be(bytes, 20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function providerResponseBytes(rectangles) {
  return new TextEncoder().encode(JSON.stringify({
    id: "response:test",
    object: "response",
    status: "completed",
    error: null,
    model: "configured-model",
    output: [{
      id: "message:test",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{
        type: "output_text",
        annotations: [],
        text: JSON.stringify({ schemaVersion: "controlled-rectangle-candidates@1", rectangles }),
      }],
    }],
  }));
}

function setUint32Be(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function captureStdout() {
  return { text: "", write(value) { this.text += value; } };
}
