import { appendFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildContextPack } from "./context.js";
import { getGitMetadata, execGit } from "./git.js";
import { planValidationCommands, runValidationCommands } from "./validation.js";
import type { OrchestratorConfig } from "./types.js";

interface RunLock {
  readonly lockPath: string;
}

export interface RunOrchestrationOptions {
  readonly codeRoot: string;
  readonly task: string;
  readonly changedFiles: readonly string[];
  readonly config: OrchestratorConfig;
  readonly dryRun: boolean;
}

function timestampId(date: Date): string {
  return date.toISOString().replace(/[-:.]/gu, "");
}

export function createRunId(prefix: string, date = new Date()): string {
  return `${prefix}-${timestampId(date)}`;
}

export async function snapshotGitStatus(cwd: string): Promise<readonly string[]> {
  const text = await execGit(cwd, ["status", "--porcelain=v1", "--untracked-files=all"]);
  return text.length > 0 ? text.split("\n") : [];
}

export async function acquireRunLock(orchestratorRoot: string): Promise<RunLock> {
  await mkdir(orchestratorRoot, { recursive: true });
  const lockPath = path.join(orchestratorRoot, "run.lock");
  try {
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), {
      flag: "wx",
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new Error(`Another orchestrator run is active: ${lockPath}`);
    }
    throw error;
  }
  return { lockPath };
}

export async function releaseRunLock(lock: RunLock): Promise<void> {
  await rm(lock.lockPath, { force: true });
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, filePath);
}

export async function writeRunEvent(runDir: string, event: Readonly<Record<string, unknown>>): Promise<void> {
  await mkdir(runDir, { recursive: true });
  await appendFile(path.join(runDir, "events.jsonl"), `${JSON.stringify(event)}\n`);
}

async function readTaskText(task: string): Promise<string> {
  if (task.startsWith("@")) {
    return readFile(task.slice(1), "utf8");
  }
  return task;
}

export async function runOrchestration(options: RunOrchestrationOptions): Promise<{
  readonly runDir: string;
  readonly status: "READY_TO_REVIEW" | "BLOCKED";
}> {
  const task = await readTaskText(options.task);
  const orchestratorRoot = path.join(options.codeRoot, ".orchestrator");
  const lock = await acquireRunLock(orchestratorRoot);
  const runId = createRunId(options.dryRun ? "dry-run" : "run");
  const runDir = path.join(orchestratorRoot, "runs", runId);

  try {
    await mkdir(runDir, { recursive: true });
    const wikiStatusBefore =
      options.config.wikiPath === null ? [] : await snapshotGitStatus(options.config.wikiPath);
    const codeGit = await getGitMetadata(options.codeRoot);
    const wikiGit = options.config.wikiPath === null ? null : await getGitMetadata(options.config.wikiPath);
    await writeJsonAtomic(path.join(runDir, "metadata.json"), {
      runId,
      dryRun: options.dryRun,
      complete: false,
      code: codeGit,
      wiki: wikiGit,
    });
    await writeRunEvent(runDir, { type: "start", dryRun: options.dryRun });

    const contextPack = await buildContextPack({
      codeRoot: options.codeRoot,
      task,
      config: options.config,
    });
    await writeFile(path.join(runDir, "context.md"), contextPack.markdown);
    await writeJsonAtomic(path.join(runDir, "selection.json"), contextPack.selection);
    await writeRunEvent(runDir, { type: "context", selected: contextPack.selection.selected.length });

    const validationPlan = planValidationCommands({
      changedFiles: options.changedFiles,
      config: options.config,
    });
    const validation = await runValidationCommands({
      cwd: options.codeRoot,
      commands: validationPlan.commands,
      dryRun: options.dryRun,
    });
    await writeJsonAtomic(path.join(runDir, "validation.json"), validation);
    await writeRunEvent(runDir, { type: "validation", status: validation.status });

    const wikiStatusAfter =
      options.config.wikiPath === null ? [] : await snapshotGitStatus(options.config.wikiPath);
    const wikiUnchanged = JSON.stringify(wikiStatusBefore) === JSON.stringify(wikiStatusAfter);
    const status = validation.status === "passed" && wikiUnchanged ? "READY_TO_REVIEW" : "BLOCKED";
    await writeJsonAtomic(path.join(runDir, "plan.json"), {
      status: options.dryRun ? "dry-run" : "not-invoked",
      note: "Planner Codex execution is available through the adapter and is not invoked by tests.",
    });
    await writeJsonAtomic(path.join(runDir, "implementation.json"), {
      status: options.dryRun ? "dry-run" : "not-invoked",
    });
    await writeJsonAtomic(path.join(runDir, "review.json"), {
      status: options.dryRun ? "dry-run" : "not-invoked",
    });
    await writeFile(
      path.join(runDir, "proposed-wiki-writeback.md"),
      "# Proposed Wiki Writeback\n\nNo automatic wiki writeback is performed by v0.\n",
    );
    await writeJsonAtomic(path.join(runDir, "final.json"), {
      status,
      wikiUnchanged,
      validationStatus: validation.status,
    });
    await writeJsonAtomic(path.join(runDir, "metadata.json"), {
      runId,
      dryRun: options.dryRun,
      complete: true,
      code: codeGit,
      wiki: wikiGit,
    });
    return { runDir, status };
  } finally {
    await releaseRunLock(lock);
  }
}
