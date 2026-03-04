import { type Color, color, type GradientDirection } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface MatrixConfig {
  rainSymbols: string[];
  rainGradientStops: Color[];
  highlightColor: Color;
  rainTime: number;
  columnDelayRange: [number, number];
  rainFallDelayRange: [number, number];
  symbolSwapChance: number;
  colorSwapChance: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

const RAIN_SYMBOLS = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..."!@#$%^&*()-_=+[]{}|;:',.<>?/~`",
];

export const defaultMatrixConfig: MatrixConfig = {
  rainSymbols: RAIN_SYMBOLS,
  rainGradientStops: [color("92be92"), color("185318")],
  highlightColor: color("dbffdb"),
  rainTime: 900,
  columnDelayRange: [3, 9],
  rainFallDelayRange: [2, 15],
  symbolSwapChance: 0.005,
  colorSwapChance: 0.001,
  finalGradientStops: [color("389c38"), color("45c745")],
  finalGradientSteps: 12,
  finalGradientFrames: 5,
  finalGradientDirection: "vertical",
};

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class RainColumn {
  private pendingChars: EffectCharacter[];
  private visibleChars: EffectCharacter[] = [];
  private allChars: EffectCharacter[];
  private length: number;
  private fallDelay: number;
  private fallTimer: number;
  private startDelay: number;
  private fillMode = false;
  private exhausted = false;
  private config: MatrixConfig;
  private rainGradientColors: Color[];

  constructor(chars: EffectCharacter[], config: MatrixConfig, startDelay: number, rainGradientColors: Color[]) {
    this.allChars = chars;
    this.config = config;
    this.rainGradientColors = rainGradientColors;
    this.startDelay = startDelay;
    this.fallDelay = randInt(config.rainFallDelayRange[0], config.rainFallDelayRange[1]);
    this.fallTimer = this.fallDelay;
    this.length = randInt(3, Math.max(4, Math.floor(chars.length * 0.7)));
    this.pendingChars = [...chars];
  }

  get isActive(): boolean {
    return this.startDelay <= 0 && !this.exhausted;
  }

  get isExhausted(): boolean {
    return this.exhausted;
  }

  tick(): void {
    if (this.startDelay > 0) {
      this.startDelay--;
      return;
    }

    if (this.exhausted) return;

    this.fallTimer--;
    if (this.fallTimer <= 0) {
      this.fallTimer = this.fallDelay;

      // Reveal next char
      if (this.pendingChars.length > 0) {
        const ch = this.pendingChars.shift()!;
        ch.isVisible = true;
        ch.currentVisual = {
          symbol: randChoice(this.config.rainSymbols),
          fgColor: this.config.highlightColor.rgbHex,
        };
        this.visibleChars.push(ch);
      }

      // Remove highlight from previous lead, apply rain color
      if (this.visibleChars.length > 1) {
        const prev = this.visibleChars[this.visibleChars.length - 2];
        prev.currentVisual = {
          symbol: prev.currentVisual.symbol,
          fgColor: this.rainGradientColors.length > 0
            ? randChoice(this.rainGradientColors).rgbHex
            : this.config.rainGradientStops[0].rgbHex,
        };
      }

      // Trim tail
      if (!this.fillMode) {
        if (this.visibleChars.length > this.length || this.pendingChars.length === 0) {
          // Over max length, or draining after pending exhausted
          if (this.visibleChars.length > 0) {
            const tail = this.visibleChars.shift()!;
            tail.isVisible = false;
          }
        }
      }

      // Check if column is exhausted
      if (this.pendingChars.length === 0 && this.visibleChars.length === 0) {
        this.exhausted = true;
      }
    }

    // Apply symbol/color volatility to visible chars (except lead)
    for (let i = 0; i < this.visibleChars.length - 1; i++) {
      const ch = this.visibleChars[i];
      if (Math.random() < this.config.symbolSwapChance) {
        ch.currentVisual = {
          symbol: randChoice(this.config.rainSymbols),
          fgColor: ch.currentVisual.fgColor,
        };
      }
      if (Math.random() < this.config.colorSwapChance) {
        ch.currentVisual = {
          symbol: ch.currentVisual.symbol,
          fgColor: this.rainGradientColors.length > 0
            ? randChoice(this.rainGradientColors).rgbHex
            : ch.currentVisual.fgColor,
        };
      }
    }
  }

  enterFillMode(): void {
    this.fillMode = true;
    this.exhausted = false;
    this.fallDelay = Math.max(1, Math.floor(this.fallDelay / 2));
    this.fallTimer = this.fallDelay;
    this.length = this.allChars.length;
    // Re-queue any chars that aren't visible
    this.pendingChars = this.allChars.filter((ch) => !ch.isVisible);
  }

  reset(startDelay: number): void {
    // Hide all chars and re-queue
    for (const ch of this.allChars) {
      ch.isVisible = ch.isSpace;
    }
    this.visibleChars = [];
    this.pendingChars = [...this.allChars];
    this.startDelay = startDelay;
    this.exhausted = false;
    this.fallDelay = randInt(this.config.rainFallDelayRange[0], this.config.rainFallDelayRange[1]);
    this.fallTimer = this.fallDelay;
    this.length = randInt(3, Math.max(4, Math.floor(this.allChars.length * 0.7)));
  }
}

export class MatrixEffect {
  private canvas: Canvas;
  private config: MatrixConfig;
  private columns: RainColumn[] = [];
  private columnChars: EffectCharacter[][] = [];
  private phase: "rain" | "fill" | "resolve" = "rain";
  private rainTicks = 0;
  private resolvingChars: Set<EffectCharacter> = new Set();
  private rainGradientColors: Color[] = [];

  constructor(canvas: Canvas, config: MatrixConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    // Build rain gradient colors
    const rainGradient = new Gradient(this.config.rainGradientStops, 8);
    this.rainGradientColors = rainGradient.spectrum;

    // Build final color mapping
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom,
      dims.textTop,
      dims.textLeft,
      dims.textRight,
      this.config.finalGradientDirection,
    );

    // Make spaces visible immediately
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }

    // Group by column, sort each column top-to-bottom (descending row = top first)
    const groups = this.canvas.getCharactersGrouped("column");
    for (const group of groups) {
      const sorted = [...group].sort((a, b) => b.inputCoord.row - a.inputCoord.row);
      this.columnChars.push(sorted);
    }

    // Pre-build resolve scenes for non-space characters
    for (const group of this.columnChars) {
      for (const ch of group) {
        if (ch.isSpace) continue;
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const resolveScene = ch.newScene("resolve");
        const resolveGradient = new Gradient(
          [this.config.highlightColor, finalColor],
          this.config.finalGradientSteps,
        );
        resolveScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, resolveGradient);
      }
    }

    // Create RainColumn per column with staggered start delays
    for (const group of this.columnChars) {
      const delay = randInt(0, this.config.columnDelayRange[1] * this.columnChars.length);
      this.columns.push(new RainColumn(group, this.config, delay, this.rainGradientColors));
    }
  }

  step(): boolean {
    if (this.phase === "rain") {
      this.rainTicks++;

      for (const col of this.columns) {
        col.tick();
        if (col.isExhausted) {
          col.reset(randInt(this.config.columnDelayRange[0], this.config.columnDelayRange[1] * 3));
        }
      }

      if (this.rainTicks >= this.config.rainTime) {
        this.phase = "fill";
        for (const col of this.columns) {
          col.enterFillMode();
        }
      }
      return true;
    }

    if (this.phase === "fill") {
      let allFillDone = true;
      for (const col of this.columns) {
        if (!col.isExhausted) {
          col.tick();
          allFillDone = false;
        }
      }

      if (allFillDone) {
        this.phase = "resolve";
        for (const group of this.columnChars) {
          for (const ch of group) {
            if (ch.isSpace) {
              // Reset spaces to their original blank symbol
              ch.currentVisual = { symbol: ch.inputSymbol, fgColor: null };
            } else {
              ch.activateScene("resolve");
              this.resolvingChars.add(ch);
            }
          }
        }
      }
      return true;
    }

    if (this.phase === "resolve") {
      if (this.resolvingChars.size > 0) {
        for (const ch of this.resolvingChars) {
          ch.tick();
          if (!ch.isActive) {
            this.resolvingChars.delete(ch);
          }
        }
        return true;
      }
      return false;
    }

    return false;
  }
}
