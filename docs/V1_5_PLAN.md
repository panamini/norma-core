# Norma Core V1.5 Plan

Documentation-only planning document for Norma Core V1.5 after the `v0.1.0` MVP checkpoint.

This document does not implement V1.5. It defines the safe planning boundary for work that may start after the MVP is tagged.

## 1. Status

- MVP `v0.1.0` is tagged.
- PR0-PR12 remain closed and must not be reopened by V1.5 work.
- GitHub PR #13 delivered the roadmap PR12 MVP demo harness.
- PR14 merged the MVP checkpoint documentation and release metadata alignment.
- V1.5 starts after MVP, without reopening the MVP scope.
- `CORE_VERSION` remains the implemented MVP engine checkpoint identifier unless a later approved runtime PR explicitly changes it.
- This PR is documentation-only and does not start CLI, SDK, API, MCP, adapter, plugin, replay runtime, release or tag work.
- This release-level phase plan intentionally lives at `docs/V1_5_PLAN.md`, matching the requested PR15 deliverable and the checkpoint-style `docs/V0_1_CHECKPOINT.md`. Detailed implementation plans inside V1.5 should use `docs/plans/`.

## 2. V1.5 principles

V1.5 should turn the MVP's replay-readiness into a small, reviewable trust layer before expanding product surfaces.

Guiding principles:

- Preserve the deterministic core: same explicit source objects, pack, rules, tolerances, context and operation version must remain reproducible.
- Keep source truth in structured Norma objects. Artifacts, exports, reports, visuals and adapter outputs remain derived projections.
- Prefer replay and verification design before interface expansion.
- Stabilize operation and serialization boundaries before CLI, SDK, API or MCP surfaces freeze them.
- Keep all external clients thin. A client may call the core; it must not define Norma logic.
- Keep V1.5 incremental and PR-sized. Avoid broad refactors and avoid changing the MVP engine unless a specific bug or blocker is identified.
- Keep governance explicit for packs, adapters and public surfaces.

## 3. V1.5 goals

V1.5 goals are planning targets, not commitments for PR15 implementation.

- Turn replay-readiness into operational replay and verification.
- Define `replayRun`, `verifyRun` and `verifyArtifactFreshness` behavior before claiming replay support.
- Establish deterministic fixtures and golden snapshots for repeatable validation.
- Define a stable public operation boundary and stable serialization boundary.
- Prepare future package consumption, minimal SDK, local CLI, local process API and minimal MCP work without implementing them immediately.
- Clarify artifact/export growth such as CSV measurements and adapter import/export reports while preserving provenance.
- Keep adapters, plugins, camera, CAD, cloud and UI out unless an explicit later plan and gate approves a narrow non-core prototype.

## 4. Authorized after MVP, subject to explicit PR approval

The following tracks may be planned for V1.5. They are not authorized as runtime changes by PR15.

### Replay and verification

- MVP-only `replayRun` design first.
- `verifyRun` design and behavior specification.
- `verifyArtifactFreshness` design and behavior specification.
- Deterministic fixtures.
- Golden snapshots.
- Stable serialization boundary.
- Clear mismatch diagnostics and replay-result vocabulary.

### Public operation boundary

- Stable operation call/result boundary.
- Public operation naming and versioning policy.
- Explicit supported operations list.
- Explicit validation levels and failure modes.
- Public serialization contract for source objects, derived objects and diagnostics.

### Package, SDK and local usage

- Package export review and minimal consumption docs.
- Minimal SDK boundary design.
- Thin local CLI design after replay and operation boundary are stable.
- Local process/API boundary design after the operation boundary is stable.

### Agent and MCP readiness

- Agent playbooks for safe operation use.
- Minimal local MCP design only after tool contracts are explicitly reviewed.
- MCP must not create packs, ratios, rules, tolerances, geometry or Norma truth.
- MCP must expose diagnostics and provenance rather than hide them.

### Artifacts, reports and adapter readiness

- CSV measurement export planning.
- Adapter import/export report planning.
- Non-core design-tool adapter prototype planning after provenance policy review.
- Non-core CAD adapter prototype planning only as a narrow prototype, not native CAD support.
- Richer artifacts or export formats only when they remain derived and never become source truth.
- Richer packs only after governance is defined.

## 5. Non-goals and forbidden scope

The following remain out of V1.5 unless a future explicit decision changes the roadmap. PR15 does not authorize any of them.

- Full UI.
- Interactive canvas.
- Camera input.
- Image, vision or OpenCV pipeline.
- Tracking.
- Native plugin system.
- Native CAD integration.
- Robust CAD behavior.
- Cloud API or hosted service.
- Marketplace.
- Beauty score.
- Creative optimization or creative recommendation.
- Intent inference.
- Agent-invented rules.
- Prompt text as source truth.
- 3D.
- Complex polygons.
- Native rich file formats.
- Rich native import/export as source truth.
- Adapter-owned Norma logic.
- Artifact-as-source behavior.
- Implicit pack, implicit ratio or hidden tolerance.

## 6. Candidate V1.5 tracks

These tracks are candidates. Each one still needs its own PR scope, out-of-scope section, acceptance criteria and validation gate.

1. Replay and verification: `replayRun`, `verifyRun`, `verifyArtifactFreshness`, mismatch policy, replay result vocabulary.
2. Determinism validation: deterministic fixtures, golden snapshots, stable output ordering and snapshot review policy.
3. Public operation boundary: public operation list, operation versions, validation levels, result envelope, diagnostics and provenance.
4. Serialization boundary: stable JSON-safe representation for source objects, derived objects, diagnostics, output refs and run refs.
5. Package and SDK boundary: package exports, minimal SDK consumption docs and explicit non-goals.
6. Thin local CLI: only after replay/verification and operation boundary are accepted.
7. Minimal local MCP: only after operation boundary and tool contracts are reviewed.
8. Adapter readiness: provenance policy, import/export report format and non-core prototype constraints.
9. Richer artifacts/export formats: CSV measurements and reports as derived projections.
10. Richer packs: only after governance, compatibility and provenance rules are reviewed.

## 7. Recommended sequencing

The recommended V1.5 sequence is intentionally short and agent-ready:

1. PR15: docs-only V1.5 plan.
2. PR16: docs/design for `replayRun`, `verifyRun` and `verifyArtifactFreshness`.
3. PR17: public operation boundary and stable serialization design.
4. PR18: deterministic fixtures and golden snapshot design.
5. PR19: package exports and SDK consumption docs, if approved.
6. PR20: minimal local CLI design or implementation only if the boundary is stable and reviewers approve runtime work.
7. PR21+: minimal local MCP only after operation boundary, replay behavior and tool contracts are stable.
8. Later: adapter readiness or non-core prototypes only after provenance/source policy review.

MCP and adapters should not lead V1.5. They should consume stable contracts after replay and verification are specified.

## 8. Approval gates

- No runtime V1.5 code before planning is accepted.
- No public interface before the operation boundary and serialization boundary are stable.
- No replay claim before `replayRun` and `verifyRun` behavior is specified.
- No artifact freshness claim before `verifyArtifactFreshness` behavior is specified.
- No deterministic claim before fixtures and golden snapshots exist and are reviewed.
- No CLI or SDK freezing of contracts before public operation contracts are reviewed.
- No MCP before tool contracts, diagnostics, provenance behavior and agent limits are explicitly reviewed.
- No adapter before external source, import/export and provenance policy are reviewed.
- No richer packs before governance and compatibility policy are reviewed.
- No MVP reopening unless a specific bug or blocker is identified and reviewed explicitly.

## 9. Risks

- Interface-first drift: CLI, SDK, API or MCP could freeze weak contracts too early.
- MCP or agent drift: an agent could invent rules, ratios, tolerances or interpretations if tool contracts are loose.
- Replay overclaim: replay-readiness could be mistaken for full replay verification.
- Artifact drift: artifacts, exports or reports could be treated as source truth.
- SDK/CLI lock-in: early public surfaces could make later operation corrections expensive.
- Adapter leakage: adapter prototypes could accidentally define Norma logic or hide provenance.
- Pack governance gap: richer packs could introduce implicit rules or compatibility ambiguity.
- MVP reopening: V1.5 could accidentally refactor or expand the completed MVP instead of building on it.

## 10. Validation gates for V1.5 PRs

Every V1.5 PR should state:

- scope;
- out of scope;
- deliverables;
- acceptance criteria;
- conceptual tests or review checks;
- risks;
- errors to avoid;
- validation commands or reason why commands are not relevant.

For runtime PRs, the default validation commands remain:

```bash
npm run build
npm test
npm run check
```

A docs-only PR may still run these commands, but it must also show that no runtime files changed.

## 11. Done definition for V1.5

V1.5 is done only when the approved subset of V1.5 tracks satisfies these conditions:

- The MVP remains closed and `v0.1.0` remains a stable checkpoint.
- Replay and verification behavior is specified before it is claimed.
- Artifact freshness behavior is specified before it is claimed.
- Deterministic fixtures and golden snapshots cover the approved replay/verification surface.
- The public operation boundary and serialization boundary are stable enough for thin clients.
- Any approved CLI, SDK, API or MCP surface consumes the stable boundary instead of defining new core truth.
- Artifacts, exports and reports remain derived and preserve provenance, warnings and errors.
- Adapters, if any are approved, remain non-core clients and cannot create Norma rules or source truth.
- No forbidden V1.5 capability is introduced without a future explicit decision.
- `npm run build`, `npm test` and `npm run check` pass for any runtime-bearing PR.

## 12. Suggested next PR

PR16 should be a docs/design PR for `replayRun`, `verifyRun` and `verifyArtifactFreshness`.

PR16 should define:

- replay inputs and outputs;
- verification inputs and outputs;
- artifact freshness inputs and outputs;
- supported MVP-only replay cases;
- mismatch diagnostics;
- deterministic fixture strategy;
- golden snapshot expectations;
- explicit non-goals for CLI, SDK, API, MCP, adapters and UI.

PR16 should not implement replay unless explicitly approved after PR15 is reviewed and accepted.
