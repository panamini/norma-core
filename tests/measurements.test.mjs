import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const measurementDiagnosticCodes = [
  "MissingMeasurementInput",
  "InvalidMeasurementInput",
  "MissingSourceGeometry",
  "MissingMeasurementMetricPolicy",
  "MissingMeasurementTolerancePolicy",
  "MissingMeasurementProvenance",
  "MeasurementGapWarning",
  "MeasurementOverlapWarning",
  "MeasurementOutOfTolerance",
  "MeasurementOutputRejected",
];

const measurementTypes = [
  "distance",
  "position",
  "alignment",
  "area",
  "ratio",
  "angle",
  "containment",
  "overlap",
  "coverage",
];

const metricCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-metric",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "metric",
};

const metricPolicy = {
  kind: "metric-policy",
  id: "pixel-length-policy",
  quantity: "length",
  unit: "px",
};

const tolerancePolicy = {
  kind: "tolerance-policy",
  id: "measurement-tolerance",
  coordinateTolerance: 0,
  metricTolerance: 1,
};

const surface1200x800 = {
  kind: "surface-space",
  id: "surface:1200x800",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
};

const compositionA = {
  kind: "composition-2d",
  id: "composition:A",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  surface: surface1200x800,
  elements: [
    { kind: "element", id: "left-third", geometry: { kind: "rect", x: 0, y: 0, width: 400, height: 800 } },
    { kind: "element", id: "middle-third", geometry: { kind: "rect", x: 400, y: 0, width: 400, height: 800 } },
    { kind: "element", id: "right-third", geometry: { kind: "rect", x: 800, y: 0, width: 400, height: 800 } },
  ],
};

const compositionB = {
  kind: "composition-2d",
  id: "composition:B",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  surface: surface1200x800,
  elements: [
    { kind: "element", id: "wide-left", geometry: { kind: "rect", x: 0, y: 0, width: 700, height: 800 } },
    { kind: "element", id: "offset-right", geometry: { kind: "rect", x: 650, y: 0, width: 400, height: 800 } },
  ],
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

function resolveMvpRuleSet() {
  const result = core.resolveRuleSet(core.BASIC_PROPORTIONS_PACK, core.SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(result);
  return result.output;
}

function generateMvpConstruction() {
  const result = core.generateConstruction({
    surface: surface1200x800,
    pack: core.BASIC_PROPORTIONS_PACK,
    resolvedRuleSet: resolveMvpRuleSet(),
    operationContextRef: { id: "context:construction" },
  });

  assertOk(result);
  return result.output;
}

function measureGeometry(overrides = {}) {
  return core.measureGeometry({
    construction: generateMvpConstruction(),
    compositionA,
    compositionB,
    operationContextRef: { id: "context:measurement" },
    requestedOutputs: ["measurements"],
    ...overrides,
  });
}

function findMeasurement(measurements, type, predicate) {
  const measurement = measurements.find((candidate) => (
    candidate.measurementType === type && predicate(candidate)
  ));
  assert.ok(measurement, `missing ${type} measurement`);
  return measurement;
}

function hasInputRef(measurement, kind, ref) {
  return measurement.inputRefs.some((inputRef) => inputRef.kind === kind && inputRef.ref === ref);
}

function assertMeasurementFact(measurement) {
  assert.equal(measurement.kind, "measurement");
  assert.ok(measurementTypes.includes(measurement.measurementType), measurement.measurementType);
  assert.ok(measurement.id.length > 0);
  assert.ok(measurement.metric.length > 0);
  assert.ok(measurement.unit.length > 0);
  assert.equal(typeof measurement.normalized, "boolean");
  assert.ok(Array.isArray(measurement.inputRefs));
  assert.ok(measurement.inputRefs.length > 0);
  assert.equal(measurement.metricPolicy.kind, "measurement-metric-policy");
  assert.equal(measurement.metricPolicy.sourceMetricPolicyRef, metricPolicy.id);
  assert.equal(measurement.tolerancePolicy.kind, "measurement-tolerance-policy");
  assert.equal(measurement.tolerancePolicy.sourceTolerancePolicyRef, tolerancePolicy.id);
  assert.equal(measurement.provenance.kind, "measurement-provenance");
  assert.equal(measurement.provenance.measurementRef, measurement.id);
  assert.deepEqual(measurement.provenance.inputRefs, measurement.inputRefs);
  assertNoForbiddenJudgmentFields(measurement);
}

function assertNoForbiddenJudgmentFields(value) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== "object") {
      continue;
    }

    for (const [key, child] of Object.entries(current)) {
      const normalizedKey = key.toLowerCase();
      assert.equal(normalizedKey.includes("score"), false, `forbidden score field: ${key}`);
      assert.equal(normalizedKey.includes("evaluation"), false, `forbidden evaluation field: ${key}`);
      assert.equal(normalizedKey.includes("decision"), false, `forbidden decision field: ${key}`);
      assert.equal(normalizedKey.includes("beauty"), false, `forbidden beauty field: ${key}`);
      assert.equal(normalizedKey.includes("intent"), false, `forbidden intent field: ${key}`);
      stack.push(child);
    }
  }
}

test("PR7 exports measurement vocabulary, diagnostics, helpers, and version", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr9");
  assert.deepEqual(core.MEASUREMENT_TYPES_V1, measurementTypes);

  for (const diagnosticCode of measurementDiagnosticCodes) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(diagnosticCode), diagnosticCode);
  }

  assert.equal(typeof core.measureGeometry, "function");
  assert.equal(typeof core.measureAreas, "function");
});

test("PR7 measures A/B compositions against construction guides without producing judgments", () => {
  const result = measureGeometry();
  assertOk(result);

  const measurementSet = result.output;
  assert.equal(measurementSet.kind, "measurement-set");
  assert.equal(measurementSet.constructionRef.ref, `construction:${surface1200x800.id}:${core.SURFACE_BASIC_THIRD_GRID_RULE_SET_ID}`);
  assert.deepEqual(measurementSet.compositions.map((composition) => composition.label), ["A", "B"]);
  assert.ok(measurementSet.surfaceHierarchy);
  assert.equal(measurementSet.surfaceHierarchy.kind, "surface-hierarchy");
  assert.ok(measurementSet.directionalRelations.length > 0);
  assertNoForbiddenJudgmentFields(measurementSet);

  const aMeasurements = measurementSet.compositions.find((composition) => composition.label === "A").measurements;
  for (const measurement of aMeasurements) {
    assertMeasurementFact(measurement);
  }

  const rightEdgeToOneThird = findMeasurement(aMeasurements, "distance", (measurement) => (
    hasInputRef(measurement, "element-edge", "composition:A:element:left-third:right")
    && hasInputRef(measurement, "guide", "guide:x:1/3")
  ));
  assert.equal(rightEdgeToOneThird.absoluteValue, 0);
  assert.equal(rightEdgeToOneThird.normalizedValue, 0);
  assert.equal(rightEdgeToOneThird.unit, "px");

  const rightEdgeAligned = findMeasurement(aMeasurements, "alignment", (measurement) => (
    hasInputRef(measurement, "element-edge", "composition:A:element:left-third:right")
    && hasInputRef(measurement, "guide", "guide:x:1/3")
  ));
  assert.equal(rightEdgeAligned.aligned, true);
  assert.equal(rightEdgeAligned.toleranceStatus, "within-tolerance");

  const leftThirdArea = findMeasurement(aMeasurements, "area", (measurement) => (
    hasInputRef(measurement, "element", "composition:A:element:left-third")
  ));
  assert.equal(leftThirdArea.area, 320000);
  assert.equal(leftThirdArea.relativeArea, 1 / 3);
  assert.equal(leftThirdArea.unit, "px^2");

  const bMeasurements = measurementSet.compositions.find((composition) => composition.label === "B").measurements;
  const bOverlap = findMeasurement(bMeasurements, "overlap", (measurement) => (
    hasInputRef(measurement, "element", "composition:B:element:wide-left")
    && hasInputRef(measurement, "element", "composition:B:element:offset-right")
  ));
  assert.equal(bOverlap.overlaps, true);
  assert.ok(measurementSet.directionalRelations.some((relation) => (
    relation.relation === "overlaps"
    && relation.sourceRef.ref === "composition:B:element:wide-left"
    && relation.targetRef.ref === "composition:B:element:offset-right"
  )));

  const diagonalAngle = findMeasurement(measurementSet.constructionMeasurements, "angle", (measurement) => (
    hasInputRef(measurement, "diagonal", "diagonal:surface:1200x800:bottom-left-to-top-right")
  ));
  assert.ok(Math.abs(diagonalAngle.angleDegrees - 33.690067525979785) < 1e-12);
  assert.equal(diagonalAngle.unit, "degrees");
});

test("PR7 applies overlap tolerance consistently across measurements and directional relations", () => {
  const construction = generateMvpConstruction();
  const tolerantComposition = {
    ...compositionB,
    tolerancePolicy: {
      ...tolerancePolicy,
      metricTolerance: 2,
    },
    elements: [
      { kind: "element", id: "nearly-left", geometry: { kind: "rect", x: 0, y: 0, width: 400, height: 400 } },
      { kind: "element", id: "nearly-right", geometry: { kind: "rect", x: 399, y: 399, width: 400, height: 400 } },
    ],
  };

  const result = core.measureGeometry({
    construction,
    compositionA: tolerantComposition,
    operationContextRef: { id: "context:measurement" },
    requestedOutputs: ["measurements"],
  });
  assertOk(result);

  const measurements = result.output.compositions[0].measurements;
  const overlap = findMeasurement(measurements, "overlap", (measurement) => (
    hasInputRef(measurement, "element", "composition:A:element:nearly-left")
    && hasInputRef(measurement, "element", "composition:A:element:nearly-right")
  ));
  assert.equal(overlap.overlapArea, 1);
  assert.equal(overlap.overlaps, false);
  assert.equal(result.output.directionalRelations.some((relation) => (
    relation.relation === "overlaps"
    && relation.sourceRef.ref === "composition:A:element:nearly-left"
    && relation.targetRef.ref === "composition:A:element:nearly-right"
  )), false);
});

test("PR7 measures areas, containment, overlap, and coverage with structured warnings", () => {
  const construction = generateMvpConstruction();
  const result = core.measureAreas({
    construction,
    composition: compositionB,
    compositionLabel: "B",
    operationContextRef: { id: "context:area-measurement" },
    requestedOutputs: ["measurements"],
  });

  assertOk(result);
  const output = result.output;
  assert.equal(output.kind, "area-measurement-set");

  for (const measurement of [
    ...output.areaMeasurements,
    ...output.containmentMeasurements,
    ...output.overlapMeasurements,
    ...output.coverageMeasurements,
  ]) {
    assertMeasurementFact(measurement);
  }

  const overlap = findMeasurement(output.overlapMeasurements, "overlap", (measurement) => (
    hasInputRef(measurement, "element", "composition:B:element:wide-left")
    && hasInputRef(measurement, "element", "composition:B:element:offset-right")
  ));
  assert.equal(overlap.overlaps, true);
  assert.equal(overlap.overlapArea, 40000);
  assert.equal(overlap.overlapRatio, 40000 / 960000);

  const surfaceCoverage = findMeasurement(output.coverageMeasurements, "coverage", (measurement) => (
    hasInputRef(measurement, "surface", "surface:1200x800")
  ));
  assert.equal(surfaceCoverage.targetArea, 960000);
  assert.equal(surfaceCoverage.coveredArea, 840000);
  assert.equal(surfaceCoverage.gapArea, 120000);
  assert.equal(surfaceCoverage.coverageRatio, 0.875);

  assert.ok(diagnosticCodes(result).includes("MeasurementOverlapWarning"));
  assert.ok(diagnosticCodes(result).includes("MeasurementGapWarning"));

  const aCoverage = core.measureAreas({
    construction,
    composition: compositionA,
    compositionLabel: "A",
    operationContextRef: { id: "context:area-measurement" },
    requestedOutputs: ["measurements"],
  });
  assertOk(aCoverage);

  const firstVerticalZoneCoverage = findMeasurement(aCoverage.output.coverageMeasurements, "coverage", (measurement) => (
    hasInputRef(measurement, "zone", "zone:surface:1200x800:vertical:verticalThirds:1:1:1:0")
  ));
  assert.equal(firstVerticalZoneCoverage.coverageRatio, 1);
  assert.equal(firstVerticalZoneCoverage.gapArea, 0);
});

test("PR7 rejects missing source geometry, missing metric policy, and forbidden output requests", () => {
  const construction = generateMvpConstruction();

  assertFailedWithDiagnostic(core.measureGeometry(null), "MissingMeasurementInput");
  assertFailedWithDiagnostic(
    core.measureGeometry({ construction, operationContextRef: { id: "context:measurement" } }),
    "MissingSourceGeometry",
  );

  assertFailedWithDiagnostic(
    core.measureGeometry({
      construction: { ...construction, metricPolicy: null },
      compositionA,
      operationContextRef: { id: "context:measurement" },
      requestedOutputs: ["measurements"],
    }),
    "MissingMeasurementMetricPolicy",
  );

  assertFailedWithDiagnostic(
    core.measureGeometry({
      construction: { ...construction, tolerancePolicy: null },
      compositionA,
      operationContextRef: { id: "context:measurement" },
      requestedOutputs: ["measurements"],
    }),
    "MissingMeasurementTolerancePolicy",
  );

  assertFailedWithDiagnostic(
    core.measureGeometry({
      construction,
      compositionA: {
        ...compositionA,
        coordinateSystem: {
          kind: "coordinate-system",
          id: "incomplete-coordinate-system",
          coordinateScale: "metric",
        },
      },
      operationContextRef: { id: "context:measurement" },
      requestedOutputs: ["measurements"],
    }),
    "InvalidMeasurementInput",
  );

  assertFailedWithDiagnostic(
    core.measureGeometry({
      construction,
      compositionA: {
        ...compositionA,
        coordinateSystem: {
          ...metricCoordinateSystem2d,
          origin: "top-left",
        },
      },
      operationContextRef: { id: "context:measurement" },
      requestedOutputs: ["measurements"],
    }),
    "InvalidMeasurementInput",
  );

  assertFailedWithDiagnostic(
    core.measureGeometry({
      construction,
      compositionA,
      operationContextRef: { id: "context:measurement" },
      requestedOutputs: ["evaluation"],
    }),
    "MeasurementOutputRejected",
  );

  assertFailedWithDiagnostic(
    core.measureGeometry({
      construction,
      compositionA,
      operationContextRef: { id: "context:measurement" },
      requestedOutputs: ["component-score"],
    }),
    "MeasurementOutputRejected",
  );
});
