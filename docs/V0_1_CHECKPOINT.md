# Norma Core v0.1.0 MVP checkpoint

Documentation-only checkpoint. No engine behavior is changed by this document.

## Verdict

```txt
MVP_READY_WITH_MINOR_DOC_FOLLOW_UP
```

Norma Core PR0–PR12 form a coherent MVP engine by inspection. The remaining work before the `v0.1.0` tag is documentation, release checkpointing, and successful verification commands on the checkpoint branch.

## Audited state

| Field | Value |
| --- | --- |
| Repository | `panamini/norma-core` |
| Branch audited | `main` |
| PR12 merge SHA audited | `1de2ba5fd8df27fb36f6238c893bf69094277b2e` |
| Expected core version | `0.1.0-pr12` |
| Release tag being prepared | `v0.1.0` |
| Checkpoint PR scope | documentation/checkpoint only |

`CORE_VERSION` remains `0.1.0-pr12` because it records the final MVP implementation checkpoint after PR12. The release tag prepared by this documentation checkpoint is `v0.1.0`.

## package.json version clarification

`package.json` is private package metadata in this repository. It currently does not define the Norma Core runtime contract; `CORE_VERSION` does.

For the `v0.1.0` tag, reviewers have two acceptable choices:

1. leave `package.json` unchanged and treat `CORE_VERSION = 0.1.0-pr12` plus the Git tag `v0.1.0` as the runtime/release identity; or
2. align `package.json` to `0.1.0` before the tag if the maintainer wants package metadata to match the release tag.

This checkpoint does not require a source-code change under `src/`.

## MVP chain proven

```txt
structured input
→ proportional system
→ rule resolution
→ construction
→ measurement
→ evaluation
→ decision
→ explanation
→ artifact
→ run / replay-readiness
```

The PR12 demo truth is:

```txt
Surface proportionnelle évaluée
```

The MVP remains a deterministic proportional geometry engine, not an interface, not an adapter, and not an ecosystem layer.

## PR0–PR12 summary

| PR roadmap | Result | Summary |
| ---: | --- | --- |
| PR0 | Complete | MVP guardrails, blocked capabilities, glossary, review checklist. |
| PR1 | Complete | Core skeleton, structured result envelope, diagnostics, provenance, runtime placeholders. |
| PR2 | Complete | Operation call/result contracts, canonical variables, hidden-default rejection. |
| PR3 | Complete | Geometry V1: 1D segments, rectangular 2D surfaces, simple 2D compositions. |
| PR4 | Complete | Minimal ratio pack model and `norma.basic-proportions@0.1.0`. |
| PR5 | Complete | Rule declarations, core rule types, rule set resolution trace. |
| PR6 | Complete | Construction generation: guides, zones, grid, diagonals, intersections, trace. |
| PR7 | Complete | Measurements as calculated facts: distances, alignments, areas, containment, overlap, coverage. |
| PR8 | Complete | Evaluation profile, component scores, minimal score, confidence separated from score. |
| PR9 | Complete | A/B comparison, decision, explanation, `tie`, `ambiguous`, `non_comparable`. |
| PR10 | Complete | Structured artifacts, summary/report/explanation artifacts, simple visual artifact as derived projection. |
| PR11 | Complete | `Run`, `PackLock`, `OperationContext`, output refs, deterministic ordering, mismatch policy. |
| PR12 | Complete | Deterministic MVP demo harness with happy path and controlled negative cases. |

## MVP gates validated by inspection

| Gate | Status | Notes |
| --- | --- | --- |
| Core / inputs | Validated | Structured surface and composition inputs; V1 rejects image, CAD-native, plugin, 3D, polygons, UI state. |
| Pack | Validated | Minimal pack, ratios `1/2`, `1/3`, `2/3`, sequence `1:1:1`, content identity, pack lock visibility. |
| Rules / construction | Validated | Rule declarations live in pack; rule types/algorithms live in core; construction trace visible. |
| Measurements | Validated | Measurements are facts, not judgments; provenance, metric policy and tolerance policy are visible. |
| Evaluation / comparison | Validated | Evaluation requires measurements/profile/pack/tolerances; comparison requires same context. |
| Explanation | Validated | Explanation is derived from measurements/evaluations/decision; no aesthetic or intent claim. |
| Artifacts | Validated | Artifacts are derived only; source refs, warnings, errors, status and provenance remain visible. |
| Run / replay-readiness | Validated | `Run`, `PackLock`, `OperationContext`, deterministic refs and mismatch diagnostics are visible. |
| Demo truth | Validated | PR12 harness starts from structured inputs and covers the complete MVP chain. |
| Anti-drift | Validated | No UI, image, camera, CAD-native, plugin, cloud, SDK/API/CLI/MCP, beauty scoring, implicit pack or hidden tolerance is added. |

## Controlled cases covered by MVP tests/code

- missing pack lock;
- missing evaluation profile;
- different tolerances for comparison → `non_comparable`;
- blocked aesthetic score request;
- ratio absent from pack;
- rule absent from pack;
- implicit pack rejection;
- operation context mismatch;
- artifact-as-source rejection;
- deterministic output refs and report;
- full `replayRun`, `verifyRun`, and `verifyArtifactFreshness` intentionally not exposed in MVP.

## Known limits retained intentionally

These are not blockers for `v0.1.0`:

- no CLI;
- no SDK;
- no API;
- no MCP server;
- no adapter;
- no plugin;
- no camera/image/vision pipeline;
- no CAD-native integration;
- no cloud or marketplace;
- no rich replay engine;
- no rich pack registry or signatures;
- no 3D, complex polygons, native formats, or image imports;
- no creative recommendation, optimization, aesthetic score, or intent inference.

## Verification required before tag

Before creating `v0.1.0`, run these commands on the checkpoint branch:

```bash
npm run build
npm test
npm run check
```

A tag should not be created if any of these commands fail.

Optional release hygiene before tag:

- decide whether to align `package.json` version to `0.1.0`;
- confirm no `src/` file was modified by this checkpoint PR;
- confirm no V1.5 capability was introduced;
- confirm the PR contains documentation/checkpoint changes only.

## Tag condition

The repository is ready for `v0.1.0` after:

1. this documentation/checkpoint PR is reviewed and merged;
2. `npm run build` passes;
3. `npm test` passes;
4. `npm run check` passes;
5. the maintainer confirms whether `package.json` remains private metadata or is aligned to `0.1.0`.

## Recommended next step after tag

After `v0.1.0` is tagged, start V1.5 planning only as a separate roadmap/design step.

V1.5 candidates may include minimal CLI, SDK, local API/process boundary, MCP minimal surface, replay commands, stricter schemas, adapter prototypes, or additional release packaging. None of those capabilities belong in this checkpoint PR.
