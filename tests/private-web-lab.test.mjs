import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  confirmPersonalVisualHarmonyCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
import {
  createPersonalVisualHarmonyMcpServerV1,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PersonalVisualHarmonySessionServiceV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import {
  deterministicPrivateWebLabCandidatesV1,
  PRIVATE_WEB_LAB_CONTRACT_ID,
  PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID,
  PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT,
  PrivateWebLabApplicationV1,
} from "../dist/src/private-web-lab.js";
import {
  createPrivateWebLabHttpServerV1,
} from "../web-lab/private-web-lab-http-server.mjs";

const sourceImageContentIdentity = `sha256:${"a".repeat(64)}`;
const sourcePixelWidth = 1200;
const sourcePixelHeight = 800;
const browserSessionId = "browser:test-session";
const fixedNow = Date.parse("2026-07-28T12:00:00.000Z");

test("private Web Lab prepares a bounded provider-free draft with Core stopped", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const draft = application.prepareDraft(draftRequest());

  assert.equal(draft.contractId, PRIVATE_WEB_LAB_CONTRACT_ID);
  assert.equal(draft.stage, "confirmation_required");
  assert.equal(draft.draftKind, "deterministic_fixture_no_provider");
  assert.equal(draft.providerCalls, 0);
  assert.equal(draft.coreRun, false);
  assert.equal(draft.candidates.length, 6);
  assert.equal(draft.strongestGuideCount, PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT);
  assert.deepEqual(
    draft.visibleCandidateIds,
    draft.candidates.slice(0, PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT).map(({ id }) => id),
  );
  assert.deepEqual(draft.selectedCandidateIds, draft.visibleCandidateIds);
  assert.equal(
    draft.candidates
      .slice(PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT)
      .some(({ id }) => draft.selectedCandidateIds.includes(id)),
    false,
  );
  assert.equal(coreCalls, 0);
});

test("a valid replacement draft supersedes the same browser session without consuming capacity", () => {
  let sessionSequence = 0;
  const application = new PrivateWebLabApplicationV1({
    now: () => fixedNow,
    maxSessions: 1,
    createSessionId: () => {
      sessionSequence += 1;
      return `web-lab-session:00000000-0000-4000-8000-${String(sessionSequence).padStart(12, "0")}`;
    },
  });
  const first = application.prepareDraft(draftRequest());
  const second = application.prepareDraft({
    ...draftRequest(),
    sourceImageContentIdentity: `sha256:${"b".repeat(64)}`,
  });

  assert.notEqual(first.labSessionId, second.labSessionId);
  assert.throws(
    () => application.confirm(confirmationRequest(first)),
    /missing or expired/u,
  );
  assert.throws(
    () => application.prepareDraft({
      ...draftRequest(),
      browserSessionId: "browser:another-session",
    }),
    /capacity is exhausted/u,
  );
});

test("invalid, stale, cross-source, cross-session, and candidate-mismatched confirmations fail before Core", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const draft = application.prepareDraft(draftRequest());
  const confirmation = confirmationRequest(draft);

  assert.throws(
    () => application.confirm({ ...confirmation, explicitConfirmation: false }),
    /explicit confirmation/u,
  );
  assert.throws(
    () => application.confirm({
      ...confirmation,
      browserSessionId: "browser:different-session",
    }),
    /different browser session/u,
  );
  assert.throws(
    () => application.confirm({
      ...confirmation,
      sourceImageContentIdentity: `sha256:${"b".repeat(64)}`,
    }),
    /source image identity/u,
  );
  assert.throws(
    () => application.confirm({
      ...confirmation,
      candidateSetIdentity: `sha256:${"c".repeat(64)}`,
    }),
    /stale or mismatched/u,
  );
  assert.throws(
    () => application.confirm({
      ...confirmation,
      labSessionId: "web-lab-session:00000000-0000-4000-8000-000000000000",
    }),
    /missing or expired/u,
  );
  const tamperedCandidates = structuredClone(draft.candidates);
  tamperedCandidates[0].label = "Changed label";
  assert.throws(
    () => application.confirm({
      ...confirmation,
      reviewedCandidates: tamperedCandidates,
    }),
    /metadata or primitive kind/u,
  );
  assert.equal(coreCalls, 0);
});

test("explicit confirmation executes Core once, returns a canonical receipt, and is idempotent", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const draft = application.prepareDraft(draftRequest());
  const confirmation = confirmationRequest(draft);
  const reviewedCandidates = structuredClone(confirmation.reviewedCandidates);
  const editableRectangle = reviewedCandidates.find(({ id }) => id === "fixture-major-region");
  editableRectangle.width = 0.55;

  const receipt = application.confirm({ ...confirmation, reviewedCandidates });
  assert.equal(receipt.contractId, PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID);
  assert.equal(receipt.stage, "completed");
  assert.equal(receipt.coreRun, true);
  assert.equal(receipt.explicitSelectionConfirmation, true);
  assert.equal(receipt.providerCalls, 0);
  assert.match(receipt.receiptIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(receipt.canonicalResultIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(receipt.exportFileName, "norma-private-web-lab-result.json");
  assert.equal(`${JSON.stringify(JSON.parse(receipt.exportJson))}\n`, receipt.exportJson);
  assert.equal(
    receipt.canonicalGuideAnalysisIdentity,
    receipt.canonicalGuideAnalysis.contentIdentity,
  );
  assert.deepEqual(
    JSON.parse(receipt.exportJson).canonicalGuideAnalysis,
    receipt.canonicalGuideAnalysis,
  );
  assert.equal(coreCalls, 1);

  assert.deepEqual(
    application.confirm({ ...confirmation, reviewedCandidates }),
    receipt,
  );
  assert.equal(coreCalls, 1);
  assert.throws(
    () => application.confirm({
      ...confirmation,
      reviewedCandidates,
      selectedCandidateIds: ["fixture-frame"],
    }),
    /already confirmed with different geometry/u,
  );
  assert.equal(coreCalls, 1);
});

test("MCP and Web Lab return deep-equal canonical Core results for identical accepted geometry", async () => {
  const application = new PrivateWebLabApplicationV1({
    now: () => fixedNow,
    createSessionId: () => "web-lab-session:11111111-1111-4111-8111-111111111111",
  });
  const draft = application.prepareDraft(draftRequest());
  const webReceipt = application.confirm({
    ...confirmationRequest(draft),
    selectedCandidateIds: draft.candidates.map(({ id }) => id),
  });

  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => fixedNow,
    createSessionId: () => "session:mcp-private-web-lab-contract",
  });
  const server = createPersonalVisualHarmonyMcpServerV1({ service });
  const client = new Client(
    { name: "private-web-lab-contract-test", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const prepared = await client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          file_id: draft.sourceFileId,
          download_url: "https://example.test/private-web-lab.png",
          mime_type: draft.sourceImageMediaType,
        },
        candidates: draft.candidates,
      },
    });
    const preparedMeta = prepared._meta.normaPersonalVisualHarmony;
    const rectangleIds = draft.candidates
      .filter((candidate) => (candidate.primitive?.kind ?? "rectangle") === "rectangle")
      .map(({ id }) => id);
    const guideIds = draft.candidates
      .filter((candidate) => (candidate.primitive?.kind ?? "rectangle") !== "rectangle")
      .map(({ id }) => id);
    const confirmed = await client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: preparedMeta.sessionId,
        candidateSetIdentity: preparedMeta.prepared.candidateSetIdentity,
        sourceImageDownloadUrl: "https://example.test/private-web-lab.png",
        selectedCandidateIds: rectangleIds,
        confirmedVisualGuideCandidateIds: guideIds,
        sourcePixelWidth,
        sourcePixelHeight,
        confirmClientReviewedSelection: true,
        recovery: {
          fileId: draft.sourceFileId,
          sourceImageMediaType: draft.sourceImageMediaType,
          candidates: draft.candidates,
        },
      },
    });
    assert.equal(confirmed.isError, undefined, JSON.stringify(confirmed));
    const mcpCoreResult =
      confirmed._meta.normaPersonalVisualHarmony.result.harmonicAnalysis;
    const mcpGuideAnalysis =
      confirmed._meta.normaPersonalVisualHarmony.imagePlaneGuideAnalysis;
    assert.deepEqual(mcpCoreResult, webReceipt.canonicalCoreResult);
    assert.deepEqual(mcpGuideAnalysis, webReceipt.canonicalGuideAnalysis);
    assert.equal(
      mcpCoreResult.contentIdentity,
      webReceipt.canonicalResultIdentity,
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("loopback HTTP surface serves the lab and rejects raw image-shaped request fields", async () => {
  const server = createPrivateWebLabHttpServerV1();
  await listen(server);
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const [page, browserModel, health] = await Promise.all([
      fetch(`${origin}/`),
      fetch(`${origin}/private-web-lab-browser-model.js`),
      fetch(`${origin}/healthz`),
    ]);
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /Original/u);
    assert.match(pageHtml, /Guides/u);
    assert.equal(browserModel.status, 200);
    assert.equal((await health.json()).providerCalls, 0);

    const rejected = await fetch(`${origin}/api/draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draftRequest(), imageBytes: "forbidden" }),
    });
    assert.equal(rejected.status, 400);
    assert.match((await rejected.json()).message, /fields are invalid/u);

    const rejectedHost = await requestWithHost(
      address.port,
      "/healthz",
      "attacker.example",
    );
    assert.equal(rejectedHost.status, 403);
    assert.equal(rejectedHost.body.error, "loopback_request_required");

    const rejectedOrigin = await fetch(`${origin}/api/draft`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify(draftRequest()),
    });
    assert.equal(rejectedOrigin.status, 403);
    assert.equal((await rejectedOrigin.json()).error, "loopback_request_required");
  } finally {
    await close(server);
  }
});

test("deterministic candidate fixture remains stable for the same visible goal", () => {
  assert.deepEqual(
    deterministicPrivateWebLabCandidatesV1("general-geometry"),
    deterministicPrivateWebLabCandidatesV1("general-geometry"),
  );
});

function applicationWithCounter(onCoreCall) {
  return new PrivateWebLabApplicationV1({
    now: () => fixedNow,
    createSessionId: () => "web-lab-session:11111111-1111-4111-8111-111111111111",
    executeConfirmation(input) {
      onCoreCall();
      return confirmPersonalVisualHarmonyCandidateSetV1(input);
    },
  });
}

function draftRequest() {
  return {
    browserSessionId,
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    sourcePixelWidth,
    sourcePixelHeight,
    goalId: "general-geometry",
  };
}

function confirmationRequest(draft) {
  return {
    explicitConfirmation: true,
    browserSessionId,
    labSessionId: draft.labSessionId,
    sourceImageContentIdentity: draft.sourceImageContentIdentity,
    candidateSetIdentity: draft.candidateSetIdentity,
    sourcePixelWidth: draft.sourcePixelWidth,
    sourcePixelHeight: draft.sourcePixelHeight,
    selectedCandidateIds: draft.selectedCandidateIds,
    reviewedCandidates: structuredClone(draft.candidates),
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

function requestWithHost(port, path, host) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port,
      path,
      headers: { host },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          status: response.statusCode,
          body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
        });
      });
    });
    request.once("error", reject);
    request.end();
  });
}
