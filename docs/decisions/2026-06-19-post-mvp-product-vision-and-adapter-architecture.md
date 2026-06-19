# Post-MVP Product Vision And Adapter Architecture

## Status

This is an architecture decision.

PR75 is documentation and contract-test only.

PR75 gives no runtime authorization.

PR75 implements no adapter.

PR75 approves no production launch.

PR75 approves no real-user-data workflow.

## Decision

Norma Core remains a deterministic proportional geometry engine.

Future products connect through explicit providers and adapters that normalize external observations into versioned structured contracts.

No provider or adapter becomes the source of Norma logic.

## Current Verified Baseline

The current baseline after PR74 is:

- deterministic structured core behavior;
- explicit packs and rules;
- construction generation;
- measurement calculation;
- evaluation from measurements, packs, profiles, and tolerances;
- comparison;
- explanation;
- derived artifacts;
- Run, PackLock, and OperationContext visibility;
- local CLI;
- verification, freshness, and replay trust-layer surfaces;
- local read-only viewer;
- local MCP STDIO;
- PR71 source-ID hardening;
- PR72 MCP STDIO hardening;
- PR73 minimal CI;
- PR74 current-state README.

The current repository is not:

- a deployed product;
- a public npm package;
- a remote MCP server;
- a ChatGPT app;
- an image or vision provider;
- a camera adapter;
- a CAD adapter.

## Product Thesis

Norma is a deterministic system for measuring, evaluating, comparing, and guiding structured relationships against an explicitly selected, versioned system.

Norma is not:

- a beauty judge;
- an autonomous design authority;
- an intent detector;
- a certification authority;
- a universal AI engine.

## Architecture Layers

Future product work must keep these conceptual layers separate:

1. Product/interface layer
2. Provider/adapter layer
3. Observation normalization and acceptance layer
4. Norma domain engine
5. Registry/pack layer
6. Result/artifact layer

Required dependency direction:

```text
Product or host
-> Provider / Adapter
-> Candidate structured observation
-> Validation / user acceptance
-> Explicit Norma source input
-> Norma Core
-> Measurements / Evaluations / Decisions
-> Derived artifacts / overlays / explanations
```

Forbidden dependency direction:

```text
Norma Core
-> ChatGPT
-> camera
-> CAD host
-> image decoder
-> cloud service
```

The core must not import or depend on provider SDKs.

## Source Truth And Provenance

The architecture distinguishes:

- original asset;
- provider observation;
- candidate geometry;
- accepted geometry;
- measurement;
- evaluation;
- decision;
- artifact.

Required distinction:

```text
Original asset
!= provider observation
!= accepted structured geometry
!= calculated measurement
!= evaluation
!= derived overlay
```

Provider output is candidate evidence.

Accepted structured geometry becomes the effective operation input.

User corrections must be visible in provenance.

Provider name, provider version, and relevant configuration must be recorded.

Confidence remains separate from measurement and evaluation.

Artifacts never become source truth.

Prompts never become source truth.

No hidden pack, ratio, rule, or tolerance is allowed.

## PerceptionProvider Architecture

PR75 defines only a conceptual provider contract. It does not define final TypeScript, JSON Schema, property names, package exports, or runtime schema files.

Candidate provider families are:

- OpenAI Vision Provider;
- Norma Vision Provider;
- Human Corrected Provider;
- CAD Provider;
- Scene/3D Provider.

Conceptual output includes:

- provider identity;
- provider version;
- source asset reference;
- coordinate system;
- units or normalized-coordinate policy;
- detected primitives;
- semantic regions;
- confidence and evidence;
- warnings;
- provenance;
- candidate status.

## OpenAI Vision Provider

OpenAI vision is approved only as the first rapid perception experiment.

Required boundaries:

- candidate extraction only;
- synthetic images first;
- no exact-vectorization claim;
- no metric reconstruction claim;
- no automatic acceptance;
- no direct image-to-core path;
- no secret or API key in the repository;
- no model name frozen in architecture;
- no production data retention decision;
- no deployment approval.

Known limitations:

- precise spatial localization is imperfect;
- dimensions can be affected by image preprocessing or resizing;
- semantic descriptions can be wrong;
- confidence requires evaluation and calibration.

## Norma Vision Provider

Norma Vision Provider is a future provider family for:

- precision;
- deterministic computer-vision pipelines;
- calibration;
- camera tracking;
- on-device or controlled processing;
- reproducible geometric extraction.

PR75 does not select OpenCV, a model architecture, or a mobile framework.

## CAD Adapter

CAD supplies exact structured geometry, not visual perception.

A CAD adapter normalizes coordinates, units, transforms, and selection.

The first CAD mode must be read-only analysis.

No silent drawing modifications are approved.

Any future modification must be previewed, explicit, reversible, and user-triggered.

Candidate hosts may include AutoCAD, Rhino, FreeCAD, Revit, or similar tools, but PR75 does not select the first host.

## Norma Camera

Future camera work follows this conceptual flow:

```text
camera
-> calibration
-> primitive detection
-> temporal stabilization
-> accepted geometry
-> Norma Core
-> live derived overlay
```

Camera, tracking, and device integration stay outside `norma-core`.

## Scene And 3D

Blender and 3D work are future separate domains or modules.

Possible uses include:

- bounding boxes;
- parametric skeletons;
- object proportions;
- furniture guides;
- scene comparison;
- derived construction guides.

The current V1 geometry core remains 1D/2D.

3D must not be silently added to current core types.

No generic multi-domain kernel is extracted yet.

## Music

Music is a future candidate domain, not geometry disguised as rectangles.

Potential structured concepts include:

- tempo;
- meter;
- beat grid;
- note events;
- durations;
- pitch classes;
- chords;
- sections;
- motifs.

A future music engine may share generic provenance, run, and pack concepts.

It must not reuse geometry types artificially.

No generic kernel extraction occurs until at least two real domains prove shared abstractions.

## Web, Print And Design

Candidate future use cases include:

- grids;
- layout;
- typography hierarchy;
- spacing scales;
- CSS tokens;
- responsive composition;
- print margins;
- bleed and safe areas;
- brand-template QA;
- Figma, Illustrator, InDesign, and browser adapters.

These remain future candidates.

## Quality, Packaging And Industry

Candidate future uses include:

- nominal versus observed comparison;
- packaging layout;
- structural packaging dimensions;
- manufacturing tolerances;
- catalog consistency;
- template QA;
- automated reports;
- batch inspection.

Safety-critical certification is not approved.

## Architecture, Engineering And Standards

Future standards work must separate:

- proportional or ergonomic guidance;
- dimensional compliance;
- safety-critical engineering or regulatory certification.

The initial future mode is:

- read-only;
- advisory;
- source-cited;
- explicit about jurisdiction and version;
- dependent on a human professional decision.

Norma must not claim automatic legal, structural, aviation, maritime, medical, or safety certification.

## Archaeology And Heritage

Candidate future uses include:

- artifact proportions;
- typology comparison;
- facades and historic plans;
- reconstruction hypotheses;
- photogrammetry-derived observations;
- uncertainty and provenance.

## Norma Registry

Norma Registry is the umbrella registry for future pack categories:

```text
Norma Registry
|-- Codex Packs
|-- Standards Packs
|-- Enterprise Packs
`-- Calibration Packs
```

Codex Packs cover harmony, proportion, composition, and declared aesthetic systems.

Standards Packs cover technical and dimensional rules with source, jurisdiction, and effective date.

Enterprise Packs cover private company standards, design systems, and proprietary tolerances.

Calibration Packs cover device, process, and measurement tolerances.

## Pack Governance

Every future pack category must define:

- namespace;
- owner;
- immutable version;
- status;
- effective date;
- provenance and references;
- units;
- jurisdiction where relevant;
- supported rule types;
- contract tests;
- checksum or identity;
- access policy;
- audit history;
- PackLock in every operation.

Forbidden pack behavior:

- arbitrary executable code in a pack;
- silent LLM-generated rules;
- implicit pack updates;
- hidden tolerance;
- unversioned private rules.

An LLM may propose a draft pack, but it cannot approve or publish it.

## Evaluation Modes

Future evaluation modes must remain separate:

- descriptive;
- comparative;
- compliance;
- generative guidance.

Do not combine:

- perception confidence;
- deviation score;
- compliance status;
- criticality;
- aesthetic quality.

Example distinction:

- Perception confidence;
- Proportional deviation;
- Compliance status;
- Criticality.

There is no global beauty score.

## Product Risk Tiers

Tier 1 - Creative/advisory examples:

- graphic design;
- photography;
- education;
- music exploration;
- conceptual furniture.

Tier 2 - Professional non-critical examples:

- design systems;
- packaging;
- template QA;
- architectural concept;
- non-critical manufacturing.

Tier 3 - Safety/regulatory critical examples:

- structural engineering;
- fire/accessibility compliance;
- medical;
- aviation;
- maritime;
- critical industrial safety.

Tier 3 requires separate validated engines, source governance, expert responsibility, and legal review.

PR75 does not approve Tier 3 implementation.

## First Approved Vertical Slice

PR75 approves only this next product direction:

```text
ChatGPT Analyze - local/synthetic architecture track
```

User story:

A user provides a simple synthetic image and asks Norma to identify candidate rectangles and axes, review or correct them, and evaluate the accepted geometry against an explicit pack.

Required conceptual flow:

```text
synthetic image
-> OpenAI Vision Provider
-> candidate rectangles / segments / axes
-> strict structured output
-> schema validation
-> user review or correction
-> accepted structured geometry
-> explicit pack selection
-> Norma Core
-> measurement and evaluation
-> derived overlay and explanation
```

The first vertical slice must not claim:

- exact vectorization;
- metric reconstruction;
- arbitrary real-world images;
- production deployment;
- public users;
- real-user-data approval;
- automatic acceptance;
- beauty judgment;
- intent inference.

## ChatGPT Application Boundary

Apps SDK and MCP are a future ChatGPT product path.

The current local MCP STDIO process is not the ChatGPT integration.

A future ChatGPT app requires a separately approved app/MCP surface.

Deployment, authentication, secrets, privacy, security, and submission are separate gates.

PR75 does not approve remote MCP or deployment.

## Candidate Follow-Up Sequence

Each candidate PR scope requires its own fiche and approval.

Recommended sequence:

PR76 - GeometryObservation and PerceptionProvider contract approval.

Documentation and contracts only. Define candidate observation, accepted geometry, coordinates, provenance, confidence, correction history, and provider boundary. No provider implementation.

PR77 - GeometryObservation validator and synthetic fixtures.

Implement only the accepted local structured contract and deterministic validation. No OpenAI call.

PR78 - Perception evaluation harness.

Use synthetic annotated images and ground-truth comparison for rectangles, segments, axes, coordinate error, and missing/extra primitive rates. No production provider.

PR79 - OpenAI Vision Provider local experiment.

Local-only provider behind explicit test/eval harness. Requires separate secret/privacy approval. No deployment.

PR80 - ChatGPT app integration approval.

Define Apps SDK/MCP tools, threat model, authentication, data retention, deployment, UI, and user confirmation. Approval only.

PR81 - Local ChatGPT Analyze vertical slice.

Only after PR76-PR80 gates pass.

Do not implement any of these in PR75.

## Explicit Non-Goals

PR75 does not:

- alter PR0 MVP runtime scope;
- implement a provider;
- implement an adapter;
- add a schema;
- add image files;
- add API keys;
- add OpenAI dependencies;
- add remote MCP;
- add deployment;
- add a ChatGPT app;
- add camera;
- add CAD;
- add 3D;
- add music runtime;
- add enterprise pack runtime;
- add marketplace;
- publish npm;
- add product UI;
- process real user data.

## Validation Gates

Future work must satisfy:

- explicit structured contracts;
- source and provenance boundaries;
- deterministic core inputs;
- provider evals;
- user correction path;
- no hidden defaults;
- no agent-created rules;
- synthetic data first;
- privacy/security approval before real data;
- separate deployment approval;
- exact PR scope;
- build, test, check, and CI green.

## Stop Criteria

Stop future adapter work if:

- provider output becomes source truth without acceptance;
- image or SDK logic enters core;
- confidence is presented as measurement truth;
- artifacts become source truth;
- rules or packs are silently generated;
- real-user data is used without approval;
- remote MCP or deployment appears without a dedicated gate;
- safety-critical certification is claimed.

## Rollback

Reverting PR75 removes only:

- this decision document;
- the roadmap reference/update;
- the PR75 contract test;
- exact guard maintenance, if it was required.

No runtime or data migration is required.
