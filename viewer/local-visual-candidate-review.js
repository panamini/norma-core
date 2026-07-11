const CANDIDATE_MAX_BYTES = 256 * 1024;
const PNG_MAX_BYTES = 2 * 1024 * 1024;
const INTENT_MAX_BYTES = 64 * 1024;
const MAX_CANDIDATES = 64;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

export function validateCandidateObservationForReview(value) {
  const candidate = requireRecord(value, "candidate observation");
  requireFields(candidate, [
    "contractId", "contractVersion", "observationId", "observationContentIdentity",
    "sourceImage", "provenance", "coordinateFrame", "rectangleCandidates",
    "lossyWarnings", "authority", "persistence", "outcomes",
  ], "candidate observation");
  if (candidate.contractId !== "norma.local-visual-candidate-observation@1"
    || candidate.contractVersion !== 1
    || !IDENTIFIER_PATTERN.test(candidate.observationId)
    || !SHA256_PATTERN.test(candidate.observationContentIdentity)) {
    throw new Error("Invalid candidate observation contract.");
  }
  const sourceImage = requireRecord(candidate.sourceImage, "source image");
  requireFields(sourceImage, ["contentIdentity", "rawImagePersisted", "base64Persisted", "localPathPersisted", "urlPersisted"], "source image");
  if (!SHA256_PATTERN.test(sourceImage.contentIdentity)
    || [sourceImage.rawImagePersisted, sourceImage.base64Persisted, sourceImage.localPathPersisted, sourceImage.urlPersisted].some(Boolean)) {
    throw new Error("Invalid source image boundary.");
  }
  const provenance = requireRecord(candidate.provenance, "provenance");
  requireFields(provenance, [
    "provenanceClass", "adapterBoundary", "sourceReceiptObservationId",
    "sourceReceiptObservationContentIdentity", "providerExecutionReceiptContentIdentity",
    "providerSpecificSchemaTerminated", "manualOnly", "localOnly", "realUserData",
  ], "provenance");
  if (provenance.provenanceClass !== "controlled-local-live-visual-observation"
    || provenance.adapterBoundary !== "provider-specific-response-to-provider-neutral-candidate-observation@1"
    || !IDENTIFIER_PATTERN.test(provenance.sourceReceiptObservationId)
    || !SHA256_PATTERN.test(provenance.sourceReceiptObservationContentIdentity)
    || !SHA256_PATTERN.test(provenance.providerExecutionReceiptContentIdentity)
    || provenance.providerSpecificSchemaTerminated !== true
    || provenance.localOnly !== true || provenance.manualOnly !== true || provenance.realUserData !== false) {
    throw new Error("Invalid local provenance boundary.");
  }
  const frame = requireRecord(candidate.coordinateFrame, "coordinate frame");
  requireFields(frame, [
    "dimensions", "coordinateScale", "origin", "xDirection", "yDirection", "bounds",
    "sourcePixelWidth", "sourcePixelHeight",
  ], "coordinate frame");
  if (frame.dimensions !== 2 || frame.coordinateScale !== "normalized" || frame.origin !== "top-left"
    || frame.xDirection !== "right" || frame.yDirection !== "down"
    || !Number.isInteger(frame.sourcePixelWidth) || frame.sourcePixelWidth < 1
    || !Number.isInteger(frame.sourcePixelHeight) || frame.sourcePixelHeight < 1) {
    throw new Error("Invalid coordinate frame.");
  }
  const bounds = requireRecord(frame.bounds, "coordinate bounds");
  requireFields(bounds, ["x", "y"], "coordinate bounds");
  if (!isUnitTuple(bounds.x) || !isUnitTuple(bounds.y)) throw new Error("Invalid coordinate bounds.");
  if (!Array.isArray(candidate.rectangleCandidates)
    || candidate.rectangleCandidates.length < 1
    || candidate.rectangleCandidates.length > MAX_CANDIDATES) {
    throw new Error("Candidate count must be between 1 and 64.");
  }
  const ids = new Set();
  candidate.rectangleCandidates.forEach((item, index) => {
    const rectangle = requireRecord(item, `candidate ${String(index + 1)}`);
    const keys = Object.keys(rectangle).sort().join("\0");
    const basic = ["candidateId", "order", "x", "y", "width", "height"].sort().join("\0");
    const diagnostic = ["candidateId", "order", "x", "y", "width", "height", "diagnosticMetadata"].sort().join("\0");
    if ((keys !== basic && keys !== diagnostic)
      || !IDENTIFIER_PATTERN.test(rectangle.candidateId)
      || rectangle.order !== index
      || ids.has(rectangle.candidateId)) throw new Error("Invalid candidate identity or order.");
    ids.add(rectangle.candidateId);
    if ("diagnosticMetadata" in rectangle) {
      const metadata = requireRecord(rectangle.diagnosticMetadata, "candidate diagnostic metadata");
      requireFields(metadata, ["providerConfidence"], "candidate diagnostic metadata");
      if (typeof metadata.providerConfidence !== "number" || !Number.isFinite(metadata.providerConfidence)
        || metadata.providerConfidence < 0 || metadata.providerConfidence > 1) {
        throw new Error("Invalid candidate diagnostic metadata.");
      }
    }
    const numbers = [rectangle.x, rectangle.y, rectangle.width, rectangle.height];
    if (!numbers.every((number) => typeof number === "number" && Number.isFinite(number))
      || rectangle.x < 0 || rectangle.y < 0 || rectangle.width <= 0 || rectangle.height <= 0
      || rectangle.x + rectangle.width > 1 || rectangle.y + rectangle.height > 1) {
      throw new Error("Invalid normalized candidate rectangle.");
    }
  });
  if (!Array.isArray(candidate.lossyWarnings)) throw new Error("Lossy warnings must be an array.");
  candidate.lossyWarnings.forEach((item) => {
    const warning = requireRecord(item, "lossy warning");
    requireFields(warning, ["warningId", "code", "candidateId"], "lossy warning");
    if (!IDENTIFIER_PATTERN.test(warning.warningId)
      || !["coordinate-normalization-loss", "rectangle-approximation-loss", "provider-confidence-diagnostic-only"].includes(warning.code)
      || (warning.candidateId !== null && !ids.has(warning.candidateId))) {
      throw new Error("Invalid lossy warning.");
    }
  });
  requireFixedRecord(candidate.authority, {
    providerEvidenceOnly: true, sourceTruth: false, acceptedGeometry: false, coreInput: false,
    maySelfAccept: false, requiresExplicitHumanAcceptance: true, mayAuthorizeMapping: false,
    mayAuthorizeResultJson: false, ratioAuthority: false, packAuthority: false,
    ruleAuthority: false, toleranceAuthority: false, evaluationAuthority: false,
  }, "authority");
  requireFixedRecord(candidate.persistence, {
    providerPayloadPersisted: false, rawProviderResponsePersisted: false,
    rawImagePersisted: false, redactedStructuredObservationOnly: true,
  }, "persistence");
  requireFixedRecord(candidate.outcomes, {
    acceptedGeometryProduced: false, coreInputProduced: false,
    structuredAnalyzeRun: false, resultJsonProduced: false,
  }, "outcomes");
  return structuredClone(candidate);
}

export function parsePngDimensions(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 24
    || signature.some((byte, index) => bytes[index] !== byte)
    || readUint32(bytes, 8) !== 13
    || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") {
    throw new Error("The selected image is not a validated PNG.");
  }
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (width < 1 || height < 1) throw new Error("The selected PNG has invalid dimensions.");
  return { width, height };
}

export async function sha256ContentIdentity(bytes, cryptoRef = globalThis.crypto) {
  const digest = new Uint8Array(await cryptoRef.subtle.digest("SHA-256", bytes));
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifyCandidateObservationContentIdentity(candidate, cryptoRef = globalThis.crypto) {
  const { observationContentIdentity, ...projection } = candidate;
  const canonicalBytes = new TextEncoder().encode(JSON.stringify(canonicalizeJson(projection)));
  const computed = await sha256ContentIdentity(canonicalBytes, cryptoRef);
  if (computed !== observationContentIdentity) throw new Error("The candidate observation content identity is stale.");
  return true;
}

export function createSelectionIntent(candidate, actorId, selectedCandidateIds) {
  if (!IDENTIFIER_PATTERN.test(actorId)) throw new Error("Actor identifier is invalid.");
  if (!Array.isArray(selectedCandidateIds) || selectedCandidateIds.length < 1 || selectedCandidateIds.length > MAX_CANDIDATES) {
    throw new Error("Select between 1 and 64 candidates.");
  }
  const selected = new Set(selectedCandidateIds);
  if (selected.size !== selectedCandidateIds.length) throw new Error("Candidate selection must be unique.");
  const ordered = candidate.rectangleCandidates
    .filter(({ candidateId }) => selected.has(candidateId))
    .map(({ candidateId }) => candidateId);
  if (ordered.length !== selected.size) throw new Error("Candidate selection contains an unknown ID.");
  return {
    contractId: "norma.local-visual-candidate-selection-intent@1",
    contractVersion: 1,
    candidateObservationId: candidate.observationId,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    providerExecutionReceiptContentIdentity: candidate.provenance.providerExecutionReceiptContentIdentity,
    reviewedSourceImageContentIdentity: candidate.sourceImage.contentIdentity,
    acceptanceActor: { actorClass: "human", actorId },
    geometryAction: "accept_exact",
    selectedCandidateIds: ordered,
  };
}

export function overlayStyleForCandidate(candidate) {
  return {
    left: `${String(candidate.x * 100)}%`,
    top: `${String(candidate.y * 100)}%`,
    width: `${String(candidate.width * 100)}%`,
    height: `${String(candidate.height * 100)}%`,
  };
}

export function mountLocalVisualCandidateReview({
  documentRef = document,
  cryptoRef = crypto,
  urlApi = URL,
  queueCleanup = queueMicrotask,
} = {}) {
  const elements = {
    candidateFile: required(documentRef, "[data-candidate-file]"),
    imageFile: required(documentRef, "[data-image-file]"),
    actorId: required(documentRef, "[data-actor-id]"),
    validate: required(documentRef, "[data-validate]"),
    status: required(documentRef, "[data-status]"),
    review: required(documentRef, "[data-review]"),
    image: required(documentRef, "[data-source-image]"),
    overlays: required(documentRef, "[data-overlays]"),
    list: required(documentRef, "[data-candidate-list]"),
    confirm: required(documentRef, "[data-confirm]"),
    cancel: required(documentRef, "[data-cancel]"),
  };
  const state = { generation: 0, candidate: null, actorId: null, selected: new Set() };

  const reset = (message) => {
    state.generation += 1;
    state.candidate = null;
    state.actorId = null;
    state.selected.clear();
    elements.image.removeAttribute("src");
    elements.overlays.replaceChildren();
    elements.list.replaceChildren();
    elements.review.hidden = true;
    elements.confirm.disabled = true;
    elements.status.textContent = message;
  };

  const validateInputs = async () => {
    reset("Validating exact local inputs…");
    const generation = state.generation;
    let imageUrl = null;
    try {
      const candidateFile = elements.candidateFile.files?.[0];
      const imageFile = elements.imageFile.files?.[0];
      const actorId = elements.actorId.value;
      if (candidateFile === undefined || imageFile === undefined || !IDENTIFIER_PATTERN.test(actorId)) {
        throw new Error("Choose both files and enter a valid actor identifier.");
      }
      if (candidateFile.size < 1 || candidateFile.size > CANDIDATE_MAX_BYTES
        || imageFile.size < 1 || imageFile.size > PNG_MAX_BYTES) throw new Error("An input exceeds the local size boundary.");
      const [candidateBuffer, imageBuffer] = await Promise.all([candidateFile.arrayBuffer(), imageFile.arrayBuffer()]);
      if (candidateBuffer.byteLength > CANDIDATE_MAX_BYTES || imageBuffer.byteLength > PNG_MAX_BYTES) {
        throw new Error("An input exceeds the local size boundary.");
      }
      const candidateText = new TextDecoder("utf-8", { fatal: true }).decode(candidateBuffer);
      const candidate = validateCandidateObservationForReview(JSON.parse(candidateText));
      await verifyCandidateObservationContentIdentity(candidate, cryptoRef);
      const imageBytes = new Uint8Array(imageBuffer);
      const pngDimensions = parsePngDimensions(imageBytes);
      const imageIdentity = await sha256ContentIdentity(imageBytes, cryptoRef);
      if (imageIdentity !== candidate.sourceImage.contentIdentity) throw new Error("The PNG content identity does not match the observation.");
      if (pngDimensions.width !== candidate.coordinateFrame.sourcePixelWidth
        || pngDimensions.height !== candidate.coordinateFrame.sourcePixelHeight) {
        throw new Error("The PNG dimensions do not match the observation.");
      }
      imageUrl = urlApi.createObjectURL(new Blob([imageBytes], { type: "image/png" }));
      elements.image.src = imageUrl;
      await elements.image.decode();
      if (generation !== state.generation) return;
      if (elements.image.naturalWidth !== pngDimensions.width || elements.image.naturalHeight !== pngDimensions.height) {
        throw new Error("The decoded PNG dimensions do not match its IHDR.");
      }
      state.candidate = candidate;
      state.actorId = actorId;
      renderCandidates(documentRef, elements, state);
      elements.review.hidden = false;
      elements.status.textContent = "Image identity and dimensions verified. No candidates selected.";
    } catch (error) {
      if (generation === state.generation) reset(error instanceof Error ? error.message : "Input validation failed.");
    } finally {
      if (imageUrl !== null) urlApi.revokeObjectURL(imageUrl);
    }
  };

  elements.validate.addEventListener("click", validateInputs);
  elements.cancel.addEventListener("click", () => reset("Selection cancelled. No artifact produced."));
  for (const input of [elements.candidateFile, elements.imageFile, elements.actorId]) {
    input.addEventListener("change", () => reset("Inputs changed. Verify again before selecting."));
  }
  elements.actorId.addEventListener("input", () => reset("Actor identifier changed. Verify again before selecting."));
  elements.confirm.addEventListener("click", () => {
    if (state.candidate === null || state.actorId === null || state.selected.size === 0) return;
    try {
      const intent = createSelectionIntent(state.candidate, state.actorId, [...state.selected]);
      const contents = `${JSON.stringify(intent, null, 2)}\n`;
      if (new TextEncoder().encode(contents).byteLength > INTENT_MAX_BYTES) throw new Error("Selection intent exceeds 64 KiB.");
      const intentUrl = urlApi.createObjectURL(new Blob([contents], { type: "application/json" }));
      const link = documentRef.createElement("a");
      link.href = intentUrl;
      link.download = "local-visual-candidate-selection-intent.json";
      link.click();
      queueCleanup(() => urlApi.revokeObjectURL(intentUrl));
      reset("Selection intent downloaded. Node finalization still requires explicit confirmation.");
    } catch (error) {
      elements.status.textContent = error instanceof Error ? error.message : "Selection confirmation failed.";
    }
  });
  reset("No inputs verified.");
  return { reset, validateInputs };
}

function renderCandidates(documentRef, elements, state) {
  state.candidate.rectangleCandidates.forEach((candidate, index) => {
    const overlay = documentRef.createElement("div");
    overlay.className = "candidate-overlay";
    overlay.dataset.candidateId = candidate.candidateId;
    overlay.dataset.label = String(index + 1);
    Object.assign(overlay.style, overlayStyleForCandidate(candidate));
    elements.overlays.appendChild(overlay);

    const row = documentRef.createElement("label");
    row.className = "candidate-row";
    const checkbox = documentRef.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = false;
    checkbox.dataset.candidateId = candidate.candidateId;
    const copy = documentRef.createElement("span");
    copy.className = "candidate-copy";
    const candidateId = documentRef.createElement("span");
    candidateId.className = "candidate-id";
    candidateId.textContent = `${String(index + 1)}. ${candidate.candidateId}`;
    const coordinates = documentRef.createElement("span");
    coordinates.className = "candidate-coordinates";
    coordinates.textContent = `x ${String(candidate.x)} · y ${String(candidate.y)} · width ${String(candidate.width)} · height ${String(candidate.height)}`;
    copy.append(candidateId, coordinates);
    row.append(checkbox, copy);
    elements.list.appendChild(row);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selected.add(candidate.candidateId);
      else state.selected.delete(candidate.candidateId);
      overlay.classList.toggle("is-selected", checkbox.checked);
      overlay.dataset.label = checkbox.checked ? `${String(index + 1)} selected` : String(index + 1);
      elements.confirm.disabled = state.selected.size === 0;
      elements.status.textContent = state.selected.size === 0
        ? "No candidates selected."
        : `${String(state.selected.size)} exact candidate${state.selected.size === 1 ? "" : "s"} selected.`;
    });
  });
}

function requireRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} must be a plain object.`);
  }
  return value;
}

function requireFields(value, fields, label) {
  if (Object.keys(value).sort().join("\0") !== [...fields].sort().join("\0")) throw new Error(`${label} contains unexpected fields.`);
}

function requireFixedRecord(value, expected, label) {
  const record = requireRecord(value, label);
  requireFields(record, Object.keys(expected), label);
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (record[field] !== expectedValue) throw new Error(`Invalid ${label} boundary.`);
  }
}

function isUnitTuple(value) {
  return Array.isArray(value) && value.length === 2 && value[0] === 0 && value[1] === 1;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalizeJson(value[key])]));
  }
  return value;
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}

function required(documentRef, selector) {
  const element = documentRef.querySelector(selector);
  if (element === null) throw new Error(`Missing local review element: ${selector}`);
  return element;
}

if (typeof document !== "undefined") mountLocalVisualCandidateReview();
