import { z } from "zod";

const Identifier = z.string().trim().min(1).max(96).regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const Coordinate = z.number().finite().min(0).max(100_000);
const Dimension = z.number().finite().positive().max(100_000);
const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/);
const Common = {
  id: Identifier,
  layerId: Identifier,
  parentId: Identifier.optional(),
  zIndex: z.number().int().min(-10_000).max(10_000),
  confidence: z.number().min(0).max(1),
};
const Bounds = { x: Coordinate, y: Coordinate, width: Dimension, height: Dimension };
const ShapeStyle = z.object({
  fillColor: HexColor.optional(), strokeColor: HexColor.optional(), fontColor: HexColor.optional(),
  strokeWidth: z.number().positive().max(20).optional(), dashed: z.boolean().optional(), rounded: z.boolean().optional(),
  opacity: z.number().min(0).max(100).optional(), fontSize: z.number().positive().max(200).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
}).strict();

const DataAsset = z.object({
  mode: z.literal("data"),
  dataUri: z.string().max(8_000_000).regex(/^data:image\/(?:svg\+xml|png|jpeg|webp)(?:;base64)?,/i),
  mediaType: z.enum(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]),
  provider: z.string().trim().min(1).max(100),
  license: z.string().trim().min(1).max(160),
});
const CatalogAsset = z.object({ mode: z.enum(["bundled", "online"]), query: z.string().trim().min(1).max(160), provider: z.string().trim().max(100).optional() });
const RemoteAsset = z.object({ mode: z.literal("remote"), url: z.string().url().max(2048), provider: z.string().trim().max(100).optional(), license: z.string().trim().max(160).optional() });

const ContainerElement = z.object({ ...Common, ...Bounds, type: z.literal("container"), label: z.string().max(240).optional(), style: ShapeStyle.default({}) }).strict();
const ShapeElement = z.object({ ...Common, ...Bounds, type: z.literal("shape"), label: z.string().max(240).optional(), shape: z.enum(["rectangle", "roundedRectangle", "ellipse", "cylinder", "hexagon", "rhombus", "cloud"]), style: ShapeStyle.default({}) }).strict();
const TextElement = z.object({ ...Common, ...Bounds, type: z.literal("text"), text: z.string().max(4000), style: ShapeStyle.default({}) }).strict();
const AssetElement = z.object({ ...Common, ...Bounds, type: z.literal("asset"), label: z.string().max(240).optional(), asset: z.union([DataAsset, CatalogAsset, RemoteAsset]) }).strict();
const ConnectorElement = z.object({
  ...Common, type: z.literal("connector"), source: Identifier, target: Identifier,
  sourcePort: z.enum(["north", "east", "south", "west", "center"]).optional(),
  targetPort: z.enum(["north", "east", "south", "west", "center"]).optional(),
  waypoints: z.array(z.object({ x: Coordinate, y: Coordinate }).strict()).max(100).default([]),
  label: z.string().max(240).optional(),
  style: z.object({ strokeColor: HexColor.optional(), width: z.number().positive().max(20).optional(), dashed: z.boolean().optional(), endArrow: z.enum(["none", "block", "open", "classic", "oval"]).optional() }).strict().default({}),
}).strict();

export const ReferenceElementSchema = z.discriminatedUnion("type", [ContainerElement, ShapeElement, TextElement, AssetElement, ConnectorElement]);

export const ReferencePlanSchema = z.object({
  title: z.string().trim().min(1).max(240),
  outputFile: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/),
  canvas: z.object({ width: Dimension, height: Dimension, background: HexColor }).strict(),
  layers: z.array(z.object({ id: Identifier, label: z.string().trim().min(1).max(160), zIndex: z.number().int().min(-10_000).max(10_000) }).strict()).min(1).max(100),
  elements: z.array(ReferenceElementSchema).min(1).max(5000),
  fidelity: z.object({ minimumStructuralScore: z.number().min(0).max(1).default(0.95), notes: z.array(z.string().max(500)).max(100).default([]) }).default({ minimumStructuralScore: 0.95, notes: [] }),
  overwrite: z.boolean().default(false),
}).strict().superRefine((plan, context) => {
  const layerIds = new Set(plan.layers.map((layer) => layer.id));
  if (layerIds.size !== plan.layers.length) context.addIssue({ code: "custom", path: ["layers"], message: "duplicate layer id" });
  const elementIds = new Set<string>();
  for (const [index, element] of plan.elements.entries()) {
    if (elementIds.has(element.id)) context.addIssue({ code: "custom", path: ["elements", index, "id"], message: `duplicate element id: ${element.id}` });
    elementIds.add(element.id);
    if (!layerIds.has(element.layerId)) context.addIssue({ code: "custom", path: ["elements", index, "layerId"], message: `unknown layer: ${element.layerId}` });
    if ("x" in element && (element.x + element.width > plan.canvas.width || element.y + element.height > plan.canvas.height)) context.addIssue({ code: "custom", path: ["elements", index], message: "element exceeds canvas bounds" });
  }
  for (const [index, element] of plan.elements.entries()) {
    if (element.parentId !== undefined && !elementIds.has(element.parentId)) context.addIssue({ code: "custom", path: ["elements", index, "parentId"], message: `unknown parent: ${element.parentId}` });
    if (element.type === "connector") {
      if (!elementIds.has(element.source)) context.addIssue({ code: "custom", path: ["elements", index, "source"], message: `unknown source: ${element.source}` });
      if (!elementIds.has(element.target)) context.addIssue({ code: "custom", path: ["elements", index, "target"], message: `unknown target: ${element.target}` });
    }
  }
});

export type ReferencePlan = z.infer<typeof ReferencePlanSchema>;
export type ReferenceElement = z.infer<typeof ReferenceElementSchema>;
