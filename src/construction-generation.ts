import type {
  CoreError,
  CoreResult,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  PackLockRef,
  Point,
  Provenance,
  Rect,
  Segment,
  SourceReference,
  SurfaceSpace,
} from "./index.js";
import { validateGeometryV1 } from "./index.js";
import type {
  ResolvedRatioRef,
  ResolvedRatioSequenceRef,
  ResolvedRule,
  RuleResolutionV1,
} from "./rule-resolution.js";
import { validateRuleResolutionV1 } from "./rule-resolution.js";

export const CONSTRUCTION_V1_SCHEMA_VERSION = "construction-v1" as const;

export type ConstructionV1SchemaVersion = typeof CONSTRUCTION_V1_SCHEMA_VERSION;
export type GuideOrientationV1 = "vertical" | "horizontal";
export type ZonePartitionAxisV1 = GuideOrientationV1;

export interface GuideV1 {
  kind: "guide";
  guideRef: string;
  geometryType: "line";
  orientation: GuideOrientationV1;
  position: number;
  segment: Segment;
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  ruleRef: string;
  operationRef: string;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface ZoneV1 {
  kind: "zone";
  zoneRef: string;
  partitionAxis: ZonePartitionAxisV1;
  bounds: Rect;
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  ruleRef: string;
  boundingGuideRefs: readonly string[];
  operationRef: string;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface GridCellV1 {
  kind: "grid-cell";
  cellRef: string;
  gridRef: string;
  rowIndex: number;
  columnIndex: number;
  bounds: Rect;
  boundingGuideRefs: readonly string[];
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  ruleRefs: readonly string[];
  operationRef: string;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface GridV1 {
  kind: "grid";
  gridRef: string;
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  ruleRefs: readonly string[];
  rowCount: number;
  columnCount: number;
  rowGuideRefs: readonly string[];
  columnGuideRefs: readonly string[];
  cells: readonly GridCellV1[];
  operationRef: string;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface IntersectionPointV1 {
  kind: "intersection-point";
  intersectionRef: string;
  point: Point;
  sourceGeometryRefs: readonly string[];
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  ruleRefs: readonly string[];
  operationRef: string;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface ConstructionTraceEntryV1 {
  kind: "construction-trace-entry";
  operationRef: string;
  ruleRefs: readonly string[];
  createdObjectRefs: readonly string[];
  warnings: readonly string[];
}

export interface ConstructionTraceV1 {
  kind: "construction-trace";
  appliedRuleRefs: readonly string[];
  operationRefs: readonly string[];
  createdObjectRefs: readonly string[];
  entries: readonly ConstructionTraceEntryV1[];
  warnings: readonly string[];
}

export interface ConstructionV1 {
  kind: "construction";
  schemaVersion: ConstructionV1SchemaVersion;
  constructionRef: string;
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
  contentIdentity: string;
  appliedRuleRefs: readonly string[];
  guides: readonly GuideV1[];
  zones: readonly ZoneV1[];
  grids: readonly GridV1[];
  intersections: readonly IntersectionPointV1[];
  constructionTrace: ConstructionTraceV1;
  measurementRefs: readonly SourceReference[];
  evaluationRefs: readonly SourceReference[];
  scoringRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

interface DiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly never[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  output?: TOutput | null;
}

type ConstructionValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult;
    };

interface PositionPlan {
  position: number;
  positionRef: string;
  sourceRefs: readonly SourceReference[];
}

interface PartitionRulePlan {
  ruleRef: string;
  orientation: GuideOrientationV1;
  positions: readonly PositionPlan[];
  sourceRefs: readonly SourceReference[];
}

interface ConstructionContext {
  constructionRef: string;
  inputRef: string;
  packRef: string;
  ruleSetRef: string;
}

const CONSTRUCTION_OPERATION_VERSION = "0.1.0";
const GENERATE_GUIDES_OPERATION_REF = "construction.generateGuides";
const GENERATE_ZONES_OPERATION_REF = "construction.generateZones";
const GENERATE_GRID_OPERATION_REF = "construction.generateSimpleGrid";
const DERIVE_INTERSECTIONS_OPERATION_REF = "construction.deriveIntersections";

const CONSTRUCTION_OPERATION_REFS = [
  GENERATE_GUIDES_OPERATION_REF,
  GENERATE_ZONES_OPERATION_REF,
  GENERATE_GRID_OPERATION_REF,
  DERIVE_INTERSECTIONS_OPERATION_REF,
] as const;

const CONSTRUCTION_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/construction-v1",
});

const DEFAULT_RESULT_FIELDS = Object.freeze({
  warnings: [],
  errors: [],
  provenance: null,
  outputRefs: [],
  runRef: null,
  packLockRef: null,
  operationContextRef: null,
  output: null,
});

const SOURCE_REFERENCE_ALLOWED_KEYS = ["kind", "ref"] as const;
const PROVENANCE_ALLOWED_KEYS = ["operationName", "operationVersion", "inputRefs", "source"] as const;
const POINT_ALLOWED_KEYS = ["kind", "x", "y"] as const;
const SEGMENT_ALLOWED_KEYS = ["kind", "start", "end"] as const;
const RECT_ALLOWED_KEYS = ["kind", "x", "y", "width", "height"] as const;
const CONSTRUCTION_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "constructionRef",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "contentIdentity",
  "appliedRuleRefs",
  "guides",
  "zones",
  "grids",
  "intersections",
  "constructionTrace",
  "measurementRefs",
  "evaluationRefs",
  "scoringRefs",
  "artifactRefs",
  "sourceRefs",
  "provenance",
] as const;
const GUIDE_ALLOWED_KEYS = [
  "kind",
  "guideRef",
  "geometryType",
  "orientation",
  "position",
  "segment",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "ruleRef",
  "operationRef",
  "sourceRefs",
  "provenance",
] as const;
const ZONE_ALLOWED_KEYS = [
  "kind",
  "zoneRef",
  "partitionAxis",
  "bounds",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "ruleRef",
  "boundingGuideRefs",
  "operationRef",
  "sourceRefs",
  "provenance",
] as const;
const GRID_ALLOWED_KEYS = [
  "kind",
  "gridRef",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "ruleRefs",
  "rowCount",
  "columnCount",
  "rowGuideRefs",
  "columnGuideRefs",
  "cells",
  "operationRef",
  "sourceRefs",
  "provenance",
] as const;
const GRID_CELL_ALLOWED_KEYS = [
  "kind",
  "cellRef",
  "gridRef",
  "rowIndex",
  "columnIndex",
  "bounds",
  "boundingGuideRefs",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "ruleRefs",
  "operationRef",
  "sourceRefs",
  "provenance",
] as const;
const INTERSECTION_ALLOWED_KEYS = [
  "kind",
  "intersectionRef",
  "point",
  "sourceGeometryRefs",
  "inputRef",
  "packRef",
  "ruleSetRef",
  "ruleRefs",
  "operationRef",
  "sourceRefs",
  "provenance",
] as const;
const TRACE_ALLOWED_KEYS = [
  "kind",
  "appliedRuleRefs",
  "operationRefs",
  "createdObjectRefs",
  "entries",
  "warnings",
] as const;
const TRACE_ENTRY_ALLOWED_KEYS = ["kind", "operationRef", "ruleRefs", "createdObjectRefs", "warnings"] as const;

export function generateConstructionV1(
  geometry: unknown,
  ruleResolution: unknown,
): CoreResult<ConstructionV1> {
  if (geometry === null || geometry === undefined || ruleResolution === null || ruleResolution === undefined) {
    return missingConstructionInput("constructionInput", "Construction generation requires geometry and Rule Resolution V1 input.") as CoreResult<ConstructionV1>;
  }

  const geometryValidation = validateGeometryV1(geometry);
  if (geometryValidation.status !== "ok" || geometryValidation.output === null) {
    return geometryValidation as unknown as CoreResult<ConstructionV1>;
  }

  if (geometryValidation.output.kind !== "surface-space") {
    return missingConstructionInput("geometry.kind", "Construction Generation V1 supports SurfaceSpace input only.") as CoreResult<ConstructionV1>;
  }

  const ruleValidation = validateRuleResolutionV1(ruleResolution);
  if (ruleValidation.status !== "ok" || ruleValidation.output === null) {
    return ruleValidation as unknown as CoreResult<ConstructionV1>;
  }

  const context = constructionContext(geometryValidation.output, ruleValidation.output);
  const plans = createPartitionRulePlans(ruleValidation.output);
  if (!plans.ok) {
    return plans.result as CoreResult<ConstructionV1>;
  }

  const guides = generateGuides(context, plans.value);
  const zones = generateZones(context, guides);
  const grids = generateSimpleGrid(context, guides);
  const intersections = deriveIntersections(context, guides);
  const sourceRefs = uniqueSourceRefs(plans.value.flatMap((plan) => plan.sourceRefs));
  const construction = createConstructionOutput(
    context,
    ruleValidation.output,
    guides,
    zones,
    grids,
    intersections,
    sourceRefs,
  );

  return createConstructionResult({
    status: "ok",
    provenance: createConstructionProvenance("core.construction-v1.generate", [
      { kind: "geometry", ref: context.inputRef },
      { kind: "ratio-pack", ref: context.packRef },
      { kind: "rule-set", ref: context.ruleSetRef },
      { kind: "rule-resolution", ref: `${context.packRef}:${context.ruleSetRef}` },
      ...ruleValidation.output.ruleRefs.map((ruleRef) => ({ kind: "rule-declaration", ref: ruleRef })),
    ]),
    outputRefs: [
      { kind: "construction", ref: context.constructionRef },
      { kind: "geometry", ref: context.inputRef },
      { kind: "ratio-pack", ref: context.packRef },
      { kind: "rule-set", ref: context.ruleSetRef },
      { kind: "rule-resolution", ref: `${context.packRef}:${context.ruleSetRef}` },
    ],
    output: construction,
  });
}

export function validateConstructionV1(value: unknown): CoreResult<ConstructionV1> {
  const validation = validateConstructionValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<ConstructionV1>;
  }

  return createConstructionResult({
    status: "ok",
    provenance: createConstructionProvenance("core.construction-v1.validate", [
      { kind: "construction", ref: validation.value.constructionRef },
    ]),
    outputRefs: [{ kind: "construction", ref: validation.value.constructionRef }],
    output: validation.value,
  });
}

function constructionContext(surface: SurfaceSpace, ruleResolution: RuleResolutionV1): ConstructionContext {
  return {
    constructionRef: constructionRef(surface.id, ruleResolution),
    inputRef: surface.id,
    packRef: ruleResolution.packRef,
    ruleSetRef: ruleResolution.ruleSetRef,
  };
}

function constructionRef(surfaceRef: string, ruleResolution: RuleResolutionV1): string {
  return `construction:${surfaceRef}:${ruleResolution.packRef}:${ruleResolution.ruleSetRef}:v1`;
}

function createPartitionRulePlans(ruleResolution: RuleResolutionV1): ConstructionValidation<readonly PartitionRulePlan[]> {
  const plans: PartitionRulePlan[] = [];

  for (const rule of ruleResolution.rules) {
    const orientation = orientationForRule(rule);
    if (orientation === null) {
      return failedConstruction(unsupportedConstructionRule(rule.ruleRef, "Resolved surface partition rule does not declare a supported partition orientation."));
    }

    const positions = positionsForRule(rule);
    if (!positions.ok) {
      return positions;
    }

    if (positions.value.length === 0) {
      return failedConstruction(unsupportedConstructionRule(rule.ruleRef, "Resolved surface partition rule does not declare any internal partition position."));
    }

    plans.push({
      ruleRef: rule.ruleRef,
      orientation,
      positions: positions.value,
      sourceRefs: uniqueSourceRefs([
        ...sourceRefsForRule(rule),
        ...positions.value.flatMap((position) => position.sourceRefs),
      ]),
    });
  }

  return validConstruction(plans);
}

function orientationForRule(rule: ResolvedRule): GuideOrientationV1 | null {
  const declaredAxes: GuideOrientationV1[] = [];
  for (const pattern of rule.partitionPatternRefs) {
    if ((pattern.axis === "vertical" || pattern.axis === "horizontal") && !declaredAxes.includes(pattern.axis)) {
      declaredAxes.push(pattern.axis);
    }
  }
  if (declaredAxes.length === 1) {
    return declaredAxes[0] ?? null;
  }

  if (rule.ruleRef.endsWith("-vertical") || rule.ruleRef.endsWith(".vertical") || rule.ruleRef.endsWith(":vertical")) {
    return "vertical";
  }

  if (rule.ruleRef.endsWith("-horizontal") || rule.ruleRef.endsWith(".horizontal") || rule.ruleRef.endsWith(":horizontal")) {
    return "horizontal";
  }

  return null;
}

function positionsForRule(rule: ResolvedRule): ConstructionValidation<readonly PositionPlan[]> {
  if (rule.sequenceRefs.length > 0) {
    return positionsFromSequences(rule);
  }

  const positions: PositionPlan[] = [];
  for (const ratio of rule.ratioRefs) {
    if (!isInternalNormalizedValue(ratio.normalizedValue)) {
      return failedConstruction(invalidConstruction("ratioRefs", `Resolved ratio position is outside normalized internal bounds: ${ratio.ratioRef}.`));
    }

    positions.push({
      position: ratio.normalizedValue,
      positionRef: `ratio:${ratio.ratioRef}`,
      sourceRefs: uniqueSourceRefs([
        ratio.sourceRef,
        ...rule.partitionPatternRefs
          .filter((pattern) => pattern.ratioRefs.includes(ratio.ratioRef))
          .map((pattern) => pattern.sourceRef),
      ]),
    });
  }

  return validConstruction(uniquePositions(positions));
}

function positionsFromSequences(rule: ResolvedRule): ConstructionValidation<readonly PositionPlan[]> {
  const positions: PositionPlan[] = [];

  for (const sequence of rule.sequenceRefs) {
    if (!sequence.normalizedParts.every(isPositiveFiniteNumber)) {
      return failedConstruction(invalidConstruction("sequenceRefs", `Resolved sequence has non-positive normalized parts: ${sequence.sequenceRef}.`));
    }

    let cumulativePosition = 0;
    for (let index = 0; index < sequence.normalizedParts.length - 1; index += 1) {
      cumulativePosition += sequence.normalizedParts[index] ?? 0;
      if (!isInternalNormalizedValue(cumulativePosition)) {
        return failedConstruction(invalidConstruction("sequenceRefs", `Resolved sequence produces an invalid internal partition position: ${sequence.sequenceRef}.`));
      }

      positions.push({
        position: cumulativePosition,
        positionRef: `sequence:${sequence.sequenceRef}:cut:${index + 1}`,
        sourceRefs: sourceRefsForSequencePosition(rule, sequence, cumulativePosition),
      });
    }
  }

  return validConstruction(uniquePositions(positions));
}

function sourceRefsForSequencePosition(
  rule: ResolvedRule,
  sequence: ResolvedRatioSequenceRef,
  position: number,
): readonly SourceReference[] {
  return uniqueSourceRefs([
    sequence.sourceRef,
    ...rule.partitionPatternRefs
      .filter((pattern) => pattern.sequenceRef === sequence.sequenceRef)
      .map((pattern) => pattern.sourceRef),
    ...rule.ratioRefs
      .filter((ratio) => ratio.normalizedValue === position)
      .map((ratio) => ratio.sourceRef),
  ]);
}

function generateGuides(
  context: ConstructionContext,
  plans: readonly PartitionRulePlan[],
): readonly GuideV1[] {
  const guides: GuideV1[] = [];

  for (const plan of plans) {
    for (const position of plan.positions) {
      const guideRef = `guide:${context.constructionRef}:${plan.ruleRef}:${plan.orientation}:${position.positionRef}`;
      const sourceRefs = uniqueSourceRefs([...plan.sourceRefs, ...position.sourceRefs]);
      guides.push({
        kind: "guide",
        guideRef,
        geometryType: "line",
        orientation: plan.orientation,
        position: position.position,
        segment: segmentForGuide(plan.orientation, position.position),
        inputRef: context.inputRef,
        packRef: context.packRef,
        ruleSetRef: context.ruleSetRef,
        ruleRef: plan.ruleRef,
        operationRef: GENERATE_GUIDES_OPERATION_REF,
        sourceRefs,
        provenance: createObjectProvenance(context, GENERATE_GUIDES_OPERATION_REF, [plan.ruleRef], sourceRefs),
      });
    }
  }

  return guides;
}

function segmentForGuide(orientation: GuideOrientationV1, position: number): Segment {
  if (orientation === "vertical") {
    return {
      kind: "segment",
      start: { kind: "point", x: position, y: 0 },
      end: { kind: "point", x: position, y: 1 },
    };
  }

  return {
    kind: "segment",
    start: { kind: "point", x: 0, y: position },
    end: { kind: "point", x: 1, y: position },
  };
}

function generateZones(context: ConstructionContext, guides: readonly GuideV1[]): readonly ZoneV1[] {
  const zones: ZoneV1[] = [];
  for (const group of guideGroups(guides)) {
    const cuts = [0, ...group.guides.map((guide) => guide.position), 1];
    for (let index = 0; index < cuts.length - 1; index += 1) {
      const start = cuts[index] ?? 0;
      const end = cuts[index + 1] ?? 1;
      const boundingGuideRefs = [
        ...(index > 0 ? [group.guides[index - 1]?.guideRef] : []),
        ...(index < group.guides.length ? [group.guides[index]?.guideRef] : []),
      ].filter((ref): ref is string => typeof ref === "string");
      const sourceRefs = uniqueSourceRefs(group.guides.flatMap((guide) => guide.sourceRefs));

      zones.push({
        kind: "zone",
        zoneRef: `zone:${context.constructionRef}:${group.ruleRef}:${group.orientation}:${index}`,
        partitionAxis: group.orientation,
        bounds: zoneBounds(group.orientation, start, end),
        inputRef: context.inputRef,
        packRef: context.packRef,
        ruleSetRef: context.ruleSetRef,
        ruleRef: group.ruleRef,
        boundingGuideRefs,
        operationRef: GENERATE_ZONES_OPERATION_REF,
        sourceRefs,
        provenance: createObjectProvenance(context, GENERATE_ZONES_OPERATION_REF, [group.ruleRef], sourceRefs),
      });
    }
  }

  return zones;
}

function zoneBounds(orientation: GuideOrientationV1, start: number, end: number): Rect {
  if (orientation === "vertical") {
    return { kind: "rect", x: start, y: 0, width: end - start, height: 1 };
  }

  return { kind: "rect", x: 0, y: start, width: 1, height: end - start };
}

function generateSimpleGrid(context: ConstructionContext, guides: readonly GuideV1[]): readonly GridV1[] {
  const verticalGuides = sortedGuides(guides, "vertical");
  const horizontalGuides = sortedGuides(guides, "horizontal");
  if (verticalGuides.length === 0 || horizontalGuides.length === 0) {
    return [];
  }

  const columnCuts = [0, ...verticalGuides.map((guide) => guide.position), 1];
  const rowCuts = [0, ...horizontalGuides.map((guide) => guide.position), 1];
  const ruleRefs = uniqueStrings([...verticalGuides, ...horizontalGuides].map((guide) => guide.ruleRef));
  const sourceRefs = uniqueSourceRefs([...verticalGuides, ...horizontalGuides].flatMap((guide) => guide.sourceRefs));
  const gridRef = `grid:${context.constructionRef}:surface-partition`;
  const cells: GridCellV1[] = [];

  for (let rowIndex = 0; rowIndex < rowCuts.length - 1; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCuts.length - 1; columnIndex += 1) {
      const bounds = {
        kind: "rect" as const,
        x: columnCuts[columnIndex] ?? 0,
        y: rowCuts[rowIndex] ?? 0,
        width: (columnCuts[columnIndex + 1] ?? 1) - (columnCuts[columnIndex] ?? 0),
        height: (rowCuts[rowIndex + 1] ?? 1) - (rowCuts[rowIndex] ?? 0),
      };
      const boundingGuideRefs = [
        ...(columnIndex > 0 ? [verticalGuides[columnIndex - 1]?.guideRef] : []),
        ...(columnIndex < verticalGuides.length ? [verticalGuides[columnIndex]?.guideRef] : []),
        ...(rowIndex > 0 ? [horizontalGuides[rowIndex - 1]?.guideRef] : []),
        ...(rowIndex < horizontalGuides.length ? [horizontalGuides[rowIndex]?.guideRef] : []),
      ].filter((ref): ref is string => typeof ref === "string");

      cells.push({
        kind: "grid-cell",
        cellRef: `grid-cell:${gridRef}:row-${rowIndex}:column-${columnIndex}`,
        gridRef,
        rowIndex,
        columnIndex,
        bounds,
        boundingGuideRefs,
        inputRef: context.inputRef,
        packRef: context.packRef,
        ruleSetRef: context.ruleSetRef,
        ruleRefs,
        operationRef: GENERATE_GRID_OPERATION_REF,
        sourceRefs,
        provenance: createObjectProvenance(context, GENERATE_GRID_OPERATION_REF, ruleRefs, sourceRefs),
      });
    }
  }

  return [{
    kind: "grid",
    gridRef,
    inputRef: context.inputRef,
    packRef: context.packRef,
    ruleSetRef: context.ruleSetRef,
    ruleRefs,
    rowCount: horizontalGuides.length + 1,
    columnCount: verticalGuides.length + 1,
    rowGuideRefs: horizontalGuides.map((guide) => guide.guideRef),
    columnGuideRefs: verticalGuides.map((guide) => guide.guideRef),
    cells,
    operationRef: GENERATE_GRID_OPERATION_REF,
    sourceRefs,
    provenance: createObjectProvenance(context, GENERATE_GRID_OPERATION_REF, ruleRefs, sourceRefs),
  }];
}

function deriveIntersections(context: ConstructionContext, guides: readonly GuideV1[]): readonly IntersectionPointV1[] {
  const verticalGuides = sortedGuides(guides, "vertical");
  const horizontalGuides = sortedGuides(guides, "horizontal");
  const intersections: IntersectionPointV1[] = [];

  for (const verticalGuide of verticalGuides) {
    for (const horizontalGuide of horizontalGuides) {
      intersections.push(createIntersection(context, [verticalGuide, horizontalGuide], {
        kind: "point",
        x: verticalGuide.position,
        y: horizontalGuide.position,
      }, [verticalGuide.guideRef, horizontalGuide.guideRef]));
    }
  }

  for (const guide of verticalGuides) {
    intersections.push(createIntersection(context, [guide], { kind: "point", x: guide.position, y: 0 }, [
      guide.guideRef,
      `surface-boundary:${context.inputRef}:bottom`,
    ]));
    intersections.push(createIntersection(context, [guide], { kind: "point", x: guide.position, y: 1 }, [
      guide.guideRef,
      `surface-boundary:${context.inputRef}:top`,
    ]));
  }

  for (const guide of horizontalGuides) {
    intersections.push(createIntersection(context, [guide], { kind: "point", x: 0, y: guide.position }, [
      guide.guideRef,
      `surface-boundary:${context.inputRef}:left`,
    ]));
    intersections.push(createIntersection(context, [guide], { kind: "point", x: 1, y: guide.position }, [
      guide.guideRef,
      `surface-boundary:${context.inputRef}:right`,
    ]));
  }

  return intersections;
}

function createIntersection(
  context: ConstructionContext,
  guides: readonly GuideV1[],
  point: Point,
  sourceGeometryRefs: readonly string[],
): IntersectionPointV1 {
  const ruleRefs = uniqueStrings(guides.map((guide) => guide.ruleRef));
  const sourceRefs = uniqueSourceRefs(guides.flatMap((guide) => guide.sourceRefs));

  return {
    kind: "intersection-point",
    intersectionRef: `intersection:${sourceGeometryRefs.join("&")}`,
    point,
    sourceGeometryRefs,
    inputRef: context.inputRef,
    packRef: context.packRef,
    ruleSetRef: context.ruleSetRef,
    ruleRefs,
    operationRef: DERIVE_INTERSECTIONS_OPERATION_REF,
    sourceRefs,
    provenance: createObjectProvenance(context, DERIVE_INTERSECTIONS_OPERATION_REF, ruleRefs, sourceRefs),
  };
}

function createConstructionOutput(
  context: ConstructionContext,
  ruleResolution: RuleResolutionV1,
  guides: readonly GuideV1[],
  zones: readonly ZoneV1[],
  grids: readonly GridV1[],
  intersections: readonly IntersectionPointV1[],
  sourceRefs: readonly SourceReference[],
): ConstructionV1 {
  const appliedRuleRefs = [...ruleResolution.ruleRefs];

  return {
    kind: "construction",
    schemaVersion: CONSTRUCTION_V1_SCHEMA_VERSION,
    constructionRef: context.constructionRef,
    inputRef: context.inputRef,
    packRef: context.packRef,
    ruleSetRef: context.ruleSetRef,
    contentIdentity: ruleResolution.contentIdentity,
    appliedRuleRefs,
    guides,
    zones,
    grids,
    intersections,
    constructionTrace: createConstructionTrace(appliedRuleRefs, context.constructionRef, guides, zones, grids, intersections),
    measurementRefs: [],
    evaluationRefs: [],
    scoringRefs: [],
    artifactRefs: [],
    sourceRefs,
    provenance: createConstructionProvenance("core.construction-v1.generate", [
      { kind: "geometry", ref: context.inputRef },
      { kind: "ratio-pack", ref: context.packRef },
      { kind: "rule-set", ref: context.ruleSetRef },
      ...appliedRuleRefs.map((ruleRef) => ({ kind: "rule-declaration", ref: ruleRef })),
      ...sourceRefs,
    ]),
  };
}

function createConstructionTrace(
  appliedRuleRefs: readonly string[],
  constructionRef: string,
  guides: readonly GuideV1[],
  zones: readonly ZoneV1[],
  grids: readonly GridV1[],
  intersections: readonly IntersectionPointV1[],
): ConstructionTraceV1 {
  const gridObjectRefs = grids.flatMap((grid) => [grid.gridRef, ...grid.cells.map((cell) => cell.cellRef)]);
  const createdObjectRefs = [
    constructionRef,
    ...guides.map((guide) => guide.guideRef),
    ...zones.map((zone) => zone.zoneRef),
    ...gridObjectRefs,
    ...intersections.map((intersection) => intersection.intersectionRef),
  ];

  return {
    kind: "construction-trace",
    appliedRuleRefs,
    operationRefs: [...CONSTRUCTION_OPERATION_REFS],
    createdObjectRefs,
    entries: [
      {
        kind: "construction-trace-entry",
        operationRef: GENERATE_GUIDES_OPERATION_REF,
        ruleRefs: uniqueStrings(guides.map((guide) => guide.ruleRef)),
        createdObjectRefs: guides.map((guide) => guide.guideRef),
        warnings: [],
      },
      {
        kind: "construction-trace-entry",
        operationRef: GENERATE_ZONES_OPERATION_REF,
        ruleRefs: uniqueStrings(zones.map((zone) => zone.ruleRef)),
        createdObjectRefs: zones.map((zone) => zone.zoneRef),
        warnings: [],
      },
      {
        kind: "construction-trace-entry",
        operationRef: GENERATE_GRID_OPERATION_REF,
        ruleRefs: uniqueStrings(grids.flatMap((grid) => grid.ruleRefs)),
        createdObjectRefs: gridObjectRefs,
        warnings: [],
      },
      {
        kind: "construction-trace-entry",
        operationRef: DERIVE_INTERSECTIONS_OPERATION_REF,
        ruleRefs: uniqueStrings(intersections.flatMap((intersection) => intersection.ruleRefs)),
        createdObjectRefs: intersections.map((intersection) => intersection.intersectionRef),
        warnings: [],
      },
    ],
    warnings: [],
  };
}

function validateConstructionValue(value: unknown): ConstructionValidation<ConstructionV1> {
  if (!isRecord(value)) {
    return failedConstruction(invalidConstruction("construction", "Construction V1 input must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(value, CONSTRUCTION_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedConstruction(invalidConstruction(unsupportedField, `Construction V1 field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "construction" || value.schemaVersion !== CONSTRUCTION_V1_SCHEMA_VERSION) {
    return failedConstruction(invalidConstruction("schemaVersion", "Construction V1 kind and schemaVersion are required."));
  }

  if ([value.constructionRef, value.inputRef, value.packRef, value.ruleSetRef, value.contentIdentity].some((item) => nonEmptyString(item) === null)) {
    return failedConstruction(invalidConstruction("construction", "Construction V1 requires identity, input, pack, rule-set, and content refs."));
  }

  if (!isNonEmptyStringArray(value.appliedRuleRefs)) {
    return failedConstruction(invalidConstruction("appliedRuleRefs", "Construction V1 requires non-empty appliedRuleRefs."));
  }

  if (![value.measurementRefs, value.evaluationRefs, value.scoringRefs, value.artifactRefs].every(isEmptyArray)) {
    return failedConstruction(invalidConstruction("outputRefs", "Construction V1 future PR output refs must remain empty."));
  }

  if (!isSourceReferenceArray(value.sourceRefs) || !isProvenance(value.provenance)) {
    return failedConstruction(invalidConstruction("provenance", "Construction V1 requires valid source refs and provenance."));
  }

  if (!hasConstructionProvenance(value as unknown as ConstructionV1)) {
    return failedConstruction(invalidConstruction("provenance", "Construction V1 provenance must reference input, pack, rule set, and applied rules."));
  }

  if (!Array.isArray(value.guides) || !value.guides.every(isGuide)) {
    return failedConstruction(invalidConstruction("guides", "Construction V1 guides are invalid."));
  }

  if (!Array.isArray(value.zones) || !value.zones.every(isZone)) {
    return failedConstruction(invalidConstruction("zones", "Construction V1 zones are invalid."));
  }

  if (!Array.isArray(value.grids) || !value.grids.every(isGrid)) {
    return failedConstruction(invalidConstruction("grids", "Construction V1 grids are invalid."));
  }

  if (!Array.isArray(value.intersections) || !value.intersections.every(isIntersection)) {
    return failedConstruction(invalidConstruction("intersections", "Construction V1 intersections are invalid."));
  }

  if (!nestedObjectsAreTraceable(value as unknown as ConstructionV1)) {
    return failedConstruction(invalidConstruction("provenance", "Construction V1 derived object provenance is incomplete."));
  }

  const objectRefs = collectConstructionObjectRefs(value as unknown as ConstructionV1);
  if (uniqueStrings(objectRefs).length !== objectRefs.length) {
    return failedConstruction(invalidConstruction("constructionRefs", "Construction V1 object refs must be unique."));
  }

  if (!isConstructionTrace(value.constructionTrace, objectRefs, value.appliedRuleRefs)) {
    return failedConstruction(invalidConstruction("constructionTrace", "Construction V1 trace is invalid or incomplete."));
  }

  return validConstruction(value as unknown as ConstructionV1);
}

function isGuide(value: unknown): value is GuideV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, GUIDE_ALLOWED_KEYS) === null
    && value.kind === "guide"
    && nonEmptyString(value.guideRef) !== null
    && value.geometryType === "line"
    && isGuideOrientation(value.orientation)
    && isInternalNormalizedValue(value.position)
    && isSegment(value.segment)
    && segmentMatchesGuide(value.segment, value.orientation, value.position)
    && hasConstructionObjectIdentity(value)
    && nonEmptyString(value.ruleRef) !== null
    && value.operationRef === GENERATE_GUIDES_OPERATION_REF
    && isSourceReferenceArray(value.sourceRefs)
    && value.sourceRefs.length > 0
    && isProvenance(value.provenance);
}

function isZone(value: unknown): value is ZoneV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, ZONE_ALLOWED_KEYS) === null
    && value.kind === "zone"
    && nonEmptyString(value.zoneRef) !== null
    && isGuideOrientation(value.partitionAxis)
    && isRect(value.bounds)
    && normalizedRectInsideSurface(value.bounds)
    && hasConstructionObjectIdentity(value)
    && nonEmptyString(value.ruleRef) !== null
    && isStringArray(value.boundingGuideRefs)
    && value.operationRef === GENERATE_ZONES_OPERATION_REF
    && isSourceReferenceArray(value.sourceRefs)
    && value.sourceRefs.length > 0
    && isProvenance(value.provenance);
}

function isGrid(value: unknown): value is GridV1 {
  if (!isRecord(value)) {
    return false;
  }

  const gridRef = nonEmptyString(value.gridRef);
  const rowCount = value.rowCount;
  const columnCount = value.columnCount;

  if (!isRecord(value)
    || firstUnsupportedKey(value, GRID_ALLOWED_KEYS) !== null
    || value.kind !== "grid"
    || gridRef === null
    || !hasConstructionObjectIdentity(value)
    || !isNonEmptyStringArray(value.ruleRefs)
    || !isPositiveInteger(rowCount)
    || !isPositiveInteger(columnCount)
    || !isStringArray(value.rowGuideRefs)
    || !isStringArray(value.columnGuideRefs)
    || value.operationRef !== GENERATE_GRID_OPERATION_REF
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)
    || !Array.isArray(value.cells)
    || value.cells.length !== rowCount * columnCount) {
    return false;
  }

  return value.cells.every((cell) => isGridCell(cell, gridRef, rowCount, columnCount));
}

function isGridCell(
  value: unknown,
  gridRef: string,
  rowCount: number,
  columnCount: number,
): value is GridCellV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, GRID_CELL_ALLOWED_KEYS) === null
    && value.kind === "grid-cell"
    && nonEmptyString(value.cellRef) !== null
    && value.gridRef === gridRef
    && isIntegerInRange(value.rowIndex, 0, rowCount - 1)
    && isIntegerInRange(value.columnIndex, 0, columnCount - 1)
    && isRect(value.bounds)
    && normalizedRectInsideSurface(value.bounds)
    && isStringArray(value.boundingGuideRefs)
    && value.boundingGuideRefs.length > 0
    && hasConstructionObjectIdentity(value)
    && isNonEmptyStringArray(value.ruleRefs)
    && value.operationRef === GENERATE_GRID_OPERATION_REF
    && isSourceReferenceArray(value.sourceRefs)
    && value.sourceRefs.length > 0
    && isProvenance(value.provenance);
}

function isIntersection(value: unknown): value is IntersectionPointV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, INTERSECTION_ALLOWED_KEYS) === null
    && value.kind === "intersection-point"
    && nonEmptyString(value.intersectionRef) !== null
    && isPoint2D(value.point)
    && isNormalizedValue(value.point.x)
    && value.point.y !== undefined
    && isNormalizedValue(value.point.y)
    && isStringArray(value.sourceGeometryRefs)
    && value.sourceGeometryRefs.length >= 2
    && hasConstructionObjectIdentity(value)
    && isNonEmptyStringArray(value.ruleRefs)
    && value.operationRef === DERIVE_INTERSECTIONS_OPERATION_REF
    && isSourceReferenceArray(value.sourceRefs)
    && value.sourceRefs.length > 0
    && isProvenance(value.provenance);
}

function hasConstructionObjectIdentity(value: Record<string, unknown>): boolean {
  return nonEmptyString(value.inputRef) !== null
    && nonEmptyString(value.packRef) !== null
    && nonEmptyString(value.ruleSetRef) !== null
    && nonEmptyString(value.operationRef) !== null;
}

function nestedObjectsAreTraceable(construction: ConstructionV1): boolean {
  const allObjects = [
    ...construction.guides.map((guide) => ({ value: guide, ruleRefs: [guide.ruleRef] })),
    ...construction.zones.map((zone) => ({ value: zone, ruleRefs: [zone.ruleRef] })),
    ...construction.grids.map((grid) => ({ value: grid, ruleRefs: grid.ruleRefs })),
    ...construction.grids.flatMap((grid) => grid.cells.map((cell) => ({ value: cell, ruleRefs: cell.ruleRefs }))),
    ...construction.intersections.map((intersection) => ({ value: intersection, ruleRefs: intersection.ruleRefs })),
  ];

  return allObjects.every(({ value, ruleRefs }) => hasObjectProvenance(value, ruleRefs));
}

function hasConstructionProvenance(construction: ConstructionV1): boolean {
  return sourceReferenceIncludes(construction.provenance.inputRefs, { kind: "geometry", ref: construction.inputRef })
    && sourceReferenceIncludes(construction.provenance.inputRefs, { kind: "ratio-pack", ref: construction.packRef })
    && sourceReferenceIncludes(construction.provenance.inputRefs, { kind: "rule-set", ref: construction.ruleSetRef })
    && construction.appliedRuleRefs.every((ruleRef) =>
      sourceReferenceIncludes(construction.provenance.inputRefs, { kind: "rule-declaration", ref: ruleRef })
    );
}

function hasObjectProvenance(
  value: GuideV1 | ZoneV1 | GridV1 | GridCellV1 | IntersectionPointV1,
  ruleRefs: readonly string[],
): boolean {
  return sourceReferenceIncludes(value.provenance.inputRefs, { kind: "geometry", ref: value.inputRef })
    && sourceReferenceIncludes(value.provenance.inputRefs, { kind: "ratio-pack", ref: value.packRef })
    && sourceReferenceIncludes(value.provenance.inputRefs, { kind: "rule-set", ref: value.ruleSetRef })
    && sourceReferenceIncludes(value.provenance.inputRefs, { kind: "construction-operation", ref: value.operationRef })
    && ruleRefs.every((ruleRef) =>
      sourceReferenceIncludes(value.provenance.inputRefs, { kind: "rule-declaration", ref: ruleRef })
    );
}

function isConstructionTrace(
  value: unknown,
  objectRefs: readonly string[],
  appliedRuleRefs: readonly string[],
): value is ConstructionTraceV1 {
  if (!isRecord(value)) {
    return false;
  }

  const operationRefs = value.operationRefs;
  const createdObjectRefs = value.createdObjectRefs;

  if (!isRecord(value)
    || firstUnsupportedKey(value, TRACE_ALLOWED_KEYS) !== null
    || value.kind !== "construction-trace"
    || !sameStringArray(value.appliedRuleRefs, appliedRuleRefs)
    || !isStringArray(operationRefs)
    || !sameStringArray(operationRefs, CONSTRUCTION_OPERATION_REFS)
    || !isStringArray(createdObjectRefs)
    || !sameStringSet(createdObjectRefs, objectRefs)
    || createdObjectRefs.length !== objectRefs.length
    || !Array.isArray(value.entries)
    || !isStringArray(value.warnings)) {
    return false;
  }

  return value.entries.every((entry) => isConstructionTraceEntry(entry, operationRefs, createdObjectRefs));
}

function isConstructionTraceEntry(
  value: unknown,
  operationRefs: readonly string[],
  createdObjectRefs: readonly string[],
): value is ConstructionTraceEntryV1 {
  if (!isRecord(value)) {
    return false;
  }

  const operationRef = nonEmptyString(value.operationRef);

  return isRecord(value)
    && firstUnsupportedKey(value, TRACE_ENTRY_ALLOWED_KEYS) === null
    && value.kind === "construction-trace-entry"
    && operationRef !== null
    && operationRefs.includes(operationRef)
    && isStringArray(value.ruleRefs)
    && isStringArray(value.createdObjectRefs)
    && value.createdObjectRefs.every((ref) => createdObjectRefs.includes(ref))
    && isStringArray(value.warnings);
}

function collectConstructionObjectRefs(construction: ConstructionV1): readonly string[] {
  return [
    construction.constructionRef,
    ...construction.guides.map((guide) => guide.guideRef),
    ...construction.zones.map((zone) => zone.zoneRef),
    ...construction.grids.flatMap((grid) => [
      grid.gridRef,
      ...grid.cells.map((cell) => cell.cellRef),
    ]),
    ...construction.intersections.map((intersection) => intersection.intersectionRef),
  ];
}

function guideGroups(guides: readonly GuideV1[]): readonly {
  ruleRef: string;
  orientation: GuideOrientationV1;
  guides: readonly GuideV1[];
}[] {
  const groups: {
    ruleRef: string;
    orientation: GuideOrientationV1;
    guides: GuideV1[];
  }[] = [];

  for (const guide of guides) {
    const existing = groups.find((group) => group.ruleRef === guide.ruleRef && group.orientation === guide.orientation);
    if (existing === undefined) {
      groups.push({ ruleRef: guide.ruleRef, orientation: guide.orientation, guides: [guide] });
    } else {
      existing.guides.push(guide);
    }
  }

  return groups.map((group) => ({
    ...group,
    guides: [...group.guides].sort((first, second) => first.position - second.position || first.guideRef.localeCompare(second.guideRef)),
  }));
}

function sortedGuides(guides: readonly GuideV1[], orientation: GuideOrientationV1): readonly GuideV1[] {
  return guides
    .filter((guide) => guide.orientation === orientation)
    .sort((first, second) => first.position - second.position || first.guideRef.localeCompare(second.guideRef));
}

function sourceRefsForRule(rule: ResolvedRule): readonly SourceReference[] {
  return uniqueSourceRefs([
    ...rule.ratioRefs.map((ratio) => ratio.sourceRef),
    ...rule.sequenceRefs.map((sequence) => sequence.sourceRef),
    ...rule.partitionPatternRefs.map((pattern) => pattern.sourceRef),
  ]);
}

function uniquePositions(positions: readonly PositionPlan[]): readonly PositionPlan[] {
  const seenPositions = new Set<number>();
  const unique: PositionPlan[] = [];

  for (const position of positions) {
    if (!seenPositions.has(position.position)) {
      seenPositions.add(position.position);
      unique.push(position);
    }
  }

  return unique.sort((first, second) => first.position - second.position || first.positionRef.localeCompare(second.positionRef));
}

function createObjectProvenance(
  context: ConstructionContext,
  operationRef: string,
  ruleRefs: readonly string[],
  sourceRefs: readonly SourceReference[],
): Provenance {
  return createConstructionProvenance(operationRef, [
    { kind: "geometry", ref: context.inputRef },
    { kind: "ratio-pack", ref: context.packRef },
    { kind: "rule-set", ref: context.ruleSetRef },
    ...ruleRefs.map((ruleRef) => ({ kind: "rule-declaration", ref: ruleRef })),
    { kind: "construction-operation", ref: operationRef },
    ...sourceRefs,
  ]);
}

function createConstructionResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createConstructionError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: CONSTRUCTION_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };

  return {
    code: diagnostic.code,
    severity: errorSeverity(diagnostic.severity),
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: true,
    provenance: diagnostic.provenance,
  };
}

function createConstructionProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: CONSTRUCTION_OPERATION_VERSION,
    inputRefs: uniqueSourceRefs(inputRefs),
    source: CONSTRUCTION_SOURCE_REFERENCE,
  };
}

function invalidConstruction(targetRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "InvalidConstructionV1",
        message,
        targetRef,
      }),
    ],
  });
}

function unsupportedConstructionRule(ruleRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "UnsupportedConstructionRule",
        message,
        targetRef: `rules.${ruleRef}`,
        sourceRef: { kind: "rule-declaration", ref: ruleRef },
      }),
    ],
  });
}

function missingConstructionInput(targetRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "MissingConstructionInput",
        message,
        targetRef,
      }),
    ],
  });
}

function validConstruction<TValue>(value: TValue): ConstructionValidation<TValue> {
  return { ok: true, value };
}

function failedConstruction(result: CoreResult): ConstructionValidation<never> {
  return { ok: false, result };
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function firstUnsupportedKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function isGuideOrientation(value: unknown): value is GuideOrientationV1 {
  return value === "vertical" || value === "horizontal";
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && firstUnsupportedKey(value, SOURCE_REFERENCE_ALLOWED_KEYS) === null
    && nonEmptyString(value.kind) !== null
    && nonEmptyString(value.ref) !== null;
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isProvenance(value: unknown): value is Provenance {
  return isRecord(value)
    && firstUnsupportedKey(value, PROVENANCE_ALLOWED_KEYS) === null
    && nonEmptyString(value.operationName) !== null
    && nonEmptyString(value.operationVersion) !== null
    && isSourceReferenceArray(value.inputRefs)
    && isSourceReference(value.source);
}

function isPoint2D(value: unknown): value is Point {
  return isRecord(value)
    && firstUnsupportedKey(value, POINT_ALLOWED_KEYS) === null
    && value.kind === "point"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y);
}

function isPoint(value: unknown): value is Point {
  return isRecord(value)
    && firstUnsupportedKey(value, POINT_ALLOWED_KEYS) === null
    && value.kind === "point"
    && isFiniteNumber(value.x)
    && (value.y === undefined || isFiniteNumber(value.y));
}

function isSegment(value: unknown): value is Segment {
  return isRecord(value)
    && firstUnsupportedKey(value, SEGMENT_ALLOWED_KEYS) === null
    && value.kind === "segment"
    && isPoint(value.start)
    && isPoint(value.end);
}

function segmentMatchesGuide(segment: Segment, orientation: GuideOrientationV1, position: number): boolean {
  if (orientation === "vertical") {
    return segment.start.x === position
      && segment.start.y === 0
      && segment.end.x === position
      && segment.end.y === 1;
  }

  return segment.start.x === 0
    && segment.start.y === position
    && segment.end.x === 1
    && segment.end.y === position;
}

function isRect(value: unknown): value is Rect {
  return isRecord(value)
    && firstUnsupportedKey(value, RECT_ALLOWED_KEYS) === null
    && value.kind === "rect"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isPositiveFiniteNumber(value.width)
    && isPositiveFiniteNumber(value.height);
}

function normalizedRectInsideSurface(rect: Rect): boolean {
  return [rect.x, rect.y, rect.width, rect.height, rect.x + rect.width, rect.y + rect.height].every(isNormalizedValue);
}

function isEmptyArray(value: unknown): value is readonly never[] {
  return Array.isArray(value) && value.length === 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => nonEmptyString(item) !== null);
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return isStringArray(value) && value.length > 0;
}

function sameStringArray(value: unknown, expected: readonly string[]): boolean {
  return isStringArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]);
}

function sameStringSet(first: readonly string[], second: readonly string[]): boolean {
  const firstSet = new Set(first);
  const secondSet = new Set(second);
  return firstSet.size === secondSet.size && [...firstSet].every((item) => secondSet.has(item));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function uniqueSourceRefs(values: readonly SourceReference[]): SourceReference[] {
  const seenRefs = new Set<string>();
  const uniqueRefs: SourceReference[] = [];

  for (const value of values) {
    const key = `${value.kind}:${value.ref}`;
    if (!seenRefs.has(key)) {
      seenRefs.add(key);
      uniqueRefs.push(value);
    }
  }

  return uniqueRefs;
}

function sourceReferenceIncludes(values: readonly SourceReference[], expected: SourceReference): boolean {
  return values.some((value) => value.kind === expected.kind && value.ref === expected.ref);
}

function isInternalNormalizedValue(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0 && value < 1;
}

function isNormalizedValue(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= minimum && value <= maximum;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
