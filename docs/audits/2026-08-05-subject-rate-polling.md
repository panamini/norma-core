# Audit — subject rate limit and SAM polling

Date: 2026-08-05  
Status: corrected locally; deployment and publication were not requested

## Scope

This audit covers the authenticated `/mcp` admission path for the SAM 3 perception workflow and the `subject_rate` response reported by the widget.

## Confirmed finding

Before this change, the HTTP server entered the per-subject authenticated admission bucket before reading and classifying the JSON-RPC request. A single SAM workflow therefore charged its repeated `norma.getPersonalVisualHarmonyPerceptionStatusV1` polling requests against the 30-attempt hourly action quota; with up to 160 polls at 2 seconds, one workflow could exhaust that quota without 30 user actions.

The existing global authenticated capacity and subject concurrency limits were separate protections and were not the cause of the reported `subject_rate` response.

## Corrective change

- An authenticated request first reserves the existing global-capacity and subject-concurrency slot while its bounded body is read; only after parsing and validation is that reservation promoted to an action attempt or retained as a status-poll reservation.
- Only the exact `norma.getPersonalVisualHarmonyPerceptionStatusV1` tool call is classified as `non_action`.
- That status poll still consumes global capacity and subject concurrency, but it does not consume the per-subject action quota.
- All other tools, unknown tool calls, and non-tool JSON-RPC messages remain `action` and retain the 30-attempt hourly limit.
- Post-parse admission denials now log the classified tool and bounded payload size; pre-parse denials necessarily use the generic `mcp` tool label, and request contents and secrets are not logged.
- A rejected status poll cannot add an action attempt when subject concurrency is full.

## Verification

The focused runtime tests cover:

1. Thirty action attempts still produce `subject_rate`.
2. A status poll remains admissible after that action quota is exhausted.
3. A status poll rejected for subject concurrency does not reduce the later action budget.
4. The HTTP path classifies the status tool after bounded body parsing, while an `initialize` request remains subject-rate limited.

Verification results on the isolated artifact:

- `pnpm exec tsc -p tsconfig.json --noEmit`: passed on the working worktree.
- `pnpm exec tsc -p tsconfig.json`: passed on the disposable verification copy.
- `node --test tests/mcp-remote-http-runtime.test.mjs`: 12/12 passed, including the local HTTP integration test.
- `node --test tests/personal-visual-harmony-mcp.test.mjs`: 114/114 passed.
- `node --test tests/performance-truth-harness.test.mjs`: 7/7 passed.
- `npm test`: the runtime tests passed, but 19 repository changed-file-guard assertions failed because the shared checkout already contains unrelated dirty files; this is not a clean full-suite signal for this changeset.

The local HTTP checks required explicit localhost test permission, and the worktree `dist/` is protected in this environment, so the emitting build ran in the disposable copy. This audit does not claim a Railway deployment or live provider execution.

## Residual limits

This patch does not change the numeric quotas, poll interval, SAM provider, widget state machine, geometry contracts, authorization, or Core execution rules. A live Railway smoke is still required to prove the deployed artifact and provider boundary separately.
