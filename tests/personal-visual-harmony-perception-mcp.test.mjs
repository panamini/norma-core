import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  createPersonalVisualHarmonyMcpServerV1,
  createPersonalVisualHarmonyWidgetHtmlV1,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
  PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
  PERSONAL_VISUAL_HARMONY_SEMANTIC_TARGETS_V1,
  PersonalVisualHarmonySessionServiceV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import {
  InMemoryPersonalVisualHarmonyPerceptionJobService,
} from "../dist/src/personal-visual-harmony-perception-jobs.js";
import {
  preparePersonalVisualHarmonyMultiPerceptionObservationV1,
  preparePersonalVisualHarmonyCandidateSetV2,
  preparePersonalVisualHarmonyCandidateSetV3,
} from "../dist/src/personal-visual-harmony.js";
import {
  createDeclaredSpatialMeasurementPlanV1,
} from "../dist/src/personal-visual-harmony-spatial-measurements.js";

const sourceBytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
const sourceImageContentIdentity =
  `sha256:${createHash("sha256").update(sourceBytes).digest("hex")}`;
const receiptIdentity = `sha256:${"a".repeat(64)}`;

function candidates() {
  return [{
    id: "frame",
    label: "Cadre",
    role: "frame",
    reason: "Cadre visible.",
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  }];
}

function triangleCandidates() {
  return [
    ...candidates(),
    {
      id: "diagonal",
      label: "Diagonale",
      role: "structural-region",
      reason: "Segment visible.",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.2, y: 0.8 },
        end: { x: 0.8, y: 0.2 },
      },
    },
  ];
}

function triangleConstructionRequests() {
  return [{
    requestId: "explicit-triangle",
    vertices: [
      {
        point: { x: 0.2, y: 0.8 },
        parent: {
          kind: "observed-line-endpoint",
          candidateId: "diagonal",
          endpoint: "start",
        },
      },
      {
        point: { x: 0.8, y: 0.2 },
        parent: {
          kind: "observed-line-endpoint",
          candidateId: "diagonal",
          endpoint: "end",
        },
      },
      {
        point: { x: 0, y: 0 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
            { kind: "frame-edge", frameEdgeIndex: 0 },
          ],
        },
      },
    ],
  }];
}

function successfulProvider(prompts = []) {
  return {
    async segment(input) {
      prompts.push(input.prompt);
      return {
        response: {
          contractId: "norma.personal-visual-harmony-segmentation-response@1",
          contractVersion: 1,
          status: "ready",
          requestIdentity: `sha256:${"b".repeat(64)}`,
          sourceImageContentIdentity,
          provider: {
            providerId: "modal-sam3",
            modelId: "facebook/sam3",
            modelVersion: "3c879f39826c281e95690f02c7821c4de09afae7",
          },
          mask: {
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
          },
          providerConfidence: 0.9,
          abstentionReason: null,
        },
        receipt: {
          contractId: "norma.personal-visual-harmony-perception-receipt@1",
          contractVersion: 1,
          requestIdentity: `sha256:${"b".repeat(64)}`,
          sourceImageContentIdentity,
          promptIdentity: `sha256:${"c".repeat(64)}`,
          provider: {
            providerId: "modal-sam3",
            modelId: "facebook/sam3",
            modelVersion: "3c879f39826c281e95690f02c7821c4de09afae7",
          },
          responseIdentity: `sha256:${"d".repeat(64)}`,
          status: "ready",
          inferenceAttempts: 1,
          availabilityProbeCount: 0,
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

function perceptionJobs(downloadedUrls, prompts) {
  return new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider: successfulProvider(prompts),
    allowedSourceImageOrigins: ["https://files.example.test"],
    fetch: async (url) => {
      downloadedUrls?.push(String(url));
      return new Response(sourceBytes, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(sourceBytes.byteLength),
        },
      });
    },
    createJobId: () => "job:mcp-perception-test",
  });
}

async function connect({ service, jobs, subjectId }) {
  const server = createPersonalVisualHarmonyMcpServerV1({
    service,
    perceptionJobs: jobs,
    ...(subjectId === undefined ? {} : { subjectId }),
  });
  const client = new Client(
    { name: "norma-perception-auth-test", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

async function prepare(client, preparedCandidates = candidates()) {
  return client.callTool({
    name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    arguments: {
      image: {
        download_url: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=old&se=2026-07-27",
        file_id: "file-perception-mcp",
        mime_type: "image/png",
      },
      candidates: preparedCandidates,
    },
  });
}

test("perception tools stay unavailable when the authenticated subject boundary is absent", async () => {
  const connected = await connect({
    service: new PersonalVisualHarmonySessionServiceV1(),
    jobs: perceptionJobs(),
  });
  try {
    const listed = await connected.client.listTools();
    assert.deepEqual(listed.tools.map(({ name }) => name).sort(), [
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
    ].sort());
    const prepared = await prepare(connected.client);
    const serialized = JSON.stringify(prepared);
    assert.doesNotMatch(serialized, /perceptionAppCapability|pvh-app:/u);
  } finally {
    await connected.close();
  }
});

test("prepare withholds perception capability for unsupported media and insufficient candidate capacity", async () => {
  const connected = await connect({
    service: new PersonalVisualHarmonySessionServiceV1(),
    jobs: perceptionJobs(),
    subjectId: "subject:owner",
  });
  try {
    for (const preparation of [
      {
        image: {
          download_url: "https://files.example.test/image.gif",
          file_id: "file-gif",
          mime_type: "image/gif",
        },
        candidates: candidates(),
      },
      {
        image: {
          download_url: "https://files.example.test/image.png",
          file_id: "file-saturated",
          mime_type: "image/png",
        },
        candidates: Array.from({ length: 11 }, (_, index) => ({
          id: `frame-${String(index + 1)}`,
          label: `Cadre ${String(index + 1)}`,
          role: "frame",
          reason: "Cadre visible.",
          x: index * 0.01,
          y: index * 0.01,
          width: 0.5,
          height: 0.5,
        })),
      },
    ]) {
      const result = await connected.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
        arguments: preparation,
      });
      assert.equal(result.isError, undefined, JSON.stringify(result));
      assert.equal(
        "perceptionAppCapability" in result._meta.normaPersonalVisualHarmony,
        false,
      );
    }
  } finally {
    await connected.close();
  }
});

test("ten-candidate preparation issues a capability only for the bounded A/B workflow", async () => {
  const connected = await connect({
    service: new PersonalVisualHarmonySessionServiceV1(),
    jobs: perceptionJobs(),
    subjectId: "subject:owner",
  });
  try {
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image?file=file-ten-candidates&sig=fresh",
          file_id: "file-ten-candidates",
          mime_type: "image/png",
        },
        candidates: Array.from({ length: 10 }, (_, index) => ({
          id: `frame-${String(index + 1)}`,
          label: `Cadre ${String(index + 1)}`,
          role: "frame",
          reason: "Cadre visible.",
          x: index * 0.01,
          y: index * 0.01,
          width: 0.5,
          height: 0.5,
        })),
      },
    });
    assert.equal(prepared.isError, undefined, JSON.stringify(prepared));
    const payload = prepared._meta.normaPersonalVisualHarmony;
    assert.match(payload.perceptionAppCapability, /^pvh-app:/u);
    assert.deepEqual(payload.perceptionModes, ["two-object-spatial"]);

    const sharedArguments = {
      sessionId: payload.sessionId,
      candidateSetIdentity: payload.prepared.candidateSetIdentity,
      appCapability: payload.perceptionAppCapability,
      sourceImageDownloadUrl:
        "https://files.example.test/private-signed-image?file=file-ten-candidates&sig=fresh",
      label: "client label ignored",
      role: "frame",
    };
    const legacy = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        ...sharedArguments,
        prompt: { points: [], box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
      },
    });
    assert.equal(legacy.isError, true);

    const objectA = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        ...sharedArguments,
        semanticTarget: "person",
        workflowMode: "two-object-spatial",
        guidedAnalysisGoal: "compare-two-lengths",
      },
    });
    assert.equal(objectA.isError, undefined, JSON.stringify(objectA));
    assert.equal(objectA.structuredContent.attemptOrdinal, 1);
  } finally {
    await connected.close();
  }
});

test("widget exposes an A/B-only capability only through compare-two-lengths", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function updatePerceptionUi(){");
  const end = html.indexOf("\nfunction perceptionPromptFor(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const state = {
    payload: {
      perceptionAppCapability: "pvh-app:" + "a".repeat(32),
      perceptionModes: ["two-object-spatial"],
      prepared: {
        contractVersion: 1,
        candidates: Array.from({ length: 10 }, (_, index) => ({ id: `frame-${String(index)}` })),
      },
    },
    guidedAnalysisGoal: "general-geometry",
    multiPerceptionTerminalState: null,
    completed: false,
    confirming: false,
    pixelRefinementRunning: false,
    perceptionRunning: false,
    manualSegmentCandidateId: null,
    imageReady: true,
  };
  const perceptionToggle = {};
  const updatePerceptionUi = new Function(
    "state",
    "perceptionToggle",
    "multiPerceptionObservationCount",
    "eligibleInteractivePerceptionCandidates",
    "multiPerceptionStartBlocked",
    `"use strict";${html.slice(start, end)};return updatePerceptionUi;`,
  )(
    state,
    perceptionToggle,
    () => 0,
    () => state.payload.prepared.candidates,
    () => state.manualSegmentCandidateId !== null,
  );

  updatePerceptionUi();
  assert.equal(perceptionToggle.hidden, true);

  state.guidedAnalysisGoal = "compare-two-lengths";
  updatePerceptionUi();
  assert.equal(perceptionToggle.hidden, false);
  assert.equal(perceptionToggle.disabled, false);
  assert.equal(perceptionToggle.textContent, "Proposer l’objet A");

  state.manualSegmentCandidateId = "manual-segment-1";
  updatePerceptionUi();
  assert.equal(perceptionToggle.hidden, false);
  assert.equal(perceptionToggle.disabled, true);
});

test("edited perception geometry preserves explicit triangle requests", () => {
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:edited-perception-triangle",
    now: () => 0,
  });
  const prepared = service.prepare({
    subjectId: "subject:owner",
    fileId: "file-edited-perception-triangle",
    mediaType: "image/png",
    candidates: triangleCandidates(),
    triangleConstructionRequests: triangleConstructionRequests(),
  });
  const preparedV2 = preparePersonalVisualHarmonyCandidateSetV2({
    sourceFileId: "file-edited-perception-triangle",
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: prepared.prepared.sourceImageReferenceIdentity,
    visualInterpretationSource: "hybrid",
    perceptionReceiptIdentity: receiptIdentity,
    candidates: prepared.prepared.candidates.map((candidate) => ({
      ...candidate,
      sourceImageReferenceIdentity: prepared.prepared.sourceImageReferenceIdentity,
    })),
    triangleConstructionRequests: prepared.prepared.triangleConstructionRequests,
  });
  service.applyPerceptionResult({
    subjectId: "subject:owner",
    sessionId: prepared.sessionId,
    expectedCandidateSetIdentity: prepared.prepared.candidateSetIdentity,
    preparedCandidateSet: preparedV2,
  });
  const reviewedCandidates = preparedV2.candidates.map(
    ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => (
      candidate.id === "frame"
        ? { ...candidate, x: 0.04, width: 0.91 }
        : candidate
    ),
  );
  const confirmed = service.confirm({
    subjectId: "subject:owner",
    sessionId: prepared.sessionId,
    candidateSetIdentity: preparedV2.candidateSetIdentity,
    selectedCandidateIds: ["frame"],
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 1_000,
    reviewedCandidates,
  });
  assert.deepEqual(
    confirmed.prepared.triangleConstructionRequests,
    preparedV2.triangleConstructionRequests,
  );
});

test("app-only perception enforces capability, subject, session, and explicit confirmation boundaries", async () => {
  let sessionNow = 0;
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-perception-test",
    now: () => sessionNow,
    sessionTtlMs: 1_000,
  });
  const downloadedUrls = [];
  const jobs = perceptionJobs(downloadedUrls);
  const owner = await connect({ service, jobs, subjectId: "subject:owner" });
  let other;
  try {
    const listed = await owner.client.listTools();
    for (const name of [
      PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    ]) {
      const tool = listed.tools.find((candidate) => candidate.name === name);
      assert.ok(tool);
      assert.deepEqual(tool._meta.ui.visibility, ["app"]);
      assert.equal(Object.hasOwn(tool._meta.ui, "resourceUri"), false);
    }

    const prepared = await prepare(owner.client);
    assert.equal(prepared.structuredContent.coreRun, false);
    assert.equal(prepared.structuredContent.imageBytesObservedByNorma, false);
    assert.doesNotMatch(
      JSON.stringify([prepared.content, prepared.structuredContent]),
      /private-signed-image|perceptionAppCapability|pvh-app:/u,
    );
    const privatePayload = prepared._meta.normaPersonalVisualHarmony;
    assert.match(privatePayload.perceptionAppCapability, /^pvh-app:/u);
    assert.deepEqual(privatePayload.perceptionModes, ["legacy", "two-object-spatial"]);

    const unauthorized = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: "x".repeat(32),
        sourceImageDownloadUrl: "https://files.example.test/fresh-unauthorized.png",
        prompt: {
          points: [],
          box: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        },
        label: "Zone SAM",
        role: "structural-region",
      },
    });
    assert.equal(unauthorized.isError, true);
    assert.doesNotMatch(JSON.stringify(unauthorized), /private-signed-image|pvh-app:/u);

    const mismatchedSource = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=different-file&sig=fresh",
        prompt: {
          points: [],
          box: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        },
        label: "Zone SAM",
        role: "structural-region",
      },
    });
    assert.equal(mismatchedSource.isError, true);
    assert.deepEqual(downloadedUrls, []);

    const started = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh&se=2026-07-28",
        prompt: {
          points: [],
          box: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        },
        label: "Zone SAM",
        role: "structural-region",
      },
    });
    assert.equal(started.isError, undefined, JSON.stringify(started));
    assert.equal(started.structuredContent.state, "pending");
    assert.equal(started.structuredContent.coreRun, false);
    assert.match(started.structuredContent.expiresAt, /Z$/u);

    other = await connect({ service, jobs, subjectId: "subject:other" });
    const crossSubject = await other.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        jobId: started.structuredContent.jobId,
      },
    });
    assert.equal(crossSubject.isError, true);

    let status;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      status = await owner.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
        arguments: {
          sessionId: privatePayload.sessionId,
          candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
          appCapability: privatePayload.perceptionAppCapability,
          jobId: started.structuredContent.jobId,
        },
      });
      if (status.structuredContent?.state !== "pending") break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(status.isError, undefined, JSON.stringify(status));
    assert.equal(status.structuredContent.state, "ready");
    assert.equal(status.structuredContent.perceptionReceiptIdentity, receiptIdentity);
    assert.equal(status.structuredContent.coreRun, false);
    assert.equal(status.structuredContent.explicitSelectionConfirmationRequired, true);
    assert.equal(status._meta.normaPersonalVisualHarmony.prepared.visualInterpretationSource, "hybrid");
    assert.equal(status._meta.normaPersonalVisualHarmony.prepared.imageBytesObservedByNorma, true);
    assert.deepEqual(downloadedUrls, [
      "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh&se=2026-07-28",
    ]);
    assert.equal("acceptedGeometry" in status.structuredContent, false);
    assert.equal("result" in status.structuredContent, false);

    const repeatedStatus = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        jobId: started.structuredContent.jobId,
      },
    });
    assert.equal(repeatedStatus.isError, undefined, JSON.stringify(repeatedStatus));
    assert.equal(
      repeatedStatus.structuredContent.candidateSetIdentity,
      status.structuredContent.candidateSetIdentity,
    );

    const recoveryCandidates = status._meta.normaPersonalVisualHarmony.prepared.candidates.map(
      ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => candidate,
    );
    const reviewedCandidates = recoveryCandidates.map(
      (candidate) => (
        candidate.id === "frame"
          ? { ...candidate, x: 0.04, width: 0.91 }
          : candidate
      ),
    );
    const recovery = {
      fileId: "file-perception-mcp",
      sourceImageMediaType: "image/png",
      candidates: recoveryCandidates,
      contractVersion: 2,
      sourceImageContentIdentity,
      visualInterpretationSource: "hybrid",
      perceptionReceiptIdentity: receiptIdentity,
    };
    sessionNow = 1_001;
    const forgedReceiptIdentity = `sha256:${"e".repeat(64)}`;
    const forgedPrepared = preparePersonalVisualHarmonyCandidateSetV2({
      sourceFileId: recovery.fileId,
      sourceImageContentIdentity,
      sourceImageMediaType: recovery.sourceImageMediaType,
      expectedSourceImageReferenceIdentity:
        status._meta.normaPersonalVisualHarmony.prepared.sourceImageReferenceIdentity,
      visualInterpretationSource: "hybrid",
      perceptionReceiptIdentity: forgedReceiptIdentity,
      candidates: status._meta.normaPersonalVisualHarmony.prepared.candidates,
    });
    const forgedRecovery = {
      ...recovery,
      perceptionReceiptIdentity: forgedReceiptIdentity,
    };
    const forgedConfirmation = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: forgedPrepared.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 1_000,
        confirmClientReviewedSelection: true,
        recovery: forgedRecovery,
      },
    });
    assert.equal(forgedConfirmation.isError, true);

    const recoveredPixelCandidate = recoveryCandidates.find(
      ({ primitive }) => primitive?.kind === "axis",
    );
    assert.ok(recoveredPixelCandidate);
    const recoveredPixelProposal = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: status.structuredContent.candidateSetIdentity,
        candidateId: recoveredPixelCandidate.id,
        reviewedPrimitive: recoveredPixelCandidate.primitive,
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 1_000,
        recovery,
      },
    });
    assert.equal(recoveredPixelProposal.isError, undefined, JSON.stringify(recoveredPixelProposal));
    assert.equal(
      recoveredPixelProposal.structuredContent.sessionRecovered,
      true,
    );
    sessionNow = 2_002;
    const confirmed = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: status.structuredContent.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 1_000,
        reviewedCandidates,
        confirmClientReviewedSelection: true,
        recovery,
      },
    });
    assert.equal(confirmed.isError, undefined, JSON.stringify(confirmed));
    assert.equal(confirmed.structuredContent.coreRun, true);
    assert.equal(confirmed.structuredContent.explicitSelectionConfirmation, true);
    assert.equal(confirmed._meta.normaPersonalVisualHarmony.sessionRecovered, true);
    assert.notEqual(
      confirmed.structuredContent.candidateSetIdentity,
      status.structuredContent.candidateSetIdentity,
    );
    assert.equal(confirmed._meta.normaPersonalVisualHarmony.result.imageBytesObservedByNorma, true);
    assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.imageBytesObservedByNorma, true);

    const repeatedConfirmation = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: status.structuredContent.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 1_000,
        reviewedCandidates,
        confirmClientReviewedSelection: true,
        recovery,
      },
    });
    assert.equal(repeatedConfirmation.isError, undefined, JSON.stringify(repeatedConfirmation));
    assert.equal(
      repeatedConfirmation.structuredContent.canonicalResultIdentity,
      confirmed.structuredContent.canonicalResultIdentity,
    );
    sessionNow = 4_001;
    const expiredEvidenceConfirmation = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: status.structuredContent.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 1_000,
        confirmClientReviewedSelection: true,
        recovery,
      },
    });
    assert.equal(expiredEvidenceConfirmation.isError, true);
  } finally {
    await other?.close();
    await owner.close();
  }
});

test("two-object MCP workflow is atomic, bounded to A then B, and emits full reviewed provenance", async () => {
  let providerCallCount = 0;
  let jobCount = 0;
  const provider = {
    async segment(input) {
      providerCallCount += 1;
      const first = providerCallCount === 1;
      const digit = first ? "1" : "2";
      const currentMask = first
        ? {
            contractId: "norma.personal-visual-harmony-segmentation-mask@1",
            contractVersion: 1,
            width: 10,
            height: 10,
            runs: [
              { y: 1, startX: 1, endXExclusive: 4 },
              { y: 2, startX: 1, endXExclusive: 4 },
              { y: 3, startX: 1, endXExclusive: 4 },
            ],
          }
        : {
            contractId: "norma.personal-visual-harmony-segmentation-mask@1",
            contractVersion: 1,
            width: 10,
            height: 10,
            runs: [
              { y: 5, startX: 6, endXExclusive: 9 },
              { y: 6, startX: 6, endXExclusive: 9 },
              { y: 7, startX: 6, endXExclusive: 9 },
            ],
          };
      return {
        response: {
          contractId: "norma.personal-visual-harmony-segmentation-response@1",
          contractVersion: 1,
          status: "ready",
          requestIdentity: `sha256:${digit.repeat(64)}`,
          sourceImageContentIdentity,
          provider: {
            providerId: "modal-sam3",
            modelId: "facebook/sam3",
            modelVersion: "test-snapshot",
          },
          mask: currentMask,
          providerConfidence: 0.9,
          abstentionReason: null,
        },
        receipt: {
          contractId: "norma.personal-visual-harmony-perception-receipt@1",
          contractVersion: 1,
          requestIdentity: `sha256:${digit.repeat(64)}`,
          sourceImageContentIdentity,
          promptIdentity: `sha256:${(first ? "3" : "4").repeat(64)}`,
          provider: {
            providerId: "modal-sam3",
            modelId: "facebook/sam3",
            modelVersion: "test-snapshot",
          },
          responseIdentity: `sha256:${(first ? "5" : "6").repeat(64)}`,
          status: "ready",
          inferenceAttempts: 1,
          availabilityProbeCount: 0,
          candidateEvidenceOnly: true,
          sourceTruth: false,
          coreAuthority: false,
          coreRun: false,
          receiptIdentity: `sha256:${(first ? "7" : "8").repeat(64)}`,
        },
      };
    },
  };
  const jobs = new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider,
    allowedSourceImageOrigins: ["https://files.example.test"],
    fetch: async () => new Response(sourceBytes, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(sourceBytes.byteLength),
      },
    }),
    createJobId: () => `job:mcp-two-object-${String(++jobCount)}`,
  });
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-two-object",
  });
  const connected = await connect({ service, jobs, subjectId: "subject:owner" });
  const statusUntilTerminal = async (payload, pending) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await connected.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
        arguments: {
          sessionId: payload.sessionId,
          candidateSetIdentity: payload.prepared.candidateSetIdentity,
          appCapability: payload.perceptionAppCapability,
          jobId: pending.structuredContent.jobId,
        },
      });
      if (status.structuredContent?.state !== "pending") return status;
      await new Promise((resolve) => setImmediate(resolve));
    }
    throw new Error("two-object job did not settle");
  };
  try {
    const initial = await prepare(connected.client);
    const payload0 = initial._meta.normaPersonalVisualHarmony;
    const startArguments = (payload, semanticTarget) => ({
      sessionId: payload.sessionId,
      candidateSetIdentity: payload.prepared.candidateSetIdentity,
      appCapability: payload.perceptionAppCapability,
      sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh",
      semanticTarget,
      label: "client label ignored",
      role: "frame",
      workflowMode: "two-object-spatial",
      guidedAnalysisGoal: "compare-two-lengths",
    });
    const startedA = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments(payload0, "person"),
    });
    assert.equal(startedA.isError, undefined, JSON.stringify(startedA));
    assert.equal(startedA.structuredContent.attemptOrdinal, 1);
    const concurrent = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments(payload0, "bicycle"),
    });
    assert.equal(concurrent.isError, true);

    const statusA = await statusUntilTerminal(payload0, startedA);
    assert.equal(statusA.structuredContent.state, "ready");
    assert.equal(statusA.structuredContent.coreRun, false);
    const payloadA = statusA._meta.normaPersonalVisualHarmony;
    assert.equal(payloadA.prepared.contractVersion, 3);
    assert.equal(payloadA.prepared.perceptionManifest.observations.length, 1);
    assert.equal(payloadA.prepared.candidates.at(-1).role, "primary-subject");

    const staleB = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments(payload0, "bicycle"),
    });
    assert.equal(staleB.isError, true);
    assert.equal(providerCallCount, 1);

    const duplicateB = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments(payloadA, "person"),
    });
    assert.equal(duplicateB.isError, true);
    assert.equal(providerCallCount, 1);

    const earlyConfirm = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: payloadA.sessionId,
        candidateSetIdentity: payloadA.prepared.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 800,
        confirmClientReviewedSelection: true,
      },
    });
    assert.equal(earlyConfirm.isError, true);

    const startedB = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments(payloadA, "bicycle"),
    });
    assert.equal(startedB.isError, undefined, JSON.stringify(startedB));
    assert.equal(startedB.structuredContent.attemptOrdinal, 2);
    const statusB = await statusUntilTerminal(payloadA, startedB);
    assert.equal(statusB.structuredContent.state, "ready");
    assert.equal(statusB.structuredContent.coreRun, false);
    assert.equal(providerCallCount, 2);
    const payloadB = statusB._meta.normaPersonalVisualHarmony;
    assert.equal(payloadB.prepared.perceptionManifest.observations.length, 2);
    const objectIds = payloadB.prepared.perceptionManifest.observations.map(({ candidateId }) => candidateId);
    assert.equal(objectIds.every((id) => !payloadB.selectedCandidateIds?.includes(id)), true);

    const ordinaryConfirm = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: payloadB.sessionId,
        candidateSetIdentity: payloadB.prepared.candidateSetIdentity,
        selectedCandidateIds: objectIds,
        sourcePixelWidth: 1000,
        sourcePixelHeight: 800,
        confirmClientReviewedSelection: true,
      },
    });
    assert.equal(ordinaryConfirm.isError, true);

    const mismatchedObjectIds = ["frame", objectIds[0]];
    const mismatchedPlan = createDeclaredSpatialMeasurementPlanV1({
      sourceIdentity: sourceImageContentIdentity,
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
      candidates: payloadB.prepared.candidates,
      selectedRectangleCandidateIds: mismatchedObjectIds,
      expressions: mismatchedObjectIds.map((candidateId) => ({
        kind: "extent",
        owner: { kind: "rectangle", candidateId },
        extent: "width",
      })),
    });
    const mismatchedConfirm = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: payloadB.sessionId,
        candidateSetIdentity: payloadB.prepared.candidateSetIdentity,
        selectedCandidateIds: mismatchedObjectIds,
        sourcePixelWidth: 1000,
        sourcePixelHeight: 800,
        confirmClientReviewedSelection: true,
        declaredSpatialMeasurementPlan: mismatchedPlan,
        recovery: {
          fileId: "file-perception-mcp",
          sourceImageMediaType: "image/png",
          candidates: payloadB.prepared.candidates.map(
            ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => candidate,
          ),
          contractVersion: 3,
          sourceImageContentIdentity,
          visualInterpretationSource: payloadB.prepared.visualInterpretationSource,
          workflowMode: "two-object-spatial",
          perceptionManifest: payloadB.prepared.perceptionManifest,
        },
      },
    });
    assert.equal(mismatchedConfirm.isError, true);
    assert.match(
      JSON.stringify(mismatchedConfirm),
      /Successful two-object perception must confirm exactly objects A and B/u,
    );

    const third = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments(payloadB, "person"),
    });
    assert.equal(third.isError, true);
    assert.equal(providerCallCount, 2);

    const reviewedCandidates = payloadB.prepared.candidates.map((candidate) => {
      if (candidate.id === "frame") {
        return { ...candidate, x: candidate.x + 0.01, width: candidate.width - 0.01 };
      }
      if (candidate.id === objectIds[0]) {
        return { ...candidate, x: candidate.x + 0.01, width: candidate.width - 0.01 };
      }
      return candidate;
    });
    const plan = createDeclaredSpatialMeasurementPlanV1({
      sourceIdentity: sourceImageContentIdentity,
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
      candidates: reviewedCandidates,
      selectedRectangleCandidateIds: objectIds,
      expressions: objectIds.map((candidateId) => ({
        kind: "extent",
        owner: { kind: "rectangle", candidateId },
        extent: "width",
      })),
    });
    const confirmationArguments = {
      sessionId: payloadB.sessionId,
      candidateSetIdentity: payloadB.prepared.candidateSetIdentity,
      selectedCandidateIds: objectIds,
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
      reviewedCandidates: reviewedCandidates.map(
        ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => candidate,
      ),
      confirmClientReviewedSelection: true,
      declaredSpatialMeasurementPlan: plan,
      recovery: {
        fileId: "file-perception-mcp",
        sourceImageMediaType: "image/png",
        candidates: payloadB.prepared.candidates.map(
          ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => candidate,
        ),
        contractVersion: 3,
        sourceImageContentIdentity,
        visualInterpretationSource: payloadB.prepared.visualInterpretationSource,
        workflowMode: "two-object-spatial",
        perceptionManifest: payloadB.prepared.perceptionManifest,
      },
    };
    const completed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: confirmationArguments,
    });
    assert.equal(completed.isError, undefined, JSON.stringify(completed));
    assert.equal(completed.structuredContent.coreRun, true);
    assert.equal(completed.structuredContent.declaredSpatialMeasurementConfirmation.coreExecutionCount, 1);
    assert.deepEqual(
      completed.structuredContent.multiPerceptionReceipt.perceptionManifest,
      payloadB.prepared.perceptionManifest,
    );
    assert.deepEqual(
      completed.structuredContent.multiPerceptionReceipt.observations.map(({ userEdited }) => userEdited),
      [true, false],
    );
    assert.match(completed.structuredContent.multiPerceptionReceipt.receiptIdentity, /^sha256:[0-9a-f]{64}$/u);
    const replay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: structuredClone(confirmationArguments),
    });
    assert.equal(replay.isError, undefined, JSON.stringify(replay));
    assert.deepEqual(replay.structuredContent, completed.structuredContent);
    assert.equal(replay.structuredContent.declaredSpatialMeasurementConfirmation.coreExecutionCount, 1);
    assert.equal(providerCallCount, 2);
  } finally {
    await connected.close();
  }
});

test("terminal object-B abstention is replay-safe and permits only its one-observation recovery", async () => {
  let now = Date.parse("2026-07-31T10:00:00.000Z");
  let providerCalls = 0;
  const readyProvider = successfulProvider();
  const provider = {
    async segment(input) {
      providerCalls += 1;
      const result = await readyProvider.segment(input);
      if (input.prompt.kind === "text" && input.prompt.text === "person") return result;
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
  const jobs = new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider,
    allowedSourceImageOrigins: ["https://files.example.test"],
    fetch: async () => new Response(sourceBytes, {
      status: 200,
      headers: { "content-type": "image/png", "content-length": String(sourceBytes.byteLength) },
    }),
    createJobId: (() => { let count = 0; return () => `job:terminal-${String(++count)}`; })(),
    now: () => now,
    ttlMs: 1_000,
  });
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => now,
    sessionTtlMs: 2_000,
    createSessionId: (() => { let count = 0; return () => `session:terminal-${String(++count)}`; })(),
  });
  const connected = await connect({ service, jobs, subjectId: "subject:owner" });
  const poll = async (payload, pending) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await connected.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
        arguments: {
          sessionId: payload.sessionId,
          candidateSetIdentity: payload.prepared.candidateSetIdentity,
          appCapability: payload.perceptionAppCapability,
          jobId: pending.structuredContent.jobId,
        },
      });
      if (status.structuredContent?.state !== "pending") return status;
      await new Promise((resolve) => setImmediate(resolve));
    }
    throw new Error("terminal job did not settle");
  };
  const start = (payload, semanticTarget) => connected.client.callTool({
    name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
    arguments: {
      sessionId: payload.sessionId,
      candidateSetIdentity: payload.prepared.candidateSetIdentity,
      appCapability: payload.perceptionAppCapability,
      sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=terminal",
      semanticTarget,
      label: "ignored",
      role: "frame",
      workflowMode: "two-object-spatial",
      guidedAnalysisGoal: "compare-two-lengths",
    },
  });
  try {
    const initial = (await prepare(connected.client, [
      ...candidates(),
      {
        id: "panel",
        label: "Panneau",
        role: "structural-region",
        reason: "Panneau visible.",
        x: 0.15,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      },
    ]))._meta.normaPersonalVisualHarmony;
    const terminalA = await poll(initial, await start(initial, "person"));
    assert.equal(terminalA.structuredContent.state, "ready");
    const payloadA = terminalA._meta.normaPersonalVisualHarmony;
    assert.throws(
      () => service.assertMultiPerceptionRecoveryEvidence({
        subjectId: "subject:owner",
        fileId: "file-perception-mcp",
        preparedCandidateSet: payloadA.prepared,
      }),
      /missing, expired, or invalid/u,
    );
    const terminalB = await poll(payloadA, await start(payloadA, "bicycle"));
    assert.equal(terminalB.structuredContent.state, "abstained");
    assert.equal(
      service.assertMultiPerceptionRecoveryEvidence({
        subjectId: "subject:owner",
        fileId: "file-perception-mcp",
        preparedCandidateSet: payloadA.prepared,
      }),
      "object-b-failed",
    );
    assert.throws(
      () => service.assertMultiPerceptionRecoveryEvidence({
        subjectId: "subject:owner",
        fileId: "file-perception-mcp",
        preparedCandidateSet: {
          ...payloadA.prepared,
          visualInterpretationSource: payloadA.prepared.visualInterpretationSource === "hybrid"
            ? "sam3"
            : "hybrid",
        },
      }),
      /missing, expired, or invalid/u,
    );
    const replayB = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: {
        sessionId: payloadA.sessionId,
        candidateSetIdentity: payloadA.prepared.candidateSetIdentity,
        appCapability: payloadA.perceptionAppCapability,
        jobId: terminalB.structuredContent.jobId,
      },
    });
    assert.equal(replayB.isError, undefined, JSON.stringify(replayB));
    assert.deepEqual(replayB.structuredContent, terminalB.structuredContent);

    const objectAId = payloadA.prepared.perceptionManifest.observations[0].candidateId;
    const rectangleIds = ["frame", objectAId];
    const planFor = (selectedRectangleCandidateIds) => createDeclaredSpatialMeasurementPlanV1({
      sourceIdentity: sourceImageContentIdentity,
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
      candidates: payloadA.prepared.candidates,
      selectedRectangleCandidateIds,
      expressions: selectedRectangleCandidateIds.map((candidateId) => ({
        kind: "extent",
        owner: { kind: "rectangle", candidateId },
        extent: "width",
      })),
    });
    const plan = planFor(rectangleIds);
    const recoveryCandidates = payloadA.prepared.candidates.map(
      ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => candidate,
    );
    const rebuilt = preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: "file-perception-mcp",
      sourceImageContentIdentity,
      sourceImageMediaType: "image/png",
      visualInterpretationSource: payloadA.prepared.visualInterpretationSource,
      observations: payloadA.prepared.perceptionManifest.observations,
      candidates: recoveryCandidates.map((candidate) => (
        payloadA.prepared.perceptionManifest.observations.some(
          (observation) => observation.candidateId === candidate.id,
        )
          ? {
              ...candidate,
              sourceImageReferenceIdentity: payloadA.prepared.sourceImageReferenceIdentity,
            }
          : candidate
      )),
    });
    assert.equal(rebuilt.candidateSetIdentity, payloadA.prepared.candidateSetIdentity);
    now += 2_001;
    const recoveryConfirmationArguments = {
      sessionId: payloadA.sessionId,
      candidateSetIdentity: payloadA.prepared.candidateSetIdentity,
      selectedCandidateIds: rectangleIds,
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
      confirmClientReviewedSelection: true,
      declaredSpatialMeasurementPlan: plan,
      recovery: {
        fileId: "file-perception-mcp",
        sourceImageMediaType: "image/png",
        candidates: recoveryCandidates,
        contractVersion: 3,
        sourceImageContentIdentity,
        visualInterpretationSource: payloadA.prepared.visualInterpretationSource,
        workflowMode: "two-object-spatial",
        perceptionManifest: payloadA.prepared.perceptionManifest,
      },
    };
    const omittedObjectA = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        ...recoveryConfirmationArguments,
        selectedCandidateIds: ["frame", "panel"],
        declaredSpatialMeasurementPlan: planFor(["frame", "panel"]),
      },
    });
    assert.equal(omittedObjectA.isError, true);
    assert.match(omittedObjectA.content[0].text, /must include object A/u);
    const recovered = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: recoveryConfirmationArguments,
    });
    assert.equal(recovered.isError, undefined, JSON.stringify(recovered));
    assert.equal(recovered.structuredContent.coreRun, true);
    assert.equal(recovered.structuredContent.multiPerceptionReceipt.perceptionManifest.observations.length, 1);
    const recoveredReplay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: structuredClone(recoveryConfirmationArguments),
    });
    assert.equal(recoveredReplay.isError, undefined, JSON.stringify(recoveredReplay));
    assert.equal(
      recoveredReplay.structuredContent.multiPerceptionReceipt.receiptIdentity,
      recovered.structuredContent.multiPerceptionReceipt.receiptIdentity,
    );
    assert.equal(
      recoveredReplay.structuredContent.multiPerceptionReceipt.sessionId,
      payloadA.sessionId,
    );
    const conflictingRecovery = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        ...recoveryConfirmationArguments,
        selectedCandidateIds: ["panel", objectAId],
        declaredSpatialMeasurementPlan: planFor(["panel", objectAId]),
      },
    });
    assert.equal(conflictingRecovery.isError, true);
    assert.match(conflictingRecovery.content[0].text, /already confirmed with a different review/u);
    assert.equal(providerCalls, 2);
    const initialWithoutStatus = (await prepare(connected.client))._meta.normaPersonalVisualHarmony;
    const readyAWithoutStatus = await poll(
      initialWithoutStatus,
      await start(initialWithoutStatus, "person"),
    );
    const payloadAWithoutStatus = readyAWithoutStatus._meta.normaPersonalVisualHarmony;
    await start(payloadAWithoutStatus, "bicycle");
    await new Promise((resolve) => setImmediate(resolve));
    now += 2_001;
    await prepare(connected.client);
    assert.equal(
      service.assertMultiPerceptionRecoveryEvidence({
        subjectId: "subject:owner",
        fileId: "file-perception-mcp",
        preparedCandidateSet: payloadAWithoutStatus.prepared,
      }),
      "object-b-failed",
    );
    assert.equal(providerCalls, 4);
  } finally {
    await connected.close();
  }
});

test("multi-perception recovery capacity deterministically evicts its oldest evidence", () => {
  const service = new PersonalVisualHarmonySessionServiceV1({ maxSessions: 1 });
  const evidenceStore = service.multiPerceptionRecoveryEvidence;
  for (let index = 0; index < 4; index += 1) {
    evidenceStore.set(`subject\u0000manifest-${String(index)}`, {
      subjectId: "subject",
      fileId: `file-${String(index)}`,
      sourceImageReferenceIdentity: `sha256:${String(index).repeat(64)}`,
      sourceImageContentIdentity: `sha256:${String(index + 4).repeat(64)}`,
      manifestIdentity: `sha256:${String(index + 5).repeat(64)}`,
      terminalState: null,
      createdAtMs: index,
      expiresAtMs: 10_000,
    });
  }
  service.requireMultiPerceptionRecoveryCapacity("subject\u0000manifest-new");
  assert.equal(evidenceStore.size, 3);
  assert.equal(evidenceStore.has("subject\u0000manifest-0"), false);
  assert.equal(evidenceStore.has("subject\u0000manifest-1"), true);
});

test("session capacity eviction terminalizes an active object-B attempt", () => {
  const now = Date.parse("2026-07-31T10:00:00.000Z");
  let sessionOrdinal = 0;
  const service = new PersonalVisualHarmonySessionServiceV1({
    maxSessions: 1,
    now: () => now,
    createSessionId: () => `session:capacity-${String(++sessionOrdinal)}`,
  });
  const initial = service.prepare({
    subjectId: "subject:owner",
    fileId: "file-capacity-a",
    sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-capacity-a",
    enablePerception: true,
    mediaType: "image/png",
    candidates: candidates(),
  });
  const observationA = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
    ordinal: 1,
    role: "primary-subject",
    normalizedPrompt: { kind: "text", text: "person" },
    parentCandidateSetIdentity: initial.prepared.candidateSetIdentity,
    sourceImageReferenceIdentity: initial.prepared.sourceImageReferenceIdentity,
    sourceImageContentIdentity,
    providerReceiptIdentity: `sha256:${"1".repeat(64)}`,
    maskIdentity: `sha256:${"2".repeat(64)}`,
    perceptionIdentity: `sha256:${"3".repeat(64)}`,
    candidateId: "sam3-capacity-object-a",
    originalRectangle: { x: 0.2, y: 0.2, width: 0.2, height: 0.3 },
  });
  const preparedA = preparePersonalVisualHarmonyCandidateSetV3({
    sourceFileId: "file-capacity-a",
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: initial.prepared.sourceImageReferenceIdentity,
    visualInterpretationSource: "sam3",
    observations: [observationA],
    candidates: [
      ...initial.prepared.candidates,
      {
        id: observationA.candidateId,
        label: "Objet A",
        role: observationA.role,
        reason: "Observation SAM bornée",
        ...observationA.originalRectangle,
        primitive: { kind: "rectangle" },
        sourceImageReferenceIdentity: initial.prepared.sourceImageReferenceIdentity,
      },
    ],
  });
  const session = service.sessions.get(initial.sessionId);
  session.prepared = preparedA;
  session.multiPerceptionWorkflow = {
    workflowMode: "two-object-spatial",
    consumedOrdinals: [1],
    reservedOrdinal: null,
    activeJobId: null,
    activeExpiresAtMs: null,
    terminalJobId: null,
    terminalAttemptOrdinal: null,
    terminalState: null,
  };
  const reservation = service.reservePerceptionStart({
    subjectId: "subject:owner",
    sessionId: initial.sessionId,
    candidateSetIdentity: preparedA.candidateSetIdentity,
    appCapability: initial.perceptionAppCapability,
    workflowMode: "two-object-spatial",
    guidedAnalysisGoal: "compare-two-lengths",
  });
  assert.equal(reservation.attemptOrdinal, 2);
  service.bindPerceptionJob({
    subjectId: "subject:owner",
    sessionId: initial.sessionId,
    attemptOrdinal: 2,
    jobId: "job:capacity-object-b",
    expiresAt: new Date(now + 10_000).toISOString(),
  });

  service.prepare({
    subjectId: "subject:owner",
    fileId: "file-capacity-b",
    mediaType: "image/png",
    candidates: candidates(),
  });

  assert.equal(service.sessions.has(initial.sessionId), false);
  assert.equal(
    service.assertMultiPerceptionRecoveryEvidence({
      subjectId: "subject:owner",
      fileId: "file-capacity-a",
      preparedCandidateSet: preparedA,
    }),
    "object-b-failed",
  );
});

test("app-only semantic targeting accepts exactly one normalized target and preserves the interactive boundary", async () => {
  const prompts = [];
  const downloadedUrls = [];
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-semantic-target-test",
  });
  const jobs = perceptionJobs(downloadedUrls, prompts);
  const owner = await connect({ service, jobs, subjectId: "subject:owner" });
  try {
    const prepared = await prepare(owner.client);
    const privatePayload = prepared._meta.normaPersonalVisualHarmony;
    const invalid = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=invalid",
        semanticTarget: "   ",
        label: "Cible sémantique",
        role: "primary-subject",
      },
    });
    assert.equal(invalid.isError, true);
    assert.deepEqual(prompts, []);

    const listedTarget = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=listed",
        semanticTarget: "person, batiment, porte",
        label: "Cible sémantique",
        role: "primary-subject",
      },
    });
    assert.equal(listedTarget.isError, true);
    assert.deepEqual(prompts, []);

    const bothModes = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=both",
        prompt: { points: [], box: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 } },
        semanticTarget: "person",
        label: "Cible sémantique",
        role: "primary-subject",
      },
    });
    assert.equal(bothModes.isError, true);
    assert.deepEqual(prompts, []);

    const mismatchedSource = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=different-file&sig=semantic",
        semanticTarget: "person",
        label: "Cible sémantique",
        role: "primary-subject",
      },
    });
    assert.equal(mismatchedSource.isError, true);
    assert.deepEqual(prompts, []);

    const started = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=semantic",
        semanticTarget: "  yellow   school bus  ",
        label: "Cible sémantique",
        role: "primary-subject",
      },
    });
    assert.equal(started.isError, undefined, JSON.stringify(started));
    assert.equal(started.structuredContent.state, "pending");
    let status;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      status = await owner.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
        arguments: {
          sessionId: privatePayload.sessionId,
          candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
          appCapability: privatePayload.perceptionAppCapability,
          jobId: started.structuredContent.jobId,
        },
      });
      if (status.structuredContent?.state !== "pending") break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(status.isError, undefined, JSON.stringify(status));
    assert.equal(status.structuredContent.state, "ready");
    assert.deepEqual(prompts, [{ kind: "text", text: "yellow school bus" }]);
    assert.equal(downloadedUrls.length, 1);
    assert.equal(status.structuredContent.coreRun, false);
    assert.equal(status.structuredContent.explicitSelectionConfirmationRequired, true);
    assert.equal("result" in status.structuredContent, false);
  } finally {
    await owner.close();
  }
});

test("the widget preserves V2 provenance, bounded polling, and nondegenerate line prompts", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /Proposer le masque SAM 3/u);
  assert.match(html, new RegExp(PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL, "u"));
  assert.match(html, new RegExp(PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL, "u"));
  assert.match(
    html,
    /perceptionAssistedPrepared\(payload\.prepared\)\)throw new Error\("perception-assisted geometry cannot be relabeled by V1 preparation"\)/u,
  );
  assert.match(
    html,
    /normalizedReviewedCandidates=reviewedCandidates\?\.map\(\(\{sourceImageReferenceIdentity,\.\.\.candidate\}\)=>candidate\)/u,
  );
  assert.match(html, /fileApi=window\.openai\?\.getFileDownloadUrl/u);
  assert.match(html, /sourceImageDownloadUrl,prompt:perceptionPromptFor\(candidate\)/u);
  assert.match(html, /PERCEPTION_MAX_STATUS_POLLS=18/u);
  assert.match(html, /while\(Date\.now\(\)<expiresAtMs&&remainingPolls>0\)/u);
  assert.match(html, /workflowMode:"two-object-spatial",guidedAnalysisGoal:"compare-two-lengths"/u);
  assert.match(html, /twoObjectSpatialWorkflowActive\(\)&&id!=="compare-two-lengths"/u);
  assert.match(html, /eligibleInteractivePerceptionCandidates\(payload\)/u);
  assert.match(html, /!proposalIds\.has\(candidate\.id\)&&!usedPrompts\.has/u);
  assert.match(html, /multiPerceptionReviewLocked\(\).*count===1/u);
  assert.match(
    html,
    /function reviewEditingBlocked\(\)\{return state\.completed\|\|state\.confirming\|\|multiPerceptionReviewLocked\(\)\|\|!state\.imageReady\}/u,
  );
  assert.equal(
    html.match(/state\.perceptionRunning=true;setReviewLocked\(true\);recordReviewEvent\("sam-requested"\)/gu)?.length,
    2,
  );
  assert.equal(
    html.match(/finally\{state\.perceptionRunning=false;setReviewLocked\(multiPerceptionReviewLocked\(\)\)/gu)?.length,
    2,
  );
  assert.match(html, /if\(reviewEditingBlocked\(\)\|\|!event\.key\.startsWith\("Arrow"\)/u);
  assert.match(html, /if\(reviewEditingBlocked\(\)\|\|event\.isPrimary===false/u);
  assert.match(
    html,
    /function multiPerceptionStartBlocked\(payload=state\.payload\)\{return state\.manualSegmentCandidateId!==null&&perceptionWorkflowArgs\(payload\)\.workflowMode==="two-object-spatial"\}/u,
  );
  assert.match(html, /multiStartBlocked=multiPerceptionStartBlocked\(payload\)/u);
  assert.match(html, /perceptionToggle\.disabled=.*?\|\|multiStartBlocked\|\|/u);
  assert.match(html, /busy=.*?\|\|multiPerceptionStartBlocked\(\)\|\|/u);
  assert.equal(
    html.match(/if\([^}]*multiPerceptionStartBlocked\(payload\)[^}]*\)return;/gu)?.length,
    2,
  );
  assert.match(html, /rectangleIds\.filter\(id=>!proposalIds\.has\(id\)\)/u);
  assert.match(html, /setReviewLocked\(multiPerceptionReviewLocked\(\)\)/u);
  assert.match(html, /remainingMs>0\)await new Promise\(resolve=>setTimeout\(resolve,remainingMs\)\)/u);
  assert.match(html, /state\.multiPerceptionTerminalState=multiPerceptionObservationCount\(payload\)===0\?"object-a-failed":"object-b-failed"/u);
  assert.match(
    html,
    /candidates:prepared\.candidates\.map\(\(\{sourceImageReferenceIdentity,\.\.\.candidate\}\)=>candidate\)/u,
  );
  assert.match(html, /recovery\.perceptionReceiptIdentity=prepared\.perceptionReceiptIdentity/u);
  assert.match(html, /points:\[\{x:clampUnit\(x\),y:clampUnit\(y\),label:"include"\}\],box:null/u);
  assert.match(html, /Cibler un concept avec SAM 3/u);
  assert.match(html, /maxlength="500"/u);
  assert.match(html, /semanticTarget:target,label:workflowArgs\.workflowMode\?"Objet "/u);
  assert.match(html, /normalizeSemanticTarget\(value\)/u);
  assert.match(html, /\/\[,;\|\]\/u\.test\(value\)/u);
  assert.match(html, /Saisissez une seule cible courte/u);
  assert.match(html, /semanticTargetAlreadyUsed\(target\)/u);
  assert.match(html, /L’objet B exige une cible distincte de l’objet A/u);
  assert.match(html, /chip\.disabled=busy/u);
  assert.match(
    html,
    /state\.imageReady=true;state\.dimensions=\{width:result\.width,height:result\.height\};.*?refreshSemanticTargetUi\(\)/u,
  );
  assert.match(html, /Raccourcis Norma · pas une liste officielle de SAM 3/u);
  for (const target of PERSONAL_VISUAL_HARMONY_SEMANTIC_TARGETS_V1) {
    assert.match(html, new RegExp(`"value":"${target.value}"`, "u"));
    assert.equal(target.value.includes(" "), false);
  }
});

test("widget polling performs one final status read before declaring expiry", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function applyPerceptionStatusResponse(");
  const end = html.indexOf("\nperceptionToggle.addEventListener", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  let statusReads = 0;
  const state = {
    activePayloadIdentity: "payload:active",
    completed: false,
    perceptionRunning: true,
    multiPerceptionTerminalState: null,
  };
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "perceptionWorkflowArgs",
    "multiPerceptionObservationCount",
    "setReviewLocked",
    "multiPerceptionReviewLocked",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    18,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async () => {
      statusReads += 1;
      return { structuredContent: { state: "pending" } };
    },
    () => ({}),
    () => 0,
    () => {},
    () => false,
  );
  await assert.rejects(
    () => pollPerceptionJob(
      {
        sessionId: "session:poll-final",
        fileId: "file:poll-final",
        perceptionAppCapability: "pvh-app:poll-final-capability",
        prepared: { candidateSetIdentity: `sha256:${"1".repeat(64)}` },
      },
      "job:poll-final",
      new Date(Date.now() - 1).toISOString(),
      "payload:active",
    ),
    /perception status polling expired/u,
  );
  assert.equal(statusReads, 1);
});

test("two-object workflow rejects family-filter transitions that clear the comparison goal", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function twoObjectSpatialWorkflowActive(");
  const end = html.indexOf("\nfunction renderFamilyFilters(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const state = {
    payload: { prepared: { workflowMode: "two-object-spatial" } },
    confirming: false,
    guidedAnalysisGoal: "compare-two-lengths",
    visibleKinds: new Set(["rectangle"]),
    measurementRatioEnabled: true,
    measurementRatioRefs: [{ kind: "extent" }],
  };
  const toggleFamilyVisibility = new Function(
    "state",
    "GUIDED_ANALYSIS_KINDS",
    "updateGuidedAnalysisGoalButtons",
    "guidedGoalStatus",
    "CUSTOM_GUIDED_ANALYSIS_GOAL_EFFECT",
    "updateFamilyFilterButtons",
    "syncFamilyVisibility",
    "updateMeasurementRatioControls",
    "persistGuidedAnalysisGoal",
    `"use strict";${html.slice(start, end)};return toggleFamilyVisibility;`,
  )(
    state,
    ["rectangle"],
    () => {},
    { textContent: "" },
    "custom",
    () => {},
    () => {},
    () => {},
    () => {},
  );
  toggleFamilyVisibility("rectangle");
  assert.deepEqual([...state.visibleKinds], ["rectangle"]);
  assert.equal(state.guidedAnalysisGoal, "compare-two-lengths");
  assert.equal(state.measurementRatioEnabled, true);
  assert.deepEqual(state.measurementRatioRefs, [{ kind: "extent" }]);
  assert.match(
    html,
    /familyFilters\.querySelectorAll\("\.family-filter"\)\.forEach\(button=>button\.disabled=disabled\|\|twoObjectSpatialWorkflowActive\(\)\)/u,
  );
});
