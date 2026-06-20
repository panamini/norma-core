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

## Does Not Contain

- Geometry calculations.
- Ratio packs or implicit ratios.
- Construction, measurements, evaluation, artifacts, or scoring.
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
