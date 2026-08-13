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
  it("lists and invokes all five V1 tools through a real MCP client", async () => {
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

    const validation = await client.callTool({
      name: "validate_drawio",
      arguments: { fileName: "mcp-test.drawio" },
    });
    expect((validation.structuredContent as { validation: { valid: boolean } }).validation.valid).toBe(true);
  }, 20_000);
});
