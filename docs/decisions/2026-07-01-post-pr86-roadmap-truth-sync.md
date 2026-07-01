# Post-PR86 Roadmap Truth Sync

## Status

Accepted as a docs/tests-only truth-sync checkpoint.

## Current Merged State

Norma Core `origin/main` is current through PR #166 / PR86.

Since the post-PR82 truth sync:

- PR #163 / PR83 recorded the post-PR82 roadmap truth sync.
- PR #164 / PR84 hardened accepted-geometry integration determinism.
- PR #165 / PR85 added the package-private synthetic shared-unit-surface
  normalization helper.
- PR #166 / PR86 preserved metric policy through the normalizer, including
  surface-only metric policies on normalized output compositions.

Current `origin/main` for this checkpoint is:

```txt
2a2152c1bf90768a5540141f8d91196c32239735
```

## Accepted Geometry Closeout

The accepted-geometry local/private bridge rail is closed through PR86.

PR81 added `mapAcceptedGeometryToCoreV1` as a package-private mapper. PR85
added the package-private shared-unit-surface normalizer. PR86 preserved metric
policy through the normalizer so the synthetic shared surface and normalized
output compositions remain coherent for downstream Structured Analyze operation
contexts.

The accepted-geometry mapper and normalizer are not package-root exports, not
public APIs, not provider adapters, not perception layers, not source-truth
shortcuts, and not public product surfaces.

## Canonical Execution Rule

There is no forced PR ladder after PR86.

The current execution model remains:

- one small PR at a time;
- select work from current repository gaps;
- keep local/private/manual boundaries unless a later approval PR changes them;
- treat old PR-number ladders and historical next-step notes as retrieval
  context, not mandatory sequencing.

## Blocked Surfaces

The following remain blocked until a later explicit approval PR authorizes
their exact scope:

- public npm publication;
- hosted dashboard;
- API runtime;
- hosted or remote MCP;
- image, vision, camera, CAD, Figma, Photoshop, or Illustrator adapters;
- OpenAI or ChatGPT runtime integration;
- provider ingestion;
- recommendation, optimization, correction, or beauty scoring;
- prompt-derived source truth;
- automatic ratio-pack or family selection.

## Non-Goals

This checkpoint does not change runtime behavior, runtime source code, package
metadata, lockfiles, CLI behavior, MCP behavior, report-kit behavior, viewer
behavior, examples, schemas, dependencies, publication state, wiki state, provider
behavior, or remote services.

## Decision

PR86 is complete. PR87 records current roadmap truth only.

The next real work after PR87 must be selected from current gaps, not stale
roadmap labels.
