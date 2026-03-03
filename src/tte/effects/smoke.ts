import { Color, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { ParticleSystem } from "../particles";

export interface SmokeConfig {
  smokeColors: Color[];
  particlesPerChar: number;
  smokeTTL: number;
  smokeRiseSpeed: number;
  smokeDriftRange: number;
  dissolveDelay: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSmokeConfig: SmokeConfig = {
  smokeColors: [color("8c8c8c"), color("aaaaaa"), color("c8c8c8"), color("e6e6e6")],
  particlesPerChar: 4,
  smokeTTL: 28,
  smokeRiseSpeed: 0.14,
  smokeDriftRange: 1,
  dissolveDelay: 2,
  finalGradientStops: [color("ffffff"), color("8c8c8c")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "vertical",
};

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class SmokeEffect {
  private canvas: Canvas;
  private config: SmokeConfig;
  private ps: ParticleSystem;
  private queue: EffectCharacter[] = [];
  private dissolving: Set<EffectCharacter> = new Set();
  private dissolved: Set<EffectCharacter> = new Set();
  private restoring: Set<EffectCharacter> = new Set();
  private restoreStarted = false;
  private frameCount = 0;
  private nextReleaseFrame = 0;
  private colorMapping: Map<string, Color> = new Map();

  constructor(canvas: Canvas, config: SmokeConfig, container: HTMLElement) {
    this.canvas = canvas;
    this.config = config;
    this.ps = new ParticleSystem(container, canvas.dims);
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    const chars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(chars);
    this.queue = chars;

    const smokeHexes = config.smokeColors.map(c => c.rgbHex);

    for (const ch of chars) {
      ch.isVisible = true;

      // Dissolve: character fades through smoke symbols to space
      const dissolveScene = ch.newScene("dissolve");
      dissolveScene.addFrame(ch.inputSymbol, 4, smokeHexes[0]);
      dissolveScene.addFrame("▓", 3, smokeHexes[0]);
      dissolveScene.addFrame("▒", 3, smokeHexes[1] ?? smokeHexes[0]);
      dissolveScene.addFrame("░", 3, smokeHexes[2] ?? smokeHexes[0]);
      dissolveScene.addFrame("·", 3, smokeHexes[smokeHexes.length - 1]);
      dissolveScene.addFrame(".", 3, smokeHexes[smokeHexes.length - 1]);
      dissolveScene.addFrame(" ", 1, null);

      ch.eventHandler.register("SCENE_COMPLETE", "dissolve", "CALLBACK", {
        callback: (char: EffectCharacter) => {
          this.dissolved.add(char);
          this.dissolving.delete(char);
        },
        args: [],
      });

      // Restore: smoke color → final gradient color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const restoreGrad = new Gradient(
        [config.smokeColors[config.smokeColors.length - 1], finalColor],
        config.finalGradientFrames,
      );
      const restoreScene = ch.newScene("restore");
      restoreScene.applyGradientToSymbols(ch.inputSymbol, 1, restoreGrad);
    }
  }

  private spawnParticles(ch: EffectCharacter): void {
    const { config } = this;
    const smokeSymbols = ["▓", "▒", "░", "·", "."];

    for (let i = 0; i < config.particlesPerChar; i++) {
      const smokeColor = config.smokeColors[
        Math.floor(Math.random() * config.smokeColors.length)
      ];
      const symbol = smokeSymbols[i % smokeSymbols.length];
      const riseHeight = 3 + Math.floor(Math.random() * 3);
      const driftOffset = Math.round((Math.random() * 2 - 1) * config.smokeDriftRange);

      const pChar = this.ps.emit({
        symbol,
        coord: { ...ch.inputCoord },
        fgColor: smokeColor.rgbHex,
        ttl: config.smokeTTL,
      });

      const risePath = pChar.motion.newPath("rise", config.smokeRiseSpeed);
      risePath.addWaypoint({
        column: Math.max(1, ch.inputCoord.column + driftOffset),
        row: ch.inputCoord.row + riseHeight,
      });
      pChar.motion.activatePath("rise");
    }
  }

  step(): boolean {
    this.frameCount++;

    // Staggered release: one char per dissolveDelay frames
    if (this.queue.length > 0 && this.frameCount >= this.nextReleaseFrame) {
      const ch = this.queue.shift()!;
      ch.activateScene("dissolve");
      this.dissolving.add(ch);
      this.nextReleaseFrame = this.frameCount + this.config.dissolveDelay;
    }

    for (const ch of this.dissolving) {
      ch.tick();
    }

    // Snapshot to avoid mutation while iterating
    for (const ch of [...this.dissolved]) {
      this.dissolved.delete(ch);
      ch.currentVisual = { symbol: " ", fgColor: null };
      this.spawnParticles(ch);
    }

    this.ps.tick();

    // Once all dissolved and particles are gone, restore all chars
    if (
      !this.restoreStarted &&
      this.queue.length === 0 &&
      this.dissolving.size === 0 &&
      this.dissolved.size === 0 &&
      this.ps.count === 0
    ) {
      this.restoreStarted = true;
      for (const ch of this.canvas.getNonSpaceCharacters()) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: null };
        ch.activateScene("restore");
        this.restoring.add(ch);
      }
    }

    for (const ch of [...this.restoring]) {
      ch.tick();
      if (!ch.isActive) {
        this.restoring.delete(ch);
      }
    }

    if (this.restoreStarted && this.restoring.size === 0) {
      return false;
    }

    return true;
  }
}
