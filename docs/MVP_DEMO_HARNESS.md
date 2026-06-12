# MVP Demo Harness

PR12 adds a deterministic demo harness for the Norma Core MVP. The harness starts from explicit structured data and orchestrates the existing core operations from pack lock through construction, measurements, evaluation, comparison, artifacts, and run wrapping.

## Scenario

- Surface: `1200 x 800`.
- Pack: `norma.basic-proportions@0.1.0`.
- Rule set: `surface-basic-third-grid`.
- Evaluation profile: `basic-grid-alignment`.
- Composition A is close to the declared proportional system.
- Composition B is less close to the declared proportional system.

## Truth Order

The source of truth remains the structured core objects:

1. input summary and source refs
2. `PackLock` and `OperationContext`
3. resolved rule set
4. construction
5. measurements A/B
6. evaluations A/B
7. comparison, decision, and explanation
8. structured artifacts
9. simple visual artifact as a derived projection
10. run envelope and deterministic output refs
11. negative case results

The simple visual artifact is derived from construction data only. It is not an input model and cannot override source objects.

## Negative Cases

The harness includes controlled failures for missing pack lock, missing evaluation profile, different comparison tolerances, blocked score output request, ratio absent from pack, missing rule, implicit pack rejection, context mismatch, and artifact-as-source rejection.

## Out Of Scope

PR12 does not add UI, image processing, camera input, plugins, CAD integration, cloud behavior, SDK/API/CLI/MCP surfaces, recommendations, optimization, rich replay, or rich import/export.
