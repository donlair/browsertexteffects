import { Color, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";

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
  private animChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private cyclesCompleted: Map<number, number> = new Map();
  private charFinished: Set<number> = new Set();

  constructor(canvas: Canvas, config: ColorShiftConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const finalColorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    const waveGradient = new Gradient(this.config.gradientStops, this.config.gradientSteps);
    const spectrum = waveGradient.spectrum;

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    this.animChars = this.canvas.getNonSpaceCharacters();
    const maxCol = dims.textRight;
    const maxRow = dims.textTop;
    const minCol = dims.textLeft;
    const minRow = dims.textBottom;

    for (const ch of this.animChars) {
      ch.isVisible = true;
      this.cyclesCompleted.set(ch.id, 0);

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
        // radial
        const cx = (maxCol + minCol) / 2;
        const cy = (maxRow + minRow) / 2;
        const maxDist = Math.sqrt((maxCol - cx) ** 2 + (maxRow - cy) ** 2) || 1;
        const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);
        offset = dist / maxDist;
      }

      if (this.config.reverseTravelDirection) offset = 1 - offset;

      const shift = Math.floor(offset * spectrum.length) % spectrum.length;
      const shifted = [...spectrum.slice(shift), ...spectrum.slice(0, shift)];

      const loopScene = ch.newScene("loop", true);
      for (const c of shifted) {
        loopScene.addFrame(ch.inputSymbol, this.config.gradientFrames, c.rgbHex);
      }

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = finalColorMapping.get(key) || this.config.finalGradientStops[0];
      const finalScene = ch.newScene("final");
      const charGradient = new Gradient([spectrum[shift], finalColor], 10);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 3, charGradient);

      ch.activateScene("loop");
      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    if (this.activeChars.size === 0) return false;

    for (const ch of this.activeChars) {
      if (this.charFinished.has(ch.id)) {
        ch.tick();
        if (!ch.isActive) {
          this.activeChars.delete(ch);
        }
        continue;
      }

      // Looping phase: manually tick and count cycles
      ch.tick();
      const loopScene = ch.scenes.get("loop")!;
      // isComplete for looping scenes is always true (by design), so we track
      // when the scene wraps by checking if frames were recycled.
      // We detect cycle completion by checking if we're back at frame 0
      if (loopScene.frames.length > 0 && loopScene.playedFrames.length === 0) {
        // A looping scene just recycled its frames
        const count = (this.cyclesCompleted.get(ch.id) || 0) + 1;
        this.cyclesCompleted.set(ch.id, count);
        if (count >= this.config.cycles) {
          this.charFinished.add(ch.id);
          ch.activateScene("final");
        }
      }
    }

    return this.activeChars.size > 0;
  }
}
