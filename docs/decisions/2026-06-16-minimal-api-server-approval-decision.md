# Minimal API Server Approval Decision

## Status

PR52 is docs/contract-tests only.

PR52 is an approval decision only.

PR52 is approval-decision-only.

PR52 answers whether the PR50 API contract and PR51 auth/audit/rate-limit policy gates approve moving to a future minimal API server skeleton PR.

PR52 approves moving to PR53 minimal API server skeleton, but only as a separate PR.

PR52 does not implement API server.

PR52 does not implement routes.

PR52 does not implement auth.

PR52 does not implement audit logs.

PR52 does not implement rate limits.

PR52 does not implement body-size limits.

PR52 does not implement timeouts.

PR52 does not implement redaction.

PR52 does not implement retention.

PR52 does not implement remote MCP runtime.

PR52 does not approve deployment.

PR52 does not approve UI.

PR52 does not approve package publishing.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

## Decision

Yes, the PR50 API contract and PR51 auth/audit/rate-limit policy gates are complete enough to approve moving to PR53 minimal API server skeleton planning and implementation review.

PR53 remains a separate reviewed PR and must still be reviewed before merge.

PR53 remains conditional on satisfying PR50 and PR51 requirements.

PR52 approves only this future PR53 direction: a minimal local-only API server skeleton that implements only approved PR50 route candidates, only if it also implements PR51 policy requirements, adds no remote MCP runtime, adds no deployment, and keeps package publishing blocked.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR48 current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- PR49 readiness checkpoint: `docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md`.
- PR50 API contract decision: `docs/decisions/2026-06-15-api-contract-decision.md`.
- PR51 auth/audit/rate-limit policy: `docs/decisions/2026-06-16-api-remote-mcp-auth-audit-rate-limit-policy.md`.
- Local MCP contract: `docs/MCP_TOOL_CONTRACT.md`.
- PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.
- PR45 decision doc location policy: `docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md`.
- PR46/PR47 remote MCP tool exposure policy: `docs/decisions/2026-06-15-remote-mcp-tool-exposure-policy.md`.
- Current local MCP source: `src/mcp/stdio-protocol.ts`.
- Current local MCP wrapper: `bin/norma-core-mcp-stdio.mjs`.
- Package metadata and lockfile: `package.json`, `package-lock.json`.

PR39 through PR51 are source documents for the current remote MCP/API readiness boundary.

## Official References Checked

Access date: 2026-06-16.

These references were checked to confirm the PR52 approval boundary only. PR52 uses them to constrain future PR53 review, not to implement runtime behavior.

| URL | What it affects | PR52 decision effect |
| --- | --- | --- |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization | Confirms HTTP-based MCP authorization expectations, OAuth protected resource metadata, WWW-Authenticate behavior, resource/audience binding, scope selection, token handling, and the STDIO separation from HTTP authorization. | PR53 must remain local-only unless it implements a testable auth exception or satisfies PR51 policy. PR52 approves no auth runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/transports | Confirms STDIO message boundaries and Streamable HTTP requirements, including Origin validation, localhost binding guidance, authentication, session handling, and JSON-RPC over HTTP. | PR53 may not claim remote MCP or provider compatibility. PR52 approves no Streamable HTTP, SSE, WebSocket, or remote MCP runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/server/tools | Confirms tool input schemas, structured content, protocol errors, validation, access controls, rate limits, sanitized outputs, user confirmation for sensitive operations, timeouts, and audit logging. | PR53 tests must preserve structured envelopes and security constraints. PR52 approves no new MCP tools or remote tool exposure. |
| https://developers.openai.com/api/docs/guides/tools-connectors-mcp | Confirms OpenAI remote MCP connector configuration uses server URL, approval behavior, and allowed tools. | OpenAI compatibility remains blocked until a later explicit connector/runtime/deployment decision. PR52 approves no OpenAI connector integration. |
| https://developers.openai.com/api/docs/mcp | Confirms custom MCP server safety risks around prompt injection, excessive parameters, data exfiltration, sensitive data exposure, and write actions. | PR53 must reject prompt-as-source, artifact-as-source, arbitrary replay, and write actions. PR52 approves no write action. |
| https://code.claude.com/docs/en/mcp | Confirms Claude Code supports local STDIO and remote HTTP/SSE configuration, with HTTP recommended for remote servers and SSE described as deprecated where HTTP is available. | Local STDIO remains separate from future HTTP behavior. PR52 approves no Claude provider compatibility claim. |
| https://platform.claude.com/docs/en/agents-and-tools/mcp-connector | Confirms Claude API MCP connector configuration includes URL servers, authorization token usage, MCP helpers, data retention considerations, and tool configuration migration toward explicit tool configuration. | Claude API compatibility requires later public HTTP/auth/deployment/tool-exposure approvals. PR52 approves no deployment or connector compatibility. |

## Completed Gates

The following gates are complete enough to approve PR53 skeleton planning:

- PR49 readiness checkpoint exists.
- PR50 API contract decision exists.
- PR51 auth/audit/rate-limit policy exists.
- API candidate routes are defined.
- Blocked routes are defined.
- Source-truth rules are defined.
- Envelope rules are defined.
- Auth/audit/rate-limit/body-size/timeout/redaction/retention policy is defined.
- PR53 can be approved only as minimal server skeleton under constraints.

These completed gates do not approve implementation in PR52.

## Approval Scope For PR53

PR52 may approve only this future PR53 scope:

```txt
A minimal local-only API server skeleton that implements only the approved PR50 route candidates, only if it also implements PR51 policy requirements, adds no remote MCP runtime, adds no deployment, and keeps package publishing blocked.
```

PR53 remains separate and must still be reviewed before merge.

PR53 must not treat this decision as approval for remote MCP, deployment, UI, package publishing, provider compatibility, or package/dependency changes.

## PR53 Required Implementation Constraints

Future PR53 must be constrained to:

- local-only development server unless PR52 explicitly says otherwise;
- no public hosting;
- no deployment config;
- no remote MCP runtime;
- no MCP HTTP server;
- no provider compatibility claim;
- no package publish;
- no broad SDK;
- no UI;
- no filesystem reads/writes;
- no network fetch;
- no shell execution;
- no environment-token behavior unless PR53 explicitly implements testable local config boundaries approved by PR51 policy;
- no write actions;
- no agent-created packs/rules/ratios/tolerances/geometry;
- no prompt-as-source;
- no artifact-as-source;
- no arbitrary replay.

## PR53 Required Route Constraints

PR53 may implement only these future API route candidates:

```txt
GET /version
POST /canonical-json
POST /verify-run
POST /verify-artifact-freshness
POST /replay-mvp-demo
```

PR53 must keep these routes blocked:

```txt
POST /replay-run
POST /create-pack
POST /create-rule
POST /create-ratio
POST /create-geometry
POST /infer-intent
POST /recommend
POST /rank-beauty
POST /read-file
POST /write-file
POST /fetch-url
POST /run-shell
```

No future route outside the approved candidate list may be added by PR53.

## PR53 Required Security Constraints

PR53 must include contract tests for:

- malformed JSON rejection;
- invalid payload rejection;
- extra hidden fields rejection;
- blocked route rejection;
- no stack traces in structured errors;
- max body size;
- nested object depth limit;
- array length limit;
- string length limit;
- request timeout;
- route-specific timeout;
- no tokens in query strings;
- no token logging;
- no raw request/response body logging;
- redaction of Authorization headers and cookies;
- no audit storage unless explicitly approved;
- safe audit metadata only if audit logs are introduced;
- no public remote exposure;
- no deployment config.

If PR53 does not implement auth runtime, it must remain local-only and document the explicit exception.

If PR53 implements auth runtime, it must satisfy PR51 policy and include tests.

## PR53 Required Test Constraints

PR53 must include tests for:

- accept path for every approved route;
- reject path for every blocked route;
- reject malformed JSON;
- reject invalid payloads;
- reject hidden fields;
- reject prompt-as-source;
- reject artifact-as-source;
- reject arbitrary replay;
- preserve status/warnings/errors/diagnostics/provenance/source refs/output refs/artifact freshness/operation context/pack locks/serialization version/operation version;
- no stack traces;
- no filesystem/network/shell behavior;
- no package/dependency drift unless explicitly approved.

These tests must exist in PR53 before or with the skeleton, not after merge.

## Explicit Non-Approval Boundary

PR52 does not approve:

- API implementation in PR52;
- remote MCP runtime;
- remote MCP tool exposure;
- deployment;
- public hosting;
- OpenAI connector compatibility claim;
- Claude connector compatibility claim;
- package publishing;
- UI implementation;
- package metadata changes;
- dependency changes;
- lockfile changes;
- auth runtime in PR52;
- audit runtime in PR52;
- rate-limit runtime in PR52;
- route implementation in PR52.

No future PR may treat PR52 as approval for remote MCP runtime, deployment, package publishing, UI implementation, or provider compatibility.

## Still Blocked After PR52

Remote MCP remains blocked.

Remote MCP tool exposure remains blocked.

Deployment remains blocked.

Public hosting remains blocked.

UI implementation remains blocked.

Package publishing remains blocked.

Package metadata changes remain blocked.

Dependency changes remain blocked.

Lockfile changes remain blocked.

Provider compatibility claims remain blocked.

Any API work beyond the constrained PR53 skeleton remains blocked until separately approved.

## Runtime Deployment Package Boundary

PR52 must add no API implementation files.

PR52 must add no route implementation files.

PR52 must add no HTTP runtime files.

PR52 must add no auth runtime files.

PR52 must add no audit log runtime files.

PR52 must add no rate-limit runtime files.

PR52 must add no remote MCP runtime files.

PR52 must add no deployment files.

PR52 must add no package metadata changes.

PR52 must add no dependency changes.

PR52 must add no lockfile changes.

PR52 must add no package exports or package `bin` entries.

PR52 must add no UI implementation.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Deployment remains blocked.

Public npm publishing remains blocked.

## Final Decision

PR52 approves moving to PR53 minimal API server skeleton, but only as a separate PR.

PR52 is docs/contract-tests only.

PR52 is approval-decision-only.

PR52 does not implement API server.

PR52 does not implement routes.

PR52 does not implement auth, audit logs, rate limits, body-size limits, timeouts, redaction, or retention.

PR52 does not implement remote MCP runtime.

PR52 does not approve deployment.

PR52 does not approve UI.

PR52 does not approve package publishing.

PR53 remains conditional and must satisfy PR50 and PR51 requirements before merge.

Remote MCP remains blocked.

Local STDIO remains the only approved MCP runtime.
