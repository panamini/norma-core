import { randomUUID } from "node:crypto";
import {
  extractPersonalVisualHarmonyManualPerceptionV1,
  mergePersonalVisualHarmonyPerceptionCandidatesV1,
  type PersonalVisualHarmonyManualPromptV1,
} from "./personal-visual-harmony-perception.js";
import {
  preparePersonalVisualHarmonyMergedPerceptionCandidatesV2,
  type PersonalVisualHarmonyCandidateRoleV1,
  type PersonalVisualHarmonyPreparedCandidateSetV1,
  type PersonalVisualHarmonyPreparedCandidateSetV2,
} from "./personal-visual-harmony.js";
import { PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS } from "./personal-visual-harmony-constructions.js";
import {
  DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_SOURCE_IMAGE_BYTES,
  PersonalVisualHarmonySegmentationError,
  downloadPersonalVisualHarmonySourceImage,
  type PersonalVisualHarmonyFetch,
  type PersonalVisualHarmonySegmentationProvider,
} from "./personal-visual-harmony-segmentation.js";

export const PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_CONTRACT_ID =
  "norma.personal-visual-harmony-perception-job@1" as const;
export const DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_TTL_MS = 10 * 60 * 1_000;
export const DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_CAPACITY = 32;
export const PERSONAL_VISUAL_HARMONY_MAX_AUTOMATIC_CANDIDATES_FOR_PERCEPTION = 9;

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export type PersonalVisualHarmonyPerceptionJobState =
  | "pending"
  | "ready"
  | "abstained"
  | "failed"
  | "expired";

export interface PersonalVisualHarmonyPerceptionJobV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly jobId: string;
  readonly state: PersonalVisualHarmonyPerceptionJobState;
  readonly subjectId: string;
  readonly sessionId: string;
  readonly sourceImageReferenceIdentity: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly perceptionReceiptIdentity: string | null;
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV2 | null;
  readonly errorCode: string | null;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
  readonly coreRun: false;
  readonly durable: false;
}

export interface PersonalVisualHarmonyPerceptionJobServiceOptions {
  readonly provider: PersonalVisualHarmonySegmentationProvider;
  readonly ttlMs?: number;
  readonly capacity?: number;
  readonly maxSourceImageBytes?: number;
  readonly downloadDeadlineMs?: number;
  readonly allowedSourceImageOrigins: readonly string[];
  readonly fetch?: PersonalVisualHarmonyFetch;
  readonly now?: () => number;
  readonly createJobId?: () => string;
}

export class PersonalVisualHarmonyPerceptionJobError extends Error {
  public readonly name = "PersonalVisualHarmonyPerceptionJobError";

  public constructor(
    public readonly code:
      | "capacity_exhausted"
      | "job_not_found"
      | "job_binding_mismatch"
      | "request_invalid",
    message: string,
  ) {
    super(message);
  }
}

interface StoredJob {
  readonly jobId: string;
  readonly subjectId: string;
  readonly sessionId: string;
  readonly sourceImageReferenceIdentity: string;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  state: Exclude<PersonalVisualHarmonyPerceptionJobState, "expired">;
  perceptionReceiptIdentity: string | null;
  preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV2 | null;
  errorCode: string | null;
}

export class InMemoryPersonalVisualHarmonyPerceptionJobService {
  readonly #provider: PersonalVisualHarmonySegmentationProvider;
  readonly #ttlMs: number;
  readonly #capacity: number;
  readonly #maxSourceImageBytes: number;
  readonly #downloadDeadlineMs: number;
  readonly #allowedSourceImageOrigins: readonly string[];
  readonly #fetch: PersonalVisualHarmonyFetch | undefined;
  readonly #now: () => number;
  readonly #createJobId: () => string;
  readonly #jobs = new Map<string, StoredJob>();

  public constructor(options: PersonalVisualHarmonyPerceptionJobServiceOptions) {
    this.#provider = options.provider;
    this.#ttlMs = boundedPositiveInteger(
      options.ttlMs ?? DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_TTL_MS,
      "ttlMs",
      1_000,
      60 * 60 * 1_000,
    );
    this.#capacity = boundedPositiveInteger(
      options.capacity ?? DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_CAPACITY,
      "capacity",
      1,
      1_000,
    );
    this.#maxSourceImageBytes = boundedPositiveInteger(
      options.maxSourceImageBytes ?? DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_SOURCE_IMAGE_BYTES,
      "maxSourceImageBytes",
      1,
      32 * 1024 * 1024,
    );
    this.#downloadDeadlineMs = boundedPositiveInteger(
      options.downloadDeadlineMs ?? 10_000,
      "downloadDeadlineMs",
      500,
      60_000,
    );
    if (!Array.isArray(options.allowedSourceImageOrigins)
      || options.allowedSourceImageOrigins.length === 0) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "request_invalid",
        "Trusted source image origins are required.",
      );
    }
    this.#allowedSourceImageOrigins = [...options.allowedSourceImageOrigins];
    this.#fetch = options.fetch;
    this.#now = options.now ?? Date.now;
    this.#createJobId = options.createJobId ?? (() => `pvh-perception:${randomUUID()}`);
  }

  public start(input: {
    readonly subjectId: string;
    readonly sessionId: string;
    readonly sourceFileId: string;
    readonly sourceImageReferenceIdentity: string;
    readonly sourceImageUrl: string;
    readonly sourceImageMediaType?: string | null;
    readonly prompt: PersonalVisualHarmonyManualPromptV1;
    readonly label: string;
    readonly role: PersonalVisualHarmonyCandidateRoleV1;
    readonly automaticCandidateSet?: PersonalVisualHarmonyPreparedCandidateSetV1;
  }): PersonalVisualHarmonyPerceptionJobV1 {
    const subjectId = requireSafeId(input.subjectId, "subjectId");
    const sessionId = requireSafeId(input.sessionId, "sessionId");
    const sourceFileId = requireBoundedString(input.sourceFileId, "sourceFileId", 1, 2_048);
    const sourceImageReferenceIdentity = requireSha256(
      input.sourceImageReferenceIdentity,
      "sourceImageReferenceIdentity",
    );
    requireBoundedString(input.sourceImageUrl, "sourceImageUrl", 1, 8_192);
    const label = requireBoundedString(input.label, "label", 1, 60);
    if (!["primary-subject", "secondary-subject", "structural-region", "frame"].includes(input.role)) {
      throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", "Perception role is invalid.");
    }
    if (input.automaticCandidateSet !== undefined
      && input.automaticCandidateSet.sourceImageReferenceIdentity !== sourceImageReferenceIdentity) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "request_invalid",
        "Automatic candidates belong to a different source image.",
      );
    }
    if (input.automaticCandidateSet !== undefined
      && !personalVisualHarmonyPreparedSetHasPerceptionCapacity(input.automaticCandidateSet)) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "request_invalid",
        "Automatic candidates do not leave capacity for bounded perception evidence.",
      );
    }
    const now = this.#now();
    this.#removeExpired(now);
    if (this.#jobs.size >= this.#capacity) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "capacity_exhausted",
        "Perception job capacity is exhausted.",
      );
    }
    const jobId = requireSafeId(this.#createJobId(), "jobId");
    if (this.#jobs.has(jobId)) {
      throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", "Perception job id collided.");
    }
    const job: StoredJob = {
      jobId,
      subjectId,
      sessionId,
      sourceImageReferenceIdentity,
      createdAtMs: now,
      expiresAtMs: now + this.#ttlMs,
      state: "pending",
      perceptionReceiptIdentity: null,
      preparedCandidateSet: null,
      errorCode: null,
    };
    this.#jobs.set(jobId, job);
    void this.#execute(job, {
      sourceFileId,
      sourceImageUrl: input.sourceImageUrl,
      ...(input.sourceImageMediaType === undefined
        ? {}
        : { sourceImageMediaType: input.sourceImageMediaType }),
      prompt: input.prompt,
      label,
      role: input.role,
      ...(input.automaticCandidateSet === undefined
        ? {}
        : { automaticCandidateSet: input.automaticCandidateSet }),
    });
    return this.#publicJob(job, now);
  }

  public get(input: {
    readonly jobId: string;
    readonly subjectId: string;
    readonly sessionId: string;
    readonly sourceImageReferenceIdentity: string;
  }): PersonalVisualHarmonyPerceptionJobV1 {
    const jobId = requireSafeId(input.jobId, "jobId");
    const job = this.#jobs.get(jobId);
    if (job === undefined) {
      throw new PersonalVisualHarmonyPerceptionJobError("job_not_found", "Perception job was not found.");
    }
    if (job.subjectId !== input.subjectId
      || job.sessionId !== input.sessionId
      || job.sourceImageReferenceIdentity !== input.sourceImageReferenceIdentity) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "job_binding_mismatch",
        "Perception job binding does not match the active subject, session, and source image.",
      );
    }
    return this.#publicJob(job, this.#now());
  }

  async #execute(
    job: StoredJob,
    input: {
      readonly sourceFileId: string;
      readonly sourceImageUrl: string;
      readonly sourceImageMediaType?: string | null;
      readonly prompt: PersonalVisualHarmonyManualPromptV1;
      readonly label: string;
      readonly role: PersonalVisualHarmonyCandidateRoleV1;
      readonly automaticCandidateSet?: PersonalVisualHarmonyPreparedCandidateSetV1;
    },
  ): Promise<void> {
    try {
      const source = await downloadPersonalVisualHarmonySourceImage({
        url: input.sourceImageUrl,
        allowedOrigins: this.#allowedSourceImageOrigins,
        ...(input.sourceImageMediaType === undefined
          ? {}
          : { expectedMediaType: input.sourceImageMediaType }),
        maxBytes: this.#maxSourceImageBytes,
        deadlineMs: this.#downloadDeadlineMs,
        ...(this.#fetch === undefined ? {} : { fetch: this.#fetch }),
      });
      const segmentation = await this.#provider.segment({
        sourceImageBytes: source.bytes,
        sourceImageMediaType: source.mediaType,
        prompt: {
          kind: "interactive",
          points: input.prompt.points,
          box: input.prompt.box,
        },
      });
      if (this.#now() >= job.expiresAtMs) return;
      job.perceptionReceiptIdentity = segmentation.receipt.receiptIdentity;
      if (segmentation.response.status === "abstained") {
        job.state = "abstained";
        return;
      }
      if (segmentation.response.mask === null) {
        throw new PersonalVisualHarmonySegmentationError(
          "provider_response_invalid",
          "Segmentation ready response omitted its mask.",
        );
      }
      const manualPerception = extractPersonalVisualHarmonyManualPerceptionV1({
        interactionId: safeInteractionId(job.jobId),
        sourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
        provider: segmentation.response.provider,
        prompt: input.prompt,
        mask: segmentation.response.mask,
        providerConfidence: segmentation.response.providerConfidence,
        candidateIdPrefix: safeCandidatePrefix(job.jobId),
        label: input.label,
        role: input.role,
      });
      const merged = mergePersonalVisualHarmonyPerceptionCandidatesV1({
        expectedSourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
        ...(input.automaticCandidateSet === undefined
          ? {}
          : { automaticCandidateSet: input.automaticCandidateSet }),
        manualPerception,
      });
      job.preparedCandidateSet = preparePersonalVisualHarmonyMergedPerceptionCandidatesV2({
        sourceFileId: input.sourceFileId,
        sourceImageContentIdentity: segmentation.response.sourceImageContentIdentity,
        sourceImageMediaType: source.mediaType,
        visualInterpretationSource: input.automaticCandidateSet === undefined ? "sam3" : "hybrid",
        perceptionReceiptIdentity: segmentation.receipt.receiptIdentity,
        mergedPerceptionCandidates: merged,
      });
      job.state = "ready";
    } catch (error: unknown) {
      if (this.#now() >= job.expiresAtMs) return;
      job.state = "failed";
      job.errorCode = error instanceof PersonalVisualHarmonySegmentationError
        ? error.code
        : "perception_failed";
    }
  }

  #removeExpired(now: number): void {
    for (const [jobId, job] of this.#jobs) {
      if (now >= job.expiresAtMs) this.#jobs.delete(jobId);
    }
  }

  #publicJob(job: StoredJob, now: number): PersonalVisualHarmonyPerceptionJobV1 {
    const expired = now >= job.expiresAtMs;
    return {
      contractId: PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_CONTRACT_ID,
      contractVersion: 1,
      jobId: job.jobId,
      state: expired ? "expired" : job.state,
      subjectId: job.subjectId,
      sessionId: job.sessionId,
      sourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
      createdAt: new Date(job.createdAtMs).toISOString(),
      expiresAt: new Date(job.expiresAtMs).toISOString(),
      perceptionReceiptIdentity: job.perceptionReceiptIdentity,
      preparedCandidateSet: expired ? null : structuredClone(job.preparedCandidateSet),
      errorCode: expired ? null : job.errorCode,
      candidateEvidenceOnly: true,
      sourceTruth: false,
      coreAuthority: false,
      coreRun: false,
      durable: false,
    };
  }
}

export function personalVisualHarmonyPreparedSetHasPerceptionCapacity(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
): boolean {
  return prepared.candidates.length <= PERSONAL_VISUAL_HARMONY_MAX_AUTOMATIC_CANDIDATES_FOR_PERCEPTION
    && (prepared.triangleConstructionRequests?.length ?? 0)
      < PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS;
}

function safeInteractionId(jobId: string): string {
  return `sam3:${jobId.replace(/[^A-Za-z0-9._:-]/gu, "-")}`.slice(0, 64);
}

function safeCandidatePrefix(jobId: string): string {
  return `sam3-${jobId.replace(/[^A-Za-z0-9._:-]/gu, "-")}`.slice(0, 48);
}

function requireSafeId(value: string, field: string): string {
  if (typeof value !== "string" || !SAFE_ID_PATTERN.test(value)) {
    throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", `${field} is invalid.`);
  }
  return value;
}

function requireSha256(value: string, field: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", `${field} is invalid.`);
  }
  return value;
}

function requireBoundedString(
  value: string,
  field: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string" || value.length < minimum || value.length > maximum) {
    throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", `${field} is invalid.`);
  }
  return value;
}

function boundedPositiveInteger(value: number, field: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", `${field} is invalid.`);
  }
  return value;
}
