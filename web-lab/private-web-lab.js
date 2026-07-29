import {
  canRunPrivateWebLabCoreV1,
  createPrivateWebLabConfirmationPayloadV1,
  privateWebLabMeasurementLengthCandidatesV1,
  updatePrivateWebLabCandidateGeometryV1,
} from "/private-web-lab-browser-model.js";

const state = {
  browserSessionId: readBrowserSessionId(),
  image: null,
  dimensions: null,
  sourceIdentity: null,
  objectUrl: null,
  phase: "empty",
  tool: "rectangle",
  authored: [],
  draft: null,
  candidates: [],
  selectedCandidateIds: new Set(),
  measurementCandidateIds: [null, null],
  confirmationInFlight: false,
  coreExecutionCount: 0,
  receiptUrl: null,
  pointerStart: null,
  imageRevision: 0,
};

const $ = (selector) => document.querySelector(selector);
const imageInput = $("#image-input");
const goalInput = $("#goal-input");
const prepareButton = $("#prepare-button");
const setupStatus = $("#setup-status");
const reviewSection = $("#review-section");
const phaseDescription = $("#phase-description");
const imagePlane = $("#image-plane");
const sourceImage = $("#source-image");
const guideOverlay = $("#guide-overlay");
const candidateList = $("#candidate-list");
const authoringToolbar = $("#authoring-toolbar");
const rectangleTool = $("#rectangle-tool");
const segmentTool = $("#segment-tool");
const measurementSection = $("#measurement-section");
const measurementFirst = $("#measurement-first");
const measurementSecond = $("#measurement-second");
const confirmationInput = $("#confirmation-input");
const runButton = $("#run-button");
const coreGate = $("#core-gate");
const receiptSection = $("#receipt-section");
const guideMode = $("#guide-mode");
const receiptIdentity = $("#receipt-identity");
const resultIdentity = $("#result-identity");
const packRefs = $("#pack-refs");
const measurementReportRow = $("#measurement-report-row");
const measurementReport = $("#measurement-report");
const exportLink = $("#export-link");
const newMeasurementButton = $("#new-measurement-button");

imageInput.addEventListener("change", async () => {
  const [file] = imageInput.files;
  const imageRevision = state.imageRevision + 1;
  state.imageRevision = imageRevision;
  clearImage();
  state.image = file ?? null;
  if (state.image === null) return updateAvailability();
  const selectedImage = state.image;
  const isCurrentSelection = () =>
    state.imageRevision === imageRevision && state.image === selectedImage;
  setupStatus.textContent = "Lecture locale de l’image…";
  try {
    const dimensions = await readImageDimensions(selectedImage);
    if (!isCurrentSelection()) return;
    const sourceIdentity = await sha256FileIdentity(selectedImage);
    if (!isCurrentSelection()) return;
    state.dimensions = dimensions;
    state.sourceIdentity = sourceIdentity;
    state.objectUrl = URL.createObjectURL(selectedImage);
    sourceImage.src = state.objectUrl;
    await sourceImage.decode();
    if (!isCurrentSelection()) return;
    imagePlane.style.setProperty(
      "--image-aspect",
      String(state.dimensions.width / state.dimensions.height),
    );
    state.phase = "authoring";
    reviewSection.hidden = false;
    render();
  } catch (error) {
    if (!isCurrentSelection()) return;
    clearImage();
    setupStatus.textContent = error instanceof Error ? error.message : "Image illisible.";
  }
});

goalInput.addEventListener("change", updateAvailability);
rectangleTool.addEventListener("click", () => setTool("rectangle"));
segmentTool.addEventListener("click", () => setTool("segment"));
$("#add-rectangle-button").addEventListener("click", () => {
  if (state.phase !== "authoring" || state.authored.length >= 12) return;
  state.authored.push({
    id: "",
    kind: "rectangle",
    x: 0.1,
    y: 0.1,
    width: 0.6,
    height: 0.7,
  });
  renumberAuthoredIds();
  render();
});
$("#add-segment-button").addEventListener("click", () => {
  if (state.phase !== "authoring" || state.authored.length >= 12) return;
  state.authored.push({
    id: "",
    kind: "segment",
    start: { x: 0.1, y: 0.25 },
    end: { x: 0.9, y: 0.25 },
  });
  renumberAuthoredIds();
  render();
});
$("#original-button").addEventListener("click", () => setGuidesVisible(false));
$("#guides-button").addEventListener("click", () => setGuidesVisible(true));

imagePlane.addEventListener("pointerdown", (event) => {
  if (state.phase !== "authoring" || state.authored.length >= 12) return;
  state.pointerStart = normalizedPointer(event);
  imagePlane.setPointerCapture(event.pointerId);
});
imagePlane.addEventListener("pointerup", (event) => {
  if (state.pointerStart === null || state.phase !== "authoring") return;
  const end = normalizedPointer(event);
  const start = state.pointerStart;
  state.pointerStart = null;
  const candidate = state.tool === "rectangle"
    ? rectangleFromPoints(start, end)
    : segmentFromPoints(start, end);
  if (candidate === null) {
    setupStatus.textContent = "Le tracé doit avoir une longueur ou une surface non nulle.";
    return;
  }
  state.authored.push(candidate);
  renumberAuthoredIds();
  render();
});

prepareButton.addEventListener("click", async () => {
  if (
    state.phase !== "authoring"
    || state.image === null
    || state.dimensions === null
    || state.sourceIdentity === null
    || goalInput.value === ""
  ) return;
  setBusy(true);
  setupStatus.textContent = "Validation et liaison exacte de la revue…";
  try {
    const draft = await postJson("/api/manual-draft", {
      browserSessionId: state.browserSessionId,
      previousLabSessionId: state.draft?.labSessionId ?? null,
      sourceImageContentIdentity: state.sourceIdentity,
      sourceImageMediaType: state.image.type,
      sourcePixelWidth: state.dimensions.width,
      sourcePixelHeight: state.dimensions.height,
      goalId: goalInput.value,
      candidates: state.authored,
    });
    state.draft = draft;
    state.candidates = structuredClone(draft.candidates);
    state.selectedCandidateIds = new Set();
    state.measurementCandidateIds = [null, null];
    state.phase = "review";
    confirmationInput.checked = false;
    receiptSection.hidden = true;
    setupStatus.textContent =
      "Revue liée prête. Les octets de l’image ne quittent pas ce navigateur.";
    render();
  } catch (error) {
    setupStatus.textContent = error instanceof Error ? error.message : "Revue refusée.";
  } finally {
    setBusy(false);
  }
});

[measurementFirst, measurementSecond].forEach((select, index) => {
  select.addEventListener("change", () => {
    state.measurementCandidateIds[index] = select.value || null;
    invalidateConfirmation();
  });
});
confirmationInput.addEventListener("change", updateCoreAvailability);

runButton.addEventListener("click", async () => {
  if (state.phase !== "review" || state.draft === null || !confirmationInput.checked) return;
  state.confirmationInFlight = true;
  state.phase = "confirming";
  render();
  coreGate.textContent = "Confirmation reçue. Exécution déterministe unique…";
  try {
    const payload = createPrivateWebLabConfirmationPayloadV1({
      explicitConfirmation: true,
      browserSessionId: state.browserSessionId,
      draft: state.draft,
      selectedCandidateIds: state.selectedCandidateIds,
      reviewedCandidates: state.candidates,
      measurementCandidateIds: currentMeasurementCandidateIds(),
    });
    const receipt = await postJson("/api/manual-confirm", {
      ...payload,
      perceptionReceiptIdentity: state.draft.perceptionReceiptIdentity,
    });
    state.coreExecutionCount += 1;
    state.phase = "completed";
    receiptIdentity.textContent = receipt.receiptIdentity;
    resultIdentity.textContent = receipt.canonicalResultIdentity;
    packRefs.textContent = receipt.ratioPackRefs.join(", ");
    renderMeasurementReceipt(receipt.declaredMeasurementRatioReport);
    if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
    state.receiptUrl = URL.createObjectURL(
      new Blob([receipt.exportJson], { type: "application/json" }),
    );
    exportLink.href = state.receiptUrl;
    exportLink.download = receipt.exportFileName;
    receiptSection.hidden = false;
    coreGate.textContent = "Core exécuté exactement une fois après confirmation explicite.";
    render();
  } catch (error) {
    state.phase = "review";
    coreGate.textContent = error instanceof Error ? error.message : "Confirmation refusée.";
    render();
  } finally {
    state.confirmationInFlight = false;
  }
});

newMeasurementButton.addEventListener("click", async () => {
  if (state.draft === null || state.phase !== "completed") return;
  newMeasurementButton.disabled = true;
  try {
    await postJson("/api/new-measurement", {
      browserSessionId: state.browserSessionId,
      labSessionId: state.draft.labSessionId,
    });
  } catch (error) {
    setupStatus.textContent =
      error instanceof Error ? error.message : "Nouvelle mesure refusée.";
    newMeasurementButton.disabled = false;
    return;
  }
  state.phase = "authoring";
  state.draft = null;
  state.authored = [];
  state.candidates = [];
  state.selectedCandidateIds = new Set();
  state.measurementCandidateIds = [null, null];
  confirmationInput.checked = false;
  receiptSection.hidden = true;
  if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
  state.receiptUrl = null;
  setupStatus.textContent =
    `Nouvelle mesure prête; image conservée. Exécutions Core: ${String(state.coreExecutionCount)}.`;
  newMeasurementButton.disabled = false;
  render();
});

function render() {
  const authoring = state.phase === "authoring";
  const locked = state.phase === "confirming" || state.phase === "completed";
  authoringToolbar.hidden = !authoring;
  prepareButton.hidden = !authoring;
  prepareButton.disabled =
    !authoring || state.authored.length === 0 || goalInput.value === "";
  phaseDescription.textContent = authoring
    ? "Dessinez vos propres cadres et segments. Aucun guide n’est inféré ou détecté."
    : "Liste liée au serveur: nombre, ordre, identités, métadonnées et types sont figés.";
  const candidates = authoring ? authoredDisplayCandidates() : state.candidates;
  candidateList.replaceChildren(
    ...candidates.map((candidate, index) => candidateCard(candidate, index, authoring, locked)),
  );
  renderOverlay(candidates, authoring);
  renderMeasurementSelection();
  confirmationInput.disabled = state.phase !== "review";
  if (authoring) {
    guideMode.textContent = `${String(candidates.length)} candidat(s) manuel(s), maximum 12.`;
    coreGate.textContent = "Core arrêté — préparez puis confirmez une revue liée.";
  } else if (state.phase === "completed") {
    guideMode.textContent = `${String(candidates.length)} candidat(s) verrouillé(s).`;
  } else {
    guideMode.textContent = `${String(candidates.length)} candidat(s) liés; sélection explicite requise.`;
  }
  updateAvailability();
  updateCoreAvailability();
}

function candidateCard(candidate, index, authoring, locked) {
  const article = document.createElement("article");
  article.className = "candidate";
  article.dataset.candidateId = candidate.id;
  const header = document.createElement("label");
  if (!authoring) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedCandidateIds.has(candidate.id);
    checkbox.disabled = locked;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedCandidateIds.add(candidate.id);
      else state.selectedCandidateIds.delete(candidate.id);
      invalidateConfirmation();
      render();
    });
    header.append(checkbox);
  }
  const title = document.createElement("strong");
  title.textContent = authoring
    ? `${String(index + 1)}. ${candidate.kind === "rectangle" ? "Cadre manuel" : "Segment manuel"}`
    : `${String(index + 1)}. ${candidate.label}`;
  header.append(title);
  article.append(header);
  const controls = document.createElement("div");
  controls.className = "candidate-controls";
  const fields = geometryFields(candidate, authoring);
  for (const field of fields) {
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "1";
    input.step = "0.001";
    input.value = String(valueAt(candidate, field.path));
    input.disabled = locked;
    input.addEventListener("change", () => {
      if (authoring) {
        setValueAt(state.authored[index], field.path, boundedNumber(input.value));
      } else {
        state.candidates[index] = updatePrivateWebLabCandidateGeometryV1(
          state.candidates[index],
          field.path,
          input.value,
        );
        invalidateConfirmation();
      }
      render();
    });
    label.append(input);
    controls.append(label);
  }
  article.append(controls);
  if (authoring) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Supprimer";
    remove.addEventListener("click", () => {
      state.authored.splice(index, 1);
      renumberAuthoredIds();
      render();
    });
    article.append(remove);
  }
  return article;
}

function geometryFields(candidate, authoring) {
  const kind = authoring ? candidate.kind : candidate.primitive?.kind ?? "rectangle";
  if (kind === "rectangle") {
    return ["x", "y", "width", "height"].map((path) => ({ label: path, path }));
  }
  const prefix = authoring ? "" : "primitive.";
  return [
    { label: "start x", path: `${prefix}start.x` },
    { label: "start y", path: `${prefix}start.y` },
    { label: "end x", path: `${prefix}end.x` },
    { label: "end y", path: `${prefix}end.y` },
  ];
}

function authoredDisplayCandidates() {
  return state.authored;
}

function renderOverlay(candidates, authoring) {
  const visible = authoring
    ? candidates
    : candidates.filter(({ id }) => state.selectedCandidateIds.has(id));
  guideOverlay.replaceChildren(...visible.map((candidate) => guideElement(candidate, authoring)));
}

function guideElement(candidate, authoring) {
  const namespace = "http://www.w3.org/2000/svg";
  const kind = authoring ? candidate.kind : candidate.primitive?.kind ?? "rectangle";
  if (kind === "rectangle") {
    const element = document.createElementNS(namespace, "rect");
    for (const field of ["x", "y", "width", "height"]) {
      element.setAttribute(field, String(candidate[field] * 1000));
    }
    styleGuide(element);
    return element;
  }
  const primitive = authoring ? candidate : candidate.primitive;
  const element = document.createElementNS(namespace, "line");
  element.setAttribute("x1", String(primitive.start.x * 1000));
  element.setAttribute("y1", String(primitive.start.y * 1000));
  element.setAttribute("x2", String(primitive.end.x * 1000));
  element.setAttribute("y2", String(primitive.end.y * 1000));
  styleGuide(element);
  return element;
}

function styleGuide(element) {
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", "#c7ff4a");
  element.setAttribute("stroke-width", "6");
  element.setAttribute("vector-effect", "non-scaling-stroke");
}

function renderMeasurementSelection() {
  const enabled = state.draft?.goal.id === "compare-two-lengths" && state.phase !== "authoring";
  measurementSection.hidden = !enabled;
  if (!enabled) return;
  const available = privateWebLabMeasurementLengthCandidatesV1(
    state.selectedCandidateIds,
    state.candidates,
  );
  const availableIds = new Set(available.map(({ id }) => id));
  state.measurementCandidateIds = state.measurementCandidateIds.map(
    (id) => id !== null && availableIds.has(id) ? id : null,
  );
  [measurementFirst, measurementSecond].forEach((select, index) => {
    const placeholder = new Option("Choisir une longueur…", "");
    const options = available.map(
      ({ id, label }) => new Option(label, id),
    );
    select.replaceChildren(placeholder, ...options);
    select.value = state.measurementCandidateIds[index] ?? "";
    select.disabled = state.phase !== "review";
  });
}

function updateCoreAvailability() {
  const canRun = state.phase === "review" && state.draft !== null
    && canRunPrivateWebLabCoreV1(
      confirmationInput.checked,
      state.selectedCandidateIds,
      state.candidates,
      state.draft.goal.id,
      currentMeasurementCandidateIds(),
    );
  runButton.disabled = !canRun;
  if (state.phase === "review") {
    coreGate.textContent = !confirmationInput.checked
      ? "Core arrêté — confirmation explicite requise."
      : canRun
        ? "Confirmation explicite prête — Core n’a pas encore été lancé."
        : "Core arrêté — sélectionnez un cadre et deux segments distincts si requis.";
  }
}

function invalidateConfirmation() {
  confirmationInput.checked = false;
  receiptSection.hidden = true;
  updateCoreAvailability();
}

function currentMeasurementCandidateIds() {
  return state.draft?.goal.id === "compare-two-lengths"
    ? [...state.measurementCandidateIds]
    : null;
}

function setTool(tool) {
  state.tool = tool;
  rectangleTool.setAttribute("aria-pressed", String(tool === "rectangle"));
  segmentTool.setAttribute("aria-pressed", String(tool === "segment"));
}

function normalizedPointer(event) {
  const bounds = imagePlane.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  };
}

function rectangleFromPoints(start, end) {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 0.001 || height < 0.001) return null;
  return {
    id: "",
    kind: "rectangle",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width,
    height,
  };
}

function segmentFromPoints(start, end) {
  if (Math.hypot(end.x - start.x, end.y - start.y) < 0.001) return null;
  return { id: "", kind: "segment", start, end };
}

function renumberAuthoredIds() {
  let rectangle = 0;
  let segment = 0;
  state.authored.forEach((candidate) => {
    if (candidate.kind === "rectangle") {
      rectangle += 1;
      candidate.id = `manual-rectangle-${String(rectangle)}`;
    } else {
      segment += 1;
      candidate.id = `manual-segment-${String(segment)}`;
    }
  });
}

function valueAt(value, path) {
  return path.split(".").reduce((current, key) => current[key], value);
}

function setValueAt(value, path, next) {
  const keys = path.split(".");
  const leaf = keys.pop();
  const owner = keys.reduce((current, key) => current[key], value);
  owner[leaf] = next;
}

function boundedNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number) : 0;
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function setBusy(busy) {
  const setupLocked = busy || (state.phase !== "empty" && state.phase !== "authoring");
  imageInput.disabled = setupLocked;
  goalInput.disabled = setupLocked;
  prepareButton.disabled = busy || state.phase !== "authoring";
}

function updateAvailability() {
  if (state.phase === "empty") {
    setupStatus.textContent = "Chargez une image et choisissez un objectif.";
  } else if (state.phase === "authoring" && state.authored.length === 0) {
    setupStatus.textContent = "Tracez au moins un cadre ou segment manuel.";
  }
  prepareButton.disabled =
    state.phase !== "authoring" || state.authored.length === 0 || goalInput.value === "";
  const setupLocked = state.phase !== "empty" && state.phase !== "authoring";
  imageInput.disabled = setupLocked;
  goalInput.disabled = setupLocked;
}

function setGuidesVisible(visible) {
  guideOverlay.toggleAttribute("hidden", !visible);
  $("#guides-button").setAttribute("aria-pressed", String(visible));
  $("#original-button").setAttribute("aria-pressed", String(!visible));
}

function clearImage() {
  if (state.objectUrl !== null) URL.revokeObjectURL(state.objectUrl);
  state.image = null;
  state.dimensions = null;
  state.sourceIdentity = null;
  state.objectUrl = null;
  state.phase = "empty";
  state.authored = [];
  state.draft = null;
  state.candidates = [];
  state.selectedCandidateIds = new Set();
  reviewSection.hidden = true;
  receiptSection.hidden = true;
}

function renderMeasurementReceipt(report) {
  if (report === undefined) {
    measurementReportRow.hidden = true;
    return;
  }
  const [first, second] = report.measurements;
  measurementReport.textContent =
    `${first.candidateLabel}: ${String(first.lengthPixels)} px · `
    + `${second.candidateLabel}: ${String(second.lengthPixels)} px`;
  measurementReportRow.hidden = false;
}

function readBrowserSessionId() {
  const storageKey = "norma.private-web-lab.browser-session@1";
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing !== null && /^browser:[A-Za-z0-9:_-]{8,160}$/u.test(existing)) return existing;
    const created = `browser:${crypto.randomUUID()}`;
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `browser:${crypto.randomUUID()}`;
  }
}

async function readImageDimensions(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (image.naturalWidth < 1 || image.naturalHeight < 1) throw new Error("Image invalide.");
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

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message ?? value.error ?? "Requête locale refusée.");
  return value;
}
