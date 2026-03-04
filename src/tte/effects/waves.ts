import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export type WaveDirection = "left_to_right" | "right_to_left" | "top_to_bottom" | "bottom_to_top";

export interface WavesConfig {
  waveSymbols: string[];
  waveCount: number;
  waveFrameDuration: number;
  waveDirection: WaveDirection;
  gap: number;
  waveGradientStops: Color[];
  waveGradientSteps: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultWavesConfig: WavesConfig = {
  waveSymbols: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"],
  waveCount: 2,
  waveFrameDuration: 3,
  waveDirection: "left_to_right",
  gap: 1,
  waveGradientStops: [color("f0ff65"), color("ffb102"), color("31a0d4"), color("ffb102"), color("f0ff65")],
  waveGradientSteps: 6,
  finalGradientStops: [color("ffb102"), color("31a0d4"), color("f0ff65")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical",
};

export class WavesEffect {
  private canvas: Canvas;
  private config: WavesConfig;
  private pendingGroups: EffectCharacter[][] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private currentGap = 0;

  constructor(canvas: Canvas, config: WavesConfig) {
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
    const waveGradient = new Gradient(this.config.waveGradientStops, this.config.waveGradientSteps);

    // Make spaces visible
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    // Group by direction
    let groups: EffectCharacter[][];
    if (this.config.waveDirection === "left_to_right" || this.config.waveDirection === "right_to_left") {
      groups = this.canvas.getCharactersGrouped("column", { includeSpaces: false });
      if (this.config.waveDirection === "right_to_left") groups.reverse();
    } else {
      groups = this.canvas.getCharactersGrouped("row", { includeSpaces: false });
      if (this.config.waveDirection === "bottom_to_top") groups.reverse();
    }

    // Build scenes for each character
    for (const group of groups) {
      for (const ch of group) {
        // Wave scene: repeat wave symbols waveCount times
        const waveScene = ch.newScene("wave");
        for (let i = 0; i < this.config.waveCount; i++) {
          waveScene.applyGradientToSymbols(
            this.config.waveSymbols,
            this.config.waveFrameDuration,
            waveGradient,
          );
        }

        // Final scene: transition to final color
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const finalScene = ch.newScene("final");
        const lastWaveColor = waveGradient.spectrum[waveGradient.spectrum.length - 1];
        const charGradient = new Gradient([lastWaveColor, finalColor], 10);
        finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);

        // Chain: wave complete → activate final
        ch.eventHandler.register("SCENE_COMPLETE", "wave", "ACTIVATE_SCENE", "final");
      }
    }

    this.pendingGroups = groups;
  }

  step(): boolean {
    if (this.pendingGroups.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Release next group
    if (this.pendingGroups.length > 0) {
      if (this.currentGap >= this.config.gap) {
        const group = this.pendingGroups.shift()!;
        for (const ch of group) {
          ch.isVisible = true;
          ch.activateScene("wave");
          this.activeChars.add(ch);
        }
        this.currentGap = 0;
      } else {
        this.currentGap++;
      }
    }

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingGroups.length > 0 || this.activeChars.size > 0;
  }
}
