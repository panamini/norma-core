# Norma Core Operations Runbook

## 1. Purpose and status

This runbook documents the current Norma Core developer/private operating model
for local repository checks, direct MCP STDIO checks, Codex local MCP use, and
private ChatGPT Developer Mode use.

Current authoritative branch: `main`.

Current checkpoint: post-PR105 at merge commit
`dc04aee0830915a6316a258ce20e7f6610ea6d70`.

This is not a production-readiness claim. It is not a public package release,
hosted MCP deployment, public ChatGPT app release, marketplace submission, or
approval to process real user data.

## 2. Proof history and current checkpoint

Norma Core has two separate proof tracks that must not be collapsed.

- Historical PR0-PR12 established the deterministic MVP core baseline and
  replay-readiness model.
- Historical private PR6, on the divergent `main-after-codex-mcp-tool` branch,
  proved that a private ChatGPT Developer Mode connector could call
  `norma.runMvpDemoV1` through a Secure MCP Tunnel and receive the canonical
  Norma result. The app stayed private/dev, no public submission was made, and
  the tunnel was stopped after the test.
- PR102 replayed ChatGPT MCP initialize date-string compatibility onto current
  `main`.
- PR103 / R2A added `outputSchema` for `norma.getVersion` and
  `norma.serializeCanonicalJson`.
- PR104 / R2B added narrow envelope `outputSchema` values for
  `norma.verifyRun`, `norma.verifyArtifactFreshness`, and
  `norma.replayMvpDemo`.
- PR105 / R3 proved non-canonical structured MVP inputs through repository
  tests and the MVP harness boundary.
- R6A Structured Analyze V1 contract is documentation and tests only. It does
  not expose a new runtime operation or MCP tool.
- R6B implemented the direct `analyzeStructuredCompositionV1` operation.
- R6C exposes that operation through one local STDIO MCP tool,
  `norma.analyzeStructuredCompositionV1`.

Current `main` is not the historical PR6 branch. Current `main` exposes a
different six-tool MCP inventory and still needs a current-main ChatGPT
metadata refresh and re-smoke before anyone claims ChatGPT parity for that
inventory.

## 3. Proven versus not proven

| Surface | Status | Evidence | Current or historical | Runbook wording |
| --- | --- | --- | --- | --- |
| package/core deterministic path | `PROVEN_ON_CURRENT_MAIN` | PR105 CI plus `tests/mvp-demo-harness.test.mjs` | current | Current main proves deterministic structured MVP paths through repository tests. |
| build and full check | `PROVEN_ON_CURRENT_MAIN` | PR105 CI `verify`; package scripts | current | Use the repository `npm` scripts from `package.json`. |
| R3 non-canonical structured-input test proof | `PROVEN_ON_CURRENT_MAIN` | R3 tests in `tests/mvp-demo-harness.test.mjs` | current | R3 proves non-canonical structured inputs through the test/harness boundary only. |
| direct MCP initialize | `PROVEN_ON_CURRENT_MAIN` | `tests/mcp-stdio-server-skeleton.test.mjs` | current | Initialize echoes compatible MCP date-string protocol versions. |
| tools/list current inventory | `PROVEN_ON_CURRENT_MAIN` | `tests/mcp-tools-list-contract.test.mjs`, `tests/mcp-verify-tools-contract.test.mjs`, and `tests/mcp-structured-composition-analysis-contract.test.mjs` | current | Current inventory is exactly the six tools listed below. |
| direct tools/call | `PROVEN_ON_CURRENT_MAIN` | `tests/mcp-tools-call-contract.test.mjs`, `tests/mcp-verify-tools-contract.test.mjs`, `tests/mcp-replay-mvp-demo-contract.test.mjs` | current | Direct STDIO tool calls are covered by existing tests. |
| Codex local MCP | `DOCUMENTED_BUT_NOT_RETESTED` | local STDIO server exists; no current-main Codex call proof in repo | current workflow | Configure as a local MCP server and verify inventory; do not claim current-main Codex call parity without evidence. |
| private ChatGPT Secure MCP Tunnel | `HISTORICALLY_PROVEN_ON_OTHER_BRANCH` | historical post-PR6 checkpoint | historical | Private ChatGPT tunnel compatibility was historically proven with `norma.runMvpDemoV1`. |
| current-main ChatGPT metadata refresh | `DOCUMENTED_BUT_NOT_RETESTED` | no post-R6C repo evidence | current workflow | Refresh Draft app metadata after tool metadata changes before checking the six current tools. |
| current-main ChatGPT tool call | `DOCUMENTED_BUT_NOT_RETESTED` | no post-PR105 ChatGPT smoke evidence | current workflow | Run a safe current tool call before claiming ChatGPT parity. |
| hosted MCP endpoint | `NOT_IMPLEMENTED` | docs and source keep remote/hosted MCP blocked | current | No hosted always-on MCP endpoint exists. |
| public app submission | `NOT_IMPLEMENTED` | historical proof stayed private/dev | current/historical | Public submission is separate and not part of this runbook. |
| image/vision input | `NOT_IMPLEMENTED` | product docs keep image/vision future-scoped | current | No image, camera, or vision input exists in Norma Core. |
| CAD/plugin input | `NOT_IMPLEMENTED` | product docs keep CAD/plugin future-scoped | current | No CAD or plugin input exists in Norma Core. |
| `norma.replayRun` MCP tool | `NOT_IMPLEMENTED` | MCP tests reject `norma.replayRun` | current | A core replay operation can exist, but `norma.replayRun` is not exposed as an MCP tool. |

## 4. Current MCP inventory

Current `main` exposes exactly these MCP tools through local STDIO:

1. `norma.getVersion`
2. `norma.serializeCanonicalJson`
3. `norma.verifyRun`
4. `norma.verifyArtifactFreshness`
5. `norma.replayMvpDemo`
6. `norma.analyzeStructuredCompositionV1`

All six tools declare `outputSchema` in `src/mcp/stdio-protocol.ts`.
Annotations are absent on the original five tools. Structured Analyze declares
read-only, non-destructive, non-open-world, idempotent annotations.

`norma.runMvpDemoV1` is not exposed on current main.

`norma.replayRun` is not exposed as an MCP tool on current main. A replay
operation can exist inside the core/package boundary, but that is separate from
MCP tool exposure.

| Tool | Purpose | Input | Output schema | Annotations | Does not do |
| --- | --- | --- | --- | --- | --- |
| `norma.getVersion` | Return Norma Core and MCP server metadata. | Empty object or missing arguments. | Present. | Absent. | Does not run geometry, replay, filesystem, network, or shell work. |
| `norma.serializeCanonicalJson` | Return deterministic canonical JSON for an explicit structured value. | Object with explicit `value`; current implementation accepts the legacy `val` field used by tests. | Present. | Absent. | Does not infer source truth, read files, or fetch data. |
| `norma.verifyRun` | Verify an explicit Norma run envelope using existing core verification semantics. | Object with `input`. | Present. | Absent. | Does not create a run, fix input, or perform arbitrary replay. |
| `norma.verifyArtifactFreshness` | Verify explicit artifact freshness using existing core semantics. | Object with `input`. | Present. | Absent. | Does not regenerate artifacts or treat artifacts as source truth. |
| `norma.replayMvpDemo` | Replay the fixed in-memory MVP demo using existing replay semantics. | Empty object or missing arguments only. | Present. | Absent. | Does not accept caller-supplied replay inputs and does not expose `norma.replayRun`. |
| `norma.analyzeStructuredCompositionV1` | Analyze two accepted structured compositions with an explicit pack, rule set, tolerances, context, and provenance. | Object with explicit `input` matching `StructuredCompositionAnalysisInputV1`. | Present. | `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`, `idempotentHint: true`. | Does not infer geometry from prompts, images, files, URLs, providers, packs, rules, tolerances, or operation context; does not recommend, optimize, or score beauty. |

Source and tests remain canonical for exact schemas:

- `src/mcp/stdio-protocol.ts`
- `tests/mcp-tools-list-contract.test.mjs`
- `tests/mcp-tools-call-contract.test.mjs`
- `tests/mcp-verify-tools-contract.test.mjs`
- `tests/mcp-replay-mvp-demo-contract.test.mjs`
- `tests/mcp-structured-composition-analysis-contract.test.mjs`

## 5. Local prerequisites

Use repository-relative paths and placeholders:

- `<REPO_ROOT>`: Norma Core checkout.
- `<NODE_BINARY>`: Node executable used by the operator.
- `<TUNNEL_CLIENT>`: current official tunnel-client binary.
- `<TUNNEL_PROFILE>`: local tunnel-client profile name.
- `<TUNNEL_ID>`: redacted Platform tunnel ID.

Current CI baseline: Node `22.x` in `.github/workflows/ci.yml`.

Do not present Node `22.x` as the officially supported minimum unless
`package.json` later declares that requirement.

Package manager source of truth on current main:

- `package.json` has no `packageManager` field.
- `package-lock.json` is present.
- CI uses `npm ci`.
- Existing scripts use `npm run build`, `npm test`, and `npm run check`.

## 6. Local build and proof workflow

From `<REPO_ROOT>`:

```sh
npm ci
npm run build
npm test
npm run check
git diff --check
```

Focused current-main proof commands:

```sh
node --test tests/mvp-demo-harness.test.mjs
node --test tests/mcp-stdio-server-skeleton.test.mjs \
  tests/mcp-tools-list-contract.test.mjs \
  tests/mcp-tools-call-contract.test.mjs \
  tests/mcp-verify-tools-contract.test.mjs \
  tests/mcp-replay-mvp-demo-contract.test.mjs \
  tests/mcp-structured-composition-analysis-contract.test.mjs
```

Expected high-level outcomes:

- build succeeds;
- tests pass;
- direct MCP initialize supports compatible MCP protocol date strings;
- `tools/list` returns exactly six current tools;
- all six current tools expose `outputSchema`;
- annotations remain absent on the original five tools;
- Structured Analyze exposes exactly the read-only, non-destructive,
  non-open-world, idempotent annotations documented above;
- R3 non-canonical structured MVP inputs pass through the test/harness boundary;
- `norma.runMvpDemoV1` and `norma.replayRun` remain absent from MCP inventory.

## 7. Direct MCP STDIO workflow

Current entrypoint:

```sh
cd <REPO_ROOT>
npm run build
<NODE_BINARY> bin/norma-core-mcp-stdio.mjs
```

The server reads newline-delimited JSON-RPC messages from stdin and writes
newline-delimited JSON-RPC responses to stdout. The current protocol version is
`2025-06-18`, and compatible MCP protocol date strings from `2025-03-26`
onward are echoed by initialize.

Use the existing tests as the canonical smoke proof instead of adding a second
smoke implementation:

```sh
node --test tests/mcp-stdio-server-skeleton.test.mjs
node --test tests/mcp-tools-list-contract.test.mjs
node --test tests/mcp-tools-call-contract.test.mjs
node --test tests/mcp-verify-tools-contract.test.mjs
node --test tests/mcp-replay-mvp-demo-contract.test.mjs
node --test tests/mcp-structured-composition-analysis-contract.test.mjs
```

Manual STDIO sequence, when an operator needs a live transcript:

1. send `initialize`;
2. send `notifications/initialized` if the client uses it; notifications do not
   produce responses;
3. send `tools/list`;
4. send one representative safe `tools/call`, such as `norma.getVersion`;
5. call `norma.analyzeStructuredCompositionV1` only with an explicit accepted
   structured fixture when that boundary is the intended smoke;
6. close stdin or terminate the local process.

Current initialize capability shape is limited to:

```json
{
  "tools": {
    "listChanged": false
  }
}
```

Malformed JSON-RPC, invalid params, unknown methods, and unknown tool names
return JSON-RPC errors. `norma.replayRun` returns an unknown-tool error at the
MCP boundary.

## 8. Codex local MCP workflow

Build the repo before configuring Codex:

```sh
cd <REPO_ROOT>
npm run build
```

Configure Codex local MCP using the Codex-supported MCP configuration surface
for the active Codex client. The server command should use placeholders:

```text
<NODE_BINARY> <REPO_ROOT>/bin/norma-core-mcp-stdio.mjs
```

After configuration, verify inventory from the interactive Codex client or TUI:

- expect exactly the six current tools listed in section 4;
- verify `norma.runMvpDemoV1` is absent;
- verify `norma.replayRun` is absent;
- run only a safe current tool such as `norma.getVersion` unless the operator
  explicitly authorizes a structured-analysis fixture check.

Known caveat: Codex noninteractive approval controls can block or alter local
tool execution. Codex approval settings are separate from ChatGPT app
permissions and do not prove ChatGPT connector behavior.

Do not claim current-main Codex call parity unless the current run records the
server, tool name, request, response, and Git SHA.

## 9. Secure MCP Tunnel workflow

Use official OpenAI documentation for current product behavior:

- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels

### One-time provisioning

In the OpenAI Platform tunnel settings, create or select a tunnel for the
intended organization/workspace. Associate the tunnel with the workspace that
the ChatGPT Draft app will use. Confirm permissions in the current Platform UI.

Keep these values out of Git, logs, PRs, and screenshots:

- runtime API key;
- full tunnel ID;
- local tunnel profile secret;
- workspace/org IDs;
- cookies;
- auth headers.

Domain verification is not universal. It was observed during the historical
connector-creation flow, and it may depend on the current account, workspace,
and UI path. Follow it only when the current form asks for it. If a verification
challenge is required, a public example can use `verify.example.com`; do not
record the real domain, token, challenge URL, GitHub username, or DNS provider
details in this repository.

ChatGPT subscription state and Platform billing are separate surfaces. Do not
claim that buying credits fixes connector creation. Operators must verify their
own current account/org requirements and concrete Platform error messages.

### Routine start

Obtain the current official tunnel-client from the OpenAI Platform tunnel
settings download surface or the latest public release linked by the official
OpenAI docs. Do not hard-code a release URL or version in routine setup.

Start with:

```sh
<TUNNEL_CLIENT> help quickstart
```

Initialize or reuse a profile with placeholders:

```sh
export CONTROL_PLANE_API_KEY="<CONTROL_PLANE_API_KEY>"
<TUNNEL_CLIENT> init \
  --sample sample_mcp_stdio_local \
  --profile <TUNNEL_PROFILE> \
  --tunnel-id <TUNNEL_ID> \
  --mcp-command "<NODE_BINARY> <REPO_ROOT>/bin/norma-core-mcp-stdio.mjs"
```

Check and run:

```sh
<TUNNEL_CLIENT> doctor --profile <TUNNEL_PROFILE> --explain
<TUNNEL_CLIENT> run --profile <TUNNEL_PROFILE>
```

Keep the tunnel-client process alive while ChatGPT uses the connector.

Use the admin URL and port printed by the running tunnel-client. The examples
below use `http://127.0.0.1:8080`, but that address is not a universal
guarantee:

```sh
curl -fsS <TUNNEL_ADMIN_URL>/healthz
curl -fsS <TUNNEL_ADMIN_URL>/readyz
```

Also inspect the current admin surfaces shown by tunnel-client:

- `<TUNNEL_ADMIN_URL>/metrics`
- `<TUNNEL_ADMIN_URL>/ui`

Confirm the admin UI is loopback-only unless the current tunnel-client docs and
operator policy explicitly say otherwise.

### Routine stop

Stop the foreground or detached tunnel-client process deliberately.

Verify the current admin health endpoint stops responding:

```sh
curl -fsS <TUNNEL_ADMIN_URL>/healthz || true
```

Preserve or remove temporary logs according to operator policy. Do not publish
raw tunnel logs without sanitizing secrets, IDs, cookies, and headers.

Do not automatically delete the tunnel, Draft app, local profile, runtime key,
or external verification site. Delete or revoke them only as a deliberate
operator action.

## 10. ChatGPT Developer Mode workflow

Use official OpenAI documentation for current product behavior:

- https://developers.openai.com/api/docs/guides/developer-mode
- https://developers.openai.com/apps-sdk/deploy/connect-chatgpt

Enable Developer Mode in the current ChatGPT UI if the account is eligible.
Create or update the app under Drafts. For local development through Secure MCP
Tunnel, select the Tunnel connection path when the current UI offers it.

Use `No Authentication` only if the current Draft app actually uses it. Do not
generalize that choice to future apps or production flows.

After MCP tool metadata changes, refresh the app metadata in ChatGPT settings so
the Draft app pulls current tools, descriptions, schemas, and server
instructions.

Start a new conversation, choose Developer Mode, select the Draft app, and use
explicit prompts that name the app and tool. Keep built-in browsing or other
tools out of a smoke test unless the test explicitly needs them.

Permission and confirmation behavior belongs to ChatGPT app settings and the
conversation UI. It is separate from Codex local MCP approvals.

### Historical PR6 smoke

Historical only:

- branch: `main-after-codex-mcp-tool`;
- tool: `norma.runMvpDemoV1`;
- result matched the canonical Norma result;
- app stayed private/dev;
- no public submission was made;
- tunnel was stopped after testing.

Do not present `norma.runMvpDemoV1` as part of current-main MCP inventory.

### Current-main re-smoke checklist

This checklist remains unproven until it is executed on current main.

1. Confirm the local worktree is on the intended current-main SHA.
2. Run `npm ci`, `npm run build`, and focused MCP tests.
3. Start the tunnel-client with the current built STDIO command.
4. Verify tunnel-client `/healthz`, `/readyz`, `/metrics`, and `/ui` using the
   admin URL printed by the client.
5. Refresh Draft app metadata.
6. Confirm ChatGPT lists exactly the six current tools.
7. Explicitly call a safe current tool such as `norma.getVersion`.
8. Verify the result uses outputSchema-backed structured content.
9. Record the Git SHA, tool name, redacted request, redacted response, and stop
   state.

Do not claim current-main ChatGPT parity before this checklist has real
evidence.

## 11. Secret and privacy rules

- Use environment variables or an approved secret manager for keys.
- Never print secret values.
- Never use `set -x` around secrets.
- Never commit runtime keys.
- Redact full tunnel IDs.
- Redact workspace and org IDs.
- Redact cookies and auth headers.
- Sanitize support exports before attaching them to issues or PRs.
- Avoid publishing raw tunnel logs.
- Treat a domain-verification token as public only at the exact well-known URL
  required by the challenge flow; unrelated secrets remain private.

## 12. Troubleshooting decision tree

| Symptom | Boundary | Evidence to collect | Classification | Next action |
| --- | --- | --- | --- | --- |
| `npm ci`, build, tests, or check fail | repository/runtime | Node version, npm output, clean status, Git SHA | repo failure | Fix or report repository blocker before tunnel or ChatGPT work. |
| direct MCP initialize fails | MCP protocol/runtime | raw request/response and stderr | MCP protocol failure | Compare with `tests/mcp-stdio-server-skeleton.test.mjs`. |
| initialize succeeds but `tools/list` does not occur | MCP client/protocol | transcript through initialize, notification, and list | client/protocol mismatch | Confirm notification handling and list params. |
| `tools/list` returns wrong inventory | MCP contract | tool list response and current SHA | MCP contract drift | Compare with section 4 and list tests. |
| tunnel not visible or `doctor` fails | tunnel client / Platform | `doctor --explain`, profile name, redacted tunnel ID | tunnel/platform issue | Follow official Secure MCP Tunnel guide and workspace association. |
| health is live but readiness fails | tunnel client / local STDIO | `/healthz`, `/readyz`, local command, stderr | tunnel/runtime issue | Verify built server command and local STDIO process. |
| connector creation fails | ChatGPT app metadata/UI | current UI error, redacted tunnel state | app/platform issue | Do not blame Norma Core without request/response evidence. |
| tool inventory stale in ChatGPT | ChatGPT metadata cache | app details page, refresh timestamp | metadata cache | Refresh Draft app metadata and restart conversation. |
| app absent from composer | ChatGPT Developer Mode/UI | Developer Mode status, Drafts listing | app/UI issue | Enable Developer Mode and select the Draft app. |
| tool call requires confirmation | ChatGPT approval policy | confirmation prompt and app settings | approval policy | Confirm only intended safe calls. |
| tool returns wrong values | product contract / runtime | direct STDIO response, ChatGPT response, Git SHA | contract mismatch | Compare direct MCP and ChatGPT responses before assigning blame. |
| current main differs from historical PR6 tool set | expected historical/current distinction | current tool list, PR6 checkpoint | expected branch drift | Use current six-tool wording and do not call PR6 current. |

## 13. Cleanup and rollback

Stop the tunnel-client process. Verify the admin health endpoint stops. Remove
temporary logs only after preserving necessary redacted evidence.

Preserve or revoke runtime keys according to operator policy. Keep or delete any
external domain-verification site deliberately. Keep Draft apps private unless a
separate public-submission process is approved.

Do not automatically delete apps, tunnels, profiles, or verification sites.

Repository rollback is separate from external-state cleanup. For this runbook,
rollback means reverting `docs/OPERATIONS_RUNBOOK.md` and the related link in
`docs/MCP_TOOL_CONTRACT.md`.

## 14. Known limitations

- No production claim.
- No hosted always-on MCP.
- No public app submission.
- No current-main ChatGPT re-smoke proof yet.
- Annotations are absent on the original five MCP tools only.
- Structured Analyze is local STDIO MCP only; no ChatGPT smoke proof is claimed.
- No prompt-driven custom-analysis MCP tool.
- R6A is a historical contract for the direct Structured Analyze V1 operation
  and the R6C MCP wrapper; it is not ChatGPT proof.
- R3 is a repository test/harness proof, not a ChatGPT custom-analysis product
  proof.
- No image, camera, or vision input.
- No CAD or plugin input.
- No `norma.replayRun` MCP tool.
- No beauty score, recommendation, optimization, or intent inference.

## 15. Official references

Use current official OpenAI references for OpenAI product behavior:

- Secure MCP Tunnel:
  https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
- ChatGPT Developer Mode:
  https://developers.openai.com/api/docs/guides/developer-mode
- Connect from ChatGPT:
  https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- Apps SDK Reference:
  https://developers.openai.com/apps-sdk/reference

Use current Norma Core source and tests as the source of truth for Norma
behavior:

- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `src/mcp/stdio-protocol.ts`
- `bin/norma-core-mcp-stdio.mjs`
- `tests/mvp-demo-harness.test.mjs`
- `tests/mcp-stdio-server-skeleton.test.mjs`
- `tests/mcp-tools-list-contract.test.mjs`
- `tests/mcp-tools-call-contract.test.mjs`
- `tests/mcp-verify-tools-contract.test.mjs`
- `tests/mcp-replay-mvp-demo-contract.test.mjs`
