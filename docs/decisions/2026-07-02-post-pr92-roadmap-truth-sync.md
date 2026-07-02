# Post-PR92 Roadmap Truth Sync

## Status

Accepted as a docs/tests-only truth-sync checkpoint after PR92.

## Current Merged State

Norma Core `origin/main` is current through PR #172 / PR92.

The guided inspection package/API rail is now current through:

- PR #169 / PR89, which added the local guided inspection demo surface.
- PR #170 / PR90, which defined the package/API readiness gate.
- PR #171 / PR91, which added the package-private
  `createGuidedInspectionArtifactContract` helper.
- PR #172 / PR92, which wired `bin/norma-core-guided-inspection-demo.mjs`
  through that package-private artifact contract.

Current `origin/main` for this checkpoint is:

```txt
2a897b2e7c41a54081a80aa50f0c72b5f6341aa7
```

## Guided Inspection Truth

`result.json` remains the canonical machine-consumable Norma truth for the
guided inspection flow.

`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` are
derived local inspection artifacts only. Future local consumers may use their
paths and metadata as inspection outputs, but must not treat those artifacts as
source truth or use them to infer, correct, optimize, recommend, score, select
families, or override Norma results.

The PR86 metric-policy invariant still applies to accepted geometry, synthetic
shared surfaces, normalized output compositions, Structured Analyze operation
contexts, and derived inspection artifacts.

## Next Safe Implementation Slice

The next useful implementation PR should be a local guided inspection consumer
proof.

That PR may prove that a local caller can consume the existing demo output
envelope and `result.json` through the package-private artifact contract. It
must stay local, package-private, and structural. It must not add public
package exports, package metadata changes, package publication, hosted MCP
runtime, ChatGPT connector runtime, OpenAI/provider calls, or
image/CAD/Figma/provider adapter implementation.

## Blocked Surfaces

The following remain blocked until a later explicit approval PR authorizes
their exact scope:

- public package exports;
- public npm publication;
- package metadata changes;
- lockfile or dependency changes;
- hosted MCP runtime;
- ChatGPT connector runtime;
- OpenAI/provider calls;
- image/CAD/Figma/provider adapter implementation;
- prompt-derived source truth;
- recommendation, optimization, correction, or beauty scoring;
- automatic ratio-pack or family selection.

## Non-Goals

This checkpoint does not change runtime behavior, runtime source code, package
metadata, lockfiles, CLI behavior, MCP behavior, report-kit behavior, viewer
behavior, examples, schemas, dependencies, publication state, wiki state,
provider behavior, hosted runtime, connector runtime, adapter behavior, or
remote services.

## Decision

PR92 is complete. PR93 records current roadmap truth only.

The next real work after PR93 is the local guided inspection consumer proof,
unless a live blocker appears first.
