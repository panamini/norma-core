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
) {
  if (
    explicitConfirmation !== true
    || !(selectedCandidateIds instanceof Set)
    || !Array.isArray(reviewedCandidates)
    || reviewedCandidates.some((candidate) => !isPrivateWebLabCandidateGeometryValidV1(candidate))
  ) {
    return false;
  }
  return reviewedCandidates.some((candidate) => (
    selectedCandidateIds.has(candidate.id)
    && (candidate.primitive?.kind ?? "rectangle") === "rectangle"
  ));
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
  selectedCandidateIds,
  reviewedCandidates,
}) {
  if (!canRunPrivateWebLabCoreV1(
    explicitConfirmation,
    selectedCandidateIds,
    reviewedCandidates,
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
