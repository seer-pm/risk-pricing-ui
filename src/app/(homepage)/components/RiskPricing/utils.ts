import { formatPd } from "@/utils";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}

export function interpolateColor(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);

  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

/**
 * A change in probability, in percentage points.
 *
 * Goes through formatPd so a delta rounds and clamps exactly like the values it
 * sits next to - including the "<0.01" floor, which is what stops a nudge of
 * the slider from reading as a flat "0.00".
 *
 * @param deltaPercent signed difference between two percentages
 */
export const formatDeltaPp = (deltaPercent: number): string =>
  formatPd(Math.abs(deltaPercent)).replace("%", "pp");
