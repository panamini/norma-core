# Post-PR240 triangle-center assessment

Status: read-only assessment. This document does not implement a triangle
center, change a runtime schema, or authorize a Core result.

## Decision

The centroid is the first safe triangle-center candidate for a future bounded
changeset. It is the arithmetic mean of the three canonical image-plane
vertices already admitted by the explicit triangle construction. It does not
need a new observed parent, a line-intersection heuristic, a ratio target, or a
physical-world interpretation.

This is an implementation-safety decision only. The centroid remains deferred
until a separate changeset is reviewed and verified; this PR must not expose or
render it.

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

## Required future boundary

A future centroid output must be a separate derived point and overlay layer,
with a deterministic identity derived from the canonical `triangleId`. Every
output and rendered marker must carry `provenance: "derived-construction"`,
`candidateEvidenceOnly: true`, `sourceTruth: false`, and `coreAuthority: false`.
It must fail closed when the triangle is missing, stale, ambiguous, degenerate,
or not the single explicitly admitted request. It must never enter the Core
mapper, be treated as an observed point, or imply a circumcenter, incenter,
orthocenter, harmonic ratio, physical geometry, rhythm, perspective, or
rectification.

## Exact next changeset proposed, not executed

`CC-20260717-TRIANGLE-CENTROID-v1`: add one opt-in
`triangle-centroids` construction layer for exactly one already-admitted
canonical triangle. The bounded scope would include the construction type and
deterministic identity, the versioned construction-analysis schema, the
fail-closed validator and focused geometry/MCP/widget regressions, the changed
file guard, and a separate centroid overlay marker. The arithmetic mean would
be the only geometry operation. No other triangle center, automatic
enumeration, Core mapping, confirmation semantics, harmonic classification,
physical rectification, rhythm, perspective, or new report family belongs in
that changeset.
