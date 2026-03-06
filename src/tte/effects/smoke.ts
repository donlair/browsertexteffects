import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { buildSpanningTreeWaves } from "../graph";

export interface SmokeConfig {
  startingColor: Color;
  smokeSymbols: string[];
  smokeGradientStops: Color[];
  /** No-op in TS: DOM renderer has no canvas fill chars concept */
  useWholeCanvas: boolean;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSmokeConfig: SmokeConfig = {
  startingColor: color("7A7A7A"),
  smokeSymbols: ["░", "▒", "▓", "▒", "░"],
  smokeGradientStops: [color("242424"), color("FFFFFF")],
  useWholeCanvas: false,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

export class SmokeEffect {
  private canvas: Canvas;
  private pendingWaves: EffectCharacter[][] = [];
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: SmokeConfig) {
    this.canvas = canvas;
    this.build(config);
  }

  private build(config: SmokeConfig): void {
    const { dims } = this.canvas;

    // Final gradient: maps each character coord to its final color
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    // Smoke gradient: smoke_gradient_stops + reversed(final_gradient_stops)
    // Matches Python: Gradient(*smoke_gradient_stops, *final_gradient_stops[::-1], steps=(3, 4))
    const smokeGradientStops: Color[] = [
      ...config.smokeGradientStops,
      ...[...config.finalGradientStops].reverse(),
    ];
    const smokeGradient = new Gradient(smokeGradientStops, [3, 4]);

    const blackFallback = color("000000");
    // Include space characters so smoke animates through them, matching Python's
    // get_characters(inner_fill_chars=True). This ensures continuous flood-fill across spaces.
    const chars = this.canvas.getCharacters();

    for (const ch of chars) {
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: config.startingColor.rgbHex };

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const charFinalColor = colorMapping.get(key) ?? blackFallback;

      // Paint gradient: final_gradient_stops + char_final_color, steps=5
      // Matches Python: Gradient(*final_gradient_stops, char_final_color, steps=5)
      const paintGradient = new Gradient([...config.finalGradientStops, charFinalColor], 5);

      const smokeScene = ch.newScene("smoke");
      smokeScene.applyGradientToSymbols(config.smokeSymbols, 3, smokeGradient);

      const paintScene = ch.newScene("paint");
      paintScene.applyGradientToSymbols([ch.inputSymbol], 5, paintGradient);

      // Chain: smoke complete → activate paint
      ch.eventHandler.register("SCENE_COMPLETE", "smoke", "ACTIVATE_SCENE", "paint");
    }

    // Build spanning tree from a random start, grouped by BFS depth level.
    // Matches Python: PrimsWeighted builds the tree, BreadthFirst advances one full depth
    // level per frame — all chars at equal distance from root activate simultaneously.
    this.pendingWaves = buildSpanningTreeWaves(chars, { startStrategy: "random" });
  }

  step(): boolean {
    if (this.pendingWaves.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Activate all chars in the next BFS depth level — matches Python BreadthFirst
    // which advances one full level per frame (explored_last_step).
    if (this.pendingWaves.length > 0) {
      const wave = this.pendingWaves.shift()!;
      for (const ch of wave) {
        ch.activateScene("smoke");
        this.activeChars.add(ch);
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingWaves.length > 0 || this.activeChars.size > 0;
  }
}
