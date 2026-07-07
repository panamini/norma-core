# Local Visual Pilot Boundary

## Status

Accepted as the PR108 local visual pilot boundary contract.

PR108 is a docs/tests-only decision before any real external evidence source is
allowed. It defines the boundary between untrusted external evidence,
Observation Envelope evidence, explicit acceptance, accepted structured
geometry, existing Norma Core / Structured Analyze, and `result.json` where
applicable.

## Decision

No future provider, image model, CAD system, Figma system, ChatGPT connector, or
other external system may directly create Core truth.

Every external system must terminate at an Observation Envelope until an
explicit acceptance step produces accepted structured geometry. Accepted
structured geometry is the only input from this rail that may enter existing
Norma Core / Structured Analyze.

## Boundary Pipeline

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

## Untrusted External Evidence Boundary

External evidence includes provider output, image-model output, screenshots,
photos, CAD output, Figma output, ChatGPT connector output, prompts, overlays,
derived artifacts, metadata, and future connector output.

External evidence is untrusted and non-authoritative. It may support inspection
or acceptance decisions, but it must not be passed to Core as Norma truth and
must not be treated as source truth, package API truth, connector truth,
accepted geometry, or executable geometry.

## Observation Envelope

An Observation Envelope is an untrusted, non-authoritative evidence container.

Observation Envelope records may preserve candidate observations, provider or
adapter provenance, lossy-conversion warnings, source-evidence references, and
derived evidence references.

Observation Envelope MUST NOT contain executable geometry truth. It must not
contain accepted structured geometry, Core `Composition2D` input, ratio packs,
rules, tolerances, operation contexts, package API truth, connector schemas, or
automatic acceptance state.

Observation Envelope content cannot enter Norma Core / Structured Analyze
directly. It can only be reviewed by an explicit acceptance step.

## Explicit Acceptance Boundary

The explicit acceptance boundary is the only transformation from evidence into
Core input.

Acceptance must be human-approved or system-approved through a reviewed
contract. The acceptance record must be explicit, provenance-bearing,
content-identified where applicable, and visible to downstream verification.

Confidence scores, provider self-acceptance, artifact appearance, prompt text,
connector convenience, family names, recommendations, corrections,
optimizations, scores, or beauty judgments must not perform acceptance.

## Accepted Structured Geometry

Accepted structured geometry is the only Core input from this visual pilot
rail.

Accepted structured geometry must satisfy the existing accepted-geometry
contract and must be mapped or normalized through existing approved boundaries
before Structured Analyze consumes it. PR108 does not widen Core schema or
runtime behavior.

Existing Structured Analyze and accepted-geometry invariants remain unchanged,
including the PR86 metric-policy invariant. PR108 does not add a new
metric-policy model.

## Core And Canonical Result

Norma Core / Structured Analyze consumes accepted structured geometry through
existing Core contracts only.

Where applicable, the Structured Analyze result and `result.json` remain the
canonical computational output. Provider output, Observation Envelope content,
acceptance notes, report views, overlays, and derived artifacts do not override
that output.

## Derived Artifacts

Derived artifacts are display or evidence only.

`guide.html`, `visual.svg`, `summary.json`, `summary.md`, report artifacts,
overlays, prompts, observations, screenshots, and future UI views may display or
reference evidence and accepted results, but they must not become source truth,
Core input authority, package API truth, connector truth, metric-policy
authority, family-selection authority, correction authority, recommendation
authority, optimization authority, scoring authority, or beauty-judgment
authority.

## Provider And Connector Outputs

Provider, image-model, CAD, Figma, ChatGPT, MCP, and connector outputs are
evidence only.

PR108 does not define provider payload contracts. It does not define OpenAI
Vision JSON, CAD import JSON, Figma payloads, ChatGPT connector schemas, MCP
runtime schemas, or any provider SDK contract.

Provider metadata is provenance only. It cannot decide source truth, accepted
geometry, Core input, package API truth, connector truth, metric policy,
families, corrections, recommendations, optimizations, scores, or beauty
judgments.

## Non-Goals

PR108 does not approve:

- new fixtures;
- OpenAI calls;
- image APIs;
- vision models;
- image recognition;
- CAD import;
- Figma import;
- MCP changes;
- hosted MCP;
- ChatGPT connector runtime;
- provider payload contract implementation;
- OpenAI Vision JSON;
- CAD import JSON;
- Figma payloads;
- ChatGPT connector schemas;
- package exports;
- package publication;
- package metadata changes;
- dependencies or lockfile changes;
- runtime adapters;
- provider SDKs;
- upload servers;
- auth, OAuth, or secrets;
- Core schema widening;
- Core runtime widening;
- automatic family selection;
- correction;
- recommendation;
- optimization;
- scoring;
- beauty judgment;
- prompt-derived source truth;
- artifact-derived source truth;
- provider-derived source truth;
- observation-derived source truth.

## PR109 Decision Point

The next PR must choose exactly one first real external pilot track:

A. OpenAI/vision-style provider pilot contract.
B. CAD/Figma geometry pilot contract.
C. ChatGPT/MCP product path contract.

The recommended next track may be A, OpenAI/vision-style provider pilot
contract, because it is the smallest way to define one provider-facing evidence
contract. PR108 does not implement it and does not approve provider calls or
provider payload schemas.

## Validation Gates

PR108 is acceptable only when:

- this decision document defines the untrusted external evidence boundary;
- tests prove Observation Envelope is untrusted and non-authoritative;
- tests prove Observation Envelope cannot contain executable geometry truth;
- tests prove observation-only input cannot enter Core;
- tests prove candidate observations from an existing PR107 corpus scenario are
  not source truth, Core input, package API truth, or connector truth;
- tests prove accepted structured geometry from that PR107 scenario validates
  with `validateAcceptedGeometryV1`;
- tests prove accepted structured geometry can enter existing Core / Structured
  Analyze and produces deterministic output;
- tests prove provider metadata is provenance only;
- tests prove artifacts are derived/evidence only;
- tests prove package-root exports remain unchanged;
- tests prove exact changed-file guard accepts only the PR108 file set;
- tests prove runtime/provider/package/wiki/hosted/ChatGPT/CAD/Figma extras are
  rejected.

## Rollback

Rollback is reverting only this decision document, the roadmap update, the
focused PR108 tests, and exact changed-file guard maintenance.

No runtime, provider, fixture, package, deployment, hosted, wiki, auth, secret,
server, upload, CAD, Figma, ChatGPT, MCP, schema, or persisted-data rollback
should be needed because PR108 approves none of those changes.
