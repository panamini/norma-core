import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";
import {
  modelToStaticViewTree,
  renderStaticViewTree,
} from "../viewer/read-only-result-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const onboardingFixturePath = join(repoRoot, "docs", "examples", "read-only-result-viewer-onboarding-fixture.json");
const sourceFiles = Object.freeze({
  "src/local-viewer/read-only-viewer-model.ts": join(repoRoot, "src", "local-viewer", "read-only-viewer-model.ts"),
  "viewer/read-only-result-viewer.html": join(repoRoot, "viewer", "read-only-result-viewer.html"),
  "viewer/read-only-result-viewer.js": join(repoRoot, "viewer", "read-only-result-viewer.js"),
  "viewer/read-only-result-viewer.css": join(repoRoot, "viewer", "read-only-result-viewer.css"),
});

test("R25 static capability scan keeps viewer and model local-only and non-executing", () => {
  for (const [name, source] of Object.entries(readStaticSourceFiles())) {
    assertNoSourcePattern(name, source, /\bfetch\b/u, "fetch");
    assertNoSourcePattern(name, source, /\bXMLHttpRequest\b/u, "XMLHttpRequest");
    assertNoSourcePattern(name, source, /\bWebSocket\b/u, "WebSocket");
    assertNoSourcePattern(name, source, /\bEventSource\b/u, "EventSource");
    assertNoSourcePattern(name, source, /\bnavigator\s*\.\s*sendBeacon\b/u, "navigator.sendBeacon");
    assertNoSourcePattern(name, source, /\blocalStorage\b/u, "localStorage");
    assertNoSourcePattern(name, source, /\bsessionStorage\b/u, "sessionStorage");
    assertNoSourcePattern(name, source, /\bindexedDB\b/u, "indexedDB");
    assertNoSourcePattern(name, source, /\bcaches\b/u, "caches");
    assertNoSourcePattern(name, source, /\bserviceWorker\b/u, "serviceWorker");
    assertNoSourcePattern(name, source, /\b(?:SharedWorker|Worker)\s*\(/u, "Worker constructor");
    assertNoSourcePattern(name, source, /\beval\s*\(/u, "eval");
    assertNoSourcePattern(name, source, /\bnew\s+Function\b/u, "new Function");
    assertNoSourcePattern(name, source, /\bimport\s*(?:\(|[^;]*\bfrom\s*)["']https?:\/\//u, "remote import");
  }
});

test("R25 static viewer exposes pasted JSON text only, with no upload path URL or submit surface", () => {
  const html = readSource("viewer/read-only-result-viewer.html");
  const js = readSource("viewer/read-only-result-viewer.js");

  assert.equal((html.match(/<textarea\b/gi) ?? []).length, 1);
  assert.match(html, /<textarea\b[^>]*(?:id=["']structured-json-input["']|data-viewer-input)/i);
  assert.match(html, /<button\b[^>]*type=["']button["'][^>]*data-viewer-render/i);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /<input\b/i);
  assert.doesNotMatch(html, /\btype=["']?(?:file|url|submit)\b/i);
  assert.doesNotMatch(html, /\b(?:action|method|enctype)\s*=/i);
  assert.doesNotMatch(html, /\b(?:drag|drop|draggable|DataTransfer)\b/i);
  assert.doesNotMatch(html, /\b(?:upload|file\s+input|path\s+input|url\s+input|remote\s+resource)\b/i);

  for (const marker of [
    "addEventListener(\"submit\"",
    "addEventListener('submit'",
    "addEventListener(\"drop\"",
    "addEventListener('drop'",
    "addEventListener(\"dragover\"",
    "addEventListener('dragover'",
    "FileReader",
    ".files",
    ".submit(",
    "type=\"file\"",
    "type='file'",
    "type=\"url\"",
    "type='url'",
    "upload",
  ]) {
    assert.equal(js.includes(marker), false, `${marker} must stay absent`);
  }
});

test("R25 viewer and model source do not cross into analysis CLI MCP or report runtime layers", () => {
  for (const [name, source] of Object.entries(readStaticSourceFiles())) {
    for (const [label, pattern] of [
      ["analyzeStructuredCompositionV1", /\banalyzeStructuredCompositionV1\b/u],
      ["structured-composition-analysis module", /\b(?:from\s+|import\s*\()\s*["'][^"']*structured-composition-analysis/u],
      ["src/mcp", /(?:^|["'`./])src\/mcp\b|(?:^|["'`./])mcp\/stdio-protocol/u],
      ["src/cli", /(?:^|["'`./])src\/cli\b|(?:^|["'`./])cli\/analyze/u],
      ["src/local-report", /(?:^|["'`./])src\/local-report\b|(?:^|["'`./])local-report\//u],
      ["report generation code", /structured-analyze-report|norma-core-report|visual-viewer/u],
      ["package root engine execution", /(?:@norma\/core|\.\.\/dist\/src\/index\.js|\.\.\/src\/index\.ts|\.\.\/runtime|\.\.\/mvp-demo)/u],
    ]) {
      assertNoSourcePattern(name, source, pattern, label);
    }
  }
});

test("R25 R23 onboarding fixture remains display-only derived inspection data", () => {
  const fixtureText = fixtureJsonText();
  const fixture = JSON.parse(fixtureText);
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: fixtureText });
  const tree = modelToStaticViewTree(model);

  assert.equal(fixture.kind, "structured-composition-analysis-result");
  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(model.sourceMode, "explicit-json-text");
  assert.equal(model.displayable, true);
  assert.equal(model.notDisplayableReason, null);
  assert.equal(row(model, "structuredAnalyzeIdentity", "analysisId")?.value, fixture.analysisId);
  assert.equal(row(model, "structuredAnalyzeIdentity", "kind")?.value, fixture.kind);
  assert.equal(tree.title, "Structured Analyze result");
  assert.equal(tree.summary, "Existing Structured Analyze result JSON is displayable as local read-only derived inspection data.");
  assert.deepEqual(tree.provenance, [
    { label: "source truth", value: "explicit-structured-input" },
    { label: "artifacts", value: "derived display data only" },
    { label: "prompt text", value: "not source truth" },
    { label: "displayability", value: "not source-truth validation" },
  ]);
});

test("R25 static viewer derivation is deterministic for the same onboarding fixture", () => {
  const first = renderedSnapshotForFixture(fixtureJsonText());
  const second = renderedSnapshotForFixture(fixtureJsonText());

  assert.deepEqual(second.tree, first.tree);
  assert.deepEqual(second.rendered, first.rendered);
  assert.equal(second.text.includes("analysis:r23-onboarding-fixture"), true);
  assert.equal(second.text.includes("derived display data only"), true);
});

test("R25 malicious strings in Structured Analyze result JSON render only as inert text", () => {
  const fixture = JSON.parse(fixtureJsonText());
  fixture.unknownScriptLikeText = "<script>alert(1)</script>";
  fixture.unknownImageLikeText = "<img src=x onerror=alert(1)>";
  fixture.unknownJavascriptUrl = "javascript:alert(1)";

  const rendered = renderedSnapshotForFixture(JSON.stringify(fixture));

  for (const snippet of [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
  ]) {
    assert.equal(rendered.text.includes(snippet), true, `${snippet} should be visible as text`);
  }

  for (const forbiddenTag of ["script", "img", "iframe", "form", "input", "button"]) {
    assert.equal(rendered.tags.includes(forbiddenTag), false, `${forbiddenTag} must not be created by rendering`);
  }
  assert.deepEqual(rendered.eventHandlerAttributes, []);
});

test("R25 prompt-like and non-result input remains unsupported without inference or analysis execution", () => {
  for (const input of [
    {
      prompt: "Infer the geometry and make a correct result.",
    },
    {
      kind: "not-a-structured-analysis-result",
      freeformPrompt: "Recommend an optimized composition score.",
      url: "https://example.invalid/remote-result.json",
    },
  ]) {
    const model = createReadOnlyViewerModel({ kind: "jsonText", value: JSON.stringify(input) });
    const tree = modelToStaticViewTree(model);
    const text = JSON.stringify(tree);

    assert.equal(model.status, "unsupported");
    assert.equal(model.displayable, false);
    assert.equal(model.classification, "unsupported-shape");
    assert.equal(model.title, "Unsupported input");
    assert.equal(model.summary, "Unsupported source-truth or execution-shaped input.");
    assert.equal(text.includes("Structured Analyze result"), false);
    assert.equal(text.includes("analysis:"), false);
    assert.equal(text.includes("correction"), false);
    assert.equal(text.includes("recommendation"), false);
    assert.equal(text.includes("optimization"), false);
    assert.equal(text.includes("beauty"), false);
    assert.equal(text.includes("score"), false);
  }
});

function fixtureJsonText() {
  return readFileSync(onboardingFixturePath, "utf8");
}

function renderedSnapshotForFixture(jsonText) {
  const documentRef = new TestDocument();
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: jsonText });
  const tree = modelToStaticViewTree(model);
  const rendered = snapshotNode(renderStaticViewTree(documentRef, tree));

  return {
    tree,
    rendered,
    text: renderedText(rendered),
    tags: tagNames(rendered),
    eventHandlerAttributes: eventHandlerAttributes(rendered),
  };
}

function readStaticSourceFiles() {
  return Object.fromEntries(Object.keys(sourceFiles).map((name) => [name, readSource(name)]));
}

function readSource(name) {
  return readFileSync(sourceFiles[name], "utf8");
}

function assertNoSourcePattern(name, source, pattern, label) {
  assert.doesNotMatch(source, pattern, `${name} must not contain ${label}`);
}

function section(model, sectionId) {
  return model.sections.find((item) => item.id === sectionId);
}

function row(model, sectionId, label) {
  return section(model, sectionId)?.rows.find((item) => item.label === label);
}

function snapshotNode(node) {
  return {
    tagName: node.tagName ?? null,
    textContent: node.textContent ?? "",
    attributes: node.attributes instanceof Map ? [...node.attributes.entries()].sort() : [],
    children: Array.isArray(node.children) ? node.children.map(snapshotNode) : [],
  };
}

function renderedText(node) {
  return [node.textContent, ...node.children.map(renderedText)].filter(Boolean).join("\n");
}

function tagNames(node) {
  return [node.tagName, ...node.children.flatMap(tagNames)].filter((tagName) => tagName !== null);
}

function eventHandlerAttributes(node) {
  const current = node.attributes
    .map(([name]) => name)
    .filter((name) => /^on/i.test(name));
  return [...current, ...node.children.flatMap(eventHandlerAttributes)].sort();
}

class TestDocument {
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
}

class TestTextNode {
  constructor(text) {
    this.tagName = null;
    this.attributes = new Map();
    this.children = [];
    this.textContent = text;
  }
}
