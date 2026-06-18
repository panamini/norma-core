const LOCAL_MODEL_IMPORT_PATH = "../dist/local-viewer/read-only-viewer-model.js";
const INPUT_SELECTOR = "[data-viewer-input]";
const RENDER_SELECTOR = "[data-viewer-render]";
const OUTPUT_SELECTOR = "[data-viewer-output]";

export function formatViewerScalar(value) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return stableStringify(value);
}

export function modelToStaticViewTree(model) {
  const provenance = model?.provenance ?? {};

  return {
    title: formatViewerScalar(model?.title ?? "Unsupported input"),
    status: formatViewerScalar(model?.status ?? "unsupported"),
    summary: formatViewerScalar(model?.summary ?? "Input is not displayable."),
    classification: formatViewerScalar(model?.classification ?? "unknown"),
    sourceMode: formatViewerScalar(model?.sourceMode ?? "unknown"),
    displayable: model?.displayable === true ? "yes" : "no",
    notDisplayableReason:
      model?.notDisplayableReason === null || model?.notDisplayableReason === undefined
        ? "none"
        : formatViewerScalar(model.notDisplayableReason),
    sections: normalizeSections(model?.sections),
    warnings: normalizeNotices(model?.warnings),
    errors: normalizeNotices(model?.errors),
    provenance: [
      { label: "source truth", value: formatViewerScalar(provenance.sourceTruth ?? "explicit structured input") },
      {
        label: "artifacts",
        value: provenance.artifactsAreDerived === true ? "derived display data only" : "not marked as derived",
      },
      {
        label: "prompt text",
        value: provenance.promptIsSourceTruth === false ? "not source truth" : "not accepted as source truth",
      },
      {
        label: "displayability",
        value:
          provenance.displayabilityIsTruthValidation === false
            ? "not source-truth validation"
            : "not treated as validation",
      },
    ],
  };
}

export function renderStaticViewTree(documentRef, tree) {
  const article = element(documentRef, "article", "viewer-result");
  article.appendChild(heading(documentRef, "h3", tree.title));
  article.appendChild(paragraph(documentRef, tree.summary));
  article.appendChild(metaBlock(documentRef, tree));

  if (tree.sections.length > 0) {
    const sectionsNode = element(documentRef, "div", "viewer-sections");
    for (const section of tree.sections) {
      sectionsNode.appendChild(sectionBlock(documentRef, section));
    }
    article.appendChild(sectionsNode);
  }

  article.appendChild(noticeBlock(documentRef, "Warnings", tree.warnings));
  article.appendChild(noticeBlock(documentRef, "Errors", tree.errors));
  article.appendChild(provenanceBlock(documentRef, tree.provenance));

  return article;
}

export function mountReadOnlyResultViewer({ documentRef, createReadOnlyViewerModel }) {
  const input = requiredElement(documentRef, INPUT_SELECTOR);
  const renderButton = requiredElement(documentRef, RENDER_SELECTOR);
  const output = requiredElement(documentRef, OUTPUT_SELECTOR);

  const renderCurrentInput = () => {
    const model = createReadOnlyViewerModel({
      kind: "jsonText",
      value: input.value,
    });
    output.replaceChildren(renderStaticViewTree(documentRef, modelToStaticViewTree(model)));
  };

  renderButton.addEventListener("click", renderCurrentInput);
  output.replaceChildren(paragraph(documentRef, "Ready for local pasted structured JSON."));

  return { renderCurrentInput };
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections.map((section) => ({
    id: formatViewerScalar(section?.id ?? "section"),
    title: formatViewerScalar(section?.title ?? "Section"),
    rows: Array.isArray(section?.rows)
      ? section.rows.map((row) => ({
          label: formatViewerScalar(row?.label ?? "value"),
          value: formatViewerScalar(row?.value ?? null),
        }))
      : [],
  }));
}

function normalizeNotices(notices) {
  if (!Array.isArray(notices)) {
    return [];
  }

  return notices.map((notice) => ({
    code: formatViewerScalar(notice?.code ?? "Notice"),
    severity: formatViewerScalar(notice?.severity ?? "info"),
    message: formatViewerScalar(notice?.message ?? ""),
  }));
}

function metaBlock(documentRef, tree) {
  const block = element(documentRef, "dl", "viewer-meta");
  appendRow(documentRef, block, "status", tree.status);
  appendRow(documentRef, block, "classification", tree.classification);
  appendRow(documentRef, block, "source mode", tree.sourceMode);
  appendRow(documentRef, block, "displayable", tree.displayable);
  appendRow(documentRef, block, "not displayable reason", tree.notDisplayableReason);
  return block;
}

function sectionBlock(documentRef, section) {
  const block = element(documentRef, "section", "viewer-section");
  block.appendChild(heading(documentRef, "h4", section.title));

  const rows = element(documentRef, "dl", "viewer-rows");
  for (const row of section.rows) {
    appendRow(documentRef, rows, row.label, row.value);
  }
  block.appendChild(rows);

  return block;
}

function noticeBlock(documentRef, title, notices) {
  const block = element(documentRef, "section", "viewer-notice");
  block.appendChild(heading(documentRef, "h4", title));

  if (notices.length === 0) {
    block.appendChild(paragraph(documentRef, "None."));
    return block;
  }

  const list = element(documentRef, "ul", "viewer-notice-list");
  for (const notice of notices) {
    const item = documentRef.createElement("li");
    item.appendChild(documentRef.createTextNode(`${notice.severity}: ${notice.code} - ${notice.message}`));
    list.appendChild(item);
  }
  block.appendChild(list);

  return block;
}

function provenanceBlock(documentRef, provenanceRows) {
  const block = element(documentRef, "section", "viewer-section");
  block.appendChild(heading(documentRef, "h4", "Provenance And Truth Boundary"));

  const rows = element(documentRef, "dl", "viewer-rows");
  for (const row of provenanceRows) {
    appendRow(documentRef, rows, row.label, row.value);
  }
  block.appendChild(rows);

  return block;
}

function appendRow(documentRef, rows, label, value) {
  const row = element(documentRef, "div", "viewer-row");
  const labelNode = element(documentRef, "dt", "viewer-row-label");
  const valueNode = element(documentRef, "dd", "viewer-row-value");

  labelNode.textContent = label;
  valueNode.textContent = value;
  row.append(labelNode, valueNode);
  rows.appendChild(row);
}

function heading(documentRef, tagName, text) {
  const node = documentRef.createElement(tagName);
  node.textContent = text;
  return node;
}

function paragraph(documentRef, text) {
  const node = documentRef.createElement("p");
  node.textContent = text;
  return node;
}

function element(documentRef, tagName, classValue) {
  const node = documentRef.createElement(tagName);
  node.setAttribute("class", classValue);
  return node;
}

function requiredElement(documentRef, selector) {
  const node = documentRef.querySelector(selector);
  if (node === null) {
    throw new Error(`Missing static viewer element: ${selector}`);
  }
  return node;
}

function showLocalBuildRequired(documentRef, error) {
  const output = documentRef.querySelector(OUTPUT_SELECTOR);
  if (output === null) {
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown local module load failure.";
  const block = element(documentRef, "section", "viewer-notice");
  block.appendChild(heading(documentRef, "h3", "Local build required"));
  block.appendChild(paragraph(documentRef, "Run the local build before opening this static viewer."));
  block.appendChild(paragraph(documentRef, message));
  output.replaceChildren(block);
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value, new WeakSet()));
}

function stableValue(value, seen) {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const stableArray = value.map((item) => stableValue(item, seen));
    seen.delete(value);
    return stableArray;
  }

  const stableObject = {};
  for (const key of Object.keys(value).sort()) {
    stableObject[key] = stableValue(value[key], seen);
  }

  seen.delete(value);
  return stableObject;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  import(LOCAL_MODEL_IMPORT_PATH)
    .then(({ createReadOnlyViewerModel }) => {
      mountReadOnlyResultViewer({
        documentRef: document,
        createReadOnlyViewerModel,
      });
    })
    .catch((error) => {
      showLocalBuildRequired(document, error);
    });
}
