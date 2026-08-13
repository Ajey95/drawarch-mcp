import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";

import { createDrawArchHttpServer, type RunningDrawArchHttpServer } from "../src/http.js";

const roots: string[] = [];
const servers: RunningDrawArchHttpServer[] = [];
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("DrawArch Streamable HTTP server", () => {
  it("serves health publicly and protects MCP with an optional bearer token", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-http-"));
    roots.push(root);
    const server = await createDrawArchHttpServer({
      host: "127.0.0.1",
      port: 0,
      outputRoot: root,
      onlineAssets: false,
      apiKey: "test-secret",
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: ["localhost"],
    });
    servers.push(server);

    const health = await fetch(`${server.baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok", service: "drawarch-mcp", version: "0.2.0" });

    const unauthorized = await fetch(`${server.baseUrl}/mcp`, { method: "POST" });
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("www-authenticate")).toBe("Bearer");
  });

  it("lists tools through a real Streamable HTTP MCP client", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-http-"));
    roots.push(root);
    const server = await createDrawArchHttpServer({
      host: "127.0.0.1",
      port: 0,
      outputRoot: root,
      onlineAssets: false,
      apiKey: "test-secret",
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: ["localhost"],
    });
    servers.push(server);
    const client = new Client(
      { name: "drawarch-http-test", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } },
    );
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(new URL(`${server.baseUrl}/mcp`), {
      requestInit: { headers: { Authorization: "Bearer test-secret" } },
    }));

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toContain("create_drawio");
  });

  it("downloads only safe Draw.io files from the output root", async () => {
    const root = await mkdtemp(join(tmpdir(), "drawarch-http-"));
    roots.push(root);
    await writeFile(join(root, "safe.drawio"), "<mxfile/>", "utf8");
    const server = await createDrawArchHttpServer({
      host: "127.0.0.1",
      port: 0,
      outputRoot: root,
      onlineAssets: false,
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: ["localhost"],
    });
    servers.push(server);

    const download = await fetch(`${server.baseUrl}/files/safe.drawio`);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toContain("application/vnd.jgraph.mxfile");
    expect(download.headers.get("content-disposition")).toContain('filename="safe.drawio"');
    expect(await download.text()).toBe("<mxfile/>");

    expect((await fetch(`${server.baseUrl}/files/%2e%2e%2fsecret.drawio`)).status).toBe(400);
  });
});
