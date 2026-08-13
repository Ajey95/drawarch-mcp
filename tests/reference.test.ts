import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ReferencePlanSchema } from "../src/reference/schema.js";
import { PlanStore } from "../src/reference/store.js";
import { compareReferencePlan, renderReferenceDrawio } from "../src/reference/render.js";

const plan = {
  title: "Reference architecture",
  outputFile: "reference.drawio",
  canvas: { width: 1000, height: 700, background: "#ffffff" },
  layers: [{ id: "main", label: "Main", zIndex: 0 }],
  elements: [
    { id: "box", type: "shape", layerId: "main", x: 40, y: 50, width: 240, height: 130, zIndex: 1, confidence: 0.98, label: "Gateway", shape: "roundedRectangle", style: { fillColor: "#ffffff", strokeColor: "#111827", fontColor: "#111827" } },
    { id: "icon", type: "asset", layerId: "main", x: 75, y: 78, width: 64, height: 64, zIndex: 2, confidence: 0.96, label: "Cloud", asset: { mode: "data", dataUri: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h10v10H0z%22%2F%3E%3C%2Fsvg%3E", mediaType: "image/svg+xml", provider: "user", license: "user-provided" } },
    { id: "label", type: "text", layerId: "main", x: 145, y: 85, width: 120, height: 40, zIndex: 3, confidence: 0.99, text: "API", style: { fontSize: 18, fontColor: "#111827", align: "center" } },
    { id: "target", type: "shape", layerId: "main", x: 500, y: 50, width: 220, height: 130, zIndex: 1, confidence: 0.97, label: "Database", shape: "cylinder", style: { fillColor: "#f8fafc", strokeColor: "#111827" } },
    { id: "flow", type: "connector", layerId: "main", zIndex: 0, confidence: 0.95, source: "box", target: "target", sourcePort: "east", targetPort: "west", waypoints: [{ x: 350, y: 115 }], label: "HTTPS", style: { strokeColor: "#2563eb", width: 2, dashed: true, endArrow: "block" } },
  ],
  fidelity: { minimumStructuralScore: 0.95, notes: ["match the reference"] },
} as const;

describe("reference recreation", () => {
  it("validates a complete absolute scene and rejects dangling connectors", () => {
    expect(ReferencePlanSchema.parse(plan).elements).toHaveLength(5);
    expect(() => ReferencePlanSchema.parse({ ...plan, elements: plan.elements.map((element) => element.id === "flow" ? { ...element, target: "missing" } : element) })).toThrow(/unknown target/i);
  });

  it("persists immutable revisions and binds approval to the current revision", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-plan-"));
    const store = new PlanStore({ root, secret: "test-secret" });
    const first = await store.prepare(plan);
    const approved = store.approve(first);
    expect(store.verifyApproval(first, approved)).toBe(true);
    const second = await store.update(first.planId, { ...plan, title: "Updated" }, first.revision);
    expect(second.revision).toBe(2);
    expect(store.verifyApproval(second, approved)).toBe(false);
    expect(JSON.parse(await readFile(second.path, "utf8")).title).toBe("Updated");
    await expect(store.update(first.planId, plan, first.revision)).rejects.toThrow(/revision conflict/i);
  });

  it("renders independent editable cells at exact coordinates and scores structure", () => {
    const parsed = ReferencePlanSchema.parse(plan);
    const xml = renderReferenceDrawio(parsed);
    expect(xml).toContain('id="ref-box"');
    expect(xml).toContain('x="40" y="50" width="240" height="130"');
    expect(xml).toContain('id="ref-icon"');
    expect(xml).toContain("data:image/svg+xml");
    expect(xml).toContain('<mxPoint x="350" y="115"/>');
    const comparison = compareReferencePlan(parsed, xml);
    expect(comparison.structuralScore).toBe(1);
    expect(comparison.missingElementIds).toEqual([]);
  });
});
