import { createHash } from "node:crypto";
import {
  PERSONAL_VISUAL_HARMONY_MAX_MASK_PIXELS,
  PERSONAL_VISUAL_HARMONY_MAX_MASK_RUNS,
  PERSONAL_VISUAL_HARMONY_MAX_PROMPT_POINTS,
  PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID,
  normalizePersonalVisualHarmonySemanticTargetV1,
  type PersonalVisualHarmonyManualPromptV1,
  type PersonalVisualHarmonySegmentationMaskV1,
  type PersonalVisualHarmonySegmentationProviderRefV1,
} from "./personal-visual-harmony-perception.js";
import { serializeCanonicalJson } from "./serialization.js";

export const PERSONAL_VISUAL_HARMONY_SEGMENTATION_REQUEST_CONTRACT_ID =
  "norma.personal-visual-harmony-segmentation-request@1" as const;
export const PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID =
  "norma.personal-visual-harmony-segmentation-response@1" as const;
export const PERSONAL_VISUAL_HARMONY_PERCEPTION_RECEIPT_CONTRACT_ID =
  "norma.personal-visual-harmony-perception-receipt@1" as const;

export const DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
export const DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_PROVIDER_RESPONSE_BYTES = 4 * 1024 * 1024;
export const DEFAULT_PERSONAL_VISUAL_HARMONY_SEGMENTATION_DEADLINE_MS = 300_000;
export const PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES = 60;
export const PERSONAL_VISUAL_HARMONY_SEGMENTATION_SOURCE_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const PERSONAL_VISUAL_HARMONY_SEGMENTATION_PROVIDER = {
  providerId: "modal-sam3",
  modelId: "facebook/sam3",
  modelVersion: "3c879f39826c281e95690f02c7821c4de09afae7",
} as const;

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SAFE_MEDIA_TYPE_PATTERN = /^image\/[a-z0-9.+-]{1,63}$/u;
const SAFE_PROVIDER_FIELD_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,127}$/u;

export type PersonalVisualHarmonySegmentationPromptV1 =
  | {
      readonly kind: "interactive";
      readonly points: PersonalVisualHarmonyManualPromptV1["points"];
      readonly box: PersonalVisualHarmonyManualPromptV1["box"];
    }
  | {
      readonly kind: "text";
      readonly text: string;
    };

export interface PersonalVisualHarmonySegmentationRequestV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_SEGMENTATION_REQUEST_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly requestIdentity: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType: string;
  readonly imageBase64: string;
  readonly prompt: PersonalVisualHarmonySegmentationPromptV1;
}

export interface PersonalVisualHarmonySegmentationResponseV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "ready" | "abstained";
  readonly requestIdentity: string;
  readonly sourceImageContentIdentity: string;
  readonly provider: PersonalVisualHarmonySegmentationProviderRefV1;
  readonly mask: PersonalVisualHarmonySegmentationMaskV1 | null;
  readonly providerConfidence: number | null;
  readonly abstentionReason: "no_mask" | "ambiguous" | null;
}

export interface PersonalVisualHarmonyPerceptionReceiptV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_PERCEPTION_RECEIPT_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly requestIdentity: string;
  readonly sourceImageContentIdentity: string;
  readonly promptIdentity: string;
  readonly provider: PersonalVisualHarmonySegmentationProviderRefV1;
  readonly responseIdentity: string;
  readonly status: "ready" | "abstained";
  readonly inferenceAttempts: 1;
  readonly availabilityProbeCount: number;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
  readonly coreRun: false;
  readonly receiptIdentity: string;
}

export interface PersonalVisualHarmonySegmentationResultV1 {
  readonly response: PersonalVisualHarmonySegmentationResponseV1;
  readonly receipt: PersonalVisualHarmonyPerceptionReceiptV1;
}

export interface PersonalVisualHarmonySegmentationProvider {
  segment(input: {
    readonly sourceImageBytes: Uint8Array;
    readonly sourceImageMediaType: string;
    readonly prompt: PersonalVisualHarmonySegmentationPromptV1;
  }): Promise<PersonalVisualHarmonySegmentationResultV1>;
}

export interface PersonalVisualHarmonySegmentationClientConfig {
  readonly endpointUrl: string;
  readonly modalKey: string;
  readonly modalSecret: string;
  readonly deadlineMs?: number;
  readonly maxSourceImageBytes?: number;
  readonly maxProviderResponseBytes?: number;
  readonly availabilityProbeDelayMs?: number;
}

export type PersonalVisualHarmonySegmentationErrorCode =
  | "configuration_invalid"
  | "source_download_failed"
  | "source_too_large"
  | "source_media_type_invalid"
  | "provider_unavailable"
  | "provider_rejected"
  | "provider_timeout"
  | "provider_response_too_large"
  | "provider_response_invalid"
  | "source_mismatch";

export class PersonalVisualHarmonySegmentationError extends Error {
  public readonly name = "PersonalVisualHarmonySegmentationError";

  public constructor(
    public readonly code: PersonalVisualHarmonySegmentationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type PersonalVisualHarmonyFetch = typeof fetch;

export class PersonalVisualHarmonySegmentationClient implements PersonalVisualHarmonySegmentationProvider {
  readonly #endpointUrl: URL;
  readonly #modalKey: string;
  readonly #modalSecret: string;
  readonly #deadlineMs: number;
  readonly #maxSourceImageBytes: number;
  readonly #maxProviderResponseBytes: number;
  readonly #availabilityProbeDelayMs: number;
  readonly #fetch: PersonalVisualHarmonyFetch;
  readonly #delay: (milliseconds: number, signal: AbortSignal) => Promise<void>;

  public constructor(
    config: PersonalVisualHarmonySegmentationClientConfig,
    dependencies: {
      readonly fetch?: PersonalVisualHarmonyFetch;
      readonly delay?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
    } = {},
  ) {
    this.#endpointUrl = validateEndpoint(config.endpointUrl);
    this.#modalKey = requireSecret(config.modalKey);
    this.#modalSecret = requireSecret(config.modalSecret);
    this.#deadlineMs = boundedPositiveInteger(
      config.deadlineMs ?? DEFAULT_PERSONAL_VISUAL_HARMONY_SEGMENTATION_DEADLINE_MS,
      "deadline",
      1_000,
      300_000,
    );
    this.#maxSourceImageBytes = boundedPositiveInteger(
      config.maxSourceImageBytes ?? DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_SOURCE_IMAGE_BYTES,
      "source image byte limit",
      1,
      32 * 1024 * 1024,
    );
    this.#maxProviderResponseBytes = boundedPositiveInteger(
      config.maxProviderResponseBytes ?? DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_PROVIDER_RESPONSE_BYTES,
      "provider response byte limit",
      1,
      8 * 1024 * 1024,
    );
    this.#availabilityProbeDelayMs = boundedPositiveInteger(
      config.availabilityProbeDelayMs ?? 5_000,
      "availability probe delay",
      0,
      5_000,
    );
    this.#fetch = dependencies.fetch ?? fetch;
    this.#delay = dependencies.delay ?? ((milliseconds, signal) => new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const onAbort = (): void => {
        clearTimeout(timeout);
        reject(signal.reason);
      };
      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, milliseconds);
      signal.addEventListener("abort", onAbort, { once: true });
    }));
  }

  public async segment(input: {
    readonly sourceImageBytes: Uint8Array;
    readonly sourceImageMediaType: string;
    readonly prompt: PersonalVisualHarmonySegmentationPromptV1;
  }): Promise<PersonalVisualHarmonySegmentationResultV1> {
    if (!(input.sourceImageBytes instanceof Uint8Array)
      || input.sourceImageBytes.byteLength === 0
      || input.sourceImageBytes.byteLength > this.#maxSourceImageBytes) {
      throw new PersonalVisualHarmonySegmentationError(
        "source_too_large",
        "Source image bytes are empty or exceed the configured limit.",
      );
    }
    const sourceImageMediaType = validateMediaType(input.sourceImageMediaType);
    const prompt = validateSegmentationPrompt(input.prompt);
    const sourceImageContentIdentity = contentIdentityForBytes(input.sourceImageBytes);
    const promptIdentity = contentIdentityFor(prompt);
    const requestIdentity = contentIdentityFor({
      contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_REQUEST_CONTRACT_ID,
      contractVersion: 1,
      sourceImageContentIdentity,
      sourceImageMediaType,
      promptIdentity,
    });
    const request: PersonalVisualHarmonySegmentationRequestV1 = {
      contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_REQUEST_CONTRACT_ID,
      contractVersion: 1,
      requestIdentity,
      sourceImageContentIdentity,
      sourceImageMediaType,
      imageBase64: bytesToBase64(input.sourceImageBytes),
      prompt,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#deadlineMs);
    try {
      const availabilityProbeCount = await this.#awaitAvailability(controller.signal);
      const response = await this.#fetch(this.#endpointUrl, {
        method: "POST",
        headers: this.#headers("application/json"),
        body: JSON.stringify(request),
        signal: controller.signal,
      }).catch((error: unknown) => {
        throw mapFetchError(error, "provider_rejected");
      });
      if (response.status === 503) {
        await response.body?.cancel();
        throw new PersonalVisualHarmonySegmentationError(
          "provider_unavailable",
          "Segmentation provider was unavailable before inference completed; inference was not replayed.",
        );
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new PersonalVisualHarmonySegmentationError(
          "provider_rejected",
          "Segmentation provider rejected the request.",
        );
      }
      const payload = await readBoundedJson(response, this.#maxProviderResponseBytes);
      const validated = validateProviderResponse(payload, {
        requestIdentity,
        sourceImageContentIdentity,
      });
      const responseIdentity = contentIdentityFor(validated);
      const receiptWithoutIdentity = {
        contractId: PERSONAL_VISUAL_HARMONY_PERCEPTION_RECEIPT_CONTRACT_ID,
        contractVersion: 1 as const,
        requestIdentity,
        sourceImageContentIdentity,
        promptIdentity,
        provider: validated.provider,
        responseIdentity,
        status: validated.status,
        inferenceAttempts: 1 as const,
        availabilityProbeCount,
        candidateEvidenceOnly: true as const,
        sourceTruth: false as const,
        coreAuthority: false as const,
        coreRun: false as const,
      };
      return {
        response: validated,
        receipt: {
          ...receiptWithoutIdentity,
          receiptIdentity: contentIdentityFor(receiptWithoutIdentity),
        },
      };
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        throw new PersonalVisualHarmonySegmentationError(
          "provider_timeout",
          "Segmentation deadline expired.",
        );
      }
      if (error instanceof PersonalVisualHarmonySegmentationError) throw error;
      throw new PersonalVisualHarmonySegmentationError(
        "provider_response_invalid",
        "Segmentation failed with a redacted error.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async #awaitAvailability(signal: AbortSignal): Promise<number> {
    const readinessUrl = new URL("./readyz", ensureTrailingSlash(this.#endpointUrl));
    const startedAt = Date.now();
    let finalProbePending = false;
    for (let attempt = 1; attempt <= PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES || finalProbePending; attempt += 1) {
      const finalProbe = finalProbePending;
      finalProbePending = false;
      const response = await this.#fetch(readinessUrl, {
        method: "GET",
        headers: this.#headers(),
        signal,
      }).catch((error: unknown) => {
        throw mapFetchError(error, "provider_unavailable");
      });
      if (response.ok) {
        await response.body?.cancel();
        return attempt;
      }
      if (response.status !== 503) {
        await response.body?.cancel();
        throw new PersonalVisualHarmonySegmentationError(
          "provider_unavailable",
          "Segmentation provider readiness check failed.",
        );
      }
      await response.body?.cancel();
      if (attempt >= PERSONAL_VISUAL_HARMONY_MAX_AVAILABILITY_PROBES && !finalProbe) {
        const remainingMs = this.#deadlineMs - (Date.now() - startedAt);
        if (remainingMs > 0) {
          finalProbePending = true;
          await this.#delay(Math.max(1, Math.floor(remainingMs / 2)), signal);
          continue;
        }
        break;
      }
      if (finalProbe) break;
      const remainingMs = this.#deadlineMs - (Date.now() - startedAt);
      if (remainingMs <= 0) break;
      await this.#delay(Math.min(this.#availabilityProbeDelayMs, remainingMs), signal);
    }
    if (signal.aborted) throw signal.reason ?? new Error("Segmentation readiness deadline expired.");
    throw new PersonalVisualHarmonySegmentationError(
      "provider_unavailable",
      "Segmentation provider did not become ready within the bounded probe budget.",
    );
  }

  #headers(contentType?: string): Record<string, string> {
    return {
      "Modal-Key": this.#modalKey,
      "Modal-Secret": this.#modalSecret,
      Accept: "application/json",
      ...(contentType === undefined ? {} : { "Content-Type": contentType }),
    };
  }
}

export async function downloadPersonalVisualHarmonySourceImage(input: {
  readonly url: string;
  readonly allowedOrigins: readonly string[];
  readonly expectedMediaType?: string | null;
  readonly maxBytes?: number;
  readonly deadlineMs?: number;
  readonly fetch?: PersonalVisualHarmonyFetch;
}): Promise<{ readonly bytes: Uint8Array; readonly mediaType: string }> {
  const url = validateSourceUrl(input.url, input.allowedOrigins);
  const maxBytes = boundedPositiveInteger(
    input.maxBytes ?? DEFAULT_PERSONAL_VISUAL_HARMONY_MAX_SOURCE_IMAGE_BYTES,
    "source image byte limit",
    1,
    32 * 1024 * 1024,
  );
  const deadlineMs = boundedPositiveInteger(input.deadlineMs ?? 10_000, "download deadline", 500, 60_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deadlineMs);
  try {
    const response = await (input.fetch ?? fetch)(url, {
      method: "GET",
      headers: { Accept: "image/*" },
      redirect: "error",
      signal: controller.signal,
    }).catch((error: unknown) => {
      throw mapFetchError(error, "source_download_failed");
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new PersonalVisualHarmonySegmentationError(
        "source_download_failed",
        "Source image download failed.",
      );
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      await response.body?.cancel();
      throw new PersonalVisualHarmonySegmentationError(
        "source_too_large",
        "Source image exceeds the configured byte limit.",
      );
    }
    let mediaType: string;
    try {
      const responseMediaType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
      const expectedMediaType = input.expectedMediaType == null
        ? null
        : validateMediaType(input.expectedMediaType);
      mediaType = validateMediaType(responseMediaType || expectedMediaType || "");
      if (expectedMediaType !== null && mediaType !== expectedMediaType) {
        throw new PersonalVisualHarmonySegmentationError(
          "source_media_type_invalid",
          "Source image media type does not match the bound source reference.",
        );
      }
    } catch (error: unknown) {
      await response.body?.cancel();
      throw error;
    }
    return {
      bytes: await readBoundedBytes(response, maxBytes, "source_too_large"),
      mediaType,
    };
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new PersonalVisualHarmonySegmentationError(
        "source_download_failed",
        "Source image download deadline expired.",
      );
    }
    if (error instanceof PersonalVisualHarmonySegmentationError) throw error;
    throw new PersonalVisualHarmonySegmentationError(
      "source_download_failed",
      "Source image download failed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createPersonalVisualHarmonySegmentationClientFromEnv(
  env: Readonly<Record<string, string | undefined>>,
  dependencies: ConstructorParameters<typeof PersonalVisualHarmonySegmentationClient>[1] = {},
): PersonalVisualHarmonySegmentationClient | null {
  const endpointUrl = env.NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_URL?.trim();
  const modalKey = env.NORMA_PERSONAL_VISUAL_HARMONY_MODAL_KEY?.trim();
  const modalSecret = env.NORMA_PERSONAL_VISUAL_HARMONY_MODAL_SECRET?.trim();
  const sourceImageAllowedOrigins =
    env.NORMA_PERSONAL_VISUAL_HARMONY_SOURCE_IMAGE_ALLOWED_ORIGINS?.trim();
  const deadlineMs = configuredIntegerFromEnv(
    env.NORMA_PERSONAL_VISUAL_HARMONY_SEGMENTATION_DEADLINE_MS,
    "segmentation deadline",
    1_000,
    300_000,
  );
  if (endpointUrl === undefined
    && modalKey === undefined
    && modalSecret === undefined
    && sourceImageAllowedOrigins === undefined
    && deadlineMs === undefined) {
    return null;
  }
  if (!endpointUrl || !modalKey || !modalSecret || !sourceImageAllowedOrigins) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      "Segmentation configuration must provide the endpoint, proxy credentials, and trusted source origins.",
    );
  }
  return new PersonalVisualHarmonySegmentationClient({
    endpointUrl,
    modalKey,
    modalSecret,
    ...(deadlineMs === undefined ? {} : { deadlineMs }),
  }, dependencies);
}

export function personalVisualHarmonySourceImageAllowedOriginsFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): readonly string[] {
  const value = env.NORMA_PERSONAL_VISUAL_HARMONY_SOURCE_IMAGE_ALLOWED_ORIGINS?.trim();
  if (!value) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      "Segmentation configuration requires trusted source image origins.",
    );
  }
  return normalizeAllowedSourceOrigins(value.split(","));
}

function validateProviderResponse(
  value: unknown,
  expected: { readonly requestIdentity: string; readonly sourceImageContentIdentity: string },
): PersonalVisualHarmonySegmentationResponseV1 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      "contractId",
      "contractVersion",
      "status",
      "requestIdentity",
      "sourceImageContentIdentity",
      "provider",
      "mask",
      "providerConfidence",
      "abstentionReason",
    ])
    || value.contractId !== PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID
    || value.contractVersion !== 1
    || (value.status !== "ready" && value.status !== "abstained")
    || value.requestIdentity !== expected.requestIdentity
    || typeof value.sourceImageContentIdentity !== "string"
    || !SHA256_PATTERN.test(value.sourceImageContentIdentity)) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation provider returned an invalid response contract.",
    );
  }
  if (value.sourceImageContentIdentity !== expected.sourceImageContentIdentity) {
    throw new PersonalVisualHarmonySegmentationError(
      "source_mismatch",
      "Segmentation response belongs to a different source image.",
    );
  }
  const provider = validateProvider(value.provider);
  const providerConfidence = value.providerConfidence === null
    ? null
    : validateConfidence(value.providerConfidence);
  if (value.status === "ready") {
    if (value.abstentionReason !== null) {
      throw new PersonalVisualHarmonySegmentationError(
        "provider_response_invalid",
        "Segmentation provider returned a contradictory ready response.",
      );
    }
    return {
      contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID,
      contractVersion: 1,
      status: "ready",
      requestIdentity: expected.requestIdentity,
      sourceImageContentIdentity: expected.sourceImageContentIdentity,
      provider,
      mask: validateMask(value.mask),
      providerConfidence,
      abstentionReason: null,
    };
  }
  if (value.mask !== null
    || value.providerConfidence !== null
    || (value.abstentionReason !== "no_mask" && value.abstentionReason !== "ambiguous")) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation provider returned an invalid abstention.",
    );
  }
  return {
    contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_RESPONSE_CONTRACT_ID,
    contractVersion: 1,
    status: "abstained",
    requestIdentity: expected.requestIdentity,
    sourceImageContentIdentity: expected.sourceImageContentIdentity,
    provider,
    mask: null,
    providerConfidence: null,
    abstentionReason: value.abstentionReason,
  };
}

function validateMask(value: unknown): PersonalVisualHarmonySegmentationMaskV1 {
  if (!isRecord(value)
    || !hasExactKeys(value, ["contractId", "contractVersion", "width", "height", "runs"])
    || value.contractId !== PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID
    || value.contractVersion !== 1
    || !Number.isInteger(value.width)
    || !Number.isInteger(value.height)
    || (value.width as number) <= 0
    || (value.height as number) <= 0
    || (value.width as number) * (value.height as number) > PERSONAL_VISUAL_HARMONY_MAX_MASK_PIXELS
    || !Array.isArray(value.runs)
    || value.runs.length === 0
    || value.runs.length > PERSONAL_VISUAL_HARMONY_MAX_MASK_RUNS) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation provider returned an invalid mask.",
    );
  }
  let previousY = -1;
  let previousEndX = -1;
  const runs = value.runs.map((run) => {
    if (!isRecord(run)
      || !hasExactKeys(run, ["y", "startX", "endXExclusive"])
      || !Number.isInteger(run.y)
      || !Number.isInteger(run.startX)
      || !Number.isInteger(run.endXExclusive)
      || (run.y as number) < 0
      || (run.y as number) >= (value.height as number)
      || (run.startX as number) < 0
      || (run.endXExclusive as number) <= (run.startX as number)
      || (run.endXExclusive as number) > (value.width as number)
      || (run.y as number) < previousY
      || ((run.y as number) === previousY && (run.startX as number) < previousEndX)) {
      throw new PersonalVisualHarmonySegmentationError(
        "provider_response_invalid",
        "Segmentation provider returned invalid mask runs.",
      );
    }
    previousY = run.y as number;
    previousEndX = run.endXExclusive as number;
    return {
      y: run.y as number,
      startX: run.startX as number,
      endXExclusive: run.endXExclusive as number,
    };
  });
  return {
    contractId: PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID,
    contractVersion: 1,
    width: value.width as number,
    height: value.height as number,
    runs,
  };
}

function validateSegmentationPrompt(
  prompt: PersonalVisualHarmonySegmentationPromptV1,
): PersonalVisualHarmonySegmentationPromptV1 {
  if (!isRecord(prompt)) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation prompt is invalid.",
    );
  }
  if (prompt.kind === "text") {
    if (Object.keys(prompt).sort().join("|") !== "kind|text"
      || typeof prompt.text !== "string") {
      throw new PersonalVisualHarmonySegmentationError(
        "provider_response_invalid",
        "Segmentation text prompt is invalid.",
      );
    }
    try {
      return {
        kind: "text",
        text: normalizePersonalVisualHarmonySemanticTargetV1(prompt.text),
      };
    } catch {
      throw new PersonalVisualHarmonySegmentationError(
        "provider_response_invalid",
        "Segmentation text prompt is invalid.",
      );
    }
  }
  if (prompt.kind !== "interactive"
    || Object.keys(prompt).sort().join("|") !== "box|kind|points"
    || !Array.isArray(prompt.points)
    || prompt.points.length > PERSONAL_VISUAL_HARMONY_MAX_PROMPT_POINTS) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation interactive prompt is invalid.",
    );
  }
  const points = prompt.points.map((point) => {
    if (!isRecord(point)
      || Object.keys(point).sort().join("|") !== "label|x|y"
      || (point.label !== "include" && point.label !== "exclude")
      || !isNormalized(point.x)
      || !isNormalized(point.y)) {
      throw new PersonalVisualHarmonySegmentationError(
        "provider_response_invalid",
        "Segmentation interactive point is invalid.",
      );
    }
    return {
      x: point.x as number,
      y: point.y as number,
      label: point.label as "include" | "exclude",
    };
  });
  const box = prompt.box;
  if (box !== null && (!isRecord(box)
    || Object.keys(box).sort().join("|") !== "height|width|x|y"
    || !isNormalized(box.x)
    || !isNormalized(box.y)
    || typeof box.width !== "number"
    || typeof box.height !== "number"
    || !Number.isFinite(box.width)
    || !Number.isFinite(box.height)
    || box.width <= 0
    || box.height <= 0
    || (box.x as number) + box.width > 1
    || (box.y as number) + box.height > 1)) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation interactive box is invalid.",
    );
  }
  if (box === null && !points.some(({ label }) => label === "include")) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation interactive prompt needs an include point or box.",
    );
  }
  return {
    kind: "interactive",
    points,
    box: box === null
      ? null
      : { x: box.x as number, y: box.y as number, width: box.width, height: box.height },
  };
}

function validateProvider(value: unknown): PersonalVisualHarmonySegmentationProviderRefV1 {
  if (!isRecord(value)
    || Object.keys(value).sort().join("|") !== "modelId|modelVersion|providerId"
    || typeof value.providerId !== "string"
    || typeof value.modelId !== "string"
    || !SAFE_PROVIDER_FIELD_PATTERN.test(value.providerId)
    || !SAFE_PROVIDER_FIELD_PATTERN.test(value.modelId)
    || (value.modelVersion !== null
      && (typeof value.modelVersion !== "string"
        || !SAFE_PROVIDER_FIELD_PATTERN.test(value.modelVersion)))
    || value.providerId !== PERSONAL_VISUAL_HARMONY_SEGMENTATION_PROVIDER.providerId
    || value.modelId !== PERSONAL_VISUAL_HARMONY_SEGMENTATION_PROVIDER.modelId
    || value.modelVersion !== PERSONAL_VISUAL_HARMONY_SEGMENTATION_PROVIDER.modelVersion) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation provider reference is invalid.",
    );
  }
  return {
    providerId: value.providerId,
    modelId: value.modelId,
    modelVersion: value.modelVersion as string | null,
  };
}

function validateConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation confidence is invalid.",
    );
  }
  return value;
}

async function readBoundedJson(response: Response, maxBytes: number): Promise<unknown> {
  const bytes = await readBoundedBytes(response, maxBytes, "provider_response_too_large");
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation provider returned an invalid response media type.",
    );
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new PersonalVisualHarmonySegmentationError(
      "provider_response_invalid",
      "Segmentation provider returned invalid JSON.",
    );
  }
}

async function readBoundedBytes(
  response: Response,
  maxBytes: number,
  overflowCode: "source_too_large" | "provider_response_too_large",
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new PersonalVisualHarmonySegmentationError(
      overflowCode,
      "Response exceeds the configured byte limit.",
    );
  }
  if (response.body === null) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new PersonalVisualHarmonySegmentationError(
        overflowCode,
        "Response exceeds the configured byte limit.",
      );
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function validateEndpoint(value: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error();
    }
    return url;
  } catch {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      "Segmentation endpoint must be a credential-free HTTPS URL.",
    );
  }
}

function validateSourceUrl(value: string, allowedOrigins: readonly string[]): URL {
  try {
    const url = new URL(value);
    const normalizedAllowedOrigins = normalizeAllowedSourceOrigins(allowedOrigins);
    if (url.protocol !== "https:"
      || url.username
      || url.password
      || url.hash
      || !normalizedAllowedOrigins.includes(url.origin)) {
      throw new Error();
    }
    return url;
  } catch {
    throw new PersonalVisualHarmonySegmentationError(
      "source_download_failed",
      "Source image reference URL is invalid.",
    );
  }
}

function validateMediaType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!SAFE_MEDIA_TYPE_PATTERN.test(normalized)
    || !(PERSONAL_VISUAL_HARMONY_SEGMENTATION_SOURCE_MEDIA_TYPES as readonly string[])
      .includes(normalized)) {
    throw new PersonalVisualHarmonySegmentationError(
      "source_media_type_invalid",
      "Source image media type is invalid.",
    );
  }
  return normalized;
}

function normalizeAllowedSourceOrigins(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length === 0 || values.length > 8) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      "Trusted source image origins configuration is invalid.",
    );
  }
  const origins = values.map((value) => {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "https:"
        || url.username
        || url.password
        || url.pathname !== "/"
        || url.search
        || url.hash) {
        throw new Error();
      }
      return url.origin;
    } catch {
      throw new PersonalVisualHarmonySegmentationError(
        "configuration_invalid",
        "Trusted source image origins configuration is invalid.",
      );
    }
  });
  if (new Set(origins).size !== origins.length) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      "Trusted source image origins must be unique.",
    );
  }
  return origins;
}

function requireSecret(value: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 4_096) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      "Segmentation proxy credential configuration is invalid.",
    );
  }
  return value;
}

function boundedPositiveInteger(value: number, field: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      `Configured ${field} is outside its safe bound.`,
    );
  }
  return value;
}

function mapFetchError(
  error: unknown,
  defaultCode: "provider_rejected" | "provider_unavailable" | "source_download_failed",
): PersonalVisualHarmonySegmentationError {
  if (error instanceof PersonalVisualHarmonySegmentationError) return error;
  return new PersonalVisualHarmonySegmentationError(defaultCode, "Network operation failed.");
}

function ensureTrailingSlash(url: URL): URL {
  return new URL(url.pathname.endsWith("/") ? url.href : `${url.href}/`);
}

function configuredIntegerFromEnv(
  value: string | undefined,
  field: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const normalized = value?.trim();
  if (normalized === undefined || normalized === "") return undefined;
  if (!/^\d+$/u.test(normalized)) {
    throw new PersonalVisualHarmonySegmentationError(
      "configuration_invalid",
      `Configured ${field} must be a positive integer.`,
    );
  }
  return boundedPositiveInteger(Number(normalized), field, minimum, maximum);
}

function isNormalized(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256").update(serializeCanonicalJson(value)).digest("hex")}`;
}

function contentIdentityForBytes(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes as unknown as string).digest("hex")}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8_192) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 8_192)));
  }
  return btoa(binary);
}
