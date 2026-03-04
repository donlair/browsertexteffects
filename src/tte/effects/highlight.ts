import { type Color, type GradientDirection, type Grouping, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutCirc } from "../easing";

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
  private groups: EffectCharacter[][] = [];
  private colorMapping: Map<string, Color> = new Map();
  private currentStep = 0;
  private totalSteps = 0;
  private lastGroupIndex = -1;
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
    this.groups = this.canvas.getCharactersGrouped(this.config.highlightDirection, { includeSpaces: false });
    this.totalSteps = this.groups.length * 3;

    for (const group of this.groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const baseColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const brightColor = adjustBrightness(baseColor, this.config.highlightBrightness);

        // Build a gradient: base → bright → bright → base
        const highlightGradient = new Gradient(
          [baseColor, brightColor, brightColor, baseColor],
          this.config.highlightWidth,
        );

        const scene = ch.newScene("highlight");
        for (const c of highlightGradient.spectrum) {
          scene.addFrame(ch.inputSymbol, 2, c.rgbHex);
        }
        // Final frame returns to base color
        scene.addFrame(ch.inputSymbol, 1, baseColor.rgbHex);
      }
    }
  }

  step(): boolean {
    this.currentStep++;
    const progress = inOutCirc(Math.min(this.currentStep / this.totalSteps, 1));
    const targetGroupIndex = Math.min(
      Math.floor(progress * this.groups.length),
      this.groups.length - 1,
    );

    // Activate newly reached groups
    for (let i = this.lastGroupIndex + 1; i <= targetGroupIndex; i++) {
      for (const ch of this.groups[i]) {
        ch.activateScene("highlight");
        this.activeChars.add(ch);
      }
    }
    this.lastGroupIndex = targetGroupIndex;

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    // Done when all groups processed and no active chars remain
    if (this.currentStep >= this.totalSteps && this.activeChars.size === 0) {
      return false;
    }

    return true;
  }
}
