import { createHash, randomUUID } from "node:crypto";

import {
  confirmPersonalVisualHarmonyCandidateSetV1,
  createPersonalVisualHarmonyOverlaySvgV1,
  preparePersonalVisualHarmonyCandidateSetV1,
  type PersonalVisualHarmonyCandidateInputV1,
  type PersonalVisualHarmonyConfirmationV1,
  type PersonalVisualHarmonyPreparedCandidateSetV1,
} from "./personal-visual-harmony.js";
import { serializeCanonicalJson } from "./serialization.js";
import { PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1 } from "./mcp/personal-visual-harmony-app.js";

export const PRIVATE_WEB_LAB_CONTRACT_ID = "norma.private-web-lab@1" as const;
export const PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID =
  "norma.private-web-lab-receipt@1" as const;
export const PRIVATE_WEB_LAB_CANONICAL_EXPORT_CONTRACT_ID =
  "norma.private-web-lab-canonical-result@1" as const;
export const PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT = 4;

const PRIVATE_WEB_LAB_SESSION_TTL_MS = 30 * 60 * 1_000;
const PRIVATE_WEB_LAB_MAX_SESSIONS = 32;
const SOURCE_CONTENT_IDENTITY_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const BROWSER_SESSION_ID_PATTERN = /^[A-Za-z0-9:_-]{8,160}$/u;
const LAB_SESSION_ID_PATTERN = /^web-lab-session:[0-9a-f-]{36}$/u;
const IMAGE_MEDIA_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

type GuidedGoal = typeof PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1[number];

export interface PrivateWebLabDraftRequestV1 {
  readonly browserSessionId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly goalId: GuidedGoal["id"];
}

export interface PrivateWebLabDraftV1 {
  readonly contractId: typeof PRIVATE_WEB_LAB_CONTRACT_ID;
  readonly stage: "confirmation_required";
  readonly draftKind: "deterministic_fixture_no_provider";
  readonly providerCalls: 0;
  readonly coreRun: false;
  readonly labSessionId: string;
  readonly sourceFileId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly goal: GuidedGoal;
  readonly candidateSetIdentity: string;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly selectedCandidateIds: readonly string[];
  readonly strongestGuideCount: typeof PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT;
  readonly visibleCandidateIds: readonly string[];
  readonly overlaySvg: string;
}

export interface PrivateWebLabConfirmRequestV1 {
  readonly explicitConfirmation: true;
  readonly browserSessionId: string;
  readonly labSessionId: string;
  readonly sourceImageContentIdentity: string;
  readonly candidateSetIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly selectedCandidateIds: readonly string[];
  readonly reviewedCandidates: readonly PersonalVisualHarmonyCandidateInputV1[];
}

export interface PrivateWebLabReceiptV1 {
  readonly contractId: typeof PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID;
  readonly stage: "completed";
  readonly receiptIdentity: string;
  readonly draftKind: "deterministic_fixture_no_provider";
  readonly providerCalls: 0;
  readonly coreRun: true;
  readonly explicitSelectionConfirmation: true;
  readonly sourceImageContentIdentity: string;
  readonly goalId: GuidedGoal["id"];
  readonly draftCandidateSetIdentity: string;
  readonly acceptedCandidateSetIdentity: string;
  readonly selectedCandidateIds: readonly string[];
  readonly canonicalResultIdentity: string;
  readonly ratioPackRefs: readonly string[];
  readonly canonicalCoreResult: PersonalVisualHarmonyConfirmationV1["result"]["harmonicAnalysis"];
  readonly exportFileName: "norma-private-web-lab-result.json";
  readonly exportJson: string;
}

interface PrivateWebLabSessionV1 {
  readonly browserSessionId: string;
  readonly labSessionId: string;
  readonly sourceFileId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly goal: GuidedGoal;
  readonly prepared: PersonalVisualHarmonyPreparedCandidateSetV1;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  completed?: {
    readonly confirmationRequestIdentity: string;
    readonly receipt: PrivateWebLabReceiptV1;
  };
}

type ConfirmationExecutor = typeof confirmPersonalVisualHarmonyCandidateSetV1;

export interface PrivateWebLabApplicationOptionsV1 {
  readonly now?: () => number;
  readonly createSessionId?: () => string;
  readonly executeConfirmation?: ConfirmationExecutor;
  readonly sessionTtlMs?: number;
  readonly maxSessions?: number;
}

export class PrivateWebLabApplicationV1 {
  private readonly sessions = new Map<string, PrivateWebLabSessionV1>();
  private readonly now: () => number;
  private readonly createSessionId: () => string;
  private readonly executeConfirmation: ConfirmationExecutor;
  private readonly sessionTtlMs: number;
  private readonly maxSessions: number;

  constructor(options: PrivateWebLabApplicationOptionsV1 = {}) {
    this.now = options.now ?? (() => Date.now());
    this.createSessionId =
      options.createSessionId ?? (() => `web-lab-session:${randomUUID()}`);
    this.executeConfirmation =
      options.executeConfirmation ?? confirmPersonalVisualHarmonyCandidateSetV1;
    this.sessionTtlMs = boundedPositiveInteger(
      options.sessionTtlMs ?? PRIVATE_WEB_LAB_SESSION_TTL_MS,
      "sessionTtlMs",
      24 * 60 * 60 * 1_000,
    );
    this.maxSessions = boundedPositiveInteger(
      options.maxSessions ?? PRIVATE_WEB_LAB_MAX_SESSIONS,
      "maxSessions",
      256,
    );
  }

  prepareDraft(value: unknown): PrivateWebLabDraftV1 {
    const input = parseDraftRequest(value);
    const now = this.now();
    this.pruneExpired(now);
    if (this.sessions.size >= this.maxSessions) {
      throw new Error("Private Web Lab session capacity is exhausted.");
    }

    const goal = requireGoal(input.goalId);
    const sourceFileId = `web-lab:${input.sourceImageContentIdentity.slice("sha256:".length)}`;
    const candidates = deterministicFixtureCandidates(goal.id);
    const prepared = preparePersonalVisualHarmonyCandidateSetV1({
      sourceFileId,
      sourceImageMediaType: input.sourceImageMediaType,
      candidates,
    });
    const labSessionId = this.createSessionId();
    if (!LAB_SESSION_ID_PATTERN.test(labSessionId) || this.sessions.has(labSessionId)) {
      throw new Error("Could not create a unique bounded Private Web Lab session.");
    }
    const session: PrivateWebLabSessionV1 = {
      browserSessionId: input.browserSessionId,
      labSessionId,
      sourceFileId,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      sourceImageMediaType: input.sourceImageMediaType,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      goal,
      prepared,
      createdAtMs: now,
      expiresAtMs: now + this.sessionTtlMs,
    };
    this.sessions.set(labSessionId, session);
    const selectedCandidateIds = prepared.candidates.map(({ id }) => id);
    return {
      contractId: PRIVATE_WEB_LAB_CONTRACT_ID,
      stage: "confirmation_required",
      draftKind: "deterministic_fixture_no_provider",
      providerCalls: 0,
      coreRun: false,
      labSessionId,
      sourceFileId,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      sourceImageMediaType: input.sourceImageMediaType,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      goal,
      candidateSetIdentity: prepared.candidateSetIdentity,
      candidates: prepared.candidates,
      selectedCandidateIds,
      strongestGuideCount: PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT,
      visibleCandidateIds: prepared.candidates
        .slice(0, PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT)
        .map(({ id }) => id),
      overlaySvg: createPersonalVisualHarmonyOverlaySvgV1({
        preparedCandidateSet: prepared,
        selectedCandidateIds,
      }),
    };
  }

  confirm(value: unknown): PrivateWebLabReceiptV1 {
    const input = parseConfirmRequest(value);
    const now = this.now();
    this.pruneExpired(now);
    const session = this.sessions.get(input.labSessionId);
    if (session === undefined) {
      throw new Error("Private Web Lab session is missing or expired.");
    }
    requireSessionBinding(session, input);

    const reviewedCandidates = requireReviewedCandidateBinding(
      session.prepared.candidates,
      input.reviewedCandidates,
    );
    const reviewedPrepared = preparePersonalVisualHarmonyCandidateSetV1({
      sourceFileId: session.sourceFileId,
      sourceImageMediaType: session.sourceImageMediaType,
      expectedSourceImageReferenceIdentity: session.prepared.sourceImageReferenceIdentity,
      candidates: reviewedCandidates,
    });
    const selectedCandidateIds = requireSelectedCandidateIds(
      reviewedPrepared.candidates,
      input.selectedCandidateIds,
    );
    const selectedCoreCandidateIds = selectedCandidateIds.filter((candidateId) => {
      const candidate = reviewedPrepared.candidates.find(({ id }) => id === candidateId);
      return (candidate?.primitive?.kind ?? "rectangle") === "rectangle";
    });
    const confirmedVisualGuideCandidateIds = selectedCandidateIds.filter(
      (candidateId) => !selectedCoreCandidateIds.includes(candidateId),
    );
    if (selectedCoreCandidateIds.length === 0) {
      throw new Error("Private Web Lab confirmation requires one selected rectangle for Norma Core.");
    }

    const confirmationRequestIdentity = contentIdentityFor({
      browserSessionId: input.browserSessionId,
      labSessionId: input.labSessionId,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      draftCandidateSetIdentity: input.candidateSetIdentity,
      acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      selectedCandidateIds,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
    });
    if (session.completed !== undefined) {
      if (session.completed.confirmationRequestIdentity !== confirmationRequestIdentity) {
        throw new Error("This Private Web Lab session was already confirmed with different geometry.");
      }
      return session.completed.receipt;
    }

    const confirmation = this.executeConfirmation({
      preparedCandidateSet: reviewedPrepared,
      expectedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      selectedCandidateIds: selectedCoreCandidateIds,
      confirmedVisualGuideCandidateIds,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      acceptedAt: new Date(now).toISOString(),
    });
    const canonicalCoreResult = confirmation.result.harmonicAnalysis;
    const canonicalExport = {
      contractId: PRIVATE_WEB_LAB_CANONICAL_EXPORT_CONTRACT_ID,
      sourceImageContentIdentity: session.sourceImageContentIdentity,
      acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      selectedCandidateIds,
      ratioPackRefs: canonicalCoreResult.ratioPackRefs,
      canonicalCoreResult,
    };
    const exportJson = `${serializeCanonicalJson(canonicalExport)}\n`;
    const receipt: PrivateWebLabReceiptV1 = {
      contractId: PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID,
      stage: "completed",
      receiptIdentity: sha256Identity(exportJson),
      draftKind: "deterministic_fixture_no_provider",
      providerCalls: 0,
      coreRun: true,
      explicitSelectionConfirmation: true,
      sourceImageContentIdentity: session.sourceImageContentIdentity,
      goalId: session.goal.id,
      draftCandidateSetIdentity: session.prepared.candidateSetIdentity,
      acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      selectedCandidateIds,
      canonicalResultIdentity: canonicalCoreResult.contentIdentity,
      ratioPackRefs: canonicalCoreResult.ratioPackRefs,
      canonicalCoreResult,
      exportFileName: "norma-private-web-lab-result.json",
      exportJson,
    };
    session.completed = { confirmationRequestIdentity, receipt };
    return receipt;
  }

  private pruneExpired(now: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAtMs <= now) this.sessions.delete(sessionId);
    }
  }
}

export function deterministicPrivateWebLabCandidatesV1(
  goalId: GuidedGoal["id"],
): readonly PersonalVisualHarmonyCandidateInputV1[] {
  return deterministicFixtureCandidates(requireGoal(goalId).id);
}

function parseDraftRequest(value: unknown): PrivateWebLabDraftRequestV1 {
  const input = requireExactRecord(value, [
    "browserSessionId",
    "goalId",
    "sourceImageContentIdentity",
    "sourceImageMediaType",
    "sourcePixelHeight",
    "sourcePixelWidth",
  ]);
  const browserSessionId = requireBrowserSessionId(input.browserSessionId);
  const sourceImageContentIdentity = requireSourceContentIdentity(
    input.sourceImageContentIdentity,
  );
  const sourceImageMediaType = requireImageMediaType(input.sourceImageMediaType);
  const sourcePixelWidth = requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  const sourcePixelHeight = requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const goalId = requireGoal(input.goalId).id;
  return {
    browserSessionId,
    sourceImageContentIdentity,
    sourceImageMediaType,
    sourcePixelWidth,
    sourcePixelHeight,
    goalId,
  };
}

function parseConfirmRequest(value: unknown): PrivateWebLabConfirmRequestV1 {
  const input = requireExactRecord(value, [
    "browserSessionId",
    "candidateSetIdentity",
    "explicitConfirmation",
    "labSessionId",
    "reviewedCandidates",
    "selectedCandidateIds",
    "sourceImageContentIdentity",
    "sourcePixelHeight",
    "sourcePixelWidth",
  ]);
  if (input.explicitConfirmation !== true) {
    throw new Error("Norma Core requires explicit confirmation.");
  }
  if (typeof input.labSessionId !== "string" || !LAB_SESSION_ID_PATTERN.test(input.labSessionId)) {
    throw new Error("Private Web Lab session identity is invalid.");
  }
  if (
    typeof input.candidateSetIdentity !== "string" ||
    !SOURCE_CONTENT_IDENTITY_PATTERN.test(input.candidateSetIdentity)
  ) {
    throw new Error("Private Web Lab candidate identity is invalid.");
  }
  if (!Array.isArray(input.selectedCandidateIds) || !Array.isArray(input.reviewedCandidates)) {
    throw new Error("Private Web Lab reviewed candidates and selection must be arrays.");
  }
  return {
    explicitConfirmation: true,
    browserSessionId: requireBrowserSessionId(input.browserSessionId),
    labSessionId: input.labSessionId,
    sourceImageContentIdentity: requireSourceContentIdentity(
      input.sourceImageContentIdentity,
    ),
    candidateSetIdentity: input.candidateSetIdentity,
    sourcePixelWidth: requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth"),
    sourcePixelHeight: requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight"),
    selectedCandidateIds: input.selectedCandidateIds as readonly string[],
    reviewedCandidates:
      input.reviewedCandidates as readonly PersonalVisualHarmonyCandidateInputV1[],
  };
}

function requireSessionBinding(
  session: PrivateWebLabSessionV1,
  input: PrivateWebLabConfirmRequestV1,
): void {
  if (session.browserSessionId !== input.browserSessionId) {
    throw new Error("Private Web Lab session belongs to a different browser session.");
  }
  if (session.sourceImageContentIdentity !== input.sourceImageContentIdentity) {
    throw new Error("Private Web Lab source image identity does not match this session.");
  }
  if (session.prepared.candidateSetIdentity !== input.candidateSetIdentity) {
    throw new Error("Private Web Lab candidate identity is stale or mismatched.");
  }
  if (
    session.sourcePixelWidth !== input.sourcePixelWidth ||
    session.sourcePixelHeight !== input.sourcePixelHeight
  ) {
    throw new Error("Private Web Lab source dimensions do not match this session.");
  }
}

function requireReviewedCandidateBinding(
  preparedCandidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  reviewedValue: readonly PersonalVisualHarmonyCandidateInputV1[],
): readonly PersonalVisualHarmonyCandidateInputV1[] {
  if (reviewedValue.length !== preparedCandidates.length) {
    throw new Error("Reviewed candidates must preserve the bounded draft candidate set.");
  }
  return reviewedValue.map((candidate, index) => {
    const prepared = preparedCandidates[index];
    if (
      !isRecord(candidate) ||
      prepared === undefined ||
      candidate.id !== prepared.id ||
      candidate.label !== prepared.label ||
      candidate.role !== prepared.role ||
      candidate.reason !== prepared.reason ||
      candidate.sourceImageReferenceIdentity !== undefined ||
      primitiveKind(candidate) !== primitiveKind(prepared)
    ) {
      throw new Error("Reviewed candidate metadata or primitive kind does not match the draft.");
    }
    return structuredClone(candidate);
  });
}

function requireSelectedCandidateIds(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  value: readonly string[],
): readonly string[] {
  if (
    value.length === 0 ||
    value.length > candidates.length ||
    value.some((candidateId) => typeof candidateId !== "string") ||
    new Set(value).size !== value.length
  ) {
    throw new Error("Private Web Lab selection must contain unique prepared candidate IDs.");
  }
  const knownIds = new Set(candidates.map(({ id }) => id));
  if (value.some((candidateId) => !knownIds.has(candidateId))) {
    throw new Error("Private Web Lab selection contains an unknown candidate.");
  }
  return candidates.filter(({ id }) => value.includes(id)).map(({ id }) => id);
}

function deterministicFixtureCandidates(
  goalId: GuidedGoal["id"],
): readonly PersonalVisualHarmonyCandidateInputV1[] {
  const candidates: readonly PersonalVisualHarmonyCandidateInputV1[] = [
    {
      id: "fixture-frame",
      label: "Cadre principal",
      role: "frame",
      reason: "Cadre déterministe de démonstration, à ajuster sur le contour visible.",
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.9,
      primitive: { kind: "rectangle" },
    },
    {
      id: "fixture-major-region",
      label: "Région principale",
      role: "structural-region",
      reason: "Région rectangulaire de démonstration, non inférée depuis l’image.",
      x: 0.05,
      y: 0.05,
      width: 0.5562,
      height: 0.9,
      primitive: { kind: "rectangle" },
    },
    {
      id: "fixture-vertical-axis",
      label: "Axe vertical",
      role: "structural-region",
      reason: "Axe déterministe de démonstration, candidat seulement.",
      x: 0.6062,
      y: 0.05,
      width: 0,
      height: 0.9,
      primitive: {
        kind: "axis",
        start: { x: 0.6062, y: 0.05 },
        end: { x: 0.6062, y: 0.95 },
      },
    },
    {
      id: "fixture-horizontal-guide",
      label: "Guide horizontal",
      role: "structural-region",
      reason: "Segment déterministe de démonstration, candidat seulement.",
      x: 0.05,
      y: 0.6062,
      width: 0.9,
      height: 0,
      primitive: {
        kind: "segment",
        start: { x: 0.05, y: 0.6062 },
        end: { x: 0.95, y: 0.6062 },
      },
    },
    {
      id: "fixture-diagonal",
      label: "Diagonale",
      role: "structural-region",
      reason: "Diagonale déterministe de démonstration, masquée après les guides prioritaires.",
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.9,
      primitive: {
        kind: "segment",
        start: { x: 0.05, y: 0.95 },
        end: { x: 0.95, y: 0.05 },
      },
    },
    {
      id: "fixture-ellipse",
      label: "Ellipse",
      role: "secondary-subject",
      reason: "Ellipse déterministe de démonstration, masquée après les guides prioritaires.",
      x: 0.6,
      y: 0.15,
      width: 0.24,
      height: 0.36,
      primitive: {
        kind: "ellipse",
        center: { x: 0.72, y: 0.33 },
        radiusX: 0.12,
        radiusY: 0.18,
      },
    },
  ];
  const priorityKinds = requireGoal(goalId).visibleKinds as readonly string[];
  return candidates
    .map((candidate, index) => ({
      candidate,
      index,
      goalPriority: priorityKinds.indexOf(primitiveKind(candidate)),
    }))
    .sort((first, second) => {
      const firstPriority = first.goalPriority < 0 ? 100 : first.goalPriority;
      const secondPriority = second.goalPriority < 0 ? 100 : second.goalPriority;
      return firstPriority - secondPriority || first.index - second.index;
    })
    .map(({ candidate }) => candidate);
}

function primitiveKind(candidate: PersonalVisualHarmonyCandidateInputV1): string {
  return candidate.primitive?.kind ?? "rectangle";
}

function requireGoal(value: unknown): GuidedGoal {
  const goal = PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.find(
    ({ id }) => id === value,
  );
  if (goal === undefined) throw new Error("Private Web Lab goal is unsupported.");
  return goal;
}

function requireExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new Error("Private Web Lab request must be a JSON object.");
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("Private Web Lab request fields are invalid.");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireBrowserSessionId(value: unknown): string {
  if (typeof value !== "string" || !BROWSER_SESSION_ID_PATTERN.test(value)) {
    throw new Error("Private Web Lab browser session identity is invalid.");
  }
  return value;
}

function requireSourceContentIdentity(value: unknown): string {
  if (typeof value !== "string" || !SOURCE_CONTENT_IDENTITY_PATTERN.test(value)) {
    throw new Error("Private Web Lab source image content identity is invalid.");
  }
  return value;
}

function requireImageMediaType(value: unknown): string {
  if (typeof value !== "string" || !IMAGE_MEDIA_TYPES.has(value)) {
    throw new Error("Private Web Lab source image media type is unsupported.");
  }
  return value;
}

function requirePixelDimension(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 32_768) {
    throw new Error(`${field} must be an integer from 1 to 32768.`);
  }
  return value as number;
}

function boundedPositiveInteger(value: number, field: string, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${field} must be a positive bounded integer.`);
  }
  return value;
}

function contentIdentityFor(value: unknown): string {
  return sha256Identity(serializeCanonicalJson(value));
}

function sha256Identity(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
