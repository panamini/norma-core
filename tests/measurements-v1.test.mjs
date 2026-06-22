import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  CORE_VERSION,
  MEASUREMENT_RESULT_V1_SCHEMA_VERSION,
  MEASUREMENT_V1_SCHEMA_VERSION,
  MEASUREMENT_V1_TYPES,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  generateConstructionV1,
  measureAreasV1,
  measureGeometryV1,
  resolveRuleSetV1,
  validateConstructionV1,
  validateMeasurementResultV1,
  validateMeasurementV1,
} from "../dist/src/index.js";

const EPSILON = 1e-9;

const normalizedCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-normalized",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "normalized",
};

const tolerancePolicy = {
  kind: "tolerance-policy",
  id: "exact-geometry",
  coordinateTolerance: 0,
  metricTolerance: 0,
};

const measurementMetricPolicy = {
  kind: "measurement-metric-policy",
  id: "surface-1200x800-px",
  surfaceRef: "surface:unit",
  width: 1200,
  height: 800,
  unit: "px",
};

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
  assert.ok(diagnosticCodes(result).includes(diagnosticCode), diagnosticCodes(result).join(", "));
  assert.equal(result.output, null);
}

function assertClose(actual, expected, epsilon = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function assertNoForbiddenFields(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoForbiddenFields(item);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const field of ["score", "componentScore", "confidence", "decision", "recommendation", "evaluation"]) {
      assert.equal(field in value, false, `${field} leaked into Measurements V1`);
    }
    for (const child of Object.values(value)) {
      assertNoForbiddenFields(child);
    }
  }
}

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

function compositionA() {
  return {
    kind: "composition-2d",
    id: "composition:A",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    surface: canonicalSurface(),
    elements: [
      { kind: "element", id: "element:header", geometry: { kind: "rect", x: 0, y: 2 / 3, width: 1, height: 1 / 3 } },
      { kind: "element", id: "element:side", geometry: { kind: "rect", x: 0, y: 1 / 3, width: 1 / 3, height: 1 / 3 } },
      { kind: "element", id: "element:main", geometry: { kind: "rect", x: 1 / 3, y: 1 / 3, width: 2 / 3, height: 1 / 3 } },
      { kind: "element", id: "element:footer", geometry: { kind: "rect", x: 0, y: 0, width: 1, height: 1 / 3 } },
    ],
  };
}

function compositionB() {
  return {
    kind: "composition-2d",
    id: "composition:B",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    surface: canonicalSurface(),
    elements: [
      { kind: "element", id: "element:header", geometry: { kind: "rect", x: 0.04, y: 0.62, width: 0.92, height: 0.29 } },
      { kind: "element", id: "element:side", geometry: { kind: "rect", x: 0.03, y: 0.29, width: 0.31, height: 0.34 } },
      { kind: "element", id: "element:main", geometry: { kind: "rect", x: 0.38, y: 0.30, width: 0.57, height: 0.35 } },
      { kind: "element", id: "element:footer", geometry: { kind: "rect", x: 0.02, y: 0.02, width: 0.95, height: 0.26 } },
    ],
  };
}

function canonicalConstruction(surface = canonicalSurface()) {
  const resolution = resolveRuleSetV1(BASIC_PROPORTIONS_PACK, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(resolution);
  const construction = generateConstructionV1(surface, resolution.output);
  assertOk(construction);
  const validation = validateConstructionV1(construction.output);
  assertOk(validation);
  return structuredClone(construction.output);
}

function guideRef(construction, orientation, position) {
  const guide = construction.guides.find((candidate) => (
    candidate.orientation === orientation && Math.abs(candidate.position - position) <= EPSILON
  ));
  assert.ok(guide, `${orientation} guide at ${position} missing`);
  return guide.guideRef;
}

function cellRef(construction, rowIndex, columnIndex) {
  const cell = construction.grids[0].cells.find((candidate) => (
    candidate.rowIndex === rowIndex && candidate.columnIndex === columnIndex
  ));
  assert.ok(cell, `cell ${rowIndex}:${columnIndex} missing`);
  return cell.cellRef;
}

function measurementInput(overrides = {}) {
  const construction = canonicalConstruction();
  return {
    kind: "measurement-input",
    schemaVersion: "measurement-input-v1",
    measurementResultRef: "measurement-result:canonical",
    surface: canonicalSurface(),
    construction,
    composition: compositionA(),
    metricPolicy: measurementMetricPolicy,
    geometryRefs: [
      { kind: "geometry-ref", geometryRef: "point:origin", geometry: { kind: "point", x: 0, y: 0 } },
      { kind: "geometry-ref", geometryRef: "point:third", geometry: { kind: "point", x: 1 / 3, y: 1 / 3 } },
      { kind: "geometry-ref", geometryRef: "point:outside", geometry: { kind: "point", x: 1.2, y: 0.5 } },
      { kind: "geometry-ref", geometryRef: "rect:A-main", geometry: { kind: "rect", x: 1 / 3, y: 1 / 3, width: 2 / 3, height: 1 / 3 } },
      { kind: "geometry-ref", geometryRef: "rect:B-main", geometry: { kind: "rect", x: 0.38, y: 0.30, width: 0.57, height: 0.35 } },
      { kind: "geometry-ref", geometryRef: "rect:inside", geometry: { kind: "rect", x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
      { kind: "geometry-ref", geometryRef: "rect:partial", geometry: { kind: "rect", x: 0.8, y: 0.8, width: 0.3, height: 0.3 } },
      { kind: "geometry-ref", geometryRef: "rect:outside", geometry: { kind: "rect", x: 1.2, y: 1.2, width: 0.2, height: 0.2 } },
      { kind: "geometry-ref", geometryRef: "rect:zero-area", geometry: { kind: "rect", x: 0.2, y: 0.2, width: 0, height: 0.4 } },
      { kind: "geometry-ref", geometryRef: "rect:left", geometry: { kind: "rect", x: 0, y: 0, width: 0.75, height: 1 } },
      { kind: "geometry-ref", geometryRef: "rect:right", geometry: { kind: "rect", x: 0.25, y: 0, width: 0.75, height: 1 } },
      { kind: "geometry-ref", geometryRef: "segment:zero", geometry: { kind: "segment", start: { kind: "point", x: 0.5, y: 0.5 }, end: { kind: "point", x: 0.5, y: 0.5 } } },
    ],
    requests: [],
    ...overrides,
  };
}

function runMeasurements(requests, overrides = {}) {
  const result = measureGeometryV1(measurementInput({ requests, ...overrides }));
  assertOk(result);
  assert.equal(result.output.kind, "measurement-result");
  assert.equal(result.output.schemaVersion, MEASUREMENT_RESULT_V1_SCHEMA_VERSION);
  assertOk(validateMeasurementResultV1(structuredClone(result.output)));
  assertNoForbiddenFields(result.output);
  return result.output;
}

function byRequest(result, requestRef) {
  const measurement = result.measurements.find((candidate) => candidate.requestRef === requestRef);
  assert.ok(measurement, `measurement for ${requestRef} missing`);
  return measurement;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

test("PR7 exports Measurements V1 vocabulary while PR8 evaluation is public and PR9 comparison is absent", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr8");
  assert.equal(MEASUREMENT_V1_SCHEMA_VERSION, "measurement-v1");
  assert.equal(MEASUREMENT_RESULT_V1_SCHEMA_VERSION, "measurement-result-v1");
  assert.deepEqual(MEASUREMENT_V1_TYPES, [
    "distance",
    "position",
    "alignment",
    "angle",
    "area",
    "ratio",
    "containment",
    "overlap",
    "coverage",
    "directional-relation",
    "surface-hierarchy",
  ]);
  assert.equal(typeof measureGeometryV1, "function");
  assert.equal(typeof measureAreasV1, "function");
  assert.equal(typeof validateMeasurementV1, "function");
  assert.equal(typeof validateMeasurementResultV1, "function");
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("InvalidMeasurementV1"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("MissingMeasurementInput"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("UnsupportedMeasurementRequest"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("IncompatibleMeasurementGeometry"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("InvalidMetricPolicy"));
  assert.ok(core.CORE_DIAGNOSTIC_CODES.includes("InvalidTolerancePolicy"));
  assert.equal(typeof core.evaluateCompositionBasicV1, "function");
  assert.equal("compareCompositionsBasicV1" in core, false);
  assert.equal("CandidateRankingV1" in core, false);
});

test("PR7 consumes canonical PR6 construction without regenerating or mutating it", () => {
  const construction = canonicalConstruction();
  const before = JSON.stringify(construction);
  const frozenInput = deepFreeze(measurementInput({
    construction,
    requests: [
      {
        kind: "measurement-request",
        requestRef: "area:cell-0-0",
        measurementType: "area",
        sourceRef: cellRef(construction, 0, 0),
        metric: "both",
      },
    ],
  }));

  const result = measureGeometryV1(frozenInput);
  assertOk(result);
  assert.equal(JSON.stringify(construction), before);
  assert.equal(result.output.measurements[0].sourceRefs.some((ref) => ref.kind === "construction"), true);
  assert.equal(result.output.measurements[0].sourceRefs.some((ref) => ref.kind === "ratio-pack"), true);
  assert.equal(result.output.measurements[0].sourceRefs.some((ref) => ref.kind === "rule-set"), true);
});

test("PR7 measures distances, positions, alignments, and angles with explicit policies", () => {
  const construction = canonicalConstruction();
  const verticalThird = guideRef(construction, "vertical", 1 / 3);
  const horizontalTwoThirds = guideRef(construction, "horizontal", 2 / 3);
  const verticalTwoThirds = guideRef(construction, "vertical", 2 / 3);
  const output = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "distance:A-main-left-to-third",
      measurementType: "distance",
      sourceRef: "rect:A-main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "horizontal",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "distance:B-main-left-to-third",
      measurementType: "distance",
      sourceRef: "rect:B-main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "horizontal",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "distance:point-to-point",
      measurementType: "distance",
      sourceRef: "point:origin",
      targetRef: "point:third",
      axis: "euclidean",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "position:guide-third",
      measurementType: "position",
      sourceRef: verticalThird,
      positionKind: "guide",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "position:main-center",
      measurementType: "position",
      sourceRef: "rect:B-main",
      sourceAnchor: "center",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "position:outside-point",
      measurementType: "position",
      sourceRef: "point:outside",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "alignment:exact",
      measurementType: "alignment",
      sourceRef: "rect:A-main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "x",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "alignment:boundary",
      measurementType: "alignment",
      sourceRef: "rect:A-main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "x",
      tolerance: { kind: "measurement-tolerance", id: "inclusive", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "alignment:B-offset",
      measurementType: "alignment",
      sourceRef: "rect:B-main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "x",
      tolerance: { kind: "measurement-tolerance", id: "tight", value: 0.01 },
    },
    {
      kind: "measurement-request",
      requestRef: "angle:perpendicular",
      measurementType: "angle",
      sourceRef: verticalThird,
      targetRef: horizontalTwoThirds,
      tolerance: { kind: "measurement-tolerance", id: "angle", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "angle:parallel",
      measurementType: "angle",
      sourceRef: verticalThird,
      targetRef: verticalTwoThirds,
      tolerance: { kind: "measurement-tolerance", id: "angle", value: 0 },
    },
  ], { construction });

  const exactDistance = byRequest(output, "distance:A-main-left-to-third");
  assert.equal(exactDistance.status, "measured");
  assertClose(exactDistance.result.normalizedDistance, 0);
  assertClose(exactDistance.result.metricDistance, 0);
  assert.equal(exactDistance.result.unit, "px");

  const bDistance = byRequest(output, "distance:B-main-left-to-third");
  assertClose(bDistance.result.normalizedDistance, 0.38 - 1 / 3);
  assertClose(bDistance.result.metricDistance, (0.38 - 1 / 3) * 1200);

  const pointDistance = byRequest(output, "distance:point-to-point");
  assertClose(pointDistance.result.normalizedDistance, Math.hypot(1 / 3, 1 / 3));
  assertClose(pointDistance.result.metricDistance, Math.hypot(400, 800 / 3));

  const guidePosition = byRequest(output, "position:guide-third");
  assert.deepEqual(guidePosition.result.normalizedPosition, { kind: "point", x: 1 / 3, y: null });
  assert.deepEqual(guidePosition.result.metricPosition, { kind: "point", x: 400, y: null });

  const centerPosition = byRequest(output, "position:main-center");
  assertClose(centerPosition.result.normalizedPosition.x, 0.665);
  assertClose(centerPosition.result.normalizedPosition.y, 0.475);
  assertClose(centerPosition.result.metricPosition.x, 798);
  assertClose(centerPosition.result.metricPosition.y, 380);

  assert.equal(byRequest(output, "position:outside-point").result.containmentStatus, "outside");
  assert.equal(byRequest(output, "alignment:exact").result.alignmentStatus, "aligned");
  assert.equal(byRequest(output, "alignment:boundary").result.boundaryPolicy, "inclusive");
  assert.equal(byRequest(output, "alignment:B-offset").result.alignmentStatus, "not_aligned");
  assert.equal(byRequest(output, "angle:perpendicular").result.angleRelation, "perpendicular");
  assertClose(byRequest(output, "angle:perpendicular").result.radians, Math.PI / 2);
  assert.equal(byRequest(output, "angle:parallel").result.angleRelation, "parallel");
  assertClose(byRequest(output, "angle:parallel").result.radians, 0);
});

test("PR7 measures areas and directional ratios without scoring", () => {
  const construction = canonicalConstruction();
  const output = runMeasurements([
    { kind: "measurement-request", requestRef: "area:surface", measurementType: "area", sourceRef: "surface:unit", metric: "both" },
    { kind: "measurement-request", requestRef: "area:header", measurementType: "area", sourceRef: "element:header", metric: "both" },
    { kind: "measurement-request", requestRef: "area:side", measurementType: "area", sourceRef: "element:side", metric: "both" },
    { kind: "measurement-request", requestRef: "area:main", measurementType: "area", sourceRef: "element:main", metric: "both" },
    { kind: "measurement-request", requestRef: "area:cell", measurementType: "area", sourceRef: cellRef(construction, 0, 0), metric: "both" },
    {
      kind: "measurement-request",
      requestRef: "ratio:side-main",
      measurementType: "ratio",
      numeratorRef: "element:side",
      denominatorRef: "element:main",
      ratioKind: "area",
      targetRatio: { kind: "ratio-target", targetRef: "target:half", value: 0.5 },
    },
  ], { construction });

  assertClose(byRequest(output, "area:surface").result.normalizedArea, 1);
  assertClose(byRequest(output, "area:header").result.normalizedArea, 1 / 3);
  assertClose(byRequest(output, "area:side").result.normalizedArea, 1 / 9);
  assertClose(byRequest(output, "area:main").result.normalizedArea, 2 / 9);
  assertClose(byRequest(output, "area:cell").result.normalizedArea, 1 / 9);
  assertClose(byRequest(output, "area:side").result.metricArea, (1200 / 3) * (800 / 3));

  const ratio = byRequest(output, "ratio:side-main");
  assert.equal(ratio.result.numeratorRef, "element:side");
  assert.equal(ratio.result.denominatorRef, "element:main");
  assertClose(ratio.result.ratio, 0.5);
  assertClose(ratio.result.absoluteDelta, 0);
  assert.equal("matchStatus" in ratio.result, false);
  assert.equal("score" in ratio.result, false);
});

test("measureAreasV1 provides explicit deterministic area measurements only", () => {
  const result = measureAreasV1({
    kind: "area-measurement-input",
    schemaVersion: "area-measurement-input-v1",
    measurementResultRef: "measurement-result:areas",
    surface: canonicalSurface(),
    construction: canonicalConstruction(),
    composition: compositionA(),
    metricPolicy: measurementMetricPolicy,
    sourceRefs: ["element:side", "element:main"],
  });

  assertOk(result);
  assert.equal(result.output.operationRef, "measurements.measureAreas");
  assert.deepEqual(result.output.measurements.map((measurement) => measurement.requestRef), [
    "area:element:side",
    "area:element:main",
  ]);
  assert.equal(result.output.measurements.every((measurement) => measurement.measurementType === "area"), true);
});

test("PR7 measures containment, overlap, and coverage as geometric facts", () => {
  const output = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "containment:header-surface",
      measurementType: "containment",
      childRef: "element:header",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:inside",
      measurementType: "containment",
      childRef: "rect:inside",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:partial",
      measurementType: "containment",
      childRef: "rect:partial",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:outside",
      measurementType: "containment",
      childRef: "rect:outside",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "overlap:touching",
      measurementType: "overlap",
      sourceRef: "element:side",
      targetRef: "element:main",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "overlap:positive",
      measurementType: "overlap",
      sourceRef: "rect:left",
      targetRef: "rect:right",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "overlap:identical",
      measurementType: "overlap",
      sourceRef: "element:header",
      targetRef: "element:header",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "coverage:A",
      measurementType: "coverage",
      targetRef: "surface:unit",
      contributorRefs: ["element:main", "element:footer", "element:side", "element:header"],
      metric: "both",
      coveragePolicy: "union-clipped",
    },
    {
      kind: "measurement-request",
      requestRef: "coverage:dedupe",
      measurementType: "coverage",
      targetRef: "surface:unit",
      contributorRefs: ["rect:right", "rect:left", "rect:partial"],
      metric: "both",
      coveragePolicy: "union-clipped",
    },
  ]);

  assert.equal(byRequest(output, "containment:header-surface").result.containmentStatus, "on_boundary");
  assert.equal(byRequest(output, "containment:inside").result.containmentStatus, "inside");
  assert.equal(byRequest(output, "containment:partial").result.containmentStatus, "partially_outside");
  assert.equal(byRequest(output, "containment:outside").result.containmentStatus, "outside");

  assert.equal(byRequest(output, "overlap:touching").result.overlapStatus, "boundary_touch");
  assert.equal(byRequest(output, "overlap:touching").result.normalizedOverlapArea, 0);
  assert.equal(byRequest(output, "overlap:positive").result.overlapStatus, "overlap");
  assert.deepEqual(byRequest(output, "overlap:positive").result.intersectionBounds, {
    kind: "rect",
    x: 0.25,
    y: 0,
    width: 0.5,
    height: 1,
  });
  assertClose(byRequest(output, "overlap:positive").result.overlapRatioA, 2 / 3);
  assertClose(byRequest(output, "overlap:positive").result.overlapRatioB, 2 / 3);
  assert.equal(byRequest(output, "overlap:identical").result.overlapStatus, "identical");

  const coverageA = byRequest(output, "coverage:A");
  assertClose(coverageA.result.coverageRatio, 1);
  assertClose(coverageA.result.uncoveredArea, 0);
  assert.equal("coverageScore" in coverageA.result, false);

  const dedupe = byRequest(output, "coverage:dedupe");
  assertClose(dedupe.result.coverageRatio, 1);
  assertClose(dedupe.result.coveredArea, 1);
  assert.equal(dedupe.result.contributorRefs.join(","), "rect:left,rect:partial,rect:right");
  assert.equal(dedupe.warnings.includes("contributor-partially-outside:rect:partial"), true);
});

test("PR7 measures directional relations and surface hierarchy without semantic winners", () => {
  const output = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "relation:header-footer",
      measurementType: "directional-relation",
      sourceRef: "element:header",
      targetRef: "element:footer",
      relationFamily: "vertical",
      tolerance: { kind: "measurement-tolerance", id: "center", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "relation:side-main",
      measurementType: "directional-relation",
      sourceRef: "element:side",
      targetRef: "element:main",
      relationFamily: "horizontal",
      tolerance: { kind: "measurement-tolerance", id: "center", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "relation:ambiguous",
      measurementType: "directional-relation",
      sourceRef: "element:header",
      targetRef: "element:header",
      relationFamily: "vertical",
      tolerance: { kind: "measurement-tolerance", id: "center", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "hierarchy:A",
      measurementType: "surface-hierarchy",
      sourceRefs: ["element:header", "element:footer", "element:main", "element:side"],
      areaTolerance: { kind: "measurement-tolerance", id: "area", value: 0 },
      metric: "both",
    },
  ]);

  assert.equal(byRequest(output, "relation:header-footer").result.relation, "above");
  assert.equal(byRequest(output, "relation:side-main").result.relation, "left");
  assert.equal(byRequest(output, "relation:ambiguous").result.relation, "centered");

  const hierarchy = byRequest(output, "hierarchy:A").result;
  assert.deepEqual(hierarchy.tieGroups[0].sourceRefs, ["element:footer", "element:header"]);
  assert.equal(hierarchy.ranked.find((entry) => entry.sourceRef === "element:main").rank, 2);
  assert.equal(hierarchy.ranked.find((entry) => entry.sourceRef === "element:side").rank, 3);
  assert.equal("importance" in hierarchy.ranked[0], false);
  assert.equal("score" in hierarchy.ranked[0], false);
});

test("PR7 outputs are deterministic and contributor ordering does not affect coverage", () => {
  const requests = [
    {
      kind: "measurement-request",
      requestRef: "coverage:stable",
      measurementType: "coverage",
      targetRef: "surface:unit",
      contributorRefs: ["rect:right", "rect:left", "rect:partial"],
      metric: "both",
      coveragePolicy: "union-clipped",
    },
  ];
  const first = measureGeometryV1(measurementInput({ requests }));
  const second = measureGeometryV1(measurementInput({ requests: structuredClone(requests) }));
  const reordered = measureGeometryV1(measurementInput({
    requests: [{ ...requests[0], contributorRefs: ["rect:partial", "rect:left", "rect:right"] }],
  }));

  assertOk(first);
  assertOk(second);
  assertOk(reordered);
  assert.deepEqual(first.output, second.output);
  assert.deepEqual(first.output.measurements[0].result, reordered.output.measurements[0].result);
  assert.deepEqual(first.output.measurements[0].warnings, reordered.output.measurements[0].warnings);
});

test("PR7 preserves real provenance and does not fabricate pack lineage for plain geometry", () => {
  const construction = canonicalConstruction();
  const verticalThird = guideRef(construction, "vertical", 1 / 3);
  const output = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "distance:guide",
      measurementType: "distance",
      sourceRef: "element:main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "horizontal",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "distance:plain",
      measurementType: "distance",
      sourceRef: "point:origin",
      targetRef: "point:third",
      axis: "euclidean",
      metric: "both",
    },
  ], { construction });

  const guideMeasurement = byRequest(output, "distance:guide");
  assert.equal(guideMeasurement.provenance.inputRefs.some((ref) => ref.kind === "construction" && ref.ref === construction.constructionRef), true);
  assert.equal(guideMeasurement.provenance.inputRefs.some((ref) => ref.kind === "ratio-pack"), true);
  assert.equal(guideMeasurement.provenance.inputRefs.some((ref) => ref.kind === "rule-declaration"), true);

  const plainMeasurement = byRequest(output, "distance:plain");
  assert.equal(plainMeasurement.provenance.inputRefs.some((ref) => ref.kind === "ratio-pack"), false);
  assert.equal(plainMeasurement.provenance.inputRefs.some((ref) => ref.kind === "rule-declaration"), false);
});

test("PR7 rejects duplicate geometry refs without overwriting canonical geometry", () => {
  const surfaceArea = runMeasurements([
    { kind: "measurement-request", requestRef: "area:surface", measurementType: "area", sourceRef: "surface:unit", metric: "both" },
  ]);
  const surfaceMeasurement = byRequest(surfaceArea, "area:surface");
  assertClose(surfaceMeasurement.result.normalizedArea, 1);
  assert.equal(surfaceMeasurement.sourceRefs.some((ref) => ref.kind === "geometry" && ref.ref === "surface:unit"), true);

  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      geometryRefs: [
        { kind: "geometry-ref", geometryRef: "surface:unit", geometry: { kind: "rect", x: 0, y: 0, width: 0.5, height: 0.5 } },
      ],
      requests: [
        { kind: "measurement-request", requestRef: "area:surface", measurementType: "area", sourceRef: "surface:unit", metric: "both" },
      ],
    })),
    "InvalidMeasurementV1",
  );

  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      geometryRefs: [
        { kind: "geometry-ref", geometryRef: "rect:dup", geometry: { kind: "rect", x: 0, y: 0, width: 0.5, height: 0.5 } },
        { kind: "geometry-ref", geometryRef: "rect:dup", geometry: { kind: "rect", x: 0.5, y: 0.5, width: 0.25, height: 0.25 } },
      ],
      requests: [
        { kind: "measurement-request", requestRef: "area:dup", measurementType: "area", sourceRef: "rect:dup", metric: "both" },
      ],
    })),
    "InvalidMeasurementV1",
  );
});

test("PR7 binds metric policies to the measured surface", () => {
  const output = runMeasurements([
    { kind: "measurement-request", requestRef: "area:side", measurementType: "area", sourceRef: "element:side", metric: "both" },
  ]);
  assert.equal(output.metricPolicy.surfaceRef, output.spaceRef);

  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      metricPolicy: { ...measurementMetricPolicy, surfaceRef: "surface:other" },
      requests: [
        { kind: "measurement-request", requestRef: "area:side", measurementType: "area", sourceRef: "element:side", metric: "both" },
      ],
    })),
    "InvalidMetricPolicy",
  );

  assertFailedWithDiagnostic(
    validateMeasurementV1({
      ...output.measurements[0],
      metricPolicy: { ...output.measurements[0].metricPolicy, surfaceRef: "surface:other" },
    }),
    "InvalidMetricPolicy",
  );

  assertFailedWithDiagnostic(
    validateMeasurementResultV1({
      ...output,
      metricPolicy: { ...output.metricPolicy, surfaceRef: "surface:other" },
    }),
    "InvalidMetricPolicy",
  );
});

test("PR7 honors explicit metric selectors for metric-capable measurements", () => {
  const output = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "distance:normalized",
      measurementType: "distance",
      sourceRef: "point:origin",
      targetRef: "point:third",
      axis: "euclidean",
      metric: "normalized",
    },
    {
      kind: "measurement-request",
      requestRef: "area:normalized",
      measurementType: "area",
      sourceRef: "element:side",
      metric: "normalized",
    },
    {
      kind: "measurement-request",
      requestRef: "area:metric",
      measurementType: "area",
      sourceRef: "element:side",
      metric: "metric",
    },
    {
      kind: "measurement-request",
      requestRef: "area:both",
      measurementType: "area",
      sourceRef: "element:side",
      metric: "both",
    },
  ]);

  const normalizedDistance = byRequest(output, "distance:normalized");
  assert.equal(normalizedDistance.unit, "normalized");
  assert.equal(normalizedDistance.result.metricDistance, null);
  assert.equal(normalizedDistance.result.unit, "normalized");

  const normalizedArea = byRequest(output, "area:normalized");
  assert.equal(normalizedArea.unit, "normalized");
  assert.equal(normalizedArea.result.metricArea, null);
  assert.equal(normalizedArea.result.unit, "normalized");

  const metricArea = byRequest(output, "area:metric");
  assert.equal(metricArea.unit, "metric");
  assertClose(metricArea.result.metricArea, (1200 / 3) * (800 / 3));
  assert.equal(metricArea.result.unit, "px^2");

  const bothArea = byRequest(output, "area:both");
  assert.equal(bothArea.unit, "mixed");
  assertClose(bothArea.result.normalizedArea, 1 / 9);
  assertClose(bothArea.result.metricArea, (1200 / 3) * (800 / 3));

  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      requests: [
        { kind: "measurement-request", requestRef: "area:bad-metric", measurementType: "area", sourceRef: "element:side", metric: "imperial-ish" },
      ],
    })),
    "UnsupportedMeasurementRequest",
  );
});

test("PR7 does not classify partial 1D points as inside a 2D surface", () => {
  const positionOutput = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "position:partial-point",
      measurementType: "position",
      sourceRef: "point:x-only",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "position:inside-point",
      measurementType: "position",
      sourceRef: "point:origin",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "position:outside-point",
      measurementType: "position",
      sourceRef: "point:outside",
      metric: "both",
    },
  ], {
    geometryRefs: [
      ...measurementInput().geometryRefs,
      { kind: "geometry-ref", geometryRef: "point:x-only", geometry: { kind: "point", x: 2 } },
    ],
  });

  assert.equal(byRequest(positionOutput, "position:partial-point").result.containmentStatus, "outside");
  assert.equal(byRequest(positionOutput, "position:inside-point").result.containmentStatus, "on_boundary");
  assert.equal(byRequest(positionOutput, "position:outside-point").result.containmentStatus, "outside");

  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      geometryRefs: [
        ...measurementInput().geometryRefs,
        { kind: "geometry-ref", geometryRef: "point:x-only", geometry: { kind: "point", x: 2 } },
      ],
      requests: [
        {
          kind: "measurement-request",
          requestRef: "containment:partial-point",
          measurementType: "containment",
          childRef: "point:x-only",
          parentRef: "surface:unit",
          tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
        },
      ],
    })),
    "IncompatibleMeasurementGeometry",
  );
});

test("PR7 rejects malformed requests and invalid geometric policies", () => {
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({ metricPolicy: undefined, requests: [] })),
    "InvalidMetricPolicy",
  );
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      metricPolicy: { ...measurementMetricPolicy, unit: "unsupported-unit" },
      requests: [],
    })),
    "InvalidMetricPolicy",
  );
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      requests: [{
        kind: "measurement-request",
        requestRef: "alignment:missing-tolerance",
        measurementType: "alignment",
        sourceRef: "element:main",
        targetRef: "element:side",
        sourceAnchor: "left",
        targetAnchor: "right",
        axis: "x",
      }],
    })),
    "InvalidTolerancePolicy",
  );
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      requests: [{
        kind: "measurement-request",
        requestRef: "alignment:negative-tolerance",
        measurementType: "alignment",
        sourceRef: "element:main",
        targetRef: "element:side",
        sourceAnchor: "left",
        targetAnchor: "right",
        axis: "x",
        tolerance: { kind: "measurement-tolerance", id: "bad", value: -1 },
      }],
    })),
    "InvalidTolerancePolicy",
  );
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      requests: [{ kind: "measurement-request", requestRef: "bad", measurementType: "unsupported" }],
    })),
    "UnsupportedMeasurementRequest",
  );
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      requests: [{
        kind: "measurement-request",
        requestRef: "ratio:zero",
        measurementType: "ratio",
        numeratorRef: "element:side",
        denominatorRef: "rect:zero-area",
        ratioKind: "area",
      }],
    })),
    "IncompatibleMeasurementGeometry",
  );
  assertFailedWithDiagnostic(
    measureGeometryV1(measurementInput({
      requests: [{
        kind: "measurement-request",
        requestRef: "angle:zero",
        measurementType: "angle",
        sourceRef: "segment:zero",
        targetRef: "segment:zero",
        tolerance: { kind: "measurement-tolerance", id: "angle", value: 0 },
      }],
    })),
    "IncompatibleMeasurementGeometry",
  );
});

test("PR7 closed validation rejects malformed output, duplicates, non-finite facts, and PR8+ refs", () => {
  const output = runMeasurements([
    { kind: "measurement-request", requestRef: "area:side", measurementType: "area", sourceRef: "element:side", metric: "both" },
  ]);
  const twoMeasurementOutput = runMeasurements([
    { kind: "measurement-request", requestRef: "area:side", measurementType: "area", sourceRef: "element:side", metric: "both" },
    { kind: "measurement-request", requestRef: "area:main", measurementType: "area", sourceRef: "element:main", metric: "both" },
  ]);
  const coverageOutput = runMeasurements([
    {
      kind: "measurement-request",
      requestRef: "coverage:partial",
      measurementType: "coverage",
      targetRef: "surface:unit",
      contributorRefs: ["rect:inside"],
      metric: "both",
      coveragePolicy: "union-clipped",
    },
  ]);
  const validMeasurement = structuredClone(output.measurements[0]);
  const validCoverage = structuredClone(coverageOutput.measurements[0]);
  assertOk(validateMeasurementV1(validMeasurement));
  assertOk(validateMeasurementV1(validCoverage));
  assertOk(validateMeasurementResultV1(structuredClone(output)));
  assertOk(validateMeasurementResultV1(structuredClone(coverageOutput)));

  assertFailedWithDiagnostic(validateMeasurementV1({ ...validMeasurement, extra: true }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({ ...validMeasurement, measurementRef: "" }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({
    ...validMeasurement,
    result: { ...validMeasurement.result, normalizedArea: Number.NaN },
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({
    ...validMeasurement,
    result: { ...validMeasurement.result, normalizedArea: -1 },
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({ ...validMeasurement, score: 1 }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({ ...validMeasurement, componentScore: 1 }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({
    ...validMeasurement,
    evaluationRefs: [{ kind: "evaluation", ref: "future" }],
  }), "InvalidMeasurementV1");

  assertFailedWithDiagnostic(validateMeasurementResultV1({ ...output, extra: true }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...output,
    measurements: [validMeasurement, validMeasurement],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...twoMeasurementOutput,
    measurementRefs: [twoMeasurementOutput.measurementRefs[0], twoMeasurementOutput.measurementRefs[0]],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...output,
    measurementRefs: [{ kind: "measurement", ref: "" }],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...output,
    measurementRefs: [{ kind: "measurement", ref: "measurement:unknown" }],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...output,
    measurements: [{ ...validMeasurement, result: { ...validMeasurement.result, containmentStatus: "good" } }],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...output,
    measurements: [{ ...validMeasurement, measurementType: "coverage", result: { coverageRatio: 2 } }],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementResultV1({
    ...output,
    artifactRefs: [{ kind: "artifact", ref: "future" }],
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({
    ...validCoverage,
    result: { ...validCoverage.result, coveredArea: validCoverage.result.targetArea + EPSILON },
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({
    ...validCoverage,
    result: { ...validCoverage.result, uncoveredArea: validCoverage.result.uncoveredArea + 0.01 },
  }), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateMeasurementV1({
    ...validCoverage,
    result: { ...validCoverage.result, coverageRatio: validCoverage.result.coverageRatio + 0.01 },
  }), "InvalidMeasurementV1");
});
