# Norma Core V1.5 Release Checkpoint

Documentation-only checkpoint for V1.5 developer-ready local tooling and tag readiness.

This document records the state after the V1.5 trust-layer, package-consumption, CLI, and CLI contract PRs. It does not create a tag and does not change runtime behavior.

## Status

PR29 is a docs-only checkpoint.

Checkpoint verdict:

```txt
V1.5 developer-ready local tooling is ready for release review.
```

This means:

- local package-root consumption is documented and tested;
- deterministic serialization, fixtures, golden snapshots, artifact freshness, run verification, and MVP-only replay are present;
- the local CLI exists as a thin wrapper over approved package-root operations;
- CLI smoke docs and JSON output contract tests exist;
- package metadata remains private and unpublished;
- forbidden expansion surfaces remain out of scope.

## Source Of Truth

When older documents disagree with the current repository state, use this order:

1. active code on `main`;
2. merged PR28 CLI docs and output contract tests;
3. merged PR27 CLI behavior;
4. `docs/BUSINESS_READINESS_ROADMAP.md`;
5. `docs/PACKAGE_CONSUMPTION.md`;
6. `docs/plans/2026-06-12-v1.5-implementation-contracts.md`;
7. older docs.

Current observed facts:

- PR28 is merged into `main`.
- `package.json` is still `@norma/core` version `0.1.0`, `type: "module"`, and `private: true`.
- `package.json` still has no `bin`, no `publishConfig`, and no runtime `dependencies`.
- `src/core-constants.ts` still exports `CORE_VERSION = "0.1.0-pr12"`.
- `src/index.ts` still exports the V1.5 trust-layer surfaces:
  - `artifact-freshness`;
  - `run-verification`;
  - `run-replay`;
  - `serialization`;
  - `mvp-demo`.
- Current tag inventory observed for this checkpoint includes `v0.1.0`.

## In Scope

- Record the V1.5 developer-ready checkpoint.
- Confirm package, core-version, export, CLI, docs, and test readiness expectations.
- Document the release-review and tag-readiness boundary.
- Preserve the next-step sequence from the business readiness roadmap.

## Out Of Scope

PR29 does not:

- modify runtime source;
- modify tests;
- modify `package.json`;
- modify `package-lock.json`;
- modify `CORE_VERSION`;
- add dependencies;
- add a package `bin` field;
- add `publishConfig`;
- publish an npm package;
- create, move, or delete a git tag;
- add SDK runtime;
- add API;
- add MCP;
- add adapter;
- add UI;
- add cloud behavior;
- add camera, image, or vision behavior;
- add CAD, plugin, or marketplace behavior.

## Readiness Matrix

| Area | Checkpoint state | Evidence |
| --- | --- | --- |
| Trust-layer operations | Ready for local developer tooling review | `verifyArtifactFreshness`, `verifyRun`, `replayRun` are exported and tested. |
| Determinism | Ready for review | Golden snapshots and canonical serialization tests exist. |
| Package-root consumption | Ready for local/private consumption | `docs/PACKAGE_CONSUMPTION.md` and `tests/package-consumption.test.mjs`. |
| Package publication | Not ready by design | Package remains private, with no `publishConfig` and no publish step. |
| CLI | Ready as local-only thin tooling | `bin/norma-core.mjs`, `tests/cli.test.mjs`, and `docs/CLI.md`. |
| CLI JSON output contract | Ready for review | `tests/cli-output-contract.test.mjs` covers envelope and docs alignment. |
| SDK | Not present | No SDK runtime or SDK export is approved. |
| API | Not present | No API server or API contract implementation is approved. |
| MCP | Not present | MCP work remains a later gated phase. |
| UI/product surface | Not present | Product/UI work remains gated by future requirements. |

## Package And Version Boundary

The package boundary remains intentionally conservative:

```txt
package name: @norma/core
package version: 0.1.0
package type: module
package private: true
CORE_VERSION: 0.1.0-pr12
```

`package.json` version and `CORE_VERSION` intentionally mean different things:

- `package.json` version `0.1.0` identifies the private package checkpoint.
- `CORE_VERSION = "0.1.0-pr12"` identifies the implemented core engine checkpoint used by the MVP and V1.5 trust layer.

PR29 does not change either value.

## CLI Boundary

The CLI remains local-only:

```bash
node bin/norma-core.mjs <command>
```

The CLI is a thin wrapper over existing approved package-root operations. It must preserve:

- structured JSON envelopes;
- operation status;
- warnings;
- errors;
- provenance;
- source refs;
- mismatches;
- artifact freshness details;
- exit-code policy.

The CLI must not infer packs, ratios, rules, tolerances, geometry, intent, source truth, or missing defaults.

## Tag Readiness Boundary

PR29 is tag-ready documentation, not a tag operation.

Observed tag inventory for this checkpoint:

```txt
v0.1.0
```

Rules:

- Do not create a tag in PR29.
- Do not move or replace an existing tag in PR29.
- Do not publish a package from PR29.
- Any later tag operation must happen after PR29 is merged and after validation is run on the target branch.
- If maintainers decide to create a V1.5-specific tag, the tag name and release procedure must be approved as a separate release action.

## Merge Gate

PR29 is ready to merge only when all of the following are true:

- the diff adds only `docs/V1_5_RELEASE_CHECKPOINT.md`;
- `package.json`, `package-lock.json`, `src/`, `tests/`, `bin/`, and `CORE_VERSION` are unchanged;
- build, tests, and checks pass in the available environment;
- docs-only guardrails show no unexpected SDK, API, MCP, adapter, UI, cloud, media, CAD, plugin, marketplace, package publish, clock, randomness, or environment drift;
- automated review findings, if any, are non-blocking or repaired before merge.

Recommended validation:

```bash
npm run build
npm test
npm run check
git diff --check
git diff -- package.json package-lock.json src/core-constants.ts src tests bin
```

Recommended guardrail review:

```bash
rg "createCli|runCli|createSdk|createClient|createApi|createServer|createMcp|createMcpServer|createAdapter" src tests docs README.md bin || true
rg "camera|image|vision|cad|cloud|plugin|marketplace" src tests docs README.md bin || true
rg "publishConfig|\"bin\"|commander|yargs|mcp|server" package.json src tests docs README.md bin || true
rg "Date.now|Math.random|process.env" src tests docs README.md bin || true
```

Expected allowed guardrail hits are limited to explicit non-goal text, existing guardrail tests, existing forbidden dependency terms, and this checkpoint document.

## Release Review Decision

If the merge gate passes, the release-review decision is:

```txt
V1.5 developer-ready local tooling checkpoint accepted.
```

This does not mean Norma Core is public-package ready, MCP-ready, API-ready, UI-ready, or business-launch ready.

## Next PR

Next planned step:

```txt
PR30 -- package/public npm readiness audit
```

PR30 should remain an audit/readiness step. It should not publish the package, add SDK runtime, add API, add MCP, add adapter, add UI, or broaden Norma source-truth behavior.
