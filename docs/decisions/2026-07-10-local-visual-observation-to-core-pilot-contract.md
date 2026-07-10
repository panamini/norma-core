# Local Visual Observation-to-Core Pilot Contract

## Status

Approved as the PR127 docs/tests-only contract for the final local visual pilot
sequence. PR127 approves the exact PR128 and PR129 implementation boundaries
below. It does not implement either runtime.

Change Contract: `CC-20260710-PR127-LOCAL-VISUAL-OBSERVATION-TO-CORE v1`.

## Approved Pipeline

The complete allowed pipeline is frozen as:

```text
live provider-specific response, processed in memory
-> provider-specific adapter validation, processed in memory
-> exact provider-neutral candidate visual observation envelope
-> explicit human acceptance outside the provider boundary
-> existing AcceptedGeometry@1
-> existing PR125 controlled provider observation acceptance proof
-> approved provider-neutral mapping-context boundary
-> existing deterministic AcceptedGeometry mapper
-> existing normalization / Structured Analyze
-> canonical result.json
-> derived guide/report artifacts
```

The provider-specific response and schema terminate inside the adapter. Only the
provider-neutral candidate envelope may cross the adapter boundary. The
candidate envelope is evidence, not accepted geometry, Core input, or Norma
truth.

`result.json` remains canonical computational truth. Guide, report, proof,
viewer, and demo artifacts remain derived and cannot override it.

## Trust And Acceptance Authority

Provider output, prompts, confidence, labels, measurements, artifacts, and
candidate rectangles are untrusted evidence. None may self-accept or authorize
accepted geometry, Core mapping, ratio or pack selection, rules, tolerances,
evaluation, Structured Analyze, or `result.json`.

The first pilot requires a separate, affirmative human selection outside the
provider boundary. Absence of rejection is not acceptance. A confidence
threshold, provider status, label, score, rank, prompt, warning, artifact,
diagnostic, metadata value, or automatic rule cannot create `AcceptedGeometry`.

The human action must construct the existing PR125 acceptance boundary and
`AcceptedGeometry@1` linkage. PR128 and PR129 must reuse
`createControlledProviderObservationAcceptanceProofV1` and its current proof
semantics; they must not introduce a second acceptance authority.

The current PR125 helper binds acceptance to the PR124 receipt-metadata
contract content identity. PR129 must not pass the new candidate envelope to
that unchanged validator or substitute the PR124 identity for the candidate
identity. PR129 must minimally extend the same package-private PR125 proof path
with a `candidateObservationEnvelope` input: validate the existing PR124
contract first, validate the exact candidate envelope second, verify the
candidate's source-receipt IDs and source image content identity against PR124,
and then bind the existing
acceptance boundary and `AcceptedGeometry@1` to the candidate envelope's
`observationId` and `observationContentIdentity`.

That PR129 branch must require `acceptanceActor.actorClass: "human"`. The
existing PR124 proof input remains compatible. The proof output contract and
authority flags remain unchanged; no parallel proof type or acceptance mode is
approved. PR129 must extend the PR128 package-private handoff only enough to
pass `candidateObservationEnvelope` through that same proof-before-mapping
order.

## Approved Mapper Boundary

PR128 may extend `mappingContext.boundary` with exactly:

```text
explicit-external-evidence-acceptance@1
```

The existing `synthetic-only` literal remains supported without semantic drift.
The new literal is provider-neutral and versioned. It is not an authorization
token and cannot make an observation acceptable by itself.

The PR126 handoff must first run and validate the PR125 acceptance proof. Only
after that proof succeeds and all observation/acceptance/AcceptedGeometry
identities link exactly may the handoff construct a mapper request containing
`mappingContext.boundary: "explicit-external-evidence-acceptance@1"`. The
existing mapper must still validate `AcceptedGeometry@1` internally.

No caller-supplied mapping result, mapped geometry, Core input, or detached proof
may bypass that order.

## Candidate Visual Observation Envelope

The PR129 package-private candidate contract identity is exactly
`norma.local-visual-candidate-observation@1`. Every object in the contract is
closed; fields not shown are rejected. This schema is an implementation
contract, not a public package export.

<!-- BEGIN LOCAL_VISUAL_CANDIDATE_OBSERVATION_ENVELOPE_V1 -->
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contractId",
    "contractVersion",
    "observationId",
    "observationContentIdentity",
    "sourceImage",
    "provenance",
    "coordinateFrame",
    "rectangleCandidates",
    "lossyWarnings",
    "authority",
    "persistence",
    "outcomes"
  ],
  "properties": {
    "contractId": {
      "const": "norma.local-visual-candidate-observation@1"
    },
    "contractVersion": {
      "const": 1
    },
    "observationId": {
      "type": "string",
      "minLength": 1
    },
    "observationContentIdentity": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "sourceImage": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contentIdentity",
        "rawImagePersisted",
        "base64Persisted",
        "localPathPersisted",
        "urlPersisted"
      ],
      "properties": {
        "contentIdentity": {
          "type": "string",
          "pattern": "^sha256:[0-9a-f]{64}$"
        },
        "rawImagePersisted": {
          "const": false
        },
        "base64Persisted": {
          "const": false
        },
        "localPathPersisted": {
          "const": false
        },
        "urlPersisted": {
          "const": false
        }
      }
    },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "provenanceClass",
        "adapterBoundary",
        "sourceReceiptObservationId",
        "sourceReceiptObservationContentIdentity",
        "providerSpecificSchemaTerminated",
        "manualOnly",
        "localOnly",
        "realUserData"
      ],
      "properties": {
        "provenanceClass": {
          "const": "controlled-local-live-visual-observation"
        },
        "adapterBoundary": {
          "const": "provider-specific-response-to-provider-neutral-candidate-observation@1"
        },
        "sourceReceiptObservationId": {
          "type": "string",
          "minLength": 1
        },
        "sourceReceiptObservationContentIdentity": {
          "type": "string",
          "pattern": "^sha256:[0-9a-f]{64}$"
        },
        "providerSpecificSchemaTerminated": {
          "const": true
        },
        "manualOnly": {
          "const": true
        },
        "localOnly": {
          "const": true
        },
        "realUserData": {
          "const": false
        }
      }
    },
    "coordinateFrame": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "dimensions",
        "coordinateScale",
        "origin",
        "xDirection",
        "yDirection",
        "bounds"
      ],
      "properties": {
        "dimensions": {
          "const": 2
        },
        "coordinateScale": {
          "const": "normalized"
        },
        "origin": {
          "const": "top-left"
        },
        "xDirection": {
          "const": "right"
        },
        "yDirection": {
          "const": "down"
        },
        "bounds": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "x",
            "y"
          ],
          "properties": {
            "x": {
              "const": [
                0,
                1
              ]
            },
            "y": {
              "const": [
                0,
                1
              ]
            }
          }
        }
      }
    },
    "rectangleCandidates": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "candidateId",
          "order",
          "x",
          "y",
          "width",
          "height"
        ],
        "properties": {
          "candidateId": {
            "type": "string",
            "minLength": 1
          },
          "order": {
            "type": "integer",
            "minimum": 0
          },
          "x": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "y": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "width": {
            "type": "number",
            "exclusiveMinimum": 0,
            "maximum": 1
          },
          "height": {
            "type": "number",
            "exclusiveMinimum": 0,
            "maximum": 1
          },
          "diagnosticMetadata": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "providerConfidence"
            ],
            "properties": {
              "providerConfidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              }
            }
          }
        }
      }
    },
    "lossyWarnings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "warningId",
          "code",
          "candidateId"
        ],
        "properties": {
          "warningId": {
            "type": "string",
            "minLength": 1
          },
          "code": {
            "enum": [
              "coordinate-normalization-loss",
              "rectangle-approximation-loss",
              "provider-confidence-diagnostic-only"
            ]
          },
          "candidateId": {
            "type": [
              "string",
              "null"
            ]
          }
        }
      }
    },
    "authority": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "providerEvidenceOnly",
        "sourceTruth",
        "acceptedGeometry",
        "coreInput",
        "maySelfAccept",
        "requiresExplicitHumanAcceptance",
        "mayAuthorizeMapping",
        "mayAuthorizeResultJson",
        "ratioAuthority",
        "packAuthority",
        "ruleAuthority",
        "toleranceAuthority",
        "evaluationAuthority"
      ],
      "properties": {
        "providerEvidenceOnly": {
          "const": true
        },
        "sourceTruth": {
          "const": false
        },
        "acceptedGeometry": {
          "const": false
        },
        "coreInput": {
          "const": false
        },
        "maySelfAccept": {
          "const": false
        },
        "requiresExplicitHumanAcceptance": {
          "const": true
        },
        "mayAuthorizeMapping": {
          "const": false
        },
        "mayAuthorizeResultJson": {
          "const": false
        },
        "ratioAuthority": {
          "const": false
        },
        "packAuthority": {
          "const": false
        },
        "ruleAuthority": {
          "const": false
        },
        "toleranceAuthority": {
          "const": false
        },
        "evaluationAuthority": {
          "const": false
        }
      }
    },
    "persistence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "providerPayloadPersisted",
        "rawProviderResponsePersisted",
        "rawImagePersisted",
        "redactedStructuredObservationOnly"
      ],
      "properties": {
        "providerPayloadPersisted": {
          "const": false
        },
        "rawProviderResponsePersisted": {
          "const": false
        },
        "rawImagePersisted": {
          "const": false
        },
        "redactedStructuredObservationOnly": {
          "const": true
        }
      }
    },
    "outcomes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "acceptedGeometryProduced",
        "coreInputProduced",
        "structuredAnalyzeRun",
        "resultJsonProduced"
      ],
      "properties": {
        "acceptedGeometryProduced": {
          "const": false
        },
        "coreInputProduced": {
          "const": false
        },
        "structuredAnalyzeRun": {
          "const": false
        },
        "resultJsonProduced": {
          "const": false
        }
      }
    }
  }
}
```
<!-- END LOCAL_VISUAL_CANDIDATE_OBSERVATION_ENVELOPE_V1 -->

## Candidate Validation And Persistence

PR129 must validate every closed object before persistence or acceptance. The
candidate array is non-empty, candidate IDs are unique, and `order` is exactly
the zero-based array position. All rectangle numbers are finite. `x`, `y`,
`width`, and `height` are normalized top-left/y-down coordinates bounded to
`[0,1]`; width and height are greater than zero; `x + width <= 1` and
`y + height <= 1`.

`provenance.sourceReceiptObservationId` and
`provenance.sourceReceiptObservationContentIdentity` must match the validated
PR124 receipt-metadata contract and its recomputed canonical content identity.
`sourceImage.contentIdentity` must also match the PR124 non-null
`imageContentIdentity`. These links preserve the PR123 -> PR124 evidence chain
but carry no acceptance authority.

Warnings are code-only allowlisted records. A warning that names a candidate
must link to an existing candidate ID. Arbitrary provider text is forbidden.

`diagnosticMetadata` is optional as a whole. If retained, it contains exactly
one normalized `providerConfidence` number. Confidence is diagnostic only and
is excluded from every acceptance, mapping, ratio, pack, rule, tolerance, and
evaluation decision.

The source image content identity is computed from image bytes in memory. Image
bytes are not persisted. `observationContentIdentity` is the SHA-256 identity of
the deterministic canonical projection of the complete envelope excluding only
the `observationContentIdentity` field itself.

Only the allowlisted redacted candidate envelope may be persisted. The envelope
must not contain `AcceptedGeometry`, Core input, `result.json`, ratio, pack,
rule, tolerance, measurement, evaluation, decision, artifact, provider payload,
raw response, raw image/base64, local path, URL, secret, credential, hidden
prompt, chain-of-thought, exact model environment value, or real-user data.

## Provider Schema Termination

The provider-specific structured response schema exists only inside the PR129
adapter and only in memory. The adapter validates it, converts it to the exact
provider-neutral candidate envelope, then discards it.

Provider-specific types, SDK objects, response fields, model names, finish
status values, labels, and payload fragments must not appear in the candidate
contract, AcceptedGeometry, mapper request, normalization request, Structured
Analyze input, Core imports, package-root exports, or persisted artifacts. Core
must never import provider-specific types.

## Identity And Provenance Chain

Every stage is independently traceable without raw provider output:

1. the image has `sourceImage.contentIdentity`;
2. the validated PR124 receipt metadata has an observation ID and recomputed
   content identity linked by the candidate provenance;
3. the candidate observation has `observationId` and
   `observationContentIdentity`;
4. the PR125 proof links that exact candidate observation identity to the explicit
   acceptance boundary and the selected `AcceptedGeometry` identities;
5. `AcceptedGeometry@1` repeats the exact candidate observation ID/content identity
   and has its own accepted revision and envelope content identities;
6. the mapper request has its own `requestId` and repeats the exact
   AcceptedGeometry and source observation identities;
7. the mapper result repeats `requestId` and has `resultContentIdentity`;
8. normalization has its own request ID and result content identity;
9. Structured Analyze has `analysisId`, linked source refs, the acceptance
   record, transformation steps, and `serializationSummary.meaningfulIdentity`;
10. the local proof records a SHA-256 content identity for the canonical bytes of
   `result.json` without widening the result schema; and
11. derived guide/report artifacts repeat only the non-secret trace identities
    they consume and remain non-authoritative.

Each identity is recomputed and checked before constructing the next stage.
Identity equality is necessary but never sufficient for acceptance authority.

## Fail-Closed Boundary

Provider parsing, candidate validation, explicit acceptance, PR125 proof
validation, identity linkage, mapping, normalization, Structured Analyze input
validation, and result validation are sequential hard gates.

If any gate fails, execution stops with a deterministic diagnostic. No partial
Core input, mapped geometry, Structured Analyze result, or `result.json` may be
returned or persisted. A validated redacted candidate envelope may remain as
evidence after a later gate fails, but it cannot be relabeled as accepted,
mapped, or canonical.

## PR128 Exact Implementation Scope

PR128 may only:

- extend the existing package-private mapper contract with
  `explicit-external-evidence-acceptance@1` while preserving `synthetic-only`;
- update or replace PR126's `blocked_unapproved_mapping_boundary` result only
  after the existing PR125 proof succeeds and identity linkage is exact;
- construct the mapper request inside that validated handoff rather than accept
  one from a caller;
- reuse the existing deterministic AcceptedGeometry mapper, normalization, and
  Structured Analyze implementation;
- reuse only existing deterministic local comparison/default behavior required
  by the guided inspection path, recording it as derived and never allowing
  provider metadata to influence it; and
- produce deterministic local `result.json` evidence from already accepted
  geometry with the identity chain above.

PR128 must not change provider requests, request bodies, response schemas,
parsers, adapters, network behavior, manual provider execution, package-root
exports, or dependencies; it must not add public exports, public contracts, or
Core computation semantics.

## PR129 Exact Implementation Scope

PR129 may only:

- change the controlled manual local provider pilot from receipt-only evidence
  to structured rectangle candidate observations;
- validate provider-specific structured output in memory and map it to the exact
  provider-neutral candidate envelope above;
- persist only the allowlisted redacted structured candidate observation;
- require a separate explicit human acceptance action before creating
  `AcceptedGeometry@1`;
- minimally extend the existing package-private PR125 proof and PR128 handoff
  inputs with `candidateObservationEnvelope`, preserving the PR124 path, proof
  output, and proof-before-mapping order;
- require the live candidate path's acceptance actor class to be exactly
  `human`, link PR124 receipt identity to candidate provenance, and bind
  `AcceptedGeometry@1` to the candidate observation identity rather than the
  receipt-metadata identity;
- pass the accepted result through the PR125 proof and PR128 handoff; and
- reuse existing guided inspection/report surfaces to produce canonical
  `result.json` plus derived inspection artifacts.

PR129 remains manual, local, disabled by default, and CI-network-free. It must
not add an automatic acceptance mode or make live network access a test or CI
dependency.

## Explicit Non-Goals

PR127 does not approve or implement:

- PR128 or PR129 runtime;
- hosted or remote MCP;
- ChatGPT connector runtime;
- CAD or Figma integration;
- uploads or image hosting;
- servers or deployment;
- OAuth, auth, or secret-management runtime;
- package publication;
- public exports or public API widening;
- provider SDK or dependency changes;
- provider/OpenAI runtime, request, response, parser, or network changes in this PR;
- autonomous or confidence-threshold acceptance;
- provider output as source truth;
- production or real-user data;
- public product launch;
- schema or runtime changes in this PR; or
- wiki mutation.

## Conditional Exact-Set Guard Trigger

The initial five-file PR127 contract and changed-file guard tests passed. The
first full `npm test` run then failed only in six inherited branch-family
exact-set tests:

- `tests/controlled-live-provider-smoke-artifact-proof.test.mjs`;
- `tests/controlled-live-provider-smoke.test.mjs`;
- `tests/controlled-provider-observation-acceptance-proof.test.mjs`;
- `tests/controlled-provider-observation-contract.test.mjs`;
- `tests/controlled-provider-observation-to-core-handoff.test.mjs`; and
- `tests/synthetic-external-evidence-acceptance-proof.test.mjs`.

Each failure compared the active branch only with approved sets through PR126.
This activates the Change Contract's conditional scope for those six files.
They may add only the exact PR127 set to the existing branch-family selection.
No implementation assertion, provider behavior, runtime contract, or protected
prefix is weakened.

## Validation Gates

PR127 is acceptable only if tests prove the exact pipeline, mapper literal,
closed envelope shape, field-level validation, provider-type termination,
explicit PR125 authority reuse, identity chain, fail-closed behavior, PR128 and
PR129 scope, exact changed-file set, forbidden-surface absence, and roadmap
sequence.

The approved sequence is strictly PR127 -> PR128 -> PR129. PR129 must not begin
before PR128 merges.
