# Local Structured Analyze Demo Workflow

This local-only workflow shows how to run the existing Structured Analyze family examples through the existing local report entrypoint, write filesystem output to a temporary directory, and verify `result.json` as canonical Norma truth.

## Prerequisites

- local repo checkout
- build completed
- no hosting required

## Run The Existing Family Examples

Use the existing local report entrypoint for the current checkout. In this repo state, the local entrypoint can be invoked as:

```bash
node bin/norma-core-report.mjs examples/structured-analyze/families/harmonic-triads-basic.json /tmp/norma-r30-harmonic-triads-report
```

```bash
node bin/norma-core-report.mjs examples/structured-analyze/families/root-two-harmonics-basic.json /tmp/norma-r30-root-two-harmonics-report
```

## Output Boundary

The report entrypoint is a local demo workflow, not a new public API contract.

`result.json` is canonical Norma truth. The output directory may also contain additional derived files if the report-kit generates them, but those files remain non-authoritative and must not redefine engine truth.

The examples are explicit structured inputs. Norma Core does not select or infer ratio families.

## Non-Goals

- no webapp
- no hosted dashboard
- no image/CAD/GPT adapter
- no automatic family selection
- no recommendation
- no optimization
- no beauty scoring
- no correction/inference layer
