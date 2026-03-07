import { type Color, type GradientDirection, color, rgbInts } from "./types";

export class Gradient {
  spectrum: Color[];

  constructor(stops: Color[], steps: number | number[] = 1, loop: boolean = false) {
    const effectiveStops = loop && stops.length > 0 ? [...stops, stops[0]] : stops;
    this.spectrum = this._generate(effectiveStops, Array.isArray(steps) ? steps : [steps]);
  }

  getColorAtFraction(fraction: number): Color {
    if (fraction <= 0) return this.spectrum[0];
    if (fraction >= 1) return this.spectrum[this.spectrum.length - 1];
    for (let i = 1; i <= this.spectrum.length; i++) {
      if (fraction <= i / this.spectrum.length) {
        return this.spectrum[i - 1];
      }
    }
    return this.spectrum[this.spectrum.length - 1];
  }

  private _generate(stops: Color[], steps: number[]): Color[] {
    if (stops.length === 0) return [];
    if (stops.length === 1) {
      const result: Color[] = [];
      for (let i = 0; i < steps[0]; i++) result.push(stops[0]);
      return result;
    }

    const pairs: [Color, Color][] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      pairs.push([stops[i], stops[i + 1]]);
    }

    // Extend steps to match pairs if needed
    const pairSteps = pairs.map((_, i) => steps[Math.min(i, steps.length - 1)]);

    const spectrum: Color[] = [];
    for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
      const [start, end] = pairs[pairIdx];
      const stepCount = pairSteps[pairIdx];
      const startRgb = rgbInts(start);
      const endRgb = rgbInts(end);

      const redDelta = Math.floor((endRgb[0] - startRgb[0]) / stepCount);
      const greenDelta = Math.floor((endRgb[1] - startRgb[1]) / stepCount);
      const blueDelta = Math.floor((endRgb[2] - startRgb[2]) / stepCount);

      const rangeStart = spectrum.length > 0 ? 1 : 0;
      for (let i = rangeStart; i < stepCount; i++) {
        const r = clamp(startRgb[0] + redDelta * i, 0, 255);
        const g = clamp(startRgb[1] + greenDelta * i, 0, 255);
        const b = clamp(startRgb[2] + blueDelta * i, 0, 255);
        spectrum.push(color(`${hex2(r)}${hex2(g)}${hex2(b)}`));
      }
      spectrum.push(end);
    }
    return spectrum;
  }

  buildCoordinateColorMapping(
    minRow: number,
    maxRow: number,
    minCol: number,
    maxCol: number,
    direction: GradientDirection,
  ): Map<string, Color> {
    const mapping = new Map<string, Color>();
    const rowOffset = minRow - 1;
    const colOffset = minCol - 1;

    if (direction === "vertical") {
      for (let row = minRow; row <= maxRow; row++) {
        const fraction = (row - rowOffset) / (maxRow - rowOffset);
        const c = this.getColorAtFraction(fraction);
        for (let col = minCol; col <= maxCol; col++) {
          mapping.set(coordKey(col, row), c);
        }
      }
    } else if (direction === "horizontal") {
      for (let col = minCol; col <= maxCol; col++) {
        const fraction = (col - colOffset) / (maxCol - colOffset);
        const c = this.getColorAtFraction(fraction);
        for (let row = minRow; row <= maxRow; row++) {
          mapping.set(coordKey(col, row), c);
        }
      }
    } else if (direction === "diagonal") {
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const fraction =
            ((row - rowOffset) * 2 + (col - colOffset)) /
            ((maxRow - rowOffset) * 2 + (maxCol - colOffset));
          mapping.set(coordKey(col, row), this.getColorAtFraction(fraction));
        }
      }
    } else if (direction === "radial") {
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const dist = normalizedDistFromCenter(minRow, maxRow, minCol, maxCol, col, row);
          mapping.set(coordKey(col, row), this.getColorAtFraction(dist));
        }
      }
    }

    return mapping;
  }
}

export function coordKey(col: number, row: number): string {
  return `${col},${row}`;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function normalizedDistFromCenter(
  bottom: number,
  top: number,
  left: number,
  right: number,
  col: number,
  row: number,
): number {
  const yOffset = bottom - 1;
  const xOffset = left - 1;
  const adjRight = right - xOffset;
  const adjTop = top - yOffset;
  const cx = adjRight / 2;
  const cy = adjTop / 2;
  const maxDist = Math.sqrt(adjRight ** 2 + (adjTop * 2) ** 2);
  const dist = Math.sqrt(((col - xOffset) - cx) ** 2 + (((row - yOffset) - cy) * 2) ** 2);
  return dist / (maxDist / 2);
}
