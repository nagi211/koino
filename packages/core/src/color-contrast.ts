/**
 * WCAG relative-luminance contrast ratio between two hex colors, used to catch
 * "technically different but practically illegible" color pairs (e.g. navbar
 * background vs. icon/text color) — not just exact matches.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexToRgb(hexA));
  const luminanceB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA minimum for UI components/graphical objects (small icons and text
// count as such here) — stricter than "not byte-identical" but not as strict
// as the 4.5:1 required for body text, since this is a decorative brand bar.
export const MIN_NAVBAR_CONTRAST_RATIO = 3;