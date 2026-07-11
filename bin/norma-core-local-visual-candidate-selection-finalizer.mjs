import { randomUUID } from "node:crypto";
import { link, open, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export { runLocalVisualCandidateSelectionFinalizerCli, writeAtomicExclusive };

const LIMITS = Object.freeze({
  receipt: 64 * 1024,
  candidate: 256 * 1024,
  intent: 64 * 1024,
  png: 2 * 1024 * 1024,
});

async function runLocalVisualCandidateSelectionFinalizerCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
  options = {},
} = {}) {
  const parsed = parseArgs(args);
  if (parsed === null) return writeStatus(stdout, "invalid_cli_usage", 1);

  let helpers;
  try {
    helpers = options.helpers ?? await import("../dist/src/local-report/local-visual-candidate-selection-intent.js");
  } catch {
    return writeStatus(stdout, "build_required", 1);
  }

  try {
    const [providerExecutionReceipt, candidateObservationEnvelope, sourcePngBytes, selectionIntent] = await Promise.all([
      readBoundedJsonSnapshot(parsed.receipt, LIMITS.receipt, options),
      readBoundedJsonSnapshot(parsed.candidate, LIMITS.candidate, options),
      readBoundedSnapshot(parsed.image, LIMITS.png, options),
      readBoundedJsonSnapshot(parsed.intent, LIMITS.intent, options),
    ]);
    const selection = helpers.finalizeLocalVisualCandidateSelectionIntentV1({
      providerExecutionReceipt,
      candidateObservationEnvelope,
      sourcePngBytes,
      selectionIntent,
      confirmExactSelection: parsed.confirmExactSelection,
    });
    const output = resolve(parsed.output);
    const contents = `${JSON.stringify(selection, null, 2)}\n`;
    if (options.writeFile !== undefined) {
      await options.writeFile(output, contents, { encoding: "utf8", flag: "wx" });
    } else {
      await writeAtomicExclusive(output, contents);
    }
    stdout.write(`${JSON.stringify({
      status: "completed",
      liveProviderExecution: false,
      networkTransportUsed: false,
      selectionRecordProduced: true,
      acceptedGeometryProduced: false,
      coreInputProduced: false,
      structuredAnalyzeRun: false,
      resultJsonProduced: false,
      redacted: true,
    })}\n`);
    return 0;
  } catch {
    return writeStatus(stdout, "selection_finalization_error", 2);
  }
}

async function writeAtomicExclusive(output, contents, operations = { open, link, unlink }) {
  const temporary = resolve(dirname(output), `.${basename(output)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await operations.open(temporary, "wx", 0o600);
    await handle.writeFile(contents, { encoding: "utf8" });
    await handle.sync();
    await handle.close();
    handle = undefined;
    await operations.link(temporary, output);
  } finally {
    await handle?.close().catch(() => undefined);
    await operations.unlink(temporary).catch(() => undefined);
  }
}

function parseArgs(args) {
  const parsed = { confirmExactSelection: false };
  const valueFlags = new Map([
    ["--receipt", "receipt"],
    ["--candidate", "candidate"],
    ["--image", "image"],
    ["--intent", "intent"],
    ["--output", "output"],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--confirm-exact-selection") {
      if (parsed.confirmExactSelection) return null;
      parsed.confirmExactSelection = true;
      continue;
    }
    const field = valueFlags.get(arg);
    const value = args[index + 1];
    if (field === undefined || typeof value !== "string" || value.length === 0 || parsed[field] !== undefined) return null;
    parsed[field] = value;
    index += 1;
  }
  return parsed.confirmExactSelection
    && [...valueFlags.values()].every((field) => typeof parsed[field] === "string")
    ? parsed
    : null;
}

async function readBoundedJsonSnapshot(path, maxBytes, options) {
  const bytes = await readBoundedSnapshot(path, maxBytes, options);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function readBoundedSnapshot(path, maxBytes, options) {
  const resolved = resolve(path);
  if (options.readSnapshot !== undefined) return options.readSnapshot(resolved, maxBytes);
  const handle = await (options.open ?? open)(resolved, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size < 1 || before.size > maxBytes) throw new Error("InputSizeRejected");
    const bytes = new Uint8Array(await handle.readFile());
    const after = await handle.stat();
    if (bytes.byteLength !== before.size
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || after.ino !== before.ino) {
      throw new Error("InputChangedDuringRead");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

function writeStatus(stdout, status, exitCode) {
  stdout.write(`${JSON.stringify({
    status,
    liveProviderExecution: false,
    networkTransportUsed: false,
    selectionRecordProduced: false,
    acceptedGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    redacted: true,
  })}\n`);
  return exitCode;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runLocalVisualCandidateSelectionFinalizerCli();
}
