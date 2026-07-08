# Disabled Local Live Provider Experiment Harness

## Status

Accepted as the PR116 disabled local live-provider experiment harness boundary.

PR116 adds only a disabled-by-default, local-only, package-private harness and a
thin unregistered local command. It does not approve live provider execution.

## Boundary

The PR116 path is:

```text
Potential live provider experiment request
        |
        v
Disabled local harness gate
(fail-closed unless manual operator intent and redacted configuration presence are represented)
        |
        v
No provider call in PR116
        |
        v
PR117+ explicit Change Contract required before controlled live execution
```

## Harness Contract

The package-private helper accepts explicit function arguments only. It does not
read `process.env`, `.env`, provider payloads, image data, files, URLs, local
paths, cookies, bearer strings, prompts, raw provider output, or real secrets.

The helper returns structured state only:

- disabled by default;
- manual-only;
- fail-closed;
- no CI live-network dependency;
- provider-neutral;
- provider evidence only;
- accepted structured geometry remains the only Core input;
- provider output is not Core truth;
- network execution requires PR117+ or a later explicit Change Contract.

The future gate names
`NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT`, `NORMA_LIVE_PROVIDER`, and
`NORMA_LIVE_PROVIDER_API_KEY` are names only. They do not approve live
execution, and PR116 never reads or returns their values.

## Command Boundary

`bin/norma-core-disabled-live-provider-experiment-harness.mjs` is a local
developer command only. It is not added to `package.json` scripts, package `bin`,
package exports, public API, CI, hosted runtime, MCP, ChatGPT, CAD, or Figma
surfaces.

The default command emits concise structured JSON and always reports
`liveProviderExecution: false`.

## Non-Goals

PR116 does not implement or approve:

- live provider calls;
- OpenAI API calls;
- OpenAI SDK usage;
- provider SDK usage;
- network calls;
- provider runtime;
- image recognition;
- provider payload parsing;
- provider fixtures;
- raw provider output persistence;
- accepted structured geometry creation;
- Core input creation;
- `result.json` production;
- package exports;
- package metadata changes;
- dependency or lockfile changes;
- MCP or ChatGPT runtime;
- CAD or Figma import;
- hosted runtime;
- package publication;
- Core schema widening;
- Core runtime widening.

## Core Truth Rule

Provider output remains untrusted evidence only. No provider output, candidate
observation, confidence value, score, ranking, value metadata, prompt, artifact,
harness status, or configuration presence may become Norma truth, Core input,
accepted structured geometry, package API truth, connector truth, hosted truth,
artifact truth, or metric-policy authority.
