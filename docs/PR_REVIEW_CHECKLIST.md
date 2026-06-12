# Norma Core PR Review Checklist

Documentation only. No runtime implementation.

This checklist is mandatory for PR0 and reusable for PR1–PR12.

Un PR qui introduit une capacité explicitement bloquée par PR0 doit être refusé, même si les tests passent.

## Required PR sections

Every PR must declare:

- Scope;
- Out of scope;
- Deliverables;
- Acceptance criteria;
- Conceptual tests / reviews;
- Risks;
- Errors to avoid;
- Gate.

A PR without these sections is not review-ready.

## Universal guardrail checks

### Scope V1 allowed

- [ ] The PR stays inside Norma Core.
- [ ] The PR concerns the engine, not the ecosystem.
- [ ] The PR uses structured data only.
- [ ] The PR respects 1D segments, rectangular 2D surfaces and simple 2D compositions.
- [ ] The PR does not depend on UI.
- [ ] The PR does not depend on rendering.
- [ ] The PR does not depend on an image file.
- [ ] The PR does not depend on an external tool as source of truth.

### Packs and ratios

- [ ] No ratio is hardcoded in the core.
- [ ] No ratio is invented by a client.
- [ ] No implicit pack is allowed.
- [ ] No implicit ratio is allowed.
- [ ] Ratios live in packs.
- [ ] The MVP pack remains `norma.basic-proportions@0.1.0`.
- [ ] No rich pack is introduced in MVP.

### Rules

- [ ] Rule declarations live in packs.
- [ ] Rule types live in the core.
- [ ] Algorithms live in the core.
- [ ] No rule is created by prompt.
- [ ] No rule is created by UI, adapter or agent.
- [ ] Unsupported rule type produces an error or critical warning.

### Measurements / evaluation

- [ ] No score exists before measurements.
- [ ] A measurement remains a calculated fact.
- [ ] An evaluation interprets measurements.
- [ ] A score does not replace evaluation.
- [ ] Confidence remains separate from score.
- [ ] Beauty score is forbidden.
- [ ] Intent inference is forbidden.
- [ ] Creative recommendation is forbidden in MVP.

### Artifacts

- [ ] Artifact is derived.
- [ ] Artifact never becomes source of truth.
- [ ] SVG, export or rendering cannot become the core model.
- [ ] Source objects always win over artifacts.
- [ ] Critical warnings and errors remain visible.

### Runtime / replay-readiness

- [ ] Run remains visible in significant results.
- [ ] PackLock remains visible when a pack is used.
- [ ] OperationContext remains visible when it influences output.
- [ ] No output-changing default is hidden.
- [ ] Same input + same pack + same rules + same tolerances + same context + same operation version = same output.
- [ ] Full `replayRun` remains out of MVP.

### Blocked capabilities

- [ ] No UI complète.
- [ ] No écran.
- [ ] No canvas interactif.
- [ ] No drag-and-drop.
- [ ] No caméra.
- [ ] No image.
- [ ] No vision.
- [ ] No OpenCV.
- [ ] No tracking.
- [ ] No plugin.
- [ ] No CAD natif.
- [ ] No cloud.
- [ ] No marketplace.
- [ ] No prompt libre comme source.
- [ ] No beauty score.
- [ ] No SVG comme modèle.
- [ ] No export comme source de vérité.
- [ ] No adapter comme source de logique Norma.
- [ ] No agent-created rules.
- [ ] No pack implicite.
- [ ] No ratio implicite.
- [ ] No tolérance cachée.
- [ ] No recommendation créative.
- [ ] No optimisation automatique.
- [ ] No inférence d’intention.
- [ ] No 3D.
- [ ] No polygones complexes.
- [ ] No formats natifs.

## Automatic rejection checks

Reject the PR if it:

- introduces a blocked MVP capability;
- adds runtime code in PR0;
- adds `src/` in PR0;
- adds CLI, SDK, API or MCP in PR0;
- starts PR1 implementation work inside PR0;
- reopens locked decisions without a major contradiction;
- treats artifact, SVG, export or rendering as source of truth;
- accepts prompt text as source input;
- allows implicit pack, implicit ratio or hidden tolerance;
- hardcodes ratios in the core;
- puts rule execution algorithms in packs;
- lets UI, adapter, prompt or agent create rules;
- produces score before measurements;
- merges confidence into score;
- claims beauty, intent or creative superiority;
- hides warnings, errors or provenance;
- uses a vague future capability to bypass the MVP guardrails.

## Conceptual review tests

### Review test 1 — UI

Question: can a following PR introduce a full UI?

Expected answer: no. UI complète, écran, canvas interactif and drag-and-drop are out of MVP.

### Review test 2 — image / camera

Question: can a following PR accept image, camera or OpenCV as MVP input?

Expected answer: no. The MVP uses structured geometry data only.

### Review test 3 — SVG as source

Question: can SVG or a visual artifact become the source model?

Expected answer: no. Artifacts are derived. Structured source objects win.

### Review test 4 — implicit pack

Question: can an operation use an implicit pack or ratio?

Expected answer: no. Missing pack, missing ratio or implicit ratio must be rejected.

### Review test 5 — beauty score

Question: can Norma produce a beauty score?

Expected answer: no. Norma evaluates closeness to a declared proportional system, not beauty.

### Review test 6 — agent-created rules

Question: can an agent, UI or adapter create an ad hoc rule?

Expected answer: no. Rule declarations live in packs. Supported rule types live in the core.

### Review test 7 — artifacts

Question: can an artifact contain a measurement or evaluation absent from source objects?

Expected answer: no. An artifact cannot invent truth.

### Review test 8 — replay-readiness

Question: does PR0 require full `replayRun`?

Expected answer: no. PR0 requires replay-readiness, not full replay.

## MVP PR sequence

PR0 → PR1 → PR2 → PR3 → PR4 → PR5 → PR6 → PR7 → PR8 → PR9 → PR10 → PR11 → PR12

This sequence is a review boundary only in PR0. PR0 does not implement PR1.

## Done definition for any PR

A PR is done only when:

- its scope is reached;
- its out-of-scope section has not been violated;
- its deliverables exist;
- its acceptance criteria are satisfied;
- its conceptual tests pass in review;
- its warnings and errors are visible where relevant;
- its provenance is preserved for any derived output;
- its gate passes;
- it does not introduce blocked MVP capabilities.

## PR0 done definition

PR0 is done only when:

1. `docs/SPEC_FREEZE.md` exists;
2. `docs/MVP_GUARDRAILS.md` exists;
3. `docs/PR_REVIEW_CHECKLIST.md` exists;
4. `docs/GLOSSARY_CORE.md` exists;
5. PR0 is documentation-only;
6. no runtime code is added;
7. no `src/` directory is added;
8. no CLI, SDK, API or MCP is added;
9. no UI, camera, image, vision, plugin, CAD, cloud or marketplace is added;
10. locked decisions are restated without modification;
11. blocked capabilities are explicit;
12. the MVP target “Surface proportionnelle évaluée” is named;
13. artifacts are defined as derived and never source of truth;
14. beauty score is explicitly forbidden;
15. implicit pack, implicit ratio and hidden tolerance are explicitly forbidden;
16. SVG as model is explicitly forbidden;
17. Run, PackLock and OperationContext are tied to replay-readiness;
18. PR0 does not create PR1;
19. a reviewer can answer every guardrail as yes/no;
20. a future PR violating PR0 can be rejected without debate.

## PR0 final gate

PR0 passes only if no following PR can reasonably claim that UI, camera, image, plugin, native CAD, cloud, marketplace, beauty score, implicit pack, implicit ratio, hidden tolerance or SVG as model are authorized in the MVP.
