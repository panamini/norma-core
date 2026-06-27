# Post-R14 Roadmap Checkpoint

## Status

Accepted as the current roadmap checkpoint after PR #135 / R14.

This document is documentation and contract-test scope only. It does not
implement product behavior, change runtime code, publish a package, expose a
remote service, or authorize a hosted/public surface.

## Current State

PR #135 merged R14 at merge commit
`dcb113cb2abfcafbf1155b47a2a7c41d2fd50974`.

The recent Structured Analyze rail is complete through R14:

- R10 - deterministic regression protection across the pipeline.
- R11 - public API contract freeze and export surface stability.
- R12 - MCP protocol contract lock and execution boundary enforcement.
- R13 - ratio-pack registry, authoring guardrails, and strict pass-through.
- R14 - local Structured Analyze report dashboard and inspection contract.

`analyzeStructuredCompositionV1(input)` remains the deterministic engine
boundary. `result.json` remains canonical Norma truth. `report.html` is a local,
static, read-only inspection artifact derived from existing report data.

## Operating Model

The current operating model remains local, private, and manual.

Approved current surfaces:

- direct engine call through `analyzeStructuredCompositionV1`;
- local CLI/report-kit execution with explicit structured JSON input;
- local STDIO MCP with the existing six-tool inventory;
- local report bundle inspection.

Explicitly not approved:

- hosted MCP;
- public ChatGPT app submission;
- public package publication;
- package export expansion;
- remote API runtime;
- image, vision, camera, CAD, or provider runtime;
- prompt-derived source truth;
- recommendation, optimization, or beauty scoring.

## Next Sequence

Historical note: before R16, the next implementation rail was:

1. R16 - local demo/onboarding smoke for the Structured Analyze report workflow.
2. R17 - package/local consumer readiness refresh, only if a real gap remains
   after R16.
3. R18+ - broader product, package, remote, or public-surface gates only after
   explicit checkpoint approval.

R16 should prove that a local user can:

- run the Geometry Harmony example;
- generate the deterministic report bundle;
- inspect `report.html`;
- identify `result.json` as canonical truth;
- see that no hosted, public, image, vision, CAD, or recommendation behavior is
  involved.

## Current Execution Mode After R16

R16 is merged.

The project is not obligated to execute 17 more historical PRs. Old PR31,
PR32, and PR33 references are historical roadmap labels, not mandatory
remaining work items and not an automatic checklist.

Future work should be selected by current gaps, not old numbering. Work remains
one PR at a time. Swarm or multi-agent work is allowed only for read-only
review, planning, or independent checks. Implementation must remain
single-owner per branch/PR.

Current recommended next choices are:

1. R17 - local consumer readiness refresh, if package consumption clarity is
   still needed.
2. A later explicit package publication decision, only if maintainers want
   publication.
3. Product/UI/dashboard work only after a separate product-scope approval.
4. Hosted/remote MCP only after explicit threat-model and deployment approval.

Public npm publication remains blocked. Hosted MCP remains blocked.
UI/dashboard work remains blocked until explicitly approved. Engine behavior
must not change for roadmap convergence.

## Non-Goals

R15 itself is docs/tests only and does not implement R16.

R15 does not:

- implement R16;
- change engine, CLI, MCP, report-kit, viewer, ratio-pack, or package behavior;
- change schemas or package exports;
- add dependencies;
- publish or deploy anything;
- mutate wiki state unless a separate wiki sync is performed.

## Validation Policy

The checkpoint is valid only if tests prove:

- the roadmap names PR #135 / R14 and its merge commit;
- R10 through R14 are recorded in order;
- R16 is recorded as merged;
- historical PR31, PR32, and PR33 labels are not treated as mandatory remaining
  work;
- the current sequence selects future work from current gaps, one PR at a time;
- hosted MCP, public app submission, package publication, remote API runtime,
  image/vision/CAD/provider runtime, and recommendation-style behavior remain
  blocked.
