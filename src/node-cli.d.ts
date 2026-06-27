declare const process: {
  cwd(): string;
};

declare module "node:fs" {
  export function existsSync(path: string): boolean;
}

declare module "node:fs/promises" {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
}

declare module "node:path" {
  export function basename(path: string): string;
  export function dirname(path: string): string;
  export function join(...paths: readonly string[]): string;
  export function resolve(...paths: readonly string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}
