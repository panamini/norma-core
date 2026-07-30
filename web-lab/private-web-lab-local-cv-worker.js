import {
  PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
  PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
  PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_PIXELS,
  PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE,
  detectPrivateWebLabLocalCvCandidatesV1,
} from "./private-web-lab-local-cv.js";

const MAX_SOURCE_PIXELS = 40_000_000;
const SOURCE_IDENTITY_PATTERN = /^sha256:[0-9a-f]{64}$/u;

self.addEventListener("message", async (event) => {
  const request = event.data;
  if (!isValidRequest(request)) {
    postAbstention(request?.requestId, "invalid-worker-request");
    return;
  }
  const startedAt = performance.now();
  const { imageBitmap } = request;
  try {
    if (request.sourceWidth * request.sourceHeight > MAX_SOURCE_PIXELS) {
      postAbstention(request.requestId, "source-image-too-large");
      return;
    }
    const scale = Math.min(
      1,
      PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE / request.sourceWidth,
      PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_SIDE / request.sourceHeight,
      Math.sqrt(
        PRIVATE_WEB_LAB_LOCAL_CV_MAX_WORKING_PIXELS
        / (request.sourceWidth * request.sourceHeight),
      ),
    );
    const workingWidth = Math.max(3, Math.round(request.sourceWidth * scale));
    const workingHeight = Math.max(3, Math.round(request.sourceHeight * scale));
    const canvas = new OffscreenCanvas(workingWidth, workingHeight);
    const context = canvas.getContext("2d", {
      alpha: false,
      colorSpace: "srgb",
      willReadFrequently: true,
    });
    if (context === null) {
      postAbstention(request.requestId, "canvas-unavailable");
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, workingWidth, workingHeight);
    context.drawImage(imageBitmap, 0, 0, workingWidth, workingHeight);
    const imageData = context.getImageData(0, 0, workingWidth, workingHeight);
    const rasterContentIdentity = await sha256BytesIdentity(imageData.data);
    const rasterizedAt = performance.now();
    const detection = detectPrivateWebLabLocalCvCandidatesV1(imageData);
    const detectedAt = performance.now();
    const candidates = await Promise.all(detection.candidates.map(async (candidate) => ({
      ...candidate,
      proposalIdentity: await sha256CanonicalIdentity({
        contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
        algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
        sourceImageContentIdentity: request.sourceImageContentIdentity,
        kind: candidate.kind,
        geometry: candidate.geometry,
        evidence: candidate.evidence,
      }),
    })));
    const executionIdentity = await sha256CanonicalIdentity({
      contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
      algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
      sourceImageContentIdentity: request.sourceImageContentIdentity,
      workingImage: detection.workingImage,
      rasterContentIdentity,
      status: detection.status,
      abstentionReason: detection.abstentionReason,
      candidateProposalIdentities: candidates.map(({ proposalIdentity }) => proposalIdentity),
    });
    self.postMessage({
      requestId: request.requestId,
      ...detection,
      candidates,
      sourceImageContentIdentity: request.sourceImageContentIdentity,
      rasterContentIdentity,
      executionIdentity,
      metrics: {
        sourceWidth: request.sourceWidth,
        sourceHeight: request.sourceHeight,
        workingWidth,
        workingHeight,
        rasterizeMilliseconds: milliseconds(rasterizedAt - startedAt),
        detectionMilliseconds: milliseconds(detectedAt - rasterizedAt),
        workerMilliseconds: milliseconds(performance.now() - startedAt),
      },
    });
  } catch {
    postAbstention(request.requestId, "detector-error");
  } finally {
    imageBitmap.close();
  }
});

function isValidRequest(value) {
  return (
    value !== null
    && typeof value === "object"
    && typeof value.requestId === "string"
    && /^local-cv:[A-Za-z0-9:_-]{8,160}$/u.test(value.requestId)
    && SOURCE_IDENTITY_PATTERN.test(value.sourceImageContentIdentity)
    && Number.isSafeInteger(value.sourceWidth)
    && value.sourceWidth > 0
    && Number.isSafeInteger(value.sourceHeight)
    && value.sourceHeight > 0
    && value.imageBitmap instanceof ImageBitmap
  );
}

function postAbstention(requestId, abstentionReason) {
  self.postMessage({
    requestId: typeof requestId === "string" ? requestId : null,
    contractId: PRIVATE_WEB_LAB_LOCAL_CV_CONTRACT_ID,
    algorithmVersion: PRIVATE_WEB_LAB_LOCAL_CV_ALGORITHM_VERSION,
    status: "abstained",
    abstentionReason,
    workingImage: null,
    evidence: null,
    candidates: [],
    sourceImageContentIdentity: null,
    rasterContentIdentity: null,
    executionIdentity: null,
    metrics: null,
  });
}

async function sha256CanonicalIdentity(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function sha256BytesIdentity(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
  );
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function milliseconds(value) {
  return Number(value.toFixed(2));
}
