# Roadmap Status Update

## Status

PR48 is docs/contract-tests only.

PR48 updates roadmap status after PR47 / PR46-label.

The original Business Readiness Roadmap remains a planning document.

The roadmap does not authorize scope by itself.

The original PR numbers in the roadmap are historical.

Current official documentation state in PR48: Unknown.

PR48 does not re-check current official docs because it makes no transport, auth, package, runtime, deployment, API, UI, provider-compatibility, or tool-exposure decision.

## Decision

PR48 records the current roadmap boundary and the next advisory PR sequence through business readiness.

Current PR39-PR47 / PR46-label sequence is a cautious Phase 4 extension of remote MCP/API readiness.

This extension was intentionally conservative and docs/contract-tests only after local STDIO MCP.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

No remote runtime, API, UI, deployment, package publishing, or remote MCP tool exposure was approved by PR39-PR47 / PR46-label.

## Source Documents

- `docs/BUSINESS_READINESS_ROADMAP.md`.
- `docs/MCP_TOOL_CONTRACT.md`.
- `docs/MCP_REMOTE_THREAT_MODEL.md`.
- `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.
- `docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md`.
- `docs/decisions/2026-06-15-remote-mcp-tool-exposure-policy.md`.
- `src/mcp/stdio-protocol.ts`.
- `bin/norma-core-mcp-stdio.mjs`.
- `package.json`.
- `package-lock.json`.

## What Remains True From The Original Roadmap

The original roadmap still defines useful readiness phases:

- developer-tool readiness before broader delivery surfaces;
- package and release readiness before public package publication;
- MCP contract and local MCP before any remote MCP;
- remote MCP/API readiness before API implementation;
- product requirements before UI implementation;
- business launch readiness after onboarding, beta, policy, pricing, and launch gates.

API implementation is gated behind API contract/auth/rate-limit policy.

UI implementation is gated behind product requirements and viewer plan.

Package publishing remains blocked until explicit publishing decision.

Remote MCP runtime remains blocked unless future explicit approval satisfies gates.

## Historical PR Number Boundary

The original roadmap PR numbers are historical.

The roadmap was written before the current PR39-PR47 / PR46-label remote MCP governance sequence.

Historical PR numbers in `docs/BUSINESS_READINESS_ROADMAP.md` must not be treated as current PR numbers.

If the roadmap's historical PR numbering conflicts with current repository history, current repository history wins.

## Current Position After PR47

Current position after PR47:

- local STDIO MCP exists as the only approved MCP runtime;
- local STDIO `tools/list` and `tools/call` expose only the approved five-tool allowlist;
- remote MCP remains blocked;
- remote MCP tool exposure remains blocked;
- API implementation remains blocked;
- UI implementation remains blocked;
- package publishing remains blocked;
- deployment remains blocked;
- current business readiness is still incomplete.

Current local STDIO MCP tool exposure remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` and arbitrary replay remain blocked as MCP exposure.

`norma.replayMvpDemo` remains fixed-demo-only and must reject caller-supplied replay inputs.

## Phase 4 Remote MCP Governance Extension

PR39-PR47 / PR46-label are a cautious Phase 4 extension.

This extension converts the original roadmap's remote MCP/API readiness phase into explicit governance gates.

The extension is intentionally conservative:

- PR39 defined the remote MCP threat model and approval gate;
- PR40 recorded that remote MCP remains blocked;
- PR41 selected future transport/auth candidates only, without runtime approval;
- PR42 rejected package/dependency approval for remote MCP;
- PR43 defined the future remote MCP security test matrix;
- PR44 defined deployment policy gates without deployment approval;
- PR45 fixed future MCP decision document location policy;
- PR47 / PR46-label defined remote MCP tool exposure policy without remote tool exposure.

The extension does not contradict the roadmap. It narrows the roadmap into reviewed, testable gates before any remote/API implementation.

## Next PR Sequence

The fastest safe current path through business readiness is:

- PR48 - roadmap status update.
- PR49 - remote MCP/API readiness checkpoint, still no runtime.
- PR50 - API contract decision, docs/tests only.
- PR51 - auth/audit/rate-limit policy for API and future remote MCP, docs/tests only.
- PR52 - minimal API server approval decision, no implementation unless explicitly approved.
- PR53 - minimal API server skeleton, conditional on PR50-PR52 gates approving it.
- PR54 - API contract tests and golden envelopes, conditional on an approved API contract.
- PR55 - product requirements for read-only result viewer.
- PR56 - read-only result viewer plan, no UI implementation.
- PR57 - structured JSON input viewer prototype, conditional on PR55-PR56 approval.
- PR58 - verification/replay result UI prototype, no source-truth inference.
- PR59 - onboarding and examples.
- PR60 - beta pilot readiness checklist.
- PR61 - privacy/security/support policy.
- PR62 - pricing/package/public npm decision.
- PR63 - business launch checklist.

Conditional PRs must stay blocked until their named gates pass.

API implementation must not happen before API contract/auth/rate-limit gates.

UI implementation must not happen before product requirements and viewer plan.

Public npm/package publishing must remain blocked until an explicit publishing decision PR.

Remote MCP runtime must remain blocked unless a later explicit approval PR satisfies all PR39-PR47 gates.

## Non-Approval Boundary

PR48 does not approve:

- runtime implementation;
- remote MCP runtime;
- remote MCP tool exposure;
- API implementation;
- UI implementation;
- package publishing;
- package metadata changes;
- dependency changes;
- lockfile changes;
- deployment;
- auth runtime;
- logging runtime;
- resources;
- prompts;
- sampling;
- elicitation;
- new MCP tools;
- arbitrary replay;
- `norma.replayRun` MCP exposure.

No future PR may treat PR48 as approval for runtime, remote MCP, API, UI, package publishing, deployment, auth, logging, or tool exposure.

## Validation Policy

PR48 validation must prove:

- this decision document exists under `docs/decisions/` with a date-prefixed filename;
- required headings exist in order;
- the original roadmap is documented as a planning document;
- the original roadmap PR numbers are documented as historical;
- PR39-PR47 / PR46-label are documented as a cautious Phase 4 extension;
- remote MCP remains blocked;
- local STDIO remains the only approved MCP runtime;
- the next PR sequence covers PR48 through PR63;
- API, UI, package publishing, and remote MCP runtime remain gated;
- no new root-level `docs/MCP_REMOTE_*.md` document is added beyond the PR39-PR44 legacy exception set;
- package, runtime, deployment, and MCP tool exposure boundaries remain unchanged.

## Final Decision

PR48 updates roadmap status only.

The original Business Readiness Roadmap remains a planning document and does not authorize scope by itself.

The original roadmap PR numbers are historical.

PR39-PR47 / PR46-label are a cautious Phase 4 extension of remote MCP/API readiness.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.

PR48 does not approve runtime, remote MCP, API, UI, package publishing, deployment, auth, logging, or tool exposure changes.

The next PR sequence through PR63 is advisory and still requires separate scoped PRs.
