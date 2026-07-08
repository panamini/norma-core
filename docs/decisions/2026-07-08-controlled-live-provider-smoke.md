# Controlled Live Provider Smoke

## Status

Accepted as the PR117 controlled manual live-provider smoke boundary behind the
PR116 disabled local harness.

PR117 adds a controlled manual live-provider smoke behind the PR116 disabled
harness. It does not turn the PR116 disabled command into a live command.

## Official Provider Docs Checked

Official OpenAI documentation checked on 2026-07-08:

- `https://developers.openai.com/api/docs/guides/images-vision`
- `https://developers.openai.com/api/reference/resources/responses/methods/create`

The checked docs describe Responses API image input using `type:
"input_image"` with `image_url` as a fully qualified URL or a base64 data URL.
The checked image-input requirements list PNG, JPEG, WEBP, and non-animated GIF
as supported file types. PR117 uses only local operator-provided PNG, JPEG, or
WEBP files with extension plus magic-byte checks.

## Command Boundary

The default command remains safe and does not call network:

```text
node bin/norma-core-controlled-live-provider-smoke.mjs
```

The default disabled command can run without prebuilt `dist/` output. Live mode
requires `npm run build` first in source checkouts because live execution uses
the compiled package-private helper.

Default execution does not read provider API keys, does not read `.env`, does
not read image files, does not call network, and emits structured JSON with:

- `liveProviderExecution: false`;
- `disabledByDefault: true`;
- `manualOnly: true`;
- `failClosed: true`;
- `providerEvidenceOnly: true`;
- `acceptedStructuredGeometryOnlyCoreInput: true`.

The command remains local and unregistered. It is not added to package `bin`,
package scripts, package exports, CI, MCP, ChatGPT, CAD, Figma, hosted runtime,
or package publication surfaces.

## Live Gate

Live execution requires explicit opt-in and local operator credentials. Live
execution must not run in CI.

Live execution requires all of:

1. `--live`;
2. no recognized non-empty CI marker such as `CI=1`, `CI=true`,
   `GITHUB_ACTIONS=true`, `GITLAB_CI=1`, or AWS CodeBuild markers;
3. `NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT=1`;
4. `NORMA_LIVE_PROVIDER=openai-responses-vision`;
5. `NORMA_LIVE_PROVIDER_MODEL`;
6. `NORMA_LIVE_PROVIDER_API_KEY`;
7. `--input-image <local path>`;
8. a supported local image file under the small bounded size limit;
9. a writable `--output <dir>`;
10. a bounded timeout.

Missing or invalid configuration fails closed before any network call.

Remote image URLs and file URLs are rejected. No secrets may be committed. No
`.env` files may be committed or mutated.

## Output And Redaction

If explicitly live mode is fully configured and manually run outside tests and
CI, it may write only:

- `provider-evidence-envelope.json`;
- `summary.json`;
- `summary.md`.

Raw provider output is ephemeral and not persisted. The provider request must
disable provider-side response storage when the selected API supports that
control. Redacted provider-neutral evidence output is the only allowed
persisted result.

Non-JSON provider bodies still count as observed provider output, but their raw
text must not be persisted. If the provider call completes and a later artifact
write fails, the command must report a structured artifact-write failure with the
redacted provider status instead of classifying it as a transport failure.

The persisted output must not include secrets, API keys, bearer tokens,
authorization headers, raw request JSON, raw image bytes, base64 image data,
raw provider response JSON, signed URLs, local absolute input paths, hidden
prompts, chain-of-thought, `.env` content, user data, production data, or
provider payload fixtures.

Output metadata must state:

- `liveProviderExecution: true` only if the transport is actually invoked;
- `providerEvidenceOnly: true`;
- `requiresExplicitAcceptance: true`;
- `providerOutputIsCoreTruth: false`;
- `acceptedStructuredGeometryOnlyCoreInput: true`;
- `rawProviderOutputPersisted: false`;
- `redacted: true`;
- `ciLiveNetworkDependency: false`.

Failures are structured and redacted.

## Core Truth Rule

Provider output remains evidence only.

Provider output may suggest evidence. Provider output never defines Norma truth.
Accepted structured geometry remains the only Core input.

Provider output cannot become accepted structured geometry, Core input,
source truth, package API truth, connector truth, hosted truth, artifact truth,
metric-policy authority, family-selection authority, correction authority,
recommendation authority, optimization authority, scoring authority, or beauty
judgment authority.

No provider output can self-accept. Confidence, score, ranking, value metadata,
prompt output, artifact output, provider identity, or provider result status
cannot authorize acceptance.

## Non-Goals

PR117 does not implement production OpenAI integration.

PR117 does not approve provider output as truth.

PR117 does not approve:

- real live provider execution in tests or CI;
- real credentials during validation;
- OpenAI SDK usage;
- provider SDK usage;
- dependency changes;
- package metadata changes;
- lockfile changes;
- package exports;
- package scripts;
- public API expansion;
- provider response fixtures;
- raw provider payload schemas;
- durable OpenAI response schemas;
- image upload runtime or server;
- image recognition product semantics;
- CAD/Figma import;
- hosted MCP;
- ChatGPT connector runtime;
- OAuth/auth/server/deployment;
- raw provider output persistence;
- raw image persistence;
- AcceptedGeometry creation from provider output;
- Structured Analyze or `result.json` execution from provider output;
- Core schema widening;
- Core runtime widening;
- confidence-threshold acceptance;
- automatic acceptance;
- family selection, correction, recommendation, optimization, scoring, or beauty
  judgment.

## Validation Gates

PR117 is acceptable only when tests prove:

- default command does not call network;
- default command emits safe structured JSON;
- default command states live provider execution is false;
- explicit live mode fails closed for each missing required gate;
- incomplete live mode fails closed before network;
- fake secrets and bearer tokens are never printed;
- `.env` is not read or written;
- provider SDKs, MCP, ChatGPT, CAD/Figma, package-root APIs, Core widening
  modules, package files, lockfiles, package metadata, package scripts, and
  public exports remain unchanged;
- tests use injected fake transport only;
- fake transport is called only after all gates are represented;
- fake transport output is reduced to redacted provider-neutral evidence only;
- raw provider responses and raw images are not persisted;
- non-JSON provider responses are recorded as observed output without storing
  raw text;
- artifact write failures after a completed provider call are distinct from
  transport failures;
- provider-neutral evidence cannot produce accepted structured geometry;
- provider output cannot enter Core;
- confidence, score, value, prompt, artifact, or provider metadata cannot
  authorize acceptance;
- accepted structured geometry remains the only Core input;
- existing PR111 proof helper and PR114 replay adapter remain unchanged;
- exact changed-file guard accepts only the PR117 approved set and rejects
  forbidden extras.
