import type { ArchitectureSpec } from "../domain/schema.js";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Bounds extends Point {
  readonly width: number;
  readonly height: number;
}

export interface EdgePath {
  readonly points: readonly Point[];
}

export interface LayoutResult {
  readonly canvas: Readonly<{ width: number; height: number }>;
  readonly nodes: Readonly<Record<string, Bounds>>;
  readonly groups: Readonly<Record<string, Bounds>>;
  readonly edges: Readonly<Record<string, EdgePath>>;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 152;
const MARGIN = 100;
const CONTENT_TOP = 96;
const GAP_X = 90;
const GAP_Y = 90;
const GROUP_PAD_X = 38;
const GROUP_PAD_BOTTOM = 38;
const GROUP_TITLE = 68;

export function layoutArchitecture(spec: ArchitectureSpec): LayoutResult {
  const nodes = layoutNodes(spec);
  const groups = boundGroups(spec, nodes);
  const canvas = canvasBounds(nodes, groups, spec.layout === "hub-spoke");
  const normalized = normalizeHub(spec, nodes, groups, canvas);
  const edges = routeEdges(spec, normalized.nodes);
  return Object.freeze({
    canvas: Object.freeze(normalized.canvas),
    nodes: Object.freeze(normalized.nodes),
    groups: Object.freeze(normalized.groups),
    edges: Object.freeze(edges),
  });
}

function layoutNodes(spec: ArchitectureSpec): Record<string, Bounds> {
  switch (spec.layout) {
    case "vertical":
      return verticalNodes(spec);
    case "edge-cloud":
      return edgeCloudNodes(spec);
    case "hub-spoke":
      return hubSpokeNodes(spec);
    case "horizontal":
    case "pipeline":
      return orderedHorizontalNodes(spec);
  }
}

function orderedHorizontalNodes(spec: ArchitectureSpec): Record<string, Bounds> {
  const groupRows = new Map(spec.groups.map((group, index) => [group.id, index]));
  const nodes: Record<string, Bounds> = {};
  for (const [index, node] of spec.nodes.entries()) {
    const row = node.groupId === undefined ? spec.groups.length : (groupRows.get(node.groupId) ?? 0);
    nodes[node.id] = bounds(
      MARGIN + index * (NODE_WIDTH + GAP_X),
      CONTENT_TOP + GROUP_TITLE + row * (NODE_HEIGHT + GAP_Y + GROUP_TITLE),
    );
  }
  return nodes;
}

function verticalNodes(spec: ArchitectureSpec): Record<string, Bounds> {
  const groupColumns = new Map(spec.groups.map((group, index) => [group.id, index]));
  const nodes: Record<string, Bounds> = {};
  for (const [index, node] of spec.nodes.entries()) {
    const column = node.groupId === undefined ? spec.groups.length : (groupColumns.get(node.groupId) ?? 0);
    nodes[node.id] = bounds(
      MARGIN + column * (NODE_WIDTH + GAP_X + GROUP_PAD_X * 2),
      CONTENT_TOP + GROUP_TITLE + index * (NODE_HEIGHT + GAP_Y),
    );
  }
  return nodes;
}

function edgeCloudNodes(spec: ArchitectureSpec): Record<string, Bounds> {
  const nodes: Record<string, Bounds> = {};
  const grouped = new Map<string, typeof spec.nodes>();
  for (const group of spec.groups) grouped.set(group.id, []);
  const ungrouped: typeof spec.nodes = [];
  for (const node of spec.nodes) {
    if (node.groupId === undefined) ungrouped.push(node);
    else grouped.get(node.groupId)?.push(node);
  }

  let column = 0;
  for (const group of spec.groups) {
    const children = grouped.get(group.id) ?? [];
    for (const [row, node] of children.entries()) {
      nodes[node.id] = bounds(
        MARGIN + column * (NODE_WIDTH + GAP_X + GROUP_PAD_X * 2),
        CONTENT_TOP + GROUP_TITLE + row * (NODE_HEIGHT + GAP_Y),
      );
    }
    column += 1;
  }
  for (const [row, node] of ungrouped.entries()) {
    nodes[node.id] = bounds(
      MARGIN + column * (NODE_WIDTH + GAP_X + GROUP_PAD_X * 2),
      CONTENT_TOP + GROUP_TITLE + row * (NODE_HEIGHT + GAP_Y),
    );
  }
  return nodes;
}

function hubSpokeNodes(spec: ArchitectureSpec): Record<string, Bounds> {
  const count = Math.max(1, spec.nodes.length - 1);
  const radius = Math.max(330, count * 58);
  const canvasSize = Math.ceil(radius * 2 + NODE_WIDTH + MARGIN * 2);
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const nodes: Record<string, Bounds> = {};
  const hub = spec.nodes[0];
  if (hub !== undefined) nodes[hub.id] = bounds(centerX - NODE_WIDTH / 2, centerY - NODE_HEIGHT / 2);
  for (let index = 1; index < spec.nodes.length; index += 1) {
    const angle = ((index - 1) / count) * Math.PI * 2 - Math.PI / 2;
    const node = spec.nodes[index]!;
    nodes[node.id] = bounds(
      Math.round(centerX + Math.cos(angle) * radius - NODE_WIDTH / 2),
      Math.round(centerY + Math.sin(angle) * radius - NODE_HEIGHT / 2),
    );
  }
  return nodes;
}

function bounds(x: number, y: number): Bounds {
  return Object.freeze({ x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
}

function boundGroups(spec: ArchitectureSpec, nodes: Readonly<Record<string, Bounds>>): Record<string, Bounds> {
  const result: Record<string, Bounds> = {};
  for (const [groupIndex, group] of spec.groups.entries()) {
    const children = spec.nodes
      .filter((node) => node.groupId === group.id)
      .map((node) => nodes[node.id])
      .filter((child): child is Bounds => child !== undefined);
    if (children.length === 0) {
      result[group.id] = Object.freeze({
        x: MARGIN + groupIndex * (NODE_WIDTH + GAP_X),
        y: CONTENT_TOP,
        width: NODE_WIDTH + GROUP_PAD_X * 2,
        height: NODE_HEIGHT + GROUP_TITLE + GROUP_PAD_BOTTOM,
      });
      continue;
    }
    const minX = Math.min(...children.map((child) => child.x));
    const minY = Math.min(...children.map((child) => child.y));
    const maxX = Math.max(...children.map((child) => child.x + child.width));
    const maxY = Math.max(...children.map((child) => child.y + child.height));
    result[group.id] = Object.freeze({
      x: minX - GROUP_PAD_X,
      y: minY - GROUP_TITLE,
      width: maxX - minX + GROUP_PAD_X * 2,
      height: maxY - minY + GROUP_TITLE + GROUP_PAD_BOTTOM,
    });
  }
  return result;
}

function canvasBounds(
  nodes: Readonly<Record<string, Bounds>>,
  groups: Readonly<Record<string, Bounds>>,
  hubSpoke: boolean,
): { width: number; height: number } {
  const all = [...Object.values(nodes), ...Object.values(groups)];
  const maxX = Math.max(0, ...all.map((item) => item.x + item.width));
  const maxY = Math.max(0, ...all.map((item) => item.y + item.height));
  const minX = Math.min(0, ...all.map((item) => item.x));
  const minY = Math.min(0, ...all.map((item) => item.y));
  const width = Math.max(800, Math.ceil(maxX - minX + MARGIN));
  const height = Math.max(600, Math.ceil(maxY - minY + MARGIN));
  return hubSpoke ? { width: Math.max(width, height), height: Math.max(width, height) } : { width, height };
}

function normalizeHub(
  spec: ArchitectureSpec,
  nodes: Record<string, Bounds>,
  groups: Record<string, Bounds>,
  canvas: { width: number; height: number },
): { nodes: Record<string, Bounds>; groups: Record<string, Bounds>; canvas: { width: number; height: number } } {
  if (spec.layout !== "hub-spoke" || spec.nodes[0] === undefined) return { nodes, groups, canvas };
  const hub = nodes[spec.nodes[0].id]!;
  const offsetX = canvas.width / 2 - (hub.x + hub.width / 2);
  const offsetY = canvas.height / 2 - (hub.y + hub.height / 2);
  const shiftedNodes = shiftBounds(nodes, offsetX, offsetY);
  const shiftedGroups = boundGroups(spec, shiftedNodes);
  return { nodes: shiftedNodes, groups: shiftedGroups, canvas };
}

function shiftBounds(source: Record<string, Bounds>, offsetX: number, offsetY: number): Record<string, Bounds> {
  return Object.fromEntries(
    Object.entries(source).map(([id, item]) => [id, Object.freeze({ ...item, x: item.x + offsetX, y: item.y + offsetY })]),
  );
}

function routeEdges(spec: ArchitectureSpec, nodes: Readonly<Record<string, Bounds>>): Record<string, EdgePath> {
  const vertical = spec.layout === "vertical";
  const result: Record<string, EdgePath> = {};
  for (const edge of spec.edges) {
    const source = nodes[edge.source]!;
    const target = nodes[edge.target]!;
    const points = vertical ? verticalPath(source, target) : horizontalPath(source, target);
    result[edge.id] = Object.freeze({ points: Object.freeze(points) });
  }
  return result;
}

function horizontalPath(source: Bounds, target: Bounds): readonly Point[] {
  const forward = target.x >= source.x;
  const start = { x: forward ? source.x + source.width : source.x, y: source.y + source.height / 2 };
  const end = { x: forward ? target.x : target.x + target.width, y: target.y + target.height / 2 };
  const middleX = Math.round((start.x + end.x) / 2);
  return Object.freeze([start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end]);
}

function verticalPath(source: Bounds, target: Bounds): readonly Point[] {
  const forward = target.y >= source.y;
  const start = { x: source.x + source.width / 2, y: forward ? source.y + source.height : source.y };
  const end = { x: target.x + target.width / 2, y: forward ? target.y : target.y + target.height };
  const middleY = Math.round((start.y + end.y) / 2);
  return Object.freeze([start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end]);
}
