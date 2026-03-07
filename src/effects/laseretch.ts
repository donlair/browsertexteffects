import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { buildSpanningTreeDFS } from "../graph";
import { outSine } from "../easing";

export interface LaserEtchConfig {
  etchSpeed: number;
  etchDelay: number;
  beamGradientStops: Color[];
  beamGradientSteps: number;
  beamFrameDuration: number;
  sparkSymbols: string[];
  sparkGradientStops: Color[];
  sparkCoolingFrames: number;
  coolGradientStops: Color[];
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultLaserEtchConfig: LaserEtchConfig = {
  etchSpeed: 1,
  etchDelay: 1,
  beamGradientStops: [color("ffffff"), color("376cff")],
  beamGradientSteps: 6,
  beamFrameDuration: 3,
  sparkSymbols: [".", ",", "*"],
  sparkGradientStops: [color("ffffff"), color("ffe680"), color("ff7b00"), color("1a0900")],
  sparkCoolingFrames: 7,
  coolGradientStops: [color("ffe680"), color("ff7b00")],
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 8,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical",
};

let nextLaserId = 900000;

const SPARK_POOL_SIZE = 2000;

class Laser {
  beamChars: EffectCharacter[] = [];
  isHidden = false;

  constructor(canvas: Canvas, config: LaserEtchConfig) {
    const beamGradient = new Gradient(config.beamGradientStops, config.beamGradientSteps, true);
    const beamLength = canvas.dims.top + 1;

    for (let i = 0; i < beamLength; i++) {
      const id = nextLaserId++;
      const sym = i === 0 ? "*" : "/";
      const ch = new EffectCharacter(id, sym, 0, 0);
      ch.isVisible = false;
      ch.layer = 2;

      // Looping scene with cascading gradient phase per beam character
      const scene = ch.newScene("laser", true);
      const spectrum = beamGradient.spectrum;
      for (let f = 0; f < spectrum.length; f++) {
        const colorIdx = (f + i) % spectrum.length;
        scene.addFrame(sym, config.beamFrameDuration, spectrum[colorIdx].rgbHex);
      }

      canvas.characters.push(ch);
      this.beamChars.push(ch);
    }
  }

  reposition(target: Coord): void {
    for (let i = 0; i < this.beamChars.length; i++) {
      const ch = this.beamChars[i];
      ch.motion.setCoordinate({
        column: target.column + i,
        row: target.row + i,
      });
      if (!ch.isVisible) {
        ch.isVisible = true;
        ch.activateScene("laser");
      }
    }
  }

  hide(): void {
    this.isHidden = true;
    for (const ch of this.beamChars) {
      ch.isVisible = false;
      ch.activeScene = null;
    }
  }

  tick(): void {
    if (this.isHidden) return;
    for (const ch of this.beamChars) {
      if (ch.isVisible) {
        ch.tick();
      }
    }
  }
}

export class LaserEtchEffect {
  private canvas: Canvas;
  private config: LaserEtchConfig;
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private frameCount: number;
  private laser: Laser;

  // Spark pool
  private sparkPool: EffectCharacter[] = [];
  private sparkIndex = 0;
  private activeSparks: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: LaserEtchConfig) {
    this.canvas = canvas;
    this.config = config;
    // Initialize to etchDelay so the first step() call activates immediately (matches Python)
    this.frameCount = config.etchDelay;
    this.laser = new Laser(canvas, config);
    this.buildSparkPool();
    this.build();
  }

  private buildSparkPool(): void {
    const { config, canvas } = this;
    const sparkGradient = new Gradient(config.sparkGradientStops, [3, 8]);

    for (let i = 0; i < SPARK_POOL_SIZE; i++) {
      const id = nextLaserId++;
      const sym = config.sparkSymbols[Math.floor(Math.random() * config.sparkSymbols.length)];
      const ch = new EffectCharacter(id, sym, 0, 0);
      ch.isVisible = false;
      ch.layer = 2;

      const scene = ch.newScene("spark");
      for (const c of sparkGradient.spectrum) {
        scene.addFrame(ch.inputSymbol, config.sparkCoolingFrames, c.rgbHex);
      }

      // On scene complete, hide the spark
      ch.eventHandler.register("SCENE_COMPLETE", "spark", "CALLBACK", {
        callback: (c: EffectCharacter) => {
          c.isVisible = false;
          this.activeSparks.delete(c);
        },
        args: [],
      });

      canvas.characters.push(ch);
      this.sparkPool.push(ch);
    }
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    for (const ch of this.canvas.getCharacters()) {
      // Skip laser beam chars and spark pool chars (they manage their own visibility)
      if (ch.layer === 2) continue;
      ch.isVisible = false;
    }

    const nonSpace = this.canvas.getNonSpaceCharacters();

    for (const ch of nonSpace) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const coolGrad = new Gradient([...config.coolGradientStops, finalColor], 8);

      const spawnScene = ch.newScene("spawn");
      spawnScene.addFrame("^", 3, "ffe680");
      for (const c of coolGrad.spectrum) {
        spawnScene.addFrame(ch.inputSymbol, 3, c.rgbHex);
      }
    }

    // Python's RecursiveBacktracker traverses ALL chars (including spaces) for 4-connectivity,
    // so DFS can cross blank lines through space positions. Then filter to non-space for etching.
    const allChars = this.canvas.getCharacters().filter(ch => ch.layer !== 2);
    this.pendingChars = buildSpanningTreeDFS(allChars, {
      startStrategy: "random",
      connectivity: 4,
    }).filter(ch => !ch.isSpace);
  }

  private emitSparks(coord: Coord): void {
    const { canvas } = this;
    const sparkCount = 1;
    for (let i = 0; i < sparkCount; i++) {
      const spark = this.sparkPool[this.sparkIndex % SPARK_POOL_SIZE];
      this.sparkIndex++;

      // If spark is still active, deactivate it first
      if (spark.isVisible) {
        spark.isVisible = false;
        this.activeSparks.delete(spark);
      }

      // Teleport spark to laser position
      spark.motion.setCoordinate({ column: coord.column, row: coord.row });

      // Reset any active path
      spark.motion.activePath = null;

      // Create fall path with bezier curve
      const fallColumn = coord.column + Math.floor(Math.random() * 41) - 20;
      const fallPath = spark.motion.newPath("fall", { speed: 0.3, ease: outSine });
      const bezierControl: Coord = {
        column: fallColumn,
        row: coord.row + Math.floor(Math.random() * 31) - 10,
      };
      fallPath.addWaypoint({ column: fallColumn, row: canvas.dims.bottom }, bezierControl);

      spark.isVisible = true;
      spark.activateScene("spark");
      spark.motion.activatePath("fall");
      this.activeSparks.add(spark);
    }
  }

  step(): boolean {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0 && this.activeSparks.size === 0) {
      this.laser.hide();
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
          ch.activateScene("spawn");
          this.activeChars.add(ch);

          // Move laser beam to this character and emit sparks
          this.laser.reposition(ch.inputCoord);
          this.emitSparks(ch.inputCoord);
        }
      }
    }

    // Hide beam when all characters have been activated (checked every frame, matching Python)
    if (this.pendingChars.length === 0) {
      this.laser.hide();
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    // Tick laser beam
    this.laser.tick();

    // Tick active sparks
    for (const spark of this.activeSparks) {
      spark.tick();
    }

    return true;
  }
}
