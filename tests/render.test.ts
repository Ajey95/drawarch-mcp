import { describe, expect, it } from "vitest";

import { AssetResolver, type ResolvedAsset } from "../src/assets/resolver.js";
import { parseArchitectureSpec } from "../src/domain/schema.js";
import { layoutArchitecture } from "../src/layout/layout.js";
import { renderDrawio } from "../src/render/xml.js";
import { getTheme } from "../src/themes/themes.js";

async function fixture() {
  const spec = parseArchitectureSpec({
    title: "Sensors < Cloud & Users",
    theme: "animated-sketch-dark",
    layout: "horizontal",
    outputFile: "fixture.drawio",
    groups: [
      { id: "edge", label: "Edge & Devices" },
      { id: "cloud", label: "Cloud" },
    ],
    nodes: [
      { id: "sensor", label: "Sensor <A>", groupId: "edge", asset: "iot-sensor" },
      { id: "api", label: "API", groupId: "cloud", asset: "api-service" },
      { id: "monitor", label: "Monitor", groupId: "cloud", asset: "monitoring" },
    ],
    edges: [
      { id: "telemetry", source: "sensor", target: "api", label: "MQTT", flow: "realtime", animated: true },
      { id: "metrics", source: "api", target: "monitor", label: "metrics", flow: "monitoring", animated: true },
    ],
  });
  const resolver = new AssetResolver();
  const entries = await Promise.all(
    spec.nodes.map(async (node) => [node.id, await resolver.resolve({ query: node.asset, allowOnline: false })] as const),
  );
  const assets: Readonly<Record<string, ResolvedAsset>> = Object.fromEntries(entries);
  return { spec, layout: layoutArchitecture(spec), theme: getTheme(spec.theme), assets };
}

describe("renderDrawio", () => {
  it("renders editable uncompressed diagrams.net XML", async () => {
    const input = await fixture();
    const xml = renderDrawio(input);

    expect(xml).toContain('<mxfile host="DrawArch" compressed="false"');
    expect(xml).toContain("<mxGraphModel");
    expect(xml).toContain('<mxCell id="0"/>');
    expect(xml).toContain('<mxCell id="1" parent="0"/>');
    expect(xml).toContain('id="group-edge"');
    expect(xml).toContain('id="node-sensor"');
    expect(xml).toContain('id="image-sensor"');
    expect(xml).toContain('id="label-sensor"');
    expect(xml).toContain('id="edge-telemetry"');
  });

  it("embeds SVG assets and keeps provenance as metadata", async () => {
    const xml = renderDrawio(await fixture());
    const sensorImage = xml.match(/<mxCell id="image-sensor"[^>]+>/)?.[0] ?? "";

    expect(sensorImage).toContain("image=data:image/svg+xml,%3Csvg");
    expect(sensorImage).toContain('drawarchAssetSource="bundled"');
    expect(sensorImage).toContain('drawarchLicense="MIT"');
    expect(sensorImage).not.toMatch(/image=https?:/);
  });

  it("binds animated colour-coded edges to editable node cells", async () => {
    const xml = renderDrawio(await fixture());
    const edge = xml.match(/<mxCell id="edge-telemetry"[^>]+>/)?.[0] ?? "";

    expect(edge).toContain('source="node-sensor"');
    expect(edge).toContain('target="node-api"');
    expect(edge).toContain("flowAnimation=1");
    expect(edge).toContain("flowDuration=700");
    expect(edge).toContain("flowTiming=linear");
    expect(edge).toContain("flowDirection=normal");
    expect(edge).toContain("strokeColor=#38BDF8");
  });

  it("adds an editable legend when multiple flow categories are present", async () => {
    const xml = renderDrawio(await fixture());

    expect(xml).toContain('id="legend"');
    expect(xml).toContain('id="legend-realtime"');
    expect(xml).toContain('id="legend-monitoring"');
  });

  it("keeps group titles and subtitles in separate clipped header cells", async () => {
    const input = await fixture();
    const spec = parseArchitectureSpec({
      ...input.spec,
      groups: [
        { id: "edge", label: "1. Environmental Sensing", subtitle: "Validate environmental conditions and derive risk" },
        { id: "cloud", label: "Cloud" },
      ],
    });
    const xml = renderDrawio({ ...input, spec, layout: layoutArchitecture(spec) });
    const group = xml.match(/<mxCell id="group-edge"[^>]+>/)?.[0] ?? "";
    const title = xml.match(/<mxCell id="group-title-edge"[\s\S]*?<\/mxCell>/)?.[0] ?? "";
    const subtitle = xml.match(/<mxCell id="group-subtitle-edge"[\s\S]*?<\/mxCell>/)?.[0] ?? "";

    expect(group).toContain('value=""');
    expect(group).toContain("startSize=68");
    expect(title).toContain('value="1. Environmental Sensing"');
    expect(title).toContain('parent="group-edge"');
    expect(title).toContain("overflow=hidden");
    expect(title).toContain("fontSize=14");
    expect(title).toContain('height="34"');
    expect(subtitle).toContain('value="Validate environmental conditions and derive risk"');
    expect(subtitle).toContain('parent="group-edge"');
    expect(subtitle).toContain("overflow=hidden");
    expect(subtitle).toContain("fontSize=10");
    expect(subtitle).toContain('height="26"');
  });

  it("gives node titles and subtitles dedicated readable regions", async () => {
    const input = await fixture();
    const spec = parseArchitectureSpec({
      ...input.spec,
      nodes: input.spec.nodes.map((node) =>
        node.id === "sensor" ? { ...node, subtitle: "Gas, temperature, humidity and pressure" } : node,
      ),
    });
    const xml = renderDrawio({ ...input, spec, layout: layoutArchitecture(spec) });
    const nodeGeometry = xml.match(/<mxCell id="node-sensor"[\s\S]*?<mxGeometry[^>]+/)?.[0] ?? "";
    const title = xml.match(/<mxCell id="label-sensor"[^>]+>/)?.[0] ?? "";
    const subtitle = xml.match(/<mxCell id="subtitle-sensor"[^>]+>/)?.[0] ?? "";

    expect(nodeGeometry).toContain('height="152"');
    expect(title).toContain('value="Sensor &lt;A&gt;"');
    expect(title).toContain("overflow=hidden");
    expect(subtitle).toContain('value="Gas, temperature, humidity and pressure"');
    expect(subtitle).toContain("overflow=hidden");
  });

  it("escapes user-controlled XML values", async () => {
    const xml = renderDrawio(await fixture());

    expect(xml).toContain("Sensors &lt; Cloud &amp; Users");
    expect(xml).toContain("Edge &amp; Devices");
    expect(xml).toContain("Sensor &lt;A&gt;");
    expect(xml).not.toContain("Sensor <A>");
  });
});
