# Private/Dev Local Visual MCP

This is a local developer proof, not a supported public CLI, ChatGPT connector,
hosted MCP service, or production workflow.

## Prerequisites

Build the repository first because the entrypoint loads package-private modules
from `dist/`:

```bash
npm run build
```

Prepare one synthetic or explicitly non-sensitive local job directory with
exactly the existing finalized PR132 artifacts:

```text
/absolute/local/job/
  provider-execution-receipt.json
  candidate-observation.json
  human-candidate-selection.json
```

Do not place raw image bytes or raw provider responses in this job for PR134.
The root must be absolute, must already exist, and must not be a symlink.

## Start

```bash
node bin/norma-core-private-dev-visual-mcp-stdio.mjs \
  --enable-private-dev-visual-pilot \
  --job-root /absolute/local/job
```

Without the enable flag the command fails closed. Extra arguments, relative
roots, URL-like roots, symlinked roots, missing or oversized artifacts, and an
existing `norma-output/` also fail closed.

The MCP client must initialize with protocol `2025-06-18`, send
`notifications/initialized`, then list or call tools. The dedicated inventory
is exactly:

- `norma.inspectLocalVisualCandidateReviewJobV1` with `{}`;
- `norma.resumeFinalizedLocalVisualSelectionV1` with the three identities from
  inspection, a UTC RFC3339 `acceptedAt`, and
  `confirmResumeFinalizedSelection: true`.

Inspect is read-only. Resume re-reads the three artifacts, rejects stale
identities, reuses the existing PR129 no-network path, and atomically creates
`norma-output/`. The MCP response identifies `result.json` but does not return
its contents. The file in `norma-output/result.json` is canonical; all other
artifacts and the MCP envelope are derived.

PR134 makes no network or provider call and does not connect ChatGPT. Secure
MCP Tunnel and ChatGPT developer-mode validation require separate PR135
approval.
