const UNSAFE_PATTERNS: readonly RegExp[] = [
  /<!DOCTYPE/i,
  /<!ENTITY/i,
  /<\s*script\b/i,
  /<\s*foreignObject\b/i,
  /\son[a-z]+\s*=/i,
  /(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|javascript:|data:text)/i,
  /url\s*\(\s*["']?\s*(?:https?:|\/\/|javascript:)/i,
];

export function sanitizeSvg(input: string): string {
  const svg = input.trim();
  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(svg))) {
    throw new Error("Unsafe SVG content was rejected");
  }
  if (!/^<svg\b[^>]*>[\s\S]*<\/svg>$/i.test(svg) && !/^<svg\b[^>]*\/\s*>$/i.test(svg)) {
    throw new Error("Asset is not a valid SVG document");
  }
  return svg.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!--([\s\S]*?)-->/g, "").trim();
}

export function svgToDataUri(input: string): string {
  const sanitized = sanitizeSvg(input);
  return `data:image/svg+xml,${encodeURIComponent(sanitized)}`;
}
