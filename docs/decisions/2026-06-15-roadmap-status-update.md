# Roadmap Status Update

## Status

PR48 is docs/contract-tests only.

PR48 updates roadmap status after the GitHub PR47 / PR46-label remote MCP tool exposure policy merge.

PR48 does not implement product features.

PR48 does not authorize runtime, package, dependency, deployment, API, UI, remote MCP, auth, logging, telemetry, resource, prompt, sampling, elicitation, or tool exposure changes.

Remote MCP remains blocked after PR48.

Local STDIO remains the only approved MCP runtime.

## Decision

`docs/BUSINESS_READINESS_ROADMAP.md` remains the primary business readiness roadmap reference.

The original roadmap remains valid as a phase strategy and engineering-discipline document.

The original roadmap PR numbers are historical.

The current PR39 through GitHub PR47 / PR46-label sequence is a cautious Phase 4 remote MCP/API readiness extension, not a contradiction of the roadmap.

Future work should follow the updated PR sequence in this document unless a later roadmap update explicitly changes it.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.
- PR45 decision doc location policy: `docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md`.
- GitHub PR47 / PR46-label tool exposure policy: `docs/decisions/2026-06-15-remote-mcp-tool-exposure-policy.md`.
- MCP tool contract: `docs/MCP_TOOL_CONTRACT.md`.

## What Remains True From The Original Roadmap

The original roadmap remains the strategic reference for business readiness.

It remains true that each phase requires small PRs with narrow scope, explicit non-goals, acceptance criteria, and validation notes.

It remains true that Norma truth must stay in explicit structured source objects, pack locks, operation contexts, diagnostics, provenance, and deterministic result envelopes.

It remains true that external surfaces may call the core, but must not define Norma logic.

It remains true that remote MCP and API work require threat models and approval gates before runtime implementation.

It remains true that API implementation must not happen before API contract approval.

It remains true that UI implementation must not happen before product requirements.

It remains true that public npm publishing remains blocked until an explicit package-readiness or publishing decision approves it.

It remains true that camera/image/vision, CAD/plugin/marketplace, cloud/hosted service, beauty score, creative recommendation, prompt-as-source, artifact-as-source, arbitrary replay, and adapter-owned Norma logic remain blocked unless a later explicit PR approves them.

## Historical PR Number Boundary

The original roadmap PR numbers were written before the current PR39 through GitHub PR47 / PR46-label remote MCP governance sequence.

Those numbers are historical and must not be read as the current live PR numbering.

The original phase order remains useful.

The current live PR numbers must be taken from GitHub and current repository state.

Any future roadmap reference must distinguish between historical roadmap PR labels and actual GitHub PR numbers.

## Current Position After PR47

After GitHub PR47 / PR46-label, Norma Core is in Phase 4 remote MCP/API readiness governance.

Phase 3 local MCP readiness has a reviewed local STDIO MCP boundary with the current approved five-tool allowlist:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

The PR39 through GitHub PR47 / PR46-label sequence established cautious remote MCP governance gates:

- threat model;
- approval decision;
- transport/auth/package candidate boundary;
- package/dependency decision;
- security test matrix;
- deployment policy;
- decision doc location policy;
- remote tool exposure policy.

This does not mean remote MCP is implemented or approved.

Current runtime remains local STDIO only.

## Phase 4 Remote MCP Governance Extension

The current PR39 through GitHub PR47 / PR46-label sequence is a conservative extension of Phase 4.

It was intentionally docs/contract-tests focused.

It happened before any remote runtime implementation.

It preserves the original roadmap rule that remote/API exposure requires threat modeling and explicit approval gates.

The extension is accepted as current strategy because it reduces risk before any API, remote MCP, deployment, auth, or public product surface is implemented.

## Next PR Sequence

The following sequence is the current planning path after PR48.

Each PR remains independently scoped. This sequence is planning guidance, not automatic authorization.

- PR48 — roadmap status update.
- PR49 — remote MCP/API readiness checkpoint, still no runtime.
- PR50 — API contract decision, docs/contract-tests only.
- PR51 — auth, audit-log, and rate-limit policy for API and future remote MCP, docs/contract-tests only.
- PR52 — minimal API server approval decision, no implementation unless explicitly approved.
- PR53 — minimal API server skeleton, conditional on PR50 through PR52 approval.
- PR54 — API contract tests and golden envelopes, conditional on PR53.
- PR55 — product requirements for read-only result viewer.
- PR56 — read-only result viewer plan, no UI implementation.
- PR57 — structured JSON input viewer prototype, conditional on PR55 and PR56.
- PR58 — verification/replay result UI prototype, no source-truth inference.
- PR59 — onboarding and examples.
- PR60 — beta pilot readiness checklist.
- PR61 — privacy, security, and support policy.
- PR62 — pricing, packaging, and public npm decision.
- PR63 — business launch checklist.

API implementation must not happen before API contract, auth, audit-log, and rate-limit gates are accepted.

UI implementation must not happen before product requirements and read-only viewer plan are accepted.

Public npm publishing must remain blocked until an explicit publishing decision PR approves it.

Remote MCP runtime remains blocked unless a future explicit approval PR satisfies the PR39 through PR47 / PR46-label gates and keeps every unapproved surface blocked.

## Non-Approval Boundary

PR48 does not approve:

- remote MCP runtime implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- API server implementation;
- OAuth, auth, token, or environment-driven behavior;
- package metadata changes;
- dependency changes;
- package `bin` changes;
- package export changes;
- lockfile changes;
- deployment files;
- remote server files;
- UI implementation;
- public npm publishing;
- resources;
- prompts;
- sampling;
- elicitation;
- logging;
- telemetry;
- retention;
- filesystem behavior;
- network behavior;
- shell behavior;
- new MCP tools;
- arbitrary replay;
- `norma.replayRun` MCP exposure.

## Validation Policy

Every future PR must keep the per-PR discipline from `docs/BUSINESS_READINESS_ROADMAP.md`.

Runtime-bearing PRs must run build, focused tests, full tests where relevant, check, diff check, guardrail greps, and advisory review when available.

Docs/contract-test PRs must still verify forbidden paths did not change.

Warnings from advisory tools may be accepted only when documented with a reason.

P0 and P1 findings remain blocking.

P2 findings require a fix unless there is a clear documented reason not to fix.

P3 findings are optional cleanup unless they reveal scope drift.

## Final Decision

`docs/BUSINESS_READINESS_ROADMAP.md` is the primary roadmap reference.

The original roadmap PR numbers are historical.

PR39 through GitHub PR47 / PR46-label are now documented as a cautious Phase 4 remote MCP/API readiness extension.

The next current sequence is PR48 through PR63 as listed in this document.

Remote MCP remains blocked after PR48.

Local STDIO remains the only approved MCP runtime.

PR48 does not approve runtime, package, dependency, deployment, API, UI, auth, logging, resource, prompt, sampling, elicitation, public npm, or tool exposure changes.
