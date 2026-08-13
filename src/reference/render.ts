import type { ReferenceElement, ReferencePlan } from "./schema.js";

export interface ReferenceComparison { readonly structuralScore: number; readonly expectedElements: number; readonly matchedElements: number; readonly missingElementIds: readonly string[] }

export function renderReferenceDrawio(plan: ReferencePlan): string {
  const sorted = [...plan.elements].sort((a, b) => a.zIndex - b.zIndex);
  const cells = sorted.map(renderElement);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mxfile host="DrawArch" compressed="false" version="2.0" pages="1">',
    '  <diagram id="reference-page" name="Reference recreation">',
    `    <mxGraphModel dx="${num(plan.canvas.width)}" dy="${num(plan.canvas.height)}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${num(plan.canvas.width)}" pageHeight="${num(plan.canvas.height)}" background="${xml(plan.canvas.background)}" math="0" shadow="0">`,
    "      <root>", '        <mxCell id="0"/>', '        <mxCell id="1" parent="0"/>',
    ...cells.map((cell) => cell.split("\n").map((line) => `        ${line}`).join("\n")),
    "      </root>", "    </mxGraphModel>", "  </diagram>", "</mxfile>", "",
  ].join("\n");
}

export function compareReferencePlan(plan: ReferencePlan, drawioXml: string): ReferenceComparison {
  const missing = plan.elements.filter((element) => !drawioXml.includes(`id="ref-${xml(element.id)}"`)).map((element) => element.id);
  const matched = plan.elements.length - missing.length;
  return Object.freeze({ structuralScore: plan.elements.length === 0 ? 1 : matched / plan.elements.length, expectedElements: plan.elements.length, matchedElements: matched, missingElementIds: Object.freeze(missing) });
}

function renderElement(element: ReferenceElement): string {
  if (element.type === "connector") {
    const style = styles({ edgeStyle: "orthogonalEdgeStyle", rounded: 0, html: 1, strokeColor: element.style.strokeColor ?? "#111827", strokeWidth: element.style.width ?? 2, dashed: element.style.dashed ? 1 : 0, endArrow: element.style.endArrow ?? "block", exitX: portCoordinate(element.sourcePort, "x"), exitY: portCoordinate(element.sourcePort, "y"), entryX: portCoordinate(element.targetPort, "x"), entryY: portCoordinate(element.targetPort, "y") });
    const points = element.waypoints.map((point) => `      <mxPoint x="${num(point.x)}" y="${num(point.y)}"/>`).join("\n");
    return [`<mxCell id="ref-${xml(element.id)}" value="${xml(element.label ?? "")}" style="${xml(style)}" edge="1" parent="1" source="ref-${xml(element.source)}" target="ref-${xml(element.target)}" drawarchConfidence="${num(element.confidence)}">`, '  <mxGeometry relative="1" as="geometry">', '    <Array as="points">', points, "    </Array>", "  </mxGeometry>", "</mxCell>"].join("\n");
  }
  const parent = element.parentId === undefined ? "1" : `ref-${element.parentId}`;
  let value = "label" in element ? element.label ?? "" : element.type === "text" ? element.text : "";
  let style: string;
  if (element.type === "asset") {
    const dataUri = element.asset.mode === "data" ? element.asset.dataUri : "";
    style = styles({ shape: "image", imageAspect: 0, aspect: "fixed", strokeColor: "none", fillColor: "none", image: dataUri });
  } else if (element.type === "text") {
    style = styles({ text: 1, html: 1, strokeColor: "none", fillColor: "none", whiteSpace: "wrap", fontColor: element.style.fontColor ?? "#111827", fontSize: element.style.fontSize ?? 14, align: element.style.align ?? "center" });
  } else {
    const shape = element.type === "container" ? "swimlane" : shapeName(element.shape);
    style = styles({ shape, rounded: element.type === "shape" && element.shape === "roundedRectangle" || element.style.rounded ? 1 : 0, whiteSpace: "wrap", html: 1, container: element.type === "container" ? 1 : undefined, collapsible: element.type === "container" ? 0 : undefined, fillColor: element.style.fillColor ?? "#ffffff", strokeColor: element.style.strokeColor ?? "#111827", strokeWidth: element.style.strokeWidth ?? 1, fontColor: element.style.fontColor ?? "#111827", fontSize: element.style.fontSize ?? 14, dashed: element.style.dashed ? 1 : 0, opacity: element.style.opacity ?? 100, align: element.style.align ?? "center" });
  }
  return [`<mxCell id="ref-${xml(element.id)}" value="${xml(value)}" style="${xml(style)}" vertex="1" parent="${xml(parent)}" drawarchType="${element.type}" drawarchLayer="${xml(element.layerId)}" drawarchZIndex="${element.zIndex}" drawarchConfidence="${num(element.confidence)}">`, `  <mxGeometry x="${num(element.x)}" y="${num(element.y)}" width="${num(element.width)}" height="${num(element.height)}" as="geometry"/>`, "</mxCell>"].join("\n");
}

function shapeName(shape: string): string | undefined { return ({ rectangle: undefined, roundedRectangle: undefined, ellipse: "ellipse", cylinder: "cylinder", hexagon: "hexagon", rhombus: "rhombus", cloud: "cloud" } as Record<string, string | undefined>)[shape]; }
function portCoordinate(port: "north" | "east" | "south" | "west" | "center" | undefined, axis: "x" | "y"): number | undefined { if (port === undefined) return undefined; const map = { north: [0.5, 0], east: [1, 0.5], south: [0.5, 1], west: [0, 0.5], center: [0.5, 0.5] } as const; return map[port][axis === "x" ? 0 : 1]; }
function styles(values: Readonly<Record<string, string | number | undefined>>): string { return Object.entries(values).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key, value]) => `${key}=${String(value)}`).join(";") + ";"; }
function xml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function num(value: number): string { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4))); }
