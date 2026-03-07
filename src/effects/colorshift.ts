import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { findNormalizedDistanceFromCenter } from "../geometry";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface ColorShiftConfig {
  gradientStops: Color[];
  gradientSteps: number;
  gradientFrames: number;
  cycles: number;
  travelDirection: GradientDirection;
  reverseTravelDirection: boolean;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultColorShiftConfig: ColorShiftConfig = {
  gradientStops: [color("e81416"), color("ffa500"), color("faeb36"), color("79c314"), color("487de7"), color("4b369d"), color("70369d")],
  gradientSteps: 12,
  gradientFrames: 2,
  cycles: 3,
  travelDirection: "radial",
  reverseTravelDirection: false,
  finalGradientStops: [color("e81416"), color("ffa500"), color("faeb36"), color("79c314"), color("487de7"), color("4b369d"), color("70369d")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

export class ColorShiftEffect {
  private canvas: Canvas;
  private config: ColorShiftConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private cyclesCompleted: Map<number, number> = new Map();

  constructor(canvas: Canvas, config: ColorShiftConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  // Called via CALLBACK event when the gradient scene completes — matches Python's loop_tracker.
  private loopTracker(character: EffectCharacter): void {
    const count = (this.cyclesCompleted.get(character.id) || 0) + 1;
    this.cyclesCompleted.set(character.id, count);
    if (this.config.cycles === 0 || count < this.config.cycles) {
      character.activateScene("loop");
    } else {
      character.activateScene("final");
    }
  }

  private build(): void {
    const { dims } = this.canvas;

    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const finalColorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // loop=true matches Python default (no_loop=False → loop=True): wraps last color back to first
    const waveGradient = new Gradient(this.config.gradientStops, this.config.gradientSteps, true);
    const spectrum = waveGradient.spectrum;

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    const maxCol = dims.textRight;
    const maxRow = dims.textTop;
    const minCol = dims.textLeft;
    const minRow = dims.textBottom;

    for (const ch of this.canvas.getNonSpaceCharacters()) {
      ch.isVisible = true;

      let offset: number;
      const col = ch.inputCoord.column;
      const row = ch.inputCoord.row;

      if (this.config.travelDirection === "horizontal") {
        offset = maxCol > minCol ? (col - minCol) / (maxCol - minCol) : 0;
      } else if (this.config.travelDirection === "vertical") {
        offset = maxRow > minRow ? (row - minRow) / (maxRow - minRow) : 0;
      } else if (this.config.travelDirection === "diagonal") {
        const maxSum = (maxRow - minRow) + (maxCol - minCol);
        offset = maxSum > 0 ? ((row - minRow) + (col - minCol)) / maxSum : 0;
      } else {
        // radial — matches Python: geometry.find_normalized_distance_from_center(text bounds)
        offset = findNormalizedDistanceFromCenter(minRow, maxRow, minCol, maxCol, ch.inputCoord);
      }

      if (this.config.reverseTravelDirection) offset = 1 - offset;

      const shift = Math.floor(offset * spectrum.length) % spectrum.length;
      const shifted = [...spectrum.slice(shift), ...spectrum.slice(0, shift)];

      // Non-looping scene: SCENE_COMPLETE fires after each pass, callback handles re-activation.
      // Matches Python architecture (gradient_scn is non-looping, loop_tracker callback restarts it).
      const loopScene = ch.newScene("loop");
      for (const c of shifted) {
        loopScene.addFrame(ch.inputSymbol, this.config.gradientFrames, c.rgbHex);
      }

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = finalColorMapping.get(key) || this.config.finalGradientStops[0];
      const finalScene = ch.newScene("final");
      // Start final gradient from last color of shifted spectrum (matches Python: colors[-1])
      const lastShiftedColor = shifted[shifted.length - 1] ?? shifted[0];
      // steps=8 matches Python; frame duration uses gradientFrames (matches Python)
      const charGradient = new Gradient([lastShiftedColor, finalColor], 8);
      finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.gradientFrames, charGradient);

      // Register cycle-tracking callback on SCENE_COMPLETE (matches Python's loop_tracker pattern)
      ch.eventHandler.register(
        "SCENE_COMPLETE",
        "loop",
        "CALLBACK",
        { callback: (c: EffectCharacter) => this.loopTracker(c), args: [] },
      );

      ch.activateScene("loop");
      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    if (this.activeChars.size === 0) return false;

    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.activeChars.size > 0;
  }
}
