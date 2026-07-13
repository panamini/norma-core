declare module "node:crypto" {
  interface Hash {
    update(data: string): Hash;
    digest(encoding: "hex"): string;
  }

  export function createHash(algorithm: "sha256"): Hash;
  export function createHmac(algorithm: "sha256", key: string): Hash;
  export function randomUUID(): string;
}
