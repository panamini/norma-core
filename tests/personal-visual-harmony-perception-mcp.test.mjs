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
  PersonalVisualHarmonySessionServiceV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import {
  InMemoryPersonalVisualHarmonyPerceptionJobService,
} from "../dist/src/personal-visual-harmony-perception-jobs.js";
import {
  preparePersonalVisualHarmonyCandidateSetV2,
} from "../dist/src/personal-visual-harmony.js";

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

function successfulProvider() {
  return {
    async segment() {
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

function perceptionJobs(downloadedUrls) {
  return new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider: successfulProvider(),
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

async function prepare(client) {
  return client.callTool({
    name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    arguments: {
      image: {
        download_url: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=old&se=2026-07-27",
        file_id: "file-perception-mcp",
        mime_type: "image/png",
      },
      candidates: candidates(),
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

test("the widget preserves V2 provenance, bounded polling, and nondegenerate line prompts", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /Proposer le masque SAM 3/u);
  assert.match(html, new RegExp(PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL, "u"));
  assert.match(html, new RegExp(PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL, "u"));
  assert.match(
    html,
    /payload\.prepared\?\.perceptionReceiptIdentity\)throw new Error\("perception-assisted geometry cannot be relabeled by V1 preparation"\)/u,
  );
  assert.match(
    html,
    /normalizedReviewedCandidates=reviewedCandidates\?\.map\(\(\{sourceImageReferenceIdentity,\.\.\.candidate\}\)=>candidate\)/u,
  );
  assert.match(html, /fileApi=window\.openai\?\.getFileDownloadUrl/u);
  assert.match(html, /sourceImageDownloadUrl,prompt:perceptionPromptFor\(candidate\)/u);
  assert.match(html, /PERCEPTION_MAX_STATUS_POLLS=18/u);
  assert.match(html, /while\(Date\.now\(\)<expiresAtMs&&remainingPolls>0\)/u);
  assert.match(
    html,
    /candidates:prepared\.candidates\.map\(\(\{sourceImageReferenceIdentity,\.\.\.candidate\}\)=>candidate\)/u,
  );
  assert.match(html, /recovery\.perceptionReceiptIdentity=prepared\.perceptionReceiptIdentity/u);
  assert.match(html, /points:\[\{x:clampUnit\(x\),y:clampUnit\(y\),label:"include"\}\],box:null/u);
});
