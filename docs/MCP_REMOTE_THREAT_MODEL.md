# MCP Remote Threat Model

## Status

Remote MCP implementation is not approved.

Current approved MCP transport is local STDIO only.

PR39 is a threat model and approval gate only. It adds no runtime MCP implementation.

This document complements `docs/MCP_TOOL_CONTRACT.md` and does not override any local-only MCP guardrail from PR33 through PR38.

## Current MCP State

The current Norma Core MCP state is:

- PR33: MCP tool contract docs only.
- PR34: local STDIO JSON-RPC skeleton.
- PR35: local `tools/list` discovery.
- PR36: local `tools/call` for `norma.getVersion` and `norma.serializeCanonicalJson`.
- PR37: local `tools/call` for `norma.verifyRun` and `norma.verifyArtifactFreshness`.
- PR38: local `tools/call` for fixed `norma.replayMvpDemo`.

Current runtime remains local STDIO only.

Current runtime has no resources, no prompts, no sampling, no elicitation, no remote transport, no auth, no package metadata change, and no MCP SDK dependency.

## Remote MCP Non-Approval

This document does not approve remote MCP.

This document does not approve HTTP, SSE, Streamable HTTP, WebSocket, deployment, auth implementation, package publication, new tools, resources, prompts, sampling, elicitation, logging capability, or any remote server runtime.

Future implementation requires a separate explicit approval PR.

## Assets

Assets to protect before any future remote MCP work:

- structured source objects;
- run envelopes;
- pack locks;
- operation contexts;
- source refs;
- output refs;
- artifacts;
- canonical JSON outputs;
- verification outputs;
- replay outputs;
- package identity;
- user trust;
- repository integrity;
- future credentials and tokens if remote is ever approved.

## Trust Boundaries

Important boundaries:

- local STDIO client boundary;
- remote HTTP client boundary;
- authorization server boundary;
- MCP server boundary;
- package/runtime boundary;
- core engine boundary;
- artifact boundary;
- LLM/agent boundary;
- logs/telemetry boundary;
- future deployment boundary.

## Threats

Remote MCP must account for at least these threats:

- DNS rebinding against a local server;
- unvalidated Origin headers;
- token theft;
- token passthrough;
- missing token audience validation;
- confused deputy behavior;
- prompt injection through tool descriptions or tool outputs;
- tool poisoning or malicious tool metadata;
- malicious client requests for sensitive operations;
- arbitrary replay misuse;
- source-truth forgery;
- artifact-as-truth confusion;
- filesystem access escalation;
- network exfiltration;
- shell execution;
- package publication drift;
- dependency supply chain risk;
- resource and prompt data leakage;
- overbroad tool exposure;
- CORS misconfiguration;
- session hijacking;
- insecure session IDs;
- logs leaking source objects or tokens;
- remote denial of service;
- replay amplification;
- stale artifact misuse;
- version and protocol confusion.

## Required Controls Before Remote MCP

Before remote MCP can be implemented, Norma Core needs a separate approval PR covering:

- explicit remote MCP approval;
- transport design;
- auth design;
- token model;
- audience/resource validation;
- OAuth 2.1 / protected resource metadata decision;
- WWW-Authenticate behavior decision;
- scope model;
- allowlist of tools;
- per-tool risk classification;
- explicit no-resources/no-prompts decision or separate approval;
- Origin validation;
- CORS policy;
- localhost binding policy for any local HTTP mode;
- session model;
- session ID entropy and binding;
- rate limits;
- body size limits;
- timeout policy;
- structured error policy;
- no stack traces in client-visible errors;
- log redaction policy;
- data retention policy;
- replay-specific abuse controls;
- threat model review;
- tests before runtime implementation.

## Tool Risk Classification

Current local STDIO tools:

- `norma.getVersion`: low risk, metadata only.
- `norma.serializeCanonicalJson`: medium risk, input echo and canonicalization; must have body-size limits if remote.
- `norma.verifyRun`: medium/high risk, structured user-provided run envelopes; source-truth integrity required.
- `norma.verifyArtifactFreshness`: medium/high risk, artifact and source-ref integrity required.
- `norma.replayMvpDemo`: low/medium risk only because it is fixed demo replay; must remain fixed demo unless separately approved.

Explicitly blocked:

- `norma.replayRun`: blocked.
- arbitrary replay: blocked.
- file tools: blocked.
- network tools: blocked.
- shell tools: blocked.
- mutation tools: blocked.
- creative, recommendation, beauty, and intent tools: blocked.
- resources: blocked.
- prompts: blocked.

## Data Policy

MCP must not create Norma truth.

Prompt text is never source truth.

Artifacts are derived and never source truth.

Remote clients must not infer missing pack locks, operation contexts, refs, or source objects.

Future remote MCP must define data retention before implementation.

Future remote MCP must define redaction before implementation.

Tokens must never be logged.

Source objects must not be logged by default.

## Error Policy

Protocol and input errors must be structured.

Remote clients must not receive stack traces, file paths, or raw exception objects.

If remote MCP is later approved, auth failures must use correct HTTP status codes and standards-compatible challenge behavior.

Domain verification or replay mismatches are not protocol errors.

## Approval Gate

Remote MCP remains blocked until a future PR answers:

- Which transport?
- Which auth provider?
- Which OAuth scopes?
- Which audience/resource value?
- Which tools are exposed?
- Are resources and prompts still blocked?
- Are all write and mutation tools blocked?
- What logging exists?
- What data retention exists?
- What rate limits exist?
- What body size limits exist?
- What abuse monitoring exists?
- What deployment environment?
- What local-vs-remote boundary?
- What tests must pass?

## Proposed Sequence After PR39

- PR40: remote MCP approval decision only, no runtime.
- PR41: transport/auth design docs only, if approved.
- PR42: package/dependency approval only, if needed.
- PR43: remote skeleton only, no real data, no `tools/call`, if approved.
- PR44: auth metadata and protected resource metadata tests, if approved.
- PR45: remote `tools/list` only, if approved.
- PR46: remote `tools/call` for low-risk tools only, if approved.

If numbering conflicts with future repo history, treat this as the proposed sequence after PR39.

## Final Decision

Remote MCP remains blocked after PR39.

Local STDIO remains the only approved MCP runtime.

No remote implementation is approved by this document.
