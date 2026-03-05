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
  resolveDelay: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

// Python's MATRIX_SYMBOLS_COMMON + MATRIX_SYMBOLS_KATA
const RAIN_SYMBOLS_COMMON = ["2","5","9","8","Z","*",")",":",".","\"","=","+","-","¦","|","_"];
const RAIN_SYMBOLS_KATA = [
  "ｦ","ｱ","ｳ","ｴ","ｵ","ｶ","ｷ","ｹ","ｺ","ｻ","ｼ","ｽ","ｾ","ｿ",
  "ﾀ","ﾂ","ﾃ","ﾅ","ﾆ","ﾇ","ﾈ","ﾊ","ﾋ","ﾎ","ﾏ","ﾐ","ﾑ","ﾒ","ﾓ","ﾔ","ﾕ","ﾗ","ﾘ","ﾜ",
];

export const defaultMatrixConfig: MatrixConfig = {
  rainSymbols: [...RAIN_SYMBOLS_COMMON, ...RAIN_SYMBOLS_KATA],
  rainGradientStops: [color("92be92"), color("185318")],
  highlightColor: color("dbffdb"),
  rainTime: 900,
  columnDelayRange: [3, 9],
  rainFallDelayRange: [2, 15],
  symbolSwapChance: 0.005,
  colorSwapChance: 0.001,
  resolveDelay: 3,
  finalGradientStops: [color("92be92"), color("336b33")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "radial",
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
    // Python: randint(max(1, int(len*0.1)), len(chars)) — allows full-height columns
    this.length = randInt(Math.max(1, Math.floor(chars.length * 0.1)), chars.length);
    this.pendingChars = [...chars];
  }

  get isActive(): boolean {
    return this.startDelay <= 0 && !this.exhausted;
  }

  get isExhausted(): boolean {
    return this.exhausted;
  }

  getVisibleChars(): EffectCharacter[] {
    return this.visibleChars;
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
        const ch = this.pendingChars.shift();
        if (!ch) return;
        ch.isVisible = true;
        ch.currentVisual = {
          symbol: randChoice(this.config.rainSymbols),
          fgColor: this.config.highlightColor.rgbHex,
        };
        this.visibleChars.push(ch);

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
      } else if (this.visibleChars.length > 0) {
        // No pending chars: remove highlight from lead char
        const lead = this.visibleChars[this.visibleChars.length - 1];
        if (lead.currentVisual.fgColor === this.config.highlightColor.rgbHex) {
          lead.currentVisual = {
            symbol: lead.currentVisual.symbol,
            fgColor: randChoice(this.rainGradientColors).rgbHex,
          };
        }

        // Trim tail (rain phase only)
        if (!this.fillMode) {
          const tail = this.visibleChars.shift();
          if (tail) tail.isVisible = false;
        }
      }

      // Trim if over max length
      if (!this.fillMode && this.visibleChars.length > this.length) {
        const tail = this.visibleChars.shift();
        if (tail) tail.isVisible = false;
      }

      // Check if column is exhausted (non-fill mode only)
      if (!this.fillMode && this.pendingChars.length === 0 && this.visibleChars.length === 0) {
        this.exhausted = true;
      }

      // Fill mode exhausted when all chars visible
      if (this.fillMode && this.pendingChars.length === 0) {
        this.exhausted = true;
      }
    }

    // Apply symbol/color volatility to visible chars
    for (const ch of this.visibleChars) {
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
    // Python: fresh randint from range // 3 (not dividing current delay)
    this.fallDelay = randInt(
      Math.max(1, Math.floor(this.config.rainFallDelayRange[0] / 3)),
      Math.max(1, Math.floor(this.config.rainFallDelayRange[1] / 3)),
    );
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
    this.fillMode = false;
    this.fallDelay = randInt(this.config.rainFallDelayRange[0], this.config.rainFallDelayRange[1]);
    this.fallTimer = this.fallDelay;
    this.length = randInt(Math.max(1, Math.floor(this.allChars.length * 0.1)), this.allChars.length);
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
  // Full columns (all pending exhausted) waiting to be resolved staggered
  private fullColumnState: Array<{ chars: EffectCharacter[] }> = [];
  private resolveTimer = 0;

  constructor(canvas: Canvas, config: MatrixConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    // Build rain gradient colors (Python uses steps=6)
    const rainGradient = new Gradient(this.config.rainGradientStops, 6);
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
    // Python: Gradient(highlight_color, final_color, steps=8) — hardcoded 8
    for (const group of this.columnChars) {
      for (const ch of group) {
        if (ch.isSpace) continue;
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const resolveScene = ch.newScene("resolve");
        const resolveGradient = new Gradient(
          [this.config.highlightColor, finalColor],
          8, // Python hardcodes steps=8
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
        // Collect visible chars per column for staggered resolve
        for (const col of this.columns) {
          const visible = col.getVisibleChars().filter((ch) => !ch.isSpace);
          if (visible.length > 0) {
            this.fullColumnState.push({ chars: [...visible] });
          }
        }
        // Reset spaces to their original blank symbol
        for (const group of this.columnChars) {
          for (const ch of group) {
            if (ch.isSpace) {
              ch.currentVisual = { symbol: ch.inputSymbol, fgColor: null };
            }
          }
        }
        this.resolveTimer = this.config.resolveDelay;
      }
      return true;
    }

    if (this.phase === "resolve") {
      // Apply symbol/color volatility to chars still waiting to be resolved
      // (Python calls column.tick() during resolve phase, which runs volatility logic)
      for (const state of this.fullColumnState) {
        for (const ch of state.chars) {
          if (Math.random() < this.config.symbolSwapChance) {
            ch.currentVisual = { symbol: randChoice(this.config.rainSymbols), fgColor: ch.currentVisual.fgColor };
          }
          if (Math.random() < this.config.colorSwapChance && this.rainGradientColors.length > 0) {
            ch.currentVisual = { symbol: ch.currentVisual.symbol, fgColor: randChoice(this.rainGradientColors).rgbHex };
          }
        }
      }

      // Staggered resolve: matches Python's single shared timer that decrements once per
      // column-iteration. This creates a round-robin effect across columns.
      for (const state of this.fullColumnState) {
        if (state.chars.length > 0) {
          if (this.resolveTimer === 0) {
            const count = randInt(1, 4);
            for (let i = 0; i < count && state.chars.length > 0; i++) {
              const idx = randInt(0, state.chars.length - 1);
              const ch = state.chars.splice(idx, 1)[0];
              ch.activateScene("resolve");
              this.resolvingChars.add(ch);
            }
            this.resolveTimer = this.config.resolveDelay;
          } else {
            this.resolveTimer--;
          }
        }
      }
      this.fullColumnState = this.fullColumnState.filter((s) => s.chars.length > 0);

      // Tick resolving chars
      for (const ch of this.resolvingChars) {
        ch.tick();
        if (!ch.isActive) {
          this.resolvingChars.delete(ch);
        }
      }

      if (this.fullColumnState.length === 0 && this.resolvingChars.size === 0) {
        return false;
      }
      return true;
    }

    return false;
  }
}
