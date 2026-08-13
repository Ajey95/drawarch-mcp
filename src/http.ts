import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer as createNodeServer, type IncomingMessage, type ServerResponse } from "node:http";

import { createMcpHandler } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";

import { resolveOutputPath } from "./files/output.js";
import { createServer } from "./server.js";
import { DRAWARCH_VERSION } from "./version.js";

export interface DrawArchHttpOptions {
  readonly host: string;
  readonly port: number;
  readonly outputRoot: string;
  readonly onlineAssets: boolean;
  readonly iconifyBaseUrl?: string;
  readonly apiKey?: string;
  readonly allowedHosts: readonly string[];
  readonly allowedOrigins: readonly string[];
  readonly publicBaseUrl?: string;
  readonly approvalSecret?: string;
}

export interface RunningDrawArchHttpServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

export async function createDrawArchHttpServer(options: DrawArchHttpOptions): Promise<RunningDrawArchHttpServer> {
  const validateHost = hostHeaderValidation([...options.allowedHosts]);
  const validateOrigin = originValidation([...options.allowedOrigins]);
  const approvalSecret = options.approvalSecret ?? randomBytes(32).toString("hex");
  const handler = createMcpHandler(() => createServer({
    outputRoot: options.outputRoot,
    onlineAssets: options.onlineAssets,
    ...(options.iconifyBaseUrl === undefined ? {} : { iconifyBaseUrl: options.iconifyBaseUrl }),
    approvalSecret,
  }), { responseMode: "json" });
  const nodeMcpHandler = toNodeHandler(handler, {
    onerror: (error) => console.error(JSON.stringify({ event: "http_transport_error", message: error.message })),
  });
  const adaptedMcpHandler = async (request: IncomingMessage, response: ServerResponse, parsedBody?: unknown): Promise<void> => {
    await nodeMcpHandler(
      request as unknown as Parameters<typeof nodeMcpHandler>[0],
      response as unknown as Parameters<typeof nodeMcpHandler>[1],
      parsedBody,
    );
  };
  const server = createNodeServer((request, response) => {
    void routeRequest(request, response, options, validateHost, validateOrigin, adaptedMcpHandler);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("HTTP server did not expose a TCP address");
  const hostForUrl = options.host.includes(":") ? `[${options.host}]` : options.host;
  const baseUrl = options.publicBaseUrl?.replace(/\/$/, "") ?? `http://${hostForUrl}:${address.port}`;
  return Object.freeze({
    baseUrl,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error))),
  });
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: DrawArchHttpOptions,
  validateHost: (request: IncomingMessage, response: ServerResponse) => boolean,
  validateOrigin: (request: IncomingMessage, response: ServerResponse) => boolean,
  mcpHandler: (request: IncomingMessage, response: ServerResponse, parsedBody?: unknown) => Promise<void>,
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (url.pathname === "/health" && request.method === "GET") {
      sendJson(response, 200, { status: "ok", service: "drawarch-mcp", version: DRAWARCH_VERSION });
      return;
    }
    if (!validateHost(request, response) || !validateOrigin(request, response)) return;
    if (!authorized(request, options.apiKey)) {
      response.writeHead(401, { "content-type": "application/json", "www-authenticate": "Bearer" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (url.pathname === "/mcp") {
      setCorsHeaders(response, request.headers.origin);
      if (request.method === "OPTIONS") {
        response.writeHead(204).end();
        return;
      }
      await mcpHandler(request, response);
      return;
    }
    if (url.pathname.startsWith("/files/") && request.method === "GET") {
      await sendDrawioFile(response, options.outputRoot, url.pathname.slice("/files/".length));
      return;
    }
    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
    else response.end();
    console.error(JSON.stringify({ event: "http_request_error", message: error instanceof Error ? error.message : "Unknown error" }));
  }
}

function authorized(request: IncomingMessage, apiKey: string | undefined): boolean {
  if (apiKey === undefined) return true;
  const authorization = request.headers.authorization;
  if (authorization === undefined || !authorization.startsWith("Bearer ")) return false;
  const supplied = createHash("sha256").update(authorization.slice(7)).digest();
  const expected = createHash("sha256").update(apiKey).digest();
  return timingSafeEqual(supplied, expected);
}

async function sendDrawioFile(response: ServerResponse, outputRoot: string, encodedName: string): Promise<void> {
  let fileName: string;
  try {
    fileName = decodeURIComponent(encodedName);
  } catch {
    sendJson(response, 400, { error: "invalid_file_name" });
    return;
  }
  let path: string;
  try {
    path = resolveOutputPath(outputRoot, fileName);
  } catch {
    sendJson(response, 400, { error: "invalid_file_name" });
    return;
  }
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "content-type": "application/vnd.jgraph.mxfile; charset=utf-8",
      "content-length": metadata.size,
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    });
    createReadStream(path).pipe(response);
  } catch {
    sendJson(response, 404, { error: "file_not_found" });
  }
}

function setCorsHeaders(response: ServerResponse, origin: string | undefined): void {
  if (origin !== undefined) response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type,mcp-protocol-version,mcp-session-id");
  response.setHeader("access-control-expose-headers", "mcp-protocol-version,mcp-session-id");
  response.setHeader("vary", "Origin");
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(value));
}
