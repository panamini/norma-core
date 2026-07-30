import {
  canRunPrivateWebLabCoreV1,
  createPrivateWebLabAdvancedSpatialExpressionV1,
  createPrivateWebLabDeclaredSpatialMeasurementPlanV1,
  createPrivateWebLabConfirmationPayloadV1,
  presentPrivateWebLabDeclaredSpatialMeasurementConfirmationV1,
  presentPrivateWebLabMeasurementReportV1,
  privateWebLabSpatialCandidateSelectionV1,
  privateWebLabSpatialExpressionOptionV1,
  privateWebLabSpatialPickerV1,
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
  measurementExpressions: [null, null],
  declaredSpatialMeasurementPlan: null,
  planRevision: 0,
  planBuildInFlight: false,
  confirmationInFlight: false,
  coreExecutionCount: 0,
  receiptUrl: null,
  pointerStart: null,
  interaction: null,
  activeCandidateId: null,
  view: { zoom: 1, panX: 0, panY: 0 },
  imageRevision: 0,
  preparationRevision: 0,
  preparationInFlight: false,
  sessionResetInFlight: false,
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
const panTool = $("#pan-tool");
const addRectangleButton = $("#add-rectangle-button");
const addSegmentButton = $("#add-segment-button");
const measurementCandidateStatus = $("#measurement-candidate-status");
const measurementSection = $("#measurement-section");
const measurementFirst = $("#measurement-first");
const measurementSecond = $("#measurement-second");
const measurementSelects = [measurementFirst, measurementSecond];
const measurementSummaries = [
  $("#measurement-first-summary"),
  $("#measurement-second-summary"),
];
const measurementFamilies = [
  $("#measurement-first-family"),
  $("#measurement-second-family"),
];
const measurementAdvancedFields = [
  $("#measurement-first-fields"),
  $("#measurement-second-fields"),
];
const measurementApplyButtons = [
  $("#measurement-first-apply"),
  $("#measurement-second-apply"),
];
const measurementBuilderStatuses = [
  $("#measurement-first-builder-status"),
  $("#measurement-second-builder-status"),
];
const measurementPlanStatus = $("#measurement-plan-status");
const confirmationInput = $("#confirmation-input");
const runButton = $("#run-button");
const coreGate = $("#core-gate");
const receiptSection = $("#receipt-section");
const guideMode = $("#guide-mode");
const receiptIdentity = $("#receipt-identity");
const resultIdentity = $("#result-identity");
const packRefs = $("#pack-refs");
const measurementSummary = $("#measurement-summary");
const measurementSummaryUnavailable = $("#measurement-summary-unavailable");
const measurementRatio = $("#measurement-ratio");
const measurementLongShort = $("#measurement-long-short");
const measurementVerdict = $("#measurement-verdict");
const measurementFirstResult = $("#measurement-first-result");
const measurementSecondResult = $("#measurement-second-result");
const measurementTolerance = $("#measurement-tolerance");
const measurementReportRow = $("#measurement-report-row");
const measurementReport = $("#measurement-report");
const exportLink = $("#export-link");
const newMeasurementButton = $("#new-measurement-button");
const changeGoalButton = $("#change-goal-button");
const imagePlaneResizeObserver = new ResizeObserver(reconcileViewAfterResize);
const authoredCandidateViewKeys = new WeakMap();
let nextAuthoredCandidateViewKey = 0;
imagePlaneResizeObserver.observe(imagePlane);

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
panTool.addEventListener("click", () => {
  setTool(state.tool === "pan" ? defaultEditingTool() : "pan");
});
$("#zoom-out-button").addEventListener("click", () => setZoom(state.view.zoom - 0.5));
$("#zoom-reset-button").addEventListener("click", resetView);
$("#zoom-in-button").addEventListener("click", () => setZoom(state.view.zoom + 0.5));
addRectangleButton.addEventListener("click", () => {
  if (
    state.phase !== "authoring"
    || state.preparationInFlight
    || state.authored.length >= 12
  ) return;
  state.authored.push({
    id: "",
    kind: "rectangle",
    x: 0.1,
    y: 0.1,
    width: 0.6,
    height: 0.7,
  });
  renumberAuthoredIds();
  state.activeCandidateId = state.authored.at(-1).id;
  render();
});
addSegmentButton.addEventListener("click", () => {
  if (
    state.phase !== "authoring"
    || state.preparationInFlight
    || state.authored.length >= 12
  ) return;
  state.authored.push({
    id: "",
    kind: "segment",
    start: { x: 0.1, y: 0.25 },
    end: { x: 0.9, y: 0.25 },
  });
  renumberAuthoredIds();
  state.activeCandidateId = state.authored.at(-1).id;
  render();
});
$("#original-button").addEventListener("click", () => setGuidesVisible(false));
$("#guides-button").addEventListener("click", () => setGuidesVisible(true));

imagePlane.addEventListener("pointerdown", (event) => {
  if (state.preparationInFlight || state.phase === "confirming") return;
  if (state.tool === "pan") {
    if (state.view.zoom > 1) beginPan(event);
    return;
  }
  if (state.phase === "completed") return;
  const handle = event.target.closest?.(".candidate-handle, .candidate-handle-hit");
  if (handle !== null && handle !== undefined) {
    const candidate = editableCandidates().find(({ id }) => id === handle.dataset.candidateId);
    if (candidate === undefined) return;
    if (isReviewPhase()) invalidateConfirmation();
    state.activeCandidateId = candidate.id;
    state.interaction = {
      type: "geometry",
      candidateId: candidate.id,
      handle: handle.dataset.handle,
      original: structuredClone(candidate),
      pointerId: event.pointerId,
    };
    imagePlane.dataset.dragging = "true";
    imagePlane.setPointerCapture(event.pointerId);
    render();
    return;
  }
  const guide = event.target.closest?.(".candidate-guide");
  if (guide !== null && guide !== undefined) {
    state.activeCandidateId = guide.dataset.candidateId;
    render();
    return;
  }
  if (
    state.phase !== "authoring"
    || state.preparationInFlight
    || state.authored.length >= 12
    || state.tool === "pan"
  ) return;
  state.pointerStart = {
    pointerId: event.pointerId,
    point: normalizedPointer(event),
  };
  imagePlane.setPointerCapture(event.pointerId);
});
imagePlane.addEventListener("pointermove", (event) => {
  if (state.interaction !== null && state.interaction.pointerId !== event.pointerId) return;
  if (state.interaction?.type === "pan") {
    setPan(
      state.interaction.panX + event.clientX - state.interaction.clientX,
      state.interaction.panY + event.clientY - state.interaction.clientY,
    );
    return;
  }
  if (state.preparationInFlight) return;
  if (state.interaction?.type !== "geometry") return;
  updateGeometryFromHandle(
    state.interaction.candidateId,
    state.interaction.handle,
    state.interaction.original,
    normalizedPointer(event),
  );
});
imagePlane.addEventListener("pointerup", (event) => {
  if (state.interaction !== null) {
    if (state.interaction.pointerId !== event.pointerId) return;
    const changedGeometry = state.interaction.type === "geometry";
    state.interaction = null;
    imagePlane.dataset.dragging = "false";
    if (changedGeometry) invalidateConfirmation();
    render();
    return;
  }
  if (
    state.pointerStart === null
    || state.pointerStart.pointerId !== event.pointerId
    || state.phase !== "authoring"
  ) return;
  const end = normalizedPointer(event);
  const start = state.pointerStart.point;
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
  state.activeCandidateId = state.authored.at(-1).id;
  render();
});
imagePlane.addEventListener("pointercancel", (event) => {
  if (state.interaction !== null && state.interaction.pointerId !== event.pointerId) return;
  if (state.pointerStart !== null && state.pointerStart.pointerId !== event.pointerId) return;
  const changedGeometry = state.interaction?.type === "geometry";
  state.pointerStart = null;
  state.interaction = null;
  imagePlane.dataset.dragging = "false";
  if (changedGeometry) invalidateConfirmation();
  render();
});

prepareButton.addEventListener("click", async () => {
  if (
    state.phase !== "authoring"
    || state.image === null
    || state.dimensions === null
    || state.sourceIdentity === null
    || goalInput.value === ""
    || !canPrepareAuthoredReview()
  ) return;
  const preparationRevision = state.preparationRevision + 1;
  const imageRevision = state.imageRevision;
  state.preparationRevision = preparationRevision;
  state.preparationInFlight = true;
  render();
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
    if (
      state.preparationRevision !== preparationRevision
      || state.imageRevision !== imageRevision
    ) return;
    state.draft = draft;
    state.candidates = structuredClone(draft.candidates);
    state.selectedCandidateIds = new Set();
    state.measurementExpressions = [null, null];
    state.declaredSpatialMeasurementPlan = null;
    state.planRevision += 1;
    state.planBuildInFlight = false;
    state.activeCandidateId = null;
    state.phase = "review";
    setTool("edit");
    confirmationInput.checked = false;
    receiptSection.hidden = true;
    setupStatus.textContent =
      "Revue liée prête. Les octets de l’image ne quittent pas ce navigateur.";
    render();
  } catch (error) {
    if (state.preparationRevision !== preparationRevision) return;
    setupStatus.textContent = error instanceof Error ? error.message : "Revue refusée.";
  } finally {
    if (state.preparationRevision === preparationRevision) {
      state.preparationInFlight = false;
      render();
    }
  }
});

measurementSelects.forEach((select, index) => {
  select.addEventListener("change", () => {
    let expression = null;
    try {
      if (select.value !== "") {
        expression = privateWebLabSpatialExpressionOptionV1(
          JSON.parse(select.value),
          state.selectedCandidateIds,
          state.candidates,
          state.draft?.sourcePixelWidth,
          state.draft?.sourcePixelHeight,
        ).expression;
      }
    } catch {
      expression = null;
    }
    state.measurementExpressions[index] = expression;
    invalidateConfirmation();
    render();
  });
});
measurementFamilies.forEach((select, index) => {
  select.addEventListener("change", () => {
    measurementBuilderStatuses[index].textContent = "";
    renderAdvancedMeasurementFields(index, currentSpatialPicker());
  });
});
measurementApplyButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    try {
      const option = createPrivateWebLabAdvancedSpatialExpressionV1(
        readAdvancedMeasurementBuilder(index),
        state.selectedCandidateIds,
        state.candidates,
        state.draft?.sourcePixelWidth,
        state.draft?.sourcePixelHeight,
      );
      state.measurementExpressions[index] = option.expression;
      measurementBuilderStatuses[index].textContent = "";
      invalidateConfirmation();
      render();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Cette mesure avancée est invalide.";
      state.measurementExpressions[index] = null;
      invalidateConfirmation();
      render();
      measurementBuilderStatuses[index].textContent = message;
    }
  });
});
confirmationInput.addEventListener("change", updateCoreAvailability);

runButton.addEventListener("click", async () => {
  const declaredSpatialMode = state.draft?.goal.id === "compare-two-lengths";
  if (
    !isReviewPhase()
    || state.draft === null
    || (declaredSpatialMode && (
      state.phase !== "ready_to_confirm"
      || state.declaredSpatialMeasurementPlan === null
    ))
    || !confirmationInput.checked
    || state.sessionResetInFlight
    || state.confirmationInFlight
  ) return;
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
      measurementCandidateIds: null,
      declaredSpatialMeasurementPlan: state.declaredSpatialMeasurementPlan,
    });
    const receipt = await postJson("/api/manual-confirm", {
      ...payload,
      perceptionReceiptIdentity: state.draft.perceptionReceiptIdentity,
    });
    state.coreExecutionCount += 1;
    state.phase = "completed";
    setTool("edit");
    receiptIdentity.textContent = receipt.receiptIdentity;
    const spatialConfirmation = receipt.declaredSpatialMeasurementConfirmation;
    resultIdentity.textContent = spatialConfirmation?.confirmationIdentity
      ?? receipt.canonicalResultIdentity;
    packRefs.textContent = (
      spatialConfirmation?.ratioPackRefs
      ?? receipt.ratioPackRefs
    ).join(", ");
    renderMeasurementReceipt(
      receipt.declaredMeasurementRatioReport,
      spatialConfirmation,
    );
    if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
    state.receiptUrl = URL.createObjectURL(
      new Blob([receipt.exportJson], { type: "application/json" }),
    );
    exportLink.href = state.receiptUrl;
    exportLink.download = receipt.exportFileName;
    receiptSection.hidden = false;
    coreGate.textContent = "Core exécuté exactement une fois après confirmation explicite.";
    render();
    receiptSection.focus({ preventScroll: true });
    receiptSection.scrollIntoView({ block: "start", behavior: "auto" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirmation refusée.";
    if (/missing or expired/iu.test(message)) {
      returnExpiredReviewToAuthoring();
      setupStatus.textContent =
        "La revue a expiré. Vérifiez les candidats puis préparez une nouvelle revue.";
      coreGate.textContent = "Core arrêté — la revue expirée a été effacée.";
    } else {
      state.phase = state.declaredSpatialMeasurementPlan === null
        ? "review"
        : "ready_to_confirm";
      coreGate.textContent = message;
    }
    render();
  } finally {
    state.confirmationInFlight = false;
    render();
  }
});

newMeasurementButton.addEventListener("click", async () => {
  if (state.draft === null || state.phase !== "completed") return;
  newMeasurementButton.disabled = true;
  try {
    await postJson("/api/new-measurement", {
      browserSessionId: state.browserSessionId,
      expectedSessionState: "completed",
      labSessionId: state.draft.labSessionId,
    });
  } catch (error) {
    setupStatus.textContent =
      error instanceof Error ? error.message : "Nouvelle mesure refusée.";
    newMeasurementButton.disabled = false;
    return;
  }
  returnLinkedReviewToAuthoring({ preserveAuthored: false });
  resetView();
  setupStatus.textContent =
    `Nouvelle mesure prête; image conservée. Exécutions Core: ${String(state.coreExecutionCount)}.`;
  newMeasurementButton.disabled = false;
  render();
});

changeGoalButton.addEventListener("click", async () => {
  if (state.draft === null || !isReviewPhase() || state.sessionResetInFlight) return;
  state.sessionResetInFlight = true;
  render();
  try {
    await postJson("/api/new-measurement", {
      browserSessionId: state.browserSessionId,
      expectedSessionState: "review",
      labSessionId: state.draft.labSessionId,
    });
    returnLinkedReviewToAuthoring({ preserveAuthored: true });
    setupStatus.textContent =
      "Objectif modifiable; image et tracés manuels conservés. Core n’a pas été lancé.";
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Réinitialisation de la revue refusée.";
    if (isMissingPrivateWebLabSessionError(message)) {
      returnLinkedReviewToAuthoring({ preserveAuthored: true });
      setupStatus.textContent =
        "Session déjà expirée; objectif modifiable, image et tracés manuels conservés.";
      coreGate.textContent = "Core arrêté — la session absente a été effacée localement.";
    } else {
      setupStatus.textContent = message;
    }
  } finally {
    state.sessionResetInFlight = false;
    render();
  }
});

resetView();
setTool("rectangle");

function render({ refreshMeasurementSelection = true } = {}) {
  const candidatePrecisionView = captureCandidatePrecisionView();
  const authoring = state.phase === "authoring";
  reviewSection.dataset.phase = state.phase;
  const locked = state.preparationInFlight
    || state.sessionResetInFlight
    || state.phase === "confirming"
    || state.phase === "completed";
  authoringToolbar.hidden = state.phase === "empty";
  rectangleTool.hidden = !authoring;
  segmentTool.hidden = !authoring;
  addRectangleButton.hidden = !authoring;
  addSegmentButton.hidden = !authoring;
  prepareButton.hidden = !authoring;
  changeGoalButton.hidden = !isReviewPhase();
  changeGoalButton.disabled = !isReviewPhase() || state.sessionResetInFlight;
  prepareButton.disabled =
    !authoring || state.preparationInFlight || !canPrepareAuthoredReview();
  phaseDescription.textContent = authoring
    ? "Dessinez vos propres cadres et segments. Aucun guide n’est inféré ou détecté."
    : "Liste liée au serveur: nombre, ordre, identités, métadonnées et types sont figés.";
  const candidates = authoring ? authoredDisplayCandidates() : state.candidates;
  renderMeasurementCandidateStatus(authoring);
  candidateList.replaceChildren(
    ...candidates.map((candidate, index) => candidateCard(candidate, index, authoring, locked)),
  );
  restoreCandidatePrecisionView(candidatePrecisionView);
  renderOverlay(candidates, authoring);
  if (refreshMeasurementSelection) renderMeasurementSelection();
  const declaredSpatialMode = state.draft?.goal.id === "compare-two-lengths";
  confirmationInput.disabled = !isReviewPhase()
    || (declaredSpatialMode && state.phase !== "ready_to_confirm")
    || state.sessionResetInFlight
    || state.confirmationInFlight;
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
  updateGestureAvailability();
}

function captureCandidatePrecisionView() {
  const openCandidateViewKeys = new Set();
  for (const article of candidateList.querySelectorAll(".candidate")) {
    if (article.querySelector("details.candidate-precision")?.open) {
      openCandidateViewKeys.add(article.dataset.candidateViewKey);
    }
  }
  const focusedElement = document.activeElement;
  const focusedCandidate = focusedElement?.closest?.(".candidate");
  return {
    openCandidateViewKeys,
    focusedCandidateViewKey: focusedCandidate?.dataset.candidateViewKey ?? null,
    focusedGeometryPath: focusedElement?.dataset.geometryPath ?? null,
  };
}

function restoreCandidatePrecisionView({
  openCandidateViewKeys,
  focusedCandidateViewKey,
  focusedGeometryPath,
}) {
  let focusedInput = null;
  for (const article of candidateList.querySelectorAll(".candidate")) {
    const precision = article.querySelector("details.candidate-precision");
    if (precision !== null) {
      precision.open = openCandidateViewKeys.has(article.dataset.candidateViewKey);
    }
    if (article.dataset.candidateViewKey !== focusedCandidateViewKey) continue;
    focusedInput = [...article.querySelectorAll("input[data-geometry-path]")].find(
      ({ dataset }) => dataset.geometryPath === focusedGeometryPath,
    ) ?? null;
  }
  focusedInput?.focus();
}

function candidateCard(candidate, index, authoring, locked) {
  const article = document.createElement("article");
  article.className = "candidate";
  article.dataset.candidateId = candidate.id;
  article.dataset.candidateViewKey = candidateViewKey(candidate, authoring);
  article.dataset.active = String(candidate.id === state.activeCandidateId);
  article.addEventListener("click", (event) => {
    if (
      event.target.closest("input, button")
      || event.target.closest("details.candidate-precision")
      || (!authoring && event.target.closest("label"))
    ) return;
    state.activeCandidateId = candidate.id;
    render();
  });
  const header = document.createElement("label");
  if (!authoring) {
    const checkbox = document.createElement("input");
    const declaredSpatialMode = isDeclaredSpatialReviewMode();
    const selection = currentSpatialCandidateSelection();
    const candidateSelection = selection.candidates.find(
      ({ candidateId }) => candidateId === candidate.id,
    );
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedCandidateIds.has(candidate.id);
    checkbox.disabled = locked
      || (declaredSpatialMode && candidateSelection?.selectable !== true);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedCandidateIds.add(candidate.id);
      else state.selectedCandidateIds.delete(candidate.id);
      if (checkbox.checked) state.activeCandidateId = candidate.id;
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
  const summary = document.createElement("p");
  summary.className = "candidate-summary";
  summary.textContent = candidateGeometrySummary(candidate, authoring);
  article.append(summary);
  if (!authoring && isDeclaredSpatialReviewMode()) {
    const candidateSelection = currentSpatialCandidateSelection().candidates.find(
      ({ candidateId }) => candidateId === candidate.id,
    );
    const note = document.createElement("p");
    note.className = "candidate-selection-note";
    note.id = `candidate-selection-note-${String(index)}`;
    if (candidateSelection?.reason === "segments-do-not-replace-rectangles") {
      note.textContent =
        "Non sélectionnable pour cet objectif : un segment ne remplace pas un cadre.";
    } else if (candidateSelection?.reason === "two-rectangles-already-selected") {
      note.textContent =
        "Deux cadres sont déjà sélectionnés. Désélectionnez-en un pour choisir celui-ci.";
    }
    if (note.textContent !== "") {
      header.querySelector("input")?.setAttribute("aria-describedby", note.id);
      article.append(note);
    }
  }
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
    input.step = "any";
    input.value = String(valueAt(candidate, field.path));
    input.dataset.geometryPath = field.path;
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
  const precision = document.createElement("details");
  precision.className = "candidate-precision";
  const precisionSummary = document.createElement("summary");
  precisionSummary.textContent = "Ajuster précisément";
  precision.append(precisionSummary, controls);
  article.append(precision);
  if (authoring) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Supprimer";
    remove.disabled = locked;
    remove.addEventListener("click", () => {
      if (state.preparationInFlight) return;
      const activeCandidate = state.authored.find(
        ({ id }) => id === state.activeCandidateId,
      );
      state.authored.splice(index, 1);
      renumberAuthoredIds();
      state.activeCandidateId = activeCandidate !== undefined
        && state.authored.includes(activeCandidate)
        ? activeCandidate.id
        : null;
      render();
    });
    article.append(remove);
  }
  return article;
}

function candidateViewKey(candidate, authoring) {
  if (!authoring) return candidate.id;
  let key = authoredCandidateViewKeys.get(candidate);
  if (key === undefined) {
    nextAuthoredCandidateViewKey += 1;
    key = `authored-${String(nextAuthoredCandidateViewKey)}`;
    authoredCandidateViewKeys.set(candidate, key);
  }
  return key;
}

function isDeclaredSpatialReviewMode() {
  return state.draft?.goal.id === "compare-two-lengths"
    && state.phase !== "authoring"
    && state.phase !== "empty";
}

function currentSpatialCandidateSelection() {
  return privateWebLabSpatialCandidateSelectionV1(
    state.selectedCandidateIds,
    state.candidates,
  );
}

function renderMeasurementCandidateStatus(authoring) {
  const visible = !authoring && state.draft?.goal.id === "compare-two-lengths";
  measurementCandidateStatus.hidden = !visible;
  if (!visible) return;
  const count = currentSpatialCandidateSelection().selectedRectangleCount;
  measurementCandidateStatus.textContent = `Cadres sélectionnés : ${String(count)}/2. `
    + (count < 2
      ? "Choisissez deux cadres rectangulaires; les segments ne sont pas sélectionnables."
      : "Désélectionnez un cadre avant d’en choisir un autre.");
}

function candidateGeometrySummary(candidate, authoring) {
  const kind = authoring ? candidate.kind : candidate.primitive?.kind ?? "rectangle";
  if (kind === "rectangle") {
    return `Cadre rectangulaire · x ${String(candidate.x)} · y ${String(candidate.y)} · `
      + `largeur ${String(candidate.width)} · hauteur ${String(candidate.height)}`;
  }
  const primitive = authoring ? candidate : candidate.primitive;
  return `Segment · (${String(primitive.start.x)}, ${String(primitive.start.y)}) → `
    + `(${String(primitive.end.x)}, ${String(primitive.end.y)})`;
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
  guideOverlay.replaceChildren(
    ...visible.flatMap((candidate) => [
      guideElement(candidate, authoring),
      ...(candidate.id === state.activeCandidateId
        ? handleElements(candidate, authoring)
        : []),
    ]),
  );
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
    decorateGuide(element, candidate);
    return element;
  }
  const primitive = authoring ? candidate : candidate.primitive;
  const element = document.createElementNS(namespace, "line");
  element.setAttribute("x1", String(primitive.start.x * 1000));
  element.setAttribute("y1", String(primitive.start.y * 1000));
  element.setAttribute("x2", String(primitive.end.x * 1000));
  element.setAttribute("y2", String(primitive.end.y * 1000));
  styleGuide(element);
  decorateGuide(element, candidate);
  return element;
}

function styleGuide(element) {
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", "#c7ff4a");
  element.setAttribute("stroke-width", "3");
  element.setAttribute("vector-effect", "non-scaling-stroke");
}

function decorateGuide(element, candidate) {
  element.classList.add("candidate-guide");
  element.dataset.candidateId = candidate.id;
}

function handleElements(candidate, authoring) {
  const namespace = "http://www.w3.org/2000/svg";
  return candidateHandlePoints(candidate, authoring).flatMap(({ name, point }) => {
    const hitRadius = screenPixelsToViewBoxUnits(14);
    const visibleRadius = screenPixelsToViewBoxUnits(6);
    const hitTarget = document.createElementNS(namespace, "ellipse");
    hitTarget.classList.add("candidate-handle-hit");
    hitTarget.dataset.candidateId = candidate.id;
    hitTarget.dataset.handle = name;
    hitTarget.setAttribute("cx", String(point.x * 1000));
    hitTarget.setAttribute("cy", String(point.y * 1000));
    hitTarget.setAttribute("rx", String(hitRadius.x));
    hitTarget.setAttribute("ry", String(hitRadius.y));
    hitTarget.setAttribute("fill", "transparent");
    hitTarget.setAttribute("aria-hidden", "true");
    const handle = document.createElementNS(namespace, "ellipse");
    handle.classList.add("candidate-handle");
    handle.dataset.candidateId = candidate.id;
    handle.dataset.handle = name;
    handle.setAttribute("cx", String(point.x * 1000));
    handle.setAttribute("cy", String(point.y * 1000));
    handle.setAttribute("rx", String(visibleRadius.x));
    handle.setAttribute("ry", String(visibleRadius.y));
    handle.setAttribute("fill", "#0a0d0c");
    handle.setAttribute("stroke", "#c7ff4a");
    handle.setAttribute("stroke-width", "3");
    handle.setAttribute("vector-effect", "non-scaling-stroke");
    handle.setAttribute("aria-hidden", "true");
    return [hitTarget, handle];
  });
}

function candidateHandlePoints(candidate, authoring) {
  const kind = authoring ? candidate.kind : candidate.primitive?.kind ?? "rectangle";
  if (kind === "rectangle") {
    return [
      { name: "north-west", point: { x: candidate.x, y: candidate.y } },
      { name: "north-east", point: { x: candidate.x + candidate.width, y: candidate.y } },
      { name: "south-west", point: { x: candidate.x, y: candidate.y + candidate.height } },
      {
        name: "south-east",
        point: { x: candidate.x + candidate.width, y: candidate.y + candidate.height },
      },
    ];
  }
  const primitive = authoring ? candidate : candidate.primitive;
  return [
    { name: "start", point: primitive.start },
    { name: "end", point: primitive.end },
  ];
}

function renderMeasurementSelection() {
  const enabled = state.draft?.goal.id === "compare-two-lengths" && state.phase !== "authoring";
  measurementSection.hidden = !enabled;
  const picker = enabled ? currentSpatialPicker() : null;
  const selectedOptions = state.measurementExpressions.map((expression) => {
    if (expression === null || picker === null) return null;
    try {
      return privateWebLabSpatialExpressionOptionV1(
        expression,
        state.selectedCandidateIds,
        state.candidates,
        state.draft.sourcePixelWidth,
        state.draft.sourcePixelHeight,
      );
    } catch {
      return null;
    }
  });
  state.measurementExpressions = state.measurementExpressions.map(
    (expression, index) => selectedOptions[index] === null ? null : expression,
  );
  measurementSelects.forEach((select, index) => {
    const placeholder = new Option("Choisir une mesure…", "");
    const options = (picker?.common ?? []).map(({ value, label, available }) => {
      const option = new Option(label, value);
      option.disabled = available === false;
      return option;
    });
    const selectedOption = selectedOptions[index];
    if (
      selectedOption !== null
      && !(picker?.common ?? []).some(({ value }) => value === selectedOption.value)
    ) {
      options.push(new Option(`Avancé · ${selectedOption.label}`, selectedOption.value));
    }
    select.replaceChildren(placeholder, ...options);
    select.value = selectedOption === null
      ? ""
      : selectedOption.value;
    select.disabled = picker === null
      || !isReviewPhase()
      || state.sessionResetInFlight
      || state.confirmationInFlight;
    measurementSummaries[index].textContent = selectedOption === null
      ? "Aucune mesure choisie."
      : selectedOption.label;
    renderAdvancedMeasurementFields(index, picker);
  });
  if (enabled) {
    measurementPlanStatus.textContent = state.planBuildInFlight
      ? "Calcul de l’identité canonique du plan…"
      : state.declaredSpatialMeasurementPlan !== null
        ? `Plan prêt · ${state.declaredSpatialMeasurementPlan.planIdentity}`
        : picker === null
          ? `Sélectionnez exactement deux cadres rectangulaires (${String(
            currentSpatialCandidateSelection().selectedRectangleCount
          )}/2).`
          : "Déclarez deux longueurs distinctes.";
  }
}

function currentSpatialPicker() {
  if (state.draft?.goal.id !== "compare-two-lengths") return null;
  return privateWebLabSpatialPickerV1(
    state.selectedCandidateIds,
    state.candidates,
    state.draft.sourcePixelWidth,
    state.draft.sourcePixelHeight,
  );
}

function renderAdvancedMeasurementFields(index, picker) {
  const fields = measurementAdvancedFields[index];
  const family = measurementFamilies[index].value;
  const previousValues = fields.dataset.builderFamily === family
    ? new Map(
      [...fields.querySelectorAll("select[data-builder-field]")]
        .map(({ dataset, value }) => [dataset.builderField, value]),
    )
    : new Map();
  const locked = picker === null
    || !isReviewPhase()
    || state.sessionResetInFlight
    || state.confirmationInFlight;
  measurementFamilies[index].disabled = locked;
  measurementApplyButtons[index].disabled = locked;
  fields.replaceChildren();
  fields.dataset.builderFamily = family;
  if (picker === null) {
    measurementBuilderStatuses[index].textContent =
      "Sélectionnez d’abord exactement deux cadres.";
    return;
  }
  if (measurementBuilderStatuses[index].textContent.includes("Sélectionnez d’abord")) {
    measurementBuilderStatuses[index].textContent = "";
  }
  if (family === "extent") {
    appendAdvancedMeasurementSelect(fields, index, "owner", "Cadre", picker.owners, locked);
    appendAdvancedMeasurementSelect(fields, index, "extent", "Dimension", [
      { value: "width", label: "Largeur" },
      { value: "height", label: "Hauteur" },
      { value: "diagonal", label: "Diagonale" },
    ], locked);
    restoreAdvancedMeasurementValues(fields, previousValues);
    return;
  }
  if (family === "anchor-distance") {
    appendAdvancedMeasurementSelect(fields, index, "metric", "Distance", picker.metrics, locked);
    appendAdvancedMeasurementSelect(fields, index, "from-owner", "Cadre de départ", picker.owners, locked);
    appendAdvancedMeasurementSelect(fields, index, "from-anchor", "Repère de départ", picker.anchors, locked);
    appendAdvancedMeasurementSelect(fields, index, "to-owner", "Cadre d’arrivée", picker.owners, locked);
    appendAdvancedMeasurementSelect(fields, index, "to-anchor", "Repère d’arrivée", picker.anchors, locked);
    restoreAdvancedMeasurementValues(fields, previousValues);
    return;
  }
  appendAdvancedMeasurementSelect(
    fields,
    index,
    "owner",
    "Cadre du repère",
    picker.owners.filter(({ owner }) => owner.kind === "rectangle"),
    locked,
  );
  appendAdvancedMeasurementSelect(fields, index, "anchor", "Repère", picker.anchors, locked);
  appendAdvancedMeasurementSelect(fields, index, "edge", "Bord de l’image", picker.frameEdges, locked);
  restoreAdvancedMeasurementValues(fields, previousValues);
}

function appendAdvancedMeasurementSelect(container, index, field, labelText, options, disabled) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  const side = index === 0 ? "first" : "second";
  select.id = `measurement-${side}-${field}`;
  select.dataset.builderField = field;
  select.disabled = disabled;
  select.replaceChildren(...options.map(({ value, label: optionLabel }) => (
    new Option(optionLabel, typeof value === "string" ? value : canonicalJson(value))
  )));
  label.append(select);
  container.append(label);
}

function restoreAdvancedMeasurementValues(container, previousValues) {
  for (const select of container.querySelectorAll("select[data-builder-field]")) {
    const previousValue = previousValues.get(select.dataset.builderField);
    if ([...select.options].some(({ value }) => value === previousValue)) {
      select.value = previousValue;
    }
  }
}

function readAdvancedMeasurementBuilder(index) {
  const family = measurementFamilies[index].value;
  const value = (field) => measurementAdvancedFields[index]
    .querySelector(`[data-builder-field="${field}"]`)?.value;
  const owner = (field) => JSON.parse(value(field));
  if (family === "extent") {
    return { family, owner: owner("owner"), extent: value("extent") };
  }
  if (family === "anchor-distance") {
    return {
      family,
      metric: value("metric"),
      fromOwner: owner("from-owner"),
      fromAnchor: value("from-anchor"),
      toOwner: owner("to-owner"),
      toAnchor: value("to-anchor"),
    };
  }
  return {
    family,
    owner: owner("owner"),
    anchor: value("anchor"),
    edge: value("edge"),
  };
}

function updateCoreAvailability() {
  const declaredSpatialMode = state.draft?.goal.id === "compare-two-lengths";
  const canRun = isReviewPhase()
    && state.draft !== null
    && (!declaredSpatialMode || state.phase === "ready_to_confirm")
    && !state.sessionResetInFlight
    && !state.confirmationInFlight
    && canRunPrivateWebLabCoreV1(
      confirmationInput.checked,
      state.selectedCandidateIds,
      state.candidates,
      state.draft.goal.id,
      null,
      state.declaredSpatialMeasurementPlan,
    );
  runButton.disabled = !canRun;
  if (isReviewPhase()) {
    coreGate.textContent = state.sessionResetInFlight
      ? "Core arrêté — abandon de la revue en cours."
      : declaredSpatialMode && state.declaredSpatialMeasurementPlan === null
        ? "Core arrêté — construisez un plan valide avec deux rectangles et deux longueurs."
        : !confirmationInput.checked
      ? "Core arrêté — confirmation explicite requise."
      : canRun
        ? "Confirmation explicite prête — Core n’a pas encore été lancé."
        : "Core arrêté — la sélection ou le plan n’est plus valide.";
  }
}

function invalidateConfirmation() {
  const shouldRebuildPlan = state.draft?.goal.id === "compare-two-lengths"
    && state.measurementExpressions.every((expression) => expression !== null);
  state.planRevision += 1;
  state.declaredSpatialMeasurementPlan = null;
  state.planBuildInFlight = false;
  if (isReviewPhase()) state.phase = "review";
  confirmationInput.checked = false;
  receiptSection.hidden = true;
  updateCoreAvailability();
  if (shouldRebuildPlan) queueMicrotask(refreshDeclaredSpatialMeasurementPlan);
}

async function refreshDeclaredSpatialMeasurementPlan() {
  if (
    state.draft?.goal.id !== "compare-two-lengths"
    || state.measurementExpressions.some((expression) => expression === null)
    || !isReviewPhase()
  ) return;
  const revision = state.planRevision + 1;
  state.planRevision = revision;
  state.planBuildInFlight = true;
  render({ refreshMeasurementSelection: false });
  try {
    const plan = await createPrivateWebLabDeclaredSpatialMeasurementPlanV1({
      draft: state.draft,
      selectedCandidateIds: state.selectedCandidateIds,
      reviewedCandidates: state.candidates,
      expressions: state.measurementExpressions,
    });
    if (state.planRevision !== revision || !isReviewPhase()) return;
    state.declaredSpatialMeasurementPlan = plan;
    state.phase = "ready_to_confirm";
  } catch {
    if (state.planRevision !== revision) return;
    state.declaredSpatialMeasurementPlan = null;
    state.phase = "review";
  } finally {
    if (state.planRevision === revision) {
      state.planBuildInFlight = false;
      render();
    }
  }
}

function isReviewPhase() {
  return state.phase === "review" || state.phase === "ready_to_confirm";
}

function setTool(tool) {
  state.tool = tool;
  rectangleTool.setAttribute("aria-pressed", String(tool === "rectangle"));
  segmentTool.setAttribute("aria-pressed", String(tool === "segment"));
  panTool.setAttribute("aria-pressed", String(tool === "pan"));
  imagePlane.dataset.tool = tool;
  updateGestureAvailability();
}

function defaultEditingTool() {
  return state.phase === "authoring" ? "rectangle" : "edit";
}

function beginPan(event) {
  state.interaction = {
    type: "pan",
    clientX: event.clientX,
    clientY: event.clientY,
    panX: state.view.panX,
    panY: state.view.panY,
    pointerId: event.pointerId,
  };
  imagePlane.dataset.dragging = "true";
  imagePlane.setPointerCapture(event.pointerId);
}

function editableCandidates() {
  return state.phase === "authoring" ? state.authored : state.candidates;
}

function updateGeometryFromHandle(candidateId, handle, original, point) {
  const candidates = editableCandidates();
  const index = candidates.findIndex(({ id }) => id === candidateId);
  if (index < 0) return;
  const authoring = state.phase === "authoring";
  const kind = authoring ? original.kind : original.primitive?.kind ?? "rectangle";
  const updated = kind === "rectangle"
    ? rectangleFromHandle(candidates[index], handle, original, point)
    : segmentFromHandle(candidates[index], handle, point, authoring);
  if (updated === null) return;
  if (authoring) {
    const viewKey = authoredCandidateViewKeys.get(candidates[index]);
    if (viewKey !== undefined) authoredCandidateViewKeys.set(updated, viewKey);
  }
  candidates[index] = updated;
  render({ refreshMeasurementSelection: false });
}

function rectangleFromHandle(candidate, handle, original, point) {
  const east = original.x + original.width;
  const south = original.y + original.height;
  const west = handle.endsWith("west") ? point.x : original.x;
  const north = handle.startsWith("north") ? point.y : original.y;
  const nextEast = handle.endsWith("east") ? point.x : east;
  const nextSouth = handle.startsWith("south") ? point.y : south;
  if (Math.abs(nextEast - west) < 0.001 || Math.abs(nextSouth - north) < 0.001) return null;
  return {
    ...candidate,
    x: Math.min(west, nextEast),
    y: Math.min(north, nextSouth),
    width: Math.abs(nextEast - west),
    height: Math.abs(nextSouth - north),
  };
}

function segmentFromHandle(candidate, handle, point, authoring) {
  let updated = structuredClone(candidate);
  if (authoring) {
    setValueAt(updated, `${handle}.x`, point.x);
    setValueAt(updated, `${handle}.y`, point.y);
  } else {
    const updateInOrder = (paths) => paths.reduce(
      (current, axis) => updatePrivateWebLabCandidateGeometryV1(
        current,
        `primitive.${handle}.${axis}`,
        String(point[axis]),
      ),
      structuredClone(candidate),
    );
    const xThenY = updateInOrder(["x", "y"]);
    const yThenX = updateInOrder(["y", "x"]);
    const distance = (current) =>
      Math.abs(current.primitive[handle].x - point.x)
      + Math.abs(current.primitive[handle].y - point.y);
    updated = distance(xThenY) <= distance(yThenX) ? xThenY : yThenX;
  }
  const primitive = authoring ? updated : updated.primitive;
  return Math.hypot(
    primitive.end.x - primitive.start.x,
    primitive.end.y - primitive.start.y,
  ) < 0.001
    ? null
    : updated;
}

function setZoom(zoom) {
  state.view.zoom = Math.max(1, Math.min(4, zoom));
  const panX = state.view.zoom === 1 ? 0 : state.view.panX;
  const panY = state.view.zoom === 1 ? 0 : state.view.panY;
  setPan(panX, panY);
  refreshOverlay();
}

function refreshOverlay() {
  renderOverlay(
    state.phase === "authoring" ? authoredDisplayCandidates() : state.candidates,
    state.phase === "authoring",
  );
}

function setPan(panX, panY) {
  const maxX = imagePlane.offsetWidth * (state.view.zoom - 1) / 2;
  const maxY = imagePlane.offsetHeight * (state.view.zoom - 1) / 2;
  state.view.panX = Math.max(-maxX, Math.min(maxX, panX));
  state.view.panY = Math.max(-maxY, Math.min(maxY, panY));
  applyView();
}

function reconcileViewAfterResize() {
  setPan(state.view.panX, state.view.panY);
  refreshOverlay();
}

function resetView() {
  state.view = { zoom: 1, panX: 0, panY: 0 };
  applyView();
  refreshOverlay();
}

function applyView() {
  imagePlane.style.setProperty("--view-zoom", String(state.view.zoom));
  imagePlane.style.setProperty("--view-pan-x", `${String(state.view.panX)}px`);
  imagePlane.style.setProperty("--view-pan-y", `${String(state.view.panY)}px`);
  $("#zoom-reset-button").textContent = `${String(Math.round(state.view.zoom * 100))} %`;
  $("#zoom-out-button").disabled = state.view.zoom <= 1;
  $("#zoom-in-button").disabled = state.view.zoom >= 4;
  updateGestureAvailability();
}

function updateGestureAvailability() {
  const drawing = state.phase === "authoring"
    && (state.tool === "rectangle" || state.tool === "segment");
  const panning = state.tool === "pan"
    && state.view.zoom > 1
    && !state.preparationInFlight
    && state.phase !== "confirming";
  imagePlane.dataset.gestureActive = String(drawing || panning);
}

function screenPixelsToViewBoxUnits(pixels) {
  const bounds = imagePlane.getBoundingClientRect();
  return {
    x: bounds.width > 0 ? pixels * 1000 / bounds.width : pixels,
    y: bounds.height > 0 ? pixels * 1000 / bounds.height : pixels,
  };
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

function updateAvailability() {
  if (state.phase === "empty") {
    setupStatus.textContent = "Chargez une image et choisissez un objectif.";
  } else if (state.phase === "authoring" && state.authored.length === 0) {
    setupStatus.textContent = "Tracez au moins un cadre ou segment manuel.";
  } else if (state.phase === "authoring" && !canPrepareAuthoredReview()) {
    setupStatus.textContent = goalInput.value === "compare-two-lengths"
      ? "Tracez au moins deux cadres avant de préparer la revue."
      : "Tracez au moins un cadre avant de préparer la revue.";
  }
  prepareButton.disabled =
    state.phase !== "authoring"
    || state.preparationInFlight
    || !canPrepareAuthoredReview();
  const setupLocked = state.preparationInFlight
    || state.sessionResetInFlight
    || (state.phase !== "empty" && state.phase !== "authoring");
  imageInput.disabled = setupLocked;
  goalInput.disabled = setupLocked;
}

function canPrepareAuthoredReview() {
  if (goalInput.value === "") return false;
  const rectangleCount = state.authored.filter(({ kind }) => kind === "rectangle").length;
  return rectangleCount >= 1
    && (goalInput.value !== "compare-two-lengths" || rectangleCount >= 2);
}

function returnExpiredReviewToAuthoring() {
  returnLinkedReviewToAuthoring({ preserveAuthored: true });
}

function isMissingPrivateWebLabSessionError(message) {
  return /session is missing or (?:expired|belongs to another browser)/iu.test(message);
}

function returnLinkedReviewToAuthoring({ preserveAuthored }) {
  if (preserveAuthored && state.candidates.length > 0) {
    state.authored = state.candidates.map(reviewedCandidateToAuthored);
  }
  state.phase = "authoring";
  state.draft = null;
  if (!preserveAuthored) state.authored = [];
  state.candidates = [];
  state.selectedCandidateIds = new Set();
  state.measurementExpressions = [null, null];
  state.declaredSpatialMeasurementPlan = null;
  state.planRevision += 1;
  state.planBuildInFlight = false;
  state.activeCandidateId = null;
  confirmationInput.checked = false;
  receiptSection.hidden = true;
  if (state.receiptUrl !== null) URL.revokeObjectURL(state.receiptUrl);
  state.receiptUrl = null;
  setTool("rectangle");
}

function reviewedCandidateToAuthored(candidate) {
  if (candidate.primitive.kind === "rectangle") {
    return {
      id: candidate.id,
      kind: "rectangle",
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
    };
  }
  return {
    id: candidate.id,
    kind: "segment",
    start: structuredClone(candidate.primitive.start),
    end: structuredClone(candidate.primitive.end),
  };
}

function setGuidesVisible(visible) {
  guideOverlay.toggleAttribute("hidden", !visible);
  $("#guides-button").setAttribute("aria-pressed", String(visible));
  $("#original-button").setAttribute("aria-pressed", String(!visible));
}

function clearImage() {
  state.preparationRevision += 1;
  state.preparationInFlight = false;
  state.sessionResetInFlight = false;
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
  state.measurementExpressions = [null, null];
  state.declaredSpatialMeasurementPlan = null;
  state.planRevision += 1;
  state.planBuildInFlight = false;
  state.activeCandidateId = null;
  resetView();
  setTool("rectangle");
  reviewSection.hidden = true;
  receiptSection.hidden = true;
}

function renderMeasurementReceipt(report, spatialConfirmation) {
  if (report === undefined && spatialConfirmation === undefined) {
    measurementSummary.hidden = true;
    measurementSummaryUnavailable.hidden = true;
    measurementReportRow.hidden = true;
    return;
  }
  const presentation = spatialConfirmation === undefined
    ? presentPrivateWebLabMeasurementReportV1(report)
    : presentPrivateWebLabDeclaredSpatialMeasurementConfirmationV1(spatialConfirmation);
  if (presentation === null) {
    measurementSummary.hidden = true;
    measurementSummaryUnavailable.hidden = false;
    measurementReportRow.hidden = true;
    return;
  }
  const spatial = spatialConfirmation !== undefined;
  const [first, second] = spatial
    ? spatialConfirmation.resolvedMeasurements
    : report.measurements;
  measurementRatio.textContent = spatial
    ? presentation.dominantShareText
    : `${(report.observedDominantShare * 100).toFixed(3).replace(".", ",")} %`;
  measurementLongShort.textContent = spatial
    ? presentation.longShortRatioText
    : presentation.ratioText;
  measurementVerdict.textContent = presentation.verdictText;
  measurementVerdict.dataset.kind = presentation.verdictKind;
  measurementFirstResult.textContent = presentation.firstMeasurementText;
  measurementSecondResult.textContent = presentation.secondMeasurementText;
  measurementTolerance.textContent = presentation.toleranceText;
  measurementReport.textContent = spatial
    ? `${first.measurementIdentity}: ${String(first.lengthPixels)} px · `
      + `${second.measurementIdentity}: ${String(second.lengthPixels)} px`
    : `${first.candidateLabel}: ${String(first.lengthPixels)} px · `
      + `${second.candidateLabel}: ${String(second.lengthPixels)} px`;
  measurementSummary.hidden = false;
  measurementSummaryUnavailable.hidden = true;
  measurementReportRow.hidden = false;
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
