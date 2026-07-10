# Local Visual Observation-to-Core Pilot Contract

## Status

Approved as the PR127 docs/tests-only contract for the final local visual pilot
sequence. PR127 approves the exact PR128 and PR129 implementation boundaries
below. It does not implement either runtime.

Change Contract: `CC-20260710-PR127-LOCAL-VISUAL-OBSERVATION-TO-CORE v2`.

## Approved Pipeline

The complete allowed pipeline is frozen as:

```text
live provider-specific response, processed in memory
-> provider-specific adapter validation, processed in memory
-> redacted content-addressed provider execution receipt
-> exact provider-neutral candidate visual observation envelope
-> exact human candidate selection record outside the provider boundary
-> existing AcceptedGeometry@1
-> existing PR125 controlled provider observation acceptance proof
-> approved provider-neutral mapping-context boundary
-> existing deterministic AcceptedGeometry mapper
-> existing normalization / Structured Analyze
-> canonical result.json
-> derived guide/report artifacts
```

The provider-specific response and schema terminate inside the adapter. Only the
allowlisted provider execution receipt and provider-neutral candidate envelope
may cross the adapter boundary. Both are evidence, not accepted geometry, Core
input, or Norma truth.

`result.json` remains canonical computational truth. Guide, report, proof,
viewer, and demo artifacts remain derived and cannot override it.

## Provider Execution Receipt Identity

PR129 must compute one redacted, content-addressed execution receipt in memory
for each provider execution. Its package-private contract identity is exactly
`norma.local-visual-provider-execution-receipt@1`. Every object is closed;
fields not shown are rejected.

<!-- BEGIN LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_V1 -->
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contractId",
    "contractVersion",
    "executionReceiptContentIdentity",
    "sourceImageContentIdentity",
    "providerClass",
    "endpointClass",
    "responseStatusClass",
    "providerResponseContentIdentity",
    "structuredOutputSchemaVersion",
    "adapterOperationId",
    "adapterOperationVersion",
    "persistence"
  ],
  "properties": {
    "contractId": {
      "type": "string",
      "format": "norma-contract-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^norma\\.[a-z0-9.-]+@[1-9][0-9]*$",
      "const": "norma.local-visual-provider-execution-receipt@1"
    },
    "contractVersion": {
      "type": "integer",
      "const": 1
    },
    "executionReceiptContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "sourceImageContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "providerClass": {
      "type": "string",
      "const": "controlled_live_provider"
    },
    "endpointClass": {
      "type": "string",
      "const": "responses_api"
    },
    "responseStatusClass": {
      "type": "string",
      "const": "2xx_success"
    },
    "providerResponseContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "structuredOutputSchemaVersion": {
      "type": "string",
      "format": "norma-versioned-schema-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[a-z0-9][a-z0-9.-]+@[1-9][0-9]*$",
      "const": "controlled-rectangle-candidates@1"
    },
    "adapterOperationId": {
      "type": "string",
      "format": "norma-local-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$",
      "const": "local-visual-provider-response-to-candidate-observation"
    },
    "adapterOperationVersion": {
      "type": "integer",
      "const": 1
    },
    "persistence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rawProviderResponsePersisted",
        "requestBodyPersisted",
        "rawImagePersisted",
        "localPathPersisted",
        "urlPersisted",
        "providerRequestIdPersisted",
        "exactModelValuePersisted",
        "secretOrCredentialPersisted"
      ],
      "properties": {
        "rawProviderResponsePersisted": {
          "type": "boolean",
          "const": false
        },
        "requestBodyPersisted": {
          "type": "boolean",
          "const": false
        },
        "rawImagePersisted": {
          "type": "boolean",
          "const": false
        },
        "localPathPersisted": {
          "type": "boolean",
          "const": false
        },
        "urlPersisted": {
          "type": "boolean",
          "const": false
        },
        "providerRequestIdPersisted": {
          "type": "boolean",
          "const": false
        },
        "exactModelValuePersisted": {
          "type": "boolean",
          "const": false
        },
        "secretOrCredentialPersisted": {
          "type": "boolean",
          "const": false
        }
      }
    }
  }
}
```
<!-- END LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_V1 -->

`providerResponseContentIdentity` is the SHA-256 identity of the exact raw
provider response bytes/body computed before parsing and only in memory. The
raw response is never persisted. `executionReceiptContentIdentity` is the
SHA-256 identity of the deterministic canonical projection of the complete
receipt excluding only `executionReceiptContentIdentity` itself. That
projection therefore includes the source image identity, the three redacted
provider/endpoint/status classes, provider response content identity,
structured-output schema version, and adapter operation ID/version.

PR129 must extend the PR123 proof and PR124 observation with a strict
candidate-capable path. The current PR123 proof and
`norma.controlled-provider-observation-contract.v1` receipt-only path remain
unchanged and compatible. The new path may not omit or synthesize the execution
receipt and may not fall back to those v1 receipt-only semantics.

The candidate-capable PR123 proof must validate the complete receipt, recompute
both response and execution identities from the in-memory response and canonical
projection, and carry `providerExecutionReceiptContentIdentity`. The
candidate-capable PR124 observation is exactly
`norma.controlled-provider-observation-contract.v2`, version `2`; it must carry
the same `providerExecutionReceiptContentIdentity`, and its `observationId` must
be `controlled-provider-observation:v2:<execution-receipt-hex>`, where
`<execution-receipt-hex>` is the 64 lowercase hexadecimal characters after the
receipt's `sha256:` prefix. All other PR124 v1 authority flags remain unchanged.

The candidate envelope, PR125 acceptance proof extension, PR128 handoff/result
evidence, canonical-result proof, and derived inspection artifacts must repeat
and validate that exact execution receipt content identity. Two executions over
the same image remain distinct when their response bytes differ. A receipt,
PR124 observation, candidate envelope, selection, or accepted geometry from a
different execution must fail closed even when every redacted class and source
image identity matches.

## Trust And Acceptance Authority

Provider output, prompts, confidence, labels, measurements, artifacts, and
candidate rectangles are untrusted evidence. None may self-accept or authorize
accepted geometry, Core mapping, ratio or pack selection, rules, tolerances,
evaluation, Structured Analyze, or `result.json`.

The first pilot requires a separate, affirmative human selection outside the
provider boundary. Absence of rejection is not acceptance. A confidence
threshold, provider status, label, score, rank, prompt, warning, artifact,
diagnostic, metadata value, or automatic rule cannot create `AcceptedGeometry`.

The human action must construct the exact selection record below, the existing
PR125 acceptance boundary, and `AcceptedGeometry@1` linkage. PR128 and PR129 must reuse
`createControlledProviderObservationAcceptanceProofV1` and its current proof
semantics; they must not introduce a second acceptance authority.

The current PR125 helper binds acceptance to the PR124 receipt-metadata
contract content identity. PR129 must not pass the new candidate envelope to
that unchanged validator or substitute the PR124 identity for the candidate
identity. PR129 must minimally extend the same package-private PR125 proof path
with `candidateObservationEnvelope` and `humanCandidateSelection` inputs:
validate the candidate-capable PR124 contract first, validate the exact
candidate envelope second, validate the exact human selection third, verify the
candidate's PR124 IDs, execution receipt identity, and source image content
identity, and then validate the candidate envelope, selection record, and
`AcceptedGeometry@1` together before producing a successful proof.

That PR129 branch must require `acceptanceActor.actorClass: "human"` in both
the selection record and the existing acceptance boundary, with identical actor
IDs. `AcceptedGeometry@1.sourceObservationId` and
`sourceObservationContentIdentity` must identify the candidate envelope, never
the PR124 receipt-metadata observation. The existing PR124 proof input remains
compatible. The proof's authority flags and `explicit_acceptance` mode remain
unchanged; no parallel acceptance authority is approved. Its candidate-path
result must additionally carry the execution receipt, candidate observation,
selection, and AcceptedGeometry identities. PR129 must extend the PR128
package-private handoff only enough to pass the candidate envelope and selection
record through that same proof-before-mapping order.

On the candidate path, the PR125 proof result adds exactly
`providerExecutionReceiptContentIdentity`, `candidateObservationId`,
`candidateObservationContentIdentity`, `humanSelectionId`, and
`humanSelectionContentIdentity` alongside its existing AcceptedGeometry
identity fields. PR129's handoff result, local result evidence, canonical-result
proof, and derived guide/report artifacts must repeat those exact five fields
and validate them against the proof they consume. None of these trace fields
adds acceptance authority.

## Human Candidate Selection Record

The first pilot permits only explicit human selection of exact rectangle
candidates. Its package-private selection contract identity is exactly
`norma.local-visual-human-candidate-selection@1`. Every object is closed;
fields not shown are rejected.

<!-- BEGIN LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_V1 -->
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contractId",
    "contractVersion",
    "selectionId",
    "selectionContentIdentity",
    "candidateObservationId",
    "candidateObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
    "acceptanceActor",
    "geometryAction",
    "selections",
    "authority"
  ],
  "properties": {
    "contractId": {
      "type": "string",
      "format": "norma-contract-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^norma\\.[a-z0-9.-]+@[1-9][0-9]*$",
      "const": "norma.local-visual-human-candidate-selection@1"
    },
    "contractVersion": {
      "type": "integer",
      "const": 1
    },
    "selectionId": {
      "type": "string",
      "format": "norma-local-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
    },
    "selectionContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "candidateObservationId": {
      "type": "string",
      "format": "norma-local-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
    },
    "candidateObservationContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "providerExecutionReceiptContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "acceptanceActor": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "actorClass",
        "actorId"
      ],
      "properties": {
        "actorClass": {
          "type": "string",
          "const": "human"
        },
        "actorId": {
          "type": "string",
          "format": "norma-local-identifier",
          "minLength": 1,
          "maxLength": 128,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
        }
      }
    },
    "geometryAction": {
      "type": "string",
      "const": "accept_exact"
    },
    "selections": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "order",
          "candidateId",
          "acceptedPrimitiveId"
        ],
        "properties": {
          "order": {
            "type": "integer",
            "minimum": 0
          },
          "candidateId": {
            "type": "string",
            "format": "norma-local-identifier",
            "minLength": 1,
            "maxLength": 128,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
          },
          "acceptedPrimitiveId": {
            "type": "string",
            "format": "norma-local-identifier",
            "minLength": 1,
            "maxLength": 128,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
          }
        }
      }
    },
    "authority": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "explicitHumanSelection",
        "providerAuthority",
        "confidenceAuthority",
        "automaticAcceptance",
        "coordinateCorrectionAllowed",
        "coordinateRepairAllowed"
      ],
      "properties": {
        "explicitHumanSelection": {
          "type": "boolean",
          "const": true
        },
        "providerAuthority": {
          "type": "boolean",
          "const": false
        },
        "confidenceAuthority": {
          "type": "boolean",
          "const": false
        },
        "automaticAcceptance": {
          "type": "boolean",
          "const": false
        },
        "coordinateCorrectionAllowed": {
          "type": "boolean",
          "const": false
        },
        "coordinateRepairAllowed": {
          "type": "boolean",
          "const": false
        }
      }
    }
  }
}
```
<!-- END LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_V1 -->

`selectionContentIdentity` is the SHA-256 identity of the deterministic
canonical projection of the complete selection record excluding only
`selectionContentIdentity` itself. Every selected candidate ID must be unique,
must exist in the validated candidate envelope, and must appear in the same
relative order as the candidate envelope. Every `order` is the zero-based
selection-array position. Every `acceptedPrimitiveId` is unique.

`AcceptedGeometry@1.primitives` must contain exactly one rectangle for each
selection, in selection order, with its `id` equal to the mapped
`acceptedPrimitiveId`, `kind` equal to `rectangle`, and `confidence` equal to
`null`. Its `x`, `y`, `width`, and `height` must be numerically identical to the
selected candidate after only the field-for-field representation mapping.
`AcceptedGeometry@1.coordinateFrame` must equal the candidate coordinate frame,
and `correctionHistory` must be empty. There is no rounding, clamping, repair,
inference, confidence threshold, coordinate default, omitted-coordinate
default, or coordinate correction in the first pilot. Coordinate corrections
remain unapproved.

The existing acceptance boundary's provider-observation fields must repeat the
candidate observation ID/content identity. The existing
`AcceptedGeometry@1.acceptance.acceptanceId` must equal `selectionId`, its
ordered `acceptedPrimitiveIds` must equal the selection record's ordered
`acceptedPrimitiveId` values, and
`acceptance.provenance.inputContentIdentity` must equal
`selectionContentIdentity`. The top-level AcceptedGeometry provenance continues
to identify the candidate observation content identity. Both acceptance actor
records must use the same human actor ID.

Rejected or unselected candidates are omitted only. Their data cannot be
silently copied, substituted, mutated, or used to alter a selected rectangle.
Candidate A paired with geometry B fails even when the envelope observation ID
and content identity match. A selection failure produces no partial
`AcceptedGeometry`, Core input, mapped geometry, Structured Analyze result, or
`result.json`.

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
      "type": "string",
      "format": "norma-contract-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^norma\\.[a-z0-9.-]+@[1-9][0-9]*$",
      "const": "norma.local-visual-candidate-observation@1"
    },
    "contractVersion": {
      "type": "integer",
      "const": 1
    },
    "observationId": {
      "type": "string",
      "format": "norma-local-identifier",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
    },
    "observationContentIdentity": {
      "type": "string",
      "format": "sha256-content-identity",
      "minLength": 71,
      "maxLength": 71,
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
          "format": "sha256-content-identity",
          "minLength": 71,
          "maxLength": 71,
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
        "providerExecutionReceiptContentIdentity",
        "providerSpecificSchemaTerminated",
        "manualOnly",
        "localOnly",
        "realUserData"
      ],
      "properties": {
        "provenanceClass": {
          "type": "string",
          "const": "controlled-local-live-visual-observation"
        },
        "adapterBoundary": {
          "type": "string",
          "format": "norma-versioned-boundary-identifier",
          "minLength": 1,
          "maxLength": 128,
          "pattern": "^[a-z0-9][a-z0-9.-]+@[1-9][0-9]*$",
          "const": "provider-specific-response-to-provider-neutral-candidate-observation@1"
        },
        "sourceReceiptObservationId": {
          "type": "string",
          "format": "norma-local-identifier",
          "minLength": 1,
          "maxLength": 128,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
        },
        "sourceReceiptObservationContentIdentity": {
          "type": "string",
          "format": "sha256-content-identity",
          "minLength": 71,
          "maxLength": 71,
          "pattern": "^sha256:[0-9a-f]{64}$"
        },
        "providerExecutionReceiptContentIdentity": {
          "type": "string",
          "format": "sha256-content-identity",
          "minLength": 71,
          "maxLength": 71,
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
        "bounds",
        "sourcePixelWidth",
        "sourcePixelHeight"
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
        },
        "sourcePixelWidth": {
          "type": "integer",
          "format": "positive-source-pixel-dimension",
          "minimum": 1
        },
        "sourcePixelHeight": {
          "type": "integer",
          "format": "positive-source-pixel-dimension",
          "minimum": 1
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
            "format": "norma-local-identifier",
            "minLength": 1,
            "maxLength": 128,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
          },
          "order": {
            "type": "integer",
            "minimum": 0
          },
          "x": {
            "type": "number",
            "format": "finite-normalized-unit-interval",
            "minimum": 0,
            "maximum": 1
          },
          "y": {
            "type": "number",
            "format": "finite-normalized-unit-interval",
            "minimum": 0,
            "maximum": 1
          },
          "width": {
            "type": "number",
            "format": "finite-normalized-positive-unit-interval",
            "exclusiveMinimum": 0,
            "maximum": 1
          },
          "height": {
            "type": "number",
            "format": "finite-normalized-positive-unit-interval",
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
                "format": "finite-normalized-unit-interval",
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
            "format": "norma-local-identifier",
            "minLength": 1,
            "maxLength": 128,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
          },
          "code": {
            "type": "string",
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
            ],
            "format": "norma-local-identifier",
            "minLength": 1,
            "maxLength": 128,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
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
`y + height <= 1`. `sourcePixelWidth` and `sourcePixelHeight` are positive
integers read from the validated local source image, never from provider output;
they are coordinate-frame metadata and carry no measurement or acceptance
authority.

`provenance.sourceReceiptObservationId` and
`provenance.sourceReceiptObservationContentIdentity` must match the validated
candidate-capable PR124 v2 observation and its recomputed canonical content
identity. `provenance.providerExecutionReceiptContentIdentity` must match both
the validated provider execution receipt and the PR123/PR124 propagated value.
`sourceImage.contentIdentity` must also match the receipt and PR124 non-null
`imageContentIdentity`. These links preserve the PR123 -> PR124 evidence chain
but carry no acceptance authority. Any cross-execution pairing fails closed.

Warnings are code-only allowlisted records. A warning that names a candidate
must link to an existing candidate ID. Arbitrary provider text is forbidden.

`diagnosticMetadata` is optional as a whole. If retained, it contains exactly
one normalized `providerConfidence` number. Confidence is diagnostic only and
is excluded from every acceptance, mapping, ratio, pack, rule, tolerance, and
evaluation decision.

The source image content identity is computed from image bytes in memory. Image
bytes are not persisted. `observationContentIdentity` is the SHA-256 identity of
the deterministic canonical projection of the complete envelope excluding only
the `observationContentIdentity` field itself. That projection necessarily
includes the execution receipt identity and every ordered rectangle candidate,
including IDs, order, coordinates, and retained diagnostic metadata.

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
2. the exact provider response bytes have an in-memory-only
   `providerResponseContentIdentity`, and the redacted provider execution
   receipt has `executionReceiptContentIdentity`;
3. the candidate-capable PR123 proof and PR124 v2 observation validate and
   repeat that execution receipt identity; PR124 has a distinct observation ID
   for each distinct execution receipt;
4. the candidate observation repeats the execution receipt identity and has
   `observationId` and
   `observationContentIdentity`;
5. the human selection record repeats the execution receipt and candidate
   identities and has `selectionId` and `selectionContentIdentity`;
6. the PR125 proof validates the receipt, PR124 observation, candidate envelope,
   selection record, acceptance boundary, and `AcceptedGeometry` together and
   repeats their identities;
7. `AcceptedGeometry@1` repeats the exact candidate observation ID/content
   identity, preserves the exact selected rectangles and order, and has its own
   accepted revision and envelope content identities;
8. the mapper request has its own `requestId` and repeats the exact
   AcceptedGeometry and source observation identities;
9. the mapper result repeats `requestId` and has `resultContentIdentity`;
10. normalization has its own request ID and result content identity;
11. Structured Analyze has `analysisId`, linked source refs, the acceptance
   record, transformation steps, and `serializationSummary.meaningfulIdentity`;
12. the local proof records a SHA-256 content identity for the canonical bytes of
   `result.json` without widening the result schema; and
13. derived guide/report artifacts repeat only the non-secret trace identities
    they consume and remain non-authoritative.

Each identity is recomputed and checked before constructing the next stage.
Identity equality is necessary but never sufficient for acceptance authority.

## Fail-Closed Boundary

Provider response identity, provider parsing, execution receipt validation,
PR123/PR124 propagation, candidate validation, exact human selection,
AcceptedGeometry equivalence, PR125 proof validation, identity linkage,
mapping, normalization, Structured Analyze input validation, and result
validation are sequential hard gates.

If any gate fails, execution stops with a deterministic diagnostic. No partial
`AcceptedGeometry`, Core input, mapped geometry, Structured Analyze result, or
`result.json` may be returned or persisted. A validated redacted receipt or
candidate envelope may remain as evidence after a later gate fails, but neither
can be relabeled as accepted, mapped, or canonical.

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
- compute the raw response content identity in memory and construct the exact
  redacted provider execution receipt;
- minimally extend PR123 proof and PR124 observation with the strict
  candidate-capable execution-receipt identity path while preserving existing
  receipt-only PR123/PR124 behavior and forbidding candidate-path fallback;
- validate provider-specific structured output in memory and map it to the exact
  provider-neutral candidate envelope above;
- persist only the allowlisted redacted execution receipt and structured
  candidate observation, containing only the approved SHA-256 identities,
  classes, flags, and candidate fields;
- require the exact separate human selection record before creating
  `AcceptedGeometry@1`;
- minimally extend the existing package-private PR125 proof and PR128 handoff
  inputs with `candidateObservationEnvelope` and `humanCandidateSelection`,
  preserving the proof-before-mapping order;
- require the live candidate path's acceptance actor class to be exactly
  `human`, validate exact selected-candidate rectangle equality and order, link
  the execution receipt identity through every stage, and bind
  `AcceptedGeometry@1` to the candidate observation identity rather than the
  PR124 receipt-metadata identity;
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
closed and typed execution-receipt, candidate-envelope, and human-selection
shapes, field-level validation, distinct same-image response identities,
cross-execution rejection, candidate-A/geometry-B rejection, exact-selection
acceptance, provider-type termination, explicit PR125 authority reuse, identity
chain, fail-closed behavior, PR123/PR124 receipt-only compatibility, PR128 and
PR129 scope, exact changed-file set, forbidden-surface absence, and roadmap
sequence.

The approved sequence is strictly PR127 -> PR128 -> PR129. PR129 must not begin
before PR128 merges.
