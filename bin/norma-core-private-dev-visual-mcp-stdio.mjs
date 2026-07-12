import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
} from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export {
  createPrivateDevLocalVisualMcpFilesystemRuntimeV1,
  readPrivateDevLocalVisualMcpBoundedJsonSnapshot,
  resolvePrivateDevLocalVisualMcpJobRootV1,
  runPrivateDevLocalVisualMcpStdioCli,
  writePrivateDevLocalVisualMcpArtifactsAtomically,
};

const FILE_LIMITS = Object.freeze({
  "provider-execution-receipt.json": 64 * 1024,
  "candidate-observation.json": 256 * 1024,
  "human-candidate-selection.json": 64 * 1024,
});
const OUTPUT_DIRECTORY_NAME = "norma-output";
const OUTPUT_LOCK_NAME = ".norma-output.lock";
const URL_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;

async function runPrivateDevLocalVisualMcpStdioCli({
  args = process.argv.slice(2),
  stdin = process.stdin,
  stdout = process.stdout,
  stderr = process.stderr,
  options = {},
} = {}) {
  const parsed = parseArgs(args);
  if (parsed === null) return writeStartupError(stderr, "invalid_cli_usage", 1);
  if (!parsed.enabled) return writeStartupError(stderr, "disabled_by_default", 2);

  let protocolModule;
  let orchestrationModule;
  try {
    protocolModule = options.protocolModule
      ?? await import("../dist/src/mcp/private-dev-local-visual-mcp-protocol.js");
    orchestrationModule = options.orchestrationModule
      ?? await import("../dist/src/local-report/private-dev-local-visual-mcp-orchestration.js");
  } catch {
    return writeStartupError(stderr, "build_required", 1);
  }

  let jobRoot;
  let jobRootIdentity;
  try {
    jobRoot = await resolvePrivateDevLocalVisualMcpJobRootV1(parsed.jobRoot, options);
    jobRootIdentity = await captureJobRootIdentity(jobRoot, options);
    await requireOutputAbsent(join(jobRoot, OUTPUT_DIRECTORY_NAME), options);
  } catch {
    return writeStartupError(stderr, "invalid_job_root", 1);
  }

  const runtime = createPrivateDevLocalVisualMcpFilesystemRuntimeV1({
    jobRoot,
    jobRootIdentity,
    orchestrationModule,
    options,
  });
  const protocol = new protocolModule.PrivateDevLocalVisualMcpProtocolV1(runtime);
  attachStdioTransport({
    protocol,
    stdin,
    stdout,
    maxRequestBytes: protocolModule.PRIVATE_DEV_LOCAL_VISUAL_MCP_MAX_REQUEST_BYTES,
  });
  return 0;
}

function createPrivateDevLocalVisualMcpFilesystemRuntimeV1({
  jobRoot,
  jobRootIdentity,
  orchestrationModule,
  options = {},
}) {
  return {
    async inspect(signal) {
      throwIfAborted(signal);
      await requireCurrentJobRoot(jobRoot, jobRootIdentity, options);
      await requireOutputAbsent(join(jobRoot, OUTPUT_DIRECTORY_NAME), options);
      const artifacts = await readJobArtifacts(jobRoot, signal, options);
      throwIfAborted(signal);
      await requireCurrentJobRoot(jobRoot, jobRootIdentity, options);
      return orchestrationModule.inspectPrivateDevLocalVisualMcpJobV1(artifacts);
    },
    async resume(request, signal, markCommitted) {
      throwIfAborted(signal);
      await requireCurrentJobRoot(jobRoot, jobRootIdentity, options);
      const outputDirectory = join(jobRoot, OUTPUT_DIRECTORY_NAME);
      await requireOutputAbsent(outputDirectory, options);
      const artifacts = await readJobArtifacts(jobRoot, signal, options);
      throwIfAborted(signal);
      await requireCurrentJobRoot(jobRoot, jobRootIdentity, options);
      const execution = orchestrationModule.resumePrivateDevLocalVisualMcpJobV1(
        artifacts,
        request,
      );
      throwIfAborted(signal);
      await writePrivateDevLocalVisualMcpArtifactsAtomically(
        jobRoot,
        execution.artifactContents,
        signal,
        markCommitted,
        { ...options, expectedJobRootIdentity: jobRootIdentity },
      );
      return execution.result;
    },
  };
}

async function resolvePrivateDevLocalVisualMcpJobRootV1(jobRoot, options = {}) {
  if (typeof jobRoot !== "string"
    || jobRoot.length === 0
    || !isAbsolute(jobRoot)
    || (URL_SCHEME_PATTERN.test(jobRoot) && !WINDOWS_DRIVE_PATH_PATTERN.test(jobRoot))) {
    throw toolError("unsafe_artifact");
  }
  const resolved = resolve(jobRoot);
  const info = await (options.lstat ?? lstat)(resolved);
  if (info.isSymbolicLink() || !info.isDirectory()) throw toolError("unsafe_artifact");
  const canonical = await (options.realpath ?? realpath)(resolved);
  if (canonical !== resolved) throw toolError("unsafe_artifact");
  return canonical;
}

async function captureJobRootIdentity(jobRoot, options) {
  const info = await (options.lstat ?? lstat)(jobRoot);
  if (info.isSymbolicLink() || !info.isDirectory()) throw toolError("unsafe_artifact");
  return Object.freeze({ dev: info.dev, ino: info.ino });
}

async function requireCurrentJobRoot(jobRoot, expectedIdentity, options) {
  const info = await (options.lstat ?? lstat)(jobRoot);
  if (info.isSymbolicLink() || !info.isDirectory()) throw toolError("unsafe_artifact");
  if (await (options.realpath ?? realpath)(jobRoot) !== jobRoot
    || (expectedIdentity !== undefined
      && (info.dev !== expectedIdentity.dev || info.ino !== expectedIdentity.ino))) {
    throw toolError("unsafe_artifact");
  }
}

async function readJobArtifacts(jobRoot, signal, options) {
  const names = Object.keys(FILE_LIMITS);
  const values = await Promise.all(names.map(async (name) => {
    throwIfAborted(signal);
    const value = await readPrivateDevLocalVisualMcpBoundedJsonSnapshot(
      join(jobRoot, name),
      FILE_LIMITS[name],
      options,
    );
    throwIfAborted(signal);
    return value;
  }));
  return {
    providerExecutionReceipt: values[0],
    candidateObservationEnvelope: values[1],
    humanCandidateSelection: values[2],
  };
}

async function readPrivateDevLocalVisualMcpBoundedJsonSnapshot(path, maxBytes, options = {}) {
  let bytes;
  try {
    bytes = await readBoundedSnapshot(path, maxBytes, options);
  } catch (error) {
    if (error?.code === "ENOENT") throw toolError("missing_required_artifact");
    if (isToolError(error)) throw error;
    throw toolError("unsafe_artifact");
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw toolError("malformed_artifact");
  }
}

async function readBoundedSnapshot(path, maxBytes, options) {
  const expected = resolve(path);
  const info = await (options.lstat ?? lstat)(expected);
  if (info.isSymbolicLink() || !info.isFile()) throw toolError("unsafe_artifact");
  if (await (options.realpath ?? realpath)(expected) !== expected) {
    throw toolError("unsafe_artifact");
  }

  const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
  const handle = await (options.open ?? open)(expected, constants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw toolError("unsafe_artifact");
    if (before.size < 1 || before.size > maxBytes) throw toolError("artifact_too_large");
    const bytes = new Uint8Array(before.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const { bytesRead } = await handle.read(
        bytes,
        offset,
        bytes.byteLength - offset,
        offset,
      );
      if (bytesRead === 0) throw toolError("unsafe_artifact");
      offset += bytesRead;
    }
    const after = await handle.stat();
    if (after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || after.ino !== before.ino
      || (before.dev !== undefined && after.dev !== before.dev)) {
      throw toolError("unsafe_artifact");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function writePrivateDevLocalVisualMcpArtifactsAtomically(
  jobRoot,
  artifacts,
  signal,
  markCommitted,
  options = {},
) {
  const makeDirectory = options.mkdir ?? mkdir;
  const move = options.rename ?? rename;
  const remove = options.rm ?? rm;
  const outputDirectory = join(jobRoot, OUTPUT_DIRECTORY_NAME);
  const lockDirectory = join(jobRoot, OUTPUT_LOCK_NAME);
  const stagingDirectory = join(jobRoot, `.norma-output.staging-${randomUUID()}`);
  let lockHeld = false;
  let outputReservationIdentity;
  let published = false;
  try {
    throwIfAborted(signal);
    await requireCurrentJobRoot(jobRoot, options.expectedJobRootIdentity, options);
    try {
      await makeDirectory(lockDirectory, { recursive: false });
    } catch (error) {
      if (error?.code === "EEXIST") throw toolError("job_busy");
      throw error;
    }
    lockHeld = true;
    await requireCurrentJobRoot(jobRoot, options.expectedJobRootIdentity, options);
    await requireOutputAbsent(outputDirectory, options);
    await makeDirectory(stagingDirectory, { recursive: false, mode: 0o700 });

    const entries = Object.entries(artifacts);
    if (entries.length === 0 || typeof artifacts["result.json"] !== "string") {
      throw toolError("artifact_write_failed");
    }
    for (const [name] of entries) {
      if (!isSafeArtifactName(name)) throw toolError("artifact_write_failed");
    }
    const ordered = entries
      .filter(([name]) => name !== "result.json")
      .sort(([left], [right]) => left.localeCompare(right));
    for (const [name, contents] of ordered) {
      throwIfAborted(signal);
      await writeExclusiveFile(join(stagingDirectory, name), contents, options);
    }
    throwIfAborted(signal);
    await writeExclusiveFile(
      join(stagingDirectory, "result.json"),
      artifacts["result.json"],
      options,
    );
    throwIfAborted(signal);
    await requireCurrentJobRoot(jobRoot, options.expectedJobRootIdentity, options);
    await requireOutputAbsent(outputDirectory, options);
    if ((options.platform ?? process.platform) !== "win32") {
      await makeDirectory(outputDirectory, { recursive: false, mode: 0o700 });
      const reservation = await (options.lstat ?? lstat)(outputDirectory);
      if (reservation.isSymbolicLink() || !reservation.isDirectory()) {
        throw toolError("output_exists");
      }
      outputReservationIdentity = { dev: reservation.dev, ino: reservation.ino };
      await requireOwnedEmptyDirectory(
        outputDirectory,
        outputReservationIdentity,
        options,
      );
    }
    await move(stagingDirectory, outputDirectory);
    published = true;
    markCommitted();
  } catch (error) {
    if (error?.code === "EEXIST" || error?.code === "ENOTEMPTY") {
      throw toolError("output_exists");
    }
    if (isToolError(error) || signal.aborted) throw error;
    throw toolError("artifact_write_failed");
  } finally {
    const cleanupAllowed = await requireCurrentJobRoot(
      jobRoot,
      options.expectedJobRootIdentity,
      options,
    ).then(() => true, () => false);
    if (cleanupAllowed) {
      await remove(stagingDirectory, { recursive: true, force: true }).catch(() => undefined);
      if (!published && outputReservationIdentity !== undefined) {
        await removeOwnedEmptyDirectory(
          outputDirectory,
          outputReservationIdentity,
          options,
        );
      }
      if (lockHeld) {
        await remove(lockDirectory, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }
}

async function requireOwnedEmptyDirectory(path, expectedIdentity, options) {
  const info = await (options.lstat ?? lstat)(path);
  if (info.isSymbolicLink() || !info.isDirectory()
    || info.dev !== expectedIdentity.dev || info.ino !== expectedIdentity.ino
    || (await (options.readdir ?? readdir)(path)).length !== 0) {
    throw toolError("output_exists");
  }
}

async function removeOwnedEmptyDirectory(path, expectedIdentity, options) {
  try {
    const info = await (options.lstat ?? lstat)(path);
    if (info.isSymbolicLink() || !info.isDirectory()
      || info.dev !== expectedIdentity.dev || info.ino !== expectedIdentity.ino) {
      return;
    }
    await (options.rmdir ?? rmdir)(path);
  } catch {
    // Preserve a substituted or non-empty directory rather than deleting unowned data.
  }
}

async function writeExclusiveFile(path, contents, options) {
  if (typeof contents !== "string") throw toolError("artifact_write_failed");
  const handle = await (options.open ?? open)(path, "wx", 0o600);
  try {
    await handle.writeFile(contents, { encoding: "utf8" });
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function requireOutputAbsent(path, options) {
  try {
    await (options.lstat ?? lstat)(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw toolError("output_exists");
}

function attachStdioTransport({ protocol, stdin, stdout, maxRequestBytes }) {
  let pending = "";
  let pendingBytes = 0;
  let droppingOversizedLine = false;
  let writeChain = Promise.resolve();
  const encoder = new TextEncoder();

  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => {
    let start = 0;
    while (start <= chunk.length) {
      const newline = chunk.indexOf("\n", start);
      if (newline === -1) {
        append(chunk.slice(start));
        return;
      }
      append(chunk.slice(start, newline));
      flush();
      start = newline + 1;
    }
  });
  stdin.on("end", () => {
    if (droppingOversizedLine) {
      queueResponse(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Invalid Request" },
      }));
    } else if (pending !== "") {
      processLine(pending.replace(/\r$/u, ""));
    }
    reset();
  });

  function append(segment) {
    if (segment === "" || droppingOversizedLine) return;
    const trailingCrBytes = pending.endsWith("\r") ? 1 : 0;
    const nextTrailingCrBytes = segment.endsWith("\r") ? 1 : 0;
    const nextBytes = pendingBytes + trailingCrBytes
      + encoder.encode(segment).length - nextTrailingCrBytes;
    if (nextBytes > maxRequestBytes) {
      reset();
      droppingOversizedLine = true;
      return;
    }
    pending += segment;
    pendingBytes = nextBytes;
  }

  function flush() {
    if (droppingOversizedLine) {
      queueResponse(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Invalid Request" },
      }));
      reset();
      return;
    }
    const rawLine = pending.replace(/\r$/u, "");
    reset();
    if (rawLine !== "") processLine(rawLine);
  }

  function reset() {
    pending = "";
    pendingBytes = 0;
    droppingOversizedLine = false;
  }

  function processLine(rawLine) {
    protocol.handleLine(rawLine)
      .then((response) => { if (response !== null) queueResponse(response); })
      .catch(() => queueResponse(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal error" },
      })));
  }

  function queueResponse(response) {
    writeChain = writeChain.then(() => new Promise((done) => {
      stdout.write(`${response}\n`, done);
    }));
  }
}

function parseArgs(args) {
  const parsed = { enabled: false, jobRoot: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--enable-private-dev-visual-pilot") {
      if (parsed.enabled) return null;
      parsed.enabled = true;
      continue;
    }
    if (argument === "--job-root") {
      const value = args[index + 1];
      if (parsed.jobRoot !== undefined || typeof value !== "string" || value.length === 0) {
        return null;
      }
      parsed.jobRoot = value;
      index += 1;
      continue;
    }
    return null;
  }
  return typeof parsed.jobRoot === "string" ? parsed : null;
}

function throwIfAborted(signal) {
  if (!signal.aborted) return;
  throw toolError(signal.reason === "deadline_exceeded" ? "deadline_exceeded" : "internal_error");
}

function isSafeArtifactName(name) {
  return name.length > 0
    && name === basename(name)
    && !name.includes("/")
    && !name.includes("\\")
    && name !== "."
    && name !== "..";
}

function toolError(code) {
  const error = new Error(code);
  error.name = "PrivateDevLocalVisualMcpFilesystemError";
  error.code = code;
  return error;
}

function isToolError(error) {
  return error instanceof Error
    && error.name === "PrivateDevLocalVisualMcpFilesystemError"
    && typeof error.code === "string";
}

function writeStartupError(stderr, code, exitCode) {
  stderr.write(`${code}\n`);
  return exitCode;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runPrivateDevLocalVisualMcpStdioCli();
}
