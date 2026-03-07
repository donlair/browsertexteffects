import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { inOutSine } from "../easing";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export type WaveDirection =
  | "column_left_to_right"
  | "column_right_to_left"
  | "row_top_to_bottom"
  | "row_bottom_to_top"
  | "center_to_outside"
  | "outside_to_center";

export interface WavesConfig {
  waveSymbols: string[];
  waveCount: number;
  waveFrameDuration: number;
  waveDirection: WaveDirection;
  waveGradientStops: Color[];
  waveGradientSteps: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  waveEasing: EasingFunction;
  finalGradientDirection: GradientDirection;
}

export const defaultWavesConfig: WavesConfig = {
  waveSymbols: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"],
  waveCount: 7,
  waveFrameDuration: 2,
  waveDirection: "column_left_to_right",
  waveGradientStops: [color("f0ff65"), color("ffb102"), color("31a0d4"), color("ffb102"), color("f0ff65")],
  waveGradientSteps: 6,
  finalGradientStops: [color("ffb102"), color("31a0d4"), color("f0ff65")],
  finalGradientSteps: 12,
  waveEasing: inOutSine,
  finalGradientDirection: "diagonal",
};

export class WavesEffect {
  private canvas: Canvas;
  private config: WavesConfig;
  private pendingGroups: EffectCharacter[][] = [];
  private activeChars: Set<EffectCharacter> = new Set();

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

    // Build scenes for ALL characters first (matches Python build order)
    for (const ch of this.canvas.getCharacters()) {
      // Wave scene: repeat wave symbols waveCount times
      const waveScene = ch.newScene("wave", false, { ease: this.config.waveEasing });
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
      const charGradient = new Gradient([lastWaveColor, finalColor], this.config.finalGradientSteps);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 10, charGradient);

      // Chain: wave complete → activate final
      ch.eventHandler.register("SCENE_COMPLETE", "wave", "ACTIVATE_SCENE", "final");

      // Activate wave scene immediately (matches Python)
      ch.activateScene("wave");
    }

    // Group by direction (after scene setup, matching Python order)
    const directionGroupingMap: Record<WaveDirection, Parameters<typeof this.canvas.getCharactersGrouped>[0]> = {
      column_left_to_right: "column",
      column_right_to_left: "columnRightToLeft",
      row_top_to_bottom: "row",
      row_bottom_to_top: "rowBottomToTop",
      center_to_outside: "centerToOutside",
      outside_to_center: "outsideToCenter",
    };
    this.pendingGroups = this.canvas.getCharactersGrouped(
      directionGroupingMap[this.config.waveDirection],
      { includeSpaces: true },
    );
  }

  step(): boolean {
    if (this.pendingGroups.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Release next group (one per frame, matching Python)
    if (this.pendingGroups.length > 0) {
      const group = this.pendingGroups.shift()!;
      for (const ch of group) {
        ch.isVisible = true;
        this.activeChars.add(ch);
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
