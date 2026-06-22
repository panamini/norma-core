# Norma Core Skeleton

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

The operation call contract can carry explicit `operation`, `operationVersion`, `input`, structured `operationContext` and `packLock` refs, rule/profile refs, tolerances, coordinate and metric policies, requested outputs/artifacts, feature flags, and source references. It rejects free-form prompts as source input, implicit pack usage, hidden tolerances, and output-changing defaults that are not explicit and versioned.

The operation result contract keeps `status`, `output`, `outputRefs`, `warnings`, `errors`, `provenance`, `runRef`, `packLockRef`, and `operationContextRef` visible. Nullable fields must still be present as explicit `null` values when absent. Derived output without provenance, malformed provenance/runtime refs, and results missing `output` or diagnostic arrays are invalid.

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

PR4 adds the minimal declarative ratio pack model that later rule-resolution work can reference without executing rules. The MVP pack is `norma.basic-proportions` version `0.1.0`, schema `ratio-pack-v1`, with content identity `norma.basic-proportions@0.1.0:ratio-pack-v1:mvp-minimal`.

The MVP pack declares:

- Ratios `1/2`, `1/3`, and `2/3`.
- Ratio sequence `1:1:1`.
- Partition patterns `halves` and `thirds`.
- Declaration-only rule set `surface-basic-third-grid`.

`validateRatioPackV1` validates the pack shape, required identity fields, duplicate IDs across pack-owned collections, and missing cross-references. Missing referenced ratios, sequences, partition patterns, or rule declarations return `MissingRatioReference` instead of generic structural diagnostics. Read helpers expose declared ratios, ratio sequences, partition patterns, and rule sets from a validated pack.

`RatioPackPreLock` remains a pre-lock identity carrier only. It is not a final `PackLock`, does not resolve pack runtime state, and does not execute rule behavior.

## PR5 Rule Resolution V1

PR5 adds a minimal rule-resolution model for declaration-only rule sets. `resolveRuleSetV1` validates a Ratio Pack V1 input, locates a declared rule set, and resolves each referenced rule declaration to explicit ratio, sequence, and partition-pattern references.

Rule Resolution V1 output is a visible `rule-resolution-v1` envelope with provenance, pack identity, rule refs, and empty construction, measurement, artifact, and scoring refs. It does not create guide lines, coordinates, geometry, measurements, scores, artifacts, or UI output.

`validateRuleResolutionV1` validates the resolved envelope shape and rejects unsupported output-looking fields so rule resolution cannot silently broaden into construction or evaluation.

## PR6 Construction Generation V1

PR6 adds deterministic Construction Generation V1 on top of validated `SurfaceSpace` geometry and PR5 `RuleResolutionV1` output. `generateConstructionV1` consumes resolved rule data instead of reinterpreting raw pack declarations, derives guides, zones, a simple grid when both partition axes are authorized, supported guide intersections, and a closed construction trace.

Construction V1 output is a visible `construction-v1` envelope with input, pack, rule, operation, source-reference, and object-level provenance. It remains derived geometry only: no measurements, scores, decisions, artifacts, rendering, UI model, replay runtime, final `PackLock`, or PR7 behavior are produced.

`validateConstructionV1` validates the closed output shape, nested geometry, unique deterministic refs, trace coverage, empty future-output refs, and minimum provenance for every derived object.

## PR7 Measurements V1

PR7 adds deterministic Measurements V1 on top of Geometry V1 and Construction V1. `measureGeometryV1` consumes explicit structured measurement requests over validated surface, composition, construction, and declared geometry refs. `measureAreasV1` is a small area-only helper that expands explicit source refs into area requests.

Measurements V1 output is a visible `measurement-result-v1` envelope with closed nested `measurement-v1` facts for distance, position, alignment, angle, area, ratio, containment, overlap, coverage, directional relation, and surface hierarchy. Measurement facts distinguish normalized, metric, dimensionless, and radian units, require explicit metric/tolerance policies where they affect semantics, preserve source geometry and construction lineage, and keep PR8+ refs empty.

Measurements remain calculated facts only: no evaluation, component scoring, score, comparison, decision, explanation, artifact, rendering, UI model, replay runtime, or final `PackLock` behavior is produced.

## PR8 Evaluation Profile and Minimal Scoring V1

PR8 adds deterministic Evaluation V1 on top of validated PR7 measurements. `evaluateCompositionBasicV1` consumes one `MeasurementResultV1`, one explicit `EvaluationProfileV1`, composition/construction/pack/rule-set refs, and an explicit evaluation operation version. It does not regenerate construction, recalculate geometry, rerun measurements, compare candidates, decide winners, explain recommendations, or emit artifacts.

EvaluationProfile V1 is a closed policy object. It declares component definitions, measurement refs, weights, missing-measurement behavior, status thresholds, confidence policy, limits, source refs, and provenance. Weights are explicit finite non-negative values; the evaluator normalizes the calculated component weights so effective weights sum to 1.

Supported component scoring formulas are profile-declared and closed:

- `guide_proximity`: `clamp(1 - abs(normalizedDistance - targetDistance) / tolerance, 0, 1)`.
- `alignment`: `clamp(1 - abs(normalizedDelta - targetDelta) / tolerance, 0, 1)`.
- `containment`: explicit profile status map for `inside`, `on_boundary`, `partially_outside`, and `outside`.
- `overlap_penalty`: `clamp(1 - max(overlapRatioA, overlapRatioB) / tolerance, 0, 1)`.
- `coverage_match`: `clamp(1 - abs(coverageRatio - target) / tolerance, 0, 1)`.
- `area_ratio_match`: `clamp(1 - absoluteDelta / tolerance, 0, 1)`.

Overall score is `sum(normalizedScore * effectiveWeight)` across calculated component scores. Confidence is separate from score: `clamp(1 - optionalMissingPenalty * missingOptionalComponents - ambiguousMeasurementPenalty * ambiguousMeasurements - warningPenalty * warningCount, 0, 1)`. Evaluation status is chosen from profile thresholds and becomes `ambiguous` when confidence is below the profile minimum for normal status.

## PR9 Comparison, Decision, and Structured Explanation V1

PR9 adds deterministic two-evaluation comparison on top of validated PR8 Evaluation V1 outputs. `compareCompositionsBasicV1` consumes exactly two validated evaluations, an explicit closed comparison policy, and an explicit comparison operation version. It does not rerun measurements, recalculate scores, read raw geometry, rank candidate sets, recommend a composition, or emit artifacts.

Comparison V1 first checks shared evaluation context before score facts can influence status. The comparable context currently includes evaluation schema/operation refs, profile ref, pack ref, rule-set ref, construction ref, score/confidence schema refs, score/evaluation limits, confidence policy, status thresholds, missing-measurement policy, and weight-normalization identity. Candidate-specific refs such as composition, measurement result, evaluation, score, and component score refs may differ.

Status precedence is deterministic: malformed inputs fail; context mismatches return `non_comparable`; ambiguous evaluation status or confidence below policy returns `ambiguous`; `absoluteScoreDelta <= tieTolerance` returns `tie`; otherwise positive score delta returns `a_closer` and negative score delta returns `b_closer`. Decision V1 only selects an evaluation/composition for `a_closer` or `b_closer`. StructuredExplanation V1 is source-backed and uses closed claim codes and template summaries only.

## Does Not Contain

- Geometry calculations outside explicit Measurements V1 requests.
- Implicit ratios, ratio inference, or generated ratio defaults.
- Recommendations, optimizations, creative corrections, artifacts, or PR10+ behavior.
- 3D, curves, polygons, rotated rectangles, native layers, images, camera/tracking, plugin objects, CAD-native objects, or UI styling.
- UI, camera, image, vision, OpenCV, tracking, plugin, CAD, cloud, marketplace, API, CLI, SDK, MCP, or replay runtime.
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
