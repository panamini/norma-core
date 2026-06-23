#!/usr/bin/env node
import { loadOrchestratorConfig } from "./config.js";
import { buildContextPack } from "./context.js";
import { runDoctor } from "./doctor.js";
import { planValidationCommands, runValidationCommands } from "./validation.js";
import { runOrchestration } from "./run.js";

function argValue(args: readonly string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

function hasFlag(args: readonly string[], name: string): boolean {
  return args.includes(name);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";
  const codeRoot = process.cwd();
  const config = await loadOrchestratorConfig({ codeRoot });

  if (command === "doctor") {
    const report = await runDoctor(codeRoot);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === "passed" ? 0 : 1;
    return;
  }

  if (command === "context") {
    const task = argValue(args, "--task") ?? "";
    if (task.length === 0) {
      throw new Error("context requires --task <task text>");
    }
    const pack = await buildContextPack({ codeRoot, task, config });
    console.log(pack.markdown);
    return;
  }

  if (command === "validate") {
    const changed = (argValue(args, "--changed") ?? "tools/orchestrator/src/cli.ts").split(",");
    const plan = planValidationCommands({ changedFiles: changed, config });
    const summary = await runValidationCommands({
      cwd: codeRoot,
      commands: plan.commands,
      dryRun: hasFlag(args, "--dry-run"),
    });
    console.log(JSON.stringify({ plan, summary }, null, 2));
    process.exitCode = summary.status === "passed" ? 0 : 1;
    return;
  }

  if (command === "run") {
    const task = argValue(args, "--task") ?? "";
    if (task.length === 0) {
      throw new Error("run requires --task <task text>");
    }
    const changed = (argValue(args, "--changed") ?? "tools/orchestrator/src/cli.ts").split(",");
    const result = await runOrchestration({
      codeRoot,
      task,
      changedFiles: changed,
      config,
      dryRun: hasFlag(args, "--dry-run"),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "READY_TO_REVIEW" ? 0 : 1;
    return;
  }

  console.log(
    [
      "Usage:",
      "  npm run orchestrator:doctor",
      "  npm run orchestrator:context -- --task <task>",
      "  npm run orchestrator:validate -- --changed <path[,path]> [--dry-run]",
      "  npm run orchestrator:run -- --task <task> [--changed <path[,path]>] [--dry-run]",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
