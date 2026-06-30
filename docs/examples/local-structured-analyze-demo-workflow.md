# Local Structured Analyze Demo Workflow

This local-only workflow shows how to run the existing Structured Analyze family examples through the existing local report entrypoint, write filesystem artifacts to a temporary output directory, and verify `result.json` as canonical Norma truth.

## Prerequisites

- local repo checkout
- build completed
- no hosting required

## Run The Existing Family Examples

```bash
node bin/norma-core-report.mjs examples/structured-analyze/families/harmonic-triads-basic.json <tmp-output-dir>
```

```bash
node bin/norma-core-report.mjs examples/structured-analyze/families/root-two-harmonics-basic.json <tmp-output-dir>
```

## Output Boundary

The report command is a local demo entrypoint, not a new public API contract.

`result.json` is canonical Norma truth. Any `summary.json`, `summary.md`, `visual.svg`, or `report.html` files are derived inspection output. Derived artifacts must not redefine engine truth.

The examples are explicit structured inputs. Norma Core does not select, infer, recommend, optimize, score, or correct ratio families.

## Non-Goals

- no webapp
- no hosted dashboard
- no image/CAD/GPT adapter
- no automatic family selection
- no recommendation
- no optimization
- no beauty scoring
- no correction/inference layer
