# Auditable visual measurement rapid proof

Status: `ACCEPTED_FOR_PR2`
Contract: `CP-20260728-NORMA-RAPID-PROOF v1`

## Decision

Norma is an auditable visual-measurement system, not a universal vision platform.

Routing defaults:

- exact source identity and validation belong to the adapter boundary;
- semantic objects or regions may use SAM;
- lines, axes, frames, quadrilaterals, and ellipses may use deterministic CV or local pixel refinement;
- composition and semantic role may use a host VLM as a non-authoritative proposal;
- every model or calculated observation remains a candidate until explicit acceptance.

These are routing defaults, not universal geometric laws. The user chooses a review goal; no provider or pipeline chooses it implicitly.

## PR2 UX contract

- `Original / Guides` changes presentation only.
- The initial view shows the first four preparation-ordered candidates.
- Preparation instructions require strongest visible construction evidence first.
- Hidden candidates remain selected or unselected exactly as prepared; focus never changes confirmation or Core input.
- The user can explicitly reveal all candidates.
- A ready SAM result reveals all candidates so the new proposal cannot remain hidden.

## Measurement contract

`norma.personal-visual-harmony-review-journal@1` stores at most 64 records scoped to the exact file and candidate-set identity.

Allowed records contain only:

- an event code;
- a browser timestamp;
- the bounded server prepare duration when available.

The summary reports correction counts, explicit SAM outcome, failures, time from interactive draft to confirmation, and time from interactive draft to visible Core result.

Forbidden data includes image bytes or URLs, prompts, labels, provider bodies, secrets, tokens, claims, emails, and user history. The widget emits no console log for this journal.

The 12 synthetic smoke cases prove schema, bounds, aggregation, abstention, failure, comparison, correction, and confirmation paths. They do not prove model quality or representative product performance.

## Scope frozen

This decision does not authorize:

- a new perception pipeline or provider;
- a public SDK;
- mobile, OEM, CAD, design-tool, or maps adapters;
- a Web Lab;
- persistent SaaS telemetry;
- Core geometry, ratio, pack, or evaluation changes;
- wiki mutation;
- deployment or merge.

Application logic remains in the active MCP/runtime path until a second real client justifies extraction.

## Gate

PR1 received `GO` after the promoted ChatGPT smoke passed A/B selection, manual removal, semantic SAM abstention, browser error, and exact-head checks.

PR2 must first be tested manually on the single reference image. No 10–15-call
provider run is part of this PR: the 12-case corpus is synthetic and provider-free.
Additional controlled images are optional only after that first result. The next
decision is exactly one of:

- `GO`: measurements are complete and the UX improves review;
- `ADJUST`: one bounded repair is justified by observed evidence;
- `STOP`: measurement is incomplete or added friction is not justified.

PR3 remains blocked until PR2 produces usable measurements.
