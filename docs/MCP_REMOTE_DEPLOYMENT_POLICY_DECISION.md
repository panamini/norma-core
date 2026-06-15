# MCP Remote Deployment Policy Decision

## Status

PR44 is docs/contract-tests only.

PR44 defines the minimum deployment policy gates that any future remote MCP runtime or deployment PR must satisfy before any deployed remote MCP server can be approved.

Remote MCP remains blocked after PR44.

Local STDIO remains the only approved MCP runtime.

PR44 does not approve remote MCP runtime implementation.

PR44 does not approve deployment.

PR44 does not re-check current official docs because it makes no new transport, auth, package, runtime, provider-compatibility, or deployment-target decision.

Current official documentation state in PR44: Unknown.

Future remote MCP runtime or deployment approval PRs must re-check current official MCP, provider, hosting, and deployment-platform docs at that time.

## Source Documents

- Reference PR39 threat model: `docs/MCP_REMOTE_THREAT_MODEL.md`.
- Reference PR40 approval decision: `docs/MCP_REMOTE_APPROVAL_DECISION.md`.
- Reference PR41 transport/auth/package decision: `docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md`.
- Reference PR42 package dependency decision: `docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md`.
- Reference PR43 security test matrix: `docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md`.
- `docs/MCP_TOOL_CONTRACT.md`.
- `src/mcp/stdio-protocol.ts`.
- `bin/norma-core-mcp-stdio.mjs`.
- `package.json`.
- `package-lock.json`.

## Decision

No deployment target is approved by PR44.

No deployment provider is approved by PR44.

No deployment configuration file is approved by PR44.

No CI/CD deployment workflow is approved by PR44.

No hosted, public, private, preview, staging, production, container, serverless, worker, VM, Kubernetes, or managed-platform remote MCP server is approved by PR44.

PR44 approves only the minimum deployment policy gates that future remote MCP runtime or deployment PRs must satisfy before deployment can be approved.

Unknown deployment decisions remain blocked.

## Non-Approval Boundary

PR44 does not approve:

- remote MCP runtime implementation;
- HTTP runtime;
- SSE runtime;
- Streamable HTTP runtime;
- WebSocket runtime;
- OAuth, auth, or token runtime;
- remote server files;
- deployment files;
- Docker, container, worker, serverless, VM, Kubernetes, Terraform, Helm, or infrastructure files;
- CI/CD deployment workflows;
- hosting provider configuration;
- domain, DNS, TLS, certificate, or public endpoint configuration;
- secrets, environment variables, or environment-driven behavior;
- package metadata, dependency, package `bin`, package export, lockfile, or publish metadata changes;
- logging behavior;
- telemetry behavior;
- retention behavior;
- filesystem behavior;
- network behavior;
- shell behavior;
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

Resources, prompts, sampling, elicitation, logging, telemetry, and retention remain blocked unless separately approved.

## Deployment Policy Gate Rule

These deployment policy gates must be satisfied before any deployed remote MCP server can be approved.

No future PR may combine the first deployment implementation with the first definition of these gates.

No future PR may treat PR44 as deployment approval.

No future PR may treat PR44 as remote runtime approval.

Every approved deployment gate must include accept-path and reject-path tests.

Every approved deployment gate must identify the category, required decision, blocked default, minimum tests, and evidence.

A missing, Unknown, or untested deployment policy gate blocks remote MCP deployment approval.

Deployment approval requires a separate future PR that names the exact deployment scope and keeps every unapproved surface blocked.

## Minimum Deployment Policy Gates

| Gate | Required decision | Blocked default | Minimum tests and evidence |
| --- | --- | --- | --- |
| Gate D0 - explicit deployment approval state | A future PR must explicitly approve remote MCP deployment and name the exact server, environment, and deployment scope. | Deployment remains blocked and local STDIO remains the only approved MCP runtime. | approval-state tests must assert that PR39, PR40, PR41, PR42, PR43, and PR44 are not treated as deployment or runtime approval, and that missing approval blocks merge. |
| Gate D1 - deployment target and ownership boundary | A future PR must name the deployment provider, hosting product, environment names, owner, operational responsibility, and public/private exposure model. | No deployment provider, hosted environment, public endpoint, private endpoint, preview environment, staging environment, or production environment is approved. | target-boundary tests must reject Unknown provider, Unknown environment, Unknown owner, accidental preview exposure, and undeclared public/private exposure. |
| Gate D2 - endpoint, DNS, TLS, and transport boundary | A future PR must define endpoint URL shape, domain ownership, DNS policy, TLS termination, certificate ownership, protocol version policy, Origin validation, CORS policy, and approved transport. | No domain, DNS record, TLS certificate, public endpoint, HTTP, SSE, Streamable HTTP, or WebSocket runtime is approved. | endpoint tests must reject invalid Origin, forbidden CORS, unapproved transport, non-HTTPS public endpoints, Unknown TLS termination, Unknown DNS ownership, and invalid protocol version. |
| Gate D3 - auth, audience, secrets, and environment boundary | A future PR must define authorization model, protected resource metadata, audience/resource validation, scopes, token retention, token logging, secret source, secret rotation, and environment variable allowlist. | OAuth, auth, token parsing, token storage, bearer-token handling, environment-token behavior, secrets, and environment-driven behavior remain blocked. | auth and secret tests must reject missing tokens, invalid audience/resource, insufficient scope, token passthrough, token logging, undeclared secrets, undeclared environment variables, and unredacted secret output. |
| Gate D4 - network ingress and egress boundary | A future PR must define allowed ingress, allowed egress, outbound network policy, dependency update path, DNS rebinding controls, and network isolation. | Remote network behavior, outbound fetches, undeclared ingress, undeclared egress, and DNS rebinding exposure remain blocked. | network tests must reject unexpected outbound requests, unexpected inbound methods, DNS rebinding cases, undeclared hostnames, and unapproved network clients. |
| Gate D5 - runtime process and resource boundary | A future PR must define process model, concurrency, memory limits, CPU limits, request body limits, timeout behavior, session model, session ID entropy and binding, startup/shutdown behavior, and filesystem policy. | Remote runtime processes, unbounded concurrency, unbounded bodies, unbounded runtime, filesystem access, shell access, and session behavior remain blocked. | resource tests must cover concurrency limits, body size limits, timeouts, session binding, weak session IDs, graceful shutdown, and absence of filesystem or shell access unless separately approved. |
| Gate D6 - tool exposure and source-truth boundary | A future PR must define allowed tools, per-tool risk classification, tool metadata safety, output prompt-injection controls, replay abuse controls, and source-truth preservation in the deployed boundary. | Current MCP tool exposure remains exactly the local STDIO allowlist; `norma.replayRun`, arbitrary replay, source-truth forgery, artifact-as-truth confusion, and hidden defaults remain blocked. | deployed tool tests must prove exact exposure, reject unapproved tools, reject arbitrary replay, preserve pack locks and operation context, and verify that tool metadata and outputs contain no hidden instructions. |
| Gate D7 - logging, telemetry, redaction, and retention boundary | A future PR must define whether logging or telemetry exists, log fields, redaction policy, retention duration, deletion path, access controls, and incident audit trail. | Logging, telemetry, token retention, source-object retention, client-data retention, and source-object logging remain blocked. | redaction and retention tests must prove tokens are never logged, source objects are not logged by default, retention duration is explicit, deletion is defined, and client-visible errors expose no stack traces, file paths, or raw exception objects. |
| Gate D8 - CI/CD, artifact, provenance, and rollback boundary | A future PR must define build provenance, deployment workflow, protected environments, release trigger, artifact identity, rollback path, removal path, and package/lockfile drift policy. | CI/CD deployment workflows, deployment artifacts, package metadata changes, dependency changes, lockfile changes, publish metadata changes, and deployment rollback behavior remain blocked. | CI/CD tests or checks must prove protected deployment triggers, artifact identity, rollback/removal evidence, no package/dependency/bin/export/lockfile drift unless separately approved, and no deployment workflow drift outside the approved scope. |
| Gate D9 - monitoring, abuse response, and incident boundary | A future PR must define health checks, readiness checks, abuse monitoring, rate limits, alerting, owner response path, incident severity, and shutdown criteria. | Monitoring, alerting, rate-limit behavior, abuse response, and operational incident workflow remain blocked. | operations tests must cover health/readiness behavior, rate limits, abuse thresholds, safe shutdown, structured error behavior, and evidence that operational owners can disable or roll back the deployed server. |
| Gate D10 - official docs and provider evidence boundary | A future PR must re-check current official MCP, provider, hosting, and deployment-platform docs with access dates and record decision impact before approval. | Current official documentation state is Unknown, and Unknown remains blocked. | evidence tests must require access-dated references, provider-specific deployment constraints, current MCP deployment-relevant guidance, and explicit Unknown entries for unresolved decisions. |

## Required Future Deployment PR Evidence

Any future remote MCP runtime or deployment approval PR must include evidence for every applicable deployment gate:

- explicit deployment approval statement;
- exact remote MCP server scope;
- exact deployment provider and hosting product;
- exact environment names and public/private exposure model;
- endpoint URL shape, domain ownership, DNS policy, TLS termination, and certificate ownership;
- approved transport and protocol version policy;
- Origin and CORS policy;
- authorization model, protected resource metadata, audience/resource value, scopes, and `WWW-Authenticate` behavior;
- secret inventory with values redacted;
- environment variable allowlist;
- ingress and egress policy;
- DNS rebinding defenses;
- rate limits, body size limits, concurrency limits, memory limits, CPU limits, and timeout policy;
- session model, session ID entropy, and session binding;
- filesystem, shell, and network side-effect policy;
- deployed tool allowlist and per-tool risk classification;
- replay abuse controls and source-truth preservation evidence;
- logging, telemetry, redaction, retention, deletion, and access-control policy;
- CI/CD workflow evidence and protected environment evidence;
- build artifact identity and provenance evidence;
- package metadata and lockfile diff evidence when package state changes;
- health checks, readiness checks, monitoring, alerting, incident response, and shutdown criteria;
- rollback and removal plan;
- current official MCP documentation review with access date;
- current official provider, hosting, and deployment-platform documentation review with access date;
- accept-path test names;
- reject-path test names;
- command output proving the tests ran.

Unknown decisions must be written as Unknown and remain blocked.

Missing evidence keeps deployment blocked.

## Required Deployment Contract Tests

Future remote MCP runtime or deployment PRs must include these contract test categories before deployment approval:

- deployment approval-state tests;
- deployment target-boundary tests;
- endpoint, DNS, TLS, and transport tests;
- Origin and CORS rejection tests;
- auth, audience, scope, and protected-resource tests;
- secret and environment allowlist tests;
- ingress and egress rejection tests;
- DNS rebinding tests;
- process, concurrency, body size, timeout, and resource-limit tests;
- session entropy and binding tests;
- filesystem, shell, and undeclared network absence tests;
- deployed tool allowlist tests;
- per-tool risk and tool-output prompt-injection tests;
- replay abuse and source-truth preservation tests;
- resource and prompt absence tests;
- sampling and elicitation absence tests;
- logging, telemetry, redaction, retention, and deletion tests;
- structured error and no-stack-trace tests;
- CI/CD protected-environment tests;
- artifact identity and provenance tests;
- package, dependency, bin, export, lockfile, and publish metadata drift tests;
- health, readiness, monitoring, abuse response, shutdown, rollback, and removal tests;
- official-docs evidence tests.

These categories are minimum coverage, not an implementation plan.

Passing these tests does not itself approve deployment. A future PR must still explicitly approve the deployment scope and keep all unapproved surfaces blocked.

## Package / Runtime / Tool Boundary

PR44 keeps all package/dependency work blocked.

No package/dependency candidate may be installed based on PR44.

No package-only install PR is authorized by PR44.

No MCP SDK dependency is approved by PR44.

No package metadata, dependency, package `bin`, package export, lockfile, or publish metadata change is approved by PR44.

Dependency-free remote MCP implementation is also not approved by PR44. Dependency choice is separate from runtime and deployment approval.

Current runtime remains local STDIO only.

No remote server files or deployment files are approved by PR44.

Current MCP tool exposure remains exactly:

```txt
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
```

`norma.replayRun` and arbitrary replay remain blocked as MCP exposure.

Resources, prompts, sampling, elicitation, logging, telemetry, and retention remain blocked.

## Final Decision

Remote MCP remains blocked after PR44.

Local STDIO remains the only approved MCP runtime.

PR44 defines only the minimum future deployment policy gates.

PR44 does not approve remote MCP runtime implementation.

PR44 does not approve deployment.

PR44 does not approve package, dependency, package metadata, lockfile, runtime, deployment, auth, logging, telemetry, retention, resource, prompt, sampling, elicitation, or tool exposure changes.
