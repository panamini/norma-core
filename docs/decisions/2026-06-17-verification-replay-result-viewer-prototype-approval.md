# Verification Replay Result Viewer Prototype Approval

## Status

PR60 is docs/contract-tests only.

PR60 is approval-only.

PR60 does not implement the verification/replay result viewer prototype.

A future verification/replay result viewer prototype remains blocked until this approval lands.

PR60 approves only a future package-private, dependency-free, inert display-model helper.

PR60 does not implement UI.

PR60 does not add UI paths.

PR60 does not add Browser/DOM UI.

PR60 does not implement runtime behavior.

PR60 does not add routes.

PR60 does not add HTTP/server/listener behavior.

PR60 does not add dependencies.

PR60 does not modify package metadata.

PR60 does not modify package scripts.

PR60 does not modify package exports.

PR60 does not add deployment configuration.

PR60 does not add remote MCP behavior.

PR60 does not expose `norma.replayRun`.

PR60 does not allow `/replay-run`.

PR60 does not change `/replay-mvp-demo` behavior.

UI paths remain unapproved.

Browser/DOM UI remains unapproved.

Package exports remain unapproved.

Runtime/API/MCP/deployment changes remain unapproved.

## Decision

The future verification/replay result viewer prototype boundary may be approved in PR60.

The recommended future implementation location is:

- `src/verification-replay-result-viewer.ts`;
- `tests/verification-replay-result-viewer.test.mjs`.

The future prototype must be package-private.

The future prototype must be dependency-free.

The future prototype must be inert display-model code only.

The future prototype must inspect already accepted result data only.

The future prototype must not execute Norma operations.

The future prototype must not create Norma truth.

The future prototype must not infer source truth.

Unknown implementation decisions remain blocked.

## Source Documents

- PR55 product requirements: `docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.
- PR56 read-only result viewer plan: `docs/plans/2026-06-16-read-only-result-viewer-plan.md`.
- PR57 structured JSON input viewer prototype approval: `docs/decisions/2026-06-16-structured-json-input-viewer-prototype-approval.md`.
- PR58 structured JSON input viewer implementation: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- PR59 structured JSON input viewer hardening: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- Current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- API contract boundary: `docs/decisions/2026-06-15-api-contract-decision.md`.
- Current local in-process API handler: `src/api/minimal-api-server.ts`.

PR55 through PR59 are source documents for the current verification/replay result viewer approval boundary.

## Current Verified State

PR59 is merged.

PR59 merge commit: `4be166991368792e070143184958505ba5f81bdd`.

PR58 and PR59 implemented only a package-private structured JSON input viewer helper.

The current structured JSON input viewer helper is `src/structured-json-input-viewer.ts`.

The current structured JSON input viewer test is `tests/structured-json-input-viewer.test.mjs`.

No verification/replay result viewer prototype implementation exists in PR60.

No UI implementation exists in PR60.

No UI/app/viewer path is approved by PR60.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

Package publishing remains blocked.

Deployment remains blocked.

Current product/UI external official references for PR60: Unknown.

## Approved Future Prototype Boundary

The future prototype may use only these future files:

- `src/verification-replay-result-viewer.ts`;
- `tests/verification-replay-result-viewer.test.mjs`.

The future prototype must be package-private.

The future prototype must be dependency-free.

The future prototype must add no package export.

The future prototype must add no package script.

The future prototype must make no package metadata change.

The future prototype must add no runtime route.

The future prototype must add no HTTP/server/listener behavior.

The future prototype must use no DOM/browser APIs.

The future prototype must perform no file reads/writes.

The future prototype must perform no network behavior.

The future prototype must perform no shell/env access.

The future prototype must add no remote MCP behavior.

The future prototype must perform no Norma operation execution.

The future prototype must perform no source-truth creation.

The future prototype must be inert display-model code only.

UI paths remain unapproved.

Browser/DOM UI remains unapproved.

Runtime/API/MCP/deployment changes remain unapproved.

## Approved Future Inputs

The future prototype may accept only inert data that already passed the structured JSON input boundary.

Approved future inputs are:

- existing inert structured JSON display models;
- accepted Norma result envelopes containing `run-verification`;
- accepted Norma result envelopes containing `run-replay`;
- accepted Norma result envelopes containing `artifact-freshness-verification`;
- accepted Norma result envelopes containing `mvp-demo-result`;
- approved MCP/API/CLI envelopes carrying those results.

Approved future inputs remain display data only.

Approved future inputs do not authorize source-truth inference, operation execution, replay execution, file access, network access, shell access, environment access, or runtime behavior.

## Rejected Future Inputs And Behaviors

The future prototype must reject:

- prompt-as-source;
- artifact-as-source;
- source-truth inference;
- arbitrary replay;
- `norma.replayRun`;
- `/replay-run`;
- caller-supplied replay inputs for `/replay-mvp-demo`;
- camera/image/vision/CAD/plugin/marketplace;
- URL fetch;
- arbitrary local file reads;
- runtime execution requests.

The future prototype must not expose `norma.replayRun`.

The future prototype must not allow `/replay-run`.

The future prototype must not change `/replay-mvp-demo` behavior.

The future prototype must not infer source truth from prompt text, artifacts, derived outputs, missing source refs, replay results, or visual data.

## Required Future Visibility

The future prototype must keep visible, when present:

- status;
- diagnostics;
- warnings;
- errors;
- mismatches;
- provenance;
- source refs;
- output refs;
- artifact freshness;
- operation context;
- pack locks;
- tolerance policy;
- serialization version;
- operation version;
- result identity;
- unknown fields.

These sections must not be hidden.

These sections must not be collapsed to a generic boolean.

Warnings, errors, diagnostics, mismatches, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, and unknown fields must not be muted, downgraded, discarded, summarized away, or grouped away.

Critical warnings and critical errors must remain visible.

Unknown fields must remain inspectable unless a later compatibility decision explicitly rejects them.

## Runtime Package Deployment Boundary

PR60 must add no implementation files.

PR60 must add no UI files.

PR60 must add no app files.

PR60 must add no viewer files.

PR60 must add no route files.

PR60 must add no HTTP runtime files.

PR60 must add no server files.

PR60 must add no listener files.

PR60 must add no API runtime files.

PR60 must add no MCP runtime files.

PR60 must add no bin files.

PR60 must add no deployment files.

PR60 must add no package metadata changes.

PR60 must add no package script changes.

PR60 must add no dependency changes.

PR60 must add no lockfile changes.

PR60 must add no package export changes.

PR60 must not modify `src/index.ts`.

PR60 must not modify root `docs/MCP_REMOTE_*.md` files.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Deployment remains blocked.

Package publishing remains blocked.

## Rollback Policy

Revert this PR60 approval document and PR60 contract test.

No runtime rollback should be required.

No UI rollback should be required.

No package rollback should be required.

No deployment rollback should be required.

## Validation Policy

PR60 validation must prove:

- this approval document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- PR60 is approval-only;
- PR60 does not implement the prototype;
- future file scope is exactly `src/verification-replay-result-viewer.ts` and `tests/verification-replay-result-viewer.test.mjs`;
- no implementation files are added in PR60;
- no UI/app/viewer/server/http/bin/deployment/package files are changed;
- source-truth inference remains blocked;
- `norma.replayRun` remains blocked;
- `/replay-run` remains blocked;
- runtime surfaces remain blocked;
- required visibility remains mandatory;
- package root export remains unchanged;
- root `docs/MCP_REMOTE_*.md` files remain unchanged.

## Final Decision

PR60 approves only the future verification/replay result viewer prototype boundary.

PR60 is approval-only.

PR60 is docs/contract-tests only.

PR60 does not implement the prototype.

The future prototype may use only `src/verification-replay-result-viewer.ts` and `tests/verification-replay-result-viewer.test.mjs`.

The future prototype must be package-private, dependency-free, and inert display-model code only.

The future prototype must preserve required result visibility.

The future prototype must not infer source truth.

PR60 approves no UI implementation.

PR60 approves no Browser/DOM UI.

PR60 approves no runtime behavior.

PR60 approves no route changes.

PR60 approves no HTTP/server/listener behavior.

PR60 approves no dependencies.

PR60 approves no package metadata, package script, or package export changes.

PR60 approves no deployment configuration.

PR60 approves no remote MCP behavior.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` remains fixed-demo-only.
