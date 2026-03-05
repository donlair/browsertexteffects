import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface PrintConfig {
  typingSpeed: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultPrintConfig: PrintConfig = {
  typingSpeed: 2,
  finalGradientStops: [color("02b8bd"), color("c1f0e3"), color("00ffa0")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
};

export class PrintEffect {
  private canvas: Canvas;
  private config: PrintConfig;
  private pendingRows: EffectCharacter[][] = [];
  private currentRow: EffectCharacter[] = [];
  private allTypedChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: PrintConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Make spaces visible at their input coordinates
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    // Group by row — "row" = ROW_TOP_TO_BOTTOM (highest row number first = top of screen first)
    // Python processes ROW_TOP_TO_BOTTOM; do NOT reverse — top row is typed first and scrolls highest
    const rows = this.canvas.getCharactersGrouped("row", { includeSpaces: false });

    // Sort each row left-to-right by column
    for (const row of rows) {
      row.sort((a, b) => a.inputCoord.column - b.inputCoord.column);
    }

    // Build scenes for each character
    for (const row of rows) {
      for (const ch of row) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];

        // Single scene matching Python: apply_gradient_to_symbols(("█","▓","▒","░",inputSymbol), 3, fg_gradient=Gradient(white→final, steps=5))
        // block chars fade to final color as they give way to the input symbol
        const charGradient = new Gradient([color("ffffff"), finalColor], 5);
        const typingScene = ch.newScene("typing");
        typingScene.applyGradientToSymbols(["█", "▓", "▒", "░", ch.inputSymbol], 3, charGradient);

        // Position all chars at bottom row initially
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: 1 });
      }
    }

    this.pendingRows = rows;
  }

  step(): boolean {
    if (this.pendingRows.length === 0 && this.currentRow.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Load next row if current is empty
    if (this.currentRow.length === 0 && this.pendingRows.length > 0) {
      // Shift all previously typed chars up by 1
      for (const ch of this.allTypedChars) {
        const cur = ch.motion.currentCoord;
        ch.motion.setCoordinate({ column: cur.column, row: cur.row + 1 });
      }

      // Load the next row
      const next = this.pendingRows.shift();
      if (next) this.currentRow = next;
    }

    // Type chars from current row
    let typed = 0;
    while (this.currentRow.length > 0 && typed < this.config.typingSpeed) {
      const ch = this.currentRow.shift();
      if (!ch) break;
      ch.isVisible = true;
      ch.activateScene("typing");
      this.activeChars.add(ch);
      this.allTypedChars.push(ch);
      typed++;
    }

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingRows.length > 0 || this.currentRow.length > 0 || this.activeChars.size > 0;
  }
}
