# Onboarding And Examples Approval

## Status

PR62 is docs/contract-tests only.

PR62 is approval-only.

PR62 does not implement onboarding docs.

PR62 does not implement examples.

PR62 does not create `docs/onboarding/`.

PR62 does not create `docs/examples/`.

PR62 approves only future inert documentation paths.

Current roadmap mentions onboarding/examples, but roadmap scope does not authorize implementation by itself.

PR55-PR61 approve requirements, plans, and package-private inert helpers only.

PR62 does not implement UI.

PR62 does not implement runtime behavior.

PR62 does not add routes.

PR62 does not add API/MCP behavior.

PR62 does not add dependencies.

PR62 does not modify package metadata.

PR62 does not modify package scripts.

PR62 does not modify package exports.

PR62 does not add deployment configuration.

PR62 does not add remote MCP behavior.

PR62 does not publish.

## Decision

The future onboarding and examples boundary may be approved in PR62.

Future onboarding and examples remain blocked until this approval lands.

Future onboarding and examples may document only the current read-only/result-viewer workflow.

Future onboarding and examples must remain inert documentation unless a later explicit implementation PR approves more.

Future onboarding and examples must not execute Norma operations.

Future onboarding and examples must not create Norma truth.

Future onboarding and examples must not infer source truth.

Future onboarding and examples must not present package-private helpers as public API.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR55 product requirements: `docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md`.
- PR56 read-only result viewer plan: `docs/plans/2026-06-16-read-only-result-viewer-plan.md`.
- PR57 structured JSON input viewer prototype approval: `docs/decisions/2026-06-16-structured-json-input-viewer-prototype-approval.md`.
- PR58 structured JSON input viewer implementation: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- PR59 structured JSON input viewer hardening: `src/structured-json-input-viewer.ts` and `tests/structured-json-input-viewer.test.mjs`.
- PR60 verification/replay result viewer prototype approval: `docs/decisions/2026-06-17-verification-replay-result-viewer-prototype-approval.md`.
- PR61 verification/replay result viewer implementation: `src/verification-replay-result-viewer.ts` and `tests/verification-replay-result-viewer.test.mjs`.

PR55 through PR61 are source documents for the current onboarding and examples approval boundary.

## Current Verified State

PR61 is merged.

PR61 merge commit: `7f76cc9f2a52794db43fa0cc8f1fd46ffbca4245`.

The current structured JSON input viewer helper is `src/structured-json-input-viewer.ts`.

The current verification/replay result viewer helper is `src/verification-replay-result-viewer.ts`.

Both helpers are package-private.

Both helpers are inert display-model helper code.

Package exports remain unchanged.

No UI/app/viewer path is approved by PR62.

No onboarding docs exist in PR62.

No example docs exist in PR62.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

Package publishing remains blocked.

Deployment remains blocked.

Current product/UI external official references for PR62: Unknown.

## Approved Future Documentation Paths

- `docs/onboarding/README.md`
- `docs/examples/read-only-result-viewer-workflow.md`
- `docs/examples/structured-json-input-viewer.md`
- `docs/examples/verification-replay-result-viewer.md`

## Approved Future Documentation Content

Future onboarding and examples may contain a high-level current workflow description.

Future onboarding and examples may contain inert structured JSON snippets only.

Future onboarding and examples may describe rejected inputs and non-goals.

Future onboarding and examples must include a package-private helper warning.

Future onboarding and examples must state that displayability is not source-truth validation.

Future onboarding and examples must preserve PR55-PR61 constraints.

Future onboarding and examples may document that these result details must remain visible when present:

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

Future onboarding and examples must not collapse those result details to a generic boolean.

Future onboarding and examples must not hide, mute, downgrade, suppress, group away, summarize away, or discard warnings, errors, diagnostics, mismatches, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, or unknown fields.

## Rejected Future Examples And Claims

Future onboarding and examples must reject:

- executable examples;
- file reads;
- URL fetches;
- shell/env usage;
- prompt-as-source;
- artifact-as-source;
- source-truth inference;
- arbitrary replay;
- `norma.replayRun`;
- `/replay-run`;
- `/replay-mvp-demo` behavior changes;
- UI implementation;
- runtime routes;
- API/MCP behavior;
- package exports;
- dependencies;
- deployment;
- remote MCP;
- public npm/publish claims;
- camera/image/vision/CAD/plugin/marketplace;
- beauty score;
- creative recommendation;
- intent inference.

Future onboarding and examples must not describe displayability as proof that an input is Norma source truth.

Future onboarding and examples must not describe derived artifacts, visual data, prompt text, missing source refs, replay results, or package-private helper output as Norma source truth.

## Runtime Package Deployment Boundary

No `src/**` changes are approved.

No `src/index.ts` change is approved.

No package metadata, lockfile, export, dependency, or script change is approved.

No UI/app/viewer/server/http/route path is approved.

No API/MCP runtime behavior is approved.

No deployment configuration is approved.

No remote MCP behavior is approved.

No `docs/MCP_REMOTE_*.md` change is approved.

No `docs/onboarding/**` implementation is approved in PR62.

No `docs/examples/**` implementation is approved in PR62.

No `examples/**` change is approved.

No `bin/**` change is approved.

No `dist/**` change is approved.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` behavior remains unchanged.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Deployment remains blocked.

Package publishing remains blocked.

## Rollback Policy

Revert this PR62 approval document and PR62 contract test.

Revert the scoped PR60 changed-file guard update.

No runtime rollback should be required.

No UI rollback should be required.

No package rollback should be required.

No deployment rollback should be required.

## Validation Policy

PR62 validation must prove:

- this approval document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- PR62 is approval-only;
- PR62 does not implement onboarding docs;
- PR62 does not implement examples;
- future documentation paths are exactly the approved future documentation paths;
- future examples are inert and non-executable;
- future examples reject file reads, URL fetches, shell/env usage, prompt-as-source, artifact-as-source, source-truth inference, arbitrary replay, `norma.replayRun`, `/replay-run`, `/replay-mvp-demo` behavior changes, UI, runtime routes, API/MCP behavior, package exports, dependencies, deployment, remote MCP, public npm/publish claims, camera/image/vision/CAD/plugin/marketplace, beauty score, creative recommendation, and intent inference;
- `src/**` remains unchanged;
- `package.json`, `package-lock.json`, `src/index.ts`, `tsconfig.json`, and `README.md` remain unchanged;
- root `docs/MCP_REMOTE_*.md` files remain unchanged;
- `docs/onboarding/**`, `docs/examples/**`, `examples/**`, `bin/**`, and `dist/**` remain unchanged;
- the PR60 changed-file guard is updated only as needed to allow PR62 approval files and still rejects forbidden runtime/package/export/UI/deployment changes.

## Final Decision

PR62 approves only the future onboarding and examples documentation boundary.

PR62 is approval-only.

PR62 is docs/contract-tests only.

PR62 does not implement onboarding docs.

PR62 does not implement examples.

Future onboarding and examples may use only the approved future documentation paths.

Future onboarding and examples must be inert documentation only.

Future onboarding and examples must preserve PR55-PR61 visibility, source-truth, and package-private-helper constraints.

PR62 approves no UI implementation.

PR62 approves no runtime behavior.

PR62 approves no route changes.

PR62 approves no API/MCP behavior.

PR62 approves no dependencies.

PR62 approves no package metadata, package script, or package export changes.

PR62 approves no deployment configuration.

PR62 approves no remote MCP behavior.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

Package publishing remains blocked.

`norma.replayRun` remains blocked.

`/replay-run` remains blocked.

`/replay-mvp-demo` behavior remains unchanged.
