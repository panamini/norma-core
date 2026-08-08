import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS,
  InMemoryPersonalVisualHarmonyPerceptionJobService,
  PersonalVisualHarmonyPerceptionJobError,
} from "../dist/src/personal-visual-harmony-perception-jobs.js";
import {
  PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID,
  PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID,
  preparePersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyCandidateSetV3,
  preparePersonalVisualHarmonyMultiPerceptionObservationV1,
} from "../dist/src/personal-visual-harmony.js";
import { serializeCanonicalJson } from "../dist/src/serialization.js";

const sourceBytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
const sourceImageContentIdentity =
  `sha256:${createHash("sha256").update(sourceBytes).digest("hex")}`;
const receiptIdentity = `sha256:${"a".repeat(64)}`;
const responseIdentity = `sha256:${"b".repeat(64)}`;
const requestIdentity = `sha256:${"c".repeat(64)}`;
const promptIdentity = `sha256:${"d".repeat(64)}`;
const provider = {
  providerId: "modal-sam3",
  modelId: "facebook/sam3",
  modelVersion: "3c879f39826c281e95690f02c7821c4de09afae7",
};
const mask = {
  contractId: "norma.personal-visual-harmony-segmentation-mask@1",
  contractVersion: 1,
  width: 10,
  height: 10,
  runs: [
    { y: 2, startX: 2, endXExclusive: 6 },
    { y: 3, startX: 2, endXExclusive: 6 },
    { y: 4, startX: 2, endXExclusive: 6 },
    { y: 5, startX: 2, endXExclusive: 6 },
  ],
};
const prompt = {
  points: [],
  box: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
};

function contentIdentityFor(value) {
  return `sha256:${createHash("sha256").update(serializeCanonicalJson(value)).digest("hex")}`;
}

function sourceImageReferenceIdentityFor(fileId) {
  return contentIdentityFor({
    kind: "chatgpt-file-reference",
    fileId,
  });
}

function emptyBaseCandidateSetIdentity(fileId, sourceImageMediaType = "image/png") {
  return contentIdentityFor({
    contractId: PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID,
    contractVersion: 1,
    status: "confirmation_required",
    sourceImageReferenceIdentity: sourceImageReferenceIdentityFor(fileId),
    sourceImageMediaType,
    imageBytesObservedByNorma: false,
    sourceImageIdentityBasis: "chatgpt_file_reference_not_image_bytes",
    visualInterpretationSource: "chatgpt",
    candidateEvidenceOnly: true,
    explicitSelectionConfirmationRequired: true,
    coreRun: false,
    coordinateFrame: {
      dimensions: 2,
      coordinateScale: "normalized",
      origin: "top-left",
      xDirection: "right",
      yDirection: "down",
      bounds: { x: [0, 1], y: [0, 1] },
    },
    candidates: [],
  });
}

function automaticCandidateSet(candidateCount = 1) {
  return preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-perception-test",
    sourceImageMediaType: "image/png",
    candidates: Array.from({ length: candidateCount }, (_, index) => ({
      id: index === 0 ? "frame" : `frame-${String(index + 1)}`,
      label: `Cadre ${String(index + 1)}`,
      role: "frame",
      reason: "Cadre visible.",
      x: 0.01 * index,
      y: 0.01 * index,
      width: 0.5,
      height: 0.5,
    })),
  });
}

function successfulProvider() {
  return {
    async segment() {
      return {
        response: {
          contractId: "norma.personal-visual-harmony-segmentation-response@1",
          contractVersion: 1,
          status: "ready",
          requestIdentity,
          sourceImageContentIdentity,
          provider,
          mask,
          providerConfidence: 0.9,
          abstentionReason: null,
        },
        receipt: {
          contractId: "norma.personal-visual-harmony-perception-receipt@1",
          contractVersion: 1,
          requestIdentity,
          sourceImageContentIdentity,
          promptIdentity,
          provider,
          responseIdentity,
          status: "ready",
          inferenceAttempts: 1,
          availabilityProbeCount: 1,
          candidateEvidenceOnly: true,
          sourceTruth: false,
          coreAuthority: false,
          coreRun: false,
          receiptIdentity,
        },
      };
    },
  };
}

function sourceFetch() {
  return async () => new Response(sourceBytes, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "content-length": String(sourceBytes.byteLength),
    },
  });
}

function createService(overrides = {}) {
  return new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider: successfulProvider(),
    fetch: sourceFetch(),
    allowedSourceImageOrigins: ["https://files.example.test"],
    createJobId: () => "job:perception-test",
    ...overrides,
  });
}

function startInput(prepared = automaticCandidateSet()) {
  return {
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceFileId: "file-perception-test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    expectedSourceImageContentIdentity: sourceImageContentIdentity,
    sourceImageUrl: "https://files.example.test/image.png",
    sourceImageMediaType: "image/png",
    prompt,
    label: "Zone SAM",
    role: "structural-region",
    automaticCandidateSet: prepared,
  };
}

async function waitForTerminal(service, binding) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = service.get(binding);
    if (job.state !== "pending") return job;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("job did not settle");
}

function deferred() {
  let resolve;
  const promise = new Promise((settle) => { resolve = settle; });
  return { promise, resolve };
}

test("prepare-time source captures share the bounded source-image reservation", async (t) => {
  const fetchGates = [];
  let activeFetches = 0;
  let maxActiveFetches = 0;
  const service = createService({
    capacity: 32,
    fetch: async () => {
      activeFetches += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      const gate = deferred();
      fetchGates.push(gate);
      try {
        await gate.promise;
        return new Response(sourceBytes, {
          status: 200,
          headers: {
            "content-type": "image/png",
            "content-length": String(sourceBytes.byteLength),
          },
        });
      } finally {
        activeFetches -= 1;
      }
    },
  });
  t.after(() => fetchGates.forEach((gate) => gate.resolve()));

  const captures = Array.from({ length: 5 }, (_, index) => service.captureSourceImageIdentity({
    sourceImageUrl: `https://files.example.test/image-${String(index + 1)}.png`,
    sourceImageMediaType: "image/png",
  }));

  await waitForCondition(() => fetchGates.length === 4);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchGates.length, 4);
  assert.equal(maxActiveFetches, 4);

  fetchGates[0].resolve();
  await waitForCondition(() => fetchGates.length === 5);
  assert.equal(maxActiveFetches, 4);
  fetchGates.slice(1).forEach((gate) => gate.resolve());

  const identities = await Promise.all(captures);
  assert.equal(identities.length, 5);
  assert.equal(identities.every((identity) => (
    identity.sourceImageContentIdentity === sourceImageContentIdentity
  )), true);
});

test("a failed prepare-time source capture releases its reservation", async () => {
  let fetchCalls = 0;
  const service = createService({
    capacity: 1,
    maxSourceImageBytes: 32 * 1024 * 1024,
    fetch: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) throw new Error("fixture download failed");
      return new Response(sourceBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(sourceBytes.byteLength),
        },
      });
    },
  });

  const failed = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/fail.png",
    sourceImageMediaType: "image/png",
  });
  const next = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/next.png",
    sourceImageMediaType: "image/png",
  });

  await assert.rejects(failed);
  assert.deepEqual(await next, {
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
  });
  assert.equal(fetchCalls, 2);
});

test("a queued prepare-time source capture does not start after its download deadline", async () => {
  let fetchCalls = 0;
  const service = createService({
    capacity: 1,
    maxSourceImageBytes: 32 * 1024 * 1024,
    downloadDeadlineMs: 500,
    fetch: async (_url, init) => {
      fetchCalls += 1;
      await new Promise((resolve, reject) => {
        const signal = init?.signal;
        const timeout = setTimeout(resolve, 2_000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(signal.reason ?? new Error("aborted"));
        }, { once: true });
      });
      return new Response(sourceBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(sourceBytes.byteLength),
        },
      });
    },
  });

  const active = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/active.png",
    sourceImageMediaType: "image/png",
  });
  const queued = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/queued.png",
    sourceImageMediaType: "image/png",
  });

  const [activeResult, queuedResult] = await Promise.allSettled([active, queued]);
  assert.equal(activeResult.status, "rejected");
  assert.equal(queuedResult.status, "rejected");
  assert.equal(fetchCalls, 1);
});

test("prepare-time source capture queue rejects work beyond bounded service capacity", async (t) => {
  const fetchGate = deferred();
  let fetchCalls = 0;
  const service = createService({
    capacity: 1,
    maxSourceImageBytes: 32 * 1024 * 1024,
    fetch: async () => {
      fetchCalls += 1;
      await fetchGate.promise;
      return new Response(sourceBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(sourceBytes.byteLength),
        },
      });
    },
  });
  t.after(() => fetchGate.resolve());

  const active = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/active.png",
    sourceImageMediaType: "image/png",
  });
  await waitForCondition(() => fetchCalls === 1);
  const queued = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/queued.png",
    sourceImageMediaType: "image/png",
  });
  const overflow = service.captureSourceImageIdentity({
    sourceImageUrl: "https://files.example.test/overflow.png",
    sourceImageMediaType: "image/png",
  });

  const overflowResult = await Promise.race([
    overflow.then(
      () => ({ status: "fulfilled" }),
      (error) => ({ status: "rejected", code: error?.code }),
    ),
    new Promise((resolve) => setImmediate(() => resolve({ status: "pending" }))),
  ]);
  assert.deepEqual(overflowResult, {
    status: "rejected",
    code: "source_download_failed",
  });

  fetchGate.resolve();
  await Promise.all([active, queued]);
  assert.equal(fetchCalls, 2);
});

async function waitForCondition(predicate) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("condition did not settle");
}

test("perception job produces truthful V2 candidate evidence without Core authority", async () => {
  const service = createService();
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));
  assert.equal(pending.state, "pending");
  assert.equal(pending.coreRun, false);
  assert.equal(pending.durable, false);
  const ready = await waitForTerminal(service, {
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });
  assert.equal(ready.state, "ready");
  assert.equal(ready.preparedCandidateSet.contractId, PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID);
  assert.equal(ready.preparedCandidateSet.contractVersion, 2);
  assert.equal(ready.preparedCandidateSet.visualInterpretationSource, "hybrid");
  assert.equal(ready.preparedCandidateSet.imageBytesObservedByNorma, true);
  assert.equal(ready.preparedCandidateSet.perceptionReceiptIdentity, receiptIdentity);
  assert.equal(ready.preparedCandidateSet.explicitSelectionConfirmationRequired, true);
  assert.equal(ready.preparedCandidateSet.coreRun, false);
  assert.equal(ready.coreAuthority, false);
  assert.equal("acceptedGeometry" in ready, false);
});

test("two-object perception jobs append exactly two ordered rectangle observations without Core", async () => {
  let call = 0;
  let job = 0;
  const service = createService({
    createJobId: () => `job:two-object-${String(++job)}`,
    provider: {
      async segment() {
        call += 1;
        const suffix = call === 1 ? "1" : "2";
        const currentMask = call === 1
          ? mask
          : {
              ...mask,
              runs: [
                { y: 2, startX: 6, endXExclusive: 9 },
                { y: 3, startX: 6, endXExclusive: 9 },
                { y: 4, startX: 6, endXExclusive: 9 },
              ],
            };
        return {
          response: {
            ...(await successfulProvider().segment()).response,
            requestIdentity: `sha256:${suffix.repeat(64)}`,
            mask: currentMask,
          },
          receipt: {
            ...(await successfulProvider().segment()).receipt,
            requestIdentity: `sha256:${suffix.repeat(64)}`,
            promptIdentity: `sha256:${(call === 1 ? "3" : "4").repeat(64)}`,
            responseIdentity: `sha256:${(call === 1 ? "5" : "6").repeat(64)}`,
            receiptIdentity: `sha256:${(call === 1 ? "7" : "8").repeat(64)}`,
          },
        };
      },
    },
  });
  const base = automaticCandidateSet();
  const pendingA = service.start({
    ...startInput(base),
    workflowMode: "two-object-spatial",
    attemptOrdinal: 1,
    label: "Objet A",
    role: "primary-subject",
  });
  const readyA = await waitForTerminal(service, {
    jobId: pendingA.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
  });
  assert.equal(readyA.state, "ready", JSON.stringify(readyA));
  assert.equal(readyA.preparedCandidateSet.contractVersion, 3);
  assert.equal(readyA.preparedCandidateSet.perceptionManifest.observations.length, 1);
  assert.equal(readyA.preparedCandidateSet.candidates.at(-1).role, "primary-subject");
  assert.equal(readyA.coreRun, false);

  const pendingB = service.start({
    ...startInput(readyA.preparedCandidateSet),
    prompt: { kind: "text", text: "bicycle" },
    workflowMode: "two-object-spatial",
    attemptOrdinal: 2,
    label: "Objet B",
    role: "secondary-subject",
  });
  const readyB = await waitForTerminal(service, {
    jobId: pendingB.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
  });
  assert.equal(readyB.state, "ready", JSON.stringify(readyB));
  assert.deepEqual(
    readyB.preparedCandidateSet.perceptionManifest.observations.map(({ ordinal, role }) => ({ ordinal, role })),
    [
      { ordinal: 1, role: "primary-subject" },
      { ordinal: 2, role: "secondary-subject" },
    ],
  );
  assert.equal(new Set(readyB.preparedCandidateSet.perceptionManifest.observations
    .map(({ providerReceiptIdentity }) => providerReceiptIdentity)).size, 2);
  assert.equal(readyB.preparedCandidateSet.candidates.at(-1).primitive.kind, "rectangle");
  assert.equal(readyB.coreRun, false);
  assert.throws(
    () => service.start({
      ...startInput(readyB.preparedCandidateSet),
      workflowMode: "two-object-spatial",
      attemptOrdinal: 2,
      label: "Objet C",
      role: "secondary-subject",
    }),
    /exactly one current object observation/u,
  );
});

test("object B preserves a SAM-only V3 parent interpretation source", async () => {
  const service = createService();
  const fileId = "file-perception-test";
  const sourceImageReferenceIdentity = sourceImageReferenceIdentityFor(fileId);
  const observationA = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
    ordinal: 1,
    role: "primary-subject",
    normalizedPrompt: { kind: "text", text: "person" },
    parentCandidateSetIdentity: emptyBaseCandidateSetIdentity(fileId),
    sourceImageReferenceIdentity,
    sourceImageContentIdentity,
    providerReceiptIdentity: `sha256:${"1".repeat(64)}`,
    maskIdentity: `sha256:${"2".repeat(64)}`,
    perceptionIdentity: `sha256:${"3".repeat(64)}`,
    candidateId: "sam3-object-a-only",
    originalRectangle: { x: 0.2, y: 0.2, width: 0.2, height: 0.3 },
  });
  const candidateA = {
    id: observationA.candidateId,
    label: "Objet A",
    role: observationA.role,
    reason: "Observation SAM bornée",
    ...observationA.originalRectangle,
    primitive: { kind: "rectangle" },
    sourceImageReferenceIdentity,
  };
  const preparedA = preparePersonalVisualHarmonyCandidateSetV3({
    sourceFileId: fileId,
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: sourceImageReferenceIdentity,
    visualInterpretationSource: "sam3",
    observations: [observationA],
    candidates: [candidateA],
  });
  const pendingB = service.start({
    ...startInput(preparedA),
    prompt: { kind: "text", text: "bicycle" },
    workflowMode: "two-object-spatial",
    attemptOrdinal: 2,
    label: "Objet B",
    role: "secondary-subject",
  });
  const readyB = await waitForTerminal(service, {
    jobId: pendingB.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity,
  });
  assert.equal(readyB.state, "ready", JSON.stringify(readyB));
  assert.equal(readyB.preparedCandidateSet.visualInterpretationSource, "sam3");
  assert.equal(
    readyB.preparedCandidateSet.perceptionManifest.observations[1].parentCandidateSetIdentity,
    preparedA.candidateSetIdentity,
  );
});

test("perception job forwards one normalized semantic target without confirmation or Core", async () => {
  const prompts = [];
  const service = createService({
    provider: {
      async segment(input) {
        prompts.push(input.prompt);
        return successfulProvider().segment(input);
      },
    },
  });
  const prepared = automaticCandidateSet();
  const pending = service.start({
    ...startInput(prepared),
    prompt: { kind: "text", text: "  person   " },
  });
  const ready = await waitForTerminal(service, {
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });
  assert.deepEqual(prompts, [{ kind: "text", text: "person" }]);
  assert.equal(ready.state, "ready");
  assert.equal(ready.preparedCandidateSet.explicitSelectionConfirmationRequired, true);
  assert.equal(ready.coreRun, false);
});

test("perception job rejects invalid semantic targets before creating a provider job", () => {
  let providerCalls = 0;
  const service = createService({
    provider: {
      async segment() {
        providerCalls += 1;
        return successfulProvider().segment();
      },
    },
  });
  assert.throws(
    () => service.start({
      ...startInput(),
      prompt: { kind: "text", text: "   " },
    }),
    (error) => error instanceof PersonalVisualHarmonyPerceptionJobError
      && error.code === "request_invalid",
  );
  assert.equal(providerCalls, 0);
});

test("perception job preserves a provider abstention without candidates", async () => {
  const provider = {
    async segment() {
      const result = await successfulProvider().segment();
      return {
        response: {
          ...result.response,
          status: "abstained",
          mask: null,
          providerConfidence: null,
          abstentionReason: "no_mask",
        },
        receipt: { ...result.receipt, status: "abstained" },
      };
    },
  };
  const service = createService({ provider });
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));
  const job = await waitForTerminal(service, {
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });
  assert.equal(job.state, "abstained");
  assert.equal(job.preparedCandidateSet, null);
  assert.equal(job.coreRun, false);
});

test("perception jobs reject stale subject, session, and source bindings", () => {
  const service = createService();
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));
  for (const mismatch of [
    { subjectId: "subject:other", sessionId: "session:test", sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity },
    { subjectId: "subject:test", sessionId: "session:other", sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity },
    { subjectId: "subject:test", sessionId: "session:test", sourceImageReferenceIdentity: `sha256:${"0".repeat(64)}` },
  ]) {
    assert.throws(
      () => service.get({ jobId: pending.jobId, ...mismatch }),
      (error) => error instanceof PersonalVisualHarmonyPerceptionJobError
        && error.code === "job_binding_mismatch",
    );
  }
});

test("a provider that never settles reaches one deterministic terminal failure", async () => {
  let providerCalls = 0;
  const service = createService({
    provider: {
      async segment() {
        providerCalls += 1;
        return new Promise(() => {});
      },
    },
    executionDeadlineMs: 10,
  });
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));

  await new Promise((resolve) => setTimeout(resolve, 25));

  const failed = service.get({
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });
  assert.equal(failed.state, "failed");
  assert.equal(failed.errorCode, "job_execution_timeout");
  assert.equal(failed.preparedCandidateSet, null);
  assert.equal(failed.coreRun, false);
  assert.equal(providerCalls, 1);
});

test("cold-start source-byte retention stays bounded below full job capacity", async (t) => {
  const providerGates = [];
  let releaseImmediately = false;
  t.after(() => {
    releaseImmediately = true;
    providerGates.forEach((gate) => gate.resolve());
  });
  let jobCount = 0;
  const service = createService({
    capacity: 32,
    createJobId: () => `job:retained-source-${String(++jobCount)}`,
    provider: {
      async segment(input) {
        if (releaseImmediately) return successfulProvider().segment(input);
        const gate = deferred();
        providerGates.push(gate);
        await gate.promise;
        return successfulProvider().segment(input);
      },
    },
  });
  const prepared = automaticCandidateSet();
  const jobs = Array.from({ length: 32 }, (_, index) => service.start({
    ...startInput(prepared),
    sessionId: `session:retained-source-${String(index + 1)}`,
  }));

  await waitForCondition(() => providerGates.length >= 4);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(providerGates.length, 4);

  let released = 0;
  while (released < jobs.length) {
    const expectedVisible = Math.min(released + 4, jobs.length);
    await waitForCondition(() => providerGates.length === expectedVisible);
    const batch = providerGates.slice(released, expectedVisible);
    assert.equal(batch.length, Math.min(4, jobs.length - released));
    batch.forEach((gate) => gate.resolve());
    released = expectedVisible;
  }
  const terminalJobs = await Promise.all(jobs.map((job, index) => waitForTerminal(service, {
    jobId: job.jobId,
    subjectId: "subject:test",
    sessionId: `session:retained-source-${String(index + 1)}`,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  })));
  assert.equal(terminalJobs.every((job) => job.state === "ready"), true);
  assert.equal(terminalJobs.every((job) => job.coreRun === false), true);
});

test("a queued source reservation never dispatches after its job times out", async () => {
  const providerGates = [];
  let jobCount = 0;
  let now = 0;
  const service = createService({
    capacity: 2,
    executionDeadlineMs: 20,
    maxSourceImageBytes: 32 * 1024 * 1024,
    now: () => now,
    createJobId: () => `job:queued-timeout-${String(++jobCount)}`,
    provider: {
      async segment(input) {
        const gate = deferred();
        providerGates.push(gate);
        await gate.promise;
        return successfulProvider().segment(input);
      },
    },
  });
  const prepared = automaticCandidateSet();
  const first = service.start({ ...startInput(prepared), sessionId: "session:queued-first" });
  const second = service.start({ ...startInput(prepared), sessionId: "session:queued-second" });

  await waitForCondition(() => providerGates.length >= 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(providerGates.length, 1);

  now = 20;
  providerGates[0].resolve();
  await waitForCondition(() => service.get({
    jobId: first.jobId,
    subjectId: "subject:test",
    sessionId: "session:queued-first",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  }).state === "failed");
  assert.equal(service.get({
    jobId: first.jobId,
    subjectId: "subject:test",
    sessionId: "session:queued-first",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  }).errorCode, "job_execution_timeout");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(providerGates.length, 1);
  assert.equal(service.get({
    jobId: second.jobId,
    subjectId: "subject:test",
    sessionId: "session:queued-second",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  }).errorCode, "job_execution_timeout");
});

test("a queued job is not admitted when the bounded provider window no longer fits", async (t) => {
  const providerGates = [];
  let fetchCalls = 0;
  let jobCount = 0;
  let now = 0;
  t.after(() => providerGates.forEach((gate) => gate.resolve()));
  const service = createService({
    capacity: 2,
    executionDeadlineMs: DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS,
    maxSourceImageBytes: 32 * 1024 * 1024,
    now: () => now,
    createJobId: () => `job:queued-budget-${String(++jobCount)}`,
    fetch: async () => {
      fetchCalls += 1;
      return new Response(sourceBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(sourceBytes.byteLength),
        },
      });
    },
    provider: {
      async segment(input) {
        const gate = deferred();
        providerGates.push(gate);
        await gate.promise;
        return successfulProvider().segment(input);
      },
    },
  });
  const prepared = automaticCandidateSet();
  const first = service.start({ ...startInput(prepared), sessionId: "session:queued-budget-first" });
  const second = service.start({ ...startInput(prepared), sessionId: "session:queued-budget-second" });

  await waitForCondition(() => providerGates.length >= 1);
  assert.equal(fetchCalls, 1);
  now = DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS - 29_999;
  providerGates[0].resolve();
  await waitForCondition(() => service.get({
    jobId: second.jobId,
    subjectId: "subject:test",
    sessionId: "session:queued-budget-second",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  }).state === "failed");
  assert.equal(providerGates.length, 1);
  assert.equal(fetchCalls, 1);
  assert.equal(service.get({
    jobId: first.jobId,
    subjectId: "subject:test",
    sessionId: "session:queued-budget-first",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  }).state, "ready");
  assert.equal(service.get({
    jobId: second.jobId,
    subjectId: "subject:test",
    sessionId: "session:queued-budget-second",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  }).errorCode, "job_execution_timeout");
});

test("a queued job uses the provider's configured shorter deadline for admission", async (t) => {
  const providerGates = [];
  let fetchCalls = 0;
  let jobCount = 0;
  let now = 0;
  t.after(() => providerGates.forEach((gate) => gate.resolve()));
  const service = createService({
    capacity: 5,
    executionDeadlineMs: DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS,
    now: () => now,
    createJobId: () => `job:configured-provider-budget-${String(++jobCount)}`,
    fetch: async () => {
      fetchCalls += 1;
      return new Response(sourceBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(sourceBytes.byteLength),
        },
      });
    },
    provider: {
      deadlineMs: 60_000,
      async segment(input) {
        const gate = deferred();
        providerGates.push(gate);
        await gate.promise;
        return successfulProvider().segment(input);
      },
    },
  });
  const prepared = automaticCandidateSet();
  const jobs = Array.from({ length: 5 }, (_, index) => service.start({
    ...startInput(prepared),
    sessionId: `session:configured-provider-budget-${String(index + 1)}`,
  }));

  await waitForCondition(() => providerGates.length >= 4);
  assert.equal(fetchCalls, 4);
  now = 60_000;
  providerGates[0].resolve();
  await waitForCondition(() => providerGates.length >= 5);
  assert.equal(fetchCalls, 5);

  providerGates.forEach((gate) => gate.resolve());
  const terminalJobs = await Promise.all(jobs.map((job, index) => waitForTerminal(service, {
    jobId: job.jobId,
    subjectId: "subject:test",
    sessionId: `session:configured-provider-budget-${String(index + 1)}`,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  })));
  assert.equal(terminalJobs.every((job) => job.state === "ready"), true);
  assert.equal(terminalJobs.every((job) => job.coreRun === false), true);
});

test("a provider failure terminalizes once without candidates or Core", async () => {
  let providerCalls = 0;
  const service = createService({
    provider: {
      async segment() {
        providerCalls += 1;
        throw new Error("provider unavailable");
      },
    },
  });
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));
  const failed = await waitForTerminal(service, {
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });

  assert.equal(failed.state, "failed");
  assert.equal(failed.errorCode, "perception_failed");
  assert.equal(failed.preparedCandidateSet, null);
  assert.equal(failed.coreRun, false);
  assert.equal(providerCalls, 1);
});

test("perception jobs expire and enforce bounded capacity", () => {
  let now = Date.parse("2026-07-27T10:00:00.000Z");
  let jobCount = 0;
  const neverProvider = { segment: async () => new Promise(() => {}) };
  const service = createService({
    provider: neverProvider,
    now: () => now,
    ttlMs: 1_000,
    capacity: 1,
    createJobId: () => `job:expiry-${String(++jobCount)}`,
  });
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));
  assert.throws(
    () => service.start({ ...startInput(prepared), sessionId: "session:second" }),
    (error) => error.code === "capacity_exhausted",
  );
  now += 1_000;
  const replacement = service.start({ ...startInput(prepared), sessionId: "session:second" });
  assert.equal(replacement.state, "pending");
  const expired = service.get({
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });
  assert.equal(expired.state, "expired");
  assert.equal(expired.errorCode, "job_expired");
  assert.equal(expired.preparedCandidateSet, null);
});

test("perception jobs reserve room for the largest bounded segmentation candidate set", () => {
  const service = createService();
  const saturated = automaticCandidateSet(10);
  assert.throws(
    () => service.start(startInput(saturated)),
    (error) => error instanceof PersonalVisualHarmonyPerceptionJobError
      && error.code === "request_invalid",
  );
});

test("the existing prepared candidate V1 contract remains unchanged", () => {
  const prepared = automaticCandidateSet();
  assert.equal(prepared.contractId, PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID);
  assert.equal(prepared.contractVersion, 1);
  assert.equal(prepared.imageBytesObservedByNorma, false);
  assert.equal(prepared.sourceImageIdentityBasis, "chatgpt_file_reference_not_image_bytes");
  assert.equal(prepared.visualInterpretationSource, "chatgpt");
  assert.equal("sourceImageContentIdentity" in prepared, false);
  assert.equal("perceptionReceiptIdentity" in prepared, false);
});
