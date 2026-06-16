# Remote MCP API Readiness Checkpoint

## Status

PR49 is docs/contract-tests only.

PR49 runs after PR48 and records the current remote MCP/API readiness boundary.

Repo may proceed to PR50 API contract decision.

PR49 does not approve API implementation.

PR49 does not approve remote MCP runtime.

Remaining gates PR50/PR51/PR52/later still required.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Remote MCP tool exposure remains blocked.

API implementation remains blocked.

UI implementation remains blocked.

Package publishing remains blocked.

Deployment remains blocked.

## Decision

PR49 approves moving next to PR50 API contract decision only.

PR49 does not approve API server implementation.

PR49 does not approve remote MCP runtime.

PR49 does not approve remote MCP tool exposure.

PR49 does not approve HTTP, SSE, Streamable HTTP, or WebSocket runtime.

PR49 does not approve OAuth, auth, audit log, rate-limit, telemetry, retention, or environment-driven runtime behavior.

PR49 does not approve deployment, UI implementation, public package publishing, package metadata changes, package dependency changes, package export changes, or lockfile changes.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- Current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- Local MCP contract: `docs/MCP_TOOL_CONTRACT.md`.
- PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.
- PR45 decision doc location policy: `docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md`.
- PR47 / PR46-label remote MCP tool exposure policy: `docs/decisions/2026-06-15-remote-mcp-tool-exposure-policy.md`.
- PR48 roadmap status update: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- Current local MCP source: `src/mcp/stdio-protocol.ts`.
- Current local MCP wrapper: `bin/norma-core-mcp-stdio.mjs`.
- Package metadata and lockfile: `package.json`, `package-lock.json`.

## Official References Checked

Access date: 2026-06-16.

These references were checked only to record whether external references must be refreshed in PR50/PR51. PR49 changes no approval decision.

| URL | What affects future work | PR49 decision effect |
| --- | --- | --- |
| https://modelcontextprotocol.io/specification/2025-11-25/changelog | PR50/PR51 must refresh current MCP protocol version and schema changes before relying on transport, auth, or tool terminology. | No change; PR49 approves no implementation. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/transports | PR50/PR52 must refresh Streamable HTTP, Origin validation, localhost binding, session, and HTTP/SSE compatibility requirements before any server approval. | No change; local STDIO remains the only approved MCP runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization | PR51 must refresh OAuth 2.0 Protected Resource Metadata, authorization server discovery, WWW-Authenticate, scope, token, and 401/403 behavior. | No change; auth runtime remains blocked. |
| https://modelcontextprotocol.io/specification/2025-11-25/server/tools | PR50/PR51 must refresh tool schema, input validation, access control, rate limit, output sanitization, confirmation, timeout, and audit-log requirements. | No change; remote tool exposure remains blocked. |
| https://developers.openai.com/api/docs/guides/tools-connectors-mcp | PR50/PR51 must refresh OpenAI `server_url`, `authorization`, `require_approval`, `allowed_tools`, tool-list caching, approval, and data-sharing behavior. | No change; OpenAI compatibility remains a later gate. |
| https://developers.openai.com/api/docs/mcp | PR50/PR51 must refresh custom remote MCP server guidance, OAuth/CIMD guidance, prompt-injection risk, trust, data handling, and write-action safety. | No change; API and remote MCP remain blocked. |
| https://code.claude.com/docs/en/mcp | PR50/PR51 must refresh Claude Code HTTP, SSE, WebSocket, OAuth, scopes, headers, and project-scope approval behavior before provider compatibility is claimed. | No change; Claude compatibility remains a later gate. |
| https://platform.claude.com/docs/en/agents-and-tools/mcp-connector | PR50/PR51 must refresh Claude API connector URL, Streamable HTTP/SSE, OAuth bearer token, and tool-support behavior before provider compatibility is claimed. | No change; connector compatibility remains a later gate. |

## Completed Governance Gates

PR39 through PR48 have completed only governance and contract-test gates for the remote MCP/API readiness phase.

- PR39 defined the remote MCP threat model and approval gate.
- PR40 recorded that remote MCP remains blocked.
- PR41 selected future transport/auth candidates only, without runtime approval.
- PR42 rejected package/dependency approval for remote MCP.
- PR43 defined the future remote MCP security test matrix.
- PR44 defined deployment policy gates without deployment approval.
- PR45 fixed future MCP decision document location policy.
- PR46 is label/review continuity only and does not approve new runtime, API, deployment, UI, package, dependency, or tool exposure scope.
- PR47 / PR46-label defined remote MCP tool exposure policy without remote tool exposure.
- PR48 updated roadmap status and confirmed current repository history wins over historical roadmap PR numbers.

The original roadmap PR numbers are historical. The original Business Readiness Roadmap remains a planning document, and the roadmap does not authorize scope by itself.

Historical PR numbers in `docs/BUSINESS_READINESS_ROADMAP.md` must not be treated as current PR numbers. If the roadmap's historical PR numbering conflicts with current repository history, current repository history wins.

## Remaining Gates

The remaining gates still include:

- API contract;
- auth;
- audit logs;
- rate limits;
- server implementation approval;
- API golden envelopes;
- deployment approval;
- UI product requirements;
- public package publishing decision.

No remaining gate is satisfied by PR49.

API implementation is gated behind API contract/auth/rate-limit policy.

Remote MCP runtime remains blocked unless future explicit approval satisfies gates.

Deployment remains blocked until a future approval PR explicitly approves a deployment target, deployment provider, deployment configuration, and deployment verification boundary.

UI implementation is gated behind product requirements and viewer plan.

Package publishing remains blocked until explicit publishing decision.

## Next PR Map

The next reviewed sequence is:

- PR50 - API contract decision, docs/tests only.
- PR51 - auth/audit/rate-limit policy for API and future remote MCP, docs/tests only.
- PR52 - minimal API server approval decision, no implementation unless explicitly approved.
- PR53 - minimal API server skeleton, conditional on PR50-PR52 gates approving it.
- PR54 - API contract tests and golden envelopes, conditional on an approved API contract.

PR49 approves only moving to PR50 API contract decision.

PR49 does not approve PR53 or PR54 implementation work.

## Non-Approval Boundary

PR49 does not approve:

- API implementation;
- API server implementation;
- remote MCP runtime implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth, auth, or token runtime;
- audit log runtime;
- rate-limit runtime;
- telemetry runtime;
- retention runtime;
- environment-driven runtime behavior;
- remote MCP tool exposure;
- remote `tools/list`;
- remote `tools/call`;
- remote tool metadata;
- remote tool execution;
- remote allowed-tools configuration;
- resources;
- prompts;
- sampling;
- elicitation;
- logging;
- deployment files;
- deployment configuration;
- hosted, public, private, preview, staging, production, container, serverless, worker, VM, Kubernetes, or managed-platform remote MCP server;
- UI implementation;
- package publishing;
- package metadata changes;
- dependency changes;
- lockfile changes.

The current local STDIO MCP tool exposure remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` remains blocked as MCP exposure.

`norma.replayMvpDemo` remains fixed-demo-only and must reject caller-supplied replay inputs.

## Validation Policy

PR49 must remain docs-only and contract-tests-only.

PR49 must add no root-level `docs/MCP_REMOTE_*.md` files beyond the PR39-PR44 legacy exception set.

PR49 must not modify `docs/BUSINESS_READINESS_ROADMAP.md`.

PR49 must not modify `docs/MCP_REMOTE_*.md`.

PR49 must not modify `package.json`, `package-lock.json`, `src/**`, `bin/**`, `examples/**`, `dist/**`, `.github/**`, or deployment/config files.

PR49 must prove that package, dependency, runtime, deployment, API, and UI drift is absent.

PR49 must prove that current local STDIO MCP tools remain exactly the five approved tools and that unapproved replay remains blocked.

Future PR50/PR51 work must re-check current official MCP, OpenAI, Claude, auth, transport, and provider-compatibility docs before making API contract or auth/rate-limit decisions.

## Final Decision

Repo may proceed to PR50 API contract decision.

PR49 does not approve API implementation.

PR49 does not approve remote MCP runtime.

Remaining gates PR50/PR51/PR52/later still required.
