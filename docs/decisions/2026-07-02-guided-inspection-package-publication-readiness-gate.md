# Guided Inspection Package Publication Readiness Gate

## Status

PR98 is a docs/tests/guard checkpoint for guided inspection package publication readiness.

PR98 does not publish `@norma/core`.

PR98 does not change package metadata.

PR98 does not remove `private: true`.

PR98 does not add `files`, `publishConfig`, package-level `bin`, dependencies, exports, release workflow, npm tag, npm version, npm auth, provenance setup, or release mechanics.

PR98 is a gate/checkpoint, not a publication candidate.

## Sequencing Basis

PR96 exported the approved package-root guided inspection V1 API:

- `createGuidedInspectionArtifactContractV1`
- `consumeGuidedInspectionDemoEnvelopeV1`

PR97 proved local package-root consumer compatibility for those guided inspection V1 exports.

PR97 is merged as PR #177:

```txt
merge commit: 6d831e9cb9ab38814832247d1946a6c8cd050675
head commit: c4aff0176bf9cd396dd1d1d49fccebb153634e19
```

PR98 records the publication readiness gate that follows PR96 and PR97. It does not implement publication work.

## Current Gate Decision

Decision: guided_inspection_publication_blocked_until_explicit_package_change_and_maintainer_publish_approval

The current package remains private.

Publication remains blocked.

Package metadata changes remain blocked until a later explicit package-change PR.

Actual publish remains blocked until a separate explicit maintainer approval.

Public npm publication remains blocked.

## API And Source Truth Contract

The `@norma/core` package-root guided inspection V1 functions remain the approved API surface from PR96:

- `createGuidedInspectionArtifactContractV1`
- `consumeGuidedInspectionDemoEnvelopeV1`

PR97 local consumer proof remains the compatibility evidence for those exports.

`result.json` remains the canonical machine-consumable Norma truth for the guided inspection flow.

`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived local inspection artifacts only.

Derived artifacts may be referenced as inspection outputs, but they must never be treated as source truth or package API truth.

Derived artifacts must not be used to infer, correct, optimize, recommend, score, select families, create source truth, or override Norma results.

## Future Publication Prerequisites

Before any guided inspection package publication or package metadata change, a later explicit package-change or publication-candidate PR must approve and verify:

- explicit maintainer decision whether public npm publication should happen at all;
- npm scope ownership and access verified outside PR98;
- package files and tarball policy approved;
- `dist/` and TypeScript types inclusion strategy approved;
- tests, goldens, and internal docs exclusion policy approved;
- package-level `bin` decision approved or explicitly excluded;
- license, repository, bugs, homepage, engines, and support metadata decision approved;
- provenance, trusted-publishing, token, 2FA, and release-environment policy approved;
- packed tarball install smoke required in a later package-change or publication-candidate PR;
- rollback, deprecate, and unpublish policy documented before actual publish.

PR98 does not implement any of these future package changes.

## Non-Approval Boundary

PR98 does not approve:

- package publication;
- public npm publication;
- package metadata changes;
- package-level bin;
- dependency changes;
- lockfile changes;
- new package exports;
- hosted MCP;
- ChatGPT connector runtime;
- OpenAI/provider calls;
- image/CAD/Figma/provider adapters;
- inference;
- recommendation;
- optimization;
- correction;
- scoring;
- automatic family selection;
- treating guide, report, summary, visual, or derived artifacts as source truth.

## Best Next PR

Best next PR after PR98:

```text
PR99: package tarball contents and metadata approval contract
```

PR99 should remain a package contract PR unless explicitly approved otherwise.

PR99 should still not publish.

PR99 should not implement package metadata changes unless that exact PR explicitly approves those changes.
