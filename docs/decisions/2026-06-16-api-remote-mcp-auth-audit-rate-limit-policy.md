# API and Remote MCP Auth Audit Rate-Limit Policy

## Status

PR51 is docs/contract-tests only.

PR51 defines policy only.

PR51 applies to the future minimal Norma API and to any later future remote MCP runtime.

PR51 does not implement auth.

PR51 does not implement authorization.

PR51 does not implement audit logs.

PR51 does not implement rate limits.

PR51 does not implement body-size limits.

PR51 does not implement timeouts.

PR51 does not implement structured-error runtime.

PR51 does not implement redaction.

PR51 does not implement retention.

PR51 does not implement an API server.

PR51 does not implement remote MCP runtime.

API implementation remains blocked.

Remote MCP runtime remains blocked.

API server skeleton remains blocked until PR52 explicitly approves implementation.

Deployment remains blocked.

UI implementation remains blocked.

Package publishing remains blocked.

Local STDIO remains the only approved MCP runtime.

## Decision

Policy may be documented in PR51.

Future API and future remote MCP implementation must satisfy this auth, authorization, audit, rate-limit, body-size, timeout, structured-error, redaction, retention, and write-action policy before implementation can be approved.

PR51 does not approve auth runtime.

PR51 does not approve authorization runtime.

PR51 does not approve audit log runtime.

PR51 does not approve rate-limit runtime.

PR51 does not approve body-size-limit runtime.

PR51 does not approve timeout runtime.

PR51 does not approve redaction runtime.

PR51 does not approve retention runtime.

PR51 does not approve API implementation.

PR51 does not approve remote MCP runtime.

PR51 does not approve API server skeleton.

PR51 does not approve deployment.

PR51 does not approve package/dependency changes.

PR51 does not approve UI.

PR51 does not approve public npm publishing.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- PR48 current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- PR49 readiness checkpoint: `docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md`.
- PR50 API contract decision: `docs/decisions/2026-06-15-api-contract-decision.md`.
- Local MCP contract: `docs/MCP_TOOL_CONTRACT.md`.
- PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.
- PR45 decision doc location policy: `docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md`.
- PR47 / PR46-label remote MCP tool exposure policy: `docs/decisions/2026-06-15-remote-mcp-tool-exposure-policy.md`.
- Current local MCP source: `src/mcp/stdio-protocol.ts`.
- Current local MCP wrapper: `bin/norma-core-mcp-stdio.mjs`.
- Package metadata and lockfile: `package.json`, `package-lock.json`.

PR39 through PR50 are source documents for the current remote MCP/API readiness boundary.

## Official References Checked

Access date: 2026-06-16.

These references were checked to define policy only. PR51 changes no implementation approval decision.

| URL | What it affects | PR51 decision effect |
| --- | --- | --- |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization | Confirms MCP authorization is for HTTP-based transports, STDIO stays separate, OAuth 2.1 resource-server behavior uses protected resource metadata, `WWW-Authenticate`, scopes, resource indicators, access tokens, audience/resource validation, and HTTP 401/403/400 error behavior. It states access tokens must not be in URI query strings and must be valid for the MCP server resource. | Future API/remote MCP policy requires explicit auth, least-privilege scopes, resource/audience binding, no query-string tokens, no token logging, structured auth errors, and STDIO separation. PR51 approves no auth runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/transports | Confirms standard MCP transports include stdio and Streamable HTTP, and Streamable HTTP requires Origin validation, localhost binding caution for local servers, proper authentication, session handling, and `MCP-Protocol-Version` behavior. | Future HTTP/API/remote MCP implementation must define Origin, binding, auth, session, protocol-version, body, timeout, and structured-error behavior before approval. PR51 approves no HTTP runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/server/tools | Confirms tools require input validation, access controls, rate limits, output sanitization, confirmation for sensitive operations, client timeouts, and audit logging. | Future API/remote MCP policy requires allowlists, scoped authorization, rate limits, sanitized outputs, no-stack-trace errors, audit-safe metadata, and write-action approval gates. PR51 approves no tool exposure. |
| https://developers.openai.com/api/docs/guides/tools-connectors-mcp | Confirms OpenAI remote MCP connector shape includes `server_url`, optional OAuth `authorization`, `require_approval`, and `allowed_tools`. | Future OpenAI compatibility must re-check connector approval and allowlist semantics. PR51 approves no OpenAI connector integration. |
| https://developers.openai.com/api/docs/mcp | Confirms custom MCP server safety concerns around prompt injection, excessive parameters, data exfiltration, sensitive data exposure, and write actions. | Future API/remote MCP must keep write actions blocked by default, reject prompt-as-source, minimize data sharing, and require explicit approval policy before any write action. PR51 approves no write action. |
| https://code.claude.com/docs/en/mcp | Confirms Claude Code supports local stdio and remote HTTP/SSE modes, notes SSE is deprecated in favor of HTTP where available, and says OAuth flags apply to HTTP/SSE but not stdio. | Future Claude compatibility must keep local STDIO separate from HTTP auth policy and must re-check transport/OAuth behavior before claiming compatibility. PR51 approves no Claude compatibility claim. |
| https://platform.claude.com/docs/en/agents-and-tools/mcp-connector | Confirms Claude API MCP connector supports tool calls only, requires publicly exposed HTTP with Streamable HTTP/SSE, cannot directly connect local STDIO, and can use an authorization token. | Future Claude API compatibility requires later public HTTP, auth, deployment, tool-exposure, and provider-compatibility approvals. PR51 approves no remote MCP runtime or deployment. |

## Policy Non-Approval Boundary

PR51 does not approve:

- API implementation;
- API server implementation;
- API server skeleton;
- route implementation;
- auth runtime;
- authorization runtime;
- OAuth runtime;
- token parsing;
- token storage;
- bearer-token handling;
- environment-token behavior;
- audit log runtime;
- logging runtime;
- telemetry runtime;
- rate-limit runtime;
- body-size-limit runtime;
- timeout runtime;
- redaction runtime;
- retention runtime;
- remote MCP runtime implementation;
- remote MCP tool exposure;
- remote `tools/list`;
- remote `tools/call`;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- resources;
- prompts;
- sampling;
- elicitation;
- new MCP tools;
- `norma.replayRun` exposure;
- arbitrary operation replay;
- package metadata changes;
- dependency changes;
- lockfile changes;
- package `bin` changes;
- package export changes;
- deployment;
- deployment files;
- UI implementation;
- public npm publishing.

No future PR may treat PR51 as approval for implementation.

## Auth Policy

Future HTTP/API auth must be explicit before implementation.

No anonymous remote API is allowed unless a later explicit PR approves a local-only or demo-only exception with tests.

Tokens must not be accepted from query strings.

Tokens must not be logged.

Token validation must include audience/resource binding.

Invalid, expired, and missing tokens must return structured errors.

STDIO must remain separate from the HTTP auth flow.

Secrets must not be read or introduced in PR51.

PR51 must not add environment-variable behavior.

## Authorization and Scope Policy

Future API and remote MCP implementation must use route/tool allowlists.

Least-privilege scopes are required.

Scope challenge behavior must be specified before remote implementation.

Blocked routes remain blocked.

`POST /replay-run` remains blocked.

`norma.replayRun` remains blocked as MCP exposure.

`replay-mvp-demo` remains fixed-demo-only.

No agent-created packs, rules, ratios, tolerances, or geometry are approved.

No prompt-as-source behavior is approved.

No artifact-as-source behavior is approved.

No hidden pack or tolerance selection is approved.

## Audit Log Policy

Future audit logs must capture only safe metadata.

Allowed audit metadata fields are:

- request id;
- timestamp;
- route/tool name;
- decision outcome;
- status;
- error code;
- auth subject id or hashed subject id, when auth exists;
- scope names, when auth exists;
- approval decision, if any;
- blocked-route attempts;
- rate-limit decisions;
- latency bucket;
- payload size bucket;
- operation version;
- serialization version.

Audit logs must not capture:

- raw tokens;
- secrets;
- full request bodies;
- full response bodies;
- source geometry payloads;
- pack content payloads;
- artifact content payloads;
- prompt text;
- stack traces;
- arbitrary user documents.

PR51 adds no audit storage.

## Rate-Limit Policy

Rate limits are required before public or remote exposure.

Per-subject limits are required when auth exists.

Per-IP fallback policy is required before any unauthenticated local/demo exception.

Route/tool-specific limits are required for heavier operations.

Blocked route attempts must count.

Invalid requests must count.

Replay endpoints must be stricter than version and canonical-json endpoints.

Rate-limit errors must be structured and no-stack-trace.

## Body Size and Payload Policy

A maximum request body size is required before implementation.

Malformed JSON rejection is required.

Extra hidden fields rejection is required.

Nested object depth policy is required.

Array length policy is required.

String length policy is required.

No arbitrary file upload is approved.

No URL fetch by API is approved.

No filesystem reads or writes are approved.

No shell execution is approved.

## Timeout Policy

A request timeout is required before implementation.

Route-specific timeout budget is required.

No unbounded work is approved.

No background jobs are introduced by PR51.

Timeout errors must be structured and no-stack-trace.

## Structured Error Policy

Future error envelopes must include:

- status;
- error code;
- message;
- diagnostics when safe;
- request id when available;
- operation version when available;
- serialization version when available.

Future error envelopes must not expose:

- stack traces;
- internal filesystem paths;
- environment variables;
- tokens/secrets;
- raw unredacted user payloads.

## Redaction Policy

Future logs and diagnostics must redact tokens.

Future logs and diagnostics must redact secrets.

Future logs and diagnostics must redact Authorization headers.

Future logs and diagnostics must redact cookies.

Future logs and diagnostics must redact raw request bodies from logs.

Future logs and diagnostics must redact prompt text from logs.

Future logs and diagnostics must redact user-provided source payloads from logs unless a later explicit data policy allows a safe subset.

## Retention Policy

Retention period must be explicit before deployment.

Local development may use no persistent audit storage unless approved.

Remote/public deployment needs explicit retention and deletion policy.

PR51 itself adds no storage.

## Write Action and Approval Policy

Norma API V1 must be read-only / verification-only by default.

Write actions remain blocked.

Agent-created packs, rules, ratios, tolerances, and geometry remain blocked.

Any future write action requires explicit approval policy and tests.

OpenAI/Claude connector approval semantics must be rechecked before provider compatibility is claimed.

## Future Implementation Requirements

Before API or remote MCP implementation can be approved, a future PR must include tests for:

- auth required or explicit exception;
- no tokens in query strings;
- no token logging;
- audience/resource binding;
- invalid, expired, and missing token structured errors;
- route/tool allowlists;
- least-privilege scopes;
- scope challenge behavior;
- blocked route attempts;
- blocked `POST /replay-run`;
- blocked `norma.replayRun`;
- fixed-demo-only `replay-mvp-demo`;
- safe audit metadata only;
- sensitive audit field rejection;
- per-subject and per-IP rate-limit policy;
- route/tool-specific rate limits;
- invalid and blocked requests counted;
- max body size;
- malformed JSON rejection;
- extra hidden fields rejection;
- nested object depth, array length, and string length limits;
- no file upload, URL fetch, filesystem read/write, or shell execution;
- request timeout and route-specific timeout;
- structured errors with no stack traces;
- redaction of tokens, secrets, Authorization headers, cookies, raw request bodies, prompt text, and source payloads;
- explicit retention and deletion policy before deployment;
- write actions blocked by default.

These tests must exist before implementation, not after it.

## Runtime Deployment Package Boundary

PR51 must add no API implementation files.

PR51 must add no auth runtime files.

PR51 must add no audit runtime files.

PR51 must add no rate-limit runtime files.

PR51 must add no remote MCP runtime files.

PR51 must add no remote server files.

PR51 must add no deployment files.

PR51 must add no package metadata changes.

PR51 must add no dependency changes.

PR51 must add no lockfile changes.

PR51 must add no package exports or package `bin` entries.

PR51 must add no UI implementation.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Deployment remains blocked.

Public npm publishing remains blocked.

## Final Decision

PR51 documents auth, authorization, audit log, rate-limit, body-size, timeout, structured-error, redaction, retention, and write-action policy only.

Policy may be documented.

API implementation remains blocked.

Remote MCP runtime remains blocked.

API server skeleton remains blocked until PR52 explicitly approves implementation.

PR51 does not approve auth runtime.

PR51 does not approve audit log runtime.

PR51 does not approve rate-limit runtime.

PR51 does not approve deployment.

PR51 does not approve package/dependency changes.

PR51 does not approve UI.

PR51 does not approve public npm publishing.
