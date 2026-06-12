# Norma Core v0.1.0 MVP checkpoint

Documentation-only checkpoint for the Norma Core MVP before tagging `v0.1.0`.

## Verdict

```txt
MVP_READY_WITH_MINOR_DOC_FOLLOW_UP
```

The engine implementation inspected after PR12 is coherent for the MVP. This checkpoint documents the release boundary and restores the normative PR0 docs expected by reviewers before the `v0.1.0` tag.

## Audited state

| Field | Value |
|---|---|
| Repository | `panamini/norma-core` |
| Base | `main` |
| Audited merge SHA | `1de2ba5fd8df27fb36f6238c893bf69094277b2e` |
| Last known merged PR | PR #13 / roadmap PR12: MVP demo harness |
| Expected `CORE_VERSION` | `0.1.0-pr12` |
| Release tag prepared by this checkpoint | `v0.1.0` |

`CORE_VERSION` remains `0.1.0-pr12` to identify the completed PR12 engine checkpoint. `package.json` is aligned to `0.1.0` for the package/release checkpoint metadata.

## MVP definition

Norma Core v0.1.0 proves this deterministic chain:

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

The MVP truth demo is:

```txt
Surface proportionnelle évaluée
```

The MVP remains a deterministic proportional geometry core. It is not a UI, camera app, plugin, CAD engine, cloud API, SDK, MCP server, autonomous agent, image pipeline or beauty scorer.

## PR0–PR12 summary

| Roadmap PR | Purpose | Checkpoint status |
|---:|---|---|
| PR0 | Spec freeze and MVP guardrails | Normative docs restored in this checkpoint. |
| PR1 | Core skeleton | Result envelope, diagnostics, provenance and runtime placeholders. |
| PR2 | Operation contracts | Structured call/result vocabulary and guardrails against implicit pack, hidden tolerance and prompt input. |
| PR3 | Geometry model V1 | Segments, rectangular surfaces, simple 2D compositions and explicit coordinate/metric/tolerance policies. |
| PR4 | Minimal ratio pack | `norma.basic-proportions@0.1.0`, `1/2`, `1/3`, `2/3`, `1:1:1`, pack identity and pre-lock. |
| PR5 | Rule declarations and rule resolution | Pack-owned declarations, core-owned supported rule types and `resolvedRuleSet` trace. |
| PR6 | Construction generation | Guides, zones, 3×3 grid, diagonals, intersections and construction trace. |
| PR7 | Measurements | Distances, alignments, areas, containment, overlap, coverage and measurement provenance. |
| PR8 | Evaluation | `basic-grid-alignment`, component scores, score summary and confidence separated. |
| PR9 | Comparison and decision | A/B comparison in same context with `a_closer`, `b_closer`, `tie`, `ambiguous`, `non_comparable`. |
| PR10 | Artifacts | Structured result, construction summary, evaluation report, explanation and simple visual artifacts. |
| PR11 | Run / PackLock / OperationContext | Replay-readiness envelope, deterministic output refs and mismatch policy. |
| PR12 | MVP demo harness | End-to-end deterministic truth demo with negative cases. |

## MVP gates validated by inspection

### Gate 1 — Core / inputs

- Structured surface input is supported.
- Simple 2D rectangular compositions are supported.
- V1 rejects image, CAD object, plugin object, native layer, polygon, rotation and presentation fields.
- Coordinate system, metric policy and tolerance policy are visible.

### Gate 2 — Pack

- Minimal pack: `norma.basic-proportions@0.1.0`.
- Ratios: `1/2`, `1/3`, `2/3`.
- Ratio sequence: `1:1:1`.
- Pack identity, schema version and content identity are visible.
- Missing ratio and implicit pack cases are rejected.

### Gate 3 — Rules / construction

- Rule declarations live in the pack.
- Supported rule types live in the core.
- `surface-basic-third-grid` resolves before construction.
- Construction produces guides, zones, grid cells, diagonals and intersections.
- Derived construction objects carry provenance and are traceable through `constructionTrace`.

### Gate 4 — Measurements

- Measurements remain calculated facts.
- Distances, positions, alignments, areas, containment, overlap and coverage are represented.
- Metric/tolerance policy and measurement provenance remain visible.
- Evaluation outputs are rejected from the measurement phase.

### Gate 5 — Evaluation / comparison

- `basic-grid-alignment` evaluates measurements from an explicit pack/profile/tolerance context.
- Component scores are visible.
- Confidence is separate from score.
- Comparisons require the same pack/profile/tolerances/surface/coordinate/metric/context.
- Different tolerances produce `non_comparable`.
- Beauty score and intent inference are rejected.

### Gate 6 — Explanation

- Explanation is derived from measurements, evaluations, component deltas, warnings and decision status.
- It does not claim beauty, preference or author intent.

### Gate 7 — Artifacts

- `StructuredResultArtifact`, `ConstructionSummaryArtifact`, `EvaluationReportArtifact`, `ExplanationArtifact` and `SimpleVisualArtifact` exist as derived projections.
- Artifact status includes `current`, `lossy`, `stale`, `non_replayable`.
- Artifact-as-source is rejected with `ArtifactWouldBecomeSourceOfTruth`.

### Gate 8 — Run / replay-readiness

- `Run`, `RunInput`, `RunOutput`, `PackLock`, `OperationContext` and `OutputRefs` are visible.
- Output refs are deterministic.
- Mismatch policy covers pack version/content, operation version, geometry model, tolerance, coordinate, metric policy, feature flags, artifact stale and missing source.
- Full `replayRun`, `verifyRun` and `verifyArtifactFreshness` are not exposed in the MVP.

### Gate 9 — Demo truth

- `src/mvp-demo.ts` implements the end-to-end truth path.
- The demo uses surface `1200 × 800`, the minimal pack, `surface-basic-third-grid`, `basic-grid-alignment`, composition A closer and composition B less close.
- The demo produces construction, measurements A/B, evaluations A/B, comparison, explanation, structured artifacts, simple visual artifact, run envelope and negative cases.

### Gate 10 — Anti-drift

- No UI, image, camera, CAD, plugin, cloud, marketplace, CLI, SDK, API, MCP, 3D, complex polygons, beauty score, intent inference, creative optimization, native formats or rich replay are introduced by this checkpoint.

## Known limits before tag

- This checkpoint does not add new engine behavior.
- This checkpoint does not re-run the previous audit; it records its outcome.
- `CORE_VERSION` remains `0.1.0-pr12`; the package metadata is `0.1.0` for release alignment.
- Full replay execution remains out of MVP.
- CLI, SDK, API, MCP, adapters, plugins, camera, CAD and cloud remain out of MVP.
- Future public schemas and V1.5 interface contracts remain undecided.

## Verification required before tagging

Before creating tag `v0.1.0`, run:

```bash
npm run build
npm test
npm run check
```

Expected result:

- build passes;
- test suite passes;
- check passes;
- no engine source files changed by this checkpoint.

## Files intentionally changed in this checkpoint

- `docs/SPEC_FREEZE.md`
- `docs/MVP_GUARDRAILS.md`
- `docs/PR_REVIEW_CHECKLIST.md`
- `docs/GLOSSARY_CORE.md`
- `docs/V0_1_CHECKPOINT.md`
- `README.md`
- `package.json`
- `package-lock.json`

No `src/` files are changed.

## Out of scope for this checkpoint

- Tag creation.
- GitHub release creation.
- V1.5 planning implementation.
- Engine refactor.
- Any runtime behavior change.
- CLI, SDK, API, MCP, adapter or plugin work.
- Camera, image, vision, CAD, cloud, marketplace, native format or 3D work.

## Condition before tag `v0.1.0`

Tag `v0.1.0` only after:

1. this documentation checkpoint PR is merged;
2. `npm run build` passes;
3. `npm test` passes;
4. `npm run check` passes;
5. no engine code changes are included in the checkpoint PR.

## Recommended next step after tag

After `v0.1.0` is tagged, begin V1.5 planning separately. V1.5 planning may discuss CLI, SDK, API, MCP, adapters, full replay verification or richer exports, but those topics must remain outside the v0.1.0 MVP tag.
