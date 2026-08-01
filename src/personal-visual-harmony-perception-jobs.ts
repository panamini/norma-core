import { randomUUID } from "node:crypto";
import {
  extractPersonalVisualHarmonyObjectRectangleV1,
  extractPersonalVisualHarmonyManualPerceptionV1,
  mergePersonalVisualHarmonyPerceptionCandidatesV1,
  normalizePersonalVisualHarmonySemanticTargetV1,
  type PersonalVisualHarmonyManualPromptV1,
  type PersonalVisualHarmonyPerceptionPromptV1,
} from "./personal-visual-harmony-perception.js";
import {
  PERSONAL_VISUAL_HARMONY_MAX_TWO_OBJECT_BASE_CANDIDATES,
  PERSONAL_VISUAL_HARMONY_MAX_TWO_OBJECT_INTERIM_CANDIDATES,
  preparePersonalVisualHarmonyCandidateSetV3,
  preparePersonalVisualHarmonyMultiPerceptionObservationV1,
  preparePersonalVisualHarmonyMergedPerceptionCandidatesV2,
  type PersonalVisualHarmonyCandidateRoleV1,
  type PersonalVisualHarmonyPreparedCandidateSetV1,
  type PersonalVisualHarmonyPreparedCandidateSetV2,
  type PersonalVisualHarmonyPreparedCandidateSetV3,
} from "./personal-visual-harmony.js";
import { PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS } from "./personal-visual-harmony-constructions.js";
import {
  DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_SOURCE_IMAGE_BYTES,
  PersonalVisualHarmonySegmentationError,
  downloadPersonalVisualHarmonySourceImage,
  type PersonalVisualHarmonyFetch,
  type PersonalVisualHarmonySegmentationPromptV1,
  type PersonalVisualHarmonySegmentationProvider,
} from "./personal-visual-harmony-segmentation.js";

export const PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_CONTRACT_ID =
  "norma.personal-visual-harmony-perception-job@1" as const;
export const DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_TTL_MS = 10 * 60 * 1_000;
export const DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS = 45_000;
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
  readonly preparedCandidateSet:
    | PersonalVisualHarmonyPreparedCandidateSetV2
    | PersonalVisualHarmonyPreparedCandidateSetV3
    | null;
  readonly workflowMode: "two-object-spatial" | null;
  readonly attemptOrdinal: 1 | 2 | null;
  readonly parentCandidateSetIdentity: string | null;
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
  readonly executionDeadlineMs?: number;
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
  preparedCandidateSet:
    | PersonalVisualHarmonyPreparedCandidateSetV2
    | PersonalVisualHarmonyPreparedCandidateSetV3
    | null;
  readonly workflowMode: "two-object-spatial" | null;
  readonly attemptOrdinal: 1 | 2 | null;
  readonly parentCandidateSetIdentity: string | null;
  errorCode: string | null;
}

export class InMemoryPersonalVisualHarmonyPerceptionJobService {
  readonly #provider: PersonalVisualHarmonySegmentationProvider;
  readonly #ttlMs: number;
  readonly #executionDeadlineMs: number;
  readonly #capacity: number;
  readonly #maxSourceImageBytes: number;
  readonly #downloadDeadlineMs: number;
  readonly #allowedSourceImageOrigins: readonly string[];
  readonly #fetch: PersonalVisualHarmonyFetch | undefined;
  readonly #now: () => number;
  readonly #createJobId: () => string;
  readonly #jobs = new Map<string, StoredJob>();
  readonly #expiredJobs = new Map<string, StoredJob>();

  public constructor(options: PersonalVisualHarmonyPerceptionJobServiceOptions) {
    this.#provider = options.provider;
    this.#ttlMs = boundedPositiveInteger(
      options.ttlMs ?? DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_JOB_TTL_MS,
      "ttlMs",
      1_000,
      60 * 60 * 1_000,
    );
    this.#executionDeadlineMs = boundedPositiveInteger(
      options.executionDeadlineMs
        ?? Math.min(DEFAULT_PERSONAL_VISUAL_HARMONY_PERCEPTION_EXECUTION_DEADLINE_MS, this.#ttlMs),
      "executionDeadlineMs",
      10,
      this.#ttlMs,
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
    readonly prompt: PersonalVisualHarmonyPerceptionPromptV1 | PersonalVisualHarmonySegmentationPromptV1;
    readonly label: string;
    readonly role: PersonalVisualHarmonyCandidateRoleV1;
    readonly automaticCandidateSet?:
      | PersonalVisualHarmonyPreparedCandidateSetV1
      | PersonalVisualHarmonyPreparedCandidateSetV3;
    readonly workflowMode?: "two-object-spatial";
    readonly attemptOrdinal?: 1 | 2;
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
    const prompt = normalizeJobPrompt(input.prompt);
    if (!["primary-subject", "secondary-subject", "structural-region", "frame"].includes(input.role)) {
      throw new PersonalVisualHarmonyPerceptionJobError("request_invalid", "Perception role is invalid.");
    }
    const multiMode = input.workflowMode === "two-object-spatial";
    if (multiMode !== (input.attemptOrdinal !== undefined)) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "request_invalid",
        "Two-object perception requires an exact server attempt ordinal.",
      );
    }
    if (multiMode) {
      const expectedRole = input.attemptOrdinal === 1 ? "primary-subject" : "secondary-subject";
      if (input.role !== expectedRole || input.automaticCandidateSet === undefined) {
        throw new PersonalVisualHarmonyPerceptionJobError(
          "request_invalid",
          "Two-object perception role and parent candidate set must be server-derived.",
        );
      }
      if (input.attemptOrdinal === 1
        && (input.automaticCandidateSet.contractVersion !== 1
          || input.automaticCandidateSet.candidates.length
            > PERSONAL_VISUAL_HARMONY_MAX_TWO_OBJECT_BASE_CANDIDATES)) {
        throw new PersonalVisualHarmonyPerceptionJobError(
          "request_invalid",
          "Object A requires a V1 set with two reserved candidate slots.",
        );
      }
      if (input.attemptOrdinal === 2
        && (input.automaticCandidateSet.contractVersion !== 3
          || input.automaticCandidateSet.perceptionManifest.observations.length !== 1
          || input.automaticCandidateSet.candidates.length
            > PERSONAL_VISUAL_HARMONY_MAX_TWO_OBJECT_INTERIM_CANDIDATES)) {
        throw new PersonalVisualHarmonyPerceptionJobError(
          "request_invalid",
          "Object B requires exactly one current object observation and one remaining slot.",
        );
      }
    } else if (input.automaticCandidateSet?.contractVersion === 3) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "request_invalid",
        "A V3 candidate set requires the two-object workflow mode.",
      );
    }
    if (input.automaticCandidateSet !== undefined
      && input.automaticCandidateSet.sourceImageReferenceIdentity !== sourceImageReferenceIdentity) {
      throw new PersonalVisualHarmonyPerceptionJobError(
        "request_invalid",
        "Automatic candidates belong to a different source image.",
      );
    }
    if (!multiMode && input.automaticCandidateSet?.contractVersion === 1
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
    if (this.#jobs.has(jobId) || this.#expiredJobs.has(jobId)) {
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
      workflowMode: input.workflowMode ?? null,
      attemptOrdinal: input.attemptOrdinal ?? null,
      parentCandidateSetIdentity: input.automaticCandidateSet?.candidateSetIdentity ?? null,
      errorCode: null,
    };
    this.#jobs.set(jobId, job);
    void this.#execute(job, {
      sourceFileId,
      sourceImageUrl: input.sourceImageUrl,
      ...(input.sourceImageMediaType === undefined
        ? {}
        : { sourceImageMediaType: input.sourceImageMediaType }),
      prompt,
      label,
      role: input.role,
      ...(input.workflowMode === undefined ? {} : { workflowMode: input.workflowMode }),
      ...(input.attemptOrdinal === undefined ? {} : { attemptOrdinal: input.attemptOrdinal }),
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
    const job = this.#jobs.get(jobId) ?? this.#expiredJobs.get(jobId);
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
    const now = this.#now();
    if (now >= job.expiresAtMs) this.#terminalizePendingJob(job, "job_expired");
    return this.#publicJob(job, now);
  }

  async #execute(
    job: StoredJob,
    input: {
      readonly sourceFileId: string;
      readonly sourceImageUrl: string;
      readonly sourceImageMediaType?: string | null;
      readonly prompt: PersonalVisualHarmonySegmentationPromptV1;
      readonly label: string;
      readonly role: PersonalVisualHarmonyCandidateRoleV1;
      readonly automaticCandidateSet?:
        | PersonalVisualHarmonyPreparedCandidateSetV1
        | PersonalVisualHarmonyPreparedCandidateSetV3;
      readonly workflowMode?: "two-object-spatial";
      readonly attemptOrdinal?: 1 | 2;
    },
  ): Promise<void> {
    const executionTimer = setTimeout(() => {
      this.#terminalizePendingJob(job, "job_execution_timeout");
    }, this.#executionDeadlineMs);
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
      if (job.state !== "pending") return;
      if (this.#now() >= job.expiresAtMs) {
        this.#terminalizePendingJob(job, "job_expired");
        return;
      }
      const segmentation = await this.#provider.segment({
        sourceImageBytes: source.bytes,
        sourceImageMediaType: source.mediaType,
        prompt: input.prompt,
      });
      if (job.state !== "pending") return;
      if (this.#now() >= job.expiresAtMs) {
        this.#terminalizePendingJob(job, "job_expired");
        return;
      }
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
      const perceptionPrompt = input.prompt.kind === "interactive"
        ? { points: input.prompt.points, box: input.prompt.box }
        : input.prompt;
      if (input.workflowMode === "two-object-spatial") {
        if (input.attemptOrdinal === undefined || input.automaticCandidateSet === undefined) {
          throw new PersonalVisualHarmonySegmentationError(
            "provider_response_invalid",
            "Two-object perception job lost its server reservation.",
          );
        }
        const rectangle = extractPersonalVisualHarmonyObjectRectangleV1({
          ordinal: input.attemptOrdinal,
          sourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
          provider: segmentation.response.provider,
          prompt: perceptionPrompt,
          mask: segmentation.response.mask,
          label: input.label,
        });
        const previousObservations = input.automaticCandidateSet.contractVersion === 3
          ? input.automaticCandidateSet.perceptionManifest.observations
          : [];
        if (previousObservations.length > 0
          && previousObservations[0]!.sourceImageContentIdentity
            !== segmentation.response.sourceImageContentIdentity) {
          throw new PersonalVisualHarmonySegmentationError(
            "provider_response_invalid",
            "Object B source content does not match object A.",
          );
        }
        const observation = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
          ordinal: input.attemptOrdinal,
          role: input.attemptOrdinal === 1 ? "primary-subject" : "secondary-subject",
          normalizedPrompt: input.prompt,
          parentCandidateSetIdentity: input.automaticCandidateSet.candidateSetIdentity,
          sourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
          sourceImageContentIdentity: segmentation.response.sourceImageContentIdentity,
          providerReceiptIdentity: segmentation.receipt.receiptIdentity,
          maskIdentity: rectangle.maskIdentity,
          perceptionIdentity: rectangle.perceptionIdentity,
          candidateId: rectangle.candidate.id,
          originalRectangle: rectangle.originalRectangle,
        });
        const observations = [...previousObservations, observation];
        job.preparedCandidateSet = preparePersonalVisualHarmonyCandidateSetV3({
          sourceFileId: input.sourceFileId,
          sourceImageContentIdentity: segmentation.response.sourceImageContentIdentity,
          sourceImageMediaType: source.mediaType,
          expectedSourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
          visualInterpretationSource: input.automaticCandidateSet.contractVersion === 3
            ? input.automaticCandidateSet.visualInterpretationSource
            : input.automaticCandidateSet.candidates.length === 0
              ? "sam3"
              : "hybrid",
          observations,
          candidates: [...input.automaticCandidateSet.candidates, rectangle.candidate],
          ...(input.automaticCandidateSet.triangleConstructionRequests === undefined
            ? {}
            : {
                triangleConstructionRequests:
                  input.automaticCandidateSet.triangleConstructionRequests,
              }),
        });
        job.state = "ready";
        return;
      }
      const legacyAutomaticCandidateSet = input.automaticCandidateSet?.contractVersion === 1
        ? input.automaticCandidateSet
        : undefined;
      const manualPerception = extractPersonalVisualHarmonyManualPerceptionV1({
        interactionId: safeInteractionId(job.jobId),
        sourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
        provider: segmentation.response.provider,
        prompt: perceptionPrompt,
        mask: segmentation.response.mask,
        providerConfidence: segmentation.response.providerConfidence,
        candidateIdPrefix: safeCandidatePrefix(job.jobId),
        label: input.label,
        role: input.role,
      });
      const merged = mergePersonalVisualHarmonyPerceptionCandidatesV1({
        expectedSourceImageReferenceIdentity: job.sourceImageReferenceIdentity,
        ...(legacyAutomaticCandidateSet === undefined
          ? {}
          : { automaticCandidateSet: legacyAutomaticCandidateSet }),
        manualPerception,
      });
      job.preparedCandidateSet = preparePersonalVisualHarmonyMergedPerceptionCandidatesV2({
        sourceFileId: input.sourceFileId,
        sourceImageContentIdentity: segmentation.response.sourceImageContentIdentity,
        sourceImageMediaType: source.mediaType,
        visualInterpretationSource: legacyAutomaticCandidateSet === undefined ? "sam3" : "hybrid",
        perceptionReceiptIdentity: segmentation.receipt.receiptIdentity,
        mergedPerceptionCandidates: merged,
      });
      job.state = "ready";
    } catch (error: unknown) {
      if (job.state !== "pending") return;
      if (this.#now() >= job.expiresAtMs) {
        this.#terminalizePendingJob(job, "job_expired");
        return;
      }
      this.#terminalizePendingJob(job, error instanceof PersonalVisualHarmonySegmentationError
        ? error.code
        : "perception_failed");
    } finally {
      clearTimeout(executionTimer);
    }
  }

  #terminalizePendingJob(job: StoredJob, errorCode: string): void {
    if (job.state !== "pending") return;
    job.state = "failed";
    job.errorCode = errorCode;
    job.perceptionReceiptIdentity = null;
    job.preparedCandidateSet = null;
  }

  #removeExpired(now: number): void {
    for (const [jobId, job] of this.#jobs) {
      if (now < job.expiresAtMs) continue;
      this.#terminalizePendingJob(job, "job_expired");
      this.#jobs.delete(jobId);
      this.#expiredJobs.set(jobId, job);
    }
    for (const [jobId, job] of this.#expiredJobs) {
      if (now >= job.expiresAtMs + this.#ttlMs) this.#expiredJobs.delete(jobId);
    }
    while (this.#expiredJobs.size > this.#capacity) {
      const oldestJobId = this.#expiredJobs.keys().next().value;
      if (oldestJobId === undefined) break;
      this.#expiredJobs.delete(oldestJobId);
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
      workflowMode: job.workflowMode,
      attemptOrdinal: job.attemptOrdinal,
      parentCandidateSetIdentity: job.parentCandidateSetIdentity,
      errorCode: expired ? "job_expired" : job.errorCode,
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

function normalizeJobPrompt(
  prompt: PersonalVisualHarmonyPerceptionPromptV1 | PersonalVisualHarmonySegmentationPromptV1,
): PersonalVisualHarmonySegmentationPromptV1 {
  try {
    if (typeof prompt === "object" && prompt !== null && "kind" in prompt) {
      if (prompt.kind === "text") {
        return {
          kind: "text",
          text: normalizePersonalVisualHarmonySemanticTargetV1(prompt.text),
        };
      }
      if (prompt.kind === "interactive") {
        return {
          kind: "interactive",
          points: prompt.points,
          box: prompt.box,
        };
      }
      throw new Error("Perception prompt is invalid.");
    }
    return {
      kind: "interactive",
      points: prompt.points,
      box: prompt.box,
    };
  } catch {
    throw new PersonalVisualHarmonyPerceptionJobError(
      "request_invalid",
      "Perception prompt is invalid.",
    );
  }
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
