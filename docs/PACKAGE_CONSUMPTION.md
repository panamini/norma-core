# Norma Core V1.5 Package Consumption

## Status

PR25 scope.

Local/build-based consumption only.

Package remains private.

No SDK runtime.

No CLI.

No API.

No MCP.

No adapter.

No package publish.

## Import

After `npm run build`, local consumers can import approved trust-layer operations through the package root export:

```js
import {
  verifyArtifactFreshness,
  verifyRun,
  replayRun,
  serializeCanonicalJson,
  canonicalizeOutputRefs,
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
} from "@norma/core";
```

The root export resolves to `./dist/src/index.js` with types at `./dist/src/index.d.ts`.

## Approved Operations

Approved V1.5 trust-layer operations:

- `verifyArtifactFreshness`
- `verifyRun`
- `replayRun` MVP-only

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

Preserve mismatches when replaying.

Preserve `artifactFreshness` when supplied.

Do not hide critical warnings or blocking errors.

## Source Truth

Structured source objects are source truth.

Refs are traceability, not source truth.

Artifacts are derived projections, not source truth.

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
- CLI
- API
- MCP
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
