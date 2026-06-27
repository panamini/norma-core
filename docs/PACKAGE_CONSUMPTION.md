# Norma Core V1.5 Package Consumption

## Status

PR25 scope, refreshed by R18 for the existing Structured Analyze public engine surface.

Local/build-based consumption only.

Package remains private.

No SDK runtime.

No new CLI behavior.

No API.

No new MCP behavior.

No adapter.

No package publish.

## Import

After `npm run build`, local consumers can import approved trust-layer operations and the existing Structured Analyze operation through the package root export:

```js
import {
  analyzeStructuredCompositionV1,
  verifyArtifactFreshness,
  verifyRun,
  replayRun,
  serializeCanonicalJson,
  canonicalizeOutputRefs,
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
} from "@norma/core";
```

The root export resolves to `./dist/src/index.js` with types at `./dist/src/index.d.ts`.

Local consumers must import from `@norma/core`. They must not import from `src/*`
or `dist/src/*`.

## MVP Demo Helper Exports

For local smoke tests and MVP truth-path examples, the package root also exposes:

- `createMvpDemoInput`
- `runMvpDemo`

These helpers support local verification examples. They do not create a new SDK, CLI, API, MCP, adapter, or broader runtime surface.

## Approved Operations

Approved V1.5 trust-layer operations:

- `analyzeStructuredCompositionV1`
- `verifyArtifactFreshness`
- `verifyRun`
- `replayRun` MVP-only

`analyzeStructuredCompositionV1` is an approved package-root import for
local/private consumption. This refresh does not add a new export; it documents
and tests the existing package-root surface.

Package-root deterministic serialization helpers:

- `serializeCanonicalJson`
- `canonicalizeForSerialization`
- `canonicalizeRefs`
- `canonicalizeOutputRefs`
- `canonicalizeDiagnostics`
- `canonicalizeWarnings`
- `canonicalizeErrors`
- `DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY`
- `STABLE_SERIALIZATION_VERSION`

## Result Handling

Never reduce results to a boolean `valid`.

Inspect `status`.

Preserve warnings.

Preserve errors.

Preserve provenance.

Preserve diagnostics.

Preserve output refs, `packLockRef`, `operationContextRef`, and
`replayReadiness` for Structured Analyze results.

Preserve mismatches when replaying.

Preserve `artifactFreshness` when supplied.

Do not hide critical warnings or blocking errors.

## Source Truth

Structured source objects are source truth.

For Structured Analyze, the result returned by
`analyzeStructuredCompositionV1` is canonical engine truth. When report tooling
writes `result.json`, that file is the canonical persisted view of the same
engine result.

Refs are traceability, not source truth.

Report artifacts such as `summary.json`, `summary.md`, `visual.svg`, and
`report.html` are derived local inspection views, not package API and not
source truth.

Prompt text is never source truth.

CLI, SDK, API, MCP, and adapters must not define Norma truth.

## Replay Boundary

`replayRun` is MVP-only.

The supported operation is `core.mvp-demo.run`.

Arbitrary operation replay is not supported.

Replay requires explicit structured MVP source truth.

`recordedMvpResult` can strengthen deterministic payload comparison when available.

## Non-Goals

PR25 does not add:

- SDK runtime
- CLI behavior
- API
- MCP behavior
- adapter
- cloud
- UI
- camera/image/vision
- CAD
- beauty score
- creative recommendation
- prompt-as-source
- arbitrary operation replay
- npm publication
