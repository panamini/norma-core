import type {
  CoordinateSystem,
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  MetricPolicy,
  OperationContextRef,
  OperationStatus,
  PackLockRef,
  Point,
  Provenance,
  Rect,
  SourceReference,
  SurfaceSpace,
  TolerancePolicy,
} from "./index.js";
import type {
  Ratio,
  RatioPack,
  RatioSequence,
} from "./ratio-pack.js";
import {
  readRatioFromPack,
  readRatioSequenceFromPack,
  validateRatioPackV1,
} from "./ratio-pack.js";
import type {
  ResolvedRuleSet,
  Rule,
  RuleType,
} from "./rules.js";

export type GuideAxis = "x" | "y";
export type GuideOrientation = "vertical" | "horizontal";
export type ZoneAxis = "vertical" | "horizontal";
export type IntersectionKind = "guide-guide" | "guide-border" | "diagonal-diagonal";

export interface ConstructionObjectProvenance {
  kind: "construction-provenance";
  inputRef: string;
  packRef: string;
  ruleRef: string;
  operationRef: string;
  sourceRefs: readonly SourceReference[];
}

export interface Guide {
  kind: "guide";
  id: string;
  axis: GuideAxis;
  orientation: GuideOrientation;
  normalizedPosition: number;
  position: number;
  ratioRef: string;
  ruleRef: string;
  operationRef: string;
  provenance: ConstructionObjectProvenance;
}

export interface Zone {
  kind: "zone";
  id: string;
  axis: ZoneAxis;
  index: number;
  normalizedBounds: Rect;
  bounds: Rect;
  sourceGuideRefs: readonly string[];
  ruleRef: string;
  operationRef: string;
  provenance: ConstructionObjectProvenance;
}

export interface GridCell {
  kind: "grid-cell";
  id: string;
  rowIndex: number;
  columnIndex: number;
  normalizedBounds: Rect;
  bounds: Rect;
  sourceGridRef: string;
  sourceGuideRefs: readonly string[];
  ruleRef: string;
  operationRef: string;
  provenance: ConstructionObjectProvenance;
}

export interface Grid {
  kind: "grid";
  id: string;
  rows: number;
  columns: number;
  sourceSequenceRef: string;
  sourcePartitionPatternRefs: readonly string[];
  cells: readonly GridCell[];
  ruleRef: string;
  operationRef: string;
  provenance: ConstructionObjectProvenance;
}

export interface Diagonal {
  kind: "diagonal";
  id: string;
  normalizedStart: Point;
  normalizedEnd: Point;
  start: Point;
  end: Point;
  sourceSurfaceRef: string;
  ruleRef: string;
  operationRef: string;
  provenance: ConstructionObjectProvenance;
}

export interface IntersectionPoint {
  kind: "intersection-point";
  id: string;
  intersectionKind: IntersectionKind;
  normalizedPoint: Point;
  point: Point;
  sourceObjectRefs: readonly SourceReference[];
  ruleRef: string;
  operationRef: string;
  provenance: ConstructionObjectProvenance;
}

export interface ConstructionRuleApplicationTrace {
  ruleRef: string;
  operationRef: string;
  createdObjectRefs: readonly SourceReference[];
}

export interface ConstructionTrace {
  kind: "construction-trace";
  id: string;
  appliedRuleRefs: readonly string[];
  operationRefs: readonly string[];
  createdObjectRefs: readonly SourceReference[];
  ruleApplications: readonly ConstructionRuleApplicationTrace[];
  warnings: readonly CoreWarning[];
  provenance: ConstructionObjectProvenance;
}

export interface Construction {
  kind: "construction";
  id: string;
  sourceGeometryRef: SourceReference;
  packRef: string;
  ruleSetRef: string;
  coordinateSystem: CoordinateSystem;
  metricPolicy: MetricPolicy | null;
  tolerancePolicy: TolerancePolicy | null;
  guides: readonly Guide[];
  zones: readonly Zone[];
  grid: Grid;
  diagonals: readonly Diagonal[];
  intersections: readonly IntersectionPoint[];
  constructionTrace: ConstructionTrace;
  warnings: readonly CoreWarning[];
  provenance: ConstructionObjectProvenance;
}

export interface ConstructionGenerationContext {
  surface: SurfaceSpace;
  pack: RatioPack;
  resolvedRuleSet: ResolvedRuleSet;
}

export interface GenerateConstructionInput {
  surface?: unknown;
  pack?: unknown;
  resolvedRuleSet?: unknown;
  operationContextRef?: OperationContextRef | null;
}

interface DiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
  blocking?: boolean;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

type ConstructionValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult<TValue>;
    };

type ConstructionStep<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult;
    };

interface ResolvedRuleRatio {
  ratioRef: string;
  ratio: Ratio;
  normalizedValue: number;
}

interface ConstructionObject {
  kind: string;
  id: string;
  provenance: ConstructionObjectProvenance;
}

const CONSTRUCTION_OPERATION_VERSION = "0.1.0";
const CONSTRUCTION_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/construction-v1",
});

const GENERATE_CONSTRUCTION_OPERATION = "core.construction-v1.generate";
const GENERATE_GUIDES_OPERATION = "core.construction-v1.guides.generate";
const GENERATE_ZONES_OPERATION = "core.construction-v1.zones.generate";
const GENERATE_GRID_OPERATION = "core.construction-v1.grid.generate";
const GENERATE_DIAGONALS_OPERATION = "core.construction-v1.diagonals.generate";
const DERIVE_INTERSECTIONS_OPERATION = "core.construction-v1.intersections.derive";

const REQUIRED_CONSTRUCTION_RULE_TYPES = [
  "divideSurfaceVertical",
  "divideSurfaceHorizontal",
  "createGuidesFromCandidates",
  "createSimpleGrid",
  "createDiagonals",
  "deriveIntersections",
] as const satisfies readonly RuleType[];

const CONSTRUCTION_RULE_TYPES = new Set<RuleType>(REQUIRED_CONSTRUCTION_RULE_TYPES);

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

const CONSTRUCTION_UNSUPPORTED_GEOMETRY_KINDS = [
  "3d",
  "cad-object",
  "curve",
  "image",
  "native-layer",
  "plugin-object",
  "polygon",
] as const;

const CONSTRUCTION_UNSUPPORTED_GEOMETRY_FIELDS = [
  "angle",
  "cadObject",
  "color",
  "curve",
  "depth",
  "font",
  "image",
  "imageRef",
  "layer",
  "nativeLayer",
  "path",
  "pluginObject",
  "rotation",
  "source",
  "src",
  "style",
  "transform",
  "z",
] as const;

export function generateConstruction(input: GenerateConstructionInput | null | undefined): CoreResult<Construction> {
  const contextValidation = validateConstructionInput(input);
  if (!contextValidation.ok) {
    return resultAs<Construction>(contextValidation.result);
  }

  const context = contextValidation.value;
  const requiredRulesFailure = requiredConstructionRulesFailure(context.resolvedRuleSet);
  if (requiredRulesFailure !== null) {
    return resultAs<Construction>(requiredRulesFailure);
  }

  const guidesResult = generateGuides(context);
  if (guidesResult.status !== "ok" || guidesResult.output === null) {
    return resultAs<Construction>(guidesResult);
  }

  const zonesResult = generateZonesFromGuides(context, guidesResult.output);
  if (zonesResult.status !== "ok" || zonesResult.output === null) {
    return resultAs<Construction>(zonesResult);
  }

  const gridResult = generateSimpleGrid(context);
  if (gridResult.status !== "ok" || gridResult.output === null) {
    return resultAs<Construction>(gridResult);
  }

  const diagonalsResult = generateDiagonals(context);
  if (diagonalsResult.status !== "ok" || diagonalsResult.output === null) {
    return resultAs<Construction>(diagonalsResult);
  }

  const intersectionsResult = deriveIntersectionsFromObjects(context, guidesResult.output, diagonalsResult.output);
  if (intersectionsResult.status !== "ok" || intersectionsResult.output === null) {
    return resultAs<Construction>(intersectionsResult);
  }

  const constructionId = `construction:${context.surface.id}:${context.resolvedRuleSet.ruleSetRef}`;
  const constructionProvenance = createObjectProvenance(
    context,
    context.resolvedRuleSet.ruleSetRef,
    GENERATE_CONSTRUCTION_OPERATION,
    [
      sourceSurfaceRef(context.surface),
      { kind: "ratio-pack", ref: context.resolvedRuleSet.provenance.packRef },
      { kind: "resolved-rule-set", ref: context.resolvedRuleSet.ruleSetRef },
    ],
  );
  const constructionObjects = [
    { kind: "construction", id: constructionId, provenance: constructionProvenance },
    ...guidesResult.output,
    ...zonesResult.output,
    gridResult.output,
    ...gridResult.output.cells,
    ...diagonalsResult.output,
    ...intersectionsResult.output,
  ];
  const constructionTrace = createConstructionTrace(context, constructionObjects, [
    ...guidesResult.warnings,
    ...zonesResult.warnings,
    ...gridResult.warnings,
    ...diagonalsResult.warnings,
    ...intersectionsResult.warnings,
  ]);

  const construction: Construction = {
    kind: "construction",
    id: constructionId,
    sourceGeometryRef: sourceSurfaceRef(context.surface),
    packRef: context.resolvedRuleSet.provenance.packRef,
    ruleSetRef: context.resolvedRuleSet.ruleSetRef,
    coordinateSystem: context.surface.coordinateSystem,
    metricPolicy: context.surface.metricPolicy ?? null,
    tolerancePolicy: context.surface.tolerancePolicy ?? null,
    guides: guidesResult.output,
    zones: zonesResult.output,
    grid: gridResult.output,
    diagonals: diagonalsResult.output,
    intersections: intersectionsResult.output,
    constructionTrace,
    warnings: constructionTrace.warnings,
    provenance: constructionProvenance,
  };

  const gateFailure = constructionGateFailure(construction);
  if (gateFailure !== null) {
    return gateFailure;
  }

  return createConstructionResult({
    status: "ok",
    warnings: construction.warnings,
    provenance: createCoreProvenance(GENERATE_CONSTRUCTION_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "ratio-pack", ref: context.resolvedRuleSet.provenance.packRef },
      { kind: "resolved-rule-set", ref: context.resolvedRuleSet.ruleSetRef },
    ]),
    outputRefs: constructionTrace.createdObjectRefs,
    packLockRef: { id: context.pack.preLock.ref },
    operationContextRef: input?.operationContextRef ?? null,
    output: construction,
  });
}

export function generateGuides(input: GenerateConstructionInput | ConstructionGenerationContext): CoreResult<readonly Guide[]> {
  const contextValidation = validateConstructionInput(input);
  if (!contextValidation.ok) {
    return resultAs<readonly Guide[]>(contextValidation.result);
  }

  const context = contextValidation.value;
  const guides: Guide[] = [];

  for (const rule of context.resolvedRuleSet.orderedRules) {
    if (rule.type === "divideSurfaceVertical") {
      const ratioStep = ratioValuesForRule(context.pack, rule);
      if (!ratioStep.ok) {
        return resultAs<readonly Guide[]>(ratioStep.result);
      }
      guides.push(...ratioStep.value.map((ratio) => createGuide(context, rule, ratio, "x")));
    }

    if (rule.type === "divideSurfaceHorizontal") {
      const ratioStep = ratioValuesForRule(context.pack, rule);
      if (!ratioStep.ok) {
        return resultAs<readonly Guide[]>(ratioStep.result);
      }
      guides.push(...ratioStep.value.map((ratio) => createGuide(context, rule, ratio, "y")));
    }

    if (rule.type === "createGuidesFromCandidates") {
      const ratioStep = ratioValuesForRule(context.pack, rule);
      if (!ratioStep.ok) {
        return resultAs<readonly Guide[]>(ratioStep.result);
      }
      for (const ratio of ratioStep.value) {
        guides.push(createGuide(context, rule, ratio, "x"));
        guides.push(createGuide(context, rule, ratio, "y"));
      }
    }
  }

  return createConstructionResult({
    status: "ok",
    provenance: createCoreProvenance(GENERATE_GUIDES_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "resolved-rule-set", ref: context.resolvedRuleSet.ruleSetRef },
    ]),
    outputRefs: sortGuides(guides).map(objectRef),
    packLockRef: { id: context.pack.preLock.ref },
    output: sortGuides(guides),
  });
}

export function generateZones(input: GenerateConstructionInput | ConstructionGenerationContext): CoreResult<readonly Zone[]> {
  const contextValidation = validateConstructionInput(input);
  if (!contextValidation.ok) {
    return resultAs<readonly Zone[]>(contextValidation.result);
  }

  const guidesResult = generateGuides(contextValidation.value);
  if (guidesResult.status !== "ok" || guidesResult.output === null) {
    return resultAs<readonly Zone[]>(guidesResult);
  }

  return generateZonesFromGuides(contextValidation.value, guidesResult.output);
}

export function generateSimpleGrid(input: GenerateConstructionInput | ConstructionGenerationContext): CoreResult<Grid> {
  const contextValidation = validateConstructionInput(input);
  if (!contextValidation.ok) {
    return resultAs<Grid>(contextValidation.result);
  }

  const context = contextValidation.value;
  const rule = firstRuleByType(context.resolvedRuleSet, "createSimpleGrid");
  if (rule === null) {
    return resultAs<Grid>(unsupportedConstructionRule("createSimpleGrid", "Resolved rule set is missing the createSimpleGrid rule."));
  }

  const sequenceStep = sequenceForRule(context.pack, rule);
  if (!sequenceStep.ok) {
    return resultAs<Grid>(sequenceStep.result);
  }

  const guidesResult = generateGuides(context);
  if (guidesResult.status !== "ok" || guidesResult.output === null) {
    return resultAs<Grid>(guidesResult);
  }

  const boundaries = normalizedBoundaries(sequenceStep.value.sequence);
  const rows = sequenceStep.value.sequence.normalizedParts.length;
  const columns = sequenceStep.value.sequence.normalizedParts.length;
  const gridId = "grid:thirdGrid";
  const operationRefValue = operationRef(GENERATE_GRID_OPERATION);
  const gridProvenance = createObjectProvenance(context, rule.ref, GENERATE_GRID_OPERATION, [
    sourceSurfaceRef(context.surface),
    { kind: "rule", ref: rule.ref },
    { kind: "ratio-sequence", ref: sequenceStep.value.sequenceRef },
  ]);
  const gridRef = { kind: "grid", ref: gridId };
  const cells: GridCell[] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const yStart = boundaries[rowIndex];
    const yEnd = boundaries[rowIndex + 1];
    if (yStart === undefined || yEnd === undefined) {
      return resultAs<Grid>(internalConstructionInvariant("grid.boundaries", "Grid row boundaries are incomplete."));
    }

    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const xStart = boundaries[columnIndex];
      const xEnd = boundaries[columnIndex + 1];
      if (xStart === undefined || xEnd === undefined) {
        return resultAs<Grid>(internalConstructionInvariant("grid.boundaries", "Grid column boundaries are incomplete."));
      }

      const cellId = `${gridId}:cell:r${rowIndex}:c${columnIndex}`;
      const sourceGuideRefs = guideRefsForBounds(guidesResult.output, xStart, xEnd, yStart, yEnd);
      cells.push({
        kind: "grid-cell",
        id: cellId,
        rowIndex,
        columnIndex,
        normalizedBounds: rectFromNormalizedValues(xStart, yStart, xEnd, yEnd),
        bounds: rectFromSurface(context.surface, xStart, yStart, xEnd, yEnd),
        sourceGridRef: gridId,
        sourceGuideRefs,
        ruleRef: rule.ref,
        operationRef: operationRefValue,
        provenance: createObjectProvenance(context, rule.ref, GENERATE_GRID_OPERATION, [
          sourceSurfaceRef(context.surface),
          gridRef,
          ...sourceGuideRefs.map((ref) => ({ kind: "guide", ref })),
          { kind: "ratio-sequence", ref: sequenceStep.value.sequenceRef },
        ]),
      });
    }
  }

  const grid: Grid = {
    kind: "grid",
    id: gridId,
    rows,
    columns,
    sourceSequenceRef: sequenceStep.value.sequenceRef,
    sourcePartitionPatternRefs: [...rule.partitionPatternRefs],
    cells,
    ruleRef: rule.ref,
    operationRef: operationRefValue,
    provenance: gridProvenance,
  };

  return createConstructionResult({
    status: "ok",
    provenance: createCoreProvenance(GENERATE_GRID_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: rule.ref },
      { kind: "ratio-sequence", ref: sequenceStep.value.sequenceRef },
    ]),
    outputRefs: [objectRef(grid), ...cells.map(objectRef)],
    packLockRef: { id: context.pack.preLock.ref },
    output: grid,
  });
}

export function generateDiagonals(input: GenerateConstructionInput | ConstructionGenerationContext): CoreResult<readonly Diagonal[]> {
  const contextValidation = validateConstructionInput(input);
  if (!contextValidation.ok) {
    return resultAs<readonly Diagonal[]>(contextValidation.result);
  }

  const context = contextValidation.value;
  const rule = firstRuleByType(context.resolvedRuleSet, "createDiagonals");
  if (rule === null) {
    return resultAs<readonly Diagonal[]>(unsupportedConstructionRule("createDiagonals", "Resolved rule set is missing the createDiagonals rule."));
  }

  const operationRefValue = operationRef(GENERATE_DIAGONALS_OPERATION);
  const diagonalDefinitions = [
    {
      id: `diagonal:${surfaceIdSegment(context.surface)}:bottom-left-to-top-right`,
      normalizedStart: point(0, 0),
      normalizedEnd: point(1, 1),
    },
    {
      id: `diagonal:${surfaceIdSegment(context.surface)}:top-left-to-bottom-right`,
      normalizedStart: point(0, 1),
      normalizedEnd: point(1, 0),
    },
  ] as const;
  const diagonals = diagonalDefinitions.map((definition): Diagonal => ({
    kind: "diagonal",
    id: definition.id,
    normalizedStart: definition.normalizedStart,
    normalizedEnd: definition.normalizedEnd,
    start: pointFromSurface(context.surface, definition.normalizedStart.x, requiredY(definition.normalizedStart)),
    end: pointFromSurface(context.surface, definition.normalizedEnd.x, requiredY(definition.normalizedEnd)),
    sourceSurfaceRef: context.surface.id,
    ruleRef: rule.ref,
    operationRef: operationRefValue,
    provenance: createObjectProvenance(context, rule.ref, GENERATE_DIAGONALS_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: rule.ref },
    ]),
  }));

  return createConstructionResult({
    status: "ok",
    provenance: createCoreProvenance(GENERATE_DIAGONALS_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: rule.ref },
    ]),
    outputRefs: diagonals.map(objectRef),
    packLockRef: { id: context.pack.preLock.ref },
    output: diagonals,
  });
}

export function deriveIntersections(input: GenerateConstructionInput | ConstructionGenerationContext): CoreResult<readonly IntersectionPoint[]> {
  const contextValidation = validateConstructionInput(input);
  if (!contextValidation.ok) {
    return resultAs<readonly IntersectionPoint[]>(contextValidation.result);
  }

  const guidesResult = generateGuides(contextValidation.value);
  if (guidesResult.status !== "ok" || guidesResult.output === null) {
    return resultAs<readonly IntersectionPoint[]>(guidesResult);
  }

  const diagonalsResult = generateDiagonals(contextValidation.value);
  if (diagonalsResult.status !== "ok" || diagonalsResult.output === null) {
    return resultAs<readonly IntersectionPoint[]>(diagonalsResult);
  }

  return deriveIntersectionsFromObjects(contextValidation.value, guidesResult.output, diagonalsResult.output);
}

function generateZonesFromGuides(
  context: ConstructionGenerationContext,
  guides: readonly Guide[],
): CoreResult<readonly Zone[]> {
  const verticalRule = firstRuleByType(context.resolvedRuleSet, "divideSurfaceVertical");
  const horizontalRule = firstRuleByType(context.resolvedRuleSet, "divideSurfaceHorizontal");
  if (verticalRule === null) {
    return resultAs<readonly Zone[]>(unsupportedConstructionRule("divideSurfaceVertical", "Resolved rule set is missing the divideSurfaceVertical rule."));
  }

  if (horizontalRule === null) {
    return resultAs<readonly Zone[]>(unsupportedConstructionRule("divideSurfaceHorizontal", "Resolved rule set is missing the divideSurfaceHorizontal rule."));
  }

  const verticalSequenceStep = sequenceForRule(context.pack, verticalRule);
  if (!verticalSequenceStep.ok) {
    return resultAs<readonly Zone[]>(verticalSequenceStep.result);
  }

  const horizontalSequenceStep = sequenceForRule(context.pack, horizontalRule);
  if (!horizontalSequenceStep.ok) {
    return resultAs<readonly Zone[]>(horizontalSequenceStep.result);
  }

  const zones = [
    ...zonesForAxis(context, verticalRule, verticalSequenceStep.value.sequence, guides, "vertical"),
    ...zonesForAxis(context, horizontalRule, horizontalSequenceStep.value.sequence, guides, "horizontal"),
  ];

  return createConstructionResult({
    status: "ok",
    provenance: createCoreProvenance(GENERATE_ZONES_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: verticalRule.ref },
      { kind: "rule", ref: horizontalRule.ref },
    ]),
    outputRefs: zones.map(objectRef),
    packLockRef: { id: context.pack.preLock.ref },
    output: zones,
  });
}

function deriveIntersectionsFromObjects(
  context: ConstructionGenerationContext,
  guides: readonly Guide[],
  diagonals: readonly Diagonal[],
): CoreResult<readonly IntersectionPoint[]> {
  const rule = firstRuleByType(context.resolvedRuleSet, "deriveIntersections");
  if (rule === null) {
    return resultAs<readonly IntersectionPoint[]>(unsupportedConstructionRule("deriveIntersections", "Resolved rule set is missing the deriveIntersections rule."));
  }

  const verticalGuides = guides.filter((guide) => guide.axis === "x");
  const horizontalGuides = guides.filter((guide) => guide.axis === "y");
  const intersections = [
    ...guideGuideIntersections(context, rule, verticalGuides, horizontalGuides),
    ...guideBorderIntersections(context, rule, guides),
  ];
  const diagonalIntersection = diagonalDiagonalIntersection(context, rule, diagonals);
  if (diagonalIntersection !== null) {
    intersections.push(diagonalIntersection);
  }

  return createConstructionResult({
    status: "ok",
    provenance: createCoreProvenance(DERIVE_INTERSECTIONS_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: rule.ref },
    ]),
    outputRefs: intersections.map(objectRef),
    packLockRef: { id: context.pack.preLock.ref },
    output: intersections,
  });
}

function validateConstructionInput(input: GenerateConstructionInput | ConstructionGenerationContext | null | undefined): ConstructionValidation<ConstructionGenerationContext> {
  if (input === null || input === undefined) {
    return failedConstructionValidation(missingConstructionInput("constructionInput", "Construction input is required."));
  }

  if (!isRecord(input)) {
    return failedConstructionValidation(invalidConstructionInput("constructionInput", "Construction input must be a structured object."));
  }

  if (input.surface === undefined || input.surface === null) {
    return failedConstructionValidation(missingConstructionInput("surface", "Construction input requires a SurfaceSpace."));
  }

  const surfaceValidation = validateConstructionSurface(input.surface);
  if (!surfaceValidation.ok) {
    return failedConstructionValidation(surfaceValidation.result);
  }

  if (input.resolvedRuleSet === undefined || input.resolvedRuleSet === null) {
    return failedConstructionValidation(missingResolvedRuleSet());
  }

  if (!isResolvedRuleSet(input.resolvedRuleSet)) {
    return failedConstructionValidation(missingResolvedRuleSet());
  }

  if (input.pack === undefined || input.pack === null) {
    return failedConstructionValidation(missingConstructionInput("pack", "Construction input requires an explicit validated ratio pack."));
  }

  const packResult = validateRatioPackV1(input.pack);
  if (packResult.status !== "ok" || packResult.output === null) {
    return failedConstructionValidation(createConstructionResult({
      status: "failed",
      warnings: packResult.warnings,
      errors: packResult.errors,
      outputRefs: packResult.outputRefs,
      packLockRef: packResult.packLockRef,
    }));
  }

  const resolvedRuleSet = input.resolvedRuleSet;
  const packRef = ratioPackRef(packResult.output);
  if (resolvedRuleSet.provenance.packRef !== packRef) {
    return failedConstructionValidation(
      invalidConstructionInput("resolvedRuleSet.provenance.packRef", "Resolved rule set packRef must match the construction pack."),
    );
  }

  const packRuleSet = packResult.output.ruleSets.find((ruleSet) => ruleSet.id === resolvedRuleSet.ruleSetRef);
  if (packRuleSet === undefined) {
    return failedConstructionValidation(
      invalidConstructionInput("resolvedRuleSet.ruleSetRef", "Resolved rule set must reference a rule set declared in the construction pack."),
    );
  }

  const foreignRuleSetRule = resolvedRuleSet.orderedRules.find((rule) => rule.ruleSetRef !== resolvedRuleSet.ruleSetRef);
  if (foreignRuleSetRule !== undefined) {
    return failedConstructionValidation(
      invalidConstructionInput(
        `resolvedRuleSet.orderedRules.${foreignRuleSetRule.ref}.ruleSetRef`,
        "Resolved rules must belong to the resolved rule set.",
      ),
    );
  }

  const packRuleRefs = new Set(packRuleSet.ruleRefs);
  const undeclaredRule = resolvedRuleSet.orderedRules.find((rule) => !packRuleRefs.has(rule.ref));
  if (undeclaredRule !== undefined) {
    return failedConstructionValidation(
      invalidConstructionInput(
        `resolvedRuleSet.orderedRules.${undeclaredRule.ref}.ref`,
        "Resolved rules must be referenced by the pack-owned rule set.",
      ),
    );
  }

  const foreignRule = resolvedRuleSet.orderedRules.find((rule) => rule.packRef !== packRef);
  if (foreignRule !== undefined) {
    return failedConstructionValidation(
      invalidConstructionInput(`resolvedRuleSet.orderedRules.${foreignRule.ref}.packRef`, "Resolved rules must come from the construction pack."),
    );
  }

  if (resolvedRuleSet.unsupportedRules.length > 0) {
    const unsupportedRule = resolvedRuleSet.unsupportedRules[0];
    if (unsupportedRule === undefined) {
      return failedConstructionValidation(
        unsupportedConstructionRule("unknown", "Construction cannot be generated with unsupported rules."),
      );
    }

    return failedConstructionValidation(
      unsupportedConstructionRule(unsupportedRule.ref, `Construction cannot be generated with unsupported rule type: ${unsupportedRule.type}.`),
    );
  }

  const malformedRule = resolvedRuleSet.orderedRules.find((rule) => !isConstructionRuleType(rule.type));
  if (malformedRule !== undefined) {
    return failedConstructionValidation(
      unsupportedConstructionRule(malformedRule.ref, `Construction rule type is unsupported by PR6: ${malformedRule.type}.`),
    );
  }

  return validConstructionValidation({
    surface: surfaceValidation.value,
    pack: packResult.output,
    resolvedRuleSet,
  });
}

function validateConstructionSurface(input: unknown): ConstructionValidation<SurfaceSpace> {
  if (!isRecord(input)) {
    return failedConstructionValidation(invalidConstructionInput("surface", "SurfaceSpace must be a structured object."));
  }

  const kind = input.kind;
  if (typeof kind !== "string" || kind !== "surface-space" || isUnsupportedConstructionGeometryKind(kind)) {
    return failedConstructionValidation(
      unsupportedConstructionGeometry("surface.kind", `Construction PR6 supports rectangular SurfaceSpace only: ${String(kind)}.`),
    );
  }

  const unsupportedField = firstUnsupportedConstructionGeometryField(input);
  if (unsupportedField !== null) {
    return failedConstructionValidation(
      unsupportedConstructionGeometry(`surface.${unsupportedField}`, `SurfaceSpace field is outside PR6 construction geometry: ${unsupportedField}.`),
    );
  }

  if (!hasNonEmptyString(input, "id")) {
    return failedConstructionValidation(invalidConstructionInput("surface.id", "SurfaceSpace requires a stable id."));
  }

  if (!isCoordinateSystemRecord(input.coordinateSystem) || input.coordinateSystem.dimensions !== 2) {
    return failedConstructionValidation(
      invalidConstructionInput("surface.coordinateSystem", "SurfaceSpace requires the Norma 2D coordinate system."),
    );
  }

  if (input.coordinateSystem.coordinateScale === "metric" && !isMetricPolicyRecord(input.metricPolicy)) {
    return failedConstructionValidation(
      invalidConstructionInput("surface.metricPolicy", "Metric SurfaceSpace requires an explicit MetricPolicy."),
    );
  }

  if (input.metricPolicy !== undefined && input.metricPolicy !== null && !isMetricPolicyRecord(input.metricPolicy)) {
    return failedConstructionValidation(
      invalidConstructionInput("surface.metricPolicy", "MetricPolicy must explicitly describe length units."),
    );
  }

  if (input.tolerancePolicy !== undefined && input.tolerancePolicy !== null && !isTolerancePolicyRecord(input.tolerancePolicy)) {
    return failedConstructionValidation(
      invalidConstructionInput("surface.tolerancePolicy", "TolerancePolicy must expose explicit non-negative tolerances."),
    );
  }

  const boundsValidation = validateConstructionRect(input.bounds, input.coordinateSystem, "surface.bounds");
  if (!boundsValidation.ok) {
    return failedConstructionValidation(boundsValidation.result);
  }

  return validConstructionValidation(input as unknown as SurfaceSpace);
}

function validateConstructionRect(
  input: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): ConstructionValidation<Rect> {
  if (!isRecord(input)) {
    return failedConstructionValidation(invalidConstructionInput(targetRef, "Rect must be a structured object."));
  }

  const unsupportedField = firstUnsupportedConstructionGeometryField(input);
  if (unsupportedField !== null) {
    return failedConstructionValidation(
      unsupportedConstructionGeometry(`${targetRef}.${unsupportedField}`, `Rect field is outside PR6 construction geometry: ${unsupportedField}.`),
    );
  }

  if (!isRectRecord(input)) {
    return failedConstructionValidation(invalidConstructionInput(targetRef, "Rect must be axis-aligned with positive width and height."));
  }

  if (coordinateSystem.coordinateScale === "normalized" && !isNormalizedRect(input)) {
    return failedConstructionValidation(invalidConstructionInput(targetRef, "Normalized Rect coordinates must stay within [0,1]."));
  }

  return validConstructionValidation(input);
}

function requiredConstructionRulesFailure(resolvedRuleSet: ResolvedRuleSet): CoreResult | null {
  for (const ruleType of REQUIRED_CONSTRUCTION_RULE_TYPES) {
    if (firstRuleByType(resolvedRuleSet, ruleType) === null) {
      return unsupportedConstructionRule(ruleType, `Resolved rule set is missing required PR6 construction rule type: ${ruleType}.`);
    }
  }

  return null;
}

function createGuide(
  context: ConstructionGenerationContext,
  rule: Rule,
  ratio: ResolvedRuleRatio,
  axis: GuideAxis,
): Guide {
  const operationRefValue = operationRef(GENERATE_GUIDES_OPERATION);
  const id = `guide:${axis}:${ratio.ratioRef}`;
  return {
    kind: "guide",
    id,
    axis,
    orientation: axis === "x" ? "vertical" : "horizontal",
    normalizedPosition: ratio.normalizedValue,
    position: coordinateFromNormalized(context.surface, axis, ratio.normalizedValue),
    ratioRef: ratio.ratioRef,
    ruleRef: rule.ref,
    operationRef: operationRefValue,
    provenance: createObjectProvenance(context, rule.ref, GENERATE_GUIDES_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: rule.ref },
      { kind: "ratio", ref: ratio.ratioRef },
    ]),
  };
}

function zonesForAxis(
  context: ConstructionGenerationContext,
  rule: Rule,
  sequence: RatioSequence,
  guides: readonly Guide[],
  axis: ZoneAxis,
): readonly Zone[] {
  const boundaries = normalizedBoundaries(sequence);
  const zones: Zone[] = [];

  for (let index = 0; index < sequence.normalizedParts.length; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (start === undefined || end === undefined) {
      continue;
    }

    const sourceGuideRefs = guideRefsForZone(guides, axis, start, end);
    const id = `zone:${axis}-third:${index}`;
    const normalizedBounds = axis === "vertical"
      ? rectFromNormalizedValues(start, 0, end, 1)
      : rectFromNormalizedValues(0, start, 1, end);
    const bounds = axis === "vertical"
      ? rectFromSurface(context.surface, start, 0, end, 1)
      : rectFromSurface(context.surface, 0, start, 1, end);
    zones.push({
      kind: "zone",
      id,
      axis,
      index,
      normalizedBounds,
      bounds,
      sourceGuideRefs,
      ruleRef: rule.ref,
      operationRef: operationRef(GENERATE_ZONES_OPERATION),
      provenance: createObjectProvenance(context, rule.ref, GENERATE_ZONES_OPERATION, [
        sourceSurfaceRef(context.surface),
        { kind: "rule", ref: rule.ref },
        ...sourceGuideRefs.map((ref) => ({ kind: "guide", ref })),
      ]),
    });
  }

  return zones;
}

function guideGuideIntersections(
  context: ConstructionGenerationContext,
  rule: Rule,
  verticalGuides: readonly Guide[],
  horizontalGuides: readonly Guide[],
): readonly IntersectionPoint[] {
  const intersections: IntersectionPoint[] = [];

  for (const verticalGuide of verticalGuides) {
    for (const horizontalGuide of horizontalGuides) {
      const normalizedPoint = point(verticalGuide.normalizedPosition, horizontalGuide.normalizedPosition);
      intersections.push(createIntersectionPoint(context, rule, {
        id: `intersection:guide-guide:x-${verticalGuide.ratioRef}:y-${horizontalGuide.ratioRef}`,
        intersectionKind: "guide-guide",
        normalizedPoint,
        sourceObjectRefs: [
          objectRef(verticalGuide),
          objectRef(horizontalGuide),
        ],
      }));
    }
  }

  return intersections;
}

function guideBorderIntersections(
  context: ConstructionGenerationContext,
  rule: Rule,
  guides: readonly Guide[],
): readonly IntersectionPoint[] {
  const intersections: IntersectionPoint[] = [];

  for (const guide of guides) {
    if (guide.axis === "x") {
      intersections.push(createIntersectionPoint(context, rule, {
        id: `intersection:guide-border:x-${guide.ratioRef}:bottom`,
        intersectionKind: "guide-border",
        normalizedPoint: point(guide.normalizedPosition, 0),
        sourceObjectRefs: [objectRef(guide), borderRef(context.surface, "bottom")],
      }));
      intersections.push(createIntersectionPoint(context, rule, {
        id: `intersection:guide-border:x-${guide.ratioRef}:top`,
        intersectionKind: "guide-border",
        normalizedPoint: point(guide.normalizedPosition, 1),
        sourceObjectRefs: [objectRef(guide), borderRef(context.surface, "top")],
      }));
    } else {
      intersections.push(createIntersectionPoint(context, rule, {
        id: `intersection:guide-border:y-${guide.ratioRef}:left`,
        intersectionKind: "guide-border",
        normalizedPoint: point(0, guide.normalizedPosition),
        sourceObjectRefs: [objectRef(guide), borderRef(context.surface, "left")],
      }));
      intersections.push(createIntersectionPoint(context, rule, {
        id: `intersection:guide-border:y-${guide.ratioRef}:right`,
        intersectionKind: "guide-border",
        normalizedPoint: point(1, guide.normalizedPosition),
        sourceObjectRefs: [objectRef(guide), borderRef(context.surface, "right")],
      }));
    }
  }

  return intersections;
}

function diagonalDiagonalIntersection(
  context: ConstructionGenerationContext,
  rule: Rule,
  diagonals: readonly Diagonal[],
): IntersectionPoint | null {
  const firstDiagonal = diagonals[0];
  const secondDiagonal = diagonals[1];
  if (firstDiagonal === undefined || secondDiagonal === undefined) {
    return null;
  }

  const normalizedPoint = lineIntersection(
    firstDiagonal.normalizedStart,
    firstDiagonal.normalizedEnd,
    secondDiagonal.normalizedStart,
    secondDiagonal.normalizedEnd,
  );
  if (normalizedPoint === null) {
    return null;
  }

  return createIntersectionPoint(context, rule, {
    id: "intersection:diagonal-diagonal:center",
    intersectionKind: "diagonal-diagonal",
    normalizedPoint,
    sourceObjectRefs: [
      objectRef(firstDiagonal),
      objectRef(secondDiagonal),
    ],
  });
}

function createIntersectionPoint(
  context: ConstructionGenerationContext,
  rule: Rule,
  input: {
    id: string;
    intersectionKind: IntersectionKind;
    normalizedPoint: Point;
    sourceObjectRefs: readonly SourceReference[];
  },
): IntersectionPoint {
  return {
    kind: "intersection-point",
    id: input.id,
    intersectionKind: input.intersectionKind,
    normalizedPoint: input.normalizedPoint,
    point: pointFromSurface(context.surface, input.normalizedPoint.x, requiredY(input.normalizedPoint)),
    sourceObjectRefs: input.sourceObjectRefs,
    ruleRef: rule.ref,
    operationRef: operationRef(DERIVE_INTERSECTIONS_OPERATION),
    provenance: createObjectProvenance(context, rule.ref, DERIVE_INTERSECTIONS_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "rule", ref: rule.ref },
      ...input.sourceObjectRefs,
    ]),
  };
}

function createConstructionTrace(
  context: ConstructionGenerationContext,
  objects: readonly ConstructionObject[],
  warnings: readonly CoreWarning[],
): ConstructionTrace {
  const traceObjects = objects.filter((object) => object.kind !== "construction-trace");
  const operationRefs = uniqueStrings([
    operationRef(GENERATE_CONSTRUCTION_OPERATION),
    ...traceObjects.map((object) => object.provenance.operationRef),
  ]);
  const createdObjectRefs = traceObjects.map(objectRef);

  return {
    kind: "construction-trace",
    id: `construction-trace:${context.surface.id}:${context.resolvedRuleSet.ruleSetRef}`,
    appliedRuleRefs: context.resolvedRuleSet.orderedRules.map((rule) => rule.ref),
    operationRefs,
    createdObjectRefs,
    ruleApplications: ruleApplications(context, traceObjects),
    warnings: [...warnings, ...context.resolvedRuleSet.warnings],
    provenance: createObjectProvenance(context, context.resolvedRuleSet.ruleSetRef, GENERATE_CONSTRUCTION_OPERATION, [
      sourceSurfaceRef(context.surface),
      { kind: "ratio-pack", ref: context.resolvedRuleSet.provenance.packRef },
      { kind: "resolved-rule-set", ref: context.resolvedRuleSet.ruleSetRef },
    ]),
  };
}

function ruleApplications(
  context: ConstructionGenerationContext,
  objects: readonly ConstructionObject[],
): readonly ConstructionRuleApplicationTrace[] {
  return context.resolvedRuleSet.orderedRules.map((rule) => {
    const ruleObjects = objects.filter((object) => object.provenance.ruleRef === rule.ref);
    const firstObject = ruleObjects[0];
    return {
      ruleRef: rule.ref,
      operationRef: firstObject?.provenance.operationRef ?? operationRef(GENERATE_CONSTRUCTION_OPERATION),
      createdObjectRefs: ruleObjects.map(objectRef),
    };
  });
}

function constructionGateFailure(construction: Construction): CoreResult<Construction> | null {
  if (!hasConstructionTrace(construction.constructionTrace)) {
    return constructionTraceMissing();
  }

  for (const object of [
    construction,
    construction.constructionTrace,
    ...construction.guides,
    ...construction.zones,
    construction.grid,
    ...construction.grid.cells,
    ...construction.diagonals,
    ...construction.intersections,
  ]) {
    if (!hasMinimumConstructionProvenance(object.provenance)) {
      return missingConstructionProvenance(object.id);
    }
  }

  for (const zone of construction.zones) {
    if (zone.sourceGuideRefs.length === 0) {
      return derivedObjectMissingSource(zone.id);
    }
  }

  for (const cell of construction.grid.cells) {
    if (cell.sourceGuideRefs.length === 0 || cell.sourceGridRef.length === 0) {
      return derivedObjectMissingSource(cell.id);
    }
  }

  for (const intersection of construction.intersections) {
    if (intersection.sourceObjectRefs.length < 2) {
      return derivedObjectMissingSource(intersection.id);
    }
  }

  return null;
}

function ratioValuesForRule(pack: RatioPack, rule: Rule): ConstructionStep<readonly ResolvedRuleRatio[]> {
  const ratios: ResolvedRuleRatio[] = [];
  for (const ratioRef of rule.ratioRefs) {
    const result = readRatioFromPack(pack, ratioRef);
    if (result.status !== "ok" || result.output === null) {
      return failedConstructionStep(createConstructionResult({
        status: "failed",
        warnings: result.warnings,
        errors: result.errors,
        outputRefs: result.outputRefs,
        packLockRef: result.packLockRef,
      }));
    }

    ratios.push({
      ratioRef,
      ratio: result.output,
      normalizedValue: result.output.normalizedValue,
    });
  }

  return validConstructionStep(ratios);
}

function sequenceForRule(
  pack: RatioPack,
  rule: Rule,
): ConstructionStep<{ sequenceRef: string; sequence: RatioSequence }> {
  const sequenceRef = rule.ratioSequenceRefs[0];
  if (sequenceRef === undefined) {
    return failedConstructionStep(
      unsupportedConstructionRule(rule.ref, `Construction rule requires a ratio sequence: ${rule.ref}.`),
    );
  }

  const result = readRatioSequenceFromPack(pack, sequenceRef);
  if (result.status !== "ok" || result.output === null) {
    return failedConstructionStep(createConstructionResult({
      status: "failed",
      warnings: result.warnings,
      errors: result.errors,
      outputRefs: result.outputRefs,
      packLockRef: result.packLockRef,
    }));
  }

  return validConstructionStep({ sequenceRef, sequence: result.output });
}

function firstRuleByType(resolvedRuleSet: ResolvedRuleSet, ruleType: RuleType): Rule | null {
  return resolvedRuleSet.orderedRules.find((rule) => rule.type === ruleType) ?? null;
}

function sortGuides(guides: readonly Guide[]): readonly Guide[] {
  return [...guides].sort((first, second) => {
    if (first.axis !== second.axis) {
      return first.axis === "x" ? -1 : 1;
    }

    return first.normalizedPosition - second.normalizedPosition;
  });
}

function normalizedBoundaries(sequence: RatioSequence): readonly number[] {
  const boundaries = [0];
  let cursor = 0;
  for (const part of sequence.normalizedParts) {
    cursor += part;
    boundaries.push(cursor);
  }

  return boundaries;
}

function guideRefsForBounds(
  guides: readonly Guide[],
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
): readonly string[] {
  return uniqueStrings([
    ...guideRefsForNormalizedBoundary(guides, "x", xStart),
    ...guideRefsForNormalizedBoundary(guides, "x", xEnd),
    ...guideRefsForNormalizedBoundary(guides, "y", yStart),
    ...guideRefsForNormalizedBoundary(guides, "y", yEnd),
  ]);
}

function guideRefsForZone(
  guides: readonly Guide[],
  axis: ZoneAxis,
  start: number,
  end: number,
): readonly string[] {
  const guideAxis: GuideAxis = axis === "vertical" ? "x" : "y";
  const refs = guides
    .filter((guide) => guide.axis === guideAxis && (guide.normalizedPosition === start || guide.normalizedPosition === end))
    .map((guide) => guide.id);

  return refs;
}

function guideRefsForNormalizedBoundary(guides: readonly Guide[], axis: GuideAxis, value: number): readonly string[] {
  if (value === 0 || value === 1) {
    return [];
  }

  return guides
    .filter((guide) => guide.axis === axis && guide.normalizedPosition === value)
    .map((guide) => guide.id);
}

function coordinateFromNormalized(surface: SurfaceSpace, axis: GuideAxis, normalizedValue: number): number {
  const bounds = surface.bounds;
  return axis === "x"
    ? bounds.x + bounds.width * normalizedValue
    : bounds.y + bounds.height * normalizedValue;
}

function pointFromSurface(surface: SurfaceSpace, normalizedX: number, normalizedY: number): Point {
  return point(
    coordinateFromNormalized(surface, "x", normalizedX),
    coordinateFromNormalized(surface, "y", normalizedY),
  );
}

function rectFromSurface(surface: SurfaceSpace, xStart: number, yStart: number, xEnd: number, yEnd: number): Rect {
  const start = pointFromSurface(surface, xStart, yStart);
  const end = pointFromSurface(surface, xEnd, yEnd);
  return rectFromValues(start.x, requiredY(start), end.x, requiredY(end));
}

function rectFromNormalizedValues(xStart: number, yStart: number, xEnd: number, yEnd: number): Rect {
  return rectFromValues(xStart, yStart, xEnd, yEnd);
}

function rectFromValues(xStart: number, yStart: number, xEnd: number, yEnd: number): Rect {
  return {
    kind: "rect",
    x: xStart,
    y: yStart,
    width: xEnd - xStart,
    height: yEnd - yStart,
  };
}

function lineIntersection(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): Point | null {
  const firstStartY = requiredY(firstStart);
  const firstEndY = requiredY(firstEnd);
  const secondStartY = requiredY(secondStart);
  const secondEndY = requiredY(secondEnd);
  const denominator = (firstStart.x - firstEnd.x) * (secondStartY - secondEndY)
    - (firstStartY - firstEndY) * (secondStart.x - secondEnd.x);
  if (denominator === 0) {
    return null;
  }

  const firstCross = firstStart.x * firstEndY - firstStartY * firstEnd.x;
  const secondCross = secondStart.x * secondEndY - secondStartY * secondEnd.x;
  const x = (firstCross * (secondStart.x - secondEnd.x) - (firstStart.x - firstEnd.x) * secondCross) / denominator;
  const y = (firstCross * (secondStartY - secondEndY) - (firstStartY - firstEndY) * secondCross) / denominator;
  return point(x, y);
}

function point(x: number, y: number): Point {
  return { kind: "point", x, y };
}

function requiredY(pointValue: Point): number {
  if (pointValue.y === undefined) {
    return 0;
  }

  return pointValue.y;
}

function createObjectProvenance(
  context: ConstructionGenerationContext,
  ruleRef: string,
  operationName: string,
  sourceRefs: readonly SourceReference[],
): ConstructionObjectProvenance {
  return {
    kind: "construction-provenance",
    inputRef: context.surface.id,
    packRef: context.resolvedRuleSet.provenance.packRef,
    ruleRef,
    operationRef: operationRef(operationName),
    sourceRefs: [
      sourceSurfaceRef(context.surface),
      { kind: "ratio-pack", ref: context.resolvedRuleSet.provenance.packRef },
      { kind: "rule", ref: ruleRef },
      { kind: "operation", ref: operationRef(operationName) },
      ...sourceRefs,
    ],
  };
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

function createCoreProvenance(
  operationName: string,
  inputRefs: readonly SourceReference[] = [],
): Provenance {
  return {
    operationName,
    operationVersion: CONSTRUCTION_OPERATION_VERSION,
    inputRefs,
    source: CONSTRUCTION_SOURCE_REFERENCE,
  };
}

function missingConstructionInput(targetRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "MissingConstructionInput",
        message,
        targetRef,
        sourceRef: { kind: "construction-input", ref: targetRef },
      }),
    ],
  });
}

function missingResolvedRuleSet(): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "MissingResolvedRuleSet",
        message: "Construction generation requires a resolved rule set.",
        targetRef: "resolvedRuleSet",
        sourceRef: { kind: "resolved-rule-set", ref: "missing" },
      }),
    ],
  });
}

function invalidConstructionInput(targetRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "InvalidConstructionInput",
        message,
        targetRef,
        sourceRef: { kind: "construction-input", ref: targetRef },
      }),
    ],
  });
}

function unsupportedConstructionGeometry(targetRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "UnsupportedConstructionGeometry",
        message,
        targetRef,
        sourceRef: { kind: "geometry-v1", ref: targetRef },
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
        targetRef: `resolvedRuleSet.${ruleRef}`,
        sourceRef: { kind: "rule", ref: ruleRef },
      }),
    ],
  });
}

function missingConstructionProvenance(objectRefValue: string): CoreResult<Construction> {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "MissingConstructionProvenance",
        message: `Derived construction object is missing minimum provenance: ${objectRefValue}.`,
        targetRef: objectRefValue,
        sourceRef: { kind: "provenance", ref: objectRefValue },
      }),
    ],
  });
}

function constructionTraceMissing(): CoreResult<Construction> {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "ConstructionTraceMissing",
        message: "Construction output requires a visible constructionTrace.",
        targetRef: "constructionTrace",
        sourceRef: { kind: "construction-trace", ref: "missing" },
      }),
    ],
  });
}

function derivedObjectMissingSource(objectRefValue: string): CoreResult<Construction> {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "DerivedObjectMissingSource",
        message: `Derived construction object is missing source object references: ${objectRefValue}.`,
        targetRef: objectRefValue,
        sourceRef: { kind: "construction-object", ref: objectRefValue },
      }),
    ],
  });
}

function internalConstructionInvariant(targetRef: string, message: string): CoreResult {
  return createConstructionResult({
    status: "failed",
    errors: [
      createConstructionError({
        code: "InternalInvariantViolation",
        message,
        targetRef,
      }),
    ],
  });
}

function validConstructionValidation<TValue>(value: TValue): ConstructionValidation<TValue> {
  return { ok: true, value };
}

function failedConstructionValidation<TValue>(result: CoreResult): ConstructionValidation<TValue> {
  return { ok: false, result: resultAs<TValue>(result) };
}

function validConstructionStep<TValue>(value: TValue): ConstructionStep<TValue> {
  return { ok: true, value };
}

function failedConstructionStep<TValue>(result: CoreResult): ConstructionStep<TValue> {
  return { ok: false, result };
}

function resultAs<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return result as unknown as CoreResult<TOutput>;
}

function operationRef(operationName: string): string {
  return `${operationName}@${CONSTRUCTION_OPERATION_VERSION}`;
}

function objectRef(object: { kind: string; id: string }): SourceReference {
  return { kind: object.kind, ref: object.id };
}

function sourceSurfaceRef(surface: SurfaceSpace): SourceReference {
  return { kind: "surface-space", ref: surface.id };
}

function borderRef(surface: SurfaceSpace, border: "bottom" | "top" | "left" | "right"): SourceReference {
  return { kind: "surface-border", ref: `${surface.id}:${border}` };
}

function surfaceIdSegment(surface: SurfaceSpace): string {
  return surface.id;
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function hasConstructionTrace(trace: ConstructionTrace | null | undefined): boolean {
  return isRecord(trace)
    && trace.kind === "construction-trace"
    && Array.isArray(trace.appliedRuleRefs)
    && Array.isArray(trace.operationRefs)
    && Array.isArray(trace.createdObjectRefs)
    && Array.isArray(trace.warnings);
}

function hasMinimumConstructionProvenance(provenance: ConstructionObjectProvenance | null | undefined): boolean {
  return isRecord(provenance)
    && provenance.kind === "construction-provenance"
    && hasNonEmptyString(provenance, "inputRef")
    && hasNonEmptyString(provenance, "packRef")
    && hasNonEmptyString(provenance, "ruleRef")
    && hasNonEmptyString(provenance, "operationRef")
    && Array.isArray(provenance.sourceRefs)
    && provenance.sourceRefs.some((ref) => ref.kind === "surface-space")
    && provenance.sourceRefs.some((ref) => ref.kind === "ratio-pack")
    && provenance.sourceRefs.some((ref) => ref.kind === "rule")
    && provenance.sourceRefs.some((ref) => ref.kind === "operation");
}

function isConstructionRuleType(value: unknown): value is RuleType {
  return typeof value === "string" && CONSTRUCTION_RULE_TYPES.has(value as RuleType);
}

function isResolvedRuleSet(value: unknown): value is ResolvedRuleSet {
  return isRecord(value)
    && value.kind === "resolved-rule-set"
    && hasNonEmptyString(value, "ruleSetRef")
    && Array.isArray(value.orderedRules)
    && value.orderedRules.every(isResolvedRule)
    && Array.isArray(value.resolvedRatioRefs)
    && Array.isArray(value.unsupportedRules)
    && Array.isArray(value.warnings)
    && isRecord(value.provenance)
    && hasNonEmptyString(value.provenance, "packRef");
}

function isResolvedRule(value: unknown): value is Rule {
  return isRecord(value)
    && value.kind === "rule"
    && hasNonEmptyString(value, "ref")
    && hasNonEmptyString(value, "type")
    && hasNonEmptyString(value, "packRef")
    && hasNonEmptyString(value, "ruleSetRef")
    && Array.isArray(value.ratioRefs)
    && Array.isArray(value.ratioSequenceRefs)
    && Array.isArray(value.partitionPatternRefs);
}

function isUnsupportedConstructionGeometryKind(kind: string): boolean {
  return CONSTRUCTION_UNSUPPORTED_GEOMETRY_KINDS.includes(
    kind as (typeof CONSTRUCTION_UNSUPPORTED_GEOMETRY_KINDS)[number],
  );
}

function firstUnsupportedConstructionGeometryField(value: Record<string, unknown>): string | null {
  return CONSTRUCTION_UNSUPPORTED_GEOMETRY_FIELDS.find((field) => field in value) ?? null;
}

function isCoordinateSystemRecord(value: unknown): value is CoordinateSystem {
  return isRecord(value)
    && value.kind === "coordinate-system"
    && hasNonEmptyString(value, "id")
    && value.origin === "bottom-left"
    && value.xAxis === "right"
    && value.yAxis === "up"
    && value.dimensions === 2
    && (value.coordinateScale === "normalized" || value.coordinateScale === "metric");
}

function isMetricPolicyRecord(value: unknown): value is MetricPolicy {
  return isRecord(value)
    && value.kind === "metric-policy"
    && hasNonEmptyString(value, "id")
    && value.quantity === "length"
    && hasNonEmptyString(value, "unit");
}

function isTolerancePolicyRecord(value: unknown): value is TolerancePolicy {
  return isRecord(value)
    && value.kind === "tolerance-policy"
    && hasNonEmptyString(value, "id")
    && isNonNegativeFiniteNumber(value.coordinateTolerance)
    && hasOptionalNonNegativeFiniteNumber(value, "metricTolerance");
}

function isRectRecord(value: unknown): value is Rect {
  return isRecord(value)
    && value.kind === "rect"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isPositiveFiniteNumber(value.width)
    && isPositiveFiniteNumber(value.height);
}

function isNormalizedRect(rect: Rect): boolean {
  return [rect.x, rect.y, rect.width, rect.height, rect.x + rect.width, rect.y + rect.height].every(isNormalizedValue);
}

function isNormalizedValue(value: number): boolean {
  return value >= 0 && value <= 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function hasOptionalNonNegativeFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || isNonNegativeFiniteNumber(value[key]);
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string" && value[key].length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}
