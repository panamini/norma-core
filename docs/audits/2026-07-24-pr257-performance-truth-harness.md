---
title: "PR257 Performance Truth Harness"
category: audit
status: current
created: 2026-07-24
updated: 2026-07-24
---

# PR257 Performance Truth Harness

## Scope

This gate is provider-free and offline. It adds a reusable timing/ledger helper
and deterministic tests over the existing Core, local STDIO, and authenticated
Streamable HTTP entry points. It does not run an active benchmark, change Core
results, add a public export, or mutate the wiki.

## Observability matrix before PR257

| metric | already_available | clock_domain | source_file | privacy_boundary | usable_for_comparison | missing_or_incomplete |
| --- | --- | --- | --- | --- | --- | --- |
| `prepare` handler | yes | server wall timestamps plus monotonic duration | `src/mcp/personal-visual-harmony-app.ts` | `_meta` only | handler duration | no request/transport split |
| `confirm` handler | yes | server wall timestamps plus monotonic duration | `src/mcp/personal-visual-harmony-app.ts` | `_meta` only | handler duration | no request/transport split |
| browser/widget milestones | yes | browser wall-clock scalar attributes | generated widget in `src/mcp/personal-visual-harmony-app.ts` | `data-norma-observation-*` scalars | same-correlation event ordering | no calibrated browser boot or paint duration |
| correlation identity | yes | content identity, not a duration | `src/mcp/personal-visual-harmony-app.ts` | opaque `sha256:` identity | cross-step same-analysis matching | no cross-transport request id |
| attempt identity | yes | sequence plus server entry timestamp | `src/mcp/personal-visual-harmony-app.ts` | `_meta` only | prepare-attempt isolation | process-local sequence only |
| monotonic server duration | yes | monotonic | `src/mcp/personal-visual-harmony-app.ts` | `_meta` scalar | handler comparisons | does not span browser or network |
| wall-clock timestamps | yes | server wall clock | `src/mcp/personal-visual-harmony-app.ts` | `_meta` only | event chronology only | never valid for cross-domain subtraction |
| local MCP STDIO | protocol only | none | `src/mcp/stdio-protocol.ts`, `bin/norma-core-mcp-stdio.mjs` | structured result boundary | functional parity | no phase timings |
| Streamable HTTP | coarse latency bucket | server wall clock internally | `src/mcp/remote-http-server.ts` | redacted log event | coarse operational bucket | no auth/parse/admission/core decomposition |
| auth | verifier exists | none | `src/mcp/remote-http-auth.ts` | pseudonymous subject in runtime logs | functional auth parity | no duration |
| admission/concurrency | injected test clock supported | injected wall clock | `src/mcp/remote-http-limits.ts` | counters only | deterministic policy checks | no duration |
| parsing/dispatch/Core/serialization | real entry points exist | none | `src/mcp/stdio-protocol.ts`, `src/structured-composition-analysis.ts`, `src/serialization.ts` | structured result only | deterministic replay/parity | no phase timings |
| artifacts/first useful render | artifact functions and paint proxy exist | artifact local; browser wall clock | `src/local-report/`, generated widget | local files or scalar attributes | artifact identity only | no useful-paint duration |

## Harness contract after PR257

`src/performance-truth-harness.ts` supplies one injected monotonic clock for
every duration, a separate UTC timestamp only for ledger metadata, strict stage
names, identity equality checks, and a closed privacy-safe ledger shape. The
tests use the existing `alignment-basic` and `boundary-case` scenario fixtures;
the latter is valid at the supported `1x1` surface boundary.

The harness deliberately does not infer a phase duration by subtracting server
and browser timestamps. It records `null` for a phase that the current execution
boundary cannot measure, and it keeps `request_total_ms` as the single monotonic
measurement around the actual request action.

The widget's existing `core-visible` after-paint callback is consumed as an
observation boundary in the audit, not relabeled as a measured
`widget_first_useful_paint_ms`. That field remains `null` in non-browser tests.

## Ledger and budget

The ledger row contains only bounded scenario metadata, timing scalars, a
`sha256:` result identity, status, and bounded notes. It excludes tokens,
secrets, emails, raw subject IDs, prompts, images, geometry, private URLs, and
user payloads. PR257 contributes zero active executions; the total allocation
remains ten.

## Architecture boundary

Railway remains the future target for MCP/API/orchestration/CPU work and
Supabase for Auth/OAuth/PostgreSQL/RLS/private packs/PackLocks/history. This
gate creates no resources, deploys nothing, changes no connector, and does not
perform the Render/Auth0 migration or add GPU/Redis/queue/worker infrastructure.
