# Personal ChatGPT visual harmony demo

Status: local personal-development proof only. This rail does not use Render, Auth0, a vision provider API, or a commercial deployment.

## Current truth gate (2026-07-15)

The geometry and hydration foundation is merged in PR221 (`6a061dbb`), the
hydration/stale-payload protections are merged in PR222
(`0774109d130599faa374c020c49c1f6666652803`), and the deterministic shadow
pixel-refinement kernel is merged in PR223
(`6299335ab467af0687d15973cde82ba254685680`). The personal app now integrates
that kernel behind a widget toggle that is disabled by default. When enabled,
the widget sends only deterministic candidate-local grayscale crops bounded to
384 × 384 pixels (147,456 bytes) to an app-only tool. The result remains a
separate `refined` or `abstained` proposal; it is never source truth, automatic
acceptance, confirmation, or a Core run.

The pre-enhancement exact-main gate recorded in PR224 is green: its build,
focused personal visual harmony tests (39/39), full repository suite
(1608/1608), and static widget harness all passed. The opt-in integration gate
also passes its build, focused MCP/HTTP/kernel/widget checks, exact changed-file
guard, and the expanded full repository suite (1616/1616). A bounded ChatGPT
audit also created a temporary
private development app and reached the current app-management UI, but the
submitted image prompt stayed in `Analyse de l’image en cours`, produced no
request at the exact-main HTTP server, and never reached the widget,
confirmation, or Core result. Therefore full live ChatGPT hydration/write
proof is **UNVERIFIED**, not a live pass. The temporary app and tunnel were
removed after the attempt; the original `parser.dasti.ai -> 127.0.0.1:8001`
configuration and Docker health were restored. The integration is locally and
deterministically tested only. A later live smoke must repeat the same matrix
before any claim that refinement improves the live overlay.

## What the demo proves

The user gives ChatGPT an image. ChatGPT proposes normalized construction candidates from its own visual understanding: rectangles, segments, axes, and axis-aligned ellipses. Norma displays those candidates over the exact ChatGPT file and keeps every calculation stopped until a selection is submitted from the widget. Confirmed rectangles enter the existing deterministic Core mapper; confirmed non-rectangle guides remain separate and may produce deterministic ellipse/supporting-line intersection, tangency, or proximity evidence in the image plane. The widget returns the two proof families with separate canonical identities plus a transparent overlay.

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
5. Clicking **Confirmer et analyser avec Norma Core** calls the separate app-only confirmation tool.
6. Norma maps only selected rectangles into Core. In parallel it measures confirmed ellipse/line pairs against the infinite supporting line derived from the observed endpoints.
7. For every ellipse/line pair, Norma solves actual intersections. Without an intersection it computes the exact support/contact point of the ellipse in the line-normal direction, rather than checking only the four cardinal extrema. It reports pixel gap, image-width-normalized gap, tangent angle delta, and whether the relation lies on the visible segment or only on its prolongation.
8. The widget replaces the preview with Core ratio matches, separate image-plane relation cards, measured connectors, and both canonical identities.

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
| Rectangles, segments, axes, axis-aligned ellipses | Implemented | Typed candidates; separate human confirmation; rectangles alone enter the current Core mapper |
| Candidate-local pixel refinement | Implemented locally; live A/B required | Disabled by default; bounded grayscale crop; deterministic `refined` or `abstained` evidence; original/proposed separation; explicit per-candidate adoption before the separate confirmation gate |
| Ellipse/supporting-line relations | Implemented locally; live proof required | Exact intersections or ellipse support/contact point; fixed gap tolerance; visible-segment versus prolongation provenance |
| Extended obliques and format diagonals | Next | Preserve the observed finite segment; derive and label the infinite support line and corner-to-corner references separately |
| Junction angles | Next | Measure in pixel-scaled image coordinates and label as projected/image-plane values |
| Quadrilaterals and trapezoids | Implemented locally; live proof required | Four ordered vertices; sides, diagonals, intersection, convexity, projected angles, and area; never replace silently with a bounding rectangle |
| Triangles, medians, and bisectors | Next, opt-in | Derive only from accepted parent segments, vertices, triangles, or angles |
| Rotated ellipses | Next | Add explicit rotation to the primitive contract before measuring tangent relations |
| Rectified plane | Later dedicated contract | Homography or calibration with assumptions and separate provenance; no silent promotion to physical geometry |
| Repetition and rhythm | Later | First measure count, spacing, orientation, scale progression, alternation, and symmetry in a confirmed family; keep `rhythm` interpretive |
| Movement, stability, emphasis, and artist intent | Human interpretation only | Reviewable hypotheses linked to facts, never deterministic Core output |

More guides create more accidental coincidences. Ranking therefore favors
human confirmation, visible support, rare relations such as tangency, low
residual, on-segment contact, and declared uncertainty. Proximity to a harmonic
constant is never sufficient evidence by itself.

The current ellipse contract is intentionally axis-aligned. It solves the
general contact point for any line direction, including an oblique tangent, but
does not yet fit or measure a rotated ellipse.

Product references: the Core V1 wiki already names guides, diagonals,
intersections, and angle measurements; the vision plan names lines, corners,
axes, perspective, vanishing points, diagonals, and alignments. Formal-analysis
references additionally preserve direction, repetition, proportion, pattern,
movement, rhythm, pyramidal structures, and corresponding diagonals as analysis
vocabulary. These interpretive terms stay downstream from confirmed geometry.

## Verification

```sh
rtk npm run build
rtk node --test tests/personal-visual-harmony.test.mjs tests/personal-visual-harmony-mcp.test.mjs tests/personal-visual-harmony-http.test.mjs
```

The HTTP test uses the real SDK Streamable HTTP client. It covers capability-path rejection, exact ChatGPT CORS, MCP protocol negotiation, stateless request handling with shared bounded business sessions, file-reference redaction from model-visible output, a bounded app-only refinement call that abstains without authority, and the cross-request `prepare` to `confirm` transition.
