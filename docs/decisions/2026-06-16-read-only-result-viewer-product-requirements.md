# Read-Only Result Viewer Product Requirements

## Status

PR55 is docs/contract-tests only.

PR55 is product-requirements only.

PR55 defines product requirements for a future read-only result viewer.

PR55 does not implement UI.

PR55 does not implement runtime behavior.

PR55 does not add routes.

PR55 does not add dependencies.

PR55 does not modify package metadata.

PR55 does not modify package exports.

PR55 does not add deployment configuration.

PR55 does not add remote MCP runtime.

PR55 does not expose `norma.replayRun`.

PR55 does not allow `/replay-run`.

PR55 does not change `/replay-mvp-demo` behavior.

Product/UI external official references for PR55: Unknown.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

## Decision

Product requirements may be documented in PR55.

The first user-facing product surface must be a read-only result viewer.

The read-only result viewer must preserve Norma's source-truth and result-envelope discipline.

The viewer must make result state inspectable without creating Norma truth, hiding diagnostics, or changing runtime behavior.

PR55 approves no implementation.

PR55 does not approve PR56 implementation.

PR56 remains a separate read-only result viewer plan.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR48 current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- PR50 API contract decision: `docs/decisions/2026-06-15-api-contract-decision.md`.
- PR51 auth/audit/rate-limit policy: `docs/decisions/2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md`.
- PR52 minimal API server approval decision: `docs/decisions/2026-06-16-minimal-api-server-approval-decision.md`.
- PR53 minimal local in-process API handler skeleton.
- PR54 API contract golden envelopes.

PR48, PR50, PR51, PR52, PR53, and PR54 are source documents for the current product requirements boundary.

## Current Verified State

PR54 is merged.

Merge commit: `979a514bcb5d21f0f16582c294539fc9aa075d8d`.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

The current API handler is local in-process only.

No UI implementation exists in PR55.

Current product/UI external official references: Unknown.

The roadmap says product requirements must come before UI.

The roadmap says the first UI should be a read-only result viewer.

The roadmap says the first input path should be upload of explicit structured JSON only.

The roadmap says the UI must make all diagnostics visible and must not collapse results to a generic boolean.

## Product Requirements

The first user-facing product surface must be a read-only result viewer.

The first supported input path must be explicit structured JSON upload or paste.

The viewer must inspect existing Norma result envelopes only.

The viewer must not execute Norma operations.

The viewer must not mutate source data.

The viewer must not create source truth.

The viewer must not collapse results to a generic boolean.

The viewer must expose enough structure for a user or reviewer to understand why a result is valid, invalid, stale, mismatched, non-replayable, rejected, or warning-bearing.

PR55 approves no UI implementation.

## Required Result Visibility

A future read-only result viewer must preserve and make visible:

- diagnostics;
- provenance;
- source refs;
- output refs;
- warnings;
- errors;
- mismatch details;
- artifact freshness;
- operation context;
- pack locks;
- tolerance policy;
- serialization version;
- operation version;
- result identity where applicable.

Critical warnings and critical errors must stay visible.

The viewer must not hide, mute, downgrade, suppress, group away, or summarize away critical warnings or critical errors.

The viewer must not convert warnings, errors, or mismatches into a pass/fail badge only.

The viewer must not treat missing diagnostics as success.

The viewer must preserve unknown result fields unless a later compatibility decision explicitly rejects them.

## Source-Truth Boundary

No source-truth inference is approved.

Structured source objects remain the only source truth.

Artifacts remain derived projections, not source truth.

Prompt text is never source truth.

The viewer must not create packs.

The viewer must not create rules.

The viewer must not create ratios.

The viewer must not create tolerances.

The viewer must not create geometry.

The viewer must not infer intent.

The viewer must not select hidden packs.

The viewer must not select hidden tolerances.

The viewer must not perform arbitrary replay.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` remains fixed-demo-only.

## Read-Only Boundary

No runtime behavior is approved.

No API route is approved.

No UI implementation is approved.

No package export is approved.

No dependency is approved.

No deployment configuration is approved.

No remote MCP runtime is approved.

No file read, file write, network fetch, shell execution, or environment-token behavior is approved.

The future viewer must be a consumer of approved Norma result envelopes, not an owner of Norma logic.

## Input Requirements

The first supported input path must be explicit structured JSON upload or paste.

The future viewer must not accept camera input as source truth.

The future viewer must not accept image or vision input as source truth.

The future viewer must not accept prompt text as source truth.

The future viewer must not accept artifacts as source truth.

The future viewer must not fetch URLs.

The future viewer must not read arbitrary local files through runtime behavior unless a later explicit UI implementation PR approves a browser-local file selection boundary with tests.

## Non-Goals

PR55 does not approve:

- UI implementation;
- runtime behavior;
- route changes;
- dependencies;
- package exports;
- deployment config;
- remote MCP runtime;
- API server changes;
- package publishing;
- camera/image/vision;
- native CAD integration;
- beauty score;
- creative recommendation;
- intent inference;
- prompt-as-source;
- artifact-as-source;
- arbitrary replay;
- `norma.replayRun` exposure;
- `/replay-run`;
- changes to `/replay-mvp-demo` behavior.

## Future PR56 Plan Requirements

PR56 must be a separate PR.

PR56 must remain a read-only result viewer plan.

PR56 must not implement UI unless a later explicit PR approves implementation.

PR56 must preserve the PR55 result visibility requirements.

PR56 must preserve the source-truth boundary.

PR56 must include acceptance criteria for showing diagnostics, warnings, errors, mismatch details, provenance, source refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, and result identity where applicable.

PR56 must keep runtime, package, dependency, deployment, and remote MCP changes blocked unless a later explicit approval changes those boundaries.

## Validation Policy

PR55 validation must prove:

- this decision document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- source documents are referenced;
- PR55 remains docs/contract-tests only;
- PR55 approves product requirements only;
- result visibility requirements preserve diagnostics, provenance, source refs, warnings, errors, mismatch details, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, and result identity where applicable;
- critical warnings and critical errors cannot be hidden, muted, downgraded, or collapsed to a boolean;
- source-truth inference remains blocked;
- prompt-as-source and artifact-as-source remain blocked;
- UI implementation remains blocked;
- runtime behavior remains blocked;
- package metadata, package exports, dependencies, lockfile, deployment, remote MCP runtime, `norma.replayRun`, `/replay-run`, and `/replay-mvp-demo` boundaries remain unchanged.

## Final Decision

PR55 documents product requirements for a future read-only result viewer.

PR55 is docs/contract-tests only.

PR55 approves no UI implementation.

PR55 approves no runtime behavior.

PR55 approves no route changes.

PR55 approves no dependencies.

PR55 approves no package metadata or package export changes.

PR55 approves no deployment configuration.

PR55 approves no remote MCP runtime.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` remains fixed-demo-only.
