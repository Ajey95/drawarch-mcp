import type { FlowType, ThemeName } from "../domain/schema.js";

export interface ThemeTokens {
  readonly id: ThemeName;
  readonly name: string;
  readonly description: string;
  readonly canvas: Readonly<{ background: string; grid: string; page: string }>;
  readonly text: Readonly<{ primary: string; secondary: string; fontFamily: string }>;
  readonly group: Readonly<{ fill: string; stroke: string; dashed: boolean; rounded: boolean; sketch: boolean }>;
  readonly node: Readonly<{ fill: string; stroke: string; labelFill: string; shadow: boolean; rounded: boolean }>;
  readonly connector: Readonly<{
    defaultColor: string;
    width: number;
    dashed: boolean;
    rounded: boolean;
    sketch: boolean;
    flowColors: Readonly<Record<FlowType, string>>;
  }>;
}

const flowColors = (overrides: Partial<Record<FlowType, string>> = {}): Readonly<Record<FlowType, string>> =>
  Object.freeze({
    request: "#FF7F50",
    realtime: "#38BDF8",
    batch: "#FB923C",
    feedback: "#4ADE80",
    monitoring: "#A78BFA",
    dependency: "#94A3B8",
    ...overrides,
  });

function freezeTheme(theme: ThemeTokens): ThemeTokens {
  Object.freeze(theme.canvas);
  Object.freeze(theme.text);
  Object.freeze(theme.group);
  Object.freeze(theme.node);
  Object.freeze(theme.connector);
  return Object.freeze(theme);
}

export const THEMES: readonly ThemeTokens[] = Object.freeze([
  freezeTheme({
    id: "animated-sketch-dark",
    name: "Animated Sketch Dark",
    description: "Black hand-drawn canvas with dotted groups and vivid animated flows.",
    canvas: { background: "#111111", grid: "#202020", page: "#111111" },
    text: { primary: "#F8FAFC", secondary: "#CBD5E1", fontFamily: "Comic Sans MS" },
    group: { fill: "#151515", stroke: "#8B8B8B", dashed: true, rounded: true, sketch: true },
    node: { fill: "#181818", stroke: "#64748B", labelFill: "#111111", shadow: false, rounded: true },
    connector: { defaultColor: "#38BDF8", width: 2, dashed: true, rounded: true, sketch: true, flowColors: flowColors() },
  }),
  freezeTheme({
    id: "animated-sketch-light",
    name: "Animated Sketch Light",
    description: "Warm whiteboard canvas with sketch containers and animated flows.",
    canvas: { background: "#FFFDF7", grid: "#E7E5E4", page: "#FFFDF7" },
    text: { primary: "#1C1917", secondary: "#57534E", fontFamily: "Comic Sans MS" },
    group: { fill: "#FFFEFA", stroke: "#78716C", dashed: true, rounded: true, sketch: true },
    node: { fill: "#FFFFFF", stroke: "#A8A29E", labelFill: "#FFFEFA", shadow: false, rounded: true },
    connector: { defaultColor: "#0284C7", width: 2, dashed: true, rounded: true, sketch: true, flowColors: flowColors({ dependency: "#57534E" }) },
  }),
  freezeTheme({
    id: "professional-cloud",
    name: "Professional Cloud",
    description: "Clean cloud-provider styling for solution architecture documentation.",
    canvas: { background: "#F8FAFC", grid: "#E2E8F0", page: "#F8FAFC" },
    text: { primary: "#0F172A", secondary: "#475569", fontFamily: "Inter" },
    group: { fill: "#FFFFFF", stroke: "#94A3B8", dashed: false, rounded: true, sketch: false },
    node: { fill: "#FFFFFF", stroke: "#CBD5E1", labelFill: "#FFFFFF", shadow: true, rounded: true },
    connector: { defaultColor: "#2563EB", width: 2, dashed: false, rounded: true, sketch: false, flowColors: flowColors({ request: "#2563EB" }) },
  }),
  freezeTheme({
    id: "minimal-corporate",
    name: "Minimal Corporate",
    description: "Neutral presentation styling with restrained colour and typography.",
    canvas: { background: "#FFFFFF", grid: "#F1F5F9", page: "#FFFFFF" },
    text: { primary: "#111827", secondary: "#6B7280", fontFamily: "Arial" },
    group: { fill: "#F9FAFB", stroke: "#9CA3AF", dashed: false, rounded: true, sketch: false },
    node: { fill: "#FFFFFF", stroke: "#D1D5DB", labelFill: "#FFFFFF", shadow: false, rounded: true },
    connector: { defaultColor: "#4B5563", width: 2, dashed: false, rounded: true, sketch: false, flowColors: flowColors({ request: "#4B5563" }) },
  }),
  freezeTheme({
    id: "technical-blueprint",
    name: "Technical Blueprint",
    description: "Engineering blueprint canvas with cyan linework and precise geometry.",
    canvas: { background: "#082F49", grid: "#0E4D6C", page: "#082F49" },
    text: { primary: "#ECFEFF", secondary: "#A5F3FC", fontFamily: "Courier New" },
    group: { fill: "#0C3B55", stroke: "#67E8F9", dashed: true, rounded: false, sketch: false },
    node: { fill: "#0A3850", stroke: "#22D3EE", labelFill: "#082F49", shadow: false, rounded: false },
    connector: { defaultColor: "#67E8F9", width: 2, dashed: true, rounded: false, sketch: false, flowColors: flowColors({ request: "#67E8F9", dependency: "#A5F3FC" }) },
  }),
  freezeTheme({
    id: "presentation-neon",
    name: "Presentation Neon",
    description: "High-contrast dark stage styling for demos and keynotes.",
    canvas: { background: "#070A13", grid: "#151A2D", page: "#070A13" },
    text: { primary: "#F8FAFC", secondary: "#C4B5FD", fontFamily: "Inter" },
    group: { fill: "#0C1020", stroke: "#8B5CF6", dashed: false, rounded: true, sketch: false },
    node: { fill: "#11162A", stroke: "#22D3EE", labelFill: "#070A13", shadow: true, rounded: true },
    connector: { defaultColor: "#22D3EE", width: 3, dashed: true, rounded: true, sketch: false, flowColors: flowColors({ request: "#F472B6", realtime: "#22D3EE", feedback: "#A3E635" }) },
  }),
]);

export function listThemes(): readonly ThemeTokens[] {
  return THEMES;
}

export function getTheme(name: ThemeName): ThemeTokens {
  const theme = THEMES.find((candidate) => candidate.id === name);
  if (theme === undefined) {
    throw new Error(`Unknown theme: ${String(name)}`);
  }
  return theme;
}
