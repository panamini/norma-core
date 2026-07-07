# Synthetic External Evidence Acceptance Boundary

## Status

Accepted synthetic boundary proof.

## Purpose

PR110 proves only the trust boundary for synthetic external evidence acceptance.
It does not implement a provider runtime, provider payload parser, or product
integration.

## Boundary

```text
External evidence
        |
        v
Observation Envelope
(untrusted evidence only)
        |
        v
Acceptance Boundary
(outside provider boundary)
        |
        v
Accepted Structured Geometry
(only Core input)
        |
        v
Existing AcceptedGeometry validation
        |
        v
Existing Structured Analyze
        |
        v
Structured Analyze result / result.json-shaped canonical computational output where applicable
```

## Provider Rule

Providers may produce evidence. Providers may not produce Norma truth.

Provider evidence may include candidate labels, candidate measurements,
candidate geometry suggestions, diagnostic metadata, provenance, warnings, and
derived artifacts. Provider evidence is untrusted, non-authoritative, and cannot
self-accept.

## Acceptance Rule

Acceptance is outside the provider boundary.

Only an explicit human-approved or reviewed system-approved acceptance boundary
may produce accepted structured geometry. Confidence, probability, score,
ranking, value metadata, prompt text, artifact appearance, provider certainty,
or provider metadata cannot authorize acceptance or define geometry.

## Canonical Truth

Accepted Structured Geometry enters Core.

The Structured Analyze result remains canonical computational output. Where a
`result.json`-shaped output exists, it is the canonical computational artifact.

Derived artifacts remain display/evidence only. Observation Envelope content,
provider metadata, warnings, prompts, overlays, reports, and summaries do not
override accepted structured geometry or Structured Analyze output.

## Non-Goals

PR110 does not approve:

- provider runtime;
- provider payload parser implementation;
- OpenAI API;
- image recognition;
- image APIs;
- vision model calls;
- provider SDKs;
- exact provider response fixtures as Core input;
- CAD/Figma import;
- ChatGPT connector runtime;
- MCP changes;
- hosted MCP;
- server, deployment, auth, OAuth, or secrets;
- package publication;
- package exports;
- package metadata, dependency, or lockfile changes;
- Core schema widening;
- Core runtime widening;
- runtime adapters;
- automatic acceptance;
- confidence-threshold acceptance;
- automatic geometry generation;
- automatic family selection;
- correction;
- recommendation;
- optimization;
- scoring;
- beauty judgment.

## Next Decision

PR111 chooses whether to:

A. implement a package-private synthetic evidence validator/helper;
B. add a local demo shell for the synthetic evidence proof;
C. revise the contract if boundary flaws appear.

PR110 does not implement A, B, or C.

## Validation Gates

PR110 is acceptable only when tests prove:

- an observation-only synthetic external evidence envelope cannot validate as
  accepted geometry;
- candidate geometry suggestions cannot enter Core;
- provider metadata cannot become Core input;
- confidence, score, ranking, value metadata, prompt text, and artifacts cannot
  authorize acceptance;
- accepted structured geometry validates with existing `validateAcceptedGeometryV1`;
- accepted structured geometry reaches the existing mapping path;
- Structured Analyze succeeds deterministically from accepted structured geometry;
- repeated execution produces identical canonical output;
- derived artifacts and warnings are diagnostic/evidence only;
- package, runtime, provider, MCP, ChatGPT, CAD/Figma, viewer, example, wiki,
  dependency, lockfile, and broad-glob changes remain outside the approved file
  set.
