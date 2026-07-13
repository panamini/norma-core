import {
  REMOTE_MCP_MAX_AUTHENTICATED_ATTEMPTS_PER_MINUTE,
  REMOTE_MCP_MAX_SUBJECT_ATTEMPTS_PER_HOUR,
  REMOTE_MCP_MAX_SUBJECT_CONCURRENCY,
  REMOTE_MCP_MAX_UNAUTHORIZED_ATTEMPTS_PER_MINUTE,
} from "./remote-http-config.js";

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

export type RemoteMcpAdmissionResult =
  | { readonly allowed: true; readonly release: () => void }
  | {
      readonly allowed: false;
      readonly code: "authenticated_capacity" | "subject_rate" | "subject_concurrency";
    };

interface SubjectAccounting {
  readonly attempts: number[];
  concurrency: number;
}

export class RemoteMcpAdmissionController {
  readonly #now: () => number;
  readonly #authenticatedAttempts: number[] = [];
  readonly #unauthorizedAttempts: number[] = [];
  readonly #subjects = new Map<string, SubjectAccounting>();

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  recordUnauthorizedAttempt(): boolean {
    const now = this.#now();
    prune(this.#unauthorizedAttempts, now - ONE_MINUTE_MS);
    if (this.#unauthorizedAttempts.length >= REMOTE_MCP_MAX_UNAUTHORIZED_ATTEMPTS_PER_MINUTE) {
      return false;
    }
    this.#unauthorizedAttempts.push(now);
    return true;
  }

  enterAuthenticatedAttempt(subjectId: string): RemoteMcpAdmissionResult {
    const now = this.#now();
    this.#pruneSubjectAccounts(now);
    const subject = this.#subjects.get(subjectId) ?? { attempts: [], concurrency: 0 };
    prune(subject.attempts, now - ONE_HOUR_MS);
    if (subject.attempts.length >= REMOTE_MCP_MAX_SUBJECT_ATTEMPTS_PER_HOUR) {
      return { allowed: false, code: "subject_rate" };
    }
    if (subject.concurrency >= REMOTE_MCP_MAX_SUBJECT_CONCURRENCY) {
      subject.attempts.push(now);
      return { allowed: false, code: "subject_concurrency" };
    }

    prune(this.#authenticatedAttempts, now - ONE_MINUTE_MS);
    if (this.#authenticatedAttempts.length >= REMOTE_MCP_MAX_AUTHENTICATED_ATTEMPTS_PER_MINUTE) {
      return { allowed: false, code: "authenticated_capacity" };
    }

    this.#authenticatedAttempts.push(now);
    this.#subjects.set(subjectId, subject);
    subject.attempts.push(now);
    subject.concurrency += 1;
    let released = false;
    return {
      allowed: true,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        subject.concurrency -= 1;
        if (subject.concurrency === 0 && subject.attempts.length === 0) {
          this.#subjects.delete(subjectId);
        }
      },
    };
  }

  snapshot(): Readonly<{
    authenticatedAttempts: number;
    unauthorizedAttempts: number;
    subjectEntries: number;
  }> {
    return {
      authenticatedAttempts: this.#authenticatedAttempts.length,
      unauthorizedAttempts: this.#unauthorizedAttempts.length,
      subjectEntries: this.#subjects.size,
    };
  }

  #pruneSubjectAccounts(now: number): void {
    for (const [subjectId, subject] of this.#subjects) {
      prune(subject.attempts, now - ONE_HOUR_MS);
      if (subject.concurrency === 0 && subject.attempts.length === 0) {
        this.#subjects.delete(subjectId);
      }
    }
  }
}

function prune(timestamps: number[], threshold: number): void {
  let count = 0;
  while (count < timestamps.length && (timestamps[count] ?? Number.POSITIVE_INFINITY) <= threshold) {
    count += 1;
  }
  if (count > 0) {
    timestamps.splice(0, count);
  }
}
