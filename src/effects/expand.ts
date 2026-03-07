import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutQuart } from "../easing";

export interface ExpandConfig {
  movementSpeed: number;
  expandEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultExpandConfig: ExpandConfig = {
  movementSpeed: 0.35,
  expandEasing: inOutQuart,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 5,
  finalGradientDirection: "vertical",
};

export class ExpandEffect {
  private canvas: Canvas;
  private config: ExpandConfig;
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: ExpandConfig) {
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

      ch.motion.setCoordinate(dims.center);
      ch.isVisible = true;

      // Motion path to final position
      const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.expandEasing);
      path.addWaypoint(ch.inputCoord);
      ch.eventHandler.register("PATH_ACTIVATED", "input_path", "SET_LAYER", 1);
      ch.eventHandler.register("PATH_COMPLETE", "input_path", "SET_LAYER", 0);
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
