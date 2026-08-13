import { readFile } from "node:fs/promises";

import type { AssetResolver } from "../assets/resolver.js";
import { fetchRemoteImage, normalizeImageDataUri } from "../assets/remote.js";
import { atomicWriteDrawio, resolveOutputPath } from "../files/output.js";
import { validateDrawio } from "../validate/drawio.js";
import { compareReferencePlan, renderReferenceDrawio } from "./render.js";
import { ReferencePlanSchema, type ReferenceElement, type ReferencePlan } from "./schema.js";
import { PlanStore } from "./store.js";

export class ReferenceRecreationService {
  constructor(private readonly options: { outputRoot: string; onlineAssets: boolean; resolver: AssetResolver; store: PlanStore }) {}

  prepare(input: unknown) { return this.options.store.prepare(input); }
  update(planId: string, input: unknown, revision: number) { return this.options.store.update(planId, input, revision); }
  latest(planId: string) { return this.options.store.latest(planId); }
  approve(snapshot: { planId: string; revision: number }) { return this.options.store.approve(snapshot); }

  async create(planId: string, revision: number, approvalToken: string) {
    const latest = await this.options.store.latest(planId);
    if (latest.revision !== revision) throw new Error(`Plan revision conflict: approved ${revision}, current ${latest.revision}`);
    if (!this.options.store.verifyApproval(latest, approvalToken)) throw new Error("Approval token is invalid or stale");
    const resolvedPlan = await this.resolveAssets(latest.plan);
    const xml = renderReferenceDrawio(resolvedPlan);
    const validation = validateDrawio(xml);
    if (!validation.valid) throw new Error(`Reference drawio validation failed: ${validation.issues.map((issue) => issue.code).join(", ")}`);
    const comparison = compareReferencePlan(resolvedPlan, xml);
    if (comparison.structuralScore < resolvedPlan.fidelity.minimumStructuralScore) throw new Error(`Structural fidelity ${comparison.structuralScore} is below required ${resolvedPlan.fidelity.minimumStructuralScore}`);
    const outputPath = await atomicWriteDrawio({ root: this.options.outputRoot, fileName: resolvedPlan.outputFile, xml, overwrite: resolvedPlan.overwrite });
    return { outputPath, outputFile: resolvedPlan.outputFile, planId, revision, validation, comparison, xml };
  }

  async compare(planId: string, revision: number, fileName?: string) {
    const snapshot = await this.options.store.get(planId, revision);
    const target = resolveOutputPath(this.options.outputRoot, fileName ?? snapshot.plan.outputFile);
    return compareReferencePlan(snapshot.plan, await readFile(target, "utf8"));
  }

  private async resolveAssets(plan: ReferencePlan): Promise<ReferencePlan> {
    const elements = await Promise.all(plan.elements.map(async (element): Promise<ReferenceElement> => {
      if (element.type !== "asset") return element;
      if (element.asset.mode === "data") return { ...element, asset: { ...element.asset, dataUri: normalizeImageDataUri(element.asset.dataUri) } };
      if (element.asset.mode === "remote") {
        if (!this.options.onlineAssets) throw new Error("Online assets are disabled by server configuration");
        const remote = await fetchRemoteImage(element.asset.url);
        return { ...element, asset: { mode: "data", dataUri: remote.dataUri, mediaType: remote.mediaType, provider: element.asset.provider ?? new URL(remote.sourceUrl).hostname, license: element.asset.license ?? "verify-source-license" } };
      }
      if (element.asset.mode === "online" && !this.options.onlineAssets) throw new Error("Online assets are disabled by server configuration");
      const asset = await this.options.resolver.resolve({ query: element.asset.query, ...(element.asset.provider === undefined ? {} : { provider: element.asset.provider }), allowOnline: element.asset.mode === "online" });
      return { ...element, asset: { mode: "data", dataUri: asset.dataUri, mediaType: asset.mediaType, provider: asset.provider, license: asset.license } };
    }));
    return ReferencePlanSchema.parse({ ...plan, elements });
  }
}
