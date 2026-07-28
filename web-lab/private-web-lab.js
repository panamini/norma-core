import {
  canRunPrivateWebLabCoreV1,
  createPrivateWebLabConfirmationPayloadV1,
  updatePrivateWebLabCandidateGeometryV1,
  visiblePrivateWebLabCandidateIdsV1,
} from "/private-web-lab-browser-model.js";

const state = {
  browserSessionId: readBrowserSessionId(),
  image: null,
  objectUrl: null,
  draft: null,
  candidates: [],
  selectedCandidateIds: new Set(),
  revealAll: false,
  receiptUrl: null,
  preparationRevision: 0,
  confirmationInFlight: false,
  reviewLocked: false,
  prepareAbortController: null,
};

const imageInput = document.querySelector("#image-input");
const goalInput = document.querySelector("#goal-input");
const prepareButton = document.querySelector("#prepare-button");
const setupStatus = document.querySelector("#setup-status");
const reviewSection = document.querySelector("#review-section");
const imagePlane = document.querySelector("#image-plane");
const sourceImage = document.querySelector("#source-image");
const guideOverlay = document.querySelector("#guide-overlay");
const candidateList = document.querySelector("#candidate-list");
const revealButton = document.querySelector("#reveal-button");
const originalButton = document.querySelector("#original-button");
const guidesButton = document.querySelector("#guides-button");
const guideMode = document.querySelector("#guide-mode");
const confirmationInput = document.querySelector("#confirmation-input");
const runButton = document.querySelector("#run-button");
const coreGate = document.querySelector("#core-gate");
const receiptSection = document.querySelector("#receipt-section");
const receiptIdentity = document.querySelector("#receipt-identity");
const resultIdentity = document.querySelector("#result-identity");
const packRefs = document.querySelector("#pack-refs");
const exportLink = document.querySelector("#export-link");

imageInput.addEventListener("change", () => {
  state.preparationRevision += 1;
  state.prepareAbortController?.abort();
  const [file] = imageInput.files;
  state.image = file ?? null;
  resetReview();
  updatePrepareAvailability();
});

goalInput.addEventListener("change", () => {
  state.preparationRevision += 1;
  state.prepareAbortController?.abort();
  resetReview();
  updatePrepareAvailability();
});

prepareButton.addEventListener("click", async () => {
  if (state.image === null || goalInput.value === "" || state.confirmationInFlight) return;
  const image = state.image;
  const goalId = goalInput.value;
  const preparationRevision = state.preparationRevision;
  const previousReviewLocked = state.reviewLocked;
  const abortController = new AbortController();
  state.prepareAbortController?.abort();
  state.prepareAbortController = abortController;
  state.reviewLocked = true;
  setSetupControlsDisabled(true);
  setReviewEditingLocked(true);
  setupStatus.textContent = "Calcul de l’identité locale et préparation…";
  try {
    const dimensions = await readImageDimensions(image);
    requireCurrentPreparation(preparationRevision, image, abortController.signal);
    const sourceImageContentIdentity = await sha256FileIdentity(image);
    requireCurrentPreparation(preparationRevision, image, abortController.signal);
    const draft = await postJson("/api/draft", {
      browserSessionId: state.browserSessionId,
      sourceImageContentIdentity,
      sourceImageMediaType: image.type,
      sourcePixelWidth: dimensions.width,
      sourcePixelHeight: dimensions.height,
      goalId,
    }, abortController.signal);
    requireCurrentPreparation(preparationRevision, image, abortController.signal);
    invalidateConfirmation();
    state.draft = draft;
    state.candidates = structuredClone(draft.candidates);
    state.selectedCandidateIds = new Set(draft.selectedCandidateIds);
    state.revealAll = false;
    state.reviewLocked = false;
    state.objectUrl = URL.createObjectURL(image);
    imagePlane.style.setProperty("--image-aspect", String(dimensions.width / dimensions.height));
    sourceImage.src = state.objectUrl;
    reviewSection.hidden = false;
    receiptSection.hidden = true;
    confirmationInput.checked = false;
    runButton.disabled = true;
    setupStatus.textContent =
      "Brouillon prêt. Les octets de l’image ne quittent pas ce navigateur.";
    renderCandidates();
    renderOverlay();
    setSetupControlsDisabled(false);
    setReviewEditingLocked(false);
  } catch (error) {
    if (abortController.signal.aborted || preparationRevision !== state.preparationRevision) return;
    state.reviewLocked = previousReviewLocked;
    setSetupControlsDisabled(false);
    setReviewEditingLocked(previousReviewLocked);
    setupStatus.textContent = error instanceof Error ? error.message : "Préparation impossible.";
  } finally {
    if (state.prepareAbortController === abortController) {
      state.prepareAbortController = null;
    }
  }
});

originalButton.addEventListener("click", () => setGuidesVisible(false));
guidesButton.addEventListener("click", () => setGuidesVisible(true));

revealButton.addEventListener("click", () => {
  state.revealAll = true;
  renderCandidates();
  renderOverlay();
});

confirmationInput.addEventListener("change", () => {
  updateCoreAvailability();
});

runButton.addEventListener("click", async () => {
  if (
    state.draft === null
    || !confirmationInput.checked
    || state.confirmationInFlight
    || state.reviewLocked
  ) return;
  state.confirmationInFlight = true;
  state.reviewLocked = true;
  setSetupControlsDisabled(true);
  setReviewEditingLocked(true);
  runButton.disabled = true;
  coreGate.textContent = "Confirmation reçue. Exécution déterministe unique…";
  try {
    const receipt = await postJson(
      "/api/confirm",
      createPrivateWebLabConfirmationPayloadV1({
        explicitConfirmation: confirmationInput.checked,
        browserSessionId: state.browserSessionId,
        draft: state.draft,
        selectedCandidateIds: state.selectedCandidateIds,
        reviewedCandidates: state.candidates,
      }),
    );
    state.confirmationInFlight = false;
    setSetupControlsDisabled(false);
    coreGate.textContent = "Core exécuté une fois après confirmation explicite.";
    receiptIdentity.textContent = receipt.receiptIdentity;
    resultIdentity.textContent = receipt.canonicalResultIdentity;
    packRefs.textContent = receipt.ratioPackRefs.join(", ");
    if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
    state.receiptUrl = URL.createObjectURL(
      new Blob([receipt.exportJson], { type: "application/json" }),
    );
    exportLink.href = state.receiptUrl;
    exportLink.download = receipt.exportFileName;
    receiptSection.hidden = false;
    receiptSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    state.confirmationInFlight = false;
    state.reviewLocked = false;
    setSetupControlsDisabled(false);
    setReviewEditingLocked(false);
    coreGate.textContent = error instanceof Error ? error.message : "Confirmation refusée.";
    if (error instanceof Error && /missing or expired/u.test(error.message)) {
      prepareButton.disabled = false;
      invalidateConfirmation();
      setupStatus.textContent =
        "Session locale expirée. Préparez un nouveau brouillon avant de confirmer.";
      return;
    }
    runButton.disabled = !canRunPrivateWebLabCoreV1(
      confirmationInput.checked,
      state.selectedCandidateIds,
      state.candidates,
    );
  }
});

function updatePrepareAvailability() {
  prepareButton.disabled = state.image === null || goalInput.value === "";
  setupStatus.textContent = prepareButton.disabled
    ? "Chargez une image et choisissez un objectif."
    : "Prêt à créer un brouillon déterministe sans fournisseur.";
}

function resetReview() {
  state.reviewLocked = false;
  if (state.objectUrl !== null) URL.revokeObjectURL(state.objectUrl);
  if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
  state.objectUrl = null;
  state.receiptUrl = null;
  state.draft = null;
  state.candidates = [];
  state.selectedCandidateIds = new Set();
  confirmationInput.checked = false;
  receiptIdentity.textContent = "";
  resultIdentity.textContent = "";
  packRefs.textContent = "";
  reviewSection.hidden = true;
  receiptSection.hidden = true;
  setReviewEditingLocked(false);
}

function renderCandidates() {
  candidateList.replaceChildren(
    ...state.candidates.map((candidate, index) => candidateCard(candidate, index)),
  );
  const visibleCandidateIds = visiblePrivateWebLabCandidateIdsV1(
    state.candidates,
    state.draft.strongestGuideCount,
    state.revealAll,
  );
  revealButton.hidden = state.revealAll || state.candidates.length <= state.draft.strongestGuideCount;
  guideMode.textContent = state.revealAll
    ? `${visibleCandidateIds.length} candidats visibles`
    : `${visibleCandidateIds.length} guides prioritaires visibles`;
}

function candidateCard(candidate, index) {
  const article = document.createElement("article");
  article.className = "candidate";
  article.hidden = !state.revealAll && index >= state.draft.strongestGuideCount;
  article.dataset.candidateId = candidate.id;

  const selection = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.selectedCandidateIds.has(candidate.id);
  checkbox.disabled = state.reviewLocked;
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) state.selectedCandidateIds.add(candidate.id);
    else state.selectedCandidateIds.delete(candidate.id);
    invalidateConfirmation();
    renderOverlay();
  });
  const title = document.createElement("strong");
  title.textContent = `${index + 1}. ${candidate.label}`;
  selection.append(checkbox, title);
  const reason = document.createElement("p");
  reason.textContent = candidate.reason;
  article.append(selection, reason);

  const geometryFields = candidateGeometryFields(candidate);
  if (geometryFields.length > 0) {
    const controls = document.createElement("div");
    controls.className = "candidate-controls";
    for (const { label: fieldLabel, path } of geometryFields) {
      const label = document.createElement("label");
      label.textContent = fieldLabel;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "1";
      input.step = "0.001";
      input.value = String(candidateValueAtPath(candidate, path));
      input.disabled = state.reviewLocked;
      input.addEventListener("change", () => {
        const current = state.candidates[index];
        const updated = updatePrivateWebLabCandidateGeometryV1(current, path, input.value);
        state.candidates[index] = updated;
        input.value = String(candidateValueAtPath(updated, path));
        invalidateConfirmation();
        renderOverlay();
      });
      label.append(input);
      controls.append(label);
    }
    article.append(controls);
  }
  return article;
}

function candidateGeometryFields(candidate) {
  const kind = candidate.primitive?.kind ?? "rectangle";
  if (kind === "rectangle") {
    return ["x", "y", "width", "height"].map((path) => ({ label: path, path }));
  }
  if (kind === "segment" || kind === "axis") {
    return [
      { label: "start x", path: "primitive.start.x" },
      { label: "start y", path: "primitive.start.y" },
      { label: "end x", path: "primitive.end.x" },
      { label: "end y", path: "primitive.end.y" },
    ];
  }
  if (kind === "ellipse") {
    return [
      { label: "center x", path: "primitive.center.x" },
      { label: "center y", path: "primitive.center.y" },
      { label: "radius x", path: "primitive.radiusX" },
      { label: "radius y", path: "primitive.radiusY" },
    ];
  }
  return [];
}

function candidateValueAtPath(candidate, path) {
  return path.split(".").reduce((value, part) => value[part], candidate);
}

function renderOverlay() {
  const visible = state.candidates.filter((candidate, index) => {
    return (
      state.selectedCandidateIds.has(candidate.id) &&
      (state.revealAll || index < state.draft.strongestGuideCount)
    );
  });
  guideOverlay.replaceChildren(
    ...visible.map((candidate) => guideElement(candidate)),
  );
}

function guideElement(candidate) {
  const kind = candidate.primitive?.kind ?? "rectangle";
  const namespace = "http://www.w3.org/2000/svg";
  let element;
  if (kind === "segment" || kind === "axis") {
    element = document.createElementNS(namespace, "line");
    element.setAttribute("x1", String(candidate.primitive.start.x * 1000));
    element.setAttribute("y1", String(candidate.primitive.start.y * 1000));
    element.setAttribute("x2", String(candidate.primitive.end.x * 1000));
    element.setAttribute("y2", String(candidate.primitive.end.y * 1000));
  } else if (kind === "ellipse") {
    element = document.createElementNS(namespace, "ellipse");
    element.setAttribute("cx", String(candidate.primitive.center.x * 1000));
    element.setAttribute("cy", String(candidate.primitive.center.y * 1000));
    element.setAttribute("rx", String(candidate.primitive.radiusX * 1000));
    element.setAttribute("ry", String(candidate.primitive.radiusY * 1000));
  } else {
    element = document.createElementNS(namespace, "rect");
    element.setAttribute("x", String(candidate.x * 1000));
    element.setAttribute("y", String(candidate.y * 1000));
    element.setAttribute("width", String(candidate.width * 1000));
    element.setAttribute("height", String(candidate.height * 1000));
  }
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", "#c7ff4a");
  element.setAttribute("stroke-width", kind === "axis" ? "4" : "6");
  element.setAttribute("vector-effect", "non-scaling-stroke");
  return element;
}

function setGuidesVisible(visible) {
  guideOverlay.toggleAttribute("hidden", !visible);
  guideMode.hidden = !visible;
  guidesButton.setAttribute("aria-pressed", String(visible));
  originalButton.setAttribute("aria-pressed", String(!visible));
}

function updateCoreAvailability() {
  const canRun = !state.reviewLocked && state.draft !== null && canRunPrivateWebLabCoreV1(
    confirmationInput.checked,
    state.selectedCandidateIds,
    state.candidates,
  );
  runButton.disabled = !canRun;
  if (!confirmationInput.checked) {
    coreGate.textContent = "Core arrêté — confirmation explicite requise.";
  } else if (canRun) {
    coreGate.textContent = "Confirmation explicite prête — Core n’a pas encore été lancé.";
  } else {
    coreGate.textContent =
      "Core arrêté — sélectionnez au moins un rectangle visible et valide.";
  }
}

function invalidateConfirmation() {
  confirmationInput.checked = false;
  if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
  state.receiptUrl = null;
  receiptSection.hidden = true;
  receiptIdentity.textContent = "";
  resultIdentity.textContent = "";
  packRefs.textContent = "";
  updateCoreAvailability();
}

function setSetupControlsDisabled(disabled) {
  imageInput.disabled = disabled;
  goalInput.disabled = disabled;
  prepareButton.disabled =
    disabled || state.image === null || goalInput.value === "";
}

function setReviewEditingLocked(locked) {
  confirmationInput.disabled = locked;
  for (const input of candidateList.querySelectorAll("input")) {
    input.disabled = locked;
  }
}

function readBrowserSessionId() {
  const storageKey = "norma.private-web-lab.browser-session@1";
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing !== null && /^browser:[A-Za-z0-9:_-]{8,160}$/u.test(existing)) {
      return existing;
    }
    const created = `browser:${crypto.randomUUID()}`;
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `browser:${crypto.randomUUID()}`;
  }
}

function requireCurrentPreparation(revision, image, signal) {
  if (signal.aborted || revision !== state.preparationRevision || image !== state.image) {
    throw new DOMException("Préparation remplacée.", "AbortError");
  }
}

async function readImageDimensions(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (image.naturalWidth < 1 || image.naturalHeight < 1) {
      throw new Error("L’image locale n’a pas de dimensions utilisables.");
    }
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function sha256FileIdentity(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function postJson(path, body, signal = undefined) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const value = await response.json();
  if (!response.ok) {
    throw new Error(value.message ?? value.error ?? "Requête locale refusée.");
  }
  return value;
}
