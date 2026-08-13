import type { AssetResolver, ResolvedAsset } from "../assets/resolver.js";
import { parseArchitectureSpec, type LayoutName, type ThemeName } from "../domain/schema.js";
import { atomicWriteDrawio } from "../files/output.js";
import { layoutArchitecture } from "../layout/layout.js";
import { renderDrawio } from "../render/xml.js";
import { getTheme } from "../themes/themes.js";
import { validateDrawio, type ValidationReport } from "../validate/drawio.js";

export interface DrawArchServiceOptions {
  readonly outputRoot: string;
  readonly assetResolver: AssetResolver;
}

export interface AssetProvenance {
  readonly nodeId: string;
  readonly assetId: string;
  readonly provider: string;
  readonly source: ResolvedAsset["source"];
  readonly license: string;
  readonly integrity: string;
  readonly sourceUrl?: string;
}

export interface GenerationResult {
  readonly outputPath: string;
  readonly theme: ThemeName;
  readonly layout: LayoutName;
  readonly counts: Readonly<{ groups: number; nodes: number; edges: number }>;
  readonly warnings: readonly string[];
  readonly assets: readonly AssetProvenance[];
  readonly validation: ValidationReport;
}

export class DrawArchService {
  private readonly outputRoot: string;
  private readonly assetResolver: AssetResolver;

  constructor(options: DrawArchServiceOptions) {
    this.outputRoot = options.outputRoot;
    this.assetResolver = options.assetResolver;
  }

  async generate(input: unknown): Promise<GenerationResult> {
    const spec = parseArchitectureSpec(input);
    const theme = getTheme(spec.theme);
    const layout = layoutArchitecture(spec);
    const resolved = await mapWithConcurrency(spec.nodes, 4, async (node) => ({
      nodeId: node.id,
      asset: await this.assetResolver.resolve({
        query: node.asset,
        ...(node.category === undefined ? {} : { category: node.category }),
        ...(node.provider === undefined ? {} : { provider: node.provider }),
        allowOnline: spec.onlineAssets,
      }),
    }));
    const assets = Object.fromEntries(resolved.map((entry) => [entry.nodeId, entry.asset]));
    const warnings = resolved
      .filter((entry) => entry.asset.source === "bundled-fallback")
      .map((entry) => `Node ${entry.nodeId} used generic bundled asset ${entry.asset.id}`);
    const xml = renderDrawio({ spec, layout, theme, assets });
    const validation = validateDrawio(xml);
    if (!validation.valid) {
      throw new Error(`Generated drawio validation failed: ${validation.issues.map((issue) => issue.code).join(", ")}`);
    }
    const outputPath = await atomicWriteDrawio({
      root: this.outputRoot,
      fileName: spec.outputFile,
      xml,
      overwrite: spec.overwrite,
    });
    return {
      outputPath,
      theme: spec.theme,
      layout: spec.layout,
      counts: Object.freeze({ groups: spec.groups.length, nodes: spec.nodes.length, edges: spec.edges.length }),
      warnings: Object.freeze(warnings),
      assets: Object.freeze(resolved.map(({ nodeId, asset }) => provenance(nodeId, asset))),
      validation,
    };
  }
}

function provenance(nodeId: string, asset: ResolvedAsset): AssetProvenance {
  return Object.freeze({
    nodeId,
    assetId: asset.id,
    provider: asset.provider,
    source: asset.source,
    license: asset.license,
    integrity: asset.integrity,
    ...(asset.sourceUrl === undefined ? {} : { sourceUrl: asset.sourceUrl }),
  });
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  operation: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(items[index]!);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
