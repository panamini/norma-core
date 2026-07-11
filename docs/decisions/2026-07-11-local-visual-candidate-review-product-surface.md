# Local Visual Candidate Review Product Surface

## Status

PR131 selects the local static visual candidate review and explicit-selection
surface as the first visual-pilot product surface.

PR131 is docs/tests-only. It selects and bounds the next implementation slice;
it does not implement UI, runtime, provider, package, hosted, or public behavior.

Change Contract:
`CC-20260711-PR131-LOCAL-VISUAL-CANDIDATE-REVIEW-SURFACE v1`.

## Selected Product Surface

The selected product surface is the local static visual candidate review and
explicit-selection surface: a separate browser page that lets a local operator
inspect one validated PR129 candidate observation over the exact local source
image, select one or more exact rectangle candidates, and emit a bounded
selection-intent JSON file.

This surface is not the existing read-only result viewer. The existing viewer
continues to inspect completed result envelopes only and remains read-only. It
must not be repurposed into an acceptance interface.

Private ChatGPT/MCP, hosted MCP, CAD/Figma, package publication, and public
product launch are deferred. They are not selected or approved by PR131.

## Why This Surface

PR129 proved the complete controlled local runtime from real provider evidence
through candidate observations, explicit accepted geometry, Core / Structured
Analyze, canonical `result.json`, and derived reports. Its operator checkpoint
also records the remaining product gap: the user-authorized selection record
was not backed by an independent UI interaction for each candidate.

The selected surface closes that exact gap before the same acceptance workflow
is hidden behind a connector, hosted service, or external adapter. It keeps the
provider-neutral architecture and makes the pilot understandable without
changing Core.

## Local Operator Journey

1. The existing PR129 capture command writes redacted
   `candidate-observation.json` and the provider execution receipt.
2. The operator opens the separate local static candidate-review surface.
3. The operator chooses the candidate observation and the original local PNG
   image through browser-local file selection. The first product slice is PNG
   only so browser orientation behavior cannot move overlays to different
   pixels.
4. The surface hashes the exact image bytes in memory and requires the result
   to equal `candidateObservation.sourceImage.contentIdentity`. Its decoded
   natural width and height must equal the candidate coordinate frame's
   `sourcePixelWidth` and `sourcePixelHeight` before any overlay is shown.
5. A missing, unsupported, oversized, or identity-mismatched image blocks
   overlays and selection.
6. The surface starts with no candidate selected. It renders every rectangle
   candidate over the matched image with a stable candidate ID, visible
   selection state, and synchronized keyboard-operable checkbox control.
7. Candidate toggles create only a pending set. A separate affirmative confirm
   action is required after the operator selects at least one exact candidate.
   Selected candidates keep their relative order from the candidate envelope.
8. Cancel, reject, empty selection, or validation failure produces no selection
   artifact. Successful confirmation downloads one closed, non-authoritative
   selection-intent JSON file. It does not create AcceptedGeometry or call Core.
9. A package-private Node finalizer bounded-reads the source image, provider
   execution receipt, candidate envelope, and intent from fresh snapshots. It
   revalidates their identities, dimensions, and exact linkage and requires an
   explicit `--confirm-exact-selection` operator flag before converting the
   intent into the existing
   `norma.local-visual-human-candidate-selection@1` record.
10. The existing PR129 no-network `--resume` path remains the only path from
    that validated selection record to AcceptedGeometry, Core / Structured
    Analyze, canonical `result.json`, and derived inspection artifacts.

## Input And Output Boundaries

The browser surface may consume only:

- one validated `norma.local-visual-candidate-observation@1` JSON object;
- one local PNG image of at most 2 MiB whose exact bytes match the
  observation's source-image content identity; and
- one operator-supplied opaque local actor identifier.

The first product slice remains restricted to synthetic or explicitly
non-sensitive local images. It does not approve production or real-user data.

The source image remains in browser memory. The surface must not upload it,
embed it into generated HTML, include it in the selection intent, write its
path, persist base64, or retain it in browser storage.

Candidate-observation JSON is limited to 256 KiB and 64 candidates. The emitted
intent is limited to 64 KiB and 64 selected candidate IDs. These product limits
are narrower than the underlying PR129 evidence contract and fail closed.

The surface may emit only the selection intent defined below. That intent is
untrusted, non-authoritative operator input; the literal `actorClass: "human"`
does not authenticate a person or independently prove that the image was
reviewed. Candidate
evidence, provider status, confidence, labels, prompts, artifacts, and image
identity cannot self-accept or create AcceptedGeometry.

The local actor identifier is an operator-provided opaque identifier, not proof
of a legal identity, account, email address, or authenticated human. PR131 does
not claim cryptographic proof that a particular person reviewed the image.

## Selection Intent Contract

The PR132 browser-to-Node handoff contract is exactly
`norma.local-visual-candidate-selection-intent@1`. Every object is closed and
fields not shown are rejected.

<!-- BEGIN LOCAL_VISUAL_CANDIDATE_SELECTION_INTENT_V1 -->
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contractId",
    "contractVersion",
    "candidateObservationId",
    "candidateObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
    "reviewedSourceImageContentIdentity",
    "acceptanceActor",
    "geometryAction",
    "selectedCandidateIds"
  ],
  "properties": {
    "contractId": {
      "type": "string",
      "const": "norma.local-visual-candidate-selection-intent@1"
    },
    "contractVersion": {
      "type": "integer",
      "const": 1
    },
    "candidateObservationId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
    },
    "candidateObservationContentIdentity": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "providerExecutionReceiptContentIdentity": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "reviewedSourceImageContentIdentity": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "acceptanceActor": {
      "type": "object",
      "additionalProperties": false,
      "required": ["actorClass", "actorId"],
      "properties": {
        "actorClass": {
          "type": "string",
          "const": "human"
        },
        "actorId": {
          "type": "string",
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
    "selectedCandidateIds": {
      "type": "array",
      "minItems": 1,
      "maxItems": 64,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
      }
    }
  }
}
```
<!-- END LOCAL_VISUAL_CANDIDATE_SELECTION_INTENT_V1 -->

The Node finalizer must validate closed plain JSON values for the receipt,
candidate envelope, and intent. It must reuse the existing package-private
receipt and candidate validators, require their execution, observation, and
source-image identities to match exactly, bounded-read the same local PNG image
once, recompute its SHA-256 identity, and require its decoded width and height
to equal the candidate coordinate frame's `sourcePixelWidth` and
`sourcePixelHeight`.
Selected candidate IDs must be unique, must exist, and must preserve candidate
envelope order.

The browser must not implement Norma canonical serialization or final
human-selection hashing. The Node finalizer computes the canonical selection
intent identity with existing serialization rules, derives a deterministic
`selectionId` from that identity, maps accepted primitive IDs by selection
order, and reuses
`finalizeLocalVisualHumanCandidateSelectionIdentityV1`. The existing PR129
selection validator remains the acceptance gate. Missing
`--confirm-exact-selection`, input drift, identity mismatch, dimension mismatch,
invalid PNG, or write failure must produce no final selection record.

The intent cannot contain coordinates, confidence thresholds, corrections,
prompts, provider payloads, URLs, paths, credentials, raw image bytes,
AcceptedGeometry, Core input, packs, rules, tolerances, or evaluation data.

## PR132 Implementation Boundary

PR132 may implement exactly one local visual candidate-review slice:

- a separate local static HTML/CSS/JS review surface;
- bounded local candidate-observation and image selection;
- in-memory SHA-256 image identity verification;
- deterministic top-left/y-down normalized rectangle overlays bound to the
  rendered image content box, without CSS crop or letterboxing drift;
- a synchronized checkbox list as the canonical, keyboard-accessible selection
  control, with candidate ID, order, coordinates, visible focus, and
  non-color-only state;
- bounded selection-intent download;
- one package-private intent validator/finalizer that rechecks the receipt,
  candidate envelope, PNG bytes, image identity, and source dimensions;
- one local developer command that finalizes intent into the existing human
  candidate selection record only after an explicit confirmation flag; and
- focused tests plus one concise local workflow document.

PR132 must remain local-only, dependency-free, package-private, and
CI-network-free, and limited to synthetic or explicitly non-sensitive input. It
must reuse the existing PR129 candidate validator, selection finalizer, and
no-network resume path.

The review page must use a restrictive local Content Security Policy, inert DOM
construction, short-lived object URLs that are revoked after use, and an
explicit PNG file input. It must not use unsafe HTML insertion, `fetch`,
XMLHttpRequest, WebSocket, EventSource,
beacon, remote URLs, external assets, cookies, local/session storage, IndexedDB,
service workers, clipboard APIs, workers, analytics, or provider calls. It must
not execute Core or Structured Analyze in browser code.

PR132 may not change provider request, response parser, model, prompt,
transport, or persistence behavior. It may not add coordinate dragging,
resizing, repair, correction, inference, autonomous acceptance, confidence
acceptance, accept-all defaults, confidence-driven sorting, package-root
exports, dependencies, lockfiles, hosted services,
OAuth, ChatGPT runtime, CAD/Figma, deployment, or publication.

## Deferred Product Tracks

The next product-track choice after PR132 and a no-PR operator validation is
expected to compare private ChatGPT/MCP with the remaining adapter tracks.
PR131 does not pre-approve that later choice.

Hosted MCP, public ChatGPT submission, CAD/Figma, package publication, public
exports, public web deployment, autonomous acceptance, production data, and
real-user data remain unapproved.

## Non-Goals

PR131 does not implement or modify runtime code, UI files, fixtures, package
metadata, dependencies, lockfiles, provider behavior, Core behavior, MCP,
ChatGPT, CAD/Figma, auth, servers, deployment, publication, or the wiki.

## Validation Gates

PR131 is acceptable only when tests prove that it selects exactly one visual
pilot product surface, freezes the closed selection-intent contract and PR132
boundary, preserves candidate-evidence and AcceptedGeometry authority rules,
keeps the existing read-only result viewer separate, leaves all deferred tracks
unapproved, and accepts only the exact PR131 docs/tests file set.

## Rollback

Rollback is reverting only the PR131 decision, roadmap wording, focused tests,
and exact-file guard maintenance. No runtime, package, provider, UI, persisted
data, or deployment rollback is required because PR131 implements none.
