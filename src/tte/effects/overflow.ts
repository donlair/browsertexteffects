import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";

export interface OverflowConfig {
  overflowGradientStops: Color[];
  overflowCyclesRange: [number, number];
  overflowSpeed: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultOverflowConfig: OverflowConfig = {
  overflowGradientStops: [color("f2ebc0"), color("8dbfb3"), color("f2ebc0")],
  overflowCyclesRange: [2, 4],
  overflowSpeed: 3,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface PendingRow {
  chars: EffectCharacter[];
  isFinal: boolean;
  targetRow: number; // the row number these chars belong to
}

interface ActiveRow {
  chars: EffectCharacter[];
  isFinal: boolean;
  currentRow: number; // current display row position
  targetRow: number;
}

let nextCopyId = 100000;

export class OverflowEffect {
  private canvas: Canvas;
  private config: OverflowConfig;
  private pendingRows: PendingRow[] = [];
  private activeRows: ActiveRow[] = [];
  private delay = 0;
  private overflowGradient: Gradient;
  private finalColorMapping: Map<string, Color>;

  constructor(canvas: Canvas, config: OverflowConfig) {
    this.canvas = canvas;
    this.config = config;
    this.overflowGradient = new Gradient(this.config.overflowGradientStops, Math.max(1, this.canvas.dims.top));
    this.finalColorMapping = new Map();
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.finalColorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Group original characters by row (top-to-bottom: highest row first)
    const rowGroups = this.canvas.getCharactersGrouped("row");

    // Hide all characters initially
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }

    // Determine number of chaotic cycles
    const numCycles = randInt(this.config.overflowCyclesRange[0], this.config.overflowCyclesRange[1]);

    // Build chaotic cycle rows with copy characters
    for (let cycle = 0; cycle < numCycles; cycle++) {
      const shuffled = shuffle(rowGroups);
      for (const rowChars of shuffled) {
        const copyChars: EffectCharacter[] = [];
        for (const origCh of rowChars) {
          const copy = new EffectCharacter(nextCopyId++, origCh.inputSymbol, origCh.inputCoord.column, origCh.inputCoord.row);
          copy.isSpace = origCh.isSpace;
          copy.isVisible = false;
          copyChars.push(copy);
          // Add to canvas so renderer builds spans
          this.canvas.characters.push(copy);
        }
        this.pendingRows.push({
          chars: copyChars,
          isFinal: false,
          targetRow: rowChars[0].inputCoord.row,
        });
      }
    }

    // Final pass: original characters in correct top-to-bottom order
    for (const rowChars of rowGroups) {
      this.pendingRows.push({
        chars: rowChars,
        isFinal: true,
        targetRow: rowChars[0].inputCoord.row,
      });
    }
  }

  step(): boolean {
    if (this.pendingRows.length === 0 && this.activeRows.length === 0) {
      return false;
    }

    if (this.delay > 0) {
      this.delay--;
      return true;
    }

    // Process some rows this tick
    const rowsToProcess = randInt(1, this.config.overflowSpeed);
    for (let i = 0; i < rowsToProcess && this.pendingRows.length > 0; i++) {
      // Move all active rows up by 1
      for (const active of this.activeRows) {
        active.currentRow++;
        for (const ch of active.chars) {
          ch.motion.setCoordinate({ column: ch.inputCoord.column, row: active.currentRow });
        }
        // Recolor non-final rows based on current vertical position
        if (!active.isFinal) {
          this.colorRowByPosition(active);
        }
      }

      // Dequeue next pending row, place at bottom (row 1)
      const pending = this.pendingRows.shift()!;
      const startRow = 1;
      for (const ch of pending.chars) {
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: startRow });
        ch.isVisible = true;
      }

      if (pending.isFinal) {
        // Apply final gradient colors
        for (const ch of pending.chars) {
          if (!ch.isSpace) {
            const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
            const finalColor = this.finalColorMapping.get(key) || this.config.finalGradientStops[0];
            ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor.rgbHex };
          }
        }
      } else {
        this.colorRowByPosition({ chars: pending.chars, currentRow: startRow, isFinal: false, targetRow: pending.targetRow });
      }

      this.activeRows.push({
        chars: pending.chars,
        isFinal: pending.isFinal,
        currentRow: startRow,
        targetRow: pending.targetRow,
      });
    }

    // Set random delay
    this.delay = randInt(0, 3);

    // Prune rows that scrolled past canvas top (non-final only)
    const canvasTop = this.canvas.dims.top;
    this.activeRows = this.activeRows.filter((active) => {
      if (!active.isFinal && active.currentRow > canvasTop + 2) {
        // Hide and remove
        for (const ch of active.chars) {
          ch.isVisible = false;
        }
        return false;
      }
      return true;
    });

    // Check if final rows have settled into their correct positions
    if (this.pendingRows.length === 0) {
      let allSettled = true;
      for (const active of this.activeRows) {
        if (active.isFinal && active.currentRow !== active.targetRow) {
          allSettled = false;
          break;
        }
        if (!active.isFinal) {
          allSettled = false;
          break;
        }
      }
      if (allSettled) {
        // Snap final rows to their target positions
        for (const active of this.activeRows) {
          for (const ch of active.chars) {
            ch.motion.setCoordinate(ch.inputCoord);
          }
        }
        return false;
      }
    }

    return true;
  }

  private colorRowByPosition(active: ActiveRow): void {
    const spectrum = this.overflowGradient.spectrum;
    if (spectrum.length === 0) return;
    const fraction = Math.min(active.currentRow / Math.max(1, this.canvas.dims.top), 1);
    const colorIdx = Math.min(Math.floor(fraction * spectrum.length), spectrum.length - 1);
    const rowColor = spectrum[colorIdx];
    for (const ch of active.chars) {
      if (!ch.isSpace) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: rowColor.rgbHex };
      }
    }
  }
}
