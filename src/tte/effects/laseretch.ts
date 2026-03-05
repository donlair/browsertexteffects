import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { buildSpanningTree } from "../graph";
import { ParticleSystem } from "../particles";
import { outSine } from "../easing";

export interface LaserEtchConfig {
  etchSpeed: number;
  etchDelay: number;
  beamSymbols: string[];
  beamGradientStops: Color[];
  beamGradientSteps: number;
  beamFrameDuration: number;
  searSymbols: string[];
  searColors: Color[];
  searFrameDuration: number;
  sparkSymbols: string[];
  sparkGradientStops: Color[];
  sparkCoolingFrames: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultLaserEtchConfig: LaserEtchConfig = {
  etchSpeed: 1,
  etchDelay: 1,
  beamSymbols: ["/", "//", "▓"],
  beamGradientStops: [color("ffffff"), color("376cff")],
  beamGradientSteps: 6,
  beamFrameDuration: 2,
  searSymbols: ["▓", "▒", "░", "█"],
  searColors: [color("ffe680"), color("ff7b00"), color("8A003C"), color("510100")],
  searFrameDuration: 3,
  sparkSymbols: ["*", "·", "."],
  sparkGradientStops: [color("ffffff"), color("ffe680"), color("ff7b00"), color("1a0900")],
  sparkCoolingFrames: 7,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 8,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical",
};

export class LaserEtchEffect {
  private canvas: Canvas;
  private config: LaserEtchConfig;
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private particles: ParticleSystem;
  private frameCount: number;

  constructor(canvas: Canvas, config: LaserEtchConfig, container: HTMLElement) {
    this.canvas = canvas;
    this.config = config;
    // Initialize to etchDelay so the first step() call activates immediately (matches Python)
    this.frameCount = config.etchDelay;
    this.particles = new ParticleSystem(container, canvas.dims);
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    const beamGradient = new Gradient(config.beamGradientStops, config.beamGradientSteps);
    const searGradient = new Gradient(config.searColors, config.searColors.length);

    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }

    const nonSpace = this.canvas.getNonSpaceCharacters();

    for (const ch of nonSpace) {
      const beamScene = ch.newScene("beam");
      beamScene.applyGradientToSymbols(config.beamSymbols, config.beamFrameDuration, beamGradient);

      const searScene = ch.newScene("sear");
      searScene.applyGradientToSymbols(config.searSymbols, config.searFrameDuration, searGradient);

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const lastSearColor = config.searColors[config.searColors.length - 1];
      const charGradient = new Gradient([lastSearColor, finalColor], config.finalGradientSteps);
      const finalScene = ch.newScene("final");
      finalScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, charGradient);

      ch.eventHandler.register("SCENE_COMPLETE", "beam", "ACTIVATE_SCENE", "sear");
      ch.eventHandler.register("SCENE_COMPLETE", "sear", "ACTIVATE_SCENE", "final");
    }

    // Python's laseretch uses RecursiveBacktracker starting from a random char within text boundary.
    this.pendingChars = buildSpanningTree(nonSpace, { startStrategy: "random" });
  }

  private emitSpark(ch: EffectCharacter): void {
    const { config } = this;
    const sym = config.sparkSymbols[Math.floor(Math.random() * config.sparkSymbols.length)];
    // Simplified from Python: we pick a random stop rather than cycling through a gradient per spark
    const sparkColor = config.sparkGradientStops[Math.floor(Math.random() * config.sparkGradientStops.length)];

    const pChar = this.particles.emit({
      symbol: sym,
      coord: { column: ch.inputCoord.column, row: ch.inputCoord.row },
      fgColor: sparkColor.rgbHex,
      ttl: config.sparkCoolingFrames,
    });

    const fallPath = pChar.motion.newPath("fall", { speed: 0.4, ease: outSine });
    fallPath.addWaypoint({ column: ch.inputCoord.column + 2, row: ch.inputCoord.row - 1 });
    pChar.motion.activatePath("fall");
  }

  step(): boolean {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0 && this.particles.count === 0) {
      return false;
    }

    this.frameCount++;
    // etchDelay=N means wait N frames between activations (period = N+1), matching Python semantics
    if (this.frameCount > this.config.etchDelay) {
      this.frameCount = 0;
      for (let i = 0; i < this.config.etchSpeed; i++) {
        if (this.pendingChars.length > 0) {
          const ch = this.pendingChars.shift();
          if (!ch) break;
          ch.isVisible = true;
          ch.activateScene("beam");
          this.activeChars.add(ch);
          this.emitSpark(ch);
        }
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    this.particles.tick();

    return true;
  }
}
