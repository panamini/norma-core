export interface AuthenticatedRequestContext {
  readonly subject: string;
  readonly tenant: string;
  readonly scopes: readonly string[];
  readonly audience: string;
  readonly expiresAt: number;
}

export interface AuthorizationDataRecord {
  readonly id: string;
  readonly tenant: string;
  readonly payload: unknown;
}

export interface AuthorizationDataTransaction {
  readonly readRecord: (recordId: string) => Promise<AuthorizationDataRecord | null>;
}

export interface AuthorizationDataAdapter {
  readonly withTransaction: <T>(
    context: AuthenticatedRequestContext | undefined,
    operation: (transaction: AuthorizationDataTransaction) => Promise<T>,
  ) => Promise<T>;
}

export interface PostgreSqlAuthorizationConnection {
  readonly query: (
    sql: string,
    values?: readonly unknown[],
  ) => Promise<unknown>;
  readonly release: (error?: Error) => void;
}

export interface PostgreSqlAuthorizationPool {
  readonly connect: () => Promise<PostgreSqlAuthorizationConnection>;
}

export interface PostgreSqlAuthorizationSettingNames {
  readonly subject: string;
  readonly tenant: string;
  readonly scopes: string;
  readonly audience: string;
  readonly expiresAt: string;
}

export interface PostgreSqlAuthorizationDataAdapterOptions {
  readonly pool: PostgreSqlAuthorizationPool;
  readonly requiredScope: string;
  readonly settingNames: PostgreSqlAuthorizationSettingNames;
  readonly readRecord: (
    connection: PostgreSqlAuthorizationConnection,
    recordId: string,
  ) => Promise<AuthorizationDataRecord | null>;
  readonly nowSeconds?: () => number;
}

const AUTHENTICATED_REQUEST_CONTEXT_KEYS = [
  "audience",
  "expiresAt",
  "scopes",
  "subject",
  "tenant",
] as const;

export class AuthorizationDataAccessDeniedError extends Error {
  constructor(message = "Authorization data access denied") {
    super(message);
    this.name = "AuthorizationDataAccessDeniedError";
  }
}

export function assertValidAuthenticatedRequestContext(
  context: AuthenticatedRequestContext | undefined,
  requiredScope: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): asserts context is AuthenticatedRequestContext {
  if (context === undefined || typeof context !== "object" || Array.isArray(context)) {
    throw new AuthorizationDataAccessDeniedError("Authenticated request context is required");
  }

  const actualKeys = Object.keys(context).sort();
  if (actualKeys.length !== AUTHENTICATED_REQUEST_CONTEXT_KEYS.length
    || actualKeys.some((key, index) => key !== AUTHENTICATED_REQUEST_CONTEXT_KEYS[index])) {
    throw new AuthorizationDataAccessDeniedError("Authenticated request context shape is invalid");
  }

  if (!isNonEmptyString(context.subject)
    || !isNonEmptyString(context.tenant)
    || !isNonEmptyString(context.audience)
    || !Array.isArray(context.scopes)
    || context.scopes.some((scope) => !isNonEmptyString(scope))
    || !context.scopes.includes(requiredScope)
    || !Number.isSafeInteger(context.expiresAt)
    || context.expiresAt <= nowSeconds) {
    throw new AuthorizationDataAccessDeniedError("Authenticated request context is invalid");
  }
}

export function createInMemoryRlsDataAdapter(
  records: readonly AuthorizationDataRecord[],
  requiredScope: string,
): AuthorizationDataAdapter {
  const recordsById = new Map<string, AuthorizationDataRecord>();
  for (const record of records) {
    if (!isNonEmptyString(record.id) || !isNonEmptyString(record.tenant)) {
      throw new Error("RLS proof records require non-empty id and tenant values");
    }
    if (recordsById.has(record.id)) {
      throw new Error(`Duplicate RLS proof record: ${record.id}`);
    }
    recordsById.set(record.id, Object.freeze({ ...record }));
  }

  return {
    async withTransaction(context, operation) {
      assertValidAuthenticatedRequestContext(context, requiredScope);
      let closed = false;
      const transaction: AuthorizationDataTransaction = Object.freeze({
        async readRecord(recordId: string): Promise<AuthorizationDataRecord | null> {
          if (closed) {
            throw new AuthorizationDataAccessDeniedError("Authorization transaction is closed");
          }
          const record = recordsById.get(recordId);
          return record === undefined || record.tenant !== context.tenant ? null : record;
        },
      });

      try {
        return await operation(transaction);
      } finally {
        closed = true;
      }
    },
  };
}

export function createPostgreSqlAuthorizationDataAdapter(
  options: PostgreSqlAuthorizationDataAdapterOptions,
): AuthorizationDataAdapter {
  const settingEntries = authorizationSettingEntries(options.settingNames);

  return {
    async withTransaction(context, operation) {
      assertValidAuthenticatedRequestContext(
        context,
        options.requiredScope,
        options.nowSeconds?.() ?? Math.floor(Date.now() / 1_000),
      );

      const contextValues = authorizationContextValues(context);
      const connection = await options.pool.connect();
      let transactionStarted = false;
      let closed = false;
      let releaseError: Error | undefined;
      const inFlightReads = new Set<Promise<AuthorizationDataRecord | null>>();
      const waitForInFlightReads = async (): Promise<void> => {
        await Promise.all(inFlightReads);
      };
      const settleInFlightReads = async (): Promise<void> => {
        await Promise.allSettled(inFlightReads);
      };
      const transaction: AuthorizationDataTransaction = Object.freeze({
        async readRecord(recordId: string): Promise<AuthorizationDataRecord | null> {
          if (closed) {
            throw new AuthorizationDataAccessDeniedError("Authorization transaction is closed");
          }
          let readPromise: Promise<AuthorizationDataRecord | null>;
          try {
            readPromise = options.readRecord(connection, recordId);
          } catch (error) {
            readPromise = Promise.reject(error);
          }
          inFlightReads.add(readPromise);
          try {
            return await readPromise;
          } finally {
            inFlightReads.delete(readPromise);
          }
        },
      });

      try {
        await connection.query("BEGIN");
        transactionStarted = true;
        for (const [contextKey, settingName] of settingEntries) {
          await connection.query(
            "SELECT set_config($1, $2, true)",
            [settingName, contextValues[contextKey]],
          );
        }
        const result = await operation(transaction);
        closed = true;
        await waitForInFlightReads();
        await connection.query("COMMIT");
        transactionStarted = false;
        await resetAuthorizationSettings(connection, settingEntries);
        return result;
      } catch (error) {
        closed = true;
        if (transactionStarted) {
          await settleInFlightReads();
          try {
            await connection.query("ROLLBACK");
          } catch (rollbackError) {
            releaseError = toError(rollbackError);
            throw new AggregateError(
              [error, rollbackError],
              "Authorization transaction and rollback failed",
            );
          }
          try {
            await resetAuthorizationSettings(connection, settingEntries);
          } catch (resetError) {
            releaseError = toError(resetError);
            throw new AggregateError(
              [error, resetError],
              "Authorization transaction reset failed",
            );
          }
        } else {
          releaseError = toError(error);
        }
        throw error;
      } finally {
        closed = true;
        connection.release(releaseError);
      }
    },
  };
}

async function resetAuthorizationSettings(
  connection: PostgreSqlAuthorizationConnection,
  settingEntries: ReadonlyArray<readonly [keyof PostgreSqlAuthorizationSettingNames, string]>,
): Promise<void> {
  for (const [, settingName] of settingEntries) {
    // settingName is validated before this helper is reached; RESET clears the
    // session-level value that pooled PostgreSQL connections retain after ROLLBACK.
    await connection.query(`RESET ${settingName}`);
  }
}

function authorizationSettingEntries(
  settingNames: PostgreSqlAuthorizationSettingNames,
): ReadonlyArray<readonly [keyof PostgreSqlAuthorizationSettingNames, string]> {
  const entries = Object.entries(settingNames) as Array<
    [keyof PostgreSqlAuthorizationSettingNames, string]
  >;
  const keys = entries.map(([key]) => key).sort();
  if (keys.length !== AUTHENTICATED_REQUEST_CONTEXT_KEYS.length
    || keys.some((key, index) => key !== AUTHENTICATED_REQUEST_CONTEXT_KEYS[index])
    || entries.some(([, name]) => !isValidPostgreSqlSettingName(name))
    || new Set(entries.map(([, name]) => name)).size !== entries.length) {
    throw new Error("PostgreSQL authorization setting names are invalid");
  }
  return Object.freeze(entries.map(([key, value]) => Object.freeze([key, value] as const)));
}

function authorizationContextValues(
  context: AuthenticatedRequestContext,
): Readonly<Record<keyof PostgreSqlAuthorizationSettingNames, string>> {
  return Object.freeze({
    subject: context.subject,
    tenant: context.tenant,
    scopes: JSON.stringify(context.scopes),
    audience: context.audience,
    expiresAt: String(context.expiresAt),
  });
}

function isValidPostgreSqlSettingName(value: unknown): value is string {
  return typeof value === "string"
    && /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u.test(value);
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error("PostgreSQL rollback failed");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
