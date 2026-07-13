# MCP Remote Security Test Matrix

> Current authority, 2026-07-13: this file preserves the historical PR43
> matrix. Current implementation authority and mandatory pre-runtime gates are
> in docs/decisions/2026-07-13-stateless-remote-mcp-commercial-beta-contract.md.
> Where the documents conflict, that canonical PR136 contract supersedes
> future-work sequencing and blocked defaults, not the historical PR43 facts.

## Status

PR43 is docs/contract-tests only.

PR43 defines the minimum security gates and test categories that any future remote MCP runtime approval PR must satisfy before implementation.

Remote MCP remains blocked after PR43.

Local STDIO remains the only approved MCP runtime.

PR43 does not approve remote MCP runtime implementation.

PR43 does not re-check current official docs because it makes no new transport, auth, package, runtime, or provider-compatibility decision.

Current official documentation state in PR43: Unknown.

Future runtime approval PRs must re-check current official MCP and provider docs at that time.

## Source Documents

- Reference PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- Reference PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- Reference PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- Reference PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- `docs/MCP_TOOL_CONTRACT.md`.
- `src/mcp/stdio-protocol.ts`.
- `bin/norma-core-mcp-stdio.mjs`.
- `package.json`.
- `package-lock.json`.

## Non-Approval Boundary

PR43 does not approve remote MCP runtime implementation.

PR43 does not approve HTTP, SSE, Streamable HTTP, or WebSocket runtime.

PR43 does not approve OAuth, auth, or token runtime.

PR43 does not approve package metadata, dependency, package `bin`, package export, lockfile, or publish metadata changes.

PR43 does not approve:

- remote server files;
- deployment files;
- logging behavior;
- filesystem behavior;
- network behavior;
- shell behavior;
- environment-driven behavior;
- resources;
- prompts;
- sampling;
- elicitation;
- new MCP tools;
- arbitrary replay;
- `norma.replayRun` MCP exposure;
- package publication.

Current MCP tool exposure remains exactly the local STDIO allowlist:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` and arbitrary replay remain blocked as MCP exposure.

Resources, prompts, sampling, elicitation, and logging remain blocked.

## Future Runtime Approval Rule

These tests must exist before runtime implementation, not after it.

No future PR may combine the first remote runtime implementation with the first definition of these gates.

Each approved gate must include accept-path and reject-path tests.

Each matrix row must identify category, required decision, blocked default, minimum tests, and evidence.

A failing gate blocks remote MCP runtime merge.

Any future runtime PR must first prove:

- explicit remote MCP approval;
- current official MCP and provider documentation review;
- a named transport decision;
- a named authorization decision;
- a named package/dependency decision if packages change;
- a deployment policy;
- contract tests for every approved exposure;
- rejection tests for every still-blocked exposure.

## Security Gate Matrix

| Gate | Required decision | Blocked default | Minimum tests and evidence |
| --- | --- | --- | --- |
| Gate 0 - explicit approval state | A future PR must explicitly approve remote MCP and name the exact runtime scope. | Remote MCP is blocked and local STDIO remains the only approved runtime. | approval-state tests must assert that no earlier PR is treated as runtime approval and that a missing approval blocks merge. |
| Gate 1 - transport and protocol boundary | A future PR must define transport selection and rejection of non-approved transports, protocol version policy, Origin validation, CORS policy, localhost binding policy, session model, session ID entropy and binding, and DNS rebinding defenses. | HTTP, SSE, Streamable HTTP, and WebSocket runtime remain blocked. | transport rejection tests must cover unsupported transports, invalid Origin, forbidden CORS, invalid protocol version, unsafe localhost binding, weak session IDs, and DNS rebinding behavior. |
| Gate 2 - authorization and token boundary | A future PR must define MCP HTTP authorization, protected resource metadata, audience/resource validation, scope enforcement, token passthrough prevention, token retention policy, token logging policy, and `WWW-Authenticate` behavior. | OAuth, auth, token parsing, token storage, bearer-token handling, environment-token behavior, and auth middleware remain blocked. | auth failure tests must cover missing tokens, invalid audience/resource, insufficient scope, token passthrough, token logging, metadata failures, and challenge behavior. |
| Gate 3 - tool exposure and tool-risk boundary | A future PR must define allowed-tools enforcement, per-tool risk classification, tool metadata and output prompt-injection tests, and no hidden instructions in tool outputs. | Current MCP tool exposure remains exactly the local STDIO allowlist. | allowed-tools tests and tool-risk tests must prove exact exposure, reject unapproved tools, and verify safe metadata and structured outputs. |
| Gate 4 - replay and source-truth boundary | A future PR must preserve that MCP must not create Norma truth, Prompt text is never source truth, and Artifacts are derived and never source truth. | no `norma.replayRun` MCP exposure, arbitrary replay, source-truth forgery, artifact-as-truth confusion, and agent-generated hidden defaults remain blocked. | replay abuse tests, arbitrary replay rejection, and source-truth preservation tests must reject arbitrary replay, protect source refs/output refs, preserve pack locks and operation context, and prevent interface-generated defaults from changing core outcomes. |
| Gate 5 - resources, prompts, sampling, elicitation, and logging boundary | A future PR must separately approve any resources, prompts, sampling, elicitation, or logging behavior. | no resources/prompts unless separately approved; no sampling/elicitation/logging unless separately approved. | resource and prompt absence tests must prove these surfaces are absent unless approved, and logging tests must prove no default source-object or token leakage. |
| Gate 6 - package, dependency, and publish metadata boundary | A future PR must approve exact packages and versions before install or publish metadata changes. | Package metadata, dependencies, package `bin`, package export, lockfile, publish metadata, MCP SDK dependency, and package publication remain blocked. | package drift tests must include package/dependency/bin/export/lockfile drift tests, no MCP SDK dependency unless separately approved, dependency-tree checks, lockfile checks, and rollback evidence. |
| Gate 7 - runtime side-effect and deployment boundary | A future PR must define deployment policy and any remote runtime side effects. | Remote server files, deployment files, filesystem behavior, network behavior, shell behavior, and environment-driven behavior remain blocked. | runtime side-effect absence tests and deployment policy tests must prove no filesystem, network, shell, or environment-driven behavior unless separately approved, and must verify the named deployment boundary. |
| Gate 8 - abuse, denial-of-service, and error boundary | A future PR must define replay abuse controls, rate limits, body size limits, timeout behavior, and structured errors with no client-visible stack traces. | Remote denial of service behavior, replay amplification, unbounded request bodies, unbounded runtime, and raw exception exposure remain blocked. | abuse limit tests and structured error tests must cover rate limits, body size limits, timeout behavior, invalid JSON-RPC, invalid tool args, and no stack traces, file paths, or raw exception objects in client-visible errors. |
| Gate 9 - observability, redaction, and retention boundary | A future PR must define data retention policy and log redaction policy before any logging or telemetry. | Logging, telemetry, token retention, source-object retention, and client-data retention remain blocked. | redaction tests and retention tests must prove tokens are never logged, source objects are not logged by default, retention duration is explicit, and deletion/rollback behavior is defined. |

## Contract Test Categories

Future remote MCP runtime PRs must include these contract test categories before implementation:

- approval-state tests;
- transport rejection tests;
- auth failure tests;
- allowed-tools tests;
- tool-risk tests;
- replay abuse tests;
- source-truth preservation tests;
- resource and prompt absence tests;
- package drift tests;
- runtime side-effect absence tests;
- deployment policy tests;
- abuse limit tests;
- structured error tests;
- redaction tests;
- retention tests.

These categories are minimum coverage, not an implementation plan.

Passing these tests does not itself approve runtime. A future PR must still explicitly approve the runtime scope and keep all unapproved surfaces blocked.

## Required Runtime PR Evidence

Any future remote MCP runtime approval PR must include evidence for every applicable gate:

- the source document or official reference used for the gate;
- the exact decision being approved;
- the blocked default being preserved when not approved;
- accept-path test names;
- reject-path test names;
- command output proving the tests ran;
- package metadata and lockfile diff evidence when package state changes;
- deployment policy evidence when deployment is approved;
- rollback or removal evidence for new runtime, package, auth, or deployment surfaces.

Unknown decisions must be written as Unknown and remain blocked.

Missing evidence keeps the gate blocked.

## Package and Dependency Boundary

PR43 keeps all package/dependency work blocked.

No package/dependency candidate may be installed based on PR43.

No package-only install PR is authorized by PR43.

No MCP SDK dependency is approved by PR43.

No package metadata, dependency, package `bin`, package export, lockfile, or publish metadata change is approved by PR43.

Dependency-free remote MCP implementation is also not approved by PR43. Dependency choice is separate from runtime approval.

## Final Decision

Remote MCP remains blocked after PR43.

Local STDIO remains the only approved MCP runtime.

PR43 defines only the minimum future security test matrix.

PR43 does not approve remote MCP runtime implementation.

PR43 does not approve package, dependency, package metadata, lockfile, runtime, deployment, auth, logging, resource, prompt, sampling, elicitation, or tool exposure changes.
