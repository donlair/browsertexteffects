import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inQuart } from "../easing";

export interface RainConfig {
  rainSymbols: string[];
  rainColors: Color[];
  fallSpeed: number;
  fallEasing: EasingFunction;
  charsPerTick: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultRainConfig: RainConfig = {
  rainSymbols: ["o", ".", ",", "*", "|"],
  rainColors: [
    color("00315C"),
    color("004C8F"),
    color("0075DB"),
    color("3F91D9"),
    color("78B9F2"),
    color("9AC8F5"),
    color("B8D8F8"),
    color("E3EFFC"),
  ],
  fallSpeed: 0.5,
  fallEasing: inQuart,
  charsPerTick: 2,
  finalGradientStops: [color("488bff"), color("b2e7de"), color("57eaf7")],
  finalGradientSteps: 12,
  // frames per gradient symbol in fade scene (Python hardcodes 3)
  finalGradientFrames: 3,
  finalGradientDirection: "diagonal",
};

export class RainEffect {
  private canvas: Canvas;
  private config: RainConfig;
  // characters grouped by row (ascending row number = bottom row first)
  private pendingByRow: Map<number, EffectCharacter[]> = new Map();
  private pendingRowQueue: number[] = [];
  private pendingCurrent: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();

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

    // Make spaces visible immediately
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    for (const ch of this.canvas.getNonSpaceCharacters()) {
      // Start at top edge of canvas (matches Python canvas.top)
      ch.motion.setCoordinate({ column: ch.inputCoord.column, row: dims.top });

      // Fall path to input position — speed is per-character in Python (random in range);
      // TS uses a fixed scalar (intentional simplification)
      const path = ch.motion.newPath("fall", this.config.fallSpeed, this.config.fallEasing);
      path.addWaypoint(ch.inputCoord);

      // Rain scene: single randomly chosen symbol with a random rain color (matches Python)
      const raindropColor = this.config.rainColors[Math.floor(Math.random() * this.config.rainColors.length)];
      const rainScene = ch.newScene("rain");
      rainScene.addFrame(
        this.config.rainSymbols[Math.floor(Math.random() * this.config.rainSymbols.length)],
        1,
        raindropColor.rgbHex,
      );
      ch.activateScene(rainScene);

      // Fade scene: raindrop color → final color with 7 gradient steps (matches Python steps=7)
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const fadeScene = ch.newScene("fade");
      const fadeGradient = new Gradient([raindropColor, finalColor], 7);
      fadeScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, fadeGradient);

      // Activate fade scene on PATH_COMPLETE (matches Python event handler pattern)
      ch.eventHandler.register("PATH_COMPLETE", "fall", "ACTIVATE_SCENE", "fade");

      // Group by row (ascending = bottom row has lowest row number)
      const row = ch.inputCoord.row;
      if (!this.pendingByRow.has(row)) this.pendingByRow.set(row, []);
      this.pendingByRow.get(row)?.push(ch);
    }

    // Sort row keys ascending (bottom = row 1 first, matching Python min(group_by_row.keys()))
    this.pendingRowQueue = [...this.pendingByRow.keys()].sort((a, b) => a - b);
  }

  step(): boolean {
    if (this.pendingRowQueue.length === 0 && this.pendingCurrent.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Load next row's characters into pendingCurrent when exhausted
    if (this.pendingCurrent.length === 0 && this.pendingRowQueue.length > 0) {
      const nextRow = this.pendingRowQueue.shift();
      if (nextRow === undefined) return false;
      this.pendingCurrent = this.pendingByRow.get(nextRow) ?? [];
      this.pendingByRow.delete(nextRow);
    }

    // Release up to charsPerTick characters (randomly chosen within current row batch)
    let released = 0;
    while (this.pendingCurrent.length > 0 && released < this.config.charsPerTick) {
      const idx = Math.floor(Math.random() * this.pendingCurrent.length);
      const ch = this.pendingCurrent.splice(idx, 1)[0];
      ch.isVisible = true;
      ch.motion.activatePath("fall");
      this.activeChars.add(ch);
      released++;
    }

    // Tick all active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingRowQueue.length > 0 || this.pendingCurrent.length > 0 || this.activeChars.size > 0;
  }
}
