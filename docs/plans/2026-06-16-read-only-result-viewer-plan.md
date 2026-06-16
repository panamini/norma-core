# Read-Only Result Viewer Plan

## Status

PR56 is docs/contract-tests only.

PR56 is viewer-plan only.

PR56 turns PR55 product requirements into an implementation plan for a future read-only result viewer.

PR56 does not implement UI.

PR56 does not implement runtime behavior.

PR56 does not add routes.

PR56 does not add a public HTTP listener.

PR56 does not add dependencies.

PR56 does not modify package metadata.

PR56 does not modify package exports.

PR56 does not add deployment configuration.

PR56 does not add remote MCP runtime.

PR56 does not expose `norma.replayRun`.

PR56 does not allow `/replay-run`.

PR56 does not change `/replay-mvp-demo` behavior.

PR56 does not start PR57.

Product/UI external official references for PR56: Unknown.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

## Decision

The read-only result viewer plan may be documented in PR56.

The plan converts PR55 requirements into future implementation gates and display requirements.

PR56 approves no implementation.

PR56 does not approve PR57 implementation.

PR57 remains a separate PR and must remain blocked until PR56 is accepted.

Unknown implementation decisions remain blocked.

## Source Documents

- PR55 product requirements: `docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.
- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR48 current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- PR50 API contract decision: `docs/decisions/2026-06-15-api-contract-decision.md`.
- PR51 auth/audit/rate-limit policy: `docs/decisions/2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md`.
- PR52 minimal API server approval decision: `docs/decisions/2026-06-16-minimal-api-server-approval-decision.md`.
- PR53 minimal local in-process API handler skeleton.
- PR54 API contract golden envelopes.

PR50, PR51, PR52, PR53, PR54, and PR55 are source documents for the current viewer plan boundary.

## Current Verified State

PR55 is merged.

PR55 merge commit: `88419aeb843130a68863330a1446a42bc41bdc9b`.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

The current API handler is local in-process only.

No UI implementation exists in PR56.

Current product/UI external official references: Unknown.

The roadmap says the first UI should be a read-only result viewer.

The roadmap says the first input path should be upload of explicit structured JSON only.

The roadmap says the UI must make all diagnostics visible and must not collapse results to a generic boolean.

PR55 requires PR56 to preserve result visibility and source-truth boundaries.

## Viewer Purpose

The future viewer must inspect existing Norma result envelopes.

The future viewer must be read-only.

The future viewer must not execute Norma operations.

The future viewer must not create Norma truth.

The future viewer must not define Norma logic.

The future viewer must help a user inspect why a result is valid, invalid, rejected, failed, stale, mismatched, warning-bearing, or non-replayable.

The future viewer must consume approved Norma result envelopes rather than become a source of Norma decisions.

## Allowed Inputs

The future viewer plan allows only explicit structured JSON upload.

The future viewer plan allows only explicit structured JSON paste.

The future viewer may plan for these explicit structured JSON shapes:

- Norma result envelope;
- API response envelope;
- CLI output envelope;
- MCP tool result envelope.

Every allowed input remains inert data for display and inspection only.

Allowed inputs do not authorize runtime reads, writes, network fetches, shell execution, or source-truth creation.

## Rejected Inputs

The future viewer plan rejects:

- prompt text as source truth;
- artifact-as-source;
- camera input;
- image input;
- vision input;
- native CAD input;
- plugin input;
- marketplace input;
- URL fetch;
- arbitrary local file reads;
- arbitrary replay;
- `norma.replayRun`;
- `/replay-run`;
- user-provided replay inputs for `/replay-mvp-demo`;
- source-truth inference from derived artifacts;
- hidden pack selection;
- hidden tolerance selection;
- intent inference.

Rejected inputs must not be converted into accepted source truth by future implementation.

## Required Displayed Result Sections

A future read-only result viewer must plan visible sections for:

- status;
- diagnostics;
- warnings;
- errors;
- mismatch details;
- provenance;
- source refs;
- output refs;
- artifact freshness;
- operation context;
- pack locks;
- tolerance policy;
- serialization version;
- operation version;
- result identity where applicable.

The future viewer must not make any required section optional when the corresponding data exists in the result envelope.

The future viewer must not replace these sections with a single pass/fail summary.

## Visibility Requirements

The future implementation must preserve diagnostics visibility.

The future implementation must preserve warnings/errors visibility.

The future implementation must preserve mismatch details visibility.

The future implementation must preserve provenance/source refs visibility.

The future implementation must preserve artifact freshness visibility.

The future implementation must preserve operation context visibility.

The future implementation must preserve pack lock and tolerance policy visibility.

The future implementation must preserve serialization version and operation version visibility.

The future implementation must preserve result identity display where applicable.

The future implementation must not hide, mute, downgrade, suppress, group away, summarize away, or boolean-collapse critical warnings, critical errors, diagnostics, mismatches, provenance, source refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, or result identity where applicable.

Critical warnings must remain visible.

Critical errors must remain visible.

Unknown result fields must remain inspectable unless a later compatibility decision explicitly rejects them.

## Source-Truth Boundary

No source-truth inference is approved.

Structured source objects remain the only source truth.

Artifacts remain derived projections, not source truth.

Prompt text is never source truth.

The viewer plan must not create packs.

The viewer plan must not create rules.

The viewer plan must not create ratios.

The viewer plan must not create tolerances.

The viewer plan must not create geometry.

The viewer plan must not infer intent.

The viewer plan must not select hidden packs.

The viewer plan must not select hidden tolerances.

The viewer plan must not perform arbitrary replay.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` remains fixed-demo-only.

## Read-Only Boundary

No UI implementation is approved.

No runtime behavior is approved.

No route is approved.

No public HTTP listener is approved.

No dependency is approved.

No package export is approved.

No package bin entry is approved.

No deployment configuration is approved.

No remote MCP runtime is approved.

No remote MCP tool exposure is approved.

No file read, file write, network fetch, shell execution, or environment-token behavior is approved.

`/replay-mvp-demo` behavior remains unchanged.

The future viewer must remain a read-only consumer of approved result envelopes.

## Future PR57 Implementation Gates

PR57 must be a separate PR.

PR57 remains blocked until PR56 is accepted.

PR57 must be conditional on PR55 and PR56 approval.

PR57 must preserve every PR56 required displayed result section.

PR57 must include tests before UI implementation.

PR57 must verify allowed structured JSON inputs.

PR57 must reject prompt-as-source and artifact-as-source.

PR57 must reject arbitrary replay.

PR57 must keep critical warnings and critical errors visible.

PR57 must not add remote MCP runtime.

PR57 must not expose `norma.replayRun`.

PR57 must not allow `/replay-run`.

PR57 must not change `/replay-mvp-demo` behavior.

PR57 must not add routes, dependencies, package exports, deployment configuration, public HTTP listener, or source-truth inference unless a later explicit approval changes those boundaries.

## Rollback Policy

Revert the PR56 plan document and PR56 contract test.

No runtime rollback should be required.

No UI rollback should be required.

No package rollback should be required.

No deployment rollback should be required.

## Validation Policy

PR56 validation must prove:

- this plan document exists under `docs/plans/` with a date-prefixed filename;
- required headings exist in order;
- PR56 references PR55 and the current roadmap/API source documents;
- PR56 remains docs/contract-tests only;
- PR56 remains viewer-plan only;
- PR56 does not implement UI;
- PR56 does not start PR57;
- allowed inputs are explicit structured JSON upload or paste only;
- rejected inputs include prompt-as-source, artifact-as-source, camera/image/vision, native CAD, plugin, marketplace, URL fetch, arbitrary local file reads, and arbitrary replay;
- required displayed result sections include status, diagnostics, warnings, errors, mismatch details, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, and result identity where applicable;
- critical warnings and critical errors cannot be hidden, muted, downgraded, summarized away, or boolean-collapsed;
- source-truth inference remains blocked;
- runtime behavior, route changes, package changes, dependency changes, deployment, remote MCP runtime, `norma.replayRun`, `/replay-run`, and `/replay-mvp-demo` boundaries remain unchanged.

## Final Decision

PR56 documents the read-only result viewer plan.

PR56 is docs/contract-tests only.

PR56 is viewer-plan only.

PR56 approves no UI implementation.

PR56 approves no runtime behavior.

PR56 approves no route changes.

PR56 approves no dependencies.

PR56 approves no package metadata or package export changes.

PR56 approves no deployment configuration.

PR56 approves no remote MCP runtime.

PR56 does not start PR57.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` remains fixed-demo-only.
