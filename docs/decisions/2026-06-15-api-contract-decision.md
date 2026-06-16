# API Contract Decision

## Status

PR50 is docs/contract-tests only.

PR50 defines API contract only.

PR50 documents the minimal future API contract that a later API server would have to implement.

PR50 implements no API server.

PR50 implements no routes.

PR50 makes no package metadata changes.

PR50 adds no dependencies.

PR50 adds no auth runtime.

PR50 adds no deployment.

API implementation remains blocked.

API server skeleton remains blocked until PR52 explicitly approves implementation.

Remote MCP runtime remains blocked.

Local STDIO remains the only approved MCP runtime.

Deployment remains blocked.

Auth runtime remains blocked until PR51.

Audit log runtime remains blocked until PR51.

Rate-limit runtime remains blocked until PR51.

UI implementation remains blocked.

Public npm publishing remains blocked.

## Decision

The API contract may be documented in PR50.

API implementation remains blocked.

API server skeleton remains blocked until PR52 explicitly approves implementation.

PR50 does not approve remote MCP runtime.

PR50 does not approve auth runtime.

PR50 does not approve audit log runtime.

PR50 does not approve rate-limit runtime.

PR50 does not approve deployment.

PR50 does not approve package/dependency changes.

PR50 does not approve UI.

PR50 does not approve public npm publishing.

The future API must be a thin transport wrapper over approved Norma Core operations. It must not define Norma logic.

Unknown implementation decisions remain blocked.

## Source Documents

- Primary roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.
- Current roadmap status boundary: `docs/decisions/2026-06-15-roadmap-status-update.md`.
- PR49 readiness checkpoint: `docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md`.
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
- PR49 remote MCP/API readiness checkpoint: `docs/decisions/2026-06-15-remote-mcp-api-readiness-checkpoint.md`.
- Current local MCP source: `src/mcp/stdio-protocol.ts`.
- Current local MCP wrapper: `bin/norma-core-mcp-stdio.mjs`.
- Package metadata and lockfile: `package.json`, `package-lock.json`.

PR39 through PR49 are source documents for the current remote MCP/API readiness boundary.

## Official References Checked

Access date: 2026-06-16.

These references were checked to define the PR50 API contract boundary only. PR50 changes no implementation approval decision.

| URL | What it affects | PR50 decision effect |
| --- | --- | --- |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/transports | Confirms MCP standard transports are stdio and Streamable HTTP; Streamable HTTP requires JSON-RPC over HTTP, Origin validation, localhost binding guidance, auth guidance, session handling, and protocol-version headers. | Confirms future remote/API work must preserve JSON envelopes and HTTP safety gates; PR50 does not approve HTTP, Streamable HTTP, SSE, or WebSocket runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization | Confirms authorization applies to HTTP-based MCP transports, while STDIO should not follow that authorization flow. It also records OAuth 2.1, protected resource metadata, discovery, scopes, token handling, and error behavior. | Confirms PR51 must define auth/audit/rate-limit policy before any API or future remote MCP implementation; PR50 approves no auth runtime. |
| https://modelcontextprotocol.io/specification/2025-11-25/server/tools | Confirms tool schemas, structured/unstructured tool results, annotations, and trust boundaries around tool metadata and results. | Confirms future API route contracts must preserve structured results and treat metadata/output as untrusted at remote boundaries; PR50 approves no tool or route implementation. |
| https://developers.openai.com/api/docs/guides/tools-connectors-mcp | Confirms OpenAI remote MCP connector shape includes `server_url`, `authorization`, `require_approval`, and `allowed_tools`. | Confirms provider compatibility needs explicit allowlists and approval behavior later; PR50 approves no remote MCP runtime or OpenAI connector integration. |
| https://developers.openai.com/api/docs/mcp | Confirms custom MCP server guidance and prompt-injection, trust, data-sharing, and write-action risk considerations. | Confirms future API and remote MCP implementation tests must include prompt-injection, data-sharing, and source-truth preservation checks; PR50 approves no implementation. |
| https://code.claude.com/docs/en/mcp | Confirms Claude Code supports stdio, HTTP, SSE, WebSocket, and OAuth configuration, with OAuth options applying to HTTP/SSE and not stdio. | Confirms local STDIO and future HTTP/auth boundaries remain separate; PR50 approves no Claude provider compatibility claim. |
| https://platform.claude.com/docs/en/agents-and-tools/mcp-connector | Confirms Claude API MCP connector currently supports tool calls, requires publicly exposed HTTP, supports Streamable HTTP/SSE, and cannot directly connect local STDIO servers. | Confirms Claude API compatibility requires later public HTTP/server/deployment decisions; PR50 approves no remote MCP runtime, deployment, or provider connector. |

## API Contract Non-Approval Boundary

PR50 does not approve:

- API implementation;
- API server implementation;
- API server skeleton;
- route implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- remote MCP runtime implementation;
- remote MCP tool exposure;
- OAuth, auth, or token runtime;
- audit log runtime;
- rate-limit runtime;
- logging runtime;
- telemetry runtime;
- retention runtime;
- deployment;
- deployment files;
- package metadata changes;
- dependency changes;
- package `bin` changes;
- package export changes;
- lockfile changes;
- UI implementation;
- public npm publishing;
- resources;
- prompts;
- sampling;
- elicitation;
- new MCP tools;
- `norma.replayRun` exposure;
- arbitrary operation replay.

No future PR may treat PR50 as approval for API server implementation or remote MCP runtime.

## Contract Envelope Rules

The future API must use structured JSON request and response envelopes.

The future API request envelope must carry explicit structured input only. It must not accept prompt text as source truth.

The future API response envelope must preserve:

- `status`;
- warnings;
- errors;
- diagnostics;
- provenance;
- source refs;
- output refs;
- artifact freshness data;
- verification results;
- replay results where approved;
- mismatch details;
- operation context;
- pack locks;
- serialization version;
- operation version.

The future API must not collapse results to a generic boolean.

The future API must not hide diagnostics.

The future API must return structured errors with no client-visible stack traces.

The future API must preserve unknown output fields unless a later compatibility decision explicitly rejects them.

## Source Truth Rules

The future API must be source-truth preserving.

The future API must not:

- create packs;
- create rules;
- create ratios;
- create tolerances;
- create geometry;
- infer intent;
- select hidden packs;
- select hidden tolerances;
- treat prompt text as source truth;
- treat artifacts as source truth;
- hide diagnostics;
- collapse results to a generic boolean;
- perform arbitrary operation replay.

Structured source objects remain source truth.

Artifacts remain derived projections, not source truth.

Prompt text is never source truth.

Adapters and transport surfaces may call approved Norma operations, but they must not define Norma logic.

## Future Route Candidates

Future minimal route candidates are:

```txt
GET /version
POST /canonical-json
POST /verify-run
POST /verify-artifact-freshness
POST /replay-mvp-demo
```

These are route candidates only. PR50 implements none of them.

Each future route must preserve the contract envelope rules and source-truth rules above.

## Blocked Routes

The following routes remain blocked:

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

No future API implementation may add these routes unless a separate explicit approval PR changes this decision with contract tests.

## Route Contract Matrix

| Route | Purpose | Source operation | Request body shape | Response envelope requirements | Forbidden behavior | Accept-path test requirements | Reject-path test requirements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /version` | Return Norma Core version and capability metadata. | Same logical operation as `norma.getVersion`: current version and capability metadata only. | No request body. Query parameters are not part of PR50. | Must include structured status and version/capability fields without reading package metadata from runtime. | Must not add package metadata mutation, environment reads, network calls, or hidden provider capability claims. | Returns version/capability envelope and preserves serialization version where exposed. | Rejects request body, unexpected query fields if a later PR defines strict query handling, and unsupported methods. |
| `POST /canonical-json` | Return canonical JSON for explicit structured input. | `serializeCanonicalJson`. | JSON object with explicit `value` and optional approved serialization policy. | Must return status, serialization version, operation version where applicable, canonical JSON, warnings, errors, diagnostics, and provenance if present. | Must not fetch data, read files, mutate input, infer source truth, or accept non-JSON-compatible values. | Returns deterministic canonical JSON for valid explicit JSON. | Rejects malformed JSON, missing `value`, unsupported policy, circular or non-JSON-compatible values, and extra hidden fields. |
| `POST /verify-run` | Verify an explicit Norma run envelope. | `verifyRun`. | JSON object with explicit verification input equivalent to the existing core verification input. | Must preserve status, warnings, errors, diagnostics, provenance, source refs, output refs, artifact freshness data, verification results, mismatch details, operation context, pack locks, serialization version, and operation version. | Must not infer pack locks, operation context, source refs, output refs, rules, tolerances, geometry, or intent. | Returns the full verification result for valid explicit input. | Rejects malformed JSON, invalid verification payloads, extra hidden fields, prompt-as-source, artifact-as-source, and generic boolean collapse. |
| `POST /verify-artifact-freshness` | Verify explicit artifact freshness data. | `verifyArtifactFreshness`. | JSON object with explicit artifact freshness verification input. | Must preserve status, warnings, errors, diagnostics, provenance, source refs, output refs, artifact freshness data, serialization version, and operation version where present. | Must not fetch artifacts, read files, infer source objects, or treat artifacts as source truth. | Returns the full artifact freshness verification result for valid explicit input. | Rejects malformed JSON, invalid payloads, missing source refs, hidden source inference, artifact-as-source, and extra hidden fields. |
| `POST /replay-mvp-demo` | Replay only the fixed MVP demo path. | Same logical operation as `norma.replayMvpDemo`: fixed in-memory MVP demo replay only. | Empty JSON object only. Missing body behavior must be decided by the implementation PR; PR50 does not approve it. | Must preserve status, warnings, errors, diagnostics, provenance, replay results, mismatch details, operation context, pack locks, serialization version, and operation version. | Must not expose `replayRun`, caller-supplied `run`, arbitrary replay inputs, source objects, pack locks, operation contexts, expected output refs, artifact freshness inputs, or prompt text as source truth. | Returns the fixed demo replay result with full diagnostics and provenance. | Rejects `{ run: {} }`, caller-supplied replay inputs, arbitrary operation replay, malformed JSON, and extra hidden fields. |

## Required Future API Tests

Future API implementation PRs must include:

- accept-path tests for each approved route;
- reject-path tests for malformed JSON;
- reject-path tests for invalid route payloads;
- reject-path tests for extra hidden fields;
- reject-path tests for blocked routes;
- no-stack-trace structured error tests;
- provenance preservation tests;
- source-ref/output-ref preservation tests;
- artifact freshness preservation tests;
- pack-lock preservation tests;
- operation-context preservation tests;
- no prompt-as-source tests;
- no artifact-as-source tests;
- no arbitrary replay tests.

These tests must exist before API server implementation, not after it.

Passing these tests does not itself approve API runtime. A future PR must still explicitly approve the implementation scope and keep every unapproved surface blocked.

## Auth Audit Rate Limit Boundary

PR50 defines no auth runtime.

PR50 defines no audit log runtime.

PR50 defines no rate-limit runtime.

Auth runtime remains blocked until PR51.

Audit log runtime remains blocked until PR51.

Rate-limit runtime remains blocked until PR51.

PR51 must define auth, audit log, rate-limit, body size, timeout, structured error, no-stack-trace, redaction, and retention policy before API implementation can be considered.

## Runtime Deployment Package Boundary

PR50 must add no API implementation files.

PR50 must add no remote server files.

PR50 must add no deployment files.

PR50 must add no package metadata changes.

PR50 must add no dependency changes.

PR50 must add no lockfile changes.

PR50 must add no package exports or package `bin` entries.

PR50 must add no UI implementation.

Local STDIO remains the only approved MCP runtime.

Remote MCP remains blocked.

Deployment remains blocked.

Public npm publishing remains blocked.

## Final Decision

PR50 documents the future minimal API contract only.

API contract may be documented.

API implementation remains blocked.

API server skeleton remains blocked until PR52 explicitly approves implementation.

PR50 does not approve remote MCP runtime.

PR50 does not approve auth runtime.

PR50 does not approve audit log runtime.

PR50 does not approve rate-limit runtime.

PR50 does not approve deployment.

PR50 does not approve package/dependency changes.

PR50 does not approve UI.

PR50 does not approve public npm publishing.
