declare module "pg" {
  export interface PoolConfig {
    readonly connectionString?: string;
    readonly max?: number;
    readonly connectionTimeoutMillis?: number;
    readonly idleTimeoutMillis?: number;
    readonly query_timeout?: number;
    readonly statement_timeout?: number;
    readonly allowExitOnIdle?: boolean;
    readonly ssl?: false | { readonly ca?: string; readonly rejectUnauthorized?: boolean };
  }

  export interface PoolClient {
    readonly query: (sql: string, values?: readonly unknown[]) => Promise<unknown>;
    readonly release: (error?: Error) => void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    readonly options: PoolConfig;
    on(event: "error", listener: (error: Error) => void): this;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
