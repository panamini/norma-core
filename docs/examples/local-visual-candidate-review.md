# Local Visual Candidate Review

This developer-only workflow makes the PR129 candidate-selection boundary
visible without changing provider, Core, package, or public behavior.

## Prerequisite

Build the repository first:

```bash
npm run build
```

Use only synthetic or explicitly non-sensitive local data. Do not use a live
provider call for this review workflow.

## Review

Open `viewer/local-visual-candidate-review.html` in a local browser. Select:

1. the PR129 `candidate-observation.json`;
2. the exact source PNG whose bytes produced the observation; and
3. an opaque local actor identifier such as `operator:local`.

The page verifies the PNG content identity and dimensions before rendering
rectangles. Nothing is selected by default. Select exact candidates, then use
the separate confirmation action to download
`local-visual-candidate-selection-intent.json`.

The downloaded intent is untrusted input. It is not authenticated human proof,
AcceptedGeometry, Core input, or Norma truth.

## Finalize

Finalize the intent from Node with the exact receipt, observation, and PNG:

```bash
node bin/norma-core-local-visual-candidate-selection-finalizer.mjs \
  --receipt /path/to/provider-execution-receipt.json \
  --candidate /path/to/candidate-observation.json \
  --image /path/to/source.png \
  --intent /path/to/local-visual-candidate-selection-intent.json \
  --output /path/to/human-candidate-selection.json \
  --confirm-exact-selection
```

The command refuses unknown arguments, missing confirmation, oversized or
drifting files, invalid PNG data, identity or dimension mismatches, unknown or
reordered candidate IDs, and an existing output path. It makes no network or
provider call and produces only the existing PR129 human-selection record.

Use the existing PR129 `--resume` command separately with that record. PR129
resume remains the only route from explicit selection to AcceptedGeometry,
Core / Structured Analyze, canonical `result.json`, and derived reports.
