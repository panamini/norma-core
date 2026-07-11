# PR134 Private/Dev Local Visual MCP Orchestration

## Status

Implemented under the separately approved HIGH-risk contract
`CC-PR134-PRIVATE-DEV-LOCAL-VISUAL-MCP-ORCHESTRATION-V2`.

PR134 proves one disabled-by-default, package-private local STDIO MCP server.
It does not prove or claim a ChatGPT connection, Secure MCP Tunnel, remote or
hosted MCP, authentication, provider execution, or production readiness.

## Atomic Outcome

One process is bound at startup to one absolute existing local review-job root:

```text
node bin/norma-core-private-dev-visual-mcp-stdio.mjs \
  --enable-private-dev-visual-pilot \
  --job-root /absolute/local/job
```

The fixed job inputs are:

- `provider-execution-receipt.json`;
- `candidate-observation.json`;
- `human-candidate-selection.json`.

The only output location is a new `norma-output/` directory. Existing output
is never overwritten or certified.

## Exact Tool Inventory

The dedicated server exposes exactly:

1. `norma.inspectLocalVisualCandidateReviewJobV1` with an exact empty input;
2. `norma.resumeFinalizedLocalVisualSelectionV1` with the three expected
   content identities, a UTC RFC3339 `acceptedAt`, and explicit confirmation.

Tool calls cannot supply paths, candidate IDs, geometry, provider data, output
arguments, or arbitrary CLI values. The existing general six-tool MCP inventory
is unchanged.

## Authority And Data Boundary

- The persisted finalized human selection remains selection authority.
- The provider execution receipt is provenance only.
- Inspection never creates AcceptedGeometry or runs Core.
- Resume re-reads all three bounded files and requires the inspected identities
  to match before Core execution or any write.
- Resume directly reuses the existing package-private PR129 implementation.
- `result.json` remains canonical; every report, viewer, proof, and MCP envelope
  is derived and non-authoritative.
- MCP responses contain only closed statuses, bounded counts, safe content
  identities, and fixed logical artifact names. They contain no coordinates,
  actor IDs, paths, URLs, prompts, secrets, raw provider output, or result body.

## Filesystem And Process Boundary

- The job root must be an absolute, existing, non-symlink directory whose real
  path matches its resolved path.
- Fixed files must be regular, non-symlink snapshots and remain stable while
  read.
- Bounds are 64 KiB for the receipt, 256 KiB for the observation, 64 KiB for
  the selection, and 64 candidates maximum.
- Publication uses a private staging directory, exclusive files, `fsync`, a
  fixed lock, `result.json` last, and one final directory rename.
- Cancellation or failure before commit removes staging and publishes nothing.
- One tool call may run at a time; a concurrent call returns `job_busy` and is
  not queued.

## Protocol Boundary

The newline-delimited UTF-8 JSON-RPC server uses MCP protocol `2025-06-18` with
`initialize`, `notifications/initialized`, `tools/list`, `tools/call`, and
`ping`. Requests are capped at 512 KiB, JSON depth at 64, strings at 64 KiB,
and tool work at 30 seconds. Only active mutating requests honor
`notifications/cancelled`; cancellation after commit is ignored.

There are no resources, prompts, sampling, elicitation, roots, logging,
list-changed notifications, HTTP transport, provider calls, telemetry, cache,
or persistent logs. Standard output contains only MCP messages; startup errors
use fixed redacted standard-error codes.

## Remaining Gate

PR135 may be considered only under a separately approved HIGH-risk contract for
Secure MCP Tunnel and ChatGPT developer-mode validation. It must not widen the
two-tool authority boundary or introduce hosted production claims. Hosted MCP,
OAuth/auth, public access, provider calls, production data, CAD/Figma, package
publication, and public exports remain unapproved.

## Rollback

Remove the dedicated PR134 entrypoint, orchestration module, protocol module,
tests, and documentation. No general MCP inventory, Core schema, package export,
package metadata, dependency, or lockfile rollback is required.
