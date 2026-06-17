# Privacy Security Support Approval

## Status

PR65 is docs/contract-tests only.

PR65 is approval-only.

PR65 does not implement privacy policy.

PR65 does not implement security policy.

PR65 does not implement support policy.

PR65 does not implement data retention.

PR65 does not create a support channel.

PR65 does not create a live security contact.

PR65 does not promise support response times.

PR65 does not approve beta participant access.

PR65 does not approve user recruitment.

PR65 does not approve collection of real user data.

PR65 does not approve deployment.

PR65 does not approve public API access.

PR65 does not approve remote MCP.

PR65 does not approve public npm publishing.

PR65 does not approve UI implementation.

PR65 approves only future privacy, security, and support policy documentation boundaries.

Privacy/security/support implementation remains blocked.

Current roadmap mentions privacy, security, and support policy, but roadmap scope does not authorize implementation by itself.

## Decision

The future privacy, security, and support policy documentation boundary may be approved in PR65.

Future privacy, security, and support policy content must remain inert documentation unless a later explicit implementation PR approves more.

Future policy documentation may define checklist-style requirements, placeholders marked not implemented, and validation gates for later real policy documents.

Future policy documentation must not mark any privacy, security, support, retention, security-contact, support-channel, response-time, beta-access, deployment, API, remote MCP, package, or UI implementation complete.

Future policy documentation must not approve real user data collection.

Future policy documentation must not launch beta access.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR55 product requirements: `docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.
- PR56 read-only result viewer plan: `docs/plans/2026-06-16-read-only-result-viewer-plan.md`.
- PR57 structured JSON input viewer prototype approval: `docs/decisions/2026-06-16-structured-json-input-viewer-prototype-approval.md`.
- PR58 and PR59 structured JSON input viewer implementation and hardening: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- PR60 verification/replay result viewer prototype approval: `docs/decisions/2026-06-17-verification-replay-result-viewer-prototype-approval.md`.
- PR61 verification/replay result viewer implementation: `src/verification-replay-result-viewer.ts` and `tests/verification-replay-result-viewer.test.mjs`.
- PR62 onboarding and examples approval: `docs/decisions/2026-06-17-onboarding-examples-approval.md`.
- PR63 onboarding and examples documentation: `docs/onboarding/README.md`, `docs/examples/read-only-result-viewer-workflow.md`, `docs/examples/structured-json-input-viewer.md`, and `docs/examples/verification-replay-result-viewer.md`.
- PR64 beta pilot readiness approval: `docs/decisions/2026-06-17-beta-pilot-readiness-approval.md`.
- Remote MCP threat model constraint source: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- Remote MCP security matrix constraint source: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- Remote MCP deployment policy constraint source: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.

PR55-PR64 are source documents for the current privacy/security/support approval boundary.

Existing remote-MCP/API security documents are constraint sources only.

Existing remote-MCP/API security documents are not completed general security, privacy, or support policies.

## Current Verified State

PR64 is merged.

PR64 merge commit: `1ef7023c283d1671df54dd9fad3f6bbc449116e7`.

PR64 says a future beta cannot begin until later approvals define or confirm support policy, privacy policy, security policy, permitted data classification, incident and stop process, validation gates, and owner for triage and response.

PR64 does not mark any prerequisite complete.

No general privacy policy is approved.

No general security policy is approved.

No support policy is approved.

No permitted real-user-data classification is approved.

No incident and stop process is implemented.

No owner for triage and response is assigned.

Existing remote-MCP/API security documents are constraint sources only.

Existing remote-MCP/API security documents are not completed general security, privacy, or support policies.

Current external official references for PR65: Unknown.

Real user data collection remains blocked.

Beta participant access remains blocked.

Deployment remains blocked.

Public API access remains blocked.

Remote MCP remains blocked.

Package publishing remains blocked.

UI implementation remains blocked.

## Future Privacy Policy Boundary

Future privacy policy documentation may define checklist-style requirements for permitted and blocked data categories.

Future privacy policy documentation may define privacy review checklist placeholders marked not implemented.

Future privacy policy documentation may define retention requirements.

Future privacy policy documentation may define deletion requirements.

Future privacy policy documentation may define consent, notice, access, deletion, and escalation questions that must be answered before beta participant access.

Future privacy policy documentation must state that real user data remains blocked until a later explicit approval changes the boundary.

No collection of real user data is approved by PR65.

No privacy policy runtime, storage, logging, telemetry, deletion, redaction, consent, or user-data handling implementation is approved by PR65.

## Future Security Policy Boundary

Future security policy documentation may define a security review checklist.

Future security policy documentation may define a vulnerability/security contact placeholder marked not implemented.

Future security policy documentation may define minimum review requirements for any later public API, remote MCP, deployment, package publishing, or real-user-data workflow.

Future security policy documentation must preserve the existing source-truth, package-private-helper, API/MCP, and remote-MCP constraints from PR55-PR64.

No live security contact is created by PR65.

No auth, logging, redaction, telemetry, retention, deployment, API, or remote MCP runtime is approved by PR65.

## Future Support Policy Boundary

Future support policy documentation may define a support owner placeholder marked not implemented.

Future support policy documentation may define support response expectations placeholder marked not implemented.

Future support policy documentation may define triage categories for errors, warnings, privacy concerns, security concerns, source-truth boundary violations, blocked user-data requests, and beta stop criteria.

Future support policy documentation may define escalation requirements before beta participant access.

No support channel is created by PR65.

No support response times are promised by PR65.

No user, participant, or customer support workflow is implemented by PR65.

## Permitted Data Classification Boundary

Future policy documentation may classify only inert, non-sensitive planning and documentation data as permitted before a later explicit approval.

Permitted examples may include synthetic examples, inert existing Norma result envelopes, public documentation snippets, and repository documentation that is already committed.

Real user data remains blocked.

Secrets, tokens, credentials, personal data, customer data, production data, and confidential source files remain blocked.

Prompt text remains blocked as source truth.

Artifacts remain blocked as source truth.

Missing source refs, replay outputs, helper output, visual data, and displayability remain blocked as source truth.

## Incident And Stop Process Boundary

Future policy documentation may define incident and stop criteria placeholder marked not implemented.

Future incident and stop criteria may cover source-truth boundary violations, privacy concerns, security concerns, hidden runtime surfaces, package/export drift, deployment drift, remote MCP drift, public API drift, support-path gaps, and unauthorized beta claims.

Future beta work must stop if real user data collection begins without approval.

Future beta work must stop if beta participant access begins without support, privacy, security, data-classification, incident, validation, and triage-owner approvals.

Future beta work must stop if a forbidden runtime, UI, API, MCP, deployment, package, public npm, or remote MCP surface is introduced without approval.

## Triage Ownership Boundary

Future policy documentation may define a triage owner placeholder marked not implemented.

Owner for response is not assigned by PR65.

A future policy PR must name an owner before beta participant access.

A future policy PR must define a response path before beta participant access.

A future policy PR must define escalation and stop authority before beta participant access.

## Validation Gates

PR65 validation must prove:

- approval document exists;
- focused contract test passes;
- full test suite passes;
- build passes;
- check passes;
- diff check passes;
- changed-file scope check passes;
- guardrail greps are reviewed;
- privacy/security/support policy implementation remains blocked;
- real user data collection remains blocked;
- beta participant access remains blocked;
- deployment, public API, remote MCP, public npm, UI, runtime, package, onboarding, and example surfaces remain unchanged.

Future real privacy, security, or support policy work must have its own approval, contract tests, exact owner and response boundaries where applicable, and separate implementation approval when implementation is needed.

## Rejected Claims And Activities

Future privacy/security/support policy documentation must reject these claims and activities:

- privacy policy is complete;
- security policy is complete;
- support policy is complete;
- security contact is live;
- support response times are promised;
- data retention is implemented;
- users may upload real data;
- user data collection is approved;
- beta participant access is approved;
- beta is launched;
- public beta is open;
- user recruitment;
- public npm is ready;
- deployment is approved;
- remote MCP is approved;
- public API is approved;
- UI is implemented;
- support channel is live;
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

Rejected claims remain blocked until a later explicit approval changes the boundary.

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

## Rollback And Stop Criteria

Rollback for PR65 is to revert this PR65 approval document and revert the PR65 contract test.

Rollback also includes reverting any narrow stale guard repair made only to allow current full-test validation.

No runtime rollback should be required.

No UI rollback should be required.

No package rollback should be required.

No deployment rollback should be required.

Future policy work must stop if it claims real user data collection, beta access, deployment, public API, remote MCP, public npm, UI, runtime, package, onboarding, or example implementation without a later explicit approval.

## Validation Policy

PR65 validation must prove:

- this approval document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- PR65 is approval-only;
- PR65 does not implement privacy policy, security policy, or support policy;
- PR65 does not mark privacy, security, support, data retention, security contact, support response times, beta access, real user data collection, deployment, public API, remote MCP, public npm, UI, runtime, or package work complete;
- PR65 references PR64 beta blockers and PR55-PR64 constraints;
- existing remote-MCP/API security documents are treated as constraint sources only, not completed general security, privacy, or support policies;
- PR65 defines future privacy boundary, security boundary, support boundary, data classification boundary, incident/stop boundary, triage ownership boundary, validation gates, rollback, and stop criteria;
- `src/**` remains unchanged;
- `package.json`, `package-lock.json`, `src/index.ts`, `tsconfig.json`, and `README.md` remain unchanged;
- root `docs/MCP_REMOTE_*.md` files remain unchanged;
- `docs/onboarding/**`, `docs/examples/**`, `examples/**`, `bin/**`, and `dist/**` remain unchanged;
- any changed-file guard repair is narrowly scoped and preserves forbidden-surface protections.

## Final Decision

PR65 approves only future privacy, security, and support policy documentation boundaries.

PR65 is approval-only.

PR65 is docs/contract-tests only.

PR65 does not implement privacy policy.

PR65 does not implement security policy.

PR65 does not implement support policy.

PR65 does not implement retention.

PR65 does not create a live security contact.

PR65 does not create a support channel.

PR65 does not promise support response times.

PR65 does not approve beta participant access.

PR65 does not approve user recruitment.

PR65 does not approve collection of real user data.

PR65 does not approve deployment.

PR65 does not approve public API access.

PR65 does not approve remote MCP.

PR65 does not approve public npm publishing.

PR65 does not approve UI implementation.

Privacy/security/support implementation remains blocked until a later explicit implementation approval changes the boundary.

Real user data collection remains blocked.

Beta participant access remains blocked.

Package publishing remains blocked.

Deployment remains blocked.

Remote MCP remains blocked.

Public API access remains blocked.

UI implementation remains blocked.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` behavior remains unchanged.
