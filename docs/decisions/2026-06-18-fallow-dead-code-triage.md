# Fallow Dead Code Triage Decision

## Status

PR66 is documentation-only.

This document records the current Fallow dead-code triage after PR65. It does not delete files, add Fallow suppressions, change entry points, change runtime behavior, or edit runtime, bin, source, example, package, test, API, MCP, UI, deployment, or CodeRabbit/Qodo surfaces.

## Current Verified State

- `main` is clean at `1b28125`.
- PR65 is merged.
- `rtk fallow audit --base main` is the PR regression gate for introduced issues.
- `rtk fallow audit --base main` passes with 0 introduced issues.
- Full `rtk fallow dead-code --summary` reports existing broad-scan findings, not actionable regressions from PR65.

## Gate Distinction

`rtk fallow audit --base main` checks whether the current branch introduced Fallow issues relative to `main`. That command is the PR regression gate.

Full `rtk fallow dead-code --summary` scans the repository from configured/static entry points and can report files that are intentionally package-private, runtime-facing, prototype-only, example-only, or otherwise not visible through the static entry model. Those findings require product and tooling approval before deletion, entrypoint changes, or suppression.

## Full Dead-Code Findings

The current full dead-code scan reports these 7 unused-file findings:

- `bin/norma-core-mcp-stdio.mjs`
- `bin/norma-core.mjs`
- `examples/consumer/v1-5-trust-layer.ts`
- `src/api/minimal-api-server.ts`
- `src/mcp/stdio-protocol.ts`
- `src/structured-json-input-viewer.ts`
- `src/verification-replay-result-viewer.ts`

## PR65 Regression Assessment

PR65 introduced 0 Fallow issues.

The 7 full-scan findings above are existing broad-scan findings. They are not PR65 regressions and are not safe to treat as deletion-ready evidence in PR66.

## Why PR66 Does Not Remove Or Suppress Them

These files are in protected or potentially product-relevant surfaces:

- `bin/**` CLI/MCP entry surfaces
- `examples/**` consumer example surface
- `src/api/**` API boundary surface
- `src/mcp/**` MCP boundary surface
- package-private viewer prototype helpers under `src/**`

Deleting them could remove behavior or approved prototype boundaries that static analysis cannot prove unused. Suppressing them would create tooling policy, not a documentation triage. PR66 therefore records the findings only.

## Required Approval Gate

Before any future PR deletes, suppresses, or changes entrypoint treatment for any listed path, that PR must explicitly approve:

- the exact path or paths affected
- whether the action is deletion, suppression, or entrypoint/reference wiring
- why the path is obsolete, protected, or intentionally retained
- the validation command proving no runtime, package, API, MCP, CLI, example, or prototype boundary regressed
- rollback criteria if the action proves too broad

Without that approval, the listed files must remain untouched and unsuppressed.

## Future Options

- Keep the files as protected runtime/prototype surfaces.
- Add explicit entrypoint references if approved.
- Delete only in a dedicated cleanup PR if approved.
- Suppress only in a dedicated tooling-policy PR if approved.

## Non-Goals

PR66 does not:

- delete files
- add `fallow-ignore` comments
- add or change Fallow configuration
- change package metadata, scripts, dependencies, or exports
- change runtime, bin, source, example, API, MCP, UI, HTTP, route, server, listener, deployment, or prototype behavior
- patch CodeRabbit stale review status
- touch Qodo/account status
