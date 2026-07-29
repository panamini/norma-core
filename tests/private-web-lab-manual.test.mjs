import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePersonalVisualHarmonyImagePlaneRelationsV1,
  confirmPersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyManualCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
import {
  PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID,
  PRIVATE_WEB_LAB_MANUAL_RECEIPT_CONTRACT_ID,
  PrivateWebLabApplicationV1,
} from "../dist/src/private-web-lab.js";

const sourceImageContentIdentity = `sha256:${"d".repeat(64)}`;
const browserSessionId = "browser:manual-authoring-test";
const fixedNow = Date.parse("2026-07-29T10:00:00.000Z");

function manualCandidates() {
  return [
    {
      id: "manual-rectangle-1",
      kind: "rectangle",
      x: 0.1,
      y: 0.1,
      width: 0.6,
      height: 0.7,
    },
    {
      id: "manual-segment-1",
      kind: "segment",
      start: { x: 0.1, y: 0.25 },
      end: { x: 0.9, y: 0.25 },
    },
    {
      id: "manual-segment-2",
      kind: "segment",
      start: { x: 0.15, y: 0.1 },
      end: { x: 0.15, y: 0.9 },
    },
  ];
}

function manualDraftRequest(overrides = {}) {
  return {
    browserSessionId,
    previousLabSessionId: null,
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    goalId: "compare-two-lengths",
    candidates: manualCandidates(),
    ...overrides,
  };
}

function manualConfirmationRequest(draft, overrides = {}) {
  return {
    explicitConfirmation: true,
    browserSessionId,
    labSessionId: draft.labSessionId,
    sourceImageContentIdentity,
    candidateSetIdentity: draft.candidateSetIdentity,
    perceptionReceiptIdentity: draft.perceptionReceiptIdentity,
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    selectedCandidateIds: draft.candidates.map(({ id }) => id),
    reviewedCandidates: structuredClone(draft.candidates),
    measurementCandidateIds: ["manual-segment-1", "manual-segment-2"],
    ...overrides,
  };
}

function applicationWithCounter(onCoreCall = () => {}) {
  return new PrivateWebLabApplicationV1({
    now: () => fixedNow,
    createSessionId: () => "web-lab-session:33333333-3333-4333-8333-333333333333",
    executeConfirmation: (input) => {
      onCoreCall();
      return confirmPersonalVisualHarmonyCandidateSetV1(input);
    },
  });
}

test("manual authoring prepares truthful provider-neutral provenance with Core stopped", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const draft = application.prepareManualDraft(manualDraftRequest());

  assert.equal(draft.contractId, PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID);
  assert.equal(draft.draftKind, "manual_browser_no_provider");
  assert.equal(draft.providerCalls, 0);
  assert.equal(draft.coreRun, false);
  assert.equal(draft.candidates.length, 3);
  assert.deepEqual(draft.selectedCandidateIds, []);
  assert.match(draft.perceptionReceiptIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(draft.coreCompatibilityCandidateSetIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(coreCalls, 0);
});

test("manual contract keeps audit identity, truthful provenance, and explicit Core compatibility", () => {
  const application = applicationWithCounter();
  const draft = application.prepareManualDraft(manualDraftRequest());
  const prepared = preparePersonalVisualHarmonyManualCandidateSetV1({
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    perceptionReceiptIdentity: draft.perceptionReceiptIdentity,
    candidates: draft.candidates,
  });
  const legacyPrepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: draft.sourceFileId,
    sourceImageMediaType: draft.sourceImageMediaType,
    candidates: draft.candidates,
  });
  assert.equal(prepared.contractVersion, 1);
  assert.equal(
    prepared.coreCompatibilityCandidateSetIdentity,
    legacyPrepared.candidateSetIdentity,
  );
  assert.throws(
    () => confirmPersonalVisualHarmonyCandidateSetV1({
      preparedCandidateSet: {
        ...prepared,
        coreCompatibilityCandidateSetIdentity: `sha256:${"f".repeat(64)}`,
      },
      expectedCandidateSetIdentity: prepared.candidateSetIdentity,
      selectedCandidateIds: ["manual-rectangle-1"],
      sourcePixelWidth: 1200,
      sourcePixelHeight: 800,
      acceptedAt: new Date(fixedNow).toISOString(),
    }),
    /Core compatibility identity is invalid/u,
  );

  const confirmationInput = {
    expectedCandidateSetIdentity: prepared.candidateSetIdentity,
    selectedCandidateIds: ["manual-rectangle-1"],
    confirmedVisualGuideCandidateIds: ["manual-segment-1", "manual-segment-2"],
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    acceptedAt: new Date(fixedNow).toISOString(),
  };
  const confirmation = confirmPersonalVisualHarmonyCandidateSetV1({
    ...confirmationInput,
    preparedCandidateSet: prepared,
  });
  assert.equal(
    confirmation.result.sourceImageDimensionsObservedBy,
    "private_web_lab_browser",
  );
  assert.equal(
    confirmation.result.confirmationMode,
    "client_asserted_private_web_lab_interaction",
  );
  assert.equal(
    confirmation.imagePlaneGuideAnalysis.sourceImageDimensionsObservedBy,
    "private_web_lab_browser",
  );
  assert.equal(
    confirmation.imagePlaneGuideAnalysis.confirmationMode,
    "client_asserted_private_web_lab_interaction",
  );
  assert.notEqual(
    confirmation.auditAcceptedGeometryContentIdentity,
    confirmation.acceptedGeometryContentIdentity,
  );
  const legacyConfirmation = confirmPersonalVisualHarmonyCandidateSetV1({
    ...confirmationInput,
    preparedCandidateSet: legacyPrepared,
    expectedCandidateSetIdentity: legacyPrepared.candidateSetIdentity,
  });
  assert.equal(
    confirmation.acceptedGeometryContentIdentity,
    legacyConfirmation.acceptedGeometryContentIdentity,
  );
  assert.throws(
    () => confirmPersonalVisualHarmonyCandidateSetV1({
      ...confirmationInput,
      preparedCandidateSet: prepared,
      sourcePixelWidth: 800,
      sourcePixelHeight: 1200,
    }),
    /source dimensions do not match the prepared review/u,
  );
  assert.throws(
    () => analyzePersonalVisualHarmonyImagePlaneRelationsV1({
      preparedCandidateSet: prepared,
      confirmedVisualGuideCandidateIds: ["manual-segment-1"],
      sourcePixelWidth: 800,
      sourcePixelHeight: 1200,
    }),
    /source dimensions do not match the prepared review/u,
  );

  const otherPrepared = preparePersonalVisualHarmonyManualCandidateSetV1({
    sourceImageContentIdentity,
    sourceImageMediaType: "image/png",
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    perceptionReceiptIdentity: `sha256:${"e".repeat(64)}`,
    candidates: draft.candidates,
  });
  const otherConfirmation = confirmPersonalVisualHarmonyCandidateSetV1({
    ...confirmationInput,
    preparedCandidateSet: otherPrepared,
    expectedCandidateSetIdentity: otherPrepared.candidateSetIdentity,
  });
  assert.notEqual(
    confirmation.result.confirmedSelectionIdentity,
    otherConfirmation.result.confirmedSelectionIdentity,
  );
  assert.deepEqual(
    confirmation.result.harmonicAnalysis,
    otherConfirmation.result.harmonicAnalysis,
  );
});

test("manual review remains selectable, confirms once, and new measurement invalidates the session", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const draft = application.prepareManualDraft(manualDraftRequest());
  const receipt = application.confirmManual(manualConfirmationRequest(draft));

  assert.equal(receipt.contractId, PRIVATE_WEB_LAB_MANUAL_RECEIPT_CONTRACT_ID);
  assert.equal(receipt.draftKind, "manual_browser_no_provider");
  assert.equal(receipt.perceptionReceiptIdentity, draft.perceptionReceiptIdentity);
  assert.equal(
    receipt.coreCompatibilityCandidateSetIdentity,
    draft.coreCompatibilityCandidateSetIdentity,
  );
  assert.equal(receipt.providerCalls, 0);
  assert.equal(receipt.coreRun, true);
  assert.match(receipt.acceptedGeometryContentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(receipt.auditAcceptedGeometryContentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.notEqual(
    receipt.acceptedGeometryContentIdentity,
    receipt.auditAcceptedGeometryContentIdentity,
  );
  const exported = JSON.parse(receipt.exportJson);
  assert.equal(
    exported.acceptedGeometryContentIdentity,
    receipt.acceptedGeometryContentIdentity,
  );
  assert.equal(
    exported.auditAcceptedGeometryContentIdentity,
    receipt.auditAcceptedGeometryContentIdentity,
  );
  assert.equal(coreCalls, 1);
  assert.deepEqual(
    application.confirmManual(manualConfirmationRequest(draft)),
    receipt,
  );
  assert.equal(coreCalls, 1);

  assert.throws(
    () => application.startNewMeasurement({
      browserSessionId,
      expectedSessionState: "review",
      labSessionId: draft.labSessionId,
    }),
    /already completed Core/u,
  );
  assert.deepEqual(
    application.confirmManual(manualConfirmationRequest(draft)),
    receipt,
  );
  assert.equal(coreCalls, 1);

  assert.deepEqual(
    application.startNewMeasurement({
      browserSessionId,
      expectedSessionState: "completed",
      labSessionId: draft.labSessionId,
    }),
    { status: "authoring_local", coreRun: false, providerCalls: 0 },
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft)),
    /missing or expired/u,
  );
  assert.equal(coreCalls, 1);
});

test("review reset invalidates the linked session before Core", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const draft = application.prepareManualDraft(manualDraftRequest({
    goalId: "general-geometry",
    candidates: [manualCandidates()[0]],
  }));

  assert.deepEqual(
    application.startNewMeasurement({
      browserSessionId,
      expectedSessionState: "review",
      labSessionId: draft.labSessionId,
    }),
    { status: "authoring_local", coreRun: false, providerCalls: 0 },
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      selectedCandidateIds: [draft.candidates[0].id],
      reviewedCandidates: draft.candidates,
      measurementCandidateIds: null,
    })),
    /missing or expired/u,
  );
  assert.equal(coreCalls, 0);
});

test("manual authoring and confirmation fail closed before Core", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  for (const [candidates, pattern] of [
    [[], /1 to 12/u],
    [
      Array.from({ length: 13 }, (_, index) => ({
        id: `manual-rectangle-${String(index + 1)}`,
        kind: "rectangle",
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      })),
      /1 to 12/u,
    ],
    [
      [manualCandidates()[0], manualCandidates()[0]],
      /unique and bounded/u,
    ],
    [
      [{ ...manualCandidates()[0], width: 0 }],
      /non-degenerate and bounded/u,
    ],
    [
      [{ ...manualCandidates()[0], x: 0.8, width: 0.4 }],
      /non-degenerate and bounded/u,
    ],
  ]) {
    assert.throws(
      () => application.prepareManualDraft(manualDraftRequest({ candidates })),
      pattern,
    );
  }
  assert.throws(
    () => application.prepareManualDraft(manualDraftRequest({
      candidates: [manualCandidates()[1], manualCandidates()[2]],
    })),
    /at least one rectangle/u,
  );
  assert.throws(
    () => application.prepareManualDraft(manualDraftRequest({
      candidates: [manualCandidates()[0], manualCandidates()[1]],
    })),
    /at least two manual segments/u,
  );

  const draft = application.prepareManualDraft(manualDraftRequest());
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      perceptionReceiptIdentity: `sha256:${"e".repeat(64)}`,
    })),
    /provenance is stale or mismatched/u,
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      sourceImageContentIdentity: `sha256:${"f".repeat(64)}`,
    })),
    /source image identity does not match/u,
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      candidateSetIdentity: `sha256:${"a".repeat(64)}`,
    })),
    /candidate identity is stale or mismatched/u,
  );
  const mismatchedCandidates = structuredClone(draft.candidates);
  mismatchedCandidates[1].primitive.kind = "axis";
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      reviewedCandidates: mismatchedCandidates,
    })),
    /metadata or primitive kind does not match/u,
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      selectedCandidateIds: ["manual-segment-1", "manual-segment-2"],
    })),
    /one selected rectangle/u,
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      measurementCandidateIds: ["manual-segment-1", "manual-segment-1"],
    })),
    /exactly two confirmed lengths/u,
  );
  assert.throws(
    () => application.confirmManual(manualConfirmationRequest(draft, {
      selectedCandidateIds: ["manual-rectangle-1", "manual-segment-1"],
      measurementCandidateIds: ["manual-segment-1", "manual-segment-2"],
    })),
    /selected segment or axis/u,
  );
  assert.equal(coreCalls, 0);
});

test("manual Web Lab and existing MCP preparation yield deep-equal canonical Core geometry", () => {
  const application = applicationWithCounter();
  const draft = application.prepareManualDraft(manualDraftRequest());
  const webReceipt = application.confirmManual(manualConfirmationRequest(draft));
  const mcpPrepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: draft.sourceFileId,
    sourceImageMediaType: draft.sourceImageMediaType,
    candidates: draft.candidates,
  });
  const mcpConfirmation = confirmPersonalVisualHarmonyCandidateSetV1({
    preparedCandidateSet: mcpPrepared,
    expectedCandidateSetIdentity: mcpPrepared.candidateSetIdentity,
    selectedCandidateIds: ["manual-rectangle-1"],
    confirmedVisualGuideCandidateIds: ["manual-segment-1", "manual-segment-2"],
    measurementRatioRequest: {
      requestId: "web-lab-two-lengths",
      measurements: [
        { kind: "segment", candidateId: "manual-segment-1" },
        { kind: "segment", candidateId: "manual-segment-2" },
      ],
      ratioPackRefs: [
        "norma.geometry-harmonies@0.1.0",
        "norma.basic-proportions@0.1.0",
      ],
      matchTolerance: 0.025,
    },
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    acceptedAt: new Date(fixedNow).toISOString(),
  });
  assert.deepEqual(
    webReceipt.canonicalCoreResult,
    mcpConfirmation.result.harmonicAnalysis,
  );
  assert.equal(
    Buffer.from(JSON.stringify(webReceipt.canonicalCoreResult)).equals(
      Buffer.from(JSON.stringify(mcpConfirmation.result.harmonicAnalysis)),
    ),
    true,
  );
});
