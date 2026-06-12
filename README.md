# Norma Core

Norma Core is a deterministic proportional geometry engine.

It applies explicit, versioned proportional systems to structured geometry inputs and produces traceable constructions, measurements, evaluations, comparisons, explanations, artifacts, and replay-ready run envelopes.

## MVP status

The current MVP checkpoint covers PR0–PR12 and is considered:

```txt
MVP_READY_WITH_MINOR_DOC_FOLLOW_UP
```

The audited core version is:

```txt
CORE_VERSION = 0.1.0-pr12
```

The next release tag to prepare is:

```txt
v0.1.0
```

Do not create the tag until the checkpoint PR is merged and verification commands have passed.

## MVP chain

The MVP proves this core chain:

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

It starts from explicit structured geometry and uses:

- a `1200 x 800` rectangular surface;
- the minimal pack `norma.basic-proportions@0.1.0`;
- the rule set `surface-basic-third-grid`;
- two simple 2D compositions A/B;
- the profile `basic-grid-alignment`;
- explicit tolerances and operation context;
- structured artifacts and a derived simple visual artifact;
- a visible `Run`, `PackLock`, and `OperationContext`.

## Verification commands

Run these before tagging `v0.1.0`:

```bash
npm run build
npm test
npm run check
```

Available npm scripts are defined in `package.json`.

## Source of truth

Structured Norma source objects are the source of truth:

- structured input;
- ratio pack and pack lock;
- resolved rules;
- construction;
- measurements;
- evaluation;
- comparison and decision;
- explanation;
- run and operation context.

Artifacts are derived projections. They must keep source refs, warnings, errors, provenance, and replay status visible. A visual artifact, SVG, export, or rendering never becomes the model.

## What Norma Core is not

The MVP is not:

- a UI;
- a camera or image pipeline;
- a plugin;
- a CAD engine;
- a cloud API;
- a CLI, SDK, API, or MCP surface;
- an agent system;
- a marketplace;
- a beauty scorer;
- an intent inference system;
- an automatic creative recommendation engine.

Norma Core evaluates closeness to a declared proportional system. It does not judge aesthetics or infer author intent.

## Version notes

`CORE_VERSION` remains `0.1.0-pr12` in source because it records the final MVP implementation checkpoint after PR12. The release tag prepared by this documentation checkpoint is `v0.1.0`.

`package.json` is currently private package metadata and is documented in `docs/V0_1_CHECKPOINT.md`. Aligning package metadata can be handled by the release maintainer before or during the tag process if desired.

## After v0.1.0

V1.5 planning starts only after the MVP checkpoint is merged and `v0.1.0` is ready or tagged.

V1.5 candidates may include minimal CLI, SDK, local API/process boundary, MCP minimal surface, replay commands, adapter prototypes, or stricter schemas. They are intentionally out of this MVP checkpoint PR.
