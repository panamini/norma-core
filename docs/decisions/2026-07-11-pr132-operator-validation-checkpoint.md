# PR132 Operator Validation Checkpoint

## Status

Completed locally without provider or network execution on the merged PR132
surface, then revalidated with the PR132 hardening fixes.

This checkpoint records deterministic synthetic evidence. It is not
authenticated human-review proof, live-provider proof, production-data proof,
or approval for a ChatGPT/MCP runtime.

## Commands

```text
rtk npm run build
rtk node --test tests/local-visual-candidate-review.test.mjs tests/local-visual-candidate-selection-intent.test.mjs
```

The focused run passed 18 of 18 tests. It covered the local browser validator,
exact PNG identity and dimensions, closed selection intent, package-private
selection finalizer, existing PR129 no-network resume, AcceptedGeometry,
Core / Structured Analyze, canonical `result.json`, and the derived artifact
boundary.

## Deterministic Evidence

The synthetic 640 by 480 PNG path produced:

- provider execution receipt content identity:
  `sha256:8d2ede33b515905e45504f5b895eac82176553e87ce61627e36647bc5b138060`;
- candidate observation content identity:
  `sha256:577b4b50e99da2c2ffbd916bc461ede308798bd94a97251d1062ccadecfa8d68`;
- explicit selection content identity:
  `sha256:bcc9b7e16d1ce02004c9bed2bc2db00d1905d7537c327b313fc3dbeae4e1318e`;
- canonical `result.json` SHA-256:
  `sha256:f2022dbacdb304b975ca572951295f12fe62317a20191f9821fbbddf0549ec6c`.

The resume status and handoff status were both `completed`. Network transport
was not used.

## Hardening Evidence

The same focused tests now prove that:

- growing input files cannot cause reads beyond their initially accepted size;
- every source-image persistence field must be exactly `false`;
- candidate receipt-observation provenance must restore exactly from the
  supplied execution receipt before a selection record can be finalized.

## Limits

The selection intent in this deterministic checkpoint is assembled by the test
harness rather than authenticated user interaction. The browser surface remains
local-only and non-authoritative. Existing PR129 `--resume` remains the only
route to AcceptedGeometry, Core / Structured Analyze, and canonical
`result.json`.
