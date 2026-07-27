import { createHash } from "node:crypto";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";
import type {
  PersonalVisualHarmonyCandidateInputV1,
  PersonalVisualHarmonyCandidateRoleV1,
  PersonalVisualHarmonyPointV1,
} from "./personal-visual-harmony.js";
import {
  PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS,
} from "./personal-visual-harmony-constructions.js";
import type {
  PersonalVisualHarmonyTriangleRequestInputV1,
} from "./personal-visual-harmony-constructions.js";

export const PERSONAL_VISUAL_HARMONY_MANUAL_PERCEPTION_CONTRACT_ID =
  "norma.personal-visual-harmony-manual-perception@1" as const;
export const PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID =
  "norma.personal-visual-harmony-segmentation-mask@1" as const;
export const PERSONAL_VISUAL_HARMONY_MAX_MASK_PIXELS = 262_144;
export const PERSONAL_VISUAL_HARMONY_MAX_MASK_RUNS = 65_536;
export const PERSONAL_VISUAL_HARMONY_MAX_PROMPT_POINTS = 16;
export const PERSONAL_VISUAL_HARMONY_MAX_CONTOUR_POINTS = 128;
const MAX_BOUNDARY_ANALYSIS_POINTS = 8_192;

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const PERSONAL_VISUAL_HARMONY_MERGED_CANDIDATE_LIMIT = 12;
const MIN_ACTIVE_PIXELS = 4;
const ELONGATED_AXIS_RATIO = 5;
const ELLIPSE_MAX_MEAN_BOUNDARY_RESIDUAL = 0.28;
const HULL_SIMPLIFICATION_TOLERANCE_PIXELS = 0.5;
const ELLIPSE_MIN_CENTRAL_SYMMETRY_RATIO = 0.9;

export interface PersonalVisualHarmonyMaskRunV1 {
  readonly y: number;
  readonly startX: number;
  readonly endXExclusive: number;
}

export interface PersonalVisualHarmonySegmentationMaskV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly width: number;
  readonly height: number;
  readonly runs: readonly PersonalVisualHarmonyMaskRunV1[];
}

export interface PersonalVisualHarmonyManualPromptPointV1 {
  readonly x: number;
  readonly y: number;
  readonly label: "include" | "exclude";
}

export interface PersonalVisualHarmonyManualPromptBoxV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PersonalVisualHarmonyManualPromptV1 {
  readonly points: readonly PersonalVisualHarmonyManualPromptPointV1[];
  readonly box: PersonalVisualHarmonyManualPromptBoxV1 | null;
}

export interface PersonalVisualHarmonySegmentationProviderRefV1 {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string | null;
}

export type PersonalVisualHarmonyManualPerceptionFitV1 =
  | "triangle"
  | "rectangle"
  | "quadrilateral"
  | "ellipse"
  | "elongated"
  | "bounding-region";

export type PersonalVisualHarmonyManualPerceptionWarningV1 =
  | "irregular-boundary-preserved-without-curve-primitive"
  | "low-specificity-bounding-region"
  | "provider-confidence-unavailable";

export interface PersonalVisualHarmonyManualPerceptionResultV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_MANUAL_PERCEPTION_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "candidates_ready";
  readonly interactionId: string;
  readonly sourceImageReferenceIdentity: string;
  readonly provider: PersonalVisualHarmonySegmentationProviderRefV1;
  readonly prompt: PersonalVisualHarmonyManualPromptV1;
  readonly maskIdentity: string;
  readonly perceptionIdentity: string;
  readonly fit: PersonalVisualHarmonyManualPerceptionFitV1;
  readonly providerConfidence: number | null;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
  readonly coreRun: false;
  readonly inputImageBytesObservedByThisModule: false;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
  readonly boundaryEvidence: readonly PersonalVisualHarmonyPointV1[];
  readonly warnings: readonly PersonalVisualHarmonyManualPerceptionWarningV1[];
}

export interface PersonalVisualHarmonyMergedPerceptionCandidatesV1 {
  readonly sourceImageReferenceIdentity: string;
  readonly manualPerceptionIdentity: string;
  readonly mergedPerceptionIdentity: string;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
  readonly manualBoundaryEvidence: readonly PersonalVisualHarmonyPointV1[];
  readonly manualWarnings: readonly PersonalVisualHarmonyManualPerceptionWarningV1[];
}

interface DecodedMask {
  readonly width: number;
  readonly height: number;
  readonly active: Uint8Array;
  readonly points: readonly PixelPoint[];
  readonly boundary: readonly PixelPoint[];
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly connectedComponentCount: number;
  readonly hasHoles: boolean;
}

interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

interface PrincipalAxis {
  readonly start: PersonalVisualHarmonyPointV1;
  readonly end: PersonalVisualHarmonyPointV1;
  readonly center: PersonalVisualHarmonyPointV1;
  readonly radiusMajor: number;
  readonly radiusMinor: number;
  readonly rotationDegrees: number;
  readonly axisRatio: number;
}

export function extractPersonalVisualHarmonyManualPerceptionV1(input: {
  readonly interactionId: string;
  readonly sourceImageReferenceIdentity: string;
  readonly provider: PersonalVisualHarmonySegmentationProviderRefV1;
  readonly prompt: PersonalVisualHarmonyManualPromptV1;
  readonly mask: PersonalVisualHarmonySegmentationMaskV1;
  readonly providerConfidence?: number | null;
  readonly candidateIdPrefix: string;
  readonly label: string;
  readonly role: PersonalVisualHarmonyCandidateRoleV1;
}): PersonalVisualHarmonyManualPerceptionResultV1 {
  requireSafeId(input.interactionId, "interactionId");
  requireSafeId(input.candidateIdPrefix, "candidateIdPrefix");
  if (input.candidateIdPrefix.length > 48) {
    throw new Error("candidateIdPrefix must not exceed 48 characters.");
  }
  if (!SHA256_PATTERN.test(input.sourceImageReferenceIdentity)) {
    throw new Error("sourceImageReferenceIdentity must be a sha256 identity.");
  }
  const provider = validateProvider(input.provider);
  const prompt = validatePrompt(input.prompt);
  const providerConfidence = validateConfidence(input.providerConfidence);
  const label = requireBoundedString(input.label, "label", 1, 60);
  const role = validateRole(input.role);
  const decoded = decodeMask(input.mask);
  validatePromptAgainstMask(prompt, decoded);

  const maskIdentity = contentIdentityFor({
    contractId: input.mask.contractId,
    contractVersion: input.mask.contractVersion,
    width: input.mask.width,
    height: input.mask.height,
    runs: input.mask.runs,
  });
  const normalizedBoundary = boundedBoundaryForAnalysis(decoded.boundary).map(({ x, y }) => ({
    x: canonicalNumber((x + 0.5) / decoded.width),
    y: canonicalNumber((y + 0.5) / decoded.height),
  }));
  const boundaryEvidence = boundedBoundaryEvidence(normalizedBoundary);
  const hull = convexHull(normalizedBoundary);
  const simplifiedHull = simplifyConvexHull(
    hull,
    HULL_SIMPLIFICATION_TOLERANCE_PIXELS / Math.max(decoded.width, decoded.height),
  );
  const digitallyConvex = isDigitallyConvex(
    decoded.active,
    decoded.width,
    decoded.height,
    hull,
  );
  const principalAxis = computePrincipalAxis(decoded.points, decoded.width, decoded.height);
  const bounds = normalizedBounds(decoded);
  const fillRatio = decoded.points.length
    / ((decoded.maxX - decoded.minX + 1) * (decoded.maxY - decoded.minY + 1));
  const ellipseResidual = meanEllipseBoundaryResidual(
    decoded.boundary,
    decoded.width,
    decoded.height,
    principalAxis,
  );
  const centralSymmetryRatio = maskCentralSymmetryRatio(
    decoded.points,
    decoded.active,
    decoded.width,
    decoded.height,
  );
  const fit = classifyFit({
    hullVertexCount: hull.length,
    simplifiedHull,
    fillRatio,
    ellipseResidual,
    centralSymmetryRatio,
    principalAxis,
    digitallyConvex,
    connectedComponentCount: decoded.connectedComponentCount,
    hasHoles: decoded.hasHoles,
  });
  const fitted = candidatesForFit({
    fit,
    prefix: input.candidateIdPrefix,
    label,
    role,
    bounds,
    simplifiedHull,
    principalAxis,
  });
  const warnings = [
    ...(fit === "bounding-region"
      ? ["low-specificity-bounding-region" as const]
      : []),
    ...(fit === "bounding-region" && boundaryEvidence.length > 4
      ? ["irregular-boundary-preserved-without-curve-primitive" as const]
      : []),
    ...(providerConfidence === null
      ? ["provider-confidence-unavailable" as const]
      : []),
  ];
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_MANUAL_PERCEPTION_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "candidates_ready" as const,
    interactionId: input.interactionId,
    sourceImageReferenceIdentity: input.sourceImageReferenceIdentity,
    provider,
    prompt,
    maskIdentity,
    fit,
    providerConfidence,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    coreAuthority: false as const,
    coreRun: false as const,
    inputImageBytesObservedByThisModule: false as const,
    candidates: fitted.candidates,
    triangleConstructionRequests: fitted.triangleConstructionRequests,
    boundaryEvidence,
    warnings,
  };
  return {
    ...withoutIdentity,
    perceptionIdentity: contentIdentityFor(withoutIdentity),
  };
}

export function mergePersonalVisualHarmonyPerceptionCandidatesV1(input: {
  readonly expectedSourceImageReferenceIdentity: string;
  readonly automaticCandidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly automaticTriangleConstructionRequests?: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
  readonly manualPerception: PersonalVisualHarmonyManualPerceptionResultV1;
}): PersonalVisualHarmonyMergedPerceptionCandidatesV1 {
  if (!SHA256_PATTERN.test(input.expectedSourceImageReferenceIdentity)) {
    throw new Error("expectedSourceImageReferenceIdentity must be a sha256 identity.");
  }
  if (input.manualPerception.contractId !== PERSONAL_VISUAL_HARMONY_MANUAL_PERCEPTION_CONTRACT_ID
    || input.manualPerception.contractVersion !== 1
    || input.manualPerception.status !== "candidates_ready"
    || input.manualPerception.candidateEvidenceOnly !== true
    || input.manualPerception.sourceTruth !== false
    || input.manualPerception.coreAuthority !== false
    || input.manualPerception.coreRun !== false
    || input.manualPerception.inputImageBytesObservedByThisModule !== false) {
    throw new Error("Manual perception result is invalid.");
  }
  const expectedIdentity = contentIdentityFor({
    contractId: input.manualPerception.contractId,
    contractVersion: input.manualPerception.contractVersion,
    status: input.manualPerception.status,
    interactionId: input.manualPerception.interactionId,
    sourceImageReferenceIdentity: input.manualPerception.sourceImageReferenceIdentity,
    provider: input.manualPerception.provider,
    prompt: input.manualPerception.prompt,
    maskIdentity: input.manualPerception.maskIdentity,
    fit: input.manualPerception.fit,
    providerConfidence: input.manualPerception.providerConfidence,
    candidateEvidenceOnly: input.manualPerception.candidateEvidenceOnly,
    sourceTruth: input.manualPerception.sourceTruth,
    coreAuthority: input.manualPerception.coreAuthority,
    coreRun: input.manualPerception.coreRun,
    inputImageBytesObservedByThisModule:
      input.manualPerception.inputImageBytesObservedByThisModule,
    candidates: input.manualPerception.candidates,
    triangleConstructionRequests: input.manualPerception.triangleConstructionRequests,
    boundaryEvidence: input.manualPerception.boundaryEvidence,
    warnings: input.manualPerception.warnings,
  });
  if (expectedIdentity !== input.manualPerception.perceptionIdentity) {
    throw new Error("Manual perception identity is stale or invalid.");
  }
  if (input.manualPerception.sourceImageReferenceIdentity
    !== input.expectedSourceImageReferenceIdentity) {
    throw new Error("Manual perception belongs to a different source image.");
  }
  const sourceCandidates = [
    ...structuredClone(input.automaticCandidates),
    ...structuredClone(input.manualPerception.candidates),
  ];
  for (const candidate of sourceCandidates) {
    if (candidate.sourceImageReferenceIdentity !== undefined
      && candidate.sourceImageReferenceIdentity !== input.expectedSourceImageReferenceIdentity) {
      throw new Error("Perception candidate belongs to a different source image.");
    }
  }
  const candidates = sourceCandidates.map((candidate) => ({
    ...candidate,
    sourceImageReferenceIdentity: input.expectedSourceImageReferenceIdentity,
  }));
  if (candidates.length > PERSONAL_VISUAL_HARMONY_MERGED_CANDIDATE_LIMIT) {
    throw new Error("Merged perception candidates exceed the visual harmony limit.");
  }
  const candidateIds = new Set<string>();
  for (const candidate of candidates) {
    if (candidateIds.has(candidate.id)) {
      throw new Error("Merged perception candidate ids must remain unique.");
    }
    candidateIds.add(candidate.id);
  }
  const triangleConstructionRequests = [
    ...structuredClone(input.automaticTriangleConstructionRequests ?? []),
    ...structuredClone(input.manualPerception.triangleConstructionRequests),
  ];
  if (triangleConstructionRequests.length > PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS) {
    throw new Error("Merged triangle construction requests exceed the bounded limit.");
  }
  const requestIds = new Set<string>();
  for (const request of triangleConstructionRequests) {
    if (requestIds.has(request.requestId)) {
      throw new Error("Merged triangle request ids must remain unique.");
    }
    requestIds.add(request.requestId);
  }
  const withoutIdentity = {
    sourceImageReferenceIdentity: input.expectedSourceImageReferenceIdentity,
    manualPerceptionIdentity: input.manualPerception.perceptionIdentity,
    candidates,
    triangleConstructionRequests,
    manualBoundaryEvidence: structuredClone(input.manualPerception.boundaryEvidence),
    manualWarnings: structuredClone(input.manualPerception.warnings),
  };
  return {
    ...withoutIdentity,
    mergedPerceptionIdentity: contentIdentityFor(withoutIdentity),
  };
}

function decodeMask(mask: PersonalVisualHarmonySegmentationMaskV1): DecodedMask {
  if (mask === null || typeof mask !== "object"
    || Object.keys(mask).sort().join("|")
      !== "contractId|contractVersion|height|runs|width"
    || mask.contractId !== PERSONAL_VISUAL_HARMONY_SEGMENTATION_MASK_CONTRACT_ID
    || mask.contractVersion !== 1) {
    throw new Error("Segmentation mask contract is invalid.");
  }
  if (!Number.isInteger(mask.width) || !Number.isInteger(mask.height)
    || mask.width < 2 || mask.height < 2
    || mask.width * mask.height > PERSONAL_VISUAL_HARMONY_MAX_MASK_PIXELS) {
    throw new Error("Segmentation mask dimensions are invalid or exceed the limit.");
  }
  if (!Array.isArray(mask.runs) || mask.runs.length > PERSONAL_VISUAL_HARMONY_MAX_MASK_RUNS) {
    throw new Error("Segmentation mask runs exceed the limit.");
  }
  const active = new Uint8Array(mask.width * mask.height);
  const points: PixelPoint[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let previousY = -1;
  let previousEndX = -1;
  for (const [index, run] of mask.runs.entries()) {
    const keys = Object.keys(run).sort().join("|");
    if (keys !== "endXExclusive|startX|y"
      || !Number.isInteger(run.y)
      || !Number.isInteger(run.startX)
      || !Number.isInteger(run.endXExclusive)
      || run.y < 0 || run.y >= mask.height
      || run.startX < 0 || run.endXExclusive > mask.width
      || run.startX >= run.endXExclusive) {
      throw new Error(`Segmentation mask run ${String(index)} is invalid.`);
    }
    if (run.y < previousY || (run.y === previousY && run.startX < previousEndX)) {
      throw new Error("Segmentation mask runs must be sorted and non-overlapping.");
    }
    previousY = run.y;
    previousEndX = run.endXExclusive;
    for (let x = run.startX; x < run.endXExclusive; x += 1) {
      const offset = (run.y * mask.width) + x;
      active[offset] = 1;
      points.push({ x, y: run.y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, run.y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, run.y);
    }
  }
  if (points.length < MIN_ACTIVE_PIXELS) {
    throw new Error("Segmentation mask contains too little evidence.");
  }
  const boundary = points.filter(({ x, y }) => (
    x === 0 || y === 0 || x === mask.width - 1 || y === mask.height - 1
    || active[(y * mask.width) + x - 1] === 0
    || active[(y * mask.width) + x + 1] === 0
    || active[((y - 1) * mask.width) + x] === 0
    || active[((y + 1) * mask.width) + x] === 0
  ));
  const topology = analyzeMaskTopology(active, mask.width, mask.height);
  return {
    width: mask.width,
    height: mask.height,
    active,
    points,
    boundary,
    minX,
    minY,
    maxX,
    maxY,
    connectedComponentCount: topology.connectedComponentCount,
    hasHoles: topology.hasHoles,
  };
}

function analyzeMaskTopology(
  active: Uint8Array,
  width: number,
  height: number,
): { readonly connectedComponentCount: number; readonly hasHoles: boolean } {
  const queue = new Int32Array(active.length);
  const activeVisited = new Uint8Array(active.length);
  let connectedComponentCount = 0;
  for (let offset = 0; offset < active.length; offset += 1) {
    if (active[offset] !== 1 || activeVisited[offset] === 1) continue;
    connectedComponentCount += 1;
    floodMaskValue(active, activeVisited, queue, offset, 1, width, height);
  }

  const backgroundVisited = new Uint8Array(active.length);
  const visitBackground = (offset: number): void => {
    if (active[offset] === 0 && backgroundVisited[offset] === 0) {
      floodMaskValue(active, backgroundVisited, queue, offset, 0, width, height);
    }
  };
  for (let x = 0; x < width; x += 1) {
    visitBackground(x);
    visitBackground(((height - 1) * width) + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    visitBackground(y * width);
    visitBackground((y * width) + width - 1);
  }
  const hasHoles = active.some((value, offset) => (
    value === 0 && backgroundVisited[offset] === 0
  ));
  return { connectedComponentCount, hasHoles };
}

function floodMaskValue(
  active: Uint8Array,
  visited: Uint8Array,
  queue: Int32Array,
  startOffset: number,
  targetValue: 0 | 1,
  width: number,
  height: number,
): void {
  let head = 0;
  let tail = 0;
  visited[startOffset] = 1;
  queue[tail] = startOffset;
  tail += 1;
  while (head < tail) {
    const offset = queue[head];
    head += 1;
    if (offset === undefined) continue;
    const x = offset % width;
    const y = Math.floor(offset / width);
    const neighbors = [
      ...(x > 0 ? [offset - 1] : []),
      ...(x + 1 < width ? [offset + 1] : []),
      ...(y > 0 ? [offset - width] : []),
      ...(y + 1 < height ? [offset + width] : []),
    ];
    if (targetValue === 1) {
      if (x > 0 && y > 0) neighbors.push(offset - width - 1);
      if (x + 1 < width && y > 0) neighbors.push(offset - width + 1);
      if (x > 0 && y + 1 < height) neighbors.push(offset + width - 1);
      if (x + 1 < width && y + 1 < height) neighbors.push(offset + width + 1);
    }
    for (const neighbor of neighbors) {
      if (active[neighbor] !== targetValue || visited[neighbor] === 1) continue;
      visited[neighbor] = 1;
      queue[tail] = neighbor;
      tail += 1;
    }
  }
}

function validatePrompt(
  prompt: PersonalVisualHarmonyManualPromptV1,
): PersonalVisualHarmonyManualPromptV1 {
  if (prompt === null || typeof prompt !== "object"
    || Object.keys(prompt).sort().join("|") !== "box|points"
    || !Array.isArray(prompt.points)
    || prompt.points.length > PERSONAL_VISUAL_HARMONY_MAX_PROMPT_POINTS) {
    throw new Error("Manual perception prompt is invalid.");
  }
  const points = prompt.points.map((point, index) => {
    if (point === null || typeof point !== "object"
      || Object.keys(point).sort().join("|") !== "label|x|y"
      || (point.label !== "include" && point.label !== "exclude")
      || !isNormalized(point.x) || !isNormalized(point.y)) {
      throw new Error(`Manual perception prompt point ${String(index)} is invalid.`);
    }
    return { x: canonicalNumber(point.x), y: canonicalNumber(point.y), label: point.label };
  });
  const box = prompt.box === null ? null : validateBox(prompt.box);
  if (box === null && !points.some(({ label }) => label === "include")) {
    throw new Error("Manual perception requires an include point or a box.");
  }
  return { points, box };
}

function validateBox(
  box: PersonalVisualHarmonyManualPromptBoxV1,
): PersonalVisualHarmonyManualPromptBoxV1 {
  if (Object.keys(box).sort().join("|") !== "height|width|x|y"
    || !isNormalized(box.x) || !isNormalized(box.y)
    || !Number.isFinite(box.width) || !Number.isFinite(box.height)
    || box.width <= 0 || box.height <= 0
    || box.x + box.width > 1 || box.y + box.height > 1) {
    throw new Error("Manual perception prompt box is invalid.");
  }
  return {
    x: canonicalNumber(box.x),
    y: canonicalNumber(box.y),
    width: canonicalNumber(box.width),
    height: canonicalNumber(box.height),
  };
}

function validatePromptAgainstMask(
  prompt: PersonalVisualHarmonyManualPromptV1,
  mask: DecodedMask,
): void {
  for (const point of prompt.points) {
    const x = Math.min(mask.width - 1, Math.floor(point.x * mask.width));
    const y = Math.min(mask.height - 1, Math.floor(point.y * mask.height));
    const selected = mask.active[(y * mask.width) + x] === 1;
    if (point.label === "include" && !selected) {
      throw new Error("An include point falls outside the returned mask.");
    }
    if (point.label === "exclude" && selected) {
      throw new Error("An exclude point falls inside the returned mask.");
    }
  }
  if (prompt.box !== null) {
    const overlapsMask = mask.points.some(({ x, y }) => {
      const normalizedX = (x + 0.5) / mask.width;
      const normalizedY = (y + 0.5) / mask.height;
      return normalizedX >= prompt.box!.x
        && normalizedX <= prompt.box!.x + prompt.box!.width
        && normalizedY >= prompt.box!.y
        && normalizedY <= prompt.box!.y + prompt.box!.height;
    });
    if (!overlapsMask) {
      throw new Error("The prompt box does not overlap the returned mask.");
    }
  }
}

function validateProvider(
  provider: PersonalVisualHarmonySegmentationProviderRefV1,
): PersonalVisualHarmonySegmentationProviderRefV1 {
  if (provider === null || typeof provider !== "object"
    || Object.keys(provider).sort().join("|") !== "modelId|modelVersion|providerId") {
    throw new Error("Segmentation provider reference is invalid.");
  }
  return {
    providerId: requireBoundedString(provider.providerId, "provider.providerId", 1, 96),
    modelId: requireBoundedString(provider.modelId, "provider.modelId", 1, 128),
    modelVersion: provider.modelVersion === null
      ? null
      : requireBoundedString(provider.modelVersion, "provider.modelVersion", 1, 128),
  };
}

function validateConfidence(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (!isNormalized(value)) throw new Error("providerConfidence must be between 0 and 1.");
  return canonicalNumber(value);
}

function validateRole(
  role: PersonalVisualHarmonyCandidateRoleV1,
): PersonalVisualHarmonyCandidateRoleV1 {
  if (!["primary-subject", "secondary-subject", "structural-region", "frame"].includes(role)) {
    throw new Error("Candidate role is invalid.");
  }
  return role;
}

function normalizedBounds(
  mask: DecodedMask,
): Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height"> {
  return {
    x: canonicalNumber(mask.minX / mask.width),
    y: canonicalNumber(mask.minY / mask.height),
    width: canonicalNumber((mask.maxX - mask.minX + 1) / mask.width),
    height: canonicalNumber((mask.maxY - mask.minY + 1) / mask.height),
  };
}

function boundedBoundaryEvidence(
  boundary: readonly PersonalVisualHarmonyPointV1[],
): readonly PersonalVisualHarmonyPointV1[] {
  if (boundary.length <= PERSONAL_VISUAL_HARMONY_MAX_CONTOUR_POINTS) return boundary;
  const step = boundary.length / PERSONAL_VISUAL_HARMONY_MAX_CONTOUR_POINTS;
  return Array.from(
    { length: PERSONAL_VISUAL_HARMONY_MAX_CONTOUR_POINTS },
    (_, index) => boundary[Math.floor(index * step)],
  ).filter((point): point is PersonalVisualHarmonyPointV1 => point !== undefined);
}

function boundedBoundaryForAnalysis(
  boundary: readonly PixelPoint[],
): readonly PixelPoint[] {
  if (boundary.length <= MAX_BOUNDARY_ANALYSIS_POINTS) return boundary;
  const step = boundary.length / MAX_BOUNDARY_ANALYSIS_POINTS;
  return Array.from(
    { length: MAX_BOUNDARY_ANALYSIS_POINTS },
    (_, index) => boundary[Math.floor(index * step)],
  ).filter((point): point is PixelPoint => point !== undefined);
}

function isDigitallyConvex(
  active: Uint8Array,
  width: number,
  height: number,
  hull: readonly PersonalVisualHarmonyPointV1[],
): boolean {
  if (hull.length < 3) return false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width) + x;
      if (active[offset] === 1) continue;
      const point = { x: (x + 0.5) / width, y: (y + 0.5) / height };
      if (isInsideOrOnConvexPolygon(point, hull)) return false;
    }
  }
  return true;
}

function isInsideOrOnConvexPolygon(
  point: PersonalVisualHarmonyPointV1,
  polygon: readonly PersonalVisualHarmonyPointV1[],
): boolean {
  const first = polygon[0];
  const second = polygon[1];
  const last = polygon.at(-1);
  if (first === undefined || second === undefined || last === undefined) return false;
  const tolerance = 1e-12;
  if (cross(first, second, point) < -tolerance
    || cross(first, last, point) > tolerance) return false;
  let lower = 1;
  let upper = polygon.length - 1;
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    const vertex = polygon[middle];
    if (vertex === undefined) return false;
    if (cross(first, vertex, point) >= -tolerance) lower = middle;
    else upper = middle;
  }
  const start = polygon[lower];
  const end = polygon[(lower + 1) % polygon.length];
  return start !== undefined && end !== undefined
    && cross(start, end, point) >= -tolerance;
}

function convexHull(
  points: readonly PersonalVisualHarmonyPointV1[],
): readonly PersonalVisualHarmonyPointV1[] {
  const unique = [...new Map(
    points.map((point) => [`${point.x}:${point.y}`, point]),
  ).values()].sort((left, right) => left.x - right.x || left.y - right.y);
  if (unique.length <= 2) return unique;
  const lower: PersonalVisualHarmonyPointV1[] = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(
      lower[lower.length - 2] as PersonalVisualHarmonyPointV1,
      lower[lower.length - 1] as PersonalVisualHarmonyPointV1,
      point,
    ) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: PersonalVisualHarmonyPointV1[] = [];
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross(
      upper[upper.length - 2] as PersonalVisualHarmonyPointV1,
      upper[upper.length - 1] as PersonalVisualHarmonyPointV1,
      point,
    ) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function simplifyConvexHull(
  input: readonly PersonalVisualHarmonyPointV1[],
  tolerance: number,
): readonly PersonalVisualHarmonyPointV1[] {
  const points = [...input];
  while (points.length > 3) {
    let leastIndex = -1;
    let leastDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < points.length; index += 1) {
      const previous = points[(index - 1 + points.length) % points.length];
      const current = points[index];
      const next = points[(index + 1) % points.length];
      if (previous === undefined || current === undefined || next === undefined) continue;
      const distance = pointLineDistance(current, previous, next);
      if (distance < leastDistance) {
        leastDistance = distance;
        leastIndex = index;
      }
    }
    if (leastIndex < 0 || leastDistance > tolerance) break;
    points.splice(leastIndex, 1);
  }
  return points;
}

function computePrincipalAxis(
  points: readonly PixelPoint[],
  width: number,
  height: number,
): PrincipalAxis {
  const center = {
    x: points.reduce((sum, point) => sum + ((point.x + 0.5) / width), 0)
      / points.length,
    y: points.reduce((sum, point) => sum + ((point.y + 0.5) / height), 0)
      / points.length,
  };
  let covarianceXX = 0;
  let covarianceXY = 0;
  let covarianceYY = 0;
  for (const pixel of points) {
    const point = { x: (pixel.x + 0.5) / width, y: (pixel.y + 0.5) / height };
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    covarianceXX += dx * dx;
    covarianceXY += dx * dy;
    covarianceYY += dy * dy;
  }
  const rotationRadians = 0.5 * Math.atan2(
    2 * covarianceXY,
    covarianceXX - covarianceYY,
  );
  const unitMajor = { x: Math.cos(rotationRadians), y: Math.sin(rotationRadians) };
  const unitMinor = { x: -unitMajor.y, y: unitMajor.x };
  let minMajor = Number.POSITIVE_INFINITY;
  let maxMajor = Number.NEGATIVE_INFINITY;
  let minMinor = Number.POSITIVE_INFINITY;
  let maxMinor = Number.NEGATIVE_INFINITY;
  for (const pixel of points) {
    const point = { x: (pixel.x + 0.5) / width, y: (pixel.y + 0.5) / height };
    const major = dotFromCenter(point, center, unitMajor);
    const minor = dotFromCenter(point, center, unitMinor);
    minMajor = Math.min(minMajor, major);
    maxMajor = Math.max(maxMajor, major);
    minMinor = Math.min(minMinor, minor);
    maxMinor = Math.max(maxMinor, minor);
  }
  const radiusMajor = Math.max((maxMajor - minMajor) / 2, Number.EPSILON);
  const radiusMinor = Math.max((maxMinor - minMinor) / 2, Number.EPSILON);
  const axisCenter = {
    x: center.x + (unitMajor.x * (minMajor + maxMajor) / 2),
    y: center.y + (unitMajor.y * (minMajor + maxMajor) / 2),
  };
  return {
    start: canonicalPoint({
      x: axisCenter.x - (unitMajor.x * radiusMajor),
      y: axisCenter.y - (unitMajor.y * radiusMajor),
    }),
    end: canonicalPoint({
      x: axisCenter.x + (unitMajor.x * radiusMajor),
      y: axisCenter.y + (unitMajor.y * radiusMajor),
    }),
    center: canonicalPoint(axisCenter),
    radiusMajor: canonicalNumber(radiusMajor),
    radiusMinor: canonicalNumber(radiusMinor),
    rotationDegrees: canonicalNumber(normalizeHalfTurnDegrees(
      rotationRadians * 180 / Math.PI,
    )),
    axisRatio: canonicalNumber(radiusMajor / radiusMinor),
  };
}

function meanEllipseBoundaryResidual(
  boundary: readonly PixelPoint[],
  width: number,
  height: number,
  axis: PrincipalAxis,
): number {
  const radians = axis.rotationDegrees * Math.PI / 180;
  const unitMajor = { x: Math.cos(radians), y: Math.sin(radians) };
  const unitMinor = { x: -unitMajor.y, y: unitMajor.x };
  const residual = boundary.reduce((sum, pixel) => {
    const point = { x: (pixel.x + 0.5) / width, y: (pixel.y + 0.5) / height };
    const major = dotFromCenter(point, axis.center, unitMajor) / axis.radiusMajor;
    const minor = dotFromCenter(point, axis.center, unitMinor) / axis.radiusMinor;
    return sum + Math.abs((major * major) + (minor * minor) - 1);
  }, 0) / boundary.length;
  return canonicalNumber(residual);
}

function maskCentralSymmetryRatio(
  points: readonly PixelPoint[],
  active: Uint8Array,
  width: number,
  height: number,
): number {
  const centerX = points.reduce((sum, point) => sum + point.x + 0.5, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y + 0.5, 0) / points.length;
  let symmetricPointCount = 0;
  for (const point of points) {
    const reflectedX = Math.round((2 * centerX) - (point.x + 0.5) - 0.5);
    const reflectedY = Math.round((2 * centerY) - (point.y + 0.5) - 0.5);
    if (reflectedX < 0 || reflectedX >= width || reflectedY < 0 || reflectedY >= height) {
      continue;
    }
    if (active[(reflectedY * width) + reflectedX] === 1) symmetricPointCount += 1;
  }
  return canonicalNumber(symmetricPointCount / points.length);
}

function classifyFit(input: {
  readonly hullVertexCount: number;
  readonly simplifiedHull: readonly PersonalVisualHarmonyPointV1[];
  readonly fillRatio: number;
  readonly ellipseResidual: number;
  readonly centralSymmetryRatio: number;
  readonly principalAxis: PrincipalAxis;
  readonly digitallyConvex: boolean;
  readonly connectedComponentCount: number;
  readonly hasHoles: boolean;
}): PersonalVisualHarmonyManualPerceptionFitV1 {
  if (input.connectedComponentCount !== 1 || input.hasHoles) return "bounding-region";
  if (input.principalAxis.axisRatio >= ELONGATED_AXIS_RATIO) return "elongated";
  if (input.digitallyConvex) {
    if (input.simplifiedHull.length === 3 && input.fillRatio >= 0.3) return "triangle";
    if (input.simplifiedHull.length === 4 && input.fillRatio >= 0.35) {
      if (input.hullVertexCount >= 8
        && input.fillRatio <= 0.9
        && input.ellipseResidual <= ELLIPSE_MAX_MEAN_BOUNDARY_RESIDUAL
        && input.centralSymmetryRatio >= ELLIPSE_MIN_CENTRAL_SYMMETRY_RATIO) {
        return "ellipse";
      }
      return isAxisAlignedPolygon(input.simplifiedHull) && input.fillRatio >= 0.72
        ? "rectangle"
        : "quadrilateral";
    }
  }
  if (input.fillRatio >= 0.55 && input.fillRatio <= 0.9
    && input.ellipseResidual <= ELLIPSE_MAX_MEAN_BOUNDARY_RESIDUAL
    && input.centralSymmetryRatio >= ELLIPSE_MIN_CENTRAL_SYMMETRY_RATIO) {
    return "ellipse";
  }
  return "bounding-region";
}

function candidatesForFit(input: {
  readonly fit: PersonalVisualHarmonyManualPerceptionFitV1;
  readonly prefix: string;
  readonly label: string;
  readonly role: PersonalVisualHarmonyCandidateRoleV1;
  readonly bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">;
  readonly simplifiedHull: readonly PersonalVisualHarmonyPointV1[];
  readonly principalAxis: PrincipalAxis;
}): {
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
} {
  if (input.fit === "triangle") return triangleCandidates(input);
  const subject = subjectCandidate(input);
  const axisCandidate: PersonalVisualHarmonyCandidateInputV1 = {
    id: `${input.prefix}:axis`,
    label: `${input.label} — axe principal`,
    role: "structural-region",
    reason: "Axe principal déterministe du masque sélectionné, à confirmer.",
    x: Math.min(input.principalAxis.start.x, input.principalAxis.end.x),
    y: Math.min(input.principalAxis.start.y, input.principalAxis.end.y),
    width: Math.abs(input.principalAxis.end.x - input.principalAxis.start.x),
    height: Math.abs(input.principalAxis.end.y - input.principalAxis.start.y),
    primitive: {
      kind: "axis",
      start: input.principalAxis.start,
      end: input.principalAxis.end,
    },
  };
  return {
    candidates: [subject, axisCandidate],
    triangleConstructionRequests: [],
  };
}

function subjectCandidate(input: {
  readonly fit: PersonalVisualHarmonyManualPerceptionFitV1;
  readonly prefix: string;
  readonly label: string;
  readonly role: PersonalVisualHarmonyCandidateRoleV1;
  readonly bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">;
  readonly simplifiedHull: readonly PersonalVisualHarmonyPointV1[];
  readonly principalAxis: PrincipalAxis;
}): PersonalVisualHarmonyCandidateInputV1 {
  if (input.fit === "elongated") {
    return {
      id: `${input.prefix}:segment`,
      label: input.label,
      role: input.role,
      reason: "Segment fini ajusté sur le masque allongé sélectionné, à confirmer.",
      ...input.bounds,
      primitive: {
        kind: "segment",
        start: input.principalAxis.start,
        end: input.principalAxis.end,
      },
    };
  }
  if (input.fit === "ellipse") {
    return {
      id: `${input.prefix}:ellipse`,
      label: input.label,
      role: input.role,
      reason: "Ellipse déterministe ajustée au contour du masque sélectionné, à confirmer.",
      ...input.bounds,
      primitive: {
        kind: "ellipse",
        center: input.principalAxis.center,
        radiusX: input.principalAxis.radiusMajor,
        radiusY: input.principalAxis.radiusMinor,
        rotationDegrees: input.principalAxis.rotationDegrees,
      },
    };
  }
  if (input.fit === "quadrilateral") {
    const vertices = input.simplifiedHull.slice(0, 4);
    if (vertices.length !== 4) throw new Error("Quadrilateral fit lost its vertices.");
    const first = vertices[0];
    const second = vertices[1];
    const third = vertices[2];
    const fourth = vertices[3];
    if (first === undefined || second === undefined
      || third === undefined || fourth === undefined) {
      throw new Error("Quadrilateral fit lost its vertices.");
    }
    return {
      id: `${input.prefix}:quadrilateral`,
      label: input.label,
      role: input.role,
      reason: "Quadrilatère déterministe ajusté au contour du masque sélectionné, à confirmer.",
      ...input.bounds,
      primitive: {
        kind: "quadrilateral",
        vertices: [first, second, third, fourth],
      },
    };
  }
  return {
    id: `${input.prefix}:region`,
    label: input.label,
    role: input.role,
    reason: input.fit === "rectangle"
      ? "Rectangle déterministe ajusté au masque sélectionné, à confirmer."
      : "Région englobante prudente du masque sélectionné, à confirmer.",
    ...input.bounds,
    primitive: { kind: "rectangle" },
  };
}

function triangleCandidates(input: {
  readonly prefix: string;
  readonly label: string;
  readonly role: PersonalVisualHarmonyCandidateRoleV1;
  readonly simplifiedHull: readonly PersonalVisualHarmonyPointV1[];
}): {
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
} {
  const vertices = input.simplifiedHull;
  if (vertices.length !== 3) throw new Error("Triangle fit lost its vertices.");
  const candidates = vertices.map((start, index): PersonalVisualHarmonyCandidateInputV1 => {
    const end = vertices[(index + 1) % vertices.length];
    if (end === undefined) throw new Error("Triangle edge is invalid.");
    return {
      id: `${input.prefix}:edge-${String(index + 1)}`,
      label: `${input.label} — côté ${String(index + 1)}`,
      role: input.role,
      reason: "Côté fini dérivé du contour triangulaire sélectionné, à confirmer.",
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      primitive: { kind: "segment", start, end },
    };
  });
  const first = vertices[0] as PersonalVisualHarmonyPointV1;
  const second = vertices[1] as PersonalVisualHarmonyPointV1;
  const third = vertices[2] as PersonalVisualHarmonyPointV1;
  return {
    candidates,
    triangleConstructionRequests: [{
      requestId: `${input.prefix}:triangle`,
      vertices: [
        {
          point: first,
          parent: {
            kind: "observed-line-endpoint",
            candidateId: `${input.prefix}:edge-1`,
            endpoint: "start",
          },
        },
        {
          point: second,
          parent: {
            kind: "observed-line-endpoint",
            candidateId: `${input.prefix}:edge-1`,
            endpoint: "end",
          },
        },
        {
          point: third,
          parent: {
            kind: "observed-line-endpoint",
            candidateId: `${input.prefix}:edge-2`,
            endpoint: "end",
          },
        },
      ],
    }],
  };
}

function isAxisAlignedPolygon(
  points: readonly PersonalVisualHarmonyPointV1[],
): boolean {
  const tolerance = 0.02;
  return points.every((point, index) => {
    const next = points[(index + 1) % points.length];
    return next !== undefined
      && (Math.abs(point.x - next.x) <= tolerance
        || Math.abs(point.y - next.y) <= tolerance);
  });
}

function cross(
  origin: PersonalVisualHarmonyPointV1,
  left: PersonalVisualHarmonyPointV1,
  right: PersonalVisualHarmonyPointV1,
): number {
  return ((left.x - origin.x) * (right.y - origin.y))
    - ((left.y - origin.y) * (right.x - origin.x));
}

function pointLineDistance(
  point: PersonalVisualHarmonyPointV1,
  start: PersonalVisualHarmonyPointV1,
  end: PersonalVisualHarmonyPointV1,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return Math.abs((dy * point.x) - (dx * point.y) + (end.x * start.y) - (end.y * start.x))
    / length;
}

function dotFromCenter(
  point: PersonalVisualHarmonyPointV1,
  center: PersonalVisualHarmonyPointV1,
  axis: PersonalVisualHarmonyPointV1,
): number {
  return ((point.x - center.x) * axis.x) + ((point.y - center.y) * axis.y);
}

function canonicalPoint(point: PersonalVisualHarmonyPointV1): PersonalVisualHarmonyPointV1 {
  return {
    x: canonicalNumber(Math.min(1, Math.max(0, point.x))),
    y: canonicalNumber(Math.min(1, Math.max(0, point.y))),
  };
}

function canonicalNumber(value: number): number {
  return Number(value.toFixed(9));
}

function normalizeHalfTurnDegrees(value: number): number {
  const normalized = ((value % 180) + 180) % 180;
  return normalized === 180 ? 0 : normalized;
}

function isNormalized(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function requireSafeId(value: string, field: string): void {
  if (typeof value !== "string" || !SAFE_ID_PATTERN.test(value)) {
    throw new Error(`${field} must be a safe identifier.`);
  }
}

function requireBoundedString(
  value: string,
  field: string,
  minimum: number,
  maximum: number,
): string {
  if (typeof value !== "string"
    || value.length < minimum
    || value.length > maximum
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${field} must contain ${String(minimum)} to ${String(maximum)} characters.`);
  }
  return value;
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}
