# Visual Adapter Fixture Contract

## Status

Accepted as a docs/tests-only approval contract for PR102.

PR102 approves the first local-only, fixture-only visual adapter handoff proof boundary. It does not implement a runtime adapter, image recognition, CAD import, Figma import, provider calls, OpenAI calls, hosted MCP, ChatGPT connector runtime, uploads, servers, package publication, license selection, package metadata changes, dependency changes, package-root exports, or Core runtime widening.

## Decision

The first approved visual-adapter proof path is:

```text
pre-authored visual geometry observations -> explicit accepted structured geometry -> existing Norma Core / Structured Analyze path
```

Source assets, visual observations, provider outputs, CAD output, Figma output, screenshots, photos, maps, architectural images, overlays, prompts, and derived inspection artifacts are candidate evidence only. They are not Norma Core truth and must not be evaluated by Core directly.

The only handoff that may enter existing Core or Structured Analyze analysis is explicit accepted structured geometry that conforms to the existing accepted-geometry contracts and mapping boundaries.

## First Proof Boundary

The first proof must be synthetic, static, local-only, and fixture-only.

Fixtures may describe pre-authored candidate observations and the accepted structured geometry handoff, but they must not contain raw image bytes, base64 image content, local filesystem paths, remote URLs, credentials, bearer tokens, API keys, cookies, signed URLs, private production assets, or real-user data.

The fixture proof must not call a provider, load an image, parse CAD, import Figma, upload content, access a server, open a hosted MCP endpoint, call ChatGPT, call OpenAI, fetch a URL, read a local source asset path, or infer geometry from prompts.

## Source Truth Boundary

Visual/provider/CAD/Figma outputs are candidate observations only.

Accepted structured geometry is the source-truth handoff. It must be explicit, versioned, content-identified, provenance-bearing, and visibly accepted before any existing Core or Structured Analyze path consumes it.

No fixture or adapter contract may create source truth from prompt text, confidence thresholds, provider self-acceptance, visual overlays, derived inspection artifacts, family names, recommendation text, optimization text, scoring text, or beauty judgment.

## Provenance And Identity

Every approved fixture record must preserve provenance for:

- source asset identity as a synthetic fixture identity, not raw content;
- provider or adapter identity;
- observation identity;
- acceptance actor and acceptance mode;
- correction history when any correction exists;
- accepted geometry content identity;
- observation content identity when referenced;
- operation or contract identity for each normalization or handoff step.

Content identities must use deterministic content projections and must not include timestamps, random values, local paths, URLs, credentials, image bytes, provider raw traces, hidden prompts, chain-of-thought, or environment values.

## Lossy Conversion Warnings

Any normalized visual observation must carry explicit lossy-conversion warnings when observation coordinates, primitive vocabulary, scale, metric meaning, pixel-origin conventions, perspective, cropping, provider confidence, missing provider identity, or adapter configuration can lose information.

Warnings are diagnostic evidence only. They do not make invalid input valid, do not accept geometry, and do not authorize Core evaluation.

## Metric Policy Invariants

The PR86 metric-policy invariant remains mandatory across:

- existing accepted geometry;
- synthetic shared surfaces;
- normalized output compositions;
- Structured Analyze operation contexts;
- derived inspection artifacts.

Fixture-only visual handoff records must not invent metric units, infer physical measurements from pixels, repair metric policies, drop surface-only metric policies, or let derived artifacts override metric-policy provenance.

## Derived Artifact Boundary

Derived inspection artifacts may display existing results and handoff metadata only.

Derived artifacts must not become source truth, accepted geometry, provider evidence, metric-policy authority, family-selection authority, correction authority, recommendation authority, optimization authority, scoring authority, or beauty-judgment authority.

## Next Implementation PR

The next implementation PR after PR102 must be fixture-only and local-only.

It may add static synthetic fixtures and focused local tests for the approved handoff contract only. It must not add runtime adapter implementation, image recognition, provider calls, OpenAI calls, CAD import, Figma import, hosted MCP, ChatGPT connector runtime, upload runtime, server runtime, package metadata changes, dependencies, lockfile changes, package-root exports, or Core schema/runtime widening.

## Package Publication Boundary

Public package publication remains paused. `@norma/core` remains private.

PR102 does not approve npm publication, publish configuration, version changes, license selection, release workflow, provenance setup, trusted publishing, registry mutation, package-level `bin`, dependency changes, lockfile changes, or package metadata changes.

## Later Hosted And ChatGPT Work

Later ChatGPT, hosted MCP, remote API, provider, CAD, Figma, image, map, photo, or architecture-visual work remains separate.

Those later surfaces must consume approved contracts. They must not invent source truth, widen Core input, bypass explicit accepted structured geometry, hide lossy conversion, or treat visual/provider output as Core truth.

## Explicit Non-Goals

PR102 does not approve:

- runtime adapter implementation;
- image recognition;
- image parsing;
- raw image bytes;
- CAD import;
- Figma import;
- provider calls;
- OpenAI calls;
- hosted MCP;
- ChatGPT connector runtime;
- upload runtime;
- server or deployment runtime;
- npm publish;
- public package publication;
- license selection;
- package metadata changes;
- dependency or lockfile changes;
- package-root exports;
- Core schema widening;
- Core runtime widening;
- prompt-derived source truth;
- automatic family selection;
- automatic correction;
- recommendation;
- optimization;
- scoring;
- beauty judgment.

## Validation Gates

PR102 is acceptable only when:

- this decision file exists with the required headings;
- contract tests prove candidate evidence is not Core truth;
- contract tests prove accepted structured geometry is the only Core handoff;
- contract tests prove forbidden runtime, provider, publication, package, dependency, export, and Core-widening scopes remain blocked;
- contract tests prove the first proof is synthetic, static, local-only, and fixture-only;
- contract tests prove fixtures exclude raw image bytes, local paths, URLs, credentials, and real-user data;
- contract tests prove the PR86 metric-policy invariant and derived-artifact source-truth boundary remain preserved;
- contract tests identify the next implementation PR as fixture-only and local-only;
- exact changed-file guard maintenance, if present, accepts only the PR102 approved file set.

## Rollback

Rollback is reverting only the PR102 decision document, its focused contract test, and exact changed-file guard maintenance entries.

No runtime, package, dependency, provider, adapter, schema, fixture, deployment, publication, hosted, or persisted-data rollback should be needed because PR102 approves none of those changes.
