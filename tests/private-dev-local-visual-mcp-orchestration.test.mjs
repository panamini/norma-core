import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createControlledLocalLiveVisualCandidateCaptureV1,
  createControlledLocalLiveVisualCandidateResumeV1,
  finalizeLocalVisualHumanCandidateSelectionIdentityV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-demo.js";
import {
  inspectPrivateDevLocalVisualMcpJobV1,
  resumePrivateDevLocalVisualMcpJobV1,
} from "../dist/src/local-report/private-dev-local-visual-mcp-orchestration.js";

const ACCEPTED_AT = "2026-07-11T12:00:00.000Z";

test("PR134 inspection validates the finalized job and exposes only bounded redacted facts", () => {
  const fixture = createFixture();
  const before = structuredClone(fixture.artifacts);
  const inspection = inspectPrivateDevLocalVisualMcpJobV1(fixture.artifacts);

  assert.deepEqual(inspection, {
    kind: "norma.private-dev-local-visual-mcp-job-inspection.v1",
    version: 1,
    status: "ready_to_resume",
    providerExecutionReceiptContentIdentity:
      fixture.capture.providerExecutionReceipt.executionReceiptContentIdentity,
    candidateObservationContentIdentity:
      fixture.capture.candidateObservationEnvelope.observationContentIdentity,
    humanSelectionContentIdentity: fixture.selection.selectionContentIdentity,
    candidateCount: 2,
    selectedCandidateCount: 2,
    resumeAllowed: true,
    logicalArtifacts: {
      providerExecutionReceipt: "provider-execution-receipt.json",
      candidateObservation: "candidate-observation.json",
      humanSelection: "human-candidate-selection.json",
      outputDirectory: "norma-output",
    },
    acceptedGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    networkTransportUsed: false,
    redacted: true,
  });
  assert.deepEqual(fixture.artifacts, before);
  const serialized = JSON.stringify(inspection);
  assert.doesNotMatch(serialized, /operator:private-dev|"x"|"y"|providerConfidence|sourceImage|localPath|https?:/u);
});

test("PR134 resume matches the existing PR129 canonical result bytes and identities", () => {
  const fixture = createFixture();
  const request = resumeRequest(fixture);
  const execution = resumePrivateDevLocalVisualMcpJobV1(fixture.artifacts, request);
  const direct = createControlledLocalLiveVisualCandidateResumeV1({
    providerExecutionReceipt: fixture.capture.providerExecutionReceipt,
    candidateObservationEnvelope: fixture.capture.candidateObservationEnvelope,
    humanCandidateSelection: fixture.selection,
    acceptedAt: ACCEPTED_AT,
  });

  assert.equal(execution.result.status, "completed");
  assert.equal(execution.result.canonicalResultJson, "result.json");
  assert.deepEqual(execution.artifactContents, direct.artifacts);
  assert.equal(execution.result.canonicalTruth, "result.json");
  assert.equal(execution.result.derivedArtifactsAuthoritative, false);
  assert.equal(execution.result.mcpEnvelopeAuthoritative, false);
  assert.equal(execution.result.providerMetadataInfluencedComputation, false);
  assert.equal(execution.result.networkTransportUsed, false);
  assert.equal(
    `sha256:${createHash("sha256").update(execution.artifactContents["result.json"], "utf8").digest("hex")}`,
    execution.result.canonicalResultJsonContentIdentity,
  );
  assert.doesNotMatch(JSON.stringify(execution.result), /operator:private-dev/u);
});

test("PR134 resume rejects every stale identity before Core execution", () => {
  const fixture = createFixture();
  for (const [field, code] of [
    ["expectedProviderExecutionReceiptContentIdentity", "stale_provider_execution_receipt"],
    ["expectedCandidateObservationContentIdentity", "stale_candidate_observation"],
    ["expectedHumanSelectionContentIdentity", "stale_human_selection"],
  ]) {
    assert.throws(
      () => resumePrivateDevLocalVisualMcpJobV1(fixture.artifacts, {
        ...resumeRequest(fixture),
        [field]: `sha256:${"f".repeat(64)}`,
      }),
      (error) => error?.code === code,
      field,
    );
  }
});

test("PR134 rejects malformed confirmation and accepted-at values without output", () => {
  const fixture = createFixture();
  assert.throws(
    () => resumePrivateDevLocalVisualMcpJobV1(fixture.artifacts, null),
    (error) => error?.code === "artifact_contract_invalid",
  );
  assert.throws(
    () => resumePrivateDevLocalVisualMcpJobV1(fixture.artifacts, {
      ...resumeRequest(fixture),
      confirmResumeFinalizedSelection: false,
    }),
    (error) => error?.code === "invalid_resume_confirmation",
  );
  assert.throws(
    () => resumePrivateDevLocalVisualMcpJobV1(fixture.artifacts, {
      ...resumeRequest(fixture),
      acceptedAt: "2026-07-11",
    }),
    (error) => error?.code === "invalid_accepted_at",
  );
  assert.throws(
    () => resumePrivateDevLocalVisualMcpJobV1(fixture.artifacts, {
      ...resumeRequest(fixture),
      acceptedAt: "2026-02-30T12:00:00.000Z",
    }),
    (error) => error?.code === "invalid_accepted_at",
  );
});

test("PR134 rejects receipt/candidate/selection substitution instead of repairing it", () => {
  const first = createFixture();
  const second = createFixture([
    { x: 0.12, y: 0.11, width: 0.24, height: 0.21, providerConfidence: null },
    { x: 0.52, y: 0.18, width: 0.16, height: 0.31, providerConfidence: null },
  ]);
  for (const artifacts of [
    { ...first.artifacts, providerExecutionReceipt: second.artifacts.providerExecutionReceipt },
    { ...first.artifacts, candidateObservationEnvelope: second.artifacts.candidateObservationEnvelope },
    { ...first.artifacts, humanCandidateSelection: second.artifacts.humanCandidateSelection },
  ]) {
    assert.throws(
      () => inspectPrivateDevLocalVisualMcpJobV1(artifacts),
      (error) => ["artifact_contract_invalid", "artifact_linkage_mismatch"].includes(error?.code),
    );
  }
});

function createFixture(rectangles = [
  { x: 0.1, y: 0.15, width: 0.2, height: 0.25, providerConfidence: null },
  { x: 0.5, y: 0.2, width: 0.18, height: 0.3, providerConfidence: null },
]) {
  const capture = createControlledLocalLiveVisualCandidateCaptureV1({
    sourceImageBytes: pngBytes(640, 480),
    sourceImageMediaType: "image/png",
    rawProviderResponseBytes: providerResponseBytes(rectangles),
    responseStatusCode: 200,
    timeoutMs: 30_000,
  });
  const candidate = capture.candidateObservationEnvelope;
  const selection = finalizeLocalVisualHumanCandidateSelectionIdentityV1({
    contractId: "norma.local-visual-human-candidate-selection@1",
    contractVersion: 1,
    selectionId: `human-selection:private-dev:${candidate.observationContentIdentity.slice(-16)}`,
    candidateObservationId: candidate.observationId,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    providerExecutionReceiptContentIdentity:
      capture.providerExecutionReceipt.executionReceiptContentIdentity,
    acceptanceActor: { actorClass: "human", actorId: "operator:private-dev" },
    geometryAction: "accept_exact",
    selections: candidate.rectangleCandidates.map(({ candidateId }, order) => ({
      order,
      candidateId,
      acceptedPrimitiveId: `accepted-rectangle:${String(order + 1)}`,
    })),
    authority: {
      explicitHumanSelection: true,
      providerAuthority: false,
      confidenceAuthority: false,
      automaticAcceptance: false,
      coordinateCorrectionAllowed: false,
      coordinateRepairAllowed: false,
    },
  });
  return {
    capture,
    selection,
    artifacts: {
      providerExecutionReceipt: capture.providerExecutionReceipt,
      candidateObservationEnvelope: candidate,
      humanCandidateSelection: selection,
    },
  };
}

function resumeRequest(fixture) {
  return {
    expectedProviderExecutionReceiptContentIdentity:
      fixture.capture.providerExecutionReceipt.executionReceiptContentIdentity,
    expectedCandidateObservationContentIdentity:
      fixture.capture.candidateObservationEnvelope.observationContentIdentity,
    expectedHumanSelectionContentIdentity: fixture.selection.selectionContentIdentity,
    acceptedAt: ACCEPTED_AT,
    confirmResumeFinalizedSelection: true,
  };
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
    id: "response:pr134-test",
    object: "response",
    status: "completed",
    error: null,
    model: "configured-model",
    output: [{
      id: "message:pr134-test",
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
