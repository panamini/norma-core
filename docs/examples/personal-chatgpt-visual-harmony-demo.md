# Personal ChatGPT visual harmony demo

Status: local deterministic proof plus a private exact-main ChatGPT A/B. This rail does not use Render, Auth0, a vision provider API, or a commercial deployment.

## Current truth gate (2026-07-17)

The geometry and hydration foundation is merged in PR221 (`6a061dbb`), the
hydration/stale-payload protections are merged in PR222
(`0774109d130599faa374c020c49c1f6666652803`), and the deterministic shadow
pixel-refinement kernel is merged in PR223
(`6299335ab467af0687d15973cde82ba254685680`). The personal app now integrates
that kernel through PR225 (`02c344246f51207fe15dcc96f4b6e0d09c017b30`)
behind a widget toggle that is disabled by default. When enabled,
the widget sends only deterministic candidate-local grayscale crops bounded to
384 × 384 pixels (147,456 bytes) to an app-only tool. The result remains a
separate `refined` or `abstained` proposal; it is never source truth, automatic
acceptance, confirmation, or a Core run.

PR230 (`7eb6179972ea1f472c04256f6dcc90ee1ba6dcea`) adds the bounded
rotated-ellipse search to that shadow kernel. The current integration extends
the same opt-in proposal lane to explicitly oriented ellipses: it maps the
canonical ellipse through the candidate crop's exact affine scale, reports
bounded center/axis/orientation evidence, and renders original and proposed
orientations separately. Near-circular or ambiguous orientation evidence keeps
the prior orientation or abstains.

A controlled exact-main local A/B at
`9d49d15286d9be854243dc7cb4ca350d10073695` now validates that integration on
the same annotated luminance rasters and starting candidates. With refinement
disabled and before confirmation, no proposal or Core call is produced. With
refinement enabled, the strong full-perimeter case reduces mean annotated
perimeter error from
`1.657733384665 px` to `0 px` and raises edge support from `0.486165660084` to
`0.831046138518`; the nearby tangent/crossing-line case reduces the same error
from `1.657733384665 px` to `0 px` and raises edge support from `0.470385665047`
to `0.783118773663`. The weak-contour case deterministically abstains with
`weak_edge_support`, and the competing-orientation case abstains with
`ambiguous_edge_support`. Repeated runs are byte-identical and input-immutable.
The desktop/mobile widget smoke also proves original/proposal separation,
explicit adoption, a separate confirmation action, zero Core calls before
confirmation, no horizontal overflow, and no console/runtime error. This is
`LOCAL_UI_AB_PASS`, not live ChatGPT evidence.

The write-enabled private-app gate is now **LIVE_CHATGPT_AB_PASS** on exact main
`4e6d8fab72063a44b4d6a2aa721c2db867ab7e0e`. PR233 fixed the only repository
defect exposed by the first run: widget images now request anonymous CORS before
assigning the ChatGPT download URL, so a hydrated image can also be read into a
bounded luminance crop. The same synthetic source and starting geometry were
then exercised with refinement off and on. Refinement remained off by default,
the proposal stayed separate, adoption required its dedicated click,
confirmation remained separate, and Core ran zero times before confirmation.
For the tangent-line case, explicit ellipse adoption reduced the deterministic
gap from `1.941 px` (`proximity`) to `0.23 px` (`near tangent`) without adopting
the optional line proposal. The competing-orientation case abstained with
`ambiguous_edge_support` and offered no adoption action. Completed-state reload
preserved the proposal, adoption state, result, and deterministic identities.
The temporary private app, quick tunnel, capability, and synthetic artifacts
were removed after the run. There were zero paid provider/API calls. This live
run did not prove a true mobile ChatGPT viewport; mobile layout remains covered
by the separate local UI smoke.

The derived-construction rail is extended by PR226
(`f333c9a3ee6e7034b59b03401362a2aec6ffe5ad`) for observed support-line
extensions and format diagonals, then PR227
(`25810e39a01a65f9f2453f000d459633376c3419`) for junction angles. The current
implementation adds a fourth, separately controlled triangle layer. It accepts
only a bounded explicit request containing exactly three parented image-plane
vertices; it does not enumerate triangles from available lines. Each parent is
either a confirmed observed-line endpoint or an already-admitted deterministic
junction. Canonical winding, starting vertex, identity, area, side lengths, and
interior angles are deterministic. Invalid, stale, ambiguous, out-of-frame, or
degenerate requests fail closed. The resulting triangle remains a derived,
non-source-truth, non-Core construction and is off by default.

The triangle-derived rail is current through PR240, merged at
`1ecf1e4bc46c2292a688e5f0d06b7692e9a710fb`. PR234 adds exactly three medians,
PR235 exactly three perpendicular bisectors, PR238 exactly three internal angle
bisectors, and PR239 exactly three altitudes for one already-admitted canonical
triangle. PR240 adds the preparation diagnostic and `triangleRequestCount`
without changing the construction geometry. Each family is independently
controlled, off by default, retains stable triangle and side or vertex
provenance, and revalidates its parents fail-closed. These layers expose no
centroid, circumcenter, incenter, orthocenter, ratio, harmonic claim, or Core
authority. Selecting a layer cannot adopt geometry, confirm the selection, or
run Core.

The pre-enhancement exact-main gate recorded in PR224 is green, as are the
subsequent construction, rotated-ellipse, shadow-refinement, local A/B, and live
A/B gates. Historical failed live attempts remain evidence about their old
boundaries only; they do not override the current exact-main live result above.

## What the demo proves

The user gives ChatGPT an image. ChatGPT proposes normalized construction candidates from its own visual understanding: rectangles, quadrilaterals, segments, axes, and ellipses with optional explicit image-plane orientation. Norma displays those candidates over the exact ChatGPT file and keeps every calculation stopped until a selection is submitted from the widget. Confirmed rectangles enter the existing deterministic Core mapper; confirmed non-rectangle guides remain separate and may produce deterministic ellipse/supporting-line intersection, tangency, or proximity evidence in the image plane. Optional construction layers can show a confirmed segment together with its separately labelled, frame-clipped support-line extension, the two format diagonals, projected junction-angle markers, explicitly requested triangles derived from three stable parents, and exactly three opt-in medians, perpendicular bisectors, internal angle bisectors, or altitudes for one admitted triangle. Those extensions, diagonals, angle measurements, triangles, and triangle-derived families are derived constructions or measurements, not observed or Core-authoritative geometry. The widget returns the proof families with separate canonical identities plus a transparent overlay.

The server records the confirmation honestly as `client_asserted_widget_interaction`; it does not claim server-verified human presence. Candidates remain non-authoritative evidence until that selection. The preparation server never downloads the attached image. The optional app-only refinement tool receives only a bounded candidate-local luminance crop, returns evidence without adoption authority, and never invokes Core. Core receives structured geometry only. An image-plane guide relation is not a harmonic ratio, a physical-world measurement, or evidence of artistic intent.

## Local start

Build from the repository root:

```sh
rtk npm run build
```

Create a fresh 256-bit URL capability in the same terminal without printing it:

```sh
export NORMA_PERSONAL_DEMO_ACCESS_TOKEN="$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')"
```

Start the loopback-only server:

```sh
rtk node bin/norma-core-personal-visual-harmony-mcp-http.mjs --enable-personal-visual-harmony-demo
```

Expose `http://127.0.0.1:8788` only through the already-approved temporary HTTPS tunnel. Do not create Render/Auth0 resources for this demo. The connector URL is:

```text
https://<temporary-tunnel-host>/personal/<NORMA_PERSONAL_DEMO_ACCESS_TOKEN>/mcp
```

The server never prints the capability. One safe way to copy the final URL locally is to set `NORMA_PERSONAL_DEMO_PUBLIC_URL` to the observed HTTPS tunnel origin, then pipe the assembled value straight to the clipboard:

```sh
printf '%s/personal/%s/mcp' "$NORMA_PERSONAL_DEMO_PUBLIC_URL" "$NORMA_PERSONAL_DEMO_ACCESS_TOKEN" | pbcopy
```

Stop the tunnel and server after the personal session. Rotate the capability for every new run.

## ChatGPT trial

Attach an image, or start with `examples/personal-visual-harmony/golden-split-poster.png`, then ask:

> Analyse cette image avec Norma. Propose d’abord les structures visuelles réellement construites : cadre et rectangles, segments/axes/diagonales, et contours elliptiques visibles. Évite les boîtes de personnes fondées seulement sur l’importance du sujet. Affiche les candidats dans le widget et attends ma confirmation avant toute mesure.

Expected sequence:

1. ChatGPT calls `norma.preparePersonalVisualHarmonyV1` with the attached file and its typed construction candidates.
2. The widget retrieves the exact file through the ChatGPT file API, aligns the candidate overlay to its natural aspect ratio, and lets the user include or exclude Core rectangles and image-plane guides independently. Family filters only control visibility.
3. Pixel proposals are off by default. If the user enables them, the widget extracts each bounded local luminance crop and calls `norma.refinePersonalVisualHarmonyPixelsV1`. It displays original and proposed geometry separately, including abstention or confidence, evidence gain, displacement, reason, and deterministic identity.
4. A refined proposal changes nothing until the user clicks **Adopter cette proposition** for that candidate. Selecting a family, selecting a candidate, or confirming without that adoption click cannot silently adopt it.
5. **Prolongements**, **Diagonales format**, **Angles jonction**, **Triangles**, **Médianes**, **Médiatrices**, **Bissectrices**, and **Hauteurs** are separate construction toggles and are off by default. A prolongation never changes the visible, observed segment: it renders the segment's derived infinite support line clipped to the confirmed image frame. The two format diagonals are deterministic corner-to-corner frame constructions. Junction angles require the prolongation layer, report whether each crossing falls within the original observed extent, and remain hidden when their prerequisite is disabled.
6. The preparation result exposes `triangleRequestCount`. When it is `0`, triangle-derived controls remain unavailable. When an explicit valid request is present, the conditional pre-confirmation order is: keep its parent guides selected; enable **Prolongements**; if any vertex uses a format-diagonal parent, enable **Diagonales format**; if any vertex is a junction intersection, enable **Angles jonction**; enable **Triangles**; then enable the requested triangle family. The preparation diagnostic emits exactly those conditional prerequisites in that order. These controls select derived layers only; they never enable another family automatically, change a candidate, adopt a pixel proposal, confirm geometry, measure a construction, or run Core. Editing or refining a parent invalidates the request instead of silently retargeting it.
7. Each enabled triangle family requires the enabled explicit triangle and derives exactly three constructions: vertex-to-opposite-midpoint medians, perpendicular bisectors of opposite-side support lines, internal angle bisectors, or vertex-to-opposite-support-line altitudes. Disabling or invalidating the triangle removes all dependent layers. No centroid, circumcenter, incenter, or orthocenter is exposed.
8. Clicking **Confirmer et analyser avec Norma Core** calls the separate app-only confirmation tool. Only the construction layers that were explicitly enabled at that moment enter the optional image-plane construction analysis; toggling them alone never runs Core.
9. Norma maps only selected rectangles into Core. In parallel it measures confirmed ellipse/line pairs against the infinite supporting line derived from the observed endpoints. An optional `rotationDegrees` is normalized modulo 180; equivalent axis swaps canonicalize to one stable representation, while legacy axis-aligned payloads keep their established shape and identity.
10. For every ellipse/line pair, Norma solves actual intersections with the explicit normalized-image-plane orientation. Without an intersection it computes the exact support/contact point of the ellipse in the line-normal direction, rather than checking only the four cardinal extrema. It reports pixel gap, image-width-normalized gap, tangent angle delta, and whether the relation lies on the visible segment or only on its prolongation.
11. After confirmation, the construction analysis reports deterministic image-plane directions, frame-edge contacts, support-line/format-diagonal intersections, normalized positions, smaller/supplementary projected angles at bounded line junctions, metrics for explicitly parented triangles, and exactly three constructions for each enabled triangle family. Every construction remains `sourceTruth=false` with no Core authority. It never infers a triangle center, artistic intent, physical geometry, a vanishing point, or harmonic meaning.
12. The widget replaces the preview with Core ratio matches and separate relation/construction cards, measured connectors, and canonical identities.

An honest empty result is valid: it means the confirmed geometry was not within the declared tolerance of any ratio in the active packs.

## Composition grammar and roadmap

Norma uses this authority chain:

```text
visual observation candidate
-> human-confirmed image-plane geometry
-> deterministic derived construction or measurement
-> optional interpretation stated as a hypothesis
```

Image-plane and rectified-plane measurements must remain separate. A photograph
can be measured in its final image plane. Claims about the physical geometry of
architecture, design objects, or archaeological remains require explicit
rectification or calibration.

| Capability | Horizon | Deterministic treatment |
| --- | --- | --- |
| Rectangles, segments, axes, and explicitly oriented ellipses | Implemented; private live proof recorded | Typed candidates; optional normalized-image-plane `rotationDegrees`; deterministic axis/angle canonicalization and SVG rendering; separate human confirmation; rectangles alone enter the current Core mapper |
| Candidate-local pixel refinement | Implemented; private live A/B passed | Disabled by default; bounded grayscale crop; deterministic `refined` or `abstained` evidence for segments, axes, quadrilaterals, and axis-aligned or explicitly oriented ellipses; original/proposed separation; explicit per-candidate adoption before the separate confirmation gate |
| Ellipse/supporting-line relations | Implemented; private live A/B passed | Exact axis-aligned or rotated-ellipse intersections/support points; fixed tangent and gap tolerances; stable intersection ordering; visible-segment versus prolongation provenance |
| Extended obliques and format diagonals | Implemented locally; live proof required | Disabled by default; preserve the observed, user-confirmed finite segment; derive its separately labelled support line clipped to the confirmed image frame and the two corner-to-corner format diagonals; deterministic image-plane intersections only; no Core authority |
| Junction angles | Implemented locally; live proof required | Disabled by default and dependent on support-line extensions; deterministic crossings among confirmed support lines, enabled format diagonals, and confirmed frame edges; pixel-scaled smaller/supplementary angles; observed-extent flags and derived-measurement provenance; no Core authority |
| Quadrilaterals and trapezoids | Implemented locally; live proof required | Four ordered vertices; sides, diagonals, intersection, convexity, projected angles, and area; never replace silently with a bounding rectangle |
| Explicit triangle constructions | Implemented locally; live proof required | Disabled by default; one bounded explicit request per triangle; exactly three stable observed-endpoint or admitted-junction parents; deterministic canonical winding, identity, area, sides, and interior angles; fail closed; no Core authority |
| Triangle medians | Implemented and merged in PR234 | Exactly three canonical vertex-to-opposite-midpoint segments for one admitted triangle; stable parent provenance and identity; off by default; no surfaced centroid or Core authority |
| Triangle perpendicular bisectors | Implemented and merged in PR235 | Exactly three perpendicular support-line constructions with separately clipped render segments; stable side provenance; off by default; no circumcenter or Core authority |
| Triangle internal angle bisectors | Implemented and merged in PR238 | Exactly three canonical internal vertex-angle bisectors with stable side/vertex provenance; off by default; no incenter or Core authority |
| Triangle altitudes | Implemented and merged in PR239; private live gate passed | Exactly three vertex-to-opposite-support-line perpendiculars; exterior feet remain valid; mathematical line/foot stays separate from the clipped overlay; no orthocenter or Core authority |
| Triangle centers | Deferred | Require separate bounded contracts and evidence; no automatic enumeration, harmonic classification, or inference from line intersections |
| Rotated-ellipse pixel refinement | Implemented; private live A/B passed | Hard-bounded center, semi-axis, and ±4° orientation search; exact affine crop mapping; stable canonical identity; near-circle preservation and weak/competing-orientation abstention; no automatic adoption, confirmation, or Core authority |
| Rectified plane | Later dedicated contract | Homography or calibration with assumptions and separate provenance; no silent promotion to physical geometry |
| Repetition and rhythm | Later | First measure count, spacing, orientation, scale progression, alternation, and symmetry in a confirmed family; keep `rhythm` interpretive |
| Movement, stability, emphasis, and artist intent | Human interpretation only | Reviewable hypotheses linked to facts, never deterministic Core output |

More guides create more accidental coincidences. Ranking therefore favors
human confirmation, visible support, rare relations such as tangency, low
residual, on-segment contact, and declared uncertainty. Proximity to a harmonic
constant is never sufficient evidence by itself.

The ellipse contract accepts an optional explicit orientation in the normalized
image plane and deterministically measures rotated contacts. It does not infer
rotation from pixels, fit perspective conics, or promote ellipse evidence into
Core authority. Its optional local pixel-refinement lane adjusts orientation
only inside the declared bounded search around an already proposed canonical
ellipse; it is not a global detector or a perspective-conic fitter.

Product references: the Core V1 wiki already names guides, diagonals,
intersections, and angle measurements; the vision plan names lines, corners,
axes, perspective, vanishing points, diagonals, and alignments. Formal-analysis
references additionally preserve direction, repetition, proportion, pattern,
movement, rhythm, pyramidal structures, and corresponding diagonals as analysis
vocabulary. These interpretive terms stay downstream from confirmed geometry.

## Verification

```sh
rtk npm run build
rtk node --test tests/personal-visual-harmony-constructions.test.mjs tests/personal-visual-harmony.test.mjs tests/personal-visual-harmony-mcp.test.mjs tests/personal-visual-harmony-http.test.mjs
```

The HTTP test uses the real SDK Streamable HTTP client. It covers capability-path rejection, exact ChatGPT CORS, MCP protocol negotiation, stateless request handling with shared bounded business sessions, file-reference redaction from model-visible output, a bounded app-only refinement call that abstains without authority, explicit triangle-request recovery, and the cross-request `prepare` to `confirm` transition.
