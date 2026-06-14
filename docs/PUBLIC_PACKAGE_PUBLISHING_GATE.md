# Norma Core Public Package Publishing Gate

## Status

PR32 is a publication gate.

PR32 does not publish.

PR32 does not change package metadata.

PR32 does not remove private: true.

PR32 does not create a tag.

PR32 does not authorize publication by itself.

PR32 records the exact gate a future explicit publication PR/action must satisfy.

## Gate Decision

Decision: blocked_until_explicit_publication_approval

Current local/private consumer readiness is good: package-root consumption is documented and tested after `npm run build`, and `docs/CONSUMER_COMPATIBILITY.md` defines the current compatibility baseline.

Public npm publication is still blocked by design. A future PR must explicitly approve and implement package metadata changes before publication. PR32 is not that package-change PR.

## Current Package State

Observed on synced `main` before PR32 edits:

```txt
package name: @norma/core
package version: 0.1.0
type: module
package private: true
root export default: ./dist/src/index.js
root export types: ./dist/src/index.d.ts
publishConfig: absent
files: absent
package-level bin: absent
runtime dependencies: absent
optionalDependencies: absent
peerDependencies: absent
CORE_VERSION = "0.1.0-pr12"
current tag inventory: v0.1.0
```

`package-lock.json` observed state:

```txt
name: @norma/core
version: 0.1.0
lockfileVersion: 3
root runtime dependencies: absent
dev dependency: typescript
```

Read-only npm registry visibility check:

```txt
command: npm view @norma/core name version versions --json
result: E404 Not Found - '@norma/core@*' is not in this registry.
```

This does not prove npm scope ownership, package-name availability, or publish permission.

Read-only tarball inspection after `npm run build`:

```txt
command: npm pack --dry-run --json
id: @norma/core@0.1.0
filename: norma-core-0.1.0.tgz
entryCount: 74
size: 264028
unpackedSize: 3443738
```

Important current tarball blockers:

- missing dist/ is a blocker because current root exports require `dist/src/index.js` and `dist/src/index.d.ts`, but `dist/` is ignored and absent from the dry-run tarball.
- broad repo material is a blocker because the dry-run tarball includes `AGENTS.md`, `bin/`, broad `docs/`, `examples/`, `src/`, `tests/`, golden snapshots, and `tsconfig.json`.

The dry-run inspection is informational only. It is not publication approval.

## Official npm Rules Used

Official npm documentation is used for these rules:

- `npm pack --dry-run` is the read-only inspection command used to see package contents before publication.
- Package contents are controlled by npm default inclusion and exclusion rules, ignore files, and the package `files` field.
- Without a `files` list, npm includes package files by default subject to ignore and package rules.
- Scoped packages are not public by default; a first public scoped package publication needs an explicit public access decision.
- Direct public publish for a scoped package uses `npm publish --access public`.
- Publishing a name/version pair is effectively irreversible because the same name/version cannot be reused after publication, even after unpublish.
- Provenance requires a supported cloud CI/CD release environment and explicit provenance or trusted-publishing configuration.
- Trusted publishing should be considered before long-lived tokens where npm supports it.
- Staged publishing adds review before a package goes live, but npm staged publishing requires the package to already exist on the registry and cannot stage a brand-new package.
- 2FA or a granular access token policy is required for real publish and package-setting changes.

References:

- https://docs.npmjs.com/cli/v11/commands/npm-pack/
- https://docs.npmjs.com/cli/v11/commands/npm-publish/
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- https://docs.npmjs.com/about-scopes/
- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/staged-publishing/
- https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/

## Current Blockers

- `private: true` intentionally blocks publish.
- `dist/` is required by current exports but is not included in the current dry-run tarball.
- Current tarball includes broad development material.
- No files allowlist.
- No CLI publication decision.
- No npm scope ownership verification.
- No npm access/2FA/token policy.
- No provenance policy.
- No release environment policy.
- No license/support metadata decision.
- No packed-tarball install test.
- No public README/API support decision.
- No human release approval record.

## Required Maintainer Decisions

Before publication, maintainers must explicitly decide:

- whether to publish `@norma/core` publicly at all;
- whether the package name remains `@norma/core`;
- who controls the npm scope;
- who owns publishing permissions;
- whether publication is direct or staged;
- whether provenance is mandatory;
- whether release is from CI or a maintainer machine;
- whether the local-only CLI is excluded or published intentionally;
- whether docs are included in the tarball;
- whether source is included or only built artifacts;
- whether tests/goldens are excluded;
- whether a license is added;
- whether `repository`, `bugs`, `homepage`, and `engines` fields are added;
- what version/tag strategy is used;
- what rollback/unpublish/deprecate policy applies.

## Required Future Package Changes

These are potential future package-change PR items. They are not PR32 changes.

A future package-change PR may:

- remove `private: true` only after explicit approval;
- add a files allowlist such as:
  - `dist/src/**`
  - `README.md`
  - `LICENSE`
  - `package.json`
  - selected public docs only if approved;
- exclude tests/goldens/internal docs/AGENTS metadata unless explicitly approved;
- add `license` if approved;
- add `repository`, `bugs`, `homepage`, and `engines` if approved;
- decide whether to add package-level bin;
- decide whether to add `publishConfig`;
- add or document release CI only if explicitly approved.

PR32 does not implement these changes.

## Required Future Validation

A future publication PR/action must run:

```bash
npm ci
npm run build
npm test
npm run check
./node_modules/.bin/tsc -p examples/consumer/tsconfig.json --noEmit
node --test tests/package-consumption.test.mjs
node --test tests/consumer-compatibility.test.mjs
node --test tests/cli.test.mjs
node --test tests/cli-output-contract.test.mjs
npm pack --dry-run --json
git diff --check
```

A future package-change PR must also include a packed tarball install smoke in a temporary directory and clean it up:

```bash
npm pack --json
mkdir -p /tmp/norma-core-pack-smoke
cd /tmp/norma-core-pack-smoke
npm init -y
npm install /path/to/norma-core-0.1.0.tgz
node --input-type=module -e 'import * as core from "@norma/core"; console.log(core.CORE_VERSION)'
```

PR32 prefers dry-run only and does not require actual tarball creation or install smoke.

## Tarball Acceptance Criteria

A future public tarball is acceptable only when it:

- includes `dist/src/index.js`;
- includes `dist/src/index.d.ts`;
- makes root import work from the packed tarball;
- makes TypeScript types resolve from the packed tarball;
- excludes tests unless explicitly approved;
- excludes golden snapshots unless explicitly approved;
- excludes internal docs/plans unless explicitly approved;
- excludes `AGENTS.md` unless explicitly approved;
- includes only approved public docs;
- includes `README.md`;
- includes `LICENSE` if the license decision is approved;
- includes CLI only if package-level bin is approved.

## Scoped Package and Access Policy

Current package is a scoped package: `@norma/core`.

No publication can happen until scope ownership and permission are verified.

First public scoped publish requires an explicit access decision.

If direct publication is chosen later, the exact command must be approved in that later PR/action.

PR32 must not execute publish/access/owner commands.

## Provenance and Release Environment Policy

Provenance must be decided before publication.

If provenance is required, release should use a supported CI/CD provider and cloud-hosted runner.

npm token/2FA policy must be defined.

Release must not depend on a developer laptop unless maintainers explicitly approve that risk.

PR32 does not add a CI release workflow.

## CLI Publication Policy

Current CLI is local-only.

Current package has no package-level bin.

Public tarball should not silently include `bin/norma-core.mjs` without a clear decision.

Future maintainers must choose:

- exclude CLI from public package; or
- publish CLI intentionally with package-level bin and docs.

## Consumer Compatibility Policy

`docs/CONSUMER_COMPATIBILITY.md` is the compatibility baseline.

Package-root imports must stay aligned with PR31 and `@norma/core`.

Result handling must preserve status, warnings, errors, provenance, mismatches, and artifact freshness.

No SDK runtime is created by publication.

No API is created by publication.

No MCP is created by publication.

Public package consumers must not use internal `src/` or `dist/` paths.

Structured source truth remains in explicit Norma objects. Artifacts are derived projections and must not become source truth.

## Security and Rollback Policy

Package publish is high impact because the same name/version cannot be reused after publish.

If a bad version is published, response may require deprecation or a new version, not simply reusing the same version.

Unpublish is not a normal rollback strategy.

Token, 2FA, provenance, scope ownership, and maintainer approval must be decided before publication.

## Forbidden Actions In This PR

Do not change package metadata.

Do not remove private: true.

Do not add `files`.

Do not add `publishConfig`.

Do not add package-level bin.

Do not run npm publish.

Do not run npm publish dry-run.

Do not run npm version.

Do not run npm access, npm owner, npm dist-tag, npm unpublish, npm deprecate, or npm publish-related commands.

Do not create, move, or delete git tags.

Do not add a release workflow.

Do not add SDK/API/MCP/adapter/UI/cloud/media/CAD/plugin/marketplace behavior.

## Future Publication PR Template

Use this checklist in a later explicit publication/package-change PR:

## Future Publication PR Checklist

- [ ] Explicit maintainer approval to publish.
- [ ] npm scope ownership verified.
- [ ] Package name/version approved.
- [ ] `private` decision approved.
- [ ] `files` allowlist approved.
- [ ] `dist/` included in dry-run tarball.
- [ ] Tests/goldens/internal docs inclusion/exclusion approved.
- [ ] CLI inclusion/exclusion approved.
- [ ] License/support metadata approved.
- [ ] Provenance/access/2FA/token policy approved.
- [ ] Packed tarball root import smoke passes.
- [ ] Packed tarball TypeScript consumer smoke passes.
- [ ] No SDK/API/MCP/UI claims added.
- [ ] Human release approval recorded.

## Exit Criteria

PR32 can merge when:

- only expected doc/test files changed;
- package metadata unchanged;
- no publish/tag/version/access/owner command run;
- gate document lists blockers, decisions, future changes, validation, tarball acceptance, access, provenance, CLI policy, consumer policy, and rollback;
- test validates the gate document and package state;
- build/test/check pass;
- guardrails pass;
- automated review has no P0/P1 blockers.

## Next PR

Next recommended PR: PR33 - MCP tool contract docs only.

PR33 must not implement MCP.

PR33 must define tool schemas, threat model assumptions, allowed tools, forbidden tools, and source-truth boundaries.

Do not start MCP implementation until contract docs are merged.
