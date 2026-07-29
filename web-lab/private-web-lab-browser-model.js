export function visiblePrivateWebLabCandidateIdsV1(
  candidates,
  strongestGuideCount,
  revealAll,
) {
  if (!Array.isArray(candidates) || !Number.isSafeInteger(strongestGuideCount)) {
    throw new Error("Private Web Lab browser candidate view is invalid.");
  }
  const visible = revealAll ? candidates : candidates.slice(0, strongestGuideCount);
  return visible.map(({ id }) => id);
}

export const PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID =
  "norma.declared-spatial-measurement-plan@1";
export const PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID =
  "norma.confirmDeclaredSpatialMeasurementsV1";
export const PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY =
  "image_plane_pixels_v1";
export const PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS = Object.freeze([
  "norma.geometry-harmonies@0.1.0",
  "norma.basic-proportions@0.1.0",
]);
export const PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE = 0.025;

const SPATIAL_ANCHORS = Object.freeze([
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top-midpoint",
  "right-midpoint",
  "bottom-midpoint",
  "left-midpoint",
]);
const SPATIAL_DISTANCE_METRICS = Object.freeze(["euclidean", "horizontal", "vertical"]);
const SPATIAL_FRAME_EDGES = Object.freeze(["left", "right", "top", "bottom"]);

export function canRunPrivateWebLabCoreV1(
  explicitConfirmation,
  selectedCandidateIds,
  reviewedCandidates,
  goalId = null,
  measurementCandidateIds = null,
  declaredSpatialMeasurementPlan = null,
) {
  if (
    explicitConfirmation !== true
    || !(selectedCandidateIds instanceof Set)
    || !Array.isArray(reviewedCandidates)
    || reviewedCandidates.some((candidate) => !isPrivateWebLabCandidateGeometryValidV1(candidate))
  ) {
    return false;
  }
  const hasCoreRectangle = reviewedCandidates.some((candidate) => (
    selectedCandidateIds.has(candidate.id)
    && (candidate.primitive?.kind ?? "rectangle") === "rectangle"
  ));
  return (
    hasCoreRectangle
    && (
      goalId === null
      || (
        goalId === "compare-two-lengths"
          ? measurementCandidateIds === null
            && isValidPrivateWebLabDeclaredSpatialMeasurementPlanV1(
              declaredSpatialMeasurementPlan,
              selectedCandidateIds,
              reviewedCandidates,
            )
          : measurementCandidateIds === null && declaredSpatialMeasurementPlan === null
      )
    )
  );
}

export function privateWebLabSpatialExpressionOptionsV1(
  selectedCandidateIds,
  reviewedCandidates,
  sourcePixelWidth,
  sourcePixelHeight,
) {
  const rectangles = selectedRectangles(
    selectedCandidateIds,
    reviewedCandidates,
    sourcePixelWidth,
    sourcePixelHeight,
  );
  if (rectangles === null) return [];
  const frameOwner = { kind: "image-frame" };
  const owners = [
    {
      owner: frameOwner,
      label: "Cadre image",
      bounds: { x: 0, y: 0, width: sourcePixelWidth, height: sourcePixelHeight },
    },
    ...rectangles.map(({ candidate, bounds }) => ({
      owner: { kind: "rectangle", candidateId: candidate.id },
      label: candidate.label,
      bounds,
    })),
  ];
  const options = [];
  for (const { owner, label, bounds } of owners) {
    for (const extent of ["width", "height", "diagonal"]) {
      addPositiveSpatialOption(
        options,
        {
          kind: "extent",
          owner,
          extent,
        },
        `${label} · ${spatialExtentLabel(extent)}`,
        spatialExtentLength(bounds, extent),
      );
    }
  }
  const anchorReferences = owners.flatMap(({ owner, label, bounds }) => (
    SPATIAL_ANCHORS.map((anchor) => ({
      reference: { owner, anchor },
      label: `${label} · ${spatialAnchorLabel(anchor)}`,
      point: spatialAnchorPoint(bounds, anchor),
    }))
  ));
  for (let firstIndex = 0; firstIndex < anchorReferences.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < anchorReferences.length;
      secondIndex += 1
    ) {
      const from = anchorReferences[firstIndex];
      const to = anchorReferences[secondIndex];
      for (const metric of SPATIAL_DISTANCE_METRICS) {
        addPositiveSpatialOption(
          options,
          {
            kind: "anchor-distance",
            metric,
            from: from.reference,
            to: to.reference,
          },
          `${spatialMetricLabel(metric)} · ${from.label} → ${to.label}`,
          spatialAnchorDistance(from.point, to.point, metric),
        );
      }
    }
  }
  for (const anchor of anchorReferences.filter(
    ({ reference }) => reference.owner.kind === "rectangle",
  )) {
    for (const edge of SPATIAL_FRAME_EDGES) {
      addPositiveSpatialOption(
        options,
        {
          kind: "anchor-to-frame-edge",
          anchor: anchor.reference,
          edge,
        },
        `${anchor.label} → bord ${spatialFrameEdgeLabel(edge)}`,
        spatialAnchorToFrameEdgeDistance(
          anchor.point,
          edge,
          sourcePixelWidth,
          sourcePixelHeight,
        ),
      );
    }
  }
  return options.sort((left, right) => (
    left.label.localeCompare(right.label, "fr")
    || left.value.localeCompare(right.value)
  ));
}

export async function createPrivateWebLabDeclaredSpatialMeasurementPlanV1({
  draft,
  selectedCandidateIds,
  reviewedCandidates,
  expressions,
}) {
  const rectangles = selectedRectangles(
    selectedCandidateIds,
    reviewedCandidates,
    draft?.sourcePixelWidth,
    draft?.sourcePixelHeight,
  );
  if (
    rectangles === null
    || draft === null
    || typeof draft !== "object"
    || typeof draft.sourceImageContentIdentity !== "string"
    || !Array.isArray(expressions)
    || expressions.length !== 2
  ) {
    throw new Error("The declared spatial measurement plan is incomplete.");
  }
  const selectedRectangleCandidateIds = rectangles
    .map(({ candidate }) => candidate.id)
    .sort();
  const selectedIdSet = new Set(selectedRectangleCandidateIds);
  const sortedExpressions = expressions
    .map((expression) => canonicalSpatialExpression(expression, selectedIdSet))
    .sort((left, right) => compareCanonicalStrings(canonicalJson(left), canonicalJson(right)));
  if (
    !sortedExpressions.every(isPrivateWebLabSpatialExpressionV1)
    || canonicalJson(sortedExpressions[0]) === canonicalJson(sortedExpressions[1])
  ) {
    throw new Error("The declared spatial measurement expressions must be distinct.");
  }
  const spatialCandidateProjection = spatialRectangleCandidateProjection(reviewedCandidates);
  const planPayload = {
    contractId: PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID,
    contractVersion: 1,
    operationId: PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID,
    operationVersion: 1,
    coordinatePolicy: PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY,
    sourceIdentity: draft.sourceImageContentIdentity,
    sourcePixelWidth: draft.sourcePixelWidth,
    sourcePixelHeight: draft.sourcePixelHeight,
    spatialCandidateSetIdentity: await sha256CanonicalIdentity({
      contractId: "norma.declared-spatial-candidate-set@1",
      rectangles: spatialCandidateProjection,
    }),
    selectedRectangleCandidateIds,
    expressions: sortedExpressions,
    ratioPackRefs: [...PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS],
    matchTolerance: PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE,
  };
  return {
    ...planPayload,
    planIdentity: await sha256CanonicalIdentity(planPayload),
  };
}

export function privateWebLabMeasurementLengthCandidatesV1(
  selectedCandidateIds,
  reviewedCandidates,
) {
  if (!(selectedCandidateIds instanceof Set) || !Array.isArray(reviewedCandidates)) {
    return [];
  }
  return reviewedCandidates.flatMap((candidate) => {
    const kind = candidate.primitive?.kind ?? "rectangle";
    return selectedCandidateIds.has(candidate.id) && (kind === "segment" || kind === "axis")
      ? [{ id: candidate.id, label: candidate.label, kind }]
      : [];
  });
}

export function presentPrivateWebLabMeasurementReportV1(report, selectedCandidateIds = null) {
  if (
    report === null
    || typeof report !== "object"
    || !Array.isArray(report.measurements)
    || report.measurements.length !== 2
    || !isFiniteDominantShare(report.observedDominantShare)
    || !isFiniteUnitShare(report.matchTolerance)
  ) {
    return null;
  }
  const orderedMeasurements = measurementsInSelectedOrder(
    report.measurements,
    selectedCandidateIds,
  );
  if (orderedMeasurements === null) return null;
  const [first, second] = orderedMeasurements;
  if (!isPresentableMeasurement(first) || !isPresentableMeasurement(second)) return null;
  const dominantShare = report.observedDominantShare;
  const ratio = dominantShare / (1 - dominantShare);
  const toleranceText = `±${formatDecimal(report.matchTolerance * 100, 1)} pt`;
  const matchPresentation = presentMeasurementMatch(report.match);
  if (matchPresentation === null) return null;
  return {
    ratioText: `${formatDecimal(ratio, 3)} : 1`,
    firstMeasurementText:
      `${first.candidateLabel} · ${formatMeasurementLength(first.lengthPixels)} px`,
    secondMeasurementText:
      `${second.candidateLabel} · ${formatMeasurementLength(second.lengthPixels)} px`,
    toleranceText,
    verdictKind: matchPresentation.kind,
    verdictText: matchPresentation.kind === "match"
      ? `${matchPresentation.qualityLabel} avec la proportion normalisée `
        + `${matchPresentation.displayLabel}`
        + ` · écart ${formatDecimal(matchPresentation.absoluteDelta * 100, 2)} pt.`
      : `Aucune correspondance dans les packs actifs à ${toleranceText}.`,
  };
}

export function presentPrivateWebLabDeclaredSpatialMeasurementConfirmationV1(confirmation) {
  if (
    confirmation === null
    || typeof confirmation !== "object"
    || !Array.isArray(confirmation.resolvedMeasurements)
    || confirmation.resolvedMeasurements.length !== 2
    || confirmation.canonicalRatio === null
    || typeof confirmation.canonicalRatio !== "object"
    || !isFiniteDominantShare(confirmation.canonicalRatio.dominantShare)
    || !Number.isFinite(confirmation.canonicalRatio.longToShortRatio)
    || confirmation.canonicalRatio.longToShortRatio < 1
    || confirmation.canonicalRatio.longToShortRatioIsSecondary !== true
    || confirmation.analysis === null
    || typeof confirmation.analysis !== "object"
    || !isFiniteUnitShare(confirmation.analysis.matchTolerance)
  ) {
    return null;
  }
  const measurements = confirmation.resolvedMeasurements;
  if (!measurements.every(isPresentableSpatialMeasurement)) return null;
  const matchPresentation = presentMeasurementMatch(confirmation.analysis.match);
  if (matchPresentation === null) return null;
  const toleranceText = `±${formatDecimal(confirmation.analysis.matchTolerance * 100, 1)} pt`;
  return {
    dominantShareText:
      `${formatDecimal(confirmation.canonicalRatio.dominantShare * 100, 3)} %`,
    longShortRatioText:
      `${formatDecimal(confirmation.canonicalRatio.longToShortRatio, 3)} : 1`,
    firstMeasurementText: presentSpatialMeasurement(measurements[0]),
    secondMeasurementText: presentSpatialMeasurement(measurements[1]),
    toleranceText,
    verdictKind: matchPresentation.kind,
    verdictText: matchPresentation.kind === "match"
      ? `${matchPresentation.qualityLabel} avec la proportion normalisée `
        + `${matchPresentation.displayLabel}`
        + ` · écart ${formatDecimal(matchPresentation.absoluteDelta * 100, 2)} pt.`
      : `Aucune correspondance dans les packs actifs à ${toleranceText}.`,
  };
}

function measurementsInSelectedOrder(measurements, selectedCandidateIds) {
  if (selectedCandidateIds === null) return measurements;
  if (
    !Array.isArray(selectedCandidateIds)
    || selectedCandidateIds.length !== 2
    || !selectedCandidateIds.every((candidateId) => typeof candidateId === "string")
    || new Set(selectedCandidateIds).size !== 2
  ) {
    return null;
  }
  const byCandidateId = new Map();
  for (const measurement of measurements) {
    const candidateId = measurement.reference?.candidateId;
    if (typeof candidateId !== "string" || byCandidateId.has(candidateId)) return null;
    byCandidateId.set(candidateId, measurement);
  }
  const ordered = selectedCandidateIds.map((candidateId) => byCandidateId.get(candidateId));
  return ordered[0] !== undefined && ordered[1] !== undefined ? ordered : null;
}

export function isValidPrivateWebLabMeasurementPairV1(
  goalId,
  measurementCandidateIds,
  selectedCandidateIds,
  reviewedCandidates,
) {
  if (goalId !== "compare-two-lengths") return measurementCandidateIds === null;
  if (
    !Array.isArray(measurementCandidateIds)
    || measurementCandidateIds.length !== 2
    || new Set(measurementCandidateIds).size !== 2
  ) {
    return false;
  }
  const availableIds = new Set(
    privateWebLabMeasurementLengthCandidatesV1(
      selectedCandidateIds,
      reviewedCandidates,
    ).map(({ id }) => id),
  );
  return measurementCandidateIds.every((candidateId) => availableIds.has(candidateId));
}

export function isValidPrivateWebLabDeclaredSpatialMeasurementPlanV1(
  plan,
  selectedCandidateIds,
  reviewedCandidates,
) {
  if (
    plan === null
    || typeof plan !== "object"
    || plan.contractId !== PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID
    || plan.contractVersion !== 1
    || plan.operationId !== PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID
    || plan.operationVersion !== 1
    || plan.coordinatePolicy
      !== PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY
    || typeof plan.sourceIdentity !== "string"
    || !Number.isSafeInteger(plan.sourcePixelWidth)
    || plan.sourcePixelWidth <= 0
    || !Number.isSafeInteger(plan.sourcePixelHeight)
    || plan.sourcePixelHeight <= 0
    || !isSha256Identity(plan.spatialCandidateSetIdentity)
    || !isSha256Identity(plan.planIdentity)
    || !Array.isArray(plan.selectedRectangleCandidateIds)
    || plan.selectedRectangleCandidateIds.length !== 2
    || !Array.isArray(plan.expressions)
    || plan.expressions.length !== 2
    || !Array.isArray(plan.ratioPackRefs)
    || canonicalJson(plan.ratioPackRefs)
      !== canonicalJson(PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS)
    || plan.matchTolerance !== PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE
  ) {
    return false;
  }
  const selectedIds = selectedRectangleIds(selectedCandidateIds, reviewedCandidates);
  if (
    selectedIds === null
    || canonicalJson(plan.selectedRectangleCandidateIds) !== canonicalJson(selectedIds)
    || !plan.expressions.every(isPrivateWebLabSpatialExpressionV1)
  ) {
    return false;
  }
  const expressionKeys = plan.expressions.map(canonicalJson);
  if (
    expressionKeys[0] >= expressionKeys[1]
    || !plan.expressions.every((expression) => (
      spatialExpressionRectangleIds(expression).every((candidateId) => selectedIds.includes(candidateId))
    ))
  ) {
    return false;
  }
  return true;
}

export function boundedPrivateWebLabCoordinateV1(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? Number(parsed.toFixed(6))
    : fallback;
}

export function updatePrivateWebLabCandidateGeometryV1(candidate, path, value) {
  const parsed = boundedPrivateWebLabCoordinateV1(value, Number.NaN);
  if (!Number.isFinite(parsed)) return structuredClone(candidate);
  const updated = structuredClone(candidate);
  setCoordinatePath(updated, path, parsed);
  synchronizeCandidateBounds(updated);
  return isPrivateWebLabCandidateGeometryValidV1(updated)
    ? updated
    : structuredClone(candidate);
}

export function isPrivateWebLabCandidateGeometryValidV1(candidate) {
  if (candidate === null || typeof candidate !== "object") return false;
  const kind = candidate.primitive?.kind ?? "rectangle";
  if (kind === "rectangle") return rectangleGeometryIsValid(candidate);
  if (kind === "segment" || kind === "axis") return lineGeometryIsValid(candidate.primitive);
  if (kind === "ellipse") return ellipseGeometryIsValid(candidate.primitive);
  return false;
}

export function createPrivateWebLabConfirmationPayloadV1({
  explicitConfirmation,
  browserSessionId,
  draft,
  declaredSpatialMeasurementPlan = null,
  measurementCandidateIds,
  selectedCandidateIds,
  reviewedCandidates,
}) {
  if (!canRunPrivateWebLabCoreV1(
    explicitConfirmation,
    selectedCandidateIds,
    reviewedCandidates,
    draft.goal.id,
    measurementCandidateIds,
    declaredSpatialMeasurementPlan,
  )) {
    throw new Error("Norma Core requires an explicit browser confirmation and selection.");
  }
  return {
    explicitConfirmation: true,
    browserSessionId,
    labSessionId: draft.labSessionId,
    sourceImageContentIdentity: draft.sourceImageContentIdentity,
    candidateSetIdentity: draft.candidateSetIdentity,
    sourcePixelWidth: draft.sourcePixelWidth,
    sourcePixelHeight: draft.sourcePixelHeight,
    selectedCandidateIds: draft.goal.id === "compare-two-lengths"
      ? [...selectedCandidateIds].sort()
      : [...selectedCandidateIds],
    reviewedCandidates,
    measurementCandidateIds: null,
    ...(draft.goal.id === "compare-two-lengths"
      ? { declaredSpatialMeasurementPlan }
      : {}),
  };
}

function selectedRectangles(
  selectedCandidateIds,
  reviewedCandidates,
  sourcePixelWidth,
  sourcePixelHeight,
) {
  if (
    !(selectedCandidateIds instanceof Set)
    || selectedCandidateIds.size !== 2
    || !Array.isArray(reviewedCandidates)
    || !Number.isSafeInteger(sourcePixelWidth)
    || sourcePixelWidth <= 0
    || !Number.isSafeInteger(sourcePixelHeight)
    || sourcePixelHeight <= 0
  ) {
    return null;
  }
  const byId = new Map(reviewedCandidates.map((candidate) => [candidate.id, candidate]));
  const rectangles = [...selectedCandidateIds].sort().map((candidateId) => {
    const candidate = byId.get(candidateId);
    const kind = candidate?.primitive?.kind ?? "rectangle";
    if (
      candidate === undefined
      || kind !== "rectangle"
      || !isPrivateWebLabCandidateGeometryValidV1(candidate)
    ) {
      return null;
    }
    return {
      candidate: {
        ...candidate,
        label: typeof candidate.label === "string" && candidate.label.length > 0
          ? candidate.label
          : candidate.id,
      },
      bounds: {
        x: candidate.x * sourcePixelWidth,
        y: candidate.y * sourcePixelHeight,
        width: candidate.width * sourcePixelWidth,
        height: candidate.height * sourcePixelHeight,
      },
    };
  });
  return rectangles.every((rectangle) => rectangle !== null) ? rectangles : null;
}

function selectedRectangleIds(selectedCandidateIds, reviewedCandidates) {
  if (
    !(selectedCandidateIds instanceof Set)
    || selectedCandidateIds.size !== 2
    || !Array.isArray(reviewedCandidates)
  ) {
    return null;
  }
  const byId = new Map(reviewedCandidates.map((candidate) => [candidate.id, candidate]));
  const ids = [...selectedCandidateIds].sort();
  return ids.every((candidateId) => {
    const candidate = byId.get(candidateId);
    return (
      candidate !== undefined
      && (candidate.primitive?.kind ?? "rectangle") === "rectangle"
      && isPrivateWebLabCandidateGeometryValidV1(candidate)
    );
  }) ? ids : null;
}

function spatialRectangleCandidateProjection(reviewedCandidates) {
  if (!Array.isArray(reviewedCandidates)) {
    throw new Error("The declared spatial measurement candidate set is invalid.");
  }
  const rectangles = reviewedCandidates.filter((candidate) => (
    (candidate.primitive?.kind ?? "rectangle") === "rectangle"
  ));
  if (
    rectangles.length === 0
    || new Set(rectangles.map(({ id }) => id)).size !== rectangles.length
    || rectangles.some((candidate) => !isPrivateWebLabCandidateGeometryValidV1(candidate))
  ) {
    throw new Error("The declared spatial measurement rectangle candidates are invalid.");
  }
  return rectangles.map((candidate) => ({
    id: candidate.id,
    x: canonicalSpatialNumber(candidate.x),
    y: canonicalSpatialNumber(candidate.y),
    width: canonicalSpatialNumber(candidate.width),
    height: canonicalSpatialNumber(candidate.height),
  })).sort((left, right) => compareCanonicalStrings(left.id, right.id));
}

function addPositiveSpatialOption(options, expression, label, lengthPixels) {
  if (!Number.isFinite(lengthPixels) || lengthPixels <= 0) return;
  const canonicalExpression = canonicalSpatialExpression(
    expression,
    new Set(spatialExpressionRectangleIds(expression)),
  );
  options.push({
    value: canonicalJson(canonicalExpression),
    label: `${label} · ${formatMeasurementLength(lengthPixels)} px`,
    expression: canonicalExpression,
  });
}

function spatialExtentLength(bounds, extent) {
  if (extent === "width") return bounds.width;
  if (extent === "height") return bounds.height;
  return Math.hypot(bounds.width, bounds.height);
}

function spatialAnchorPoint(bounds, anchor) {
  const factors = {
    center: [0.5, 0.5],
    "top-left": [0, 0],
    "top-right": [1, 0],
    "bottom-left": [0, 1],
    "bottom-right": [1, 1],
    "top-midpoint": [0.5, 0],
    "right-midpoint": [1, 0.5],
    "bottom-midpoint": [0.5, 1],
    "left-midpoint": [0, 0.5],
  };
  const [xFactor, yFactor] = factors[anchor];
  return {
    x: bounds.x + (bounds.width * xFactor),
    y: bounds.y + (bounds.height * yFactor),
  };
}

function spatialAnchorDistance(from, to, metric) {
  if (metric === "horizontal") return Math.abs(from.x - to.x);
  if (metric === "vertical") return Math.abs(from.y - to.y);
  return Math.hypot(from.x - to.x, from.y - to.y);
}

function spatialAnchorToFrameEdgeDistance(point, edge, sourcePixelWidth, sourcePixelHeight) {
  if (edge === "left") return point.x;
  if (edge === "right") return sourcePixelWidth - point.x;
  if (edge === "top") return point.y;
  return sourcePixelHeight - point.y;
}

function spatialExtentLabel(extent) {
  return {
    width: "largeur",
    height: "hauteur",
    diagonal: "diagonale",
  }[extent];
}

function spatialAnchorLabel(anchor) {
  return {
    center: "centre",
    "top-left": "coin haut gauche",
    "top-right": "coin haut droit",
    "bottom-left": "coin bas gauche",
    "bottom-right": "coin bas droit",
    "top-midpoint": "milieu haut",
    "right-midpoint": "milieu droit",
    "bottom-midpoint": "milieu bas",
    "left-midpoint": "milieu gauche",
  }[anchor];
}

function spatialMetricLabel(metric) {
  return {
    euclidean: "Distance euclidienne",
    horizontal: "Écart horizontal",
    vertical: "Écart vertical",
  }[metric];
}

function spatialFrameEdgeLabel(edge) {
  return {
    left: "gauche",
    right: "droit",
    top: "haut",
    bottom: "bas",
  }[edge];
}

function canonicalSpatialExpression(expression, selectedIds) {
  if (!isPrivateWebLabSpatialExpressionV1(expression)) {
    throw new Error("The declared spatial measurement expression is invalid.");
  }
  if (expression.kind === "extent") {
    return {
      kind: "extent",
      owner: canonicalSpatialOwner(expression.owner, selectedIds),
      extent: expression.extent,
    };
  }
  if (expression.kind === "anchor-distance") {
    const anchors = [
      canonicalSpatialAnchor(expression.from, selectedIds),
      canonicalSpatialAnchor(expression.to, selectedIds),
    ].sort((left, right) => compareCanonicalStrings(canonicalJson(left), canonicalJson(right)));
    return {
      kind: "anchor-distance",
      metric: expression.metric,
      from: anchors[0],
      to: anchors[1],
    };
  }
  return {
    kind: "anchor-to-frame-edge",
    anchor: canonicalSpatialAnchor(expression.anchor, selectedIds),
    edge: expression.edge,
  };
}

function canonicalSpatialOwner(owner, selectedIds) {
  if (owner.kind === "image-frame") return { kind: "image-frame" };
  if (!selectedIds.has(owner.candidateId)) {
    throw new Error("The declared spatial measurement rectangle owner is not selected.");
  }
  return { kind: "rectangle", candidateId: owner.candidateId };
}

function canonicalSpatialAnchor(anchor, selectedIds) {
  return {
    owner: canonicalSpatialOwner(anchor.owner, selectedIds),
    anchor: anchor.anchor,
  };
}

function isPrivateWebLabSpatialExpressionV1(expression) {
  if (expression === null || typeof expression !== "object" || Array.isArray(expression)) {
    return false;
  }
  if (expression.kind === "extent") {
    return exactFields(expression, ["extent", "kind", "owner"])
      && ["width", "height", "diagonal"].includes(expression.extent)
      && isSpatialOwner(expression.owner);
  }
  if (expression.kind === "anchor-distance") {
    return exactFields(expression, ["from", "kind", "metric", "to"])
      && SPATIAL_DISTANCE_METRICS.includes(expression.metric)
      && isSpatialAnchor(expression.from)
      && isSpatialAnchor(expression.to);
  }
  if (expression.kind === "anchor-to-frame-edge") {
    return exactFields(expression, ["anchor", "edge", "kind"])
      && SPATIAL_FRAME_EDGES.includes(expression.edge)
      && isSpatialAnchor(expression.anchor);
  }
  return false;
}

function isSpatialOwner(owner) {
  if (owner === null || typeof owner !== "object" || Array.isArray(owner)) return false;
  if (owner.kind === "image-frame") return exactFields(owner, ["kind"]);
  return owner.kind === "rectangle"
    && exactFields(owner, ["candidateId", "kind"])
    && typeof owner.candidateId === "string"
    && owner.candidateId.length > 0;
}

function isSpatialAnchor(anchor) {
  return (
    anchor !== null
    && typeof anchor === "object"
    && !Array.isArray(anchor)
    && exactFields(anchor, ["anchor", "owner"])
    && SPATIAL_ANCHORS.includes(anchor.anchor)
    && isSpatialOwner(anchor.owner)
  );
}

function spatialExpressionRectangleIds(expression) {
  const owners = expression.kind === "extent"
    ? [expression.owner]
    : expression.kind === "anchor-distance"
      ? [expression.from.owner, expression.to.owner]
      : [expression.anchor.owner];
  return owners
    .filter(({ kind }) => kind === "rectangle")
    .map(({ candidateId }) => candidateId);
}

function isPresentableSpatialMeasurement(measurement) {
  return (
    measurement !== null
    && typeof measurement === "object"
    && isPrivateWebLabSpatialExpressionV1(measurement.expression)
    && Number.isFinite(measurement.lengthPixels)
    && measurement.lengthPixels > 0
  );
}

function presentSpatialMeasurement(measurement) {
  return `${spatialExpressionSummary(measurement.expression)} · `
    + `${formatMeasurementLength(measurement.lengthPixels)} px`;
}

function spatialExpressionSummary(expression) {
  if (expression.kind === "extent") {
    return `${spatialOwnerSummary(expression.owner)} · ${spatialExtentLabel(expression.extent)}`;
  }
  if (expression.kind === "anchor-distance") {
    return `${spatialMetricLabel(expression.metric)} · `
      + `${spatialAnchorSummary(expression.from)} → ${spatialAnchorSummary(expression.to)}`;
  }
  return `${spatialAnchorSummary(expression.anchor)} → bord `
    + spatialFrameEdgeLabel(expression.edge);
}

function spatialOwnerSummary(owner) {
  return owner.kind === "image-frame" ? "Cadre image" : `Rectangle ${owner.candidateId}`;
}

function spatialAnchorSummary(anchor) {
  return `${spatialOwnerSummary(anchor.owner)} · ${spatialAnchorLabel(anchor.anchor)}`;
}

function exactFields(value, fields) {
  return Object.keys(value).sort().join("\n") === [...fields].sort().join("\n");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Canonical JSON only supports finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const fields = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  return `{${fields.join(",")}}`;
}

function compareCanonicalStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalSpatialNumber(value) {
  return Number(value.toFixed(12));
}

async function sha256CanonicalIdentity(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function isSha256Identity(value) {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function setCoordinatePath(candidate, path, value) {
  const parts = path.split(".");
  let target = candidate;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] = value;
}

function synchronizeCandidateBounds(candidate) {
  const kind = candidate.primitive?.kind ?? "rectangle";
  if (kind === "segment" || kind === "axis") {
    const { start, end } = candidate.primitive;
    candidate.x = Math.min(start.x, end.x);
    candidate.y = Math.min(start.y, end.y);
    candidate.width = Math.abs(end.x - start.x);
    candidate.height = Math.abs(end.y - start.y);
  } else if (kind === "ellipse") {
    const { center, radiusX, radiusY } = candidate.primitive;
    const minX = Math.max(0, center.x - radiusX);
    const minY = Math.max(0, center.y - radiusY);
    const maxX = Math.min(1, center.x + radiusX);
    const maxY = Math.min(1, center.y + radiusY);
    candidate.x = minX;
    candidate.y = minY;
    candidate.width = maxX - minX;
    candidate.height = maxY - minY;
  }
  for (const field of ["x", "y", "width", "height"]) {
    candidate[field] = Number(candidate[field].toFixed(6));
  }
}

function isUnitCoordinate(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isFiniteUnitShare(value) {
  return Number.isFinite(value) && value >= 0 && value < 1;
}

function isFiniteDominantShare(value) {
  return isFiniteUnitShare(value) && value >= 0.5;
}

function isPresentableMeasurement(measurement) {
  return (
    measurement !== null
    && typeof measurement === "object"
    && typeof measurement.candidateLabel === "string"
    && measurement.candidateLabel.length > 0
    && Number.isFinite(measurement.lengthPixels)
    && measurement.lengthPixels > 0
  );
}

function presentMeasurementMatch(match) {
  if (match === null) return { kind: "no-match" };
  if (
    match === null
    || typeof match !== "object"
    || !["exact", "strong", "near"].includes(match.quality)
    || !Number.isFinite(match.absoluteDelta)
    || match.absoluteDelta < 0
    || match.ratio === null
    || typeof match.ratio !== "object"
    || typeof match.ratio.displayLabel !== "string"
    || match.ratio.displayLabel.length === 0
  ) {
    return null;
  }
  const qualityLabels = {
    exact: match.absoluteDelta === 0
      ? "Correspondance exacte"
      : "Correspondance très forte",
    strong: "Correspondance forte",
    near: "Correspondance proche",
  };
  return {
    kind: "match",
    qualityLabel: qualityLabels[match.quality],
    displayLabel: match.ratio.displayLabel,
    absoluteDelta: match.absoluteDelta,
  };
}

function formatDecimal(value, fractionDigits) {
  return value.toFixed(fractionDigits).replace(".", ",");
}

function formatMeasurementLength(value) {
  if (value >= 0.05) return formatDecimal(value, 1);
  if (value >= 0.0001) {
    return formatDecimal(value, 4).replace(/0+$/u, "").replace(/,$/u, "");
  }
  return value.toExponential(2).replace(".", ",");
}

function isPositiveUnitCoordinate(value) {
  return isUnitCoordinate(value) && value > 0;
}

function isUnitPoint(value) {
  return (
    value !== null
    && typeof value === "object"
    && isUnitCoordinate(value.x)
    && isUnitCoordinate(value.y)
  );
}

function rectangleGeometryIsValid(candidate) {
  return (
    isUnitCoordinate(candidate.x)
    && isUnitCoordinate(candidate.y)
    && isPositiveUnitCoordinate(candidate.width)
    && isPositiveUnitCoordinate(candidate.height)
    && candidate.x + candidate.width <= 1
    && candidate.y + candidate.height <= 1
  );
}

function lineGeometryIsValid(primitive) {
  const { start, end } = primitive;
  return (
    isUnitPoint(start)
    && isUnitPoint(end)
    && (start.x !== end.x || start.y !== end.y)
  );
}

function ellipseGeometryIsValid(primitive) {
  const { center, radiusX, radiusY } = primitive;
  return (
    isUnitPoint(center)
    && isPositiveUnitCoordinate(radiusX)
    && isPositiveUnitCoordinate(radiusY)
    && ellipsePerimeterIntersectsImageFrame(primitive)
  );
}

function ellipsePerimeterIntersectsImageFrame({ center, radiusX, radiusY }) {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ].some((corner) => {
    const normalizedX = (corner.x - center.x) / radiusX;
    const normalizedY = (corner.y - center.y) / radiusY;
    return (normalizedX ** 2) + (normalizedY ** 2) >= 1 - 1e-12;
  });
}
