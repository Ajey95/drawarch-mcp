#!/usr/bin/env node
import { resolve } from "node:path";

import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createServer } from "./server.js";

const outputRoot = resolve(process.env.DRAWARCH_OUTPUT_DIR ?? ".drawarch-output");
const onlineAssets = process.env.DRAWARCH_ONLINE_ASSETS?.toLowerCase() === "true";
const iconifyBaseUrl = process.env.DRAWARCH_ICONIFY_BASE_URL;

serveStdio(() =>
  createServer({
    outputRoot,
    onlineAssets,
    ...(iconifyBaseUrl === undefined ? {} : { iconifyBaseUrl }),
  }),
  {
    onerror: (error) => {
      console.error(JSON.stringify({ event: "transport_error", code: "MCP_TRANSPORT_ERROR", message: error.message }));
    },
  },
);

console.error(JSON.stringify({ event: "server_started", transport: "stdio", onlineAssets }));
