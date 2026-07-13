# Personal ChatGPT visual harmony demo

Status: local personal-development proof only. This rail does not use Render, Auth0, a vision provider API, or a commercial deployment.

## What the demo proves

The user gives ChatGPT an image. ChatGPT proposes normalized rectangular candidates from its own visual understanding. Norma displays those candidates over the exact ChatGPT file, keeps Core stopped until a selection is submitted from the widget, maps the selected structured geometry into Core, and returns deterministic ratio matches plus a transparent overlay.

The server records the confirmation honestly as `client_asserted_widget_interaction`; it does not claim server-verified human presence. Candidates remain non-authoritative evidence until that selection. Norma never downloads or inspects the image bytes, and Core receives structured geometry only.

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

> Analyse cette image avec Norma. Observe-la toi-même et propose 2 à 6 rectangles significatifs en coordonnées normalisées. Montre-moi les candidats avant toute analyse Core. Pour l’affiche de démo, privilégie les deux grands panneaux verticaux. Je confirmerai ou retirerai les régions dans le widget. Ensuite seulement, explique les rapports proches de φ, des moitiés ou des tiers, sans jugement esthétique ni intention inférée.

Expected sequence:

1. ChatGPT calls `norma.preparePersonalVisualHarmonyV1` with the attached file and its candidate rectangles.
2. The widget retrieves the exact file through the ChatGPT file API, aligns the candidate overlay to its natural aspect ratio, and lets the user include or exclude candidates.
3. Clicking **Confirmer et analyser avec Norma Core** calls the app-only confirmation tool.
4. Norma maps only the selected candidates, runs deterministic Core ratio analysis, and replaces the preview with the matched ratio labels, measured percentages, guides, and canonical result identity.

An honest empty result is valid: it means the confirmed geometry was not within the declared tolerance of any ratio in the active packs.

## Verification

```sh
rtk npm run build
rtk node --test tests/personal-visual-harmony.test.mjs tests/personal-visual-harmony-mcp.test.mjs tests/personal-visual-harmony-http.test.mjs
```

The HTTP test uses the real SDK Streamable HTTP client. It covers capability-path rejection, exact ChatGPT CORS, MCP protocol negotiation, stateless request handling with shared bounded business sessions, file-reference redaction from model-visible output, and the cross-request `prepare` to `confirm` transition.
