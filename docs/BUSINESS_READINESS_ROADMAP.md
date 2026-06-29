# Norma Core Business Readiness Roadmap

## Status

This is a planning document.

It does not implement product features.

It does not authorize scope by itself. Each phase below requires its own small PR with a narrow scope, explicit non-goals, acceptance criteria, and validation notes.

This roadmap intentionally lives at `docs/BUSINESS_READINESS_ROADMAP.md` as a business and release-readiness roadmap, not as a single implementation plan under `docs/plans/`.

The core remains deterministic and source-truth driven. Norma truth must stay in explicit structured source objects, pack locks, operation contexts, diagnostics, provenance, and deterministic result envelopes. External surfaces may call the core; they must not define Norma logic.

This roadmap is synced through R25. R22 through R25 are complete, R25 is the latest completed local inspection/static safety guard checkpoint, and the old PR27-PR46 ladder remains historical/gated context, not the current execution queue.

## Current State After PR74

PR70 through PR74 completed the local read-only viewer and current-state checkpoint track:

- PR70 completed local read-only viewer demo readiness;
- PR71 hardened duplicate sibling geometry source IDs;
- PR72 hardened MCP STDIO input bounds and process survival;
- PR73 added minimal CI;
- PR74 recorded the current-state README checkpoint.

The repository now has deterministic core behavior, local CLI, local MCP STDIO, verification/freshness/replay trust-layer surfaces, and a local read-only viewer boundary.

The repository still has no public npm publication, deployed product, remote MCP, ChatGPT app, image/vision provider, camera adapter, CAD adapter, production data workflow, or real-user-data approval.

## PR75 Post-MVP Architecture Freeze

PR75 freezes the post-MVP product vision and adapter architecture as documentation and contract tests only.

Decision reference: `docs/decisions/2026-06-19-post-mvp-product-vision-and-adapter-architecture.md`.

PR75 keeps Norma Core as a deterministic proportional geometry engine and defines how future providers, adapters, accepted observations, pack registries, risk tiers, and derived artifacts connect to it without changing runtime scope.

The first approved future product direction is ChatGPT Analyze as a local/synthetic architecture track only: an image can produce a candidate observation, a user or validator must accept structured geometry, and then Norma Core measures and evaluates that accepted geometry against an explicit pack.

PR75 does not approve image analysis, OpenAI API calls, ChatGPT integration, remote MCP, deployment, camera, CAD, 3D, music runtime, private pack runtime, public npm, package changes, runtime schemas, provider code, adapters, UI, product behavior, or real-user-data processing.

Candidate follow-up sequence, each requiring its own fiche and approval:

1. PR76 - GeometryObservation and PerceptionProvider contract approval.
2. PR77 - GeometryObservation validator and synthetic fixtures.
3. PR78 - Perception evaluation harness.
4. PR79 - OpenAI Vision Provider local experiment.
5. PR80 - ChatGPT app integration approval.
6. PR81 - Local ChatGPT Analyze vertical slice.

## R5 Structured Analyze V1 Architecture Freeze

R5 narrows the selected first post-MVP product outcome to ChatGPT Structured Analyze V1 before any image, vision, camera, CAD, plugin, hosted-cloud, or public-app work.

Decision reference: `docs/decisions/2026-06-24-post-mvp-adapter-architecture.md`.

R5 authorizes architecture only. It does not add runtime code, types, schemas, MCP tools, output schemas, annotations, dependencies, package changes, CI changes, ChatGPT UI, hosted MCP, app publication, image inference, camera input, CAD import, plugin integration, URL fetching, file-system ingestion, automatic correction, recommendation, optimization, or beauty scoring.

The selected first slice requires explicit user-supplied structured geometry or composition data, visible proposed versus accepted geometry, mandatory provenance, explicit pack/profile/tolerance/context where output-affecting, deterministic validation, and user-facing wording limited to which composition is closer to the declared proportional system.

R6 is staged as one direct structured analysis operation and, after that direct
operation exists, at most one corresponding MCP tool. R6A defines the contract,
R6B implements the direct operation, and R6C exposes at most one MCP tool while
preserving the original five-tool behavior, declaring `outputSchema` from first
introduction, validating model-provided input server-side, and remaining
private/developer-only during proof.

## R6A Structured Analyze V1 Contract

R6A converts the R5 architecture boundary into a reviewed contract for the first
direct Structured Analyze V1 operation.

Decision reference: `docs/decisions/2026-06-25-structured-analyze-v1-contract.md`.

R6A is contract docs/tests only.

R6A selects one future direct operation:

```text
analyzeStructuredCompositionV1
```

The operation name is:

```text
core.structured-composition-analysis.analyze
```

R6A uses explicit user-supplied Core `Composition2D` pairs plus explicit
acceptance, ratio pack, rule set ref, pack lock, evaluation profile, evaluation
tolerances, comparison/tie tolerances, tolerance policy, operation context, and
provenance.

R6A.1 clarifies that `packLock` is identity/hash metadata only, executable rules
come from `ratioPack` and `ruleSetRef`, `evaluationProfile` does not embed
tolerances, and the direct-operation executable statuses are only `valid` and
`invalid`.

R6A does not implement runtime code, package exports, schemas, generated files,
MCP descriptors, annotations, ChatGPT app metadata, hosted MCP, Developer Mode
configuration, image input, vision input, camera input, CAD input, plugin input,
dependencies, package metadata, CI changes, or public submission.

R6B implements the direct `analyzeStructuredCompositionV1` operation with
explicit `contractVersion`, explicit `analysisId`, and deterministic
direct-core proof for the full R6A fixture set. R6B must require explicit
`ratioPack`, `ruleSetRef`, `evaluationTolerances`, `comparisonTolerances`,
`packLock`, `tolerancePolicy`, and output-affecting `operationContext` values
without hidden built-in defaults. Case A expects
`decision.status` `a_closer`, Case B expects `decision.status` `b_closer`, and
Case C expects duplicate-ID input to return `status: "invalid"` with diagnostic
`DuplicateGeometrySourceId` and no output refs.

R6C exposes at most one MCP tool, `norma.analyzeStructuredCompositionV1`, only
after the direct operation exists and only with `inputSchema`, `outputSchema`,
read-only/idempotent/non-open-world annotations, and direct-core/MCP parity
tests from first exposure.

R6A kept no image, vision, camera, CAD, plugin, hosted MCP, public submission,
or runtime tool exposure in scope. R6C still adds no image, vision, camera, CAD,
plugin, hosted MCP, public submission, prompt inference, recommendation,
optimization, beauty scoring, or runtime expansion beyond the one
structured-analysis MCP tool.

## R6D ChatGPT Private Connector Checkpoint

R6D closed the current-main ChatGPT connector `_meta` compatibility blocker.

Checkpoint reference:

- PR: `#113`
- Merge commit: `bba597bca40facaf36fd7741712a0b0b9d8754e6`
- Private ChatGPT connector smoke: passed
- Six-tool inventory: confirmed
- Positive replay: passed through `norma.replayMvpDemo`
- Reserved MCP `_meta`: tolerated at the MCP envelope boundary
- Negative prompts: rejected without a Norma analysis tool call

R6D remains private/developer-only evidence. It does not authorize public app
submission, hosted MCP, image/prose geometry inference, beauty scoring,
recommendation, optimization, or changes to core geometry, packs, ratios, rules,
measurements, evaluation, comparison, artifacts, or deterministic outputs.

The historical immediate next step after R6D was this small checkpoint. The next
mandatory product/code PR after the checkpoint was:

```text
R1 - Reject duplicate geometry source identities
```

PR #115 satisfied R1 before R7A.1. Do not treat this historical R6D sequencing
as the current next-step instruction.

## R7A.1 Post-R1 Roadmap State And Private Operating Model

Decision reference:
`docs/decisions/2026-06-26-post-r1-private-operating-model.md`.

R7A.1 records the current state after PR #115, PR #116, and PR #117:

- PR #115 / R1 rejected duplicate geometry source identities across active Core,
  measurement, Structured Analyze, and MCP structured-content paths.
- PR #116 / R1.1 merged `fix: preserve measurement anchor target refs`. It is
  not the roadmap, operations, or operating-model checkpoint.
- PR #117 / R7.2 hardened Structured Analyze boundary coverage through direct and
  MCP contract tests.

The mandatory private Structured Analyze rail is complete through R7.2. Current
local STDIO MCP inventory is exactly six tools, including
`norma.analyzeStructuredCompositionV1`.

R7A.1 selects:

```text
STOP_PRIVATE_MANUAL
```

The current operating model stays private/manual: use the private ChatGPT Draft
app and launch Secure MCP Tunnel only when needed. No mandatory next code PR is
required.

Hosted MCP is optional later only with explicit provider, budget, secrets,
deployment, monitoring, incident, rollback, retention, auth/access, and domain
ownership. Public submission remains optional later only through a
submission-readiness audit.

R7A.1 does not deploy a hosted endpoint, change MCP runtime behavior, add auth
runtime, add secrets, submit a public ChatGPT app, add tools, change output
schemas, add image/vision/CAD/plugin/UI behavior, publish the package, or fix
CI billing/account state.

## R15 Post-R14 Roadmap Checkpoint

Decision reference:
`docs/decisions/2026-06-27-post-r14-roadmap-checkpoint.md`.

R15 records the current roadmap state after PR #135 / R14 merged at
`dcb113cb2abfcafbf1155b47a2a7c41d2fd50974`.

The recent Structured Analyze protection and inspection rail is complete through
R14:

- R10 added deterministic regression protection across the pipeline.
- R11 froze the public API contract and package export surface.
- R12 locked the MCP protocol contract and execution boundary.
- R13 added ratio-pack registry, authoring, and strict pass-through guards.
- R14 upgraded the local Structured Analyze `report.html` into a static,
  read-only inspection dashboard.

The current operating model remains local, private, and manual. The canonical
Structured Analyze truth is still `result.json`, produced by the deterministic
engine. The local report dashboard is an inspection artifact only; it does not
define, recompute, infer, correct, optimize, recommend, or override Norma
results.

The following remain explicitly not approved:

- hosted MCP;
- public ChatGPT app submission;
- public package publication;
- package export expansion;
- remote API runtime;
- image, vision, camera, CAD, or provider runtime;
- recommendation, optimization, beauty scoring, or prompt-derived source truth.

Historical note: before R16, the next implementation rail was:

1. R16 - local demo/onboarding smoke for the Structured Analyze report workflow.
2. R17 - package/local consumer readiness refresh, only if a real gap remains
   after R16.
3. R18+ - broader product, package, remote, or public-surface gates only after
   explicit checkpoint approval.

R16 was intended to prove a local user could run the Geometry Harmony example,
generate the five-file report bundle, inspect `report.html`, and understand
`result.json` as canonical truth. R15 itself was docs/tests only and did not
implement R16.

## Current Execution Mode After R16

R16 is merged.

R17 is this docs-only roadmap convergence checkpoint.

The old PR27-PR33 roadmap is historical context. The project is not obligated to
execute 17 more historical PRs, and old PR31, PR32, and PR33 references are
historical roadmap labels rather than mandatory remaining work items.

Future work should be selected by current gaps, not old numbering. Work remains
one PR at a time. Swarm or multi-agent work is allowed only for read-only
review, planning, or independent checks. Implementation must remain
single-owner per branch/PR.

Local consumer readiness refresh is complete through R18.

Current recommended next choices after R18 are:

1. A later explicit package publication decision, only if maintainers want
   publication.
2. Product/UI/dashboard work only after a separate product-scope approval.
3. Hosted/remote MCP only after explicit threat-model and deployment approval.

Public npm publication remains blocked. Hosted MCP remains blocked.
UI/dashboard work remains blocked until explicitly approved. Engine behavior
must not change for roadmap convergence.

## R18 Local Consumer Readiness Refresh

R18 proves local/private package consumer readiness for the existing Structured
Analyze engine surface. It is docs, tests, and a TypeScript consumer example
only.

R18 may document and test that a local consumer can import
`analyzeStructuredCompositionV1` from `@norma/core` after `npm run build`, call
it with explicit Structured Analyze input, and preserve result semantics.

R18 must not change engine behavior, package exports, package metadata,
lockfiles, CLI behavior, MCP behavior, report-kit behavior, visual viewer
behavior, scenarios, public npm publication state, SDK runtime, API runtime,
hosted/cloud behavior, media/CAD/provider behavior, or product/UI behavior.

Structured Analyze result output remains canonical engine truth. Report
artifacts are derived local inspection views and are not package API.

## R19 Local Inspection Surface Boundary Checkpoint

R19 clarifies the current local viewer/report/dashboard boundary after PR #140 /
R18. It is documentation and tests only; it adds no features, changes no runtime
behavior, and creates no product UI, hosted dashboard, SDK, API runtime, package
export, public npm publication path, or hosted/remote MCP surface.

Decision reference:
`docs/decisions/2026-06-28-local-inspection-surface-boundary.md`.

Norma Core currently has local inspection surfaces. Package consumption remains
local/private, and `analyzeStructuredCompositionV1` remains the approved
Structured Analyze package-root entry point.

`result.json` and direct engine output remain canonical Norma truth.
`summary.json`, `summary.md`, `visual.svg`, `report.html`, and viewer output
are derived local inspection artifacts only. They may display existing result
data, but they must not define, recompute, infer, correct, optimize, recommend,
score, or override Norma results.

R19 does not approve a hosted dashboard, public webapp, SDK, API runtime, public
npm publication, hosted MCP, remote MCP, recommendation logic, optimization
logic, scoring logic, inference logic, or correction logic.

## R20 Structured Analyze Product-Scope Alignment Checkpoint

R20 is a documentation interpretation checkpoint after PR #141 / R19. It aligns
existing product and viewer documentation with the current R19 local inspection
boundary.

Decision reference:
`docs/decisions/2026-06-28-structured-analyze-product-scope-alignment.md`.

R19 remains the current authoritative local inspection boundary. `result.json`
and direct engine output remain canonical Norma truth. `summary.json`,
`summary.md`, `visual.svg`, `report.html`, and viewer output remain derived
inspection artifacts.

PR55 and PR56 viewer documentation remains useful product and viewer context,
but it does not imply current approval for new UI implementation or any new
product surface.

R20 does not approve UI implementation, any new product surface, a hosted
dashboard direction, product requirements, runtime behavior, engine correctness,
runtime contracts, package exports, schemas, examples, package metadata, or
lockfile changes.

Future product or UI work requires a separate explicit approval PR.

## R21 Local Structured Analyze Product-Surface Approval Gate

R21 is an approval gate only after PR #142 / R20. It records one narrow future
implementation direction and does not implement UI or change runtime behavior.

Decision reference:
`docs/decisions/2026-06-28-local-structured-analyze-product-surface-approval.md`.

R21 approves only the future product-surface implementation scope for a separate
local-only, static, read-only Structured Analyze inspection surface. The future
surface may inspect existing deterministic outputs such as direct engine result
objects, `result.json`, and existing report bundle artifacts.

R19 remains the current authoritative local inspection boundary. R20 remains the
current documentation interpretation checkpoint. PR55 and PR56 remain useful
product and viewer context, but R21 does not rewrite them.

The future implementation must be separate, optional, local-only, static,
read-only, and scoped. A possible next implementation PR is:

```text
R22: local Structured Analyze inspection surface implementation
```

R21 does not implement UI, define Norma truth, execute analysis, recompute
results, mutate input, infer geometry, select hidden packs, create ratios,
create tolerances, optimize, recommend, score, correct, fetch remote data, host a
service, publish a package, or define or modify engine correctness or runtime
contracts.

R21 does not approve hosted dashboard, public webapp, SDK, API runtime, public
npm publication, hosted MCP, remote MCP, image/vision/CAD/provider input,
recommendation logic, optimization logic, scoring logic, inference logic, or
correction logic.

## R22 Local Structured Analyze Inspection Surface Implementation

R22 implements the approved local-only, static, read-only inspection extension
for the existing local result viewer.

The viewer can inspect existing Structured Analyze result JSON. The input is
existing deterministic output, such as direct engine output or `result.json`.
Direct engine output and result JSON remain canonical truth. Viewer output is
derived inspection only.

The viewer does not run analysis, does not recompute results, does not mutate
input, does not infer geometry, and does not create ratios, tolerances, rules,
packs, or geometry.

R22 does not add hosting, public product behavior, SDK behavior, API runtime,
public npm readiness, remote MCP, correction, recommendation, optimization,
scoring, prompt inference, or image inference.

## R23 Local Inspection Surface Onboarding Fixture And Workflow Polish

R23 adds a small local onboarding fixture and workflow documentation for the
existing static read-only viewer.

The fixture is existing Structured Analyze result JSON. It helps a local user
try the paste-only inspection path without adding engine behavior, CLI behavior,
MCP behavior, report-kit behavior, package exports, package metadata, lockfile
changes, runtime routes, hosted behavior, or public product claims.

Direct engine output and result JSON remain canonical truth. Viewer output
remains derived inspection only.

R23 does not run analysis, recompute results, mutate input, create source truth,
accept path or URL input, infer geometry, accept image, vision, CAD, media, or
provider input, correct output, optimize output, score output, infer from
prompts, add hosted or remote behavior, or change SDK/API/package readiness.

## R24 Structured Analyze Scenario Regression Harness

R24 adds a narrow direct-engine regression harness for existing Structured
Analyze scenario fixtures.

The harness verifies deterministic direct `analyzeStructuredCompositionV1`
results, canonical serialization stability, input immutability, valid and
invalid scenario boundaries, and compatibility with the existing local
read-only inspection model without changing viewer behavior.

R24 does not change engine behavior, MCP runtime, CLI runtime, viewer source,
report-kit generation, package exports, schemas, dependencies, lockfiles,
hosted behavior, public product behavior, SDK/API behavior, remote MCP, image,
vision, camera, CAD, provider input, prompt inference, correction,
recommendation, optimization, or scoring.

## Current State After R25

Decision reference: `docs/decisions/2026-06-30-post-r25-roadmap-truth-sync.md`.

The repository currently has the V1.5 trust-layer foundation needed for local package consumption:

- deterministic serialization helpers and canonical ordering;
- deterministic fixtures and golden snapshots;
- `verifyArtifactFreshness`;
- `verifyRun`;
- MVP-only `replayRun`;
- package-root consumption documentation;
- package-root consumption tests;
- private local package-root import through `@norma/core` after build.

R22 through R25 completed the local inspection surface track:

- R22 implemented the local Structured Analyze inspection surface.
- R23 added the local inspection onboarding fixture.
- R24 added the Structured Analyze scenario regression harness.
- R25 added the local inspection surface static safety guard.

R25 is the latest completed local inspection/static safety guard checkpoint.
R26 is this docs-only roadmap truth-sync checkpoint.
The local inspection surface remains local-only, static, read-only, paste-based, and non-computational.
The old PR27-PR46 ladder remains historical/gated context, not the current execution queue.

The package root is local/build-based and remains private. It is not yet a public npm package.

The current package is not yet:

- a full SDK;
- a CLI;
- an API;
- an MCP server;
- a public npm package;
- a user-facing product.

PR25 mostly satisfies local module readiness. It does not satisfy developer-tool, MCP, API, user-facing product, or business readiness by itself.

## Definitions of Ready

### Local module ready

Norma Core can be built, imported from the package root, and used in local JavaScript or TypeScript contexts for the approved MVP and V1.5 trust-layer operations.

Required properties:

- `npm run build`, `npm test`, and `npm run check` pass;
- `@norma/core` root import works after build;
- approved exports are available from the package root;
- forbidden surfaces remain absent;
- package metadata remains private unless an explicit package-readiness PR approves a change.

PR25 mostly satisfies this definition.

### Developer-tool ready

A developer can run approved Norma trust-layer operations from a thin local tool without writing custom scripts.

Required properties:

- thin local CLI exists;
- CLI accepts explicit structured JSON input;
- CLI writes structured JSON output envelopes;
- CLI preserves `status`, warnings, errors, provenance, source refs, mismatches, and artifact freshness data;
- CLI does not infer packs, rules, tolerances, geometry, intent, or source truth;
- CLI golden outputs and smoke docs exist.

### MCP-ready

Norma can be exposed to local agents through a reviewed MCP tool boundary without allowing agents to create Norma truth.

Required properties:

- MCP tool contract docs are reviewed before implementation;
- only approved trust-layer tools are exposed;
- local stdio MCP is implemented before any remote MCP;
- MCP tools preserve diagnostics and provenance;
- MCP tools do not create packs, ratios, rules, tolerances, geometry, prompt-derived truth, or artifacts-as-source;
- MCP inspector tests and golden tool outputs exist.

### API-ready

Norma can be called through a minimal API only after the operation envelopes, auth model, audit logging, and threat model are accepted.

Required properties:

- API contract exists before an API server;
- remote exposure has a threat model;
- auth, allowed operations, rate limits, and audit logs are defined;
- sensitive actions require approval where relevant;
- API output matches the same structured result envelope discipline as CLI and MCP.

### User-facing product ready

A non-core user can inspect Norma results without losing diagnostic visibility or source-truth guarantees.

Required properties:

- product requirements exist before UI;
- read-only result viewer comes first;
- structured JSON upload is the first supported input path;
- all warnings, errors, statuses, provenance, and source refs remain visible;
- no camera/image/vision, native CAD, beauty score, creative recommendation, or intent inference is introduced without explicit approval.

### Business-ready

Norma has a stable product workflow, support posture, security posture, release process, and beta/launch criteria.

Required properties:

- onboarding docs exist;
- demo workflow exists;
- package/pricing decision exists;
- support policy exists;
- privacy and security policies exist;
- beta pilot checklist exists;
- launch checklist exists;
- all public surfaces consume the core rather than define Norma logic.

## Phase 1 — V1.5 Developer-Ready Local Tooling

Goal: turn the local module into a narrow local developer tool without changing core behavior.

Deliverables:

- thin local CLI;
- explicit JSON input/output envelope;
- no hidden defaults;
- no new core logic;
- warnings, errors, provenance, source refs, mismatches, and artifact freshness preserved;
- CLI smoke docs;
- CLI golden outputs.

The CLI must call approved package-root operations. It must not infer source truth, create packs, create rules, create tolerances, create geometry, hide diagnostics, or define Norma logic.

Expected PRs:

- `PR27 — thin local CLI for approved trust-layer operations`;
- `PR28 — CLI examples, smoke docs, and JSON output contract`;
- `PR29 — V1.5 release checkpoint / tag readiness`.

Exit criteria:

- approved CLI commands are documented;
- CLI JSON output is stable enough for snapshots;
- CLI smoke tests pass;
- CLI golden output changes require review;
- no runtime core behavior changes are introduced by the CLI.

## Phase 2 — Package and Release Readiness

Goal: prepare package consumption and release governance without publishing prematurely.

Deliverables:

- package export audit;
- typed consumer examples;
- release checklist;
- semver and versioning policy;
- npm publishing gate;
- package remains private until explicitly approved.

Expected PRs:

- `PR30 — package/public npm readiness audit`;
- `PR31 — typed consumer examples and compatibility policy`;
- `PR32 — public package publishing gate, still no publish unless approved`.

Exit criteria:

- package public surface is documented;
- compatibility policy identifies operation-version and serialization-version triggers;
- examples build against the package root;
- npm publish remains blocked unless the publishing gate explicitly approves it;
- no broad SDK runtime is introduced.

## Phase 3 — MCP Contract and Local MCP

Goal: prepare agent access without allowing agents to create Norma truth.

MCP tool contract docs must come before MCP implementation.

Local stdio MCP comes before remote MCP.

No real user data should be required for the first MCP implementation.

The MCP server must not expose tools that create packs, rules, ratios, tolerances, geometry, prompt-derived source truth, artifacts-as-source, beauty scores, creative recommendations, or design intent.

Allowed future MCP tools only:

- `norma.getVersion`;
- `norma.verifyRun`;
- `norma.verifyArtifactFreshness`;
- `norma.replayMvpDemo`;
- `norma.serializeCanonicalJson`.

Expected PRs:

- `PR33 — MCP tool contract docs only`;
- `PR34 — local stdio MCP server for approved trust-layer tools`;
- `PR35 — MCP inspector tests and golden tool outputs`.

Exit criteria:

- tool schemas are reviewed;
- every tool has explicit input and output envelopes;
- every tool preserves diagnostics and provenance;
- local MCP passes inspector tests;
- golden tool outputs cover success, warning, mismatch, non-replayable, unsupported, and invalid paths where relevant;
- no remote MCP exists yet.

## Phase 4 — Remote MCP and API Readiness

Goal: prepare remote exposure only after local tool contracts are stable.

Remote MCP and API work requires a threat model first.

Required topics before remote exposure:

- approval flows;
- allowed tools;
- authentication;
- authorization;
- audit logs;
- rate limits;
- no sensitive action without approval;
- no arbitrary filesystem access;
- no arbitrary network access;
- prompt-injection risk review;
- data retention policy.

API contract docs must come before an API server.

Remote MCP/API work may start only after local MCP is stable and reviewed.

Expected PRs:

- `PR36 — remote MCP/API threat model`;
- `PR37 — minimal API contract docs`;
- `PR38 — minimal API server only after contract approval`;
- `PR39 — auth, audit logs, and rate-limit policy`.

Exit criteria:

- threat model is accepted;
- remote tool list is allowlisted;
- API routes mirror approved operation envelopes;
- auth and audit decisions are documented before server exposure;
- remote surfaces do not define Norma logic.

## Phase 5 — User-Facing Product Readiness

Goal: add user-facing workflow only after contracts and diagnostics are stable.

Product requirements must come before UI.

The first UI should be a read-only result viewer.

The first input path should be upload of explicit structured JSON only.

The UI must make all diagnostics visible. It must not collapse results to a generic boolean.

The UI must not add:

- camera/image/vision;
- native CAD integration;
- beauty score;
- creative recommendation;
- intent inference;
- prompt-as-source;
- artifact-as-source.

Expected PRs:

- `PR40 — user-facing product requirements`;
- `PR41 — read-only result viewer plan`;
- `PR42 — structured input viewer prototype`;
- `PR43 — verification/replay result UI prototype`.

Exit criteria:

- product requirements are accepted;
- UI shows statuses, warnings, errors, provenance, source refs, mismatches, and artifact freshness data;
- UI cannot hide blocking errors or critical warnings;
- UI consumes core/API results and does not define Norma truth.

## Phase 6 — Business Launch Readiness

Goal: prepare a real business launch after developer, MCP/API, and product-readiness gates are satisfied.

Deliverables:

- onboarding docs;
- demo workflow;
- pricing and packaging decision;
- support policy;
- privacy policy;
- security policy;
- beta pilot checklist;
- release checklist.

Expected PRs:

- `PR44 — onboarding and examples`;
- `PR45 — beta pilot readiness`;
- `PR46 — business launch checklist`.

Exit criteria:

- a target user can complete the supported workflow without hand-holding;
- support and troubleshooting paths exist;
- privacy/security posture is documented;
- beta criteria and launch criteria are explicit;
- no forbidden source-truth shortcuts are introduced.

## Historical Immediate PR Sequence

The following was the concrete sequence after PR26 in the old roadmap. It is
historical context, not the current execution queue:

1. PR27 thin local CLI.
2. PR28 CLI examples + smoke docs + JSON output contract.
3. PR29 V1.5 release checkpoint / tag readiness.
4. PR30 package/public npm readiness audit.
5. PR31 typed consumer examples and compatibility policy.
6. PR32 public package publishing gate, still no publish unless approved.
7. PR33 MCP contract docs only.

Do not treat this PR27-PR33 sequence as mandatory remaining work after R16.
Use the Current Execution Mode After R16 section instead.

MCP implementation must not start before MCP contract docs are reviewed.

Remote MCP must not start before a threat model.

API implementation must not start before an API contract.

UI implementation must not start before product requirements.

## Strict Non-Goals Until Explicit Approval

The following remain forbidden until a later PR explicitly approves the scope:

- full SDK runtime;
- user-facing CLI with broad commands;
- MCP implementation before contract docs;
- remote MCP before threat model;
- API server before API contract;
- public npm publish before package readiness gate;
- UI before product requirements;
- camera/image/vision;
- CAD/plugin/marketplace;
- cloud/hosted service;
- beauty score;
- creative recommendation;
- prompt-as-source;
- artifact-as-source;
- agent-created rules, packs, ratios, tolerances, or geometry;
- hidden pack selection;
- hidden tolerances;
- implicit ratio selection;
- arbitrary operation replay;
- adapter-owned Norma logic.

## Per-PR Engineering Discipline

Every implementation PR must:

- read the real repository files before proposing changes;
- create a dedicated branch from current `main`;
- state scope and non-goals in the PR body;
- change only scoped files;
- avoid broad refactors;
- avoid runtime source changes unless the PR is explicitly runtime-scoped;
- preserve package privacy unless package-readiness explicitly approves a change;
- add focused tests for new behavior;
- avoid snapshot updates unless the contract change is intentional and explained;
- run build/test/check;
- run `git diff --check`;
- run guardrail greps for forbidden surfaces;
- run `fallow audit --changed-since main --format compact` when the tool is available;
- request or inspect Greptile review when available;
- repair blocking findings before merge;
- document any warning-level findings that are accepted without code changes.

Every docs-only PR must:

- add or modify only documentation files within scope;
- show that no runtime source, tests, package metadata, lockfiles, or `CORE_VERSION` changed;
- still run validation commands when the environment is available, or state why they were not run.

## Validation Commands

Default validation for runtime-bearing PRs:

```bash
npm run build
npm test
npm run check
git diff --check
```

Focused package consumption validation:

```bash
npm run build
node --test tests/package-consumption.test.mjs
npm test
npm run check
git diff --check
```

Docs-only validation:

```bash
git diff --check
git diff -- package.json package-lock.json src/core-constants.ts src tests
npm run build
npm test
npm run check
```

Guardrail greps for CLI, SDK, API, MCP, adapter, and media/CAD drift:

```bash
rg "createCli|runCli|createSdk|createClient|createApi|createServer|createMcp|createMcpServer|createAdapter" src tests docs README.md || true
rg "camera|image|vision|cad|cloud|plugin|marketplace" src tests docs README.md || true
rg "publishConfig|\"bin\"|commander|yargs|mcp|server" package.json src tests docs README.md || true
rg "Date.now|Math.random|process.env" src tests docs README.md || true
```

Expected allowed grep hits:

- explicit non-goal text;
- forbidden-export assertions;
- existing guardrail docs;
- existing forbidden dependency terms;
- existing deterministic test update gates.

Unexpected hits must be reviewed before merge.

## Review and Repair Loop

Use this loop for every phase PR:

1. Re-read the scoped docs and active code before editing.
2. Implement the smallest scoped change.
3. Run the focused test first.
4. Run the full validation commands when available.
5. Inspect the diff manually.
6. Confirm no forbidden files changed.
7. Run guardrail greps.
8. Run `fallow audit --changed-since main --format compact` when available.
9. Open the PR with scope, non-goals, validation, and guardrail notes.
10. Review Greptile or equivalent automated review if available.
11. Treat P0/P1 findings as blocking.
12. Treat P2 findings as required review: fix them unless there is a clear documented reason not to.
13. Treat P3/nit findings as optional cleanup.
14. Push repairs on the same branch.
15. Re-run focused validation after each repair.
16. Merge only when the PR still matches its original scope.

Do not expand a PR to fix unrelated problems. Open a follow-up PR instead.

## Exit Criteria

### V1.5 developer-ready exit

V1.5 developer-ready status is reached when:

- local module import is tested;
- thin CLI exists;
- CLI examples and smoke docs exist;
- CLI JSON output contract is reviewed;
- V1.5 release checkpoint is accepted;
- build/test/check pass;
- no forbidden external surface defines Norma truth.

### MCP-ready exit

MCP-ready status is reached when:

- MCP contract docs are accepted;
- local stdio MCP exposes only approved tools;
- MCP inspector tests and golden outputs exist;
- diagnostics, provenance, and source refs remain visible;
- agent-created rules, packs, ratios, tolerances, geometry, prompt-derived source truth, and artifact-as-source behavior remain impossible.

### API-ready exit

API-ready status is reached when:

- remote/API threat model is accepted;
- API contract docs are accepted;
- auth, audit logs, and rate-limit policy exist;
- API server implementation, if approved, mirrors core result envelopes;
- remote surfaces remain thin clients of the core.

### User-facing product exit

User-facing product readiness is reached when:

- product requirements are accepted;
- read-only result viewer exists;
- structured JSON input path exists;
- verification/replay results are visible with full diagnostics and provenance;
- UI does not infer source truth or hide warnings/errors.

### Business-ready exit

Business-ready status is reached when:

- onboarding and examples are accepted;
- beta pilot checklist is accepted;
- launch checklist is accepted;
- pricing/packaging decision is documented;
- support, privacy, and security policies exist;
- a target user can complete the supported workflow end to end;
- all public surfaces consume approved core contracts and preserve source truth.
