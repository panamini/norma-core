# Local Visual Fixture Guided Inspection Demo

Run the local-only PR104 demo:

```bash
node bin/norma-core-visual-fixture-guided-inspection-demo.mjs
```

Or choose an output directory:

```bash
node bin/norma-core-visual-fixture-guided-inspection-demo.mjs --output /tmp/norma-core-pr104-visual-fixture-demo
```

The command reads the static synthetic PR103 fixture, validates its local-only and fixture-only boundary flags, and passes only `acceptedStructuredGeometry` into the existing Norma Core / Structured Analyze path.

`result.json` is the canonical Norma machine truth for this demo. `guide.html`, `visual.svg`, `summary.json`, and `summary.md` are derived local inspection artifacts only.

The CLI envelope metadata is local demo metadata only. It is not Core schema, package API, future connector schema, or an adapter contract.

This demo does not add real image recognition, image parsing, source asset loading, URL fetches, provider calls, OpenAI calls, hosted MCP, ChatGPT connector runtime, CAD import, Figma import, package publication, public exports, or a reusable adapter runtime.
