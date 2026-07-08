# Local Synthetic Evidence Acceptance Demo

This is a local developer proof command for the PR110/PR111 synthetic external evidence acceptance boundary. It is not a public CLI, product API, package API, provider runtime, or report system.

Build the repository first because the command requires `dist/` artifacts:

```bash
npm run build
```

Run the demo with an explicit output directory:

```bash
node bin/norma-core-synthetic-evidence-acceptance-demo.mjs --output /tmp/norma-core-pr112-synthetic-evidence-demo
```

If `--output` is omitted, the command writes to a temporary local directory and prints that path as JSON.

## Artifacts

- `result.json` is the canonical Structured Analyze computational output.
- `proof.json` is the derived PR111 boundary proof object. It is non-authoritative evidence only.
- `summary.json` is a derived local demo summary. It is non-authoritative evidence only.

The command reads `tests/fixtures/visual-adapter/synthetic-external-evidence-envelope-v1.json`, runs the package-private `createSyntheticExternalEvidenceAcceptanceProofV1` helper, and only after that proof succeeds maps accepted structured geometry into the existing Core / Structured Analyze path.

External evidence remains candidate evidence only. The observation envelope is untrusted. Confidence, score, value metadata, prompts, warnings, and derived artifacts cannot authorize acceptance. Provider evidence cannot self-accept. Accepted structured geometry is the only Core input.

## Non-Goals

This is not OpenAI integration, image recognition, provider support, CAD import, Figma import, hosted MCP, ChatGPT connector runtime, package publishing, or public API.
