# Structured JSON Input Viewer

This example is inert documentation only.

It describes accepted and rejected structured JSON shapes for display inspection. It does not define public API, execute an operation, load files, retrieve network content, read shell or environment state, or create source truth.

The current helper is package-private and not public API.

Displayability is not source-truth validation.

## Accepted Shapes

Accepted shapes are explicit structured JSON objects that already carry existing result data or approved wrapper data.

Accepted shape families include:

- Norma result envelope;
- response envelope carrying an existing result;
- command output envelope carrying an existing result;
- approved tool result envelope carrying an existing result.

All accepted shapes remain inert data for display only.

## Inert Accepted Snippet

```json
{
  "kind": "norma-core-cli-result",
  "command": "inspect-existing-result",
  "status": "ok",
  "coreVersion": "0.1.0-test",
  "exitCode": 0,
  "result": {
    "kind": "artifact-freshness-verification",
    "status": "current",
    "artifactRef": { "kind": "artifact", "ref": "artifact:example" },
    "sourceRefs": [{ "kind": "mvp-demo-input", "ref": "source:example" }],
    "missingSourceRefs": [],
    "staleSourceRefs": [],
    "outputRefs": [{ "kind": "artifact", "ref": "artifact:example" }],
    "warnings": [],
    "errors": [],
    "provenance": {
      "operationName": "core.mvp-demo.run",
      "operationVersion": "0.1.0-test",
      "inputRefs": [{ "kind": "mvp-demo-input", "ref": "source:example" }],
      "source": { "kind": "core", "ref": "doc-example" }
    },
    "serializationSummary": {
      "serializationVersion": "stable-json-v1"
    },
    "unknownExampleField": "kept inspectable"
  }
}
```

## Rejected Shapes

Rejected shapes include non-object JSON, malformed JSON, incomplete known envelopes, generic method wrappers, unsupported tool result wrappers, prompt text as source truth, artifacts as source truth, inferred source truth, open-ended replay requests, direct local path reads, network retrieval, shell or environment access, mutation-shaped input, media-derived input, design-tool input, store or extension input, aesthetic scoring, creative advice, and inferred intent.

Rejected inputs must stay rejected. They must not be converted into accepted source truth.

## Size And Shape Limits

The display boundary keeps bounded JSON limits at a high level:

- body size is limited;
- JSON depth is limited;
- array length is limited;
- string length is limited.

These limits are documentation of the existing display boundary, not a new parser path.

## Required Visibility

Accepted display models preserve status, diagnostics, warnings, errors, mismatches, provenance, source refs, output refs, artifact freshness, operation context, pack locks, tolerance policy, serialization version, operation version, result identity, and unknown fields when present.

The display model must not collapse those details to a generic boolean.

## Blocked Inputs And Non-Goals

Blocked inputs include prompt text as source truth, artifacts as source truth, inferred source truth, open-ended replay, local path reads, network retrieval, shell or environment access, media-derived input, design-tool input, extension or store input, aesthetic scoring, creative advice, and inferred intent.

Non-goals include executable examples, operation execution, source mutation, source-truth creation, product surface behavior, route behavior, remote tool behavior, package-root promotion, release distribution claims, hosted configuration, and new third-party requirements.
