import { resolve } from "node:path";

export type DrawArchTransport = "stdio" | "http";

export interface DrawArchRuntimeConfig {
  readonly transport: DrawArchTransport;
  readonly outputRoot: string;
  readonly onlineAssets: boolean;
  readonly iconifyBaseUrl?: string;
  readonly host: string;
  readonly port: number;
  readonly apiKey?: string;
  readonly allowedHosts: readonly string[];
  readonly allowedOrigins: readonly string[];
  readonly publicBaseUrl?: string;
  readonly approvalSecret?: string;
}

export function runtimeConfig(env: NodeJS.ProcessEnv = process.env): DrawArchRuntimeConfig {
  const transport = env.DRAWARCH_TRANSPORT?.toLowerCase() === "http" ? "http" : "stdio";
  const port = parsePort(env.PORT);
  return Object.freeze({
    transport,
    outputRoot: resolve(env.DRAWARCH_OUTPUT_DIR ?? ".drawarch-output"),
    onlineAssets: env.DRAWARCH_ONLINE_ASSETS?.toLowerCase() === "true",
    ...(env.DRAWARCH_ICONIFY_BASE_URL === undefined ? {} : { iconifyBaseUrl: env.DRAWARCH_ICONIFY_BASE_URL }),
    host: env.HOST?.trim() || "127.0.0.1",
    port,
    ...(env.DRAWARCH_API_KEY === undefined ? {} : { apiKey: env.DRAWARCH_API_KEY }),
    allowedHosts: splitList(env.DRAWARCH_ALLOWED_HOSTS, ["localhost", "127.0.0.1", "[::1]"]),
    allowedOrigins: splitList(env.DRAWARCH_ALLOWED_ORIGINS, ["localhost", "127.0.0.1", "[::1]"]),
    ...(env.DRAWARCH_PUBLIC_BASE_URL === undefined ? {} : { publicBaseUrl: env.DRAWARCH_PUBLIC_BASE_URL }),
    ...(env.DRAWARCH_APPROVAL_SECRET === undefined ? {} : { approvalSecret: env.DRAWARCH_APPROVAL_SECRET }),
  });
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error("PORT must be an integer from 0 to 65535");
  return port;
}

function splitList(value: string | undefined, fallback: readonly string[]): readonly string[] {
  if (value === undefined) return Object.freeze([...fallback]);
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) throw new Error("Allowed host/origin lists cannot be empty");
  return Object.freeze(items);
}
