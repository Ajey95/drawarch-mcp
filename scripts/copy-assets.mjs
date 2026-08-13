import { cp, mkdir } from "node:fs/promises";

const source = new URL("../src/assets/svg/", import.meta.url);
const destination = new URL("../dist/src/assets/svg/", import.meta.url);

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
