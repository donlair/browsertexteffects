import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inQuad } from "../easing";

export interface RainConfig {
  rainSymbols: string[];
  rainColor: Color;
  fallSpeed: number;
  fallEasing: EasingFunction;
  charsPerTick: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultRainConfig: RainConfig = {
  rainSymbols: ["|", ".", ","],
  rainColor: color("aaddff"),
  fallSpeed: 0.5,
  fallEasing: inQuad,
  charsPerTick: 2,
  finalGradientStops: [color("488bff"), color("b2e7de"), color("57eaf7")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "diagonal",
};

export class RainEffect {
  private canvas: Canvas;
  private config: RainConfig;
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private fallingChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: RainConfig) {
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

    const nonSpace = this.canvas.getNonSpaceCharacters();

    for (const ch of nonSpace) {
      // Start above canvas
      ch.motion.setCoordinate({ column: ch.inputCoord.column, row: dims.top + 1 });

      // Fall path to input position
      const path = ch.motion.newPath("fall", this.config.fallSpeed, this.config.fallEasing);
      path.addWaypoint(ch.inputCoord);

      // Rain scene (looping) — cycles through rain symbols while falling
      const rainScene = ch.newScene("rain", true);
      for (const sym of this.config.rainSymbols) {
        rainScene.addFrame(sym, 3, this.config.rainColor.rgbHex);
      }

      // Fade scene — transitions from rain color to final color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const fadeScene = ch.newScene("fade");
      const fadeGradient = new Gradient([this.config.rainColor, finalColor], 10);
      fadeScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, fadeGradient);
    }

    // Shuffle for random release order
    this.pendingChars = shuffle(nonSpace);
  }

  step(): boolean {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Release chars
    let released = 0;
    while (this.pendingChars.length > 0 && released < this.config.charsPerTick) {
      const ch = this.pendingChars.pop()!;
      ch.isVisible = true;
      ch.activateScene("rain");
      ch.motion.activatePath("fall");
      this.activeChars.add(ch);
      this.fallingChars.add(ch);
      released++;
    }

    // Tick all active chars
    for (const ch of this.activeChars) {
      ch.tick();

      // Check if falling char has landed
      if (this.fallingChars.has(ch) && ch.motion.movementIsComplete()) {
        this.fallingChars.delete(ch);
        ch.activateScene("fade");
      }

      if (!ch.isActive) {
        this.activeChars.delete(ch);
        this.fallingChars.delete(ch);
      }
    }

    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
