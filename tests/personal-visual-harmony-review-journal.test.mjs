import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appendPersonalVisualHarmonyReviewEventV1,
  PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID,
  readPersonalVisualHarmonyReviewJournalV1,
  summarizePersonalVisualHarmonyReviewJournalV1,
} from "../dist/src/personal-visual-harmony-review-journal.js";

const fixtureUrl = new URL(
  "./fixtures/personal-visual-harmony-review-smoke-v1.json",
  import.meta.url,
);
const analysisIdentity = `sha256:${"a".repeat(64)}`;
const scope = Object.freeze({
  analysisIdentity,
  fileId: "file-smoke",
  sessionId: "session-smoke",
});

test("review journal smoke corpus covers twelve bounded review paths", async () => {
  const corpus = JSON.parse(await readFile(fixtureUrl, "utf8"));

  assert.equal(corpus.contractId, "norma.personal-visual-harmony-review-smoke-corpus@1");
  assert.equal(corpus.cases.length, 12);
  assert.equal(new Set(corpus.cases.map(({ id }) => id)).size, 12);

  for (const smokeCase of corpus.cases) {
    let journal = null;
    for (const [kind, atMs] of smokeCase.events) {
      journal = appendPersonalVisualHarmonyReviewEventV1(
        journal,
        scope,
        kind,
        atMs,
        smokeCase.prepareDurationMs,
      );
    }
    const summary = summarizePersonalVisualHarmonyReviewJournalV1(journal);
    assert.equal(summary.corrections.total, smokeCase.expected.correctionTotal, smokeCase.id);
    assert.equal(summary.failureCount, smokeCase.expected.failureCount, smokeCase.id);
    assert.equal(summary.samOutcome, smokeCase.expected.samOutcome, smokeCase.id);
    assert.equal(
      summary.timeToConfirmationMs,
      smokeCase.expected.timeToConfirmationMs,
      smokeCase.id,
    );
    assert.equal(
      summary.timeToCoreVisibleMs,
      smokeCase.expected.timeToCoreVisibleMs,
      smokeCase.id,
    );
  }
});

test("review journal rejects unscoped, unknown, malformed, and over-capacity state", () => {
  const valid = appendPersonalVisualHarmonyReviewEventV1(
    null,
    scope,
    "draft-visible",
    1_000,
    80,
  );

  assert.equal(valid.contractId, PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID);
  assert.equal(readPersonalVisualHarmonyReviewJournalV1(valid, scope), valid);
  assert.equal(
    readPersonalVisualHarmonyReviewJournalV1(valid, {
      analysisIdentity: `sha256:${"b".repeat(64)}`,
      fileId: scope.fileId,
      sessionId: scope.sessionId,
    }),
    null,
  );
  assert.equal(
    appendPersonalVisualHarmonyReviewEventV1(valid, scope, "raw-provider-body", 1_100, 80),
    valid,
  );
  assert.equal(
    appendPersonalVisualHarmonyReviewEventV1(valid, scope, "candidate-moved", Number.NaN, 80),
    valid,
  );
  assert.equal(
    readPersonalVisualHarmonyReviewJournalV1(
      { ...valid, prompt: "forbidden" },
      scope,
    ),
    null,
  );

  let bounded = valid;
  for (let index = 1; index < 80; index += 1) {
    bounded = appendPersonalVisualHarmonyReviewEventV1(
      bounded,
      scope,
      "candidate-moved",
      1_000 + index,
      80,
    );
  }
  assert.equal(bounded.events.length, 64);
  assert.equal(bounded.events[0].kind, "draft-visible");
});

test("review summaries count only bounded correction and failure codes", () => {
  const events = [
    "draft-visible",
    "candidate-added",
    "candidate-removed",
    "candidate-moved",
    "candidate-resized",
    "sam-requested",
    "sam-abstained",
    "pixel-partial-failure",
    "confirm-failed",
  ];
  let journal = null;
  events.forEach((kind, index) => {
    journal = appendPersonalVisualHarmonyReviewEventV1(
      journal,
      scope,
      kind,
      2_000 + index,
      70,
    );
  });

  assert.deepEqual(summarizePersonalVisualHarmonyReviewJournalV1(journal), {
    contractId: PERSONAL_VISUAL_HARMONY_REVIEW_JOURNAL_CONTRACT_ID,
    prepareDurationMs: 70,
    eventCount: 9,
    corrections: {
      added: 1,
      removed: 1,
      moved: 1,
      resized: 1,
      total: 4,
    },
    failureCount: 2,
    samOutcome: "abstained",
    timeToConfirmationMs: null,
    timeToCoreVisibleMs: null,
  });
});
