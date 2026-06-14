# Norma Core Consumer Compatibility Policy

## Status

This is a consumer compatibility policy for V1.5 local/private use.

It does not publish the package. It does not create SDK runtime. It does not change package metadata. It does not authorize public npm publication. It does not authorize API, MCP, adapter, UI, cloud, media, CAD, plugin, or marketplace work.

## Consumer Scope

The approved consumer is a local TypeScript or JavaScript consumer inside this repo or local workspace, importing from the package root after `npm run build`, and using approved trust-layer exports only.

This is not public npm readiness, a full SDK, a client library, a remote API, an MCP tool surface, or a UI/product surface.

## Approved Package-Root Imports

Consumer examples must import from:

```ts
import { ... } from "@norma/core";
```

Do not import from internal paths such as `src/*` or `dist/src/*`.

The approved package-root imports exported on main are:

- `CORE_VERSION`
- `STABLE_SERIALIZATION_VERSION`
- `DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY`
- `serializeCanonicalJson`
- `canonicalizeForSerialization`
- `canonicalizeRefs`
- `canonicalizeOutputRefs`
- `canonicalizeDiagnostics`
- `canonicalizeWarnings`
- `canonicalizeErrors`
- `verifyArtifactFreshness`
- `verifyRun`
- `replayRun`
- `createMvpDemoInput`
- `runMvpDemo`

## Typed Consumer Example

The compile-time example lives at `examples/consumer/v1-5-trust-layer.ts`.

It demonstrates local/private package-root consumption. It is not a published SDK and does not add a client wrapper.

The example imports only from `@norma/core`, type-checks `verifyArtifactFreshness`, `verifyRun`, and `replayRun`, preserves diagnostics in the exported `consumerSummary`, and avoids runtime console output.

## Result Handling Rules

Do not reduce results to a boolean `valid`.

Consumers must inspect `status`, preserve warnings, preserve errors, preserve provenance, preserve mismatches, preserve `artifactFreshness`, and preserve unknown fields unless they are explicitly unsupported.

Unknown statuses are non-success by default and must be handled conservatively.

Do not hide critical warnings or blocking errors.

## Version and Compatibility Boundaries

The package version, `CORE_VERSION`, `STABLE_SERIALIZATION_VERSION`, operation name, operation version, `PackLock`, tolerance policy, and output refs are separate compatibility boundaries.

Compatibility can be affected by:

- package root export changes;
- TypeScript type changes;
- result status changes;
- removed or renamed fields;
- serialization version changes;
- operation version changes;
- replay support boundary changes;
- CLI JSON envelope changes;
- package publish surface changes.

## Source Truth Rules

Structured source objects are source truth.

Refs are traceability, not source truth.

Artifacts are derived projections, not source truth.

Prompt text is never source truth.

CLI, API, MCP, SDK, adapters, and agents must not create Norma truth.

## Replay Boundary

`replayRun` is MVP-only.

The supported operation remains `core.mvp-demo.run`. Arbitrary operation replay is not supported. Replay requires explicit structured MVP source truth. Replay result mismatches must be preserved.

## CLI Boundary

The CLI exists but remains local-only. It is invoked with:

```bash
node bin/norma-core.mjs
```

Package-level `bin` is not present. CLI docs live in `docs/CLI.md`. The CLI is not an SDK, API, MCP, adapter, or product surface.

## Publication Boundary

The package remains private.

Public npm publication is not approved. `docs/PACKAGE_PUBLICATION_READINESS.md` records blockers.

`npm pack --dry-run` is an inspection command only; it is not publication approval.

PR31 does not change `private`, `files`, `publishConfig`, `bin`, or package root export targets. Do not run `npm publish`. Do not run `npm version`. Do not create, move, or delete git tags.

## Breaking Change Triggers

These require compatibility review:

- removing an approved package-root export;
- changing an operation result kind;
- changing status names or status semantics;
- removing warnings, errors, provenance, mismatches, source refs, or `artifactFreshness`;
- changing `STABLE_SERIALIZATION_VERSION`;
- changing deterministic serialization output;
- changing `CORE_VERSION` without a compatibility note;
- changing operation version without a compatibility note;
- changing package export targets;
- adding public publish behavior without a publish gate;
- changing CLI JSON envelope shape.

## Non-Breaking Change Guidance

These may be additive but still need review:

- adding optional result fields;
- adding new warning codes;
- adding new diagnostics;
- adding new docs;
- adding examples;
- adding tests;
- adding new operations only if explicitly approved in a separate PR.

Consumers must preserve unknown fields and avoid exhaustive assumptions unless tests pin them.

## Consumer Validation Commands

Run:

```bash
npm run build
./node_modules/.bin/tsc -p examples/consumer/tsconfig.json --noEmit
node --test tests/consumer-compatibility.test.mjs
node --test tests/package-consumption.test.mjs
node --test tests/cli.test.mjs
node --test tests/cli-output-contract.test.mjs
npm test
npm run check
git diff --check
```

The consumer compatibility test also verifies that `dist/src/index.js` and `dist/src/index.d.ts` exist after build.

## Non-Goals

- no npm publish;
- no npm version;
- no package metadata change;
- no SDK runtime;
- no API;
- no MCP;
- no adapter;
- no UI;
- no cloud;
- no camera/image/vision;
- no CAD/plugin/marketplace;
- no beauty score;
- no creative recommendation;
- no prompt-as-source;
- no artifact-as-source.

## Next PR

Next recommended PR: PR32 - public package publishing gate.

PR32 still must not publish unless maintainers explicitly approve publication in that PR.
