# Package Publication Candidate Without Publishing

## Status

PR100 finalizes the local `@norma/core` package publication candidate boundary without publishing.

The package remains private and local-only. `package.json` keeps `private: true`, version `0.1.0`, no `publishConfig`, no package-level `bin`, no dependency graph changes, no script changes, and the PR99 tarball allowlist. `package-lock.json` mirrors only the root `engines` metadata so later installs do not create unrelated lockfile drift.

PR100 adds only safe candidate metadata whose values are discoverable from the current repository and runtime baseline:

- `repository`: `git+https://github.com/panamini/norma-core.git`;
- `bugs`: `https://github.com/panamini/norma-core/issues`;
- `engines`: `node >=22`, matching the local Node 22 verification boundary used for the package candidate proof.

No `license` field is added. No root `LICENSE` or `LICENSE.md` exists in this repository, so legal/public-publish authorization remains blocked until maintainers make an explicit license decision.

## Package Candidate Boundary

The package name remains `@norma/core`.
The version remains `0.1.0`.
The package root remains the only export:

- types: `./dist/src/index.d.ts`;
- runtime: `./dist/src/index.js`.

The approved PR99 `files` allowlist remains:

- `dist/src/**/*.d.ts`;
- `dist/src/**/*.js`;
- `README.md`.

The local tarball remains limited to package metadata, `README.md`, compiled JavaScript under `dist/src/`, and declaration files under `dist/src/`.

The approved guided inspection V1 package-root exports remain:

- `createGuidedInspectionArtifactContractV1`;
- `consumeGuidedInspectionDemoEnvelopeV1`.

`result.json` remains the canonical machine-consumable Norma truth for guided inspection. `guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived local inspection artifacts only.

## Blocked Release Operations

PR100 does not approve or execute:

- `npm publish`;
- npm registry mutation;
- npm auth setup;
- provenance or trusted-publishing setup;
- release workflow;
- git tag;
- version bump or release commit;
- package-level `bin`;
- dependency, devDependency, peerDependency, or optionalDependency changes;
- lockfile changes beyond root package metadata consistency;
- hosted MCP;
- ChatGPT connector runtime;
- OpenAI/provider calls;
- image, CAD, Figma, or provider adapters;
- treating derived inspection artifacts as source truth.

## Manual Release Gate

After PR100, a human/manual release gate is still required before any public npm publish operation.

The gate must explicitly decide and document:

- whether public npm publication should happen at all;
- whether and when to remove `private: true`;
- npm scope ownership and publishing permissions;
- npm auth, 2FA, token, provenance, and trusted-publishing policy;
- version, tag, and release workflow policy;
- license/legal status;
- package-level `bin` policy;
- rollback, deprecate, and unpublish policy.

## Best Next Step

The one best next step after PR100 is an explicit maintainer license and public-publication authorization decision.

Until that decision exists, keep `@norma/core` private, local-only, and unpublished.
