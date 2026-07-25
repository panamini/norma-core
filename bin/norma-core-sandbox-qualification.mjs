#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  AUTH0_PROVIDER,
  parseSandboxQualificationEvidence,
  runSandboxQualification,
  SCALEKIT_PROVIDER,
  SandboxQualificationInputError,
} from "../qualification/sandbox-qualification.mjs";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}

async function main(argumentsList) {
  try {
    const options = parseArguments(argumentsList);
    if (options.help) {
      process.stdout.write(`${JSON.stringify({
        usage: "node bin/norma-core-sandbox-qualification.mjs [--evidence path] [--provider scalekit|auth0] [--fallback-from-scalekit]",
        defaultMode: "dry-run",
        productionReadiness: "CLOSED",
      })}\n`);
      return;
    }
    const evidence = options.evidencePath === undefined
      ? undefined
      : parseSandboxQualificationEvidence(JSON.parse(await readFile(options.evidencePath, "utf8")));
    const report = runSandboxQualification({
      provider: options.provider,
      mode: evidence === undefined ? "dry-run" : "evidence",
      evidence,
      fallbackFromScalekit: options.fallbackFromScalekit,
    });
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (report.criteria.some(({ status }) => status === "FAIL")) {
      process.exitCode = 3;
    }
  } catch (error) {
    const safeResult = {
      status: error instanceof SandboxQualificationInputError ? "INVALID_INPUT" : "UNAVAILABLE",
      productionReadiness: "CLOSED",
    };
    process.stdout.write(`${JSON.stringify(safeResult)}\n`);
    process.exitCode = 2;
  }
}

function parseArguments(argumentsList) {
  const options = {
    provider: SCALEKIT_PROVIDER,
    evidencePath: undefined,
    fallbackFromScalekit: false,
    help: false,
  };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help") {
      options.help = true;
    } else if (argument === "--provider") {
      const provider = argumentsList[index + 1];
      if (provider !== SCALEKIT_PROVIDER && provider !== AUTH0_PROVIDER) {
        throw new SandboxQualificationInputError();
      }
      options.provider = provider;
      index += 1;
    } else if (argument === "--evidence") {
      const evidencePath = argumentsList[index + 1];
      if (typeof evidencePath !== "string" || evidencePath === "") {
        throw new SandboxQualificationInputError();
      }
      options.evidencePath = evidencePath;
      index += 1;
    } else if (argument === "--fallback-from-scalekit") {
      options.fallbackFromScalekit = true;
    } else {
      throw new SandboxQualificationInputError();
    }
  }
  return options;
}
