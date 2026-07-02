# Local Guided Inspection Demo

Run the local guided inspection command after the repo is built:

```bash
node bin/norma-core-guided-inspection-demo.mjs
```

To choose the output directory:

```bash
node bin/norma-core-guided-inspection-demo.mjs --output /tmp/norma-core-pr89-guided-demo
```

Open `guide.html` from the output directory. It links to the generated local artifacts with relative links.

`result.json` is canonical Norma truth. `report.html`, `visual.svg`, `summary.json`, `summary.md`, and `guide.html` are derived local inspection artifacts only.

Future package/API callers may reference the derived artifact paths and metadata as guided inspection outputs, but only `result.json` is machine-consumable Norma truth. Public package exports, public API exports, package publication, package metadata changes, lockfile changes, dependency changes, hosted MCP, ChatGPT connector runtime, OpenAI/provider calls, and image/CAD/Figma/provider adapter implementation require later explicit approval.

This is local-only. It is not hosted MCP, a ChatGPT connector runtime, an image/CAD/Figma/provider adapter runtime, or package publication.
