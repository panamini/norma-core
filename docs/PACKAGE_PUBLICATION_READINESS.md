# Norma Core Package Publication Readiness

Documentation-only audit for PR30 package/public npm readiness.

This document audits whether the current `@norma/core` package is ready for public npm publication. It does not change package metadata, runtime code, tests, versioning, tags, or publication state.

## Verdict

```txt
NOT READY FOR PUBLIC NPM PUBLICATION
```

The current repository is ready for local/private package-root consumption after `npm run build`, but it is not ready to publish as a public npm package.

Blocking reasons:

- `package.json` still has `"private": true`, which is the intended publish blocker.
- `exports["."].default` points to `./dist/src/index.js`, but `npm pack --dry-run --json` did not include `dist/`.
- The dry-run tarball includes broad development and review material: `src/`, `tests/`, golden snapshots, docs, `AGENTS.md`, and `bin/`.
- The CLI is local-only and `package.json` has no `bin`; including `bin/norma-core.mjs` in a public tarball without a `bin` decision is ambiguous.
- Public package ownership, npm scope control, access policy, provenance policy, license metadata, and release approval flow are not yet accepted.

PR30 did not repair these blockers. It recorded them so later package-readiness
and publication-gate decisions could be explicit and reviewable. Those follow-up
package readiness and gate documents now exist; this audit must not be read as
an active instruction to create another package readiness PR.

## Current Package State

Observed on `main` after PR29:

```txt
name: @norma/core
version: 0.1.0
type: module
private: true
CORE_VERSION: 0.1.0-pr12
exports default: ./dist/src/index.js
exports types: ./dist/src/index.d.ts
bin: absent
publishConfig: absent
runtime dependencies: absent
current tags: v0.1.0
```

`package-lock.json` root state:

```txt
name: @norma/core
version: 0.1.0
lockfileVersion: 3
root runtime dependencies: absent
dev dependency: typescript
```

Approved local package-root exports remain the V1.5 trust-layer surface:

- `verifyArtifactFreshness`
- `verifyRun`
- `replayRun`
- deterministic serialization helpers
- `createMvpDemoInput`
- `runMvpDemo`

Forbidden public expansion surfaces remain absent from package-root exports:

- SDK runtime
- API
- MCP
- adapter
- camera/image/vision
- CAD/plugin/marketplace
- cloud/hosted service

## npm Registry Check

Read-only registry check:

```bash
npm view @norma/core name version versions --json
```

Observed result:

```txt
E404 Not Found - '@norma/core@*' is not in this registry.
```

This means no public package was visible at that registry endpoint during the audit. It does not prove that the `@norma` npm scope is controlled by this project or that publish permissions exist.

## Dry-Run Tarball Check

Command run:

```bash
npm pack --dry-run --json
```

Observed summary:

```txt
id: @norma/core@0.1.0
filename: norma-core-0.1.0.tgz
entryCount: 69
size: 255730
unpackedSize: 3417524
```

Important included paths:

- `package.json`
- `README.md`
- `AGENTS.md`
- `bin/norma-core.mjs`
- `docs/`
- `src/`
- `tests/`
- `tests/golden/v1_5/`
- `tsconfig.json`

Important missing paths:

- `dist/src/index.js`
- `dist/src/index.d.ts`
- all other `dist/` build outputs

Root cause:

```txt
.gitignore: dist/
package.json: no files allowlist
```

Because `dist/` is ignored and the package does not declare a `files` allowlist, the tarball does not include the built entrypoint that `exports` points to. A public install of this tarball would not satisfy the current root export contract.

## npm Publication Facts Used

Official npm documentation establishes the following package-publication constraints.
Verified against the linked npm docs on 2026-06-14:

- `npm pack --dry-run` is the supported way to inspect what would be included in a package tarball before publication.
- Without a `files` list, npm includes files by default subject to ignore rules and package inclusion rules.
- A `files` list in `package.json` narrows package contents to the specified files or directories.
- Scoped packages are not public by default; the initial public publish requires `npm publish --access public`.
- Staged publishing adds an approval step, but current npm staged publishing docs say a package must already exist on the registry.
- npm provenance can establish where a package was built and who published it, but it requires a supported cloud CI/CD provider and runner.
- `"private": true` is a package-level publication blocker.

References:

- https://docs.npmjs.com/files/package.json/
- https://docs.npmjs.com/cli/v9/commands/npm-publish/
- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- https://docs.npmjs.com/cli/v11/using-npm/scope/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/staged-publishing/
- https://docs.npmjs.com/cli/v8/using-npm/registry/

## Required Decisions Before Public npm

### 1. Publication Intent

Decide whether `@norma/core` should be public on npm now, later, or never.

If later, keep `"private": true`.

If yes, require a separate package-change PR before any publication command.

### 2. npm Scope Ownership

Confirm who controls the `@norma` scope on npm.

If this project does not control the scope, choose one of:

- acquire or configure the `@norma` npm organization/scope;
- rename the package;
- keep the package private and local-only.

### 3. Published Surface

Decide whether the public tarball should expose only built runtime artifacts or also source, tests, docs, and goldens.

Recommended public runtime surface:

```txt
package.json
README.md
LICENSE
dist/src/**
```

Potentially include a narrow docs subset only if it is intended as public consumer documentation.

Do not publish tests, golden snapshots, internal plans, or AGENTS metadata unless maintainers explicitly approve that as a support/debugging policy.

### 4. Build And Pack Policy

Decide how `dist/` is produced and included for publication.

Options:

- add a future `files` allowlist that includes `dist/src/**`;
- add a future `prepack` or release build step;
- publish only from a prepared release artifact;
- keep source-only local consumption and do not publish.

The current state is not acceptable for public npm because `exports` points to `dist/` and the dry-run tarball excludes `dist/`.

### 5. CLI Publication Policy

The CLI is currently local-only:

```bash
node bin/norma-core.mjs <command>
```

There is no package `bin` field.

Before public npm, decide:

- exclude `bin/` from the tarball; or
- intentionally publish the CLI by adding a reviewed package `bin` field in a later PR.

Do not silently publish `bin/norma-core.mjs` as an undocumented package artifact.

### 6. Access, Provenance, And Approval

For a first public scoped package publish, the release gate must define:

- exact publish command, if ever used: `npm publish --access public`;
- npm account or organization owner;
- 2FA or token policy;
- whether provenance is required;
- whether publishing must happen from GitHub Actions or another supported CI;
- rollback and unpublish policy;
- who approves publication.

Staged publishing is not a first-publish substitute if the package is not already present on npm.

### 7. Metadata And Support

Before public npm, review whether to add:

- `license`;
- `repository`;
- `bugs`;
- `homepage`;
- `engines`;
- public support policy;
- public README usage examples aligned with V1.5, not only the older MVP checkpoint.

These are not all hard npm requirements, but they are package-maintainer readiness gaps for public use.

## Readiness Matrix

| Area | Current state | Public npm readiness |
| --- | --- | --- |
| Package name/version | `@norma/core@0.1.0` | Not blocked by local metadata, but registry ownership is unverified. |
| Private flag | `private: true` | Blocking by design. |
| Root export | Points to `./dist/src/index.js` and types in `dist` | Blocking because dry-run tarball excludes `dist/`. |
| Runtime dependencies | None | Ready. |
| Build output | Exists locally after build, ignored by git | Not ready for pack/publish. |
| Package contents | 69 dry-run entries, including tests/goldens/docs/src/bin | Not ready; contents need an explicit allowlist. |
| CLI | Local-only, no `bin` field | Needs publish decision. |
| Public docs | Existing README is MVP-era and partly superseded by V1.5 docs | Needs public consumer update before publication. |
| License/support metadata | Not present in package metadata | Needs maintainer decision. |
| Access/provenance | Not defined | Needs release gate. |

## Historical Follow-Up Sequence

The following PR31 and PR32 labels are historical package-readiness context.
They are not the current execution queue after R31/R32 roadmap truth sync.

### PR31 -- typed consumer examples and compatibility policy

Should remain non-publishing.

Recommended scope:

- document consumer import examples for the approved package-root trust-layer exports;
- document result handling rules;
- document operation-version and serialization-version compatibility triggers;
- add or document typed examples only if the scope explicitly allows them;
- avoid SDK runtime, API, MCP, adapter, UI, and publish behavior.

### PR32 -- public package publishing gate

Should still not publish unless explicitly approved.

Recommended scope:

- decide whether and when to remove `"private": true`;
- define the `files` allowlist or release artifact strategy;
- decide CLI inclusion or exclusion;
- define `publishConfig` only if maintainers approve it;
- define `npm publish --access public` policy;
- define provenance and CI release controls;
- define final pre-publish checks.

## Pre-Publish Gate

Do not publish until a future approved PR can show all of:

```txt
package.json public-publish intent approved
private flag decision approved
scope ownership confirmed
dist included in npm pack dry-run output
tests/goldens/internal docs excluded unless explicitly approved
package root import works from packed tarball
types resolve from packed tarball
CLI inclusion or exclusion decided
license/support metadata reviewed
build/test/check pass
guardrail greps pass
Fallow or equivalent review complete
human release approval recorded
```

Suggested future verification once package changes are explicitly in scope:

```bash
npm run build
npm pack --dry-run --json
npm test
npm run check
git diff --check
```

For PR30 specifically, package changes are out of scope.

## PR30 Validation Boundary

PR30 is accepted only if:

- exactly `docs/PACKAGE_PUBLICATION_READINESS.md` is added;
- `package.json` is unchanged;
- `package-lock.json` is unchanged;
- `src/` is unchanged;
- `tests/` is unchanged;
- `bin/` is unchanged;
- `CORE_VERSION` is unchanged;
- no dependency is added;
- no package `bin`, `files`, or `publishConfig` is added;
- `"private": true` remains unchanged;
- no npm publish command is run;
- no npm version command is run;
- no git tag is created, moved, or deleted.

## Audit Conclusion

Norma Core should not be published to public npm from the current repository state.

The package is appropriate for local/private build-based consumption. Future
package or publication work requires a current-gap decision and explicit
maintainer approval, not stale roadmap-label continuation.
