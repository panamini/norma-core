# Norma Core Business Readiness Roadmap

## Status

This is a planning document.

It does not implement product features.

It does not authorize scope by itself. Each phase below requires its own small PR with a narrow scope, explicit non-goals, acceptance criteria, and validation notes.

This roadmap intentionally lives at `docs/BUSINESS_READINESS_ROADMAP.md` as a business and release-readiness roadmap, not as a single implementation plan under `docs/plans/`.

The core remains deterministic and source-truth driven. Norma truth must stay in explicit structured source objects, pack locks, operation contexts, diagnostics, provenance, and deterministic result envelopes. External surfaces may call the core; they must not define Norma logic.

This roadmap is synced through merged PR #318 for the active private Personal
Visual Harmony track. The bounded automatic-discovery, direct A/B,
guide-recovery, and widget-metadata rail is complete. Earlier checkpoint
sections remain historical evidence, not the current execution queue.

Historical R32 wording remains true for that checkpoint: This roadmap is synced
through R31, and R26, R30, and R31 are roadmap/usecase stabilization
checkpoints.

Historical R26 wording remains true for that checkpoint: This roadmap is synced
through R25. R22 through R25 are complete.

## Current State After PR318

Current decision reference:
`docs/decisions/2026-08-19-post-pr318-private-observation-gate.md`.

The active private Personal Visual Harmony rail is closed through exact merged
`main` commit `1e39e026f8df5d358fbfce62c6acc4bac0cbc8e0`:

- PR #312 added direct mouse A/B measurement with visible A and B traces before
  confirmation;
- PR #314 broadened bounded automatic harmonic discovery to existing rectangle,
  quadrilateral, and ellipse surface guides;
- PR #315 through PR #317 repaired malformed-candidate recovery and repeated
  post-analysis guide editing;
- PR #318 declared `ui.csp`, `ui.domain`, `openai/widgetCSP`, and
  `openai/widgetDomain` without changing Core, geometry, providers, auth,
  tools, or deployment configuration.

The exact merge was deployed to the existing private Railway service as
deployment `bdc416c8-7ff3-4206-b456-e20ead106b77`; `/readyz` was healthy, and a
fresh private ChatGPT plugin accepted all four metadata fields without a
warning. These are recorded external closure facts, not facts that a checkout
can continuously re-prove.

There is no mandatory implementation PR after PR #318. The next gate is
observation-led maintenance: collect real private usage evidence and open one
surgical corrective PR only for a reproduced product-code defect or a
demonstrated user need with a bounded acceptance case. Prefer zero runtime PRs
when documentation or user guidance is sufficient.

Automatic relationships remain reviewable, non-authoritative candidates.
Direct A/B remains an explicit image-plane comparison. Neither path may select
geometry, confirm a review, infer artistic intent, or run Core automatically.

Artistic usefulness, sustained use, end-to-end latency p50/p95, and a real
mobile ChatGPT viewport remain unproven. The existing review journal can record
bounded timing and correction evidence, but its twelve-case smoke corpus is not
a product-quality benchmark.

Widget publication metadata is not public publication. Public ChatGPT app
submission, collaborator access, commercial or production qualification,
public npm publication, default SAM expansion, new geometry or harmonic-report
families, perspective, rhythm, scoring, optimization, beauty, and artistic
intent remain deferred and require separate explicit authorization.

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

## Current State After R31

Current truth-sync reference: `docs/decisions/2026-06-30-post-r31-roadmap-truth-sync.md`.

R30 is complete. PR #152 merged the local Structured Analyze demo workflow
smoke, keeping the workflow local/static/read-only and preserving
`result.json` as canonical Norma truth.

R31 is complete. PR #153 merged the real-usecase Structured Analyze layout
demo, proving a concrete local layout fixture without adding hosted behavior,
remote APIs, public package publication, image/CAD/Figma/Photoshop/Illustrator
adapters, recommendation, optimization, beauty scoring, or prompt-derived
source truth.

R26, R30, and R31 are roadmap/usecase stabilization checkpoints. They do not
force a continuing PR ladder.

Package readiness and publication gate documents already exist:

- `docs/PACKAGE_PUBLICATION_READINESS.md`
- `docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md`

The old PR30, PR31, PR32, and PR33 labels are historical context, not the
current execution queue and not mandatory next work.

The current execution model is current-gap driven:

- select one small PR at a time from the current repository state;
- do not follow old PR ladders as mandatory sequencing;
- do not publish the package without explicit maintainer approval;
- do not add hosted or remote MCP expansion without explicit approval;
- do not add image, CAD, Figma, Photoshop, or Illustrator adapters without
  explicit approval;
- do not add recommendation, optimization, beauty scoring, or prompt-derived
  source truth.

R32 is this docs/tests-only post-R31 roadmap truth-sync checkpoint.
The next real work after R32 must be selected from current gaps, not stale
roadmap labels.

## Current State After PR82

Current truth-sync reference:
`docs/decisions/2026-07-01-post-pr82-roadmap-truth-sync.md`.

Norma Core is current through PR #162 / PR82 at
`6537b3a59fedd348d693a12e319e910a6a7283dd`.

R31 through R36 are complete:

- PR #153 / R31 added the real-usecase Structured Analyze layout demo.
- PR #154 / R32 synced the roadmap after R31.
- PR #155 / R32 added the real-usecase local inspection demo smoke.
- PR #156 / R33 consolidated local truth projection smoke coverage.
- PR #157 / R34 added the real-usecase local demo command.
- PR #158 / R35 hardened the local demo command.
- PR #159 / R36 froze the local CLI report boundary.

PR81 and PR82 are complete:

- PR #160 / PR81 added the package-private accepted geometry to Core mapper.
- PR #161 fixed PR81 mapper review findings.
- PR #162 / PR82 proved the synthetic accepted geometry to Structured Analyze
  bridge.

The accepted geometry mapper remains package-private. It is not a package-root
export, not a public API, not a provider adapter, not a perception layer, not a
source-truth shortcut, and not a public product surface.

PR82 proves deterministic synthetic bridge reachability only: rectangle-only
synthetic `AcceptedGeometry@1` payloads map through the package-private mapper,
an explicit synthetic shared-unit-surface normalization step is still required
before pair analysis, mapped compositions can feed
`analyzeStructuredCompositionV1`, and unsupported accepted-geometry primitives
stop at the mapper.

This checkpoint does not approve provider ingestion, image analysis, OpenAI or
ChatGPT runtime behavior, camera/CAD/Figma/Photoshop/Illustrator adapters,
hosted MCP, remote API runtime, UI/dashboard behavior, package publication,
public package exports, automatic ratio-pack or family selection,
recommendation, optimization, correction, beauty scoring, prompt inference, or
prompt-derived source truth.

PR83 is this docs/tests-only post-PR82 roadmap truth-sync checkpoint.
The next real work after PR83 must be selected from current gaps, not stale
roadmap labels.

## Current State After PR86

Current truth-sync reference:
`docs/decisions/2026-07-01-post-pr86-roadmap-truth-sync.md`.

Norma Core is current through PR #166 / PR86 at
`2a2152c1bf90768a5540141f8d91196c32239735`.

Since the post-PR82 truth sync:

- PR #163 / PR83 recorded the post-PR82 roadmap truth sync.
- PR #164 / PR84 hardened accepted-geometry integration determinism.
- PR #165 / PR85 added the package-private synthetic shared-unit-surface
  normalization helper.
- PR #166 / PR86 preserved metric policy through the normalizer, including
  surface-only metric policies on normalized output compositions.

The accepted-geometry local/private bridge rail is closed through PR86. The
accepted-geometry mapper and shared-unit-surface normalizer remain
package-private. They are not package-root exports, not public APIs, not
provider adapters, not perception layers, not source-truth shortcuts, and not
public product surfaces.

PR81 through PR86 prove only deterministic synthetic bridge reachability and
normalization safety: rectangle-only synthetic `AcceptedGeometry@1` payloads map
through the package-private mapper, the synthetic shared-unit-surface
normalizer places mapped pairs onto one explicit unit surface, metric policy is
kept coherent across the shared surface and normalized compositions, mapped
compositions can feed `analyzeStructuredCompositionV1`, and unsupported
accepted-geometry primitives stop at the mapper.

This checkpoint does not approve provider ingestion, image analysis, OpenAI or
ChatGPT runtime behavior, camera/CAD/Figma/Photoshop/Illustrator adapters,
hosted MCP, remote API runtime, UI/dashboard behavior, package publication,
public package exports, automatic ratio-pack or family selection,
recommendation, optimization, correction, beauty scoring, prompt inference, or
prompt-derived source truth.

PR87 is this docs/tests-only post-PR86 roadmap truth-sync checkpoint. There is
no forced PR ladder after PR86. The next real work after PR87 must be selected
from current repository gaps, not stale roadmap labels.

## Integration Unlock Contracts After PR87

Current truth-sync reference:
`docs/decisions/2026-07-01-integration-unlock-contracts.md`.

PR87 is merged as PR #167 at
`ccd8e8c03403cbf4fd080b11c77fd59bbdba41bf`.

PR88 is a docs/tests-only integration unlock contract. It moves the next hosted
MCP, private/dev ChatGPT connector, and image/CAD/Figma/provider adapter tracks
from fully blocked future language into explicitly gated planned tracks. It
does not implement any hosted runtime, connector runtime, adapter runtime,
provider integration, package publication, public export, auth/OAuth flow,
secret handling, deployment, dependency, lockfile, CI, CLI, report-kit, viewer,
example, schema, or source-runtime change.

The priority order after PR87 is:

1. immediate local operator validation and visible proof over the existing
   local demo, report, and MCP surfaces;
2. MVP demo or guided inspection surface only when it remains local, explicit,
   and derived from current Core output;
3. package/publication readiness only after a separate package-readiness gate;
4. hosted/private MCP and ChatGPT connector only after a separate runtime
   approval gate;
5. image/CAD/Figma/provider adapters only after a separate adapter approval
   gate.

The first safe implementation PR in each unlocked track is still a gate, not a
runtime implementation:

- Hosted/private MCP: define the exact hosted runtime approval contract, threat
  model delta, deployment boundary, auth/secrets boundary, budget/retention
  boundary, allowed tools, and remote verification matrix before any hosted
  server code.
- Private/dev ChatGPT connector: define the connector approval contract,
  metadata boundary, local/dev smoke evidence, tool exposure limits, and
  no-public-submission boundary before any connector runtime or publication
  work.
- Image/CAD/Figma/provider adapters: define the adapter approval contract,
  accepted structured geometry schema handoff, provenance/loss warnings,
  source-truth split, provider-specific evidence, and first fixture-only proof
  before any provider call, plugin, file ingestion, or adapter implementation.
- Package/publication readiness: define package-readiness evidence, public API
  surface, exports, dependency policy, and publish gate before any publication
  state, package metadata, lockfile, or dependency change.

All future unlock-track PRs must preserve the current Core source-truth model:
Norma Core accepts explicit structured geometry only. Adapters and connectors
may translate external representations into accepted structured geometry, but
they must not become Norma source truth, prompt-inference shortcuts, hidden
pack/rule/tolerance defaults, recommendation engines, optimization layers,
beauty scorers, or correction layers.

The PR86 metric-policy invariant remains mandatory for every future adapter,
connector, hosted, and package path: explicit metric policies must stay
coherent across accepted geometry, synthetic shared surfaces, normalized output
compositions, Structured Analyze operation contexts, and any derived inspection
artifact.

The current package is not yet:

- a full SDK;
- a CLI;
- an API;
- an MCP server;
- a public npm package;
- a user-facing product.

PR25 mostly satisfies local module readiness. It does not satisfy developer-tool, MCP, API, user-facing product, or business readiness by itself.

## Guided Inspection Package/API Readiness Gate After PR89

Current gate reference:
`docs/decisions/2026-07-02-guided-inspection-package-api-readiness-gate.md`.

Current truth-sync reference:
`docs/decisions/2026-07-02-post-pr92-roadmap-truth-sync.md`.

PR88 defined the post-PR87 priority order: local operator validation, guided
inspection surface, package/publication readiness gate, hosted/private MCP and
ChatGPT connector gates, and image/CAD/Figma/provider adapter gates.

PR89 is merged as PR #169 at
`f064ed96a173494090a86ffbfd54523b87fe83ea`. It completed the local guided
inspection demo surface without changing package exports, package metadata,
hosted runtime, connector runtime, provider calls, adapter implementation, or
public publication state.

PR90 is a docs/tests/guard package/API readiness gate for the PR89 local proof.
`result.json` remains the canonical machine-consumable Norma truth for the
guided inspection flow. `guide.html`, `report.html`, `visual.svg`,
`summary.json`, and `summary.md` are derived local inspection artifacts only.

PR91 is merged as PR #171 at
`427121f61bf5bda2effe02bdf93b5d5c4c0d9fca`. It added the package-private
`createGuidedInspectionArtifactContract` helper without package-root exports,
package metadata changes, publication, hosted runtime, connector runtime,
provider calls, or adapter implementation.

PR92 is merged as PR #172 at
`2a897b2e7c41a54081a80aa50f0c72b5f6341aa7`. It wired
`bin/norma-core-guided-inspection-demo.mjs` through the package-private guided
inspection artifact contract while preserving the existing local command
behavior and generated artifact envelope.

Historical PR93 wording remains true for that checkpoint: The next safe
implementation slice after this truth sync is a local guided inspection consumer
proof to consume the existing demo output and `result.json` from the local
artifact envelope.

PR93 recorded the post-PR92 roadmap truth as a docs/tests-only checkpoint.

PR94 is merged as PR #174 at
`3975f9841490735085a74984e858a9fbffd778e0`. It added the package-private
guided inspection consumer proof without adding package-root exports, package
metadata changes, package publication, hosted MCP runtime, ChatGPT connector
runtime, provider calls, or adapter implementation.

PR95 is merged as PR #175 at
`35326bdd813f0002d310600f83c6405112880527`. It was the docs/tests/guard
approval PR for the exact future package-root guided inspection API export
contract and did not implement package publication, package metadata changes,
hosted MCP runtime, ChatGPT connector runtime, OpenAI/provider calls,
image/CAD/Figma adapters, inference, recommendation, optimization, correction,
scoring, or automatic family selection.

PR96 is merged as PR #176 at
`0f8112f9c58717ee74de2be8b1fd862d6b71c8d5`. It implemented the approved
package-root guided inspection V1 exports:
`createGuidedInspectionArtifactContractV1` and
`consumeGuidedInspectionDemoEnvelopeV1`, while preserving the package-private
helper names, package metadata, lockfiles, publication state, hosted runtime,
connector runtime, provider calls, adapters, and source-truth boundary.

Current package API decision reference:
`docs/decisions/2026-07-02-package-api-export-contract-approval.md`.

Future package/API surfaces may reference derived artifact paths and metadata
only as inspection outputs. They must not treat derived artifacts as source
truth or use them to infer, correct, optimize, recommend, score, select
families, or override Norma results.

PR97 is merged as PR #177:

```txt
merge commit: 6d831e9cb9ab38814832247d1946a6c8cd050675
head commit: c4aff0176bf9cd396dd1d1d49fccebb153634e19
```

It proved that a local external-style consumer can import `@norma/core` from the
package root and use the PR96 guided inspection V1 exports against a realistic
guided demo envelope. It kept `result.json` as canonical machine-consumable
Norma truth, kept `guide.html` required for the envelope path, kept optional
`report.html`, `visual.svg`, `summary.json`, and `summary.md` outputs
derived-only, kept `localOnly` true, and avoided internal
`dist/src/local-report` or package-private helper imports. PR97 did not add
package publication, package metadata changes, hosted MCP runtime, ChatGPT
connector runtime, OpenAI/provider calls, image/CAD/Figma/provider adapter
implementation, inference, recommendation, optimization, correction, scoring,
or automatic family selection.

PR98 is the guided inspection package publication readiness gate.

Current publication gate reference:
`docs/decisions/2026-07-02-guided-inspection-package-publication-readiness-gate.md`.

PR98 keeps the current package private and records that package publication,
public npm publication, and package metadata changes remain blocked. Package
metadata changes remain blocked until a later explicit package-change PR.
Actual publish remains blocked until a separate explicit maintainer approval.
PR98 is a gate/checkpoint, not a publication candidate.

The exact future publication prerequisites are: explicit maintainer decision
whether public npm publication should happen at all; npm scope ownership/access
verified outside PR98; package files/tarball policy approved; `dist/` and types
inclusion strategy approved; tests/goldens/internal docs exclusion policy
approved; package-level `bin` decision approved or explicitly excluded;
license/repository/bugs/homepage/engines/support metadata decision approved;
provenance/trusted-publishing/token/2FA/release-environment policy approved;
packed tarball install smoke required in a later package-change/publication
candidate PR; and rollback/deprecate/unpublish policy documented before actual
publish.

The best next PR after PR98 is:

```text
PR99: package tarball contents and metadata approval contract
```

PR99 should still not publish and should not implement package metadata changes
unless those exact changes are explicitly approved in that PR.

PR99 is the package tarball and local install proof PR.

Current PR99 decision reference:
`docs/decisions/2026-07-03-package-tarball-local-install-readiness.md`.

PR99 keeps the package private and local-only while adding the minimal
non-publishing `files` allowlist needed for bounded tarball contents and local
packed-tarball install proof. The approved tarball boundary includes
`package.json`, `README.md`, compiled JavaScript under `dist/src/`, and
TypeScript declarations under `dist/src/`. Repo-only docs, tests, fixtures,
examples, workflows, source TypeScript, viewer files, local demo bins, lockfiles,
and generated golden fixtures remain excluded from the tarball.

PR99 proves `npm pack --json` from a temporary packing directory and proves a
temporary external-style consumer can install the packed tarball, import
`@norma/core`, and use the approved package-root guided inspection V1 exports:
`createGuidedInspectionArtifactContractV1` and
`consumeGuidedInspectionDemoEnvelopeV1`.

PR99 does not approve or execute npm publish, registry mutation, npm auth setup,
provenance setup, release workflow, git tag, release/version bump, dependency
changes, lockfile changes, hosted MCP, ChatGPT connector runtime,
OpenAI/provider calls, image/CAD/Figma/provider adapters, or public package
publication.

PR100 finalizes the local package publication candidate boundary without
publishing. It may add only safe non-publishing candidate metadata whose values
are discoverable from the current repository and runtime baseline. It must keep
`private: true`, version `0.1.0`, no `publishConfig`, no package-level `bin`,
no dependency graph changes, and the PR99 tarball allowlist. If package metadata
requires a root `package-lock.json` mirror, the lockfile change must stay limited
to that root metadata consistency and must not change resolved dependencies.

PR100 must not add a license field unless an authoritative root license file or
repo policy exists. If no license authority exists, the best next step after
PR100 is an explicit maintainer license and public-publication authorization
decision before any release operation.

The current Core source-truth model still applies: Norma Core accepts explicit
structured geometry only. The PR86 metric-policy invariant remains mandatory
across accepted geometry, synthetic shared surfaces, normalized output
compositions, Structured Analyze operation contexts, and derived inspection
artifacts.

## Visual Fixture Roadmap Truth Sync After PR104

Current boundary reference:
`docs/decisions/2026-07-07-local-visual-pilot-boundary.md`.

Prior truth-sync reference:
`docs/decisions/2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md`.

PR102 approved the local-only visual adapter fixture contract. PR103 added the
static synthetic visual fixture handoff proof. PR104 added the local visual
fixture guided inspection demo.

PR106 is closed/complete. PR106 completed the local consumer proof for the PR104
visual fixture demo envelope/result. PR107 is closed/complete. PR107 completed
the static synthetic scenario corpus while keeping recognition, providers, CAD,
Figma, hosted MCP, and ChatGPT runtime out of scope.

PR108 is closed/complete. PR108 is the current local visual pilot boundary. It
defines the local visual pilot boundary before any real external source is
allowed:

```text
Untrusted external evidence
        |
        v
Observation Envelope
(untrusted, non-authoritative evidence container)
        |
        v
Explicit Acceptance Boundary
(human/system-approved transformation)
        |
        v
Accepted Structured Geometry
(only Core input)
        |
        v
Norma Core / Structured Analyze
        |
        v
result.json
(canonical computational output where applicable)
```

Visual observations and future provider, image, CAD, Figma, or ChatGPT outputs
are evidence only. Observation Envelope data is untrusted, non-authoritative,
and cannot contain executable geometry truth. The only accepted bridge into
existing Norma Core / Structured Analyze in this rail is explicit accepted
structured geometry.

Where applicable, `result.json` remains canonical Norma truth. `guide.html`,
`visual.svg`, `summary.json`, `summary.md`, report artifacts, overlays,
observations, and prompts are derived or evidence-only artifacts.

The following remain not approved: real image recognition, provider/OpenAI
calls, CAD/Figma import, hosted MCP, ChatGPT connector runtime, package
publication, new visual-fixture or additional package-root public exports,
recommendation, correction, optimization, scoring, beauty judgment, automatic
family selection, provider payload contracts, OpenAI Vision JSON, CAD import
JSON, Figma payloads, ChatGPT connector schemas, and prompt-derived,
artifact-derived, provider-derived, or observation-derived source truth.

The PR106 through PR109 sequence is:

1. PR106: local consumer proof for PR104 visual fixture demo envelope/result.
2. PR107: static synthetic scenario corpus, 2-3 fixtures, still no recognition.
3. PR108: decision PR for first real external track, now the current local
   visual pilot boundary.
4. PR109: current decision approving OpenAI/vision-style evidence as the first
   external pilot contract direction, not an implementation.

PR108 required that PR109 must choose exactly one first real external pilot
track. PR109 selects exactly one first real external pilot track:
OpenAI/vision-style evidence pilot contract. OpenAI/vision-style evidence
remains evidence only and is not Core truth, provider authority, package API
truth, hosted truth, connector truth, wiki truth, or artifact truth. OpenAI is
the first pilot candidate only; the architecture remains provider-agnostic.

CAD/Figma geometry pilot contract and ChatGPT/MCP product path contract remain
future/unselected tracks. They are not approved by PR109.

PR109 is still not an implementation. It does not approve real image
recognition, provider/OpenAI calls, CAD/Figma import, hosted MCP, ChatGPT
connector runtime, package publication, new visual-fixture or additional
package-root public exports, recommendation, correction, optimization, scoring,
beauty judgment, automatic family selection, provider payload implementation,
OpenAI Vision JSON, CAD import JSON, Figma payloads, ChatGPT connector schemas,
or prompt-derived, artifact-derived, provider-derived, confidence-derived, or
observation-derived source truth.

The next decision point is:

```text
PR110: decide whether the selected pilot contract is ready for a minimal synthetic provider-envelope proof.
```

PR110 may proceed, revise the contract, stop, or choose a different path if
evidence shows the selected contract is not ready. PR110 must still not imply
real API calls unless separately approved.

PR110 proved the synthetic external evidence acceptance boundary. PR108
established the external evidence boundary, PR109 selected the vision-style
evidence pilot category, and PR110 proved that synthetic observation evidence
can be rejected until an explicit acceptance boundary produces accepted
structured geometry. PR110 does not approve OpenAI integration, image
recognition, provider support, product readiness, CAD/Figma import, hosted MCP,
ChatGPT connector runtime, package publication, package metadata/dependency
changes, public exports, or Core schema/runtime widening.

PR111 and PR112 are closed/complete. PR111 added the package-private synthetic
external evidence acceptance proof helper, and PR112 added the local synthetic
evidence acceptance demo command. The next readiness gate is PR113:

```text
PR113: approve real external evidence pilot readiness gate
```

PR113 is docs/tests-only. It approves the first real external evidence pilot
readiness gate, keeps the selected pilot candidate on the OpenAI/vision-style
track from PR109, and preserves the provider-neutral lifecycle:
Provider output -> External Evidence Envelope -> Explicit Acceptance Boundary
-> Accepted Structured Geometry -> Core / Structured Analyze ->
result.json-shaped canonical computational output where applicable.

PR113 does not approve live provider calls, OpenAI SDK/API usage, image
recognition, provider payload contracts, provider-derived accepted geometry,
provider truth, confidence-threshold acceptance, provider runtime, runtime
adapters, MCP/ChatGPT changes, CAD/Figma import, package exports, publication,
dependencies, lockfiles, source fixture changes, demo changes, or Core
schema/runtime widening.

The next allowed implementation PR is:

```text
PR114: local gated provider-evidence adapter prototype
```

PR114 must remain local/gated/prototype-only by default, preserve the
provider-neutral envelope and unchanged PR111 helper boundary, avoid any direct
provider-to-Core path, forbid provider-derived accepted geometry, avoid Core
schema/runtime widening and package/public exports, include deterministic
replay/redaction strategy, define fail-closed behavior, avoid CI live-network
dependency, and make no live provider API call by default.

PR115 is the controlled live provider experiment gate:

```text
PR115: approve controlled live provider experiment gate
```

PR115 is docs/tests-only. It approves only the controlled live provider
experiment gate and approval contract. It does not implement live provider
runtime, provider SDK/API usage, image recognition, provider payload parsing,
live network calls, provider fixtures, package exports, package metadata,
dependencies, lockfiles, MCP/ChatGPT runtime, CAD/Figma import, demo commands,
or Core schema/runtime widening.

OpenAI/vision-style remains the selected pilot candidate. The architecture
remains provider-neutral, and provider-specific mapping must terminate at a
provider-neutral External Evidence Envelope or repository-equivalent boundary
before any explicit Acceptance Boundary can produce Accepted Structured
Geometry.

Real provider calls remain unapproved until a later PR explicitly approves
them.

The next possible implementation gate is:

```text
PR116: add disabled local live-provider experiment harness
```

PR116, if later approved, must be disabled by default, manual-only,
fail-closed without environment configuration, and excluded from CI
live-network execution. If PR116 wants live network/provider execution, it must
explicitly request and justify that in its own Change Contract; otherwise live
provider execution remains PR117 or later.

PR116 now adds only the disabled local harness boundary described in
`docs/decisions/2026-07-08-disabled-local-live-provider-experiment-harness.md`:
a package-private helper plus an unregistered local developer command that
returns structured fail-closed state and always reports no live provider
execution. PR116 does not add package exports, package scripts, provider SDK/API
usage, network calls, image recognition, provider payload parsing, fixtures,
MCP/ChatGPT, CAD/Figma, package publication, or Core schema/runtime widening.

PR117 adds the controlled manual live-provider smoke behind the PR116 disabled
harness:

```text
PR117: add controlled live provider smoke behind disabled harness
```

PR117 keeps the default command disabled and network-free, requires explicit
local operator opt-in for any live transport, and approves no CI live-network
behavior. No CI live-network behavior is approved. Provider evidence remains
non-truth. It does not add product readiness, package/API support, ChatGPT/MCP
support, hosted support, or provider output as Core truth.

PR118 adds redacted controlled live smoke diagnostics after the blocked live
smoke reached the provider and returned a provider error:

```text
PR118: add redacted controlled live smoke diagnostics
```

PR118 keeps the smoke manual-only, disabled by default, and CI-network-free. It
adds only low-cardinality redacted diagnostics for provider HTTP failures,
network failures, and artifact-write failures. It does not persist raw provider
output, raw request bodies, raw response bodies, raw provider messages, raw
params, image data, base64, local paths, secrets, or provider fixtures. It does
not add provider SDKs, dependencies, package metadata, package exports,
MCP/ChatGPT runtime, hosted support, Core schema/runtime widening, accepted
geometry, `result.json` production, provider truth, automatic acceptance,
confidence-threshold acceptance, scoring, correction, recommendation,
optimization, or family selection.

PR119 classifies the observed docs-aligned request failure more honestly:

```text
PR119: classify controlled live provider input compatibility diagnostics
```

When the provider returns HTTP `400` with redacted `invalid_value` and input
param class, the smoke now reports `input_compatibility` instead of
`request_shape`. That routes operators toward model access, account
configuration, selected model, or input-capability follow-up while preserving
the existing request body, `store: false`, manual gates, redaction, no raw
provider output, no provider fixtures, no package/API changes, and no Core truth
changes.

PR120 adds controlled live provider diagnostic next-action hints:

```text
PR120: add controlled live provider diagnostic next-action hints
```

PR120 keeps the smoke manual-only, disabled by default, and CI-network-free. It
adds only allowlisted advisory `providerDiagnosticNextAction` values derived from
redacted `providerErrorClass`. It does not change the request body, `store:
false`, provider runtime, raw provider persistence, package/API surface, Core
input, accepted geometry, provider truth, automatic acceptance, scoring,
correction, recommendation, optimization, or family selection.

If a later controlled live smoke returns `status: "ok"`, the next evidence
checkpoint may be a future controlled live provider smoke evidence checkpoint.
If the live smoke still returns `provider_error`, the next PR must remain a
focused diagnostic follow-up based on the redacted diagnostic class, not an
evidence checkpoint.

PR121 records the first redacted controlled live provider smoke success
checkpoint:

```text
PR121: controlled live provider smoke outcome checkpoint
```

The smoke completed only through manual operator gates, an accessible GPT-5
family vision model, `reasoning.effort: "low"`, and image `detail: "low"`.
The checkpoint keeps raw provider output, raw request body, raw image/base64,
local absolute input path, credentials, and the exact model environment value
out of durable repo artifacts. Provider output remains evidence only; no
accepted structured geometry, Core input, Structured Analyze run, or
`result.json` was produced. This does not approve production OpenAI integration,
package/API readiness, hosted MCP, ChatGPT runtime, CAD/Figma adapters,
automatic acceptance, provider truth, or product launch.

PR122 makes the receipt-only smoke fail closed on incomplete provider
responses:

```text
PR122: fail closed on incomplete controlled live provider responses
```

PR122 rejects incomplete success responses instead of treating transport-level
success as proof that provider output was observed. It preserves the existing
manual, local, disabled-by-default, redacted, CI-network-free boundary and does
not create accepted geometry, Core input, or `result.json`.

PR123 consumes the redacted smoke artifacts without widening their authority:

```text
PR123: add controlled live smoke artifact consumer proof
```

PR123 proves that the persisted, allowlisted smoke artifacts describe only a
provider response observation. The original prompt remains receipt-only:
`Confirm that an image was received.` The proof does not claim rectangle
detection, accepted geometry, Core input, or canonical output.

PR124 maps those redacted artifacts to provider-neutral observation metadata:

```text
PR124: add controlled provider observation contract
```

The PR124 contract is package-private, provider-evidence-only, low-cardinality,
and unable to self-accept. Provider-specific payloads remain outside Core and
outside package contracts.

PR125 adds the explicit acceptance proof:

```text
PR125: add controlled provider observation acceptance proof
```

PR125 links the exact provider-neutral observation identities to a separate
explicit acceptance boundary and an existing valid `AcceptedGeometry@1`.
Provider status, metadata, diagnostics, confidence, prompts, and artifacts
cannot create acceptance.

PR126 validates the PR123 -> PR124 -> PR125 chain and stops at the remaining
unapproved mapping boundary:

```text
PR126: add controlled provider observation-to-Core handoff proof
```

Its current honest result remains
`status: blocked_unapproved_mapping_boundary` with
`nextAllowedStep: approve_provider_observation_mapping_boundary`. It does not
relabel live evidence as `synthetic-only`, call the mapper, produce Core input,
run Structured Analyze, or produce `result.json`.

The compressed finish line is now strictly:

```text
PR127: approve local visual observation-to-Core pilot contract
-> PR128: implement explicit-acceptance AcceptedGeometry-to-Core handoff
-> PR129: implement controlled local live visual candidate observation demo
```

PR127 is docs/tests-only. It freezes the provider-neutral
`explicit-external-evidence-acceptance@1` mapping-context literal, the exact
package-private content-addressed provider execution receipt, candidate
rectangle observation envelope, exact human candidate selection record, PR125
proof reuse, identity linkage, fail-closed behavior, and the PR128/PR129 scopes.
It does not implement either runtime.

PR128 may start only after PR127 merges. It may extend the existing
package-private mapper context while preserving `synthetic-only`, replace
PR126's blocked result only after the PR125 proof succeeds, reuse existing
mapper/normalization/Structured Analyze code, and produce deterministic local
result evidence from already accepted geometry. It must not change provider
request, body, parser, adapter, or network behavior and must not add public
exports.

PR129 may start only after PR128 merges. It may change the controlled manual
local pilot from receipt-only output to validated rectangle candidate
observations, convert provider-specific structured output in memory to the
approved provider-neutral envelope, persist only the redacted allowlisted
execution receipt and candidate observation, compute and propagate the redacted
execution receipt identity
through minimally extended PR123/PR124 paths without weakening their existing
receipt-only compatibility, require a separate exact human selection record,
reject cross-execution and candidate/geometry substitution, minimally extend
the same package-private PR125 proof/PR128 handoff path for the execution,
candidate, selection, and AcceptedGeometry identities, and reuse PR128 plus
existing guided/report surfaces. It remains manual, local, disabled by default,
and CI-network-free.

PR129 is now proven by a real controlled operator run. Capture stopped at
explicit selection, and a user-authorized operator selection record accepted
the three candidates without correction. The runtime recorded
`explicitHumanSelectionValidated`, but no independent UI proof exists for each
candidate. The no-network resume then produced explicit accepted geometry,
completed Core / Structured Analyze, generated canonical `result.json`, and
derived a local report. Provider output remained candidate evidence only;
explicit accepted geometry remained the authority boundary.

PR131 selects exactly one first visual pilot product surface: a separate local
static visual candidate review and explicit-selection surface. The selected
surface adds the missing explicit candidate-review interaction before the same
acceptance workflow moves behind a connector, hosted service, or external
adapter, without claiming authenticated human-review proof. It remains separate
from the existing read-only result viewer.

PR131 is docs/tests-only and implements no UI or runtime. It freezes PR132 as
the next implementation PR: a local browser review surface that verifies the
exact source-image content identity in memory, overlays validated PR129
rectangle candidates, emits a closed selection intent, and delegates final
human-selection identity construction to a package-private Node path that
revalidates the receipt, candidate envelope, and bounded PNG bytes under an
explicit operator-confirmation flag. Existing PR129 `--resume` remains the only
path to AcceptedGeometry, Core / Structured Analyze, and canonical
`result.json`.

PR132 implements that selected local-only review slice: the static browser
surface verifies the exact bounded PNG before rendering candidate rectangles,
starts with no selection, emits only a closed non-authoritative intent after
explicit confirmation, and delegates final selection identity construction to
a package-private Node finalizer. The finalizer revalidates the receipt,
candidate envelope, PNG bytes, dimensions, identities, and candidate order;
the existing PR129 `--resume` path remains unchanged and exclusive for
AcceptedGeometry, Core / Structured Analyze, and canonical `result.json`.

After PR132, one no-PR operator validation must confirm the visual review flow
before the next external product-track decision. PR131 does not approve
production provider integration, autonomous acceptance, package publication,
public product readiness, or any deferred product track.

That no-network operator validation is now complete and is recorded in
`docs/decisions/2026-07-11-pr132-operator-validation-checkpoint.md` with the
exact commands, deterministic receipt/observation/selection identities, and
canonical `result.json` SHA-256. PR133 selects the private/developer-only
ChatGPT + MCP visual pilot as the single next external product track. The
selected journey must reuse the PR132 review and explicit selection boundary
plus the existing PR129 no-network resume path; ChatGPT, MCP arguments,
prompts, attachments, candidate observations, overlays, and selection intent
remain untrusted and non-authoritative.

PR133 was docs/tests-only and did not itself implement a connector or runtime.
The separately approved PR134 contract now implements one disabled-by-default,
package-private local STDIO MCP server for a single operator-configured visual
review job. Its exact two-tool inventory can inspect the three fixed PR132
artifacts and resume an already-finalized human selection through the existing
PR129 no-network path. It does not add tools to the general MCP server, accept
paths in tool calls, call a provider, select geometry, or connect ChatGPT.

PR134 is local orchestration proof only. Its real-process tests cover MCP
initialization, the initialized notification, exact tool listing, redacted
inspection, stale-identity rejection, atomic no-overwrite resume, cancellation,
timeouts, concurrency, and byte parity with the existing PR129 canonical
`result.json`. The durable contract is
`docs/decisions/2026-07-11-pr134-private-dev-local-visual-mcp-orchestration.md`.
Historical PR134 boundary wording remains true for that checkpoint: Hosted MCP, ChatGPT connector runtime, CAD/Figma,
uploads, servers, deployment, OAuth/auth, package publication, any new public
exports, autonomous acceptance, production data, real-user data, and public
launch remain unapproved.

PR135 is complete. The bounded private ChatGPT developer-mode validation proved
the exact two-tool inventory, authenticated user-mediated calls, valid resume,
no-overwrite behavior, parameter/path-injection rejection, and byte parity with
the existing PR129/PR134 canonical result. PR135 remained a private,
developer-only tunnel proof; it did not create a permanent service or approve
the local visual job server for multi-user hosting.

The approved CP-NORMA-PERMANENT-MCP-COMMERCIAL-V1 v1 program now replaces the
older open-ended hosted-MCP candidate sequence with four serialized roadmap
leaves:

1. PR136 - approve one stateless authenticated commercial-beta contract and
   every pre-runtime security gate;
2. PR137 - implement one permanent-capable Streamable HTTP runtime exposing
   exactly norma.analyzeStructuredCompositionV1;
3. PR138 - add deployment configuration and, after separate external
   confirmation, prove a permanent invited-user beta on Render plus Auth0;
4. PR139 - after the beta threshold, prepare and separately confirm public
   ChatGPT submission.

The canonical authority is
docs/decisions/2026-07-13-stateless-remote-mcp-commercial-beta-contract.md.
It supersedes historical future-work sequencing and blocked defaults in PR39
through PR51 where they conflict, while preserving those documents as
historical records.

`CC-PR138-RENDER-PRIVATE-BETA-DEPLOYMENT-PACKAGE-V1 v1` is the
repository-only deployment package for the next serialized leaf. It adds one
reviewable Render Blueprint with `autoDeployTrigger: off` and the operator
runbook at `docs/REMOTE_MCP_PRIVATE_BETA_RUNBOOK.md`. This repository slice
creates no Auth0 tenant, Render service, ChatGPT connector, or spend. The exact
external gate is `CC-PR138-RENDER-AUTH0-PRIVATE-BETA-LIVE-V1 v1`; until that
separate confirmation is received and the seven-day thresholds are met,
PR138 is not live-complete and PR139 remains blocked.

PR136 is docs/contract-tests only. It approves the exact PR137 boundary but
adds no runtime, dependency, deployment configuration, secret, external
resource, connector, or public submission.

The first commercial remote slice is deliberately tool-only and stateless. It
accepts explicit structured JSON and exposes exactly
norma.analyzeStructuredCompositionV1. Local STDIO tools are not inherited.
PR134/PR135 visual inspect/resume, images, uploads, provider/model calls,
storage, arbitrary replay, package publication, autonomous acceptance, and
public launch remain blocked unless their later named program gate approves
them.

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

Historical status after R32: these package-readiness and publication-gate
documents already exist. Do not create another package readiness PR merely
because this old phase list names PR30-PR32.

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

Historical status after R32: PR33 is an old label from this gated roadmap, not
the active next mandatory PR.

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
Use the Current Execution Mode After R16 section and Current State After R31
section instead.

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
