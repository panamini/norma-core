# Norma Core

Norma Core is a deterministic proportional geometry engine. It applies explicit, versioned proportional systems to structured geometric inputs and returns traceable structured outputs.

The current MVP proves the core engine, not the product ecosystem around it.

## MVP status

Current audited engine checkpoint:

- MVP verdict: `MVP_READY_WITH_MINOR_DOC_FOLLOW_UP`
- Audited merge SHA: `1de2ba5fd8df27fb36f6238c893bf69094277b2e`
- Core version: `0.1.0-pr12`
- Target release tag after this docs checkpoint: `v0.1.0`

PR0–PR12 implement the Norma Core MVP chain from structured input to replay-readiness. This documentation checkpoint prepares the repository for the `v0.1.0` tag. It does not start V1.5.

## MVP chain

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

The demo starts from explicit structured data, uses `norma.basic-proportions@0.1.0`, resolves `surface-basic-third-grid`, evaluates two simple 2D rectangular compositions with `basic-grid-alignment`, compares them in the same context, explains the result, emits derived artifacts, and wraps the result in a replay-readiness envelope.

## Verification commands

Run these commands before tagging `v0.1.0`:

```bash
npm run build
npm test
npm run check
```

Available scripts are defined in `package.json`.

## Source of truth

Norma source truth is held by structured core objects:

- structured input;
- `RatioPack` and `PackLock`;
- resolved rules;
- construction;
- measurements;
- evaluation;
- comparison and decision;
- explanation;
- `Run` and `OperationContext`.

Artifacts are derived projections. They preserve source refs, warnings, errors and provenance, but they never become the core model.

## What Norma Core does not do in the MVP

The MVP does not include:

- full UI;
- interactive canvas;
- drag-and-drop;
- camera;
- image or vision pipeline;
- OpenCV;
- tracking;
- plugin;
- native CAD;
- cloud API;
- marketplace;
- CLI, SDK, API or MCP surface;
- native file import/export;
- full `replayRun`;
- `verifyRun`;
- `verifyArtifactFreshness`;
- 3D;
- complex polygons;
- creative optimization;
- intent inference;
- beauty score.

Norma Core evaluates closeness to a declared proportional system. It does not judge beauty and does not infer author intent.

## Package version and core version

`package.json` is aligned to `0.1.0` for the release checkpoint. The exported `CORE_VERSION` remains `0.1.0-pr12` because it identifies the implemented PR12 engine checkpoint used to prepare `v0.1.0`.

## Next phase

After the docs checkpoint is merged and the verification commands pass, the next release step is to create the `v0.1.0` tag.

V1.5 planning can start only after the MVP is tagged. V1.5 may consider CLI, SDK, API, MCP, adapters or full replay work, but none of those are part of this MVP checkpoint.
