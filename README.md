# Norma Core

Norma Core is a deterministic proportional-geometry engine. It applies explicit, versioned systems to accepted structured geometry and returns traceable structured results.

The repository also contains bounded visual-review surfaces that can propose geometry before Core runs. Those proposals are evidence candidates, never source truth.

## Current architecture

The active Personal Visual Harmony flow separates four responsibilities:

- a host vision model may propose composition and visible construction geometry;
- SAM 3 may propose one explicitly requested semantic object or region;
- deterministic local pixel/CV refinement may propose tighter lines, axes, quadrilaterals, or ellipses;
- Norma Core measures only after explicit human review and confirmation.

The current Core mapping remains rectangle-based. Confirmed quadrilaterals, segments, axes, ellipses, derived constructions, and declared two-length reports remain separate image-plane evidence and do not silently become Core rectangles.

The ChatGPT widget supports:

- normalized candidate geometry with editable handles;
- optional manual segments and deterministic constructions;
- explicit semantic SAM targeting;
- an `Original / Guides` comparison;
- an initial four-candidate focus with an explicit show-all control;
- bounded, analysis-scoped review metrics containing event codes, timestamps, and counts only;
- explicit confirmation before any Core execution.

No model output or visual calculation is automatically accepted. Norma does not infer beauty or intent.

## Runtime boundaries

This package remains private. There is no authoritative root license file, so
public package publication remains blocked. The repository contains CLI, local
MCP, remote HTTP/MCP, ChatGPT widget, perception-job, and sandbox deployment
code, but a checkout does not prove that any hosted environment is deployed or
production-qualified.

The private Web Lab is the second local client of the existing Personal Visual
Harmony preparation and confirmation functions. It reuses that narrow
application boundary directly; it does not introduce a universal schema or
public SDK.

The following remain outside the current proof:

- a public SDK or npm package;
- a general-purpose vision platform;
- mobile, OEM, Figma, Illustrator, AutoCAD, or mapping adapters;
- automatic provider selection or multi-provider orchestration;
- automatic confirmation;
- production deployment or commercial qualification.

## Review measurement

The widget journal contract is `norma.personal-visual-harmony-review-journal@1`. It is bounded to 64 events and stores no image content, prompt, label, provider response, secret, token, claim, email, or user-history vocabulary.

It measures review time from the first interactive draft visible in the widget. Server prepare duration is recorded separately when available. End-to-end host latency before the prepare tool call is not observable from the widget and requires an external test harness.

The initial 12-case smoke corpus validates instrumentation and gross regressions. It is not a product-quality benchmark.

## Private Web Lab

Launch the loopback-only lab:

```bash
node web-lab/start-private-web-lab.mjs --enable-private-web-lab
```

Open `http://127.0.0.1:4177`. The browser loads the image locally, computes its
SHA-256 identity, and lets the user draw bounded rectangles and segments before
any review session exists. Preparing the review sends only that identity, media
type, dimensions, selected goal, and the exact canonical manual candidate list
to the local server. No image bytes, model, provider, CV, or automatic detection
is involved. The earlier deterministic fixture contract remains available only
for explicit demonstrations and contract tests; it is not the normal Web Lab
path. Norma Core remains stopped until the linked selection is explicitly
confirmed, then the lab returns one deterministic receipt and an exportable
canonical JSON result. “Nouvelle mesure” invalidates the completed server
session while retaining the local image and goal. Avant confirmation,
“Modifier l’objectif / Recommencer” invalide la revue liée, conserve l’image et
les tracés manuels, puis rend l’objectif modifiable sans rechargement.

`NORMA_PRIVATE_WEB_LAB_PORT` may replace the default port. Sessions are
in-memory, bounded, replaceable, and non-authoritative; no database or browser
history is used. The launcher is idempotent on that loopback port: if the same
Web Lab is already running, repeating the launch command reports its URL and
exits successfully. It refuses to treat an unrelated service on the port as
Norma.

## Verification

Use the repository scripts:

```bash
npm run build
npm test
npm run check
git diff --check
```

## Related documentation

- `docs/decisions/2026-07-28-auditable-visual-measurement-rapid-proof.md`
- `docs/MCP_TOOL_CONTRACT.md`
- `docs/CLI.md`
- `docs/examples/`
