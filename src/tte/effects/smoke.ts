import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { buildSpanningTree } from "../graph";

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
  private pendingChars: EffectCharacter[] = [];
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

    // Build spanning tree from a random start, then return characters in BFS traversal order.
    // Matches Python's smoke effect: PrimsWeighted builds the tree, BreadthFirst traverses it
    // wave-by-wave so nearby characters activate at similar times (flood-fill spread).
    this.pendingChars = buildSpanningTree(chars, { startStrategy: "random", traversal: "bfs" });
  }

  step(): boolean {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Release one character per tick, matching Python BFS one-step-per-frame
    if (this.pendingChars.length > 0) {
      const ch = this.pendingChars.shift();
      if (!ch) return false;
      ch.activateScene("smoke");
      this.activeChars.add(ch);
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}
