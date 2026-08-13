import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { DrawArchService } from "../src/app/generate.js";
import { AssetResolver } from "../src/assets/resolver.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("DrawArchService", () => {
  it("generates and validates a self-contained themed animated architecture", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-generate-"));
    roots.push(root);
    const service = new DrawArchService({ outputRoot: root, assetResolver: new AssetResolver() });

    const result = await service.generate({
      title: "IoT Safety Platform",
      theme: "animated-sketch-dark",
      layout: "edge-cloud",
      outputFile: "iot-safety.drawio",
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
        { id: "e1", source: "sensor", target: "gateway", flow: "realtime" },
        { id: "e2", source: "gateway", target: "broker", flow: "realtime" },
        { id: "e3", source: "broker", target: "api", flow: "request" },
        { id: "e4", source: "api", target: "database", flow: "batch" },
        { id: "e5", source: "api", target: "dashboard", flow: "monitoring" },
      ],
    });

    const xml = await readFile(result.outputPath, "utf8");
    expect(result.outputPath).toBe(join(root, "iot-safety.drawio"));
    expect(result.theme).toBe("animated-sketch-dark");
    expect(result.layout).toBe("edge-cloud");
    expect(result.counts).toEqual({ groups: 3, nodes: 6, edges: 5 });
    expect(result.warnings).toEqual([]);
    expect(result.validation).toEqual({ valid: true, issues: [] });
    expect(result.assets).toHaveLength(6);
    expect(xml).toContain("data:image/svg+xml,");
    expect(xml).toContain("flowAnimation=1");
    expect(xml).toContain('id="legend"');
    expect(xml).not.toMatch(/image=https?:/);
  });

  it("generates a valid file for every supported theme and layout combination", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-matrix-"));
    roots.push(root);
    const service = new DrawArchService({ outputRoot: root, assetResolver: new AssetResolver() });
    const themes = [
      "animated-sketch-dark",
      "animated-sketch-light",
      "professional-cloud",
      "minimal-corporate",
      "technical-blueprint",
      "presentation-neon",
    ] as const;
    const layouts = ["horizontal", "vertical", "edge-cloud", "hub-spoke", "pipeline"] as const;

    for (const theme of themes) {
      for (const layout of layouts) {
        const result = await service.generate({
          title: `${theme} ${layout}`,
          theme,
          layout,
          outputFile: `${theme}-${layout}.drawio`,
          groups: [{ id: "system", label: "System" }],
          nodes: [
            { id: "api", label: "API", groupId: "system", asset: "api-service" },
            { id: "database", label: "Database", groupId: "system", asset: "database" },
          ],
          edges: [{ id: "query", source: "api", target: "database", flow: "request" }],
        });
        expect(result.validation.valid, `${theme}/${layout}`).toBe(true);
      }
    }
  });
});
