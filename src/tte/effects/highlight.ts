import { type Color, type GradientDirection, type Grouping, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { SequenceEaser, inOutCirc } from "../easing";

export interface HighlightConfig {
  highlightBrightness: number;
  highlightDirection: Grouping;
  highlightWidth: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultHighlightConfig: HighlightConfig = {
  highlightBrightness: 1.75,
  highlightDirection: "diagonal",
  highlightWidth: 8,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

export class HighlightEffect {
  private canvas: Canvas;
  private config: HighlightConfig;
  private colorMapping: Map<string, Color> = new Map();
  private easer!: SequenceEaser<EffectCharacter[]>;
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: HighlightConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Make all characters visible with their base gradient color
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const baseColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: baseColor.rgbHex };
    }

    // Group characters and build highlight scenes
    const groups = this.canvas.getCharactersGrouped(this.config.highlightDirection, { includeSpaces: false });
    this.easer = new SequenceEaser<EffectCharacter[]>(groups, inOutCirc);

    for (const group of groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const baseColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const brightColor = adjustBrightness(baseColor, this.config.highlightBrightness);

        // Gradient: base→bright (3 steps), bright plateau (highlightWidth steps), bright→base (3 steps)
        const highlightGradient = new Gradient(
          [baseColor, brightColor, brightColor, baseColor],
          [3, this.config.highlightWidth, 3],
        );

        const scene = ch.newScene("highlight");
        for (const c of highlightGradient.spectrum) {
          scene.addFrame(ch.inputSymbol, 2, c.rgbHex);
        }
      }
    }
  }

  step(): boolean {
    if (this.activeChars.size === 0 && this.easer.isComplete()) {
      return false;
    }

    this.easer.step();
    for (const group of this.easer.added) {
      for (const ch of group) {
        ch.activateScene("highlight");
        this.activeChars.add(ch);
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return true;
  }
}
