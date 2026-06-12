# Norma Core — Spec Freeze

Documentation only. No runtime implementation.

## Status

Spec locked after Chapter 15.

PR0 verrouille les guardrails du moteur Norma Core MVP. Il ne construit ni interface, ni adapter, ni écosystème, ni logique métier.

La spec gelée guide l’exécution. Les PRs suivants implémentent le moteur, ils ne redéfinissent pas Norma Core.

## Locked decisions

- Norma Core is a deterministic proportional geometry core.
- V1 supports 1D segments, 2D rectangular surfaces, simple 2D compositions.
- Ratios live in packs.
- Rule declarations live in packs.
- Rule types and algorithms live in core.
- Constructions are geometric source results.
- Measurements are calculated facts.
- Evaluations interpret measurements according to a pack, profile and tolerances.
- Artifacts are derived and never source of truth.
- Run, PackLock and OperationContext ensure replay-readiness.
- MVP excludes full UI, camera, image, vision, plugin, native CAD, cloud, marketplace, beauty score and advanced creative recommendations.

## MVP target

Surface proportionnelle évaluée.

The MVP must prove the proportional geometry chain on a structured rectangular surface before ergonomics, integrations or ecosystem work.

## V1 allowed scope

Allowed in V1 MVP:

- deterministic core behavior;
- structured geometry input only;
- 1D segment spaces;
- 2D rectangular surface spaces;
- simple 2D compositions made of rectangular elements;
- minimal ratio pack usage;
- rule declaration resolution from packs;
- supported rule type execution in the core;
- construction generation;
- measurements as calculated facts;
- evaluation from measurements, pack, profile and tolerances;
- minimal A/B comparison;
- structured decisions and explanations;
- derived artifacts only;
- visible Run, PackLock and OperationContext for replay-readiness;
- a demo harness for “Surface proportionnelle évaluée”.

## Explicitly out of MVP

Out of MVP:

- code introduced by PR0;
- core skeleton introduced by PR0;
- complete repository structure introduced by PR0;
- CLI;
- SDK;
- API;
- MCP;
- full UI;
- screen product;
- interactive canvas;
- drag-and-drop;
- camera;
- image input;
- vision pipeline;
- OpenCV;
- tracking;
- plugin;
- native CAD;
- cloud;
- marketplace;
- native format support;
- complex polygons;
- 3D;
- final JSON schemas;
- algorithms introduced by PR0;
- rich ratio packs;
- user-defined packs;
- pack registry;
- full replayRun;
- verifyRun;
- verifyArtifactFreshness;
- beauty score;
- intent inference;
- automatic optimization;
- advanced creative recommendations;
- PR1 implementation work.

## Spec change policy

The spec is not reopened during PR0.

A future change can reopen a locked decision only when all of these conditions are true:

1. a major contradiction is found;
2. the contradiction blocks MVP execution;
3. the change is reviewed explicitly as a spec correction;
4. the change does not silently expand the MVP.

Unresolved future topics remain out of PR0. PR0 does not turn future options into implicit decisions.

## Relation between spec, roadmap and PR plan

The frozen spec defines what Norma Core is.

The roadmap defines the intended MVP sequence.

The PR plan defines the execution order.

PR0 defines the guardrails that every later PR must obey.

## PR execution rule

Every PR must comply with MVP guardrails.

No following PR can bypass PR0 by claiming that a blocked capability is only a helper, demo shortcut, adapter, artifact, experimental mode or temporary implementation detail.

## PR0 done definition

PR0 is done only when:

- the four core documentation files exist;
- the PR is documentation-only;
- no runtime file is added;
- no source directory is added;
- no core skeleton is added;
- no CLI, SDK, API or MCP is introduced;
- no UI, camera, image, vision, plugin, CAD, cloud or marketplace work is introduced;
- the strict V1 scope is explicit;
- blocked MVP capabilities are listed explicitly;
- the target demo “Surface proportionnelle évaluée” is named;
- ratios in packs, rule declarations in packs, and rule types/algorithms in core are restated;
- constructions, measurements, evaluations and artifacts remain separated;
- artifacts are defined as derived and never source of truth;
- Run, PackLock and OperationContext are tied to replay-readiness;
- a reviewer can reject any future PR that violates these guardrails.
