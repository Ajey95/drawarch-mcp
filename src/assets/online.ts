export interface OnlineAsset {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly provider: string;
  readonly tags: readonly string[];
  readonly mediaType: "image/svg+xml";
  readonly license: string;
  readonly sourceUrl: string;
  readonly svg: string;
}

export interface OnlineAssetProvider {
  search(query: string, provider?: string): Promise<readonly OnlineAsset[]>;
}

export interface IconifyProviderOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  readonly maxRedirects?: number;
}

interface IconifyCollection {
  readonly name?: string;
  readonly license?: { readonly title?: string };
}

interface IconifySearchResponse {
  readonly icons?: unknown;
  readonly collections?: unknown;
}

export class IconifyProvider implements OnlineAssetProvider {
  private readonly baseUrl: URL;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRedirects: number;

  constructor(options: IconifyProviderOptions = {}) {
    this.baseUrl = new URL(options.baseUrl ?? "https://api.iconify.design");
    if (this.baseUrl.protocol !== "https:") {
      throw new Error("Online asset provider must use HTTPS");
    }
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.maxBytes = options.maxBytes ?? 512_000;
    this.maxRedirects = options.maxRedirects ?? 2;
  }

  async search(query: string, provider?: string): Promise<readonly OnlineAsset[]> {
    const searchUrl = new URL("/search", this.baseUrl);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("limit", "10");
    if (provider !== undefined) {
      if (!safeSegment(provider)) throw new Error(`Invalid online icon collection: ${provider}`);
      searchUrl.searchParams.set("prefix", provider);
    }
    const body = await this.fetchText(searchUrl, ["application/json"]);
    const parsed = JSON.parse(body) as IconifySearchResponse;
    const icons = Array.isArray(parsed.icons) ? parsed.icons.filter((icon): icon is string => typeof icon === "string") : [];
    const collections = isRecord(parsed.collections) ? parsed.collections : {};

    return Promise.all(
      icons.slice(0, 10).map(async (iconId) => {
        const [prefix, name] = iconId.split(":", 2);
        if (prefix === undefined || name === undefined || !safeSegment(prefix) || !safeSegment(name)) {
          throw new Error(`Online provider returned an invalid icon identifier: ${iconId}`);
        }
        const iconUrl = new URL(`/${prefix}/${name}.svg`, this.baseUrl);
        const svg = await this.fetchText(iconUrl, ["image/svg+xml", "text/plain", "application/octet-stream"]);
        const collection = isRecord(collections[prefix]) ? (collections[prefix] as IconifyCollection) : undefined;
        return {
          id: iconId,
          title: titleCase(name),
          category: prefix,
          provider: prefix,
          tags: Object.freeze(query.toLowerCase().split(/\s+/).filter(Boolean)),
          mediaType: "image/svg+xml" as const,
          license: collection?.license?.title ?? "Iconify collection licence",
          sourceUrl: iconUrl.toString(),
          svg,
        };
      }),
    );
  }

  private async fetchText(initialUrl: URL, allowedContentTypes: readonly string[]): Promise<string> {
    let url = initialUrl;
    for (let redirect = 0; redirect <= this.maxRedirects; redirect += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(url, {
          headers: { Accept: allowedContentTypes.join(", ") },
          redirect: "manual",
          signal: controller.signal,
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (location === null || redirect === this.maxRedirects) {
            throw new Error("Online asset redirect limit exceeded");
          }
          const redirected = new URL(location, url);
          if (redirected.protocol !== "https:") {
            throw new Error("Online asset redirect must use HTTPS");
          }
          url = redirected;
          continue;
        }
        if (!response.ok) {
          throw new Error(`Online asset provider returned HTTP ${response.status}`);
        }
        const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
        if (!allowedContentTypes.includes(contentType)) {
          throw new Error(`Online asset provider returned unsupported content type: ${contentType || "missing"}`);
        }
        const declaredLength = Number(response.headers.get("content-length") ?? "0");
        if (declaredLength > this.maxBytes) {
          throw new Error("Online asset exceeds the configured byte limit");
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > this.maxBytes) {
          throw new Error("Online asset exceeds the configured byte limit");
        }
        return new TextDecoder().decode(bytes);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error("Online asset redirect limit exceeded");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeSegment(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function titleCase(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
