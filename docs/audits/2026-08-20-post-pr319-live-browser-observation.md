# Post-PR319 Live Browser Observation

Date: 2026-08-20

Repository base: `56d70d574d1dc1344258388b1c7cc761b7451aaa` (merged PR #319)

Surface: private Norma Core app in an authenticated Chrome/ChatGPT session

## Outcome

The bounded interaction path passed. The earlier guide-edit freeze was not
reproduced. One different non-blocking stale-preview presentation defect was
reproduced and is routed to a separate corrective changeset.

## Evidence observed

- A synthetic image with no user data prepared seven candidates: one rectangle,
  one quadrilateral, two ellipses, and three triangle-side segments.
- The quadrilateral remained movable without freezing the remaining guides.
- The rectangle exposed south-east and north-west resize handles; the
  south-east handle resized it.
- Both ellipses remained movable and resizable. An ellipse could be edited,
  deselected, selected again, and edited again.
- Multiple sequential edits remained available before Core and after a
  completed Core result.
- Editing after Core returned the widget to review state and invalidated the
  old result before another explicit confirmation.
- Three Core completions were observed. The reviewed result contained six
  confirmed guides outside the Core rectangle, four ellipse-line relations,
  one quadrilateral measurement, and one detected `1/3` relationship on
  `Rectangle orange supérieur gauche` at 33.519%, 0.186 percentage points from
  the declared target.
- The second and third completions at unchanged reviewed geometry produced the
  same `result.json` SHA-256 identity:
  `65786931c6fc211d1054e94c110cf743bf5eb30ac8bc70d3f68800425834bf95`.
- The third completion took 6,027 ms from the confirmation click until the
  verified result identity was visible.

## Reproduced corrective case

After the third successful calculation, the widget simultaneously displayed
`CORE + PLAN IMAGE VÉRIFIÉS` and `RELATIONS CANDIDATES À REVOIR`, including the
instruction to relaunch analysis. The relaunch control was no longer present
because the new Core result had completed. This is a concrete presentation
mismatch: the stale automatic preview should not compete with a visible
verified result. The smallest safe correction is to hide that preview while a
completed result is displayed and restore its stale review state when editing
reopens.

## Boundaries

- The browser surface did not expose a cryptographic deployment provenance, so
  this does not prove that the served artifact is byte-identical to the
  repository base.
- No console or network-cleanliness claim was collected.
- One 6,027 ms sample is not p50/p95 or sustained-load evidence.
- The synthetic image does not prove artistic usefulness or real-user-data
  suitability.
- No real mobile viewport, collaborator distribution, public app submission,
  commercial qualification, or public npm publication was tested or approved.
