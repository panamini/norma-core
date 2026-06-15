# Remote MCP Tool Exposure Policy

## Status

PR46 is docs/contract-tests only.

PR46 defines the remote MCP tool exposure policy that any future remote MCP runtime approval PR must satisfy before exposing tools over a remote transport.

Remote MCP remains blocked after PR46.

Local STDIO remains the only approved MCP runtime.

PR46 does not approve remote MCP runtime implementation.

PR46 does not approve remote tool exposure.

PR46 does not re-check current official docs because it makes no new transport, auth, package, runtime, deployment, or provider-compatibility decision.

Current official documentation state in PR46: Unknown.

Future remote MCP runtime or tool exposure approval PRs must re-check current official MCP and provider docs at that time.

## Decision

Future remote MCP tool exposure, if ever approved, must start from an explicit allowlist.

Future remote MCP tool exposure must not inherit local STDIO tools automatically.

Any future remote MCP tool exposure requires a separate explicit approval PR and contract tests before implementation.

No remote MCP tool exposure is approved by PR46.

## Source Documents

- Reference PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- Reference PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- Reference PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- Reference PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- Reference PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- Reference PR44 deployment policy decision: `docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md`.
- Reference PR45 decision doc location policy: `docs/decisions/2026-06-15-mcp-decision-doc-location-policy.md`.
- `docs/MCP_TOOL_CONTRACT.md`.
- `src/mcp/stdio-protocol.ts`.
- `bin/norma-core-mcp-stdio.mjs`.
- `package.json`.
- `package-lock.json`.

## Current Local STDIO Tool Allowlist

The current local STDIO MCP tool allowlist remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

This allowlist describes the current local STDIO boundary only.

PR46 does not change local STDIO tool exposure.

PR46 does not copy this allowlist into a remote transport.

## Remote Tool Exposure Non-Approval Boundary

Remote MCP tool exposure remains blocked.

PR46 does not approve remote `tools/list`.

PR46 does not approve remote `tools/call`.

PR46 does not approve:

- remote `tools/list`;
- remote `tools/call`;
- remote tool metadata;
- remote tool execution;
- remote allowed-tools configuration;
- remote per-tool risk classification as implementation;
- remote client approval behavior;
- remote sensitive-action approval behavior.

No future PR may treat PR46 as remote tool exposure approval.

## Tool Inheritance Boundary

Future remote MCP tool exposure must not inherit tools automatically from local STDIO.

Future remote MCP tool exposure must define an exact remote allowlist before implementation.

Future remote MCP tool exposure must separately justify each tool by risk classification, source-truth impact, prompt-injection risk, output shape, abuse controls, and contract tests.

An empty or missing remote allowlist means no remote tools are approved.

## Replay Exposure Boundary

`norma.replayRun` remains blocked as MCP exposure.

No future PR may expose `norma.replayRun` unless a separate explicit approval PR changes this policy with security rationale and contract tests.

Arbitrary replay remains blocked.

`norma.replayMvpDemo` remains fixed-demo-only.

`norma.replayMvpDemo` must reject caller-supplied replay inputs, including `run`, `mvpDemoInput`, `recordedMvpResult`, `sourceObjects`, `packLock`, `operationContext`, `expectedOutputRefs`, `artifactFreshnessInputs`, and `requireFreshArtifacts`.

## Resources Prompts Sampling Elicitation Logging Boundary

Resources remain blocked.

Prompts remain blocked.

Sampling remains blocked.

Elicitation remains blocked.

Logging remains blocked.

Telemetry remains blocked.

Retention remains blocked.

No resource, prompt, sampling, elicitation, logging, telemetry, or retention behavior is approved by PR46.

## Prohibited Tool Categories

PR46 approves no file tools.

PR46 approves no network tools.

PR46 approves no shell tools.

PR46 approves no mutation tools.

PR46 approves no creative tools.

PR46 approves no recommendation tools.

PR46 approves no beauty tools.

PR46 approves no intent-inference tools.

PR46 approves no package publication tools.

## Required Future Tool Exposure Gates

Any future remote MCP tool exposure PR must define and test:

- explicit remote MCP approval state;
- exact remote transport and auth boundary;
- exact remote tool allowlist;
- rejection of every unapproved tool;
- per-tool risk classification;
- tool metadata safety;
- tool output prompt-injection controls;
- source-truth preservation;
- replay abuse controls;
- body size, rate limit, and timeout policy if remote runtime is approved;
- structured error policy with no client-visible stack traces;
- package, dependency, runtime, deployment, and observability boundaries;
- rollback and removal path.

Missing, Unknown, or untested gates keep remote tool exposure blocked.

## Required Future Tool Exposure Tests

Any future remote MCP tool exposure PR must include exact allowlist tests and denylist tests before implementation.

Required tests must prove:

- remote MCP was explicitly approved in that future PR;
- the exact remote tool allowlist is documented;
- no tool is inherited automatically from local STDIO;
- `tools/list` exposes exactly the approved remote allowlist;
- `tools/call` rejects unapproved tool names;
- `norma.replayRun` remains blocked unless separately approved by policy change;
- `norma.replayMvpDemo` rejects caller-supplied replay inputs;
- resources, prompts, sampling, elicitation, and logging remain absent unless separately approved;
- file, network, shell, mutation, creative, recommendation, beauty, and intent-inference tools remain blocked unless separately approved;
- package, dependency, runtime, and deployment drift is absent unless separately approved.

Passing these tests does not itself approve remote runtime. A future PR must still explicitly approve the runtime scope and keep all unapproved surfaces blocked.

## Package Runtime and Deployment Boundary

PR46 does not approve package metadata changes.

PR46 does not approve dependency changes.

PR46 does not approve package `bin` changes.

PR46 does not approve package export changes.

PR46 does not approve lockfile changes.

PR46 does not approve an MCP SDK dependency.

PR46 does not approve HTTP, SSE, Streamable HTTP, or WebSocket runtime.

PR46 does not approve OAuth, auth, token, or environment-driven behavior.

PR46 does not approve remote server files.

PR46 does not approve deployment files.

PR46 does not approve filesystem, network, or shell behavior.

Local STDIO remains the only approved MCP runtime.

## Final Decision

Remote MCP remains blocked after PR46.

Local STDIO remains the only approved MCP runtime.

The current local STDIO MCP tool allowlist remains exactly `norma.getVersion`, `norma.serializeCanonicalJson`, `norma.verifyRun`, `norma.verifyArtifactFreshness`, and `norma.replayMvpDemo`.

PR46 does not approve remote MCP runtime implementation.

PR46 does not approve remote MCP tool exposure.

Future remote MCP tool exposure must be explicitly approved and must not inherit tools automatically.

Any new MCP tool exposure requires a separate future approval PR and contract tests.

`norma.replayRun` remains blocked as MCP exposure.

`norma.replayMvpDemo` remains fixed-demo-only and must reject caller-supplied replay input.

Resources, prompts, sampling, elicitation, logging, telemetry, retention, package, dependency, runtime, deployment, auth, file, network, shell, mutation, creative, recommendation, beauty, and intent-inference changes remain blocked unless separately approved.
