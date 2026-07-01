# Integration Unlock Contracts

## Status

Approved as a docs/tests-only unlock contract.

PR88 unlocks explicit planning for hosted MCP, private/dev ChatGPT connector,
image/CAD/Figma/provider adapters, and package/publication readiness. It does
not approve implementation of those surfaces.

## Context

PR87 merged as PR #167 at
`ccd8e8c03403cbf4fd080b11c77fd59bbdba41bf` and recorded the post-PR86
roadmap truth. Local operator validation after that merge confirmed the current
local demo, report, and MCP surfaces still work from the merged main state.

PR86 remains the accepted-geometry bridge closeout baseline. The
accepted-geometry mapper and shared-unit-surface normalizer are package-private,
and metric policy coherence across normalized output compositions remains a
required invariant.

## Decision

Move these tracks from fully blocked future language to explicitly gated
planned tracks:

- hosted/private MCP;
- private/dev ChatGPT connector;
- image/CAD/Figma/provider adapters;
- package/publication readiness.

Each track still requires a separate approval PR before implementation. The
approval PR must define prerequisites, first implementation slice, non-goals,
trust boundary, source-truth boundary, and validation gates.

## Priority Order

1. Immediate local operator validation and visible proof over current local
   demo, report, and MCP surfaces.
2. MVP demo or guided inspection surface that remains local, explicit, and
   derived from current Core output.
3. Package/publication readiness.
4. Hosted/private MCP and ChatGPT connector.
5. Image/CAD/Figma/provider adapters.

The later tracks are urgent after the previous gates, but urgency does not
remove the approval boundary.

## First Safe PR In Each Track

### Hosted/private MCP

The first safe PR is a hosted runtime approval contract. It must define:

- exact server and environment scope;
- threat-model delta from the local STDIO boundary;
- deployment, auth, secret, retention, logging, budget, and rate-limit gates;
- exact allowed tool exposure and replay restrictions;
- current MCP/provider documentation evidence;
- verification commands and remote-readiness checks.

It must not add hosted server code, auth/OAuth code, deployment files,
dependencies, package metadata, lockfiles, secrets, CI changes, or public
runtime behavior.

### Private/dev ChatGPT connector

The first safe PR is a connector approval contract. It must define:

- private/dev connector scope;
- tool metadata and `_meta` compatibility boundary;
- local/dev smoke evidence;
- public-submission non-goal;
- exact tool exposure limits;
- hidden-instruction and output prompt-injection controls.

It must not add connector runtime code, public ChatGPT app submission,
production credentials, OpenAI API calls, OAuth, deployment, package metadata,
lockfiles, dependencies, or new public exports.

### Image/CAD/Figma/provider adapters

The first safe PR is an adapter approval contract. It must define:

- accepted structured geometry handoff;
- provenance and lossy-conversion warning rules;
- provider-specific evidence requirements;
- fixture-only first proof;
- source-truth split and metric-policy invariants.

It must not add image analysis, provider calls, OpenAI integration, Figma/CAD
plugin code, file ingestion, URL ingestion, hidden prompt inference, automatic
family selection, correction, recommendation, optimization, beauty scoring, or
adapter runtime implementation.

### Package/publication readiness

The first safe PR is a package-readiness approval contract. It must define:

- public API and export surface;
- dependency and lockfile policy;
- package metadata policy;
- publish gate and rollback plan;
- consumer verification matrix.

It must not publish the package, change package metadata, add exports, add
dependencies, change lockfiles, or widen runtime behavior.

## Invariants

- Norma Core accepts explicit structured geometry only.
- Adapters and connectors may only translate external representations into
  accepted structured geometry after a separate approval PR.
- Adapters and connectors must not become Norma source truth.
- Prompt inference must not substitute for explicit structured geometry.
- Future tracks must not create hidden pack, rule, tolerance, operation-context,
  or metric-policy defaults.
- The PR86 metric-policy invariant remains mandatory across accepted geometry,
  synthetic shared surfaces, normalized output compositions, Structured Analyze
  operation contexts, and derived inspection artifacts.
- `result.json` and direct Core output remain canonical truth; report/viewer
  artifacts remain derived inspection surfaces.

## Validation Gates

Every later approval PR must include:

- exact changed-file guard coverage;
- focused tests for approval state, non-goals, trust boundary, and first safe
  implementation slice;
- current local operator validation evidence when the track depends on local
  demo, report, or MCP behavior;
- negative assertions that runtime, provider, hosted, public package, auth,
  deployment, dependency, lockfile, CI, and public-export surfaces remain
  unchanged unless the approval PR explicitly authorizes that exact change.

## Non-Goals

PR88 does not change:

- `src/` runtime implementation;
- hosted MCP server implementation;
- ChatGPT connector runtime;
- OpenAI integration;
- image/CAD/Figma/provider adapter implementation;
- package publication;
- `package.json`;
- lockfiles;
- dependencies;
- CI;
- secrets;
- deployment;
- OAuth or auth flows;
- package-root exports;
- CLI behavior;
- MCP behavior;
- report-kit behavior;
- viewer behavior;
- examples;
- schemas;
- wiki state.
