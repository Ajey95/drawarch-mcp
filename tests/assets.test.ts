import { describe, expect, it } from "vitest";

import {
  getBundledAsset,
  listBundledAssets,
  searchBundledAssets,
} from "../src/assets/catalog.js";
import { sanitizeSvg, svgToDataUri } from "../src/assets/sanitize.js";

describe("bundled asset catalogue", () => {
  it("ships a coherent real-SVG starter pack", () => {
    const assets = listBundledAssets();

    expect(assets).toHaveLength(12);
    expect(assets.every((asset) => asset.mediaType === "image/svg+xml")).toBe(true);
    expect(assets.every((asset) => asset.svg.includes("<svg"))).toBe(true);
    expect(assets.every((asset) => asset.license.length > 0)).toBe(true);
  });

  it("resolves exact IDs and searches aliases and tags", () => {
    expect(getBundledAsset("database")?.title).toBe("Database");
    expect(searchBundledAssets("postgres")[0]?.id).toBe("database");
    expect(searchBundledAssets("smartphone")[0]?.id).toBe("mobile-device");
    expect(searchBundledAssets("telemetry").some((asset) => asset.id === "monitoring")).toBe(true);
  });
});

describe("SVG sanitization", () => {
  const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#123456" d="M1 1h22v22H1z"/></svg>';

  it("accepts a self-contained SVG and creates an embedded data URI", () => {
    const sanitized = sanitizeSvg(safeSvg);
    const uri = svgToDataUri(sanitized);

    expect(sanitized).toContain("viewBox");
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    expect(uri).not.toContain("<svg");
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>bad</div></foreignObject></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><image href="https://evil.example/a.png"/></svg>',
    '<svg><a xlink:href="javascript:alert(1)">bad</a></svg>',
    '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>',
  ])("rejects unsafe SVG content", (input) => {
    expect(() => sanitizeSvg(input)).toThrow(/unsafe svg/i);
  });

  it("rejects non-SVG input", () => {
    expect(() => sanitizeSvg("<html></html>")).toThrow(/valid svg/i);
  });
});
