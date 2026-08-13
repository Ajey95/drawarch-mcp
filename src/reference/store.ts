import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { ReferencePlanSchema, type ReferencePlan } from "./schema.js";

export interface PlanSnapshot { readonly planId: string; readonly revision: number; readonly path: string; readonly plan: ReferencePlan }

export class PlanStore {
  private readonly root: string;
  private readonly secret: string;
  constructor(options: { root: string; secret: string }) { this.root = resolve(options.root, ".drawarch", "plans"); this.secret = options.secret; }

  async prepare(input: unknown): Promise<PlanSnapshot> {
    const plan = ReferencePlanSchema.parse(input);
    return this.write(randomUUID(), 1, plan);
  }

  async update(planId: string, input: unknown, expectedRevision: number): Promise<PlanSnapshot> {
    safePlanId(planId);
    const current = await this.latest(planId);
    if (current.revision !== expectedRevision) throw new Error(`Plan revision conflict: expected ${expectedRevision}, current ${current.revision}`);
    return this.write(planId, current.revision + 1, ReferencePlanSchema.parse(input));
  }

  async latest(planId: string): Promise<PlanSnapshot> {
    safePlanId(planId);
    const meta = JSON.parse(await readFile(join(this.root, planId, "latest.json"), "utf8")) as { revision: number };
    const path = join(this.root, planId, `${meta.revision}.json`);
    return { planId, revision: meta.revision, path, plan: ReferencePlanSchema.parse(JSON.parse(await readFile(path, "utf8"))) };
  }

  async get(planId: string, revision: number): Promise<PlanSnapshot> {
    safePlanId(planId);
    if (!Number.isInteger(revision) || revision < 1) throw new Error("Invalid plan revision");
    const path = join(this.root, planId, `${revision}.json`);
    return { planId, revision, path, plan: ReferencePlanSchema.parse(JSON.parse(await readFile(path, "utf8"))) };
  }

  approve(snapshot: Pick<PlanSnapshot, "planId" | "revision">): string {
    const payload = `${snapshot.planId}.${snapshot.revision}`;
    return `${payload}.${createHmac("sha256", this.secret).update(payload).digest("base64url")}`;
  }

  verifyApproval(snapshot: Pick<PlanSnapshot, "planId" | "revision">, token: string): boolean {
    const expected = this.approve(snapshot);
    const actualBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private async write(planId: string, revision: number, plan: ReferencePlan): Promise<PlanSnapshot> {
    const directory = join(this.root, planId);
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${revision}.json`);
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporary, path);
    const metaTemporary = join(directory, `latest.${randomUUID()}.tmp`);
    await writeFile(metaTemporary, `${JSON.stringify({ revision })}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(metaTemporary, join(directory, "latest.json"));
    return { planId, revision, path, plan };
  }
}

function safePlanId(planId: string): void { if (!/^[0-9a-f-]{36}$/i.test(planId)) throw new Error("Invalid plan id"); }
