import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  CONSTRUCTION_V1_SCHEMA_VERSION,
  CORE_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  generateConstructionV1,
  resolveRuleSetV1,
  validateConstructionV1,
} from "../dist/src/index.js";

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertStructuredResult(result) {
  assert.equal(typeof result, "object");
  assert.ok(result.status);
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok("output" in result);
  assert.ok("provenance" in result);
  assert.ok("runRef" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);
}

function assertOk(result) {
  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
  assert.ok(result.output);
}

function assertFailedWithDiagnostic(result, diagnosticCode) {
  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes(diagnosticCode));
  assert.equal(result.output, null);
}

const normalizedCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-normalized",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "normalized",
};

const normalizedCoordinateSystem1d = {
  ...normalizedCoordinateSystem2d,
  id: "norma-canonical-1d-normalized",
  dimensions: 1,
};

const tolerancePolicy = {
  kind: "tolerance-policy",
  id: "exact-geometry",
  coordinateTolerance: 0,
  metricTolerance: 0,
};

function canonicalSurface(overrides = {}) {
  return {
    kind: "surface-space",
    id: "surface:unit",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
    ...overrides,
  };
}

function canonicalSegment() {
  return {
    kind: "segment-space",
    id: "segment:unit",
    coordinateSystem: normalizedCoordinateSystem1d,
    tolerancePolicy,
    extent: {
      kind: "segment",
      start: { kind: "point", x: 0 },
      end: { kind: "point", x: 1 },
    },
  };
}

function resolveMvp() {
  const result = resolveRuleSetV1(BASIC_PROPORTIONS_PACK, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(result);
  return structuredClone(result.output);
}

function generateMvp(surface = canonicalSurface(), resolution = resolveMvp()) {
  const result = generateConstructionV1(surface, resolution);
  assertOk(result);
  return result;
}

function collectObjectRefs(construction) {
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

function assertProvenanceRefs(value, expectedRuleRef = null) {
  assert.equal(value.inputRef, "surface:unit");
  assert.equal(value.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(value.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assert.ok(value.operationRef);
  assert.ok(Array.isArray(value.sourceRefs));
  assert.ok(value.sourceRefs.length > 0);
  assert.ok(value.provenance);

  const provenanceRefs = value.provenance.inputRefs.map((ref) => `${ref.kind}:${ref.ref}`);
  assert.ok(provenanceRefs.includes("geometry:surface:unit"));
  assert.ok(provenanceRefs.includes("ratio-pack:norma.basic-proportions@0.1.0"));
  assert.ok(provenanceRefs.includes(`rule-set:${SURFACE_BASIC_THIRD_GRID_RULE_SET_ID}`));
  assert.ok(provenanceRefs.includes(`construction-operation:${value.operationRef}`));
  if (expectedRuleRef !== null) {
    assert.ok(provenanceRefs.includes(`rule-declaration:${expectedRuleRef}`));
  }
}

function assertRectClose(actual, expected) {
  assert.equal(actual.kind, "rect");
  assert.ok(Math.abs(actual.x - expected.x) <= Number.EPSILON);
  assert.ok(Math.abs(actual.y - expected.y) <= Number.EPSILON);
  assert.ok(Math.abs(actual.width - expected.width) <= Number.EPSILON);
  assert.ok(Math.abs(actual.height - expected.height) <= Number.EPSILON);
}

test("PR6 exports Construction V1 vocabulary while PR7 measurements are public", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr10");
  assert.equal(CONSTRUCTION_V1_SCHEMA_VERSION, "construction-v1");
  assert.equal(typeof generateConstructionV1, "function");
  assert.equal(typeof validateConstructionV1, "function");
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("InvalidConstructionV1"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("UnsupportedConstructionRule"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("MissingConstructionInput"));
  assert.equal(typeof core.measureGeometryV1, "function");
  assert.equal(typeof core.measureAreasV1, "function");
  assert.equal("evaluateConstructionV1" in core, false);
});

test("PR6 generates and validates canonical MVP construction from resolved PR5 data", () => {
  const result = generateMvp();
  const construction = result.output;
  const validation = validateConstructionV1(construction);

  assertOk(validation);
  assert.equal(construction.kind, "construction");
  assert.equal(construction.schemaVersion, "construction-v1");
  assert.equal(construction.inputRef, "surface:unit");
  assert.equal(construction.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(construction.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assert.deepEqual(construction.appliedRuleRefs, [
    "surface-thirds-vertical",
    "surface-thirds-horizontal",
  ]);
  assert.equal(construction.guides.length, 4);
  assert.equal(construction.zones.length, 6);
  assert.equal(construction.grids.length, 1);
  assert.equal(construction.grids[0].cells.length, 9);
  assert.equal(construction.intersections.length, 12);
  assert.deepEqual(construction.measurementRefs, []);
  assert.deepEqual(construction.evaluationRefs, []);
  assert.deepEqual(construction.scoringRefs, []);
  assert.deepEqual(construction.artifactRefs, []);
  assert.deepEqual(result.outputRefs.find((ref) => ref.kind === "construction"), {
    kind: "construction",
    ref: construction.constructionRef,
  });
});

test("PR6 guides are ordered, finite, source-preserving, and fully traceable", () => {
  const construction = generateMvp().output;

  assert.deepEqual(
    construction.guides.map((guide) => ({
      ruleRef: guide.ruleRef,
      orientation: guide.orientation,
      position: guide.position,
    })),
    [
      { ruleRef: "surface-thirds-vertical", orientation: "vertical", position: 1 / 3 },
      { ruleRef: "surface-thirds-vertical", orientation: "vertical", position: 2 / 3 },
      { ruleRef: "surface-thirds-horizontal", orientation: "horizontal", position: 1 / 3 },
      { ruleRef: "surface-thirds-horizontal", orientation: "horizontal", position: 2 / 3 },
    ],
  );

  for (const guide of construction.guides) {
    assert.equal(Number.isFinite(guide.position), true);
    assert.ok(guide.position > 0 && guide.position < 1);
    assertProvenanceRefs(guide, guide.ruleRef);
    assert.ok(guide.sourceRefs.some((ref) => ref.kind === "ratio-sequence" && ref.ref.endsWith("ratioSequences.1:1:1")));
    assert.ok(guide.sourceRefs.some((ref) => ref.kind === "partition-pattern" && ref.ref.endsWith("partitionPatterns.thirds")));
    assert.ok(guide.sourceRefs.some((ref) => ref.kind === "ratio"));
  }
});

test("PR6 derives sequence partition positions without boundary guides", () => {
  const construction = generateMvp().output;
  const verticalPositions = construction.guides
    .filter((guide) => guide.orientation === "vertical")
    .map((guide) => guide.position);
  const horizontalPositions = construction.guides
    .filter((guide) => guide.orientation === "horizontal")
    .map((guide) => guide.position);

  assert.deepEqual(verticalPositions, [1 / 3, 2 / 3]);
  assert.deepEqual(horizontalPositions, [1 / 3, 2 / 3]);
  assert.equal(construction.guides.some((guide) => guide.position === 0 || guide.position === 1), false);
  assert.equal(new Set(construction.guides.map((guide) => guide.guideRef)).size, construction.guides.length);
});

test("PR6 merges sequence and ratio-derived positions for the same resolved rule", () => {
  const resolution = resolveMvp();
  resolution.ruleRefs = [resolution.ruleRefs[0]];
  resolution.rules = [structuredClone(resolution.rules[0])];
  resolution.rules[0].ratioRefs.push({
    kind: "resolved-ratio-ref",
    ratioRef: "1/2",
    normalizedValue: 0.5,
    sourceRef: {
      kind: "ratio",
      ref: "norma.basic-proportions@0.1.0:ratios.1/2",
    },
  });

  const construction = generateMvp(canonicalSurface(), resolution).output;

  assert.deepEqual(construction.guides.map((guide) => guide.position), [1 / 3, 0.5, 2 / 3]);
  assert.ok(construction.guides.some((guide) => guide.sourceRefs.some((ref) => ref.ref.endsWith("ratios.1/2"))));
});

test("PR6 rejects conflicting declared partition axes before rule-ref suffix fallback", () => {
  const resolution = resolveMvp();
  const pattern = resolution.rules[0].partitionPatternRefs[0];
  resolution.ruleRefs = [resolution.ruleRefs[0]];
  resolution.rules = [structuredClone(resolution.rules[0])];
  resolution.rules[0].partitionPatternRefs = [
    {
      ...pattern,
      partitionPatternRef: "thirds-vertical",
      axis: "vertical",
      sourceRef: {
        ...pattern.sourceRef,
        ref: "norma.basic-proportions@0.1.0:partitionPatterns.thirds-vertical",
      },
    },
    {
      ...pattern,
      partitionPatternRef: "thirds-horizontal",
      axis: "horizontal",
      sourceRef: {
        ...pattern.sourceRef,
        ref: "norma.basic-proportions@0.1.0:partitionPatterns.thirds-horizontal",
      },
    },
  ];

  assertFailedWithDiagnostic(generateConstructionV1(canonicalSurface(), resolution), "UnsupportedConstructionRule");
});

test("PR6 zones and grid cells form deterministic bottom-left partitions", () => {
  const construction = generateMvp().output;
  const verticalZones = construction.zones.filter((zone) => zone.partitionAxis === "vertical");
  const horizontalZones = construction.zones.filter((zone) => zone.partitionAxis === "horizontal");
  const grid = construction.grids[0];

  assert.deepEqual(verticalZones.map((zone) => zone.bounds.x), [0, 1 / 3, 2 / 3]);
  assert.deepEqual(horizontalZones.map((zone) => zone.bounds.y), [0, 1 / 3, 2 / 3]);
  for (const zone of construction.zones) {
    assert.ok(zone.bounds.width > 0);
    assert.ok(zone.bounds.height > 0);
    assert.ok(zone.bounds.x >= 0 && zone.bounds.x + zone.bounds.width <= 1);
    assert.ok(zone.bounds.y >= 0 && zone.bounds.y + zone.bounds.height <= 1);
    assertProvenanceRefs(zone, zone.ruleRef);
  }

  assert.equal(grid.rowCount, 3);
  assert.equal(grid.columnCount, 3);
  assert.deepEqual(grid.cells.map((cell) => [cell.rowIndex, cell.columnIndex]), [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ]);
  assertRectClose(grid.cells[0].bounds, { x: 0, y: 0, width: 1 / 3, height: 1 / 3 });
  assertRectClose(grid.cells[8].bounds, { x: 2 / 3, y: 2 / 3, width: 1 / 3, height: 1 / 3 });
  assert.equal(grid.cells.every((cell) => cell.gridRef === grid.gridRef), true);
  assert.equal(grid.cells.every((cell) => cell.boundingGuideRefs.length > 0), true);
  assertProvenanceRefs(grid);
  for (const cell of grid.cells) {
    assertProvenanceRefs(cell);
  }
});

test("PR6 omits grids when resolved rules authorize only one partition axis", () => {
  const resolution = resolveMvp();
  resolution.ruleRefs = [resolution.ruleRefs[0]];
  resolution.rules = [resolution.rules[0]];

  const construction = generateMvp(canonicalSurface(), resolution).output;

  assert.equal(construction.guides.length, 2);
  assert.equal(construction.zones.length, 3);
  assert.deepEqual(construction.grids, []);
  assert.equal(construction.intersections.length, 4);
});

test("PR6 intersections cover produced guides and surface boundaries only", () => {
  const construction = generateMvp().output;
  const guideGuideIntersections = construction.intersections.filter((intersection) =>
    intersection.sourceGeometryRefs.every((ref) => ref.startsWith("guide:")),
  );
  const boundaryIntersections = construction.intersections.filter((intersection) =>
    intersection.sourceGeometryRefs.some((ref) => ref.startsWith("surface-boundary:")),
  );

  assert.deepEqual(
    guideGuideIntersections.map((intersection) => intersection.point),
    [
      { kind: "point", x: 1 / 3, y: 1 / 3 },
      { kind: "point", x: 1 / 3, y: 2 / 3 },
      { kind: "point", x: 2 / 3, y: 1 / 3 },
      { kind: "point", x: 2 / 3, y: 2 / 3 },
    ],
  );
  assert.equal(boundaryIntersections.length, 8);
  assert.equal(new Set(construction.intersections.map((intersection) => intersection.intersectionRef)).size, construction.intersections.length);
  for (const intersection of construction.intersections) {
    assert.equal(Number.isFinite(intersection.point.x), true);
    assert.equal(Number.isFinite(intersection.point.y), true);
    assertProvenanceRefs(intersection);
  }
});

test("PR6 construction trace covers every created object without orphan refs", () => {
  const construction = generateMvp().output;
  const objectRefs = collectObjectRefs(construction);
  const trace = construction.constructionTrace;

  assert.deepEqual(trace.appliedRuleRefs, construction.appliedRuleRefs);
  assert.deepEqual(trace.operationRefs, [
    "construction.generateGuides",
    "construction.generateZones",
    "construction.generateSimpleGrid",
    "construction.deriveIntersections",
  ]);
  assert.deepEqual(new Set(trace.createdObjectRefs), new Set(objectRefs));
  assert.equal(trace.createdObjectRefs.length, objectRefs.length);
  assert.equal(trace.entries.every((entry) => entry.createdObjectRefs.every((ref) => objectRefs.includes(ref))), true);
  assert.deepEqual(trace.warnings, []);
});

test("PR6 generation is deterministic and does not mutate inputs", () => {
  const surface = canonicalSurface();
  const resolution = resolveMvp();
  const surfaceBefore = JSON.stringify(surface);
  const resolutionBefore = JSON.stringify(resolution);

  const first = generateConstructionV1(surface, resolution);
  const second = generateConstructionV1(structuredClone(surface), structuredClone(resolution));

  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.output, second.output);
  assert.deepEqual(first.outputRefs, second.outputRefs);
  assert.equal(JSON.stringify(surface), surfaceBefore);
  assert.equal(JSON.stringify(resolution), resolutionBefore);
});

test("PR6 rejects missing, invalid, unsupported, or malformed inputs", () => {
  const resolution = resolveMvp();

  assertFailedWithDiagnostic(generateConstructionV1(null, resolution), "MissingConstructionInput");
  assertFailedWithDiagnostic(
    generateConstructionV1(canonicalSurface({ bounds: { kind: "rect", x: 0, y: 0, width: Number.NaN, height: 1 } }), resolution),
    "InvalidGeometryV1",
  );
  assertFailedWithDiagnostic(generateConstructionV1(canonicalSegment(), resolution), "MissingConstructionInput");
  assertFailedWithDiagnostic(generateConstructionV1(canonicalSurface(), { ...resolution, rules: [] }), "InvalidRuleResolutionV1");

  const unsupportedResolution = resolveMvp();
  unsupportedResolution.ruleRefs = ["surface-thirds-depth"];
  unsupportedResolution.rules[0].ruleRef = "surface-thirds-depth";
  assertFailedWithDiagnostic(generateConstructionV1(canonicalSurface(), unsupportedResolution), "UnsupportedConstructionRule");
});

test("PR6 validates Construction V1 as a closed, provenance-complete output", () => {
  const construction = generateMvp().output;

  assertFailedWithDiagnostic(validateConstructionV1({ ...construction, metadata: {} }), "InvalidConstructionV1");

  const malformedGuide = structuredClone(construction);
  malformedGuide.guides[0].position = Number.POSITIVE_INFINITY;
  assertFailedWithDiagnostic(validateConstructionV1(malformedGuide), "InvalidConstructionV1");

  const missingProvenance = structuredClone(construction);
  delete missingProvenance.guides[0].provenance;
  assertFailedWithDiagnostic(validateConstructionV1(missingProvenance), "InvalidConstructionV1");

  const duplicateGuide = structuredClone(construction);
  duplicateGuide.guides[1].guideRef = duplicateGuide.guides[0].guideRef;
  assertFailedWithDiagnostic(validateConstructionV1(duplicateGuide), "InvalidConstructionV1");

  const futureOutput = structuredClone(construction);
  futureOutput.measurementRefs = [{ kind: "measurement", ref: "future:measurement" }];
  assertFailedWithDiagnostic(validateConstructionV1(futureOutput), "InvalidConstructionV1");

  const missingTraceRef = structuredClone(construction);
  missingTraceRef.constructionTrace.createdObjectRefs = ["construction:missing"];
  assertFailedWithDiagnostic(validateConstructionV1(missingTraceRef), "InvalidConstructionV1");
});
