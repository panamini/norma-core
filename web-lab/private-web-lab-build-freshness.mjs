import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const BUILD_CONFIGURATION_FILES = Object.freeze([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
]);

export function privateWebLabBuildIsCurrent(repositoryRoot) {
  try {
    const sourceRoot = join(repositoryRoot, "src");
    const sourceFiles = collectTypeScriptFiles(sourceRoot);
    if (sourceFiles.length === 0) return false;

    const inputFiles = [
      ...BUILD_CONFIGURATION_FILES.map((file) => join(repositoryRoot, file)),
      ...sourceFiles,
    ];
    const newestInput = Math.max(...inputFiles.map((file) => statSync(file).mtimeMs));
    const runtimeSources = sourceFiles.filter((file) => !file.endsWith(".d.ts"));

    return runtimeSources.length > 0 && runtimeSources.every((sourceFile) => {
      const outputFile = join(
        repositoryRoot,
        "dist",
        relative(repositoryRoot, sourceFile).replace(/\.ts$/u, ".js"),
      );
      return statSync(outputFile).mtimeMs >= newestInput;
    });
  } catch {
    return false;
  }
}

function collectTypeScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}
