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
  PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
  PERSONAL_VISUAL_HARMONY_WIDGET_MIME_TYPE,
  PERSONAL_VISUAL_HARMONY_WIDGET_URI,
  PersonalVisualHarmonySessionServiceV1,
  runPersonalVisualHarmonyImageHydrationV1,
} from "../dist/src/mcp/personal-visual-harmony-app.js";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/u, "");
const GOLDEN_MAJOR = 0.6180339887498949;

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
  const presentation = createPersonalVisualHarmonyPresentationV1([
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
  ]);

  assert.equal(presentation.primaryPattern.kind, "complementary_pair");
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

async function createConnectedClient(service = new PersonalVisualHarmonySessionServiceV1({
    now: () => Date.parse("2026-07-13T15:00:00.000Z"),
    createSessionId: () => "session:test-personal-visual-harmony",
  })) {
  const server = createPersonalVisualHarmonyMcpServerV1({ service });
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

// This exact resource contract intentionally keeps its symmetric prepare/confirm assertions together.
// fallow-ignore-next-line complexity code-duplication
test("ChatGPT App MCP lists the exact tools, file schema, app-only confirmation, and widget resource", async () => {
  const connected = await createConnectedClient();
  try {
    const listed = await connected.client.listTools();
    assert.deepEqual(listed.tools.map(({ name }) => name).sort(), [
      PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      PERSONAL_VISUAL_HARMONY_PREPARE_TOOL,
    ].sort());

    const prepareTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_PREPARE_TOOL);
    const confirmTool = listed.tools.find(({ name }) => name === PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL);
    assert.ok(prepareTool);
    assert.ok(confirmTool);
    assert.deepEqual(prepareTool._meta["openai/fileParams"], ["image"]);
    assert.equal(prepareTool._meta.ui.resourceUri, PERSONAL_VISUAL_HARMONY_WIDGET_URI);
    assert.deepEqual(prepareTool._meta.ui.visibility, ["model", "app"]);
    assert.deepEqual(confirmTool._meta.ui.visibility, ["app"]);
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
    assert.equal(imagePlaneOutput.properties.limits.properties.axisAlignedEllipseOnly.const, true);
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
    assert.ok(quadrilateralInput);
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
    assert.match(resource.contents[0].text, /revalidateCompleted\(payload,completed\)/u);
    assert.match(resource.contents[0].text, /if\(completed&&!state\.confirming&&!state\.completed\)await revalidateCompleted\(payload,completed\)/u);
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
    assert.match(resource.contents[0].text, /recovery:\{fileId:payload\.fileId/u);
    assert.match(resource.contents[0].text, /sourceImageMediaType:payload\.sourceImageMediaType\?\?null/u);
    assert.match(resource.contents[0].text, /function findCompletedResult\(value,depth=0\)/u);
    assert.match(resource.contents[0].text, /value\.status==="completed"&&value\.coreRun===true&&isStoredIdentity\(value\.canonicalResultIdentity\)/u);
    assert.match(resource.contents[0].text, /completedPayload=hiddenPayload\|\|\{stage:"completed",result:structured,imagePlaneGuideAnalysis:structured\.imagePlaneGuideAnalysis,overlaySvg:""\}/u);
    assert.match(resource.contents[0].text, /syncOverlaySelection/u);
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
    assert.match(resource.contents[0].text, /imageLoadTask:null,imageLoadFileId:null/u);
    assert.match(resource.contents[0].text, /function imageLoadIsCurrent\(generation,fileId\)/u);
    assert.match(resource.contents[0].text, /if\(!imageLoadIsCurrent\(generation,fileId\)\)return/u);
    assert.match(resource.contents[0].text, /const imageLoaded=await loadImage\(payload\.fileId,\{force:forceImageReload\}\);if\(!imageLoaded\)return/u);
    assert.match(resource.contents[0].text, /if\(payload\.fileId&&!await loadImage\(payload\.fileId,\{force:forceImageReload\}\)\)return/u);
    assert.match(resource.contents[0].text, /function showImageFailure\(failure\)/u);
    assert.match(resource.contents[0].text, /Réessayer l’affichage/u);
    assert.match(resource.contents[0].text, /data-norma-image-hydration/u);
    assert.match(resource.contents[0].text, /if\(!force&&state\.imageLoadTask&&state\.imageLoadFileId===fileId\)return state\.imageLoadTask/u);
    assert.match(resource.contents[0].text, /getDownloadUrl:requestedFileId=>window\.openai\.getFileDownloadUrl\(\{fileId:requestedFileId\}\)/u);
    assert.match(resource.contents[0].text, /function decorateEditableOverlay\(\)/u);
    assert.match(resource.contents[0].text, /document\.createElementNS\("http:\/\/www\.w3\.org\/2000\/svg","rect"\)/u);
    assert.match(resource.contents[0].text, /async function prepareReviewedPayload\(payload,candidateSnapshot\)/u);
    assert.match(resource.contents[0].text, /callAppTool\(PREPARE_TOOL,\{image,candidates:candidateSnapshot\}\)/u);
    assert.match(resource.contents[0].text, /download_url:state\.downloadUrl/u);
    assert.doesNotMatch(resource.contents[0].text, /state\.proposalCandidateSetIdentity=fresh\.prepared\.candidateSetIdentity/u);
    assert.doesNotMatch(resource.contents[0].text, /state\.proposalCandidates=fresh\.prepared\.candidates\.map/u);
    assert.match(resource.contents[0].text, /candidateSetIdentity=state\.proposalCandidateSetIdentity\|\|state\.payload\.prepared\.candidateSetIdentity/u);
    assert.match(resource.contents[0].text, /function reviewedCandidateSnapshot\(\)\{return Object\.freeze/u);
    assert.match(resource.contents[0].text, /state\.confirming\|\|!state\.payload/u);
    assert.match(resource.contents[0].text, /function setReviewLocked\(locked\)/u);
    assert.match(resource.contents[0].text, /prepareReviewedPayload\(payloadSnapshot,candidateSnapshot\)/u);
    assert.match(resource.contents[0].text, /callConfirmation\(analysisPayload,selectedSnapshot,guideSnapshot,dimensionsSnapshot\)/u);
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
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-primitive-kind="axis"/u);
    assert.match(confirmed._meta.normaPersonalVisualHarmony.overlaySvg, /data-image-plane-relation-id=/u);
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
    const confirmed = await connected.client.callTool({
      name: PERSONAL_VISUAL_HARMONY_CONFIRM_TOOL,
      arguments: {
        sessionId: widgetMeta.sessionId,
        candidateSetIdentity: widgetMeta.prepared.candidateSetIdentity,
        selectedCandidateIds: ["major", "minor"],
        confirmedVisualGuideCandidateIds: ["right-trapezoid"],
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

    assert.equal(first.isError, undefined);
    assert.equal(second.isError, undefined);
    const ellipse = first.structuredContent.candidates.find(({ id }) => id === "main-ellipse");
    assert.deepEqual(
      { x: ellipse.x, y: ellipse.y, width: ellipse.width, height: ellipse.height },
      { x: 0.25, y: 0.15, width: 0.5, height: 0.7 },
    );
    assert.equal(first.structuredContent.candidateSetIdentity, second.structuredContent.candidateSetIdentity);
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
    ].sort());
    const resources = await client.listResources();
    assert.deepEqual(resources.resources.map(({ uri }) => uri), [PERSONAL_VISUAL_HARMONY_WIDGET_URI]);
  } finally {
    await client.close();
  }
});
