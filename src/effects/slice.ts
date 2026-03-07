import { type Color, type EasingFunction, color } from "../types";
import type { GradientDirection } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutExpo } from "../easing";

export interface SliceConfig {
  sliceDirection: "vertical" | "horizontal" | "diagonal";
  movementSpeed: number;
  movementEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSliceConfig: SliceConfig = {
  sliceDirection: "vertical",
  movementSpeed: 0.25,
  movementEasing: inOutExpo,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
};

export class SliceEffect {
  private canvas: Canvas;
  private config: SliceConfig;
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: SliceConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom,
      dims.textTop,
      dims.textLeft,
      dims.textRight,
      this.config.finalGradientDirection,
    );

    const { sliceDirection } = this.config;
    const charsToActivate: EffectCharacter[] = [];

    if (sliceDirection === "vertical") {
      const centerCol = dims.textCenterColumn;
      for (const ch of this.canvas.getCharacters().filter(ch => !ch.isSpace)) {
        const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);

        const startRow = ch.inputCoord.column <= centerCol ? dims.top + 1 : dims.bottom - 1;
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: startRow });

        this.setStaticAppearance(ch, colorMapping);
        charsToActivate.push(ch);
      }
    } else if (sliceDirection === "horizontal") {
      const speed = this.config.movementSpeed * 2;
      const centerRow = dims.textCenterRow;
      for (const ch of this.canvas.getCharacters()) {
        const path = ch.motion.newPath("input_path", speed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);

        const startCol = ch.inputCoord.row <= centerRow ? dims.left - 1 : dims.right + 1;
        ch.motion.setCoordinate({ column: startCol, row: ch.inputCoord.row });

        this.setStaticAppearance(ch, colorMapping);
        charsToActivate.push(ch);
      }
    } else {
      // diagonal
      const groups = this.canvas.getCharactersGrouped("diagonal", { includeSpaces: false });
      const splitIdx = Math.floor(groups.length / 2);
      const leftHalf = groups.slice(0, splitIdx);
      const rightHalf = groups.slice(splitIdx);

      for (const group of leftHalf) {
        for (const ch of group) {
          const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
          path.addWaypoint(ch.inputCoord);
          ch.motion.setCoordinate({ column: group[0].inputCoord.column, row: dims.bottom - 1 });
          this.setStaticAppearance(ch, colorMapping);
          charsToActivate.push(ch);
        }
      }

      for (const group of rightHalf) {
        for (const ch of group) {
          const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
          path.addWaypoint(ch.inputCoord);
          ch.motion.setCoordinate({ column: group[group.length - 1].inputCoord.column, row: dims.top + 1 });
          this.setStaticAppearance(ch, colorMapping);
          charsToActivate.push(ch);
        }
      }
    }

    for (const ch of charsToActivate) {
      ch.isVisible = true;
      ch.motion.activatePath("input_path");
      this.activeChars.add(ch);
    }
  }

  private setStaticAppearance(ch: EffectCharacter, colorMapping: Map<string, Color>): void {
    const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
    const charFinalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
    const scene = ch.newScene("static");
    scene.addFrame(ch.inputSymbol, 1, charFinalColor.rgbHex);
    ch.activateScene("static");
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
