import { access, mkdir } from "node:fs/promises";
import path from "node:path";

import { loadOrchestratorConfig } from "./config.js";
import { getGitMetadata } from "./git.js";
import { resolveWikiPath } from "./wiki.js";

export interface DoctorFinding {
  readonly name: string;
  readonly status: "ok" | "blocked" | "warning";
  readonly message: string;
}

export interface DoctorReport {
  readonly status: "passed" | "blocked";
  readonly findings: readonly DoctorFinding[];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function commandAvailable(command: string): Promise<boolean> {
  const paths = (process.env.PATH ?? "").split(path.delimiter);
  const suffixes = process.platform === "win32" ? [".cmd", ".exe", ""] : [""];
  for (const entry of paths) {
    for (const suffix of suffixes) {
      if (await exists(path.join(entry, `${command}${suffix}`))) {
        return true;
      }
    }
  }
  return false;
}

export async function runDoctor(codeRoot: string): Promise<DoctorReport> {
  const findings: DoctorFinding[] = [];
  const config = await loadOrchestratorConfig({ codeRoot });
  const codeGit = await getGitMetadata(codeRoot);
  findings.push({
    name: "code repository",
    status: codeGit.sha === null ? "blocked" : "ok",
    message: codeGit.sha === null ? "Code root is not a Git repository." : `Git SHA ${codeGit.sha}`,
  });
  findings.push({
    name: "node",
    status: "ok",
    message: process.version,
  });
  findings.push({
    name: "package manager",
    status: (await commandAvailable("npm")) ? "ok" : "blocked",
    message: (await commandAvailable("npm")) ? "npm is available." : "npm is not available on PATH.",
  });
  findings.push({
    name: "codex",
    status: (await commandAvailable("codex")) ? "ok" : "warning",
    message: (await commandAvailable("codex"))
      ? "Codex CLI is available."
      : "Codex CLI is not available; deterministic commands still work.",
  });

  try {
    const wikiPath =
      config.wikiPath === null
        ? resolveWikiPath({})
        : resolveWikiPath({ wikiPath: config.wikiPath });
    const wikiGit = await getGitMetadata(wikiPath);
    findings.push({
      name: "wiki repository",
      status: wikiGit.sha === null ? "blocked" : "ok",
      message: wikiGit.sha === null ? `Wiki is not a Git repository: ${wikiPath}` : `Git SHA ${wikiGit.sha}`,
    });
  } catch (error) {
    findings.push({
      name: "wiki path",
      status: "blocked",
      message: error instanceof Error ? error.message : "Wiki path is unavailable.",
    });
  }

  const runDir = path.join(codeRoot, ".orchestrator", "runs");
  try {
    await mkdir(runDir, { recursive: true });
    findings.push({ name: "run directory", status: "ok", message: `Writable: ${runDir}` });
  } catch (error) {
    findings.push({
      name: "run directory",
      status: "blocked",
      message: error instanceof Error ? error.message : "Run directory is not writable.",
    });
  }

  return {
    status: findings.some((finding) => finding.status === "blocked") ? "blocked" : "passed",
    findings,
  };
}
