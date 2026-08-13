import type { ResolvedAsset } from "../assets/resolver.js";
import type { ArchitectureSpec, FlowType } from "../domain/schema.js";
import type { Bounds, LayoutResult, Point } from "../layout/layout.js";
import type { ThemeTokens } from "../themes/themes.js";

export interface RenderDrawioInput {
  readonly spec: ArchitectureSpec;
  readonly layout: LayoutResult;
  readonly theme: ThemeTokens;
  readonly assets: Readonly<Record<string, ResolvedAsset>>;
}

export function renderDrawio(input: RenderDrawioInput): string {
  const { spec, layout, theme, assets } = input;
  const cells: string[] = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  cells.push(titleCell(spec.title, theme, layout.canvas.width));

  for (const group of spec.groups) {
    const geometry = layout.groups[group.id];
    if (geometry === undefined) throw new Error(`Missing layout for group: ${group.id}`);
    cells.push(...groupCells(group.id, group.label, group.subtitle, geometry, theme));
  }

  for (const node of spec.nodes) {
    const geometry = layout.nodes[node.id];
    const asset = assets[node.id];
    if (geometry === undefined) throw new Error(`Missing layout for node: ${node.id}`);
    if (asset === undefined) throw new Error(`Missing resolved asset for node: ${node.id}`);
    const parentBounds = node.groupId === undefined ? undefined : layout.groups[node.groupId];
    cells.push(...nodeCells(node, geometry, parentBounds, asset, theme));
  }

  for (const edge of spec.edges) {
    const path = layout.edges[edge.id];
    if (path === undefined) throw new Error(`Missing route for edge: ${edge.id}`);
    cells.push(edgeCell(edge, path.points, theme));
  }

  const flows = distinctFlows(spec);
  if (flows.length > 1) cells.push(...legendCells(flows, layout, theme));

  const background = theme.canvas.background;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mxfile host="DrawArch" compressed="false" version="1.0" pages="1">',
    '  <diagram id="drawarch-page" name="Page-1">',
    `    <mxGraphModel dx="${layout.canvas.width}" dy="${layout.canvas.height}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${layout.canvas.width}" pageHeight="${layout.canvas.height}" background="${escapeXml(background)}" math="0" shadow="0">`,
    "      <root>",
    ...cells.map((cell) => indent(cell, 8)),
    "      </root>",
    "    </mxGraphModel>",
    "  </diagram>",
    "</mxfile>",
    "",
  ].join("\n");
}

function titleCell(title: string, theme: ThemeTokens, canvasWidth: number): string {
  const style = styleString({
    text: 1,
    html: 1,
    strokeColor: "none",
    fillColor: "none",
    align: "left",
    verticalAlign: "middle",
    fontColor: theme.text.primary,
    fontFamily: theme.text.fontFamily,
    fontSize: 28,
    fontStyle: 1,
  });
  return vertexCell("diagram-title", title, style, "1", { x: 50, y: 22, width: canvasWidth - 100, height: 48 });
}

function groupCells(
  id: string,
  label: string,
  subtitle: string | undefined,
  geometry: Bounds,
  theme: ThemeTokens,
): readonly string[] {
  const containerStyle = styleString({
    swimlane: 1,
    html: 1,
    startSize: 68,
    horizontal: 1,
    rounded: theme.group.rounded ? 1 : 0,
    dashed: theme.group.dashed ? 1 : 0,
    dashPattern: theme.group.dashed ? "4 4" : undefined,
    sketch: theme.group.sketch ? 1 : 0,
    fillColor: theme.group.fill,
    strokeColor: theme.group.stroke,
    container: 1,
    collapsible: 0,
  });
  const titleStyle = styleString({
    text: 1,
    html: 1,
    strokeColor: "none",
    fillColor: "none",
    align: "left",
    verticalAlign: "middle",
    whiteSpace: "wrap",
    overflow: "hidden",
    fontColor: theme.text.primary,
    fontFamily: theme.text.fontFamily,
    fontSize: 14,
    fontStyle: 1,
  });
  const subtitleStyle = styleString({
    text: 1,
    html: 1,
    strokeColor: "none",
    fillColor: "none",
    align: "left",
    verticalAlign: "middle",
    whiteSpace: "wrap",
    overflow: "hidden",
    fontColor: theme.text.secondary,
    fontFamily: theme.text.fontFamily,
    fontSize: 10,
  });
  const parent = `group-${id}`;
  const cells = [
    vertexCell(parent, "", containerStyle, "1", geometry),
    vertexCell(
      `group-title-${id}`,
      label,
      titleStyle,
      parent,
      subtitle === undefined
        ? { x: 12, y: 10, width: geometry.width - 24, height: 48 }
        : { x: 12, y: 3, width: geometry.width - 24, height: 34 },
    ),
  ];
  if (subtitle !== undefined) {
    cells.push(
      vertexCell(`group-subtitle-${id}`, subtitle, subtitleStyle, parent, {
        x: 12,
        y: 37,
        width: geometry.width - 24,
        height: 26,
      }),
    );
  }
  return Object.freeze(cells);
}

function nodeCells(
  node: ArchitectureSpec["nodes"][number],
  absolute: Bounds,
  parentBounds: Bounds | undefined,
  asset: ResolvedAsset,
  theme: ThemeTokens,
): readonly string[] {
  const parent = node.groupId === undefined ? "1" : `group-${node.groupId}`;
  const x = parentBounds === undefined ? absolute.x : absolute.x - parentBounds.x;
  const y = parentBounds === undefined ? absolute.y : absolute.y - parentBounds.y;
  const cardStyle = styleString({
    rounded: theme.node.rounded ? 1 : 0,
    whiteSpace: "wrap",
    html: 1,
    fillColor: theme.node.fill,
    strokeColor: theme.node.stroke,
    shadow: theme.node.shadow ? 1 : 0,
    container: 1,
    collapsible: 0,
  });
  const imageStyle = styleString({
    shape: "image",
    imageAspect: 0,
    aspect: "fixed",
    verticalLabelPosition: "bottom",
    verticalAlign: "top",
    strokeColor: "none",
    fillColor: "none",
    image: asset.dataUri,
  });
  const titleStyle = styleString({
    text: 1,
    html: 1,
    strokeColor: "none",
    fillColor: "none",
    align: "center",
    verticalAlign: "middle",
    whiteSpace: "wrap",
    overflow: "hidden",
    fontColor: theme.text.primary,
    fontFamily: theme.text.fontFamily,
    fontSize: 13,
    fontStyle: 1,
  });
  const subtitleStyle = styleString({
    text: 1,
    html: 1,
    strokeColor: "none",
    fillColor: "none",
    align: "center",
    verticalAlign: "top",
    whiteSpace: "wrap",
    overflow: "hidden",
    fontColor: theme.text.secondary,
    fontFamily: theme.text.fontFamily,
    fontSize: 11,
  });
  const metadata = {
    drawarchAssetId: asset.id,
    drawarchAssetSource: asset.source,
    drawarchAssetProvider: asset.provider,
    drawarchLicense: asset.license,
    drawarchIntegrity: asset.integrity,
    ...(asset.sourceUrl === undefined ? {} : { drawarchSourceUrl: asset.sourceUrl }),
  };
  const cells = [
    vertexCell(`node-${node.id}`, "", cardStyle, parent, { x, y, width: absolute.width, height: absolute.height }),
    vertexCell(`image-${node.id}`, "", imageStyle, `node-${node.id}`, { x: 44, y: 7, width: 72, height: 64 }, metadata),
    vertexCell(
      `label-${node.id}`,
      node.label,
      titleStyle,
      `node-${node.id}`,
      node.subtitle === undefined
        ? { x: 5, y: 76, width: 150, height: 68 }
        : { x: 5, y: 74, width: 150, height: 36 },
    ),
  ];
  if (node.subtitle !== undefined) {
    cells.push(
      vertexCell(`subtitle-${node.id}`, node.subtitle, subtitleStyle, `node-${node.id}`, {
        x: 6,
        y: 110,
        width: 148,
        height: 35,
      }),
    );
  }
  return Object.freeze(cells);
}

function edgeCell(
  edge: ArchitectureSpec["edges"][number],
  points: readonly Point[],
  theme: ThemeTokens,
): string {
  const color = edge.color ?? theme.connector.flowColors[edge.flow];
  const dashed = edge.pattern !== "solid";
  const dashPattern = edge.pattern === "dotted" ? "2 6" : edge.pattern === "dashed" ? "8 8" : undefined;
  const style = styleString({
    edgeStyle: "orthogonalEdgeStyle",
    rounded: theme.connector.rounded ? 1 : 0,
    orthogonalLoop: 1,
    jettySize: "auto",
    html: 1,
    endArrow: "block",
    endFill: 1,
    strokeWidth: theme.connector.width,
    strokeColor: color,
    dashed: dashed ? 1 : 0,
    dashPattern,
    sketch: theme.connector.sketch ? 1 : 0,
    fontColor: theme.text.primary,
    fontFamily: theme.text.fontFamily,
    labelBackgroundColor: theme.canvas.background,
    flowAnimation: edge.animated ? 1 : 0,
    flowDuration: edge.flowDuration,
    flowTiming: edge.flowTiming,
    flowDirection: edge.flowDirection,
  });
  const waypoints = points.slice(1, -1).map((point) => `          <mxPoint x="${number(point.x)}" y="${number(point.y)}"/>`).join("\n");
  return [
    `<mxCell id="edge-${escapeXml(edge.id)}" value="${escapeXml(edge.label)}" style="${escapeXml(style)}" edge="1" parent="1" source="node-${escapeXml(edge.source)}" target="node-${escapeXml(edge.target)}" drawarchFlow="${escapeXml(edge.flow)}">`,
    '  <mxGeometry relative="1" as="geometry">',
    '    <Array as="points">',
    waypoints,
    "    </Array>",
    "  </mxGeometry>",
    "</mxCell>",
  ].join("\n");
}

function legendCells(flows: readonly FlowType[], layout: LayoutResult, theme: ThemeTokens): readonly string[] {
  const width = 230;
  const rowHeight = 28;
  const height = 42 + flows.length * rowHeight;
  const x = Math.max(30, layout.canvas.width - width - 40);
  const y = Math.max(80, layout.canvas.height - height - 35);
  const containerStyle = styleString({
    rounded: 1,
    whiteSpace: "wrap",
    html: 1,
    fillColor: theme.node.fill,
    strokeColor: theme.group.stroke,
    fontColor: theme.text.primary,
    fontFamily: theme.text.fontFamily,
    fontStyle: 1,
    container: 1,
    collapsible: 0,
  });
  const cells = [vertexCell("legend", "Flow Legend", containerStyle, "1", { x, y, width, height })];
  for (const [index, flow] of flows.entries()) {
    const style = styleString({
      rounded: 1,
      whiteSpace: "wrap",
      html: 1,
      fillColor: theme.connector.flowColors[flow],
      strokeColor: "none",
      fontColor: theme.text.primary,
      fontFamily: theme.text.fontFamily,
      align: "left",
      spacingLeft: 12,
    });
    cells.push(vertexCell(`legend-${flow}`, flow, style, "legend", { x: 12, y: 34 + index * rowHeight, width: width - 24, height: 22 }));
  }
  return Object.freeze(cells);
}

function distinctFlows(spec: ArchitectureSpec): readonly FlowType[] {
  const seen = new Set<FlowType>();
  for (const edge of spec.edges) seen.add(edge.flow);
  return [...seen];
}

function vertexCell(
  id: string,
  value: string,
  style: string,
  parent: string,
  geometry: Bounds,
  metadata: Readonly<Record<string, string>> = {},
): string {
  const extra = Object.entries(metadata)
    .map(([key, content]) => ` ${key}="${escapeXml(content)}"`)
    .join("");
  return [
    `<mxCell id="${escapeXml(id)}" value="${escapeXml(value)}" style="${escapeXml(style)}" vertex="1" parent="${escapeXml(parent)}"${extra}>`,
    `  <mxGeometry x="${number(geometry.x)}" y="${number(geometry.y)}" width="${number(geometry.width)}" height="${number(geometry.height)}" as="geometry"/>`,
    "</mxCell>",
  ].join("\n");
}

function styleString(values: Readonly<Record<string, string | number | undefined>>): string {
  return Object.entries(values)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(";") + ";";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value.split("\n").map((line) => `${prefix}${line}`).join("\n");
}
