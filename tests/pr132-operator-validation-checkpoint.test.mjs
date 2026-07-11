import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checkpointUrl = new URL("../docs/decisions/2026-07-11-pr132-operator-validation-checkpoint.md", import.meta.url);
const decisionUrl = new URL("../docs/decisions/2026-07-11-private-dev-chatgpt-mcp-visual-pilot-gate.md", import.meta.url);
const roadmapUrl = new URL("../docs/BUSINESS_READINESS_ROADMAP.md", import.meta.url);

const evidenceIdentities = Object.freeze([
  "sha256:8d2ede33b515905e45504f5b895eac82176553e87ce61627e36647bc5b138060",
  "sha256:577b4b50e99da2c2ffbd916bc461ede308798bd94a97251d1062ccadecfa8d68",
  "sha256:bcc9b7e16d1ce02004c9bed2bc2db00d1905d7537c327b313fc3dbeae4e1318e",
  "sha256:f2022dbacdb304b975ca572951295f12fe62317a20191f9821fbbddf0549ec6c",
]);

test("PR132 checkpoint records reproducible commands and deterministic artifact identities", async () => {
  const checkpoint = await readFile(checkpointUrl, "utf8");
  assert.match(checkpoint, /rtk npm run build/u);
  assert.match(checkpoint, /rtk node --test tests\/local-visual-candidate-review\.test\.mjs tests\/local-visual-candidate-selection-intent\.test\.mjs/u);
  assert.match(checkpoint, /18 of 18 tests/u);
  for (const identity of evidenceIdentities) assert.equal(checkpoint.includes(identity), true, identity);
  assert.match(checkpoint, /resume status and handoff status were both `completed`/u);
  assert.match(checkpoint, /Network transport\s+was not used/u);
});

test("PR133 and the roadmap cite the durable PR132 evidence without overstating it", async () => {
  const [checkpoint, decision, roadmap] = await Promise.all([
    readFile(checkpointUrl, "utf8"),
    readFile(decisionUrl, "utf8"),
    readFile(roadmapUrl, "utf8"),
  ]);
  for (const text of [decision, roadmap]) {
    assert.match(text, /2026-07-11-pr132-operator-validation-checkpoint\.md/u);
  }
  for (const text of [checkpoint, decision]) {
    assert.match(text, /not\s+authenticated human-review proof|does not claim authenticated human-review proof/u);
  }
  assert.match(checkpoint, /Existing PR129 `--resume` remains the only\s+route to AcceptedGeometry/u);
  assert.match(decision, /PR134 is HIGH risk and remains blocked/u);
});
