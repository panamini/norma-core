import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  InMemoryPersonalVisualHarmonyPerceptionJobService,
  PersonalVisualHarmonyPerceptionJobError,
} from "../dist/src/personal-visual-harmony-perception-jobs.js";
import {
  PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID,
  PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID,
  preparePersonalVisualHarmonyCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";

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

function automaticCandidateSet() {
  return preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-perception-test",
    sourceImageMediaType: "image/png",
    candidates: [{
      id: "frame",
      label: "Cadre",
      role: "frame",
      reason: "Cadre visible.",
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.9,
    }],
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

test("perception jobs expire and enforce bounded capacity", () => {
  let now = Date.parse("2026-07-27T10:00:00.000Z");
  const neverProvider = { segment: async () => new Promise(() => {}) };
  const service = createService({
    provider: neverProvider,
    now: () => now,
    ttlMs: 1_000,
    capacity: 1,
  });
  const prepared = automaticCandidateSet();
  const pending = service.start(startInput(prepared));
  assert.throws(
    () => service.start({ ...startInput(prepared), sessionId: "session:second" }),
    (error) => error.code === "capacity_exhausted",
  );
  now += 1_000;
  const expired = service.get({
    jobId: pending.jobId,
    subjectId: "subject:test",
    sessionId: "session:test",
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
  });
  assert.equal(expired.state, "expired");
  assert.equal(expired.preparedCandidateSet, null);
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
