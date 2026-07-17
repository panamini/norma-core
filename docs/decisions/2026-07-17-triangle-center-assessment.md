# Post-PR240 triangle-center assessment

Status: accepted decision with a bounded implementation. This document does
not itself change runtime behavior or authorize a Core result.

## Decision

The centroid is the first safe triangle-center candidate and is implemented by
the bounded changeset described below. It is the arithmetic mean of the three
canonical image-plane vertices already admitted by the explicit triangle
construction. It does not need a new observed parent, a line-intersection
heuristic, a ratio target, or a physical-world interpretation.

This remains an implementation-safety decision only. The centroid is exposed
as a separate opt-in derived point and overlay; it is not an observed point,
triangle-center inference, harmonic result, or Core-authoritative result.

## Code-backed prerequisites

- The input must contain exactly one explicit current triangle request, with
  three finite, non-degenerate, canonically ordered vertices.
- The existing `triangles` layer and its parent prerequisites must be enabled
  and confirmed. `triangleRequestCount` and the conditional preparation order
  are already exposed by PR240.
- Parent identity and geometry must still pass the existing fail-closed
  revalidation in `validateTriangleConstructionConfirmation`.
- The construction-analysis contract is
  `norma.personal-visual-harmony-construction-analysis@1`; the current triangle
  and median outputs establish the required `triangleId`, parent provenance,
  image-plane coordinate space, and derived-construction boundary.

## Implemented boundary

The centroid output is a separate derived point and overlay layer, with a
deterministic identity derived from the canonical `triangleId`. Every output
and rendered marker carries `provenance: "derived-construction"`,
`candidateEvidenceOnly: true`, `sourceTruth: false`, and `coreAuthority: false`.
It fails closed when the triangle is missing, stale, ambiguous, degenerate, or
not the single explicitly admitted request. It never enters the Core mapper,
is never treated as an observed point, and does not imply a circumcenter,
incenter, orthocenter, harmonic ratio, physical geometry, rhythm, perspective,
or rectification.

## Executed changeset

`CC-20260717-TRIANGLE-CENTROID-v1` adds one opt-in `triangle-centroids`
construction layer for exactly one already-admitted canonical triangle. Its
bounded scope includes the construction type and deterministic identity, the
versioned construction-analysis schema, the fail-closed validator, focused
geometry/MCP/widget/HTTP regressions, the changed-file guard, and a separate
centroid overlay marker. The arithmetic mean is the only geometry operation.
`CC-20260717-TRIANGLE-CENTROID-v2` closes the active-documentation truth gap
identified during review. No other triangle center, automatic
enumeration, Core mapping, confirmation semantics, harmonic classification,
physical rectification, rhythm, perspective, or new report family belongs in
that changeset.
