# Norma Core Business Readiness Roadmap

## Status

This is a planning document.

It does not implement product features.

It does not authorize scope by itself. Each phase below requires its own small PR with a narrow scope, explicit non-goals, acceptance criteria, and validation notes.

The core remains deterministic and source-truth driven. Norma truth must stay in explicit structured source objects, pack locks, operation contexts, diagnostics, provenance, and deterministic result envelopes. External surfaces may call the core; they must not define Norma logic.

## Current State After PR25

The repository currently has the V1.5 trust-layer foundation needed for local package consumption:

- deterministic serialization helpers and canonical ordering;
- deterministic fixtures and golden snapshots;
- `verifyArtifactFreshness`;
- `verifyRun`;
- MVP-only `replayRun`;
- package-root consumption documentation;
- package-root consumption tests;
- private local package-root import through `@norma/core` after build.

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

## Immediate PR Sequence

The next concrete sequence after PR26 should be:

1. PR27 thin local CLI.
2. PR28 CLI examples + smoke docs + JSON output contract.
3. PR29 V1.5 release checkpoint / tag readiness.
4. PR30 package/public npm readiness audit.
5. PR33 MCP contract docs only.

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
