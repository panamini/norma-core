import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
  PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
  detectPrivateWebLabLocalCvCandidatesV1,
} from "../web-lab/private-web-lab-local-cv.js";

import {
  analyzePersonalVisualHarmonyImagePlaneRelationsV1,
  confirmPersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyManualCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
import {
  confirmDeclaredSpatialMeasurementPlanV1,
  createDeclaredSpatialMeasurementPlanV1,
} from "../dist/src/personal-visual-harmony-spatial-measurements.js";
import {
  PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RECEIPT_CONTRACT_ID,
  PRIVATE_WEB_LAB_LOCAL_CV_COMPOSITE_EXPORT_CONTRACT_ID,
  PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID,
  PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_RECEIPT_CONTRACT_ID,
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

test("manual-only sessions remain free of local-CV fields in drafts, receipts, and exports", () => {
  const application = applicationWithCounter();
  const draft = application.prepareManualDraft(manualDraftRequest());
  const receipt = application.confirmManual(manualConfirmationRequest(draft));

  for (const value of [draft, receipt, JSON.parse(receipt.exportJson)]) {
    assert.equal(
      Object.keys(value).some((key) => key.startsWith("localCv") || key.startsWith("composite")),
      false,
    );
  }
});

test("local-CV provenance is server-bound, deterministic, and linked into the receipt composite", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const localCvProvenanceManifest = localCvManifest();
  const draft = application.prepareManualDraft(manualDraftRequest({
    localCvProvenanceManifest,
  }));
  assert.equal(coreCalls, 0);
  assert.match(draft.localCvProvenanceDraftIdentity, /^sha256:[0-9a-f]{64}$/u);

  const request = manualConfirmationRequest(draft, {
    localCvProvenanceDraftIdentity: draft.localCvProvenanceDraftIdentity,
    localCvProvenanceManifest,
  });
  const receipt = application.confirmManual(request);
  assert.equal(coreCalls, 1);
  assert.equal(
    receipt.localCvProvenanceReceipt.contractId,
    PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_RECEIPT_CONTRACT_ID,
  );
  assert.equal(
    receipt.localCvProvenanceReceipt.serverReceiptIdentity,
    receipt.receiptIdentity,
  );
  assert.equal(
    receipt.localCvProvenanceReceipt.acceptedCandidateSetIdentity,
    receipt.acceptedCandidateSetIdentity,
  );
  assert.equal(
    receipt.localCvProvenanceReceipt.manifestIdentity,
    receipt.localCvProvenanceManifestIdentity,
  );
  assert.equal(
    receipt.localCvProvenanceReceipt.manifest.labSessionId,
    draft.labSessionId,
  );
  assert.equal(
    receipt.localCvProvenanceReceipt.manifest.acceptedCandidateSetIdentity,
    receipt.acceptedCandidateSetIdentity,
  );
  const composite = JSON.parse(receipt.compositeExportJson);
  assert.equal(
    composite.contractId,
    PRIVATE_WEB_LAB_LOCAL_CV_COMPOSITE_EXPORT_CONTRACT_ID,
  );
  assert.equal(composite.serverReceiptIdentity, receipt.receiptIdentity);
  assert.equal(
    composite.acceptedCandidateSetIdentity,
    receipt.acceptedCandidateSetIdentity,
  );
  assert.deepEqual(composite.localCvProvenanceReceipt, receipt.localCvProvenanceReceipt);
  assert.match(receipt.compositeExportIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(application.confirmManual(request), receipt);
  assert.equal(coreCalls, 1);
});

test("local-CV provenance tampering and stale bindings fail before Core", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const manifest = localCvManifest();
  const draft = application.prepareManualDraft(manualDraftRequest({
    localCvProvenanceManifest: manifest,
  }));
  const base = manualConfirmationRequest(draft, {
    localCvProvenanceDraftIdentity: draft.localCvProvenanceDraftIdentity,
    localCvProvenanceManifest: manifest,
  });

  const tamperedManifests = [
    { ...manifest, sourceImageContentIdentity: `sha256:${"e".repeat(64)}` },
    { ...manifest, browserSessionId: "browser:another-session" },
    { ...manifest, candidateOrderIds: [...manifest.candidateOrderIds].reverse() },
    {
      ...manifest,
      raster: { ...manifest.raster, contentIdentity: `sha256:${"e".repeat(64)}` },
    },
    {
      ...manifest,
      run: { ...manifest.run, contentIdentity: `sha256:${"e".repeat(64)}` },
    },
    {
      ...manifest,
      proposals: manifest.proposals.map((proposal) => ({
        ...proposal,
        originalProposalIdentity: `sha256:${"e".repeat(64)}`,
      })),
    },
    {
      ...manifest,
      proposals: manifest.proposals.map((proposal) => ({
        ...proposal,
        originalGeometry: { ...proposal.originalGeometry, x: 0.2 },
      })),
    },
    {
      ...manifest,
      proposals: manifest.proposals.map((proposal) => ({
        ...proposal,
        reviewedGeometry: { ...proposal.reviewedGeometry, x: 0.2 },
        userEdited: false,
      })),
    },
  ];
  for (const localCvProvenanceManifest of tamperedManifests) {
    assert.throws(
      () => application.confirmManual({ ...base, localCvProvenanceManifest }),
      /local CV provenance/u,
    );
  }
  assert.throws(
    () => application.confirmManual({
      ...base,
      localCvProvenanceDraftIdentity: `sha256:${"e".repeat(64)}`,
    }),
    /local CV provenance/u,
  );
  const withoutManifest = { ...base };
  delete withoutManifest.localCvProvenanceManifest;
  assert.throws(
    () => application.confirmManual(withoutManifest),
    /local CV provenance/u,
  );
  assert.equal(coreCalls, 0);
});

test("local-CV provenance rejects animated source media", () => {
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourceImageMediaType: "image/webp",
      localCvProvenanceManifest: localCvManifest(),
    })),
    /local CV provenance requires a static PNG or JPEG source/u,
  );
});

test("local-CV draft provenance rejects duplicate proposal identities and ranks", () => {
  const manifest = localCvManifest();
  const duplicateProposal = {
    ...structuredClone(manifest.proposals[0]),
    candidateId: "manual-segment-1",
    candidateOrder: 1,
  };

  for (const proposals of [
    [...manifest.proposals, duplicateProposal],
    [
      ...manifest.proposals,
      {
        ...duplicateProposal,
        originalProposalIdentity: `sha256:${"e".repeat(64)}`,
      },
    ],
  ]) {
    assert.throws(
      () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
        localCvProvenanceManifest: { ...manifest, proposals },
      })),
      /local CV provenance proposals must have unique identities and ranks/u,
    );
  }
});

test("local-CV draft provenance rejects evidence that contradicts geometry kind", () => {
  const manifest = localCvManifest();
  const evidence = {
    kind: "straight-edge-support",
    supportCoverage: 0.91,
    orientationDegrees: 0,
  };
  const forgedManifest = localCvManifestWithProposal(manifest, {
    ...manifest.proposals[0],
    evidence,
  });

  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: forgedManifest,
    })),
    /local CV provenance run proposal is impossible/u,
  );
});

test("local-CV draft provenance binds the exact worker raster to bounded source dimensions", () => {
  const manifest = localCvManifest();
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: {
        ...manifest,
        raster: { ...manifest.raster, width: 320, height: 213 },
      },
    })),
    /local CV provenance raster dimensions do not match the source/u,
  );
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: 10_000,
      sourcePixelHeight: 5_000,
      localCvProvenanceManifest: {
        ...manifest,
        sourcePixelWidth: 10_000,
        sourcePixelHeight: 5_000,
      },
    })),
    /local CV provenance source exceeds the bounded proof/u,
  );
});

test("local-CV draft provenance rejects contradictory evidence values", () => {
  const manifest = localCvManifest();
  const rectangleEvidence = {
    ...manifest.proposals[0].evidence,
    meanCoverage: 0.1,
  };
  const horizontalSegmentGeometry = {
    ...localCvGridSegmentForTest(64, 106, 575, 106, manifest.raster),
  };
  const contradictoryManifests = [
    localCvManifestWithProposal(manifest, {
      ...manifest.proposals[0],
      evidence: rectangleEvidence,
    }),
    localCvManifestWithProposal(manifest, {
      candidateId: "manual-segment-1",
      candidateOrder: 1,
      originalProposalIdentity: manifest.proposals[0].originalProposalIdentity,
      rank: 1,
      rankScore: 0.91,
      evidence: {
        kind: "straight-edge-support",
        supportCoverage: 0.91,
        orientationDegrees: 90,
      },
      originalGeometry: horizontalSegmentGeometry,
      reviewedGeometry: {
        kind: "segment",
        start: manualCandidates()[1].start,
        end: manualCandidates()[1].end,
      },
      userEdited: true,
    }),
    localCvManifestWithProposal(manifest, {
      ...manifest.proposals[0],
      rankScore: 0.1,
    }),
  ];
  const validSegmentManifest = localCvManifestWithProposal(manifest, {
    ...contradictoryManifests[1].proposals[0],
    evidence: {
      ...contradictoryManifests[1].proposals[0].evidence,
      orientationDegrees: 0,
    },
    rankScore: localCvRankScoreForTest(
      horizontalSegmentGeometry,
      {
        ...contradictoryManifests[1].proposals[0].evidence,
        orientationDegrees: 0,
      },
      manifest.raster,
    ),
  });

  for (const localCvProvenanceManifest of contradictoryManifests) {
    assert.throws(
      () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
        localCvProvenanceManifest,
      })),
      /local CV provenance run proposal is impossible/u,
    );
  }
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: validSegmentManifest,
    })),
  );
  const sparseHoughEvidence = {
    kind: "straight-edge-support",
    supportCoverage: 0.2,
    orientationDegrees: 0,
  };
  const sparseHoughRankScore = localCvRankScoreForTest(
    horizontalSegmentGeometry,
    sparseHoughEvidence,
    manifest.raster,
  );
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithProposal(manifest, {
        ...validSegmentManifest.proposals[0],
        evidence: sparseHoughEvidence,
        rankScore: sparseHoughRankScore,
      }),
    })),
  );
});

test("local-CV run provenance rejects noncanonical detector precision", () => {
  const manifest = localCvManifest();
  const proposal = manifest.proposals[0];
  const noncanonicalProposals = [
    {
      ...proposal,
      originalGeometry: {
        ...proposal.originalGeometry,
        x: proposal.originalGeometry.x + 0.0000001,
      },
    },
    {
      ...proposal,
      evidence: {
        ...proposal.evidence,
        sideCoverages: [0.9000001, ...proposal.evidence.sideCoverages.slice(1)],
      },
    },
    {
      ...proposal,
      rankScore: proposal.rankScore + 0.0000001,
    },
  ];

  for (const noncanonicalProposal of noncanonicalProposals) {
    assert.throws(
      () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
        localCvProvenanceManifest: localCvManifestWithProposal(
          manifest,
          noncanonicalProposal,
        ),
      })),
      /local CV provenance run proposal is impossible/u,
    );
  }

  const preciseReviewedCandidates = manualCandidates();
  preciseReviewedCandidates[0] = {
    ...preciseReviewedCandidates[0],
    x: 0.1000001,
  };
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      candidates: preciseReviewedCandidates,
      localCvProvenanceManifest: {
        ...manifest,
        proposals: manifest.proposals.map((candidate) => ({
          ...candidate,
          reviewedGeometry: {
            ...candidate.reviewedGeometry,
            x: 0.1000001,
          },
        })),
      },
    })),
  );
});

test("local-CV run provenance enforces the interior Hough angle lattice", () => {
  const manifest = localCvManifest();
  const segmentAtDegrees = (startX, startY, degrees) => {
    const radians = degrees * Math.PI / 180;
    const endX = startX + (Math.cos(radians) * 200);
    const endY = startY + (Math.sin(radians) * 200);
    const geometry = {
      kind: "segment",
      start: {
        x: Number((startX / (manifest.raster.width - 1)).toFixed(6)),
        y: Number((startY / (manifest.raster.height - 1)).toFixed(6)),
      },
      end: {
        x: Number((endX / (manifest.raster.width - 1)).toFixed(6)),
        y: Number((endY / (manifest.raster.height - 1)).toFixed(6)),
      },
    };
    const deltaX = (geometry.end.x - geometry.start.x) * (manifest.raster.width - 1);
    const deltaY = (geometry.end.y - geometry.start.y) * (manifest.raster.height - 1);
    return {
      geometry,
      evidence: {
        kind: "straight-edge-support",
        supportCoverage: 0.9,
        orientationDegrees: Number((
          (Math.atan2(deltaY, deltaX) * 180 / Math.PI + 180) % 180
        ).toFixed(6)),
      },
    };
  };
  const manifestForSegment = ({ geometry, evidence }) => {
    const reviewedSegment = manualCandidates()[1];
    return localCvManifestWithProposal(manifest, {
      candidateId: reviewedSegment.id,
      candidateOrder: 1,
      originalProposalIdentity: `sha256:${"0".repeat(64)}`,
      rank: 1,
      rankScore: localCvRankScoreForTest(geometry, evidence, manifest.raster),
      evidence,
      originalGeometry: geometry,
      reviewedGeometry: {
        kind: reviewedSegment.kind,
        start: reviewedSegment.start,
        end: reviewedSegment.end,
      },
      userEdited: true,
    });
  };
  const impossibleInteriorSegment = segmentAtDegrees(100, 100, 46);
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: manifestForSegment(impossibleInteriorSegment),
    })),
    /local CV provenance run proposal is impossible/u,
  );

  const boundaryClampedSegment = segmentAtDegrees(0, 100, 46);
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: manifestForSegment(boundaryClampedSegment),
    })),
  );
});

test("local-CV server accepts genuine detector runs across the bounded corpus", () => {
  let coreCalls = 0;
  const corpus = [
    ["frame-and-oblique", () => {
      const raster = localCvConformanceRaster(192, 144);
      drawLocalCvConformanceRectangle(raster, 14, 12, 112, 102, 2);
      drawLocalCvConformanceSegment(raster, 140, 20, 178, 124, 2);
      return raster;
    }],
    ["nested-frames", () => {
      const raster = localCvConformanceRaster(192, 160);
      drawLocalCvConformanceRectangle(raster, 12, 12, 166, 134, 2);
      drawLocalCvConformanceRectangle(raster, 48, 42, 86, 72, 2);
      return raster;
    }],
    ["axis-and-boundary-clamped", () => {
      const raster = localCvConformanceRaster(160, 120);
      drawLocalCvConformanceRectangle(raster, 48, 18, 95, 72, 3);
      drawLocalCvConformanceSegment(raster, 0, 18, 32, 96, 2);
      drawLocalCvConformanceSegment(raster, 18, 108, 142, 108, 2);
      return raster;
    }],
    ["maximum-working-raster", () => {
      const raster = localCvConformanceRaster(640, 640);
      drawLocalCvConformanceRectangle(raster, 80, 72, 460, 472, 3);
      drawLocalCvConformanceSegment(raster, 32, 580, 608, 580, 2);
      return raster;
    }],
  ];

  for (const [name, createRaster] of corpus) {
    const application = applicationWithCounter(() => {
      coreCalls += 1;
    });
    const raster = createRaster();
    const detection = detectPrivateWebLabLocalCvCandidatesV1(raster);
    assert.equal(detection.status, "detected", name);
    assert.ok(detection.candidates.some(({ kind }) => kind === "rectangle"), name);
    const { candidates, manifest } = localCvManifestFromDetectorRun(raster, detection);
    const draft = application.prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: raster.width,
      sourcePixelHeight: raster.height,
      goalId: "general-geometry",
      candidates,
      localCvProvenanceManifest: manifest,
    }));
    assert.equal(draft.coreRun, false, name);
    assert.equal(draft.providerCalls, 0, name);
    assert.match(draft.localCvProvenanceDraftIdentity, /^sha256:[0-9a-f]{64}$/u, name);
  }
  assert.equal(coreCalls, 0);
});

test("local-CV genuine detector manifests fail closed after immutable mutations", () => {
  let coreCalls = 0;
  const application = applicationWithCounter(() => {
    coreCalls += 1;
  });
  const raster = localCvConformanceRaster(192, 144);
  drawLocalCvConformanceRectangle(raster, 14, 12, 112, 102, 2);
  drawLocalCvConformanceSegment(raster, 140, 20, 178, 124, 2);
  const detection = detectPrivateWebLabLocalCvCandidatesV1(raster);
  assert.equal(detection.status, "detected");
  const { candidates, manifest } = localCvManifestFromDetectorRun(raster, detection);
  const firstRunProposal = manifest.run.proposals[0];
  const firstBoundProposal = manifest.proposals[0];
  const preciseGeometry = firstRunProposal.geometry.kind === "rectangle"
    ? { ...firstRunProposal.geometry, x: firstRunProposal.geometry.x + 0.0000001 }
    : {
        ...firstRunProposal.geometry,
        start: {
          ...firstRunProposal.geometry.start,
          x: firstRunProposal.geometry.start.x + 0.0000001,
        },
      };
  const mutations = [
    {
      ...manifest,
      run: {
        ...manifest.run,
        proposals: [
          { ...firstRunProposal, geometry: preciseGeometry },
          ...manifest.run.proposals.slice(1),
        ],
      },
    },
    {
      ...manifest,
      run: {
        ...manifest.run,
        proposals: [
          { ...firstRunProposal, rankScore: firstRunProposal.rankScore + 0.0000001 },
          ...manifest.run.proposals.slice(1),
        ],
      },
    },
    {
      ...manifest,
      run: { ...manifest.run, contentIdentity: `sha256:${"e".repeat(64)}` },
    },
    {
      ...manifest,
      proposals: [
        { ...firstBoundProposal, originalProposalIdentity: `sha256:${"e".repeat(64)}` },
        ...manifest.proposals.slice(1),
      ],
    },
    { ...manifest, sourceImageContentIdentity: `sha256:${"e".repeat(64)}` },
  ];

  for (const localCvProvenanceManifest of mutations) {
    assert.throws(
      () => application.prepareManualDraft(manualDraftRequest({
        sourcePixelWidth: raster.width,
        sourcePixelHeight: raster.height,
        goalId: "general-geometry",
        candidates,
        localCvProvenanceManifest,
      })),
      /local CV provenance/u,
    );
  }
  assert.equal(coreCalls, 0);
});

test("local-CV run provenance binds every proposal, detector tie order, and rectangle grid", () => {
  const manifest = localCvManifest();
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: {
        ...manifest,
        run: {
          ...manifest.run,
          proposalIdentities: [
            ...manifest.run.proposalIdentities,
            `sha256:${"e".repeat(64)}`,
          ],
        },
      },
    })),
    /local CV provenance run proposal evidence is incomplete/u,
  );

  const segmentGeometry = {
    ...localCvGridSegmentForTest(64, 106, 575, 106, manifest.raster),
  };
  const lengthFraction = (
    Math.hypot(
      (segmentGeometry.end.x - segmentGeometry.start.x) * (manifest.raster.width - 1),
      (segmentGeometry.end.y - segmentGeometry.start.y) * (manifest.raster.height - 1),
    )
    / Math.hypot(manifest.raster.width, manifest.raster.height)
  );
  const tiedRankScore = manifest.run.proposals[0].rankScore;
  const segmentEvidence = {
    kind: "straight-edge-support",
    supportCoverage: Number((
      (tiedRankScore - (lengthFraction * 0.32)) / 0.68
    ).toFixed(6)),
    orientationDegrees: 0,
  };
  const segmentIdentity = contentIdentityForTest({
    contractId: manifest.detector.contractId,
    algorithmVersion: manifest.detector.algorithmVersion,
    sourceImageContentIdentity,
    kind: "segment",
    geometry: { start: segmentGeometry.start, end: segmentGeometry.end },
    evidence: segmentEvidence,
  });
  const reversedTieProposals = [
    {
      proposalIdentity: segmentIdentity,
      rank: 1,
      rankScore: tiedRankScore,
      evidence: segmentEvidence,
      geometry: segmentGeometry,
    },
    {
      ...manifest.run.proposals[0],
      rank: 2,
    },
  ];
  const reversedTieIdentities = reversedTieProposals.map(({ proposalIdentity }) => (
    proposalIdentity
  ));
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: {
        ...manifest,
        run: {
          proposals: reversedTieProposals,
          proposalIdentities: reversedTieIdentities,
          contentIdentity: contentIdentityForTest({
            contractId: manifest.detector.contractId,
            algorithmVersion: manifest.detector.algorithmVersion,
            sourceImageContentIdentity,
            workingImage: {
              width: manifest.raster.width,
              height: manifest.raster.height,
            },
            rasterContentIdentity: manifest.raster.contentIdentity,
            status: "detected",
            abstentionReason: null,
            candidateProposalIdentities: reversedTieIdentities,
          }),
        },
      },
    })),
    /local CV provenance run ranking is invalid/u,
  );

  const offGridGeometry = {
    ...manifest.proposals[0].originalGeometry,
    x: 0.1,
  };
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithProposal(manifest, {
        ...manifest.proposals[0],
        originalGeometry: offGridGeometry,
        rankScore: localCvRankScoreForTest(
          offGridGeometry,
          manifest.proposals[0].evidence,
          manifest.raster,
        ),
      }),
    })),
    /local CV provenance run proposal is impossible/u,
  );

  const offGridSegment = {
    kind: "segment",
    start: { x: 0.1, y: Number((106 / (manifest.raster.height - 1)).toFixed(6)) },
    end: { x: 0.9, y: Number((106 / (manifest.raster.height - 1)).toFixed(6)) },
  };
  const offGridSegmentEvidence = {
    kind: "straight-edge-support",
    supportCoverage: 0.9,
    orientationDegrees: 0,
  };
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithProposal(manifest, {
        candidateId: "manual-segment-1",
        candidateOrder: 1,
        originalGeometry: offGridSegment,
        reviewedGeometry: structuredClone(offGridSegment),
        evidence: offGridSegmentEvidence,
        rank: 1,
        rankScore: localCvRankScoreForTest(
          offGridSegment,
          offGridSegmentEvidence,
          manifest.raster,
        ),
        userEdited: false,
      }),
    })),
    /local CV provenance run proposal is impossible/u,
  );

  const rectangleEvidence = structuredClone(manifest.run.proposals[0].evidence);
  const fourRectangles = [
    [10, 10, 100, 80],
    [140, 10, 100, 80],
    [270, 10, 100, 80],
    [400, 10, 100, 80],
  ].map(([left, top, width, height]) => ({
    geometry: localCvGridRectangleForTest(
      left,
      top,
      width,
      height,
      manifest.raster,
    ),
    evidence: rectangleEvidence,
  }));
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(
        manifest,
        fourRectangles,
      ),
    })),
    /local CV provenance run exceeds detector kind limits/u,
  );

  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(manifest, [{
        geometry: localCvGridRectangleForTest(10, 10, 1, 1, manifest.raster),
        evidence: rectangleEvidence,
      }]),
    })),
    /local CV provenance run geometry is below detector limits/u,
  );

  const boundaryRectangle = localCvGridRectangleForTest(
    20,
    20,
    220,
    160,
    manifest.raster,
  );
  const boundarySegment = {
    kind: "segment",
    start: {
      x: boundaryRectangle.x,
      y: boundaryRectangle.y,
    },
    end: {
      x: Number(((20 + 220) / (manifest.raster.width - 1)).toFixed(6)),
      y: boundaryRectangle.y,
    },
  };
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(manifest, [
        { geometry: boundaryRectangle, evidence: rectangleEvidence },
        {
          geometry: boundarySegment,
          evidence: {
            kind: "straight-edge-support",
            supportCoverage: 0.9,
            orientationDegrees: 0,
          },
        },
      ]),
    })),
    /local CV provenance run contains a suppressed segment/u,
  );

  const nearCutoffAngle = 5.9998 * Math.PI / 180;
  const nearCutoffSegment = {
    kind: "segment",
    start: {
      x: boundaryRectangle.x,
      y: boundaryRectangle.y,
    },
    end: {
      x: Number(((20 + 220) / (manifest.raster.width - 1)).toFixed(6)),
      y: Number((
        (20 + (Math.tan(nearCutoffAngle) * 220))
        / (manifest.raster.height - 1)
      ).toFixed(6)),
    },
  };
  const nearCutoffEvidence = {
    kind: "straight-edge-support",
    supportCoverage: 0.9,
    orientationDegrees: Number((nearCutoffAngle * 180 / Math.PI).toFixed(6)),
  };
  const boundaryManifest = localCvManifestWithProposal(manifest, {
    ...manifest.proposals[0],
    originalGeometry: boundaryRectangle,
    reviewedGeometry: {
      kind: "rectangle",
      x: manualCandidates()[0].x,
      y: manualCandidates()[0].y,
      width: manualCandidates()[0].width,
      height: manualCandidates()[0].height,
    },
    evidence: rectangleEvidence,
    rankScore: localCvRankScoreForTest(
      boundaryRectangle,
      rectangleEvidence,
      manifest.raster,
    ),
  });
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(boundaryManifest, [
        { geometry: boundaryRectangle, evidence: rectangleEvidence },
        { geometry: nearCutoffSegment, evidence: nearCutoffEvidence },
      ]),
    })),
  );

  const cutoffRaster = {
    contentIdentity: `sha256:${"9".repeat(64)}`,
    width: 231,
    height: 113,
  };
  const cutoffRectangle = localCvGridRectangleForTest(
    20,
    20,
    160,
    70,
    cutoffRaster,
  );
  const cutoffRectangleEvidence = structuredClone(rectangleEvidence);
  const cutoffBaseManifest = {
    ...localCvManifest(),
    sourcePixelWidth: cutoffRaster.width,
    sourcePixelHeight: cutoffRaster.height,
    raster: cutoffRaster,
  };
  const cutoffManifest = localCvManifestWithProposal(cutoffBaseManifest, {
    ...cutoffBaseManifest.proposals[0],
    originalGeometry: cutoffRectangle,
    evidence: cutoffRectangleEvidence,
    rankScore: localCvRankScoreForTest(
      cutoffRectangle,
      cutoffRectangleEvidence,
      cutoffRaster,
    ),
  });
  const cutoffSegmentEvidence = (geometry) => ({
    kind: "straight-edge-support",
    supportCoverage: 0.9,
    orientationDegrees: Number((Math.atan2(
      (geometry.end.y - geometry.start.y) * (cutoffRaster.height - 1),
      (geometry.end.x - geometry.start.x) * (cutoffRaster.width - 1),
    ) * 180 / Math.PI).toFixed(6)),
  });
  const roundedDistanceSegment = {
    kind: "segment",
    start: { x: 0.130435, y: 0.212565 },
    end: { x: 0.826087, y: 0.287433 },
  };
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: cutoffRaster.width,
      sourcePixelHeight: cutoffRaster.height,
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(cutoffManifest, [
        { geometry: cutoffRectangle, evidence: cutoffRectangleEvidence },
        {
          geometry: roundedDistanceSegment,
          evidence: cutoffSegmentEvidence(roundedDistanceSegment),
        },
      ]),
    })),
  );

  const roundedOverlapSegment = {
    kind: "segment",
    start: { x: 0.5, y: 0.199818 },
    end: { x: 0.934782, y: 0.246611 },
  };
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: cutoffRaster.width,
      sourcePixelHeight: cutoffRaster.height,
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(cutoffManifest, [
        { geometry: cutoffRectangle, evidence: cutoffRectangleEvidence },
        {
          geometry: roundedOverlapSegment,
          evidence: cutoffSegmentEvidence(roundedOverlapSegment),
        },
      ]),
    })),
  );

  const clearlySuppressedSegment = {
    ...roundedDistanceSegment,
    start: { ...roundedDistanceSegment.start, y: roundedDistanceSegment.start.y - 0.001 },
    end: { ...roundedDistanceSegment.end, y: roundedDistanceSegment.end.y - 0.001 },
  };
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: cutoffRaster.width,
      sourcePixelHeight: cutoffRaster.height,
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(cutoffManifest, [
        { geometry: cutoffRectangle, evidence: cutoffRectangleEvidence },
        {
          geometry: clearlySuppressedSegment,
          evidence: cutoffSegmentEvidence(clearlySuppressedSegment),
        },
      ]),
    })),
    /local CV provenance run contains a suppressed segment/u,
  );
});

test("local-CV run provenance preserves detector minimums after normalization", () => {
  const axisRaster = {
    contentIdentity: `sha256:${"a".repeat(64)}`,
    width: 31,
    height: 140,
  };
  const axisGeometry = {
    kind: "segment",
    start: {
      x: Number((1 / (axisRaster.width - 1)).toFixed(6)),
      y: Number((20 / (axisRaster.height - 1)).toFixed(6)),
    },
    end: {
      x: Number((12 / (axisRaster.width - 1)).toFixed(6)),
      y: Number((20 / (axisRaster.height - 1)).toFixed(6)),
    },
  };
  const axisEvidence = {
    kind: "straight-edge-support",
    supportCoverage: 0.9,
    orientationDegrees: 0,
  };
  const axisManifest = {
    ...localCvManifest(),
    sourcePixelWidth: axisRaster.width,
    sourcePixelHeight: axisRaster.height,
    raster: axisRaster,
  };
  const reviewedSegment = manualCandidates()[1];
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: axisRaster.width,
      sourcePixelHeight: axisRaster.height,
      localCvProvenanceManifest: localCvManifestWithProposal(axisManifest, {
        candidateId: reviewedSegment.id,
        candidateOrder: 1,
        originalProposalIdentity: `sha256:${"0".repeat(64)}`,
        rank: 1,
        rankScore: localCvRankScoreForTest(axisGeometry, axisEvidence, axisRaster),
        evidence: axisEvidence,
        originalGeometry: axisGeometry,
        reviewedGeometry: {
          kind: reviewedSegment.kind,
          start: reviewedSegment.start,
          end: reviewedSegment.end,
        },
        userEdited: true,
      }),
    })),
  );

  const rectangleRaster = {
    contentIdentity: `sha256:${"c".repeat(64)}`,
    width: 32,
    height: 75,
  };
  const rectangleGeometry = localCvGridRectangleForTest(
    4,
    9,
    8,
    8,
    rectangleRaster,
  );
  const rectangleEvidence = {
    kind: "axis-aligned-edge-coverage",
    sideCoverages: [0.9, 0.91, 0.92, 0.93],
    meanCoverage: 0.915,
  };
  const rectangleManifest = {
    ...localCvManifest(),
    sourcePixelWidth: rectangleRaster.width,
    sourcePixelHeight: rectangleRaster.height,
    raster: rectangleRaster,
  };
  const reviewedRectangle = manualCandidates()[0];
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      sourcePixelWidth: rectangleRaster.width,
      sourcePixelHeight: rectangleRaster.height,
      localCvProvenanceManifest: localCvManifestWithProposal(rectangleManifest, {
        candidateId: reviewedRectangle.id,
        candidateOrder: 0,
        originalProposalIdentity: `sha256:${"0".repeat(64)}`,
        rank: 1,
        rankScore: localCvRankScoreForTest(
          rectangleGeometry,
          rectangleEvidence,
          rectangleRaster,
        ),
        evidence: rectangleEvidence,
        originalGeometry: rectangleGeometry,
        reviewedGeometry: {
          kind: reviewedRectangle.kind,
          x: reviewedRectangle.x,
          y: reviewedRectangle.y,
          width: reviewedRectangle.width,
          height: reviewedRectangle.height,
        },
        userEdited: true,
      }),
    })),
  );
});

test("local-CV run provenance rejects detector-suppressed same-kind duplicates", () => {
  const manifest = localCvManifest();
  const rectangleEvidence = structuredClone(manifest.run.proposals[0].evidence);
  const duplicateRectangles = [
    localCvGridRectangleForTest(20, 20, 200, 150, manifest.raster),
    localCvGridRectangleForTest(30, 25, 200, 150, manifest.raster),
  ].map((geometry) => ({ geometry, evidence: rectangleEvidence }));
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(
        manifest,
        duplicateRectangles,
      ),
    })),
    /local CV provenance run contains same-kind duplicates/u,
  );

  const duplicateSegments = [106, 108].map((y) => ({
    geometry: {
      ...localCvGridSegmentForTest(64, y, 575, y, manifest.raster),
    },
    evidence: {
      kind: "straight-edge-support",
      supportCoverage: 0.9,
      orientationDegrees: 0,
    },
  }));
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(
        manifest,
        duplicateSegments,
      ),
    })),
    /local CV provenance run contains same-kind duplicates/u,
  );
});

test("local-CV provenance tolerates rounded rectangle coverage means", () => {
  const manifest = localCvManifest();
  const evidence = {
    kind: "axis-aligned-edge-coverage",
    sideCoverages: [0.990741, 1, 0.981481, 1],
    meanCoverage: 0.993056,
  };
  assert.doesNotThrow(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithProposal(manifest, {
        ...manifest.proposals[0],
        evidence,
        rankScore: localCvRankScoreForTest(
          manifest.proposals[0].originalGeometry,
          evidence,
          manifest.raster,
        ),
      }),
    })),
  );
});

test("local-CV run provenance rejects noncanonical segment endpoint order", () => {
  const manifest = localCvManifest();
  assert.throws(
    () => applicationWithCounter().prepareManualDraft(manualDraftRequest({
      localCvProvenanceManifest: localCvManifestWithRunDefinitions(manifest, [{
        geometry: {
          kind: "segment",
          start: { x: 0.9, y: 0.25 },
          end: { x: 0.1, y: 0.25 },
        },
        evidence: {
          kind: "straight-edge-support",
          supportCoverage: 0.9,
          orientationDegrees: 0,
        },
      }]),
    })),
    /local CV provenance run segment endpoint order is invalid/u,
  );
});

test("local-CV draft provenance rejects forged source, order, run, and extra fields", () => {
  const manifest = localCvManifest();
  for (const localCvProvenanceManifest of [
    { ...manifest, sourceImageContentIdentity: `sha256:${"e".repeat(64)}` },
    { ...manifest, candidateOrderIds: [...manifest.candidateOrderIds].reverse() },
    {
      ...manifest,
      run: { ...manifest.run, contentIdentity: `sha256:${"e".repeat(64)}` },
    },
    { ...manifest, unexpected: true },
  ]) {
    let coreCalls = 0;
    const application = applicationWithCounter(() => {
      coreCalls += 1;
    });
    assert.throws(
      () => application.prepareManualDraft(manualDraftRequest({
        localCvProvenanceManifest,
      })),
    );
    assert.equal(coreCalls, 0);
  }
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

test("declared spatial measurements validate before one pair analysis and replay byte-identically", () => {
  let coreCalls = 0;
  const application = new PrivateWebLabApplicationV1({
    now: () => fixedNow,
    createSessionId: () => "web-lab-session:77777777-7777-4777-8777-777777777777",
    executeDeclaredSpatialMeasurementConfirmation(input) {
      const result = confirmDeclaredSpatialMeasurementPlanV1(input);
      coreCalls += 1;
      return result;
    },
  });
  const authoredCandidates = [
    {
      id: "manual-rectangle-1",
      kind: "rectangle",
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    },
    {
      id: "manual-rectangle-2",
      kind: "rectangle",
      x: 0.6,
      y: 0.1,
      width: 0.2,
      height: 0.3,
    },
  ];
  const draft = application.prepareManualDraft(manualDraftRequest({
    candidates: authoredCandidates,
  }));
  const selectedCandidateIds = draft.candidates.map(({ id }) => id);
  const measurementPlan = createDeclaredSpatialMeasurementPlanV1({
    sourceIdentity: sourceImageContentIdentity,
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    candidates: draft.candidates,
    selectedRectangleCandidateIds: selectedCandidateIds,
    expressions: [
      { kind: "extent", owner: { kind: "image-frame" }, extent: "width" },
      { kind: "extent", owner: { kind: "image-frame" }, extent: "height" },
    ],
  });
  const request = manualConfirmationRequest(draft, {
    selectedCandidateIds,
    reviewedCandidates: draft.candidates,
    measurementCandidateIds: null,
    declaredSpatialMeasurementPlan: measurementPlan,
  });

  assert.equal(draft.coreRun, false);
  assert.equal(coreCalls, 0);
  const receipt = application.confirmManual(request);
  assert.equal(
    receipt.contractId,
    PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RECEIPT_CONTRACT_ID,
  );
  assert.equal(receipt.coreRun, true);
  assert.equal(receipt.providerCalls, 0);
  assert.equal(receipt.declaredSpatialMeasurementConfirmation.coreExecutionCount, 1);
  assert.equal(
    receipt.declaredSpatialMeasurementConfirmation.canonicalRatio.dominantShare,
    0.6,
  );
  assert.deepEqual(
    receipt.declaredSpatialMeasurementConfirmation.resolvedMeasurements
      .map(({ lengthPixels }) => lengthPixels)
      .sort((first, second) => first - second),
    [800, 1200],
  );
  assert.equal(coreCalls, 1);
  assert.deepEqual(application.confirmManual(request), receipt);
  assert.equal(coreCalls, 1);
  assert.equal(
    Buffer.from(JSON.stringify(application.confirmManual(request))).equals(
      Buffer.from(JSON.stringify(receipt)),
    ),
    true,
  );
  assert.equal(coreCalls, 1);
  assert.throws(
    () => application.confirmManual({
      ...request,
      declaredSpatialMeasurementPlan: {
        ...measurementPlan,
        expressions: [...measurementPlan.expressions].reverse(),
      },
    }),
    /already confirmed with different geometry/u,
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
});

test("declared spatial Web Lab rejects stale plan bindings before pair analysis", () => {
  let coreCalls = 0;
  const application = new PrivateWebLabApplicationV1({
    now: () => fixedNow,
    createSessionId: () => "web-lab-session:88888888-8888-4888-8888-888888888888",
    executeDeclaredSpatialMeasurementConfirmation(input) {
      const result = confirmDeclaredSpatialMeasurementPlanV1(input);
      coreCalls += 1;
      return result;
    },
  });
  const authoredCandidates = [
    { id: "manual-rectangle-1", kind: "rectangle", x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    { id: "manual-rectangle-2", kind: "rectangle", x: 0.6, y: 0.1, width: 0.2, height: 0.3 },
  ];
  const draft = application.prepareManualDraft(manualDraftRequest({ candidates: authoredCandidates }));
  const selectedCandidateIds = draft.candidates.map(({ id }) => id);
  const measurementPlan = createDeclaredSpatialMeasurementPlanV1({
    sourceIdentity: sourceImageContentIdentity,
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    candidates: draft.candidates,
    selectedRectangleCandidateIds: selectedCandidateIds,
    expressions: [
      { kind: "extent", owner: { kind: "image-frame" }, extent: "width" },
      {
        kind: "extent",
        owner: { kind: "rectangle", candidateId: "manual-rectangle-1" },
        extent: "height",
      },
    ],
  });
  const request = manualConfirmationRequest(draft, {
    selectedCandidateIds,
    reviewedCandidates: draft.candidates,
    measurementCandidateIds: null,
    declaredSpatialMeasurementPlan: measurementPlan,
  });
  for (const overrides of [
    { sourceImageContentIdentity: `sha256:${"f".repeat(64)}` },
    { sourcePixelWidth: 1199 },
    { candidateSetIdentity: `sha256:${"b".repeat(64)}` },
    {
      declaredSpatialMeasurementPlan: {
        ...measurementPlan,
        coordinatePolicy: "normalized_v1",
      },
    },
    {
      selectedCandidateIds: ["manual-rectangle-1"],
    },
  ]) {
    assert.throws(() => application.confirmManual({ ...request, ...overrides }));
  }
  assert.equal(coreCalls, 0);
});

function localCvManifest() {
  const detectorContractId = "norma.private-web-lab.local-cv-candidates@1";
  const algorithmVersion = "sobel-axis-runs-hough-v1";
  const raster = {
    contentIdentity: `sha256:${"b".repeat(64)}`,
    width: 640,
    height: 427,
  };
  const originalGeometry = {
    kind: "rectangle",
    x: Number((64 / 639).toFixed(6)),
    y: Number((43 / 426).toFixed(6)),
    width: Number((383 / 639).toFixed(6)),
    height: Number((298 / 426).toFixed(6)),
  };
  const evidence = {
    kind: "axis-aligned-edge-coverage",
    sideCoverages: [0.9, 0.91, 0.92, 0.93],
    meanCoverage: 0.915,
  };
  const originalProposalIdentity = contentIdentityForTest({
    contractId: detectorContractId,
    algorithmVersion,
    sourceImageContentIdentity,
    kind: "rectangle",
    geometry: {
      x: originalGeometry.x,
      y: originalGeometry.y,
      width: originalGeometry.width,
      height: originalGeometry.height,
    },
    evidence,
  });
  const proposalIdentities = [originalProposalIdentity];
  const rankScore = localCvRankScoreForTest(originalGeometry, evidence, raster);
  const run = {
    contentIdentity: contentIdentityForTest({
      contractId: detectorContractId,
      algorithmVersion,
      sourceImageContentIdentity,
      workingImage: { width: raster.width, height: raster.height },
      rasterContentIdentity: raster.contentIdentity,
      status: "detected",
      abstentionReason: null,
      candidateProposalIdentities: proposalIdentities,
    }),
    proposalIdentities,
    proposals: [{
      proposalIdentity: originalProposalIdentity,
      rank: 1,
      rankScore,
      evidence: structuredClone(evidence),
      geometry: structuredClone(originalGeometry),
    }],
  };
  const reviewedGeometry = {
    kind: "rectangle",
    x: 0.1,
    y: 0.1,
    width: 0.6,
    height: 0.7,
  };
  return {
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID,
    browserSessionId,
    sourceImageContentIdentity,
    sourcePixelWidth: 1200,
    sourcePixelHeight: 800,
    detector: { contractId: detectorContractId, algorithmVersion },
    raster,
    run,
    candidateOrderIds: manualCandidates().map(({ id }) => id),
    proposals: [{
      candidateId: "manual-rectangle-1",
      candidateOrder: 0,
      originalProposalIdentity,
      rank: 1,
      rankScore,
      evidence,
      originalGeometry,
      reviewedGeometry,
      userEdited: true,
    }],
  };
}

function localCvRankScoreForTest(geometry, evidence, raster) {
  if (geometry.kind === "rectangle") {
    const sizeFraction = (
      geometry.width * (raster.width - 1)
      * geometry.height * (raster.height - 1)
    ) / (raster.width * raster.height);
    return Number(Math.min(
      1,
      (evidence.meanCoverage * 0.82) + (sizeFraction * 0.18),
    ).toFixed(6));
  }
  const length = Math.hypot(
    (geometry.end.x - geometry.start.x) * (raster.width - 1),
    (geometry.end.y - geometry.start.y) * (raster.height - 1),
  );
  return Number(Math.min(
    1,
    (evidence.supportCoverage * 0.68)
      + ((length / Math.hypot(raster.width, raster.height)) * 0.32),
  ).toFixed(6));
}

function localCvGridRectangleForTest(left, top, width, height, raster) {
  return {
    kind: "rectangle",
    x: Number((left / (raster.width - 1)).toFixed(6)),
    y: Number((top / (raster.height - 1)).toFixed(6)),
    width: Number((width / (raster.width - 1)).toFixed(6)),
    height: Number((height / (raster.height - 1)).toFixed(6)),
  };
}

function localCvGridSegmentForTest(startX, startY, endX, endY, raster) {
  return {
    kind: "segment",
    start: {
      x: Number((startX / (raster.width - 1)).toFixed(6)),
      y: Number((startY / (raster.height - 1)).toFixed(6)),
    },
    end: {
      x: Number((endX / (raster.width - 1)).toFixed(6)),
      y: Number((endY / (raster.height - 1)).toFixed(6)),
    },
  };
}

function localCvManifestWithRunDefinitions(manifest, definitions) {
  const proposals = definitions.map(({ geometry, evidence }) => {
    const proposalIdentity = contentIdentityForTest({
      contractId: manifest.detector.contractId,
      algorithmVersion: manifest.detector.algorithmVersion,
      sourceImageContentIdentity,
      kind: geometry.kind,
      geometry: geometry.kind === "rectangle"
        ? {
            x: geometry.x,
            y: geometry.y,
            width: geometry.width,
            height: geometry.height,
          }
        : { start: geometry.start, end: geometry.end },
      evidence,
    });
    return {
      proposalIdentity,
      rankScore: localCvRankScoreForTest(geometry, evidence, manifest.raster),
      evidence: structuredClone(evidence),
      geometry: structuredClone(geometry),
    };
  }).sort((first, second) => (
    second.rankScore - first.rankScore
    || (
      first.geometry.kind === second.geometry.kind
        ? 0
        : first.geometry.kind === "rectangle" ? -1 : 1
    )
    || compareCodeUnitsForTest(
      localCvGeometryKeyForTest(first.geometry),
      localCvGeometryKeyForTest(second.geometry),
    )
  )).map((proposal, index) => ({ ...proposal, rank: index + 1 }));
  const proposalIdentities = proposals.map(({ proposalIdentity }) => proposalIdentity);
  return {
    ...manifest,
    run: {
      proposals,
      proposalIdentities,
      contentIdentity: contentIdentityForTest({
        contractId: manifest.detector.contractId,
        algorithmVersion: manifest.detector.algorithmVersion,
        sourceImageContentIdentity,
        workingImage: {
          width: manifest.raster.width,
          height: manifest.raster.height,
        },
        rasterContentIdentity: manifest.raster.contentIdentity,
        status: "detected",
        abstentionReason: null,
        candidateProposalIdentities: proposalIdentities,
      }),
    },
  };
}

function localCvGeometryKeyForTest(geometry) {
  return JSON.stringify(geometry.kind === "rectangle"
    ? {
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
      }
    : { start: geometry.start, end: geometry.end });
}

function compareCodeUnitsForTest(first, second) {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function localCvManifestWithProposal(manifest, proposal) {
  const { kind, ...geometry } = proposal.originalGeometry;
  const originalProposalIdentity = contentIdentityForTest({
    contractId: manifest.detector.contractId,
    algorithmVersion: manifest.detector.algorithmVersion,
    sourceImageContentIdentity,
    kind,
    geometry,
    evidence: proposal.evidence,
  });
  const proposalIdentities = [originalProposalIdentity];
  const rankScore = proposal.rankScore;
  return {
    ...manifest,
    run: {
      proposalIdentities,
      contentIdentity: contentIdentityForTest({
        contractId: manifest.detector.contractId,
        algorithmVersion: manifest.detector.algorithmVersion,
        sourceImageContentIdentity,
        workingImage: {
          width: manifest.raster.width,
          height: manifest.raster.height,
        },
        rasterContentIdentity: manifest.raster.contentIdentity,
        status: "detected",
        abstentionReason: null,
        candidateProposalIdentities: proposalIdentities,
      }),
      proposals: [{
        proposalIdentity: originalProposalIdentity,
        rank: proposal.rank,
        rankScore,
        evidence: structuredClone(proposal.evidence),
        geometry: structuredClone(proposal.originalGeometry),
      }],
    },
    proposals: [{ ...proposal, originalProposalIdentity, rankScore }],
  };
}

function localCvManifestFromDetectorRun(raster, detection) {
  const rasterContentIdentity = `sha256:${createHash("sha256")
    .update(Buffer.from(raster.data))
    .digest("hex")}`;
  const proposals = detection.candidates.map((candidate) => {
    const proposalIdentity = contentIdentityForTest({
      contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
      algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
      sourceImageContentIdentity,
      kind: candidate.kind,
      geometry: candidate.geometry,
      evidence: candidate.evidence,
    });
    return {
      proposalIdentity,
      rank: candidate.rank,
      rankScore: candidate.rankScore,
      evidence: structuredClone(candidate.evidence),
      geometry: { kind: candidate.kind, ...structuredClone(candidate.geometry) },
    };
  });
  const proposalIdentities = proposals.map(({ proposalIdentity }) => proposalIdentity);
  const executionIdentity = contentIdentityForTest({
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
    algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
    sourceImageContentIdentity,
    workingImage: detection.workingImage,
    rasterContentIdentity,
    status: detection.status,
    abstentionReason: detection.abstentionReason,
    candidateProposalIdentities: proposalIdentities,
  });
  let rectangleIndex = 0;
  let segmentIndex = 0;
  const candidates = detection.candidates.map((candidate) => {
    const id = candidate.kind === "rectangle"
      ? `manual-rectangle-${String(rectangleIndex += 1)}`
      : `manual-segment-${String(segmentIndex += 1)}`;
    return candidate.kind === "rectangle"
      ? { id, kind: "rectangle", ...structuredClone(candidate.geometry) }
      : { id, kind: "segment", ...structuredClone(candidate.geometry) };
  });
  return {
    candidates,
    manifest: {
      contractId: PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID,
      browserSessionId,
      sourceImageContentIdentity,
      sourcePixelWidth: raster.width,
      sourcePixelHeight: raster.height,
      detector: {
        contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
        algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
      },
      raster: {
        contentIdentity: rasterContentIdentity,
        width: raster.width,
        height: raster.height,
      },
      run: {
        contentIdentity: executionIdentity,
        proposalIdentities,
        proposals,
      },
      candidateOrderIds: candidates.map(({ id }) => id),
      proposals: candidates.map((candidate, candidateOrder) => {
        const runProposal = proposals[candidateOrder];
        return {
          candidateId: candidate.id,
          candidateOrder,
          originalProposalIdentity: runProposal.proposalIdentity,
          rank: runProposal.rank,
          rankScore: runProposal.rankScore,
          evidence: structuredClone(runProposal.evidence),
          originalGeometry: structuredClone(runProposal.geometry),
          reviewedGeometry: structuredClone(runProposal.geometry),
          userEdited: false,
        };
      }),
    },
  };
}

function localCvConformanceRaster(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = 255;
  }
  return { width, height, data };
}

function drawLocalCvConformanceRectangle(raster, x, y, width, height, thickness) {
  drawLocalCvConformanceSegment(raster, x, y, x + width, y, thickness);
  drawLocalCvConformanceSegment(raster, x + width, y, x + width, y + height, thickness);
  drawLocalCvConformanceSegment(
    raster,
    x + width,
    y + height,
    x,
    y + height,
    thickness,
  );
  drawLocalCvConformanceSegment(raster, x, y + height, x, y, thickness);
}

function drawLocalCvConformanceSegment(raster, x0, y0, x1, y1, thickness) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(x0 + ((x1 - x0) * step / Math.max(1, steps)));
    const y = Math.round(y0 + ((y1 - y0) * step / Math.max(1, steps)));
    for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) {
      for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
        if (
          x + offsetX < 0
          || y + offsetY < 0
          || x + offsetX >= raster.width
          || y + offsetY >= raster.height
        ) continue;
        const offset = (((y + offsetY) * raster.width) + x + offsetX) * 4;
        raster.data[offset] = 0;
        raster.data[offset + 1] = 0;
        raster.data[offset + 2] = 0;
      }
    }
  }
}

function contentIdentityForTest(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}
