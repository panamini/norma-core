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

export function canRunPrivateWebLabCoreV1(explicitConfirmation, selectedCandidateIds) {
  return explicitConfirmation === true && selectedCandidateIds.size > 0;
}

export function boundedPrivateWebLabCoordinateV1(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? Number(parsed.toFixed(6))
    : fallback;
}

export function createPrivateWebLabConfirmationPayloadV1({
  explicitConfirmation,
  browserSessionId,
  draft,
  selectedCandidateIds,
  reviewedCandidates,
}) {
  if (!canRunPrivateWebLabCoreV1(explicitConfirmation, selectedCandidateIds)) {
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
