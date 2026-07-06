# Post-PR104 Visual Fixture Roadmap Truth Sync

## Status

Accepted as a docs/tests-only roadmap truth sync for PR105.

This decision records the current merged visual fixture rail after PR102, PR103,
and PR104. It does not implement or approve runtime adapter behavior.

## Current Merged Truth

PR102 approved the local-only visual adapter fixture contract.

PR103 added the static synthetic visual fixture handoff proof.

PR104 added the local visual fixture guided inspection demo.

The rail remains local-only, synthetic, static, and fixture/demo proof only.

## Truth Boundary

Visual observations are candidate evidence only.

The only accepted bridge into existing Norma Core / Structured Analyze in this
rail is explicit accepted structured geometry.

Where applicable, `result.json` remains canonical Norma truth.

`guide.html`, `visual.svg`, `summary.json`, `summary.md`, report artifacts,
overlays, observations, and prompts are derived or evidence-only artifacts.
They may be referenced only as derived inspection evidence. They must not
become source truth, Core input authority, package API truth, future connector
schema, recommendation input, correction authority, optimization authority,
scoring authority, beauty-judgment authority, automatic family-selection
authority, or prompt-derived source truth.

## Still Blocked

The following remain not approved:

- real image recognition;
- provider/OpenAI calls;
- CAD/Figma import;
- hosted MCP;
- ChatGPT connector runtime;
- package publication;
- new visual-fixture or additional package-root public exports;
- real image upload or parsing;
- runtime adapter implementation;
- recommendation;
- correction;
- optimization;
- scoring;
- beauty judgment;
- automatic family selection;
- prompt-derived source truth.

## Next Sequence

The next sequence is only:

1. PR106: local consumer proof for PR104 visual fixture demo envelope/result.
2. PR107: static synthetic scenario corpus, 2-3 fixtures, still no recognition.
3. PR108: decision PR for first real external track.

This decision intentionally does not over-specify PR106, PR107, or PR108.

## Scope

PR105 is docs/tests-only.

Allowed changes are limited to the roadmap truth-sync section, this decision
document, focused tests, and exact changed-file guard maintenance.

PR105 does not mutate fixtures, bins, examples, viewer files, runtime source,
package metadata, lockfiles, CI, or the Norma Core wiki.

## Validation Gates

PR105 is acceptable only when:

- roadmap and decision docs record PR102, PR103, and PR104;
- tests lock visual observations as candidate evidence only;
- tests lock explicit accepted structured geometry as the only accepted bridge
  into existing Norma Core / Structured Analyze in this rail;
- tests lock `result.json` as canonical truth where applicable;
- tests lock derived/evidence-only status for `guide.html`, `visual.svg`,
  `summary.json`, `summary.md`, report artifacts, overlays, observations, and
  prompts;
- tests keep blocked runtime, provider, package publication, new
  visual-fixture or additional package-root public export, MCP, ChatGPT,
  CAD/Figma, recommendation, correction, optimization, scoring, beauty
  judgment, automatic family selection, and prompt-derived source-truth
  surfaces blocked;
- exact changed-file guard maintenance accepts only the PR105 file set.

## Rollback

Rollback is reverting only this decision document, the roadmap section, the
focused PR105 tests, and exact changed-file guard maintenance.

No runtime, provider, fixture, package, deployment, hosted, wiki, or persisted
data rollback should be needed because PR105 approves none of those changes.
