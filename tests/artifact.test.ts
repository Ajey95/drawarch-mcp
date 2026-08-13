import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { drawioArtifact } from "../src/files/artifact.js";

describe("drawioArtifact", () => {
  it("round-trips Draw.io XML as a portable MCP embedded resource", () => {
    const xml = '<?xml version="1.0"?><mxfile><diagram>safe</diagram></mxfile>';

    const artifact = drawioArtifact("system.drawio", xml);

    expect(artifact.fileName).toBe("system.drawio");
    expect(artifact.uri).toBe("drawarch://outputs/system.drawio");
    expect(artifact.mimeType).toBe("application/vnd.jgraph.mxfile");
    expect(artifact.bytes).toBe(Buffer.byteLength(xml));
    expect(artifact.sha256).toBe(createHash("sha256").update(xml).digest("hex"));
    expect(Buffer.from(artifact.blob, "base64").toString("utf8")).toBe(xml);
  });

  it("rejects unsafe artifact file names", () => {
    expect(() => drawioArtifact("../secret.drawio", "<mxfile/>"))
      .toThrow(/safe drawio basename/i);
  });
});
