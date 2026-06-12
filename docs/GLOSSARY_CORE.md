# Norma Core Glossary

Documentation only. No runtime implementation.

This glossary is normative for PR0 and for MVP review language.

## Core

The deterministic Norma engine that owns proportional geometry algorithms, supported rule types, diagnostics and operation behavior.

The core does not own UI, camera, image processing, plugins, native CAD, cloud, marketplace or creative intent inference.

## Pack

A versioned proportional system package.

A pack contains ratios, ratio sequences, partition patterns, rule declarations, metadata, compatibility information and limits.

A pack does not contain execution algorithms, UI behavior, adapter logic or beauty claims.

## Ratio

A proportional value declared inside a pack.

A ratio cannot be hardcoded in the core and cannot be invented by a client, UI, adapter, prompt or agent.

## RatioSequence

An ordered proportional sequence declared inside a pack, such as `1:1:1`.

A sequence is not the same thing as several unrelated ratios.

## RuleDeclaration

A pack-owned declaration of what proportional rule should be applied.

A rule declaration references pack content and a supported core rule type.

It is not executable code.

## RuleType

A core-owned supported rule behavior.

The pack declares the rule; the core owns the rule type and algorithm.

Unsupported rule types must produce an error or critical warning.

## RuleSet

A named ordered group of rule declarations inside a pack.

A RuleSet must be resolved before construction generation.

## Construction

A geometric source result produced by the core when resolved rules are applied to a valid geometry space.

A construction can contain guides, zones, grids, cells, diagonals and intersections.

A construction is not a rendering, SVG, export, measurement or evaluation.

## Measurement

A calculated fact derived from geometry, construction or composition.

A measurement must reference its inputs and declare its metric, normalization or tolerance context when relevant.

A measurement does not contain a score, judgment, beauty claim or intent inference.

## Evaluation

A structured interpretation of measurements according to a pack, profile and tolerances.

An evaluation can produce component scores, status, warnings and explanations, but it must remain traceable to measurements.

## EvaluationProfile

A declared policy for reading measurements during evaluation.

An evaluation profile does not define ratios, rule declarations or aesthetic truth.

## Score

A derived summary of an evaluation.

A score is never source of truth by itself and never replaces the evaluation.

A score must not represent beauty or inferred intent.

## ComponentScore

A score for one declared evaluation component.

A ComponentScore can exist only after measurements and inside an evaluation flow.

## Confidence

A separate signal about reliability or completeness of an evaluation.

Confidence is not a score and must not be merged into score.

## Decision

A structured conclusion derived from comparison or evaluation.

For MVP A/B comparison, a decision can say which composition is closer to the declared proportional system.

A decision must not say that a composition is better, more beautiful or creatively intended.

## Explanation

A traceable justification derived from measurements, evaluations, decisions, pack references, profile references, tolerances, warnings and errors.

An explanation cannot invent facts absent from source objects.

## Artifact

A projection derived from Norma source objects.

An artifact can summarize, report or visualize source objects, but it can never become source of truth.

An artifact cannot invent ratios, rules, measurements, evaluations, scores, decisions or explanations.

## StructuredResultArtifact

A derived artifact that preserves structured result information for review or downstream consumption.

It remains derived and must keep source references, warnings and provenance visible.

## SimpleVisualArtifact

A limited visual projection derived from source objects.

It is not a UI, not an interactive canvas, not an image input and not a source model.

## Source object

A structured Norma object that can be used as source truth for later operations.

Examples include validated geometry input, construction, measurement, evaluation, decision, Run, PackLock and OperationContext.

Artifacts are not source objects for core truth.

## Source of truth

The authoritative structured Norma state used to produce or verify results.

Source of truth never comes from SVG, export, rendering, image, UI state, native CAD object, prompt text or artifact.

## Run

A traceable envelope for a significant operation.

A Run links operation identity, inputs, outputs, diagnostics, provenance and effective context for replay-readiness.

Full `replayRun` is out of MVP.

## RunRef

A reference to a Run.

A RunRef can be used by derived outputs and artifacts to keep traceability without embedding the full Run.

## PackLock

The effective identity of the pack used for reproducibility.

A PackLock must identify pack id, version, schema version and content identity when finalized.

A pack used without an effective lock is not replay-ready.

## PackLockRef

A reference to an effective PackLock.

It allows results and artifacts to remain connected to the pack identity that influenced output.

## OperationContext

The effective context that can influence operation output.

It includes relevant versions, coordinate policy, metric policy, tolerance policy, rounding, numeric behavior, ordering policy and feature flags when applicable.

Hidden output-changing defaults are forbidden.

## OperationVersion

The version of an operation behavior.

OperationVersion is part of replay-readiness because behavior changes can change outputs.

## CoordinateSystem

The declared coordinate policy for geometry interpretation.

No geometry is accepted without an explicit coordinate system in V1.

## MetricPolicy

The declared policy for distances, areas, angles or other metric measurements.

Measurements that depend on metrics must not hide their metric policy.

## TolerancePolicy

The declared tolerance policy used for measurement interpretation, evaluation or comparison.

Hidden tolerance is forbidden.

## Replay-readiness

The property that a result exposes enough deterministic dependencies to be reproduced or audited later.

For MVP, replay-readiness requires visible input, pack, rules, tolerances, coordinate system, metric policy, operation version, OperationContext, warnings and errors where applicable.

Replay-readiness is not the same as full `replayRun`.

## Provenance

Traceability from an output back to the inputs, pack, rules, operation and context that produced it.

Derived objects without required provenance must be rejected or marked with critical warning according to the operation contract.

## Warning

A structured diagnostic that reports a non-fatal issue.

Critical warnings cannot be suppressed by UI, adapter, client or agent.

## Error

A structured diagnostic that blocks or invalidates the requested operation or output.

Errors must remain visible in results and derived artifacts.

## Profile

A named evaluation profile used to interpret measurements.

A profile cannot create ratios, rules or aesthetic truth.

## Beauty score

A forbidden capability.

Norma Core evaluates closeness to a declared proportional system. It does not judge beauty.

## Prompt libre comme source

A forbidden source mode where free-form prompt text is treated as authoritative geometry, ratio, rule, pack, measurement or evaluation input.

MVP input must be structured.

## SVG comme modèle

A forbidden source mode where SVG or visual output is treated as the Norma core model.

SVG or visual output can only be a derived artifact in future work.

## Pack implicite

A forbidden mode where an operation silently chooses a pack.

Pack absent means error.

## Ratio implicite

A forbidden mode where an operation silently chooses or invents a ratio.

Ratio absent means error.

## Tolérance cachée

A forbidden mode where an operation uses a tolerance that is not visible, declared or versioned.

Any tolerance that changes output must be explicit.
