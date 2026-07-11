# Private/Dev ChatGPT + MCP Visual Pilot Gate

## Status

Approved as the next gated product track after the merged PR132 local visual
candidate review surface and the deterministic no-network validation recorded
in `2026-07-11-pr132-operator-validation-checkpoint.md`. That checkpoint
records the exact commands and receipt, observation, selection, and canonical
`result.json` identities; it does not claim authenticated human-review proof.

This decision selects a private/developer-only ChatGPT + MCP visual pilot. It
does not approve implementation, hosting, authentication, deployment, public
access, or production data.

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

## PR134 Approval Preconditions

PR134 is HIGH risk and remains blocked until its exact implementation contract
is separately approved. That contract must freeze:

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

## Allowed First Implementation Slice

After separate approval, the smallest PR134 slice may add a private/dev,
loopback/local-only MCP orchestration prototype that exposes only the minimum
closed tools needed to inspect a candidate review job and continue an already
explicitly finalized selection through the existing no-network path.

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

## Validation Gate

PR133 is docs/tests-only. It must prove that private/dev ChatGPT + MCP is the
single selected next track, that PR134 remains separately approval-gated, and
that every runtime, hosted, auth, provider, publication, adapter, and truth
surface above remains unapproved.
