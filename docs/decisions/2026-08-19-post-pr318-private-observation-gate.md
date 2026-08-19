# Post-PR318 private observation gate

Status: `PRIVATE_ROADMAP_CLOSED_OBSERVATION`
Contract: `CC-20260819-POST-PR318-ROADMAP-TRUTH-SYNC v1`

## Decision

The bounded Personal Visual Harmony feature rail is closed through merged PR
#318 at exact `main` commit
`1e39e026f8df5d358fbfce62c6acc4bac0cbc8e0`.

There is no mandatory implementation PR after this checkpoint. The next gate
is observation-led maintenance in the installed private ChatGPT app: collect
real usage evidence, then open at most one surgical corrective PR for a
reproduced product-code defect or a demonstrated user need with a bounded
acceptance case.

Documentation or user guidance is preferred when no runtime change is needed.

## Completed rail

- PR #312 added the direct mouse A/B measurement path and visible A/B traces
  before confirmation.
- PR #314 broadened automatic harmonic discovery from rectangle-only input to
  existing rectangle, quadrilateral, and ellipse surface guides.
- PR #315 omitted malformed quadrilateral candidates while preserving valid
  candidates and fail-closed caller guidance.
- PR #316 restored editable guide review after a completed analysis.
- PR #317 enlarged desktop edit targets and preserved repeated guide resizing.
- PR #318 declared standard MCP Apps `ui.csp` and `ui.domain` metadata plus the
  `openai/widgetCSP` and `openai/widgetDomain` compatibility aliases.

PR #318 changed only the widget resource metadata and its contract tests. It
did not change Core, geometry, provider behavior, authentication, tools, or
deployment configuration. Its recorded verification passed the build, the
full suite with 2,161 passing tests and 6 skips, the remote HTTP contract, the
changed-file guard, and `git diff --check`.

## Live evidence boundary

The exact PR #318 merge commit was deployed to the existing Railway service as
deployment `bdc416c8-7ff3-4206-b456-e20ead106b77`; `/readyz` was healthy. A
fresh private ChatGPT plugin read accepted `ui.csp`, `ui.domain`,
`openai/widgetCSP`, and `openai/widgetDomain` without a warning.

These are exact-main private runtime and installation facts recorded by the
post-merge closure. A repository checkout does not independently prove the
continued health of the external service.

Widget publication metadata is not public publication. This checkpoint does
not submit or list a public ChatGPT app, add collaborator access, qualify a
commercial service, publish npm, or grant production-readiness status.

## Active authority boundary

Automatic relationships remain non-authoritative candidates. They may rank
declared ratio proximity over existing prepared surface-guide candidates, but
they do not select geometry, call a provider or SAM, confirm a review, infer
artistic intent, or run Core.

Direct A/B remains an explicit image-plane comparison. The visible A and B
traces precede confirmation. Its confirmation validates only the two declared
image-plane segment measurements; it does not confirm structured geometry, and
Core remains stopped after confirmation.

The active implementation remains in:

- `src/personal-visual-harmony.ts` for deterministic automatic relationship
  discovery and ranking;
- `src/mcp/personal-visual-harmony-app.ts` for the ChatGPT resource, review UI,
  direct A/B path, and explicit confirmation boundary;
- `src/mcp/remote-http-server.ts` for the deployed remote MCP composition.

## Open observation gates

- Artistic usefulness and sustained private use remain unproven.
- Review duration and bounded correction counts are available through
  `norma.personal-visual-harmony-review-journal@1`; the existing twelve-case
  corpus proves instrumentation and gross regressions, not product quality.
- Server handler duration is recorded when available. End-to-end host latency
  before the prepare call remains outside widget observability and requires an
  external harness before any p50 or p95 claim.
- A real mobile ChatGPT viewport remains unverified, but is not an active
  stability blocker.

## Deferred and out of scope

- public ChatGPT app submission or listing;
- collaborator access changes;
- commercial or production qualification;
- public npm publication or license decisions;
- default SAM expansion, automatic provider selection, or automatic
  confirmation;
- new geometry families, triangle centers, harmonic-report families,
  perspective or rectification, rhythm, scoring, optimization, beauty, or
  artistic-intent inference.

Reopening any of those areas requires a separate destination, explicit
authorization, and a bounded contract.

## Verification for this truth sync

Post-edit verification:

- documentation contract tests;
- `git diff --check`.

Earlier full-suite evidence, collected before the final wording correction:

- `npm run build`;
- full `npm test`.

This decision changes documentation and tests only. It does not modify or
deploy runtime code.
