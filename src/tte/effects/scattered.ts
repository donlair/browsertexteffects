import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutBack } from "../easing";

export interface ScatteredConfig {
  movementSpeed: number;
  movementEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultScatteredConfig: ScatteredConfig = {
  movementSpeed: 0.5,
  movementEasing: inOutBack,
  finalGradientStops: [color("ff9048"), color("ab9dff"), color("bdffea")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class ScatteredEffect {
  private canvas: Canvas;
  private config: ScatteredConfig;
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: ScatteredConfig) {
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
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }

      // Place at random position
      const startCol = randInt(dims.left, dims.right);
      const startRow = randInt(dims.bottom, dims.top);
      ch.motion.setCoordinate({ column: startCol, row: startRow });
      ch.isVisible = true;

      // Motion path to final position
      const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
      path.addWaypoint(ch.inputCoord);
      ch.motion.activatePath("input_path");

      // Gradient scene
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.finalGradientStops[0], finalColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.activateScene(scene);

      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    if (this.activeChars.size === 0) return false;

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.activeChars.size > 0;
  }
}
