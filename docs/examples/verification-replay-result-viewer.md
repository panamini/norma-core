# Verification Replay Result Viewer

This example is inert documentation only.

It describes how existing verification, replay, freshness, and MVP demo result data can be displayed without executing operations or creating source truth.

The current helper is package-private and not public API.

Displayability is not source-truth validation.

## Accepted Result Families

Accepted result families are existing inert data only:

- run verification result;
- run replay result;
- artifact freshness verification result;
- MVP demo result;
- accepted structured JSON display model carrying one of those result families;
- approved wrapper carrying one of those result families.

## Inert Replay Result Snippet

```json
{
  "kind": "run-replay",
  "status": "mismatch",
  "replayAttempted": true,
  "replayRequired": true,
  "operationName": "core.mvp-demo.run",
  "operationVersion": "0.1.0-test",
  "recordedRunRef": { "id": "run:recorded-example" },
  "replayedRunRef": { "id": "run:replayed-example" },
  "packLockRef": { "id": "pack-lock:example" },
  "operationContextRef": { "id": "operation-context:example" },
  "recordedOutputRefs": [{ "kind": "core-result", "ref": "output:recorded-example" }],
  "replayedOutputRefs": [{ "kind": "core-result", "ref": "output:replayed-example" }],
  "sourceRefsUsed": [{ "kind": "mvp-demo-input", "ref": "source:example" }],
  "mismatches": [{ "code": "OutputRefsMismatch", "message": "Recorded output refs differ." }],
  "verification": {
    "kind": "run-verification",
    "status": "verified",
    "mode": "audit_only",
    "runRef": { "id": "run:recorded-example" },
    "operationName": "core.mvp-demo.run",
    "operationVersion": "0.1.0-test",
    "packLockRef": { "id": "pack-lock:example" },
    "operationContextRef": { "id": "operation-context:example" },
    "sourceRefs": [{ "kind": "mvp-demo-input", "ref": "source:example" }],
    "missingSourceRefs": [],
    "outputRefs": [{ "kind": "core-result", "ref": "output:recorded-example" }],
    "mismatchCodes": [],
    "warnings": [],
    "errors": [],
    "provenance": null,
    "replaySummary": {}
  },
  "artifactFreshness": [],
  "tolerancePolicy": { "kind": "tolerance-policy", "id": "tolerance:example" },
  "warnings": [{ "code": "VisibleWarning", "severity": "warning" }],
  "errors": [{ "code": "VisibleError", "severity": "error" }],
  "provenance": {
    "operationName": "core.mvp-demo.run",
    "operationVersion": "0.1.0-test",
    "inputRefs": [{ "kind": "mvp-demo-input", "ref": "source:example" }],
    "source": { "kind": "core", "ref": "doc-example" }
  },
  "serializationSummary": {
    "serializationVersion": "stable-json-v1"
  },
  "unknownExampleField": {
    "display": "inspectable when present"
  }
}
```

## Required Visible Sections

The viewer keeps these sections visible when present:

- status;
- diagnostics;
- warnings;
- errors;
- mismatches;
- provenance;
- source refs;
- output refs;
- artifact freshness;
- operation context;
- pack locks;
- tolerance policy;
- serialization version;
- operation version;
- result identity;
- unknown fields.

Warnings, errors, diagnostics, mismatches, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, and unknown fields must not be hidden, muted, downgraded, suppressed, grouped away, summarized away, discarded, or collapsed to a generic boolean.

## Blocked Inputs And Non-Goals

Blocked inputs include prompt text as source truth, artifacts as source truth, inferred source truth, open-ended replay requests, direct local path reads, network retrieval, shell or environment access, media-derived input, design-tool input, extension or store input, aesthetic scoring, creative advice, and inferred intent.

Non-goals include executable examples, operation execution, source mutation, source-truth creation, product surface behavior, route behavior, remote tool behavior, package-root promotion, release distribution claims, hosted configuration, and new third-party requirements.
