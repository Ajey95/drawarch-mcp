import { readFile } from "node:fs/promises";

import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { drawioArtifact } from "../files/artifact.js";
import { resolveOutputPath } from "../files/output.js";
import { validateDrawio } from "../validate/drawio.js";
import { ReferencePlanSchema } from "./schema.js";
import type { ReferenceRecreationService } from "./service.js";

const SnapshotSchema = z.object({ planId: z.string(), revision: z.number().int().positive(), path: z.string(), plan: ReferencePlanSchema });
const ComparisonSchema = z.object({ structuralScore: z.number(), expectedElements: z.number(), matchedElements: z.number(), missingElementIds: z.array(z.string()) });
const ValidationSchema = z.object({ valid: z.boolean(), issues: z.array(z.object({ code: z.string(), message: z.string(), cellId: z.string().optional() })) });

export function registerReferenceTools(server: McpServer, service: ReferenceRecreationService, outputRoot: string): void {
  server.registerTool("prepare_reference_recreation", {
    title: "Prepare an Exact Reference-Image Recreation",
    description: "Persist the host vision model's absolute editable scene graph. DrawArch does not call another LLM. Set approved only after the user or host policy approves all online sources and the plan.",
    inputSchema: z.object({ plan: ReferencePlanSchema, approved: z.boolean().default(false) }),
    outputSchema: z.object({ planId: z.string(), revision: z.number(), path: z.string(), plan: ReferencePlanSchema, approvalToken: z.string().optional() }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async ({ plan, approved }) => guarded(async () => {
    const snapshot = await service.prepare(plan);
    return ok({ ...snapshot, ...(approved ? { approvalToken: service.approve(snapshot) } : {}) });
  }));

  server.registerTool("update_reference_plan", {
    title: "Revise a Reference Recreation Plan",
    description: "Create an immutable next revision of a reference plan using optimistic concurrency. Any earlier approval becomes stale.",
    inputSchema: z.object({ planId: z.string().uuid(), expectedRevision: z.number().int().positive(), plan: ReferencePlanSchema, approved: z.boolean().default(false) }),
    outputSchema: z.object({ planId: z.string(), revision: z.number(), path: z.string(), plan: ReferencePlanSchema, approvalToken: z.string().optional() }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async ({ planId, expectedRevision, plan, approved }) => guarded(async () => {
    const snapshot = await service.update(planId, plan, expectedRevision);
    return ok({ ...snapshot, ...(approved ? { approvalToken: service.approve(snapshot) } : {}) });
  }));

  server.registerTool("get_reference_plan", {
    title: "Get the Current Reference Plan",
    description: "Read the latest immutable scene-graph revision before rendering or approval.",
    inputSchema: z.object({ planId: z.string().uuid() }), outputSchema: SnapshotSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ planId }) => guarded(async () => ok(await service.latest(planId))));

  server.registerTool("create_reference_drawio", {
    title: "Render an Approved Reference Recreation",
    description: "Resolve approved real assets, embed them, and render an exact absolute-coordinate editable .drawio artifact. Rejects stale approvals.",
    inputSchema: z.object({ planId: z.string().uuid(), revision: z.number().int().positive(), approvalToken: z.string().min(1) }),
    outputSchema: z.object({ outputFile: z.string(), outputPath: z.string(), planId: z.string(), revision: z.number(), validation: ValidationSchema, comparison: ComparisonSchema }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async ({ planId, revision, approvalToken }) => guarded(async () => {
    const result = await service.create(planId, revision, approvalToken);
    const artifact = drawioArtifact(result.outputFile, result.xml);
    return ok({ outputFile: result.outputFile, outputPath: result.outputPath, planId, revision, validation: result.validation, comparison: result.comparison }, [{ type: "resource", resource: { uri: artifact.uri, mimeType: artifact.mimeType, blob: artifact.blob } }]);
  }));

  server.registerTool("validate_reference_drawio", {
    title: "Validate a Reference Draw.io Artifact",
    description: "Validate a generated reference recreation for native Draw.io structure, IDs, references, and embedded-image safety.",
    inputSchema: z.object({ fileName: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/) }),
    outputSchema: z.object({ fileName: z.string(), validation: ValidationSchema }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ fileName }) => guarded(async () => ok({ fileName, validation: validateDrawio(await readFile(resolveOutputPath(outputRoot, fileName), "utf8")) })));

  server.registerTool("compare_reference_recreation", {
    title: "Compare a Recreation to its Reference Plan",
    description: "Measure structural coverage against the approved absolute scene graph and report missing editable elements.",
    inputSchema: z.object({ planId: z.string().uuid(), revision: z.number().int().positive(), fileName: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/).optional() }),
    outputSchema: ComparisonSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ planId, revision, fileName }) => guarded(async () => ok(await service.compare(planId, revision, fileName))));
}

type Extra = { type: "resource"; resource: { uri: string; mimeType: string; blob: string } };
function ok<T extends object>(structuredContent: T, extra: readonly Extra[] = []) { return { content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }, ...extra], structuredContent }; }
async function guarded<T>(operation: () => Promise<T>) { try { return await operation(); } catch (error) { return { content: [{ type: "text" as const, text: JSON.stringify({ code: "REFERENCE_RECREATION_FAILED", message: error instanceof Error ? error.message : "Unknown error" }) }], isError: true as const }; } }
