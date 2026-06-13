# Norma Core Local CLI

Norma Core has a local-only CLI for approved trust-layer operations.

Run it directly with Node:

```bash
node bin/norma-core.mjs <command>
```

There is no package `bin` field yet. There is no npm publish and no package publish behavior. This CLI does not create an SDK runtime, API, MCP, adapter, UI, or new Norma logic. It calls existing approved package-root operations and writes one JSON object to stdout.

The CLI preserves JSON output envelope discipline. Warnings, errors, provenance, source refs, mismatches, replay details, and artifact freshness data must remain visible in the nested operation result.

## Commands

### `node bin/norma-core.mjs version`

Input requirement: no input arguments.

Operation called: none.

Expected success status: CLI wrapper `status: "ok"`.

Possible non-success status: CLI error envelope when an unexpected argument is supplied.

Expected exit code policy: `0` on success, `1` for wrong number of arguments, `3` for unexpected internal CLI exceptions.

Output envelope shape:

```json
{
  "kind": "norma-core-cli-result",
  "command": "version",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0
}
```

### `node bin/norma-core.mjs help`

Input requirement: no input arguments.

Operation called: none.

Expected success status: CLI wrapper `status: "ok"`.

Possible non-success status: CLI error envelope when an unexpected argument is supplied.

Expected exit code policy: `0` on success, `1` for wrong number of arguments, `3` for unexpected internal CLI exceptions.

Output envelope shape:

```json
{
  "kind": "norma-core-cli-result",
  "command": "help",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0,
  "commands": [],
  "inputRequirements": {},
  "notes": {}
}
```

### `node bin/norma-core.mjs --help`

Input requirement: no input arguments.

Operation called: none. `--help` normalizes to the `help` command.

Expected success status: CLI wrapper `status: "ok"`.

Possible non-success status: CLI error envelope when an unexpected argument is supplied.

Expected exit code policy: `0` on success, `1` for wrong number of arguments, `3` for unexpected internal CLI exceptions.

Output envelope shape: same as `node bin/norma-core.mjs help`, with `"command": "help"`.

### `node bin/norma-core.mjs mvp-demo`

Input requirement: no input arguments.

Operation called: `createMvpDemoInput()` followed by `runMvpDemo(input)`.

Expected success status: nested operation result `status: "ok"`.

Possible non-success status: any operation result status other than `ok` is treated as operation-level non-success.

Expected exit code policy: `0` when the nested operation status is `ok`, `1` for wrong number of arguments, `2` for valid CLI execution with a non-success operation result, `3` for unexpected internal CLI exceptions.

Output envelope shape:

```json
{
  "kind": "norma-core-cli-result",
  "command": "mvp-demo",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0,
  "result": {
    "status": "ok",
    "output": {
      "kind": "mvp-demo-result"
    }
  }
}
```

### `node bin/norma-core.mjs verify-run <input.json>`

Input requirement: exactly one JSON file path.

Operation called: `verifyRun(input)`.

Expected success status: nested operation result `status: "verified"` or `status: "verified_with_warnings"`.

Possible non-success status: `mismatch`, `non_replayable`, `unsupported`, or `invalid`.

Expected exit code policy: `0` when the nested operation status is `verified` or `verified_with_warnings`, `1` for CLI input or usage errors, `2` for valid CLI execution with a non-success operation result, `3` for unexpected internal CLI exceptions.

Output envelope shape:

```json
{
  "kind": "norma-core-cli-result",
  "command": "verify-run",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0,
  "result": {
    "kind": "run-verification",
    "status": "verified"
  }
}
```

Minimal conceptual input shape:

```json
{
  "run": {},
  "mode": "audit_only",
  "packLock": {},
  "operationContext": {},
  "expectedOutputRefs": {},
  "expectedOperationName": "core.mvp-demo.run",
  "expectedOperationVersion": "0.1.0-pr12"
}
```

Large real inputs should be produced by tests/helpers from structured Norma objects, not hand-written.

### `node bin/norma-core.mjs verify-artifact-freshness <input.json>`

Input requirement: exactly one JSON file path.

Operation called: `verifyArtifactFreshness(input)`.

Expected success status: nested operation result `status: "current"` or `status: "lossy"`.

Possible non-success status: `stale`, `non_replayable`, or `invalid`.

Expected exit code policy: `0` when the nested operation status is `current` or `lossy`, `1` for CLI input or usage errors, `2` for valid CLI execution with a non-success operation result, `3` for unexpected internal CLI exceptions.

Output envelope shape:

```json
{
  "kind": "norma-core-cli-result",
  "command": "verify-artifact-freshness",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0,
  "result": {
    "kind": "artifact-freshness-verification",
    "status": "current"
  }
}
```

Minimal conceptual input shape:

```json
{
  "artifact": {},
  "sourceObjects": [],
  "expectedSourceRefs": [],
  "expectedOutputRefs": [],
  "expectedRunRef": {},
  "expectedOptions": {},
  "expectedOperationContextRef": {}
}
```

Use test/helpers to produce complete freshness inputs from real derived artifacts and source objects.

### `node bin/norma-core.mjs replay-run <input.json>`

Input requirement: exactly one JSON file path.

Operation called: `replayRun(input)`.

Expected success status: nested operation result `status: "replayed"` or `status: "replayed_with_warnings"`.

Possible non-success status: `mismatch`, `non_replayable`, `unsupported`, or `error`.

Expected exit code policy: `0` when the nested operation status is `replayed` or `replayed_with_warnings`, `1` for CLI input or usage errors, `2` for valid CLI execution with a non-success operation result, `3` for unexpected internal CLI exceptions.

Output envelope shape:

```json
{
  "kind": "norma-core-cli-result",
  "command": "replay-run",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0,
  "result": {
    "kind": "run-replay",
    "status": "replayed"
  }
}
```

Minimal conceptual input shape:

```json
{
  "run": {},
  "mvpDemoInput": {},
  "recordedMvpResult": {},
  "packLock": {},
  "operationContext": {}
}
```

`replay-run` is MVP-only. It does not support arbitrary operation replay.

## JSON Output Envelope

All successful CLI wrapper executions use `kind: "norma-core-cli-result"` and `status: "ok"` at the CLI wrapper level.

Normal result envelope:

```json
{
  "kind": "norma-core-cli-result",
  "command": "verify-run",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 0,
  "result": {}
}
```

CLI error envelope:

```json
{
  "kind": "norma-core-cli-error",
  "command": "verify-run",
  "status": "error",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 1,
  "error": {
    "code": "InvalidCliInput",
    "message": "..."
  }
}
```

Operation-level non-success still uses `kind: "norma-core-cli-result"` with `status: "ok"` at the CLI wrapper level. The CLI sets `exitCode: 2`, and the nested operation result carries the domain status.

Example:

```json
{
  "kind": "norma-core-cli-result",
  "command": "verify-artifact-freshness",
  "status": "ok",
  "coreVersion": "0.1.0-pr12",
  "exitCode": 2,
  "result": {
    "kind": "artifact-freshness-verification",
    "status": "invalid"
  }
}
```

## Exit Code Policy

Exit code `0`: successful CLI execution with successful operation result.

Exit code `1`: CLI input or usage error:

- missing command;
- unknown command;
- missing input file;
- invalid JSON;
- wrong number of arguments.

Exit code `2`: valid command execution with non-success operation result:

- `mismatch`;
- `non_replayable`;
- `unsupported`;
- `invalid`;
- `error`;
- `stale`;
- core failed.

Exit code `3`: unexpected internal CLI exception.

Warnings alone do not cause a non-zero exit when the nested operation status remains in that command's success set, such as `verified_with_warnings`, `replayed_with_warnings`, or `lossy`.

## Smoke Examples

Version:

```bash
node bin/norma-core.mjs version
```

Help:

```bash
node bin/norma-core.mjs help
node bin/norma-core.mjs --help
```

MVP demo:

```bash
node bin/norma-core.mjs mvp-demo
```

Run verification:

```bash
node bin/norma-core.mjs verify-run ./verify-run.input.json
```

Artifact freshness:

```bash
node bin/norma-core.mjs verify-artifact-freshness ./artifact-freshness.input.json
```

MVP replay:

```bash
node bin/norma-core.mjs replay-run ./replay-run.input.json
```

## Non-Goals

This CLI remains local-only.

- No SDK runtime.
- No API.
- No MCP.
- No adapter.
- No UI.
- No cloud, camera, image, vision, CAD, plugin, or marketplace behavior.
- No package `bin` field yet.
- No npm publish.
- No package publish.
- No new Norma logic.
- No source-truth inference from prompts, artifacts, files, images, or hidden defaults.
