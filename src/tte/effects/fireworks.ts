import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsInCircle, extrapolateAlongRay } from "../geometry";
import { outExpo, outCirc, inOutQuart } from "../easing";

export interface FireworksConfig {
  explodeAnywhere: boolean;
  fireworkColors: Color[];
  fireworkSymbol: string;
  fireworkVolume: number;
  launchDelay: number;
  explodeDistance: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultFireworksConfig: FireworksConfig = {
  explodeAnywhere: false,
  fireworkColors: [
    color("88F7E2"), color("44D492"), color("F5EB67"),
    color("FFA15C"), color("FA233E"),
  ],
  fireworkSymbol: "o",
  fireworkVolume: 0.05,
  launchDelay: 45,
  explodeDistance: 0.2,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientDirection: "horizontal",
};

interface Shell {
  characters: EffectCharacter[];
  shellColor: Color;
  apex: Coord;
  launchColumn: number;
  pathCounterBase: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class FireworksEffect {
  private canvas: Canvas;
  private config: FireworksConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private shells: Shell[] = [];
  private shellQueue: Shell[] = [];
  private frameCount = 0;
  private nextLaunchFrame = 0;
  private colorMapping: Map<string, Color> = new Map();
  private pathCounter = 0;

  constructor(canvas: Canvas, config: FireworksConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    // Build final gradient color mapping
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Sort by ascending row so bottom-row characters come first (row 1 = bottom)
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    nonSpaceChars.sort((a, b) => a.inputCoord.row - b.inputCoord.row);

    const charsPerShell = Math.max(1, Math.round(nonSpaceChars.length * this.config.fireworkVolume));
    const explodeRadius = Math.min(15, Math.max(1, Math.round(dims.right * this.config.explodeDistance)));

    for (let i = 0; i < nonSpaceChars.length; i += charsPerShell) {
      const chars = nonSpaceChars.slice(i, i + charsPerShell);
      const shellColor = this.config.fireworkColors[
        Math.floor(Math.random() * this.config.fireworkColors.length)
      ];

      // Random apex column anywhere in canvas, row above the highest shell character
      const apexCol = randInt(dims.left, dims.right - 1);
      const minRow = this.config.explodeAnywhere
        ? dims.bottom
        : Math.max(...chars.map(c => c.inputCoord.row));
      const apexRow = randInt(minRow, dims.top);
      const apex: Coord = { column: apexCol, row: apexRow };

      // Random launch column near the bottom
      const launchColumn = randInt(dims.left, dims.right);

      this.shells.push({ characters: chars, shellColor, apex, launchColumn, pathCounterBase: 0 });
    }

    this.shellQueue = [...this.shells];

    // All characters start invisible
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (ch.isSpace) continue;
      ch.currentVisual = { symbol: " ", fgColor: null };
    }

    // Pre-build scenes and paths for all shells
    for (const shell of this.shells) {
      shell.pathCounterBase = this.pathCounter;

      // Get explosion targets within a circle around the apex
      const circleCoords = findCoordsInCircle(shell.apex, explodeRadius);
      if (circleCoords.length === 0) continue;

      for (let ci = 0; ci < shell.characters.length; ci++) {
        const ch = shell.characters[ci];
        const targetOnCircle = circleCoords[ci % circleCoords.length];

        // --- Scenes ---

        // Launch scene: blinking firework symbol (looping)
        const launchScene = ch.newScene("launch", true);
        launchScene.addFrame(this.config.fireworkSymbol, 2, shell.shellColor.rgbHex);
        launchScene.addFrame(this.config.fireworkSymbol, 1, "ffffff");

        // Bloom scene: burst gradient (shell → white → shell)
        const bloomScene = ch.newScene("bloom");
        const bloomGrad = new Gradient([shell.shellColor, color("ffffff"), shell.shellColor], 5);
        bloomScene.applyGradientToSymbols(ch.inputSymbol, 2, bloomGrad);

        // Fall scene: gradient from shell color to final color (15 steps, 10 frames each)
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const fallScene = ch.newScene("fall");
        const fallGrad = new Gradient([shell.shellColor, finalColor], 15);
        fallScene.applyGradientToSymbols(ch.inputSymbol, 10, fallGrad);

        // --- Paths ---

        // Launch path: bottom edge → apex
        const launchStart: Coord = { column: shell.launchColumn, row: dims.bottom };
        const launchPath = ch.motion.newPath(`launch_${this.pathCounter}`, 0.35, outExpo);
        launchPath.addWaypoint(launchStart);
        launchPath.addWaypoint(shell.apex);

        // Explode path: apex → circle target → bloom waypoint (with bezier)
        const explodePath = ch.motion.newPath(
          `explode_${this.pathCounter}`,
          { speed: 0.2 + Math.random() * 0.2, ease: outCirc },
        );
        explodePath.addWaypoint(targetOnCircle);
        const bloomControlPoint = extrapolateAlongRay(shell.apex, targetOnCircle, Math.floor(explodeRadius / 2));
        const bloomCoord: Coord = {
          column: bloomControlPoint.column,
          row: Math.max(1, bloomControlPoint.row - 7),
        };
        explodePath.addWaypoint(bloomCoord, bloomControlPoint);

        // Fall path: bloom position → input coord via bezier through row 1
        const fallPath = ch.motion.newPath(`fall_${this.pathCounter}`, 0.6, inOutQuart);
        const inputControlPoint: Coord = { column: bloomCoord.column, row: 1 };
        fallPath.addWaypoint(ch.inputCoord, inputControlPoint);

        // --- Event chaining ---
        const launchId = `launch_${this.pathCounter}`;
        const explodeId = `explode_${this.pathCounter}`;
        const fallId = `fall_${this.pathCounter}`;

        ch.eventHandler.register("PATH_COMPLETE", launchId, "ACTIVATE_PATH", explodeId);
        ch.eventHandler.register("PATH_COMPLETE", launchId, "ACTIVATE_SCENE", "bloom");
        ch.eventHandler.register("PATH_COMPLETE", explodeId, "ACTIVATE_PATH", fallId);
        ch.eventHandler.register("PATH_ACTIVATED", fallId, "ACTIVATE_SCENE", "fall");

        this.pathCounter++;
      }
    }
  }

  private launchShell(shell: Shell): void {
    for (let ci = 0; ci < shell.characters.length; ci++) {
      const ch = shell.characters[ci];
      const launchStart: Coord = { column: shell.launchColumn, row: this.canvas.dims.bottom };

      // Move character to launch position and make visible
      ch.motion.setCoordinate(launchStart);
      ch.activateScene("launch");

      ch.motion.activatePath(`launch_${shell.pathCounterBase + ci}`);

      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    this.frameCount++;

    // Launch next shell if ready
    if (this.shellQueue.length > 0 && this.frameCount >= this.nextLaunchFrame) {
      const shell = this.shellQueue.shift();
      if (shell) {
        this.launchShell(shell);

        // Randomize next launch delay ±50%
        const jitter = 0.5 + Math.random();
        this.nextLaunchFrame = this.frameCount + Math.round(this.config.launchDelay * jitter);
      }
    }

    // Tick all active characters
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    // Complete when all shells launched and all characters done
    if (this.shellQueue.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    return true;
  }
}

