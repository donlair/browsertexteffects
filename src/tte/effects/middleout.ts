import { Color, EasingFunction, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { inOutSine } from "../easing";

export interface MiddleOutConfig {
  startingColor: Color;
  expandDirection: "vertical" | "horizontal";
  centerMovementSpeed: number;
  fullMovementSpeed: number;
  centerEasing: EasingFunction;
  fullEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultMiddleOutConfig: MiddleOutConfig = {
  startingColor: color("ffffff"),
  expandDirection: "vertical",
  centerMovementSpeed: 0.6,
  fullMovementSpeed: 0.6,
  centerEasing: inOutSine,
  fullEasing: inOutSine,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

export class MiddleOutEffect {
  private canvas: Canvas;
  private config: MiddleOutConfig;
  private animChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private phase: "center" | "full" | "done" = "center";
  private characterFinalColorMap: Map<number, Color> = new Map();

  constructor(canvas: Canvas, config: MiddleOutConfig) {
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

    this.animChars = this.canvas.getNonSpaceCharacters();

    const centerRow = Math.round((dims.textTop + dims.textBottom) / 2);
    const centerCol = Math.round((dims.textLeft + dims.textRight) / 2);

    for (const ch of this.animChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      this.characterFinalColorMap.set(ch.id, colorMapping.get(key) || this.config.finalGradientStops[0]);

      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.config.startingColor.rgbHex };

      const centerPath = ch.motion.newPath("center_path", this.config.centerMovementSpeed, this.config.centerEasing);
      if (this.config.expandDirection === "vertical") {
        centerPath.addWaypoint({ column: ch.inputCoord.column, row: centerRow });
      } else {
        centerPath.addWaypoint({ column: centerCol, row: ch.inputCoord.row });
      }

      ch.motion.activatePath("center_path");
      this.activeChars.add(ch);
    }
  }

  private startFullPhase(): void {
    for (const ch of this.animChars) {
      const fullPath = ch.motion.newPath("full_path", this.config.fullMovementSpeed, this.config.fullEasing);
      fullPath.addWaypoint(ch.inputCoord);
      ch.motion.activatePath("full_path");

      const finalColor = this.characterFinalColorMap.get(ch.id)!;
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.startingColor, finalColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, 3, charGradient);
      ch.activateScene("gradient");

      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    if (this.phase === "done") return false;

    if (this.phase === "center") {
      if (this.activeChars.size > 0) {
        for (const ch of this.activeChars) {
          ch.motion.move();
          if (ch.motion.movementIsComplete()) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      this.phase = "full";
      this.startFullPhase();
      return true;
    }

    if (this.phase === "full") {
      if (this.activeChars.size > 0) {
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      this.phase = "done";
      return false;
    }

    return false;
  }
}
