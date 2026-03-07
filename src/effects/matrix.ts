import { type Color, color, type GradientDirection, adjustBrightness } from "../types";
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
const RAIN_SYMBOLS_COMMON = ["2","5","9","8","Z","*",")",":",".",'"',"=","+","-","¦","|","_"];
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
  private exhausted = false;
  private config: MatrixConfig;
  private rainGradientColors: Color[];
  private canvasBottom: number;

  phase: "rain" | "fill" = "rain";
  holdTime = 0;
  columnDropChance = 0.08;

  constructor(chars: EffectCharacter[], config: MatrixConfig, rainGradientColors: Color[], canvasBottom: number) {
    this.allChars = chars;
    this.config = config;
    this.rainGradientColors = rainGradientColors;
    this.canvasBottom = canvasBottom;

    // Initialize via setupColumn
    this.fallDelay = 0;
    this.fallTimer = 0;
    this.length = 0;
    this.pendingChars = [];
    this.setupColumn("rain");
  }

  get hasPendingChars(): boolean { return this.pendingChars.length > 0; }
  get hasVisibleChars(): boolean { return this.visibleChars.length > 0; }

  getVisibleChars(): EffectCharacter[] {
    return this.visibleChars;
  }

  setupColumn(phase: "rain" | "fill"): void {
    this.phase = phase;
    for (const ch of this.allChars) {
      ch.isVisible = ch.isSpace;
      ch.motion.setCoordinate(ch.inputCoord);
    }
    this.visibleChars = [];
    this.pendingChars = [...this.allChars];
    this.exhausted = false;
    this.columnDropChance = 0.08;

    if (phase === "fill") {
      this.fallDelay = randInt(
        Math.max(1, Math.floor(this.config.rainFallDelayRange[0] / 3)),
        Math.max(1, Math.floor(this.config.rainFallDelayRange[1] / 3)),
      );
      this.length = this.allChars.length;
    } else {
      this.fallDelay = randInt(this.config.rainFallDelayRange[0], this.config.rainFallDelayRange[1]);
      this.length = randInt(Math.max(1, Math.floor(this.allChars.length * 0.1)), this.allChars.length);
    }
    this.fallTimer = 0; // Python sets active_rain_fall_delay = 0

    this.holdTime = 0;
    if (this.length === this.allChars.length) {
      this.holdTime = randInt(20, 45);
    }
  }

  private dropColumn(): void {
    const outOfCanvas: EffectCharacter[] = [];
    for (const ch of this.visibleChars) {
      ch.motion.setCoordinate({
        column: ch.motion.currentCoord.column,
        row: ch.motion.currentCoord.row - 1,
      });
      if (ch.motion.currentCoord.row < this.canvasBottom) {
        ch.isVisible = false;
        outOfCanvas.push(ch);
      }
    }
    if (outOfCanvas.length > 0) {
      this.visibleChars = this.visibleChars.filter(ch => !outOfCanvas.includes(ch));
    }
  }

  private trimColumn(): void {
    if (this.visibleChars.length === 0) return;
    const tail = this.visibleChars.shift()!;
    tail.isVisible = false;
    if (this.visibleChars.length > 1) {
      this.fadeLastCharacter();
    }
  }

  private fadeLastCharacter(): void {
    const lastColors = this.rainGradientColors.slice(-3);
    const baseColor = randChoice(lastColors);
    const darkerHex = adjustBrightness(baseColor, 0.65).rgbHex;
    this.visibleChars[0].currentVisual = {
      symbol: this.visibleChars[0].currentVisual.symbol,
      fgColor: darkerHex,
    };
  }

  tick(): void {
    if (this.exhausted) return;

    if (this.fallTimer === 0) {
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

        // Hold time gates trimming
        if (this.holdTime > 0) {
          this.holdTime--;
        } else if (this.phase === "rain") {
          if (Math.random() < this.columnDropChance) {
            this.dropColumn();
          }
          this.trimColumn();
        }
      }

      // Trim if over max length (both phases)
      if (this.visibleChars.length > this.length) {
        this.trimColumn();
      }
    } else {
      this.fallTimer--;
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
}

export class MatrixEffect {
  private canvas: Canvas;
  private config: MatrixConfig;
  private pendingColumns: RainColumn[] = [];
  private activeColumns: RainColumn[] = [];
  private columnDelay = 0;
  private columnChars: EffectCharacter[][] = [];
  private phase: "rain" | "fill" | "resolve" = "rain";
  private rainTicks = 0;
  private resolvingChars: Set<EffectCharacter> = new Set();
  private rainGradientColors: Color[] = [];
  private fullColumnState: Array<{ chars: EffectCharacter[]; col?: RainColumn }> = [];
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

    // Create RainColumn per column (no staggered delays)
    for (const group of this.columnChars) {
      this.pendingColumns.push(
        new RainColumn(group, this.config, this.rainGradientColors, dims.bottom),
      );
    }
    // Shuffle for random spawn order (matching Python)
    for (let i = this.pendingColumns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pendingColumns[i], this.pendingColumns[j]] = [this.pendingColumns[j], this.pendingColumns[i]];
    }
  }

  step(): boolean {
    if (this.phase === "rain" || this.phase === "fill") {
      // Spawn columns
      if (this.columnDelay === 0) {
        if (this.phase === "rain") {
          const count = randInt(1, 3);
          for (let i = 0; i < count && this.pendingColumns.length > 0; i++) {
            this.activeColumns.push(this.pendingColumns.shift()!);
          }
        } else {
          while (this.pendingColumns.length > 0) {
            this.activeColumns.push(this.pendingColumns.shift()!);
          }
        }
        this.columnDelay = this.phase === "rain"
          ? randInt(this.config.columnDelayRange[0], this.config.columnDelayRange[1])
          : 1;
      } else {
        this.columnDelay--;
      }

      // Tick columns
      for (const col of this.activeColumns) {
        col.tick();
        if (!col.hasPendingChars) {
          if (col.phase === "fill" && !this.fullColumnState.some(s => s.col === col)) {
            const visible = col.getVisibleChars();
            if (visible.length > 0) {
              this.fullColumnState.push({ chars: [...visible], col });
            }
          } else if (!col.hasVisibleChars) {
            col.setupColumn(this.phase);
            this.pendingColumns.push(col);
          }
        }
      }
      this.activeColumns = this.activeColumns.filter(col => col.hasVisibleChars);

      // Check fill→resolve transition
      if (
        this.phase === "fill" &&
        this.pendingColumns.length === 0 &&
        this.activeColumns.every(col => !col.hasPendingChars && col.phase === "fill")
      ) {
        this.phase = "resolve";
        this.activeColumns = [];
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

      // Check rain→fill transition
      if (this.phase === "rain") {
        this.rainTicks++;
        // Python uses wall-clock seconds; TS uses ticks (~15s at 60fps)
        if (this.rainTicks >= this.config.rainTime) {
          this.phase = "fill";
          for (const col of this.activeColumns) {
            col.holdTime = 0;
            col.columnDropChance = 1;
          }
          for (const col of this.pendingColumns) {
            col.setupColumn("fill");
          }
        }
      }

      return true;
    }

    if (this.phase === "resolve") {
      // Apply symbol/color volatility to chars still waiting to be resolved
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
              if (ch.isSpace) {
                ch.isVisible = false;
              } else {
                ch.activateScene("resolve");
                this.resolvingChars.add(ch);
              }
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
