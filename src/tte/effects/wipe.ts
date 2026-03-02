import { Color, EasingFunction, Grouping, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { inOutSine } from "../easing";

export interface WipeConfig {
  wipeDirection: Grouping;
  wipeDelay: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultWipeConfig: WipeConfig = {
  wipeDirection: "diagonal",
  wipeDelay: 0,
  finalGradientStops: [color("833ab4"), color("fd1d1d"), color("fcb045")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "vertical",
};

export class WipeEffect {
  private canvas: Canvas;
  private config: WipeConfig;
  private pending: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private currentStep = 0;
  private totalSteps = 0;
  private delayCounter = 0;
  private totalChars = 0;
  private revealedCount = 0;
  private easing: EasingFunction = inOutSine;

  constructor(canvas: Canvas, config: WipeConfig) {
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

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    const groups = this.canvas.getCharactersGrouped(this.config.wipeDirection, { includeSpaces: false });
    const ordered: EffectCharacter[] = [];
    for (const group of groups) {
      for (const ch of group) {
        ordered.push(ch);
      }
    }

    for (const ch of ordered) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient(
        [this.config.finalGradientStops[0], finalColor],
        10,
      );
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
    }

    this.pending = ordered;
    this.totalChars = ordered.length;
    this.totalSteps = this.totalChars;
  }

  step(): boolean {
    if (this.pending.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    if (this.pending.length > 0) {
      if (this.config.wipeDelay > 0 && this.delayCounter < this.config.wipeDelay) {
        this.delayCounter++;
      } else {
        this.delayCounter = 0;
        this.currentStep++;
        const progress = this.easing(Math.min(this.currentStep / this.totalSteps, 1));
        const targetCount = Math.floor(progress * this.totalChars);
        while (this.revealedCount < targetCount && this.pending.length > 0) {
          const ch = this.pending.shift()!;
          ch.isVisible = true;
          ch.activateScene("gradient");
          this.activeChars.add(ch);
          this.revealedCount++;
        }
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pending.length > 0 || this.activeChars.size > 0;
  }
}
