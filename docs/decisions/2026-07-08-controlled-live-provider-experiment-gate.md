# Controlled Live Provider Experiment Gate

## Status

Accepted as PR115 controlled live provider experiment gate / approval contract.

PR115 approves only the controlled live provider experiment gate and approval
contract. It does not implement a live provider runtime, provider SDK, payload
parser, network call, fixture, package surface, Core runtime change, or product
integration.

## Purpose

This decision defines the minimum approval gate required before any later PR may
introduce a controlled live provider experiment.

The gate exists to preserve the current source-truth boundary while making the
next local experiment contract reviewable before secrets, network behavior,
retention, replay, or provider-specific mapping exist.

## Current Rail

PR108 established the current external evidence boundary:

```text
Untrusted external evidence
        |
        v
Observation Envelope
(untrusted, non-authoritative evidence container)
        |
        v
Explicit Acceptance Boundary
(human/system-approved transformation)
        |
        v
Accepted Structured Geometry
(only Core input)
        |
        v
Norma Core / Structured Analyze
        |
        v
result.json
(canonical computational output where applicable)
```

PR109 selected OpenAI/vision-style evidence as the first external pilot
candidate, while keeping the architecture provider-neutral and keeping
CAD/Figma and ChatGPT/MCP product paths unselected.

PR110 proved the synthetic external evidence acceptance boundary. PR111 added
the package-private synthetic evidence acceptance proof helper. PR112 added the
local synthetic evidence acceptance demo command. PR113 approved the first real
external evidence pilot readiness gate. PR114 added the package-private local
gated provider-evidence replay adapter prototype with synthetic/redacted replay
evidence, provider-neutral envelope output, no package export, and no live
provider API call by default.

PR115 is the gate before any later real provider experiment. It approves the
approval contract only.

## Provider-Neutral Architecture

The required lifecycle remains:

```text
Provider output -> provider-neutral External Evidence Envelope -> explicit Acceptance Boundary -> Accepted Structured Geometry -> Norma Core / Structured Analyze -> result.json-shaped canonical computational output where applicable
```

Provider output may suggest evidence. Provider output never defines Norma
truth. Only accepted structured geometry may enter Core.

Future provider-specific mapping must terminate at a provider-neutral External
Evidence Envelope or repository-equivalent boundary before any acceptance step.

No provider-specific type, payload shape, SDK response object, exact provider
JSON fixture, or provider metadata may become a Core contract, package API
contract, source-truth authority, connector contract, hosted contract, artifact
authority, or metric-policy authority.

## Selected Candidate

The selected pilot candidate remains OpenAI/vision-style evidence.

OpenAI/vision-style is the selected pilot candidate only. It is not a Core
dependency, package dependency, source-truth authority, provider payload
contract, exact response schema, permanent runtime API shape, provider
authority, hosted authority, connector authority, or artifact authority.

CAD/Figma remains unselected. ChatGPT/MCP product path remains unselected.

## Live Experiment Gate

Any future live provider experiment must be manual/operator-gated only and must
require explicit opt-in before provider execution.

Any later implementation must use environment-variable-only secrets. It must
forbid committed secrets, API keys, signed URLs, local paths, bearer tokens, raw
provider traces, hidden prompts, chain-of-thought, raw user data, production
assets, private source assets, and `.env` mutation.

Missing required configuration must fail closed before any network call.

No CI live-network dependency is allowed.

Any future live experiment must have a bounded timeout and deterministic failure
reporting for missing configuration, disabled state, timeout, provider failure,
redaction failure, replay-contract failure, and acceptance-boundary failure.

## Data Retention And Replay

Raw provider output must be ephemeral by default.

Live provider output must not be persisted, committed, logged into durable test
artifacts, or used as a fixture unless a later redaction/replay contract
explicitly approves the retention class, redaction rules, replay shape,
permitted fields, forbidden fields, storage location, review path, and deletion
expectation.

Any replay fixture must be synthetic, redacted, and provider-neutral. A replay
fixture must never be raw provider JSON, exact OpenAI response JSON, provider
SDK response JSON, image bytes, upload payload, signed URL payload, local-path
payload, or production/private source asset.

## Acceptance Authority

Provider output must terminate at an external evidence envelope.

Provider output must not produce accepted structured geometry directly.

Provider self-acceptance is forbidden.

Confidence threshold, score, ranking, value metadata, label, prompt, artifact,
provider metadata, provider identity, or provider result status must not
authorize acceptance.

Accepted structured geometry may be produced only by explicit human approval or
by a reviewed system-approved transformation outside the provider boundary.

Automatic geometry generation into Core is forbidden.

## Core Truth Rule

Provider output is untrusted evidence only.

Provider output cannot become Norma truth, Core input, accepted geometry
directly, package API truth, connector truth, hosted truth, artifact truth,
metric-policy authority, family-selection authority, correction authority,
recommendation authority, optimization authority, scoring authority, or beauty
judgment authority.

Only accepted structured geometry may enter Norma Core / Structured Analyze.

Where applicable, result.json-shaped computational output remains the canonical
Norma result.

PR111 and PR114 proof boundaries remain intact: the package-private proof helper
and package-private replay adapter prove local synthetic/replay boundaries only,
without live provider execution or package export.

## PR116 Gate

The next implementation PR, if later approved, is:

```text
PR116: add disabled local live-provider experiment harness
```

PR116 must be disabled by default, manual-only, fail-closed without environment
configuration, and excluded from CI live-network execution.

PR116 must not run a provider call unless its own Change Contract explicitly
requests and justifies live network/provider execution. Without that explicit
request and justification, live provider execution remains PR117 or later.

## Explicit Non-Goals

PR115 does not approve:

- live provider calls;
- provider runtime;
- OpenAI API calls;
- OpenAI SDK usage;
- image APIs;
- vision model calls;
- provider SDKs;
- provider payload parsers;
- exact OpenAI response schemas such as `OpenAIResponseV1`;
- exact provider response schemas such as `VisionProviderPayloadV1`;
- exact OpenAI response fixtures;
- raw provider response fixtures;
- real image recognition;
- image upload;
- CAD/Figma import;
- MCP runtime changes;
- ChatGPT connector runtime;
- hosted MCP;
- server, deployment, auth, OAuth, or secret-management runtime;
- package exports;
- package metadata changes;
- package publication;
- dependency changes;
- lockfile changes;
- Core schema widening;
- Core runtime widening;
- runtime adapters;
- source fixture changes;
- demo commands;
- public API changes;
- wiki mutation;
- provider-derived accepted geometry;
- confidence-threshold acceptance;
- prompt-derived, artifact-derived, provider-derived, confidence-derived, or
  observation-derived source truth.

## Validation Gates

PR115 is acceptable only when tests prove:

- this decision document exists and has the required headings;
- the status is an accepted gate / approval contract;
- PR115 approves only the controlled live provider experiment gate, not
  implementation;
- OpenAI/vision-style remains the selected candidate while architecture remains
  provider-neutral;
- CAD/Figma remains unselected;
- ChatGPT/MCP product path remains unselected;
- provider output is untrusted evidence only;
- provider output cannot become Norma truth, Core input, accepted geometry
  directly, package API truth, connector truth, hosted truth, artifact truth, or
  metric-policy authority;
- exact OpenAI/provider payload contracts, exact OpenAI response fixtures, and
  raw provider response fixtures remain unapproved;
- environment-variable-only secret policy is present;
- committed secrets, API keys, and `.env` mutation are forbidden;
- missing configuration must fail closed before network calls;
- CI live-network dependency is forbidden;
- bounded timeout and deterministic failure reporting are required;
- raw provider output persistence is forbidden by default;
- a redaction/replay contract is required before any provider output fixture;
- replay fixtures must be synthetic, redacted, and provider-neutral;
- explicit human approval or reviewed system-approved transformation is
  required before accepted structured geometry;
- provider self-acceptance is forbidden;
- confidence-threshold, score/ranking/value-driven, prompt/artifact, and
  provider-metadata-derived acceptance are forbidden;
- automatic geometry generation into Core is forbidden;
- PR116 is named exactly
  `PR116: add disabled local live-provider experiment harness`;
- PR116 remains disabled, manual-only, fail-closed, and not a CI live-network
  dependency;
- forbidden runtime, provider, package, MCP, ChatGPT, CAD/Figma, fixture, demo,
  dependency, lockfile, public API, package publication, wiki, and Core widening
  surfaces remain unapproved;
- the roadmap records the PR115 and PR116 gates without claiming
  implementation;
- the changed-file guard accepts exactly the PR115 docs/tests-only file set and
  rejects runtime/provider/package/MCP/ChatGPT/CAD/Figma/wiki/dependency/lockfile
  extras.
