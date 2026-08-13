import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DrawArchService } from "../src/app/generate.js";
import { AssetResolver } from "../src/assets/resolver.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const exampleDirectory = resolve(projectRoot, "examples");
const specification = JSON.parse(await readFile(resolve(exampleDirectory, "iot-safety.json"), "utf8")) as unknown;
const service = new DrawArchService({ outputRoot: exampleDirectory, assetResolver: new AssetResolver() });
const result = await service.generate(specification);

console.log(JSON.stringify({
  outputFile: result.outputPath,
  theme: result.theme,
  layout: result.layout,
  counts: result.counts,
  warnings: result.warnings,
  validation: result.validation,
}, null, 2));
