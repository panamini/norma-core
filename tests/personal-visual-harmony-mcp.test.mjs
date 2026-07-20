import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  createPersonalVisualHarmonyPresentationV1,
  createPersonalVisualHarmonyMcpServerV1,
  createPersonalVisualHarmonyWidgetHtmlV1,
  PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
  PERSONAL_VISUAL_HARMONY_DEFAULT_ENTRY_PROMPT_V1,
  PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1,
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
  PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE,
  PERSONAL_VISUAL_HARMONY_WIDGET_URI,
  PersonalVisualHarmonySessionServiceV1,
  runPersonalVisualHarmonyImageHydrationV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";
import { createPersonalVisualHarmonyPixelCropPlanV1 } from "../dist/src/personal-visual-harmony-pixel-refinement.js";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/u, "");
const GOLDEN_MAJOR = 0.6180339887498949;

function widgetScriptFunction(name, nextLinePrefix, bindings) {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/u)?.[1];
  assert.ok(script);
  const functionStart = script.indexOf(`function ${name}(`);
  const asyncFunctionStart = script.indexOf(`async function ${name}(`);
  const start = asyncFunctionStart !== -1 && asyncFunctionStart <= functionStart
    ? asyncFunctionStart
    : functionStart;
  assert.notEqual(start, -1, `Missing widget function ${name}`);
  const end = script.indexOf(`\n${nextLinePrefix}`, start);
  assert.notEqual(end, -1, `Missing widget function boundary after ${name}`);
  const source = script.slice(start, end);
  const bindingNames = Object.keys(bindings);
  return new Function(...bindingNames, `"use strict";${source};return ${name};`)(
    ...bindingNames.map((bindingName) => bindings[bindingName]),
  );
}

function deferred() {
  let resolve;
  const promise = new Promise((settle) => { resolve = settle; });
  return { promise, resolve };
}

function ellipseAxesForTest(primitive) {
  const rotation = (primitive.rotationDegrees ?? 0) * Math.PI / 180;
  return {
    x: { x: Math.cos(rotation), y: Math.sin(rotation) },
    y: { x: -Math.sin(rotation), y: Math.cos(rotation) },
  };
}

function widgetHydrationState(overrides = {}) {
  return {
    payload: null,
    activePayload: null,
    activePayloadIdentity: null,
    pendingStructuredContent: null,
    imageReady: false,
    imageLoadGeneration: 0,
    imageLoadTask: null,
    imageLoadFileId: null,
    imageLoadPayloadIdentity: null,
    dimensions: null,
    downloadUrl: null,
    confirming: false,
    completed: false,
    ...overrides,
  };
}

test("measurement ratio controls remain usable to disable an incomplete enabled request", () => {
  const state = {
    completed: false,
    confirming: false,
    measurementRatioEnabled: true,
    measurementRatioRefs: [
      { kind: "segment", candidateId: "kept" },
      { kind: "segment", candidateId: "removed" },
    ],
  };
  const measurementRatioToggle = {
    disabled: true,
    setAttribute() {},
    textContent: "",
  };
  const createSelect = () => ({
    disabled: false,
    value: "",
    replaceChildren() {},
    add() {},
  });
  const updateMeasurementRatioControls = widgetScriptFunction(
    "updateMeasurementRatioControls",
    "measurementRatioToggle.addEventListener",
    {
      state,
      eligibleMeasurementReferences: () => [{
        reference: { kind: "segment", candidateId: "kept" },
        label: "Kept segment",
      }],
      measurementRefKey: (reference) => JSON.stringify(reference),
      measurementRatioToggle,
      measurementRatioFirst: createSelect(),
      measurementRatioSecond: createSelect(),
      Option: class Option {},
      syncMeasurementRatioPreview() {},
      updateConfirm() {},
    },
  );

  updateMeasurementRatioControls();

  assert.equal(measurementRatioToggle.disabled, false);
  assert.deepEqual(state.measurementRatioRefs, [
    { kind: "segment", candidateId: "kept" },
  ]);
});

test("measurement ratio choices expose pixel lengths and spatial quadrilateral labels before confirmation", () => {
  const state = {
    dimensions: { width: 1_000, height: 500 },
    reviewedCandidates: [{
      id: "table",
      label: "Face principale de la table",
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 0.1, y: 0.2 },
          { x: 0.9, y: 0.2 },
          { x: 0.8, y: 0.8 },
          { x: 0.2, y: 0.8 },
        ],
      },
    }],
  };
  const measurementReferenceGeometry = widgetScriptFunction(
    "measurementReferenceGeometry",
    "function measurementReferenceLengthPixels",
    { state },
  );
  const measurementReferenceLengthPixels = widgetScriptFunction(
    "measurementReferenceLengthPixels",
    "function measurementReferenceOption",
    { state, measurementReferenceGeometry },
  );
  const measurementReferenceOption = widgetScriptFunction(
    "measurementReferenceOption",
    "function eligibleMeasurementReferences",
    {
      displayNumber: (value) => value.toLocaleString("fr-FR", { maximumFractionDigits: 3 }),
      measurementReferenceGeometry,
      measurementReferenceLengthPixels,
    },
  );

  const top = { kind: "quadrilateral-side", candidateId: "table", sideIndex: 0 };
  const right = { kind: "quadrilateral-side", candidateId: "table", sideIndex: 1 };

  assert.equal(measurementReferenceGeometry(top).spatialLabel, "côté 1 · bord supérieur");
  assert.equal(measurementReferenceGeometry(right).spatialLabel, "côté 2 · bord droit");
  assert.equal(measurementReferenceGeometry({
    kind: "quadrilateral-side",
    candidateId: "table",
    sideIndex: 4,
  }), null);
  assert.equal(measurementReferenceLengthPixels(top), 800);
  assert.match(measurementReferenceOption(top), /bord supérieur · 800 px/u);
  assert.match(measurementReferenceOption(right), /bord droit · 316[,.\s]228 px/u);

  state.reviewedCandidates[0].primitive.vertices = [
    { x: 0.5, y: 0.1 },
    { x: 0.9, y: 0.5 },
    { x: 0.5004, y: 0.9 },
    { x: 0.1, y: 0.5 },
  ];
  assert.equal(measurementReferenceGeometry({
    kind: "quadrilateral-diagonal",
    candidateId: "table",
    diagonalIndex: 0,
  }).spatialLabel, "diagonale 1 · verticale");
  assert.equal(measurementReferenceGeometry({
    kind: "quadrilateral-diagonal",
    candidateId: "table",
    diagonalIndex: 1,
  }).spatialLabel, "diagonale 2 · horizontale");

  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /id="measurementRatioPreview"[^>]*aria-live="polite"/u);
  assert.match(html, /data-measurement-ratio-preview/u);
  assert.match(html, /Le rapport harmonique sera calculé seulement après confirmation/u);
});

test("measurement ratio preview rejects a duplicate A/B pair with explicit guidance", () => {
  const reference = { kind: "segment", candidateId: "same" };
  const state = {
    measurementRatioEnabled: true,
    measurementRatioRefs: [reference, reference],
  };
  const measurementRatioPreview = { textContent: "" };
  const syncMeasurementRatioPreview = widgetScriptFunction(
    "syncMeasurementRatioPreview",
    "function measurementRatioRequest",
    {
      state,
      overlay: {
        querySelectorAll: () => [],
        querySelector: () => null,
      },
      document: {
        createElementNS: () => ({ setAttribute() {} }),
      },
      measurementRatioPreview,
      measurementRefKey: JSON.stringify,
      canonicalMeasurementReferenceForReviewedGeometry: (value) => value,
      measurementReferenceGeometry: () => ({
        start: { x: 0.1, y: 0.1 },
        end: { x: 0.9, y: 0.1 },
      }),
      measurementReferenceOption: () => "Guide · longueur du segment · 800 px",
    },
  );

  syncMeasurementRatioPreview();

  assert.match(measurementRatioPreview.textContent, /Choisissez deux longueurs distinctes/u);
  assert.doesNotMatch(measurementRatioPreview.textContent, /sera calculé/u);
});

test("measurement ratio preview ignores invalid restored references and completed review state", () => {
  const invalidReference = {
    kind: "quadrilateral-side",
    candidateId: "shape",
    sideIndex: 99,
  };
  const state = {
    completed: false,
    measurementRatioEnabled: true,
    measurementRatioRefs: [invalidReference],
  };
  const measurementRatioPreview = { textContent: "" };
  let canonicalCalls = 0;
  let removedPreviews = 0;
  let appendedPreviews = 0;
  const syncMeasurementRatioPreview = widgetScriptFunction(
    "syncMeasurementRatioPreview",
    "function measurementRatioRequest",
    {
      state,
      overlay: {
        querySelectorAll: () => [{ remove() { removedPreviews += 1; } }],
        querySelector: () => ({ append() { appendedPreviews += 1; } }),
      },
      document: {
        createElementNS: () => ({ setAttribute() {} }),
      },
      measurementRatioPreview,
      measurementRefKey: JSON.stringify,
      canonicalMeasurementReferenceForReviewedGeometry: () => {
        canonicalCalls += 1;
        throw new Error("invalid restored references must not be canonicalized");
      },
      measurementReferenceGeometry: () => null,
      measurementReferenceOption: () => null,
    },
  );

  syncMeasurementRatioPreview();
  assert.equal(canonicalCalls, 0);
  assert.equal(appendedPreviews, 0);
  assert.match(measurementRatioPreview.textContent, /Choisissez A puis B/u);

  state.completed = true;
  syncMeasurementRatioPreview();
  assert.equal(removedPreviews, 2);
  assert.equal(canonicalCalls, 0);
  assert.equal(appendedPreviews, 0);
  assert.match(measurementRatioPreview.textContent, /résultat vérifié/u);

  state.measurementRatioEnabled = false;
  syncMeasurementRatioPreview();
  assert.doesNotMatch(measurementRatioPreview.textContent, /Rapport terminé/u);
  assert.match(measurementRatioPreview.textContent, /non demandé/u);
});

test("measurement ratio selectors update only pending widget state", () => {
  const state = {
    measurementRatioRefs: [],
  };
  let controlsUpdated = 0;
  let persisted = 0;
  let appToolCalls = 0;
  const setMeasurementRatioReference = widgetScriptFunction(
    "setMeasurementRatioReference",
    "for(const [index,select]",
    {
      state,
      updateMeasurementRatioControls() { controlsUpdated += 1; },
      persistReviewState() { persisted += 1; },
      callAppTool() { appToolCalls += 1; },
    },
  );
  const first = { kind: "segment", candidateId: "oblique" };
  const second = { kind: "quadrilateral-side", candidateId: "trapezoid", sideIndex: 2 };

  setMeasurementRatioReference(0, JSON.stringify(first));
  setMeasurementRatioReference(1, JSON.stringify(second));

  assert.deepEqual(state.measurementRatioRefs, [first, second]);
  assert.equal(controlsUpdated, 2);
  assert.equal(persisted, 2);
  assert.equal(appToolCalls, 0);

  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(
    html,
    /select\.addEventListener\("change",\(\)=>setMeasurementRatioReference\(index,select\.value\)\)/u,
  );
  assert.match(html, /confirmButton\.addEventListener\("click",async\(\)=>/u);
});

test("widget ellipses keep bounded off-frame radius editing reachable in responsive layout", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /\.shell\{container-type:inline-size\}/u);
  assert.match(html, /@container \(max-width:900px\)\{\.content\{grid-template-columns:minmax\(0,1fr\)\}/u);
  assert.match(html, /data-ellipse-handle/u);
  assert.doesNotMatch(html, /group\.setAttribute\("role","img"\)/u);
  assert.match(html, /une poignée hors cadre reste accessible sur le bord/u);
  assert.match(html, /data-ellipse-handle-proxy/u);

  const ellipseEnvelope = widgetScriptFunction(
    "ellipseEnvelope",
    "function validQuadrilateralVertices",
    {},
  );
  const ellipseAxes = widgetScriptFunction(
    "ellipseAxes",
    "function adjustedEllipseCandidate",
    {},
  );
  const ellipsePerimeterIntersectsImage = widgetScriptFunction(
    "ellipsePerimeterIntersectsImage",
    "function validQuadrilateralVertices",
    {},
  );
  const rounded = (value) => Math.round(value * 1_000_000) / 1_000_000;
  const candidateWithPrimitive = widgetScriptFunction(
    "candidateWithPrimitive",
    "function decorateEditableOverlay",
    {
      ellipseEnvelope,
      rounded,
    },
  );
  const adjustedEllipseCandidate = widgetScriptFunction(
    "adjustedEllipseCandidate",
    "function supportingLineEndpoints",
    {
      ellipseAxes,
      ellipseEnvelope,
      ellipsePerimeterIntersectsImage,
      candidateWithPrimitive,
      rounded,
    },
  );
  const visibleEllipseHandlePoint = widgetScriptFunction(
    "visibleEllipseHandlePoint",
    "function adjustedEllipseCandidate",
    {},
  );
  const ellipse = {
    id: "door-circle",
    x: 0.3,
    y: 0.4,
    width: 0.4,
    height: 0.2,
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 0,
    },
  };

  const moved = adjustedEllipseCandidate(ellipse, "center", 0.1, -0.1);
  assert.deepEqual(moved.primitive.center, { x: 0.6, y: 0.4 });
  assert.equal(moved.primitive.radiusX, 0.2);
  assert.equal(moved.primitive.radiusY, 0.1);

  const wider = adjustedEllipseCandidate(ellipse, "radius-x", 0.05, 0);
  assert.equal(wider.primitive.radiusX, 0.25);
  assert.equal(wider.primitive.radiusY, 0.1);

  const taller = adjustedEllipseCandidate(ellipse, "radius-y", 0, 0.04);
  assert.equal(taller.primitive.radiusX, 0.2);
  assert.equal(taller.primitive.radiusY, 0.14);

  const offFrame = adjustedEllipseCandidate(ellipse, "radius-x", 1, 0);
  assert.equal(offFrame.primitive.radiusX, 1);
  assert.deepEqual(
    { x: offFrame.x, y: offFrame.y, width: offFrame.width, height: offFrame.height },
    { x: 0, y: 0.4, width: 1, height: 0.2 },
  );
  assert.deepEqual(
    visibleEllipseHandlePoint({ x: 0.5, y: 1.4 }),
    { point: { x: 0.5, y: 0.982 }, proxy: true },
  );
  assert.deepEqual(
    visibleEllipseHandlePoint({ x: 0.7, y: 0.6 }),
    { point: { x: 0.7, y: 0.6 }, proxy: false },
  );
  const invisible = {
    ...ellipse,
    primitive: {
      ...ellipse.primitive,
      radiusX: 1,
      radiusY: 1,
    },
  };
  assert.equal(adjustedEllipseCandidate(invisible, "center", 0, 0), invisible);
});

test("quadrilateral measurement references preserve the selected visual edge through canonicalization", () => {
  const canonicalQuadrilateralVerticesForWidget = widgetScriptFunction(
    "canonicalQuadrilateralVerticesForWidget",
    "function canonicalMeasurementReferenceForReviewedGeometry",
    {
      canonicalGeometryNumber: (value) => value,
    },
  );
  const vertices = [
    { x: 0.1, y: 0.8 },
    { x: 0.1, y: 0.2 },
    { x: 0.7, y: 0.3 },
    { x: 0.8, y: 0.7 },
  ];
  const state = {
    reviewedCandidates: [{
      id: "edited-quadrilateral",
      primitive: { kind: "quadrilateral", vertices },
    }],
  };
  const canonicalMeasurementReferenceForReviewedGeometry = widgetScriptFunction(
    "canonicalMeasurementReferenceForReviewedGeometry",
    "function candidateWithPrimitive",
    {
      state,
      canonicalQuadrilateralVerticesForWidget,
      canonicalGeometryNumber: (value) => value,
    },
  );

  const remapped = canonicalMeasurementReferenceForReviewedGeometry({
    kind: "quadrilateral-side",
    candidateId: "edited-quadrilateral",
    sideIndex: 0,
  });
  const canonical = canonicalQuadrilateralVerticesForWidget(vertices);
  const remappedEndpoints = [
    canonical[remapped.sideIndex],
    canonical[(remapped.sideIndex + 1) % 4],
  ];

  assert.deepEqual(
    new Set(remappedEndpoints.map((point) => JSON.stringify(point))),
    new Set([vertices[0], vertices[1]].map((point) => JSON.stringify(point))),
  );
  const remappedDiagonal = canonicalMeasurementReferenceForReviewedGeometry({
    kind: "quadrilateral-diagonal",
    candidateId: "edited-quadrilateral",
    diagonalIndex: 0,
  });
  const diagonalIndexes = remappedDiagonal.diagonalIndex === 0 ? [0, 2] : [1, 3];
  assert.deepEqual(
    new Set(diagonalIndexes.map((index) => JSON.stringify(canonical[index]))),
    new Set([vertices[0], vertices[2]].map((point) => JSON.stringify(point))),
  );
});

test("presentation promotes the complementary phi split and collapses duplicate support", () => {
  const makeMatch = (overrides) => ({
    subjectCandidateId: "square",
    subjectLabel: "Carré rouge",
    relatedCandidateIds: [],
    metric: "vertical-split-share",
    quality: "near",
    ratioLabel: "φ major",
    ratioFamily: "golden-ratio",
    observedPercent: 62.38,
    targetPercent: 61.803,
    deltaPercentagePoints: 0.577,
    explanation: "Mesure déterministe de fixture",
    ...overrides,
  });
  const matches = [
    makeMatch({ relatedCandidateIds: ["upper"] }),
    makeMatch({
      subjectCandidateId: "upper",
      subjectLabel: "Rectangle supérieur",
      relatedCandidateIds: ["square"],
      ratioLabel: "φ minor",
      observedPercent: 37.62,
      targetPercent: 38.197,
    }),
    makeMatch({
      metric: "height-share",
      ratioLabel: "1/3",
      observedPercent: 32.5,
      targetPercent: 33.333,
      deltaPercentagePoints: 0.833,
    }),
    makeMatch({
      subjectCandidateId: "full",
      subjectLabel: "Rectangle complet",
      metric: "right-edge-position",
      observedPercent: 60.3,
      targetPercent: 61.803,
      deltaPercentagePoints: 1.503,
    }),
    makeMatch({
      metric: "right-edge-position",
      observedPercent: 60.3,
      targetPercent: 61.803,
      deltaPercentagePoints: 1.503,
    }),
  ];
  const presentation = createPersonalVisualHarmonyPresentationV1(matches);
  const reordered = createPersonalVisualHarmonyPresentationV1([...matches].reverse());

  assert.equal(presentation.primaryPattern.kind, "complementary_pair");
  assert.deepEqual(reordered, presentation);
  assert.equal(presentation.primaryPattern.metricLabel, "part du découpage vertical");
  assert.deepEqual(
    presentation.primaryPattern.subjects.map(({ label, observedPercent, ratioLabel }) => ({ label, observedPercent, ratioLabel })),
    [
      { label: "Carré rouge", observedPercent: 62.38, ratioLabel: "φ major" },
      { label: "Rectangle supérieur", observedPercent: 37.62, ratioLabel: "φ minor" },
    ],
  );
  assert.equal(presentation.primaryPattern.maxDeltaPercentagePoints, 0.577);
  const groupedRightEdge = presentation.supportingObservations.filter(({ metric }) => metric === "right-edge-position");
  assert.equal(groupedRightEdge.length, 1);
  assert.deepEqual(groupedRightEdge[0].subjectLabels, ["Rectangle complet", "Carré rouge"]);
});

test("presentation does not promote unrelated complementary phi matches", () => {
  const makeMatch = (subjectCandidateId, ratioLabel, observedPercent, targetPercent) => ({
    subjectCandidateId,
    subjectLabel: subjectCandidateId,
    relatedCandidateIds: [],
    metric: "vertical-split-share",
    quality: "near",
    ratioLabel,
    ratioFamily: "golden-ratio",
    observedPercent,
    targetPercent,
    deltaPercentagePoints: 0.577,
    explanation: "Mesure déterministe de fixture",
  });
  const presentation = createPersonalVisualHarmonyPresentationV1([
    makeMatch("left", "φ major", 62.38, 61.803),
    makeMatch("remote", "φ minor", 37.62, 38.197),
  ]);

  assert.equal(presentation.primaryPattern.kind, "single_relationship");
  assert.equal(presentation.primaryPattern.subjects.length, 1);
});

test("widget manual segment is bounded, deterministic, candidate-only, and cannot run Core by itself", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /id="manualSegmentToggle"[^>]*disabled/u);
  assert.match(html, /id="manualSegmentRemove"[^>]*disabled/u);
  assert.match(html, /data-provenance","human-added-candidate"/u);
  assert.match(html, /Guide tracé explicitement par l’utilisateur dans le widget; preuve candidate/u);
  assert.match(html, /activez Prolongements si vous voulez voir son axe/u);
  assert.match(html, /Math\.hypot\(end\.x-start\.x,end\.y-start\.y\)<\.01/u);
  assert.match(html, /state\.reviewedCandidates\.length>=MAX_REVIEW_CANDIDATES/u);
  assert.match(html, /manualSegmentToggle\.addEventListener\("click"/u);
  assert.match(html, /overlay\.addEventListener\("pointerdown",event=>\{if\(!state\.manualSegmentMode/u);
  assert.match(html, /manualSegmentAnchor:null/u);
  assert.match(html, /cliquez successivement les deux points/u);
  assert.match(html, /Premier point enregistré\. Cliquez le second point visible/u);
  assert.match(html, /start=state\.manualSegmentAnchor\?\?pointerStart/u);
  assert.match(html, /manualSegmentState:manualSegmentSnapshot\(\)/u);
  assert.match(html, /\.overlay\.drawing-segment\{cursor:crosshair;touch-action:none\}/u);
  assert.match(html, /const activePrepared=restoredPreparedFor\(prepared\)/u);
  assert.match(html, /state\.proposalCandidateSetIdentity=prepared\.candidateSetIdentity/u);
  assert.match(html, /state\.proposalCandidates=prepared\.candidates\.map/u);
  assert.doesNotMatch(html, /state\.payload=\{\.\.\.state\.payload,prepared:activePrepared\}/u);
  assert.match(html, /restoredManual=restoredManualSegmentFor\(activePrepared\)/u);
  assert.match(html, /state\.manualSegmentCandidateId=state\.reviewedCandidates\.find\(isManualSegmentCandidate\)/u);
  assert.match(html, /pixelEvidence\.setAttribute\("data-pixel-candidate-id",item\.id\)/u);
  assert.match(html, /syncPixelProposalOverlay\(\);syncFamilyVisibility\(\)/u);
  assert.match(html, /remove\.disabled=state\.completed\|\|state\.confirming\|\|state\.pixelRefinementRunning/u);
  assert.match(html, /id===null\|\|state\.completed\|\|state\.confirming\|\|state\.pixelRefinementRunning/u);
  assert.match(html, /window\.addEventListener\("keydown",event=>\{if\(event\.key==="Escape"&&state\.manualSegmentMode/u);
  assert.match(html, /state\.activePayloadIdentity!==null&&state\.activePayloadIdentity!==identity\)resetManualSegmentGesture\(\)/u);
  assert.match(html, /preview\.remove\(\);if\(!state\.manualSegmentMode\)return/u);
  assert.match(html, /candidates\.length!==state\.proposalCandidates\.length\|\|candidates\.some/u);

  const nextManualSegmentId = widgetScriptFunction(
    "nextManualSegmentId",
    "function manualSegmentCandidate",
    { MAX_REVIEW_CANDIDATES: 12 },
  );
  const manualSegmentCandidate = widgetScriptFunction(
    "manualSegmentCandidate",
    "function updateManualSegmentControls",
    {
      nextManualSegmentId,
      validPoint: (point) => (
        point
        && Number.isFinite(point.x)
        && Number.isFinite(point.y)
        && point.x >= 0
        && point.x <= 1
        && point.y >= 0
        && point.y <= 1
      ),
      candidateWithPrimitive: (item, primitive) => ({
        ...item,
        x: Math.min(primitive.start.x, primitive.end.x),
        y: Math.min(primitive.start.y, primitive.end.y),
        width: Math.abs(primitive.end.x - primitive.start.x),
        height: Math.abs(primitive.end.y - primitive.start.y),
        primitive,
      }),
    },
  );
  const existing = [{ id: "manual-segment-1" }, { id: "provider-segment" }];
  const first = manualSegmentCandidate(existing, { x: 0.2, y: 0.8 }, { x: 0.24, y: 0.1 });
  const second = manualSegmentCandidate(existing, { x: 0.2, y: 0.8 }, { x: 0.24, y: 0.1 });

  assert.deepEqual(first, second);
  assert.equal(first.id, "manual-segment-2");
  assert.equal(first.role, "secondary-subject");
  assert.equal(first.primitive.kind, "segment");
  assert.deepEqual(first.primitive.start, { x: 0.2, y: 0.8 });
  assert.deepEqual(first.primitive.end, { x: 0.24, y: 0.1 });
  assert.equal(manualSegmentCandidate(existing, { x: 0.2, y: 0.2 }, { x: 0.205, y: 0.205 }), null);
  assert.equal(
    manualSegmentCandidate(
      Array.from({ length: 12 }, (_, index) => ({ id: `manual-segment-${index + 1}` })),
      { x: 0.1, y: 0.1 },
      { x: 0.8, y: 0.8 },
    ),
    null,
  );
});

test("widget guided analysis entry is display-only and does not activate measurement or Core", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /id="guidedEntry"/u);
  assert.match(html, /id="guidedGoals"/u);
  assert.match(html, /Le choix filtre l’affichage seulement/u);
  assert.match(html, /DEFAULT_GUIDED_ANALYSIS_GOAL="general-geometry"/u);
  for (const goal of PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1) {
    assert.match(html, new RegExp(goal.id, "u"));
    assert.match(html, new RegExp(goal.label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.equal(PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.length, 6);
  assert.deepEqual(
    PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.find(({ id }) => id === "compare-two-lengths")?.visibleKinds,
    ["quadrilateral", "segment"],
  );
  assert.deepEqual(
    PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.find(({ id }) => id === "triangles-constructions")?.visibleKinds,
    ["segment", "axis"],
  );

  const state = {
    guidedAnalysisGoal: "general-geometry",
    visibleKinds: new Set(["rectangle", "quadrilateral", "segment", "axis", "ellipse"]),
    constructionLayers: new Set(),
    visibleConstructionLayers: new Set(),
    measurementRatioEnabled: false,
    measurementRatioRefs: [],
  };
  const pressed = new Map();
  const familyPressed = new Map();
  let familyVisibilitySyncs = 0;
  let persisted = 0;
  let appToolCalls = 0;
  const guidedGoals = {
    querySelectorAll(selector) {
      assert.equal(selector, ".guided-goal");
      return PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.map((goal) => ({
        getAttribute(name) {
          assert.equal(name, "data-goal-id");
          return goal.id;
        },
        setAttribute(name, value) {
          assert.equal(name, "aria-pressed");
          pressed.set(goal.id, value);
        },
      }));
    },
  };
  const familyFilters = {
    querySelectorAll(selector) {
      assert.equal(selector, ".family-filter");
      return ["rectangle", "quadrilateral", "segment", "axis", "ellipse"].map((kind) => ({
        getAttribute(name) {
          assert.equal(name, "data-primitive-kind");
          return kind;
        },
        setAttribute(name, value) {
          assert.equal(name, "aria-pressed");
          familyPressed.set(kind, value);
        },
      }));
    },
  };
  const guidedGoalStatus = { textContent: "" };
  const updateGuidedAnalysisGoalButtons = widgetScriptFunction(
    "updateGuidedAnalysisGoalButtons",
    "function updateFamilyFilterButtons",
    { guidedGoals, state },
  );
  const updateFamilyFilterButtons = widgetScriptFunction(
    "updateFamilyFilterButtons",
    "function guidedAnalysisScope",
    { familyFilters, state },
  );
  const visibleKindsForGuidedAnalysisGoal = widgetScriptFunction(
    "visibleKindsForGuidedAnalysisGoal",
    "function guidedAnalysisGoalSnapshot",
    {
      state,
      triangleRequestParentGuideIds: () => [],
      primitiveKind: (item) => item.primitive.kind,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const applyGuidedAnalysisGoal = widgetScriptFunction(
    "applyGuidedAnalysisGoal",
    "function restoreGuidedAnalysisGoal",
    {
      GUIDED_ANALYSIS_GOALS: PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1,
      state,
      visibleKindsForGuidedAnalysisGoal,
      updateGuidedAnalysisGoalButtons,
      updateFamilyFilterButtons,
      syncFamilyVisibility() { familyVisibilitySyncs += 1; },
      guidedGoalStatus,
      persistGuidedAnalysisGoal() { persisted += 1; },
      callAppTool() { appToolCalls += 1; },
    },
  );

  applyGuidedAnalysisGoal("compare-two-lengths");

  assert.equal(state.guidedAnalysisGoal, "compare-two-lengths");
  assert.deepEqual([...state.visibleKinds], ["quadrilateral", "segment"]);
  assert.deepEqual([...state.constructionLayers], []);
  assert.deepEqual([...state.visibleConstructionLayers], []);
  assert.equal(state.measurementRatioEnabled, false);
  assert.deepEqual(state.measurementRatioRefs, []);
  assert.equal(familyVisibilitySyncs, 1);
  assert.equal(persisted, 1);
  assert.equal(appToolCalls, 0);
  assert.equal(pressed.get("compare-two-lengths"), "true");
  assert.equal(pressed.get("general-geometry"), "false");
  assert.equal(familyPressed.get("rectangle"), "false");
  assert.equal(familyPressed.get("quadrilateral"), "true");
  assert.equal(familyPressed.get("segment"), "true");
  assert.equal(familyPressed.get("axis"), "false");
  assert.equal(familyPressed.get("ellipse"), "false");
  assert.match(guidedGoalStatus.textContent, /rapport reste opt-in et séparé du Core/u);
});

test("completed guided-goal changes preserve cached review state", () => {
  const state = {
    activePayload: {
      stage: "completed",
      fileId: "file-completed",
      result: { contentIdentity: `sha256:${"a".repeat(64)}` },
    },
    proposalCandidateSetIdentity: `sha256:${"b".repeat(64)}`,
    guidedAnalysisGoal: "frames-proportions",
    visibleKinds: new Set(["rectangle", "quadrilateral"]),
  };
  const saved = {
    selectedCandidateIds: ["frame"],
    confirmedVisualGuideCandidateIds: ["axis"],
    reviewedProposalCandidateSetIdentity: `sha256:${"c".repeat(64)}`,
    reviewedCandidateGeometry: [{ id: "frame", x: 0, y: 0, width: 1, height: 1 }],
    completedVisualHarmony: { canonicalResultIdentity: `sha256:${"d".repeat(64)}` },
  };
  let persisted;
  const guidedAnalysisScope = widgetScriptFunction(
    "guidedAnalysisScope",
    "function visibleKindsForGuidedAnalysisGoal",
    { state },
  );
  const guidedAnalysisGoalSnapshot = widgetScriptFunction(
    "guidedAnalysisGoalSnapshot",
    "function storedGuidedAnalysisGoalFor",
    {
      state,
      guidedAnalysisScope,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const persistGuidedAnalysisGoal = widgetScriptFunction(
    "persistGuidedAnalysisGoal",
    "function applyGuidedAnalysisGoal",
    {
      guidedAnalysisGoalSnapshot,
      publicWidgetState: () => saved,
      window: {
        openai: {
          setWidgetState(value) { persisted = value; },
        },
      },
    },
  );

  persistGuidedAnalysisGoal();

  assert.deepEqual(persisted, {
    ...saved,
    guidedAnalysisGoal: {
      analysisIdentity: `sha256:${"a".repeat(64)}`,
      fileId: "file-completed",
      goalId: "frames-proportions",
      visibleKinds: ["rectangle", "quadrilateral"],
    },
  });
  assert.deepEqual(persisted.reviewedCandidateGeometry, saved.reviewedCandidateGeometry);
  assert.equal(
    persisted.reviewedProposalCandidateSetIdentity,
    saved.reviewedProposalCandidateSetIdentity,
  );
});

test("guided goals restore only for the same file and candidate-set identity", () => {
  const candidateSetIdentity = `sha256:${"a".repeat(64)}`;
  const state = {
    activePayload: {
      stage: "confirmation_required",
      fileId: "file-current",
      prepared: {
        candidateSetIdentity,
        candidates: [],
      },
    },
    payload: null,
    proposalCandidateSetIdentity: candidateSetIdentity,
    reviewedCandidates: [],
  };
  const guidedAnalysisScope = widgetScriptFunction(
    "guidedAnalysisScope",
    "function visibleKindsForGuidedAnalysisGoal",
    { state },
  );
  const visibleKindsForGuidedAnalysisGoal = widgetScriptFunction(
    "visibleKindsForGuidedAnalysisGoal",
    "function guidedAnalysisGoalSnapshot",
    {
      state,
      triangleRequestParentGuideIds: () => [],
      primitiveKind: (item) => item.primitive.kind,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const storedGuidedAnalysisGoalFor = widgetScriptFunction(
    "storedGuidedAnalysisGoalFor",
    "function persistGuidedAnalysisGoal",
    {
      guidedAnalysisScope,
      GUIDED_ANALYSIS_GOALS: PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
      visibleKindsForGuidedAnalysisGoal,
    },
  );
  const matching = {
    analysisIdentity: candidateSetIdentity,
    fileId: "file-current",
    goalId: "ellipses-lines",
    visibleKinds: ["ellipse", "segment", "axis"],
  };
  let persisted = matching;
  const restoreGuidedAnalysisGoal = widgetScriptFunction(
    "restoreGuidedAnalysisGoal",
    "function renderGuidedAnalysisGoals",
    {
      storedGuidedAnalysisGoalFor,
      publicWidgetState: () => ({ guidedAnalysisGoal: persisted }),
      GUIDED_ANALYSIS_GOALS: PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1,
      DEFAULT_GUIDED_ANALYSIS_GOAL: "general-geometry",
      visibleKindsForGuidedAnalysisGoal,
      state,
    },
  );

  assert.deepEqual(storedGuidedAnalysisGoalFor(matching), matching);
  restoreGuidedAnalysisGoal();
  assert.equal(state.guidedAnalysisGoal, "ellipses-lines");
  assert.deepEqual([...state.visibleKinds], ["ellipse", "segment", "axis"]);
  assert.equal(storedGuidedAnalysisGoalFor({ ...matching, fileId: "file-old" }), null);
  assert.equal(
    storedGuidedAnalysisGoalFor({
      ...matching,
      analysisIdentity: `sha256:${"b".repeat(64)}`,
    }),
    null,
  );
  assert.equal(storedGuidedAnalysisGoalFor("ellipses-lines"), null);
  persisted = { ...matching, fileId: "file-old" };
  restoreGuidedAnalysisGoal();
  assert.equal(state.guidedAnalysisGoal, "general-geometry");
  assert.deepEqual(
    [...state.visibleKinds],
    ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
  );
});

test("rendering a new prepared candidate set scopes guided-goal restoration to its identity", () => {
  const previousIdentity = `sha256:${"a".repeat(64)}`;
  const currentIdentity = `sha256:${"b".repeat(64)}`;
  const calls = [];
  const currentPayload = {
    stage: "confirmation_required",
    fileId: "file-current",
    prepared: { candidateSetIdentity: currentIdentity },
  };
  const currentCandidates = [{ id: "current-line", primitive: { kind: "segment" } }];
  const state = {
    activePayload: currentPayload,
    displayedPayload: null,
    proposalCandidateSetIdentity: previousIdentity,
    reviewedCandidates: [{ id: "previous-line", primitive: { kind: "axis" } }],
  };
  const initializeGuidedAnalysisForPrepared = widgetScriptFunction(
    "initializeGuidedAnalysisForPrepared",
    "function renderCandidates",
    {
      state,
      restoreGuidedAnalysisGoal() {
        calls.push([
          "restore",
          state.proposalCandidateSetIdentity,
          state.reviewedCandidates[0].id,
        ]);
      },
      renderGuidedAnalysisGoals() {
        calls.push([
          "render",
          state.proposalCandidateSetIdentity,
          state.reviewedCandidates[0].id,
        ]);
      },
    },
  );

  initializeGuidedAnalysisForPrepared(
    { candidateSetIdentity: currentIdentity },
    currentCandidates,
  );

  assert.equal(state.proposalCandidateSetIdentity, currentIdentity);
  assert.equal(state.displayedPayload, currentPayload);
  assert.equal(state.reviewedCandidates, currentCandidates);
  assert.deepEqual(calls, [
    ["restore", currentIdentity, "current-line"],
    ["render", currentIdentity, "current-line"],
  ]);
});

test("completed guided choices use the displayed result identity while a prepare payload remains active", () => {
  const completedIdentity = `sha256:${"c".repeat(64)}`;
  const candidateSetIdentity = `sha256:${"d".repeat(64)}`;
  const state = {
    activePayload: {
      stage: "confirmation_required",
      fileId: "file-shared",
      prepared: { candidateSetIdentity },
    },
    displayedPayload: {
      stage: "completed",
      fileId: "file-shared",
      result: { contentIdentity: completedIdentity },
    },
    proposalCandidateSetIdentity: candidateSetIdentity,
  };
  const guidedAnalysisScope = widgetScriptFunction(
    "guidedAnalysisScope",
    "function visibleKindsForGuidedAnalysisGoal",
    { state },
  );

  assert.deepEqual(guidedAnalysisScope(), {
    analysisIdentity: completedIdentity,
    fileId: "file-shared",
  });
});

test("triangle guided goal focuses explicit parent-guide families without enabling constructions", () => {
  const triangleRequestParentGuideIds = widgetScriptFunction(
    "triangleRequestParentGuideIds",
    "function triangleLayerReady",
    {},
  );
  const prepared = {
    candidateSetIdentity: `sha256:${"a".repeat(64)}`,
    candidates: [
      { id: "frame", primitive: { kind: "rectangle" } },
      { id: "line-a", primitive: { kind: "segment" } },
      { id: "line-b", primitive: { kind: "axis" } },
      { id: "ellipse", primitive: { kind: "ellipse" } },
    ],
    triangleConstructionRequests: [{
      requestId: "triangle-guided-focus",
      vertices: [
        {
          point: { x: 0.1, y: 0.1 },
          parent: { kind: "observed-line-endpoint", candidateId: "line-a", endpoint: "start" },
        },
        {
          point: { x: 0.8, y: 0.1 },
          parent: { kind: "observed-line-endpoint", candidateId: "line-a", endpoint: "end" },
        },
        {
          point: { x: 0.4, y: 0.8 },
          parent: { kind: "observed-line-endpoint", candidateId: "line-b", endpoint: "end" },
        },
      ],
    }],
  };
  const state = {
    activePayload: {
      stage: "confirmation_required",
      fileId: "file-triangle",
      prepared,
    },
    payload: { prepared },
    reviewedCandidates: prepared.candidates,
    constructionLayers: new Set(),
    visibleConstructionLayers: new Set(),
  };
  const visibleKindsForGuidedAnalysisGoal = widgetScriptFunction(
    "visibleKindsForGuidedAnalysisGoal",
    "function guidedAnalysisGoalSnapshot",
    {
      state,
      triangleRequestParentGuideIds,
      primitiveKind: (item) => item.primitive.kind,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const goal = PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.find(
    ({ id }) => id === "triangles-constructions",
  );

  assert.deepEqual(visibleKindsForGuidedAnalysisGoal(goal), ["segment", "axis"]);
  assert.deepEqual([...state.constructionLayers], []);
  assert.deepEqual([...state.visibleConstructionLayers], []);
});

test("manual family filters become an identity-scoped custom guided state", () => {
  const candidateSetIdentity = `sha256:${"a".repeat(64)}`;
  const state = {
    activePayload: {
      stage: "confirmation_required",
      fileId: "file-custom",
      prepared: { candidateSetIdentity },
    },
    proposalCandidateSetIdentity: candidateSetIdentity,
    guidedAnalysisGoal: "ellipses-lines",
    visibleKinds: new Set(["ellipse", "segment", "axis"]),
  };
  const saved = {
    reviewedProposalCandidateSetIdentity: candidateSetIdentity,
    reviewedCandidateGeometry: [{ id: "line-a" }],
  };
  const buttonStates = new Map();
  let guidedButtonUpdates = 0;
  let visibilitySyncs = 0;
  let persisted;
  const guidedAnalysisScope = widgetScriptFunction(
    "guidedAnalysisScope",
    "function visibleKindsForGuidedAnalysisGoal",
    { state },
  );
  const guidedAnalysisGoalSnapshot = widgetScriptFunction(
    "guidedAnalysisGoalSnapshot",
    "function storedGuidedAnalysisGoalFor",
    {
      state,
      guidedAnalysisScope,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const persistGuidedAnalysisGoal = widgetScriptFunction(
    "persistGuidedAnalysisGoal",
    "function applyGuidedAnalysisGoal",
    {
      guidedAnalysisGoalSnapshot,
      publicWidgetState: () => saved,
      window: {
        openai: {
          setWidgetState(value) { persisted = value; },
        },
      },
    },
  );
  const guidedGoalStatus = { textContent: "" };
  const toggleFamilyVisibility = widgetScriptFunction(
    "toggleFamilyVisibility",
    "function renderFamilyFilters",
    {
      state,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
      markGuidedAnalysisCustom() {
        state.guidedAnalysisGoal = null;
        guidedButtonUpdates += 1;
        guidedGoalStatus.textContent =
          "Affichage personnalisé · vos filtres de familles sont conservés pour cette analyse seulement.";
      },
      updateGuidedAnalysisGoalButtons() { guidedButtonUpdates += 1; },
      updateFamilyFilterButtons() {
        for (const kind of ["rectangle", "quadrilateral", "segment", "axis", "ellipse"]) {
          buttonStates.set(kind, state.visibleKinds.has(kind));
        }
      },
      syncFamilyVisibility() { visibilitySyncs += 1; },
      guidedGoalStatus,
      persistGuidedAnalysisGoal,
    },
  );

  toggleFamilyVisibility("axis");

  assert.equal(state.guidedAnalysisGoal, null);
  assert.deepEqual([...state.visibleKinds], ["ellipse", "segment"]);
  assert.equal(guidedButtonUpdates, 1);
  assert.equal(visibilitySyncs, 1);
  assert.equal(buttonStates.get("axis"), false);
  assert.match(guidedGoalStatus.textContent, /Affichage personnalisé/u);
  assert.deepEqual(persisted, {
    ...saved,
    guidedAnalysisGoal: {
      analysisIdentity: candidateSetIdentity,
      fileId: "file-custom",
      goalId: null,
      visibleKinds: ["segment", "ellipse"],
    },
  });
});

test("implicit manual-segment visibility changes clear a pressed guided preset", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(
    html,
    /state\.visibleKinds\.add\("segment"\);markGuidedAnalysisCustom\(\)/u,
  );
  const state = {
    confirming: false,
    guidedAnalysisGoal: "frames-proportions",
  };
  const guidedGoalStatus = { textContent: "" };
  let guidedButtonUpdates = 0;
  const markGuidedAnalysisCustom = widgetScriptFunction(
    "markGuidedAnalysisCustom",
    "function toggleFamilyVisibility",
    {
      state,
      updateGuidedAnalysisGoalButtons() { guidedButtonUpdates += 1; },
      guidedGoalStatus,
      CUSTOM_GUIDED_ANALYSIS_GOAL_EFFECT: "Affichage personnalisé",
    },
  );

  markGuidedAnalysisCustom();

  assert.equal(state.guidedAnalysisGoal, null);
  assert.equal(guidedButtonUpdates, 1);
  assert.equal(guidedGoalStatus.textContent, "Affichage personnalisé");
});

test("guided and family-filter choices are inert while confirmation locks the review", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(
    html,
    /guidedGoals\.querySelectorAll\("\.guided-goal"\)\.forEach\(button=>button\.disabled=state\.confirming\)/u,
  );
  assert.match(
    html,
    /familyFilters\.querySelectorAll\("\.family-filter"\)\.forEach\(button=>button\.disabled=state\.confirming\)/u,
  );
  const state = {
    confirming: true,
    guidedAnalysisGoal: "general-geometry",
    visibleKinds: new Set(["rectangle"]),
  };
  let persisted = 0;
  const applyGuidedAnalysisGoal = widgetScriptFunction(
    "applyGuidedAnalysisGoal",
    "function restoreGuidedAnalysisGoal",
    {
      state,
      GUIDED_ANALYSIS_GOALS: PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1,
      visibleKindsForGuidedAnalysisGoal: (goal) => goal.visibleKinds,
      updateGuidedAnalysisGoalButtons() {},
      updateFamilyFilterButtons() {},
      syncFamilyVisibility() {},
      guidedGoalStatus: { textContent: "" },
      persistGuidedAnalysisGoal() { persisted += 1; },
    },
  );
  const toggleFamilyVisibility = widgetScriptFunction(
    "toggleFamilyVisibility",
    "function renderFamilyFilters",
    {
      state,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
      markGuidedAnalysisCustom() {},
      updateFamilyFilterButtons() {},
      syncFamilyVisibility() {},
      persistGuidedAnalysisGoal() { persisted += 1; },
    },
  );

  applyGuidedAnalysisGoal("ellipses-lines");
  toggleFamilyVisibility("segment");

  assert.equal(state.guidedAnalysisGoal, "general-geometry");
  assert.deepEqual([...state.visibleKinds], ["rectangle"]);
  assert.equal(persisted, 0);
});

test("widget restores a persisted manual segment only for the same file and marks deletion dirty", () => {
  const candidate = {
    id: "manual-segment-1",
    label: "Segment ajouté manuellement",
    role: "secondary-subject",
    reason: "Guide tracé explicitement par l’utilisateur dans le widget; preuve candidate à vérifier avant confirmation.",
    x: 0.2,
    y: 0.1,
    width: 0.04,
    height: 0.7,
    primitive: {
      kind: "segment",
      start: { x: 0.2, y: 0.8 },
      end: { x: 0.24, y: 0.1 },
    },
  };
  let saved = {
    manualSegmentState: {
      fileId: "file-manual",
      geometry: {
        id: candidate.id,
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height,
        primitive: candidate.primitive,
      },
    },
  };
  const state = { activePayload: { fileId: "file-manual" } };
  const restoredManualSegmentFor = widgetScriptFunction(
    "restoredManualSegmentFor",
    "function updateManualSegmentControls",
    {
      publicWidgetState: () => saved,
      state,
      MAX_REVIEW_CANDIDATES: 12,
      clonePrimitive: (primitive) => structuredClone(primitive),
      isManualSegmentCandidate: (value) => (
        value.id === candidate.id
        && value.primitive?.kind === "segment"
      ),
      manualSegmentFromGeometry: (geometry) => ({
        ...candidate,
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
        primitive: structuredClone(geometry.primitive),
      }),
    },
  );
  const prepared = {
    candidates: [{
      id: "frame",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }],
  };

  assert.deepEqual(restoredManualSegmentFor(prepared), candidate);
  state.activePayload.fileId = "different-file";
  assert.equal(restoredManualSegmentFor(prepared), null);
  state.activePayload.fileId = "file-manual";
  assert.equal(restoredManualSegmentFor({
    candidates: [...prepared.candidates, candidate],
  }), null);

  const geometryState = {
    proposalCandidates: [...prepared.candidates, candidate],
    reviewedCandidates: prepared.candidates,
  };
  const geometryChanged = widgetScriptFunction(
    "geometryChanged",
    "function rounded",
    {
      state: geometryState,
      geometrySnapshotFor: (value) => value,
    },
  );
  assert.equal(geometryChanged(), true);

  saved = {};
  assert.equal(restoredManualSegmentFor(prepared), null);
});

test("removing a manual segment clears its pixel proposal and overlay state", () => {
  const manualId = "manual-segment-1";
  const calls = [];
  let overlayRemoved = false;
  let cardRemoved = false;
  const state = {
    manualSegmentCandidateId: manualId,
    completed: false,
    confirming: false,
    pixelRefinementRunning: false,
    manualSegmentMode: true,
    manualSegmentAnchor: { x: 0.1, y: 0.2 },
    reviewedCandidates: [{ id: "frame" }, { id: manualId }],
    selectedGuides: new Set(["frame", manualId]),
    pixelRefinementProposals: new Map([[manualId, { status: "refined" }]]),
    adoptedPixelRefinements: new Map([[manualId, "sha256:proposal"]]),
    measurementRatioRefs: [
      { candidateId: manualId, metric: "length" },
      { candidateId: "frame", metric: "width" },
    ],
    payload: { prepared: { candidates: [{ id: "frame" }] } },
  };
  const statusNode = { textContent: "" };
  const removeManualSegment = widgetScriptFunction(
    "removeManualSegment",
    "function resetManualSegmentGesture",
    {
      state,
      overlay: {
        querySelector: () => ({
          remove: () => {
            overlayRemoved = true;
          },
        }),
      },
      candidateList: {
        querySelector: () => ({
          remove: () => {
            cardRemoved = true;
          },
        }),
      },
      CSS: { escape: (value) => value },
      renderFamilyFilters: () => calls.push("renderFamilyFilters"),
      invalidateTriangleConstruction: () => calls.push("invalidateTriangleConstruction"),
      syncPixelProposalOverlay: () => calls.push("syncPixelProposalOverlay"),
      syncFamilyVisibility: () => calls.push("syncFamilyVisibility"),
      syncConstructionVisibility: () => calls.push("syncConstructionVisibility"),
      updatePixelProposalUi: () => calls.push("updatePixelProposalUi"),
      updateMeasurementRatioControls: () => calls.push("updateMeasurementRatioControls"),
      persistReviewState: () => calls.push("persistReviewState"),
      updateManualSegmentControls: () => calls.push("updateManualSegmentControls"),
      updateConfirm: () => calls.push("updateConfirm"),
      statusNode,
    },
  );

  removeManualSegment();

  assert.equal(state.manualSegmentCandidateId, null);
  assert.equal(state.manualSegmentMode, false);
  assert.equal(state.manualSegmentAnchor, null);
  assert.deepEqual(state.reviewedCandidates, [{ id: "frame" }]);
  assert.deepEqual([...state.selectedGuides], ["frame"]);
  assert.equal(state.pixelRefinementProposals.has(manualId), false);
  assert.equal(state.adoptedPixelRefinements.has(manualId), false);
  assert.deepEqual(state.measurementRatioRefs, [{ candidateId: "frame", metric: "width" }]);
  assert.equal(overlayRemoved, true);
  assert.equal(cardRemoved, true);
  assert.ok(calls.includes("syncPixelProposalOverlay"));
  assert.ok(calls.includes("updatePixelProposalUi"));
  assert.match(statusNode.textContent, /Segment manuel supprimé/u);
});

test("widget re-prepares an added manual segment before confirmation and adopts the fresh identity", async () => {
  const oldIdentity = `sha256:${"a".repeat(64)}`;
  const freshIdentity = `sha256:${"b".repeat(64)}`;
  const candidates = [{
    id: "frame",
    label: "Frame",
    role: "frame",
    reason: "Visible frame",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  }, {
    id: "manual-segment-1",
    label: "Segment ajouté manuellement",
    role: "secondary-subject",
    reason: "Guide tracé explicitement par l’utilisateur dans le widget; preuve candidate à vérifier avant confirmation.",
    x: 0.2,
    y: 0.1,
    width: 0.04,
    height: 0.7,
    primitive: {
      kind: "segment",
      start: { x: 0.2, y: 0.8 },
      end: { x: 0.24, y: 0.1 },
    },
  }];
  const calls = [];
  const state = {
    downloadUrl: "https://files.example/manual.jpg",
    activePayloadIdentity: "active-payload",
    payload: null,
    proposalCandidateSetIdentity: oldIdentity,
    proposalCandidates: structuredClone(candidates),
    pixelRefinementProposals: new Map([["provider-segment", {}]]),
    adoptedPixelRefinements: new Map([["provider-segment", "sha256:proposal"]]),
  };
  const prepareReviewedPayload = widgetScriptFunction(
    "prepareReviewedPayload",
    "async function callConfirmation",
    {
      state,
      PREPARE_TOOL: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      callAppTool: async (name, args) => {
        calls.push({ name, args });
        return {
          normaPersonalVisualHarmony: {
            stage: "confirmation_required",
            fileId: "file-manual",
            prepared: { candidateSetIdentity: freshIdentity, candidates },
          },
        };
      },
      findPayload: (value) => value.normaPersonalVisualHarmony,
      samePreparedReviewCandidates: (requested, prepared) => (
        JSON.stringify(requested) === JSON.stringify(prepared)
      ),
    },
  );

  const fresh = await prepareReviewedPayload({
    fileId: "file-manual",
    sourceImageMediaType: "image/jpeg",
  }, candidates);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, PERSONAL_VISUAL_HARMONY_PREPARE_TOOL);
  assert.deepEqual(calls[0].args.candidates, candidates);
  assert.equal(fresh.prepared.candidateSetIdentity, freshIdentity);
  assert.equal(state.payload, fresh);
  assert.equal(state.proposalCandidateSetIdentity, freshIdentity);
  assert.deepEqual(state.proposalCandidates, candidates);
  assert.equal(state.pixelRefinementProposals.size, 0);
  assert.equal(state.adoptedPixelRefinements.size, 0);
});

test("widget restores pending review geometry without adopting its missing server session", () => {
  const originalIdentity = `sha256:${"a".repeat(64)}`;
  const freshIdentity = `sha256:${"b".repeat(64)}`;
  const frame = {
    id: "frame",
    label: "Frame",
    role: "frame",
    reason: "Visible frame",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
  const manualGeometry = {
    id: "manual-segment-1",
    x: 0.2,
    y: 0.1,
    width: 0.04,
    height: 0.7,
    primitive: {
      kind: "segment",
      start: { x: 0.2, y: 0.8 },
      end: { x: 0.24, y: 0.1 },
    },
  };
  const saved = {
    reviewedProposalCandidateSetIdentity: freshIdentity,
    reviewedCandidateGeometry: [
      { id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height },
      manualGeometry,
    ],
    manualSegmentState: { fileId: "file-manual", geometry: manualGeometry },
  };
  const manualCandidate = {
    id: manualGeometry.id,
    label: "Segment ajouté manuellement",
    role: "secondary-subject",
    reason: "Guide tracé explicitement par l’utilisateur dans le widget; preuve candidate à vérifier avant confirmation.",
    ...manualGeometry,
  };
  const preparedForStoredReview = widgetScriptFunction(
    "preparedForStoredReview",
    "function restoredPreparedFor",
    {
      isStoredIdentity: (value) => /^sha256:[0-9a-f]{64}$/u.test(value),
      MAX_REVIEW_CANDIDATES: 12,
      manualSegmentFromGeometry: () => structuredClone(manualCandidate),
      isStoredGeometrySnapshot: (geometry, candidates) => (
        geometry.length === candidates.length
        && geometry.every((item, index) => item.id === candidates[index].id)
      ),
    },
  );
  const restored = preparedForStoredReview(
    { candidateSetIdentity: originalIdentity, candidates: [frame] },
    "file-manual",
    saved,
    freshIdentity,
    saved.reviewedCandidateGeometry,
  );

  assert.equal(restored.candidateSetIdentity, freshIdentity);
  assert.deepEqual(restored.candidates, [frame, manualCandidate]);
  const geometryChanged = widgetScriptFunction(
    "geometryChanged",
    "function rounded",
    {
      state: {
        proposalCandidates: [frame],
        reviewedCandidates: restored.candidates,
      },
      geometrySnapshotFor: (value) => value,
    },
  );
  assert.equal(geometryChanged(), true);
  assert.equal(
    preparedForStoredReview(
      { candidateSetIdentity: originalIdentity, candidates: [frame] },
      "different-file",
      saved,
      freshIdentity,
      saved.reviewedCandidateGeometry,
    ),
    null,
  );
});

test("completed widget cache round-trips related candidates, guided scope, and rejects legacy omissions", async () => {
  const identity = (character) => `sha256:${character.repeat(64)}`;
  const candidateSetIdentity = identity("a");
  const candidates = [
    {
      id: "major",
      label: "Zone principale",
      role: "structural-region",
      reason: "Fixture",
      x: 0,
      y: 0,
      width: GOLDEN_MAJOR,
      height: 1,
    },
    {
      id: "minor",
      label: "Zone secondaire",
      role: "structural-region",
      reason: "Fixture",
      x: GOLDEN_MAJOR,
      y: 0,
      width: 1 - GOLDEN_MAJOR,
      height: 1,
    },
  ];
  const reviewedCandidateGeometry = candidates.map(({ id, x, y, width, height }) => ({
    id,
    x,
    y,
    width,
    height,
  }));
  const triangleConstructionRequests = [{
    requestId: "cached-explicit-triangle",
    vertices: [
      {
        point: { x: 0, y: 0 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
            { kind: "frame-edge", frameEdgeIndex: 0 },
          ],
        },
      },
      {
        point: { x: 1, y: 0 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-1-to-3" },
            { kind: "frame-edge", frameEdgeIndex: 0 },
          ],
        },
      },
      {
        point: { x: 0.5, y: 0.5 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
            { kind: "format-diagonal", diagonal: "vertex-1-to-3" },
          ],
        },
      },
    ],
  }];
  const match = {
    subjectCandidateId: "major",
    subjectLabel: "Zone principale",
    relatedCandidateIds: ["minor"],
    metric: "horizontal-split-share",
    quality: "exact",
    ratioLabel: "φ major",
    ratioFamily: "golden-ratio",
    observedPercent: 61.803,
    targetPercent: 61.803,
    deltaPercentagePoints: 0,
    explanation: "Mesure déterministe de fixture",
  };
  const presentation = createPersonalVisualHarmonyPresentationV1([match]);
  const persistedStates = [];
  const state = {
    completed: false,
    activePayload: {
      stage: "confirmation_required",
      fileId: "file-completed",
      prepared: { candidateSetIdentity },
    },
    payload: { prepared: { candidateSetIdentity, triangleConstructionRequests } },
    proposalCandidateSetIdentity: candidateSetIdentity,
    guidedAnalysisGoal: "ellipses-lines",
    visibleKinds: new Set(["segment", "axis", "ellipse"]),
    constructionLayers: new Set([
      "support-line-extensions",
      "format-diagonals",
      "junction-angles",
      "triangles",
      "triangle-medians",
    ]),
    dimensions: { width: 1_000, height: 800 },
  };
  const guidedAnalysisScope = widgetScriptFunction(
    "guidedAnalysisScope",
    "function visibleKindsForGuidedAnalysisGoal",
    { state },
  );
  const guidedAnalysisGoalSnapshot = widgetScriptFunction(
    "guidedAnalysisGoalSnapshot",
    "function storedGuidedAnalysisGoalFor",
    {
      state,
      guidedAnalysisScope,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const previousGuidedAnalysisGoal = {
    analysisIdentity: candidateSetIdentity,
    fileId: "file-completed",
    goalId: "ellipses-lines",
    visibleKinds: ["segment", "axis", "ellipse"],
  };
  const constructionGuideState = {
    candidateSetIdentity,
    layers: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians"],
  };
  const pixelRefinementState = {
    enabled: false,
    candidateSetIdentity,
    proposals: [],
    adopted: [],
  };
  const classList = { add() {}, remove() {} };
  const renderResult = widgetScriptFunction("renderResult", "function renderCachedResult", {
    state,
    overlay: { classList, innerHTML: "" },
    candidateList: { querySelectorAll: () => [] },
    confirmButton: { style: {} },
    stageNode: { textContent: "", classList },
    statusNode: { textContent: "" },
    renderFacts() {},
    appendQuadrilateralMeasurements() {},
    appendImagePlaneRelations() {},
    appendConstructionAnalysis() {},
    appendDeclaredMeasurementRatioReport() {},
    safeSvg: () => "",
    syncCandidateLabelLayout() {},
    syncFamilyVisibility() {},
    syncConstructionVisibility() {},
    geometrySnapshot: () => reviewedCandidateGeometry,
    constructionLayerSnapshot: () => ({
      candidateSetIdentity,
      layers: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians"].filter((layer) => (
        state.constructionLayers.has(layer)
      )),
    }),
    pixelRefinementSnapshot: () => pixelRefinementState,
    measurementRatioRequest: () => undefined,
    coreSelectedIds: () => ["major", "minor"],
    confirmedGuideIds: () => [],
    publicWidgetState: () => ({ guidedAnalysisGoal: previousGuidedAnalysisGoal }),
    guidedAnalysisGoalSnapshot,
    window: { openai: { setWidgetState: (value) => { persistedStates.push(value); } } },
    CONFIRM_TOOL: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
    CONSTRUCTION_LAYERS: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians"],
    updateConstructionControls() {},
    updateMeasurementRatioControls() {},
    updatePixelProposalUi() {},
    updateConfirm() {},
  });
  renderResult(
    {
      stage: "completed",
      fileId: "file-completed",
      result: {
        headline: "Analyse terminée",
        contentIdentity: identity("b"),
        confirmedSelectionIdentity: identity("c"),
        mappedGeometryContentIdentity: identity("d"),
        explanations: [match],
      },
      imagePlaneGuideAnalysis: {
        confirmedVisualGuideCandidateIds: [],
        relationships: [],
        quadrilateralMeasurements: [],
        constructionAnalysis: {
          enabledLayers: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians"],
          supportLineExtensions: [],
          formatDiagonals: [],
          junctionAngles: [],
          triangles: [],
          triangleMedians: [],
        },
      },
      overlaySvg: "",
    },
    { ratioPackRefs: ["norma.geometry-harmonies@0.1.0"], presentation },
  );

  const persisted = persistedStates.at(-1);
  assert.equal(state.displayedPayload.result.contentIdentity, identity("b"));
  assert.deepEqual(persisted.guidedAnalysisGoal, {
    ...previousGuidedAnalysisGoal,
    analysisIdentity: identity("b"),
  });
  assert.deepEqual(persisted.constructionGuideState, constructionGuideState);
  assert.deepEqual(persisted.completedVisualHarmony.constructionGuideState, constructionGuideState);
  assert.deepEqual(persisted.pixelRefinementState, pixelRefinementState);
  assert.deepEqual(persisted.completedVisualHarmony.pixelRefinementState, pixelRefinementState);
  assert.deepEqual(
    persisted.completedVisualHarmony.matches[0].relatedCandidateIds,
    ["minor"],
  );

  renderResult(
    {
      result: {
        headline: "Analyse sans construction",
        contentIdentity: identity("e"),
        confirmedSelectionIdentity: identity("f"),
        mappedGeometryContentIdentity: identity("0"),
        explanations: [match],
      },
      overlaySvg: "",
    },
    { ratioPackRefs: ["norma.geometry-harmonies@0.1.0"], presentation },
  );
  assert.deepEqual([...state.constructionLayers], []);
  assert.deepEqual(persistedStates.at(-1).constructionGuideState.layers, []);

  const isStoredMatch = widgetScriptFunction(
    "isStoredMatch",
    "function isStoredPresentationSubject",
    {},
  );
  const storedPixelRefinementStateFor = widgetScriptFunction(
    "storedPixelRefinementStateFor",
    "function restorePixelRefinementState",
    {
      validPixelProposal: () => true,
      isStoredIdentity: (value) => typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value),
    },
  );
  const isStoredGeometrySnapshot = (value, preparedCandidates) => (
    Array.isArray(value) && value.length === preparedCandidates.length
  );
  const completedPixelRefinementStateFor = widgetScriptFunction(
    "completedPixelRefinementStateFor",
    "function isStoredMatch",
    {
      storedPixelRefinementStateFor,
      preparedWithReviewedCandidates: (prepared) => prepared,
      isStoredGeometrySnapshot,
    },
  );
  const storedConstructionGuideStateFor = widgetScriptFunction(
    "storedConstructionGuideStateFor",
    "function updateConstructionControls",
    {
      CONSTRUCTION_LAYERS: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians"],
      triangleRequestDependencies: widgetScriptFunction(
        "triangleRequestDependencies",
        "function triangleLayerReady",
        { CONSTRUCTION_LAYERS: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians"] },
      ),
    },
  );
  const completedConstructionGuideStateFor = widgetScriptFunction(
    "completedConstructionGuideStateFor",
    "function isStoredMatch",
    { storedConstructionGuideStateFor },
  );
  const preparedForStoredReview = widgetScriptFunction(
    "preparedForStoredReview",
    "function restoredPreparedFor",
    {
      isStoredIdentity: (value) => typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value),
      MAX_REVIEW_CANDIDATES: 12,
      manualSegmentFromGeometry: (geometry) => ({
        id: geometry.id,
        label: "Segment ajouté manuellement",
        role: "secondary-subject",
        reason: "Guide tracé explicitement par l’utilisateur dans le widget; preuve candidate à vérifier avant confirmation.",
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
        primitive: structuredClone(geometry.primitive),
      }),
      isStoredGeometrySnapshot,
    },
  );
  const completedPreparedFor = widgetScriptFunction(
    "completedPreparedFor",
    "function completedWidgetStateFor",
    {
      preparedForStoredReview,
    },
  );
  const completedWidgetStateFor = (publicWidgetState) => widgetScriptFunction(
    "completedWidgetStateFor",
    "function payloadIdentity",
    {
      publicWidgetState,
      primitiveKind: (item) => item?.primitive?.kind ?? "rectangle",
      sameIds: (left, right) => (
        Array.isArray(left)
        && Array.isArray(right)
        && left.length === right.length
        && left.every((id, index) => id === right[index])
      ),
      isStoredGeometrySnapshot,
      sameGeometrySnapshots: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      completedPixelRefinementStateFor,
      completedConstructionGuideStateFor,
      isStoredIdentity: (value) => typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value),
      isStoredMatch,
      isStoredPresentation: () => true,
      CONFIRM_TOOL: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      completedPreparedFor,
    },
  );
  const payload = {
    stage: "confirmation_required",
    fileId: "file-cache",
    prepared: { candidateSetIdentity, candidates, triangleConstructionRequests },
    overlaySvg: "<svg></svg>",
  };
  const acceptPersisted = completedWidgetStateFor(() => persisted);
  assert.deepEqual(acceptPersisted(payload)?.matches[0].relatedCandidateIds, ["minor"]);

  const manualIdentity = identity("9");
  const manualGeometry = {
    id: "manual-segment-1",
    x: 0.2,
    y: 0.1,
    width: 0.04,
    height: 0.7,
    primitive: {
      kind: "segment",
      start: { x: 0.2, y: 0.8 },
      end: { x: 0.24, y: 0.1 },
    },
  };
  const persistedManual = structuredClone(persisted);
  persistedManual.reviewedProposalCandidateSetIdentity = manualIdentity;
  persistedManual.reviewedCandidateGeometry.push(manualGeometry);
  persistedManual.confirmedVisualGuideCandidateIds = ["manual-segment-1"];
  persistedManual.manualSegmentState = {
    fileId: payload.fileId,
    geometry: manualGeometry,
  };
  persistedManual.pixelRefinementState.candidateSetIdentity = manualIdentity;
  persistedManual.constructionGuideState.candidateSetIdentity = manualIdentity;
  Object.assign(persistedManual.completedVisualHarmony, {
    candidateSetIdentity: manualIdentity,
    reviewedCandidateGeometry: structuredClone(persistedManual.reviewedCandidateGeometry),
    confirmedVisualGuideCandidateIds: ["manual-segment-1"],
    pixelRefinementState: structuredClone(persistedManual.pixelRefinementState),
    constructionGuideState: structuredClone(persistedManual.constructionGuideState),
  });
  assert.deepEqual(
    completedWidgetStateFor(() => persistedManual)(payload)?.confirmedVisualGuideCandidateIds,
    ["manual-segment-1"],
  );

  const staleManual = structuredClone(persistedManual);
  staleManual.manualSegmentState.fileId = "different-file";
  assert.equal(completedWidgetStateFor(() => staleManual)(payload), null);

  const mismatchedPixelCache = structuredClone(persisted);
  mismatchedPixelCache.pixelRefinementState = {
    ...mismatchedPixelCache.pixelRefinementState,
    enabled: true,
  };
  assert.equal(completedWidgetStateFor(() => mismatchedPixelCache)(payload), null);

  const mismatchedConstructionCache = structuredClone(persisted);
  mismatchedConstructionCache.constructionGuideState = {
    ...mismatchedConstructionCache.constructionGuideState,
    layers: ["format-diagonals"],
  };
  assert.equal(completedWidgetStateFor(() => mismatchedConstructionCache)(payload), null);

  for (const corruptTarget of ["saved", "completed"]) {
    const corruptedGeometryCache = structuredClone(persisted);
    if (corruptTarget === "saved") corruptedGeometryCache.reviewedCandidateGeometry = { malformed: true };
    else corruptedGeometryCache.completedVisualHarmony.reviewedCandidateGeometry = { malformed: true };
    assert.doesNotThrow(() => completedWidgetStateFor(() => corruptedGeometryCache)(payload));
    assert.equal(completedWidgetStateFor(() => corruptedGeometryCache)(payload), null);
  }

  const payloadIdentity = widgetScriptFunction("payloadIdentity", "function imageLoadIsCurrent", {});
  const hydrationState = widgetHydrationState();
  const revalidated = [];
  const hydrate = widgetScriptFunction("hydrate", "confirmButton.addEventListener", {
    state: hydrationState,
    currentPayload: () => null,
    window: { openai: {} },
    payloadIdentity,
    resetManualSegmentGesture() {},
    overlay: { innerHTML: "" },
    safeSvg: (value) => value,
    renderCandidates() {},
    loadImage: async () => true,
    completedWidgetStateFor: acceptPersisted,
    revalidateCompleted: async (_payload, completed) => { revalidated.push(completed); },
    renderResult() { throw new Error("confirmation payload must revalidate cached state"); },
  });
  await hydrate(payload);
  assert.deepEqual(revalidated[0]?.matches[0].relatedCandidateIds, ["minor"]);

  const legacy = structuredClone(persisted);
  delete legacy.completedVisualHarmony.matches[0].relatedCandidateIds;
  assert.equal(completedWidgetStateFor(() => legacy)(payload), null);
});

test("widget construction controls are distinct, payload-safe, and cannot run Core before confirmation", async () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /id="supportLineToggle"[^>]*aria-pressed="false"/u);
  assert.match(html, /id="formatDiagonalToggle"[^>]*aria-pressed="false"/u);
  assert.match(html, /id="junctionAngleToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /id="triangleToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /id="triangleMedianToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /id="trianglePerpendicularBisectorToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /id="triangleAngleBisectorToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /id="triangleAltitudeToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /id="triangleCentroidToggle"[^>]*aria-pressed="false"[^>]*disabled/u);
  assert.match(html, /CONSTRUCTION_LAYERS=\["support-line-extensions","format-diagonals","junction-angles","triangles","triangle-medians","triangle-perpendicular-bisectors","triangle-angle-bisectors","triangle-altitudes","triangle-centroids"\]/u);
  assert.match(html, /triangleAngleBisectors:\(analysis\.constructionAnalysis\.triangleAngleBisectors\|\|\[\]\)\.slice\(0,12\)/u);
  assert.match(html, /triangleAltitudes:\(analysis\.constructionAnalysis\.triangleAltitudes\|\|\[\]\)\.slice\(0,12\)/u);
  assert.match(html, /BISSECTRICES DÉRIVÉES/u);
  assert.match(html, /HAUTEURS DÉRIVÉES/u);
  assert.match(html, /constructionAnalysis\?\.triangleAngleBisectors\?\.length\|\|0/u);
  assert.match(html, /constructionAnalysis\?\.triangleAltitudes\?\.length\|\|0/u);
  assert.match(html, /overlay\.querySelectorAll\("\[data-construction-layer\]"\)/u);
  assert.match(html, /completedConstructionLayers=.*:\[\];state\.constructionLayers=new Set\(completedConstructionLayers\)/u);
  assert.match(
    html,
    /invalidateTriangleConstruction\(\);updateConstructionControls\(\);syncOverlaySelection\(\)/u,
  );

  const layers = ["support-line-extensions", "format-diagonals", "junction-angles", "triangles", "triangle-medians", "triangle-perpendicular-bisectors", "triangle-angle-bisectors", "triangle-altitudes", "triangle-centroids"];
  const candidateSetIdentity = `sha256:${"a".repeat(64)}`;
  const prepared = {
    candidateSetIdentity,
    triangleConstructionRequests: [{
      requestId: "explicit-triangle",
      vertices: [
        { point: { x: 0.1, y: 0.1 }, parent: { kind: "observed-line-endpoint", candidateId: "line-a", endpoint: "start" } },
        { point: { x: 0.8, y: 0.1 }, parent: { kind: "observed-line-endpoint", candidateId: "line-a", endpoint: "end" } },
        { point: { x: 0.4, y: 0.8 }, parent: { kind: "observed-line-endpoint", candidateId: "line-b", endpoint: "end" } },
      ],
    }],
  };
  const state = {
    completed: false,
    confirming: false,
    proposalCandidateSetIdentity: candidateSetIdentity,
    constructionLayers: new Set(),
    visibleConstructionLayers: new Set(),
    selectedGuides: new Set(["line-a", "line-b"]),
    payload: { prepared },
  };
  let persisted = 0;
  let visibilitySyncs = 0;
  let appToolCalls = 0;
  const triangleRequestDependencies = widgetScriptFunction(
    "triangleRequestDependencies",
    "function triangleRequestParentGuideIds",
    { CONSTRUCTION_LAYERS: layers },
  );
  const triangleRequestParentGuideIds = widgetScriptFunction(
    "triangleRequestParentGuideIds",
    "function triangleLayerReady",
    {},
  );
  const triangleLayerReady = widgetScriptFunction(
    "triangleLayerReady",
    "function triangleMedianLayerReady",
    {
      state,
      triangleRequestDependencies,
      triangleRequestParentGuideIds,
      geometryChanged: () => false,
    },
  );
  const triangleMedianLayerReady = widgetScriptFunction(
    "triangleMedianLayerReady",
    "function storedConstructionGuideStateFor",
    { state, triangleLayerReady },
  );
  assert.equal(
    triangleMedianLayerReady(
      { ...prepared, triangleConstructionRequests: [
        ...prepared.triangleConstructionRequests,
        { ...prepared.triangleConstructionRequests[0], requestId: "second-triangle" },
      ] },
      new Set(["support-line-extensions", "triangles"]),
    ),
    false,
  );
  const readyLayers = new Set(["support-line-extensions"]);
  assert.equal(triangleLayerReady(prepared, readyLayers), true);
  state.selectedGuides.delete("line-b");
  assert.equal(triangleLayerReady(prepared, readyLayers), false);
  state.selectedGuides.add("line-b");
  const toggleConstructionLayer = widgetScriptFunction(
    "toggleConstructionLayer",
    "function syncFamilyVisibility",
    {
      state,
      CONSTRUCTION_LAYERS: layers,
      triangleLayerReady,
      triangleMedianLayerReady,
      trianglePerpendicularBisectorLayerReady: triangleMedianLayerReady,
      triangleAngleBisectorLayerReady: triangleMedianLayerReady,
      triangleAltitudeLayerReady: triangleMedianLayerReady,
      triangleCentroidLayerReady: triangleMedianLayerReady,
      syncConstructionVisibility() { visibilitySyncs += 1; },
      persistReviewState() { persisted += 1; },
      statusNode: { textContent: "" },
    },
  );

  toggleConstructionLayer("junction-angles");
  assert.deepEqual([...state.constructionLayers], []);
  assert.equal(persisted, 0);
  toggleConstructionLayer("triangles");
  assert.deepEqual([...state.constructionLayers], []);
  assert.equal(persisted, 0);
  toggleConstructionLayer("triangle-medians");
  assert.deepEqual([...state.constructionLayers], []);
  toggleConstructionLayer("triangle-angle-bisectors");
  assert.deepEqual([...state.constructionLayers], []);
  toggleConstructionLayer("triangle-altitudes");
  assert.deepEqual([...state.constructionLayers], []);
  assert.equal(persisted, 0);

  toggleConstructionLayer("support-line-extensions");
  assert.deepEqual([...state.constructionLayers], ["support-line-extensions"]);
  assert.equal(persisted, 1);
  assert.equal(visibilitySyncs, 1);
  assert.equal(appToolCalls, 0);

  toggleConstructionLayer("junction-angles");
  assert.deepEqual([...state.constructionLayers], ["support-line-extensions", "junction-angles"]);
  toggleConstructionLayer("triangles");
  assert.deepEqual([...state.constructionLayers], ["support-line-extensions", "junction-angles", "triangles"]);
  toggleConstructionLayer("triangle-medians");
  toggleConstructionLayer("triangle-perpendicular-bisectors");
  toggleConstructionLayer("triangle-angle-bisectors");
  toggleConstructionLayer("triangle-altitudes");
  toggleConstructionLayer("triangle-centroids");
  assert.deepEqual([...state.constructionLayers], [
    "support-line-extensions",
    "junction-angles",
    "triangles",
    "triangle-medians",
    "triangle-perpendicular-bisectors",
    "triangle-angle-bisectors",
    "triangle-altitudes",
    "triangle-centroids",
  ]);
  toggleConstructionLayer("support-line-extensions");
  assert.deepEqual([...state.constructionLayers], []);
  toggleConstructionLayer("support-line-extensions");
  toggleConstructionLayer("format-diagonals");
  toggleConstructionLayer("junction-angles");
  toggleConstructionLayer("triangles");
  toggleConstructionLayer("triangle-medians");
  toggleConstructionLayer("triangle-perpendicular-bisectors");
  toggleConstructionLayer("triangle-angle-bisectors");
  toggleConstructionLayer("triangle-altitudes");
  toggleConstructionLayer("triangle-centroids");
  assert.deepEqual([...state.constructionLayers], layers);
  assert.deepEqual([...state.visibleConstructionLayers], layers);
  assert.equal(appToolCalls, 0);

  const storedConstructionGuideStateFor = widgetScriptFunction(
    "storedConstructionGuideStateFor",
    "function updateConstructionControls",
    { CONSTRUCTION_LAYERS: layers, triangleRequestDependencies },
  );
  let saved = {
    constructionGuideState: {
      candidateSetIdentity,
      layers: ["triangle-centroids", "triangle-altitudes", "triangle-angle-bisectors", "triangle-perpendicular-bisectors", "triangle-medians", "triangles", "junction-angles", "format-diagonals", "support-line-extensions"],
    },
  };
  const restoreState = {
    constructionLayers: new Set(),
    visibleConstructionLayers: new Set(),
  };
  const restoreConstructionGuideState = widgetScriptFunction(
    "restoreConstructionGuideState",
    "function toggleConstructionLayer",
    {
      publicWidgetState: () => saved,
      storedConstructionGuideStateFor,
      triangleLayerReady: () => true,
      state: restoreState,
      syncConstructionVisibility() {},
    },
  );
  restoreConstructionGuideState(prepared);
  assert.deepEqual([...restoreState.constructionLayers], layers);
  assert.deepEqual([...restoreState.visibleConstructionLayers], layers);
  saved = {
    constructionGuideState: {
      candidateSetIdentity,
      layers: ["junction-angles"],
    },
  };
  restoreConstructionGuideState(prepared);
  assert.deepEqual([...restoreState.constructionLayers], []);
  restoreConstructionGuideState({ ...prepared, candidateSetIdentity: `sha256:${"b".repeat(64)}` });
  assert.deepEqual([...restoreState.constructionLayers], []);

  const pixelRecovery = widgetScriptFunction(
    "pixelRecovery",
    "async function requestPixelProposal",
    {},
  );
  const callConfirmation = widgetScriptFunction(
    "callConfirmation",
    "function finishConfirmingPayload",
    {
      CONFIRM_TOOL: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      pixelRecovery,
      callAppTool: async (_name, args) => {
        appToolCalls += 1;
        return args;
      },
    },
  );
  const args = await callConfirmation(
    {
      sessionId: "session:test",
      fileId: "file-test",
      sourceImageMediaType: "image/png",
      prepared: { ...prepared, candidates: [] },
    },
    ["core-rectangle"],
    ["observed-oblique"],
    layers,
    { width: 1200, height: 800 },
  );
  assert.deepEqual(args.constructionLayers, layers);
  assert.deepEqual(args.recovery.triangleConstructionRequests, prepared.triangleConstructionRequests);
  assert.equal(args.confirmClientReviewedSelection, true);
  assert.equal(appToolCalls, 1);

  const persistedBeforeCompletedToggle = persisted;
  state.completed = true;
  state.visibleConstructionLayers = new Set(layers);
  toggleConstructionLayer("triangle-medians");
  assert.deepEqual([...state.constructionLayers], layers);
  assert.deepEqual([...state.visibleConstructionLayers], layers.filter((layer) => layer !== "triangle-medians"));
  assert.equal(persisted, persistedBeforeCompletedToggle);
  assert.equal(appToolCalls, 1);
  toggleConstructionLayer("triangle-medians");
  assert.deepEqual([...state.visibleConstructionLayers].sort(), [...layers].sort());
  assert.equal(persisted, persistedBeforeCompletedToggle);
});

test("widget pixel proposals remain separate until an explicit adoption click", () => {
  const originalGeometry = {
    kind: "quadrilateral",
    vertices: [
      { x: 0.1, y: 0.1 },
      { x: 0.8, y: 0.12 },
      { x: 0.72, y: 0.8 },
      { x: 0.18, y: 0.76 },
    ],
  };
  const proposedGeometry = {
    kind: "quadrilateral",
    vertices: [
      { x: 0.101, y: 0.099 },
      { x: 0.802, y: 0.121 },
      { x: 0.719, y: 0.801 },
      { x: 0.179, y: 0.759 },
    ],
  };
  const proposalIdentity = `sha256:${"e".repeat(64)}`;
  const proposal = {
    candidateId: "trapezoid",
    status: "refined",
    contentIdentity: proposalIdentity,
    originalGeometry,
    proposedGeometry,
    proposalAdopted: false,
    automaticAcceptance: false,
    explicitProposalAdoptionRequired: true,
    explicitUserConfirmationRequired: true,
    coreRun: false,
  };
  const reviewedCandidate = {
    id: "trapezoid",
    primitive: structuredClone(originalGeometry),
  };
  const state = {
    completed: false,
    confirming: false,
    pixelRefinementRunning: false,
    reviewedCandidates: [reviewedCandidate],
    pixelRefinementProposals: new Map([[proposal.candidateId, proposal]]),
    adoptedPixelRefinements: new Map(),
    constructionLayers: new Set(["support-line-extensions", "triangles", "triangle-medians"]),
    visibleConstructionLayers: new Set(["support-line-extensions", "triangles", "triangle-medians"]),
  };
  let persisted = 0;
  let confirmed = 0;
  let proposalUiUpdates = 0;
  const applyPixelProposal = widgetScriptFunction(
    "applyPixelProposal",
    "function disablePixelRefinement",
    {
      state,
      candidateWithPrimitive: (item, primitive) => ({ ...item, primitive }),
      clonePrimitive: structuredClone,
      syncOverlayGeometry() {},
      updateMeasurementRatioControls() { confirmed += 1; },
      invalidateTriangleConstruction() {
        state.constructionLayers.delete("triangles");
        state.constructionLayers.delete("triangle-medians");
        state.visibleConstructionLayers.delete("triangles");
        state.visibleConstructionLayers.delete("triangle-medians");
      },
      updatePixelProposalUi() { proposalUiUpdates += 1; },
      persistReviewState() { persisted += 1; },
      statusNode: { textContent: "" },
    },
  );

  assert.deepEqual(state.reviewedCandidates[0].primitive, originalGeometry);
  assert.equal(state.adoptedPixelRefinements.size, 0);
  applyPixelProposal("trapezoid");
  assert.deepEqual(state.reviewedCandidates[0].primitive, proposedGeometry);
  assert.equal(state.adoptedPixelRefinements.get("trapezoid"), proposalIdentity);
  assert.equal(proposal.proposalAdopted, false);
  assert.equal(proposal.coreRun, false);
  assert.equal(persisted, 1);
  assert.equal(confirmed, 1);
  assert.equal(proposalUiUpdates, 1);
  assert.deepEqual([...state.constructionLayers], ["support-line-extensions"]);
  assert.deepEqual([...state.visibleConstructionLayers], ["support-line-extensions"]);

  applyPixelProposal("trapezoid");
  assert.deepEqual(state.reviewedCandidates[0].primitive, originalGeometry);
  assert.equal(state.adoptedPixelRefinements.size, 0);
  assert.equal(persisted, 2);
  assert.equal(proposalUiUpdates, 2);
});

test("widget adoption synchronizes ellipse overlay geometry before confirmation", () => {
  const attributes = new Map();
  const shape = {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
  };
  const group = {
    querySelector(selector) {
      return selector === "[data-candidate-shape]" ? shape : null;
    },
  };
  const state = {
    reviewedCandidates: [{
      id: "ellipse",
      x: 0.2,
      y: 0.3,
      width: 0.4,
      height: 0.2,
      primitive: {
        kind: "ellipse",
        center: { x: 0.4, y: 0.4 },
        radiusX: 0.2,
        radiusY: 0.1,
      },
    }],
  };
  let measurementPreviewUpdates = 0;
  const syncOverlayGeometry = widgetScriptFunction(
    "syncOverlayGeometry",
    "function syncOverlaySelection",
    {
      state,
      overlay: { querySelector: () => group },
      CSS: { escape: (value) => value },
      primitiveKind: (item) => item.primitive.kind,
      ellipseAxes: ellipseAxesForTest,
      visibleEllipseHandlePoint: (point) => ({ point, proxy: false }),
      supportingLineEndpoints() { throw new Error("line branch must remain unused"); },
      syncCandidateLabelLayout() {},
      syncPixelProposalOverlay() {},
      syncConstructionVisibility() {},
      syncMeasurementRatioPreview() { measurementPreviewUpdates += 1; },
    },
  );

  syncOverlayGeometry();
  assert.deepEqual(Object.fromEntries(attributes), {
    cx: "400",
    cy: "400",
    rx: "200",
    ry: "100",
  });
  assert.equal(measurementPreviewUpdates, 1);
});

test("widget preserves rotated ellipse rendering and includes it in opt-in pixel refinement", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(
    html,
    /adopted\?"Géométrie originale et proposition pixel adoptée explicitement":"Géométrie originale et proposition pixel non adoptée"/u,
  );
  const attributes = new Map();
  const shape = {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
  };
  const rotated = {
    id: "rotated",
    label: "Ellipse orientée",
    x: 0.3,
    y: 0.35,
    width: 0.4,
    height: 0.3,
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 30,
    },
  };
  const state = {
    reviewedCandidates: [rotated],
    pixelRefinementProposals: new Map(),
    adoptedPixelRefinements: new Map(),
  };
  const syncOverlayGeometry = widgetScriptFunction(
    "syncOverlayGeometry",
    "function syncOverlaySelection",
    {
      state,
      overlay: { querySelector: () => ({
        querySelector: (selector) => selector === "[data-candidate-shape]" ? shape : null,
      }) },
      primitiveKind: (item) => item.primitive.kind,
      ellipseAxes: ellipseAxesForTest,
      visibleEllipseHandlePoint: (point) => ({ point, proxy: false }),
      CSS: { escape: (value) => value },
      syncCandidateLabelLayout: () => {},
      syncPixelProposalOverlay: () => {},
      syncConstructionVisibility: () => {},
      syncMeasurementRatioPreview: () => {},
      supportingLineEndpoints: () => null,
    },
  );
  syncOverlayGeometry();
  assert.equal(attributes.get("transform"), "rotate(30 500 500)");
  assert.equal(attributes.get("data-ellipse-orientation-degrees"), "30");

  const pixelRefinementCandidateSnapshot = widgetScriptFunction(
    "pixelRefinementCandidateSnapshot",
    "function reconcileStoredPixelAdoptions",
    {
      state,
      primitiveKind: (item) => item.primitive?.kind ?? "rectangle",
      samePixelProposalPrimitive: () => false,
      candidateWithPrimitive: (item) => item,
      clonePrimitive: structuredClone,
    },
  );
  assert.deepEqual(pixelRefinementCandidateSnapshot(), [rotated]);

  const ellipseEnvelope = (primitive) => {
    const radians = primitive.rotationDegrees * Math.PI / 180;
    const halfWidth = Math.hypot(primitive.radiusX * Math.cos(radians),
      primitive.radiusY * Math.sin(radians));
    const halfHeight = Math.hypot(primitive.radiusX * Math.sin(radians),
      primitive.radiusY * Math.cos(radians));
    return {
      x: primitive.center.x - halfWidth,
      y: primitive.center.y - halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    };
  };
  const envelope = ellipseEnvelope(rotated.primitive);
  const reviewed = {
    id: rotated.id,
    ...envelope,
    primitive: rotated.primitive,
  };
  const validGeometryPatch = widgetScriptFunction(
    "validGeometryPatch",
    "function reviewedCandidatesFor",
    {
      primitiveKind: (item) => item.primitive?.kind ?? "rectangle",
      validPoint: (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
      pointEnvelope: () => null,
      envelopeMatches: (value, expected) => ["x", "y", "width", "height"]
        .every((field) => Math.abs(value[field] - expected[field]) <= 0.000001),
      validQuadrilateralVertices: () => false,
      ellipseEnvelope,
      ellipsePerimeterIntersectsImage: () => true,
    },
  );
  assert.equal(validGeometryPatch(reviewed, rotated), true);
  assert.equal(validGeometryPatch({
    ...reviewed,
    ...ellipseEnvelope({ ...reviewed.primitive, rotationDegrees: 31 }),
    primitive: { ...reviewed.primitive, rotationDegrees: 31 },
  }, rotated), true);
  assert.equal(validGeometryPatch({
    ...reviewed,
    primitive: { ...reviewed.primitive, rotationDegrees: 31 },
  }, rotated), false);

  const proposalShapeAttributes = new Map();
  const pixelShape = widgetScriptFunction(
    "pixelShape",
    "function syncPixelProposalOverlay",
    {
      document: {
        createElementNS: () => ({
          setAttribute(name, value) { proposalShapeAttributes.set(name, value); },
        }),
      },
    },
  );
  pixelShape({ ...rotated.primitive, rotationDegrees: 32 }, "#db2777", "12 8");
  assert.equal(proposalShapeAttributes.get("transform"), "rotate(32 500 500)");
  assert.equal(proposalShapeAttributes.get("data-ellipse-orientation-degrees"), "32");
});

test("widget accepts only equivalent canonical envelopes after rotated adoption re-prepare", () => {
  const samePreparedReviewCandidates = widgetScriptFunction(
    "samePreparedReviewCandidates",
    "async function prepareReviewedPayload",
    {},
  );
  const requested = [{
    id: "rotated-ellipse",
    label: "Ellipse orientée",
    role: "structural-region",
    reason: "Contour explicite",
    x: 0.265766,
    y: 0.293487,
    width: 0.468468,
    height: 0.363026,
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.475 },
      radiusX: 0.2625,
      radiusY: 0.1375,
      rotationDegrees: 32,
    },
  }];
  const canonical = structuredClone(requested);
  Object.assign(canonical[0], {
    x: 0.2657660813,
    y: 0.293486994047,
    width: 0.468467837401,
    height: 0.363026011907,
  });

  assert.equal(samePreparedReviewCandidates(requested, canonical), true);
  assert.equal(samePreparedReviewCandidates(requested, [{
    ...canonical[0],
    primitive: { ...canonical[0].primitive, rotationDegrees: 33 },
  }]), false);
  assert.equal(samePreparedReviewCandidates(requested, [{ ...canonical[0], label: "Substituée" }]), false);
  assert.equal(samePreparedReviewCandidates(requested, [{ ...canonical[0], x: requested[0].x + 0.000002 }]), false);
  assert.equal(samePreparedReviewCandidates(requested, [{ ...canonical[0], sourceTruth: false }]), false);
});

test("widget accepts only bounded rotated ellipse proposal metadata for the active candidate set", () => {
  const candidateSetIdentity = `sha256:${"a".repeat(64)}`;
  const originalGeometry = {
    kind: "ellipse",
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.25,
    radiusY: 0.125,
    rotationDegrees: 30,
  };
  const proposedGeometry = {
    kind: "ellipse",
    center: { x: 0.5125, y: 0.4875 },
    radiusX: 0.2625,
    radiusY: 0.1375,
    rotationDegrees: 32,
  };
  const candidate = { id: "rotated", primitive: originalGeometry };
  const prepared = { candidateSetIdentity, candidates: [candidate] };
  const validPixelProposalFields = widgetScriptFunction(
    "validPixelProposalFields",
    "function validRotatedEllipseSearch",
    {},
  );
  const validRotatedEllipseSearch = widgetScriptFunction(
    "validRotatedEllipseSearch",
    "function validPixelProposal",
    {},
  );
  const validPixelProposal = widgetScriptFunction(
    "validPixelProposal",
    "function storedPixelRefinementStateFor",
    {
      validPixelProposalFields,
      validRotatedEllipseSearch,
      isStoredIdentity: (value) => typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value),
      primitiveKind: (item) => item?.primitive?.kind ?? "rectangle",
      clonePrimitive: structuredClone,
      candidateWithPrimitive: (item, primitive) => ({ ...item, primitive }),
      geometrySnapshotFor: (item) => item,
      validGeometryPatch: () => true,
    },
  );
  const proposal = {
    contractId: "norma.personal-visual-harmony-pixel-refinement-proposal@1",
    contractVersion: 1,
    status: "refined",
    candidateSetIdentity,
    candidateId: candidate.id,
    candidateEvidenceOnly: true,
    sourceTruth: false,
    automaticAcceptance: false,
    explicitProposalAdoptionRequired: true,
    proposalAdopted: false,
    explicitUserConfirmationRequired: true,
    coreRun: false,
    coordinateSpace: "normalized-image",
    sourcePixelWidth: 80,
    sourcePixelHeight: 80,
    crop: { status: "ready" },
    pixelRasterContentIdentity: `sha256:${"b".repeat(64)}`,
    kernelContentIdentity: `sha256:${"c".repeat(64)}`,
    originalGeometry,
    proposedGeometry,
    evidence: {
      originalEdgeSupport: 0.2,
      proposedEdgeSupport: 0.7,
      edgeSupportGain: 0.5,
      ambiguityMargin: 0.3,
      confidence: 0.8,
    },
    displacementPixels: { bound: 6, maximum: 3.5, mean: 1.5 },
    reason: "improved_edge_support",
    diagnostics: [{ code: "pixel_refinement.refined", severity: "info", message: "bounded" }],
    rotatedEllipseSearch: {
      maximumEvaluations: 214,
      evaluatedCandidates: 210,
      centerWindowPixels: 3,
      semiAxisWindowPixels: 3,
      orientationWindowDegrees: 4,
      orientationStepDegrees: 1,
      eccentricity: 0.5,
      visibleArcShare: 0.8,
      orientationAmbiguityMargin: 0.2,
      orientationPolicy: "refined",
      parameterDeltas: {
        centerX: 1,
        centerY: -1,
        radiusX: 1,
        radiusY: 1,
        rotationDegrees: 2,
      },
    },
    contentIdentity: `sha256:${"d".repeat(64)}`,
  };

  assert.equal(validPixelProposal(proposal, prepared), true);
  const missingSearch = structuredClone(proposal);
  delete missingSearch.rotatedEllipseSearch;
  assert.equal(validPixelProposal(missingSearch, prepared), false);
  const unboundedSearch = structuredClone(proposal);
  unboundedSearch.rotatedEllipseSearch.evaluatedCandidates = 215;
  assert.equal(validPixelProposal(unboundedSearch, prepared), false);
  assert.equal(validPixelProposal({ ...proposal, candidateSetIdentity: `sha256:${"e".repeat(64)}` }, prepared), false);

  const storedRotatedEllipseAdoptionMatches = widgetScriptFunction(
    "storedRotatedEllipseAdoptionMatches",
    "function reviewedCandidatesFor",
    { validPixelProposal },
  );
  const saved = {
    pixelRefinementState: {
      enabled: true,
      candidateSetIdentity,
      proposals: [proposal],
      adopted: [{ candidateId: candidate.id, proposalContentIdentity: proposal.contentIdentity }],
    },
  };
  assert.equal(storedRotatedEllipseAdoptionMatches(
    saved,
    prepared,
    candidate,
    { primitive: proposedGeometry },
  ), true);
  assert.equal(storedRotatedEllipseAdoptionMatches(
    { ...saved, pixelRefinementState: { ...saved.pixelRefinementState, adopted: [] } },
    prepared,
    candidate,
    { primitive: proposedGeometry },
  ), false);
});

test("widget blocks geometry edits while pixel proposals are in flight", () => {
  const state = { pixelRefinementRunning: false };
  const blockPixelRefinementEdit = widgetScriptFunction(
    "blockPixelRefinementEdit",
    "overlay.addEventListener(\"keydown\",blockPixelRefinementEdit)",
    { state },
  );
  let prevented = 0;
  let stopped = 0;
  const event = {
    preventDefault() { prevented += 1; },
    stopImmediatePropagation() { stopped += 1; },
  };

  blockPixelRefinementEdit(event);
  assert.equal(prevented, 0);
  assert.equal(stopped, 0);

  state.pixelRefinementRunning = true;
  blockPixelRefinementEdit(event);
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
});

test("widget hydration never requests pixel proposals while refinement is disabled", async () => {
  const state = widgetHydrationState({ pixelRefinementEnabled: false });
  let refinementCalls = 0;
  const hydrate = widgetScriptFunction("hydrate", "confirmButton.addEventListener", {
    state,
    currentPayload: () => null,
    window: { openai: {} },
    payloadIdentity: (payload) => payload.prepared.candidateSetIdentity,
    resetManualSegmentGesture() {},
    overlay: { innerHTML: "" },
    safeSvg: (value) => value,
    renderCandidates() {},
    loadImage: async () => true,
    refreshPixelRefinements: async () => { refinementCalls += 1; },
    completedWidgetStateFor: () => null,
    revalidateCompleted() {},
    renderResult() { throw new Error("confirmation payload must not render a result"); },
  });
  const payload = {
    stage: "confirmation_required",
    fileId: "file-pixel-gate",
    prepared: { candidateSetIdentity: "sha256:pixel-gate", candidates: [] },
    overlaySvg: "<svg></svg>",
  };

  await hydrate(payload);
  assert.equal(refinementCalls, 0);
  state.pixelRefinementEnabled = true;
  await hydrate(payload);
  assert.equal(refinementCalls, 1);
});

test("widget revalidates completed state against the payload prepared during pixel refresh", async () => {
  const originalPayload = {
    stage: "confirmation_required",
    fileId: "file-restored-pixel",
    sessionId: "session-original",
    prepared: { candidateSetIdentity: "sha256:original", candidates: [] },
    overlaySvg: "<svg></svg>",
  };
  const refreshedPayload = {
    ...originalPayload,
    sessionId: "session-refreshed",
    prepared: { candidateSetIdentity: "sha256:refreshed", candidates: [] },
  };
  const state = widgetHydrationState({ pixelRefinementEnabled: true });
  const completedPayloads = [];
  const revalidatedPayloads = [];
  const milestones = [];
  const hydrate = widgetScriptFunction("hydrate", "confirmButton.addEventListener", {
    state,
    currentPayload: () => null,
    window: { openai: {} },
    payloadIdentity: (payload) => payload.prepared.candidateSetIdentity,
    resetManualSegmentGesture() {},
    overlay: { innerHTML: "" },
    safeSvg: (value) => value,
    renderCandidates() {},
    loadImage: async () => true,
    refreshPixelRefinements: async () => {
      state.payload = refreshedPayload;
    },
    completedWidgetStateFor: (payload) => {
      completedPayloads.push(payload);
      return { selectedCandidateIds: [] };
    },
    revalidateCompleted: async (payload) => {
      revalidatedPayloads.push(payload);
      state.completed = true;
    },
    recordObservationMilestone: (_payload, milestone) => { milestones.push(milestone); },
    renderResult() { throw new Error("confirmation payload must not render a result"); },
  });

  await hydrate(originalPayload);

  assert.deepEqual(completedPayloads, [refreshedPayload]);
  assert.deepEqual(revalidatedPayloads, [refreshedPayload]);
  assert.deepEqual(milestones, ["result-received"]);
});

test("successful cached revalidation records the fresh Core-visible correlation", async () => {
  const payload = {
    stage: "confirmation_required",
    prepared: { candidateSetIdentity: "sha256:prepared" },
  };
  const freshPayload = {
    stage: "completed",
    observability: {
      contractId: "norma.personal-visual-harmony-observability@1",
      correlationId: "sha256:confirmed",
      handler: "confirm",
      handlerDurationMs: 25,
    },
  };
  const completed = {
    selectedCandidateIds: [],
    confirmedVisualGuideCandidateIds: [],
    constructionGuideState: { layers: [] },
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 618,
  };
  const state = widgetHydrationState({ activePayloadIdentity: "identity:current" });
  const rendered = [];
  const milestones = [];
  const revalidateCompleted = widgetScriptFunction(
    "revalidateCompleted",
    "function recordObservationMilestone",
    {
      state,
      reviewedCandidateSnapshot: () => [],
      geometryChanged: () => false,
      statusNode: { textContent: "" },
      setReviewLocked() {},
      prepareReviewedPayload() { throw new Error("unchanged geometry must not re-prepare"); },
      callConfirmation: async () => ({ structuredContent: { headline: "done" }, hidden: freshPayload }),
      findPayload: (response) => response.hidden,
      renderResult: (nextPayload, structured, options) => {
        rendered.push({ nextPayload, structured, options });
        state.completed = true;
      },
      recordObservationMilestone: (nextPayload, milestone) => {
        milestones.push({ nextPayload, milestone });
      },
      renderCachedResult() { throw new Error("successful revalidation must not render cache"); },
      confirmButton: { style: {} },
      finishConfirmingPayload() {},
    },
  );

  await revalidateCompleted(payload, completed, "identity:current");

  assert.deepEqual(rendered, [{
    nextPayload: freshPayload,
    structured: { headline: "done" },
    options: { persist: true, revalidated: true },
  }]);
  assert.deepEqual(milestones, [{ nextPayload: freshPayload, milestone: "core-visible" }]);
});

test("widget re-prepares reviewed geometry before pixel proposals and stops on confirmation", async () => {
  const original = {
    id: "oblique",
    primitive: { kind: "segment", start: { x: 0.1, y: 0.2 }, end: { x: 0.7, y: 0.8 } },
  };
  const reviewed = {
    id: "oblique",
    primitive: { kind: "segment", start: { x: 0.12, y: 0.18 }, end: { x: 0.72, y: 0.78 } },
  };
  const oldPayload = {
    prepared: { candidateSetIdentity: "old-set", candidates: [original] },
  };
  const state = {
    payload: oldPayload,
    activePayloadIdentity: "payload-id",
    proposalCandidateSetIdentity: "old-set",
    proposalCandidates: [original],
    reviewedCandidates: [reviewed],
    pixelRefinementEnabled: true,
    pixelRefinementRunning: false,
    pixelRefinementGeneration: 0,
    pixelRefinementProposals: new Map(),
    adoptedPixelRefinements: new Map(),
    completed: false,
    confirming: false,
    imageReady: true,
    dimensions: { width: 100, height: 80 },
  };
  const requestedCandidates = [];
  const freshPayload = {
    prepared: { candidateSetIdentity: "fresh-set", candidates: [reviewed] },
  };
  const preparedCandidates = [];
  const refreshPixelRefinements = widgetScriptFunction(
    "refreshPixelRefinements",
    "function applyPixelProposal",
    {
      state,
      updatePixelProposalUi() {},
      updateManualSegmentControls() {},
      updateConfirm() {},
      pixelRefinementCandidateSnapshot: () => [structuredClone(reviewed)],
      geometryChanged: () => true,
      prepareReviewedPayload: async (_payload, candidateSnapshot) => {
        preparedCandidates.push(structuredClone(candidateSnapshot));
        state.payload = freshPayload;
        state.proposalCandidateSetIdentity = "fresh-set";
        state.proposalCandidates = structuredClone(candidateSnapshot);
        return freshPayload;
      },
      primitiveKind: (candidate) => candidate.primitive?.kind ?? "rectangle",
      createPixelCropPlan: () => ({ status: "ready" }),
      requestPixelProposal: async (proposalPayload, candidate) => {
        assert.equal(proposalPayload, freshPayload);
        requestedCandidates.push(structuredClone(candidate));
        return { candidateId: candidate.id, status: "abstained", contentIdentity: "proposal" };
      },
      document: { documentElement: { setAttribute() {} } },
      samePixelProposalPrimitive: () => false,
      candidateWithPrimitive: (candidate, primitive) => ({ ...candidate, primitive }),
      clonePrimitive: structuredClone,
      syncOverlayGeometry() {},
      updateMeasurementRatioControls() {},
      persistReviewState() {},
      statusNode: { textContent: "" },
    },
  );

  await refreshPixelRefinements(oldPayload, "payload-id");
  assert.deepEqual(preparedCandidates, [[reviewed]]);
  assert.deepEqual(requestedCandidates, [reviewed]);
  assert.equal(state.proposalCandidateSetIdentity, "fresh-set");
  assert.deepEqual(state.proposalCandidates, [reviewed]);
  assert.equal(state.pixelRefinementProposals.get("oblique")?.contentIdentity, "proposal");
  assert.equal(state.pixelRefinementRunning, false);

  const previousProposals = state.pixelRefinementProposals;
  state.payload = oldPayload;
  state.confirming = false;
  const raceRefresh = widgetScriptFunction(
    "refreshPixelRefinements",
    "function applyPixelProposal",
    {
      state,
      updatePixelProposalUi() {},
      updateManualSegmentControls() {},
      updateConfirm() {},
      pixelRefinementCandidateSnapshot: () => [structuredClone(reviewed)],
      geometryChanged: () => false,
      prepareReviewedPayload() { throw new Error("unchanged geometry must not re-prepare"); },
      primitiveKind: (candidate) => candidate.primitive?.kind ?? "rectangle",
      createPixelCropPlan: () => ({ status: "ready" }),
      requestPixelProposal: async () => {
        state.confirming = true;
        return { candidateId: "oblique", status: "refined", contentIdentity: "late-proposal" };
      },
      document: { documentElement: { setAttribute() {} } },
      samePixelProposalPrimitive: () => false,
      candidateWithPrimitive: (candidate, primitive) => ({ ...candidate, primitive }),
      clonePrimitive: structuredClone,
      syncOverlayGeometry() {},
      updateMeasurementRatioControls() {},
      persistReviewState() { throw new Error("late proposal must not persist"); },
      statusNode: { textContent: "" },
    },
  );

  await raceRefresh(oldPayload, "payload-id");
  assert.equal(state.pixelRefinementProposals, previousProposals);
  assert.equal(state.pixelRefinementProposals.has("late-proposal"), false);
  assert.equal(state.pixelRefinementRunning, false);
});

test("widget fails closed when a local pixel crop cannot be planned", async () => {
  const candidate = {
    id: "tiny-image-guide",
    primitive: { kind: "segment", start: { x: 0.1, y: 0.2 }, end: { x: 0.7, y: 0.8 } },
  };
  const payload = {
    prepared: { candidateSetIdentity: "tiny-set", candidates: [candidate] },
  };
  const state = {
    payload,
    activePayloadIdentity: "tiny-payload",
    reviewedCandidates: [candidate],
    pixelRefinementEnabled: true,
    pixelRefinementRunning: false,
    pixelRefinementGeneration: 0,
    pixelRefinementProposals: new Map(),
    adoptedPixelRefinements: new Map(),
    completed: false,
    confirming: false,
    imageReady: true,
    dimensions: { width: 7, height: 7 },
  };
  let persisted = 0;
  let pixelStatus = "";
  const statusNode = { textContent: "" };
  const refreshPixelRefinements = widgetScriptFunction(
    "refreshPixelRefinements",
    "function applyPixelProposal",
    {
      state,
      updatePixelProposalUi() {},
      updateManualSegmentControls() {},
      updateConfirm() {},
      pixelRefinementCandidateSnapshot: () => [structuredClone(candidate)],
      geometryChanged: () => false,
      prepareReviewedPayload() { throw new Error("unchanged geometry must not re-prepare"); },
      primitiveKind: (item) => item.primitive.kind,
      createPixelCropPlan() { throw new Error("source dimensions below crop minimum"); },
      requestPixelProposal() { throw new Error("tool must not run without a crop"); },
      document: {
        documentElement: {
          setAttribute(name, value) {
            if (name === "data-norma-pixel-refinement") pixelStatus = value;
          },
        },
      },
      samePixelProposalPrimitive: () => false,
      candidateWithPrimitive: (item, primitive) => ({ ...item, primitive }),
      clonePrimitive: structuredClone,
      syncOverlayGeometry() {},
      updateMeasurementRatioControls() {},
      persistReviewState() { persisted += 1; },
      statusNode,
    },
  );

  await refreshPixelRefinements(payload, "tiny-payload");
  assert.equal(state.pixelRefinementRunning, false);
  assert.equal(state.pixelRefinementProposals.size, 0);
  assert.equal(pixelStatus, "tool-error");
  assert.equal(persisted, 1);
  assert.match(statusNode.textContent, /ignorées faute de crop local valide/u);
});

test("widget canonicalizes adopted quadrilaterals before refresh and revert comparisons", () => {
  const originalGeometry = {
    kind: "quadrilateral",
    vertices: [
      { x: 0.1, y: 0.1 },
      { x: 0.8, y: 0.1 },
      { x: 0.7, y: 0.8 },
      { x: 0.2, y: 0.7 },
    ],
  };
  const proposedGeometry = {
    kind: "quadrilateral",
    vertices: [
      { x: 0.79, y: 0.11 },
      { x: 0.69, y: 0.79 },
      { x: 0.21, y: 0.69 },
      { x: 0.11, y: 0.11 },
    ],
  };
  const canonicalVertices = (vertices) => {
    const start = vertices.reduce((best, point, index) => (
      point.y < vertices[best].y || (point.y === vertices[best].y && point.x < vertices[best].x)
        ? index
        : best
    ), 0);
    return vertices.map((_point, offset) => structuredClone(vertices[(start + offset) % vertices.length]));
  };
  const candidateWithPrimitive = (candidate, primitive) => ({
    ...candidate,
    primitive: primitive.kind === "quadrilateral"
      ? { ...structuredClone(primitive), vertices: canonicalVertices(primitive.vertices) }
      : structuredClone(primitive),
  });
  const canonicalPixelProposalPrimitive = widgetScriptFunction(
    "canonicalPixelProposalPrimitive",
    "function samePixelProposalPrimitive",
    { candidateWithPrimitive, clonePrimitive: structuredClone },
  );
  const samePixelProposalPrimitive = widgetScriptFunction(
    "samePixelProposalPrimitive",
    "function pixelRefinementCandidateSnapshot",
    { canonicalPixelProposalPrimitive },
  );
  const proposalIdentity = `sha256:${"f".repeat(64)}`;
  const candidate = candidateWithPrimitive({ id: "trapezoid" }, proposedGeometry);
  const proposal = {
    candidateId: candidate.id,
    status: "refined",
    contentIdentity: proposalIdentity,
    originalGeometry,
    proposedGeometry,
  };
  const state = {
    reviewedCandidates: [candidate],
    pixelRefinementProposals: new Map([[candidate.id, proposal]]),
    adoptedPixelRefinements: new Map([[candidate.id, proposalIdentity]]),
    pixelRefinementGeneration: 0,
    pixelRefinementEnabled: true,
    pixelRefinementRunning: false,
  };
  const pixelRefinementCandidateSnapshot = widgetScriptFunction(
    "pixelRefinementCandidateSnapshot",
    "function reconcileStoredPixelAdoptions",
    {
      state,
      primitiveKind: (item) => item.primitive?.kind ?? "rectangle",
      samePixelProposalPrimitive,
      candidateWithPrimitive,
      clonePrimitive: structuredClone,
    },
  );
  assert.deepEqual(pixelRefinementCandidateSnapshot()[0].primitive, originalGeometry);

  const disablePixelRefinement = widgetScriptFunction(
    "disablePixelRefinement",
    "pixelToggle.addEventListener",
    {
      state,
      samePixelProposalPrimitive,
      candidateWithPrimitive,
      clonePrimitive: structuredClone,
      document: { documentElement: { setAttribute() {} } },
      syncOverlayGeometry() {},
      updateMeasurementRatioControls() {},
      persistReviewState() {},
      updatePixelProposalUi() {},
      updateConfirm() {},
      statusNode: { textContent: "" },
    },
  );
  disablePixelRefinement();
  assert.deepEqual(state.reviewedCandidates[0].primitive, originalGeometry);
  assert.equal(state.adoptedPixelRefinements.size, 0);
});

test("widget pixel proposal and adoption state round-trip without image bytes", () => {
  const candidateSetIdentity = `sha256:${"a".repeat(64)}`;
  const proposalContentIdentity = `sha256:${"b".repeat(64)}`;
  const originalGeometry = {
    kind: "segment",
    start: { x: 0.1, y: 0.2 },
    end: { x: 0.8, y: 0.7 },
  };
  const proposedGeometry = {
    kind: "segment",
    start: { x: 0.11, y: 0.19 },
    end: { x: 0.79, y: 0.71 },
  };
  const proposal = {
    candidateId: "guide",
    contentIdentity: proposalContentIdentity,
    status: "refined",
    originalGeometry,
    proposedGeometry,
  };
  const state = {
    pixelRefinementEnabled: true,
    proposalCandidateSetIdentity: candidateSetIdentity,
    pixelRefinementProposals: new Map([[proposal.candidateId, proposal]]),
    adoptedPixelRefinements: new Map([[proposal.candidateId, proposalContentIdentity]]),
  };
  const pixelRefinementSnapshot = widgetScriptFunction(
    "pixelRefinementSnapshot",
    "function validPixelProposal",
    { state },
  );
  const snapshot = pixelRefinementSnapshot();
  assert.deepEqual(snapshot, {
    enabled: true,
    candidateSetIdentity,
    proposals: [proposal],
    adopted: [{ candidateId: "guide", proposalContentIdentity }],
  });
  assert.doesNotMatch(JSON.stringify(snapshot), /luminance|base64|download_url/u);

  let validatedOriginalGeometry;
  const preparedWithReviewedCandidates = (prepared, reviewedCandidates) => ({
    ...prepared,
    candidates: reviewedCandidates,
  });
  const storedPixelRefinementStateFor = widgetScriptFunction(
    "storedPixelRefinementStateFor",
    "function restorePixelRefinementState",
    {
      validPixelProposal: (_proposal, prepared) => {
        validatedOriginalGeometry = structuredClone(prepared.candidates[0].primitive);
        return true;
      },
      isStoredIdentity: (value) => typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value),
      samePixelProposalPrimitive: (_candidate, left, right) => JSON.stringify(left) === JSON.stringify(right),
      candidateWithPrimitive: (candidate, primitive) => ({ ...candidate, primitive }),
      clonePrimitive: structuredClone,
      preparedWithReviewedCandidates,
    },
  );
  const restoredState = {
    reviewedCandidates: [{ id: "guide", primitive: structuredClone(proposedGeometry) }],
    pixelRefinementEnabled: false,
    pixelRefinementProposals: new Map(),
    adoptedPixelRefinements: new Map(),
  };
  const pixelToggle = { setAttribute() {}, textContent: "" };
  const restorePixelRefinementState = widgetScriptFunction(
    "restorePixelRefinementState",
    "function reviewedCandidateSnapshot",
    {
      publicWidgetState: () => ({ pixelRefinementState: structuredClone(snapshot) }),
      storedPixelRefinementStateFor,
      preparedWithReviewedCandidates,
      state: restoredState,
      pixelToggle,
    },
  );
  restorePixelRefinementState({
    candidateSetIdentity,
    candidates: [{ id: "guide", primitive: structuredClone(originalGeometry) }],
  });
  assert.equal(restoredState.pixelRefinementEnabled, true);
  assert.deepEqual([...restoredState.pixelRefinementProposals], [["guide", proposal]]);
  assert.deepEqual(
    [...restoredState.adoptedPixelRefinements],
    [["guide", proposalContentIdentity]],
  );
  assert.deepEqual(validatedOriginalGeometry, originalGeometry);
});

test("widget luminance extraction is bounded and byte-deterministic", () => {
  const rgba = new Uint8ClampedArray(8 * 8 * 4);
  for (let pixel = 0; pixel < 64; pixel += 1) {
    rgba[pixel * 4] = pixel;
    rgba[pixel * 4 + 1] = 255 - pixel;
    rgba[pixel * 4 + 2] = pixel * 2;
    rgba[pixel * 4 + 3] = 255;
  }
  const drawCalls = [];
  const context = {
    imageSmoothingEnabled: true,
    drawImage(...args) { drawCalls.push(args); },
    getImageData: () => ({ data: rgba }),
  };
  const canvases = [];
  const document = {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      canvases.push(canvas);
      return canvas;
    },
  };
  const source = { id: "hydrated-image" };
  const luminanceBase64ForCrop = widgetScriptFunction(
    "luminanceBase64ForCrop",
    "function pixelRecovery",
    { document, source },
  );
  const plan = {
    status: "ready",
    originX: 12,
    originY: 15,
    sourceWidth: 32,
    sourceHeight: 40,
    rasterWidth: 8,
    rasterHeight: 8,
  };
  const first = luminanceBase64ForCrop(plan);
  const second = luminanceBase64ForCrop(plan);
  assert.equal(first, second);
  const bytes = Buffer.from(first, "base64");
  assert.equal(bytes.length, 64);
  assert.equal(bytes[0], (54 * 0 + 183 * 255 + 19 * 0 + 128) >> 8);
  assert.equal(context.imageSmoothingEnabled, false);
  assert.deepEqual(
    drawCalls[0],
    [source, 12, 15, 32, 40, 0, 0, 8, 8],
  );
  assert.deepEqual(
    canvases.map(({ width, height }) => ({ width, height })),
    [{ width: 8, height: 8 }, { width: 8, height: 8 }],
  );
});

function candidates() {
  return [
    {
      id: "major",
      label: "Zone principale",
      role: "structural-region",
      reason: "Grande partition visible",
      x: 0,
      y: 0,
      width: GOLDEN_MAJOR,
      height: 1,
    },
    {
      id: "minor",
      label: "Zone secondaire",
      role: "structural-region",
      reason: "Petite partition adjacente",
      x: GOLDEN_MAJOR,
      y: 0,
      width: 1 - GOLDEN_MAJOR,
      height: 1,
    },
  ];
}

function mixedPrimitiveCandidates() {
  return [
    ...candidates(),
    {
      id: "diagonal",
      label: "Diagonale structurelle",
      role: "structural-region",
      reason: "Segment visible entre deux angles de construction",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.2, y: 0.8 },
        end: { x: 0.8, y: 0.2 },
      },
    },
    {
      id: "central-axis",
      label: "Axe vertical central",
      role: "structural-region",
      reason: "Axe visible dans les alignements de la composition",
      x: 0.5,
      y: 0.1,
      width: 0,
      height: 0.8,
      primitive: {
        kind: "axis",
        start: { x: 0.5, y: 0.1 },
        end: { x: 0.5, y: 0.9 },
      },
    },
    {
      id: "main-ellipse",
      label: "Contour elliptique",
      role: "structural-region",
      reason: "Contour elliptique visible dans la construction",
      x: 0.25,
      y: 0.15,
      width: 0.5,
      height: 0.7,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.25,
        radiusY: 0.35,
      },
    },
  ];
}

function explicitTriangleConstructionRequests() {
  return [{
    requestId: "explicit-oblique-triangle",
    vertices: [
      {
        point: { x: 0.2, y: 0.8 },
        parent: {
          kind: "observed-line-endpoint",
          candidateId: "diagonal",
          endpoint: "start",
        },
      },
      {
        point: { x: 0.8, y: 0.2 },
        parent: {
          kind: "observed-line-endpoint",
          candidateId: "diagonal",
          endpoint: "end",
        },
      },
      {
        point: { x: 0, y: 0 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
            { kind: "frame-edge", frameEdgeIndex: 0 },
          ],
        },
      },
    ],
  }];
}

function quadrilateralCandidates() {
  return [
    ...candidates(),
    {
      id: "right-trapezoid",
      label: "Cadre trapézoïdal droit",
      role: "structural-region",
      reason: "Quatre arêtes visibles confirment un quadrilatère construit",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.2 },
          { x: 0.7, y: 0.8 },
          { x: 0.3, y: 0.8 },
        ],
      },
    },
  ];
}

function recoveryInput(fileId = "file-private-opaque-id", candidateValues = candidates()) {
  return {
    fileId,
    sourceImageMediaType: "image/png",
    candidates: candidateValues,
  };
}

function rotatedEllipseCropBase64(plan, ellipse) {
  assert.equal(plan.status, "ready");
  const bytes = Buffer.alloc(plan.rasterWidth * plan.rasterHeight);
  const rotation = (ellipse.rotationDegrees ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  for (let y = 0; y < plan.rasterHeight; y += 1) {
    for (let x = 0; x < plan.rasterWidth; x += 1) {
      const sourceX = plan.originX + (x + 0.5) * plan.scaleX;
      const sourceY = plan.originY + (y + 0.5) * plan.scaleY;
      const dx = sourceX - ellipse.center.x;
      const dy = sourceY - ellipse.center.y;
      const localX = (cos * dx + sin * dy) / ellipse.radiusX;
      const localY = (-sin * dx + cos * dy) / ellipse.radiusY;
      bytes[y * plan.rasterWidth + x] = localX * localX + localY * localY <= 1 ? 238 : 18;
    }
  }
  return bytes.toString("base64");
}

test("session confirmation rejects duplicate construction layers before idempotent cache lookup", () => {
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => "session:construction-layer-uniqueness",
  });
  const prepared = service.prepare({
    fileId: "file-construction-layer-uniqueness",
    mediaType: "image/png",
    candidates: mixedPrimitiveCandidates(),
  });
  const baseConfirmation = {
    sessionId: prepared.sessionId,
    candidateSetIdentity: prepared.prepared.candidateSetIdentity,
    selectedCandidateIds: ["major", "minor"],
    confirmedVisualGuideCandidateIds: ["diagonal"],
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 618,
  };
  service.confirm({
    ...baseConfirmation,
    constructionLayers: ["support-line-extensions"],
  });
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "support-line-extensions"],
    }),
    /Construction layers must be unique supported values/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["junction-angles"],
    }),
    /Junction angles require the support-line extension layer/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "triangle-medians"],
    }),
    /Triangle medians require the triangle construction layer/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "triangles", "triangle-medians"],
    }),
    /exactly one explicit current triangle request/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "triangle-altitudes"],
    }),
    /Triangle altitudes require the triangle construction layer/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "triangles", "triangle-altitudes"],
    }),
    /exactly one explicit current triangle request/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "triangle-centroids"],
    }),
    /Triangle centroids require the triangle construction layer/u,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      constructionLayers: ["support-line-extensions", "triangles", "triangle-centroids"],
    }),
    /exactly one explicit current triangle request/u,
  );
});

test("direct session confirmation idempotency ignores measurement property insertion order", () => {
  const service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => "session:measurement-property-order",
  });
  const candidateValues = quadrilateralCandidates();
  const prepared = service.prepare({
    fileId: "file-measurement-property-order",
    mediaType: "image/png",
    candidates: candidateValues,
  });
  const baseConfirmation = {
    sessionId: prepared.sessionId,
    candidateSetIdentity: prepared.prepared.candidateSetIdentity,
    selectedCandidateIds: ["major", "minor"],
    confirmedVisualGuideCandidateIds: ["right-trapezoid"],
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 1_000,
  };
  const first = service.confirm({
    ...baseConfirmation,
    measurementRatioRequest: {
      requestId: "declared-ratio:direct-order",
      measurements: [
        { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 0 },
        { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 2 },
      ],
      ratioPackRefs: [
        "norma.geometry-harmonies@0.1.0",
        "norma.basic-proportions@0.1.0",
      ],
      matchTolerance: 0.025,
    },
  });
  const replay = service.confirm({
    ...baseConfirmation,
    measurementRatioRequest: {
      requestId: "declared-ratio:direct-order",
      measurements: [
        { sideIndex: 2, candidateId: "right-trapezoid", kind: "quadrilateral-side" },
        { candidateId: "right-trapezoid", kind: "quadrilateral-side", sideIndex: 0 },
      ],
      ratioPackRefs: [
        "norma.geometry-harmonies@0.1.0",
        "norma.basic-proportions@0.1.0",
      ],
      matchTolerance: 0.025,
    },
  });

  assert.equal(
    replay.confirmation.canonicalResultIdentity,
    first.confirmation.canonicalResultIdentity,
  );
  assert.throws(
    () => service.confirm({
      ...baseConfirmation,
      measurementRatioRequest: {
        requestId: "declared-ratio:direct-order",
        measurements: [
          {
            kind: "quadrilateral-side",
            candidateId: "right-trapezoid",
            sideIndex: 0,
            unexpected: true,
          },
          { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 2 },
        ],
        ratioPackRefs: [
          "norma.geometry-harmonies@0.1.0",
          "norma.basic-proportions@0.1.0",
        ],
        matchTolerance: 0.025,
      },
    }),
    /already confirmed with a different selection/u,
  );
});

async function createConnectedClient(service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => "session:test-personal-visual-harmony",
  }), serverOptions = {}) {
  const server = createPersonalVisualHarmonyMcpServerV1({ ...serverOptions, service });
  const client = new Client(
    { name: "norma-personal-visual-harmony-test", version: "1.0.0" },
    { capabilities: {} },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    server,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

test("prepare and confirm expose correlated handler timings only through app metadata", async () => {
  const timestamps = [1_000, 1_012, 2_000, 2_025];
  const connected = await createConnectedClient(undefined, {
    now: () => timestamps.shift(),
  });
  try {
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-observability",
          mime_type: "image/png",
        },
        candidates: candidates(),
      },
    });
    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    const correlationId = widgetMeta.prepared.candidateSetIdentity;
    assert.deepEqual(widgetMeta.observability, {
      contractId: "norma.personal-visual-harmony-observability@1",
      correlationId,
      handler: "prepare",
      handlerEnteredAtMs: 1_000,
      handlerCompletedAtMs: 1_012,
      handlerDurationMs: 12,
    });

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: correlationId,
        selectedCandidateIds: ["major", "minor"],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-observability"),
      },
    });
    assert.deepEqual(confirmed._meta.normaPersonalVisualHarmony.observability, {
      contractId: "norma.personal-visual-harmony-observability@1",
      correlationId,
      handler: "confirm",
      handlerEnteredAtMs: 2_000,
      handlerCompletedAtMs: 2_025,
      handlerDurationMs: 25,
    });

    for (const result of [prepared, confirmed]) {
      assert.equal("observability" in result.structuredContent, false);
      assert.doesNotMatch(
        JSON.stringify([result.content, result.structuredContent]),
        /handlerEnteredAtMs|handlerCompletedAtMs|personal-visual-harmony-observability/u,
      );
      assert.doesNotMatch(
        JSON.stringify(result._meta.normaPersonalVisualHarmony.observability),
        /file-private|download_url|candidate|primitive|overlay|selectedCandidate/u,
      );
    }
    assert.deepEqual(timestamps, []);
  } finally {
    await connected.close();
  }
});

test("widget observability writes only bounded scalar milestone attributes", () => {
  const attributes = new Map();
  const widgetHtml = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(widgetHtml, /function recordObservationMilestone\(payload,milestone,atMs=Date\.now\(\)\)/u);
  assert.match(widgetHtml, /recordObservationMilestone\(payload,"result-received"\)/u);
  assert.match(widgetHtml, /recordObservationMilestone\(state\.payload,"widget-interactive"\)/u);
  assert.match(widgetHtml, /recordObservationMilestone\(analysisPayload,"confirmation-clicked",confirmationClickedAtMs\)/u);
  assert.match(widgetHtml, /recordObservationMilestone\(completedPayload,"core-visible"\)/u);
  assert.match(widgetHtml, /recordObservationMilestone\(payload,"follow-up-dispatched"\)/u);
  const widgetScript = widgetHtml.match(/<script type="module">([\s\S]*?)<\/script>/u)?.[1];
  assert.ok(widgetScript);
  const observationHelperSource = widgetScript.slice(
    widgetScript.indexOf("function recordObservationMilestone"),
    widgetScript.indexOf("function completionFollowUpFacts"),
  );
  assert.doesNotMatch(
    observationHelperSource,
    /callAppTool|rpcRequest|postMessage|sendFollowUpMessage|handlerEnteredAtMs|handlerCompletedAtMs/u,
  );
  const recordObservationMilestone = widgetScriptFunction(
    "recordObservationMilestone",
    "function completionFollowUpFacts",
    {
      OBSERVABILITY_CONTRACT_ID: "norma.personal-visual-harmony-observability@1",
      document: {
        documentElement: {
          getAttribute(name) {
            return attributes.get(name) ?? null;
          },
          getAttributeNames() {
            return [...attributes.keys()];
          },
          removeAttribute(name) {
            attributes.delete(name);
          },
          setAttribute(name, value) {
            attributes.set(name, value);
          },
        },
      },
    },
  );

  recordObservationMilestone({
    observability: {
      contractId: "norma.personal-visual-harmony-observability@1",
      correlationId: "sha256:correlation-only",
      handler: "confirm",
      handlerEnteredAtMs: 2_000,
      handlerCompletedAtMs: 2_025,
      handlerDurationMs: 25,
    },
    fileId: "must-not-be-observed",
    prepared: { candidates: [{ primitive: { kind: "rectangle" } }] },
  }, "core-visible", 2_040);

  assert.deepEqual(Object.fromEntries(attributes), {
    "data-norma-observation-contract": "norma.personal-visual-harmony-observability@1",
    "data-norma-observation-correlation": "sha256:correlation-only",
    "data-norma-observation-confirm-handler-clock": "server",
    "data-norma-observation-confirm-handler-duration-ms": "25",
    "data-norma-observation-confirm-milestone-clock": "browser",
    "data-norma-observation-confirm-core-visible-at-ms": "2040",
  });
  assert.doesNotMatch(
    JSON.stringify(Object.fromEntries(attributes)),
    /must-not-be-observed|rectangle|candidate|primitive/u,
  );

  recordObservationMilestone({
    observability: {
      contractId: "norma.personal-visual-harmony-observability@1",
      correlationId: "sha256:replacement",
      handler: "prepare",
      handlerDurationMs: 12,
    },
  }, "result-received", 3_000);

  assert.deepEqual(Object.fromEntries(attributes), {
    "data-norma-observation-contract": "norma.personal-visual-harmony-observability@1",
    "data-norma-observation-correlation": "sha256:replacement",
    "data-norma-observation-prepare-handler-clock": "server",
    "data-norma-observation-prepare-handler-duration-ms": "12",
    "data-norma-observation-prepare-milestone-clock": "browser",
    "data-norma-observation-prepare-result-received-at-ms": "3000",
  });
});

function unsupportedTupleSchemaPaths(value, path = "$", paths = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => unsupportedTupleSchemaPaths(entry, `${path}[${String(index)}]`, paths));
    return paths;
  }
  if (value === null || typeof value !== "object") return paths;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if ((key === "items" && Array.isArray(child)) || key === "prefixItems") paths.push(childPath);
    unsupportedTupleSchemaPaths(child, childPath, paths);
  }
  return paths;
}

test("ChatGPT App MCP public tool schemas avoid tuple-form array-valued items", async () => {
  const connected = await createConnectedClient();
  try {
    const listed = await connected.client.listTools();
    const incompatiblePaths = listed.tools.flatMap((tool) => [
      ...unsupportedTupleSchemaPaths(tool.inputSchema, `${tool.name}.inputSchema`),
      ...unsupportedTupleSchemaPaths(tool.outputSchema, `${tool.name}.outputSchema`),
    ]);
    assert.deepEqual(incompatiblePaths, []);
  } finally {
    await connected.close();
  }
});

// This exact resource contract intentionally keeps its symmetric prepare/confirm assertions together.
// fallow-ignore-next-line complexity code-duplication
test("ChatGPT App MCP lists the exact tools, file schema, app-only confirmation, and widget resource", async () => {
  const connected = await createConnectedClient();
  try {
    const listed = await connected.client.listTools();
    assert.deepEqual(listed.tools.map(({ name }) => name).sort(), [
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
    ].sort());

    const prepareTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL);
    const confirmTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL);
    const refinePixelsTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL);
    assert.ok(prepareTool);
    assert.ok(confirmTool);
    assert.ok(refinePixelsTool);
    assert.deepEqual(prepareTool._meta["openai/fileParams"], ["image"]);
    assert.equal(prepareTool._meta.ui.resourceUri, PERSONAL_VISUAL_HARMONY_WIDGET_URI);
    assert.deepEqual(prepareTool._meta.ui.visibility, ["model", "app"]);
    assert.match(prepareTool.description, new RegExp(PERSONAL_VISUAL_HARMONY_DEFAULT_ENTRY_PROMPT_V1, "u"));
    assert.match(prepareTool.description, /Analyze this image with Norma/u);
    assert.match(prepareTool.description, /Do not ask the user to list primitives/u);
    assert.match(prepareTool.description, /compare two confirmed lengths prepares length-bearing guides without enabling the report/u);
    assert.deepEqual(confirmTool._meta.ui.visibility, ["app"]);
    assert.deepEqual(refinePixelsTool._meta.ui.visibility, ["app"]);
    assert.equal(refinePixelsTool.annotations.readOnlyHint, false);
    assert.equal(refinePixelsTool.annotations.idempotentHint, false);
    assert.equal(refinePixelsTool.inputSchema.required.includes("reviewedPrimitive"), true);
    assert.equal(refinePixelsTool.inputSchema.properties.luminanceBase64.maxLength, 196_608);
    assert.equal(refinePixelsTool.inputSchema.required.includes("luminanceBase64"), false);
    const proposalOutput = refinePixelsTool.outputSchema.properties.proposal;
    assert.equal(proposalOutput.properties.candidateEvidenceOnly.const, true);
    assert.equal(proposalOutput.properties.sourceTruth.const, false);
    assert.equal(proposalOutput.properties.automaticAcceptance.const, false);
    assert.equal(proposalOutput.properties.explicitProposalAdoptionRequired.const, true);
    assert.equal(proposalOutput.properties.proposalAdopted.const, false);
    assert.equal(proposalOutput.properties.coreRun.const, false);
    assert.deepEqual(prepareTool.inputSchema.properties.image.required.sort(), ["download_url", "file_id"]);
    assert.deepEqual(Object.keys(prepareTool.inputSchema.properties.image.properties).sort(), [
      "download_url",
      "file_id",
      "file_name",
      "mime_type",
    ]);
    assert.equal(prepareTool.inputSchema.properties.image.additionalProperties, false);
    const guideConfirmationInput = confirmTool.inputSchema.properties.confirmedVisualGuideCandidateIds;
    assert.equal(guideConfirmationInput.type, "array");
    assert.equal(guideConfirmationInput.maxItems, 12);
    assert.deepEqual(guideConfirmationInput.default, []);
    assert.equal(guideConfirmationInput.items.type, "string");
    assert.match(guideConfirmationInput.items.pattern, /A-Za-z0-9/u);
    assert.equal(confirmTool.inputSchema.required.includes("confirmedVisualGuideCandidateIds"), false);
    const constructionLayerInput = confirmTool.inputSchema.properties.constructionLayers;
    assert.equal(constructionLayerInput.type, "array");
    assert.equal(constructionLayerInput.maxItems, 9);
    assert.deepEqual(constructionLayerInput.default, []);
    assert.deepEqual(constructionLayerInput.items.enum, [
      "support-line-extensions",
      "format-diagonals",
      "junction-angles",
      "triangles",
      "triangle-medians",
      "triangle-perpendicular-bisectors",
      "triangle-angle-bisectors",
      "triangle-altitudes",
      "triangle-centroids",
    ]);
    assert.equal(confirmTool.inputSchema.required.includes("constructionLayers"), false);
    const measurementRatioInput = confirmTool.inputSchema.properties.measurementRatioRequest;
    assert.equal(confirmTool.inputSchema.required.includes("measurementRatioRequest"), false);
    assert.equal(measurementRatioInput.additionalProperties, false);
    assert.equal(measurementRatioInput.properties.measurements.minItems, 2);
    assert.equal(measurementRatioInput.properties.measurements.maxItems, 2);
    assert.equal(Array.isArray(measurementRatioInput.properties.measurements.items), false);
    assert.equal(measurementRatioInput.properties.ratioPackRefs.minItems, 2);
    assert.equal(measurementRatioInput.properties.ratioPackRefs.maxItems, 2);
    assert.equal(Array.isArray(measurementRatioInput.properties.ratioPackRefs.items), false);
    assert.deepEqual(measurementRatioInput.properties.ratioPackRefs.items.anyOf.map(({ const: value }) => value), [
      "norma.geometry-harmonies@0.1.0",
      "norma.basic-proportions@0.1.0",
    ]);
    assert.equal(measurementRatioInput.properties.matchTolerance.const, 0.025);
    const triangleRequestInput = prepareTool.inputSchema.properties.triangleConstructionRequests;
    assert.equal(triangleRequestInput.type, "array");
    assert.equal(triangleRequestInput.maxItems, 4);
    assert.equal(prepareTool.inputSchema.required.includes("triangleConstructionRequests"), false);
    assert.equal(triangleRequestInput.items.additionalProperties, false);
    assert.equal(triangleRequestInput.items.properties.vertices.minItems, 3);
    assert.equal(triangleRequestInput.items.properties.vertices.maxItems, 3);
    const triangleRequestCountOutput = prepareTool.outputSchema.properties.triangleRequestCount;
    assert.equal(triangleRequestCountOutput.type, "integer");
    assert.equal(triangleRequestCountOutput.minimum, 0);
    assert.equal(triangleRequestCountOutput.maximum, 4);
    assert.equal(prepareTool.outputSchema.required.includes("triangleRequestCount"), true);
    const imagePlaneOutput = confirmTool.outputSchema.properties.imagePlaneGuideAnalysis;
    assert.equal(imagePlaneOutput.type, "object");
    assert.equal(imagePlaneOutput.additionalProperties, false);
    for (const requiredField of [
      "candidateSetIdentity",
      "sourceImageReferenceIdentity",
      "sourcePixelWidth",
      "sourcePixelHeight",
      "confirmedVisualGuideCandidateIds",
      "relationships",
      "limits",
      "contentIdentity",
    ]) {
      assert.ok(imagePlaneOutput.required.includes(requiredField));
    }
    const relationshipOutput = imagePlaneOutput.properties.relationships.items;
    assert.equal(relationshipOutput.additionalProperties, false);
    assert.deepEqual(relationshipOutput.properties.classification.enum, [
      "intersection",
      "near_tangent",
      "proximity",
    ]);
    assert.equal(
      relationshipOutput.properties.supportingLineContactWithinObservedSegment.type,
      "boolean",
    );
    assert.deepEqual(relationshipOutput.properties.linePrimitiveKind.enum, [
      "segment",
      "axis",
      "quadrilateral-side",
    ]);
    assert.equal(relationshipOutput.required.includes("quadrilateralSideIndex"), false);
    assert.equal(imagePlaneOutput.required.includes("constructionAnalysis"), false);
    const constructionOutput = imagePlaneOutput.properties.constructionAnalysis;
    assert.equal(constructionOutput.additionalProperties, false);
    assert.equal(constructionOutput.properties.candidateEvidenceOnly.const, true);
    assert.equal(constructionOutput.properties.sourceTruth.const, false);
    assert.equal(constructionOutput.properties.automaticAcceptance.const, false);
    assert.equal(constructionOutput.properties.explicitUserConfirmationRequired.const, true);
    assert.equal(constructionOutput.properties.coreRun.const, false);
    const junctionOutput = constructionOutput.properties.junctionAngles.items;
    assert.equal(junctionOutput.additionalProperties, false);
    assert.equal(junctionOutput.properties.kind.const, "junction-angle");
    assert.equal(junctionOutput.properties.provenance.const, "derived-measurement");
    assert.equal(junctionOutput.properties.sourceTruth.const, false);
    assert.equal(junctionOutput.properties.coreAuthority.const, false);
    assert.equal(constructionOutput.required.includes("junctionAngles"), false);
    assert.deepEqual(junctionOutput.properties.junctionKind.enum, [
      "support-line-support-line",
      "support-line-format-diagonal",
      "format-diagonal-format-diagonal",
      "support-line-frame-edge",
      "format-diagonal-frame-edge",
    ]);
    const medianOutput = constructionOutput.properties.triangleMedians.items;
    assert.equal(constructionOutput.required.includes("triangleMedians"), false);
    assert.equal(constructionOutput.properties.triangleMedians.minItems, 3);
    assert.equal(constructionOutput.properties.triangleMedians.maxItems, 3);
    assert.equal(medianOutput.additionalProperties, false);
    assert.equal(medianOutput.properties.kind.const, "triangle-median");
    assert.equal(medianOutput.properties.provenance.const, "derived-construction");
    assert.equal(medianOutput.properties.candidateEvidenceOnly.const, true);
    assert.equal(medianOutput.properties.sourceTruth.const, false);
    assert.equal(medianOutput.properties.coreAuthority.const, false);
    assert.equal("centroid" in medianOutput.properties, false);
    const altitudeOutput = constructionOutput.properties.triangleAltitudes.items;
    assert.equal(constructionOutput.required.includes("triangleAltitudes"), false);
    assert.equal(constructionOutput.properties.triangleAltitudes.minItems, 3);
    assert.equal(constructionOutput.properties.triangleAltitudes.maxItems, 3);
    assert.equal(altitudeOutput.additionalProperties, false);
    assert.equal(altitudeOutput.properties.kind.const, "triangle-altitude");
    assert.equal(altitudeOutput.properties.footPositionOnOppositeSideSupport.type, "number");
    assert.equal(altitudeOutput.properties.footWithinOppositeSideSegment.type, "boolean");
    assert.equal(altitudeOutput.properties.provenance.const, "derived-construction");
    assert.equal(altitudeOutput.properties.candidateEvidenceOnly.const, true);
    assert.equal(altitudeOutput.properties.sourceTruth.const, false);
    assert.equal(altitudeOutput.properties.coreAuthority.const, false);
    assert.equal("orthocenter" in altitudeOutput.properties, false);
    const centroidOutput = constructionOutput.properties.triangleCentroids.items;
    assert.equal(constructionOutput.required.includes("triangleCentroids"), false);
    assert.equal(constructionOutput.properties.triangleCentroids.minItems, 1);
    assert.equal(constructionOutput.properties.triangleCentroids.maxItems, 1);
    assert.equal(centroidOutput.additionalProperties, false);
    assert.equal(centroidOutput.properties.kind.const, "triangle-centroid");
    assert.equal(centroidOutput.properties.derivation.const, "arithmetic_mean_of_canonical_triangle_vertices");
    assert.equal(centroidOutput.properties.provenance.const, "derived-construction");
    assert.equal(centroidOutput.properties.candidateEvidenceOnly.const, true);
    assert.equal(centroidOutput.properties.sourceTruth.const, false);
    assert.equal(centroidOutput.properties.coreAuthority.const, false);
    assert.equal("incenter" in centroidOutput.properties, false);
    const quadrilateralOutput = imagePlaneOutput.properties.quadrilateralMeasurements.items;
    assert.equal(imagePlaneOutput.required.includes("quadrilateralMeasurements"), false);
    assert.equal(quadrilateralOutput.additionalProperties, false);
    assert.deepEqual(quadrilateralOutput.properties.classification.enum, [
      "quadrilateral",
      "trapezoid",
      "parallelogram",
      "rectangle",
    ]);
    for (const field of [
      "vertices",
      "sideLengthsPixels",
      "interiorAnglesDegrees",
      "diagonalLengthsPixels",
      "oppositeSideParallelism",
      "parallelAngleToleranceDegrees",
      "rightAngleToleranceDegrees",
      "areaPixelsSquared",
      "areaImageShare",
      "centroid",
      "explanation",
    ]) {
      assert.ok(quadrilateralOutput.required.includes(field));
    }
    const imagePlaneLimitsSchema = JSON.stringify(imagePlaneOutput.properties.limits);
    assert.match(imagePlaneLimitsSchema, /axisAlignedEllipseOnly/u);
    assert.match(imagePlaneLimitsSchema, /explicit_normalized_image_plane_rotation/u);
    const measurementRatioOutput = confirmTool.outputSchema.properties.declaredMeasurementRatioReport;
    assert.equal(confirmTool.outputSchema.required.includes("declaredMeasurementRatioReport"), false);
    assert.equal(measurementRatioOutput.additionalProperties, false);
    assert.equal(measurementRatioOutput.properties.candidateEvidenceOnly.const, true);
    assert.equal(measurementRatioOutput.properties.sourceTruth.const, false);
    assert.equal(measurementRatioOutput.properties.coreAuthority.const, false);
    assert.equal(measurementRatioOutput.properties.originalGeometryUnchanged.const, true);
    assert.equal(measurementRatioOutput.properties.noUnrequestedComparisons.const, true);
    assert.match(prepareTool.description, /never fit, snap, or round them to phi, halves, thirds/u);
    assert.match(prepareTool.description, /Check pixel-space aspect for claimed squares/u);
    assert.match(prepareTool.description, /major diagonals/u);
    assert.match(prepareTool.description, /circular or elliptical contours/u);
    assert.match(prepareTool.description, /deterministic Core receives confirmed rectangles only/u);
    const candidateProperties = prepareTool.inputSchema.properties.candidates.items.properties;
    assert.match(candidateProperties.x.description, /Left visible edge divided by the full image pixel width/u);
    assert.match(candidateProperties.x.description, /never snap or round it toward phi, halves, or thirds/u);
    assert.match(candidateProperties.height.description, /zero only for a perfectly horizontal segment or axis/u);
    assert.match(candidateProperties.reason.description, /never cite an expected harmonic ratio as the coordinate basis/u);
    assert.equal(candidateProperties.label.maxLength, 80);
    assert.equal(candidateProperties.reason.maxLength, 240);
    const primitiveSchema = JSON.stringify(candidateProperties.primitive);
    for (const kind of ["rectangle", "segment", "axis", "quadrilateral", "ellipse"]) {
      assert.match(primitiveSchema, new RegExp(`"${kind}"`, "u"));
    }
    const primitiveAlternatives = candidateProperties.primitive.anyOf
      ?? candidateProperties.primitive.oneOf;
    assert.ok(primitiveAlternatives);
    const quadrilateralInput = primitiveAlternatives.find(
      (alternative) => alternative.properties?.kind?.const === "quadrilateral",
    );
    const ellipseInput = primitiveAlternatives.find(
      (alternative) => alternative.properties?.kind?.const === "ellipse",
    );
    assert.ok(quadrilateralInput);
    assert.ok(ellipseInput);
    assert.equal(ellipseInput.properties.rotationDegrees.type, "number");
    assert.match(ellipseInput.properties.rotationDegrees.description, /normalized image-plane degrees/u);
    const quadrilateralVerticesInput = quadrilateralInput.properties.vertices;
    assert.equal(quadrilateralVerticesInput.type, "array");
    assert.equal(quadrilateralVerticesInput.minItems, 4);
    assert.equal(quadrilateralVerticesInput.maxItems, 4);
    assert.equal(quadrilateralVerticesInput.items.type, "object");
    assert.equal("prefixItems" in quadrilateralVerticesInput, false);
    assert.match(primitiveSchema, /four measured visible corners in perimeter order/u);
    assert.match(primitiveSchema, /do not replace it with an enclosing rectangle/u);
    assert.match(primitiveSchema, /measured endpoint of the visible finite segment/u);

    const resources = await connected.client.listResources();
    assert.deepEqual(resources.resources.map(({ uri }) => uri), [PERSONAL_VISUAL_HARMONY_WIDGET_URI]);
    const resource = await connected.client.readResource({ uri: PERSONAL_VISUAL_HARMONY_WIDGET_URI });
    assert.equal(resource.contents.length, 1);
    assert.equal(resource.contents[0].mimeType, PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE);
    assert.equal(resource.contents[0].text, createPersonalVisualHarmonyWidgetHtmlV1());
    const widgetScript = resource.contents[0].text.match(/<script type="module">([\s\S]*?)<\/script>/u);
    assert.ok(widgetScript);
    assert.doesNotThrow(() => new Function(widgetScript[1]));
    assert.match(resource.contents[0].text, /window\.openai\.getFileDownloadUrl/u);
    assert.match(resource.contents[0].text, /window\.openai\.callTool/u);
    assert.match(resource.contents[0].text, /window\.openai\.sendFollowUpMessage/u);
    assert.match(resource.contents[0].text, /window\.openai\?\.setWidgetState/u);
    assert.match(resource.contents[0].text, /completedVisualHarmony/u);
    assert.match(resource.contents[0].text, /id="pixelToggle"[^>]*aria-pressed="false"/u);
    assert.match(resource.contents[0].text, /pixelRefinementEnabled:false/u);
    assert.match(resource.contents[0].text, /callAppTool\(REFINE_PIXELS_TOOL,args\)/u);
    assert.match(resource.contents[0].text, /reviewedPrimitive:candidate\.primitive/u);
    assert.match(resource.contents[0].text, /preparedWithReviewedCandidates\(payload\.prepared,\[candidate\]\)/u);
    assert.match(resource.contents[0].text, /function completedPixelRefinementStateFor\(saved,completed,prepared\)\{if\(!isStoredGeometrySnapshot/u);
    assert.match(resource.contents[0].text, /try\{const plan=createPixelCropPlan/u);
    assert.match(resource.contents[0].text, /if\(state\.pixelRefinementEnabled\)await refreshPixelRefinements\(state\.payload,identity\)/u);
    assert.match(resource.contents[0].text, /Adopter cette proposition/u);
    assert.match(resource.contents[0].text, /function applyPixelProposal\(candidateId\)/u);
    assert.match(resource.contents[0].text, /syncOverlayGeometry\(\);updateMeasurementRatioControls\(\);updatePixelProposalUi\(\);persistReviewState\(\)/u);
    assert.match(resource.contents[0].text, /kind==="ellipse"&&item\.primitive&&shape/u);
    assert.match(resource.contents[0].text, /shape\.setAttribute\("rx",String\(item\.primitive\.radiusX\*1000\)\)/u);
    assert.match(resource.contents[0].text, /function blockPixelRefinementEdit\(event\)/u);
    assert.match(resource.contents[0].text, /window\.addEventListener\("pointermove",blockPixelRefinementEdit,\{capture:true\}\)/u);
    assert.match(resource.contents[0].text, /function invalidatePixelAdoptionFor\(candidateId\)/u);
    assert.match(resource.contents[0].text, /data-pixel-refinement-overlay/u);
    assert.match(resource.contents[0].text, /pixelRefinementState=pixelRefinementSnapshot\(\)/u);
    assert.match(resource.contents[0].text, /maxRasterDimension = 384/u);
    assert.match(resource.contents[0].text, /maxRasterPixels = 147_456/u);
    assert.match(resource.contents[0].text, /presentation:\s*structured\?\.presentation/u);
    assert.match(resource.contents[0].text, /La séparation principale suit presque φ/u);
    assert.match(resource.contents[0].text, /Résume d’abord presentation/u);
    assert.match(resource.contents[0].text, /distingue clairement intersection, tangence ou quasi-tangence/u);
    assert.match(resource.contents[0].text, /completedWidgetStateFor\(payload\)/u);
    assert.match(resource.contents[0].text, /candidateSetIdentity:payload\.prepared\.candidateSetIdentity/u);
    assert.match(resource.contents[0].text, /selectedCandidateIds=coreSelectedIds\(\)/u);
    assert.match(resource.contents[0].text, /sourcePixelWidth:state\.dimensions\.width/u);
    assert.match(resource.contents[0].text, /confirmedSelectionIdentity/u);
    assert.match(resource.contents[0].text, /mappedGeometryContentIdentity/u);
    assert.match(resource.contents[0].text, /ratioPackRefs/u);
    assert.match(resource.contents[0].text, /revalidateCompleted\(payload,completed,expectedPayloadIdentity\)/u);
    assert.match(resource.contents[0].text, /const revalidationPayload=state\.payload,completed=completedWidgetStateFor\(revalidationPayload\)/u);
    assert.match(resource.contents[0].text, /if\(completed&&!state\.confirming&&!state\.completed\)await revalidateCompleted\(revalidationPayload,completed,identity\)/u);
    assert.match(resource.contents[0].text, /window\.addEventListener\("openai:set_globals",bootstrap\)/u);
    assert.match(resource.contents[0].text, /window\.addEventListener\("message",event=>/u);
    assert.match(resource.contents[0].text, /event\.source!==window\.parent/u);
    assert.match(resource.contents[0].text, /ui\/notifications\/tool-result/u);
    assert.match(resource.contents[0].text, /rpcRequest\("ui\/initialize"/u);
    assert.match(resource.contents[0].text, /rpcNotify\("ui\/notifications\/initialized"/u);
    assert.match(resource.contents[0].text, /rpcRequest\("tools\/call",\{name,arguments:args\}\)/u);
    assert.match(resource.contents[0].text, /pendingRequests\.get\(message\.id\)/u);
    assert.match(resource.contents[0].text, /data-norma-bridge","ready"/u);
    assert.match(resource.contents[0].text, /data-norma-last-error","tools-call"/u);
    assert.match(resource.contents[0].text, /payload\.stage==="confirmation_required"&&!state\.payload/u);
    assert.match(resource.contents[0].text, /BOOTSTRAP_PENDING_NOTICE_AFTER=50/u);
    assert.match(resource.contents[0].text, /BOOTSTRAP_SLOW_RETRY_DELAY_MS=1000/u);
    assert.match(resource.contents[0].text, /Connexion au résultat de l’analyse en cours/u);
    assert.doesNotMatch(resource.contents[0].text, /window\.addEventListener\("openai:set_globals",\(\)=>\{const payload=currentPayload\(\);if\(payload&&payload\.stage==="completed"/u);
    assert.match(resource.contents[0].text, /MESURES REVALIDÉES/u);
    assert.match(resource.contents[0].text, /RAPPORT MÉMORISÉ · NON REVALIDÉ/u);
    assert.doesNotMatch(resource.contents[0].text, /CORE VÉRIFIÉ · MÉMORISÉ/u);
    assert.match(resource.contents[0].text, /status:"CORE_AND_IMAGE_PLANE_VERIFIED"/u);
    assert.match(resource.contents[0].text, /scrollToBottom:true/u);
    assert.match(resource.contents[0].text, /confirmClientReviewedSelection:true/u);
    assert.match(resource.contents[0].text, /function pixelRecovery\(payload\)\{const recovery=\{fileId:payload\.fileId/u);
    assert.match(resource.contents[0].text, /recovery:pixelRecovery\(payload\)/u);
    assert.match(resource.contents[0].text, /sourceImageMediaType:payload\.sourceImageMediaType\?\?null/u);
    assert.match(resource.contents[0].text, /function findCompletedResult\(value,depth=0\)/u);
    assert.match(resource.contents[0].text, /value\.status==="completed"&&value\.coreRun===true&&isStoredIdentity\(value\.canonicalResultIdentity\)/u);
    assert.match(resource.contents[0].text, /completedPayload=hiddenPayload\|\|\{stage:"completed",fileId:payloadSnapshot\.fileId,result:structured,imagePlaneGuideAnalysis:structured\.imagePlaneGuideAnalysis,declaredMeasurementRatioReport:structured\.declaredMeasurementRatioReport,overlaySvg:""\}/u);
    assert.match(resource.contents[0].text, /id="measurementRatioToggle"/u);
    assert.match(resource.contents[0].text, /id="measurementRatioFirst"/u);
    assert.match(resource.contents[0].text, /id="measurementRatioSecond"/u);
    assert.match(resource.contents[0].text, /Rapport de deux longueurs/u);
    assert.match(resource.contents[0].text, /rapport opt-in séparé, sans autorité Core/u);
    assert.match(resource.contents[0].text, /syncOverlaySelection/u);
    assert.match(resource.contents[0].text, /function syncOverlaySelection\(\).*syncPixelProposalOverlay\(\)/u);
    assert.match(resource.contents[0].text, /reviewedCandidateGeometry/u);
    assert.match(resource.contents[0].text, /function isStoredGeometrySnapshot\(value,candidates\)/u);
    assert.match(resource.contents[0].text, /sameGeometrySnapshots\(saved\.reviewedCandidateGeometry,completed\.reviewedCandidateGeometry\)/u);
    assert.match(resource.contents[0].text, /overlay\.addEventListener\("pointerdown"/u);
    assert.match(resource.contents[0].text, /overlay\.addEventListener\("keydown"/u);
    assert.match(resource.contents[0].text, /event\.shiftKey/u);
    assert.match(resource.contents[0].text, /focusTarget\.focus\?\.\(\)/u);
    assert.match(resource.contents[0].text, /data-resize-handle/u);
    assert.match(resource.contents[0].text, /data-point-handle/u);
    assert.match(resource.contents[0].text, /data-vertex-handle/u);
    assert.match(resource.contents[0].text, /function canonicalQuadrilateralVerticesForWidget\(vertices\)/u);
    assert.match(resource.contents[0].text, /function canonicalGeometryNumber\(value\)/u);
    assert.match(resource.contents[0].text, /function candidateWithPrimitive\(item,primitive,canonicalizeQuadrilateral=false\)/u);
    assert.match(resource.contents[0].text, /candidateWithPrimitive\(item,item\.primitive,true\)/u);
    assert.match(resource.contents[0].text, /function adjustGuideHandle\(item,pointHandle,vertexHandle,dx,dy\)/u);
    assert.match(resource.contents[0].text, /function translateGuideCandidate\(item,dx,dy\)/u);
    assert.match(resource.contents[0].text, /data-supporting-line/u);
    assert.match(resource.contents[0].text, /id="familyFilters"/u);
    assert.match(resource.contents[0].text, /visibleKinds:new Set\(\["rectangle","quadrilateral","segment","axis","ellipse"\]\)/u);
    assert.match(resource.contents[0].text, /function syncFamilyVisibility\(\)/u);
    assert.match(resource.contents[0].text,
      /\.construction-controls\{grid-template-columns:minmax\(0,1fr\)\}/u);
    assert.match(resource.contents[0].text, /\.shell,\.header,\.content,\.visual,\.side,\.flow,\.construction-controls\{width:100%/u);
    assert.match(resource.contents[0].text, /--ink:#0a0a0a;--paper:#f2f2f2;--paper-hover:#e5e5e5/u);
    assert.match(resource.contents[0].text, /--disabled:#6f6f6f/u);
    assert.match(resource.contents[0].text, /--display:Archivo,Geist,"Helvetica Neue",Helvetica,Arial,sans-serif/u);
    assert.match(resource.contents[0].text, /--body:Geist,"Helvetica Neue",Helvetica,Arial,sans-serif/u);
    assert.match(resource.contents[0].text, /font-variation-settings:"wdth" 85/u);
    assert.match(resource.contents[0].text, /\.shell\{border-radius:2px;box-shadow:none\}/u);
    assert.match(resource.contents[0].text, /\.header,\.flow,\.visual\{border-color:var\(--rule\)\}/u);
    assert.match(resource.contents[0].text, /\.flow span,\.family-filter,\.construction-toggle,\.pixel-toggle,\.candidate strong,\.confirm\{font-family:var\(--body\);font-weight:600/u);
    assert.match(resource.contents[0].text, /\.match,\.ratio,\.match-copy strong\{color:var\(--ink\)\}/u);
    assert.match(resource.contents[0].text, /\.overlay svg path,\.overlay svg rect\[stroke\]\{filter:drop-shadow\(0 0 1px rgba\(10,10,10,\.85\)\)\}/u);
    assert.match(resource.contents[0].text, /\.measurement-ratio\{display:grid;gap:6px;[^}]*padding:9px/u);
    assert.match(resource.contents[0].text, /\.measurement-ratio-toggle\{width:100%;padding:7px/u);
    assert.match(resource.contents[0].text, /\.measurement-ratio-selects\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\);gap:6px\}/u);
    assert.match(resource.contents[0].text, /\.measurement-ratio select\{min-width:0;width:100%;padding:7px/u);
    assert.match(resource.contents[0].text, /appearance:none;border:1px solid var\(--ink\);border-radius:0/u);
    assert.match(resource.contents[0].text, /background:var\(--paper-hover\);color:var\(--ink\)/u);
    assert.match(resource.contents[0].text, /linear-gradient\(45deg,transparent 0 42%,var\(--white\) 42% 58%,transparent 58%\)/u);
    assert.match(resource.contents[0].text, /\.limit\{overflow-wrap:anywhere\}/u);
    assert.doesNotMatch(resource.contents[0].text, /border:1px dashed var\(--ink\)|box-shadow:inset 0 -2px var\(--ink\)/u);
    assert.doesNotMatch(resource.contents[0].text, /Arial Narrow|Helvetica Neue Condensed/u);
    assert.doesNotMatch(resource.contents[0].text, /box-shadow:0 (?:14px 34px|20px 50px)/u);
    assert.doesNotMatch(resource.contents[0].text, /<circle cx="(?:16|48)" cy="(?:49|15)" r="3\.5" fill="currentColor"\/>/u);
    assert.doesNotMatch(resource.contents[0].text, /font-size:(?:8|9)px/u);
    assert.match(resource.contents[0].text, /NORMA\.SCIENCE/u);
    assert.match(resource.contents[0].text, /<img class="mark" src="data:image\/png;base64,iVBORw0KGgo/u);
    assert.doesNotMatch(resource.contents[0].text, /M32 3 56 17V47L32 61 8 47V17Z/u);
    assert.doesNotMatch(resource.contents[0].text, /M16 49V15L48 49V15/u);
    assert.match(resource.contents[0].text, /button:focus-visible,input:focus-visible/u);
    assert.match(resource.contents[0].text, /@media\(prefers-reduced-motion:reduce\)/u);
    assert.doesNotMatch(resource.contents[0].text, /radial-gradient|#fb7a27|#4bd4ff|#db2777/u);
    assert.match(resource.contents[0].text, /primitiveKind\(item\)==="rectangle"/u);
    assert.match(resource.contents[0].text, /confirmedVisualGuideCandidateIds/u);
    assert.match(resource.contents[0].text, /N’attribue jamais un ratio du Core aux guides/u);
    assert.match(resource.contents[0].text, /guide"\+\(confirmedGuideCount===1\?"":"s"\)\+" confirmé/u);
    assert.match(resource.contents[0].text, /function appendImagePlaneRelations\(analysis\)/u);
    assert.match(resource.contents[0].text, /function appendQuadrilateralMeasurements\(analysis\)/u);
    assert.match(resource.contents[0].text, /quadrilateralMeasurements:\(analysis\?\.quadrilateralMeasurements\|\|\[\]\)/u);
    assert.match(resource.contents[0].text, /classification mesurée, côtés, angles, diagonales, parallélismes et surface/u);
    assert.match(resource.contents[0].text, /shallow_intersection:"COUPE RASANTE"/u);
    assert.match(resource.contents[0].text, /contactCharacter:item\.contactCharacter/u);
    assert.match(resource.contents[0].text, /imageLoadGeneration:0/u);
    assert.match(resource.contents[0].text, /IMAGE_HYDRATION_MAX_ATTEMPTS=2/u);
    assert.match(resource.contents[0].text, /const runImageHydration=async function runPersonalVisualHarmonyImageHydrationV1/u);
    assert.match(resource.contents[0].text, /activePayload:null,activePayloadIdentity:null/u);
    assert.match(resource.contents[0].text, /imageLoadTask:null,imageLoadFileId:null,imageLoadPayloadIdentity:null/u);
    assert.match(resource.contents[0].text, /function payloadIdentity\(payload\)/u);
    assert.match(resource.contents[0].text, /function imageLoadIsCurrent\(generation,fileId,payloadIdentity\)/u);
    assert.match(resource.contents[0].text, /if\(!imageLoadIsCurrent\(generation,fileId,payloadIdentity\)\)return/u);
    assert.match(resource.contents[0].text, /function loadDisplayedImage\(downloadUrl,generation,fileId,payloadIdentity\)/u);
    assert.doesNotMatch(resource.contents[0].text, /const probe=new Image\(\)/u);
    assert.doesNotMatch(resource.contents[0].text, /source\.src=result\.downloadUrl/u);
    assert.match(resource.contents[0].text, /const imageLoaded=await loadImage\(payload\.fileId,identity,\{force:forceImageReload\}\);if\(!imageLoaded\|\|state\.activePayloadIdentity!==identity\)return/u);
    assert.match(resource.contents[0].text, /if\(payload\.fileId&&!await loadImage\(payload\.fileId,identity,\{force:forceImageReload\}\)\)return/u);
    assert.match(resource.contents[0].text, /function showImageFailure\(failure\)/u);
    assert.match(resource.contents[0].text, /Réessayer l’affichage/u);
    assert.match(resource.contents[0].text, /data-norma-image-hydration/u);
    assert.match(resource.contents[0].text, /if\(!force&&state\.imageReady&&state\.imageLoadFileId===fileId&&state\.imageLoadPayloadIdentity===payloadIdentity\)return true/u);
    assert.match(resource.contents[0].text, /if\(!force&&state\.imageLoadTask&&state\.imageLoadFileId===fileId&&state\.imageLoadPayloadIdentity===payloadIdentity\)return state\.imageLoadTask/u);
    assert.match(resource.contents[0].text, /getDownloadUrl:requestedFileId=>window\.openai\.getFileDownloadUrl\(\{fileId:requestedFileId\}\)/u);
    assert.match(resource.contents[0].text, /function decorateEditableOverlay\(\)/u);
    assert.match(resource.contents[0].text, /const layoutCandidateLabels=function layoutPersonalVisualHarmonyCandidateLabelsV1/u);
    assert.match(resource.contents[0].text, /function syncCandidateLabelLayout\(\)/u);
    assert.match(resource.contents[0].text, /syncCandidateLabelLayout\(\);syncPixelProposalOverlay\(\)/u);
    assert.match(resource.contents[0].text, /data-candidate-label-leader/u);
    assert.match(resource.contents[0].text, /document\.createElementNS\("http:\/\/www\.w3\.org\/2000\/svg","rect"\)/u);
    assert.match(resource.contents[0].text, /async function prepareReviewedPayload\(payload,candidateSnapshot\)/u);
    assert.match(resource.contents[0].text, /callAppTool\(PREPARE_TOOL,\{image,candidates:candidateSnapshot\}\)/u);
    assert.match(resource.contents[0].text, /download_url:state\.downloadUrl/u);
    assert.match(resource.contents[0].text, /state\.payload=fresh;state\.proposalCandidateSetIdentity=fresh\.prepared\.candidateSetIdentity/u);
    assert.match(resource.contents[0].text, /state\.proposalCandidates=fresh\.prepared\.candidates\.map/u);
    assert.match(resource.contents[0].text, /candidateSetIdentity=state\.proposalCandidateSetIdentity\|\|state\.payload\.prepared\.candidateSetIdentity/u);
    assert.match(resource.contents[0].text, /function reviewedCandidateSnapshot\(\)\{return Object\.freeze/u);
    assert.match(resource.contents[0].text, /state\.confirming\|\|state\.pixelRefinementRunning\|\|!state\.payload/u);
    assert.match(resource.contents[0].text, /function setReviewLocked\(locked\)/u);
    assert.match(resource.contents[0].text, /prepareReviewedPayload\(payloadSnapshot,candidateSnapshot\)/u);
    assert.match(resource.contents[0].text, /callConfirmation\(analysisPayload,selectedSnapshot,guideSnapshot,constructionSnapshot,dimensionsSnapshot,measurementRatioSnapshot\)/u);
    assert.match(resource.contents[0].text, /function finishConfirmingPayload\(expectedPayloadIdentity\)/u);
    assert.match(resource.contents[0].text, /finally\{finishConfirmingPayload\(expectedPayloadIdentity\)\}/u);
    assert.match(resource.contents[0].text, /finally\{finishConfirmingPayload\(payloadIdentitySnapshot\)\}/u);
    assert.match(resource.contents[0].text, /state\.reviewedCandidates=candidateSnapshot\.map/u);
    assert.match(resource.contents[0].text, /state\.confirming\|\|!state\.imageReady/u);
    assert.match(resource.contents[0].text, /moveEvent\.pointerId!==pointerId\|\|state\.confirming/u);
    assert.match(resource.contents[0].text, /group\.setPointerCapture\?\.\(pointerId\)/u);
    assert.match(resource.contents[0].text, /group\.setAttribute\("tabindex",editable\?"0":"-1"\)/u);
    assert.match(resource.contents[0].text, /\.overlay \[data-primitive-kind="rectangle"\],\.overlay \[data-primitive-kind="quadrilateral"\]/u);
    assert.doesNotMatch(resource.contents[0].text, /\.overlay\{[^}]*touch-action:none/u);
    assert.ok(confirmTool.inputSchema.properties.confirmedVisualGuideCandidateIds);
    assert.ok(confirmTool.outputSchema.properties.imagePlaneGuideAnalysis);
  } finally {
    await connected.close();
  }
});

test("guided analysis entry exposes the short default and every goal without activating analysis", () => {
  const html = createPersonalVisualHarmonyWidgetHtmlV1();
  assert.match(html, /id="guidedEntry"/u);
  assert.match(html, /confirmation et Core restent manuels/u);
  assert.match(html, /guidedAnalysisGoal:DEFAULT_GUIDED_ANALYSIS_GOAL/u);
  assert.match(html, /guidedAnalysisGoal:guidedAnalysisGoalSnapshot\(\)/u);
  assert.match(html, /button\.addEventListener\("click",\(\)=>toggleFamilyVisibility\(kind\)\)/u);
  assert.match(html, /\.guided-goals\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/u);
  assert.match(html, /@media\(max-width:520px\)\{\.guided-goals\{grid-template-columns:minmax\(0,1fr\)\}\}/u);
  for (const goal of PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1) {
    assert.match(html, new RegExp(goal.id, "u"));
    assert.match(html, new RegExp(goal.label, "u"));
    assert.match(html, new RegExp(goal.effect, "u"));
  }

  const state = {
    guidedAnalysisGoal: "general-geometry",
    visibleKinds: new Set(["rectangle"]),
    activePayload: {
      stage: "confirmation_required",
      fileId: "file-guided",
      prepared: {
        candidateSetIdentity: `sha256:${"a".repeat(64)}`,
        candidates: [
          { id: "frame", primitive: { kind: "rectangle" } },
          { id: "axis", primitive: { kind: "axis" } },
          { id: "segment", primitive: { kind: "segment" } },
        ],
        triangleConstructionRequests: [{
          requestId: "guided-triangle",
          vertices: [
            {
              parent: {
                kind: "observed-line-endpoint",
                candidateId: "segment",
                endpoint: "start",
              },
            },
            {
              parent: {
                kind: "observed-line-endpoint",
                candidateId: "segment",
                endpoint: "end",
              },
            },
            {
              parent: {
                kind: "observed-line-endpoint",
                candidateId: "axis",
                endpoint: "end",
              },
            },
          ],
        }],
      },
    },
    payload: null,
    reviewedCandidates: [],
    constructionLayers: new Set(),
    measurementRatioEnabled: false,
    selected: new Set(["frame"]),
    selectedGuides: new Set(["axis"]),
  };
  const guidedGoalStatus = { textContent: "" };
  let familyButtonSyncCalls = 0;
  let syncCalls = 0;
  let persistCalls = 0;
  const triangleRequestParentGuideIds = widgetScriptFunction(
    "triangleRequestParentGuideIds",
    "function triangleLayerReady",
    {},
  );
  const visibleKindsForGuidedAnalysisGoal = widgetScriptFunction(
    "visibleKindsForGuidedAnalysisGoal",
    "function guidedAnalysisGoalSnapshot",
    {
      state,
      triangleRequestParentGuideIds,
      primitiveKind: (item) => item.primitive.kind,
      GUIDED_ANALYSIS_KINDS: ["rectangle", "quadrilateral", "segment", "axis", "ellipse"],
    },
  );
  const applyGuidedAnalysisGoal = widgetScriptFunction(
    "applyGuidedAnalysisGoal",
    "function restoreGuidedAnalysisGoal",
    {
      GUIDED_ANALYSIS_GOALS: PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1,
      state,
      visibleKindsForGuidedAnalysisGoal,
      updateGuidedAnalysisGoalButtons() {},
      updateFamilyFilterButtons() { familyButtonSyncCalls += 1; },
      syncFamilyVisibility() { syncCalls += 1; },
      guidedGoalStatus,
      persistGuidedAnalysisGoal() { persistCalls += 1; },
    },
  );

  for (const goal of PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1) {
    applyGuidedAnalysisGoal(goal.id);
    assert.equal(state.guidedAnalysisGoal, goal.id);
    assert.deepEqual(
      [...state.visibleKinds].sort(),
      [...visibleKindsForGuidedAnalysisGoal(goal)].sort(),
    );
    assert.equal(guidedGoalStatus.textContent, goal.effect);
  }
  assert.equal(familyButtonSyncCalls, PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.length);
  assert.equal(syncCalls, PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.length);
  assert.equal(persistCalls, PERSONAL_VISUAL_HARMONY_GUIDED_ANALYSIS_GOALS_V1.length);
  assert.deepEqual([...state.constructionLayers], []);
  assert.equal(state.measurementRatioEnabled, false);
  assert.deepEqual([...state.selected], ["frame"]);
  assert.deepEqual([...state.selectedGuides], ["axis"]);
  assert.doesNotMatch(String(applyGuidedAnalysisGoal), /callAppTool|confirmButton|toggleConstructionLayer/u);
});

test("same-file payload replacement invalidates the older widget hydration continuation", async () => {
  const payloadIdentity = widgetScriptFunction("payloadIdentity", "function imageLoadIsCurrent", {});
  const state = widgetHydrationState({
    imageReady: true,
    imageLoadFileId: "file-old",
    imageLoadPayloadIdentity: "identity-old",
    dimensions: { width: 320, height: 180 },
  });
  const imageLoads = [];
  const dimensionsDuringCandidateRender = [];
  const performImageLoad = (fileId, generation, payloadIdentity) => {
    const pending = deferred();
    imageLoads.push({ fileId, generation, payloadIdentity, pending });
    return pending.promise;
  };
  const loadImage = widgetScriptFunction("loadImage", "function renderCandidates", {
    state,
    source: { removeAttribute() {} },
    showImageLoading() {},
    performImageLoad,
  });
  const revalidatedIdentities = [];
  const hydrate = widgetScriptFunction("hydrate", "confirmButton.addEventListener", {
    state,
    currentPayload: () => null,
    window: { openai: {} },
    payloadIdentity,
    resetManualSegmentGesture() {},
    overlay: { innerHTML: "" },
    safeSvg: (value) => value,
    renderCandidates() { dimensionsDuringCandidateRender.push(state.dimensions); },
    loadImage,
    completedWidgetStateFor: (payload) => ({ candidateSetIdentity: payload.prepared.candidateSetIdentity }),
    revalidateCompleted: async (payload) => { revalidatedIdentities.push(payload.prepared.candidateSetIdentity); },
    renderResult() { throw new Error("confirmation payload must not render a completed result"); },
  });
  const firstPayload = {
    stage: "confirmation_required",
    fileId: "file-shared",
    prepared: { candidateSetIdentity: "sha256:first", candidates: [] },
    overlaySvg: "<svg></svg>",
  };
  const secondPayload = {
    stage: "confirmation_required",
    fileId: "file-shared",
    prepared: { candidateSetIdentity: "sha256:second", candidates: [] },
    overlaySvg: "<svg></svg>",
  };

  const firstHydration = hydrate(firstPayload);
  const secondHydration = hydrate(secondPayload);
  assert.equal(imageLoads.length, 2);
  assert.notEqual(imageLoads[0].payloadIdentity, imageLoads[1].payloadIdentity);
  assert.deepEqual(dimensionsDuringCandidateRender, [null, null]);

  imageLoads[1].pending.resolve(true);
  await secondHydration;
  imageLoads[0].pending.resolve(true);
  await firstHydration;

  assert.deepEqual(revalidatedIdentities, ["sha256:second"]);
  assert.equal(state.activePayload, secondPayload);
});

test("completed payload for a new file hydrates and renders over existing widget state", async () => {
  const payloadIdentity = widgetScriptFunction("payloadIdentity", "function imageLoadIsCurrent", {});
  const oldPayload = {
    stage: "confirmation_required",
    fileId: "file-old",
    prepared: { candidateSetIdentity: "sha256:old", candidates: [] },
  };
  const state = widgetHydrationState({
    payload: oldPayload,
    activePayload: oldPayload,
    activePayloadIdentity: payloadIdentity(oldPayload),
  });
  const imageLoadIsCurrent = widgetScriptFunction(
    "imageLoadIsCurrent",
    "function setImageHydrationStatus",
    { state },
  );
  const loadImage = widgetScriptFunction("loadImage", "function renderCandidates", {
    state,
    source: { removeAttribute() {} },
    showImageLoading() {},
    performImageLoad: async (fileId, generation, payloadIdentity) => (
      imageLoadIsCurrent(generation, fileId, payloadIdentity)
    ),
  });
  const rendered = [];
  let guidedGoalRestores = 0;
  let guidedGoalRenders = 0;
  const hydrate = widgetScriptFunction("hydrate", "confirmButton.addEventListener", {
    state,
    currentPayload: () => null,
    window: { openai: {} },
    payloadIdentity,
    resetManualSegmentGesture() {},
    overlay: { innerHTML: "" },
    safeSvg: (value) => value,
    renderCandidates() {},
    loadImage,
    completedWidgetStateFor() { throw new Error("completed payload must not revalidate cached confirmation state"); },
    revalidateCompleted() { throw new Error("completed payload must not revalidate cached confirmation state"); },
    restoreGuidedAnalysisGoal() { guidedGoalRestores += 1; },
    renderGuidedAnalysisGoals() { guidedGoalRenders += 1; },
    renderResult: (payload, structured) => { rendered.push({ payload, structured }); },
  });
  const completedPayload = {
    stage: "completed",
    fileId: "file-new",
    result: { contentIdentity: `sha256:${"a".repeat(64)}` },
    overlaySvg: "<svg></svg>",
  };
  const structured = { status: "completed" };

  await hydrate(completedPayload, structured);

  assert.deepEqual(rendered, [{ payload: completedPayload, structured }]);
  assert.equal(state.activePayload, completedPayload);
  assert.equal(state.imageLoadFileId, "file-new");
  assert.equal(guidedGoalRestores, 1);
  assert.equal(guidedGoalRenders, 1);
});

test("displayed image load is the hydration proof for single-use temporary URLs", async () => {
  const identity = JSON.stringify(["confirmation_required", "file-once", "sha256:once"]);
  const state = widgetHydrationState({
    activePayloadIdentity: identity,
    imageLoadGeneration: 1,
    imageLoadFileId: "file-once",
  });
  const imageLoadIsCurrent = widgetScriptFunction(
    "imageLoadIsCurrent",
    "function setImageHydrationStatus",
    { state },
  );
  const assignedUrls = [];
  const assignmentOrder = [];
  let currentSrc = "";
  let currentCrossOrigin = "";
  const source = {
    naturalWidth: 900,
    naturalHeight: 600,
    onload: null,
    onerror: null,
    referrerPolicy: "",
    get crossOrigin() { return currentCrossOrigin; },
    set crossOrigin(value) {
      currentCrossOrigin = value;
      assignmentOrder.push(`crossOrigin:${value}`);
    },
    get src() { return currentSrc; },
    set src(value) {
      currentSrc = value;
      assignedUrls.push(value);
      assignmentOrder.push(`src:${value}`);
      queueMicrotask(() => this.onload?.());
    },
  };
  const loadDisplayedImage = widgetScriptFunction(
    "loadDisplayedImage",
    "async function performImageLoad",
    { state, source, imageLoadIsCurrent, IMAGE_HYDRATION_TIMEOUT_MS: 1_000 },
  );

  const result = await loadDisplayedImage(
    "https://files.example/single-use",
    1,
    "file-once",
    identity,
  );

  assert.deepEqual(result, { width: 900, height: 600 });
  assert.deepEqual(assignedUrls, ["https://files.example/single-use"]);
  assert.deepEqual(assignmentOrder, [
    "crossOrigin:anonymous",
    "src:https://files.example/single-use",
  ]);
  assert.equal(source.crossOrigin, "anonymous");
  assert.equal(source.referrerPolicy, "no-referrer");
});

test("successful image hydration enables the opt-in pixel proposal control", async () => {
  const state = widgetHydrationState({
    activePayloadIdentity: "payload-ready",
    imageLoadGeneration: 1,
    imageLoadFileId: "file-ready",
  });
  let pixelUiUpdates = 0;
  let confirmUpdates = 0;
  const performImageLoad = widgetScriptFunction(
    "performImageLoad",
    "async function loadImage",
    {
      window: { openai: { getFileDownloadUrl: async () => ({ downloadUrl: "https://files.example/ready" }) } },
      imageLoadIsCurrent: () => true,
      showImageFailure() { throw new Error("ready hydration must not show a failure"); },
      runImageHydration: async () => ({
        status: "ready",
        attemptCount: 1,
        downloadUrl: "https://files.example/ready",
        width: 80,
        height: 80,
      }),
      IMAGE_HYDRATION_MAX_ATTEMPTS: 2,
      IMAGE_HYDRATION_RETRY_DELAY_MS: 0,
      loadDisplayedImage() { throw new Error("the bounded hydration stub owns image loading"); },
      state,
      visual: { style: {} },
      loading: { style: {} },
      setImageHydrationStatus() {},
      statusNode: { textContent: "" },
      updatePixelProposalUi() { pixelUiUpdates += 1; },
      updateMeasurementRatioControls() { confirmUpdates += 1; },
    },
  );

  assert.equal(await performImageLoad("file-ready", 1, "payload-ready"), true);
  assert.equal(state.imageReady, true);
  assert.deepEqual(state.dimensions, { width: 80, height: 80 });
  assert.equal(pixelUiUpdates, 1);
  assert.equal(confirmUpdates, 1);
});

test("ready image cache refreshes when the same file receives a new payload identity", async () => {
  const state = widgetHydrationState({
    imageReady: true,
    imageLoadGeneration: 3,
    imageLoadFileId: "file-shared",
    imageLoadPayloadIdentity: "identity-old",
    downloadUrl: "https://files.example/expired",
  });
  const loads = [];
  const loadImage = widgetScriptFunction("loadImage", "function renderCandidates", {
    state,
    source: { removeAttribute() {} },
    showImageLoading() {},
    performImageLoad: async (fileId, generation, payloadIdentity) => {
      loads.push({ fileId, generation, payloadIdentity });
      return true;
    },
  });

  assert.equal(await loadImage("file-shared", "identity-new"), true);
  assert.deepEqual(loads, [{ fileId: "file-shared", generation: 4, payloadIdentity: "identity-new" }]);
  assert.equal(state.imageLoadPayloadIdentity, "identity-new");
});

test("replacement confirmation queued during an older confirmation is hydrated after it settles", () => {
  const replacement = {
    stage: "confirmation_required",
    fileId: "file-shared",
    prepared: { candidateSetIdentity: "sha256:replacement", candidates: [] },
  };
  const state = widgetHydrationState({
    activePayload: replacement,
    activePayloadIdentity: "identity-replacement",
    pendingStructuredContent: { status: "confirmation_required" },
    confirming: true,
  });
  const locked = [];
  const hydrated = [];
  const finishConfirmingPayload = widgetScriptFunction(
    "finishConfirmingPayload",
    "async function revalidateCompleted",
    {
      state,
      setReviewLocked: (value) => { locked.push(value); },
      hydrate: (payload, structured) => { hydrated.push({ payload, structured }); },
    },
  );

  finishConfirmingPayload("identity-old");

  assert.equal(state.confirming, false);
  assert.deepEqual(locked, [false]);
  assert.deepEqual(hydrated, [{ payload: replacement, structured: state.pendingStructuredContent }]);
});

test("image hydration refreshes an expired URL once without repeating Norma preparation", async () => {
  const downloadUrls = ["https://files.example/expired", "https://files.example/fresh"];
  const requestedFileIds = [];
  const loadedUrls = [];
  const waits = [];
  const result = await runPersonalVisualHarmonyImageHydrationV1({
    fileId: "file-123",
    maxAttempts: 2,
    retryDelayMs: 250,
    getDownloadUrl: async (fileId) => {
      requestedFileIds.push(fileId);
      return { downloadUrl: downloadUrls.shift() };
    },
    loadDownloadUrl: async (downloadUrl) => {
      loadedUrls.push(downloadUrl);
      if (downloadUrl.endsWith("/expired")) throw new Error("expired");
      return { width: 720, height: 480 };
    },
    isCurrent: () => true,
    waitBeforeRetry: async (delayMs) => { waits.push(delayMs); },
  });

  assert.deepEqual(result, {
    status: "ready",
    attemptCount: 2,
    downloadUrl: "https://files.example/fresh",
    width: 720,
    height: 480,
  });
  assert.deepEqual(requestedFileIds, ["file-123", "file-123"]);
  assert.deepEqual(loadedUrls, ["https://files.example/expired", "https://files.example/fresh"]);
  assert.deepEqual(waits, [250]);
});

test("image hydration fails closed after its bounded URL attempts", async () => {
  let requestCount = 0;
  const result = await runPersonalVisualHarmonyImageHydrationV1({
    fileId: "file-123",
    maxAttempts: 2,
    retryDelayMs: 0,
    getDownloadUrl: async () => {
      requestCount += 1;
      throw new Error("temporary file API failure");
    },
    loadDownloadUrl: async () => { throw new Error("must not load"); },
    isCurrent: () => true,
    waitBeforeRetry: async () => {},
  });

  assert.deepEqual(result, {
    status: "failed",
    attemptCount: 2,
    failure: "download_url_unavailable",
  });
  assert.equal(requestCount, 2);
});

test("image hydration discards a stale response before loading it", async () => {
  let current = true;
  let loadCount = 0;
  const result = await runPersonalVisualHarmonyImageHydrationV1({
    fileId: "file-old",
    maxAttempts: 2,
    retryDelayMs: 0,
    getDownloadUrl: async () => {
      current = false;
      return { downloadUrl: "https://files.example/stale" };
    },
    loadDownloadUrl: async () => {
      loadCount += 1;
      return { width: 1, height: 1 };
    },
    isCurrent: () => current,
    waitBeforeRetry: async () => {},
  });

  assert.deepEqual(result, { status: "stale", attemptCount: 1 });
  assert.equal(loadCount, 0);
});

test("prepare tool canonically derives segment and axis envelopes from explicit endpoints", async () => {
  const connected = await createConnectedClient();
  try {
    const proposedCandidates = mixedPrimitiveCandidates()
      .filter(({ id }) => id === "diagonal" || id === "central-axis")
      .map((candidate, index) => ({
        ...candidate,
        x: 0.01 + (index * 0.04),
        y: 0.02 + (index * 0.04),
        width: 0.03,
        height: 0.04,
      }));
    const inputSnapshot = structuredClone(proposedCandidates);
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/line-envelope-canonicalization",
          file_id: "file-line-envelope-canonicalization",
          mime_type: "image/png",
        },
        candidates: proposedCandidates,
      },
    });

    assert.equal(prepared.isError, undefined, JSON.stringify(prepared));
    assert.deepEqual(proposedCandidates, inputSnapshot);
    const payload = prepared._meta.normaPersonalVisualHarmony;
    assert.equal(payload.prepared.status, "confirmation_required");
    assert.equal(payload.prepared.candidateEvidenceOnly, true);
    assert.equal(payload.prepared.coreRun, false);
    assert.deepEqual(
      payload.prepared.candidates.map(({ x, y, width, height }) => ({ x, y, width, height })),
      [
        { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
        { x: 0.5, y: 0.1, width: 0, height: 0.8 },
      ],
    );
    const listed = await connected.client.listTools();
    const prepareTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL);
    assert.match(
      prepareTool.description,
      /Norma canonically derives segment and axis envelopes from their explicit endpoints/u,
    );
    for (const field of ["x", "y", "width", "height"]) {
      assert.match(
        prepareTool.inputSchema.properties.candidates.items.properties[field].description,
        /Norma canonically derives (?:this|segment, axis, ellipse, and quadrilateral) envelope/u,
        field,
      );
    }
  } finally {
    await connected.close();
  }
});

test("app-only bounded pixel proposals abstain without adopting geometry or running Core", async () => {
  const connected = await createConnectedClient();
  try {
    const proposedCandidates = mixedPrimitiveCandidates();
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/bounded-pixel-proposal",
          file_id: "file-pixel-proposal",
          mime_type: "image/png",
        },
        candidates: proposedCandidates,
      },
    });
    const payload = prepared._meta.normaPersonalVisualHarmony;
    const diagonal = proposedCandidates.find(({ id }) => id === "diagonal");
    assert.ok(diagonal?.primitive);
    const plan = createPersonalVisualHarmonyPixelCropPlanV1({
      primitive: diagonal.primitive,
      sourcePixelWidth: 64,
      sourcePixelHeight: 64,
    });
    assert.equal(plan.status, "ready");
    const recovery = {
      fileId: "file-pixel-proposal",
      sourceImageMediaType: "image/png",
      candidates: proposedCandidates,
    };
    const reviewedDiagonalPrimitive = {
      ...structuredClone(diagonal.primitive),
      start: { x: diagonal.primitive.start.x + 0.01, y: diagonal.primitive.start.y },
      end: { x: diagonal.primitive.end.x + 0.01, y: diagonal.primitive.end.y },
    };
    const unavailable = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
      arguments: {
        sessionId: payload.sessionId,
        candidateSetIdentity: payload.prepared.candidateSetIdentity,
        candidateId: "diagonal",
        reviewedPrimitive: reviewedDiagonalPrimitive,
        sourcePixelWidth: 64,
        sourcePixelHeight: 64,
        recovery,
      },
    });
    assert.equal(unavailable.isError, undefined);
    assert.equal(unavailable.structuredContent.proposal.status, "abstained");
    assert.equal(unavailable.structuredContent.proposal.reason, "pixel_read_unavailable");
    assert.deepEqual(unavailable.structuredContent.proposal.originalGeometry, reviewedDiagonalPrimitive);
    assert.equal(
      unavailable.structuredContent.proposal.candidateSetIdentity,
      payload.prepared.candidateSetIdentity,
    );
    assert.equal(unavailable.structuredContent.proposal.proposalAdopted, false);
    assert.equal(unavailable.structuredContent.proposal.coreRun, false);

    const weakBytes = Buffer.alloc(plan.rasterWidth * plan.rasterHeight, 128);
    const weak = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
      arguments: {
        sessionId: payload.sessionId,
        candidateSetIdentity: payload.prepared.candidateSetIdentity,
        candidateId: "diagonal",
        reviewedPrimitive: diagonal.primitive,
        sourcePixelWidth: 64,
        sourcePixelHeight: 64,
        luminanceBase64: weakBytes.toString("base64"),
        recovery,
      },
    });
    assert.equal(weak.isError, undefined);
    assert.equal(weak.structuredContent.proposal.status, "abstained");
    assert.equal(weak.structuredContent.proposal.proposedGeometry, null);
    assert.equal(weak.structuredContent.proposal.sourceTruth, false);
    assert.equal(weak.structuredContent.proposal.automaticAcceptance, false);
    assert.equal(weak.structuredContent.proposal.coreRun, false);
    assert.notEqual(
      weak.structuredContent.proposal.contentIdentity,
      unavailable.structuredContent.proposal.contentIdentity,
    );
  } finally {
    await connected.close();
  }
});

test("app-only rotated ellipse refinement returns bounded evidence without adoption or Core", async () => {
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-15T12:00:00.000Z"),
    createSessionId: () => "session:rotated-pixel-refinement",
  }));
  try {
    const ellipseCandidate = {
      id: "rotated-pixel-ellipse",
      label: "Ellipse orientée observée",
      role: "structural-region",
      reason: "Contour elliptique explicitement confirmé avant preuve pixel locale",
      x: 0.25,
      y: 0.375,
      width: 0.5,
      height: 0.25,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.25,
        radiusY: 0.125,
        rotationDegrees: 30,
      },
    };
    const candidateValues = [...candidates(), ellipseCandidate];
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/rotated-pixel-refinement",
          file_id: "file-rotated-pixel-refinement",
          mime_type: "image/png",
        },
        candidates: candidateValues,
      },
    });
    assert.equal(prepared.isError, undefined);
    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    const preparedEllipse = widgetMeta.prepared.candidates.find(
      ({ id }) => id === ellipseCandidate.id,
    );
    const plan = createPersonalVisualHarmonyPixelCropPlanV1({
      primitive: preparedEllipse.primitive,
      sourcePixelWidth: 80,
      sourcePixelHeight: 80,
    });
    const refined = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        candidateId: ellipseCandidate.id,
        reviewedPrimitive: preparedEllipse.primitive,
        sourcePixelWidth: 80,
        sourcePixelHeight: 80,
        luminanceBase64: rotatedEllipseCropBase64(plan, {
          kind: "ellipse",
          center: { x: 41, y: 39 },
          radiusX: 21,
          radiusY: 11,
          rotationDegrees: 32,
        }),
        recovery: recoveryInput("file-rotated-pixel-refinement", candidateValues),
      },
    });

    assert.equal(refined.isError, undefined, JSON.stringify(refined));
    const proposal = refined.structuredContent.proposal;
    assert.equal(proposal.status, "refined");
    assert.deepEqual(proposal.originalGeometry, preparedEllipse.primitive);
    assert.notDeepEqual(proposal.proposedGeometry, proposal.originalGeometry);
    assert.equal(proposal.rotatedEllipseSearch.maximumEvaluations, 214);
    assert.ok(proposal.rotatedEllipseSearch.evaluatedCandidates <= 214);
    assert.ok(Math.abs(proposal.rotatedEllipseSearch.parameterDeltas.rotationDegrees) <= 4);
    assert.ok(proposal.displacementPixels.maximum <= 6);
    assert.equal(proposal.candidateEvidenceOnly, true);
    assert.equal(proposal.sourceTruth, false);
    assert.equal(proposal.automaticAcceptance, false);
    assert.equal(proposal.explicitProposalAdoptionRequired, true);
    assert.equal(proposal.proposalAdopted, false);
    assert.equal(proposal.explicitUserConfirmationRequired, true);
    assert.equal(proposal.coreRun, false);
  } finally {
    await connected.close();
  }
});

test("prepare keeps Core stopped and confirm runs deterministic Core only after the literal widget gate", async () => {
  const connected = await createConnectedClient();
  try {
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
          file_name: "private-name.png",
        },
        candidates: candidates(),
      },
    });
    assert.equal(prepared.isError, undefined);
    assert.equal(prepared.structuredContent.status, "confirmation_required");
    assert.equal(prepared.structuredContent.coreRun, false);
    assert.equal(prepared.structuredContent.candidateEvidenceOnly, true);
    assert.equal(prepared.structuredContent.explicitSelectionConfirmationRequired, true);
    assert.doesNotMatch(JSON.stringify(prepared.structuredContent), /file-private-opaque-id|private-signed-image|private-name/u);
    assert.doesNotMatch(JSON.stringify(prepared.content), /file-private-opaque-id|private-signed-image|private-name/u);

    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    assert.equal(widgetMeta.stage, "confirmation_required");
    assert.equal(widgetMeta.fileId, "file-private-opaque-id");
    assert.equal(widgetMeta.sourceImageMediaType, "image/png");
    assert.equal(widgetMeta.sessionId, "session:test-personal-visual-harmony");
    assert.match(widgetMeta.overlaySvg, /^<svg/u);

    const rejected = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: false,
      },
    });
    assert.equal(rejected.isError, true);

    const malformedGuides = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: "main-ellipse",
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput(),
      },
    });
    assert.equal(malformedGuides.isError, true);

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput(),
      },
    });
    assert.equal(confirmed.isError, undefined);
    assert.equal(confirmed.structuredContent.status, "completed");
    assert.equal(confirmed.structuredContent.explicitSelectionConfirmation, true);
    assert.equal(confirmed.structuredContent.confirmationMode, "client_asserted_widget_interaction");
    assert.equal(confirmed.structuredContent.serverVerifiedHumanPresence, false);
    assert.equal("explicitHumanConfirmation" in confirmed.structuredContent, false);
    assert.equal(confirmed.structuredContent.coreInputAuthority, "confirmed_structured_geometry");
    assert.equal(confirmed.structuredContent.coreRun, true);
    assert.deepEqual(confirmed.structuredContent.coreAnalyzedCandidateIds, ["major", "minor"]);
    assert.deepEqual(confirmed.structuredContent.visualGuideCandidateIds, []);
    assert.deepEqual(confirmed.structuredContent.confirmedVisualGuideCandidateIds, []);
    assert.deepEqual(confirmed.structuredContent.imagePlaneGuideAnalysis.relationships, []);
    assert.match(
      confirmed.structuredContent.imagePlaneGuideAnalysis.contentIdentity,
      /^sha256:[0-9a-f]{64}$/u,
    );
    assert.ok(confirmed.structuredContent.relationshipCount >= 2);
    assert.ok(confirmed.structuredContent.matches.some(({ ratioLabel }) => ratioLabel === "φ major"));
    assert.ok(confirmed.structuredContent.matches.some(({ ratioLabel }) => ratioLabel === "φ minor"));
    assert.equal(confirmed.structuredContent.presentation.contractId, "personal-visual-harmony-presentation");
    assert.equal(confirmed.structuredContent.presentation.contractVersion, 1);
    assert.equal(confirmed.structuredContent.presentation.primaryPattern.kind, "complementary_pair");
    assert.equal(confirmed.structuredContent.presentation.primaryPattern.subjects.length, 2);
    assert.equal(
      confirmed.structuredContent.presentation.primaryPattern.subjects
        .reduce((sum, subject) => sum + subject.observedPercent, 0),
      100,
    );
    assert.match(confirmed.structuredContent.canonicalResultIdentity, /^sha256:[0-9a-f]{64}$/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /^<svg/u);
    assert.equal(confirmed._meta.normaPersonalVisualHarmony.stage, "completed");

    const replay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["minor", "major"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput(),
      },
    });
    assert.equal(replay.structuredContent.canonicalResultIdentity, confirmed.structuredContent.canonicalResultIdentity);

    const conflicting = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput(),
      },
    });
    assert.equal(conflicting.isError, true);
  } finally {
    await connected.close();
  }
});

test("mixed structural primitives stay visible while only rectangles cross the Core boundary", async () => {
  const connected = await createConnectedClient();
  try {
    const candidateValues = mixedPrimitiveCandidates();
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
        },
        candidates: candidateValues,
      },
    });
    assert.equal(prepared.isError, undefined);
    assert.deepEqual(
      prepared.structuredContent.candidates.map(({ primitive }) => primitive?.kind ?? "rectangle"),
      ["rectangle", "rectangle", "segment", "axis", "ellipse"],
    );
    assert.match(prepared._meta.normaPersonalVisualHarmony.overlaySvg, /data-primitive-kind="segment"/u);
    assert.match(prepared._meta.normaPersonalVisualHarmony.overlaySvg, /data-primitive-kind="ellipse"/u);

    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    const guideRejected = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "diagonal"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(guideRejected.isError, true);
    assert.match(guideRejected.content[0].text, /Visual guides cannot enter Norma Core/u);

    const rectangleAsGuideRejected = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["major"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(rectangleAsGuideRejected.isError, true);
    assert.match(rectangleAsGuideRejected.content[0].text, /separate confirmation fields/u);

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["diagonal", "central-axis", "main-ellipse"],
        constructionLayers: ["junction-angles", "format-diagonals", "support-line-extensions"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(confirmed.isError, undefined);
    assert.deepEqual(confirmed.structuredContent.coreAnalyzedCandidateIds, ["major", "minor"]);
    assert.deepEqual(confirmed.structuredContent.visualGuideCandidateIds, [
      "diagonal",
      "central-axis",
      "main-ellipse",
    ]);
    assert.deepEqual(confirmed.structuredContent.confirmedVisualGuideCandidateIds, [
      "diagonal",
      "central-axis",
      "main-ellipse",
    ]);
    assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.relationships.length, 2);
    assert.deepEqual(
      confirmed.structuredContent.imagePlaneGuideAnalysis.relationships
        .map(({ lineCandidateId }) => lineCandidateId)
        .sort(),
      ["central-axis", "diagonal"],
    );
    assert.ok(confirmed.structuredContent.imagePlaneGuideAnalysis.relationships.every(({ classification }) => (
      classification === "intersection"
    )));
    const constructions = confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis;
    assert.deepEqual(constructions.enabledLayers, [
      "support-line-extensions",
      "format-diagonals",
      "junction-angles",
    ]);
    assert.equal(constructions.observedLines.length, 2);
    assert.equal(constructions.supportLineExtensions.length, 2);
    assert.equal(constructions.formatDiagonals.length, 2);
    assert.equal(constructions.relations.length, 4);
    assert.ok(constructions.junctionAngles.length > 0);
    assert.equal(constructions.sourceTruth, false);
    assert.equal(constructions.coreRun, false);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-primitive-kind="axis"/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-image-plane-relation-id=/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-format-diagonal=/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-junction-angle-id=/u);
  } finally {
    await connected.close();
  }
});

test("MCP preparation reports an absent triangle request without implying a Core run", async () => {
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-17T09:00:00.000Z"),
    createSessionId: () => "session:triangle-request-absent",
  }));
  try {
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/triangle-request-absent",
          file_id: "file-triangle-request-absent",
          mime_type: "image/png",
        },
        candidates: mixedPrimitiveCandidates(),
      },
    });

    assert.equal(prepared.isError, undefined);
    assert.equal(prepared.structuredContent.triangleRequestCount, 0);
    assert.equal(prepared._meta.normaPersonalVisualHarmony.prepared.triangleRequestCount, 0);
    assert.equal(prepared.structuredContent.coreRun, false);
    assert.match(
      prepared.content[0].text,
      /Aucune demande explicite de triangle n’est présente ; les contrôles dérivés du triangle restent indisponibles/u,
    );
    assert.match(prepared.content[0].text, /Le Core n’a pas été lancé/u);
  } finally {
    await connected.close();
  }
});

test("MCP preparation keeps derived triangle guidance unavailable for multiple requests", async () => {
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-17T09:05:00.000Z"),
    createSessionId: () => "session:multiple-triangle-requests",
  }));
  try {
    const [triangleRequest] = explicitTriangleConstructionRequests();
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/multiple-triangle-requests",
          file_id: "file-multiple-triangle-requests",
          mime_type: "image/png",
        },
        candidates: mixedPrimitiveCandidates(),
        triangleConstructionRequests: [
          triangleRequest,
          { ...structuredClone(triangleRequest), requestId: "explicit-oblique-triangle-2" },
        ],
      },
    });

    assert.equal(prepared.isError, undefined);
    assert.equal(prepared.structuredContent.triangleRequestCount, 2);
    assert.match(prepared.content[0].text, /2 demandes explicites de triangle sont présentes/u);
    assert.match(
      prepared.content[0].text,
      /activez Prolongements, Diagonales format, Angles jonction, Triangles/u,
    );
    assert.match(
      prepared.content[0].text,
      /les familles dérivées .* restent indisponibles : elles exigent exactement une demande explicite de triangle/u,
    );
    assert.doesNotMatch(prepared.content[0].text, /et enfin la famille dérivée souhaitée/u);
    assert.match(prepared.content[0].text, /Le Core n’a pas été lancé/u);
  } finally {
    await connected.close();
  }
});

test("MCP resolves only an explicit parented triangle after opt-in confirmation", async () => {
  let sequence = 0;
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-15T12:00:00.000Z"),
    createSessionId: () => `session:triangle-${String(++sequence)}`,
  }));
  try {
    const candidateValues = mixedPrimitiveCandidates();
    const triangleConstructionRequests = explicitTriangleConstructionRequests();
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/triangle-construction",
          file_id: "file-triangle-construction",
          mime_type: "image/png",
        },
        candidates: candidateValues,
        triangleConstructionRequests,
      },
    });

    assert.equal(prepared.isError, undefined);
    assert.equal(prepared.structuredContent.coreRun, false);
    assert.equal(prepared.structuredContent.triangleRequestCount, 1);
    assert.equal(prepared._meta.normaPersonalVisualHarmony.prepared.triangleRequestCount, 1);
    assert.match(prepared.content[0].text, /Une demande explicite de triangle est présente/u);
    assert.match(
      prepared.content[0].text,
      /conservez les guides parents sélectionnés, puis activez Prolongements, Diagonales format, Angles jonction, Triangles, et enfin la famille dérivée souhaitée/u,
    );
    assert.match(
      prepared.content[0].text,
      /ne signifie pas que ces constructions sont déjà affichées ou mesurées/u,
    );
    const canonicalTriangleRequests = prepared.structuredContent.triangleConstructionRequests;
    assert.equal(canonicalTriangleRequests.length, 1);
    assert.equal(canonicalTriangleRequests[0].vertices.length, 3);
    assert.deepEqual(
      prepared._meta.normaPersonalVisualHarmony.prepared.triangleConstructionRequests,
      canonicalTriangleRequests,
    );
    assert.doesNotMatch(
      prepared._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-triangle-construction-id=/u,
    );

    const missingParent = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/triangle-construction-stale",
          file_id: "file-triangle-construction-stale",
          mime_type: "image/png",
        },
        candidates: candidateValues,
        triangleConstructionRequests: [{
          ...triangleConstructionRequests[0],
          vertices: triangleConstructionRequests[0].vertices.map((vertex, index) => index === 0
            ? {
              ...vertex,
              parent: {
                kind: "observed-line-endpoint",
                candidateId: "missing-observed-line",
                endpoint: "start",
              },
            }
            : vertex),
        }],
      },
    });
    assert.equal(missingParent.isError, true);

    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    const unconfirmedParent = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: [],
        constructionLayers: [
          "support-line-extensions",
          "format-diagonals",
          "junction-angles",
          "triangles",
          "triangle-medians",
          "triangle-angle-bisectors",
          "triangle-altitudes",
          "triangle-centroids",
        ],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: {
          ...recoveryInput("file-triangle-construction", candidateValues),
          triangleConstructionRequests: canonicalTriangleRequests,
        },
      },
    });
    assert.equal(unconfirmedParent.isError, true);
    assert.match(
      unconfirmedParent.content[0].text,
      /parents must remain explicitly confirmed visual guides/u,
    );

    const missingConstructionDependency = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["diagonal"],
        constructionLayers: [
          "support-line-extensions",
          "junction-angles",
          "triangles",
        ],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: {
          ...recoveryInput("file-triangle-construction", candidateValues),
          triangleConstructionRequests: canonicalTriangleRequests,
        },
      },
    });
    assert.equal(missingConstructionDependency.isError, true);
    assert.match(
      missingConstructionDependency.content[0].text,
      /format-diagonal parents require the format-diagonal layer/u,
    );

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["diagonal"],
        constructionLayers: [
          "support-line-extensions",
          "format-diagonals",
          "junction-angles",
          "triangles",
          "triangle-medians",
          "triangle-angle-bisectors",
          "triangle-altitudes",
          "triangle-centroids",
        ],
        sourcePixelWidth: 1_000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: {
          ...recoveryInput("file-triangle-construction", candidateValues),
          triangleConstructionRequests: canonicalTriangleRequests,
        },
      },
    });

    assert.equal(confirmed.isError, undefined);
    assert.equal(confirmed.structuredContent.coreRun, true);
    assert.deepEqual(confirmed.structuredContent.coreAnalyzedCandidateIds, ["major", "minor"]);
    const constructions = confirmed.structuredContent.imagePlaneGuideAnalysis.constructionAnalysis;
    assert.deepEqual(constructions.enabledLayers, [
      "support-line-extensions",
      "format-diagonals",
      "junction-angles",
      "triangles",
      "triangle-medians",
      "triangle-angle-bisectors",
      "triangle-altitudes",
      "triangle-centroids",
    ]);
    assert.equal(constructions.triangles.length, 1);
    const triangle = constructions.triangles[0];
    assert.equal(triangle.requestId, "explicit-oblique-triangle");
    assert.equal(triangle.provenance, "derived-construction");
    assert.equal(triangle.derivation, "three_explicit_parented_vertices");
    assert.equal(triangle.sourceTruth, false);
    assert.equal(triangle.coreAuthority, false);
    assert.equal(constructions.triangleMedians.length, 3);
    assert.deepEqual(
      constructions.triangleMedians.map(({ vertexIndex }) => vertexIndex),
      [0, 1, 2],
    );
    assert.ok(constructions.triangleMedians.every((median) => (
      median.triangleId === triangle.triangleId
      && median.provenance === "derived-construction"
      && median.sourceTruth === false
      && median.coreAuthority === false
      && !("centroid" in median)
    )));
    assert.equal(constructions.triangleAngleBisectors.length, 3);
    assert.deepEqual(
      constructions.triangleAngleBisectors.map(({ vertexIndex }) => vertexIndex),
      [0, 1, 2],
    );
    assert.ok(constructions.triangleAngleBisectors.every((bisector) => (
      bisector.triangleId === triangle.triangleId
      && bisector.provenance === "derived-construction"
      && bisector.sourceTruth === false
      && bisector.coreAuthority === false
      && !("incenter" in bisector)
    )));
    assert.equal(constructions.triangleAltitudes.length, 3);
    assert.deepEqual(
      constructions.triangleAltitudes.map(({ vertexIndex }) => vertexIndex),
      [0, 1, 2],
    );
    assert.ok(constructions.triangleAltitudes.every((altitude) => (
      altitude.triangleId === triangle.triangleId
      && altitude.provenance === "derived-construction"
      && altitude.sourceTruth === false
      && altitude.coreAuthority === false
      && !("orthocenter" in altitude)
    )));
    assert.equal(constructions.triangleCentroids.length, 1);
    assert.equal(constructions.triangleCentroids[0].triangleId, triangle.triangleId);
    assert.equal(constructions.triangleCentroids[0].kind, "triangle-centroid");
    assert.equal(constructions.triangleCentroids[0].provenance, "derived-construction");
    assert.equal(constructions.triangleCentroids[0].sourceTruth, false);
    assert.equal(constructions.triangleCentroids[0].coreAuthority, false);
    assert.equal(constructions.triangleCentroids[0].candidateEvidenceOnly, true);
    assert.equal(constructions.coreRun, false);
    assert.match(triangle.triangleId, /^construction:triangle:[0-9a-f]{64}$/u);
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-construction-layer="triangles"/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-triangle-construction-id=/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-construction-layer="triangle-medians"/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-triangle-median-id=/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-construction-layer="triangle-angle-bisectors"/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-construction-layer="triangle-altitudes"/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-triangle-altitude-id=/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-construction-layer="triangle-centroids"/u,
    );
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-triangle-centroid-id=/u,
    );
    assert.match(confirmed.content[0].text, /3 bissectrice\(s\)/u);
    assert.match(confirmed.content[0].text, /3 hauteur\(s\)/u);
    assert.match(
      confirmed._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-parent-provenance="derived-junction-intersection"/u,
    );
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /fill="#facc15"/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, />T1\.J\d</u);
  } finally {
    await connected.close();
  }
});

test("MCP preserves a reviewed quadrilateral as four editable vertices and returns its image-plane measurements outside Core", async () => {
  const connected = await createConnectedClient();
  try {
    const candidateValues = quadrilateralCandidates();
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
        },
        candidates: candidateValues,
      },
    });
    assert.equal(prepared.isError, undefined);
    const quadrilateral = prepared.structuredContent.candidates.find(({ id }) => (
      id === "right-trapezoid"
    ));
    assert.equal(quadrilateral.primitive.kind, "quadrilateral");
    assert.equal(quadrilateral.primitive.vertices.length, 4);
    const quadrilateralGroup = prepared._meta.normaPersonalVisualHarmony.overlaySvg
      .match(/<g data-candidate-id="right-trapezoid"[\s\S]*?<\/g>/u)?.[0];
    assert.ok(quadrilateralGroup);
    assert.match(quadrilateralGroup, /<polygon data-candidate-shape/u);
    assert.equal([...quadrilateralGroup.matchAll(/data-vertex-handle=/gu)].length, 4);

    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    const swappedRatioPackRefs = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["right-trapezoid"],
        measurementRatioRequest: {
          requestId: "declared-ratio:swapped-pack-refs",
          measurements: [
            { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 0 },
            { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 2 },
          ],
          ratioPackRefs: [
            "norma.basic-proportions@0.1.0",
            "norma.geometry-harmonies@0.1.0",
          ],
          matchTolerance: 0.025,
        },
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(swappedRatioPackRefs.isError, true);

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["right-trapezoid"],
        measurementRatioRequest: {
          requestId: "declared-ratio:mcp",
          measurements: [
            { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 0 },
            { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 2 },
          ],
          ratioPackRefs: [
            "norma.geometry-harmonies@0.1.0",
            "norma.basic-proportions@0.1.0",
          ],
          matchTolerance: 0.025,
        },
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(confirmed.isError, undefined);
    assert.deepEqual(confirmed.structuredContent.coreAnalyzedCandidateIds, ["major", "minor"]);
    assert.deepEqual(confirmed.structuredContent.confirmedVisualGuideCandidateIds, [
      "right-trapezoid",
    ]);
    assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.relationships.length, 0);
    const measurement = confirmed.structuredContent.imagePlaneGuideAnalysis
      .quadrilateralMeasurements[0];
    assert.equal(measurement.classification, "trapezoid");
    assert.deepEqual(measurement.sideLengthsPixels, [
      600,
      608.276253029822,
      400,
      608.276253029822,
    ]);
    assert.equal(measurement.parallelAngleToleranceDegrees, 2);
    assert.equal(measurement.rightAngleToleranceDegrees, 2);
    assert.equal(measurement.areaImageShare, 0.3);
    assert.match(measurement.explanation, /plan image/u);
    const ratioReport = confirmed.structuredContent.declaredMeasurementRatioReport;
    assert.equal(ratioReport.observedDominantShare, 0.6);
    assert.equal(ratioReport.match.ratio.ratioId, "phi-major");
    assert.equal(ratioReport.candidateEvidenceOnly, true);
    assert.equal(ratioReport.sourceTruth, false);
    assert.equal(ratioReport.coreAuthority, false);
    assert.equal(ratioReport.noUnrequestedComparisons, true);
    const replay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["minor", "major"],
        confirmedVisualGuideCandidateIds: ["right-trapezoid"],
        measurementRatioRequest: {
          requestId: "declared-ratio:mcp",
          measurements: [
            { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 2 },
            { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 0 },
          ],
          ratioPackRefs: [
            "norma.geometry-harmonies@0.1.0",
            "norma.basic-proportions@0.1.0",
          ],
          matchTolerance: 0.025,
        },
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(replay.isError, undefined);
    assert.equal(
      replay.structuredContent.canonicalResultIdentity,
      confirmed.structuredContent.canonicalResultIdentity,
    );
    const propertyOrderReplay = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["right-trapezoid"],
        measurementRatioRequest: {
          requestId: "declared-ratio:mcp",
          measurements: [
            { candidateId: "right-trapezoid", sideIndex: 2, kind: "quadrilateral-side" },
            { sideIndex: 0, candidateId: "right-trapezoid", kind: "quadrilateral-side" },
          ],
          ratioPackRefs: [
            "norma.geometry-harmonies@0.1.0",
            "norma.basic-proportions@0.1.0",
          ],
          matchTolerance: 0.025,
        },
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidateValues),
      },
    });
    assert.equal(propertyOrderReplay.isError, undefined);
    assert.equal(
      propertyOrderReplay.structuredContent.canonicalResultIdentity,
      confirmed.structuredContent.canonicalResultIdentity,
    );
    assert.match(confirmed.content[0].text, /Mesures de quadrilatères dans le plan image/u);
    assert.match(confirmed.content[0].text, /ni des rapports harmoniques ni des mesures du monde réel/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-primitive-kind="quadrilateral"/u);
    assert.doesNotMatch(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-vertex-handle/u);
  } finally {
    await connected.close();
  }
});

test("prepare canonically derives ellipse bounds from its measured center and radii", async () => {
  let sequence = 0;
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => `session:ellipse-canonical-${String(++sequence)}`,
  }));
  try {
    const prepare = async (ellipseBounds) => connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
        },
        candidates: mixedPrimitiveCandidates().map((candidate) => candidate.id === "main-ellipse"
          ? { ...candidate, ...ellipseBounds }
          : candidate),
      },
    });

    const first = await prepare({ x: 0.24, y: 0.14, width: 0.51, height: 0.71 });
    const second = await prepare({ x: 0.26, y: 0.16, width: 0.49, height: 0.69 });
    const clippedCandidates = mixedPrimitiveCandidates().map((candidate) => (
      candidate.id === "main-ellipse"
        ? {
          ...candidate,
          primitive: {
            kind: "ellipse",
            center: { x: 0.08, y: 0.5 },
            radiusX: 0.3,
            radiusY: 0.2,
          },
        }
        : candidate
    ));
    const clippedPrepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
        },
        candidates: clippedCandidates,
      },
    });

    assert.equal(first.isError, undefined);
    assert.equal(second.isError, undefined);
    assert.equal(clippedPrepared.isError, undefined);
    const ellipse = first.structuredContent.candidates.find(({ id }) => id === "main-ellipse");
    assert.deepEqual(
      { x: ellipse.x, y: ellipse.y, width: ellipse.width, height: ellipse.height },
      { x: 0.25, y: 0.15, width: 0.5, height: 0.7 },
    );
    assert.equal(first.structuredContent.candidateSetIdentity, second.structuredContent.candidateSetIdentity);
    const clippedEllipse = clippedPrepared.structuredContent.candidates.find(({ id }) => (
      id === "main-ellipse"
    ));
    assert.deepEqual(
      { x: clippedEllipse.x, y: clippedEllipse.y, width: clippedEllipse.width, height: clippedEllipse.height },
      { x: 0, y: 0.3, width: 0.38, height: 0.4 },
    );

    const clippedMeta = clippedPrepared._meta.normaPersonalVisualHarmony;
    const clippedConfirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: clippedMeta.sessionId,
        candidateSetIdentity: clippedMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["main-ellipse"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", clippedCandidates),
      },
    });
    assert.equal(clippedConfirmed.isError, undefined);
    assert.deepEqual(
      clippedConfirmed.structuredContent.confirmedVisualGuideCandidateIds,
      ["main-ellipse"],
    );
  } finally {
    await connected.close();
  }
});

test("MCP canonicalizes, renders, and measures an explicitly rotated ellipse without changing Core authority", async () => {
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-15T12:00:00.000Z"),
    createSessionId: () => "session:rotated-ellipse",
  }));
  try {
    const candidates = mixedPrimitiveCandidates().map((candidate) => candidate.id === "main-ellipse"
      ? {
        ...candidate,
        primitive: {
          kind: "ellipse",
          center: { x: 0.5, y: 0.5 },
          radiusX: 0.05,
          radiusY: 0.7,
          rotationDegrees: -45,
        },
      }
      : candidate);
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
        },
        candidates,
      },
    });
    assert.equal(prepared.isError, undefined);
    const ellipse = prepared.structuredContent.candidates.find(({ id }) => id === "main-ellipse");
    assert.deepEqual(ellipse.primitive, {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.7,
      radiusY: 0.05,
      rotationDegrees: 45,
    });
    assert.match(prepared._meta.normaPersonalVisualHarmony.overlaySvg,
      /data-ellipse-orientation-degrees="45"/u);
    assert.match(prepared._meta.normaPersonalVisualHarmony.overlaySvg,
      /transform="rotate\(45 500 500\)"/u);

    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    const reviewedRotatedEllipse = structuredClone(ellipse.primitive);
    const unavailableRefinement = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        candidateId: "main-ellipse",
        reviewedPrimitive: reviewedRotatedEllipse,
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        recovery: recoveryInput("file-private-opaque-id", candidates),
      },
    });
    assert.equal(unavailableRefinement.isError, undefined, JSON.stringify(unavailableRefinement));
    assert.equal(unavailableRefinement.structuredContent.proposal.status, "abstained");
    assert.equal(unavailableRefinement.structuredContent.proposal.reason, "pixel_read_unavailable");
    assert.deepEqual(
      unavailableRefinement.structuredContent.proposal.originalGeometry,
      reviewedRotatedEllipse,
    );
    assert.equal(unavailableRefinement.structuredContent.proposal.proposalAdopted, false);
    assert.equal(unavailableRefinement.structuredContent.proposal.coreRun, false);

    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["central-axis", "main-ellipse"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 1000,
        confirmClientReviewedSelection: true,
        recovery: recoveryInput("file-private-opaque-id", candidates),
      },
    });
    assert.equal(confirmed.isError, undefined);
    assert.deepEqual(confirmed.structuredContent.coreAnalyzedCandidateIds, ["major", "minor"]);
    assert.deepEqual(confirmed.structuredContent.confirmedVisualGuideCandidateIds,
      ["central-axis", "main-ellipse"]);
    assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.limits.rotatedEllipseSupport,
      "explicit_normalized_image_plane_rotation");
    assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.relationships.length, 1);
    assert.equal(confirmed.structuredContent.imagePlaneGuideAnalysis.relationships[0].classification,
      "intersection");
  } finally {
    await connected.close();
  }
});

test("expired confirmation sessions are reconstructed from the exact hidden candidate set", async () => {
  let nowMs = Date.parse("2026-07-13T15:00:00.000Z");
  let sequence = 0;
  const connected = await createConnectedClient(new PersonalVisualHarmonySessionServiceV1({
    now: () => nowMs,
    createSessionId: () => `session:recovery-${String(++sequence)}`,
  }));
  try {
    const prepared = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/private-signed-image",
          file_id: "file-private-opaque-id",
          mime_type: "image/png",
        },
        candidates: candidates(),
      },
    });
    const widgetMeta = prepared._meta.normaPersonalVisualHarmony;
    nowMs += (30 * 60 * 1_000) + 1;
    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 618,
        confirmClientReviewedSelection: true,
        recovery: {
          ...recoveryInput(),
          sourceImageMediaType: null,
        },
      },
    });
    assert.equal(confirmed.isError, undefined);
    assert.equal(confirmed.structuredContent.status, "completed");
    assert.equal(confirmed._meta.normaPersonalVisualHarmony.sessionRecovered, true);
    assert.equal(confirmed._meta.normaPersonalVisualHarmony.sessionId, "session:recovery-2");
    assert.equal(confirmed.structuredContent.canonicalResultIdentity.length, 71);
  } finally {
    await connected.close();
  }
});

test("prepare rejects rectangles that pass scalar schema bounds but cross the image edge", async () => {
  const connected = await createConnectedClient();
  try {
    const response = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      arguments: {
        image: {
          download_url: "https://files.example.test/image",
          file_id: "file-id",
        },
        candidates: [{
          ...candidates()[0],
          x: 0.8,
          width: 0.4,
        }],
      },
    });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /normalized primitive bounds/u);
  } finally {
    await connected.close();
  }
});

test("STDIO entrypoint is disabled by default and initializes the personal app when explicitly enabled", async () => {
  const disabled = spawnSync(
    process.execPath,
    ["bin/norma-core-personal-visual-harmony-mcp-stdio.mjs"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(disabled.status, 2);
  assert.equal(disabled.stdout, "");
  assert.equal(disabled.stderr, "norma_personal_visual_harmony_mcp_disabled_by_default\n");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      "bin/norma-core-personal-visual-harmony-mcp-stdio.mjs",
      "--enable-personal-visual-harmony-demo",
    ],
    cwd: repoRoot,
    stderr: "pipe",
  });
  const client = new Client(
    { name: "norma-personal-visual-harmony-stdio-test", version: "1.0.0" },
    { capabilities: {} },
  );
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(({ name }) => name).sort(), [
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
      PERSONAL_VISUAL_HARMONY_REFINE_PIXELS_TOOL,
    ].sort());
    const resources = await client.listResources();
    assert.deepEqual(resources.resources.map(({ uri }) => uri), [PERSONAL_VISUAL_HARMONY_WIDGET_URI]);
  } finally {
    await client.close();
  }
});
