import { randomUUID } from "node:crypto";
import { access, link, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";

import { validateDrawio } from "../validate/drawio.js";

export interface AtomicWriteOptions {
  readonly root: string;
  readonly fileName: string;
  readonly xml: string;
  readonly overwrite: boolean;
}

export function resolveOutputPath(root: string, fileName: string): string {
  if (
    basename(fileName) !== fileName ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/.test(fileName)
  ) {
    throw new Error("Output file must be a safe .drawio basename");
  }
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, fileName);
  const relativeTarget = relative(resolvedRoot, target);
  if (relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    throw new Error("Output path escapes the configured root");
  }
  return target;
}

export async function atomicWriteDrawio(options: AtomicWriteOptions): Promise<string> {
  const report = validateDrawio(options.xml);
  if (!report.valid) {
    const codes = report.issues.map((issue) => issue.code).join(", ");
    throw new Error(`Drawio validation failed: ${codes}`);
  }

  const target = resolveOutputPath(options.root, options.fileName);
  await mkdir(resolve(options.root), { recursive: true });
  if (!options.overwrite && await exists(target)) {
    throw new Error(`Output file already exists: ${options.fileName}`);
  }

  const temporary = resolve(options.root, `.${options.fileName}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, options.xml, { encoding: "utf8", flag: "wx", mode: 0o600 });
    if (options.overwrite) {
      await rename(temporary, target);
    } else {
      await link(temporary, target);
      await unlink(temporary);
    }
    return target;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
