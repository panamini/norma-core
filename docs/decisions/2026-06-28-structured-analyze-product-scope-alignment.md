# Structured Analyze Product-Scope Alignment

## Status

Accepted as a documentation alignment checkpoint after PR #141 / R19.

R20 is a documentation alignment checkpoint only.

## Decision

R19 remains the current authoritative local inspection boundary.

`result.json` and direct engine output remain canonical Norma truth.
`summary.json`, `summary.md`, `visual.svg`, `report.html`, and viewer output
remain derived inspection artifacts.

R20 clarifies how existing product and viewer documentation should be
interpreted after the current R19 local inspection boundary.

## Product And Viewer Context

PR55 product requirements remain useful product-context documentation:
`docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.

PR56 viewer plan remains useful viewer-context documentation:
`docs/plans/2026-06-16-read-only-result-viewer-plan.md`.

PR55 and PR56 do not imply current approval for new UI implementation or any new
product surface.

R20 does not rewrite PR55 or PR56.

## Non-Approvals

R20 does not approve UI implementation.

R20 does not approve any new product surface.

R20 does not approve a hosted dashboard direction.

R20 does not create product requirements.

Future product or UI work requires a separate explicit approval PR.

## Runtime Boundary

R20 does not define or modify engine correctness or runtime contracts.

R20 does not redefine deterministic output behavior, artifact semantics, or
global architecture policy.

R20 changes no engine, MCP, CLI, report-kit, viewer, package export, schema,
example, package metadata, lockfile, or runtime behavior.
