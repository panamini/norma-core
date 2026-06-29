import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";
import {
  modelToStaticViewTree,
  mountReadOnlyResultViewer,
  renderStaticViewTree,
} from "../viewer/read-only-result-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const fixtureRoot = join(testDir, "fixtures", "viewer");

const fixturePaths = {
  verification: "run-verification.json",
  replayMismatch: "run-replay-mismatch.json",
  staleArtifact: "artifact-freshness-stale.json",
  structuredAnalyze: "structured-analyze-result.json",
  unsupportedPrompt: "unsupported-prompt-input.json",
};

test("PR70 local static build prerequisites remain repository-local", () => {
  const htmlPath = join(repoRoot, "viewer", "read-only-result-viewer.html");
  const jsPath = join(repoRoot, "viewer", "read-only-result-viewer.js");
  const cssPath = join(repoRoot, "viewer", "read-only-result-viewer.css");
  const builtModelPath = join(repoRoot, "dist", "src", "local-viewer", "read-only-viewer-model.js");

  assert.equal(existsSync(htmlPath), true);
  assert.equal(existsSync(jsPath), true);
  assert.equal(existsSync(cssPath), true);
  assert.equal(existsSync(builtModelPath), true);
  assert.equal(typeof createReadOnlyViewerModel, "function");
  assert.equal(typeof modelToStaticViewTree, "function");
  assert.equal(typeof renderStaticViewTree, "function");
  assert.equal(typeof mountReadOnlyResultViewer, "function");

  const html = readFileSync(htmlPath, "utf8");
  assert.match(html, /href=["']\.\/read-only-result-viewer\.css["']/);
  assert.match(html, /type=["']module["'][^>]*src=["']\.\/read-only-result-viewer\.js["']/);
  assert.equal(
    html.includes(
      "\"../dist/local-viewer/read-only-viewer-model.js\": \"../dist/src/local-viewer/read-only-viewer-model.js\"",
    ),
    true,
  );
  assertNoRemoteUrl(html);

  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const indexSource = readFileSync(join(repoRoot, "src", "index.ts"), "utf8");
  assert.deepEqual(Object.keys(packageJson.exports ?? {}).sort(), ["."]);
  assert.equal(indexSource.includes("read-only-viewer-model"), false);
  assert.equal(indexSource.includes("createReadOnlyViewerModel"), false);
});

test("PR70 mounts the real local viewer with the real PR67 model boundary", () => {
  const mounted = mountedViewer();

  assert.equal(textOf(mounted.output), "Ready for local pasted structured JSON.");
  assert.equal(typeof mounted.handle.renderCurrentInput, "function");
  assert.equal(mounted.renderButton.listenerCount("click"), 1);

  mounted.input.value = " ";
  assert.doesNotThrow(() => mounted.renderButton.click());
  assertIncludes(textOf(mounted.output), "Empty input");
});

test("PR70 renders the PR69 verification fixture through the mounted pipeline", () => {
  const mounted = mountedViewer();
  const text = renderFixture(mounted, fixturePaths.verification);

  assertIncludes(text, "Verification result");
  assertIncludes(text, "verification-like-result");
  assertIncludes(text, "verified");
  assertIncludes(text, "SyntheticVerificationWarning");
  assertIncludes(text, "Synthetic warning remains visible.");
  assertTruthBoundary(text);
  assertNotIncludes(text, "InvalidJsonText");
  assertReadOnlyOutput(mounted.output);
});

test("R22 renders pasted Structured Analyze result JSON through the mounted static pipeline", () => {
  const mounted = mountedViewer();
  const text = renderFixture(mounted, fixturePaths.structuredAnalyze);

  assertIncludes(text, "Structured Analyze result");
  assertIncludes(text, "structured-analyze-like-result");
  assertIncludes(text, "analysis:r22-static-viewer");
  assertIncludes(text, "valid");
  assertIncludes(text, "a_closer");
  assertIncludes(text, "Use composition A for this deterministic fixture.");
  assertIncludes(text, "SyntheticDiagnostic");
  assertIncludes(text, "SyntheticWarning");
  assertIncludes(text, "SyntheticError");
  assertIncludes(text, "user_supplied_structured_data");
  assertIncludes(text, "input:r22-static-viewer");
  assertIncludes(text, "output:r22-static-viewer");
  assertIncludes(text, "pack-lock:r22-static-viewer");
  assertIncludes(text, "operation-context:r22-static-viewer");
  assertIncludes(text, "ready");
  assertIncludes(text, "run-ref:r22-static-viewer");
  assertIncludes(text, "identity:r22-static-viewer");
  assertTruthBoundary(text);
  assertReadOnlyOutput(mounted.output);
});

test("R22 renders pasted Structured Analyze HTML-like strings as inert text", () => {
  const mounted = mountedViewer();
  const text = renderFixture(mounted, fixturePaths.structuredAnalyze);

  assertIncludes(text, "<img src=x onerror=alert(1)>");
  assertIncludes(text, "<script>alert(1)</script>");
  assertReadOnlyOutput(mounted.output);
});

test("PR70 renders the PR69 replay mismatch fixture without executable replay behavior", () => {
  const mounted = mountedViewer();
  const text = renderFixture(mounted, fixturePaths.replayMismatch);

  assertIncludes(text, "Replay result");
  assertIncludes(text, "replay-like-result");
  assertIncludes(text, "mismatch");
  assertIncludes(text, "OutputRefsMismatch");
  assertIncludes(text, "Recorded output refs differ in the synthetic replay result.");
  assertTruthBoundary(text);
  assertNoExecutableReplayMarkers(text);
  assertReadOnlyOutput(mounted.output);
});

test("PR70 renders the PR69 stale artifact fixture as derived display data only", () => {
  const mounted = mountedViewer();
  const text = renderFixture(mounted, fixturePaths.staleArtifact);

  assertIncludes(text, "Artifact freshness result");
  assertIncludes(text, "artifact-freshness-like-result");
  assertIncludes(text, "stale");
  assertIncludes(text, "ArtifactStale");
  assertIncludes(text, "Synthetic derived artifact remains stale.");
  assertIncludes(text, "derived display data only");
  assertIncludes(text, "not source-truth validation");
  assertTruthBoundary(text);
  assertReadOnlyOutput(mounted.output);
});

test("PR70 keeps the PR69 unsupported prompt fixture non-displayable", () => {
  const mounted = mountedViewer();
  const text = renderFixture(mounted, fixturePaths.unsupportedPrompt);

  assertIncludes(text, "Unsupported input");
  assertIncludes(text, "unsupported-shape");
  assertIncludes(text, "UnsupportedInput");
  assertIncludes(text, "Unsupported source-truth or execution-shaped input.");
  assertIncludes(text, "prompt");
  assertTruthBoundary(text);
  assertNoCreativeInference(text);
  assertReadOnlyOutput(mounted.output);
});

test("PR70 mounted empty and malformed JSON inputs replace prior output without throwing", () => {
  const mounted = mountedViewer();

  renderFixture(mounted, fixturePaths.verification);
  assertIncludes(textOf(mounted.output), "SyntheticVerificationWarning");

  assert.doesNotThrow(() => renderInput(mounted, " \n\t "));
  const emptyText = textOf(mounted.output);
  assertIncludes(emptyText, "Empty input");
  assertIncludes(emptyText, "No structured JSON input was provided.");
  assertNotIncludes(emptyText, "SyntheticVerificationWarning");
  assert.equal(mounted.output.children.length, 1);

  assert.doesNotThrow(() => renderInput(mounted, "{\"kind\":"));
  const malformedText = textOf(mounted.output);
  assertIncludes(malformedText, "Invalid JSON");
  assertIncludes(malformedText, "Input must be valid JSON.");
  assertIncludes(malformedText, "InvalidJsonText");
  assertNotIncludes(malformedText, "Empty input");
  assert.equal(mounted.output.children.length, 1);
});

test("PR70 mounted repeated rendering is deterministic and replaces previous content", () => {
  const mounted = mountedViewer();

  const verificationText = renderFixture(mounted, fixturePaths.verification);
  assertIncludes(verificationText, "SyntheticVerificationWarning");

  const replayText = renderFixture(mounted, fixturePaths.replayMismatch);
  assertIncludes(replayText, "OutputRefsMismatch");
  assertNotIncludes(replayText, "SyntheticVerificationWarning");
  assert.equal(mounted.output.children.length, 1);

  const firstStaleText = renderFixture(mounted, fixturePaths.staleArtifact);
  const firstChildCount = mounted.output.children.length;
  const secondStaleText = renderFixture(mounted, fixturePaths.staleArtifact);

  assert.equal(secondStaleText, firstStaleText);
  assert.equal(mounted.output.children.length, firstChildCount);
  assert.equal(mounted.output.children.length, 1);
  assertNotIncludes(secondStaleText, "OutputRefsMismatch");
});

test("R22 mounted Structured Analyze rendering is deterministic and replaces previous content", () => {
  const mounted = mountedViewer();

  const firstStructuredText = renderFixture(mounted, fixturePaths.structuredAnalyze);
  assertIncludes(firstStructuredText, "SyntheticWarning");

  const replayText = renderFixture(mounted, fixturePaths.replayMismatch);
  assertIncludes(replayText, "OutputRefsMismatch");
  assertNotIncludes(replayText, "analysis:r22-static-viewer");
  assert.equal(mounted.output.children.length, 1);

  const secondStructuredText = renderFixture(mounted, fixturePaths.structuredAnalyze);
  assert.equal(secondStructuredText, firstStructuredText);
  assert.equal(mounted.output.children.length, 1);
  assertNotIncludes(secondStructuredText, "OutputRefsMismatch");
});

function mountedViewer() {
  const documentRef = new TestDocument();
  const input = documentRef.register("[data-viewer-input]", new TestElement("textarea"));
  const renderButton = documentRef.register("[data-viewer-render]", new TestElement("button"));
  const output = documentRef.register("[data-viewer-output]", new TestElement("div"));
  const handle = mountReadOnlyResultViewer({ documentRef, createReadOnlyViewerModel });

  return { documentRef, input, renderButton, output, handle };
}

function renderFixture(mounted, fixtureName) {
  return renderInput(mounted, readFileSync(join(fixtureRoot, fixtureName), "utf8"));
}

function renderInput(mounted, value) {
  mounted.input.value = value;
  mounted.renderButton.click();
  return textOf(mounted.output);
}

function assertTruthBoundary(text) {
  assertIncludes(text, "source truth");
  assertIncludes(text, "explicit-structured-input");
  assertIncludes(text, "artifacts");
  assertIncludes(text, "derived display data only");
  assertIncludes(text, "prompt text");
  assertIncludes(text, "not source truth");
  assertIncludes(text, "displayability");
  assertIncludes(text, "not source-truth validation");
}

function assertNoExecutableReplayMarkers(text) {
  assertNotIncludes(text, "/replay-run");
  assertNotIncludes(text, "norma.replayRun");
  assertNotIncludes(text, "replayRun(");
}

function assertNoCreativeInference(text) {
  const normalized = text.toLowerCase();
  assert.equal(normalized.includes("rule"), false);
  assert.equal(normalized.includes("intent"), false);
  assert.equal(normalized.includes("recommendation"), false);
  assert.equal(normalized.includes("beauty score"), false);
}

function assertReadOnlyOutput(output) {
  const tags = tagNames(output);
  for (const forbiddenTag of ["button", "input", "textarea", "form", "script", "img", "iframe"]) {
    assert.equal(tags.includes(forbiddenTag), false, `${forbiddenTag} should not be rendered in output`);
  }
}

function assertIncludes(text, snippet) {
  assert.equal(text.includes(snippet), true, `${snippet} should be visible`);
}

function assertNotIncludes(text, snippet) {
  assert.equal(text.includes(snippet), false, `${snippet} should not be visible`);
}

function assertNoRemoteUrl(source) {
  assert.doesNotMatch(source, /\bhttps?:\/\//i);
  assert.doesNotMatch(source, /(^|[^.])\/\//);
}

function textOf(node) {
  return [node.textContent, ...node.children.map(textOf)].filter(Boolean).join("\n");
}

function tagNames(node) {
  return [node.tagName, ...node.children.flatMap(tagNames)].filter(Boolean);
}

class TestDocument {
  constructor() {
    this.nodesBySelector = new Map();
  }

  register(selector, node) {
    this.nodesBySelector.set(selector, node);
    return node;
  }

  querySelector(selector) {
    return this.nodesBySelector.get(selector) ?? null;
  }

  createElement(tagName) {
    return new TestElement(tagName);
  }

  createTextNode(text) {
    return new TestTextNode(text);
  }
}

class TestElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.value = "";
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    for (const child of children) {
      this.appendChild(child);
    }
  }

  replaceChildren(...children) {
    this.textContent = "";
    this.children = [...children];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    for (const listener of this.listeners.get("click") ?? []) {
      listener();
    }
  }

  listenerCount(type) {
    return (this.listeners.get(type) ?? []).length;
  }
}

class TestTextNode {
  constructor(text) {
    this.children = [];
    this.textContent = text;
  }
}
