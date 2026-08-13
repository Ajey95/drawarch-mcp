import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import sharp from "sharp";

import { sanitizeSvg, svgToDataUri } from "./sanitize.js";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

export interface EmbeddedRemoteImage {
  readonly dataUri: string;
  readonly mediaType: "image/svg+xml" | "image/png";
  readonly sourceUrl: string;
  readonly integrity: string;
  readonly byteLength: number;
}

export interface RemoteImageOptions {
  readonly fetcher?: typeof fetch;
  readonly resolveHost?: (host: string) => Promise<readonly string[]>;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
}

export async function fetchRemoteImage(url: string, options: RemoteImageOptions = {}): Promise<EmbeddedRemoteImage> {
  const fetcher = options.fetcher ?? fetch;
  const resolveHost = options.resolveHost ?? systemResolve;
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  let current = new URL(url);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await validateRemoteUrl(current, resolveHost);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    let response: Response;
    try {
      response = await fetcher(current, { redirect: "manual", signal: controller.signal, headers: { accept: "image/svg+xml,image/png,image/jpeg,image/webp" } });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location === null || redirects === 3) throw new Error("Remote image redirect was invalid or exceeded the limit");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`Remote image request failed with HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > maxBytes) throw new Error("Remote image exceeds the byte limit");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > maxBytes) throw new Error("Remote image is empty or exceeds the byte limit");
    return embedBytes(bytes, response.headers.get("content-type") ?? "", current.toString());
  }
  throw new Error("Remote image redirect limit exceeded");
}

export function normalizeImageDataUri(value: string): string {
  const match = /^data:(image\/(?:svg\+xml|png|jpeg|webp))(;base64)?,([\s\S]*)$/i.exec(value);
  if (match === null) throw new Error("Unsupported image data URI");
  const mediaType = match[1]!.toLowerCase();
  const content = match[2] === undefined ? decodeURIComponent(match[3]!) : Buffer.from(match[3]!, "base64").toString("utf8");
  if (mediaType === "image/svg+xml") return svgToDataUri(sanitizeSvg(content));
  if (match[2] === undefined) throw new Error("Raster image data URIs must use base64 encoding");
  const bytes = Buffer.from(match[3]!, "base64");
  if (!matchesRasterSignature(bytes, mediaType)) throw new Error("Malformed image data URI");
  return value;
}

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    const [a, b, c] = parts as [number, number, number, number];
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return !(normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") || normalized.startsWith("::ffff:"));
  }
  return false;
}

async function validateRemoteUrl(url: URL, resolveHost: (host: string) => Promise<readonly string[]>): Promise<void> {
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") throw new Error("Remote images require a standard HTTPS URL");
  const addresses = isIP(url.hostname) === 0 ? await resolveHost(url.hostname) : [url.hostname];
  if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) throw new Error("Remote images must resolve only to a public internet host");
}

async function systemResolve(host: string): Promise<readonly string[]> { return (await lookup(host, { all: true, verbatim: true })).map((entry) => entry.address); }

async function embedBytes(bytes: Buffer, contentType: string, sourceUrl: string): Promise<EmbeddedRemoteImage> {
  const svgLike = contentType.toLowerCase().includes("svg") || bytes.subarray(0, 256).toString("utf8").trimStart().startsWith("<svg");
  let embedded: Buffer;
  let mediaType: "image/svg+xml" | "image/png";
  let dataUri: string;
  if (svgLike) {
    try { embedded = Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8"); } catch { throw new Error("Unsafe SVG content was rejected"); }
    mediaType = "image/svg+xml";
    dataUri = svgToDataUri(embedded.toString("utf8"));
  } else {
    const metadata = await sharp(bytes, { limitInputPixels: MAX_PIXELS }).metadata();
    if (metadata.width === undefined || metadata.height === undefined || metadata.width * metadata.height > MAX_PIXELS) throw new Error("Remote image has invalid or excessive pixel dimensions");
    embedded = await sharp(bytes, { limitInputPixels: MAX_PIXELS }).rotate().png({ compressionLevel: 9 }).toBuffer();
    mediaType = "image/png";
    dataUri = `data:image/png;base64,${embedded.toString("base64")}`;
  }
  return Object.freeze({ dataUri, mediaType, sourceUrl, integrity: `sha256-${createHash("sha256").update(embedded).digest("base64")}`, byteLength: embedded.length });
}

function matchesRasterSignature(bytes: Buffer, mediaType: string): boolean {
  if (mediaType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mediaType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (mediaType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}
