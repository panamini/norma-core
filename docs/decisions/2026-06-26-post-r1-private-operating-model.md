# Post-R1 Roadmap State and Private Operating Model

## Status

accepted

## Context

The mandatory private Structured Analyze rail is complete through R6D and the
post-R1/R7.2 hardening work.

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
inventory at the PR113 / R6D smoke checkpoint. Local/manual Secure MCP Tunnel
usage works for private proof, and the app remains private/Draft.

PR #115 / R1 merged duplicate geometry source identity rejection. PR #116 /
R1.1 merged `fix: preserve measurement anchor target refs`. It was not the
roadmap, operations, or operating-model checkpoint.
PR #117 / R7.2 merged Structured Analyze boundary hardening tests.

Remote CI billing or spending-limit failures, when present, are
infrastructure/account state and not product readiness signals.

Hosted MCP and public app submission remain optional later work only.

## Decision

```text
STOP_PRIVATE_MANUAL
```

State:

- no new hosted endpoint now;
- no public submission now;
- run Secure MCP Tunnel only when needed;
- continue using the private ChatGPT Draft app;
- revisit hosting only with explicit provider, budget, secrets, deployment,
  monitoring, incident, rollback, retention, auth/access, and domain ownership;
- revisit public submission only through a submission-readiness audit.

## Completed roadmap

- R1 duplicate geometry source identity rejection
- R1.1 anchor target-ref correction
- R2 outputSchema rail
- R3 non-canonical structured inputs
- R4 operations runbook
- R5 adapter architecture / Structured Analyze selection
- R6A contract
- R6A.1 executable contract amendment
- R6B direct operation
- R6C MCP tool exposure
- R6D ChatGPT `_meta` compatibility and private checkpoint
- R7.2 Structured Analyze hardening tests

## Optional later work

- R7B private always-on hosted MCP
- R8A public submission readiness audit
- new product adapter architecture

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

## Required approvals before private always-on hosting

Implementation remains blocked until a later PR explicitly records:

- provider;
- monthly budget;
- secrets owner;
- deployment owner;
- monitoring owner;
- incident and rollback owner;
- data retention stance;
- auth and access model;
- domain or subdomain choice if needed.

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

- no mandatory next code PR;
- optional `R7B` private hosted MCP planning/implementation only after explicit
  approvals;
- optional `R8A` public submission-readiness audit only if publication is
  desired;
- optional new product-use-case architecture decision.

## Rollback

Revert this decision document and its roadmap/runbook links only.

No runtime, package, tunnel, cloud, DNS, secret, CI, or ChatGPT app cleanup is
required because this decision creates no external state.
