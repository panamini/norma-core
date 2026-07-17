import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const demoDoc = readFileSync(
  join(repoRoot, "docs/examples/personal-chatgpt-visual-harmony-demo.md"),
  "utf8",
);
const assessmentDoc = readFileSync(
  join(repoRoot, "docs/decisions/2026-07-17-triangle-center-assessment.md"),
  "utf8",
);

test("the active visual-harmony guide preserves conditional triangle prerequisites", () => {
  assert.match(demoDoc, /PR240 adds the preparation diagnostic and `triangleRequestCount`/u);
  assert.match(
    demoDoc,
    /conditional pre-confirmation order is: keep its parent guides selected; enable \*\*Prolongements\*\*; if any vertex uses a format-diagonal parent, enable \*\*Diagonales format\*\*; if any vertex is a junction intersection, enable \*\*Angles jonction\*\*; enable \*\*Triangles\*\*; then enable the requested triangle family/u,
  );
  assert.doesNotMatch(
    demoDoc,
    /pre-confirmation dependency order is: keep the three parent guides selected, enable \*\*Prolongements\*\*, enable \*\*Triangles\*\*/u,
  );
});

test("the triangle-center assessment remains explicitly read-only and non-authoritative", () => {
  assert.match(assessmentDoc, /The centroid is the first safe triangle-center candidate/u);
  assert.match(assessmentDoc, /sourceTruth: `?false`?/u);
  assert.match(assessmentDoc, /coreAuthority: `?false`?/u);
  assert.match(assessmentDoc, /CC-20260717-TRIANGLE-CENTROID-v1/u);
  assert.match(assessmentDoc, /not executed/u);
});
