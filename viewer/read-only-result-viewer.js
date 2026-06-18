const LOCAL_MODEL_IMPORT_PATH = "../dist/local-viewer/read-only-viewer-model.js";
const INPUT_SELECTOR = "[data-viewer-input]";
const RENDER_SELECTOR = "[data-viewer-render]";
const OUTPUT_SELECTOR = "[data-viewer-output]";
const SCALAR_FORMATTERS = Object.freeze({
  string: (value) => value,
  number: (value) => String(value),
  boolean: (value) => String(value),
  undefined: () => "undefined",
  object: (value) => (value === null ? "null" : stringifyDisplayValue(value)),
});

export function formatViewerScalar(value) {
  const formatter = SCALAR_FORMATTERS[typeof value] ?? stringifyDisplayValue;
  return formatter(value);
}

export function modelToStaticViewTree(model) {
  const viewerModel = recordOrEmpty(model);

  return {
    title: formatViewerScalar(fieldOr(viewerModel, "title", "Unsupported input")),
    status: formatViewerScalar(fieldOr(viewerModel, "status", "unsupported")),
    summary: formatViewerScalar(fieldOr(viewerModel, "summary", "Input is not displayable.")),
    classification: formatViewerScalar(fieldOr(viewerModel, "classification", "unknown")),
    sourceMode: formatViewerScalar(fieldOr(viewerModel, "sourceMode", "unknown")),
    displayable: displayableLabel(viewerModel),
    notDisplayableReason: notDisplayableReasonLabel(viewerModel),
    sections: normalizeSections(viewerModel.sections),
    warnings: normalizeNotices(viewerModel.warnings),
    errors: normalizeNotices(viewerModel.errors),
    provenance: provenanceRows(recordOrEmpty(viewerModel.provenance)),
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

  return sections.map(normalizeSection);
}

function normalizeNotices(notices) {
  if (!Array.isArray(notices)) {
    return [];
  }

  return notices.map(normalizeNotice);
}

function normalizeSection(section) {
  const sectionRecord = recordOrEmpty(section);

  return {
    id: formatViewerScalar(fieldOr(sectionRecord, "id", "section")),
    title: formatViewerScalar(fieldOr(sectionRecord, "title", "Section")),
    rows: normalizeRows(sectionRecord.rows),
  };
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(normalizeRow);
}

function normalizeRow(row) {
  const rowRecord = recordOrEmpty(row);

  return {
    label: formatViewerScalar(fieldOr(rowRecord, "label", "value")),
    value: formatViewerScalar(fieldOr(rowRecord, "value", null)),
  };
}

function normalizeNotice(notice) {
  const noticeRecord = recordOrEmpty(notice);

  return {
    code: formatViewerScalar(fieldOr(noticeRecord, "code", "Notice")),
    severity: formatViewerScalar(fieldOr(noticeRecord, "severity", "info")),
    message: formatViewerScalar(fieldOr(noticeRecord, "message", "")),
  };
}

function displayableLabel(model) {
  return model.displayable === true ? "yes" : "no";
}

function notDisplayableReasonLabel(model) {
  if (model.notDisplayableReason === null || model.notDisplayableReason === undefined) {
    return "none";
  }

  return formatViewerScalar(model.notDisplayableReason);
}

function provenanceRows(provenance) {
  return [
    { label: "source truth", value: formatViewerScalar(provenance.sourceTruth ?? "explicit structured input") },
    { label: "artifacts", value: artifactsLabel(provenance) },
    { label: "prompt text", value: promptTruthLabel(provenance) },
    { label: "displayability", value: displayabilityLabel(provenance) },
  ];
}

function artifactsLabel(provenance) {
  return provenance.artifactsAreDerived === true ? "derived display data only" : "not marked as derived";
}

function promptTruthLabel(provenance) {
  return provenance.promptIsSourceTruth === false ? "not source truth" : "not accepted as source truth";
}

function displayabilityLabel(provenance) {
  return provenance.displayabilityIsTruthValidation === false ? "not source-truth validation" : "not treated as validation";
}

function fieldOr(record, key, fallback) {
  return record[key] === undefined || record[key] === null ? fallback : record[key];
}

function recordOrEmpty(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
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

function stringifyDisplayValue(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
