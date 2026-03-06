import { type Color, type GradientDirection, type EasingFunction, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { inOutQuad } from "../easing";

export interface PrintConfig {
  typingSpeed: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
  printHeadReturnSpeed: number;
  printHeadEasing: EasingFunction;
}

export const defaultPrintConfig: PrintConfig = {
  typingSpeed: 2,
  finalGradientStops: [color("02b8bd"), color("c1f0e3"), color("00ffa0")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
  printHeadReturnSpeed: 1.5,
  printHeadEasing: inOutQuad,
};

export class PrintEffect {
  private canvas: Canvas;
  private config: PrintConfig;
  private pendingRows: EffectCharacter[][] = [];
  private currentRow: EffectCharacter[] = [];
  private allTypedChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private typingHead!: EffectCharacter;
  private lastColumn = 0;
  private currentRowNum = 0;

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

    // Create synthetic typing head character
    const headId = this.canvas.characters.length > 0
      ? Math.max(...this.canvas.characters.map((c) => c.id)) + 1
      : 0;
    const typingHead = new EffectCharacter(headId, "█", 1, 1);
    typingHead.isVisible = false;
    this.canvas.characters.push(typingHead);
    this.typingHead = typingHead;

    // Pre-load first row so typing starts immediately (no carriage return before row 0)
    this.currentRow = this.pendingRows.shift() ?? [];
    this.currentRowNum = this.currentRow[0]?.inputCoord.row ?? 1;
  }

  step(): boolean {
    const headIsMoving = this.activeChars.has(this.typingHead);

    if (!headIsMoving) {
      if (this.currentRow.length > 0) {
        // Type up to typingSpeed chars from the current row
        let typed = 0;
        while (this.currentRow.length > 0 && typed < this.config.typingSpeed) {
          const ch = this.currentRow.shift()!;
          ch.isVisible = true;
          ch.activateScene("typing");
          this.activeChars.add(ch);
          this.allTypedChars.push(ch);
          this.lastColumn = ch.inputCoord.column;
          typed++;
        }
      } else if (this.pendingRows.length > 0) {
        // Row finished — load next row, compute scroll amount, scroll typed chars up
        this.currentRow = this.pendingRows.shift()!;
        const nextRowNum = this.currentRow[0]?.inputCoord.row ?? this.currentRowNum - 1;
        const scrollBy = this.currentRowNum - nextRowNum;
        for (const ch of this.allTypedChars) {
          const cur = ch.motion.currentCoord;
          ch.motion.setCoordinate({ column: cur.column, row: cur.row + scrollBy });
        }
        this.currentRowNum = nextRowNum;

        const firstCol = this.currentRow[0]?.inputCoord.column ?? 1;
        this.typingHead.motion.setCoordinate({ column: this.lastColumn, row: 1 });
        this.typingHead.isVisible = true;
        const crPath = this.typingHead.motion.newPath(
          "carriage_return",
          this.config.printHeadReturnSpeed,
          this.config.printHeadEasing,
        );
        crPath.addWaypoint({ column: firstCol, row: 1 });
        this.typingHead.motion.activatePath("carriage_return");
        this.activeChars.add(this.typingHead);
      }
    }

    // Tick all active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        if (ch === this.typingHead) ch.isVisible = false;
        this.activeChars.delete(ch);
      }
    }

    return this.pendingRows.length > 0 || this.currentRow.length > 0 || this.activeChars.size > 0;
  }
}
