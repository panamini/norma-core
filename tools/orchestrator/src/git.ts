import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { GitMetadata } from "./types.js";

const execFileAsync = promisify(execFile);

export async function execGit(cwd: string, args: readonly string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", [...args], {
      cwd,
      maxBuffer: 1024 * 1024,
    });
    return result.stdout.trim();
  } catch {
    return "";
  }
}

export async function getGitMetadata(cwd: string): Promise<GitMetadata> {
  const root = (await execGit(cwd, ["rev-parse", "--show-toplevel"])) || cwd;
  const origin = (await execGit(cwd, ["remote", "get-url", "origin"])) || null;
  const branch = (await execGit(cwd, ["branch", "--show-current"])) || null;
  const sha = (await execGit(cwd, ["rev-parse", "HEAD"])) || null;
  const statusText = await execGit(cwd, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const status = statusText.length > 0 ? statusText.split("\n") : [];

  return { root, origin, branch, sha, status };
}
