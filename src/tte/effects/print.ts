import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface PrintConfig {
  typingSpeed: number;
  printHeadSymbol: string;
  inkSettlingSymbols: string[];
  inkSettlingDuration: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultPrintConfig: PrintConfig = {
  typingSpeed: 2,
  printHeadSymbol: "█",
  inkSettlingSymbols: ["█", "▓", "▒", "░"],
  inkSettlingDuration: 3,
  finalGradientStops: [color("02b8bd"), color("c1f0e3"), color("00ffa0")],
  finalGradientSteps: 12,
  finalGradientFrames: 4,
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

    // Make spaces visible
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    // Group by row — getCharactersGrouped("row") returns top-to-bottom (highest row first)
    // Reverse so we type bottom row first
    const rows = this.canvas.getCharactersGrouped("row", { includeSpaces: false });
    rows.reverse();

    // Sort each row left-to-right by column
    for (const row of rows) {
      row.sort((a, b) => a.inputCoord.column - b.inputCoord.column);
    }

    // Build scenes for each character
    for (const row of rows) {
      for (const ch of row) {
        // Ink settling scene
        const inkScene = ch.newScene("ink");
        for (const sym of this.config.inkSettlingSymbols) {
          inkScene.addFrame(sym, this.config.inkSettlingDuration, "ffffff");
        }

        // Final scene: gradient to mapped color
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const finalScene = ch.newScene("final");
        const charGradient = new Gradient([color("ffffff"), finalColor], 10);
        finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);

        // Chain: ink complete → activate final
        ch.eventHandler.register("SCENE_COMPLETE", "ink", "ACTIVATE_SCENE", "final");

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
      this.currentRow = this.pendingRows.shift()!;

      // Position new row chars at bottom (row 1)
      for (const ch of this.currentRow) {
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: 1 });
      }
    }

    // Type chars from current row
    let typed = 0;
    while (this.currentRow.length > 0 && typed < this.config.typingSpeed) {
      const ch = this.currentRow.shift()!;
      ch.isVisible = true;
      ch.activateScene("ink");
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
