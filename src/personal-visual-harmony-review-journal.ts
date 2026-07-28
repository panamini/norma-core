export const PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID =
  "norma.personal-visual-harmony-review-journal@1" as const;

export const PERSONAL_VISUAL_HARMONY_REVIEW_EVENT_KINDS = Object.freeze([
  "draft-visible",
  "view-original",
  "view-guides",
  "show-all-guides",
  "focus-guides",
  "candidate-added",
  "candidate-removed",
  "candidate-moved",
  "candidate-resized",
  "sam-requested",
  "sam-ready",
  "sam-abstained",
  "sam-failed",
  "pixel-ready",
  "pixel-partial-failure",
  "confirm-clicked",
  "confirm-failed",
  "core-visible",
] as const);

export type PersonalVisualHarmonyReviewEventKindV1 =
  (typeof PERSONAL_VISUAL_HARMONY_REVIEW_EVENT_KINDS)[number];

export interface PersonalVisualHarmonyReviewScopeV1 {
  readonly analysisIdentity: string;
  readonly fileId: string;
  readonly sessionId: string;
}

export interface PersonalVisualHarmonyReviewEventV1 {
  readonly atMs: number;
  readonly kind: PersonalVisualHarmonyReviewEventKindV1;
}

export interface PersonalVisualHarmonyReviewJournalV1
  extends PersonalVisualHarmonyReviewScopeV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID;
  readonly prepareDurationMs: number | null;
  readonly events: readonly PersonalVisualHarmonyReviewEventV1[];
}

export interface PersonalVisualHarmonyReviewSummaryV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID;
  readonly prepareDurationMs: number | null;
  readonly eventCount: number;
  readonly corrections: {
    readonly added: number;
    readonly removed: number;
    readonly moved: number;
    readonly resized: number;
    readonly total: number;
  };
  readonly failureCount: number;
  readonly samOutcome: "not-requested" | "pending" | "ready" | "abstained" | "failed";
  readonly timeToConfirmationMs: number | null;
  readonly timeToCoreVisibleMs: number | null;
}

const MAX_REVIEW_EVENTS = 64;
const SHA256_IDENTITY_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SAFE_BINDING_ID_PATTERN = /^[^\u0000-\u001f\u007f]{1,512}$/u;

function validScope(value: unknown): value is PersonalVisualHarmonyReviewScopeV1 {
  if (value === null || typeof value !== "object") return false;
  const scope = value as Record<string, unknown>;
  return (
    Object.keys(scope).sort().join("|") === "analysisIdentity|fileId|sessionId"
    && typeof scope.analysisIdentity === "string"
    && SHA256_IDENTITY_PATTERN.test(scope.analysisIdentity)
    && typeof scope.fileId === "string"
    && SAFE_BINDING_ID_PATTERN.test(scope.fileId)
    && typeof scope.sessionId === "string"
    && SAFE_BINDING_ID_PATTERN.test(scope.sessionId)
  );
}

function validEvent(value: unknown): value is PersonalVisualHarmonyReviewEventV1 {
  if (value === null || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    Object.keys(event).sort().join("|") === "atMs|kind"
    && Number.isSafeInteger(event.atMs)
    && (event.atMs as number) >= 0
    && typeof event.kind === "string"
    && (PERSONAL_VISUAL_HARMONY_REVIEW_EVENT_KINDS as readonly string[]).includes(
      event.kind,
    )
  );
}

export function readPersonalVisualHarmonyReviewJournalV1(
  value: unknown,
  scope: PersonalVisualHarmonyReviewScopeV1,
): PersonalVisualHarmonyReviewJournalV1 | null {
  if (!validScope(scope) || value === null || typeof value !== "object") return null;
  const journal = value as unknown as PersonalVisualHarmonyReviewJournalV1;
  if (
    Object.keys(journal).sort().join("|")
      !== "analysisIdentity|contractId|events|fileId|prepareDurationMs|sessionId"
    || journal.contractId !== PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID
    || journal.analysisIdentity !== scope.analysisIdentity
    || journal.fileId !== scope.fileId
    || journal.sessionId !== scope.sessionId
    || (
      journal.prepareDurationMs !== null
      && (
        !Number.isSafeInteger(journal.prepareDurationMs)
        || journal.prepareDurationMs < 0
      )
    )
    || !Array.isArray(journal.events)
    || journal.events.length > MAX_REVIEW_EVENTS
    || !journal.events.every(validEvent)
  ) {
    return null;
  }
  return journal;
}

export function appendPersonalVisualHarmonyReviewEventV1(
  value: unknown,
  scope: PersonalVisualHarmonyReviewScopeV1,
  kind: string,
  atMs: number,
  prepareDurationMs: number | null,
): PersonalVisualHarmonyReviewJournalV1 {
  if (!validScope(scope)) {
    throw new Error("Personal visual harmony review scope is invalid.");
  }
  const current = readPersonalVisualHarmonyReviewJournalV1(value, scope);
  const initial: PersonalVisualHarmonyReviewJournalV1 = current ?? {
    contractId: PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID,
    analysisIdentity: scope.analysisIdentity,
    fileId: scope.fileId,
    sessionId: scope.sessionId,
    prepareDurationMs: Number.isSafeInteger(prepareDurationMs) && prepareDurationMs! >= 0
      ? prepareDurationMs
      : null,
    events: [],
  };
  if (
    !(PERSONAL_VISUAL_HARMONY_REVIEW_EVENT_KINDS as readonly string[]).includes(kind)
    || !Number.isSafeInteger(atMs)
    || atMs < 0
    || initial.events.length >= MAX_REVIEW_EVENTS
  ) {
    return initial;
  }
  return {
    ...initial,
    events: [...initial.events, {
      atMs,
      kind: kind as PersonalVisualHarmonyReviewEventKindV1,
    }],
  };
}

export function summarizePersonalVisualHarmonyReviewJournalV1(
  value: PersonalVisualHarmonyReviewJournalV1 | null,
): PersonalVisualHarmonyReviewSummaryV1 {
  const counts = { added: 0, removed: 0, moved: 0, resized: 0 };
  let failureCount = 0;
  let samOutcome: PersonalVisualHarmonyReviewSummaryV1["samOutcome"] = "not-requested";
  let draftVisibleAtMs: number | null = null;
  let confirmationClickedAtMs: number | null = null;
  let coreVisibleAtMs: number | null = null;
  for (const event of value?.events ?? []) {
    if (event.kind === "draft-visible" && draftVisibleAtMs === null) {
      draftVisibleAtMs = event.atMs;
    } else if (event.kind === "confirm-clicked" && confirmationClickedAtMs === null) {
      confirmationClickedAtMs = event.atMs;
    } else if (event.kind === "core-visible" && coreVisibleAtMs === null) {
      coreVisibleAtMs = event.atMs;
    }
    if (event.kind === "candidate-added") counts.added += 1;
    if (event.kind === "candidate-removed") counts.removed += 1;
    if (event.kind === "candidate-moved") counts.moved += 1;
    if (event.kind === "candidate-resized") counts.resized += 1;
    if (event.kind === "sam-requested") samOutcome = "pending";
    if (event.kind === "sam-ready") samOutcome = "ready";
    if (event.kind === "sam-abstained") samOutcome = "abstained";
    if (event.kind === "sam-failed") samOutcome = "failed";
    if (
      event.kind === "sam-failed"
      || event.kind === "pixel-partial-failure"
      || event.kind === "confirm-failed"
    ) {
      failureCount += 1;
    }
  }
  const correctionTotal = counts.added + counts.removed + counts.moved + counts.resized;
  return {
    contractId: PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID,
    prepareDurationMs: value?.prepareDurationMs ?? null,
    eventCount: value?.events.length ?? 0,
    corrections: { ...counts, total: correctionTotal },
    failureCount,
    samOutcome,
    timeToConfirmationMs: (
      draftVisibleAtMs !== null
      && confirmationClickedAtMs !== null
      && confirmationClickedAtMs >= draftVisibleAtMs
    )
      ? confirmationClickedAtMs - draftVisibleAtMs
      : null,
    timeToCoreVisibleMs: (
      draftVisibleAtMs !== null
      && coreVisibleAtMs !== null
      && coreVisibleAtMs >= draftVisibleAtMs
    )
      ? coreVisibleAtMs - draftVisibleAtMs
      : null,
  };
}
