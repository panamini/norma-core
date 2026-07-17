# Norma — measured modernism

## Position

Norma is a visual reasoning instrument for architects, photographers, designers,
and creative directors who want to inspect a composition before judging it.
Its interface should feel precise, calm, and culturally literate without
pretending that geometry proves beauty.

The product's single job is:

> Make observed geometry easy to verify, then make deterministic measurements
> easy to understand.

## Direction

The identity is **measured modernism**: Swiss-grid discipline interpreted
through the actual instruments of Norma — frames, axes, intersections,
registration marks, ratios, and proof states.

The initial black-and-white direction risked becoming a generic broadsheet
layout. The revision removes editorial decoration and makes the grid
operational: the calibration rail marks the image workspace, the three numbered
steps describe the real confirmation sequence, and technical colors appear only
inside the image plane.

### Palette

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#0A0A0A` | Primary text, selected controls, outer frame |
| Paper | `#F2F2F2` | Main instrument surface |
| Paper hover | `#E5E5E5` | Neutral hover surface, never a data accent |
| White | `#FFFFFF` | Image/control wells |
| Graphite | `#5A5A5A` | Supporting copy |
| Disabled | `#6F6F6F` | Disabled controls with readable contrast |
| Rule | `#C8C8C8` | Dividers and inactive boundaries |
| Verified | `#187257` | Completed proof state only |

The brand itself is monochrome. Technical overlay colors are not brand accents:

- Core geometry: `#FFE600` — highest-luminance proof layer.
- Observed guides: `#00D7FF` — separable from the Core layer.
- Derived constructions: `#FF4FCB` — visibly non-source geometry.
- Pixel proposal: `#FF6A3D` — a candidate change that still needs adoption.

These colors exist to survive varied image content and encode authority. They
must not leak into cards, headings, or decorative backgrounds.

### Type

- Display and wordmark: `Archivo`, used with a wider variable width axis
  (`85–90`) and a measured `700–800` weight so it keeps a signature without
  becoming poster-like.
- Interface text: `Geist`, with `"Helvetica Neue"`, Helvetica, Arial, sans-serif
  fallbacks. Geist remains the primary working face because its neutral rhythm
  is clearer during long measurement sessions.
- Evidence and identities: `ui-monospace`, `SFMono-Regular`, Menlo, Consolas,
  monospace.

Use condensed uppercase sparingly for product identity and section labels.
Use sentence case and plain verbs for controls. Numerical proof may be large;
marketing claims may not.
Keep technical labels and supporting metadata at a 10px minimum. Density comes
from spacing and grouping, not from forcing micro-copy below a readable size.

### Layout

Desktop:

```text
┌ calibration rail ──────────────────────────────────────────────────┐
│ NORMA.SCIENCE                                        À CONFIRMER   │
├──────────────────────────────────────┬─────────────────────────────┤
│                                      │ 01 OBSERVER  02 VÉRIFIER   │
│                                      │ 03 MESURER                  │
│          IMAGE + OVERLAYS            ├─────────────────────────────┤
│                                      │ familles                    │
│                                      │ constructions               │
│                                      │ candidats                   │
│                                      │ [ Confirmer et analyser ]   │
└──────────────────────────────────────┴─────────────────────────────┘
```

Mobile:

```text
┌ calibration rail ────────────┐
│ NORMA              ÉTAT      │
├──────────────────────────────┤
│       IMAGE + OVERLAYS       │
├──────────────────────────────┤
│ 01 OBSERVER → 02 VÉRIFIER    │
│                    → 03 ...  │
│ controls                     │
│ [ action ]                   │
└──────────────────────────────┘
```

The image stays the hero. The controls read as an instrument panel, not a stack
of promotional cards.

## Signature

The signature is the **calibration frame**:

- a measured tick rail along the top edge;
- a hand-drawn square/circle mark with a measured, monochrome stroke language;
- strict one-pixel rules that organize real workflow groups;
- authority colors used only on the image plane.

The mark can stand alone at small size, but the `NORMA` wordmark should be used
whenever space allows. The chosen mark is built from a hand-drawn square/circle
gesture, giving the otherwise strict instrument a memorable human trace. Do not
pair the mark with a φ symbol: Norma supports declared ratio systems and must not
be reduced to the golden ratio.

### Logo asset

- `brand/logos/norma-mark-gesture.svg` is the source artwork: a looser
  hand-drawn square/circle study with transparent exterior and interior fields.
- The preview applies a deterministic black treatment to that source so it
  renders in black without duplicating or rewriting the artwork.
  It is now the default because its irregular stroke language gives Norma a
  more memorable signature while remaining monochrome.

## Components

- Radius is `2px` for the shell and `0–3px` for controls; pills are reserved for
  truly compact binary filters.
- Selected controls use solid Ink, not a colored glow.
- Hover states invert the control surface; they do not add shadows or underline
  ornaments.
- Secondary pixel refinement controls use a continuous rule. Dashed geometry is
  reserved for constructions on the image plane.
- Candidate checkboxes use a square, custom geometric indicator so native form
  chrome does not compete with the instrument language.
- Primary action uses solid Ink with a clear inverse hover state.
- Proof completion uses Verified green; no green is shown before completion.
- Empty and error states explain the next action.
- Motion is limited to state transitions under `160ms`; reduced-motion removes
  them.
- Every interactive element has a visible `:focus-visible` outline.

## Voice

Norma speaks like a careful expert:

- “Confirmer et analyser”, not “Lancer la magie”.
- “Construction dérivée”, not “Structure découverte”.
- “Aucun rapport déclaré détecté”, not “Votre image manque d’harmonie”.
- “Réessayer le chargement”, not “Oups”.

The interface names what was observed, what the user confirmed, and what the
Core measured. It never turns proximity into aesthetic authority.

## Adjacent-product review

- [PhiMatrix](https://www.phimatrix.com/) validates the usefulness of compact
  overlays and configurable grids, but its interface makes hierarchy and
  authority difficult to read.
- [Capture One](https://support.captureone.com/hc/en-us/articles/360002468797-User-interface-overview)
  keeps the image viewer primary and groups tools around it; Norma adopts that
  viewer-first priority without copying its dark editing-suite aesthetic.
- [Rhino](https://www.rhino3d.com/en/for/architecture/) treats geometry and
  analysis as working material; Norma borrows the seriousness of an instrument,
  not CAD chrome or feature density.

## Application boundary

This identity may change presentation HTML, CSS, copy hierarchy, and brand
assets. It must not change:

- candidate, confirmation, or Core authority contracts;
- geometry, measurements, ratio packs, or deterministic outputs;
- image hydration, MCP transport, identity, or replay behavior;
- which controls are enabled or what an action executes.
