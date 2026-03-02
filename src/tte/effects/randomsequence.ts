import { Color, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";

export interface RandomSequenceConfig {
  startingColor: Color;
  speed: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultRandomSequenceConfig: RandomSequenceConfig = {
  startingColor: color("000000"),
  speed: 0.007,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "vertical",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class RandomSequenceEffect {
  private canvas: Canvas;
  private config: RandomSequenceConfig;
  private pending: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private charsPerTick: number;

  constructor(canvas: Canvas, config: RandomSequenceConfig) {
    this.canvas = canvas;
    this.config = config;
    this.charsPerTick = 1;
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

    const animChars = this.canvas.getNonSpaceCharacters();
    this.charsPerTick = Math.max(Math.floor(this.config.speed * animChars.length), 1);

    for (const ch of animChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.startingColor, finalColor], 7);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
    }

    this.pending = shuffle(animChars);
  }

  step(): boolean {
    if (this.pending.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    for (let i = 0; i < this.charsPerTick && this.pending.length > 0; i++) {
      const ch = this.pending.pop()!;
      ch.isVisible = true;
      ch.activateScene("gradient");
      this.activeChars.add(ch);
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pending.length > 0 || this.activeChars.size > 0;
  }
}
