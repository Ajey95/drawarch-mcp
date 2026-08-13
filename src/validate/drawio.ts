export interface ValidationIssue {
  readonly code:
    | "MALFORMED_XML"
    | "MISSING_ROOT"
    | "MISSING_ROOT_CELL"
    | "DUPLICATE_CELL_ID"
    | "MISSING_CELL_ID"
    | "DANGLING_SOURCE"
    | "DANGLING_TARGET"
    | "REMOTE_IMAGE"
    | "LOCAL_FILE_REFERENCE";
  readonly message: string;
  readonly cellId?: string;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

interface ParsedCell {
  readonly id?: string;
  readonly source?: string;
  readonly target?: string;
  readonly style?: string;
}

export function validateDrawio(xml: string): ValidationReport {
  const issues: ValidationIssue[] = [];
  const completeStructure =
    /^\s*(?:<\?xml[^>]*>\s*)?<mxfile\b[\s\S]*<\/mxfile>\s*$/.test(xml) &&
    /<diagram\b[\s\S]*<\/diagram>/.test(xml) &&
    /<mxGraphModel\b[\s\S]*<\/mxGraphModel>/.test(xml);
  if (!completeStructure) {
    issues.push({ code: "MALFORMED_XML", message: "Document does not contain a complete mxfile/diagram/mxGraphModel structure" });
  }
  if (!/<root>[\s\S]*<\/root>/.test(xml)) {
    issues.push({ code: "MISSING_ROOT", message: "Document is missing the diagrams.net root element" });
  }

  const cells = parseCells(xml);
  const ids = new Set<string>();
  for (const cell of cells) {
    if (cell.id === undefined || cell.id.length === 0) {
      issues.push({ code: "MISSING_CELL_ID", message: "An mxCell is missing its id attribute" });
      continue;
    }
    if (ids.has(cell.id)) {
      issues.push({ code: "DUPLICATE_CELL_ID", message: `Duplicate mxCell id: ${cell.id}`, cellId: cell.id });
    }
    ids.add(cell.id);
  }

  if (!ids.has("0") || !ids.has("1")) {
    issues.push({ code: "MISSING_ROOT_CELL", message: "Document must contain root cells 0 and 1" });
  }

  for (const cell of cells) {
    if (cell.id === undefined) continue;
    if (cell.source !== undefined && !ids.has(cell.source)) {
      issues.push({ code: "DANGLING_SOURCE", message: `Cell references unknown source: ${cell.source}`, cellId: cell.id });
    }
    if (cell.target !== undefined && !ids.has(cell.target)) {
      issues.push({ code: "DANGLING_TARGET", message: `Cell references unknown target: ${cell.target}`, cellId: cell.id });
    }
    const style = decodeEntities(cell.style ?? "");
    if (/\bimage\s*=\s*https?:/i.test(style) || /\bimage\s*=\s*\/\//i.test(style)) {
      issues.push({ code: "REMOTE_IMAGE", message: "Image cells must embed data instead of hotlinking", cellId: cell.id });
    }
    if (/\bimage\s*=\s*(?:file:|\/[A-Za-z0-9_])/i.test(style) || /\bimage\s*=\s*[A-Za-z]:\\/i.test(style)) {
      issues.push({ code: "LOCAL_FILE_REFERENCE", message: "Image cells cannot reference absolute local files", cellId: cell.id });
    }
  }

  return { valid: issues.length === 0, issues };
}

function parseCells(xml: string): readonly ParsedCell[] {
  const result: ParsedCell[] = [];
  for (const match of xml.matchAll(/<mxCell\b([^>]*)>/g)) {
    const attributes = parseAttributes(match[1] ?? "");
    result.push({
      ...(attributes.id === undefined ? {} : { id: attributes.id }),
      ...(attributes.source === undefined ? {} : { source: attributes.source }),
      ...(attributes.target === undefined ? {} : { target: attributes.target }),
      ...(attributes.style === undefined ? {} : { style: attributes.style }),
    });
  }
  return result;
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/g)) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) attributes[name] = decodeEntities(value);
  }
  return attributes;
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
