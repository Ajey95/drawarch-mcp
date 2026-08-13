import { describe, expect, it } from "vitest";

import { validateDrawio } from "../src/validate/drawio.js";

const valid = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="DrawArch" compressed="false"><diagram id="p" name="Page-1"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="node-a" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="100" as="geometry"/></mxCell>
<mxCell id="node-b" vertex="1" parent="1"><mxGeometry x="200" y="0" width="100" height="100" as="geometry"/></mxCell>
<mxCell id="edge-a-b" edge="1" parent="1" source="node-a" target="node-b"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

describe("validateDrawio", () => {
  it("accepts a structurally valid uncompressed drawio document", () => {
    expect(validateDrawio(valid)).toEqual({ valid: true, issues: [] });
  });

  it("detects malformed or incomplete document structure", () => {
    const report = validateDrawio("<mxfile><diagram>");

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("MALFORMED_XML");
    expect(report.issues.map((issue) => issue.code)).toContain("MISSING_ROOT");
  });

  it("detects duplicate cell identifiers", () => {
    const report = validateDrawio(valid.replace('<mxCell id="node-b"', '<mxCell id="node-a"'));

    expect(report.issues).toContainEqual(expect.objectContaining({ code: "DUPLICATE_CELL_ID", cellId: "node-a" }));
  });

  it("detects dangling connector references", () => {
    const report = validateDrawio(valid.replace('target="node-b"', 'target="missing"'));

    expect(report.issues).toContainEqual(expect.objectContaining({ code: "DANGLING_TARGET", cellId: "edge-a-b" }));
  });

  it("rejects hotlinked image styles", () => {
    const remote = valid.replace(
      '<mxCell id="node-a" vertex="1"',
      '<mxCell id="node-a" style="shape=image;image=https://evil.example/a.svg;" vertex="1"',
    );

    expect(validateDrawio(remote).issues).toContainEqual(
      expect.objectContaining({ code: "REMOTE_IMAGE", cellId: "node-a" }),
    );
  });

  it("rejects absolute local filesystem references", () => {
    const local = valid.replace(
      '<mxCell id="node-a" vertex="1"',
      '<mxCell id="node-a" style="shape=image;image=file:///tmp/a.svg;" vertex="1"',
    );

    expect(validateDrawio(local).issues).toContainEqual(
      expect.objectContaining({ code: "LOCAL_FILE_REFERENCE", cellId: "node-a" }),
    );
  });

  it("detects missing diagrams.net root cells", () => {
    const report = validateDrawio(valid.replace('<mxCell id="0"/>', ""));

    expect(report.issues.map((issue) => issue.code)).toContain("MISSING_ROOT_CELL");
  });
});
