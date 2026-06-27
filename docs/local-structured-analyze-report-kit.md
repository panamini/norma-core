# Local Structured Analyze Report Kit

This kit is a local-only command wrapper around the direct `analyzeStructuredCompositionV1` function.

## Scope

- local command only
- direct `analyzeStructuredCompositionV1`
- explicit structured JSON input
- deterministic output bundle:
  - `result.json`
  - `summary.json`
  - `summary.md`
  - `visual.svg`
  - `report.html`
- input-derived pack, rule-set, and evaluation-profile references in the summary

`result.json` is the canonical Norma output. `report.html` is a static local
read-only inspection dashboard over the same existing result, summary, and
visual artifact data.
`summary.json`, `summary.md`, `visual.svg`, and `report.html` are derived local
views. They cannot redefine `result.json` as the canonical source of truth.

## Non-Scope

- no MCP runtime change
- no hosted MCP
- no Cloudflare
- no public submission
- no pack definition or pack mutation by the report kit
- no recommendation
- no beauty score
- no prompt/image inference

## Command

Build first, then run the local command with an explicit structured-analysis input file and an output directory.

```bash
npm run build
node bin/norma-core-report.mjs examples/structured-analyze/basic-grid-alignment.json .reports/local-structured-analyze
```

The command writes only the deterministic bundle files listed above. It does not mutate the input, start an MCP runtime, call a hosted service, or infer geometry from text or images.

The generated `report.html` is self-contained and local. It renders the input
contract, operation boundary, pack/rule/profile references, decision,
measurements, evaluations, component deltas, diagnostics, provenance/source
references, replay readiness, local artifact list, and `visual.svg` without
changing CLI, MCP, engine, or package behavior.
It does not require hosting, an SDK surface, external network access, or MCP
runtime changes.

If the explicit input supplies a non-basic ratio pack, the report summary reflects that supplied pack. The report kit does not define the pack, choose a pack, or create a fallback pack.

## Geometry Harmony Example

The first Geometry Harmony example is:

```bash
node bin/norma-core-report.mjs examples/structured-analyze/geometry-harmony-basic.json /tmp/norma-geometry-harmony-report
```

It supplies `norma.geometry-harmonies@0.1.0`, `surface-golden-section`, explicit tolerances, an explicit PackLock, and an explicit OperationContext. The report states which composition is closer to the declared proportional system. It does not add a recommendation, beauty score, hosted surface, or MCP runtime change.
`result.json` remains the canonical source of truth for the example. The other files are derived
inspection views, and `visual.svg` is representational only; it does not change
result equality or add an optimization, recommendation, or inference layer.
