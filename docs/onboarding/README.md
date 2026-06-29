# Onboarding

This page documents the current local inspection workflow: a current local-only inspection workflow for existing Norma result and viewer data.

It does not add a product surface, executable example, package root surface, route, hosted service, remote tool behavior, or release action.

## Current Supported Workflow

The supported workflow is inspection of existing Norma result envelopes and existing Structured Analyze result JSON.

The reader starts with explicit structured JSON that already represents existing deterministic output: a Norma result, Structured Analyze result JSON, response envelope, command envelope, or approved tool result envelope.

The documentation flow is:

1. Confirm the input is structured JSON data, not instructions.
2. Inspect whether the JSON shape is an accepted result envelope, Structured Analyze result, or wrapper.
3. Preserve visible result sections when they are present.
4. Treat rejected, missing, stale, mismatched, warning-bearing, and error-bearing states as inspectable facts.
5. Keep the source truth boundary separate from displayability.

## Local Structured Analyze Fixture

For a minimal local onboarding path, use the checked-in fixture at `docs/examples/read-only-result-viewer-onboarding-fixture.json`.

In a fresh checkout, run the repository build script from the repository root before opening `viewer/read-only-result-viewer.html`; the static viewer imports its package-private model from `dist/src/local-viewer/read-only-viewer-model.js`.

That fixture is existing invalid Structured Analyze result JSON. Copy the JSON object text into the static viewer textarea in `viewer/read-only-result-viewer.html`.

Do not paste the fixture path, a URL, instructions, or any pointer into the viewer. The viewer accepts pasted JSON text only.

The fixture and build prerequisite exist only to make the current inspection workflow easier to try. They do not run analysis, recompute results, create source truth, read from the path, fetch data, correct output, optimize output, score output, or infer from prompts.

## Source Truth Rules

Source truth remains in explicit structured source objects, direct engine output, result JSON, source refs, output refs, pack locks, operation context, tolerance policy, serialization version, operation version, provenance, diagnostics, warnings, errors, mismatches, result identity, and unknown fields.

Artifacts, visual data, prompt text, missing refs, replay outputs, and display helper output are not source truth.

Displayability is not source-truth validation.

Display helpers can make an existing result inspectable. Viewer output is derived inspection only. Helpers do not prove that the input is a valid Norma source object, create source truth, run analysis, recompute results, or execute an operation.

## Package-Private Helper Boundary

The current structured JSON input viewer helper and verification replay result viewer helper are package-private.

The helpers are not public API.

This documentation may describe their current display boundaries, but it must not instruct consumers to import them from the package root or treat them as stable product contracts.

## Required Visibility

When present, these result details must stay visible:

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

The workflow must not collapse these details to a generic boolean.

The workflow must not hide, mute, downgrade, suppress, group away, summarize away, or discard these details when they are present.

## Local Inspection Boundary

Current local report and viewer surfaces are inspection-only views over existing Norma output.

The engine result remains canonical truth. Report, visual, summary, and viewer output can make that truth easier to inspect, but they do not define, recompute, infer, correct, optimize, recommend, score, or override Norma results.

The local viewer can inspect pasted Structured Analyze result JSON when that JSON already exists as deterministic output. This support remains local-only, static, read-only, and paste-based.

## Blocked Inputs

Blocked inputs include prompt text as source truth, artifacts as source truth, inferred source truth, open-ended replay requests, direct local path reads, network retrieval, shell or environment access, media-derived input, design-tool input, store or extension input, broad product surfaces, hosted operation surfaces, package-root promotion, release distribution claims, scoring aesthetics, creative advice, and inferred intent.

## Non-Goals

Non-goals for this documentation are executable examples, operation execution, analysis execution, recomputation, source mutation, source-truth creation, route behavior, product surface behavior, remote tool behavior, package-root promotion, SDK behavior, API runtime, public package readiness, external release work, hosted configuration, correction, recommendation, optimization, scoring, prompt or visual inference, and new third-party requirements.
