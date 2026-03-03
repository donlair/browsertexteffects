export interface Coord {
  column: number;
  row: number;
}

export interface Color {
  rgbHex: string;
}

export interface ColorPair {
  fg: Color | null;
  bg: Color | null;
}

export type GradientDirection = "vertical" | "horizontal" | "radial" | "diagonal";

export type EasingFunction = (progress: number) => number;

export type Grouping = "row" | "column" | "diagonal";

export function color(hex: string): Color {
  return { rgbHex: hex.replace("#", "") };
}

export function colorPair(fg: Color | null, bg?: Color | null): ColorPair {
  return { fg, bg: bg ?? null };
}

export function rgbInts(c: Color): [number, number, number] {
  const hex = c.rgbHex;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

export function adjustBrightness(c: Color, factor: number): Color {
  const [r, g, b] = rgbInts(c);
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const nr = clamp(r * factor);
  const ng = clamp(g * factor);
  const nb = clamp(b * factor);
  return color(
    nr.toString(16).padStart(2, "0") +
    ng.toString(16).padStart(2, "0") +
    nb.toString(16).padStart(2, "0"),
  );
}
