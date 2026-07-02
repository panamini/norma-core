# Package Tarball Local Install Readiness

## Status

PR99 prepares the local `@norma/core` package tarball boundary and proves a local packed-tarball install/import path.

PR99 does not publish `@norma/core`.

PR99 keeps `private: true`.

PR99 does not add publish metadata, npm auth, provenance setup, release workflow, git tag, version release, dependency changes, lockfile changes, hosted MCP, ChatGPT connector runtime, OpenAI/provider calls, or provider adapters.

## Package Name And Metadata Policy

The package name remains `@norma/core`.

The version remains `0.1.0`.

The package stays private and local-only.

The only package metadata change approved by PR99 is a minimal `files` allowlist required for `npm pack` and temp-consumer install proof.

The approved `files` allowlist is:

- `dist/src/**/*.d.ts`;
- `dist/src/**/*.js`;
- `README.md`.

No package-level `bin` is approved.

## Tarball Contents Policy

The local tarball may contain only:

- `package/package.json`;
- `package/README.md`;
- compiled JavaScript under `package/dist/src/`;
- TypeScript declaration files under `package/dist/src/`.

Repo-only docs, tests, fixtures, examples, workflows, source TypeScript, viewer files, local demo bins, lockfiles, and generated golden fixtures are excluded.

## Package Root Entry And Export Policy

The package root remains the only package export.

The package root continues to resolve to:

- types: `./dist/src/index.d.ts`;
- runtime: `./dist/src/index.js`.

The approved guided inspection V1 package-root exports remain:

- `createGuidedInspectionArtifactContractV1`;
- `consumeGuidedInspectionDemoEnvelopeV1`.

Package consumers must not import package-private helper paths.

## Local Pack And Consumer Proof

PR99 requires `npm pack --json` evidence from a temporary packing directory that is removed after the test.

PR99 requires a temporary external-style consumer that installs the packed tarball and imports `@norma/core`.

The temp consumer must use the package-root guided inspection V1 exports and verify that `result.json` remains canonical while `guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived inspection artifacts only.

The proof must use bounded subprocess timeouts and temporary directories only.

## Source Truth Boundary

`result.json` remains the canonical machine-consumable Norma truth for guided inspection.

`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived local inspection artifacts only.

Derived artifacts are not package truth, source truth, provider input, inference output, recommendation input, optimization input, correction input, scoring input, or automatic family-selection input.

## Forbidden Publication Boundary

PR99 does not approve or execute:

- `npm publish`;
- registry mutation;
- npm auth setup;
- provenance setup;
- release workflow;
- git tag;
- release/version bump;
- dependency changes;
- lockfile changes;
- hosted MCP;
- ChatGPT connector runtime;
- OpenAI/provider calls;
- image/CAD/Figma/provider adapters;
- public package publication.

## Rollback And Recovery

The PR99 package preparation is reversible by removing the `files` allowlist and the PR99 docs/tests/guard entries.

No published package, tag, registry state, auth state, provenance state, release workflow, dependency graph, or lockfile must be rolled back because PR99 does not create any of those states.

## Best Next PR

Best next PR after PR99:

```text
PR100: decide public package publish authorization and release operations boundary
```

PR100 should remain a decision and operations-boundary PR unless maintainers explicitly approve actual publication in that PR.
