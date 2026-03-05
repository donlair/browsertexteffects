import { type Color, type GradientDirection, color } from "../types";
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
  gap: number;
  waveGradientStops: Color[];
  waveGradientSteps: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultWavesConfig: WavesConfig = {
  waveSymbols: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"],
  waveCount: 7,
  waveFrameDuration: 2,
  waveDirection: "column_left_to_right",
  gap: 0,
  waveGradientStops: [color("f0ff65"), color("ffb102"), color("31a0d4"), color("ffb102"), color("f0ff65")],
  waveGradientSteps: 6,
  finalGradientStops: [color("ffb102"), color("31a0d4"), color("f0ff65")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
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
    const directionGroupingMap: Record<WaveDirection, Parameters<typeof this.canvas.getCharactersGrouped>[0]> = {
      column_left_to_right: "column",
      column_right_to_left: "columnRightToLeft",
      row_top_to_bottom: "row",
      row_bottom_to_top: "rowBottomToTop",
      center_to_outside: "centerToOutside",
      outside_to_center: "outsideToCenter",
    };
    const groups = this.canvas.getCharactersGrouped(
      directionGroupingMap[this.config.waveDirection],
      { includeSpaces: false },
    );

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
        // Python: for step in Gradient(lastColor, finalColor, steps=finalGradientSteps): add_frame(symbol, 10)
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const finalScene = ch.newScene("final");
        const lastWaveColor = waveGradient.spectrum[waveGradient.spectrum.length - 1];
        const charGradient = new Gradient([lastWaveColor, finalColor], this.config.finalGradientSteps);
        finalScene.applyGradientToSymbols(ch.inputSymbol, 10, charGradient);

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
        const group = this.pendingGroups.shift();
        if (!group) return;
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
