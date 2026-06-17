# Beta Pilot Readiness Approval

## Status

PR64 is docs/contract-tests only.

PR64 is approval-only.

PR64 does not implement beta pilot behavior.

PR64 does not launch a beta pilot.

PR64 does not approve public beta access.

PR64 does not approve user recruitment.

PR64 does not approve deployment.

PR64 does not approve public npm publishing.

PR64 does not approve remote MCP.

PR64 does not approve public API access.

PR64 does not approve UI implementation.

PR64 does not approve collection of real user data.

PR64 approves only a future beta pilot readiness boundary.

Current roadmap mentions beta pilot readiness, but roadmap scope does not authorize implementation by itself.

Beta pilot implementation remains blocked.

Unknown implementation decisions remain blocked.

## Decision

The future beta pilot readiness boundary may be approved in PR64.

Future beta pilot readiness may define checklist-style readiness criteria for a later constrained pilot.

Future beta pilot readiness may describe only the current inert read-only/result-viewer workflow.

Future beta pilot readiness must remain approval and planning documentation unless a later explicit implementation PR approves more.

Future beta pilot readiness must not launch beta access.

Future beta pilot readiness must not recruit users.

Future beta pilot readiness must not collect real user data.

Future beta pilot readiness must not deploy, publish, expose remote MCP, expose public API, or implement UI.

Future beta pilot readiness must not create Norma truth.

Future beta pilot readiness must not infer source truth.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR55 product requirements: `docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.
- PR56 read-only result viewer plan: `docs/plans/2026-06-16-read-only-result-viewer-plan.md`.
- PR57 structured JSON input viewer prototype approval: `docs/decisions/2026-06-16-structured-json-input-viewer-prototype-approval.md`.
- PR58 structured JSON input viewer implementation: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- PR59 structured JSON input viewer hardening: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- PR60 verification/replay result viewer prototype approval: `docs/decisions/2026-06-17-verification-replay-result-viewer-prototype-approval.md`.
- PR61 verification/replay result viewer implementation: `src/verification-replay-result-viewer.ts` and `tests/verification-replay-result-viewer.test.mjs`.
- PR62 onboarding and examples approval: `docs/decisions/2026-06-17-onboarding-examples-approval.md`.
- PR63 onboarding and examples documentation: `docs/onboarding/README.md`, `docs/examples/read-only-result-viewer-workflow.md`, `docs/examples/structured-json-input-viewer.md`, and `docs/examples/verification-replay-result-viewer.md`.

PR55-PR63 are source documents for the current beta pilot readiness boundary.

## Current Verified State

PR63 is merged.

PR63 merge commit: `55d9d96fdb74b9d30444e154c3841d529780c953`.

The current supported documentation workflow is inert read-only/result-viewer inspection of existing Norma result envelopes.

The current structured JSON input viewer helper is `src/structured-json-input-viewer.ts`.

The current verification/replay result viewer helper is `src/verification-replay-result-viewer.ts`.

Both helpers are package-private.

Both helpers are inert display-model helper code.

Package exports remain unchanged.

No beta pilot checklist exists before PR64.

No beta pilot launch exists in PR64.

No UI/app/viewer route is approved by PR64.

Remote MCP remains blocked.

Package publishing remains blocked.

Deployment remains blocked.

Public API access remains blocked.

Real user data collection remains blocked.

Current beta pilot external official references for PR64: Unknown.

## Supported Beta Pilot Workflow

The future beta pilot readiness boundary may describe only inspection of existing Norma result envelopes through the read-only/result-viewer workflow.

The supported input remains explicit structured JSON data that already represents a Norma result, response envelope, command envelope, or approved tool result envelope.

The workflow remains inert documentation and display inspection.

The workflow must preserve warnings, errors, diagnostics, mismatches, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, and unknown fields when present.

The package-private helpers are not public API.

Displayability is not source-truth validation.

Artifacts, prompt text, missing source refs, replay outputs, visual data, and helper output are not source truth.

## Prerequisites Before Any Beta

Before any actual beta pilot, an explicit later approval must define or confirm:

- support policy;
- privacy policy;
- security policy;
- pricing/package/public npm decision;
- launch checklist;
- beta participant boundary;
- permitted data classification;
- incident and stop process;
- validation gates;
- owner for triage and response.

PR64 does not mark any prerequisite complete.

PR64 records the prerequisites so a later PR can decide whether beta implementation is allowed.

## Allowed Pilot Artifacts

Future beta pilot readiness content may include:

- checklist-style readiness criteria;
- inert descriptions of the current read-only/result-viewer workflow;
- validation evidence requirements;
- known limitations;
- support process placeholders marked not implemented;
- rollback notes;
- stop criteria;
- references to PR55-PR63 constraints.

Allowed pilot artifacts must remain documentation and approval artifacts only.

Allowed pilot artifacts must not become runtime behavior, public API, remote MCP behavior, package exports, deployment configuration, UI implementation, onboarding implementation, executable examples, or launch claims.

## Blocked Pilot Activities

Future beta pilot readiness must reject these claims and activities:

- beta is launched;
- public beta is open;
- user recruitment;
- users may upload real data;
- public npm is ready;
- deployment is approved;
- remote MCP is approved;
- API is public;
- UI is implemented;
- support/privacy/security policy is complete;
- pricing/package decision is complete;
- source truth can be inferred;
- artifacts can be source truth;
- prompt text can be source truth;
- arbitrary replay is allowed;
- `norma.replayRun`;
- `/replay-run`;
- `/replay-mvp-demo` behavior changes;
- camera/image/vision/CAD/plugin/marketplace;
- beauty score;
- creative recommendation;
- intent inference.

Blocked activities remain blocked until a later explicit approval changes the boundary.

## Support Expectations

Support expectations for a future beta are not implemented in PR64.

A future beta must have a documented owner before any participant access begins.

A future beta must have a response path for support requests before any participant access begins.

A future beta must have triage criteria for errors, warnings, privacy concerns, security concerns, source-truth boundary violations, and stop criteria before any participant access begins.

PR64 does not create support channels.

PR64 does not promise response times.

PR64 does not mark support policy complete.

## Known Limitations

Known limitations for PR64 are:

- no source-truth inference;
- no public launch;
- no public npm publishing;
- no deployment;
- no remote MCP;
- no runtime/API/UI expansion;
- no collection of real user data;
- no executable examples;
- no user recruitment;
- no support/privacy/security policy completion;
- no pricing/package/public npm completion.

These limitations are intentional beta blockers, not implementation gaps inside PR64.

## Validation Gates

PR64 validation should include:

- build;
- focused contract test;
- full test suite;
- check;
- diff check;
- changed-file scope check;
- guardrail greps for public beta, public npm, deployment, remote MCP, public API, real user data, replay, media/CAD/plugin/marketplace, source-truth inference, and executable behavior.

Future beta implementation must remain blocked unless a later PR passes its own validation gates and explicitly approves implementation.

## Rollback And Stop Criteria

Rollback for PR64 is to revert this PR64 approval document and revert the PR64 contract test.

Rollback also includes reverting any narrow stale guard repair made only to allow current full-test validation.

No runtime rollback should be required.

No UI rollback should be required.

No package rollback should be required.

No deployment rollback should be required.

A future beta must stop if source-truth boundary rules are violated.

A future beta must stop if a forbidden surface is introduced without approval.

A future beta must stop if real user data collection begins without the required privacy, security, and support approvals.

## Runtime Package Deployment Boundary

No `src/**` changes are approved.

No `src/index.ts` change is approved.

No package metadata, lockfile, export, dependency, or script change is approved.

No UI/app/viewer/server/http/route path is approved.

No API/MCP runtime behavior is approved.

No deployment configuration is approved.

No remote MCP behavior is approved.

No `docs/MCP_REMOTE_*.md` change is approved.

No `docs/onboarding/**` change is approved.

No `docs/examples/**` change is approved.

No `examples/**` change is approved.

No `bin/**` change is approved.

No `dist/**` change is approved.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` behavior remains unchanged.

Package publishing remains blocked.

Deployment remains blocked.

Remote MCP remains blocked.

Public API access remains blocked.

UI implementation remains blocked.

## Validation Policy

PR64 validation must prove:

- this approval document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- PR64 is approval-only;
- PR64 does not implement beta pilot behavior;
- PR64 does not launch a beta pilot;
- PR64 does not approve public beta access, user recruitment, deployment, public npm publishing, remote MCP, public API access, UI implementation, or real user data collection;
- PR64 references the current read-only/result-viewer workflow and PR55-PR63 constraints;
- PR64 defines prerequisites before any beta;
- PR64 defines allowed pilot artifacts;
- PR64 defines blocked pilot activities;
- PR64 defines support expectations;
- PR64 defines known limitations;
- PR64 defines validation gates;
- PR64 defines rollback and stop criteria;
- `src/**` remains unchanged;
- `package.json`, `package-lock.json`, `src/index.ts`, `tsconfig.json`, and `README.md` remain unchanged;
- root `docs/MCP_REMOTE_*.md` files remain unchanged;
- `docs/onboarding/**`, `docs/examples/**`, `examples/**`, `bin/**`, and `dist/**` remain unchanged;
- any changed-file guard repair is narrowly scoped and preserves forbidden-surface protections.

## Final Decision

PR64 approves only the future beta pilot readiness boundary.

PR64 is approval-only.

PR64 is docs/contract-tests only.

PR64 does not implement beta pilot behavior.

PR64 does not launch a beta pilot.

PR64 does not approve public beta access.

PR64 does not approve user recruitment.

PR64 does not approve deployment.

PR64 does not approve public npm publishing.

PR64 does not approve remote MCP.

PR64 does not approve public API access.

PR64 does not approve UI implementation.

PR64 does not approve collection of real user data.

Future beta pilot readiness remains documentation-only until a later explicit implementation approval changes the boundary.

Package publishing remains blocked.

Deployment remains blocked.

Remote MCP remains blocked.

Public API access remains blocked.

UI implementation remains blocked.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` behavior remains unchanged.
