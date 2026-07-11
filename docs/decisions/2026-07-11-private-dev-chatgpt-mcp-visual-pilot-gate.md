# Private/Dev ChatGPT + MCP Visual Pilot Gate

## Status

Approved as the next gated product track after the merged PR132 local visual
candidate review surface and the deterministic no-network validation recorded
in `2026-07-11-pr132-operator-validation-checkpoint.md`. That checkpoint
records the exact commands and receipt, observation, selection, and canonical
`result.json` identities; it does not claim authenticated human-review proof.

This decision selected a private/developer-only ChatGPT + MCP visual pilot. At
PR133 it did not approve implementation, hosting, authentication, deployment,
public access, or production data. The separately approved PR134 contract now
implements only the disabled local STDIO orchestration slice described below.
It does not connect ChatGPT or approve any hosted, authenticated, remote, or
production surface.

## Selected Journey

The first external-channel journey is:

```text
private/dev ChatGPT client
  -> private/dev MCP tool boundary
  -> existing local visual candidate capture artifacts
  -> PR132 local candidate review and non-authoritative selection intent
  -> package-private selection finalizer
  -> existing PR129 no-network resume
  -> AcceptedGeometry
  -> Core / Structured Analyze
  -> canonical result.json
  -> derived report/viewer artifacts
```

The pilot must reuse the existing PR129/PR132 artifacts and acceptance path. It
must not create a second candidate validator, selection authority, acceptance
engine, geometry schema, Core path, report truth, or canonical result.

## Trust Boundary

- ChatGPT text, prompts, attachments, connector state, MCP arguments, provider
  output, candidate observations, overlays, and selection intent are untrusted
  evidence or transport data, never Norma truth.
- Only the existing explicit accepted-geometry boundary may authorize Core
  input.
- The MCP boundary may coordinate existing local artifacts; it may not accept,
  repair, infer, rank, score, recommend, or silently select geometry.
- `result.json` remains canonical computational output. Reports and viewers are
  derived only.
- Metric policy and Structured Analyze semantics remain unchanged.

## PR134 Approval Preconditions Satisfied

PR134 was HIGH risk and remained blocked until its exact implementation
contract, `CC-PR134-PRIVATE-DEV-LOCAL-VISUAL-MCP-ORCHESTRATION-V2`, was
separately approved. That contract froze:

1. private/dev-only client and MCP transport boundary;
2. exact tool inventory and closed request/response schemas;
3. local process, filesystem, and artifact ownership boundaries;
4. authentication and authorization posture, including whether auth is absent
   because the pilot is loopback/local only or explicitly required;
5. secret, prompt, attachment, log, retention, and redaction policy;
6. timeout, cancellation, concurrency, size, and rate boundaries;
7. fail-closed behavior for stale, mismatched, missing, or unsafe artifacts;
8. no-network tests by default and an explicit prohibition on CI live calls;
9. end-to-end proof that PR132 selection and PR129 resume remain the only route
   to AcceptedGeometry and Core;
10. an exact changed-file set and rollback path.

## Implemented PR134 Slice

After that separate approval, PR134 adds a private/dev, local-only STDIO MCP
orchestration prototype with exactly two closed tools. One inspects a single
operator-configured candidate review job. The other continues an already
explicitly finalized selection through the existing PR129 no-network path.
The general six-tool MCP inventory remains unchanged.

It may use synthetic or explicitly non-sensitive local artifacts only. It must
remain package-private, disabled by default, CI-network-free, and must not make
provider calls or host a public endpoint.

## Explicit Non-Goals

This gate does not approve:

- a ChatGPT connector runtime or ChatGPT App;
- hosted or remote MCP;
- public endpoints, domains, deployment, servers, tunnels, or webhooks;
- OAuth, account linking, multi-user identity, tenancy, billing, or subscription;
- OpenAI/provider calls, SDKs, image recognition, uploads, or production data;
- autonomous or confidence-based acceptance, correction, inference, scoring,
  recommendation, optimization, or family selection;
- CAD/Figma adapters;
- package exports, dependencies, lockfiles, publication, or public launch;
- Core schemas, AcceptedGeometry semantics, metric policy, or Structured Analyze
  behavior changes.

## Current Validation Gate

PR133 remains the historical docs/tests-only selection gate. PR134 may prove
only local STDIO orchestration with a real local MCP-compatible client and
synthetic or explicitly non-sensitive artifacts. It must not claim a ChatGPT
connection. Secure MCP Tunnel and ChatGPT developer-mode validation remain a
separately approved HIGH-risk PR135, and every hosted, auth, provider,
publication, adapter, and truth surface above remains unapproved.
