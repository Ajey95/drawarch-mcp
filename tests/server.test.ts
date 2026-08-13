import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterEach, describe, expect, it } from "vitest";

const clients: Client[] = [];
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("DrawArch MCP stdio server", () => {
  it("lists V1 and V2 tools and creates portable reference recreations through a real MCP client", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-server-"));
    roots.push(root);
    const env = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    );
    env.DRAWARCH_OUTPUT_DIR = root;
    env.DRAWARCH_ONLINE_ASSETS = "false";
    const client = new Client(
      { name: "drawarch-test", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } },
    );
    clients.push(client);
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: ["--import", "tsx", "src/index.ts"],
        env,
      }),
    );

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_themes",
      "list_assets",
      "resolve_asset",
      "create_drawio",
      "validate_drawio",
      "prepare_reference_recreation",
      "update_reference_plan",
      "get_reference_plan",
      "create_reference_drawio",
      "validate_reference_drawio",
      "compare_reference_recreation",
    ]);

    const themes = await client.callTool({ name: "list_themes", arguments: {} });
    expect((themes.structuredContent as { themes: unknown[] }).themes).toHaveLength(6);

    const assets = await client.callTool({ name: "list_assets", arguments: { query: "postgres" } });
    expect((assets.structuredContent as { assets: { id: string }[] }).assets[0]?.id).toBe("database");

    const resolved = await client.callTool({ name: "resolve_asset", arguments: { query: "database" } });
    expect((resolved.structuredContent as { asset: { source: string } }).asset.source).toBe("bundled");

    const created = await client.callTool({
      name: "create_drawio",
      arguments: {
        title: "MCP Test",
        theme: "animated-sketch-dark",
        layout: "horizontal",
        outputFile: "mcp-test.drawio",
        groups: [{ id: "platform", label: "Platform" }],
        nodes: [
          { id: "api", label: "API", groupId: "platform", asset: "api-service" },
          { id: "database", label: "Database", groupId: "platform", asset: "database" },
        ],
        edges: [{ id: "query", source: "api", target: "database", flow: "request" }],
      },
    });
    const creation = created.structuredContent as { outputFile: string; validation: { valid: boolean } };
    expect(creation.outputFile).toBe("mcp-test.drawio");
    expect(creation.validation.valid).toBe(true);
    expect(await readFile(join(root, "mcp-test.drawio"), "utf8")).toContain("flowAnimation=1");
    const artifact = created.content.find((item) => item.type === "resource");
    expect(artifact?.type).toBe("resource");
    if (artifact?.type !== "resource" || !("blob" in artifact.resource)) {
      throw new Error("create_drawio did not return an embedded Draw.io resource");
    }
    expect(artifact.resource.mimeType).toBe("application/vnd.jgraph.mxfile");
    expect(Buffer.from(artifact.resource.blob, "base64").toString("utf8")).toContain("<mxfile");

    const validation = await client.callTool({
      name: "validate_drawio",
      arguments: { fileName: "mcp-test.drawio" },
    });
    expect((validation.structuredContent as { validation: { valid: boolean } }).validation.valid).toBe(true);

    const referencePlan = {
      title: "Exact reference",
      outputFile: "reference.drawio",
      canvas: { width: 800, height: 500, background: "#ffffff" },
      layers: [{ id: "main", label: "Main", zIndex: 0 }],
      elements: [
        { id: "api", type: "shape", layerId: "main", x: 60, y: 70, width: 220, height: 120, zIndex: 1, confidence: 0.99, label: "API", shape: "roundedRectangle", style: { fillColor: "#ffffff", strokeColor: "#111827" } },
        { id: "db", type: "shape", layerId: "main", x: 480, y: 70, width: 220, height: 120, zIndex: 1, confidence: 0.98, label: "Database", shape: "cylinder", style: { fillColor: "#f8fafc", strokeColor: "#111827" } },
        { id: "request", type: "connector", layerId: "main", zIndex: 0, confidence: 0.97, source: "api", target: "db", waypoints: [{ x: 380, y: 130 }], style: { strokeColor: "#2563eb", width: 2, endArrow: "block" } },
      ],
      fidelity: { minimumStructuralScore: 1, notes: [] },
    };
    const prepared = await client.callTool({ name: "prepare_reference_recreation", arguments: { plan: referencePlan, approved: true } });
    const preparedOutput = prepared.structuredContent as { planId: string; revision: number; approvalToken: string };
    expect(preparedOutput.approvalToken).toBeTruthy();
    const recreated = await client.callTool({ name: "create_reference_drawio", arguments: preparedOutput });
    const recreatedOutput = recreated.structuredContent as { outputFile: string; comparison: { structuralScore: number } };
    expect(recreatedOutput.outputFile).toBe("reference.drawio");
    expect(recreatedOutput.comparison.structuralScore).toBe(1);
    expect(await readFile(join(root, "reference.drawio"), "utf8")).toContain('x="60" y="70" width="220" height="120"');
    expect(recreated.content.some((item) => item.type === "resource")).toBe(true);
  }, 20_000);
});
