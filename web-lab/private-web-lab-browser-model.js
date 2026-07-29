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

export function canRunPrivateWebLabCoreV1(
  explicitConfirmation,
  selectedCandidateIds,
  reviewedCandidates,
  goalId = null,
  measurementCandidateIds = null,
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
      || isValidPrivateWebLabMeasurementPairV1(
        goalId,
        measurementCandidateIds,
        selectedCandidateIds,
        reviewedCandidates,
      )
    )
  );
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
  const toleranceText = `±${formatDecimal(report.matchTolerance * 100, 1)} %`;
  const matchPresentation = presentMeasurementMatch(report.match);
  if (matchPresentation === null) return null;
  return {
    ratioText: `${formatDecimal(ratio, 3)} : 1`,
    firstMeasurementText:
      `${first.candidateLabel} · ${formatDecimal(first.lengthPixels, 1)} px`,
    secondMeasurementText:
      `${second.candidateLabel} · ${formatDecimal(second.lengthPixels, 1)} px`,
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
    selectedCandidateIds: [...selectedCandidateIds],
    reviewedCandidates,
    measurementCandidateIds:
      draft.goal.id === "compare-two-lengths"
        ? [...measurementCandidateIds]
        : null,
  };
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
    exact: "Correspondance exacte",
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
