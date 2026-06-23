#!/usr/bin/env node

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createCanonicalMvpDemoInputV1,
  runMvpDemoV1,
} from "../dist/src/index.js";
import {
  MVP_PROOF_OUTPUT_FILES,
  createMvpProofFiles,
  formatFailureDiagnostic,
  formatProofLine,
  mvpProofHelpText,
  parseMvpProofArgs,
} from "../dist/src/local-mvp-proof.js";

const parsed = parseMvpProofArgs(process.argv.slice(2));
if (!parsed.ok) {
  fail("InvalidArguments", parsed.message, "arguments");
}

if (parsed.help) {
  console.log(mvpProofHelpText());
  process.exit(0);
}

const outDir = path.resolve(parsed.outDir);
await ensureOutputDirectory(outDir);
await removeKnownOutputFiles(outDir);

if (parsed.inputPath === null) {
  console.log("Input: canonical MVP demo selection.");
} else {
  console.log("Input: custom JSON file.");
}

const input = parsed.inputPath === null
  ? createCanonicalMvpDemoInputV1()
  : await readInputJson(parsed.inputPath);

const result = runMvpDemoV1(input);
if (result.status !== "ok" || result.output === null) {
  const diagnostic = result.errors[0] ?? result.warnings[0];
  fail(
    diagnostic?.code ?? "MvpDemoFailed",
    diagnostic?.message ?? "MVP demo failed without a diagnostic.",
    diagnostic?.targetRef ?? null,
  );
}

const files = createMvpProofFiles(result.output);
try {
  await Promise.all(Object.entries(files).map(([fileName, content]) => (
    writeFile(path.join(outDir, fileName), content, "utf8")
  )));
} catch {
  fail("WriteError", "Could not write proof files to output directory.", "out");
}

console.log(formatProofLine(result.output, MVP_PROOF_OUTPUT_FILES.report));

async function readInputJson(inputPath) {
  let text;
  const resolvedPath = path.resolve(inputPath);
  try {
    text = await readFile(resolvedPath, "utf8");
  } catch {
    fail("UnreadableInput", "Could not read input JSON.", "input");
  }

  try {
    return JSON.parse(text);
  } catch {
    fail("MalformedJson", "Input is not valid JSON.", "input");
  }
}

async function ensureOutputDirectory(directory) {
  try {
    const existing = await stat(directory);
    if (!existing.isDirectory()) {
      fail("InvalidOutputPath", "Output path is not a directory.", "out");
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      try {
        await mkdir(directory, { recursive: true });
        return;
      } catch {
        fail("InvalidOutputPath", "Could not create output directory.", "out");
      }
    }
    if (error && error.code !== "ENOENT") {
      fail("InvalidOutputPath", "Could not inspect output directory.", "out");
    }
  }
}

async function removeKnownOutputFiles(directory) {
  await Promise.all(Object.values(MVP_PROOF_OUTPUT_FILES).map((fileName) => (
    rm(path.join(directory, fileName), { force: true })
  )));
}

function fail(code, message, targetRef = null) {
  console.error(`NORMA_MVP_PROOF_FAIL ${code}`);
  console.error(formatFailureDiagnostic(code, message, targetRef));
  process.exit(1);
}
