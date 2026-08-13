import { describe, expect, it } from "vitest";

import { getTheme, listThemes } from "../src/themes/themes.js";

describe("theme registry", () => {
  it("provides six complete selectable themes", () => {
    const themes = listThemes();

    expect(themes.map((theme) => theme.id)).toEqual([
      "animated-sketch-dark",
      "animated-sketch-light",
      "professional-cloud",
      "minimal-corporate",
      "technical-blueprint",
      "presentation-neon",
    ]);
    for (const theme of themes) {
      expect(theme.canvas.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.text.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.group.stroke).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.node.fill).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.connector.defaultColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("returns immutable theme tokens", () => {
    const theme = getTheme("animated-sketch-dark");

    expect(Object.isFrozen(theme)).toBe(true);
    expect(Object.isFrozen(theme.connector)).toBe(true);
  });

  it("rejects an unknown theme at runtime", () => {
    expect(() => getTheme("unknown" as never)).toThrow(/unknown theme/i);
  });
});
