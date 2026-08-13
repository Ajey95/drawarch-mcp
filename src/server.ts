import { readFile } from "node:fs/promises";

import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { DrawArchService } from "./app/generate.js";
import { listBundledAssets, searchBundledAssets } from "./assets/catalog.js";
import { IconifyProvider } from "./assets/online.js";
import { AssetResolver } from "./assets/resolver.js";
import { ArchitectureSpecSchema } from "./domain/schema.js";
import { drawioArtifact } from "./files/artifact.js";
import { resolveOutputPath } from "./files/output.js";
import { listThemes } from "./themes/themes.js";
import { validateDrawio } from "./validate/drawio.js";
import { DRAWARCH_VERSION } from "./version.js";

export interface DrawArchServerOptions {
  readonly outputRoot: string;
  readonly onlineAssets: boolean;
  readonly iconifyBaseUrl?: string;
}

const ThemeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  background: z.string(),
});

const AssetSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  provider: z.string(),
  tags: z.array(z.string()),
  mediaType: z.string(),
  license: z.string(),
  source: z.string(),
});

const ValidationSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.object({ code: z.string(), message: z.string(), cellId: z.string().optional() })),
});

export function createServer(options: DrawArchServerOptions): McpServer {
  const onlineProvider = options.onlineAssets
    ? new IconifyProvider({ ...(options.iconifyBaseUrl === undefined ? {} : { baseUrl: options.iconifyBaseUrl }) })
    : undefined;
  const resolver = new AssetResolver({ ...(onlineProvider === undefined ? {} : { onlineProvider }) });
  const service = new DrawArchService({ outputRoot: options.outputRoot, assetResolver: resolver });
  const server = new McpServer({ name: "drawarch-mcp", version: DRAWARCH_VERSION });

  server.registerTool(
    "list_themes",
    {
      title: "List DrawArch Themes",
      description: "List selectable visual themes for editable animated diagrams.net architecture diagrams.",
      inputSchema: z.object({}),
      outputSchema: z.object({ themes: z.array(ThemeSummarySchema) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => timed("list_themes", async () => {
      const output = {
        themes: listThemes().map((theme) => ({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          background: theme.canvas.background,
        })),
      };
      return success(output);
    }),
  );

  server.registerTool(
    "list_assets",
    {
      title: "Search Bundled SVG Assets",
      description: "Search safe bundled real-world SVG architecture assets by name, alias, tag, category, or provider.",
      inputSchema: z.object({
        query: z.string().trim().max(120).optional().describe("Text such as postgres, smartphone, telemetry, or server"),
        category: z.string().trim().max(80).optional(),
        provider: z.string().trim().max(80).optional(),
      }),
      outputSchema: z.object({ assets: z.array(AssetSummarySchema) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ query, category, provider }) => timed("list_assets", async () => {
      const candidates = query === undefined ? listBundledAssets() : searchBundledAssets(query);
      const assets = candidates
        .filter((asset) => category === undefined || asset.category === category)
        .filter((asset) => provider === undefined || asset.provider === provider.toLowerCase())
        .map(assetSummary);
      return success({ assets });
    }),
  );

  server.registerTool(
    "resolve_asset",
    {
      title: "Resolve Architecture SVG",
      description: "Resolve one architecture component to a safe embedded SVG using bundled assets first and online Iconify-compatible assets when enabled.",
      inputSchema: z.object({
        query: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1).max(80).optional(),
        provider: z.string().trim().min(1).max(80).optional(),
        allowOnline: z.boolean().default(false),
      }),
      outputSchema: z.object({ asset: AssetSummarySchema.extend({ integrity: z.string(), sourceUrl: z.string().optional(), embedded: z.boolean() }) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ query, category, provider, allowOnline }) => timed("resolve_asset", async () => {
      if (allowOnline && !options.onlineAssets) return failure("ONLINE_ASSETS_DISABLED", "Online asset resolution is disabled by server configuration");
      try {
        const asset = await resolver.resolve({
          query,
          ...(category === undefined ? {} : { category }),
          ...(provider === undefined ? {} : { provider }),
          allowOnline,
        });
        const output = {
          asset: {
            id: asset.id,
            title: asset.title,
            category: asset.category,
            provider: asset.provider,
            tags: [],
            mediaType: asset.mediaType,
            license: asset.license,
            source: asset.source,
            integrity: asset.integrity,
            ...(asset.sourceUrl === undefined ? {} : { sourceUrl: asset.sourceUrl }),
            embedded: true,
          },
        };
        return success(output);
      } catch (error) {
        return failure("ASSET_RESOLUTION_FAILED", errorMessage(error));
      }
    }),
  );

  server.registerTool(
    "create_drawio",
    {
      title: "Create Editable Architecture Diagram",
      description: "Generate a self-contained native .drawio architecture with selectable theme, real SVGs, deterministic layout, animated colour-coded datapaths, and editable objects.",
      inputSchema: ArchitectureSpecSchema,
      outputSchema: z.object({
        outputFile: z.string(),
        outputPath: z.string(),
        theme: z.string(),
        layout: z.string(),
        counts: z.object({ groups: z.number(), nodes: z.number(), edges: z.number() }),
        warnings: z.array(z.string()),
        assets: z.array(z.object({
          nodeId: z.string(),
          assetId: z.string(),
          provider: z.string(),
          source: z.string(),
          license: z.string(),
          integrity: z.string(),
          sourceUrl: z.string().optional(),
        })),
        validation: ValidationSchema,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => timed("create_drawio", async () => {
      if (input.onlineAssets && !options.onlineAssets) return failure("ONLINE_ASSETS_DISABLED", "Online asset resolution is disabled by server configuration");
      try {
        const generated = await service.generate(input);
        const artifact = drawioArtifact(input.outputFile, await readFile(generated.outputPath, "utf8"));
        return success({
          outputFile: input.outputFile,
          outputPath: generated.outputPath,
          theme: generated.theme,
          layout: generated.layout,
          counts: generated.counts,
          warnings: [...generated.warnings],
          assets: generated.assets.map((asset) => ({ ...asset })),
          validation: generated.validation,
        }, [{
          type: "resource",
          resource: {
            uri: artifact.uri,
            mimeType: artifact.mimeType,
            blob: artifact.blob,
          },
        }]);
      } catch (error) {
        return failure("DRAWIO_GENERATION_FAILED", errorMessage(error));
      }
    }),
  );

  server.registerTool(
    "validate_drawio",
    {
      title: "Validate a DrawArch File",
      description: "Validate a .drawio file inside the configured output directory for structural errors, dangling references, duplicate IDs, and unsafe images.",
      inputSchema: z.object({
        fileName: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/),
      }),
      outputSchema: z.object({ fileName: z.string(), validation: ValidationSchema }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ fileName }) => timed("validate_drawio", async () => {
      try {
        const path = resolveOutputPath(options.outputRoot, fileName);
        const xml = await readFile(path, "utf8");
        return success({ fileName, validation: validateDrawio(xml) });
      } catch (error) {
        return failure("DRAWIO_VALIDATION_FAILED", errorMessage(error));
      }
    }),
  );

  return server;
}

function assetSummary(asset: ReturnType<typeof listBundledAssets>[number]) {
  return {
    id: asset.id,
    title: asset.title,
    category: asset.category,
    provider: asset.provider,
    tags: [...asset.tags],
    mediaType: asset.mediaType,
    license: asset.license,
    source: asset.source,
  };
}

type ExtraContent = {
  readonly type: "resource";
  readonly resource: {
    readonly uri: string;
    readonly mimeType: string;
    readonly blob: string;
  };
};

function success<T extends Record<string, unknown>>(output: T, extraContent: readonly ExtraContent[] = []) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output) }, ...extraContent],
    structuredContent: output,
  };
}

function failure(code: string, message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ code, message }) }],
    isError: true,
  };
}

async function timed<T>(tool: string, operation: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await operation();
  } finally {
    const elapsedMs = Math.round(performance.now() - started);
    console.error(JSON.stringify({ event: "tool_complete", tool, elapsedMs }));
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
