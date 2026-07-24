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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
