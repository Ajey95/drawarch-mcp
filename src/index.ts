#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { runtimeConfig } from "./config.js";
import { createDrawArchHttpServer } from "./http.js";
import { createServer } from "./server.js";

const config = runtimeConfig();

if (config.transport === "http") {
  const running = await createDrawArchHttpServer({
    host: config.host,
    port: config.port,
    outputRoot: config.outputRoot,
    onlineAssets: config.onlineAssets,
    allowedHosts: config.allowedHosts,
    allowedOrigins: config.allowedOrigins,
    ...(config.iconifyBaseUrl === undefined ? {} : { iconifyBaseUrl: config.iconifyBaseUrl }),
    ...(config.apiKey === undefined ? {} : { apiKey: config.apiKey }),
    ...(config.publicBaseUrl === undefined ? {} : { publicBaseUrl: config.publicBaseUrl }),
    ...(config.approvalSecret === undefined ? {} : { approvalSecret: config.approvalSecret }),
  });
  console.error(JSON.stringify({ event: "server_started", transport: "http", baseUrl: running.baseUrl, onlineAssets: config.onlineAssets }));
} else {
  serveStdio(() =>
    createServer({
      outputRoot: config.outputRoot,
      onlineAssets: config.onlineAssets,
      ...(config.iconifyBaseUrl === undefined ? {} : { iconifyBaseUrl: config.iconifyBaseUrl }),
      ...(config.approvalSecret === undefined ? {} : { approvalSecret: config.approvalSecret }),
    }),
    {
      onerror: (error) => {
        console.error(JSON.stringify({ event: "transport_error", code: "MCP_TRANSPORT_ERROR", message: error.message }));
      },
    },
  );

  console.error(JSON.stringify({ event: "server_started", transport: "stdio", onlineAssets: config.onlineAssets }));
}
