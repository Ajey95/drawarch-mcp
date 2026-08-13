import { describe, expect, it } from "vitest";

import { IconifyProvider, type OnlineAsset, type OnlineAssetProvider } from "../src/assets/online.js";
import { AssetResolver } from "../src/assets/resolver.js";

class FakeOnlineProvider implements OnlineAssetProvider {
  calls = 0;

  constructor(private readonly results: readonly OnlineAsset[]) {}

  async search(): Promise<readonly OnlineAsset[]> {
    this.calls += 1;
    return this.results;
  }
}

const safeOnlineAsset: OnlineAsset = {
  id: "vendor:special-router",
  title: "Special Router",
  category: "network",
  provider: "vendor",
  tags: ["router"],
  mediaType: "image/svg+xml",
  license: "Apache-2.0",
  sourceUrl: "https://icons.example/vendor/special-router.svg",
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h22v22H1z"/></svg>',
};

describe("AssetResolver", () => {
  it("resolves an exact bundled asset without calling the online provider", async () => {
    const online = new FakeOnlineProvider([safeOnlineAsset]);
    const resolver = new AssetResolver({ onlineProvider: online });

    const resolved = await resolver.resolve({ query: "database", allowOnline: true });

    expect(resolved.id).toBe("database");
    expect(resolved.source).toBe("bundled");
    expect(resolved.dataUri).toMatch(/^data:image\/svg\+xml,/);
    expect(online.calls).toBe(0);
  });

  it("honours an explicit online provider over an exact bundled ID", async () => {
    const online = new FakeOnlineProvider([safeOnlineAsset]);
    const resolver = new AssetResolver({ onlineProvider: online });

    const resolved = await resolver.resolve({ query: "database", provider: "vendor", allowOnline: true });

    expect(resolved.source).toBe("online");
    expect(resolved.provider).toBe("vendor");
    expect(online.calls).toBe(1);
  });

  it("uses bundled semantic aliases before online search", async () => {
    const online = new FakeOnlineProvider([safeOnlineAsset]);
    const resolver = new AssetResolver({ onlineProvider: online });

    const resolved = await resolver.resolve({ query: "postgres", allowOnline: true });

    expect(resolved.id).toBe("database");
    expect(online.calls).toBe(0);
  });

  it("falls back to a safe online SVG and preserves provenance", async () => {
    const resolver = new AssetResolver({ onlineProvider: new FakeOnlineProvider([safeOnlineAsset]) });

    const resolved = await resolver.resolve({ query: "special router", allowOnline: true });

    expect(resolved.source).toBe("online");
    expect(resolved.provider).toBe("vendor");
    expect(resolved.license).toBe("Apache-2.0");
    expect(resolved.sourceUrl).toBe("https://icons.example/vendor/special-router.svg");
    expect(resolved.integrity).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(resolved.dataUri).not.toContain("https://");
  });

  it("does not search online unless the request enables it", async () => {
    const online = new FakeOnlineProvider([safeOnlineAsset]);
    const resolver = new AssetResolver({ onlineProvider: online });

    await expect(resolver.resolve({ query: "special router", allowOnline: false })).rejects.toThrow(/no safe asset/i);
    expect(online.calls).toBe(0);
  });

  it("rejects unsafe SVGs returned by an online provider", async () => {
    const unsafe = { ...safeOnlineAsset, svg: '<svg onload="alert(1)"></svg>' };
    const resolver = new AssetResolver({ onlineProvider: new FakeOnlineProvider([unsafe]) });

    await expect(resolver.resolve({ query: "special router", allowOnline: true })).rejects.toThrow(/unsafe svg/i);
  });

  it("uses a generic bundled category fallback after online search has no result", async () => {
    const resolver = new AssetResolver({ onlineProvider: new FakeOnlineProvider([]) });

    const resolved = await resolver.resolve({ query: "unknown compute appliance", category: "compute", allowOnline: true });

    expect(resolved.id).toBe("server");
    expect(resolved.source).toBe("bundled-fallback");
  });
});

describe("IconifyProvider", () => {
  it("searches an HTTPS Iconify endpoint and fetches the selected SVG", async () => {
    const requested: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      const url = String(input);
      requested.push(url);
      if (url.includes("/search?")) {
        return new Response(
          JSON.stringify({
            icons: ["mdi:router-wireless"],
            collections: {
              mdi: { name: "Material Design Icons", license: { title: "Apache 2.0" } },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>', {
        status: 200,
        headers: { "content-type": "image/svg+xml", "content-length": "103" },
      });
    };
    const provider = new IconifyProvider({ baseUrl: "https://icons.example", fetch: fakeFetch });

    const results = await provider.search("wireless router");

    expect(results[0]?.id).toBe("mdi:router-wireless");
    expect(results[0]?.license).toBe("Apache 2.0");
    expect(results[0]?.svg).toContain("<svg");
    expect(requested).toEqual([
      "https://icons.example/search?query=wireless+router&limit=10",
      "https://icons.example/mdi/router-wireless.svg",
    ]);
  });

  it("rejects non-HTTPS provider URLs", () => {
    expect(() => new IconifyProvider({ baseUrl: "http://icons.example" })).toThrow(/https/i);
  });

  it("constrains searches to the requested icon collection", async () => {
    const requested: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ icons: [], collections: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const provider = new IconifyProvider({ baseUrl: "https://icons.example", fetch: fakeFetch });

    await provider.search("microcontroller chip", "mdi");

    expect(requested).toEqual([
      "https://icons.example/search?query=microcontroller+chip&limit=10&prefix=mdi",
    ]);
  });
});
