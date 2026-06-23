import { spawn } from "node:child_process";

import type {
  OrchestratorConfig,
  ValidationCategory,
  ValidationCommand,
  ValidationPlan,
  ValidationResult,
  ValidationSummary,
} from "./types.js";

interface PlanValidationOptions {
  readonly changedFiles: readonly string[];
  readonly config: OrchestratorConfig;
}

interface RunValidationOptions {
  readonly cwd: string;
  readonly commands: readonly ValidationCommand[];
  readonly dryRun: boolean;
  readonly redactedEnv?: Readonly<Record<string, string | undefined>>;
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function categoryForPath(filePath: string): ValidationCategory {
  if (filePath.endsWith(".md") || filePath.startsWith("docs/")) {
    return "documentation";
  }
  if (
    filePath.startsWith("tools/orchestrator/") ||
    filePath.startsWith(".agents/") ||
    filePath.startsWith(".orchestrator") ||
    filePath === ".orchestrator.example.json" ||
    filePath === "tests/orchestrator-v0.test.mjs"
  ) {
    return "orchestrator";
  }
  if (filePath.includes("schema") || filePath.includes("generated")) {
    return "schema";
  }
  if (filePath.startsWith("src/") || filePath === "package.json" || filePath === "tsconfig.json") {
    return "shared";
  }
  return "shared";
}

export function planValidationCommands(options: PlanValidationOptions): ValidationPlan {
  const categories = uniqueSorted(options.changedFiles.map((filePath) => categoryForPath(filePath)));
  const selectedCommands = options.config.validationCommands.filter((command) => {
    if (command.categories.length === 0) {
      return true;
    }
    return command.categories.some((category) => categories.includes(category));
  });

  return { categories, commands: selectedCommands };
}

export function redactSecrets(
  value: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  let redacted = value;
  for (const [key, secret] of Object.entries(env)) {
    if (typeof secret !== "string" || secret.length < 4) {
      continue;
    }
    if (!/(SECRET|TOKEN|PASSWORD|API_KEY|KEY|CREDENTIAL)/iu.test(key)) {
      continue;
    }
    redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted;
}

function runOneCommand(
  cwd: string,
  command: ValidationCommand,
  redactedEnv: Readonly<Record<string, string | undefined>>,
): Promise<ValidationResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command.command, [...command.args], {
      cwd,
      shell: false,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, command.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        name: command.name,
        command: command.command,
        args: command.args,
        required: command.required,
        skipped: false,
        exitCode: 127,
        stdout: redactSecrets(stdout, redactedEnv),
        stderr: redactSecrets(error.message, redactedEnv),
        durationMs: Date.now() - start,
        timedOut,
      });
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        name: command.name,
        command: command.command,
        args: command.args,
        required: command.required,
        skipped: false,
        exitCode: code,
        stdout: redactSecrets(stdout, redactedEnv),
        stderr: redactSecrets(stderr, redactedEnv),
        durationMs: Date.now() - start,
        timedOut,
      });
    });
  });
}

export async function runValidationCommands(options: RunValidationOptions): Promise<ValidationSummary> {
  const results: ValidationResult[] = [];
  for (const command of options.commands) {
    if (options.dryRun) {
      results.push({
        name: command.name,
        command: command.command,
        args: command.args,
        required: command.required,
        skipped: true,
        exitCode: null,
        stdout: "",
        stderr: "",
        durationMs: 0,
        timedOut: false,
      });
    } else {
      results.push(await runOneCommand(options.cwd, command, options.redactedEnv ?? process.env));
    }
  }

  const blocked = results.some(
    (result) => result.required && !result.skipped && (result.exitCode !== 0 || result.timedOut),
  );
  return { status: blocked ? "blocked" : "passed", results };
}
