# Private Hosted MCP Operating Model Decision

## Status

accepted

This decision selects the next operating model after the private Structured
Analyze rail. It does not approve deployment or public submission.

Implementation remains blocked until the ownership, security, cost, logging,
and rollback decisions below are explicit.

## Context

The mandatory private Structured Analyze rail is complete through R7.2.

Current `main` exposes exactly six local STDIO MCP tools:

```text
norma.getVersion
norma.serializeCanonicalJson
norma.verifyRun
norma.verifyArtifactFreshness
norma.replayMvpDemo
norma.analyzeStructuredCompositionV1
```

The private ChatGPT Draft connector has been proven for the current six-tool
inventory at the PR113 / R6D smoke checkpoint. PR117 added test-only hardening,
not runtime tool behavior. Local manual Secure MCP Tunnel usage works for
private proof, and the app remains private/developer-only.

Hosting and public app submission remain optional. Remote CI billing or
spending-limit failures are infrastructure/account state, not product readiness
signals.

Current official documentation checked on 2026-06-26 supports a remote HTTPS
MCP shape for always-on use:

- OpenAI Apps SDK deployment docs require a stable HTTPS endpoint with
  low-latency streaming responses on `/mcp`, dependable TLS, logs, and metrics.
- OpenAI ChatGPT connector docs allow private developer-mode connector testing
  with a reachable HTTPS MCP server and keep public app publishing separate.
- Cloudflare Agents MCP docs describe remote MCP servers using Streamable HTTP
  and identify `createMcpHandler()` as the simplest stateless path.
- Cloudflare authorization docs and the MCP authorization specification require
  an OAuth 2.1-compatible authorization shape for protected MCP servers.
- Vercel MCP docs describe an MCP host using `mcp-handler`, Streamable HTTP
  client configuration, and OAuth metadata support.

## Decision

Selected operating model:

```text
PLAN_PRIVATE_ALWAYS_ON_HOSTING
```

Preferred target:

```text
PLAN_PRIVATE_ALWAYS_ON_HOSTING_CLOUDFLARE
```

Preferred architecture, pending explicit approvals:

- Cloudflare Workers/Agents hosted private MCP endpoint.
- Streamable HTTP transport.
- `createMcpHandler()` first if the deployed tools remain stateless enough.
- Cloudflare Access, third-party OAuth, or an owned OAuth provider before any
  protected endpoint goes live.
- No unauthenticated public endpoint.
- No public ChatGPT app submission in this decision.

Fallback:

- Vercel plus `mcp-handler` if ChatGPT Apps UI components or Next.js-hosted app
  behavior become the dominant product requirement.

Do not choose a self-managed VPS or custom server for the next slice unless
Cloudflare and Vercel are blocked by a concrete Norma runtime requirement such
as required native binaries, persistent local filesystem behavior, heavy
long-running jobs, or strict infrastructure ownership.

This decision changes the older conservative default from stopping at
private/manual usage to planning a private always-on hosted MCP endpoint. It
does not authorize implementation.

## Non-goals

This PR does not approve or implement:

- hosted deployment;
- public submission;
- new MCP tools;
- new auth or OAuth runtime;
- a new endpoint;
- cloud configuration;
- secrets or environment variables;
- CI deployment workflows;
- image, vision, camera, CAD, plugin, or UI work;
- prompt-to-geometry inference;
- package publication.

## Operating options considered

| Option | Benefit | Cost or risk | Required next approval |
| --- | --- | --- | --- |
| Private manual/local tunnel | Lowest operational burden; keeps current private proof usable. | Not always-on; weak fit for reusable ChatGPT/Codex/Claude/Gemini-style client access. | None if remaining manual; provider and ops approval if revisited. |
| Private always-on hosted endpoint | Best fit for reusable cross-client MCP while staying private. | Requires provider, auth, budget, logging, monitoring, incident, retention, and rollback decisions. | Provider-specific hosting plan or implementation fiche before code. |
| Public ChatGPT app submission | Makes Norma discoverable to broader ChatGPT users later. | Requires public product, privacy, support, safety, submission, and review obligations. | Submission-readiness audit only, not deployment or submission. |
| New product-use-case architecture | Useful if image, CAD, plugin, or other adapter direction should precede hosting. | Delays operational proof and can reopen product scope. | Docs/architecture decision only. |

## Required approvals before private always-on hosting

Implementation remains blocked until a later PR explicitly records:

- provider and hosting product;
- monthly budget;
- provider account owner;
- secrets owner;
- deployment owner;
- monitoring owner;
- incident and rollback owner;
- data retention stance;
- logging and redaction stance;
- auth and access model;
- allowed users or organizations;
- allowed tools;
- rate limits and request size limits;
- domain or subdomain choice if needed;
- abuse policy;
- rollback and removal path.

## Required approvals before public submission

Public submission remains blocked until a later audit records:

- publisher identity;
- domain;
- privacy policy;
- support contact;
- app description;
- screenshots and assets;
- data handling statement;
- safety and prompt-injection review;
- review process owner.

## Guardrails preserved

- Structured data remains source truth.
- Artifacts remain derived.
- No prompt or prose as geometry source.
- No image, camera, or vision input.
- No CAD or plugin behavior.
- No beauty score.
- No recommendation.
- No optimization.
- No intent inference.
- No generated rules.
- No implicit pack.
- No implicit ratio.
- No hidden tolerance.
- No public app submission without explicit later approval.
- No unauthenticated public endpoint.

Norma does not decide which composition is better. Norma reports which
composition is closer to the explicitly declared proportional system.

## Next allowed PRs

Allowed next PRs after this decision:

- provider-specific private hosted MCP planning fiche;
- Cloudflare-specific private hosted MCP implementation approval plan;
- Vercel fallback decision only if ChatGPT Apps UI becomes the dominant product
  requirement;
- public submission readiness audit only;
- new product-use-case architecture decision only.

No code deployment is allowed until provider, budget, secrets, auth, logging,
monitoring, incident, and rollback ownership are explicit.

## Rollback

Rollback is reverting this decision document and its roadmap/runbook links only.

No runtime, package, tunnel, cloud, DNS, secret, CI, or ChatGPT app cleanup is
required because this decision creates no external state.
