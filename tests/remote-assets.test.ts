import { describe, expect, it, vi } from "vitest";

import { fetchRemoteImage, isPublicAddress, normalizeImageDataUri } from "../src/assets/remote.js";

describe("secure real-image assets", () => {
  it("rejects private and reserved network targets", async () => {
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("10.2.3.4")).toBe(false);
    expect(isPublicAddress("169.254.1.2")).toBe(false);
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("93.184.216.34")).toBe(true);
    await expect(fetchRemoteImage("https://127.0.0.1/icon.svg")).rejects.toThrow(/public internet host/i);
  });

  it("sanitizes fetched SVGs, records provenance, and never leaves a remote URL in drawio", async () => {
    const fetcher = vi.fn(async () => new Response('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>', { headers: { "content-type": "image/svg+xml", "content-length": "78" } }));
    const asset = await fetchRemoteImage("https://assets.example/icon.svg", {
      fetcher,
      resolveHost: async () => ["93.184.216.34"],
    });
    expect(asset.dataUri).toMatch(/^data:image\/svg\+xml,/);
    expect(asset.sourceUrl).toBe("https://assets.example/icon.svg");
    expect(asset.integrity).toMatch(/^sha256-/);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects active SVG content and malformed data URIs", async () => {
    expect(() => normalizeImageDataUri("data:text/html,<script>alert(1)</script>")).toThrow(/unsupported image/i);
    const fetcher = vi.fn(async () => new Response('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', { headers: { "content-type": "image/svg+xml" } }));
    await expect(fetchRemoteImage("https://assets.example/unsafe.svg", { fetcher, resolveHost: async () => ["93.184.216.34"] })).rejects.toThrow(/unsafe svg/i);
  });
});
