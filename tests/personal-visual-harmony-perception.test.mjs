import assert from "node:assert/strict";
import test from "node:test";

import {
  PERSONAL_VISUAL_HARMONY_MANUAL_PERCEPTION_CONTRACT_ID,
  PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID,
} from "../dist/src/personal-visual-harmony-perception.js";
import {
  extractPersonalVisualHarmonyManualPerceptionV1,
  mergePersonalVisualHarmonyPerceptionCandidatesV1,
  preparePersonalVisualHarmonyCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
import * as personalVisualHarmony from "../dist/src/personal-visual-harmony.js";
import * as packageRoot from "../dist/src/index.js";

const SOURCE_IDENTITY = `sha256:${"a".repeat(64)}`;
const PROVIDER = {
  providerId: "segmentation-provider",
  modelId: "provider-neutral-image-segmentation",
  modelVersion: "test-snapshot",
};

function maskFromPredicate(width, height, predicate) {
  const runs = [];
  for (let y = 0; y < height; y += 1) {
    let startX = null;
    for (let x = 0; x <= width; x += 1) {
      const active = x < width && predicate(x, y);
      if (active && startX === null) startX = x;
      if (!active && startX !== null) {
        runs.push({ y, startX, endXExclusive: x });
        startX = null;
      }
    }
  }
  return {
    contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID,
    contractVersion: 1,
    width,
    height,
    runs,
  };
}

function extract(mask, overrides = {}) {
  return extractPersonalVisualHarmonyManualPerceptionV1({
    interactionId: "manual-selection-1",
    sourceImageReferenceIdentity: SOURCE_IDENTITY,
    provider: PROVIDER,
    prompt: {
      points: [{ x: 0.5, y: 0.5, label: "include" }],
      box: null,
    },
    mask,
    providerConfidence: 0.92,
    candidateIdPrefix: "manual-subject",
    label: "Sujet sélectionné",
    role: "primary-subject",
    ...overrides,
  });
}

test("manual perception fits an axis-aligned rectangle without running Core", () => {
  const result = extract(maskFromPredicate(
    40,
    40,
    (x, y) => x >= 8 && x < 32 && y >= 10 && y < 30,
  ));

  assert.equal(result.contractId, PERSONAL_VISUAL_HARMONY_MANUAL_PERCEPTION_CONTRACT_ID);
  assert.equal(result.status, "candidates_ready");
  assert.equal(result.fit, "rectangle");
  assert.equal(result.candidateEvidenceOnly, true);
  assert.equal(result.sourceTruth, false);
  assert.equal(result.coreAuthority, false);
  assert.equal(result.coreRun, false);
  assert.equal(result.inputImageBytesObservedByThisModule, false);
  assert.equal(result.candidates[0].primitive.kind, "rectangle");
  assert.equal(result.candidates[1].primitive.kind, "axis");
  assert.match(result.maskIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(result.perceptionIdentity, /^sha256:[0-9a-f]{64}$/u);
});

test("manual perception remains a private adapter contract outside the package root", () => {
  assert.equal("extractPersonalVisualHarmonyManualPerceptionV1" in packageRoot, false);
  assert.equal("mergePersonalVisualHarmonyPerceptionCandidatesV1" in packageRoot, false);
  assert.equal("preparePersonalVisualHarmonyMergedPerceptionCandidatesV1" in packageRoot, false);
});

test("manual perception emits a quadrilateral for a rotated four-corner mask", () => {
  const result = extract(maskFromPredicate(
    61,
    61,
    (x, y) => (Math.abs(x - 30) / 18) + (Math.abs(y - 30) / 12) <= 1,
  ));

  assert.equal(result.fit, "quadrilateral");
  assert.equal(result.candidates[0].primitive.kind, "quadrilateral");
  assert.equal(result.candidates[0].primitive.vertices.length, 4);
});

test("manual perception keeps a filled convex trapezoid as a quadrilateral", () => {
  const result = extract(maskFromPredicate(
    50,
    50,
    (x, y) => {
      if (y < 8 || y > 42) return false;
      const progress = (y - 8) / 34;
      const left = 11 + (4 * progress);
      const right = 23 + (12 * progress);
      return x >= left && x <= right;
    },
  ));

  assert.equal(result.fit, "quadrilateral");
  assert.equal(result.candidates[0].primitive.kind, "quadrilateral");
});

test("manual perception keeps a centrally symmetric parallelogram as a quadrilateral", () => {
  const result = extract(maskFromPredicate(
    60,
    60,
    (x, y) => {
      if (y < 10 || y > 50) return false;
      const progress = (y - 10) / 40;
      const left = 14 + (4 * progress);
      const right = 30 + (4 * progress);
      return x >= left && x <= right;
    },
  ));

  assert.equal(result.fit, "quadrilateral");
  assert.equal(result.candidates[0].primitive.kind, "quadrilateral");
});

test("manual perception emits an oriented ellipse and principal axis", () => {
  const result = extract(maskFromPredicate(
    80,
    60,
    (x, y) => {
      const dx = x - 40;
      const dy = y - 30;
      const angle = 25 * Math.PI / 180;
      const localX = (dx * Math.cos(angle)) + (dy * Math.sin(angle));
      const localY = (-dx * Math.sin(angle)) + (dy * Math.cos(angle));
      return ((localX / 20) ** 2) + ((localY / 9) ** 2) <= 1;
    },
  ));

  assert.equal(result.fit, "ellipse");
  assert.equal(result.candidates[0].primitive.kind, "ellipse");
  assert.equal(result.candidates[1].primitive.kind, "axis");
  assert.ok(result.candidates[0].primitive.rotationDegrees > 0);
});

test("manual perception classifies supported low-resolution circular masks as ellipses", () => {
  const sizes = [4, 6, 8, 10, 16];
  const results = sizes.map((size) => {
    const center = size / 2;
    const radius = (size / 2) - 0.35;
    return extract(maskFromPredicate(
      size,
      size,
      (x, y) => Math.hypot((x + 0.5) - center, (y + 0.5) - center) <= radius,
    ));
  });
  assert.deepEqual(results.map(({ fit }) => fit), sizes.map(() => "ellipse"));
  assert.ok(results.every(({ candidates }) => candidates[0].primitive.kind === "ellipse"));
});

test("manual perception keeps finite segment and principal axis distinct", () => {
  const result = extract(maskFromPredicate(
    80,
    40,
    (x, y) => x >= 8 && x < 72 && y >= 18 && y < 22,
  ));

  assert.equal(result.fit, "elongated");
  assert.deepEqual(
    result.candidates.map(({ primitive }) => primitive.kind),
    ["segment", "axis"],
  );
});

test("manual perception treats a diagonally connected line mask as one segment", () => {
  const result = extract(maskFromPredicate(
    8,
    8,
    (x, y) => x === y,
  ));

  assert.equal(result.fit, "elongated");
  assert.equal(result.candidates[0].primitive.kind, "segment");
});

test("manual perception models a triangle as confirmed edges plus a derived request", () => {
  const sourceFileId = "triangle-file";
  const sourcePrepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId,
    candidates: [{
      id: "source-identity-probe",
      label: "Sonde",
      role: "frame",
      reason: "Établit uniquement l’identité de référence du fichier pour ce test.",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }],
  });
  const result = extract(maskFromPredicate(
    61,
    61,
    (x, y) => y >= 10 && y <= 50
      && x >= 30 - ((y - 10) / 2)
      && x <= 30 + ((y - 10) / 2),
  ), {
    sourceImageReferenceIdentity: sourcePrepared.sourceImageReferenceIdentity,
  });

  assert.equal(result.fit, "triangle");
  assert.equal(result.candidates.length, 3);
  assert.ok(result.candidates.every(({ primitive }) => primitive.kind === "segment"));
  assert.ok(result.candidates.every(({ sourceImageReferenceIdentity }) => (
    sourceImageReferenceIdentity === sourcePrepared.sourceImageReferenceIdentity
  )));
  assert.equal(result.triangleConstructionRequests.length, 1);
  assert.equal(result.triangleConstructionRequests[0].vertices.length, 3);
  const prepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId,
    candidates: result.candidates,
    triangleConstructionRequests: result.triangleConstructionRequests,
  });
  assert.equal(prepared.triangleConstructionRequests.length, 1);
  assert.throws(() => preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "different-triangle-file",
    candidates: result.candidates,
    triangleConstructionRequests: result.triangleConstructionRequests,
  }), /belongs to a different source image/u);
});

test("manual perception preserves irregular boundary evidence without inventing a curve", () => {
  const result = extract(maskFromPredicate(
    50,
    50,
    (x, y) => (x >= 8 && x < 15 && y >= 8 && y < 42)
      || (x >= 8 && x < 38 && y >= 35 && y < 42),
  ), {
    prompt: {
      points: [{ x: 0.2, y: 0.2, label: "include" }],
      box: null,
    },
  });

  assert.equal(result.fit, "bounding-region");
  assert.ok(result.boundaryEvidence.length > 4);
  assert.ok(result.warnings.includes("irregular-boundary-preserved-without-curve-primitive"));
  assert.ok(result.candidates.every(({ primitive }) => primitive.kind !== "curve"));
});

test("manual perception falls back for masks with holes or disconnected components", () => {
  const ring = extract(maskFromPredicate(
    50,
    50,
    (x, y) => x >= 5 && x < 45 && y >= 5 && y < 45
      && !(x >= 15 && x < 35 && y >= 15 && y < 35),
  ), {
    prompt: {
      points: [{ x: 0.2, y: 0.2, label: "include" }],
      box: null,
    },
  });
  const disconnected = extract(maskFromPredicate(
    50,
    50,
    (x, y) => (x >= 5 && x < 20 && y >= 10 && y < 40)
      || (x >= 30 && x < 45 && y >= 10 && y < 40),
  ), {
    prompt: {
      points: [{ x: 0.2, y: 0.4, label: "include" }],
      box: null,
    },
  });
  const concave = extract(maskFromPredicate(
    50,
    50,
    (x, y) => x >= 5 && x < 45 && y >= 5 && y < 45
      && !(x >= 20 && x < 25 && y >= 5 && y < 10),
  ), {
    prompt: {
      points: [{ x: 0.2, y: 0.2, label: "include" }],
      box: null,
    },
  });

  for (const result of [ring, disconnected, concave]) {
    assert.equal(result.fit, "bounding-region");
    assert.equal(result.candidates[0].primitive.kind, "rectangle");
    assert.ok(result.warnings.includes("irregular-boundary-preserved-without-curve-primitive"));
  }
});

test("manual perception fails closed when prompt polarity contradicts the mask", () => {
  const mask = maskFromPredicate(
    20,
    20,
    (x, y) => x >= 5 && x < 15 && y >= 5 && y < 15,
  );

  assert.throws(() => extract(mask, {
    prompt: {
      points: [{ x: 0.05, y: 0.05, label: "include" }],
      box: null,
    },
  }), /include point falls outside/u);
  assert.throws(() => extract(mask, {
    prompt: {
      points: [{ x: 0.5, y: 0.5, label: "exclude" }],
      box: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
    },
  }), /exclude point falls inside/u);
});

test("manual perception rejects unsorted or overlapping mask runs", () => {
  assert.throws(() => extract({
    contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID,
    contractVersion: 1,
    width: 10,
    height: 10,
    runs: [
      { y: 2, startX: 2, endXExclusive: 7 },
      { y: 2, startX: 5, endXExclusive: 8 },
    ],
  }), /sorted and non-overlapping/u);
});

test("manual perception rejects unrelated boxes and unknown mask fields", () => {
  const mask = maskFromPredicate(
    20,
    20,
    (x, y) => x >= 12 && x < 18 && y >= 12 && y < 18,
  );
  assert.throws(() => extract(mask, {
    prompt: {
      points: [],
      box: { x: 0.05, y: 0.05, width: 0.2, height: 0.2 },
    },
  }), /box does not overlap/u);
  assert.throws(() => extract({
    ...mask,
    ignoredProviderField: true,
  }, {
    prompt: {
      points: [],
      box: { x: 0.5, y: 0.5, width: 0.45, height: 0.45 },
    },
  }), /mask contract is invalid/u);
});

test("manual perception handles the maximum mask and bounds generated ids", () => {
  const runs = Array.from(
    { length: 512 },
    (_, y) => ({ y, startX: 0, endXExclusive: 512 }),
  );
  const result = extract({
    contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID,
    contractVersion: 1,
    width: 512,
    height: 512,
    runs,
  });
  assert.equal(result.fit, "rectangle");
  assert.throws(() => extract(maskFromPredicate(
    20,
    20,
    (x, y) => x >= 4 && x < 16 && y >= 4 && y < 16,
  ), {
    candidateIdPrefix: "a".repeat(49),
  }), /must not exceed 48/u);
});

test("hybrid merge preserves automatic candidates and remains prepare-compatible", () => {
  const automaticCandidates = [{
    id: "automatic-frame",
    label: "Cadre proposé automatiquement",
    role: "frame",
    reason: "Cadre de l’image proposé par la pipeline automatique existante.",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  }];
  const automaticPrepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-safe-test",
    sourceImageMediaType: "image/png",
    candidates: automaticCandidates,
  });
  const manualPerception = extract(maskFromPredicate(
    40,
    40,
    (x, y) => x >= 12 && x < 28 && y >= 9 && y < 31,
  ), {
    sourceImageReferenceIdentity: automaticPrepared.sourceImageReferenceIdentity,
  });
  const merged = mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: automaticPrepared.sourceImageReferenceIdentity,
    automaticCandidates,
    manualPerception,
  });
  const prepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-safe-test",
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: merged.sourceImageReferenceIdentity,
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
  });

  assert.equal(merged.candidates[0].id, "automatic-frame");
  assert.equal(prepared.status, "confirmation_required");
  assert.equal(prepared.coreRun, false);
  assert.equal(prepared.candidates.length, 3);
  assert.equal(merged.manualPerceptionIdentity, manualPerception.perceptionIdentity);
  assert.deepEqual(merged.manualBoundaryEvidence, manualPerception.boundaryEvidence);
  assert.throws(() => preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "different-file",
    expectedSourceImageReferenceIdentity: merged.sourceImageReferenceIdentity,
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
  }), /does not match sourceFileId/u);
  assert.throws(() => preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "different-file",
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
  }), /belongs to a different source image/u);
});

test("hybrid preparation requires the merged source identity", () => {
  assert.equal(
    typeof personalVisualHarmony.preparePersonalVisualHarmonyMergedPerceptionCandidatesV1,
    "function",
  );
  const automaticPrepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "hybrid-bound-source",
    candidates: [{
      id: "automatic-frame",
      label: "Cadre automatique",
      role: "frame",
      reason: "Cadre automatique conservé pour la préparation hybride.",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }],
  });
  const manualPerception = extract(maskFromPredicate(
    30,
    30,
    (x, y) => x >= 8 && x < 22 && y >= 8 && y < 22,
  ), {
    sourceImageReferenceIdentity: automaticPrepared.sourceImageReferenceIdentity,
  });
  const merged = mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: automaticPrepared.sourceImageReferenceIdentity,
    automaticCandidates: automaticPrepared.candidates,
    manualPerception,
  });

  const prepared = personalVisualHarmony
    .preparePersonalVisualHarmonyMergedPerceptionCandidatesV1({
      sourceFileId: "hybrid-bound-source",
      mergedPerceptionCandidates: merged,
    });
  assert.equal(prepared.sourceImageReferenceIdentity, merged.sourceImageReferenceIdentity);

  assert.throws(() => personalVisualHarmony
    .preparePersonalVisualHarmonyMergedPerceptionCandidatesV1({
      sourceFileId: "completely-different-file",
      mergedPerceptionCandidates: merged,
    }), /does not match sourceFileId/u);
  const missingIdentity = structuredClone(merged);
  delete missingIdentity.sourceImageReferenceIdentity;
  assert.throws(() => personalVisualHarmony
    .preparePersonalVisualHarmonyMergedPerceptionCandidatesV1({
      sourceFileId: "hybrid-bound-source",
      mergedPerceptionCandidates: missingIdentity,
    }), /require a source image identity/u);
  const differentPrepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "completely-different-file",
    candidates: automaticPrepared.candidates,
  });
  const tamperedIdentity = structuredClone(merged);
  tamperedIdentity.sourceImageReferenceIdentity = differentPrepared.sourceImageReferenceIdentity;
  assert.throws(() => personalVisualHarmony
    .preparePersonalVisualHarmonyMergedPerceptionCandidatesV1({
      sourceFileId: "completely-different-file",
      mergedPerceptionCandidates: tamperedIdentity,
    }), /identity is stale or invalid/u);
});

test("hybrid merge rejects stale perception identity and candidate collisions", () => {
  const manualPerception = extract(maskFromPredicate(
    30,
    30,
    (x, y) => x >= 8 && x < 22 && y >= 8 && y < 22,
  ));
  const stale = structuredClone(manualPerception);
  stale.fit = "ellipse";
  assert.throws(() => mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: SOURCE_IDENTITY,
    automaticCandidates: [],
    manualPerception: stale,
  }), /identity is stale or invalid/u);

  assert.throws(() => mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: SOURCE_IDENTITY,
    automaticCandidates: [{
      ...manualPerception.candidates[0],
    }],
    manualPerception,
  }), /candidate ids must remain unique/u);

  assert.throws(() => mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: SOURCE_IDENTITY,
    automaticCandidates: [{
      ...manualPerception.candidates[0],
      id: "bound-to-another-image",
      sourceImageReferenceIdentity: `sha256:${"b".repeat(64)}`,
    }],
    manualPerception,
  }), /candidate belongs to a different source image/u);

  assert.throws(() => mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: `sha256:${"b".repeat(64)}`,
    automaticCandidates: [],
    manualPerception,
  }), /different source image/u);
});

test("hybrid merge rejects automatic and manual triangle requests beyond the shared limit", () => {
  const manualPerception = extract(maskFromPredicate(
    61,
    61,
    (x, y) => y >= 10 && y <= 50
      && x >= 30 - ((y - 10) / 2)
      && x <= 30 + ((y - 10) / 2),
  ));
  const manualRequest = manualPerception.triangleConstructionRequests[0];
  assert.ok(manualRequest);
  const automaticRequests = Array.from({ length: 4 }, (_, index) => ({
    ...structuredClone(manualRequest),
    requestId: `automatic-triangle-${String(index + 1)}`,
  }));

  assert.throws(() => mergePersonalVisualHarmonyPerceptionCandidatesV1({
    expectedSourceImageReferenceIdentity: SOURCE_IDENTITY,
    automaticCandidates: [],
    automaticTriangleConstructionRequests: automaticRequests,
    manualPerception,
  }), /exceed the bounded limit/u);
});

test("manual perception rejects control characters in visible metadata", () => {
  const mask = maskFromPredicate(
    20,
    20,
    (x, y) => x >= 4 && x < 16 && y >= 4 && y < 16,
  );
  assert.throws(() => extract(mask, {
    label: "Sujet\u0001injecté",
  }), /label must contain/u);
  assert.throws(() => extract(mask, {
    provider: {
      ...PROVIDER,
      modelId: "model\u007finvalid",
    },
  }), /provider.modelId must contain/u);
});
