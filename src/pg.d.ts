declare module "pg" {
  export interface PoolConfig {
    readonly connectionString?: string;
    readonly max?: number;
    readonly connectionTimeoutMillis?: number;
    readonly idleTimeoutMillis?: number;
    readonly allowExitOnIdle?: boolean;
    readonly ssl?: false | { readonly rejectUnauthorized?: boolean };
  }

  export interface PoolClient {
    readonly query: (sql: string, values?: readonly unknown[]) => Promise<unknown>;
    readonly release: (error?: Error) => void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    on(event: "error", listener: (error: Error) => void): this;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
