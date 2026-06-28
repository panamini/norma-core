# Local Inspection Surface Boundary

## Status

Accepted for the current local/private Norma Core operating model after PR #140 / R18.

## Decision

Norma Core has local inspection surfaces for existing Structured Analyze output.

These surfaces are local-only and derived-only. They exist to inspect current
engine output, not to define product behavior or a new runtime contract.

## Canonical Truth

`result.json` and direct engine output remain canonical Norma truth.

The approved Structured Analyze package-root entry point remains
`analyzeStructuredCompositionV1`, and package consumption remains local/private.

## Derived Inspection Artifacts

The existing local report bundle may include:

- `result.json`
- `summary.json`
- `summary.md`
- `visual.svg`
- `report.html`

`summary.json`, `summary.md`, `visual.svg`, `report.html`, and viewer output are
derived local inspection artifacts only. They may display, summarize, or render
existing result data, but they do not define, recompute, infer, correct,
optimize, recommend, score, or override Norma results.

## Non-Approvals

This decision does not approve:

- hosted dashboard
- public webapp
- SDK
- API runtime
- public npm publication
- hosted MCP
- remote MCP
- recommendation logic
- optimization logic
- scoring logic
- inference logic
- correction logic

## Runtime Boundary

This decision changes no engine, CLI, MCP, report-kit, viewer, package, schema,
export, or distribution behavior.
