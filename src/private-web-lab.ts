import { createHash, randomUUID } from "node:crypto";

import {
  confirmPersonalVisualHarmonyCandidateSetV1,
  createPersonalVisualHarmonyOverlaySvgV1,
  PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE,
  PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS,
  preparePersonalVisualHarmonyManualCandidateSetV1,
  preparePersonalVisualHarmonyCandidateSetV1,
  type PersonalVisualHarmonyCandidateInputV1,
  type PersonalVisualHarmonyConfirmationV1,
  type PersonalVisualHarmonyManualConfirmationV1,
  type PersonalVisualHarmonyDeclaredMeasurementRatioReportV1,
  type PersonalVisualHarmonyMeasurementRatioRequestV1,
  type PersonalVisualHarmonyConfirmableCandidateSet,
  type PersonalVisualHarmonyPreparedCandidateSetV1,
} from "./personal-visual-harmony.js";
import {
  confirmDeclaredSpatialMeasurementPlanV1,
  type DeclaredSpatialMeasurementConfirmationV1,
  type DeclaredSpatialMeasurementPlanV1,
} from "./personal-visual-harmony-spatial-measurements.js";
import { serializeCanonicalJson } from "./serialization.js";
import { PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1 } from "./mcp/personal-visual-harmony-app.js";

export const PRIVATE_WEB_LAB_CONTRACT_ID = "norma.private-web-lab@1" as const;
export const PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID =
  "norma.private-web-lab-manual-draft@1" as const;
export const PRIVATE_WEB_LAB_MANUAL_RECEIPT_CONTRACT_ID =
  "norma.private-web-lab-manual-receipt@1" as const;
export const PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID =
  "norma.private-web-lab-receipt@1" as const;
export const PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RECEIPT_CONTRACT_ID =
  "norma.private-web-lab-declared-spatial-measurement-receipt@1" as const;
export const PRIVATE_WEB_LAB_CANONICAL_EXPORT_CONTRACT_ID =
  "norma.private-web-lab-canonical-result@1" as const;
export const PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID =
  "norma.private-web-lab-local-cv-provenance@1" as const;
export const PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_RECEIPT_CONTRACT_ID =
  "norma.private-web-lab-local-cv-provenance-receipt@1" as const;
export const PRIVATE_WEB_LAB_LOCAL_CV_COMPOSITE_EXPORT_CONTRACT_ID =
  "norma.private-web-lab-local-cv-composite-result@1" as const;
export const PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT = 4;

const PRIVATE_WEB_LAB_SESSION_TTL_MS = 30 * 60 * 1_000;
const PRIVATE_WEB_LAB_MAX_SESSIONS = 32;
const SOURCE_CONTENT_IDENTITY_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const BROWSER_SESSION_ID_PATTERN = /^[A-Za-z0-9:_-]{8,160}$/u;
const LAB_SESSION_ID_PATTERN = /^web-lab-session:[0-9a-f-]{36}$/u;
const MANUAL_CANDIDATE_ID_PATTERN = /^manual-(?:rectangle|segment)-[1-9][0-9]?$/u;
const IMAGE_MEDIA_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);
const LOCAL_CV_DETECTOR_CONTRACT_ID = "norma.private-web-lab.local-cv-candidates@1";
const LOCAL_CV_ALGORITHM_VERSION = "sobel-axis-runs-hough-v1";
const LOCAL_CV_MAX_SOURCE_PIXELS = 40_000_000;
const LOCAL_CV_MAX_WORKING_SIDE = 640;
const LOCAL_CV_MAX_WORKING_PIXELS = 409_600;
const LOCAL_CV_MAX_PROPOSALS = 8;
const LOCAL_CV_MIN_RECTANGLE_SIDE_COVERAGE = 0.42;
const LOCAL_CV_MIN_RECTANGLE_MEAN_COVERAGE = 0.62;
const LOCAL_CV_EVIDENCE_ROUNDING_TOLERANCE = 0.000_001;
const LOCAL_CV_ORIENTATION_TOLERANCE_DEGREES = 0.01;
const LOCAL_CV_HOUGH_POINT_DISTANCE_PIXELS = 1.6;

type GuidedGoal = typeof PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1[number];

export type PrivateWebLabManualCandidateInputV1 =
  | {
      readonly id: string;
      readonly kind: "rectangle";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly id: string;
      readonly kind: "segment";
      readonly start: { readonly x: number; readonly y: number };
      readonly end: { readonly x: number; readonly y: number };
    };

export interface PrivateWebLabManualDraftRequestV1 extends PrivateWebLabDraftRequestV1 {
  readonly candidates: readonly PrivateWebLabManualCandidateInputV1[];
  readonly localCvProvenanceManifest?: PrivateWebLabLocalCvProvenanceManifestV1;
}

type PrivateWebLabLocalCvGeometryV1 =
  | {
      readonly kind: "rectangle";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "segment";
      readonly start: { readonly x: number; readonly y: number };
      readonly end: { readonly x: number; readonly y: number };
    };

type PrivateWebLabLocalCvEvidenceV1 =
  | {
      readonly kind: "axis-aligned-edge-coverage";
      readonly sideCoverages: readonly [number, number, number, number];
      readonly meanCoverage: number;
    }
  | {
      readonly kind: "straight-edge-support";
      readonly supportCoverage: number;
      readonly orientationDegrees: number;
    };

export interface PrivateWebLabLocalCvProvenanceManifestV1 {
  readonly contractId: typeof PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID;
  readonly browserSessionId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly detector: {
    readonly contractId: typeof LOCAL_CV_DETECTOR_CONTRACT_ID;
    readonly algorithmVersion: typeof LOCAL_CV_ALGORITHM_VERSION;
  };
  readonly raster: {
    readonly contentIdentity: string;
    readonly width: number;
    readonly height: number;
  };
  readonly run: {
    readonly contentIdentity: string;
    readonly proposalIdentities: readonly string[];
  };
  readonly candidateOrderIds: readonly string[];
  readonly proposals: readonly {
    readonly candidateId: string;
    readonly candidateOrder: number;
    readonly originalProposalIdentity: string;
    readonly rank: number;
    readonly rankScore: number;
    readonly evidence: PrivateWebLabLocalCvEvidenceV1;
    readonly originalGeometry: PrivateWebLabLocalCvGeometryV1;
    readonly reviewedGeometry: PrivateWebLabLocalCvGeometryV1;
    readonly userEdited: boolean;
  }[];
}

export interface PrivateWebLabBoundLocalCvProvenanceManifestV1
  extends PrivateWebLabLocalCvProvenanceManifestV1 {
  readonly labSessionId: string;
  readonly draftCandidateSetIdentity: string;
  readonly acceptedCandidateSetIdentity: string;
}

export interface PrivateWebLabLocalCvProvenanceReceiptV1 {
  readonly contractId: typeof PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_RECEIPT_CONTRACT_ID;
  readonly manifest: PrivateWebLabBoundLocalCvProvenanceManifestV1;
  readonly manifestIdentity: string;
  readonly serverReceiptIdentity: string;
  readonly acceptedCandidateSetIdentity: string;
  readonly contentIdentity: string;
}

export interface PrivateWebLabManualDraftV1
  extends Omit<PrivateWebLabDraftV1, "contractId" | "draftKind"> {
  readonly contractId: typeof PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID;
  readonly draftKind: "manual_browser_no_provider";
  readonly perceptionReceiptIdentity: string;
  readonly coreCompatibilityCandidateSetIdentity: string;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly localCvProvenanceDraftIdentity?: string;
}

export interface PrivateWebLabDraftRequestV1 {
  readonly browserSessionId: string;
  readonly previousLabSessionId: string | null;
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
  readonly measurementCandidateIds: readonly [string, string] | null;
  readonly declaredSpatialMeasurementPlan?: DeclaredSpatialMeasurementPlanV1;
}

export interface PrivateWebLabManualConfirmRequestV1 extends PrivateWebLabConfirmRequestV1 {
  readonly perceptionReceiptIdentity: string;
  readonly localCvProvenanceDraftIdentity?: string;
  readonly localCvProvenanceManifest?: PrivateWebLabLocalCvProvenanceManifestV1;
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
  readonly canonicalGuideAnalysis: PrivateWebLabGuideAnalysisV1;
  readonly canonicalGuideAnalysisIdentity: string;
  readonly declaredMeasurementRatioReport?: PrivateWebLabDeclaredMeasurementRatioReportV1;
  readonly declaredMeasurementRatioReportIdentity?: string;
  readonly exportFileName: "norma-private-web-lab-result.json";
  readonly exportJson: string;
  readonly localCvProvenanceManifestIdentity?: string;
  readonly localCvProvenanceReceipt?: PrivateWebLabLocalCvProvenanceReceiptV1;
  readonly compositeExportIdentity?: string;
  readonly compositeExportJson?: string;
}

export interface PrivateWebLabManualReceiptV1
  extends Omit<PrivateWebLabReceiptV1, "contractId" | "draftKind"> {
  readonly contractId: typeof PRIVATE_WEB_LAB_MANUAL_RECEIPT_CONTRACT_ID;
  readonly draftKind: "manual_browser_no_provider";
  readonly perceptionReceiptIdentity: string;
  readonly coreCompatibilityCandidateSetIdentity: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly auditAcceptedGeometryContentIdentity: string;
  readonly sourceTruth: false;
}

export interface PrivateWebLabDeclaredSpatialMeasurementReceiptV1 {
  readonly contractId:
    typeof PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RECEIPT_CONTRACT_ID;
  readonly stage: "completed";
  readonly receiptIdentity: string;
  readonly draftKind: "deterministic_fixture_no_provider" | "manual_browser_no_provider";
  readonly providerCalls: 0;
  readonly coreRun: true;
  readonly explicitSelectionConfirmation: true;
  readonly sourceImageContentIdentity: string;
  readonly goalId: "compare-two-lengths";
  readonly draftCandidateSetIdentity: string;
  readonly acceptedCandidateSetIdentity: string;
  readonly selectedCandidateIds: readonly string[];
  readonly declaredSpatialMeasurementConfirmation: DeclaredSpatialMeasurementConfirmationV1;
  readonly declaredSpatialMeasurementConfirmationIdentity: string;
  readonly exportFileName: "norma-private-web-lab-result.json";
  readonly exportJson: string;
  readonly perceptionReceiptIdentity?: string;
  readonly coreCompatibilityCandidateSetIdentity?: string;
  readonly sourceTruth?: false;
  readonly localCvProvenanceManifestIdentity?: string;
  readonly localCvProvenanceReceipt?: PrivateWebLabLocalCvProvenanceReceiptV1;
  readonly compositeExportIdentity?: string;
  readonly compositeExportJson?: string;
}

export type PrivateWebLabGuideAnalysisV1 = Omit<
  PersonalVisualHarmonyConfirmationV1["imagePlaneGuideAnalysis"],
  "confirmationMode" | "contentIdentity" | "sourceImageDimensionsObservedBy"
> & {
  readonly sourceImageDimensionsObservedBy: "private_web_lab_browser";
  readonly confirmationMode: "client_asserted_private_web_lab_interaction";
  readonly contentIdentity: string;
};

export type PrivateWebLabDeclaredMeasurementRatioReportV1 = Omit<
  PersonalVisualHarmonyDeclaredMeasurementRatioReportV1,
  "contentIdentity" | "sourceImageReferenceIdentity"
> & {
  readonly sourceImageReferenceIdentity: string;
  readonly contentIdentity: string;
};

interface PrivateWebLabSessionV1 {
  readonly browserSessionId: string;
  readonly labSessionId: string;
  readonly sourceFileId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly goal: GuidedGoal;
  readonly prepared: PersonalVisualHarmonyConfirmableCandidateSet;
  readonly draftKind: "deterministic_fixture_no_provider" | "manual_browser_no_provider";
  readonly perceptionReceiptIdentity?: string;
  readonly localCvProvenance?: {
    readonly draftManifest: PrivateWebLabLocalCvProvenanceManifestV1;
    readonly draftIdentity: string;
  };
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  completed?: {
    readonly confirmationRequestIdentity: string;
    readonly receipt:
      | PrivateWebLabReceiptV1
      | PrivateWebLabManualReceiptV1
      | PrivateWebLabDeclaredSpatialMeasurementReceiptV1;
  };
}

type ConfirmationExecutor = typeof confirmPersonalVisualHarmonyCandidateSetV1;
type DeclaredSpatialMeasurementConfirmationExecutor =
  typeof confirmDeclaredSpatialMeasurementPlanV1;

export interface PrivateWebLabApplicationOptionsV1 {
  readonly now?: () => number;
  readonly createSessionId?: () => string;
  readonly executeConfirmation?: ConfirmationExecutor;
  readonly executeDeclaredSpatialMeasurementConfirmation?:
    DeclaredSpatialMeasurementConfirmationExecutor;
  readonly sessionTtlMs?: number;
  readonly maxSessions?: number;
}

export class PrivateWebLabApplicationV1 {
  private readonly sessions = new Map<string, PrivateWebLabSessionV1>();
  private readonly now: () => number;
  private readonly createSessionId: () => string;
  private readonly executeConfirmation: ConfirmationExecutor;
  private readonly executeDeclaredSpatialMeasurementConfirmation:
    DeclaredSpatialMeasurementConfirmationExecutor;
  private readonly sessionTtlMs: number;
  private readonly maxSessions: number;

  constructor(options: PrivateWebLabApplicationOptionsV1 = {}) {
    this.now = options.now ?? (() => Date.now());
    this.createSessionId =
      options.createSessionId ?? (() => `web-lab-session:${randomUUID()}`);
    this.executeConfirmation =
      options.executeConfirmation ?? confirmPersonalVisualHarmonyCandidateSetV1;
    this.executeDeclaredSpatialMeasurementConfirmation =
      options.executeDeclaredSpatialMeasurementConfirmation
      ?? confirmDeclaredSpatialMeasurementPlanV1;
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
    const previousSession = input.previousLabSessionId === null
      ? undefined
      : this.sessions.get(input.previousLabSessionId);
    if (
      previousSession !== undefined
      && previousSession.browserSessionId !== input.browserSessionId
    ) {
      throw new Error("Private Web Lab replacement session belongs to a different browser.");
    }
    if (this.sessions.size - (previousSession === undefined ? 0 : 1) >= this.maxSessions) {
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
      draftKind: "deterministic_fixture_no_provider",
      createdAtMs: now,
      expiresAtMs: now + this.sessionTtlMs,
    };
    if (previousSession !== undefined) this.sessions.delete(previousSession.labSessionId);
    this.sessions.set(labSessionId, session);
    const visibleCandidateIds = strongestGuideCandidateIds(prepared.candidates);
    const selectedCandidateIds = visibleCandidateIds;
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
      visibleCandidateIds,
      overlaySvg: createPersonalVisualHarmonyOverlaySvgV1({
        preparedCandidateSet: prepared,
        selectedCandidateIds,
      }),
    };
  }

  prepareManualDraft(value: unknown): PrivateWebLabManualDraftV1 {
    const input = parseManualDraftRequest(value);
    const now = this.now();
    this.pruneExpired(now);
    const previousSession = input.previousLabSessionId === null
      ? undefined
      : this.sessions.get(input.previousLabSessionId);
    if (
      previousSession !== undefined
      && previousSession.browserSessionId !== input.browserSessionId
    ) {
      throw new Error("Private Web Lab replacement session belongs to a different browser.");
    }
    if (this.sessions.size - (previousSession === undefined ? 0 : 1) >= this.maxSessions) {
      throw new Error("Private Web Lab session capacity is exhausted.");
    }
    const goal = requireGoal(input.goalId);
    const candidates = canonicalManualCandidates(input.candidates);
    requireGoalCompatibleManualCandidates(goal.id, candidates);
    if (input.localCvProvenanceManifest !== undefined) {
      requireLocalCvManifestBinding(input.localCvProvenanceManifest, input, candidates);
    }
    const perceptionReceiptIdentity = contentIdentityFor({
      contractId: PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      goalId: goal.id,
      candidates,
    });
    const prepared = preparePersonalVisualHarmonyManualCandidateSetV1({
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      sourceImageMediaType: input.sourceImageMediaType,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      perceptionReceiptIdentity,
      candidates,
    });
    const labSessionId = this.createSessionId();
    if (!LAB_SESSION_ID_PATTERN.test(labSessionId) || this.sessions.has(labSessionId)) {
      throw new Error("Could not create a unique bounded Private Web Lab session.");
    }
    const localCvProvenance = input.localCvProvenanceManifest === undefined
      ? undefined
      : {
          draftManifest: input.localCvProvenanceManifest,
          draftIdentity: contentIdentityFor({
            manifest: input.localCvProvenanceManifest,
            labSessionId,
            draftCandidateSetIdentity: prepared.candidateSetIdentity,
          }),
        };
    const session: PrivateWebLabSessionV1 = {
      browserSessionId: input.browserSessionId,
      labSessionId,
      sourceFileId: `web-lab:${input.sourceImageContentIdentity.slice("sha256:".length)}`,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      sourceImageMediaType: input.sourceImageMediaType,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      goal,
      prepared,
      draftKind: "manual_browser_no_provider",
      perceptionReceiptIdentity,
      ...(localCvProvenance === undefined ? {} : { localCvProvenance }),
      createdAtMs: now,
      expiresAtMs: now + this.sessionTtlMs,
    };
    if (previousSession !== undefined) this.sessions.delete(previousSession.labSessionId);
    this.sessions.set(labSessionId, session);
    return {
      contractId: PRIVATE_WEB_LAB_MANUAL_DRAFT_CONTRACT_ID,
      stage: "confirmation_required",
      draftKind: "manual_browser_no_provider",
      providerCalls: 0,
      coreRun: false,
      labSessionId,
      sourceFileId: session.sourceFileId,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      sourceImageMediaType: input.sourceImageMediaType,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      goal,
      candidateSetIdentity: prepared.candidateSetIdentity,
      candidates: prepared.candidates,
      selectedCandidateIds: [],
      strongestGuideCount: PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT,
      visibleCandidateIds: prepared.candidates.map(({ id }) => id),
      overlaySvg: createPersonalVisualHarmonyOverlaySvgV1({
        preparedCandidateSet: prepared,
        selectedCandidateIds: [],
      }),
      perceptionReceiptIdentity,
      coreCompatibilityCandidateSetIdentity:
        prepared.coreCompatibilityCandidateSetIdentity,
      candidateEvidenceOnly: true,
      sourceTruth: false,
      ...(localCvProvenance === undefined
        ? {}
        : { localCvProvenanceDraftIdentity: localCvProvenance.draftIdentity }),
    };
  }

  confirm(
    value: unknown,
  ): PrivateWebLabReceiptV1 | PrivateWebLabDeclaredSpatialMeasurementReceiptV1 {
    const input = parseConfirmRequest(value);
    return this.confirmPrepared(input, "deterministic_fixture_no_provider") as PrivateWebLabReceiptV1;
  }

  confirmManual(
    value: unknown,
  ): PrivateWebLabManualReceiptV1 | PrivateWebLabDeclaredSpatialMeasurementReceiptV1 {
    const input = parseManualConfirmRequest(value);
    return this.confirmPrepared(input, "manual_browser_no_provider") as PrivateWebLabManualReceiptV1;
  }

  startNewMeasurement(value: unknown): {
    readonly status: "authoring_local";
    readonly coreRun: false;
    readonly providerCalls: 0;
  } {
    const input = requireExactRecord(value, [
      "browserSessionId",
      "expectedSessionState",
      "labSessionId",
    ]);
    const browserSessionId = requireBrowserSessionId(input.browserSessionId);
    const labSessionId = requireOptionalLabSessionId(input.labSessionId);
    const expectedSessionState = input.expectedSessionState;
    if (expectedSessionState !== "review" && expectedSessionState !== "completed") {
      throw new Error("Private Web Lab expected session state is invalid.");
    }
    if (labSessionId === null) {
      throw new Error("Private Web Lab session identity is required.");
    }
    const session = this.sessions.get(labSessionId);
    if (session === undefined || session.browserSessionId !== browserSessionId) {
      throw new Error("Private Web Lab session is missing or belongs to another browser.");
    }
    if (expectedSessionState === "review" && session.completed !== undefined) {
      throw new Error(
        "Private Web Lab session already completed Core; recover its receipt before starting over.",
      );
    }
    if (expectedSessionState === "completed" && session.completed === undefined) {
      throw new Error("Private Web Lab session has not completed Core.");
    }
    this.sessions.delete(labSessionId);
    return { status: "authoring_local", coreRun: false, providerCalls: 0 };
  }

  private confirmPrepared(
    input: PrivateWebLabConfirmRequestV1 | PrivateWebLabManualConfirmRequestV1,
    expectedDraftKind: PrivateWebLabSessionV1["draftKind"],
  ):
    | PrivateWebLabReceiptV1
    | PrivateWebLabManualReceiptV1
    | PrivateWebLabDeclaredSpatialMeasurementReceiptV1 {
    const now = this.now();
    this.pruneExpired(now);
    const session = this.sessions.get(input.labSessionId);
    if (session === undefined) {
      throw new Error("Private Web Lab session is missing or expired.");
    }
    if (session.draftKind !== expectedDraftKind) {
      throw new Error("Private Web Lab draft contract does not match this session.");
    }
    if (
      session.draftKind === "manual_browser_no_provider"
      && (
        !("perceptionReceiptIdentity" in input)
        || input.perceptionReceiptIdentity !== session.perceptionReceiptIdentity
      )
    ) {
      throw new Error("Private Web Lab manual provenance is stale or mismatched.");
    }
    requireSessionBinding(session, input);

    const reviewedCandidates = requireReviewedCandidateBinding(
      session.prepared.candidates,
      input.reviewedCandidates,
    );
    const reviewedPrepared = session.draftKind === "manual_browser_no_provider"
      ? preparePersonalVisualHarmonyManualCandidateSetV1({
          sourceImageContentIdentity: session.sourceImageContentIdentity,
          sourceImageMediaType: session.sourceImageMediaType,
          sourcePixelWidth: session.sourcePixelWidth,
          sourcePixelHeight: session.sourcePixelHeight,
          perceptionReceiptIdentity: session.perceptionReceiptIdentity as string,
          candidates: reviewedCandidates,
        })
      : preparePersonalVisualHarmonyCandidateSetV1({
          sourceFileId: session.sourceFileId,
          sourceImageMediaType: session.sourceImageMediaType,
          expectedSourceImageReferenceIdentity: session.prepared.sourceImageReferenceIdentity,
          candidates: reviewedCandidates,
        });
    const localCvProvenance = requireConfirmedLocalCvProvenance(
      session,
      input,
      reviewedCandidates,
      reviewedPrepared.candidateSetIdentity,
    );
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
    if (input.declaredSpatialMeasurementPlan !== undefined) {
      if (session.goal.id !== "compare-two-lengths") {
        throw new Error("This Private Web Lab goal does not accept a spatial measurement plan.");
      }
      if (input.measurementCandidateIds !== null) {
        throw new Error("A spatial measurement plan cannot be combined with the legacy length selection.");
      }
      if (selectedCoreCandidateIds.length !== selectedCandidateIds.length) {
        throw new Error("Declared spatial measurements accept selected rectangles only.");
      }
    }
    const measurementRatioRequest = createPrivateWebLabMeasurementRatioRequest(
      session.goal.id,
      reviewedPrepared.candidates,
      confirmedVisualGuideCandidateIds,
      input.measurementCandidateIds,
      input.declaredSpatialMeasurementPlan !== undefined,
    );

    const confirmationRequestIdentity = contentIdentityFor({
      browserSessionId: input.browserSessionId,
      labSessionId: input.labSessionId,
      sourceImageContentIdentity: input.sourceImageContentIdentity,
      draftCandidateSetIdentity: input.candidateSetIdentity,
      acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      selectedCandidateIds,
      measurementCandidateIds: input.measurementCandidateIds,
      ...(input.declaredSpatialMeasurementPlan === undefined
        ? {}
        : { declaredSpatialMeasurementPlan: input.declaredSpatialMeasurementPlan }),
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      ...(session.perceptionReceiptIdentity === undefined
        ? {}
        : { perceptionReceiptIdentity: session.perceptionReceiptIdentity }),
      ...(localCvProvenance === undefined
        ? {}
        : { localCvProvenanceManifestIdentity: localCvProvenance.manifestIdentity }),
    });
    if (session.completed !== undefined) {
      if (session.completed.confirmationRequestIdentity !== confirmationRequestIdentity) {
        throw new Error("This Private Web Lab session was already confirmed with different geometry.");
      }
      return session.completed.receipt;
    }

    if (input.declaredSpatialMeasurementPlan !== undefined) {
      const declaredSpatialMeasurementConfirmation =
        this.executeDeclaredSpatialMeasurementConfirmation({
          plan: input.declaredSpatialMeasurementPlan,
          sourceIdentity: session.sourceImageContentIdentity,
          sourcePixelWidth: input.sourcePixelWidth,
          sourcePixelHeight: input.sourcePixelHeight,
          candidates: reviewedPrepared.candidates,
          selectedRectangleCandidateIds: selectedCoreCandidateIds,
        });
      const canonicalExport = {
        contractId: PRIVATE_WEB_LAB_CANONICAL_EXPORT_CONTRACT_ID,
        sourceImageContentIdentity: session.sourceImageContentIdentity,
        acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
        selectedCandidateIds: selectedCoreCandidateIds,
        declaredSpatialMeasurementConfirmation,
        ...(localCvProvenance === undefined
          ? {}
          : { localCvProvenanceManifestIdentity: localCvProvenance.manifestIdentity }),
      };
      const exportJson = `${serializeCanonicalJson(canonicalExport)}\n`;
      const receiptPayload = {
        contractId: PRIVATE_WEB_LAB_DECLARED_SPATIAL_MEASUREMENT_RECEIPT_CONTRACT_ID,
        stage: "completed" as const,
        draftKind: session.draftKind,
        providerCalls: 0 as const,
        coreRun: true as const,
        explicitSelectionConfirmation: true as const,
        sourceImageContentIdentity: session.sourceImageContentIdentity,
        goalId: "compare-two-lengths" as const,
        draftCandidateSetIdentity: session.prepared.candidateSetIdentity,
        acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
        selectedCandidateIds: selectedCoreCandidateIds,
        declaredSpatialMeasurementConfirmation,
        declaredSpatialMeasurementConfirmationIdentity:
          declaredSpatialMeasurementConfirmation.confirmationIdentity,
        exportFileName: "norma-private-web-lab-result.json" as const,
        exportJson,
        ...(localCvProvenance === undefined
          ? {}
          : { localCvProvenanceManifestIdentity: localCvProvenance.manifestIdentity }),
        ...(session.perceptionReceiptIdentity === undefined
          ? {}
          : {
              perceptionReceiptIdentity: session.perceptionReceiptIdentity,
              ...("coreCompatibilityCandidateSetIdentity" in reviewedPrepared
                ? {
                    coreCompatibilityCandidateSetIdentity:
                      reviewedPrepared.coreCompatibilityCandidateSetIdentity,
                  }
                : {}),
              sourceTruth: false as const,
            }),
      };
      const receipt = createReceiptWithOptionalLocalCvProvenance(
        receiptPayload,
        canonicalExport,
        localCvProvenance,
      ) as unknown as PrivateWebLabDeclaredSpatialMeasurementReceiptV1;
      session.completed = { confirmationRequestIdentity, receipt };
      return receipt;
    }

    const confirmation = this.executeConfirmation({
      preparedCandidateSet: reviewedPrepared,
      expectedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      selectedCandidateIds: selectedCoreCandidateIds,
      confirmedVisualGuideCandidateIds,
      ...(measurementRatioRequest === undefined ? {} : { measurementRatioRequest }),
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      acceptedAt: new Date(now).toISOString(),
    });
    const canonicalCoreResult = confirmation.result.harmonicAnalysis;
    let coreCompatibilityCandidateSetIdentity: string | undefined;
    let auditAcceptedGeometryContentIdentity: string | undefined;
    if (session.draftKind === "manual_browser_no_provider") {
      if (!("coreCompatibilityCandidateSetIdentity" in reviewedPrepared)) {
        throw new Error("Private Web Lab manual Core compatibility identity is missing.");
      }
      if (!("auditAcceptedGeometryContentIdentity" in confirmation)) {
        throw new Error("Private Web Lab manual audit geometry identity is missing.");
      }
      coreCompatibilityCandidateSetIdentity =
        reviewedPrepared.coreCompatibilityCandidateSetIdentity;
      auditAcceptedGeometryContentIdentity =
        confirmation.auditAcceptedGeometryContentIdentity;
    }
    const canonicalGuideAnalysis = createPrivateWebLabGuideAnalysis(
      confirmation.imagePlaneGuideAnalysis,
      session.sourceImageContentIdentity,
    );
    const declaredMeasurementRatioReport =
      confirmation.declaredMeasurementRatioReport === undefined
        ? undefined
        : createPrivateWebLabDeclaredMeasurementRatioReport(
            confirmation.declaredMeasurementRatioReport,
            session.sourceImageContentIdentity,
          );
    const canonicalExport = {
      contractId: PRIVATE_WEB_LAB_CANONICAL_EXPORT_CONTRACT_ID,
      sourceImageContentIdentity: session.sourceImageContentIdentity,
      acceptedCandidateSetIdentity: reviewedPrepared.candidateSetIdentity,
      ...(coreCompatibilityCandidateSetIdentity === undefined
        ? {}
        : {
            coreCompatibilityCandidateSetIdentity,
            acceptedGeometryContentIdentity: confirmation.acceptedGeometryContentIdentity,
            auditAcceptedGeometryContentIdentity:
              auditAcceptedGeometryContentIdentity as string,
          }),
      selectedCandidateIds,
      ratioPackRefs: canonicalCoreResult.ratioPackRefs,
      canonicalCoreResult,
      canonicalGuideAnalysis,
      ...(declaredMeasurementRatioReport === undefined
        ? {}
        : { declaredMeasurementRatioReport }),
      ...(localCvProvenance === undefined
        ? {}
        : { localCvProvenanceManifestIdentity: localCvProvenance.manifestIdentity }),
    };
    const exportJson = `${serializeCanonicalJson(canonicalExport)}\n`;
    const commonReceiptPayload = {
      stage: "completed",
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
      canonicalGuideAnalysis,
      canonicalGuideAnalysisIdentity: canonicalGuideAnalysis.contentIdentity,
      ...(declaredMeasurementRatioReport === undefined
        ? {}
        : {
            declaredMeasurementRatioReport,
            declaredMeasurementRatioReportIdentity:
              declaredMeasurementRatioReport.contentIdentity,
          }),
      exportFileName: "norma-private-web-lab-result.json",
      exportJson,
      ...(localCvProvenance === undefined
        ? {}
        : { localCvProvenanceManifestIdentity: localCvProvenance.manifestIdentity }),
    };
    const receiptPayload = session.draftKind === "manual_browser_no_provider"
      ? {
          ...commonReceiptPayload,
          contractId: PRIVATE_WEB_LAB_MANUAL_RECEIPT_CONTRACT_ID,
          draftKind: "manual_browser_no_provider" as const,
          perceptionReceiptIdentity: session.perceptionReceiptIdentity as string,
          coreCompatibilityCandidateSetIdentity:
            coreCompatibilityCandidateSetIdentity as string,
          acceptedGeometryContentIdentity: confirmation.acceptedGeometryContentIdentity,
          auditAcceptedGeometryContentIdentity:
            auditAcceptedGeometryContentIdentity as string,
          sourceTruth: false as const,
        }
      : {
          ...commonReceiptPayload,
          contractId: PRIVATE_WEB_LAB_RECEIPT_CONTRACT_ID,
          draftKind: "deterministic_fixture_no_provider" as const,
        };
    const receipt = createReceiptWithOptionalLocalCvProvenance(
      receiptPayload,
      canonicalExport,
      localCvProvenance,
    ) as unknown as PrivateWebLabReceiptV1 | PrivateWebLabManualReceiptV1;
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
    "previousLabSessionId",
    "sourceImageContentIdentity",
    "sourceImageMediaType",
    "sourcePixelHeight",
    "sourcePixelWidth",
  ]);
  const browserSessionId = requireBrowserSessionId(input.browserSessionId);
  const previousLabSessionId = requireOptionalLabSessionId(input.previousLabSessionId);
  const sourceImageContentIdentity = requireSourceContentIdentity(
    input.sourceImageContentIdentity,
  );
  const sourceImageMediaType = requireImageMediaType(input.sourceImageMediaType);
  const sourcePixelWidth = requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  const sourcePixelHeight = requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const goalId = requireGoal(input.goalId).id;
  return {
    browserSessionId,
    previousLabSessionId,
    sourceImageContentIdentity,
    sourceImageMediaType,
    sourcePixelWidth,
    sourcePixelHeight,
    goalId,
  };
}

function parseManualDraftRequest(value: unknown): PrivateWebLabManualDraftRequestV1 {
  const hasLocalCvProvenanceManifest = isRecord(value)
    && Object.hasOwn(value, "localCvProvenanceManifest");
  const input = requireExactRecord(value, [
    "browserSessionId",
    "candidates",
    "goalId",
    "previousLabSessionId",
    "sourceImageContentIdentity",
    "sourceImageMediaType",
    "sourcePixelHeight",
    "sourcePixelWidth",
    ...(hasLocalCvProvenanceManifest ? ["localCvProvenanceManifest"] : []),
  ]);
  if (!Array.isArray(input.candidates)) {
    throw new Error("Private Web Lab manual candidates must be an array.");
  }
  const common = parseDraftRequest({
    browserSessionId: input.browserSessionId,
    goalId: input.goalId,
    previousLabSessionId: input.previousLabSessionId,
    sourceImageContentIdentity: input.sourceImageContentIdentity,
    sourceImageMediaType: input.sourceImageMediaType,
    sourcePixelHeight: input.sourcePixelHeight,
    sourcePixelWidth: input.sourcePixelWidth,
  });
  return {
    ...common,
    candidates: input.candidates as readonly PrivateWebLabManualCandidateInputV1[],
    ...(hasLocalCvProvenanceManifest
      ? {
          localCvProvenanceManifest: parseLocalCvProvenanceManifest(
            input.localCvProvenanceManifest,
          ),
        }
      : {}),
  };
}

function parseConfirmRequest(value: unknown): PrivateWebLabConfirmRequestV1 {
  const hasDeclaredSpatialMeasurementPlan = isRecord(value)
    && Object.hasOwn(value, "declaredSpatialMeasurementPlan");
  const input = requireExactRecord(value, [
    "browserSessionId",
    "candidateSetIdentity",
    "explicitConfirmation",
    "labSessionId",
    "measurementCandidateIds",
    "reviewedCandidates",
    "selectedCandidateIds",
    "sourceImageContentIdentity",
    "sourcePixelHeight",
    "sourcePixelWidth",
    ...(hasDeclaredSpatialMeasurementPlan ? ["declaredSpatialMeasurementPlan"] : []),
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
  if (
    input.measurementCandidateIds !== null
    && !Array.isArray(input.measurementCandidateIds)
  ) {
    throw new Error("Private Web Lab measurement selection must be an array or null.");
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
    measurementCandidateIds:
      input.measurementCandidateIds as readonly [string, string] | null,
    ...(hasDeclaredSpatialMeasurementPlan
      ? {
          declaredSpatialMeasurementPlan:
            input.declaredSpatialMeasurementPlan as DeclaredSpatialMeasurementPlanV1,
        }
      : {}),
  };
}

function parseManualConfirmRequest(value: unknown): PrivateWebLabManualConfirmRequestV1 {
  const hasDeclaredSpatialMeasurementPlan = isRecord(value)
    && Object.hasOwn(value, "declaredSpatialMeasurementPlan");
  const hasLocalCvProvenanceDraftIdentity = isRecord(value)
    && Object.hasOwn(value, "localCvProvenanceDraftIdentity");
  const hasLocalCvProvenanceManifest = isRecord(value)
    && Object.hasOwn(value, "localCvProvenanceManifest");
  const input = requireExactRecord(value, [
    "browserSessionId",
    "candidateSetIdentity",
    "explicitConfirmation",
    "labSessionId",
    "measurementCandidateIds",
    "perceptionReceiptIdentity",
    "reviewedCandidates",
    "selectedCandidateIds",
    "sourceImageContentIdentity",
    "sourcePixelHeight",
    "sourcePixelWidth",
    ...(hasDeclaredSpatialMeasurementPlan ? ["declaredSpatialMeasurementPlan"] : []),
    ...(hasLocalCvProvenanceDraftIdentity ? ["localCvProvenanceDraftIdentity"] : []),
    ...(hasLocalCvProvenanceManifest ? ["localCvProvenanceManifest"] : []),
  ]);
  const common = parseConfirmRequest({
    browserSessionId: input.browserSessionId,
    candidateSetIdentity: input.candidateSetIdentity,
    explicitConfirmation: input.explicitConfirmation,
    labSessionId: input.labSessionId,
    measurementCandidateIds: input.measurementCandidateIds,
    reviewedCandidates: input.reviewedCandidates,
    selectedCandidateIds: input.selectedCandidateIds,
    sourceImageContentIdentity: input.sourceImageContentIdentity,
    sourcePixelHeight: input.sourcePixelHeight,
    sourcePixelWidth: input.sourcePixelWidth,
    ...(hasDeclaredSpatialMeasurementPlan
      ? { declaredSpatialMeasurementPlan: input.declaredSpatialMeasurementPlan }
      : {}),
  });
  return {
    ...common,
    perceptionReceiptIdentity: requireSourceContentIdentity(
      input.perceptionReceiptIdentity,
    ),
    ...(hasLocalCvProvenanceDraftIdentity
      ? {
          localCvProvenanceDraftIdentity: requireSourceContentIdentity(
            input.localCvProvenanceDraftIdentity,
          ),
        }
      : {}),
    ...(hasLocalCvProvenanceManifest
      ? {
          localCvProvenanceManifest: parseLocalCvProvenanceManifest(
            input.localCvProvenanceManifest,
          ),
        }
      : {}),
  };
}

function parseLocalCvProvenanceManifest(
  value: unknown,
): PrivateWebLabLocalCvProvenanceManifestV1 {
  const input = requireExactRecord(value, [
    "browserSessionId",
    "candidateOrderIds",
    "contractId",
    "detector",
    "proposals",
    "raster",
    "run",
    "sourceImageContentIdentity",
    "sourcePixelHeight",
    "sourcePixelWidth",
  ]);
  if (input.contractId !== PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID) {
    throw new Error("Private Web Lab local CV provenance contract is invalid.");
  }
  const detector = requireExactRecord(input.detector, ["algorithmVersion", "contractId"]);
  if (
    detector.contractId !== LOCAL_CV_DETECTOR_CONTRACT_ID
    || detector.algorithmVersion !== LOCAL_CV_ALGORITHM_VERSION
  ) {
    throw new Error("Private Web Lab local CV provenance detector is invalid.");
  }
  const sourcePixelWidth = requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  const sourcePixelHeight = requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  if (sourcePixelWidth * sourcePixelHeight > LOCAL_CV_MAX_SOURCE_PIXELS) {
    throw new Error("Private Web Lab local CV provenance source exceeds the bounded proof.");
  }
  const raster = requireExactRecord(input.raster, ["contentIdentity", "height", "width"]);
  const rasterWidth = requireLocalCvPositiveInteger(raster.width, "raster width");
  const rasterHeight = requireLocalCvPositiveInteger(raster.height, "raster height");
  if (
    rasterWidth > LOCAL_CV_MAX_WORKING_SIDE
    || rasterHeight > LOCAL_CV_MAX_WORKING_SIDE
    || rasterWidth * rasterHeight > LOCAL_CV_MAX_WORKING_PIXELS
  ) {
    throw new Error("Private Web Lab local CV provenance raster exceeds the bounded proof.");
  }
  const expectedRaster = localCvWorkingRasterDimensions(sourcePixelWidth, sourcePixelHeight);
  if (rasterWidth !== expectedRaster.width || rasterHeight !== expectedRaster.height) {
    throw new Error(
      "Private Web Lab local CV provenance raster dimensions do not match the source.",
    );
  }
  const run = requireExactRecord(input.run, ["contentIdentity", "proposalIdentities"]);
  if (
    !Array.isArray(run.proposalIdentities)
    || run.proposalIdentities.length < 1
    || run.proposalIdentities.length > LOCAL_CV_MAX_PROPOSALS
  ) {
    throw new Error("Private Web Lab local CV provenance run proposal list is invalid.");
  }
  const proposalIdentities = run.proposalIdentities.map((identity) => (
    requireLocalCvIdentity(identity, "run proposal")
  ));
  if (new Set(proposalIdentities).size !== proposalIdentities.length) {
    throw new Error("Private Web Lab local CV provenance run proposals must be unique.");
  }
  const candidateOrderIdsInput = input.candidateOrderIds;
  if (
    !Array.isArray(candidateOrderIdsInput)
    || candidateOrderIdsInput.length < 1
    || candidateOrderIdsInput.length > 12
    || candidateOrderIdsInput.some((id) => (
      typeof id !== "string" || !MANUAL_CANDIDATE_ID_PATTERN.test(id)
    ))
    || new Set(candidateOrderIdsInput).size !== candidateOrderIdsInput.length
  ) {
    throw new Error("Private Web Lab local CV provenance candidate order is invalid.");
  }
  if (
    !Array.isArray(input.proposals)
    || input.proposals.length < 1
    || input.proposals.length > LOCAL_CV_MAX_PROPOSALS
  ) {
    throw new Error("Private Web Lab local CV provenance proposals are invalid.");
  }
  const proposals = input.proposals.map((value) => {
    const proposal = requireExactRecord(value, [
      "candidateId",
      "candidateOrder",
      "evidence",
      "originalGeometry",
      "originalProposalIdentity",
      "rank",
      "rankScore",
      "reviewedGeometry",
      "userEdited",
    ]);
    if (
      typeof proposal.candidateId !== "string"
      || !MANUAL_CANDIDATE_ID_PATTERN.test(proposal.candidateId)
      || !Number.isSafeInteger(proposal.candidateOrder)
      || (proposal.candidateOrder as number) < 0
      || (proposal.candidateOrder as number) >= candidateOrderIdsInput.length
      || !Number.isSafeInteger(proposal.rank)
      || (proposal.rank as number) < 1
      || (proposal.rank as number) > LOCAL_CV_MAX_PROPOSALS
      || typeof proposal.userEdited !== "boolean"
    ) {
      throw new Error("Private Web Lab local CV provenance proposal binding is invalid.");
    }
    const candidateOrder = proposal.candidateOrder as number;
    const rank = proposal.rank as number;
    const evidence = parseLocalCvEvidence(proposal.evidence);
    const originalGeometry = parseLocalCvGeometry(proposal.originalGeometry);
    const reviewedGeometry = parseLocalCvGeometry(proposal.reviewedGeometry);
    if (
      originalGeometry.kind !== reviewedGeometry.kind
      || (
        originalGeometry.kind === "rectangle"
        ? evidence.kind !== "axis-aligned-edge-coverage"
        : evidence.kind !== "straight-edge-support"
      )
    ) {
      throw new Error("Private Web Lab local CV provenance evidence does not match geometry.");
    }
    return {
      candidateId: proposal.candidateId,
      candidateOrder,
      originalProposalIdentity: requireLocalCvIdentity(
        proposal.originalProposalIdentity,
        "original proposal",
      ),
      rank,
      rankScore: requireNormalizedNumber(proposal.rankScore, "local CV rank score"),
      evidence,
      originalGeometry,
      reviewedGeometry,
      userEdited: proposal.userEdited,
    };
  });
  if (
    new Set(proposals.map(({ candidateId }) => candidateId)).size !== proposals.length
    || proposals.some((proposal, index) => (
      index > 0 && proposal.candidateOrder <= (proposals[index - 1]?.candidateOrder ?? -1)
    ))
  ) {
    throw new Error("Private Web Lab local CV provenance proposals must preserve order.");
  }
  if (
    new Set(proposals.map(({ originalProposalIdentity }) => originalProposalIdentity)).size
      !== proposals.length
    || new Set(proposals.map(({ rank }) => rank)).size !== proposals.length
  ) {
    throw new Error(
      "Private Web Lab local CV provenance proposals must have unique identities and ranks.",
    );
  }
  if (proposals.some(({ evidence, originalGeometry, rankScore }) => (
    !localCvEvidenceValuesMatchGeometry(
      evidence,
      originalGeometry,
      rankScore,
      rasterWidth,
      rasterHeight,
    )
  ))) {
    throw new Error(
      "Private Web Lab local CV provenance evidence values contradict geometry.",
    );
  }
  const proposalsByRank = [...proposals].sort((first, second) => first.rank - second.rank);
  if (proposalsByRank.some((proposal, index) => (
    index > 0
    && proposal.rankScore
      > (proposalsByRank[index - 1]?.rankScore ?? 0)
        + LOCAL_CV_EVIDENCE_ROUNDING_TOLERANCE
  ))) {
    throw new Error("Private Web Lab local CV provenance rank order is invalid.");
  }
  return {
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_MANIFEST_CONTRACT_ID,
    browserSessionId: requireBrowserSessionId(input.browserSessionId),
    sourceImageContentIdentity: requireLocalCvIdentity(
      input.sourceImageContentIdentity,
      "source image",
    ),
    sourcePixelWidth,
    sourcePixelHeight,
    detector: {
      contractId: LOCAL_CV_DETECTOR_CONTRACT_ID,
      algorithmVersion: LOCAL_CV_ALGORITHM_VERSION,
    },
    raster: {
      contentIdentity: requireLocalCvIdentity(raster.contentIdentity, "raster"),
      width: rasterWidth,
      height: rasterHeight,
    },
    run: {
      contentIdentity: requireLocalCvIdentity(run.contentIdentity, "run"),
      proposalIdentities,
    },
    candidateOrderIds: candidateOrderIdsInput as readonly string[],
    proposals,
  };
}

function localCvWorkingRasterDimensions(
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): { readonly width: number; readonly height: number } {
  const scale = Math.min(
    1,
    LOCAL_CV_MAX_WORKING_SIDE / sourcePixelWidth,
    LOCAL_CV_MAX_WORKING_SIDE / sourcePixelHeight,
    Math.sqrt(LOCAL_CV_MAX_WORKING_PIXELS / (sourcePixelWidth * sourcePixelHeight)),
  );
  return {
    width: Math.max(3, Math.round(sourcePixelWidth * scale)),
    height: Math.max(3, Math.round(sourcePixelHeight * scale)),
  };
}

function localCvEvidenceValuesMatchGeometry(
  evidence: PrivateWebLabLocalCvEvidenceV1,
  geometry: PrivateWebLabLocalCvGeometryV1,
  rankScore: number,
  rasterWidth: number,
  rasterHeight: number,
): boolean {
  if (evidence.kind === "axis-aligned-edge-coverage") {
    if (
      geometry.kind !== "rectangle"
      || Math.min(...evidence.sideCoverages) < LOCAL_CV_MIN_RECTANGLE_SIDE_COVERAGE
      || evidence.meanCoverage < LOCAL_CV_MIN_RECTANGLE_MEAN_COVERAGE
    ) {
      return false;
    }
    const expectedMeanCoverage = Number((
      evidence.sideCoverages.reduce((sum, coverage) => sum + coverage, 0)
      / evidence.sideCoverages.length
    ).toFixed(6));
    if (
      Math.abs(evidence.meanCoverage - expectedMeanCoverage)
      > LOCAL_CV_EVIDENCE_ROUNDING_TOLERANCE
    ) {
      return false;
    }
    const sizeFraction = (
      geometry.width * (rasterWidth - 1)
      * geometry.height * (rasterHeight - 1)
    ) / (rasterWidth * rasterHeight);
    const expectedRankScore = Number(Math.min(
      1,
      (evidence.meanCoverage * 0.82) + (sizeFraction * 0.18),
    ).toFixed(6));
    return Math.abs(rankScore - expectedRankScore)
      <= LOCAL_CV_EVIDENCE_ROUNDING_TOLERANCE * 2;
  }
  if (geometry.kind !== "segment") return false;
  const deltaX = (geometry.end.x - geometry.start.x) * (rasterWidth - 1);
  const deltaY = (geometry.end.y - geometry.start.y) * (rasterHeight - 1);
  const expectedOrientation = Number((
    (Math.atan2(deltaY, deltaX) * 180 / Math.PI + 180) % 180
  ).toFixed(6));
  const directDifference = Math.abs(evidence.orientationDegrees - expectedOrientation);
  const circularDifference = Math.min(directDifference, 180 - directDifference);
  if (circularDifference > LOCAL_CV_ORIENTATION_TOLERANCE_DEGREES) return false;
  const diagonal = Math.hypot(rasterWidth, rasterHeight);
  const expectedRankScore = Number(Math.min(
    1,
    (evidence.supportCoverage * 0.68)
      + ((Math.hypot(deltaX, deltaY) / diagonal) * 0.32),
  ).toFixed(6));
  const houghProjectionTolerance = (
    (2 * Math.SQRT2 * LOCAL_CV_HOUGH_POINT_DISTANCE_PIXELS)
    / diagonal
  ) * 0.32;
  return Math.abs(rankScore - expectedRankScore)
    <= houghProjectionTolerance + (LOCAL_CV_EVIDENCE_ROUNDING_TOLERANCE * 2);
}

function parseLocalCvEvidence(value: unknown): PrivateWebLabLocalCvEvidenceV1 {
  if (isRecord(value) && value.kind === "axis-aligned-edge-coverage") {
    const evidence = requireExactRecord(value, ["kind", "meanCoverage", "sideCoverages"]);
    if (!Array.isArray(evidence.sideCoverages) || evidence.sideCoverages.length !== 4) {
      throw new Error("Private Web Lab local CV provenance rectangle evidence is invalid.");
    }
    return {
      kind: "axis-aligned-edge-coverage",
      sideCoverages: evidence.sideCoverages.map((coverage) => (
        requireNormalizedNumber(coverage, "local CV side coverage")
      )) as [number, number, number, number],
      meanCoverage: requireNormalizedNumber(
        evidence.meanCoverage,
        "local CV mean coverage",
      ),
    };
  }
  const evidence = requireExactRecord(value, [
    "kind",
    "orientationDegrees",
    "supportCoverage",
  ]);
  if (
    evidence.kind !== "straight-edge-support"
    || typeof evidence.orientationDegrees !== "number"
    || !Number.isFinite(evidence.orientationDegrees)
    || evidence.orientationDegrees < 0
    || evidence.orientationDegrees >= 180
  ) {
    throw new Error("Private Web Lab local CV provenance segment evidence is invalid.");
  }
  return {
    kind: "straight-edge-support",
    supportCoverage: requireNormalizedNumber(
      evidence.supportCoverage,
      "local CV support coverage",
    ),
    orientationDegrees: evidence.orientationDegrees,
  };
}

function parseLocalCvGeometry(value: unknown): PrivateWebLabLocalCvGeometryV1 {
  if (isRecord(value) && value.kind === "rectangle") {
    const geometry = requireExactRecord(value, ["height", "kind", "width", "x", "y"]);
    const x = requireNormalizedNumber(geometry.x, "local CV rectangle x");
    const y = requireNormalizedNumber(geometry.y, "local CV rectangle y");
    const width = requireNormalizedNumber(geometry.width, "local CV rectangle width");
    const height = requireNormalizedNumber(geometry.height, "local CV rectangle height");
    if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
      throw new Error("Private Web Lab local CV provenance rectangle is invalid.");
    }
    return { kind: "rectangle", x, y, width, height };
  }
  const geometry = requireExactRecord(value, ["end", "kind", "start"]);
  if (geometry.kind !== "segment") {
    throw new Error("Private Web Lab local CV provenance geometry kind is invalid.");
  }
  const start = requireManualPoint(geometry.start, "local CV segment start");
  const end = requireManualPoint(geometry.end, "local CV segment end");
  if (start.x === end.x && start.y === end.y) {
    throw new Error("Private Web Lab local CV provenance segment is degenerate.");
  }
  return { kind: "segment", start, end };
}

function requireLocalCvManifestBinding(
  manifest: PrivateWebLabLocalCvProvenanceManifestV1,
  binding: Pick<
    PrivateWebLabDraftRequestV1,
    | "browserSessionId"
    | "sourceImageContentIdentity"
    | "sourcePixelHeight"
    | "sourcePixelWidth"
  >,
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
): void {
  if (
    manifest.browserSessionId !== binding.browserSessionId
    || manifest.sourceImageContentIdentity !== binding.sourceImageContentIdentity
    || manifest.sourcePixelWidth !== binding.sourcePixelWidth
    || manifest.sourcePixelHeight !== binding.sourcePixelHeight
  ) {
    throw new Error("Private Web Lab local CV provenance source or browser binding is stale.");
  }
  const candidateOrderIds = candidates.map(({ id }) => id);
  if (
    serializeCanonicalJson(manifest.candidateOrderIds)
    !== serializeCanonicalJson(candidateOrderIds)
  ) {
    throw new Error("Private Web Lab local CV provenance candidate order is stale.");
  }
  const expectedRunIdentity = contentIdentityFor({
    contractId: manifest.detector.contractId,
    algorithmVersion: manifest.detector.algorithmVersion,
    sourceImageContentIdentity: manifest.sourceImageContentIdentity,
    workingImage: { width: manifest.raster.width, height: manifest.raster.height },
    rasterContentIdentity: manifest.raster.contentIdentity,
    status: "detected",
    abstentionReason: null,
    candidateProposalIdentities: manifest.run.proposalIdentities,
  });
  if (manifest.run.contentIdentity !== expectedRunIdentity) {
    throw new Error("Private Web Lab local CV provenance run identity is invalid.");
  }
  for (const proposal of manifest.proposals) {
    const candidate = candidates[proposal.candidateOrder];
    if (
      candidate === undefined
      || candidate.id !== proposal.candidateId
      || manifest.candidateOrderIds[proposal.candidateOrder] !== proposal.candidateId
      || proposal.rank
        !== manifest.run.proposalIdentities.indexOf(proposal.originalProposalIdentity) + 1
    ) {
      throw new Error("Private Web Lab local CV provenance proposal order is stale.");
    }
    const expectedProposalIdentity = contentIdentityFor({
      contractId: manifest.detector.contractId,
      algorithmVersion: manifest.detector.algorithmVersion,
      sourceImageContentIdentity: manifest.sourceImageContentIdentity,
      kind: proposal.originalGeometry.kind,
      geometry: localCvIdentityGeometry(proposal.originalGeometry),
      evidence: proposal.evidence,
    });
    if (proposal.originalProposalIdentity !== expectedProposalIdentity) {
      throw new Error("Private Web Lab local CV provenance original proposal is invalid.");
    }
    const reviewedGeometry = localCvCandidateGeometry(candidate);
    if (
      proposal.originalGeometry.kind !== reviewedGeometry.kind
      || serializeCanonicalJson(proposal.reviewedGeometry)
        !== serializeCanonicalJson(reviewedGeometry)
      || proposal.userEdited !== (
        serializeCanonicalJson(proposal.originalGeometry)
        !== serializeCanonicalJson(proposal.reviewedGeometry)
      )
    ) {
      throw new Error("Private Web Lab local CV provenance reviewed geometry is stale.");
    }
  }
}

function requireConfirmedLocalCvProvenance(
  session: PrivateWebLabSessionV1,
  input: PrivateWebLabConfirmRequestV1 | PrivateWebLabManualConfirmRequestV1,
  reviewedCandidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  acceptedCandidateSetIdentity: string,
): {
  readonly manifest: PrivateWebLabBoundLocalCvProvenanceManifestV1;
  readonly manifestIdentity: string;
} | undefined {
  const inputDraftIdentity = "localCvProvenanceDraftIdentity" in input
    ? input.localCvProvenanceDraftIdentity
    : undefined;
  const inputManifest = "localCvProvenanceManifest" in input
    ? input.localCvProvenanceManifest
    : undefined;
  if (session.localCvProvenance === undefined) {
    if (inputDraftIdentity !== undefined || inputManifest !== undefined) {
      throw new Error("Private Web Lab local CV provenance is not bound to this session.");
    }
    return undefined;
  }
  if (
    inputDraftIdentity !== session.localCvProvenance.draftIdentity
    || inputManifest === undefined
  ) {
    throw new Error("Private Web Lab local CV provenance draft binding is stale.");
  }
  requireLocalCvManifestBinding(inputManifest, input, reviewedCandidates);
  if (
    serializeCanonicalJson(localCvImmutableManifest(inputManifest))
    !== serializeCanonicalJson(
      localCvImmutableManifest(session.localCvProvenance.draftManifest),
    )
  ) {
    throw new Error("Private Web Lab local CV provenance detector binding is stale.");
  }
  const manifest = {
    ...inputManifest,
    labSessionId: session.labSessionId,
    draftCandidateSetIdentity: session.prepared.candidateSetIdentity,
    acceptedCandidateSetIdentity,
  };
  return { manifest, manifestIdentity: contentIdentityFor(manifest) };
}

function localCvImmutableManifest(manifest: PrivateWebLabLocalCvProvenanceManifestV1): unknown {
  return {
    ...manifest,
    proposals: manifest.proposals.map(({ reviewedGeometry: _reviewed, userEdited: _edited, ...rest }) => (
      rest
    )),
  };
}

function localCvCandidateGeometry(
  candidate: PersonalVisualHarmonyCandidateInputV1,
): PrivateWebLabLocalCvGeometryV1 {
  if (candidate.primitive?.kind !== "segment") {
    return {
      kind: "rectangle",
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
    };
  }
  return {
    kind: "segment",
    start: structuredClone(candidate.primitive.start),
    end: structuredClone(candidate.primitive.end),
  };
}

function localCvIdentityGeometry(geometry: PrivateWebLabLocalCvGeometryV1): unknown {
  return geometry.kind === "rectangle"
    ? { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height }
    : { start: geometry.start, end: geometry.end };
}

function createReceiptWithOptionalLocalCvProvenance(
  receiptPayload: Readonly<Record<string, unknown>>,
  canonicalExport: Readonly<Record<string, unknown>>,
  provenance: {
    readonly manifest: PrivateWebLabBoundLocalCvProvenanceManifestV1;
    readonly manifestIdentity: string;
  } | undefined,
): Readonly<Record<string, unknown>> {
  const receiptIdentity = sha256Identity(serializeCanonicalJson(receiptPayload));
  if (provenance === undefined) return { ...receiptPayload, receiptIdentity };
  const provenanceReceiptPayload = {
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_PROVENANCE_RECEIPT_CONTRACT_ID,
    manifest: provenance.manifest,
    manifestIdentity: provenance.manifestIdentity,
    serverReceiptIdentity: receiptIdentity,
    acceptedCandidateSetIdentity: provenance.manifest.acceptedCandidateSetIdentity,
  };
  const localCvProvenanceReceipt = {
    ...provenanceReceiptPayload,
    contentIdentity: contentIdentityFor(provenanceReceiptPayload),
  };
  const compositePayload = {
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_COMPOSITE_EXPORT_CONTRACT_ID,
    serverReceiptIdentity: receiptIdentity,
    acceptedCandidateSetIdentity: provenance.manifest.acceptedCandidateSetIdentity,
    canonicalResult: canonicalExport,
    localCvProvenanceReceipt,
  };
  const compositeExportIdentity = contentIdentityFor(compositePayload);
  const compositeExportJson = `${serializeCanonicalJson({
    ...compositePayload,
    contentIdentity: compositeExportIdentity,
  })}\n`;
  return {
    ...receiptPayload,
    receiptIdentity,
    localCvProvenanceReceipt,
    compositeExportIdentity,
    compositeExportJson,
  };
}

function requireLocalCvIdentity(value: unknown, field: string): string {
  if (typeof value !== "string" || !SOURCE_CONTENT_IDENTITY_PATTERN.test(value)) {
    throw new Error(`Private Web Lab local CV provenance ${field} identity is invalid.`);
  }
  return value;
}

function requireLocalCvPositiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new Error(`Private Web Lab local CV provenance ${field} is invalid.`);
  }
  return value as number;
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
  const orderedCandidates = candidates
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
  const firstRectangleIndex = orderedCandidates.findIndex(
    (candidate) => primitiveKind(candidate) === "rectangle",
  );
  if (
    firstRectangleIndex >= PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT
    && firstRectangleIndex >= 0
  ) {
    const [rectangle] = orderedCandidates.splice(firstRectangleIndex, 1);
    if (rectangle !== undefined) {
      orderedCandidates.splice(PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT - 1, 0, rectangle);
    }
  }
  return orderedCandidates;
}

function canonicalManualCandidates(
  value: readonly PrivateWebLabManualCandidateInputV1[],
): readonly PersonalVisualHarmonyCandidateInputV1[] {
  if (value.length < 1 || value.length > 12) {
    throw new Error("Private Web Lab requires 1 to 12 manual candidates.");
  }
  const ids = new Set<string>();
  return value.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error("Each manual candidate must be a JSON object.");
    }
    const id = candidate.id;
    if (
      typeof id !== "string"
      || !MANUAL_CANDIDATE_ID_PATTERN.test(id)
      || ids.has(id)
    ) {
      throw new Error("Manual candidate IDs must be unique and bounded.");
    }
    ids.add(id);
    if (candidate.kind === "rectangle") {
      requireExactRecord(candidate, ["height", "id", "kind", "width", "x", "y"]);
      const x = requireNormalizedNumber(candidate.x, "rectangle x");
      const y = requireNormalizedNumber(candidate.y, "rectangle y");
      const width = requireNormalizedNumber(candidate.width, "rectangle width");
      const height = requireNormalizedNumber(candidate.height, "rectangle height");
      if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
        throw new Error("Manual rectangle geometry must be non-degenerate and bounded.");
      }
      return {
        id,
        label: `Cadre manuel ${String(index + 1)}`,
        role: "frame" as const,
        reason: "Cadre tracé manuellement dans le navigateur; candidat seulement.",
        x,
        y,
        width,
        height,
        primitive: { kind: "rectangle" as const },
      };
    }
    if (candidate.kind === "segment") {
      requireExactRecord(candidate, ["end", "id", "kind", "start"]);
      const start = requireManualPoint(candidate.start, "segment start");
      const end = requireManualPoint(candidate.end, "segment end");
      if (start.x === end.x && start.y === end.y) {
        throw new Error("Manual segment geometry must be non-degenerate.");
      }
      return {
        id,
        label: `Segment manuel ${String(index + 1)}`,
        role: "structural-region" as const,
        reason: "Segment tracé manuellement dans le navigateur; candidat seulement.",
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
        primitive: { kind: "segment" as const, start, end },
      };
    }
    throw new Error("Private Web Lab accepts only manual rectangles and segments.");
  });
}

function requireManualPoint(
  value: unknown,
  field: string,
): { readonly x: number; readonly y: number } {
  const point = requireExactRecord(value, ["x", "y"]);
  return {
    x: requireNormalizedNumber(point.x, `${field} x`),
    y: requireNormalizedNumber(point.y, `${field} y`),
  };
}

function requireNormalizedNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${field} must be a finite normalized number.`);
  }
  return value;
}

function strongestGuideCandidateIds(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
): readonly string[] {
  return candidates
    .slice(0, PRIVATE_WEB_LAB_STRONGEST_GUIDE_COUNT)
    .map(({ id }) => id);
}

function requireGoalCompatibleManualCandidates(
  goalId: GuidedGoal["id"],
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
): void {
  const rectangleCount = candidates.filter(
    (candidate) => primitiveKind(candidate) === "rectangle",
  ).length;
  const segmentCount = candidates.filter(
    (candidate) => primitiveKind(candidate) === "segment",
  ).length;
  if (rectangleCount === 0) {
    throw new Error("Private Web Lab manual review requires at least one rectangle.");
  }
  if (goalId === "compare-two-lengths" && segmentCount < 2 && rectangleCount < 2) {
    throw new Error(
      "Compare two lengths requires two rectangles or at least two manual segments.",
    );
  }
}

function createPrivateWebLabGuideAnalysis(
  analysis:
    | PersonalVisualHarmonyConfirmationV1["imagePlaneGuideAnalysis"]
    | PersonalVisualHarmonyManualConfirmationV1["imagePlaneGuideAnalysis"],
  sourceImageContentIdentity: string,
): PrivateWebLabGuideAnalysisV1 {
  const {
    contentIdentity: previousContentIdentity,
    ...analysisWithoutIdentity
  } = analysis;
  if (!SOURCE_CONTENT_IDENTITY_PATTERN.test(previousContentIdentity)) {
    throw new Error("Personal Visual Harmony guide analysis identity is invalid.");
  }
  const withoutIdentity = {
    ...analysisWithoutIdentity,
    sourceImageReferenceIdentity: sourceImageContentIdentity,
    sourceImageDimensionsObservedBy: "private_web_lab_browser" as const,
    confirmationMode: "client_asserted_private_web_lab_interaction" as const,
  };
  return {
    ...withoutIdentity,
    contentIdentity: contentIdentityFor(withoutIdentity),
  };
}

function createPrivateWebLabMeasurementRatioRequest(
  goalId: GuidedGoal["id"],
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  confirmedVisualGuideCandidateIds: readonly string[],
  measurementCandidateIds: readonly [string, string] | null,
  declaredSpatialMeasurementPlan: boolean,
): PersonalVisualHarmonyMeasurementRatioRequestV1 | undefined {
  if (declaredSpatialMeasurementPlan) return undefined;
  if (goalId !== "compare-two-lengths") {
    if (measurementCandidateIds !== null) {
      throw new Error("This Private Web Lab goal does not accept a length comparison.");
    }
    return undefined;
  }
  if (
    measurementCandidateIds === null
    || measurementCandidateIds.length !== 2
    || measurementCandidateIds.some((candidateId) => typeof candidateId !== "string")
    || new Set(measurementCandidateIds).size !== 2
  ) {
    throw new Error("Compare two lengths requires exactly two confirmed lengths.");
  }
  const confirmedIds = new Set(confirmedVisualGuideCandidateIds);
  const measurementFor = (
    candidateId: string,
  ): PersonalVisualHarmonyMeasurementRatioRequestV1["measurements"][number] => {
    const candidate = candidates.find(({ id }) => id === candidateId);
    const kind = candidate === undefined ? undefined : primitiveKind(candidate);
    if (
      candidate === undefined
      || !confirmedIds.has(candidateId)
      || (kind !== "segment" && kind !== "axis")
    ) {
      throw new Error("Each compared length must be a selected segment or axis.");
    }
    return { kind, candidateId };
  };
  const measurements = [
    measurementFor(measurementCandidateIds[0]),
    measurementFor(measurementCandidateIds[1]),
  ] as const;
  return {
    requestId: "web-lab-two-lengths",
    measurements,
    ratioPackRefs: PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS,
    matchTolerance: PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE,
  };
}

function createPrivateWebLabDeclaredMeasurementRatioReport(
  report: PersonalVisualHarmonyDeclaredMeasurementRatioReportV1,
  sourceImageContentIdentity: string,
): PrivateWebLabDeclaredMeasurementRatioReportV1 {
  const {
    contentIdentity: previousContentIdentity,
    ...reportWithoutIdentity
  } = report;
  if (!SOURCE_CONTENT_IDENTITY_PATTERN.test(previousContentIdentity)) {
    throw new Error("Personal Visual Harmony measurement report identity is invalid.");
  }
  const withoutIdentity = {
    ...reportWithoutIdentity,
    sourceImageReferenceIdentity: sourceImageContentIdentity,
  };
  return {
    ...withoutIdentity,
    contentIdentity: contentIdentityFor(withoutIdentity),
  };
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

function requireOptionalLabSessionId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !LAB_SESSION_ID_PATTERN.test(value)) {
    throw new Error("Private Web Lab replacement session identity is invalid.");
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
