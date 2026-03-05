import { type Color, type EasingFunction, type Grouping, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { SequenceEaser, inOutCirc } from "../easing";

export interface WipeConfig {
  wipeDirection: Grouping;
  wipeEase: EasingFunction;
  wipeDelay: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultWipeConfig: WipeConfig = {
  wipeDirection: "diagonalTopLeftToBottomRight",
  wipeEase: inOutCirc,
  wipeDelay: 0,
  finalGradientStops: [color("833ab4"), color("fd1d1d"), color("fcb045")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "vertical",
};

export class WipeEffect {
  private canvas: Canvas;
  private config: WipeConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private easer: SequenceEaser<EffectCharacter[]>;
  private delayCounter: number;

  constructor(canvas: Canvas, config: WipeConfig) {
    this.canvas = canvas;
    this.config = config;
    this.delayCounter = 0;
    this.easer = this.build();
  }

  private build(): SequenceEaser<EffectCharacter[]> {
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

    for (const group of groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const scene = ch.newScene("wipe");
        const wipeGradient = new Gradient(
          [this.config.finalGradientStops[0], finalColor],
          this.config.finalGradientSteps,
        );
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, wipeGradient);
      }
    }

    return new SequenceEaser<EffectCharacter[]>(groups, this.config.wipeEase);
  }

  step(): boolean {
    if (this.activeChars.size === 0 && this.easer.isComplete()) {
      return false;
    }

    if (!this.easer.isComplete()) {
      if (this.delayCounter === 0) {
        this.easer.step();
        for (const group of this.easer.added) {
          for (const ch of group) {
            ch.isVisible = true;
            ch.activateScene("wipe");
            this.activeChars.add(ch);
          }
        }
        for (const group of this.easer.removed) {
          for (const ch of group) {
            if (ch.activeScene) {
              ch.activeScene.reset();
              ch.activeScene = null;
            }
            const wipeScene = ch.scenes.get("wipe");
            if (wipeScene) wipeScene.reset();
            ch.isVisible = false;
            this.activeChars.delete(ch);
          }
        }
        this.delayCounter = this.config.wipeDelay;
      } else {
        this.delayCounter--;
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return !this.easer.isComplete() || this.activeChars.size > 0;
  }
}
