# Local Structured Analyze Product-Surface Approval

## Status

Accepted as R21 after PR #141 / R19 and PR #142 / R20.

R21 is an approval gate only.

## Decision

R21 approves only the future product-surface implementation scope for a separate
local-only, static, read-only Structured Analyze inspection surface.

R21 itself does not implement UI.

The approved future implementation may inspect existing local Structured Analyze
outputs, including:

- direct engine result object
- `result.json`
- existing report bundle artifacts

The future implementation must remain local-only, static, read-only, separate,
optional, and scoped.

The future implementation must not define Norma truth, execute analysis,
recompute results, mutate input, infer geometry, select hidden packs, create
ratios, create tolerances, optimize, recommend, score, correct, fetch remote
data, host a service, or publish a package.

## Current Boundaries

R19 remains the current authoritative local inspection boundary.

R20 remains the current documentation interpretation checkpoint.

PR55 product requirements remain useful product-context documentation:
`docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.

PR56 viewer plan remains useful viewer-context documentation:
`docs/plans/2026-06-16-read-only-result-viewer-plan.md`.

PR55 and PR56 remain useful context, but R21 is the current narrow approval gate
for the next local product-surface implementation.

R21 does not rewrite PR55 or PR56.

## Non-Approvals

R21 does not approve:

- hosted dashboard
- public webapp
- SDK
- API runtime
- public npm publication
- hosted MCP
- remote MCP
- image input
- vision input
- CAD input
- provider input
- recommendation logic
- optimization logic
- scoring logic
- inference logic
- correction logic

## Runtime Boundary

R21 does not define or modify engine correctness or runtime contracts.

R21 changes no engine, MCP, CLI, report-kit, viewer, package export, schema,
example, package metadata, lockfile, or runtime behavior.

## Future Implementation

The future implementation must be a separate PR.

One valid next implementation label is:

```text
R22: local Structured Analyze inspection surface implementation
```

R22 remains optional and must preserve the R19 and R20 boundaries unless a later
explicit approval changes them.
