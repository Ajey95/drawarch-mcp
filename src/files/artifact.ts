import { createHash } from "node:crypto";

const DRAWIO_BASENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.drawio$/;

export interface DrawioArtifact {
  readonly fileName: string;
  readonly uri: string;
  readonly mimeType: "application/vnd.jgraph.mxfile";
  readonly bytes: number;
  readonly sha256: string;
  readonly blob: string;
}

export function drawioArtifact(fileName: string, xml: string): DrawioArtifact {
  if (!DRAWIO_BASENAME.test(fileName)) {
    throw new Error("Artifact file name must be a safe drawio basename");
  }
  const data = Buffer.from(xml, "utf8");
  return Object.freeze({
    fileName,
    uri: `drawarch://outputs/${encodeURIComponent(fileName)}`,
    mimeType: "application/vnd.jgraph.mxfile",
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
    blob: data.toString("base64"),
  });
}
