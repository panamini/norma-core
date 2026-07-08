# Real External Evidence Pilot Readiness

## Status

Accepted as PR113 docs/tests-only readiness gate approval.

PR113 approves only the readiness gate for the first real external evidence
pilot. It does not implement provider runtime behavior, provider payload
parsing, SDK calls, image recognition, live network calls, or data retention.

## Selected Pilot Candidate

The selected pilot candidate remains the OpenAI/vision-style evidence pilot
from PR109.

The architecture remains provider-neutral. OpenAI/vision-style evidence is the
first candidate track only. It is not a Core dependency, package dependency,
provider authority, schema owner, or source-truth authority.

## Lifecycle Boundary

The only allowed lifecycle before Core remains:

```text
Provider output
        |
        v
External Evidence Envelope
(provider-neutral, untrusted evidence boundary)
        |
        v
Explicit Acceptance Boundary
(outside provider boundary)
        |
        v
Accepted Structured Geometry
(only Core input)
        |
        v
Core / Structured Analyze
        |
        v
result.json-shaped canonical computational output where applicable
```

Provider output is always untrusted evidence.

Provider output never becomes Norma truth, Core input, accepted geometry,
package API truth, connector truth, hosted truth, artifact truth, or
metric-policy authority.

Provider-derived accepted geometry is forbidden. Even if a provider returns
coordinates, shapes, or objects that match `AcceptedGeometry`, the explicit
acceptance step must produce the accepted geometry object outside the provider
boundary.

Accepted structured geometry remains the only Core input from this rail.

## Provider Payload Contract Non-Approval

PR113 does not define provider payload contracts such as `OpenAIResponseV1`,
`VisionProviderPayloadV1`, SDK response schemas, exact OpenAI response fixtures,
or exact provider payload schemas.

Future provider-specific mapping must terminate at a provider-neutral
`ExternalEvidenceEnvelopeV1` or repository-equivalent boundary.

Future provider integrations must map into `ExternalEvidenceEnvelope` or an
equivalent provider-neutral evidence boundary. Core must never import
provider-specific types.

## Acceptance Authority Before Core

Acceptance may occur only through one of these choices before Core:

- explicit human approval;
- reviewed system-approved transformation outside the provider boundary;
- future trusted workflow only after a separate approval contract.

Never allowed:

- provider self-acceptance;
- provider-derived accepted geometry;
- confidence-threshold acceptance;
- score/ranking/value-driven acceptance;
- prompt-derived acceptance;
- artifact-derived acceptance;
- automatic geometry generation into Core.

## Security And Data Contract

The first real external evidence pilot readiness gate requires:

- no committed secrets;
- no API keys in fixtures, docs examples, tests, PR bodies, logs, or artifacts;
- environment variables only for any future live provider experiment;
- no `.env` mutation or committed local environment files;
- no raw user uploads;
- no real-user data in tests;
- no production/private source assets in fixtures;
- no raw provider response persistence by default;
- no live provider output may be persisted, committed, or used as a fixture
  without an explicit redaction and replay contract;
- no raw provider traces, hidden prompts, chain-of-thought, signed URLs,
  cookies, bearer tokens, local paths, or remote URLs in committed fixtures;
- redaction required before any persistence;
- deterministic replay fixture strategy required before comparing or debugging
  provider behavior;
- fail-closed behavior when required provider configuration is missing.

## PR114 Gate

The next allowed implementation PR is:

```text
PR114: local gated provider-evidence adapter prototype
```

PR114 may only be planned if it preserves:

- provider-neutral envelope;
- unchanged PR111 helper boundary;
- no direct provider-to-Core path;
- no provider-derived accepted geometry;
- no Core schema/runtime widening;
- no package/public exports;
- deterministic replay/redaction strategy;
- clear failure behavior;
- no CI live-network dependency;
- no live provider API call by default.

PR114 should be a synthetic/local provider-boundary implementation proof unless
its own Change Contract explicitly requests and justifies otherwise.

## PR115 Gate

`PR115: controlled live provider experiment` is the first possible live-provider
experiment.

PR115 may proceed only after a separate approval contract with explicit secret,
network, redaction, replay, and retention rules.

PR113 does not approve a live provider call by itself.

## Explicit Non-Approval

PR113 does not approve:

- OpenAI calls;
- image APIs;
- vision model calls;
- provider SDK;
- provider runtime;
- provider payload parser;
- exact OpenAI response fixture;
- exact provider payload schema;
- real image recognition;
- live provider data retention;
- image upload;
- CAD/Figma import;
- MCP changes;
- ChatGPT connector runtime;
- hosted MCP;
- server, deployment, auth, OAuth, or secrets;
- package exports;
- package metadata;
- dependencies;
- lockfile changes;
- Core schema widening;
- Core runtime widening;
- runtime adapters;
- source fixture changes;
- demo changes;
- public API;
- package publication;

## Validation Gates

PR113 is acceptable only when tests prove:

- this decision document has the required headings and accepted status;
- the selected pilot candidate remains OpenAI/vision-style while architecture
  remains provider-neutral;
- provider output is untrusted evidence only;
- provider output cannot become Norma truth or Core input;
- provider output cannot create accepted geometry;
- provider-derived accepted geometry is forbidden;
- no exact OpenAI/provider payload contract is approved;
- `ExternalEvidenceEnvelope` and provider-neutral boundary wording are required;
- future provider integrations map into the provider-neutral evidence boundary;
- Core must never import provider-specific types;
- acceptance authority is explicit and outside the provider boundary;
- provider self-acceptance and confidence-threshold acceptance are forbidden;
- security and data lifecycle rules exist;
- no live provider output retention is approved without explicit redaction and
  replay contract;
- PR114 remains local, gated, prototype-only, and no-live-API by default;
- PR115 remains the first possible controlled live provider experiment and is
  separately gated;
- forbidden runtime, provider, package, MCP, ChatGPT, CAD/Figma, fixture, demo,
  dependency, lockfile, public API, package publication, and Core widening
  surfaces remain unapproved.
