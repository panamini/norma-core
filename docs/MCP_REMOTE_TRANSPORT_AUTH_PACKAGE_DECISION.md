# MCP Remote Transport/Auth/Package Decision

## Status

PR41 is docs/contract-tests only.

PR41 decides the future remote MCP transport/auth/package path in principle only.

Remote MCP remains blocked after PR41 unless future-candidate language is explicitly scoped.

Local STDIO remains the only approved MCP runtime.

PR41 does not implement remote MCP.

## Decision

Remote MCP remains blocked.

Streamable HTTP is approved as a future transport candidate only.

The MCP HTTP authorization model is approved as a future auth candidate only.

No package/dependency candidate or change is approved by PR41.

No runtime implementation is approved by PR41.

## Source Documents

- Reference PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- Reference PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- `docs/MCP_TOOL_CONTRACT.md`.
- `src/mcp/stdio-protocol.ts`.
- `bin/norma-core-mcp-stdio.mjs`.
- `package.json`.
- `package-lock.json`.
- Internal wiki reference configured by `NORMA_CORE_WIKI_PATH`: `raw/Norma Core Business Readiness Roadmap.md`.
- Internal wiki reference configured by `NORMA_CORE_WIKI_PATH`: `raw/pr agent.md`.

## Official References Checked

Access date: 2026-06-15.

| URL | Reason checked | Decision effect |
| --- | --- | --- |
| https://modelcontextprotocol.io/specification/2025-11-25/changelog | Confirm latest official MCP spec version after the repo's current `2025-06-18` runtime protocol version. | Latest spec status does not approve PR41 runtime changes. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/transports | Confirm current official transport terminology and standard transport mechanisms. | Streamable HTTP is approved as a future candidate only; local STDIO remains current. |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization | Confirm HTTP authorization requirements and STDIO authorization boundary. | MCP HTTP authorization is approved as a future candidate only; no auth runtime is approved. |
| https://modelcontextprotocol.io/specification/2025-11-25/server/tools | Confirm tool exposure, approval, and safety terminology. | The current five-tool allowlist remains unchanged; no new tool exposure is approved. |
| https://developers.openai.com/api/docs/guides/tools-connectors-mcp | Confirm OpenAI remote MCP terminology for `server_url`, `authorization`, `allowed_tools`, and approvals. | OpenAI compatibility remains a later-gate concern; PR41 does not approve runtime or dependency changes. |
| https://developers.openai.com/api/docs/mcp | Confirm OpenAI safety guidance for custom remote MCP servers. | Reinforces prompt-injection, trust, and data-sharing gates; no decision change. |
| https://code.claude.com/docs/en/mcp | Confirm Claude Code transport terminology for stdio, HTTP, SSE, and WebSocket. | HTTP remains a future candidate concern; SSE/WebSocket are not approved by PR41. |
| https://platform.claude.com/docs/en/agents-and-tools/mcp-connector | Confirm Claude API connector requirements for public HTTP servers, Streamable HTTP/SSE, OAuth bearer tokens, and tool allowlisting. | Connector compatibility remains a future gate; local STDIO remains the only approved runtime. |

## Transport Decision

Current approved transport remains local STDIO only.

Future remote transport is approved as a future candidate only, not approved for implementation in PR41.

The only future remote transport candidate selected by PR41 is Streamable HTTP, because the current MCP specification lists STDIO and Streamable HTTP as the standard transports.

HTTP+SSE/SSE remains a provider compatibility and backward-compatibility topic for a later transport approval PR. PR41 does not approve SSE runtime.

WebSocket remains blocked as a Norma Core remote MCP transport unless a later transport approval PR explicitly reopens it with security rationale and tests.

PR41 does not approve HTTP, SSE, Streamable HTTP, or WebSocket runtime.

Any later transport approval PR must define Origin validation, CORS policy, localhost binding policy, session model, protocol version policy, body size limits, timeout policy, structured errors, and no client-visible stack traces before runtime implementation.

## Auth Decision

Current local STDIO MCP remains unauthenticated local process transport.

PR41 does not approve OAuth, auth, or token runtime.

MCP HTTP authorization is approved as a future candidate only, not approved for implementation in PR41.

Any future HTTP-based remote MCP transport must have a separate auth approval PR before runtime work.

That later auth approval PR must define the authorization server relationship, protected resource metadata, audience/resource validation, token model, token passthrough protections, scopes, `WWW-Authenticate` behavior, client registration decision, token retention policy, token logging policy, and failure status behavior.

No token storage, token parsing, OAuth flow, bearer-token handling, environment-token behavior, or auth middleware is approved by PR41.

## Package / Dependency Decision

PR41 approves no package metadata change, dependency change, package `bin` change, package export change, MCP SDK dependency, or exact future package/dependency candidate.

Any future package/dependency approval PR must compare dependency-free implementation, official SDK use, package metadata changes, lockfile changes, publication impact, supply-chain risk, update policy, and removal/rollback path before any package-only install PR.

Package files must remain unchanged in PR41.

## Runtime Non-Approval Boundary

PR41 does not implement remote MCP.

PR41 does not add:

- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth/auth/token runtime;
- remote server files;
- deployment files;
- filesystem behavior;
- network behavior;
- shell behavior;
- environment-driven behavior;
- resources;
- prompts;
- sampling;
- elicitation;
- logging.

No runtime source file may change in PR41.

## Tool Exposure Boundary

Current MCP tool exposure remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` and arbitrary replay remain blocked as MCP exposure.

Internal `replayRun` use remains allowed only for the fixed `norma.replayMvpDemo` path already approved by PR38.

PR41 does not expose file tools, network tools, shell tools, mutation tools, creative tools, recommendation tools, beauty tools, intent inference tools, or package publication tools.

## Resources / Prompts Boundary

Resources remain blocked.

Prompts remain blocked.

Sampling remains blocked.

Elicitation remains blocked.

Logging remains blocked.

No resource, prompt, sampling, elicitation, or logging behavior is approved by PR41.

## Required Future PRs

Future remote MCP still requires separate PRs for:

- transport approval PR;
- auth approval PR;
- package/dependency approval PR;
- package-only install PR;
- runtime skeleton PR;
- security test matrix PR;
- deployment policy PR;
- tool exposure review PR.

No future PR may treat PR41 as remote runtime approval.

No future PR may treat PR41 as package/dependency approval.

## Required Security Tests

Before remote MCP runtime can be implemented, future PRs must add tests for:

- transport selection and rejection of non-approved transports;
- Origin validation;
- CORS policy;
- protected resource metadata;
- audience/resource validation;
- token passthrough prevention;
- scope enforcement;
- `WWW-Authenticate` behavior;
- allowed-tools enforcement;
- per-tool risk classification;
- no `norma.replayRun` MCP exposure;
- arbitrary replay rejection;
- no resources/prompts unless separately approved;
- no sampling/elicitation/logging unless separately approved;
- no package/dependency/bin/export drift unless separately approved;
- no MCP SDK dependency unless separately approved;
- no filesystem, network, shell, or environment-driven behavior unless separately approved;
- body size limits;
- timeout behavior;
- structured errors with no client-visible stack traces;
- logging and redaction policy if logging is later approved;
- data retention policy;
- deployment policy.

These tests must exist before runtime implementation, not after it.

## Final Decision

Remote MCP remains blocked after PR41.

Local STDIO remains the only approved MCP runtime.

Streamable HTTP is approved as a future candidate only.

MCP HTTP authorization is approved as a future candidate only.

No package/dependency candidate or change is approved by PR41.

No runtime implementation is approved by PR41.

Future remote MCP still requires separate approval and implementation PRs.
