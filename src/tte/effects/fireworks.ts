import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsInCircle, findCoordOnBezierCurve, extrapolateAlongRay } from "../geometry";
import { outExpo, outCirc, inOutQuart } from "../easing";

export interface FireworksConfig {
  fireworkColors: Color[];
  fireworkVolume: number;
  launchDelay: number;
  explodeDistance: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultFireworksConfig: FireworksConfig = {
  fireworkColors: [
    color("2cf5e0"), color("48d162"), color("e4f72e"),
    color("f5a623"), color("d6341a"), color("cc00ff"),
  ],
  fireworkVolume: 0.02,
  launchDelay: 60,
  explodeDistance: 0.1,
  finalGradientStops: [color("2cf5e0"), color("48d162"), color("e4f72e")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "horizontal",
};

interface Shell {
  characters: EffectCharacter[];
  shellColor: Color;
  apex: Coord;
  launchColumn: number;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
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

    // Shuffle non-space characters and split into shells
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(nonSpaceChars);

    const charsPerShell = Math.max(1, Math.round(nonSpaceChars.length * this.config.fireworkVolume));
    const canvasWidth = dims.right - dims.left + 1;
    const canvasHeight = dims.top - dims.bottom + 1;
    const explodeRadius = Math.max(2, Math.round(canvasWidth * this.config.explodeDistance));

    for (let i = 0; i < nonSpaceChars.length; i += charsPerShell) {
      const chars = nonSpaceChars.slice(i, i + charsPerShell);
      const shellColor = this.config.fireworkColors[
        Math.floor(Math.random() * this.config.fireworkColors.length)
      ];

      // Random apex in the upper portion of canvas
      const apexCol = randInt(dims.left + 2, dims.right - 2);
      const apexRow = randInt(
        dims.bottom + Math.round(canvasHeight * 0.5),
        dims.top,
      );
      const apex: Coord = { column: apexCol, row: apexRow };

      // Random launch column near the bottom
      const launchColumn = randInt(dims.left, dims.right);

      this.shells.push({ characters: chars, shellColor, apex, launchColumn });
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
      // Get explosion targets within a circle around the apex
      const circleCoords = findCoordsInCircle(shell.apex, explodeRadius);
      if (circleCoords.length === 0) continue;

      for (let ci = 0; ci < shell.characters.length; ci++) {
        const ch = shell.characters[ci];
        const targetOnCircle = circleCoords[ci % circleCoords.length];

        // --- Scenes ---

        // Launch scene: blinking firework symbol
        const launchScene = ch.newScene("launch", true);
        launchScene.addFrame("*", 2, shellColor(shell.shellColor, 1.0));
        launchScene.addFrame("*", 2, shellColor(shell.shellColor, 0.5));

        // Bloom scene: burst from shell color to white
        const bloomScene = ch.newScene("bloom");
        const bloomGrad = new Gradient([shell.shellColor, color("ffffff")], 5);
        bloomScene.applyGradientToSymbols(ch.inputSymbol, 1, bloomGrad);

        // Fall scene: gradient from shell color to final color
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const fallScene = ch.newScene("fall");
        const fallGrad = new Gradient([shell.shellColor, finalColor], this.config.finalGradientFrames);
        fallScene.applyGradientToSymbols(ch.inputSymbol, 1, fallGrad);

        // --- Paths ---

        // Launch path: bottom edge → apex
        const launchStart: Coord = { column: shell.launchColumn, row: dims.bottom };
        const launchPath = ch.motion.newPath(`launch_${this.pathCounter}`, 0.35, outExpo);
        launchPath.addWaypoint(launchStart);
        launchPath.addWaypoint(shell.apex);

        // Explode path: apex → circle target via Bezier-sampled waypoints
        const controlPoint = extrapolateAlongRay(shell.apex, targetOnCircle, 2);
        const explodePath = ch.motion.newPath(
          `explode_${this.pathCounter}`,
          { speed: 0.2 + Math.random() * 0.2, ease: outCirc },
        );
        // Sample Bezier curve to create smooth waypoints
        const bezierSteps = 5;
        for (let s = 1; s <= bezierSteps; s++) {
          const t = s / bezierSteps;
          const pt = findCoordOnBezierCurve(shell.apex, [controlPoint], targetOnCircle, t);
          explodePath.addWaypoint(pt);
        }

        // Fall path: circle target → home
        const fallPath = ch.motion.newPath(`fall_${this.pathCounter}`, 0.6, inOutQuart);
        fallPath.addWaypoint(ch.inputCoord);

        // --- Event chaining ---
        const launchId = `launch_${this.pathCounter}`;
        const explodeId = `explode_${this.pathCounter}`;
        const fallId = `fall_${this.pathCounter}`;

        ch.eventHandler.register("PATH_COMPLETE", launchId, "ACTIVATE_PATH", explodeId);
        ch.eventHandler.register("PATH_COMPLETE", launchId, "ACTIVATE_SCENE", "bloom");
        ch.eventHandler.register("PATH_COMPLETE", explodeId, "ACTIVATE_PATH", fallId);
        ch.eventHandler.register("PATH_COMPLETE", explodeId, "ACTIVATE_SCENE", "fall");

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

      // Activate launch path (using the path counter from build)
      const shellIdx = this.shells.indexOf(shell);
      const baseCounter = this.shells.slice(0, shellIdx).reduce(
        (sum, s) => sum + s.characters.length, 0,
      ) + ci;
      ch.motion.activatePath(`launch_${baseCounter}`);

      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    this.frameCount++;

    // Launch next shell if ready
    if (this.shellQueue.length > 0 && this.frameCount >= this.nextLaunchFrame) {
      const shell = this.shellQueue.shift()!;
      this.launchShell(shell);

      // Randomize next launch delay ±50%
      const jitter = 0.5 + Math.random();
      this.nextLaunchFrame = this.frameCount + Math.round(this.config.launchDelay * jitter);
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

function shellColor(c: Color, brightness: number): string {
  const hex = c.rgbHex;
  const r = Math.round(parseInt(hex.slice(0, 2), 16) * brightness);
  const g = Math.round(parseInt(hex.slice(2, 4), 16) * brightness);
  const b = Math.round(parseInt(hex.slice(4, 6), 16) * brightness);
  return (
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}
