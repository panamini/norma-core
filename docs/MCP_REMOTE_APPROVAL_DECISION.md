# MCP Remote Approval Decision

> Current authority, 2026-07-13: this file preserves the historical PR40
> decision. Current implementation authority is
> docs/decisions/2026-07-13-stateless-remote-mcp-commercial-beta-contract.md.
> Where the documents conflict, that canonical PR136 contract supersedes
> future-work sequencing and blocked defaults, not the historical PR40 facts.

## Status

PR40 is docs/contract-tests only.

PR40 records the explicit remote MCP approval decision after PR39.

Reference: `docs/MCP_REMOTE_THREAT_MODEL.md`.

PR39 established a threat model and approval gate. It did not approve remote MCP runtime implementation.

## Decision

Remote MCP remains blocked after PR40.

Local STDIO remains the only approved MCP runtime.

PR40 does not approve remote runtime implementation.

PR40 approves only a future decision path and gate for remote MCP work.

## Non-Approval Boundary

PR40 does not approve:

- remote MCP runtime implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth runtime;
- auth runtime;
- token runtime;
- package metadata changes;
- dependency changes;
- package `bin` changes;
- package export changes;
- deployment files;
- remote server files;
- resources;
- prompts;
- sampling;
- elicitation;
- logging;
- filesystem behavior;
- network behavior;
- shell behavior;
- environment-driven behavior.

No HTTP, SSE, Streamable HTTP, or WebSocket runtime is approved.

No OAuth, auth, or token runtime is approved.

No package/dependency/bin/export change is approved.

## Required Future PRs

Any future remote MCP work requires separate future PRs for:

- transport;
- auth;
- package/dependencies;
- runtime;
- deployment;
- observability/logging policy;
- tool exposure;
- security test matrix.

These future PRs must be reviewed and accepted before any runtime behavior is implemented.

## Required Security Controls

Before remote MCP runtime can be considered, future PRs must define and test:

- explicit remote MCP approval;
- transport design;
- auth model;
- token model;
- audience and protected resource validation;
- allowed-tools configuration;
- per-tool risk classification;
- Origin validation;
- CORS policy;
- session model;
- rate limits;
- body size limits;
- timeout policy;
- structured error policy;
- no client-visible stack traces;
- replay abuse controls;
- data retention policy;
- log redaction policy;
- security test matrix.

## Tool Exposure Decision

The only current MCP tool exposure remains the local STDIO allowlist:

- `norma.getVersion`;
- `norma.serializeCanonicalJson`;
- `norma.verifyRun`;
- `norma.verifyArtifactFreshness`;
- `norma.replayMvpDemo`.

norma.replayRun and arbitrary replay remain blocked as MCP exposure.

File tools, network tools, shell tools, mutation tools, creative tools, recommendation tools, beauty tools, intent inference tools, and package publication tools remain blocked.

## Resources / Prompts Decision

Resources and prompts remain blocked.

Sampling, elicitation, and logging remain blocked.

No resource, prompt, sampling, elicitation, or logging behavior is approved by PR40.

## Package / Dependency Decision

PR40 approves no package metadata change.

PR40 approves no dependency change.

PR40 approves no package `bin` change.

PR40 approves no package export change.

The package remains private unless a separate future package-readiness PR approves otherwise.

## Runtime Boundary

Current runtime remains local STDIO only.

PR40 does not add a remote runtime, remote transport, auth layer, deployment target, network behavior, filesystem behavior, shell behavior, or environment-driven behavior.

Remote clients must not be treated as approved until a later PR explicitly approves transport, auth, runtime, package/dependency changes, deployment, tool exposure, observability/logging policy, and security tests.

## Tests Required Before Runtime

Before any remote MCP runtime is implemented, future PRs must include tests for:

- transport and auth decisions;
- protected resource and audience validation;
- allowed-tools enforcement;
- per-tool security boundaries;
- no resources or prompts unless separately approved;
- no sampling or elicitation unless separately approved;
- logging and redaction policy;
- rate limits, body size limits, and timeout behavior;
- no package/dependency/bin/export drift unless separately approved;
- rejection of `norma.replayRun` and arbitrary replay unless separately approved.

These tests must exist before runtime implementation, not after it.

## Final Decision

Remote MCP remains blocked after PR40.

Local STDIO remains the only approved MCP runtime.

PR40 does not approve remote runtime implementation.

Future remote MCP requires separate approval and implementation PRs.
