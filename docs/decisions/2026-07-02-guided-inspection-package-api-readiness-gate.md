# Guided Inspection Package/API Readiness Gate

## Status

PR90 is a docs/tests/guard package/API readiness gate after PR88 and PR89.

PR90 does not implement runtime code, package metadata, public package exports,
public API behavior, package publication, hosted MCP, ChatGPT connector runtime,
OpenAI/provider calls, adapter implementation, dependencies, lockfiles, CI,
auth, secrets, or deployment.

## Sequencing Basis

PR88 defined the integration unlock priority order:

1. local operator validation and visible proof;
2. local guided inspection surface;
3. package/publication readiness gate;
4. hosted/private MCP and ChatGPT connector gates;
5. image/CAD/Figma/provider adapter gates.

PR89 completed the local guided inspection demo surface. It added the local
`bin/norma-core-guided-inspection-demo.mjs` command and the local guide output
without changing package exports, package metadata, hosted runtime, connector
runtime, provider calls, adapter implementation, or public publication state.

PR90 is the package/API readiness gate that follows that local proof.

## Guided Inspection Truth Contract

`result.json` remains the canonical machine-consumable Norma truth for the
guided inspection flow.

`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` are
derived local inspection artifacts only.

Future package/API surfaces may reference derived artifact paths and metadata
only as inspection outputs. They must not treat those artifacts as source truth,
must not recompute Norma results from them, and must not use them to infer,
correct, optimize, recommend, score, or override Norma results.

## Package/API Readiness Boundary

The first safe implementation PR after this gate should be a package-private
local helper or caller contract for the guided inspection proof.

That first implementation slice may define how an internal caller asks the
existing local proof to identify `result.json` and derived inspection artifact
paths. It must remain local and package-private unless a later explicit
package-change/publication PR approves otherwise.

Public package/API exports, public npm publication, package metadata changes,
lockfile changes, dependency changes, hosted MCP runtime, ChatGPT connector
runtime, OpenAI/provider calls, and image/CAD/Figma/provider adapter
implementation remain blocked.

## Core Source-Truth And Metric-Policy Invariants

Norma Core source truth remains explicit structured geometry only.

Derived inspection artifacts are views over deterministic Core output. They do
not become Norma source truth, hidden pack selection, hidden tolerance policy,
hidden operation context, prompt inference, recommendation, optimization,
correction, automatic family selection, or beauty scoring.

The PR86 metric-policy invariant remains mandatory: explicit metric policies
must stay coherent across accepted geometry, synthetic shared surfaces,
normalized output compositions, Structured Analyze operation contexts, and any
derived inspection artifact.

## Non-Approval Boundary

PR90 does not approve:

- public package exports;
- public API exports;
- public npm publication;
- package metadata changes;
- lockfile changes;
- dependency changes;
- hosted MCP runtime;
- ChatGPT connector runtime;
- OpenAI integration or provider calls;
- image/CAD/Figma/provider adapter implementation;
- auth, OAuth, secrets, or deployment;
- prompt inference;
- recommendation;
- optimization;
- correction;
- automatic family selection;
- beauty scoring.

## Next Implementation Slice

Best next implementation PR after PR90 merge:

```text
PR91: package-private guided inspection caller contract
```

PR91 should stay package-private and local. It should not add public package
exports, public API exports, public npm publication, hosted MCP, ChatGPT
connector runtime, OpenAI/provider calls, adapter runtime, dependencies,
lockfiles, package metadata changes, or source-truth shortcuts.
