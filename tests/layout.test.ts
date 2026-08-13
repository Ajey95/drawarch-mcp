import { describe, expect, it } from "vitest";

import { parseArchitectureSpec, type LayoutName } from "../src/domain/schema.js";
import { layoutArchitecture, type Bounds } from "../src/layout/layout.js";

function makeSpec(layout: LayoutName) {
  return parseArchitectureSpec({
    title: "Platform",
    theme: "animated-sketch-dark",
    layout,
    outputFile: "platform.drawio",
    groups: [
      { id: "edge", label: "Edge" },
      { id: "cloud", label: "Cloud" },
      { id: "users", label: "Users" },
    ],
    nodes: [
      { id: "sensor", label: "Sensor", groupId: "edge", asset: "iot-sensor" },
      { id: "gateway", label: "Gateway", groupId: "edge", asset: "server" },
      { id: "broker", label: "Broker", groupId: "cloud", asset: "message-queue" },
      { id: "api", label: "API", groupId: "cloud", asset: "api-service" },
      { id: "database", label: "Database", groupId: "cloud", asset: "database" },
      { id: "dashboard", label: "Dashboard", groupId: "users", asset: "web-application" },
    ],
    edges: [
      { id: "e1", source: "sensor", target: "gateway" },
      { id: "e2", source: "gateway", target: "broker" },
      { id: "e3", source: "broker", target: "api" },
      { id: "e4", source: "api", target: "database" },
      { id: "e5", source: "api", target: "dashboard" },
    ],
  });
}

function intersects(left: Bounds, right: Bounds): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

describe("layoutArchitecture", () => {
  it.each<LayoutName>(["horizontal", "vertical", "edge-cloud", "hub-spoke", "pipeline"])(
    "produces deterministic non-overlapping geometry for %s",
    (layout) => {
      const first = layoutArchitecture(makeSpec(layout));
      const second = layoutArchitecture(makeSpec(layout));
      const nodes = Object.values(first.nodes);

      expect(first).toEqual(second);
      expect(first.canvas.width).toBeGreaterThan(600);
      expect(first.canvas.height).toBeGreaterThan(400);
      for (let left = 0; left < nodes.length; left += 1) {
        for (let right = left + 1; right < nodes.length; right += 1) {
          expect(intersects(nodes[left]!, nodes[right]!)).toBe(false);
        }
      }
    },
  );

  it.each<LayoutName>(["horizontal", "vertical", "edge-cloud", "hub-spoke", "pipeline"])(
    "keeps grouped nodes inside their group bounds for %s",
    (layout) => {
      const spec = makeSpec(layout);
      const result = layoutArchitecture(spec);

      for (const node of spec.nodes) {
        const nodeBounds = result.nodes[node.id]!;
        const groupBounds = result.groups[node.groupId!]!;
        expect(nodeBounds.x).toBeGreaterThanOrEqual(groupBounds.x);
        expect(nodeBounds.y).toBeGreaterThanOrEqual(groupBounds.y);
        expect(nodeBounds.x + nodeBounds.width).toBeLessThanOrEqual(groupBounds.x + groupBounds.width);
        expect(nodeBounds.y + nodeBounds.height).toBeLessThanOrEqual(groupBounds.y + groupBounds.height);
      }
    },
  );

  it("orders edge-cloud groups from edge to cloud to users", () => {
    const result = layoutArchitecture(makeSpec("edge-cloud"));

    expect(result.groups.edge!.x).toBeLessThan(result.groups.cloud!.x);
    expect(result.groups.cloud!.x).toBeLessThan(result.groups.users!.x);
  });

  it("reserves a clear title band above edge-cloud groups", () => {
    const result = layoutArchitecture(makeSpec("edge-cloud"));

    for (const group of Object.values(result.groups)) {
      expect(group.y).toBeGreaterThanOrEqual(96);
    }
  });

  it("places pipeline stages in input order", () => {
    const result = layoutArchitecture(makeSpec("pipeline"));
    const xPositions = ["sensor", "gateway", "broker", "api", "database", "dashboard"].map(
      (id) => result.nodes[id]!.x,
    );

    expect(xPositions).toEqual([...xPositions].sort((left, right) => left - right));
  });

  it("places the first node at the hub of a hub-spoke layout", () => {
    const result = layoutArchitecture(makeSpec("hub-spoke"));
    const hub = result.nodes.sensor!;
    const hubCenterX = hub.x + hub.width / 2;
    const hubCenterY = hub.y + hub.height / 2;

    expect(Math.abs(hubCenterX - result.canvas.width / 2)).toBeLessThan(2);
    expect(Math.abs(hubCenterY - result.canvas.height / 2)).toBeLessThan(2);
  });

  it("creates orthogonal waypoint paths bound to every edge", () => {
    const result = layoutArchitecture(makeSpec("horizontal"));

    expect(Object.keys(result.edges)).toEqual(["e1", "e2", "e3", "e4", "e5"]);
    for (const path of Object.values(result.edges)) {
      expect(path.points.length).toBeGreaterThanOrEqual(4);
      for (let index = 1; index < path.points.length; index += 1) {
        const previous = path.points[index - 1]!;
        const current = path.points[index]!;
        expect(previous.x === current.x || previous.y === current.y).toBe(true);
      }
    }
  });
});
