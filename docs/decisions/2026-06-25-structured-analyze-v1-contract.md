# Structured Analyze V1 Contract

## Status

R6A is contract docs/tests only.

R6A approves the contract for one future direct structured analysis operation.

R6A does not implement runtime code, package exports, schemas, generated files,
MCP tool descriptors, tool annotations, ChatGPT app metadata, hosted MCP,
Developer Mode configuration, image input, vision input, CAD input, plugin
input, dependencies, package metadata, CI changes, or public submission.

The current MCP runtime inventory remains exactly the five tools documented in
`docs/OPERATIONS_RUNBOOK.md`.

## Decision

Structured Analyze V1 is the first post-R5 executable slice.

The direct operation approved for a later implementation PR is:

```text
export name: analyzeStructuredCompositionV1
operation name: core.structured-composition-analysis.analyze
operation version: 0.1.0-r6
input type: StructuredCompositionAnalysisInputV1
result type: StructuredCompositionAnalysisResultV1
```

The future MCP candidate approved by this contract is:

```text
norma.analyzeStructuredCompositionV1
```

The MCP tool may be implemented only after the direct operation exists and has
deterministic direct-core tests.

## Contract Selection

Structured Analyze V1 uses explicit user-supplied Core `Composition2D` data for
the first implementation slice.

It does not consume `AcceptedGeometry@1` directly.

The existing `AcceptedGeometry@1` validator and accepted-geometry-to-core
mapping contract remain the future provider/adapter path. If a later slice
starts from `AcceptedGeometry@1`, it must use the approved deterministic mapper
boundary and must not bypass validation or acceptance.

This choice keeps R6 small: it proves the product-facing analysis operation
against existing Core geometry without adding provider, perception, or mapper
runtime scope.

## Input Boundary

`StructuredCompositionAnalysisInputV1` must be a closed structured object with:

- `contractVersion`;
- `analysisId`;
- `compositionA`;
- `compositionB`;
- `acceptance`;
- `packLock`;
- `evaluationProfile`;
- `tolerancePolicy`;
- `operationContext`;
- `provenance`.

`contractVersion` must be exactly:

```text
structured-composition-analysis-input.v1
```

`compositionA` and `compositionB` must be explicit Core `Composition2D` payloads
that pass the same duplicate-ID, geometry-shape, and source-object validation
rules already proven by the MVP harness.

`acceptance` must record that the caller-provided structured composition data is
accepted for this operation. It must include:

- `accepted`;
- `mode`;
- `acceptedBy`;
- `acceptedAt`;
- `acceptedSourceIds`;
- `acceptanceRecordId`.

`accepted` must be exactly `true` before downstream computation can run.

`mode` must be explicit. The first allowed mode is:

```text
user_supplied_structured_data
```

`acceptedAt` is operational metadata. It must not affect deterministic
measurement, evaluation, comparison, decision, output refs, or replay-readiness
identity.

## Operation Semantics

The direct operation must:

1. validate the closed input object;
2. validate both compositions before construction, measurement, evaluation, or
   comparison;
3. reject missing or false acceptance before downstream computation;
4. use only explicit `packLock`, `evaluationProfile`, `tolerancePolicy`, and
   `operationContext` values;
5. run the existing deterministic construction, measurement, evaluation, and
   comparison path;
6. return full structured diagnostics, provenance, refs, decision, and
   replay-readiness data.

The operation must not:

- infer a pack;
- infer rules;
- infer tolerances;
- infer an operation context;
- infer geometry from free-form prompt text;
- silently repair duplicate IDs;
- automatically correct geometry;
- optimize a composition;
- recommend design changes;
- score beauty;
- call OpenAI, ChatGPT, a vision provider, camera, CAD, plugin, filesystem,
  network, shell, or remote service.

## Result Contract

`StructuredCompositionAnalysisResultV1` must be a closed structured result with:

- `kind`;
- `contractVersion`;
- `operationName`;
- `operationVersion`;
- `status`;
- `analysisId`;
- `inputRefs`;
- `outputRefs`;
- `validation`;
- `measurements`;
- `evaluations`;
- `comparison`;
- `decision`;
- `packLockRef`;
- `operationContextRef`;
- `replayReadiness`;
- `diagnostics`;
- `warnings`;
- `errors`;
- `provenance`;
- `serializationSummary`.

`kind` must be exactly:

```text
structured-composition-analysis-result
```

`contractVersion` must be exactly:

```text
structured-composition-analysis-result.v1
```

Allowed `status` values are:

```text
valid
invalid
failed
```

Domain validation failures must return `status: "invalid"` with deterministic
diagnostics and no downstream measurements, evaluations, comparison, decision,
or output refs.

Unexpected internal failures may throw in the direct operation boundary. If a
future MCP tool wraps the operation, those internal failures must map to
JSON-RPC `-32603` with no stack trace.

## Deterministic Fixtures

The implementation PR must include direct-core tests for three proof inputs:

- Case A: R3 structured case A, expected `decision.status` `a_closer`.
- Case B: R3 structured case B, expected `decision.status` `b_closer`.
- Case C: case A with a duplicate composition element ID, expected
  `status: "invalid"`, diagnostic `DuplicateGeometrySourceId`, no output refs,
  and no downstream computation.

The direct operation tests must prove repeat determinism for the valid cases.

The future MCP tool tests must prove direct-core/MCP parity for the same cases.

## MCP Tool Contract

R6A approves this future tool name only:

```text
norma.analyzeStructuredCompositionV1
```

R6A does not expose the tool.

The current five tools remain:

```text
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

If the future MCP implementation PR proceeds, `tools/list` must append the new
tool after the five current tools:

```text
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
norma.analyzeStructuredCompositionV1
```

The tool descriptor must declare `inputSchema` and `outputSchema` from first
introduction. Both schemas must use `additionalProperties: false` for every
closed object.

The future tool annotations must be:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

These annotations describe client-facing behavior only. Server-side validation
and operation constraints remain mandatory enforcement.

The future MCP tool result must keep the existing local MCP envelope rule:

- exactly one text content item;
- text is canonical JSON;
- parsed text equals `structuredContent`;
- `isError` is not used for domain validation failures.

Malformed `tools/call` params or malformed tool arguments must return JSON-RPC
`-32602`. Validly shaped domain-invalid analysis input must return structured
`status: "invalid"`.

## Compatibility

Adding `norma.analyzeStructuredCompositionV1` is a tool inventory change and
requires its own implementation PR after R6A.

Changing the direct operation name, operation version, input required fields,
result status semantics, diagnostic names, or output refs is breaking.

Adding optional result fields may be compatible only when existing consumers can
ignore them without losing diagnostics, provenance, replay-readiness, or source
truth.

## Validation Gates

R6B may implement the direct operation only when it keeps these gates:

- no MCP tool exposure;
- no provider, image, camera, CAD, plugin, network, filesystem, shell, or hosted
  behavior;
- direct-core deterministic A/B/C tests pass;
- invalid input cannot reach downstream computation;
- existing MVP harness behavior remains unchanged.

R6C may implement the MCP tool only when it keeps these gates:

- direct operation already exists;
- current five tools remain unchanged;
- the new tool is appended and has `inputSchema`, `outputSchema`, and
  annotations from first exposure;
- direct-core/MCP parity tests pass for A/B/C;
- current local STDIO transport remains local-only;
- Developer Mode proof remains private/dev only.

## Rollback

Rollback of R6A is to revert this decision, the R6A roadmap/runbook/MCP contract
references, the R6A contract tests, and exact guard maintenance for the R6A file
set.

No runtime migration, data migration, package migration, external tunnel cleanup,
or ChatGPT app cleanup is required because R6A creates no runtime or external
state.
