import { spawn } from "node:child_process";

export type CodexRole = "planner" | "implementer" | "reviewer" | "repair";
export type CodexSandbox = "read-only" | "workspace-write";

export interface CodexExecHelpSupport {
  readonly json: boolean;
  readonly outputLastMessage: boolean;
  readonly outputSchema: boolean;
  readonly sandbox: boolean;
}

export interface BuildCodexInvocationOptions {
  readonly codexBin: string;
  readonly role: CodexRole;
  readonly promptFile: string;
  readonly sandbox: CodexSandbox;
  readonly model?: string;
  readonly outputLastMessageFile?: string;
  readonly outputSchemaFile?: string;
  readonly help: CodexExecHelpSupport;
}

export interface CodexInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly shell: false;
  readonly role: CodexRole;
}

export interface CodexExecutionOptions {
  readonly cwd: string;
  readonly timeoutMs: number;
}

export interface CodexExecutionResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
}

export function inspectCodexExecHelpText(helpText: string): CodexExecHelpSupport {
  return {
    json: helpText.includes("--json"),
    outputLastMessage: helpText.includes("--output-last-message"),
    outputSchema: helpText.includes("--output-schema"),
    sandbox: helpText.includes("--sandbox"),
  };
}

export function buildCodexRoleInvocation(options: BuildCodexInvocationOptions): CodexInvocation {
  const args: string[] = ["exec"];
  if (options.help.json) {
    args.push("--json");
  }
  if (options.help.sandbox) {
    args.push("--sandbox", options.sandbox);
  }
  if (options.model !== undefined && options.model.length > 0) {
    args.push("--model", options.model);
  }
  if (options.help.outputLastMessage && options.outputLastMessageFile !== undefined) {
    args.push("--output-last-message", options.outputLastMessageFile);
  }
  if (options.help.outputSchema && options.outputSchemaFile !== undefined) {
    args.push("--output-schema", options.outputSchemaFile);
  }
  args.push("--", options.promptFile);

  if (args.some((arg) => arg === "--yolo" || arg.includes("dangerously"))) {
    throw new Error("Unsafe Codex invocation flags are forbidden.");
  }

  return {
    command: options.codexBin,
    args,
    shell: false,
    role: options.role,
  };
}

export function runCodexInvocation(
  invocation: CodexInvocation,
  options: CodexExecutionOptions,
): Promise<CodexExecutionResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(invocation.command, [...invocation.args], {
      cwd: options.cwd,
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
    }, options.timeoutMs);

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
        exitCode: 127,
        stdout,
        stderr: error.message,
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
        exitCode: code,
        stdout,
        stderr,
        durationMs: Date.now() - start,
        timedOut,
      });
    });
  });
}
