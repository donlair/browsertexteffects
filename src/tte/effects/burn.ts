import { type Color, type GradientDirection, color } from "../types";
import type { Coord } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { buildSpanningTreeSimple } from "../graph";

export interface BurnConfig {
  burnSymbols: string[];
  burnFrameDuration: number;
  burnColors: Color[];
  startingColor: Color;
  smokeChance: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBurnConfig: BurnConfig = {
  burnSymbols: ["'", ".", "▖", "▙", "█", "▜", "▀", "▝", "."],
  burnFrameDuration: 4,
  burnColors: [color("ffffff"), color("fff75d"), color("fe650d"), color("8A003C"), color("510100")],
  startingColor: color("837373"),
  smokeChance: 0.5,
  finalGradientStops: [color("00c3ff"), color("ffff1c")],
  finalGradientSteps: 12,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical",
};

const SMOKE_SYMBOLS = [".", ",", "'", "`", "#", "*"];
const SMOKE_POOL_SIZE = 2000;

export class BurnEffect {
  private canvas: Canvas;
  private config: BurnConfig;
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private smokeParticles: EffectCharacter[] = [];
  private smokeParticleIds: Set<number> = new Set();
  private smokeIndex = 0;
  private pendingSmoke: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: BurnConfig) {
    this.canvas = canvas;
    this.config = config;
    this.makeSmoke();
    this.build();
  }

  private makeSmoke(): void {
    const smokeGradient = new Gradient([color("504F4F"), color("C7C7C7")], 9);
    const smokeColors = smokeGradient.spectrum;
    let nextId = this.canvas.characters.length > 0
      ? Math.max(...this.canvas.characters.map((c) => c.id)) + 1
      : 0;

    for (let i = 0; i < SMOKE_POOL_SIZE; i++) {
      const symbol = SMOKE_SYMBOLS[Math.floor(Math.random() * SMOKE_SYMBOLS.length)];
      const ch = new EffectCharacter(nextId++, symbol, 0, 0);
      ch.layer = 2;

      const smokeScene = ch.newScene("smoke");
      for (const c of smokeColors) {
        smokeScene.addFrame(ch.inputSymbol, 10, c.rgbHex);
      }

      // On smoke scene complete, hide particle
      ch.eventHandler.register("SCENE_COMPLETE", "smoke", "CALLBACK", {
        callback: (c: EffectCharacter) => { c.isVisible = false; },
        args: [],
      });

      this.smokeParticles.push(ch);
      this.smokeParticleIds.add(ch.id);
      this.canvas.characters.push(ch);
    }
  }

  private emitSmoke(origin: Coord): void {
    if (Math.random() > this.config.smokeChance) return;

    const particle = this.smokeParticles[this.smokeIndex];
    this.smokeIndex = (this.smokeIndex + 1) % this.smokeParticles.length;

    particle.motion.setCoordinate(origin);

    // Reset smoke scene if it was playing
    const smokeScene = particle.scenes.get("smoke");
    if (smokeScene) smokeScene.reset();

    particle.isVisible = true;

    const smokePath = particle.motion.newPath("smoke_rise", { speed: 0.5 });
    const riseCol = origin.column + Math.floor(Math.random() * 9) - 4;
    const riseRow = this.canvas.dims.top + 1;
    smokePath.addWaypoint({ column: riseCol, row: riseRow });
    particle.motion.activatePath("smoke_rise");
    particle.activateScene("smoke");
    this.pendingSmoke.add(particle);
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );
    const fireGradient = new Gradient(this.config.burnColors, 10);

    // All characters (including spaces) get visibility, scenes, and events — matches Python
    const allChars = this.canvas.getCharacters().filter((ch) => !this.smokeParticleIds.has(ch.id));

    for (const ch of allChars) {
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.config.startingColor.rgbHex };

      // Burn scene: block chars in fire gradient colors
      const burnScene = ch.newScene("burn");
      burnScene.applyGradientToSymbols(
        this.config.burnSymbols,
        this.config.burnFrameDuration,
        fireGradient,
      );

      // Final scene: transition from last burn color to mapped final color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const lastBurnColor = this.config.burnColors[this.config.burnColors.length - 1];
      const finalScene = ch.newScene("final");
      const charGradient = new Gradient([lastBurnColor, finalColor], 8);
      finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);

      // Chain: burn complete → activate final scene + emit smoke
      ch.eventHandler.register("SCENE_COMPLETE", "burn", "ACTIVATE_SCENE", "final");
      ch.eventHandler.register("SCENE_COMPLETE", "burn", "CALLBACK", {
        callback: (c: EffectCharacter) => { this.emitSmoke(c.inputCoord); },
        args: [],
      });
    }

    // Spanning tree operates on ALL characters (including spaces) — matches Python
    this.pendingChars = buildSpanningTreeSimple(allChars, { startStrategy: "random", connectivity: 4 });
  }

  step(): boolean {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Add pending smoke particles to active set
    for (const p of this.pendingSmoke) {
      this.activeChars.add(p);
    }
    this.pendingSmoke.clear();

    // Ignite chars: random 2-4 per frame, matching Python random.randint(2, 4)
    const activateCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < activateCount; i++) {
      if (this.pendingChars.length === 0) break;
      const ch = this.pendingChars.shift()!;
      // Spaces are skipped (not activated) but consume an activation slot — matches Python
      if (ch.inputSymbol === " ") continue;
      ch.activateScene("burn");
      this.activeChars.add(ch);
    }

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}
