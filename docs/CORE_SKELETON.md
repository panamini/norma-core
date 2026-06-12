# Norma Core Skeleton

This document tracks the Norma Core skeleton boundary across PR1, PR2, PR3, PR4, PR5, PR6, PR7, PR8, and PR9.
PR1 creates the minimal TypeScript boundary for Norma Core. It is a skeleton only: it defines the result envelope, diagnostics, provenance, runtime placeholders, and operation stubs needed by later PRs.

## Contains

- `CoreResult` with `status`, `warnings`, `errors`, `provenance`, `outputRefs`, and runtime refs.
- Structured diagnostics with `code`, `severity`, `message`, `targetRef`, `source`, `blocking`, and `provenance`.
- Mandatory PR1 diagnostics, including missing operation, unsupported operation, invalid input shape, missing provenance, and forbidden dependency failures.
- Conceptual placeholders for `Run`, `PackLock`, and `OperationContext`.
- An empty registry and one known skeleton stub operation.
- Minimal helpers that fail with structured results instead of throwing or returning unstructured values.

## PR2 Contract Layer

PR2 keeps the core contract-only. It adds canonical operation call/result vocabulary, validation levels, and a conceptual V1 operation registry while leaving every future business operation as a stub.

The operation call contract can carry explicit `operation`, `operationVersion`, `input`, `operationContext`, `packLock`, rule/profile refs, tolerances, coordinate and metric policies, requested outputs/artifacts, feature flags, and source references. It rejects free-form prompts as source input, implicit pack usage, hidden tolerances, and output-changing defaults that are not explicit and versioned.

The operation result contract keeps `status`, `output`, `outputRefs`, `warnings`, `errors`, `provenance`, `runRef`, `packLockRef`, and `operationContextRef` visible. Derived output without provenance and results missing `output` or diagnostic arrays are invalid.

## PR3 Geometry Model V1

PR3 adds the minimal geometry model that later operations can validate against without starting construction or measurement work. Geometry V1 is intentionally small:

- `SegmentSpace` is a bounded 1D space.
- `SurfaceSpace` is a rectangular 2D axis-aligned space.
- `Composition2D` is a rectangular `SurfaceSpace` plus rectangular `Element` values and optional `Anchor` values.
- `CoordinateSystem` is mandatory for accepted geometry and uses the Norma canonical frame: bottom-left origin, `x` to the right, `y` upward.
- `MetricPolicy` is separate from normalized coordinates; normalized coordinates may live in `[0,1]` but are not metric measurements.
- `TolerancePolicy` is explicit when supplied.

The PR3 validator returns structured `CoreResult` failures for missing coordinate systems, invalid geometry, missing metric policy for metric coordinate spaces, and unsupported V1 geometry.
`validateGeometryV1` is a boundary validator only. It does not construct, transform, measure, normalize, score, or repair geometry.

## PR4 Ratio Pack Model

PR4 adds the minimal declarative ratio pack model and the MVP pack `norma.basic-proportions@0.1.0`.
The pack contains ratios `1/2`, `1/3`, and `2/3`, ratio sequence `1:1:1`, partition patterns `halves` and `thirds`, and the declared rule set `surface-basic-third-grid`.

The ratio pack validator returns structured `CoreResult` failures for missing pack identity fields, missing content identity, duplicate or invalid ratios, invalid ratio sequences, missing ratio references, unsupported pack schema versions, and forbidden beauty/UI/rendering claims.
`1:1:1` is modeled as a `RatioSequence` with normalized parts, not as three independent ratios.
`surface-basic-third-grid` is declaration-only in PR4. It is not resolved, executed, or used to generate construction.

PR4 also introduces a pre-lock `RatioPackPreLock` shape that exposes pack id, pack version, schema version, and content identity without finalizing PR11 `PackLock` behavior.

## PR5 Rule Declarations And Resolution

PR5 stabilizes the boundary between pack-owned rule declarations and core-owned supported rule types. Packs declare ordered rule refs and required ratio refs; the core exposes the V1 rule type registry and resolves only supported rule types.

The MVP rule set `surface-basic-third-grid` resolves to a `resolvedRuleSet` trace with `ruleSetRef`, `orderedRules`, `resolvedRatioRefs`, `unsupportedRules`, and `warnings`.
This trace preserves pack/rule provenance for PR6 without producing construction.

PR5 rejects missing rule sets, missing rule declarations, missing rule types, unsupported rule types, invalid rule declarations or rule sets, agent-created rules, and executable rule code in packs with structured diagnostics.

## PR6 Construction Generation

PR6 adds the first structured construction output. `generateConstruction` consumes a valid rectangular `SurfaceSpace`, a validated ratio pack, and a traceable `ResolvedRuleSet`; it rejects missing inputs, unresolved rule sets, unsupported construction geometry, unsupported construction rules, missing provenance, missing traces, and derived objects without sources.

The MVP construction contains guides, zones, one `3 x 3` grid with 9 cells, two surface diagonals, guide-guide intersections, guide-border intersections, a diagonal center intersection, `constructionTrace`, warnings, and provenance. Guide positions and grid partitions are read from the pack/rule set (`1/3`, `1/2`, `2/3`, and `1:1:1`) rather than hidden core constants.

Every derived PR6 object carries minimum provenance back to input, pack, rule, and operation. `constructionTrace` exposes applied rule refs, operation refs, created object refs, rule applications, and warnings so generation is not opaque.

## PR7 Measurements

PR7 adds calculated measurement facts over the PR6 construction and structured `Composition2D` inputs. `measureGeometry` accepts a traceable construction plus one or more compositions, including the A/B shape used by the MVP flow, and returns a `measurement-set`. `measureAreas` exposes the area, containment, overlap, and coverage subset for one composition.

Measurement V1 contains distance, position, alignment, area, ratio, angle, containment, overlap, and coverage facts. It also includes minimal directional relations and a minimal surface hierarchy that ties surface, construction, zones, grid cells, compositions, and elements together for traceability.

Every measurement declares input references, unit, normalization status, metric policy context, tolerance policy context, and measurement provenance. PR7 can warn about gaps, overlaps, and out-of-tolerance alignment facts, but it does not interpret those facts as quality, intent, preference, or aesthetic value.

PR7 rejects missing measurement input, missing source geometry, missing metric policy for metric measurements, missing tolerance policy, missing measurement provenance, and requested outputs that belong to evaluation, comparison, artifacts, decisions, recommendations, or scores.

## PR8 Evaluation Profile And Minimal Scoring

PR8 adds `EvaluationProfile`, `Evaluation`, `ComponentScore`, minimal `Score`, `Confidence`, and `evaluateCompositionBasic`. The MVP profile `basic-grid-alignment` reads PR7 measurement facts through six components: `guide_proximity`, `alignment`, `containment`, `overlap_penalty`, `coverage_match`, and `area_ratio_match`.

Evaluation requires explicit PR7 measurements, profile, pack, PackLock or PR4 pre-lock, evaluation tolerances, and tolerance policy. It does not create ratios, rules, or measurements, and it does not use hidden tolerances or a hidden default profile.

The PR8 score is only a minimal summary derived from sourced component scores inside an `Evaluation`. Confidence remains a separate object and is not mixed into the score. PR8 can evaluate A and B separately, but it does not compare them, rank them, decide between them, recommend an option, produce artifacts, infer intent, or produce beauty/aesthetic claims.

PR8 rejects missing evaluation inputs, beauty score requests, and intention inference requests with structured diagnostics.

## PR9 Comparison And Decision

PR9 adds `compareCompositionsBasic`, `Comparison`, `Decision`, and a structured minimal `Explanation`. It compares two already-produced PR8 evaluations in a shared context and reports only which evaluation is closer to the declared system.

The comparison validates the explicit context it can prove from PR8 evaluation fields and provenance: pack, effective PackLock or PR4 pre-lock, profile, evaluation tolerances, tolerance policy, surface, coordinate system, metric policy, and operation context. A mismatch produces `non_comparable`; missing required proof produces `ambiguous`.

PR9 uses the existing minimal scores, component scores, measurement refs, and evaluation provenance. It does not recalculate PR7 measurements or PR8 evaluations. Tie handling is explicit through a tie policy or tie tolerance, and `tie`, `ambiguous`, and `non_comparable` are valid comparison statuses.

The decision language is controlled: it may say `A is closer to the declared system`, `B is closer to the declared system`, `tie`, `ambiguous`, or `non comparable`. It does not produce recommendation, optimization, beauty, preference, intent inference, artifacts, reports, SVG, UI, or PR10 outputs.

## Does Not Contain

- Geometry calculations outside PR6 construction generation and PR7 measurement facts.
- Implicit ratios or client-defined ratios outside validated packs.
- Recommendations, artifacts, standalone scores, optimization, or aesthetic decisions.
- Generic rule execution outside the supported PR6 construction rule types.
- 3D, curves, polygons, rotated rectangles, native layers, images, camera/tracking, plugin objects, CAD-native objects, or UI styling.
- UI, camera, image, vision, OpenCV, tracking, plugin, CAD, cloud, marketplace, CLI, SDK, MCP, or replay runtime.
- A final JSON schema or final public API contract for future business operations.

## Rules

### Structured Result Always

Every exported runtime helper returns a `CoreResult`. A result must expose visible status, diagnostics, provenance fields, and output references even when empty.

### No Silent Failure

Known failure modes return explicit diagnostics. Missing operations, unsupported operations, malformed input, missing provenance, critical warning suppression, and forbidden dependency references are represented as structured failures.

### No Client Dependency

Core PR1 does not import or depend on UI, camera, image, plugin, CAD, cloud, marketplace, SDK, MCP, or adapter code. Future clients may call the core, but they cannot define Norma Core truth.

### No Fake Success

The skeleton stub operation returns `not_implemented` with a blocking diagnostic and no output. It does not claim construction, measurement, evaluation, artifact, score, or any business result.

## Runtime Placeholders

`Run`, `PackLock`, and `OperationContext` exist only as conceptual placeholders in PR1. They reserve replay-readiness vocabulary without implementing full replay, pack resolution, context policy, or output-changing defaults.

## PR1 Boundary

PR1 proves only that the repository can compile and test a strict core skeleton. It does not prove the geometry engine, pack engine, rule execution, measurements, evaluations, artifacts, or the MVP demo.
