# OpenAI Vision-Style Evidence Pilot Contract

## Status

Accepted as the PR109 decision contract.

PR109 is docs/tests-only. It selects the first future real external pilot track
after PR108, but it does not implement provider runtime behavior.

## Decision

PR109 selects exactly A from the PR108 next-step decision set:

```text
A. OpenAI/vision-style evidence pilot contract.
```

B. CAD/Figma geometry pilot contract remains unselected.

C. ChatGPT/MCP product path contract remains unselected.

OpenAI/vision-style evidence is evidence only and is not Core truth. OpenAI is
not special in the architecture: it is the first pilot candidate only, not a
source-truth authority, permanent dependency, Core dependency, package
dependency, or special schema owner.

## Boundary Pipeline

The only allowed pipeline remains:

```text
Untrusted provider/external evidence
        |
        v
Observation Envelope
(untrusted, non-authoritative evidence container)
        |
        v
Explicit Acceptance Boundary
(human/system-approved transformation by an acceptance authority)
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

No provider, image model, CAD system, Figma system, ChatGPT connector, MCP
product path, hosted service, prompt, artifact, or observation may directly
create Core truth.

## Provider-Agnostic Architecture

The architecture remains provider-agnostic. Architecture language should prefer
generic `provider`, `external evidence`, `Observation Envelope`, and
`acceptance boundary` terms.

OpenAI/vision-style language names only the selected first pilot track and its
non-goals. It does not create an OpenAI-specific Core schema, package
dependency, runtime dependency, payload contract, or source-truth privilege.

## Provider Boundary Rule

A provider may produce observations.

A provider may produce labels.

A provider may produce measurements.

A provider may produce optional confidence/value/score metadata.

A provider may produce candidate geometry suggestions.

A provider may never produce accepted structured geometry.

A provider may never produce Core truth.

A provider may never produce rules, ratios, corrections, recommendations,
optimization, scoring, beauty judgments, or evaluation decisions.

Acceptance is always outside the provider boundary.

## Provider Metadata

Any provider confidence/value/score is optional diagnostic metadata only.

Provider confidence/value/score cannot authorize acceptance, create geometry, or
modify evaluation.

Provider metadata is provenance or diagnostics only. It cannot become source
truth, accepted geometry, Core input, package API truth, provider truth, hosted
truth, wiki truth, artifact truth, connector truth, metric-policy authority,
family-selection authority, correction authority, recommendation authority,
optimization authority, scoring authority, or beauty-judgment authority.

## Acceptance Authority

At this stage, acceptance may be performed only by an explicit human approval
or by a reviewed system-approved transformation contract outside the provider
boundary.

Provider output can never self-accept.

Acceptance must be an explicit human/system-approved transformation outside the
provider boundary. Only the acceptance step may produce accepted structured
geometry.

## Observation Envelope

Observation Envelope remains an untrusted, non-authoritative evidence container.

Observation Envelope may preserve provider observations, labels, measurements,
optional confidence/value/score metadata, candidate geometry suggestions,
provenance, source-evidence references, lossy-conversion warnings, and derived
evidence references.

Observation Envelope MUST NOT contain executable geometry truth. It must not
contain accepted structured geometry, Core `Composition2D` input, ratio packs,
rules, tolerances, operation contexts, package API truth, provider truth,
hosted truth, wiki truth, artifact truth, connector schemas, or automatic
acceptance state.

Observation Envelope content cannot enter Norma Core / Structured Analyze
directly.

## Accepted Structured Geometry

Accepted structured geometry remains the only Core input from this pilot rail.

Accepted structured geometry must satisfy the existing accepted-geometry
contract and must be mapped or normalized through existing approved boundaries
before Structured Analyze consumes it.

Existing Structured Analyze and accepted-geometry invariants remain unchanged.
PR109 does not add a new metric-policy model.

## Core And Canonical Result

Norma Core / Structured Analyze consumes accepted structured geometry through
existing Core contracts only.

Where applicable, the Structured Analyze result and `result.json` remain the
canonical computational truth.

No package API truth, connector truth, hosted truth, wiki truth, artifact truth,
provider truth, prompt truth, confidence truth, or observation truth can bypass
accepted structured geometry.

## Derived Artifacts

Derived artifacts are display or evidence only.

`guide.html`, `visual.svg`, `summary.json`, `summary.md`, report artifacts,
overlays, prompts, observations, screenshots, future UI views, and provider
evidence may display or reference evidence and accepted results, but they must
not become source truth, Core input authority, package API truth, provider
truth, hosted truth, wiki truth, artifact truth, connector truth,
metric-policy authority, family-selection authority, correction authority,
recommendation authority, optimization authority, scoring authority, or
beauty-judgment authority.

## Package Surface

Package root exports remain unchanged.

PR109 does not approve package exports, package publication, package metadata,
dependency changes, lockfile changes, or package API truth from provider output.

## Non-Goals

PR109 does not approve:

- new fixtures;
- OpenAI calls;
- image APIs;
- vision model calls;
- provider SDKs;
- provider runtime adapters;
- provider payload parser implementation;
- exact OpenAI response fixtures as Core input;
- OpenAI Vision JSON for Core;
- CAD import;
- CAD import JSON;
- Figma import;
- Figma payloads;
- MCP changes;
- ChatGPT connector runtime;
- ChatGPT connector schemas;
- hosted MCP;
- upload servers;
- auth, OAuth, or secrets;
- package exports;
- package publication;
- package metadata changes;
- dependencies or lockfile changes;
- Core schema widening;
- Core runtime widening;
- runtime adapters;
- automatic family selection;
- correction;
- recommendation;
- optimization;
- scoring;
- confidence-threshold acceptance;
- beauty judgment;
- prompt-derived source truth;
- artifact-derived source truth;
- provider-derived source truth;
- confidence-derived source truth;
- observation-derived source truth.

## PR110 Decision Point

The next decision point is:

```text
PR110: decide whether the selected pilot contract is ready for a minimal synthetic provider-envelope proof.
```

PR110 may proceed, revise the contract, stop, or choose a different path if
evidence shows the selected contract is not ready.

PR110 must still not imply real API calls unless separately approved.

## Validation Gates

PR109 is acceptable only when tests prove:

- this decision document has the required headings and non-goals;
- PR109 selects exactly OpenAI/vision-style as the first pilot track;
- CAD/Figma and ChatGPT/MCP tracks are explicitly unselected;
- the architecture remains provider-agnostic;
- OpenAI is not source truth, permanent dependency, or Core authority;
- provider outputs are evidence only;
- provider output cannot self-accept;
- acceptance authority is explicit and outside the provider boundary;
- provider confidence/value/score is optional diagnostic metadata only;
- Observation Envelope remains untrusted and non-authoritative;
- Observation-only input cannot enter Core;
- reused PR107 scenario observations are not source truth, Core input, package
  API truth, provider truth, hosted truth, wiki truth, artifact truth, or
  connector truth;
- accepted structured geometry from the reused PR107 scenario validates with
  `validateAcceptedGeometryV1`;
- accepted structured geometry can enter existing Core / Structured Analyze;
- deterministic Structured Analyze output is preserved;
- existing Structured Analyze and accepted-geometry invariants remain
  unchanged;
- provider metadata is provenance/diagnostic only;
- artifacts are derived/evidence only;
- package root exports remain unchanged;
- the changed-file guard accepts only the PR109 file set;
- runtime/provider/package/wiki/hosted/ChatGPT/MCP/CAD/Figma extras are
  rejected.

## Rollback

Rollback is reverting only this decision document, the roadmap update, the
focused PR109 tests, and exact changed-file guard maintenance.

No runtime, provider, fixture, package, deployment, hosted, wiki, auth, secret,
server, upload, CAD, Figma, ChatGPT, MCP, schema, or persisted-data rollback
should be needed because PR109 approves none of those changes.
