import { Color, EasingFunction, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { ParticleSystem } from "../particles";
import { inQuad } from "../easing";

export interface ThunderstormConfig {
  rainSymbols: string[];
  rainColor: Color;
  lightningColor: Color;
  lightningBolts: number;
  boltColumnSpread: number;
  boltDelay: number;
  charsPerTick: number;
  fallSpeed: number;
  fallEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultThunderstormConfig: ThunderstormConfig = {
  rainSymbols: ["|", ".", ",", "~"],
  rainColor: color("4488bb"),
  lightningColor: color("ffffaa"),
  lightningBolts: 3,
  boltColumnSpread: 3,
  boltDelay: 80,
  charsPerTick: 3,
  fallSpeed: 0.4,
  fallEasing: inQuad,
  finalGradientStops: [color("5588ff"), color("aaddff"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 10,
  finalGradientDirection: "diagonal",
};

interface BoltInfo {
  ch: EffectCharacter;
  remaining: number;
}

export class ThunderstormEffect {
  private canvas: Canvas;
  private config: ThunderstormConfig;
  private particles: ParticleSystem;
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private fallingChars: Set<EffectCharacter> = new Set();
  private landedChars: Set<EffectCharacter> = new Set();
  private flashingChars: Set<EffectCharacter> = new Set();
  private boltQueue: number[] = [];
  private activeBolts: BoltInfo[] = [];
  private frameCount = 0;
  private nextBoltFrame = 0;
  private settleStarted = false;
  private boltCounter = 0;

  constructor(canvas: Canvas, config: ThunderstormConfig, container: HTMLElement) {
    this.canvas = canvas;
    this.config = config;
    this.particles = new ParticleSystem(container, canvas.dims);
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
      if (ch.isSpace) { ch.isVisible = true; continue; }

      // Rain scene (looping)
      const rainScene = ch.newScene("rain", true);
      for (const sym of this.config.rainSymbols) {
        rainScene.addFrame(sym, 4, this.config.rainColor.rgbHex);
      }

      // Flash scene (non-looping)
      const flashScene = ch.newScene("flash");
      flashScene.addFrame("*", 2, "ffffff");
      flashScene.addFrame(ch.inputSymbol, 2, "ffffcc");
      flashScene.addFrame(ch.inputSymbol, 2, this.config.lightningColor.rgbHex);
      flashScene.addFrame(ch.inputSymbol, 2, this.config.rainColor.rgbHex);

      // Fade scene (non-looping)
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) ?? this.config.finalGradientStops.at(-1)!;
      const fadeScene = ch.newScene("fade");
      const fadeGrad = new Gradient([this.config.rainColor, finalColor], this.config.finalGradientFrames);
      fadeScene.applyGradientToSymbols(ch.inputSymbol, 1, fadeGrad);

      // Fall path: start above canvas, fall to input coord
      ch.motion.setCoordinate({ column: ch.inputCoord.column, row: dims.top + 1 });
      const path = ch.motion.newPath(`fall_${ch.id}`, this.config.fallSpeed, this.config.fallEasing);
      path.addWaypoint(ch.inputCoord);

      // Flash → rain/fade transition via callback
      ch.eventHandler.register("SCENE_COMPLETE", "flash", "CALLBACK", {
        callback: () => {
          this.flashingChars.delete(ch);
          if (this.settleStarted) {
            ch.activateScene("fade");
          } else {
            ch.activateScene("rain");
          }
        },
        args: [],
      });
    }

    const nonSpace = this.canvas.getNonSpaceCharacters();
    this.pendingChars = shuffle(nonSpace);

    const { left, right } = dims;
    for (let i = 0; i < this.config.lightningBolts; i++) {
      this.boltQueue.push(randInt(left + 1, right - 1));
    }
    this.nextBoltFrame = this.config.boltDelay;
  }

  private spawnBolt(column: number): void {
    const { dims } = this.canvas;
    const id = this.boltCounter++;

    const boltCh = this.particles.emit({
      symbol: "|",
      coord: { column, row: dims.top + 1 },
      fgColor: this.config.lightningColor.rgbHex,
      ttl: 40,
    });

    const pathId = `bolt_${id}`;
    const boltPath = boltCh.motion.newPath(pathId, 2.0);
    const rowSpan = dims.top - dims.bottom;
    for (let z = 1; z <= 4; z++) {
      const row = dims.top - Math.round((z / 4) * rowSpan);
      const jitter = (z % 2 === 0 ? 1 : -1) * randInt(1, 2);
      boltPath.addWaypoint({ column: column + jitter, row });
    }
    boltCh.motion.activatePath(pathId);

    this.activeBolts.push({ ch: boltCh, remaining: 40 });
  }

  step(): boolean {
    this.frameCount++;

    // Release rain chars
    let released = 0;
    while (this.pendingChars.length > 0 && released < this.config.charsPerTick) {
      const ch = this.pendingChars.pop()!;
      ch.isVisible = true;
      ch.motion.setCoordinate({ column: ch.inputCoord.column, row: this.canvas.dims.top + 1 });
      ch.activateScene("rain");
      ch.motion.activatePath(`fall_${ch.id}`);
      this.activeChars.add(ch);
      this.fallingChars.add(ch);
      released++;
    }

    // Spawn next bolt
    if (this.boltQueue.length > 0 && this.frameCount >= this.nextBoltFrame) {
      this.spawnBolt(this.boltQueue.pop()!);
      this.nextBoltFrame = this.frameCount + this.config.boltDelay + randInt(-20, 20);
    }

    // Tick active chars
    for (const ch of [...this.activeChars]) {
      ch.tick();

      if (this.fallingChars.has(ch) && ch.motion.movementIsComplete()) {
        this.fallingChars.delete(ch);
        this.landedChars.add(ch);
      }

      if (!ch.isActive) this.activeChars.delete(ch);
    }

    // Tick bolt particles + check flash proximity
    this.particles.tick();
    for (const bolt of this.activeBolts) {
      bolt.remaining--;
      if (bolt.remaining <= 0) continue;

      const boltCol = bolt.ch.motion.currentCoord.column;

      for (const landedCh of this.landedChars) {
        if (this.flashingChars.has(landedCh)) continue;
        if (Math.abs(landedCh.inputCoord.column - boltCol) <= this.config.boltColumnSpread) {
          landedCh.activateScene("flash");
          this.flashingChars.add(landedCh);
          this.activeChars.add(landedCh);
        }
      }
    }
    this.activeBolts = this.activeBolts.filter(b => b.remaining > 0);

    // Check settle
    const allLanded = this.pendingChars.length === 0 && this.fallingChars.size === 0;
    const allBoltsDone = this.boltQueue.length === 0 && this.activeBolts.length === 0;
    if (allLanded && allBoltsDone && !this.settleStarted) {
      this.settleStarted = true;
      for (const ch of this.landedChars) {
        if (!this.flashingChars.has(ch)) {
          ch.activateScene("fade");
          this.activeChars.add(ch);
        }
      }
      this.landedChars.clear();
    }

    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
