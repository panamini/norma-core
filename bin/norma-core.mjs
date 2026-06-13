import { readFile } from "node:fs/promises";

import * as core from "@norma/core";

const RESULT_KIND = "norma-core-cli-result";
const ERROR_KIND = "norma-core-cli-error";
const SUCCESS_STATUSES = Object.freeze({
  "mvp-demo": new Set(["ok"]),
  "verify-run": new Set(["verified", "verified_with_warnings"]),
  "verify-artifact-freshness": new Set(["current", "lossy"]),
  "replay-run": new Set(["replayed", "replayed_with_warnings"]),
});
const COMMAND_HANDLERS = Object.freeze({
  version: versionCommand,
  help: helpCommand,
  "mvp-demo": mvpDemoCommand,
  "verify-run": verifyRunCommand,
  "verify-artifact-freshness": verifyArtifactFreshnessCommand,
  "replay-run": replayRunCommand,
});

const args = process.argv.slice(2);
try {
  const { exitCode, envelope } = await handleCommand(args);
  writeJson(envelope);
  process.exitCode = exitCode;
} catch (error) {
  const command = normalizeCommand(args[0]);
  const envelope = errorEnvelope(command, 3, "InternalCliError", internalErrorMessage(error));
  writeJson(envelope);
  process.exitCode = 3;
}

async function handleCommand(commandArgs) {
  const command = normalizeCommand(commandArgs[0]);
  if (command === null) {
    return cliInputError(null, "Command is required.");
  }
  const handler = COMMAND_HANDLERS[command];
  if (handler !== undefined) {
    return handler(command, commandArgs);
  }
  return cliInputError(command, `Unknown command: ${command}.`);
}

function versionCommand(command, commandArgs) {
  const argumentError = noInputArgumentError(command, commandArgs, "Version");
  return argumentError ?? okResult(command, 0);
}

function helpCommand(command, commandArgs) {
  const argumentError = noInputArgumentError(command, commandArgs, "Help");
  return argumentError ?? okResult("help", 0, helpPayload());
}

function mvpDemoCommand(command, commandArgs) {
  const argumentError = noInputArgumentError(command, commandArgs, "mvp-demo");
  if (argumentError !== null) {
    return argumentError;
  }
  const input = core.createMvpDemoInput();
  return operationResult(command, core.runMvpDemo(input));
}

async function verifyRunCommand(command, commandArgs) {
  return inputFileCommand(command, commandArgs, core.verifyRun);
}

async function verifyArtifactFreshnessCommand(command, commandArgs) {
  return inputFileCommand(command, commandArgs, core.verifyArtifactFreshness);
}

async function replayRunCommand(command, commandArgs) {
  return inputFileCommand(command, commandArgs, core.replayRun);
}

async function inputFileCommand(command, commandArgs, operation) {
  const inputResult = await readCommandInput(command, commandArgs);
  return inputResult.ok
    ? operationResult(command, operation(inputResult.input))
    : inputResult.failure;
}

function noInputArgumentError(command, commandArgs, label) {
  return commandArgs.length === 1
    ? null
    : cliInputError(command, `${label} does not accept input arguments.`);
}

function normalizeCommand(command) {
  if (command === "--help") {
    return "help";
  }
  return typeof command === "string" && command.length > 0 ? command : null;
}

async function readCommandInput(command, commandArgs) {
  if (commandArgs.length !== 2) {
    return {
      ok: false,
      failure: cliInputError(command, `${command} requires exactly one JSON input file.`),
    };
  }

  try {
    const rawInput = await readFile(commandArgs[1], "utf8");
    return { ok: true, input: JSON.parse(rawInput) };
  } catch (error) {
    return {
      ok: false,
      failure: cliInputError(command, inputReadMessage(commandArgs[1], error)),
    };
  }
}

function operationResult(command, result) {
  const exitCode = operationExitCode(command, result);
  return okResult(command, exitCode, { result });
}

function operationExitCode(command, result) {
  const status = resultStatus(result);
  return SUCCESS_STATUSES[command]?.has(status) === true ? 0 : 2;
}

function resultStatus(result) {
  return isRecord(result) && typeof result.status === "string" ? result.status : null;
}

function okResult(command, exitCode, fields = {}) {
  return {
    exitCode,
    envelope: {
      kind: RESULT_KIND,
      command,
      status: "ok",
      coreVersion: core.CORE_VERSION,
      exitCode,
      ...fields,
    },
  };
}

function cliInputError(command, message) {
  return {
    exitCode: 1,
    envelope: errorEnvelope(command, 1, "InvalidCliInput", message),
  };
}

function errorEnvelope(command, exitCode, code, message) {
  return {
    kind: ERROR_KIND,
    command,
    status: "error",
    coreVersion: core.CORE_VERSION,
    exitCode,
    error: {
      code,
      message,
    },
  };
}

function helpPayload() {
  return {
    commands: [
      "version",
      "mvp-demo",
      "verify-run <input.json>",
      "verify-artifact-freshness <input.json>",
      "replay-run <input.json>",
      "help",
      "--help",
    ],
    inputRequirements: {
      version: "none",
      "mvp-demo": "none",
      "verify-run": "explicit JSON file",
      "verify-artifact-freshness": "explicit JSON file",
      "replay-run": "explicit JSON file",
      help: "none",
      "--help": "none",
    },
    notes: {
      localOnly: true,
      createsNormaTruth: false,
      hiddenDefaults: false,
      SDK: false,
      API: false,
      MCP: false,
      adapter: false,
      packagePublish: false,
      newNormaLogic: false,
    },
  };
}

function inputReadMessage(filePath, error) {
  if (error instanceof SyntaxError) {
    return `Invalid JSON input: ${filePath}.`;
  }
  if (isRecord(error) && error.code === "ENOENT") {
    return `Input file not found: ${filePath}.`;
  }
  return `Unable to read JSON input: ${filePath}.`;
}

function internalErrorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected internal CLI failure.";
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
