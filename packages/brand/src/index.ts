import { fursat } from "./fursat";
import { richmondHouse } from "./richmond-house";
import type { Brand, BrandTokens } from "./types";

export type { Brand, BrandTokens };
export { fursat, richmondHouse };

export const brands: Record<string, Brand> = { [fursat.slug]: fursat, [richmondHouse.slug]: richmondHouse };

export function getBrand(slug: string | undefined | null): Brand {
  return (slug && brands[slug]) || fursat;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

/** CSS custom properties for a brand: --c-surface, --font-display, --radius-md, --ease-out, --dur-base ... */
export function brandCssVars(brand: Brand): Record<string, string> {
  const t = brand.tokens;
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(t.color)) vars[`--c-${kebab(k)}`] = v;
  vars["--font-display"] = t.font.display;
  vars["--font-body"] = t.font.body;
  if (t.font.script) vars["--font-script"] = t.font.script;
  for (const [k, v] of Object.entries(t.radius)) vars[`--radius-${k}`] = v;
  vars["--ease-out"] = t.motion.easeOut;
  vars["--ease-in-out"] = t.motion.easeInOut;
  vars["--dur-fast"] = `${t.motion.durFast}ms`;
  vars["--dur-base"] = `${t.motion.durBase}ms`;
  vars["--dur-slow"] = `${t.motion.durSlow}ms`;
  vars["--dur-scene"] = `${t.motion.durScene}ms`;
  vars["--dur-press"] = `${t.motion.durPress}ms`;
  vars["--press-scale"] = String(t.motion.pressScale);
  vars["--reveal-y"] = `${t.motion.revealY}px`;
  return vars;
}

/** Same as brandCssVars, as a CSS rule string (for SSR <style> or tests). */
export function brandCss(brand: Brand, selector = ":root"): string {
  const body = Object.entries(brandCssVars(brand))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

/** WCAG relative-luminance contrast ratio between two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = hex.replace("#", "");
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
