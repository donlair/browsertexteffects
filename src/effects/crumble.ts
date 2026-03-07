import { type Color, type GradientDirection, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { outBounce, outQuint } from "../easing";

export interface CrumbleConfig {
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultCrumbleConfig: CrumbleConfig = {
  finalGradientStops: [color("5CE1FF"), color("FF8C00")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
};

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const DUST_SYMBOLS = ["*", ".", ","];

export class CrumbleEffect {
  private canvas: Canvas;
  private config: CrumbleConfig;
  private nonSpaceChars: EffectCharacter[] = [];
  private phase: "falling" | "vacuuming" | "resetting" = "falling";
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private unvacuumedChars: EffectCharacter[] = [];

  // Falling phase timing
  private fallDelay = 12;
  private maxFallDelay = 12;
  private minFallDelay = 9;
  private fallGroupMaxsize = 1;

  // Phase entry flags
  private vacuumingStarted = false;
  private resettingStarted = false;

  constructor(canvas: Canvas, config: CrumbleConfig) {
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

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) ?? this.config.finalGradientStops[0];
      const weakColor = adjustBrightness(finalColor, 0.65);
      const dustColor = adjustBrightness(finalColor, 0.55);

      // Characters start visible at weak color (pre-fall state)
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: weakColor.rgbHex };

      // Weaken scene: gradient weak→dust over inputSymbol, 9 steps × 4 frames each
      const weakenGradient = new Gradient([weakColor, dustColor], 9);
      const weakenScn = ch.newScene("weaken");
      weakenScn.applyGradientToSymbols(ch.inputSymbol, 4, weakenGradient);

      // Dust scene (looping): random dust symbols at dustColor — approximates Python's SyncMetric.DISTANCE
      const dustScn = ch.newScene("dust", true);
      for (let i = 0; i < 5; i++) {
        dustScn.addFrame(DUST_SYMBOLS[i % DUST_SYMBOLS.length], 1, dustColor.rgbHex);
      }

      // Fall path: drop to canvas bottom with bounce
      const fallPath = ch.motion.newPath("fall", 0.65, outBounce);
      fallPath.addWaypoint({ column: ch.inputCoord.column, row: dims.bottom });

      // Top path: arc up via midpoint toward canvas center (approximates Python's bezier_control at center).
      // The via-waypoint is halfway between the character's column and canvas center at mid-height,
      // producing a gentle inward arc rather than forcing all chars to converge at one point.
      const viaCol = Math.round(ch.inputCoord.column + (dims.centerColumn - ch.inputCoord.column) * 0.5);
      const topPath = ch.motion.newPath("top", 1.0, outQuint);
      topPath.addWaypoint({ column: viaCol, row: dims.centerRow });
      topPath.addWaypoint({ column: ch.inputCoord.column, row: dims.top });

      // Input path: return to original position
      const inputPath = ch.motion.newPath("input", 1.0);
      inputPath.addWaypoint(ch.inputCoord);

      // Strengthen flash scene: finalColor→white, 6 steps × 4 frames
      const flashGradient = new Gradient([finalColor, color("ffffff")], 6);
      const flashScn = ch.newScene("flash");
      flashScn.applyGradientToSymbols(ch.inputSymbol, 4, flashGradient);

      // Strengthen scene: white→finalColor, 9 steps × 4 frames
      const strengthenGradient = new Gradient([color("ffffff"), finalColor], 9);
      const strengthenScn = ch.newScene("strengthen");
      strengthenScn.applyGradientToSymbols(ch.inputSymbol, 4, strengthenGradient);

      // Events: weaken complete → activate fall path + dust scene + elevate layer
      ch.eventHandler.register("SCENE_COMPLETE", "weaken", "ACTIVATE_PATH", "fall");
      ch.eventHandler.register("SCENE_COMPLETE", "weaken", "SET_LAYER", 1);
      ch.eventHandler.register("SCENE_COMPLETE", "weaken", "ACTIVATE_SCENE", "dust");

      // Events: input path complete → activate flash scene → strengthen scene
      ch.eventHandler.register("PATH_COMPLETE", "input", "ACTIVATE_SCENE", "flash");
      ch.eventHandler.register("SCENE_COMPLETE", "flash", "ACTIVATE_SCENE", "strengthen");

      this.pendingChars.push(ch);
      this.nonSpaceChars.push(ch);
    }

    shuffle(this.pendingChars);
  }

  step(): boolean {
    if (this.phase === "falling") {
      return this.stepFalling();
    } else if (this.phase === "vacuuming") {
      return this.stepVacuuming();
    } else {
      return this.stepResetting();
    }
  }

  private stepFalling(): boolean {
    // Release characters according to Python's delay-based schedule
    if (this.pendingChars.length > 0) {
      if (this.fallDelay === 0) {
        const groupSize = randInt(1, this.fallGroupMaxsize);
        for (let i = 0; i < groupSize && this.pendingChars.length > 0; i++) {
          const ch = this.pendingChars.shift();
          if (!ch) break;
          ch.activateScene("weaken");
          this.activeChars.add(ch);
        }
        // Reset delay and (60% chance) increase group size / shorten delay range
        this.fallDelay = randInt(this.minFallDelay, this.maxFallDelay);
        if (Math.random() < 0.6) {
          this.fallGroupMaxsize++;
          this.minFallDelay = Math.max(0, this.minFallDelay - 1);
          this.maxFallDelay = Math.max(0, this.maxFallDelay - 1);
        }
      } else {
        this.fallDelay--;
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      this.phase = "vacuuming";
    }

    return true;
  }

  private stepVacuuming(): boolean {
    if (!this.vacuumingStarted) {
      this.unvacuumedChars = [...this.nonSpaceChars];
      shuffle(this.unvacuumedChars);
      this.vacuumingStarted = true;
    }

    // Release 3–10 characters per tick to vacuum up, matching Python
    const batchSize = randInt(3, 10);
    for (let i = 0; i < batchSize && this.unvacuumedChars.length > 0; i++) {
      const ch = this.unvacuumedChars.shift();
      if (!ch) break;
      ch.motion.activatePath("top");
      this.activeChars.add(ch);
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    if (this.unvacuumedChars.length === 0 && this.activeChars.size === 0) {
      this.phase = "resetting";
    }

    return true;
  }

  private stepResetting(): boolean {
    if (!this.resettingStarted) {
      for (const ch of this.nonSpaceChars) {
        ch.motion.activatePath("input");
        this.activeChars.add(ch);
      }
      this.resettingStarted = true;
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.activeChars.size > 0;
  }
}
