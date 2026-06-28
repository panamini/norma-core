# Read-Only Result Viewer Workflow

This example documents a current local-only inspection workflow for existing result-envelope data.

It shows a high-level inspection sequence for existing result-envelope data. It does not execute Norma operations, load files, retrieve network content, read shell or environment state, or create source truth.

## Inspection Sequence

1. Start with explicit structured JSON data that already exists.
2. Confirm the input is an inspectable result envelope or approved wrapper shape.
3. Keep every visible result section attached to the source path where it was found.
4. Treat warnings, errors, diagnostics, mismatches, provenance, refs, and freshness details as user-visible facts.
5. Stop at displayability.

Displayability is not source-truth validation.

The package-private helpers are not public API.

## Inert Result Envelope Snippet

```json
{
  "kind": "run-verification",
  "status": "verified",
  "mode": "audit_only",
  "runRef": { "id": "run:onboarding-example" },
  "operationName": "core.mvp-demo.run",
  "operationVersion": "0.1.0-test",
  "packLockRef": { "id": "pack-lock:onboarding-example" },
  "operationContextRef": { "id": "operation-context:onboarding-example" },
  "sourceRefs": [{ "kind": "mvp-demo-input", "ref": "source:onboarding-example" }],
  "missingSourceRefs": [],
  "outputRefs": [{ "kind": "core-result", "ref": "output:onboarding-example" }],
  "mismatchCodes": [],
  "warnings": [],
  "errors": [],
  "provenance": {
    "operationName": "core.mvp-demo.run",
    "operationVersion": "0.1.0-test",
    "inputRefs": [{ "kind": "mvp-demo-input", "ref": "source:onboarding-example" }],
    "source": { "kind": "core", "ref": "doc-example" }
  },
  "replaySummary": {
    "replayAttempted": false,
    "replayRequired": false,
    "replayEligible": "not_requested",
    "replayStatus": null,
    "replayDiagnostics": [],
    "replayMismatches": [],
    "replayOutputRefs": [],
    "recordedOutputRefs": [{ "kind": "core-result", "ref": "output:onboarding-example" }],
    "sourceRefsUsed": [{ "kind": "mvp-demo-input", "ref": "source:onboarding-example" }]
  },
  "serializationSummary": {
    "serializationVersion": "stable-json-v1",
    "canonicalOrdering": true
  },
  "unknownExampleField": {
    "display": "inspectable when present"
  }
}
```

## Visible Sections

The display workflow keeps status, diagnostics, warnings, errors, mismatches, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, and unknown fields visible when present.

These sections must not collapse to a generic boolean.

## Blocked Inputs And Non-Goals

Blocked inputs include prompt text as source truth, artifacts as source truth, inferred source truth, open-ended replay requests, local path reads, network retrieval, shell or environment access, media-derived input, design-tool input, extension or store input, aesthetic scoring, creative advice, and inferred intent.

Non-goals include operation execution, source mutation, source-truth creation, product surface behavior, route behavior, remote tool behavior, package-root promotion, release distribution claims, hosted configuration, and new third-party requirements.
