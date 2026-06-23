# Post-MVP Core Checkpoint

Date: 2026-06-23

## Current State

PR0-PR12 are complete for the Norma Core MVP rail. The checkpoint branch
`main-after-pr12` points at PR12 merge commit
`48845a847e0666bf8d93478550f28c99af51d77e`.

The current core rail version is `0.1.0-pr12`.

The MVP demo proves an in-memory, deterministic core path from structured input
through pack locking, rule resolution, construction, measurements, evaluations,
comparison, decision, structured explanation, artifacts, RunV1, and static
replay-readiness. This checkpoint is not a product, client, or interface
release.

## What The MVP Core Proves

- Structured input is explicit and validated at the boundary.
- Ratio pack validation rejects malformed or out-of-scope pack claims.
- PackLock records the exact ratio pack identity used by the run.
- Rule resolution turns declared pack rules into explicit resolved rule refs.
- Construction generation derives deterministic guide, zone, grid, cell, and
  intersection objects.
- Measurements produce explicit geometric facts for both canonical
  compositions.
- Evaluations score both compositions from declared profiles and source-backed
  measurements.
- Comparison, decision, and structured explanation are deterministic and
  source-backed.
- Artifacts are derived projections and cannot become source truth.
- RunV1 binds inputs, pack lock, operation context, output refs, and static
  replay evidence.
- Static replay-readiness reports dependency compatibility without executing
  replay.
- The MVP demo harness is deterministic and validates the final envelope deeply.

## Intentionally Out Of Scope

- UI
- CLI
- SDK
- API
- MCP
- camera, image, or vision input
- CAD or plugin integrations
- cloud or network behavior
- marketplace behavior
- replay execution
- registry or signing infrastructure
- recommendations or optimization
- beauty scoring
- user product workflow

## Known Technical Risks And Debt

- `pnpm run check` is blocked in this local environment because the script
  shells through `npm`, and `npm` is not installed:
  `CHECK_BLOCKED_BY_ENV_NPM_MISSING`.
- Fallow previously reported advisory circular-dependency findings around the
  `src/index.ts` barrel pattern.
- There is no full `replayRun` implementation yet.
- Public package stabilization has not been completed.
- There is no interface layer.
- There is no external adapter.
- This checkpoint makes no production release claim.

## Suggested Next Rails

Rail A - Hardening / Architecture cleanup:
- duplicate geometry source identity hardening
- `src/index.ts` barrel cycle and shared contract extraction investigation
- `pnpm run check` environment cleanup if appropriate
- diagnostics and validator stabilization
- Fallow complexity or duplication cleanup only where real risk exists

Rail B - Developer usability:
- README and usage examples
- minimal CLI or script only after approval
- package export review
- generated example output snapshots

Rail C - Interface / agent readiness:
- MCP, SDK, or API design only, not runtime implementation yet
- operation schemas
- tool contracts
- adapter boundary docs

## Recommendation

Start with hardening before feature implementation. The first concrete
hardening candidate is PR71 - reject duplicate geometry source identities.

PR71 is a proposed candidate, not an approved implementation inside this
checkpoint.

## Proposed Next PR Options

- PR71: reject duplicate geometry source identities (proposed candidate)
- PR72: bound MCP STDIO input and isolate request failures, only after PR71
  (proposed candidate)
- Post-MVP environment/check cleanup, exact number TBD (proposed candidate)

## Baseline Audit Result

`POST_MVP_BASELINE_AUDIT_PASS`

The accepted historical MVP baseline is PR0-PR12 through
`main-after-pr12`. Local validation passed for build, the focused PR12 MVP demo
suite, the full direct Node test suite, whitespace diff check, and a PR12 smoke
proof. The only blocked command was `pnpm run check`, and the blocker was the
local missing `npm` executable rather than a code failure.
