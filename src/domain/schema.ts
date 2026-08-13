import { z } from "zod";

export const THEME_NAMES = [
  "animated-sketch-dark",
  "animated-sketch-light",
  "professional-cloud",
  "minimal-corporate",
  "technical-blueprint",
  "presentation-neon",
] as const;

export const LAYOUT_NAMES = [
  "horizontal",
  "vertical",
  "edge-cloud",
  "hub-spoke",
  "pipeline",
] as const;

export const FLOW_TYPES = [
  "request",
  "realtime",
  "batch",
  "feedback",
  "monitoring",
  "dependency",
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];
export type LayoutName = (typeof LAYOUT_NAMES)[number];
export type FlowType = (typeof FLOW_TYPES)[number];

const IdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "must start with a letter and contain only letters, numbers, underscores, or hyphens");

const LabelSchema = z.string().trim().min(1).max(120);

const GroupSchema = z.object({
  id: IdentifierSchema,
  label: LabelSchema,
  subtitle: z.string().trim().max(160).optional(),
});

const NodeSchema = z.object({
  id: IdentifierSchema,
  label: LabelSchema,
  subtitle: z.string().trim().max(160).optional(),
  groupId: IdentifierSchema.optional(),
  asset: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80).optional(),
  provider: z.string().trim().min(1).max(80).optional(),
});

const EdgeSchema = z.object({
  id: IdentifierSchema,
  source: IdentifierSchema,
  target: IdentifierSchema,
  label: z.string().trim().max(120).default(""),
  flow: z.enum(FLOW_TYPES).default("request"),
  animated: z.boolean().default(true),
  pattern: z.enum(["solid", "dashed", "dotted"]).default("dashed"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  flowDuration: z.number().int().min(100).max(10_000).default(700),
  flowTiming: z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]).default("linear"),
  flowDirection: z.enum(["normal", "reverse", "alternate", "alternate-reverse"]).default("normal"),
});

export const ArchitectureSpecSchema = z
  .object({
    title: LabelSchema,
    theme: z.enum(THEME_NAMES),
    layout: z.enum(LAYOUT_NAMES),
    outputFile: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/, "must be a safe .drawio basename"),
    groups: z.array(GroupSchema).default([]),
    nodes: z.array(NodeSchema).min(1),
    edges: z.array(EdgeSchema).default([]),
    onlineAssets: z.boolean().default(false),
    overwrite: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    const groupIds = new Set<string>();
    for (const [index, group] of value.groups.entries()) {
      if (groupIds.has(group.id)) {
        context.addIssue({
          code: "custom",
          path: ["groups", index, "id"],
          message: `duplicate group id: ${group.id}`,
        });
      }
      groupIds.add(group.id);
    }

    const nodeIds = new Set<string>();
    for (const [index, node] of value.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "id"],
          message: `duplicate node id: ${node.id}`,
        });
      }
      nodeIds.add(node.id);
      if (node.groupId !== undefined && !groupIds.has(node.groupId)) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "groupId"],
          message: `unknown group: ${node.groupId}`,
        });
      }
    }

    const edgeIds = new Set<string>();
    for (const [index, edge] of value.edges.entries()) {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "id"],
          message: `duplicate edge id: ${edge.id}`,
        });
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "source"],
          message: `unknown source node: ${edge.source}`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "target"],
          message: `unknown target node: ${edge.target}`,
        });
      }
      if (edge.source === edge.target) {
        context.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "an edge cannot connect a node to itself",
        });
      }
    }
  });

export type ArchitectureSpec = z.infer<typeof ArchitectureSpecSchema>;
export type ArchitectureGroup = ArchitectureSpec["groups"][number];
export type ArchitectureNode = ArchitectureSpec["nodes"][number];
export type ArchitectureEdge = ArchitectureSpec["edges"][number];

export function parseArchitectureSpec(input: unknown): ArchitectureSpec {
  return ArchitectureSpecSchema.parse(input);
}
