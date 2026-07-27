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

function perceptionJobs() {
  return new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider: successfulProvider(),
    fetch: async () => new Response(sourceBytes, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(sourceBytes.byteLength),
      },
    }),
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
        download_url: "https://files.example.test/private-signed-image",
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

test("app-only perception enforces capability, subject, session, and explicit confirmation boundaries", async () => {
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-perception-test",
  });
  const jobs = perceptionJobs();
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

    const started = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: privatePayload.prepared.candidateSetIdentity,
        appCapability: privatePayload.perceptionAppCapability,
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
    assert.equal("acceptedGeometry" in status.structuredContent, false);
    assert.equal("result" in status.structuredContent, false);

    const confirmed = await owner.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: privatePayload.sessionId,
        candidateSetIdentity: status.structuredContent.candidateSetIdentity,
        selectedCandidateIds: ["frame"],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 1_000,
        confirmClientReviewedSelection: true,
        recovery: {
          fileId: "file-perception-mcp",
          sourceImageMediaType: "image/png",
          candidates: status._meta.normaPersonalVisualHarmony.prepared.candidates.map(
            ({ sourceImageReferenceIdentity: _sourceIdentity, ...candidate }) => candidate,
          ),
        },
      },
    });
    assert.equal(confirmed.isError, undefined, JSON.stringify(confirmed));
    assert.equal(confirmed.structuredContent.coreRun, true);
    assert.equal(confirmed.structuredContent.explicitSelectionConfirmation, true);
  } finally {
    await other?.close();
    await owner.close();
  }
});

test("the widget never re-prepares perception-assisted geometry through the ChatGPT V1 path", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /Proposer le masque SAM 3/u);
  assert.match(html, new RegExp(PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL, "u"));
  assert.match(html, new RegExp(PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL, "u"));
  assert.match(
    html,
    /payload\.prepared\?\.perceptionReceiptIdentity\)throw new Error\("perception-assisted geometry cannot be relabeled by V1 preparation"\)/u,
  );
});
