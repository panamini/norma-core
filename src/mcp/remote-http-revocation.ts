import { createHmac } from "node:crypto";

export interface RemoteMcpRevocationLookup {
  readonly subjectId: string;
  readonly clientId: string;
  readonly audience: string;
  readonly issuedAt: number;
}

export interface RemoteMcpRevocationEvent {
  /** HMAC-hashed provider subject; raw claims must never enter the registry. */
  readonly subjectId: string;
  /** Omit to revoke the subject across clients. */
  readonly clientId?: string;
  /** Omit to revoke the subject across audiences. */
  readonly audience?: string;
  readonly revokedAt: number;
}

export interface RemoteMcpRevocationRegistry {
  /** Implementations must reject lookup failures to keep authentication fail-closed. */
  isRevoked(lookup: RemoteMcpRevocationLookup): boolean | Promise<boolean>;
}

export interface RemoteMcpRevocationWriter {
  record(event: RemoteMcpRevocationEvent): void | Promise<void>;
}

/** Hashes a provider subject without exposing or retaining the raw claim. */
export function hashRemoteMcpSubject(auditHashKey: string, subject: string): string {
  const normalizedSubject = subject.trim();
  if (normalizedSubject === "") {
    throw new Error("Invalid revocation subject");
  }
  return createHmac("sha256", auditHashKey).update(normalizedSubject).digest("hex");
}

/** Domain-separated HMAC identifier for claim values kept out of storage. */
export function hashRemoteMcpRevocationScope(
  auditHashKey: string,
  kind: "client" | "audience",
  value: string,
): string {
  if (value.trim() === "") {
    throw new Error("Invalid revocation scope");
  }
  return createHmac("sha256", auditHashKey).update(`${kind}\u0000${value}`).digest("hex");
}

/**
 * Deterministic test registry only; production needs a durable, shared store
 * and an authenticated provider event adapter before enabling this dependency.
 */
export class InMemoryRemoteMcpRevocationRegistry
  implements RemoteMcpRevocationRegistry, RemoteMcpRevocationWriter {
  private readonly events: RemoteMcpRevocationEvent[] = [];

  record(event: RemoteMcpRevocationEvent): void {
    validateEvent(event);
    const existingIndex = this.events.findIndex((candidate) => sameEventScope(candidate, event));
    if (existingIndex === -1) {
      this.events.push({ ...event });
      return;
    }
    const existing = this.events[existingIndex];
    if (existing !== undefined && event.revokedAt > existing.revokedAt) {
      this.events[existingIndex] = { ...existing, revokedAt: event.revokedAt };
    }
  }

  isRevoked(lookup: RemoteMcpRevocationLookup): boolean {
    validateLookup(lookup);
    return this.events.some((event) => (
      event.subjectId === lookup.subjectId
      && (event.clientId === undefined || event.clientId === lookup.clientId)
      && (event.audience === undefined || event.audience === lookup.audience)
      && lookup.issuedAt <= event.revokedAt
    ));
  }
}

function sameEventScope(
  left: RemoteMcpRevocationEvent,
  right: RemoteMcpRevocationEvent,
): boolean {
  return left.subjectId === right.subjectId
    && left.clientId === right.clientId
    && left.audience === right.audience;
}

function validateLookup(lookup: RemoteMcpRevocationLookup): void {
  if (!isSubjectId(lookup.subjectId)
    || !isIdentifier(lookup.clientId)
    || !isIdentifier(lookup.audience)
    || !isUnixSecond(lookup.issuedAt)) {
    throw new Error("Invalid revocation lookup");
  }
}

function validateEvent(event: RemoteMcpRevocationEvent): void {
  if (!isSubjectId(event.subjectId)
    || (event.clientId !== undefined && !isIdentifier(event.clientId))
    || (event.audience !== undefined && !isIdentifier(event.audience))
    || !isUnixSecond(event.revokedAt)) {
    throw new Error("Invalid revocation event");
  }
}

function isSubjectId(value: string): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isIdentifier(value: string): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function isUnixSecond(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
