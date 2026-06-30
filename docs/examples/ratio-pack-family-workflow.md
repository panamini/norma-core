# Ratio-Pack Family Workflow

These examples are local Structured Analyze test/demo inputs. They are not a new API surface, runtime registry, package export, scenario system, hosted dashboard, webapp, MCP behavior, CLI behavior, SDK, or adapter layer.

Each file supplies the ratio pack, rule set reference, PackLock, and
OperationContext explicitly. Norma Core does not choose, infer, select,
recommend, optimize, score, or correct ratio-pack families.

## Run The Harmonic Triads Example

```bash
npm run build
node bin/norma-core-report.mjs examples/structured-analyze/families/harmonic-triads-basic.json /tmp/norma-harmonic-triads-report
```

This input supplies `norma.harmonic-triads@0.1.0` with rule set
`surface-harmonic-triads`.

## Run The Root-Two Harmonics Example

```bash
npm run build
node bin/norma-core-report.mjs examples/structured-analyze/families/root-two-harmonics-basic.json /tmp/norma-root-two-harmonics-report
```

This input supplies `norma.root-two-harmonics@0.1.0` with rule set
`surface-root-two-section`.

## Output Boundary

`result.json` is the canonical Norma truth for each run. `summary.json`,
`summary.md`, `visual.svg`, and `report.html` are derived local inspection
artifacts from the existing report-kit pipeline, and they are non-authoritative.

The examples do not implement image, CAD, GPT, provider, file, URL, hosted,
dashboard, or webapp support. Later adapters would need to produce accepted
structured geometry and explicit ratio-pack input before calling Norma Core;
that adapter path is not implemented here.
