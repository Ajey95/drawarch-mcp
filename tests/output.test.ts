import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { atomicWriteDrawio, resolveOutputPath } from "../src/files/output.js";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "drawarch-output-"));
  roots.push(root);
  return root;
}

const validXml = '<?xml version="1.0"?><mxfile host="DrawArch" compressed="false"><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';

describe("safe drawio output", () => {
  it("resolves safe output names inside the configured root", async () => {
    const root = await makeRoot();

    expect(resolveOutputPath(root, "diagram.drawio")).toBe(join(root, "diagram.drawio"));
  });

  it.each(["../escape.drawio", "/tmp/escape.drawio", "diagram.xml", "nested/diagram.drawio"])(
    "rejects an unsafe output name: %s",
    async (name) => {
      const root = await makeRoot();
      expect(() => resolveOutputPath(root, name)).toThrow(/safe .drawio basename/i);
    },
  );

  it("writes a validated file atomically", async () => {
    const root = await makeRoot();
    const result = await atomicWriteDrawio({ root, fileName: "diagram.drawio", xml: validXml, overwrite: false });

    expect(result).toBe(join(root, "diagram.drawio"));
    expect(await readFile(result, "utf8")).toBe(validXml);
    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("protects existing files unless overwrite is explicit", async () => {
    const root = await makeRoot();
    const target = join(root, "diagram.drawio");
    await writeFile(target, "original", "utf8");

    await expect(
      atomicWriteDrawio({ root, fileName: "diagram.drawio", xml: validXml, overwrite: false }),
    ).rejects.toThrow(/already exists/i);
    expect(await readFile(target, "utf8")).toBe("original");

    await atomicWriteDrawio({ root, fileName: "diagram.drawio", xml: validXml, overwrite: true });
    expect(await readFile(target, "utf8")).toBe(validXml);
  });

  it("does not write an invalid drawio document", async () => {
    const root = await makeRoot();

    await expect(
      atomicWriteDrawio({ root, fileName: "diagram.drawio", xml: "<mxfile>", overwrite: false }),
    ).rejects.toThrow(/validation failed/i);
    expect(await readdir(root)).toEqual([]);
  });

  it("cleans up a temporary file when final replacement fails", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "diagram.drawio"));

    await expect(
      atomicWriteDrawio({ root, fileName: "diagram.drawio", xml: validXml, overwrite: true }),
    ).rejects.toThrow();
    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});
