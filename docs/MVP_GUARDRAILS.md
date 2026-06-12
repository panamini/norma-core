# Norma Core MVP Guardrails

Documentation only. No runtime implementation.

## Purpose

This document prevents MVP scope drift.

It is normative for PR0 and for every following PR in the MVP sequence.

A later PR cannot bypass this document by calling a blocked capability a helper, demo shortcut, adapter, optional artifact, experiment or temporary implementation detail.

## Allowed in MVP

Allowed MVP work is limited to:

- deterministic core behavior;
- structured geometry input only;
- 1D segments;
- rectangular 2D surfaces;
- simple 2D compositions;
- minimal ratio pack usage;
- rule declaration resolution from packs;
- supported rule type execution in the core;
- construction generation;
- measurements as calculated facts;
- evaluation from measurements, pack, profile and tolerances;
- minimal A/B comparison;
- decisions and explanations derived from evaluations;
- derived artifacts only;
- Run / PackLock / OperationContext visibility;
- demo harness for “Surface proportionnelle évaluée”.

## Blocked capabilities for MVP

The following terms are explicitly blocked for the MVP:

- UI complète
- écran
- canvas interactif
- drag-and-drop
- caméra
- image
- vision
- OpenCV
- tracking
- plugin
- CAD natif
- cloud
- marketplace
- prompt libre comme source
- beauty score
- SVG comme modèle
- export comme source de vérité
- adapter comme source de logique Norma
- agent-created rules
- pack implicite
- ratio implicite
- tolérance cachée
- recommendation créative
- optimisation automatique
- inférence d’intention
- 3D
- polygones complexes
- formats natifs

Additional blocked MVP capabilities:

- CLI;
- SDK;
- API;
- MCP;
- native file import;
- full replayRun;
- verifyRun;
- verifyArtifactFreshness;
- rich pack registry;
- user-defined pack marketplace;
- final transport or serialization contract.

## Anti-drift rules

- The MVP builds Norma Core, not the ecosystem around Norma.
- PR0 is documentation-only and cannot introduce implementation.
- A following PR must have a closed scope and explicit out-of-scope section.
- A following PR must not convert a future capability into an implicit MVP capability.
- A following PR must not use demo convenience to bypass core truth rules.
- A following PR must not introduce unreviewed technical choices as normative spec.

## Anti-UI rules

- No full UI.
- No product screen.
- No interactive canvas.
- No drag-and-drop.
- No layout editor.
- No theme or style system.
- No visual selection workflow.

A simple visual artifact may exist later only as a derived projection of structured Norma source objects. It is not allowed in PR0.

## Anti-image / camera / vision rules

- No camera input.
- No image input.
- No image processing pipeline.
- No vision inference.
- No OpenCV dependency.
- No tracking.
- No screenshot, raster or visual region as source geometry.

The MVP uses structured geometry input only.

## Anti-plugin / CAD / cloud / marketplace rules

- No plugin.
- No native CAD integration.
- No CAD adapter as core logic.
- No native file format support.
- No cloud API.
- No marketplace.
- No remote pack distribution.
- No external tool as source of Norma truth.

Adapters can only be future clients of the core. They cannot define Norma logic.

## Anti-beauty-score rules

- Norma Core must not judge beauty.
- Norma Core must not infer author intent.
- Norma Core must not recommend creative changes in the MVP.
- Norma Core may only evaluate closeness to a declared proportional system.
- A score is a summary derived from an evaluation, not an aesthetic truth.

Forbidden wording:

- “better composition”;
- “more beautiful”;
- “intended design”;
- “creative recommendation”.

Allowed wording:

- “closer to the declared proportional system”;
- “outside the declared tolerance”;
- “non-comparable because context differs”.

## Core truth rules

- Structured source objects are the source of truth.
- Constructions are geometric source results produced by the core.
- Measurements are calculated facts.
- Evaluations interpret measurements according to pack, profile and tolerances.
- Decisions and explanations derive from evaluations.
- Artifacts are derived projections.
- Artifacts never become source of truth.
- SVG, export or rendering can never become the core model.
- Source objects always win over artifacts.

## Pack rules

- Ratios live in packs.
- No ratio is hardcoded in the core.
- No ratio is invented by a client.
- No implicit pack is allowed.
- No implicit ratio is allowed.
- Missing pack means error.
- Missing ratio means error.
- The MVP pack remains `norma.basic-proportions@0.1.0`.
- Rich packs are post-MVP.

## Rule rules

- Rule declarations live in packs.
- Rule types and algorithms live in the core.
- The pack declares what can be applied.
- The core executes only supported rule types.
- No rule is created by prompt.
- No rule is created by UI.
- No rule is created by adapter.
- No rule is created by agent.
- Unsupported rule type must produce an error or critical warning.

## Measurement / evaluation rules

- No score before measurements.
- A measurement remains a calculated fact.
- An evaluation reads measurements according to pack, profile and tolerances.
- A score never replaces the evaluation.
- Confidence remains separate from score.
- Beauty score is forbidden.
- Intent inference is forbidden.
- Creative recommendation is forbidden in MVP.
- Hidden tolerances are forbidden.

## Artifact rules

- An artifact is derived.
- An artifact cannot become source of truth.
- An artifact cannot invent a ratio, rule, measurement, score, decision or explanation.
- SVG, export or rendering cannot become the core model.
- Critical warnings and errors must remain visible in artifacts.
- Modified artifacts do not mutate source objects.

## Provenance rules

Every derived future object must be traceable to the relevant source objects.

A derived output cannot be accepted if it hides:

- input source;
- pack source;
- rule source when applicable;
- operation source;
- warnings;
- errors;
- effective context when it changes the output.

## Replay-readiness rules

- Run must remain visible for significant future results.
- PackLock must remain visible when a pack is used.
- OperationContext must remain visible when it influences output.
- Any default that changes output must be explicit, versioned or rejected.
- Same input + same pack + same rules + same tolerances + same context + same operation version must produce the same output.
- Full replayRun remains out of MVP.

## Review rejection rules

A PR must be rejected when it:

- introduces any blocked capability listed above;
- introduces code in PR0;
- introduces `src/` in PR0;
- introduces runtime implementation in PR0;
- treats UI, SVG, export, image, plugin, CAD, cloud or marketplace as source of truth;
- uses prompt text as structured source input;
- uses pack, ratio or tolerance implicitly;
- hardcodes ratios in the core;
- puts rule execution algorithms inside packs;
- creates rules from UI, adapter, prompt or agent;
- produces score before measurement;
- merges confidence into score;
- claims beauty or intent;
- hides warnings, errors or provenance.

## Final guardrail gate

PR0 passes only if no following PR can reasonably claim that UI, camera, image, plugin, native CAD, cloud, marketplace, beauty score, implicit pack, implicit ratio, hidden tolerance or SVG as model are authorized in the MVP.
