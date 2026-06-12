# Norma Core Skeleton

This document tracks the Norma Core skeleton boundary across PR1, PR2, PR3, and PR4.
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

## Does Not Contain

- Geometry calculations.
- Implicit ratios or client-defined ratios outside validated packs.
- Construction, measurements, evaluation, artifacts, or scoring.
- Rule resolution or rule execution.
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
