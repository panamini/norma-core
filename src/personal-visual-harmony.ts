import { createHash } from "node:crypto";
import {
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
  mapAcceptedGeometryToCoreV1,
} from "./accepted-geometry-to-core-mapping.js";
import {
  ACCEPTED_GEOMETRY_CONTRACT_ID,
  ACCEPTED_GEOMETRY_CONTRACT_VERSION,
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  type AcceptedGeometry,
  type RectanglePrimitive,
  validateAcceptedGeometryV1,
} from "./geometry-observation.js";
import {
  analyzeHarmonicRelationshipsV1,
  type HarmonicRelationshipAnalysisResultV1,
  type HarmonicRelationshipMetricV1,
  type HarmonicRelationshipQualityV1,
} from "./harmonic-relationship-analysis.js";
import {
  BASIC_PROPORTIONS_PACK,
  GEOMETRY_HARMONIES_PACK,
} from "./ratio-pack.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID =
  "norma.personal-visual-harmony-candidate-set@1" as const;
export const PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID =
  "norma.personal-visual-harmony-result@1" as const;
export const PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES = 12;

export type PersonalVisualHarmonyCandidateRoleV1 =
  | "primary-subject"
  | "secondary-subject"
  | "structural-region"
  | "frame";

export const PERSONAL_VISUAL_HARMONY_PRIMITIVE_KINDS = [
  "rectangle",
  "segment",
  "axis",
  "ellipse",
] as const;

export type PersonalVisualHarmonyPrimitiveKindV1 =
  typeof PERSONAL_VISUAL_HARMONY_PRIMITIVE_KINDS[number];

export interface PersonalVisualHarmonyPointV1 {
  readonly x: number;
  readonly y: number;
}

export type PersonalVisualHarmonyPrimitiveV1 =
  | { readonly kind: "rectangle" }
  | {
    readonly kind: "segment";
    readonly start: PersonalVisualHarmonyPointV1;
    readonly end: PersonalVisualHarmonyPointV1;
  }
  | {
    readonly kind: "axis";
    readonly start: PersonalVisualHarmonyPointV1;
    readonly end: PersonalVisualHarmonyPointV1;
  }
  | {
    readonly kind: "ellipse";
    readonly center: PersonalVisualHarmonyPointV1;
    readonly radiusX: number;
    readonly radiusY: number;
  };

export interface PersonalVisualHarmonyCandidateInputV1 {
  readonly id: string;
  readonly label: string;
  readonly role: PersonalVisualHarmonyCandidateRoleV1;
  readonly reason: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly primitive?: PersonalVisualHarmonyPrimitiveV1;
}

export interface PersonalVisualHarmonyPreparedCandidateSetV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "confirmation_required";
  readonly sourceImageReferenceIdentity: string;
  readonly sourceImageMediaType: string | null;
  readonly imageBytesObservedByNorma: false;
  readonly sourceImageIdentityBasis: "chatgpt_file_reference_not_image_bytes";
  readonly visualInterpretationSource: "chatgpt";
  readonly candidateEvidenceOnly: true;
  readonly explicitSelectionConfirmationRequired: true;
  readonly coreRun: false;
  readonly coordinateFrame: {
    readonly dimensions: 2;
    readonly coordinateScale: "normalized";
    readonly origin: "top-left";
    readonly xDirection: "right";
    readonly yDirection: "down";
    readonly bounds: { readonly x: readonly [0, 1]; readonly y: readonly [0, 1] };
  };
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly candidateSetIdentity: string;
}

export interface PersonalVisualHarmonyExplanationV1 {
  readonly relationshipId: string;
  readonly subjectCandidateId: string;
  readonly subjectLabel: string;
  readonly relatedCandidateIds: readonly string[];
  readonly metric: HarmonicRelationshipMetricV1;
  readonly quality: HarmonicRelationshipQualityV1;
  readonly ratioLabel: string;
  readonly ratioFamily: string | null;
  readonly observedPercent: number;
  readonly targetPercent: number;
  readonly deltaPercentagePoints: number;
  readonly explanation: string;
}

export interface PersonalVisualHarmonyResultV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "completed";
  readonly candidateSetIdentity: string;
  readonly confirmedSelectionIdentity: string;
  readonly sourceImageReferenceIdentity: string;
  readonly imageBytesObservedByNorma: false;
  readonly sourceImageDimensionsObservedBy: "chatgpt_widget";
  readonly selectedCandidateIds: readonly string[];
  readonly explicitSelectionConfirmation: true;
  readonly confirmationMode: "client_asserted_widget_interaction";
  readonly serverVerifiedHumanPresence: false;
  readonly acceptedStructuredGeometryCreated: true;
  readonly coreInputAuthority: "confirmed_structured_geometry";
  readonly coreRun: true;
  readonly mappedGeometryContentIdentity: string;
  readonly harmonicAnalysis: HarmonicRelationshipAnalysisResultV1;
  readonly explanations: readonly PersonalVisualHarmonyExplanationV1[];
  readonly headline: string;
  readonly limits: {
    readonly noBeautyClaims: true;
    readonly noIntentInference: true;
    readonly geometricMatchesWithinDeclaredToleranceOnly: true;
  };
  readonly contentIdentity: string;
}

export interface PersonalVisualHarmonyConfirmationV1 {
  readonly result: PersonalVisualHarmonyResultV1;
  readonly overlaySvg: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly mappingResultContentIdentity: string;
}

const CANDIDATE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MATCH_TOLERANCE = 0.025;

export function preparePersonalVisualHarmonyCandidateSetV1(input: {
  readonly sourceFileId: string;
  readonly sourceImageMediaType?: string | null;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
}): PersonalVisualHarmonyPreparedCandidateSetV1 {
  requireBoundedString(input.sourceFileId, "sourceFileId", 1, 2_048);
  const sourceImageMediaType = normalizeMediaType(input.sourceImageMediaType);
  const candidates = validateCandidates(input.candidates);
  const coordinateFrame = {
    dimensions: 2 as const,
    coordinateScale: "normalized" as const,
    origin: "top-left" as const,
    xDirection: "right" as const,
    yDirection: "down" as const,
    bounds: { x: [0, 1] as const, y: [0, 1] as const },
  };
  const sourceImageReferenceIdentity = contentIdentityFor({
    kind: "chatgpt-file-reference",
    fileId: input.sourceFileId,
  });
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "confirmation_required" as const,
    sourceImageReferenceIdentity,
    sourceImageMediaType,
    imageBytesObservedByNorma: false as const,
    sourceImageIdentityBasis: "chatgpt_file_reference_not_image_bytes" as const,
    visualInterpretationSource: "chatgpt" as const,
    candidateEvidenceOnly: true as const,
    explicitSelectionConfirmationRequired: true as const,
    coreRun: false as const,
    coordinateFrame,
    candidates,
  };
  return {
    ...withoutIdentity,
    candidateSetIdentity: contentIdentityFor(withoutIdentity),
  };
}

export function confirmPersonalVisualHarmonyCandidateSetV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV1;
  readonly expectedCandidateSetIdentity: string;
  readonly selectedCandidateIds: readonly string[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly acceptedAt: string;
}): PersonalVisualHarmonyConfirmationV1 {
  const prepared = validatePreparedCandidateSet(input.preparedCandidateSet);
  if (input.expectedCandidateSetIdentity !== prepared.candidateSetIdentity) {
    throw new Error("Candidate set identity does not match the prepared review.");
  }
  const selectedCandidateIds = normalizeSelectedCandidateIds(prepared, input.selectedCandidateIds);
  requirePositivePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePositivePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  if (!UTC_TIMESTAMP_PATTERN.test(input.acceptedAt)) {
    throw new Error("acceptedAt must be an explicit UTC RFC3339 timestamp.");
  }
  const selectionIdentity = contentIdentityFor({
    candidateSetIdentity: prepared.candidateSetIdentity,
    selectedCandidateIds,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
  });
  const acceptedGeometry = createAcceptedGeometry(
    prepared,
    selectedCandidateIds,
    selectionIdentity,
    input.sourcePixelWidth,
    input.sourcePixelHeight,
    input.acceptedAt,
  );
  const mapping = mapAcceptedGeometryToCoreV1({
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:personal-visual-harmony:map:${identityToken(selectionIdentity)}`,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry,
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    mappingContext: {
      boundary: "explicit-external-evidence-acceptance@1",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
  });
  if (!mapping.ok || mapping.status !== "mapped" || mapping.mappedGeometry === null
    || mapping.mappedGeometryContentIdentity === null) {
    throw new Error("Confirmed structured geometry could not be mapped into Norma Core.");
  }
  const harmonicAnalysis = analyzeHarmonicRelationshipsV1({
    composition: mapping.mappedGeometry,
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: MATCH_TOLERANCE,
  });
  const coreElementToCandidateId = createCoreElementToCandidateMap(mapping.primitiveMappings);
  const candidatesById = new Map(prepared.candidates.map((candidate) => [candidate.id, candidate]));
  const explanations = harmonicAnalysis.relationships.flatMap((relationship) => {
    const subjectCandidateId = coreElementToCandidateId.get(relationship.subjectElementId);
    if (subjectCandidateId === undefined) return [];
    const subject = candidatesById.get(subjectCandidateId);
    if (subject === undefined) return [];
    const relatedCandidateIds = relationship.relatedElementIds.flatMap((elementId) => {
      const candidateId = coreElementToCandidateId.get(elementId);
      return candidateId === undefined ? [] : [candidateId];
    });
    return [createExplanation(subject, relatedCandidateIds, relationship)];
  });
  const headline = headlineFor(explanations);
  const resultWithoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "completed" as const,
    candidateSetIdentity: prepared.candidateSetIdentity,
    confirmedSelectionIdentity: selectionIdentity,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    imageBytesObservedByNorma: false as const,
    sourceImageDimensionsObservedBy: "chatgpt_widget" as const,
    selectedCandidateIds,
    explicitSelectionConfirmation: true as const,
    confirmationMode: "client_asserted_widget_interaction" as const,
    serverVerifiedHumanPresence: false as const,
    acceptedStructuredGeometryCreated: true as const,
    coreInputAuthority: "confirmed_structured_geometry" as const,
    coreRun: true as const,
    mappedGeometryContentIdentity: mapping.mappedGeometryContentIdentity,
    harmonicAnalysis,
    explanations,
    headline,
    limits: {
      noBeautyClaims: true as const,
      noIntentInference: true as const,
      geometricMatchesWithinDeclaredToleranceOnly: true as const,
    },
  };
  const result: PersonalVisualHarmonyResultV1 = {
    ...resultWithoutIdentity,
    contentIdentity: contentIdentityFor(resultWithoutIdentity),
  };
  return {
    result,
    overlaySvg: createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared, result }),
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    mappingResultContentIdentity: mapping.resultContentIdentity,
  };
}

export function createPersonalVisualHarmonyOverlaySvgV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV1;
  readonly result?: PersonalVisualHarmonyResultV1;
  readonly selectedCandidateIds?: readonly string[];
}): string {
  const prepared = validatePreparedCandidateSet(input.preparedCandidateSet);
  const selectedIds = new Set(input.result?.selectedCandidateIds ?? input.selectedCandidateIds ?? []);
  const palette = ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#e11d48", "#eab308"];
  const guides = input.result?.harmonicAnalysis.relationships
    .filter((relationship) => relationship.guide !== null)
    .slice(0, 10) ?? [];
  const relationshipByCandidate = new Map<string, PersonalVisualHarmonyExplanationV1>();
  for (const explanation of input.result?.explanations ?? []) {
    if (!relationshipByCandidate.has(explanation.subjectCandidateId)) {
      relationshipByCandidate.set(explanation.subjectCandidateId, explanation);
    }
  }
  const candidateMarkup = prepared.candidates.map((candidateValue, index) => {
    const color = palette[index % palette.length] ?? "#f97316";
    const primitiveKind = primitiveKindFor(candidateValue);
    const x = candidateValue.x * 1000;
    const y = candidateValue.y * 1000;
    const width = candidateValue.width * 1000;
    const height = candidateValue.height * 1000;
    const selected = selectedIds.has(candidateValue.id);
    const explanation = relationshipByCandidate.get(candidateValue.id);
    const badge = explanation === undefined
      ? `${String(index + 1)} · ${candidateValue.label}`
      : `${explanation.ratioLabel} · ${formatPercent(explanation.observedPercent)}`;
    const badgeWidth = Math.min(360, Math.max(120, 22 + (badge.length * 8)));
    const editable = input.result === undefined && primitiveKind === "rectangle";
    const resizeHandle = editable
      ? `<rect data-resize-handle x="${numberAttr(x + width - 16)}" y="${numberAttr(y + height - 16)}" width="32" height="32" rx="8" fill="#f8fafc" stroke="#0f172a" stroke-width="5"/>`
      : "";
    return [
      `<g data-candidate-id="${escapeXml(candidateValue.id)}" data-primitive-kind="${primitiveKind}"${editable ? ` tabindex="0" role="group" aria-label="Ajuster ${escapeXml(candidateValue.label)}"` : ` role="img" aria-label="${escapeXml(candidateValue.label)} · guide ${primitiveKind}"`} >`,
      visualPrimitiveMarkup(candidateValue, color, selected),
      `<rect data-candidate-badge pointer-events="none" x="${numberAttr(x + 8)}" y="${numberAttr(y + 8)}" width="${numberAttr(badgeWidth)}" height="38" rx="12" fill="#0f172a" fill-opacity="0.88"/>`,
      `<text data-candidate-label pointer-events="none" x="${numberAttr(x + 22)}" y="${numberAttr(y + 34)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(badge)}</text>`,
      resizeHandle,
      "</g>",
    ].join("");
  }).join("");
  const guideMarkup = guides.map((relationship) => {
    const guide = relationship.guide;
    if (guide === null) return "";
    const position = guide.position * 1000;
    const line = guide.axis === "x"
      ? `<line x1="${numberAttr(position)}" y1="0" x2="${numberAttr(position)}" y2="1000"/>`
      : `<line x1="0" y1="${numberAttr(1000 - position)}" x2="1000" y2="${numberAttr(1000 - position)}"/>`;
    return `<g pointer-events="none" stroke="#f8fafc" stroke-width="4" stroke-dasharray="18 12" stroke-opacity="0.92">${line}</g>`;
  }).join("");
  const phaseLabel = input.result === undefined
    ? "CANDIDATS VISUELS · CONFIRMATION REQUISE"
    : `NORMA CORE · ${String(input.result.explanations.length)} RELATION${input.result.explanations.length === 1 ? "" : "S"} DÉTECTÉE${input.result.explanations.length === 1 ? "" : "S"}`;
  return [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Norma visual harmony overlay\">",
    guideMarkup,
    candidateMarkup,
    "<g pointer-events=\"none\"><rect x=\"20\" y=\"930\" width=\"640\" height=\"50\" rx=\"16\" fill=\"#020617\" fill-opacity=\"0.88\"/>",
    `<text x="42" y="963" font-family="ui-sans-serif, system-ui, sans-serif" font-size="21" font-weight="800" letter-spacing="1.5" fill="#f8fafc">${escapeXml(phaseLabel)}</text></g>`,
    "</svg>",
  ].join("");
}

function createAcceptedGeometry(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  selectedCandidateIds: readonly string[],
  selectionIdentity: string,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
  acceptedAt: string,
): AcceptedGeometry {
  const candidatesById = new Map(prepared.candidates.map((candidateValue) => [candidateValue.id, candidateValue]));
  const selectedCandidates = selectedCandidateIds.map((candidateId) => {
    const match = candidatesById.get(candidateId);
    if (match === undefined) throw new Error("Selected candidate does not exist in the prepared review.");
    return match;
  });
  const selectionToken = identityToken(selectionIdentity);
  const sourceObservationContentIdentity = contentIdentityFor({
    candidateSetIdentity: prepared.candidateSetIdentity,
    sourcePixelWidth,
    sourcePixelHeight,
    dimensionsObservedBy: "chatgpt-widget",
  });
  const sourceObservationId = `observation:chatgpt-visual:${identityToken(prepared.candidateSetIdentity)}`;
  const provenance = (provenanceId: string, inputContentIdentity: string) => ({
    provenanceId,
    actorType: "system" as const,
    actorId: "chatgpt-widget-client",
    operationId: "personal-visual-harmony-widget-confirmation",
    operationVersion: "1",
    inputContentIdentity,
    createdAt: acceptedAt,
    notes: "ChatGPT visual candidates confirmed by a client-asserted widget interaction; server-side human presence was not attested and Norma did not inspect the image bytes.",
  });
  const primitiveIds = selectedCandidates.map((candidateValue) => `accepted:${candidateValue.id}`);
  const accepted: AcceptedGeometry = {
    contractId: ACCEPTED_GEOMETRY_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_CONTRACT_VERSION,
    acceptedGeometryId: `accepted-geometry:personal-visual-harmony:${selectionToken}`,
    sourceObservationId,
    sourceObservationContentIdentity,
    acceptedRevision: 1,
    coordinateFrame: {
      ...structuredClone(prepared.coordinateFrame),
      sourcePixelWidth,
      sourcePixelHeight,
    },
    primitives: selectedCandidates.map((candidateValue, index): RectanglePrimitive => ({
      id: primitiveIds[index] ?? `accepted:${candidateValue.id}`,
      kind: "rectangle",
      confidence: null,
      x: candidateValue.x,
      y: candidateValue.y,
      width: candidateValue.width,
      height: candidateValue.height,
    })),
    correctionHistory: [],
    acceptance: {
      acceptanceId: `acceptance:personal-visual-harmony:${selectionToken}`,
      accepted: true,
      actorType: "system",
      actorId: "chatgpt-widget-client",
      acceptedAt,
      sourceObservationId,
      sourceObservationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "",
      acceptedPrimitiveIds: primitiveIds,
      provenance: provenance(`acceptance:personal-visual-harmony:${selectionToken}`, selectionIdentity),
    },
    provenance: provenance(`accepted-geometry:personal-visual-harmony:${selectionToken}`, prepared.candidateSetIdentity),
    contentIdentity: "",
  };
  const revisionIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  const completed: AcceptedGeometry = {
    ...accepted,
    acceptance: { ...accepted.acceptance, acceptedContentIdentity: revisionIdentity },
  };
  const withIdentity: AcceptedGeometry = {
    ...completed,
    contentIdentity: computeAcceptedGeometryContentIdentity(completed),
  };
  const validation = validateAcceptedGeometryV1(withIdentity);
  if (!validation.ok) {
    throw new Error("Explicitly confirmed candidates did not produce valid AcceptedGeometry.");
  }
  return withIdentity;
}

function createCoreElementToCandidateMap(
  primitiveMappings: readonly { readonly acceptedPrimitiveId: string; readonly coreObjectId: string }[],
): ReadonlyMap<string, string> {
  return new Map(primitiveMappings.map((mapping) => [
    mapping.coreObjectId,
    mapping.acceptedPrimitiveId.replace(/^accepted:/u, ""),
  ]));
}

function createExplanation(
  subject: PersonalVisualHarmonyCandidateInputV1,
  relatedCandidateIds: readonly string[],
  relationship: HarmonicRelationshipAnalysisResultV1["relationships"][number],
): PersonalVisualHarmonyExplanationV1 {
  const observedPercent = percentage(relationship.observedValue);
  const targetPercent = percentage(relationship.ratio.targetValue);
  const deltaPercentagePoints = percentage(relationship.absoluteDelta);
  return {
    relationshipId: relationship.relationshipId,
    subjectCandidateId: subject.id,
    subjectLabel: subject.label,
    relatedCandidateIds,
    metric: relationship.metric,
    quality: relationship.quality,
    ratioLabel: relationship.ratio.displayLabel,
    ratioFamily: relationship.ratio.familyRef,
    observedPercent,
    targetPercent,
    deltaPercentagePoints,
    explanation: `${subject.label}: ${metricLabel(relationship.metric)} = ${formatPercent(observedPercent)}, proche de ${relationship.ratio.displayLabel} (${formatPercent(targetPercent)}), écart ${formatNumber(deltaPercentagePoints)} point${deltaPercentagePoints === 1 ? "" : "s"}.`,
  };
}

function headlineFor(explanations: readonly PersonalVisualHarmonyExplanationV1[]): string {
  if (explanations.length === 0) {
    return "Aucun rapport déclaré n’est assez proche dans la tolérance de 2,5 points.";
  }
  const best = explanations[0];
  if (best === undefined) return "Analyse harmonique déterministe terminée.";
  return `${String(explanations.length)} rapport${explanations.length === 1 ? "" : "s"} géométrique${explanations.length === 1 ? "" : "s"} détecté${explanations.length === 1 ? "" : "s"}; correspondance la plus proche : ${best.ratioLabel} sur « ${best.subjectLabel} ».`;
}

function metricLabel(metric: HarmonicRelationshipMetricV1): string {
  const labels: Record<HarmonicRelationshipMetricV1, string> = {
    "horizontal-split-share": "part du découpage horizontal",
    "vertical-split-share": "part du découpage vertical",
    "width-share": "largeur / image",
    "height-share": "hauteur / image",
    "left-edge-position": "position du bord gauche",
    "right-edge-position": "position du bord droit",
    "bottom-edge-position": "position du bord bas",
    "top-edge-position": "position du bord haut",
    "area-share": "surface / image",
  };
  return labels[metric];
}

function validatePreparedCandidateSet(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
): PersonalVisualHarmonyPreparedCandidateSetV1 {
  if (prepared.contractId !== PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID
    || prepared.contractVersion !== 1
    || prepared.status !== "confirmation_required"
    || prepared.imageBytesObservedByNorma !== false
    || prepared.candidateEvidenceOnly !== true
    || prepared.explicitSelectionConfirmationRequired !== true
    || prepared.coreRun !== false
    || !SHA256_PATTERN.test(prepared.sourceImageReferenceIdentity)
    || !SHA256_PATTERN.test(prepared.candidateSetIdentity)) {
    throw new Error("Prepared visual harmony candidate set is invalid.");
  }
  const candidates = validateCandidates(prepared.candidates);
  const expected = prepareCandidateIdentityProjection(prepared, candidates);
  if (contentIdentityFor(expected) !== prepared.candidateSetIdentity) {
    throw new Error("Prepared visual harmony candidate set identity is invalid.");
  }
  return structuredClone(prepared);
}

function prepareCandidateIdentityProjection(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
) {
  return {
    contractId: prepared.contractId,
    contractVersion: prepared.contractVersion,
    status: prepared.status,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    sourceImageMediaType: prepared.sourceImageMediaType,
    imageBytesObservedByNorma: prepared.imageBytesObservedByNorma,
    sourceImageIdentityBasis: prepared.sourceImageIdentityBasis,
    visualInterpretationSource: prepared.visualInterpretationSource,
    candidateEvidenceOnly: prepared.candidateEvidenceOnly,
    explicitSelectionConfirmationRequired: prepared.explicitSelectionConfirmationRequired,
    coreRun: prepared.coreRun,
    coordinateFrame: prepared.coordinateFrame,
    candidates,
  };
}

function validateCandidates(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
): readonly PersonalVisualHarmonyCandidateInputV1[] {
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES) {
    throw new Error(`Visual harmony requires 1 to ${String(PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES)} candidates.`);
  }
  const ids = new Set<string>();
  return candidates.map((candidateValue, index) => {
    if (candidateValue === null || typeof candidateValue !== "object") {
      throw new Error(`Visual harmony candidate ${String(index)} must be an object.`);
    }
    const candidateRecord = candidateValue as unknown as Record<string, unknown>;
    const expectedKeys = ["height", "id", "label", "reason", "role", "width", "x", "y"];
    const candidateKeys = Object.keys(candidateRecord).sort();
    const legacyKeys = expectedKeys.join("|");
    const primitiveKeys = [...expectedKeys, "primitive"].sort().join("|");
    if (candidateKeys.join("|") !== legacyKeys && candidateKeys.join("|") !== primitiveKeys) {
      throw new Error(`Visual harmony candidate ${String(index)} must use exact fields.`);
    }
    if (typeof candidateValue.id !== "string" || !CANDIDATE_ID_PATTERN.test(candidateValue.id) || ids.has(candidateValue.id)) {
      throw new Error(`Visual harmony candidate ${String(index)} requires a unique safe id.`);
    }
    ids.add(candidateValue.id);
    requireBoundedString(candidateValue.label, `candidates.${String(index)}.label`, 1, 80);
    requireBoundedString(candidateValue.reason, `candidates.${String(index)}.reason`, 1, 240);
    if (!["primary-subject", "secondary-subject", "structural-region", "frame"].includes(candidateValue.role)) {
      throw new Error(`Visual harmony candidate ${String(index)} has an unsupported role.`);
    }
    for (const [field, value] of Object.entries({
      x: candidateValue.x,
      y: candidateValue.y,
      width: candidateValue.width,
      height: candidateValue.height,
    })) {
      if (!Number.isFinite(value)) throw new Error(`Visual harmony candidate ${String(index)} ${field} must be finite.`);
    }
    if (candidateValue.x < 0 || candidateValue.y < 0 || candidateValue.width < 0 || candidateValue.height < 0
      || candidateValue.x + candidateValue.width > 1 || candidateValue.y + candidateValue.height > 1) {
      throw new Error(`Visual harmony candidate ${String(index)} must have normalized primitive bounds inside the image.`);
    }
    const primitive = validateCandidatePrimitive(candidateValue.primitive, candidateValue, index);
    return {
      id: candidateValue.id,
      label: candidateValue.label,
      role: candidateValue.role,
      reason: candidateValue.reason,
      x: canonicalNumber(candidateValue.x),
      y: canonicalNumber(candidateValue.y),
      width: canonicalNumber(candidateValue.width),
      height: canonicalNumber(candidateValue.height),
      ...(primitive === undefined ? {} : { primitive }),
    };
  });
}

function validateCandidatePrimitive(
  value: PersonalVisualHarmonyPrimitiveV1 | undefined,
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  candidateIndex: number,
): PersonalVisualHarmonyPrimitiveV1 | undefined {
  if (value === undefined) {
    requirePositiveRectangleBounds(bounds, candidateIndex);
    return undefined;
  }
  if (value === null || typeof value !== "object" || !PERSONAL_VISUAL_HARMONY_PRIMITIVE_KINDS.includes(value.kind)) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} has an unsupported primitive.`);
  }
  if (value.kind === "rectangle") {
    if (Object.keys(value).sort().join("|") !== "kind") {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} rectangle primitive must use exact fields.`);
    }
    requirePositiveRectangleBounds(bounds, candidateIndex);
    return { kind: "rectangle" };
  }
  if (value.kind === "segment" || value.kind === "axis") {
    if (Object.keys(value).sort().join("|") !== "end|kind|start") {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} line primitive must use exact fields.`);
    }
    const start = validatePrimitivePoint(value.start, `candidates.${String(candidateIndex)}.primitive.start`);
    const end = validatePrimitivePoint(value.end, `candidates.${String(candidateIndex)}.primitive.end`);
    if (start.x === end.x && start.y === end.y) {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} line primitive requires distinct endpoints.`);
    }
    requireLineEnvelope(bounds, start, end, candidateIndex);
    return { kind: value.kind, start, end };
  }
  if (Object.keys(value).sort().join("|") !== "center|kind|radiusX|radiusY") {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse primitive must use exact fields.`);
  }
  const center = validatePrimitivePoint(value.center, `candidates.${String(candidateIndex)}.primitive.center`);
  if (!Number.isFinite(value.radiusX) || !Number.isFinite(value.radiusY)
    || value.radiusX <= 0 || value.radiusY <= 0
    || center.x - value.radiusX < 0 || center.x + value.radiusX > 1
    || center.y - value.radiusY < 0 || center.y + value.radiusY > 1) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse must be positive and remain inside the image.`);
  }
  const tolerance = 0.000001;
  if (Math.abs(bounds.x - (center.x - value.radiusX)) > tolerance
    || Math.abs(bounds.y - (center.y - value.radiusY)) > tolerance
    || Math.abs(bounds.width - (value.radiusX * 2)) > tolerance
    || Math.abs(bounds.height - (value.radiusY * 2)) > tolerance) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse bounds must match its visible contour.`);
  }
  return {
    kind: "ellipse",
    center,
    radiusX: canonicalNumber(value.radiusX),
    radiusY: canonicalNumber(value.radiusY),
  };
}

function validatePrimitivePoint(value: unknown, field: string): PersonalVisualHarmonyPointV1 {
  if (value === null || typeof value !== "object"
    || Object.keys(value).sort().join("|") !== "x|y") {
    throw new Error(`${field} must use exact x and y fields.`);
  }
  const point = value as Record<string, unknown>;
  if (typeof point.x !== "number" || typeof point.y !== "number"
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    throw new Error(`${field} must be a normalized point inside the image.`);
  }
  return { x: canonicalNumber(point.x), y: canonicalNumber(point.y) };
}

function requirePositiveRectangleBounds(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  candidateIndex: number,
): void {
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} rectangle must have positive normalized bounds.`);
  }
}

function requireLineEnvelope(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  start: PersonalVisualHarmonyPointV1,
  end: PersonalVisualHarmonyPointV1,
  candidateIndex: number,
): void {
  const tolerance = 0.000001;
  if (Math.abs(bounds.x - Math.min(start.x, end.x)) > tolerance
    || Math.abs(bounds.y - Math.min(start.y, end.y)) > tolerance
    || Math.abs(bounds.width - Math.abs(end.x - start.x)) > tolerance
    || Math.abs(bounds.height - Math.abs(end.y - start.y)) > tolerance) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} line bounds must match its endpoints.`);
  }
}

function normalizeSelectedCandidateIds(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  selectedCandidateIds: readonly string[],
): readonly string[] {
  if (!Array.isArray(selectedCandidateIds) || selectedCandidateIds.length === 0) {
    throw new Error("Explicit human confirmation requires at least one selected candidate.");
  }
  const selected = new Set<string>();
  for (const candidateId of selectedCandidateIds) {
    if (typeof candidateId !== "string" || !CANDIDATE_ID_PATTERN.test(candidateId) || selected.has(candidateId)) {
      throw new Error("Selected candidate ids must be unique prepared candidate ids.");
    }
    selected.add(candidateId);
  }
  const ordered = prepared.candidates.filter((candidateValue) => selected.has(candidateValue.id)).map(({ id }) => id);
  if (ordered.length !== selected.size) {
    throw new Error("Selected candidate id does not exist in the prepared review.");
  }
  const nonRectangleSelection = prepared.candidates.find((candidateValue) => (
    selected.has(candidateValue.id) && primitiveKindFor(candidateValue) !== "rectangle"
  ));
  if (nonRectangleSelection !== undefined) {
    throw new Error("Visual guides cannot enter Norma Core until a compatible deterministic mapping exists.");
  }
  return ordered;
}

function normalizeMediaType(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.length === 0) return null;
  requireBoundedString(value, "sourceImageMediaType", 1, 128);
  if (!/^image\/[A-Za-z0-9.+-]+$/u.test(value)) {
    throw new Error("sourceImageMediaType must be an image media type when supplied.");
  }
  return value.toLowerCase();
}

function requireBoundedString(value: unknown, field: string, min: number, max: number): asserts value is string {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${field} must be a bounded printable string.`);
  }
}

function requirePositivePixelDimension(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    throw new Error(`${field} must be a positive image dimension.`);
  }
}

function percentage(value: number): number {
  return Number((value * 100).toFixed(3));
}

function formatPercent(value: number): string {
  return `${formatNumber(value)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : Number(value.toFixed(12));
}

function primitiveKindFor(
  candidate: PersonalVisualHarmonyCandidateInputV1,
): PersonalVisualHarmonyPrimitiveKindV1 {
  return candidate.primitive?.kind ?? "rectangle";
}

function visualPrimitiveMarkup(
  candidate: PersonalVisualHarmonyCandidateInputV1,
  color: string,
  selected: boolean,
): string {
  const primitive = candidate.primitive;
  const strokeWidth = selected ? "7" : "4";
  if (primitive?.kind === "segment" || primitive?.kind === "axis") {
    const dash = primitive.kind === "axis" ? "20 12" : (selected ? "none" : "14 10");
    return `<line data-candidate-shape x1="${numberAttr(primitive.start.x * 1000)}" y1="${numberAttr(primitive.start.y * 1000)}" x2="${numberAttr(primitive.end.x * 1000)}" y2="${numberAttr(primitive.end.y * 1000)}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;
  }
  if (primitive?.kind === "ellipse") {
    return `<ellipse data-candidate-shape cx="${numberAttr(primitive.center.x * 1000)}" cy="${numberAttr(primitive.center.y * 1000)}" rx="${numberAttr(primitive.radiusX * 1000)}" ry="${numberAttr(primitive.radiusY * 1000)}" fill="${color}" fill-opacity="${selected ? "0.12" : "0.05"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${selected ? "none" : "14 10"}"/>`;
  }
  return `<rect data-candidate-box data-candidate-shape x="${numberAttr(candidate.x * 1000)}" y="${numberAttr(candidate.y * 1000)}" width="${numberAttr(candidate.width * 1000)}" height="${numberAttr(candidate.height * 1000)}" rx="10" fill="${color}" fill-opacity="${selected ? "0.16" : "0.08"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${selected ? "none" : "14 10"}"/>`;
}

function numberAttr(value: number): string {
  return canonicalNumber(value).toString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function identityToken(identity: string): string {
  if (!SHA256_PATTERN.test(identity)) throw new Error("Identity must be a SHA-256 content identity.");
  return identity.slice("sha256:".length);
}
