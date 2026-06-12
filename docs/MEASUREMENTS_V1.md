# Measurements V1

PR7 introduces calculated measurement facts. Measurements read validated geometry and PR6 construction outputs, then expose facts for later evaluation work.

## Scope

- `measureGeometry` measures a construction plus one or more `Composition2D` inputs.
- `measureAreas` returns the area, containment, overlap, and coverage subset for one `Composition2D`.
- Supported measurement types are distance, position, alignment, area, ratio, angle, containment, overlap, and coverage.
- Minimal `DirectionalRelation` and `SurfaceHierarchy` objects are included for traceability.

## Required Fields

Each measurement includes:

- `inputRefs`
- `unit`
- `normalized`
- `metric`
- `metricPolicy`
- `tolerancePolicy`
- `toleranceStatus`
- `provenance`

## Diagnostics

PR7 returns structured errors for missing input, missing source geometry, invalid measurement input, missing metric policy, missing tolerance policy, missing provenance, and rejected non-measurement requested outputs.

PR7 returns structured warnings for measured gaps, overlaps, and out-of-tolerance alignment facts.

## Boundary

Measurements are calculated facts only. PR7 does not produce evaluation, comparison, decision, recommendation, artifacts, score output, or component score output.
