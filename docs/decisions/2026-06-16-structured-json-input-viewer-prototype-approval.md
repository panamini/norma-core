# Structured JSON Input Viewer Prototype Approval

## Status

PR57 is docs/contract-tests only.

PR57 is approval-only.

PR57 does not implement the structured JSON input viewer prototype.

PR57 explicitly records that the original structured JSON viewer prototype implementation remains blocked until this approval lands.

PR57 is re-scoped to approval-only because PR56 approved future PR57 gates but did not approve a concrete implementation location or JSON input limits.

Future numbering after this approval is Unknown until current GitHub history assigns it.

PR57 does not start PR58.

PR57 does not implement UI.

PR57 does not implement runtime behavior.

PR57 does not add routes.

PR57 does not add a public HTTP listener.

PR57 does not add dependencies.

PR57 does not modify package metadata.

PR57 does not modify package scripts.

PR57 does not modify package exports.

PR57 does not add deployment configuration.

PR57 does not add remote MCP runtime.

PR57 does not expose `norma.replayRun`.

PR57 does not allow `/replay-run`.

PR57 does not change `/replay-mvp-demo` behavior.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

## Decision

The structured JSON input viewer prototype boundary may be approved in PR57.

The future prototype may be implemented only as `src/structured-json-input-viewer.ts`.

The future prototype test may be implemented only as `tests/structured-json-input-viewer.test.mjs`.

The future prototype must be pure display-model/parser helper code only.

The future prototype must be dependency-free.

The future prototype must be non-exported.

The future prototype must be package-private.

The future prototype must parse and display inert structured JSON only.

The future prototype must not execute Norma operations.

The future prototype must not define Norma logic.

The future prototype must not create Norma truth.

Unknown implementation decisions remain blocked.

## Source Documents

- PR55 product requirements: `docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.
- PR56 read-only result viewer plan: `docs/plans/2026-06-16-read-only-result-viewer-plan.md`.
- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR48 current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- PR50 API contract decision: `docs/decisions/2026-06-15-api-contract-decision.md`.
- PR52 minimal API server approval decision: `docs/decisions/2026-06-16-minimal-api-server-approval-decision.md`.
- PR53 minimal local in-process API handler skeleton.
- PR54 API contract golden envelopes.

PR55 and PR56 are source documents for the current viewer prototype approval boundary.

## Current Verified State

PR56 is merged.

PR56 merge commit: `71090ad2d0b77d4ed1a89082e174cae74fd65341`.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

The current API handler is local in-process only.

No UI implementation exists in PR57.

No structured JSON input viewer prototype implementation exists in PR57.

Current product/UI external official references: Unknown.

The roadmap says PR57 is the structured JSON input viewer prototype, conditional on PR55 and PR56 approval.

PR57 is approval-only because PR56 did not approve a concrete implementation location or JSON input limits.

## Approved Future Prototype Boundary

The future prototype may add only:

- `src/structured-json-input-viewer.ts`;
- `tests/structured-json-input-viewer.test.mjs`.

The future implementation file must be a pure display-model/parser helper.

The future implementation file must be dependency-free.

The future implementation file must be non-exported.

The future implementation file must be package-private.

The future implementation file must not add or require a package export.

The future implementation file must not add or require a package script.

The future implementation file must not add or require package metadata changes.

The future implementation file must not add dependencies.

The future implementation file must not use DOM APIs.

The future implementation file must not use browser APIs.

The future implementation file must not read files.

The future implementation file must not write files.

The future implementation file must not fetch URLs.

The future implementation file must not use network behavior.

The future implementation file must not use shell execution.

The future implementation file must not read environment variables.

The future implementation file must not add routes.

The future implementation file must not add a listener.

The future implementation file must not add deployment configuration.

The future implementation file must not add remote MCP behavior.

The future implementation file must not execute Norma operations.

The future implementation file must not mutate source data.

The future implementation file must not create source truth.

## Approved Input Shapes

The future prototype may accept only explicit structured JSON paste as inert data.

Browser-local upload remains unapproved until a later explicit UI implementation PR approves a browser-local file selection boundary with tests.

The future prototype may display only these inert structured JSON shapes:

- Norma result envelope;
- API response envelope;
- CLI output envelope;
- exact Norma MCP tool result envelope.

The future prototype must not infer source truth from any accepted input shape.

The future prototype must not treat prompt text as source truth.

The future prototype must not treat artifacts as source truth.

## JSON Input Limits

The future prototype must adopt the existing PR53 JSON limits exactly:

- max body bytes: `65_536`;
- max JSON depth: `32`;
- max array length: `1_024`;
- max string length: `16_384`.

The future prototype must reject JSON input that exceeds these limits.

The future prototype must not create a new unbounded parser path.

## MCP And JSON-RPC Boundary

The future prototype may accept only exact inert Norma MCP tool result envelopes.

The future prototype must reject JSON-RPC requests.

The future prototype must reject JSON-RPC notifications.

The future prototype must reject arbitrary method wrappers.

The future prototype must reject arbitrary tool calls.

The future prototype must reject generic JSON-RPC envelopes.

A JSON-RPC-shaped object is acceptable only if the displayed payload is a known Norma MCP result envelope and no method or call execution path is implied.

## Required Displayed Sections

The future prototype must display, when present:

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
- result identity;
- unknown result fields.

Unknown result fields must remain inspectable.

Unknown result fields must not be discarded.

Unknown result fields must not be hidden.

The future prototype must not replace required sections with a single pass/fail summary.

The future prototype must not treat missing diagnostics as success.

Critical warnings and critical errors must remain visible.

## Rejected Inputs And Behaviors

The future prototype must reject:

- prompt-as-source;
- artifact-as-source;
- source-truth inference;
- arbitrary replay;
- `norma.replayRun`;
- `/replay-run`;
- caller-supplied replay inputs for `/replay-mvp-demo`;
- camera input;
- image input;
- vision input;
- native CAD input;
- plugin input;
- marketplace input;
- URL fetch;
- arbitrary local file reads.

The future prototype must not change `/replay-mvp-demo` behavior.

The future prototype must not hide, mute, downgrade, suppress, group away, summarize away, or boolean-collapse warnings, errors, diagnostics, mismatches, provenance, source refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, or unknown result fields.

## Runtime Package Deployment Boundary

PR57 must add no implementation files.

PR57 must add no UI files.

PR57 must add no route files.

PR57 must add no HTTP runtime files.

PR57 must add no server files.

PR57 must add no listener files.

PR57 must add no remote MCP runtime files.

PR57 must add no deployment files.

PR57 must add no package metadata changes.

PR57 must add no package script changes.

PR57 must add no dependency changes.

PR57 must add no lockfile changes.

PR57 must add no package export changes.

PR57 must not modify root `docs/MCP_REMOTE_*.md` files.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Deployment remains blocked.

## Rollback Policy

Revert this PR57 approval document and PR57 contract test.

No runtime rollback should be required.

No UI rollback should be required.

No package rollback should be required.

No deployment rollback should be required.

## Validation Policy

PR57 validation must prove:

- this approval document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- PR57 is approval-only;
- PR57 does not implement the prototype;
- the original structured JSON viewer prototype implementation remains blocked until this approval lands;
- future numbering after this approval remains Unknown until current GitHub history assigns it;
- PR57 does not start PR58;
- approved future implementation location is exactly `src/structured-json-input-viewer.ts`;
- approved future test location is exactly `tests/structured-json-input-viewer.test.mjs`;
- future code must be pure, dependency-free, non-exported, package-private display-model/parser helper code;
- PR53 JSON limits are adopted exactly;
- only exact inert Norma MCP tool result envelopes may be accepted from MCP-shaped input;
- JSON-RPC requests, notifications, arbitrary method wrappers, arbitrary tool calls, and generic JSON-RPC envelopes are rejected;
- unknown fields remain inspectable, not discarded or hidden;
- prompt-as-source and artifact-as-source remain blocked;
- source-truth inference remains blocked;
- arbitrary replay, `/replay-run`, and `norma.replayRun` remain blocked;
- `/replay-mvp-demo` behavior remains unchanged;
- camera/image/vision/CAD/plugin/marketplace scope remains blocked;
- URL fetch and arbitrary local file reads remain blocked;
- UI, runtime, route, dependency, package, deployment, and remote MCP boundaries remain unchanged.

## Final Decision

PR57 approves only the future structured JSON input viewer prototype boundary.

PR57 is approval-only.

PR57 is docs/contract-tests only.

PR57 does not implement the prototype.

The future prototype may use only `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.

The future prototype must be pure, dependency-free, non-exported, package-private display-model/parser helper code.

The future prototype must adopt the PR53 JSON limits exactly.

The future prototype must preserve unknown fields as inspectable data.

PR57 approves no UI implementation.

PR57 approves no runtime behavior.

PR57 approves no route changes.

PR57 approves no dependencies.

PR57 approves no package metadata, package script, or package export changes.

PR57 approves no deployment configuration.

PR57 approves no remote MCP runtime.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` remains fixed-demo-only.
