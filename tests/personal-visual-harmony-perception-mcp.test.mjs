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
  DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS,
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

test("oversized eligible preparation advertises bounded recovery without issuing an unusable SAM capability", async () => {
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
          download_url: "https://files.example.test/private-signed-image?file=file-eleven-candidates&sig=fresh",
          file_id: "file-eleven-candidates",
          mime_type: "image/png",
        },
        candidates: Array.from({ length: 11 }, (_, index) => ({
          id: `frame-${String(index + 1)}`,
          label: `Cadre ${String(index + 1)}`,
          role: index === 0 ? "primary-subject" : index === 1 ? "secondary-subject" : "frame",
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
    assert.equal(payload.perceptionRecoveryAvailable, true);
    assert.equal("perceptionAppCapability" in payload, false);
    assert.equal("perceptionModes" in payload, false);
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
    "updateSpatialRecoveryUi",
    `"use strict";${html.slice(start, end)};return updatePerceptionUi;`,
  )(
    state,
    perceptionToggle,
    () => state.payload.prepared.perceptionManifest?.observations.length ?? 0,
    () => state.payload.prepared.candidates,
    () => state.manualSegmentCandidateId !== null,
    () => {},
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

  state.manualSegmentCandidateId = null;
  state.payload.prepared = {
    contractVersion: 3,
    workflowMode: "two-object-spatial",
    candidates: [{ id: "object-b" }],
    perceptionManifest: { observations: [{ candidateId: "object-a" }] },
  };
  updatePerceptionUi();
  assert.equal(perceptionToggle.hidden, false);
  assert.equal(perceptionToggle.disabled, false);
  assert.equal(perceptionToggle.textContent, "Proposer l’objet B");

  state.payload.prepared.perceptionManifest.observations.push({ candidateId: "object-b" });
  updatePerceptionUi();
  assert.equal(perceptionToggle.hidden, true);

  assert.match(
    html,
    /freshBoundSpatial=.*?spatialWorkflowBinding\(\)\.status==="bound"/u,
  );
  assert.match(
    html,
    /state\.measurementRatioEnabled=state\.manualSpatialFallback\|\|freshBoundSpatial\|\|/u,
  );
});

test("fresh generic V1 with an explicit A/B pair exposes the first SAM action", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function updatePerceptionUi(){");
  const end = html.indexOf("\nfunction perceptionPromptFor(", start);
  const state = {
    payload: {
      perceptionAppCapability: "pvh-app:" + "a".repeat(32),
      perceptionModes: ["two-object-spatial"],
      prepared: {
        contractVersion: 1,
        candidates: [
          { id: "person.A", role: "primary-subject" },
          { id: "person.B", role: "secondary-subject" },
        ],
      },
    },
    guidedAnalysisGoal: "compare-two-lengths",
    multiPerceptionTerminalState: null,
    completed: false,
    confirming: false,
    pixelRefinementRunning: false,
    perceptionRunning: false,
    perceptionReconciliationBlocked: false,
    manualSegmentCandidateId: null,
    imageReady: true,
    selected: new Set(["person.A", "person.B"]),
    selectedGuides: new Set(),
  };
  const perceptionToggle = {};
  const updatePerceptionUi = new Function(
    "state",
    "perceptionToggle",
    "multiPerceptionObservationCount",
    "eligibleInteractivePerceptionCandidates",
    "multiPerceptionStartBlocked",
    "updateSpatialRecoveryUi",
    `"use strict";${html.slice(start, end)};return updatePerceptionUi;`,
  )(
    state,
    perceptionToggle,
    () => 0,
    () => state.payload.prepared.candidates,
    () => false,
    () => {},
  );

  updatePerceptionUi();

  assert.equal(perceptionToggle.hidden, false);
  assert.equal(perceptionToggle.disabled, false);
  assert.equal(perceptionToggle.textContent, "Proposer l’objet A");
});

test("selecting compare-two-lengths refreshes SAM UI and starts a fresh bounded session for 11 candidates", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function applyGuidedAnalysisGoal(");
  const end = html.indexOf("\nfunction restoreGuidedAnalysisGoal(", start);
  const state = {
    payload: {
      perceptionRecoveryAvailable: true,
      prepared: {
        contractVersion: 1,
        candidates: Array.from({ length: 11 }, (_, index) => ({ id: `candidate-${String(index)}` })),
      },
    },
    guidedAnalysisGoal: "general-geometry",
    multiPerceptionTerminalState: null,
    completed: false,
    confirming: false,
    spatialRecoveryRunning: false,
    pixelRefinementRunning: false,
    perceptionRunning: false,
    perceptionReconciliationBlocked: false,
    manualSegmentCandidateId: null,
    imageReady: true,
    visibleKinds: new Set(["rectangle"]),
    measurementRatioEnabled: false,
    measurementRatioRefs: [],
    declaredSpatialMeasurementPlanRevision: 0,
    declaredSpatialMeasurementPlanInputKey: null,
    declaredSpatialMeasurementPlan: null,
    declaredSpatialMeasurementPlanBuilding: false,
  };
  const calls = [];
  const perceptionToggle = {};
  const updateStart = html.indexOf("function updatePerceptionUi(){");
  const updateEnd = html.indexOf("\nfunction perceptionPromptFor(", updateStart);
  const updatePerceptionUi = new Function(
    "state",
    "perceptionToggle",
    "multiPerceptionObservationCount",
    "eligibleInteractivePerceptionCandidates",
    "multiPerceptionStartBlocked",
    "updateSpatialRecoveryUi",
    `"use strict";${html.slice(updateStart, updateEnd)};return updatePerceptionUi;`,
  )(
    state,
    perceptionToggle,
    () => 0,
    () => state.payload.prepared.candidates,
    () => false,
    () => calls.push({ type: "ui", goal: state.guidedAnalysisGoal, hidden: perceptionToggle.hidden }),
  );
  const applyGuidedAnalysisGoal = new Function(
    "state",
    "GUIDED_ANALYSIS_GOALS",
    "twoObjectSpatialWorkflowActive",
    "visibleKindsForGuidedAnalysisGoal",
    "updateGuidedAnalysisGoalButtons",
    "updateFamilyFilterButtons",
    "syncFamilyVisibility",
    "updateMeasurementRatioControls",
    "updatePerceptionUi",
    "guidedGoalStatus",
    "persistGuidedAnalysisGoal",
    "runSpatialRecovery",
    `"use strict";${html.slice(start, end)};return applyGuidedAnalysisGoal;`,
  )(
    state,
    [
      { id: "general-geometry", visibleKinds: ["rectangle"], effect: "general" },
      { id: "compare-two-lengths", visibleKinds: ["rectangle"], effect: "compare" },
    ],
    () => false,
    (goal) => goal.visibleKinds,
    () => {},
    () => {},
    () => {},
    () => {},
    updatePerceptionUi,
    { textContent: "" },
    () => {},
    (...args) => calls.push({ type: "recovery", args }),
  );

  applyGuidedAnalysisGoal("compare-two-lengths");

  assert.equal(state.guidedAnalysisGoal, "compare-two-lengths");
  assert.deepEqual(calls, [
    { type: "ui", goal: "compare-two-lengths", hidden: true },
    { type: "recovery", args: [false, true] },
  ]);
});

test("selecting compare-two-lengths auto-enters a fresh SAM session for a selected V1 A/B pair without capability", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function applyGuidedAnalysisGoal(");
  const end = html.indexOf("\nfunction restoreGuidedAnalysisGoal(", start);
  const candidates = Array.from({ length: 6 }, (_, index) => ({
    id: `candidate-${String(index)}`,
    primitive: { kind: "rectangle" },
  }));
  const state = {
    payload: {
      perceptionRecoveryAvailable: true,
      prepared: { contractVersion: 1, candidates },
    },
    reviewedCandidates: candidates,
    selected: new Set(["candidate-0", "candidate-1"]),
    guidedAnalysisGoal: "general-geometry",
    multiPerceptionTerminalState: null,
    completed: false,
    confirming: false,
    spatialRecoveryRunning: false,
    pixelRefinementRunning: false,
    perceptionRunning: false,
    perceptionReconciliationBlocked: false,
    manualSegmentCandidateId: null,
    imageReady: true,
    visibleKinds: new Set(["rectangle"]),
    measurementRatioEnabled: false,
    measurementRatioRefs: [],
    declaredSpatialMeasurementPlanRevision: 0,
    declaredSpatialMeasurementPlanInputKey: null,
    declaredSpatialMeasurementPlan: null,
    declaredSpatialMeasurementPlanBuilding: false,
  };
  const calls = [];
  const applyGuidedAnalysisGoal = new Function(
    "state",
    "GUIDED_ANALYSIS_GOALS",
    "twoObjectSpatialWorkflowActive",
    "visibleKindsForGuidedAnalysisGoal",
    "updateGuidedAnalysisGoalButtons",
    "updateFamilyFilterButtons",
    "syncFamilyVisibility",
    "updateMeasurementRatioControls",
    "updatePerceptionUi",
    "guidedGoalStatus",
    "persistGuidedAnalysisGoal",
    "runSpatialRecovery",
    `"use strict";${html.slice(start, end)};return applyGuidedAnalysisGoal;`,
  )(
    state,
    [
      { id: "general-geometry", visibleKinds: ["rectangle"], effect: "general" },
      { id: "compare-two-lengths", visibleKinds: ["rectangle"], effect: "compare" },
    ],
    () => false,
    (goal) => goal.visibleKinds,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    { textContent: "" },
    () => {},
    (...args) => calls.push({ type: "recovery", args }),
  );

  applyGuidedAnalysisGoal("compare-two-lengths");

  assert.deepEqual(calls, [{ type: "recovery", args: [false, true] }]);
});

test("oversized generic V1 entry keeps explicit SAM restart visible until exactly two rectangles are selected", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const candidateIds = Array.from({ length: 11 }, (_, index) => `candidate-${String(index)}`);
  const state = {
    payload: {
      perceptionRecoveryAvailable: true,
      prepared: {
        contractVersion: 1,
        candidates: candidateIds.map((id) => ({ id })),
      },
    },
    guidedAnalysisGoal: "compare-two-lengths",
    selected: new Set(candidateIds),
    multiPerceptionTerminalState: null,
    perceptionReconciliationBlocked: false,
    spatialRecoveryRunning: false,
    confirming: false,
    perceptionRunning: false,
    completed: false,
  };
  const spatialWorkflowBinding = () => ({ status: "legacy", candidateIds: [], message: null });
  const perceptionToggle = { hidden: true };
  const requiredStart = html.indexOf("function spatialRecoveryRequired(){");
  const requiredEnd = html.indexOf("\nfunction manualSpatialPairSelectionAllowed", requiredStart);
  const spatialRecoveryRequired = new Function(
    "state",
    "spatialWorkflowBinding",
    "perceptionToggle",
    `"use strict";${html.slice(requiredStart, requiredEnd)};return spatialRecoveryRequired;`,
  )(state, spatialWorkflowBinding, perceptionToggle);
  const spatialRecovery = {};
  const spatialRecoveryActions = {};
  const spatialRecoveryStatus = {};
  const restartSpatialReview = {};
  const continueManualSpatial = {};
  const updateStart = html.indexOf("function updateSpatialRecoveryUi(){");
  const updateEnd = html.indexOf("\nasync function runSpatialRecovery", updateStart);
  const updateSpatialRecoveryUi = new Function(
    "state",
    "spatialRecovery",
    "spatialRecoveryActions",
    "spatialRecoveryStatus",
    "restartSpatialReview",
    "continueManualSpatial",
    "spatialWorkflowBinding",
    "spatialRecoveryRequired",
    "manualSelectedRectangleIds",
    `"use strict";${html.slice(updateStart, updateEnd)};return updateSpatialRecoveryUi;`,
  )(
    state,
    spatialRecovery,
    spatialRecoveryActions,
    spatialRecoveryStatus,
    restartSpatialReview,
    continueManualSpatial,
    spatialWorkflowBinding,
    spatialRecoveryRequired,
    () => [...state.selected],
  );

  updateSpatialRecoveryUi();
  assert.equal(spatialRecovery.hidden, false);
  assert.equal(restartSpatialReview.disabled, true);
  assert.match(spatialRecoveryStatus.textContent, /Sélectionnez exactement deux rectangles/u);

  state.selected = new Set(candidateIds.slice(0, 2));
  updateSpatialRecoveryUi();
  assert.equal(spatialRecovery.hidden, false);
  assert.equal(restartSpatialReview.disabled, false);
  assert.equal(continueManualSpatial.disabled, false);
});

test("fresh two-object recovery re-prepares only the two explicitly selected rectangles", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function runSpatialRecovery(");
  const end = html.indexOf("\nrestartSpatialReview.addEventListener", start);
  const reviewedCandidates = Array.from({ length: 11 }, (_, index) => ({
    id: `candidate-${String(index)}`,
    label: `Candidate ${String(index)}`,
    role: index < 2 ? "primary-subject" : "structural-region",
    reason: "Visible rectangle",
    x: index / 20,
    y: 0.1,
    width: 0.04,
    height: 0.2,
    primitive: { kind: "rectangle" },
  }));
  const selectedIds = [reviewedCandidates[0].id, reviewedCandidates[1].id];
  const initialPayload = {
    sessionId: "session:eleven",
    prepared: { contractVersion: 1, candidates: reviewedCandidates },
  };
  const freshPayload = {
    sessionId: "session:bounded-two",
    prepared: { contractVersion: 1, candidates: reviewedCandidates.slice(0, 2) },
  };
  const state = {
    payload: initialPayload,
    reviewedCandidates,
    selected: new Set(selectedIds),
    visibleKinds: new Set(["rectangle"]),
    spatialRecoveryRunning: false,
    confirming: false,
    perceptionRunning: false,
    completed: false,
    perceptionReconciliationBlocked: false,
    multiPerceptionTerminalState: null,
    guidedAnalysisGoal: "compare-two-lengths",
    measurementRatioRefs: [],
    manualSpatialFallback: false,
    manualSpatialFallbackSessionId: null,
    measurementRatioEnabled: false,
  };
  const calls = [];
  let renderedSelection = null;
  const runSpatialRecovery = new Function(
    "state",
    "spatialRecoveryRequired",
    "manualSelectedRectangleIds",
    "spatialRecoveryCandidateSnapshot",
    "setReviewLocked",
    "prepareSpatialRecoveryPayload",
    "hydrate",
    "GUIDED_ANALYSIS_GOALS",
    "visibleKindsForGuidedAnalysisGoal",
    "renderGuidedAnalysisGoals",
    "updateFamilyFilterButtons",
    "syncFamilyVisibility",
    "updatePerceptionUi",
    "updateMeasurementRatioControls",
    "persistReviewState",
    "multiPerceptionReviewLocked",
    "updateSpatialRecoveryUi",
    "statusNode",
    `"use strict";${html.slice(start, end)};return runSpatialRecovery;`,
  )(
    state,
    () => false,
    () => selectedIds,
    (_payload, selectedOnly) => {
      calls.push({ type: "snapshot", selectedOnly });
      return reviewedCandidates.slice(0, 2);
    },
    (locked) => calls.push({ type: "lock", locked }),
    async (_payload, candidates) => {
      calls.push({ type: "prepare", candidateIds: candidates.map((candidate) => candidate.id) });
      return freshPayload;
    },
    async (payload) => {
      calls.push({ type: "hydrate", sessionId: payload.sessionId });
      state.payload = payload;
      state.guidedAnalysisGoal = "general-geometry";
      state.visibleKinds = new Set(["rectangle", "axis", "segment"]);
      renderedSelection = new Set(payload.prepared.candidates.map((candidate) => candidate.id));
      state.selected = renderedSelection;
    },
    [
      { id: "general-geometry", visibleKinds: ["rectangle", "axis", "segment"] },
      { id: "compare-two-lengths", visibleKinds: ["rectangle"] },
    ],
    (goal) => goal.visibleKinds,
    () => {},
    () => calls.push({ type: "family-buttons" }),
    () => calls.push({ type: "family-visibility" }),
    () => {},
    () => {},
    () => {},
    () => false,
    () => {},
    { textContent: "" },
  );

  await runSpatialRecovery(false, true);

  assert.deepEqual(calls.find((call) => call.type === "snapshot"), {
    type: "snapshot",
    selectedOnly: true,
  });
  assert.deepEqual(calls.find((call) => call.type === "prepare"), {
    type: "prepare",
    candidateIds: selectedIds,
  });
  assert.deepEqual(calls.find((call) => call.type === "hydrate"), {
    type: "hydrate",
    sessionId: freshPayload.sessionId,
  });
  assert.deepEqual([...state.selected], selectedIds);
  assert.equal(state.selected, renderedSelection);
  renderedSelection.delete(selectedIds[0]);
  assert.equal(state.selected.has(selectedIds[0]), false);
  assert.deepEqual([...state.visibleKinds], ["rectangle"]);
  assert.ok(calls.some((call) => call.type === "family-buttons"));
  assert.ok(calls.some((call) => call.type === "family-visibility"));
  assert.equal(state.manualSpatialFallback, false);
  assert.equal(state.measurementRatioEnabled, false);
});

test("terminal A/B SAM review exposes explicit restart and manual recovery without automatic work", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const recoveryStart = html.indexOf("async function prepareSpatialRecoveryPayload(");
  const recoveryEnd = html.indexOf("\nasync function callConfirmation(", recoveryStart);
  assert.notEqual(recoveryStart, -1);
  assert.notEqual(recoveryEnd, -1);
  const recoverySource = html.slice(recoveryStart, recoveryEnd);

  assert.match(html, />Recommencer la revue SAM A\/B</u);
  assert.match(html, />Continuer en comparaison manuelle</u);
  assert.match(
    html,
    /\.spatial-recovery\[hidden\],\.spatial-recovery-actions\[hidden\]\{display:none\}/u,
  );
  assert.match(html, /MODE MANUEL · preuves non liées · aucune liaison SAM A\/B/u);
  assert.match(
    html,
    /manualSelectedRectangleIds\(\)\.length===2/u,
  );
  assert.match(
    html,
    /state\.manualSpatialFallback=manual/u,
  );
  assert.match(
    html,
    /await prepareSpatialRecoveryPayload\(payload,candidateSnapshot\)/u,
  );
  assert.doesNotMatch(
    recoverySource,
    /callAppTool\(START_PERCEPTION_TOOL/u,
  );
  assert.doesNotMatch(
    recoverySource,
    /callAppTool\(CONFIRM_TOOL/u,
  );
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

test("a late ready object-A status can be rolled back idempotently before the old payload unlocks", async () => {
  const prompts = [];
  const jobs = perceptionJobs([], prompts);
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-late-ready-rollback",
    maxSessions: 1,
  });
  const connected = await connect({ service, jobs, subjectId: "subject:owner" });
  try {
    const initial = await prepare(connected.client);
    const payload0 = initial._meta.normaPersonalVisualHarmony;
    const started = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: payload0.sessionId,
        candidateSetIdentity: payload0.prepared.candidateSetIdentity,
        appCapability: payload0.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh",
        semanticTarget: "person",
        label: "Objet A",
        role: "primary-subject",
        workflowMode: "two-object-spatial",
        guidedAnalysisGoal: "compare-two-lengths",
      },
    });
    assert.equal(started.isError, undefined, JSON.stringify(started));
    const evidenceStore = service.multiPerceptionRecoveryEvidence;
    for (let index = 0; index < 4; index += 1) {
      evidenceStore.set(`subject:other\u0000manifest-${String(index)}`, {
        subjectId: "subject:other",
        fileId: `file-other-${String(index)}`,
        sourceImageReferenceIdentity: `sha256:${String(index).repeat(64)}`,
        sourceImageContentIdentity: `sha256:${String(index + 4).repeat(64)}`,
        visualInterpretationSource: "sam3",
        manifestIdentity: `sha256:${String(index + 5).repeat(64)}`,
        terminalState: null,
        createdAtMs: index,
        expiresAtMs: Number.MAX_SAFE_INTEGER,
      });
    }
    const evidenceBeforeReady = structuredClone(
      [...evidenceStore.entries()].sort(([left], [right]) => left.localeCompare(right)),
    );

    let ready;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      ready = await connected.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
        arguments: {
          sessionId: payload0.sessionId,
          candidateSetIdentity: payload0.prepared.candidateSetIdentity,
          appCapability: payload0.perceptionAppCapability,
          jobId: started.structuredContent.jobId,
        },
      });
      if (ready.structuredContent?.state !== "pending") break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(ready.structuredContent.state, "ready");
    assert.equal(
      ready._meta.normaPersonalVisualHarmony.prepared.perceptionManifest.observations.length,
      1,
    );
    const evidenceAfterReady = structuredClone([...evidenceStore.entries()]);
    const appliedRecoveryKey = evidenceAfterReady.find(
      ([key]) => key.startsWith("subject:owner\u0000"),
    )?.[0];
    assert.equal(typeof appliedRecoveryKey, "string");

    const rollbackArguments = {
      sessionId: payload0.sessionId,
      candidateSetIdentity: payload0.prepared.candidateSetIdentity,
      appCapability: payload0.perceptionAppCapability,
      jobId: started.structuredContent.jobId,
      rollbackAppliedResult: true,
    };
    const restoreEvidenceStore = (entries) => {
      evidenceStore.clear();
      for (const [key, evidence] of structuredClone(entries)) evidenceStore.set(key, evidence);
    };
    const conflictingEvictedEvidence = {
      ...evidenceBeforeReady[0][1],
      fileId: "file-intervening-update",
      createdAtMs: 100,
    };
    evidenceStore.delete(evidenceBeforeReady[1][0]);
    evidenceStore.set(evidenceBeforeReady[0][0], conflictingEvictedEvidence);
    const evidenceBeforeConflictRollback = structuredClone([...evidenceStore.entries()]);
    const conflictingRollback = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: rollbackArguments,
    });
    assert.equal(conflictingRollback.isError, true);
    assert.deepEqual([...evidenceStore.entries()], evidenceBeforeConflictRollback);

    restoreEvidenceStore(evidenceAfterReady);
    evidenceStore.delete(appliedRecoveryKey);
    evidenceStore.set("subject:other\u0000manifest-intervening-pressure", {
      ...evidenceBeforeReady[0][1],
      fileId: "file-intervening-pressure",
      createdAtMs: 101,
    });
    const evidenceBeforeCapacityRollback = structuredClone([...evidenceStore.entries()]);
    const capacityRollback = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: rollbackArguments,
    });
    assert.equal(capacityRollback.isError, true);
    assert.equal(evidenceStore.size, 4);
    assert.deepEqual([...evidenceStore.entries()], evidenceBeforeCapacityRollback);

    restoreEvidenceStore(evidenceAfterReady);
    const rolledBack = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: rollbackArguments,
    });
    assert.equal(rolledBack.isError, undefined, JSON.stringify(rolledBack));
    assert.equal(
      rolledBack._meta.normaPersonalVisualHarmony.prepared.candidateSetIdentity,
      payload0.prepared.candidateSetIdentity,
    );
    assert.equal(
      rolledBack._meta.normaPersonalVisualHarmony.multiPerceptionWorkflow.terminalState,
      "object-a-failed",
    );
    assert.equal(rolledBack.structuredContent.coreRun, false);

    const repeated = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: rollbackArguments,
    });
    assert.equal(repeated.isError, undefined, JSON.stringify(repeated));
    assert.equal(
      repeated._meta.normaPersonalVisualHarmony.prepared.candidateSetIdentity,
      payload0.prepared.candidateSetIdentity,
    );
    assert.deepEqual(
      [...evidenceStore.entries()].sort(([left], [right]) => left.localeCompare(right)),
      evidenceBeforeReady,
    );
    assert.equal(prompts.length, 1);
  } finally {
    await connected.close();
  }
});

test("a retained late object-A result terminalizes the server workflow before review unlocks", async () => {
  const prompts = [];
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-late-ready-retained",
  });
  const connected = await connect({
    service,
    jobs: perceptionJobs([], prompts),
    subjectId: "subject:owner",
  });
  try {
    const initial = await prepare(connected.client);
    const payload0 = initial._meta.normaPersonalVisualHarmony;
    const started = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {
        sessionId: payload0.sessionId,
        candidateSetIdentity: payload0.prepared.candidateSetIdentity,
        appCapability: payload0.perceptionAppCapability,
        sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh",
        semanticTarget: "person",
        label: "Objet A",
        role: "primary-subject",
        workflowMode: "two-object-spatial",
        guidedAnalysisGoal: "compare-two-lengths",
      },
    });
    let ready;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      ready = await connected.client.callTool({
        name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
        arguments: {
          sessionId: payload0.sessionId,
          candidateSetIdentity: payload0.prepared.candidateSetIdentity,
          appCapability: payload0.perceptionAppCapability,
          jobId: started.structuredContent.jobId,
        },
      });
      if (ready.structuredContent?.state !== "pending") break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(ready.structuredContent.state, "ready");
    const readyPayload = ready._meta.normaPersonalVisualHarmony;
    assert.equal(readyPayload.prepared.perceptionManifest.observations.length, 1);

    const terminalizeArguments = {
      sessionId: payload0.sessionId,
      candidateSetIdentity: payload0.prepared.candidateSetIdentity,
      appCapability: payload0.perceptionAppCapability,
      jobId: started.structuredContent.jobId,
      terminalizeAppliedResult: true,
    };
    const contradictory = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: { ...terminalizeArguments, rollbackAppliedResult: true },
    });
    assert.equal(contradictory.isError, true);
    const terminalized = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: terminalizeArguments,
    });
    assert.equal(terminalized.isError, undefined, JSON.stringify(terminalized));
    assert.equal(
      terminalized._meta.normaPersonalVisualHarmony.prepared.candidateSetIdentity,
      readyPayload.prepared.candidateSetIdentity,
    );
    assert.equal(
      terminalized._meta.normaPersonalVisualHarmony.multiPerceptionWorkflow.terminalState,
      "object-b-failed",
    );
    assert.equal(
      terminalized._meta.normaPersonalVisualHarmony.multiPerceptionWorkflow.active,
      false,
    );
    const repeated = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: terminalizeArguments,
    });
    assert.equal(repeated.isError, undefined, JSON.stringify(repeated));
    assert.equal(
      repeated._meta.normaPersonalVisualHarmony.multiPerceptionWorkflow.terminalState,
      "object-b-failed",
    );
    assert.equal(prompts.length, 1);
    assert.equal(terminalized.structuredContent.coreRun, false);
  } finally {
    await connected.close();
  }
});

test("a timed-out object A terminalizes its bound workflow without Core or provider retry", async () => {
  let providerCalls = 0;
  const jobs = new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider: {
      async segment() {
        providerCalls += 1;
        return new Promise(() => {});
      },
    },
    executionDeadlineMs: 10,
    allowedSourceImageOrigins: ["https://files.example.test"],
    fetch: async () => new Response(sourceBytes, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(sourceBytes.byteLength),
      },
    }),
    createJobId: () => "job:mcp-two-object-timeout",
  });
  const service = new PersonalVisualHarmonySessionServiceV1({
    createSessionId: () => "session:mcp-two-object-timeout",
  });
  const connected = await connect({ service, jobs, subjectId: "subject:owner" });
  try {
    const initial = await prepare(connected.client);
    const payload = initial._meta.normaPersonalVisualHarmony;
    const startArguments = {
      sessionId: payload.sessionId,
      candidateSetIdentity: payload.prepared.candidateSetIdentity,
      appCapability: payload.perceptionAppCapability,
      sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh",
      semanticTarget: "person",
      label: "Objet A",
      role: "primary-subject",
      workflowMode: "two-object-spatial",
      guidedAnalysisGoal: "compare-two-lengths",
    };
    const started = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments,
    });
    assert.equal(started.isError, undefined, JSON.stringify(started));

    await new Promise((resolve) => setTimeout(resolve, 25));

    const statusArguments = {
      sessionId: payload.sessionId,
      candidateSetIdentity: payload.prepared.candidateSetIdentity,
      appCapability: payload.perceptionAppCapability,
      jobId: started.structuredContent.jobId,
    };
    const failed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: statusArguments,
    });
    assert.equal(failed.isError, undefined, JSON.stringify(failed));
    assert.equal(failed.structuredContent.state, "failed");
    assert.equal(failed.structuredContent.errorCode, "job_execution_timeout");
    assert.equal(failed.structuredContent.coreRun, false);
    assert.equal("result" in failed.structuredContent, false);
    assert.deepEqual(failed._meta.normaPersonalVisualHarmony.multiPerceptionWorkflow, {
      workflowMode: "two-object-spatial",
      consumedAttempts: 1,
      active: false,
      terminalState: "object-a-failed",
    });

    const replay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: statusArguments,
    });
    assert.equal(replay.isError, undefined, JSON.stringify(replay));
    assert.deepEqual(replay.structuredContent, failed.structuredContent);
    const retry = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments,
    });
    assert.equal(retry.isError, true);
    assert.equal(providerCalls, 1);
  } finally {
    await connected.close();
  }
});

test("an expired object A terminalizes its bound workflow and releases review without Core", async () => {
  let now = Date.parse("2026-08-01T12:00:00.000Z");
  let providerCalls = 0;
  let releaseProvider = null;
  const readyProvider = successfulProvider();
  const jobs = new InMemoryPersonalVisualHarmonyPerceptionJobService({
    provider: {
      async segment() {
        providerCalls += 1;
        return new Promise((resolve) => {
          releaseProvider = resolve;
        });
      },
    },
    now: () => now,
    ttlMs: 1_000,
    executionDeadlineMs: 1_000,
    allowedSourceImageOrigins: ["https://files.example.test"],
    fetch: async () => new Response(sourceBytes, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(sourceBytes.byteLength),
      },
    }),
    createJobId: () => "job:mcp-two-object-expired",
  });
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => now,
    sessionTtlMs: 5_000,
    createSessionId: () => "session:mcp-two-object-expired",
  });
  const connected = await connect({ service, jobs, subjectId: "subject:owner" });
  try {
    const initial = await prepare(connected.client);
    const payload = initial._meta.normaPersonalVisualHarmony;
    const startArguments = {
      sessionId: payload.sessionId,
      candidateSetIdentity: payload.prepared.candidateSetIdentity,
      appCapability: payload.perceptionAppCapability,
      sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-perception-mcp&sig=fresh",
      semanticTarget: "person",
      label: "Objet A",
      role: "primary-subject",
      workflowMode: "two-object-spatial",
      guidedAnalysisGoal: "compare-two-lengths",
    };
    const started = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments,
    });
    assert.equal(started.isError, undefined, JSON.stringify(started));
    for (let attempt = 0; attempt < 20 && releaseProvider === null; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(providerCalls, 1);
    assert.equal(typeof releaseProvider, "function");

    now += 1_000;
    const status = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
      arguments: {
        sessionId: payload.sessionId,
        candidateSetIdentity: payload.prepared.candidateSetIdentity,
        appCapability: payload.perceptionAppCapability,
        jobId: started.structuredContent.jobId,
      },
    });
    assert.equal(status.isError, undefined, JSON.stringify(status));
    assert.equal(status.structuredContent.state, "expired");
    assert.equal(status.structuredContent.errorCode, "job_expired");
    assert.equal(status.structuredContent.coreRun, false);
    assert.deepEqual(status._meta.normaPersonalVisualHarmony.multiPerceptionWorkflow, {
      workflowMode: "two-object-spatial",
      consumedAttempts: 1,
      active: false,
      terminalState: "object-a-failed",
    });
    const retry = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: startArguments,
    });
    assert.equal(retry.isError, true);
    assert.equal(providerCalls, 1);

    releaseProvider(await readyProvider.segment({
      sourceImageBytes: sourceBytes,
      sourceImageMediaType: "image/png",
      prompt: { kind: "text", text: "person" },
    }));
    await new Promise((resolve) => setImmediate(resolve));
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

test("a bound two-object provider job keeps its session alive through the advertised expiry", () => {
  let now = Date.parse("2026-08-01T10:00:00.000Z");
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => now,
    sessionTtlMs: 1_000,
    createSessionId: () => "session:bound-job-lifetime",
  });
  const initial = service.prepare({
    subjectId: "subject:owner",
    fileId: "file-bound-job-lifetime",
    sourceImageDownloadUrl: "https://files.example.test/private-signed-image?file=file-bound-job-lifetime",
    enablePerception: true,
    mediaType: "image/png",
    candidates: candidates(),
  });
  const reservation = service.reservePerceptionStart({
    subjectId: "subject:owner",
    sessionId: initial.sessionId,
    candidateSetIdentity: initial.prepared.candidateSetIdentity,
    appCapability: initial.perceptionAppCapability,
    workflowMode: "two-object-spatial",
    guidedAnalysisGoal: "compare-two-lengths",
  });
  assert.equal(reservation.attemptOrdinal, 1);
  const jobExpiresAtMs = now + 5_000;
  service.bindPerceptionJob({
    subjectId: "subject:owner",
    sessionId: initial.sessionId,
    attemptOrdinal: 1,
    jobId: "job:bound-session-lifetime",
    expiresAt: new Date(jobExpiresAtMs).toISOString(),
  });

  now += 2_000;
  assert.equal(service.perceptionContext({
    subjectId: "subject:owner",
    sessionId: initial.sessionId,
    candidateSetIdentity: initial.prepared.candidateSetIdentity,
    appCapability: initial.perceptionAppCapability,
  }).fileId, "file-bound-job-lifetime");

  now = jobExpiresAtMs + 1;
  assert.throws(
    () => service.perceptionContext({
      subjectId: "subject:owner",
      sessionId: initial.sessionId,
      candidateSetIdentity: initial.prepared.candidateSetIdentity,
      appCapability: initial.perceptionAppCapability,
    }),
    /missing or expired/u,
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
  assert.match(html, /PERCEPTION_MAX_STATUS_POLLS=160/u);
  assert.match(html, /PERCEPTION_STATUS_POLL_DELAY_MS=2000/u);
  assert.match(html, /PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS=345000/u);
  assert.match(html, /PERCEPTION_TOOL_CALL_TIMEOUT_MS=15000/u);
  assert.match(html, /PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS=250/u);
  assert.match(html, /code==="provider_unavailable"/u);
  assert.match(html, /SAM 3 est resté indisponible pendant son démarrage/u);
  assert.match(html, /pollDeadlineMs=Math\.min\(expiresAtMs,Date\.now\(\)\+PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS\)/u);
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
  assert.match(html, /latePollPhase===0&&remainingPolls<=2/u);
  assert.match(
    html,
    /Math\.floor\(PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS\/2\)/u,
  );
  assert.match(html, /state\.multiPerceptionTerminalState=multiPerceptionObservationCount\(terminalPayload\)===0\?"object-a-failed":"object-b-failed"/u);
  assert.equal(
    html.match(/callAppTool\(START_PERCEPTION_TOOL,.*?,PERCEPTION_TOOL_CALL_TIMEOUT_MS\)/gu)?.length,
    2,
  );
  assert.match(html, /callAppTool\(PERCEPTION_STATUS_TOOL,statusArgs,statusTimeoutMs\)/u);
  assert.equal(
    html.match(/withPerceptionDeadline\(\(\)=>fileApi\(\{fileId:payload\.fileId\}\),PERCEPTION_TOOL_CALL_TIMEOUT_MS,"perception_file_timeout"\)/gu)?.length,
    3,
  );
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

test("semantic targeting stays disabled while late-result reconciliation is blocked", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function refreshSemanticTargetUi(){");
  const end = html.indexOf("\nSEMANTIC_TARGETS.forEach", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const state = {
    completed: false,
    confirming: false,
    pixelRefinementRunning: false,
    perceptionRunning: false,
    perceptionReconciliationBlocked: true,
    imageReady: true,
  };
  const semanticTargetPanel = { hidden: false };
  const semanticTargetInput = { value: "person", disabled: false };
  const semanticTargetSubmit = { disabled: false };
  const semanticTargetValidation = { dataset: {}, textContent: "" };
  const chip = { disabled: false, dataset: { targetValue: "person" }, setAttribute() {} };
  const refreshSemanticTargetUi = new Function(
    "state",
    "semanticTargetPanel",
    "semanticTargetInput",
    "semanticTargetSubmit",
    "semanticTargetValidation",
    "semanticTargetChips",
    "perceptionToggle",
    "selectedSemanticTarget",
    "semanticTargetAlreadyUsed",
    "multiPerceptionStartBlocked",
    `"use strict";${html.slice(start, end)};return refreshSemanticTargetUi;`,
  )(
    state,
    semanticTargetPanel,
    semanticTargetInput,
    semanticTargetSubmit,
    semanticTargetValidation,
    { querySelectorAll: () => [chip] },
    { hidden: false },
    () => "person",
    () => false,
    () => false,
  );
  refreshSemanticTargetUi();
  assert.equal(semanticTargetInput.disabled, true);
  assert.equal(semanticTargetSubmit.disabled, true);
  assert.equal(chip.disabled, true);
  assert.match(
    html,
    /semanticTargetSubmit\.disabled\|\|state\.perceptionReconciliationBlocked\|\|!payload/u,
  );
});

test("widget polling stops at its client deadline without waiting for the server TTL", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function pollPerceptionJob(");
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
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    160,
    2_000,
    320_000,
    15_000,
    250,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async () => {
      statusReads += 1;
      return { structuredContent: { state: "pending" } };
    },
    () => null,
    () => null,
    async () => false,
    (code, message) => Object.assign(new Error(message), { code }),
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
    (error) => error.code === "perception_poll_timeout",
  );
  assert.equal(statusReads, 0);
});

test("widget observes pending then ready during the final 250ms without exceeding the poll cap", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function pollPerceptionJob(");
  const end = html.indexOf("\nperceptionToggle.addEventListener", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  let statusReads = 0;
  let now = 0;
  let appliedAt = null;
  const state = {
    activePayloadIdentity: "payload:active",
    completed: false,
    perceptionRunning: true,
    multiPerceptionTerminalState: null,
  };
  const readTimes = [];
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    "Date",
    "setTimeout",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    160,
    0,
    1_000,
    100,
    250,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async () => {
      statusReads += 1;
      readTimes.push(now);
      return { structuredContent: { state: now >= 875 ? "ready" : "pending" } };
    },
    (response) => response.structuredContent.state === "ready" ? { id: "ready" } : null,
    () => "payload:ready",
    async (_payload, response) => {
      if (response.structuredContent.state !== "ready") return false;
      appliedAt = now;
      return true;
    },
    (code, message) => Object.assign(new Error(message), { code }),
    { now: () => now, parse: () => 1_000 },
    (resolve, delayMs) => {
      now += delayMs;
      resolve();
    },
  );
  await pollPerceptionJob(
    {
      sessionId: "session:poll-final",
      fileId: "file:poll-final",
      perceptionAppCapability: "pvh-app:poll-final-capability",
      prepared: { candidateSetIdentity: `sha256:${"1".repeat(64)}` },
    },
    "job:poll-final",
    "2026-08-03T00:00:01.000Z",
    "payload:active",
  );
  assert.equal(statusReads, 160);
  assert.equal(readTimes.at(-2), 750);
  assert.equal(readTimes.at(-1), 875);
  assert.equal(appliedAt, 875);
  assert.ok(readTimes.every((readAt) => readAt < 1_000));
});

test("widget reserves a status read after the server execution deadline", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function pollPerceptionJob(");
  const end = html.indexOf("\nperceptionToggle.addEventListener", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  let now = 0;
  let terminalStatusObserved = false;
  const readTimes = [];
  const toolCallTimeoutMs = 15_000;
  const clientWorkflowTimeoutMs =
    DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS + toolCallTimeoutMs;
  const state = {
    activePayloadIdentity: "payload:active",
    completed: false,
    perceptionRunning: true,
    multiPerceptionTerminalState: null,
  };
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    "Date",
    "setTimeout",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    160,
    2_000,
    clientWorkflowTimeoutMs,
    toolCallTimeoutMs,
    250,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async () => {
      readTimes.push(now);
      return {
        structuredContent: {
          state: now >= DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS
            ? "failed"
            : "pending",
        },
      };
    },
    () => null,
    () => null,
    async (_payload, response) => {
      if (response.structuredContent.state === "pending") return false;
      terminalStatusObserved = true;
      return true;
    },
    (code, message) => Object.assign(new Error(message), { code }),
    { now: () => now, parse: () => clientWorkflowTimeoutMs },
    (resolve, delayMs) => {
      now += delayMs;
      resolve();
    },
  );

  await pollPerceptionJob(
    {
      sessionId: "session:poll-server-terminal",
      perceptionAppCapability: "pvh-app:poll-server-terminal-capability",
      prepared: { candidateSetIdentity: `sha256:${"4".repeat(64)}` },
    },
    "job:poll-server-terminal",
    "2026-08-03T00:05:45.000Z",
    "payload:active",
  );
  assert.equal(terminalStatusObserved, true);
  assert.ok(readTimes.at(-1) >= DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS);
  assert.ok(readTimes.every((readAt) => readAt < clientWorkflowTimeoutMs));
  assert.ok(readTimes.length <= 160);
});

test("widget rejects a ready status response that resolves after its client deadline", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function pollPerceptionJob(");
  const end = html.indexOf("\nperceptionToggle.addEventListener", start);
  const state = { activePayloadIdentity: "payload:active", completed: false };
  let applied = 0;
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    1,
    2_000,
    30,
    15,
    10,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { structuredContent: { state: "ready" } };
    },
    () => null,
    () => null,
    async () => {
      applied += 1;
      return true;
    },
    (code, message) => Object.assign(new Error(message), { code }),
  );
  await assert.rejects(
    () => pollPerceptionJob(
      {
        sessionId: "session:poll-late",
        perceptionAppCapability: "pvh-app:poll-late-capability",
        prepared: { candidateSetIdentity: `sha256:${"2".repeat(64)}` },
      },
      "job:poll-late",
      new Date(Date.now() + 100).toISOString(),
      "payload:active",
    ),
    (error) => error.code === "perception_poll_timeout",
  );
  assert.equal(applied, 0);
});

test("widget rolls back a ready two-object status that resolves after cutoff before timing out", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function pollPerceptionJob(");
  const end = html.indexOf("\nperceptionToggle.addEventListener", start);
  const originalPayload = {
    sessionId: "session:poll-late-rollback",
    fileId: "file:poll-late-rollback",
    perceptionAppCapability: "pvh-app:poll-late-rollback-capability",
    prepared: {
      candidateSetIdentity: `sha256:${"5".repeat(64)}`,
      workflowMode: "two-object-spatial",
    },
  };
  const readyPayload = {
    ...originalPayload,
    prepared: {
      candidateSetIdentity: `sha256:${"6".repeat(64)}`,
      workflowMode: "two-object-spatial",
      perceptionManifest: { observations: [{ candidateId: "object-a" }] },
    },
  };
  const rolledBackPayload = {
    ...originalPayload,
    multiPerceptionWorkflow: { terminalState: "object-a-failed" },
  };
  const state = { activePayloadIdentity: "payload:original", completed: false };
  let now = 0;
  let applied = 0;
  const calls = [];
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    "Date",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    1,
    0,
    1_000,
    100,
    250,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async (_tool, args, timeoutMs) => {
      calls.push({ args, timeoutMs });
      if (args.rollbackAppliedResult === true) {
        return {
          structuredContent: {
            jobId: "job:poll-late-rollback",
            state: "ready",
            workflowMode: "two-object-spatial",
            attemptOrdinal: 1,
          },
          _meta: { normaPersonalVisualHarmony: rolledBackPayload },
        };
      }
      now = 1_000;
      return {
        structuredContent: {
          jobId: "job:poll-late-rollback",
          state: "ready",
          workflowMode: "two-object-spatial",
          attemptOrdinal: 1,
        },
        _meta: { normaPersonalVisualHarmony: readyPayload },
      };
    },
    (response) => response?._meta?.normaPersonalVisualHarmony ?? null,
    (payload) => payload.prepared.candidateSetIdentity === originalPayload.prepared.candidateSetIdentity
      ? "payload:original"
      : "payload:ready",
    async () => {
      applied += 1;
      return true;
    },
    (code, message) => Object.assign(new Error(message), { code }),
    { now: () => now, parse: () => 1_000 },
  );

  await assert.rejects(
    () => pollPerceptionJob(
      originalPayload,
      "job:poll-late-rollback",
      "2026-08-03T00:00:01.000Z",
      "payload:original",
      1,
    ),
    (error) => error.code === "perception_poll_timeout",
  );
  assert.equal(applied, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].args.rollbackAppliedResult, undefined);
  assert.equal(calls[0].timeoutMs, 100);
  assert.equal(calls[1].args.rollbackAppliedResult, true);
  assert.equal(calls[1].timeoutMs, 100);
});

test("widget reconciles an applied two-object status discarded by the production timeout wrapper", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const pollStart = html.indexOf("async function pollPerceptionJob(");
  const pollEnd = html.indexOf("\nperceptionToggle.addEventListener", pollStart);
  const deadlineStart = html.indexOf("function withPerceptionDeadline(");
  const deadlineEnd = html.indexOf("\nfunction rpcRequest", deadlineStart);
  const callStart = html.indexOf("async function callAppTool(");
  const callEnd = html.indexOf("\nfunction samePreparedReviewCandidates", callStart);
  assert.notEqual(pollStart, -1);
  assert.notEqual(pollEnd, -1);
  assert.notEqual(deadlineStart, -1);
  assert.notEqual(deadlineEnd, -1);
  assert.notEqual(callStart, -1);
  assert.notEqual(callEnd, -1);
  const originalPayload = {
    sessionId: "session:poll-wrapper-rollback",
    fileId: "file:poll-wrapper-rollback",
    perceptionAppCapability: "pvh-app:poll-wrapper-rollback-capability",
    prepared: {
      candidateSetIdentity: `sha256:${"7".repeat(64)}`,
      workflowMode: "two-object-spatial",
      perceptionManifest: { observations: [] },
    },
  };
  const rolledBackPayload = {
    ...originalPayload,
    multiPerceptionWorkflow: { terminalState: "object-a-failed" },
  };
  let serverApplied = false;
  let serverCancelled = false;
  let appliedInWidget = 0;
  const calls = [];
  let nextTimerId = 0;
  const timers = new Map();
  let now = 0;
  const controlledDate = { now: () => now, parse: () => 1_000 };
  const controlledSetTimeout = (callback, timeoutMs) => {
    const timerId = ++nextTimerId;
    timers.set(timerId, { callback, timeoutMs });
    return timerId;
  };
  const controlledClearTimeout = (timerId) => {
    timers.delete(timerId);
  };
  let resolveLateStatus;
  const window = {
    openai: {
      callTool: async (_tool, args) => {
        calls.push(args);
        if (args.rollbackAppliedResult === true) {
          serverCancelled = true;
          serverApplied = false;
          return {
            structuredContent: {
              jobId: "job:poll-wrapper-rollback",
              state: "ready",
              workflowMode: "two-object-spatial",
              attemptOrdinal: 1,
            },
            _meta: { normaPersonalVisualHarmony: rolledBackPayload },
          };
        }
        serverApplied = true;
        return new Promise((resolve) => {
          resolveLateStatus = () => resolve({
            structuredContent: {
              jobId: "job:poll-wrapper-rollback",
              state: "ready",
              workflowMode: "two-object-spatial",
              attemptOrdinal: 1,
            },
          });
        });
      },
    },
  };
  const perceptionClientError = (code, message) => Object.assign(new Error(message), { code });
  const callAppTool = new Function(
    "window",
    "perceptionClientError",
    "setTimeout",
    "clearTimeout",
    `"use strict";${html.slice(deadlineStart, deadlineEnd)}\n${html.slice(callStart, callEnd)};return callAppTool;`,
  )(window, perceptionClientError, controlledSetTimeout, controlledClearTimeout);
  const state = { activePayloadIdentity: "payload:original", completed: false };
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    "Date",
    "setTimeout",
    `"use strict";${html.slice(pollStart, pollEnd)};return pollPerceptionJob;`,
  )(
    state,
    1,
    0,
    1_000,
    50,
    5,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    callAppTool,
    (response) => response?._meta?.normaPersonalVisualHarmony ?? null,
    () => "payload:original",
    async () => {
      appliedInWidget += 1;
      return true;
    },
    perceptionClientError,
    controlledDate,
    controlledSetTimeout,
  );

  const polling = pollPerceptionJob(
    originalPayload,
    "job:poll-wrapper-rollback",
    "2026-08-03T00:00:01.000Z",
    "payload:original",
    1,
  );
  assert.equal(calls.length, 0);
  assert.equal(timers.size, 1);
  const finalWait = timers.entries().next().value;
  timers.delete(finalWait[0]);
  now += finalWait[1].timeoutMs;
  finalWait[1].callback();
  for (let attempt = 0; attempt < 10 && calls.length === 0; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(serverApplied, true);
  assert.equal(timers.size, 1);
  const timeout = timers.entries().next().value;
  timers.delete(timeout[0]);
  now += timeout[1].timeoutMs;
  timeout[1].callback();
  await assert.rejects(
    () => polling,
    (error) => error.code === "perception_poll_timeout",
  );
  resolveLateStatus();
  await Promise.resolve();
  assert.equal(serverCancelled, true);
  assert.equal(serverApplied, false);
  assert.equal(appliedInWidget, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].rollbackAppliedResult, true);
});

test("widget rejects a ready status whose application completes after its client deadline", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("async function pollPerceptionJob(");
  const end = html.indexOf("\nperceptionToggle.addEventListener", start);
  const originalPayload = {
    id: "payload:active",
    sessionId: "session:poll-apply-late",
    perceptionAppCapability: "pvh-app:poll-apply-late-capability",
    prepared: {
      candidateSetIdentity: `sha256:${"3".repeat(64)}`,
      workflowMode: "two-object-spatial",
      perceptionManifest: { observations: [] },
    },
  };
  const readyPayload = {
    ...originalPayload,
    id: "payload:ready",
    prepared: {
      ...originalPayload.prepared,
      candidateSetIdentity: `sha256:${"4".repeat(64)}`,
      perceptionManifest: { observations: [{ candidateId: "object-a" }] },
    },
  };
  const state = {
    activePayloadIdentity: "payload:active",
    payload: originalPayload,
    completed: false,
  };
  let applied = 0;
  let now = 0;
  const calls = [];
  const pollPerceptionJob = new Function(
    "state",
    "PERCEPTION_MAX_STATUS_POLLS",
    "PERCEPTION_STATUS_POLL_DELAY_MS",
    "PERCEPTION_CLIENT_WORKFLOW_TIMEOUT_MS",
    "PERCEPTION_TOOL_CALL_TIMEOUT_MS",
    "PERCEPTION_FINAL_STATUS_POLL_BUDGET_MS",
    "PERCEPTION_STATUS_TOOL",
    "callAppTool",
    "findPayload",
    "payloadIdentity",
    "applyPerceptionStatusResponse",
    "perceptionClientError",
    "Date",
    "setTimeout",
    `"use strict";${html.slice(start, end)};return pollPerceptionJob;`,
  )(
    state,
    1,
    2_000,
    30,
    15,
    10,
    PERSONAL_VISUAL_HARMONY_PERCEPTION_STATUS_TOOL,
    async (_tool, args) => {
      calls.push(args);
      return {
        structuredContent: {
          jobId: "job:poll-apply-late",
          state: "ready",
          workflowMode: "two-object-spatial",
          attemptOrdinal: 1,
        },
        _meta: {
          normaPersonalVisualHarmony: args.terminalizeAppliedResult === true
            ? {
                ...readyPayload,
                multiPerceptionWorkflow: {
                  active: false,
                  terminalState: "object-b-failed",
                },
              }
            : readyPayload,
        },
      };
    },
    (response) => response?._meta?.normaPersonalVisualHarmony ?? null,
    (payload) => payload.id,
    async () => {
      applied += 1;
      state.activePayloadIdentity = "payload:ready";
      state.payload = readyPayload;
      now = 30;
      return true;
    },
    (code, message) => Object.assign(new Error(message), { code }),
    { now: () => now, parse: () => 100 },
    (resolve, delayMs) => {
      now += delayMs;
      resolve();
    },
  );
  await assert.rejects(
    () => pollPerceptionJob(
      originalPayload,
      "job:poll-apply-late",
      "2026-08-03T00:00:00.100Z",
      "payload:active",
      1,
    ),
    (error) => error.code === "perception_poll_timeout"
      && error.appliedPayloadIdentity === "payload:ready",
  );
  assert.equal(applied, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].terminalizeAppliedResult, true);
  assert.equal(calls[1].rollbackAppliedResult, undefined);
});

test("widget preserves a poll timeout after late hydration replaces the payload identity", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function perceptionClientFailureIsCurrent(");
  const end = html.indexOf("\nasync function applyPerceptionStatusResponse", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const state = { activePayloadIdentity: "payload:ready" };
  const perceptionClientFailureIsCurrent = new Function(
    "state",
    `"use strict";${html.slice(start, end)};return perceptionClientFailureIsCurrent;`,
  )(state);

  assert.equal(
    perceptionClientFailureIsCurrent(
      "payload:pending",
      Object.assign(new Error("late hydration"), {
        code: "perception_poll_timeout",
        appliedPayloadIdentity: "payload:ready",
      }),
    ),
    true,
  );
  assert.equal(
    perceptionClientFailureIsCurrent(
      "payload:pending",
      Object.assign(new Error("unrelated late hydration"), {
        code: "perception_poll_timeout",
        appliedPayloadIdentity: "payload:other",
      }),
    ),
    false,
  );
  assert.equal(
    perceptionClientFailureIsCurrent("payload:pending", new Error("stale request")),
    false,
  );
  assert.equal(
    perceptionClientFailureIsCurrent("payload:ready", new Error("current request")),
    true,
  );

  assert.equal(
    html.split("perceptionClientFailureIsCurrent(expectedPayloadIdentity,error)").length - 1,
    3,
  );
});

test("widget keeps the review fail-closed when late-result rollback cannot be confirmed", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function perceptionFailureMessage(");
  const end = html.indexOf("\nasync function applyPerceptionStatusResponse", start);
  const payload = {
    prepared: {
      workflowMode: "two-object-spatial",
      perceptionManifest: { observations: [] },
    },
  };
  const state = {
    payload,
    perceptionRunning: true,
    perceptionReconciliationBlocked: false,
    multiPerceptionTerminalState: null,
  };
  const locks = [];
  const terminalize = new Function(
    "state",
    "perceptionWorkflowArgs",
    "multiPerceptionObservationCount",
    "setReviewLocked",
    "multiPerceptionReviewLocked",
    `"use strict";${html.slice(start, end)};return terminalizePerceptionClientFailure;`,
  )(
    state,
    () => ({ workflowMode: "two-object-spatial" }),
    () => 0,
    (locked) => locks.push(locked),
    () => state.perceptionReconciliationBlocked,
  );

  const message = terminalize(
    payload,
    Object.assign(new Error("rollback uncertain"), {
      code: "perception_reconciliation_failed",
    }),
  );
  assert.equal(state.perceptionRunning, false);
  assert.equal(state.perceptionReconciliationBlocked, true);
  assert.equal(state.multiPerceptionTerminalState, null);
  assert.deepEqual(locks, [true]);
  assert.match(message, /vue reste verrouillée/u);
});

test("a trusted payload for a new session clears only the old reconciliation lock", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function resetPerceptionReconciliationForNewSession(");
  const end = html.indexOf("\nasync function hydrate(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const state = {
    payload: { sessionId: "session:ambiguous" },
    activePayload: { sessionId: "session:ambiguous" },
    perceptionReconciliationBlocked: true,
  };
  const reset = new Function(
    "state",
    `"use strict";${html.slice(start, end)};return resetPerceptionReconciliationForNewSession;`,
  )(state);
  reset({ sessionId: "session:ambiguous" });
  assert.equal(state.perceptionReconciliationBlocked, true);
  reset({ sessionId: "session:fresh" });
  assert.equal(state.perceptionReconciliationBlocked, false);
  assert.match(html, /resetPerceptionReconciliationForNewSession\(payload\)/u);
});

test("a late object-A hydration timeout terminalizes against the applied payload", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function perceptionFailureMessage(");
  const end = html.indexOf("\nasync function applyPerceptionStatusResponse", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const originalPayload = {
    prepared: {
      workflowMode: "two-object-spatial",
      perceptionManifest: { observations: [] },
    },
  };
  const appliedPayload = {
    prepared: {
      workflowMode: "two-object-spatial",
      perceptionManifest: { observations: [{ candidateId: "object-a" }] },
    },
  };
  const state = {
    activePayloadIdentity: "payload:ready",
    payload: appliedPayload,
    perceptionRunning: true,
    multiPerceptionTerminalState: null,
  };
  const locks = [];
  const observationCount = (payload = state.payload) =>
    payload.prepared.perceptionManifest.observations.length;
  const terminalize = new Function(
    "state",
    "perceptionWorkflowArgs",
    "multiPerceptionObservationCount",
    "setReviewLocked",
    "multiPerceptionReviewLocked",
    `"use strict";${html.slice(start, end)};return terminalizePerceptionClientFailure;`,
  )(
    state,
    (payload) => payload.prepared.workflowMode === "two-object-spatial"
      ? { workflowMode: "two-object-spatial" }
      : {},
    observationCount,
    (locked) => locks.push(locked),
    () => state.perceptionRunning
      || (observationCount() === 1 && state.multiPerceptionTerminalState !== "object-b-failed"),
  );

  terminalize(originalPayload, Object.assign(new Error("late hydration"), {
    code: "perception_poll_timeout",
    appliedPayloadIdentity: "payload:ready",
  }));

  assert.equal(state.multiPerceptionTerminalState, "object-b-failed");
  assert.deepEqual(locks, [false]);
});

test("a bridge tools/call that never answers is bounded and clears its pending request", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("let rpcId=0,bridgeReady;");
  const end = html.indexOf("\nasync function initializeBridge", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const posted = [];
  const { rpcRequest, pendingRequests } = new Function(
    "window",
    `"use strict";${html.slice(start, end)};return{rpcRequest,pendingRequests};`,
  )({ parent: { postMessage(message) { posted.push(message); } } });

  await assert.rejects(
    () => rpcRequest("tools/call", {
      name: PERSONAL_VISUAL_HARMONY_START_PERCEPTION_TOOL,
      arguments: {},
    }, 5),
    (error) => error.code === "perception_tool_timeout",
  );
  assert.equal(posted.length, 1);
  assert.equal(pendingRequests.size, 0);
});

test("a terminal perception timeout unlocks the two-object review without Core or retry", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const start = html.indexOf("function perceptionFailureMessage(");
  const end = html.indexOf("\nasync function applyPerceptionStatusResponse", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const state = {
    perceptionRunning: true,
    multiPerceptionTerminalState: null,
  };
  const locks = [];
  let coreCalls = 0;
  const terminalize = new Function(
    "state",
    "perceptionWorkflowArgs",
    "multiPerceptionObservationCount",
    "setReviewLocked",
    "multiPerceptionReviewLocked",
    `"use strict";${html.slice(start, end)};return terminalizePerceptionClientFailure;`,
  )(
    state,
    () => ({ workflowMode: "two-object-spatial" }),
    () => 0,
    (locked) => locks.push(locked),
    () => state.perceptionRunning
      || state.multiPerceptionTerminalState === null,
  );

  const message = terminalize({}, Object.assign(new Error("timeout"), {
    code: "perception_tool_timeout",
  }));
  assert.equal(state.perceptionRunning, false);
  assert.equal(state.multiPerceptionTerminalState, "object-a-failed");
  assert.deepEqual(locks, [false]);
  assert.match(message, /Norma Core reste arrêté/u);
  assert.match(message, /nouvelle tentative explicite/u);
  assert.equal(coreCalls, 0);
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
