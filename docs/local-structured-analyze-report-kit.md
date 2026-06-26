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

## Non-Scope

- no MCP runtime change
- no hosted MCP
- no Cloudflare
- no public submission
- no geometry harmonies pack
- no new ratio pack
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
