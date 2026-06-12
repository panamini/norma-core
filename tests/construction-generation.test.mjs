import assert from "node:assert/strict";
import test from "node:test";

import {
  BASIC_PROPORTIONS_PACK,
  CORE_DIAGNOSTIC_CODES,
  CORE_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  deriveIntersections,
  generateConstruction,
  generateDiagonals,
  generateGuides,
  generateSimpleGrid,
  generateZones,
  resolveRuleSet,
} from "../dist/src/index.js";

const expectedRuleRefs = [
  "verticalThirds",
  "horizontalThirds",
  "centerAxes",
  "thirdGrid",
  "surfaceDiagonals",
  "deriveIntersections",
];

const constructionDiagnosticCodes = [
  "MissingConstructionInput",
  "MissingResolvedRuleSet",
  "InvalidConstructionInput",
  "UnsupportedConstructionGeometry",
  "UnsupportedConstructionRule",
  "MissingConstructionProvenance",
  "ConstructionTraceMissing",
  "DerivedObjectMissingSource",
];

const forbiddenOutputFields = [
  "measurement",
  "measurements",
  "evaluation",
  "score",
  "scoring",
  "artifact",
  "artifacts",
  "svg",
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
  id: "exact-construction",
  coordinateTolerance: 0,
  metricTolerance: 0,
};

const surface1200x800 = {
  kind: "surface-space",
  id: "surface:1200x800",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
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

function resolveMvpRuleSet(pack = BASIC_PROPORTIONS_PACK) {
  const result = resolveRuleSet(pack, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(result);
  return result.output;
}

function mvpConstructionInput(overrides = {}) {
  return {
    surface: surface1200x800,
    pack: BASIC_PROPORTIONS_PACK,
    resolvedRuleSet: resolveMvpRuleSet(),
    ...overrides,
  };
}

function assertMinimumProvenance(value, expectedRuleRef = value.ruleRef) {
  assert.ok(value.provenance, `${value.id ?? value.kind} missing provenance`);
  assert.equal(value.provenance.inputRef, surface1200x800.id);
  assert.equal(value.provenance.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(value.provenance.ruleRef, expectedRuleRef);
  assert.equal(typeof value.provenance.operationRef, "string");
  assert.ok(value.provenance.operationRef.length > 0);
}

function allDerivedObjects(construction) {
  return [
    construction,
    construction.constructionTrace,
    ...construction.guides,
    ...construction.zones,
    construction.grid,
    ...construction.grid.cells,
    ...construction.diagonals,
    ...construction.intersections,
  ];
}

function clonePack(overrides = {}) {
  return {
    ...structuredClone(BASIC_PROPORTIONS_PACK),
    ...overrides,
  };
}

test("PR7 keeps construction generation vocabulary and diagnostics available", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr11");

  for (const diagnosticCode of constructionDiagnosticCodes) {
    assert.ok(CORE_DIAGNOSTIC_CODES.includes(diagnosticCode), diagnosticCode);
  }

  for (const helper of [
    generateConstruction,
    generateGuides,
    generateZones,
    generateSimpleGrid,
    generateDiagonals,
    deriveIntersections,
  ]) {
    assert.equal(typeof helper, "function");
  }
});

test("PR6 generates the MVP construction from a resolved rule set", () => {
  const result = generateConstruction(mvpConstructionInput());
  assertOk(result);

  const construction = result.output;
  assert.equal(construction.kind, "construction");
  assert.equal(construction.sourceGeometryRef.ref, surface1200x800.id);
  assert.equal(construction.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(construction.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assert.deepEqual(construction.warnings, []);

  const verticalGuides = construction.guides.filter((guide) => guide.axis === "x");
  const horizontalGuides = construction.guides.filter((guide) => guide.axis === "y");

  assert.deepEqual(verticalGuides.map((guide) => guide.ratioRef), ["1/3", "1/2", "2/3"]);
  assert.deepEqual(horizontalGuides.map((guide) => guide.ratioRef), ["1/3", "1/2", "2/3"]);
  assert.deepEqual(verticalGuides.map((guide) => guide.normalizedPosition), [1 / 3, 1 / 2, 2 / 3]);
  assert.deepEqual(horizontalGuides.map((guide) => guide.normalizedPosition), [1 / 3, 1 / 2, 2 / 3]);
  assert.deepEqual(verticalGuides.map((guide) => guide.position), [400, 600, 800]);
  assert.deepEqual(horizontalGuides.map((guide) => guide.position), [800 * (1 / 3), 400, 800 * (2 / 3)]);

  assert.equal(construction.zones.length, 6);
  assert.equal(construction.grid.rows, 3);
  assert.equal(construction.grid.columns, 3);
  assert.equal(construction.grid.id, "grid:surface:1200x800:thirdGrid:1:1:1");
  assert.equal(construction.grid.cells.length, 9);
  assert.deepEqual(
    construction.grid.cells.map((cell) => [cell.rowIndex, cell.columnIndex]),
    [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ],
  );
  assert.ok(construction.zones.every((zone) => zone.id.startsWith("zone:surface:1200x800:")));
  assert.ok(construction.zones.every((zone) => !zone.id.includes("-third:")));

  assert.equal(construction.diagonals.length, 2);
  assert.deepEqual(construction.diagonals.map((diagonal) => diagonal.id), [
    "diagonal:surface:1200x800:bottom-left-to-top-right",
    "diagonal:surface:1200x800:top-left-to-bottom-right",
  ]);

  const guideGuideIntersections = construction.intersections.filter((point) => point.intersectionKind === "guide-guide");
  const guideBorderIntersections = construction.intersections.filter((point) => point.intersectionKind === "guide-border");
  const diagonalIntersections = construction.intersections.filter((point) => point.intersectionKind === "diagonal-diagonal");

  assert.equal(guideGuideIntersections.length, 9);
  assert.equal(guideBorderIntersections.length, 12);
  assert.equal(diagonalIntersections.length, 1);
  assert.deepEqual(diagonalIntersections[0].point, { kind: "point", x: 600, y: 400 });
  assert.ok(guideGuideIntersections.some((point) => point.point.x === 600 && point.point.y === 400));

  for (const field of forbiddenOutputFields) {
    assert.equal(field in construction, false, `${field} must stay out of PR6 construction output`);
  }
});

test("PR6 keeps every derived object and trace minimally provenance-backed", () => {
  const result = generateConstruction(mvpConstructionInput());
  assertOk(result);

  const construction = result.output;
  const trace = construction.constructionTrace;

  assert.equal(trace.kind, "construction-trace");
  assert.deepEqual(trace.appliedRuleRefs, expectedRuleRefs);
  assert.ok(trace.operationRefs.includes("core.construction-v1.generate@0.1.0"));
  assert.ok(trace.operationRefs.includes("core.construction-v1.guides.generate@0.1.0"));
  assert.ok(trace.operationRefs.includes("core.construction-v1.intersections.derive@0.1.0"));
  assert.ok(trace.createdObjectRefs.some((ref) => ref.ref === "guide:x:1/3"));
  assert.ok(trace.createdObjectRefs.some((ref) => ref.ref === "grid:surface:1200x800:thirdGrid:1:1:1"));
  assert.ok(trace.createdObjectRefs.some((ref) => ref.ref === "intersection:diagonal-diagonal:center"));
  assert.deepEqual(trace.warnings, []);

  for (const ruleRef of expectedRuleRefs) {
    const application = trace.ruleApplications.find((candidate) => candidate.ruleRef === ruleRef);
    assert.ok(application, ruleRef);
    assert.ok(application.createdObjectRefs.length > 0, ruleRef);
  }

  for (const derivedObject of allDerivedObjects(construction)) {
    assertMinimumProvenance(derivedObject, derivedObject.kind === "construction-trace" ? construction.ruleSetRef : derivedObject.provenance.ruleRef);
  }

  for (const guide of construction.guides) {
    assert.ok(expectedRuleRefs.includes(guide.ruleRef));
    assert.equal(guide.provenance.ruleRef, guide.ruleRef);
  }

  for (const zone of construction.zones) {
    assert.ok(zone.sourceGuideRefs.length > 0);
  }

  for (const cell of construction.grid.cells) {
    assert.equal(cell.sourceGridRef, construction.grid.id);
    assert.ok(cell.sourceGuideRefs.length >= 2);
  }

  for (const intersection of construction.intersections) {
    assert.ok(intersection.sourceObjectRefs.length >= 2);
    assert.equal(intersection.ruleRef, "deriveIntersections");
  }
});

test("PR6 reads guide values from the pack instead of hiding ratio constants in core", () => {
  const pack = clonePack({
    ratios: BASIC_PROPORTIONS_PACK.ratios.map((ratio) => (
      ratio.id === "1/3" ? { ...ratio, numerator: 2, denominator: 5, normalizedValue: 2 / 5 } : ratio
    )),
  });
  const resolvedRuleSet = resolveMvpRuleSet(pack);

  const result = generateGuides(mvpConstructionInput({ pack, resolvedRuleSet }));
  assertOk(result);

  const oneThirdVerticalGuide = result.output.find((guide) => guide.id === "guide:x:1/3");
  assert.ok(oneThirdVerticalGuide);
  assert.equal(oneThirdVerticalGuide.normalizedPosition, 2 / 5);
  assert.equal(oneThirdVerticalGuide.position, 480);
});

test("PR6 rejects grid rules with multiple ratio sequences until row and column sequences are explicit", () => {
  const pack = clonePack({
    ratioSequences: [
      ...BASIC_PROPORTIONS_PACK.ratioSequences,
      {
        kind: "ratio-sequence",
        id: "1:1",
        parts: [1, 1],
        normalizedParts: [1 / 2, 1 / 2],
      },
    ],
    ruleDeclarations: BASIC_PROPORTIONS_PACK.ruleDeclarations.map((rule) => (
      rule.id === "thirdGrid" ? { ...rule, sequenceRefs: ["1:1:1", "1:1"] } : rule
    )),
  });
  const resolvedRuleSet = resolveMvpRuleSet(pack);

  assertFailedWithDiagnostic(
    generateSimpleGrid(mvpConstructionInput({ pack, resolvedRuleSet })),
    "UnsupportedConstructionRule",
  );
});

test("PR6 rejects missing, unresolved, unsupported, or non-surface construction inputs", () => {
  assertFailedWithDiagnostic(generateConstruction(null), "MissingConstructionInput");
  assertFailedWithDiagnostic(
    generateConstruction({ surface: surface1200x800, pack: BASIC_PROPORTIONS_PACK }),
    "MissingResolvedRuleSet",
  );

  const badGeometry = {
    ...surface1200x800,
    kind: "polygon",
  };
  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({ surface: badGeometry })),
    "UnsupportedConstructionGeometry",
  );

  const missingRuleSet = {
    ...resolveMvpRuleSet(),
    orderedRules: resolveMvpRuleSet().orderedRules.filter((rule) => rule.type !== "createSimpleGrid"),
  };
  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({ resolvedRuleSet: missingRuleSet })),
    "UnsupportedConstructionRule",
  );

  const unsupportedRuleSet = {
    ...resolveMvpRuleSet(),
    orderedRules: [
      {
        ...resolveMvpRuleSet().orderedRules[0],
        type: "futureConstructionRule",
      },
      ...resolveMvpRuleSet().orderedRules.slice(1),
    ],
  };
  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({ resolvedRuleSet: unsupportedRuleSet })),
    "UnsupportedConstructionRule",
  );
});

test("PR6 rejects resolved rule sets that are not fully tied to the pack rule set", () => {
  const resolvedRuleSet = resolveMvpRuleSet();
  const firstRule = resolvedRuleSet.orderedRules[0];

  const missingResolvedRatioRefs = structuredClone(resolvedRuleSet);
  delete missingResolvedRatioRefs.resolvedRatioRefs;
  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({ resolvedRuleSet: missingResolvedRatioRefs })),
    "MissingResolvedRuleSet",
  );

  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({
      resolvedRuleSet: {
        ...resolvedRuleSet,
        ruleSetRef: "inventedRuleSet",
      },
    })),
    "InvalidConstructionInput",
  );

  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({
      resolvedRuleSet: {
        ...resolvedRuleSet,
        orderedRules: [
          {
            ...firstRule,
            ruleSetRef: "inventedRuleSet",
          },
          ...resolvedRuleSet.orderedRules.slice(1),
        ],
      },
    })),
    "InvalidConstructionInput",
  );

  assertFailedWithDiagnostic(
    generateConstruction(mvpConstructionInput({
      resolvedRuleSet: {
        ...resolvedRuleSet,
        orderedRules: [
          {
            ...firstRule,
            ref: "inventedRule",
          },
          ...resolvedRuleSet.orderedRules.slice(1),
        ],
      },
    })),
    "InvalidConstructionInput",
  );
});
