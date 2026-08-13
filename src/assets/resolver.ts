import { createHash } from "node:crypto";

import {
  getBundledAsset,
  listBundledAssets,
  searchBundledAssets,
  type BundledAsset,
} from "./catalog.js";
import type { OnlineAssetProvider } from "./online.js";
import { sanitizeSvg, svgToDataUri } from "./sanitize.js";

export interface AssetRequest {
  readonly query: string;
  readonly category?: string;
  readonly provider?: string;
  readonly allowOnline: boolean;
}

export interface ResolvedAsset {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly provider: string;
  readonly source: "bundled" | "bundled-fallback" | "online";
  readonly mediaType: "image/svg+xml";
  readonly license: string;
  readonly sourceUrl?: string;
  readonly integrity: string;
  readonly dataUri: string;
}

export interface AssetResolverOptions {
  readonly onlineProvider?: OnlineAssetProvider;
}

export class AssetResolver {
  private readonly onlineProvider: OnlineAssetProvider | undefined;

  constructor(options: AssetResolverOptions = {}) {
    this.onlineProvider = options.onlineProvider;
  }

  async resolve(request: AssetRequest): Promise<ResolvedAsset> {
    const exact = getBundledAsset(request.query);
    if (exact !== undefined && (request.provider === undefined || request.provider.toLowerCase() === exact.provider)) {
      return fromBundled(exact, "bundled");
    }

    const semantic = findSemanticBundledMatch(request.query, request.provider);
    if (semantic !== undefined) return fromBundled(semantic, "bundled");

    if (request.allowOnline && this.onlineProvider !== undefined) {
      const online = (await this.onlineProvider.search(request.query, request.provider))[0];
      if (online !== undefined) {
        const svg = sanitizeSvg(online.svg);
        return {
          id: online.id,
          title: online.title,
          category: online.category,
          provider: online.provider,
          source: "online",
          mediaType: "image/svg+xml",
          license: online.license,
          sourceUrl: online.sourceUrl,
          integrity: hashSvg(svg),
          dataUri: svgToDataUri(svg),
        };
      }
    }

    const fallback = request.category === undefined
      ? undefined
      : listBundledAssets().find((asset) => asset.category === request.category);
    if (fallback !== undefined) return fromBundled(fallback, "bundled-fallback");

    throw new Error(`No safe asset could be resolved for: ${request.query}`);
  }
}

function findSemanticBundledMatch(query: string, provider?: string): BundledAsset | undefined {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return searchBundledAssets(query).find((asset) => {
    if (provider !== undefined && asset.provider !== provider.toLowerCase()) return false;
    const haystack = [asset.id, asset.title, ...asset.tags, ...asset.aliases].join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function fromBundled(asset: BundledAsset, source: "bundled" | "bundled-fallback"): ResolvedAsset {
  const svg = sanitizeSvg(asset.svg);
  return {
    id: asset.id,
    title: asset.title,
    category: asset.category,
    provider: asset.provider,
    source,
    mediaType: asset.mediaType,
    license: asset.license,
    integrity: hashSvg(svg),
    dataUri: svgToDataUri(svg),
  };
}

function hashSvg(svg: string): string {
  return `sha256:${createHash("sha256").update(svg).digest("hex")}`;
}
