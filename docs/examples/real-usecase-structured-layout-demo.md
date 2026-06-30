# Real-Usecase Structured Layout Demo

This example models an editorial product-poster composition as explicit structured geometry. The JSON names a shared poster surface, two layout variants, and the rectangle sources for hero, title, subtitle, body copy, metadata, and product-card regions.

Run the existing local report flow:

```bash
node bin/norma-core-report.mjs examples/structured-analyze/usecases/structured-layout-real-usecase.json /tmp/norma-r31-structured-layout-report
```

The input is authored structured JSON. Norma Core receives coordinates, dimensions, `ratioPack`, `ruleSetRef`, `packLock`, and `operationContext` directly; it does not infer geometry from images, prompts, CAD, Figma, Illustrator, Photoshop, PDFs, or other files in this PR.

`result.json` is the canonical Norma truth. Any report artifacts in the output directory are derived local inspection output and must not redefine engine truth.

A future adapter could produce structured geometry like this, but no adapter is implemented here. This example does not add image analysis, prompt ingestion, CAD/design-app ingestion, a hosted dashboard, a webapp, public API behavior, package publishing behavior, runtime family selection, recommendation, optimization, beauty scoring, correction, or automatic ratio-family selection.
