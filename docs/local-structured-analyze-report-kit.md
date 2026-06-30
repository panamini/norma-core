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

## Family Ratio-Pack Workflow

Authored family ratio packs can be supplied through the same explicit structured
input path. The current working flow is:

- explicit structured JSON input
- explicit authored family ratio-pack data
- deterministic `analyzeStructuredCompositionV1` analysis
- local report bundle
- local read-only inspection

R27 adds a root-two architectural surface-partition fixture at
`tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json`. It is an
authored `ratio-pack-v1` fixture for `norma.root-two-harmonics@0.1.0` and rule
set `surface-root-two-section`.

This is not a new scenario system, package export, report runtime, UI preset,
recommendation engine, optimization layer, or beauty score. The report kit only
shows the explicit pack and rule-set references already present in the input and
result.

## Geometry Harmony Example

The first Geometry Harmony example is:

```bash
node bin/norma-core-report.mjs examples/structured-analyze/geometry-harmony-basic.json /tmp/norma-geometry-harmony-report
```

It supplies `norma.geometry-harmonies@0.1.0`, `surface-golden-section`, explicit tolerances, an explicit PackLock, and an explicit OperationContext. The report states which composition is closer to the declared proportional system. It does not add a recommendation, beauty score, hosted surface, or MCP runtime change.
`result.json` remains the canonical source of truth for the example. The other files are derived
inspection views, and `visual.svg` is representational only; it does not change
result equality or add an optimization, recommendation, or inference layer.

## Future Adapter Pipeline

The intended later pipeline is not implemented in this kit:

```text
image/CAD/design-tool adapter
-> accepted structured geometry
-> explicit family ratio pack
-> Norma Core analysis
-> local/report visual inspection
```

Image analysis, GPT vision-to-geometry adapters, AutoCAD/Figma/Illustrator/
Photoshop plugins, hosted dashboards, live monitor pages, public npm package
publication, recommendation/optimization/beauty scoring, and automatic design
correction remain outside the current local report-kit boundary.
