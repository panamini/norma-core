# Real-Usecase Structured Layout Demo

This example shows a realistic product-detail layout encoded as explicit
Structured Analyze geometry. The fixture is:

`examples/structured-analyze/usecases/structured-layout-real-usecase.json`

It models a 1200x900 page with explicit margin regions, 24 px gutters, a
dominant media region, supporting copy and purchase regions, and three repeated
support cards. Composition B is an offset version of the same layout intent so
the existing engine can compare supplied rectangles deterministically.

## Local Use

Build the package, then run the focused smoke test:

```bash
pnpm run build
node --test tests/real-usecase-structured-layout-demo.test.mjs
```

The test loads the JSON fixture and calls `analyzeStructuredCompositionV1`
directly through the current public package surface.

## Boundary

The fixture is explicit structured geometry. Norma Core analyzes the supplied
rectangles, ratio-pack reference, rule-set reference, policies, provenance, and
acceptance record. It does not infer layout intent, optimize spacing, repair
geometry, recommend design changes, or generate UI.

Image analysis, CAD import, Figma, Photoshop, Illustrator, web dashboards, and
LLM adapters are future adapter or product layers. They are not part of this
example or this PR.
