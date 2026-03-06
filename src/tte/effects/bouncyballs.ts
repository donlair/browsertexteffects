import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { outBounce } from "../easing";

export interface BouncyBallsConfig {
  ballColors: Color[];
  ballSymbols: string[];
  ballDelay: number;
  movementSpeed: number;
  movementEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBouncyBallsConfig: BouncyBallsConfig = {
  ballColors: [color("d1f4a5"), color("96e2a4"), color("5acda9")],
  ballSymbols: ["*", "o", "O", "0", "."],
  ballDelay: 4,
  movementSpeed: 0.45,
  movementEasing: outBounce,
  finalGradientStops: [color("f8ffae"), color("43c6ac")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "diagonal",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class BouncyBallsEffect {
  private canvas: Canvas;
  private config: BouncyBallsConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  // Row groups sorted ascending (min row = bottom first), matching Python's group_by_row approach.
  // Within each group, characters are released in random order matching Python's random pop.
  private pendingRowGroups: EffectCharacter[][] = [];
  private currentRowGroup: EffectCharacter[] = [];
  private ticksSinceLastDrop: number;

  constructor(canvas: Canvas, config: BouncyBallsConfig) {
    this.canvas = canvas;
    this.config = config;
    // Match Python: first batch drops immediately on tick 1 (ball_delay starts at 0)
    this.ticksSinceLastDrop = config.ballDelay;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    const rowMap = new Map<number, EffectCharacter[]>();

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }

      // Start above the canvas top (Python: top * random.uniform(1.0, 1.5))
      const launchCol = ch.inputCoord.column;
      const launchRow = Math.round(dims.top * (1 + Math.random() * 0.5));
      ch.motion.setCoordinate({ column: launchCol, row: launchRow });

      // Drop path: from spawn position to input position using OUT_BOUNCE easing.
      // A single traversal with OUT_BOUNCE creates the visual bounce effect, matching Python.
      const bouncePath = ch.motion.newPath("bounce", {
        speed: this.config.movementSpeed,
        ease: this.config.movementEasing,
      });
      bouncePath.addWaypoint(ch.inputCoord);

      // Assign random ball color and symbol
      const ballColor = pick(this.config.ballColors);
      const ballSymbol = pick(this.config.ballSymbols);

      // Ball scene (plays during drop) — looping single-frame scene showing ball symbol
      const ballScene = ch.newScene("ball", true);
      ballScene.addFrame(ballSymbol, 1, ballColor.rgbHex);

      // Landing scene — transitions from ball color to final color, restoring input symbol
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const landScene = ch.newScene("land");
      const charGradient = new Gradient([ballColor, finalColor], 10);
      landScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);

      // When path completes, switch to landing scene (matching Python's PATH_COMPLETE handler)
      ch.eventHandler.register("PATH_COMPLETE", "bounce", "ACTIVATE_SCENE", "land");

      const row = ch.inputCoord.row;
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row)?.push(ch);
    }

    // Sort rows ascending (min row = bottom first), matching Python's group_by_row approach.
    // Python processes min(group_by_row.keys()) first, which is the lowest row = canvas bottom.
    const sortedRows = [...rowMap.keys()].sort((a, b) => a - b);
    this.pendingRowGroups = sortedRows.map(r => rowMap.get(r) ?? []);
  }

  step(): boolean {
    this.ticksSinceLastDrop++;

    // Load next row group when current group is exhausted (matching Python's group_by_row pop)
    if (this.currentRowGroup.length === 0 && this.pendingRowGroups.length > 0) {
      const next = this.pendingRowGroups.shift();
      if (next) this.currentRowGroup = next;
    }

    // Launch characters based on ballDelay
    if (this.currentRowGroup.length > 0 && this.ticksSinceLastDrop > this.config.ballDelay) {
      this.ticksSinceLastDrop = 0;
      const dropCount = randInt(2, 6);
      for (let i = 0; i < dropCount && this.currentRowGroup.length > 0; i++) {
        // Random pick within the current row group, matching Python's random.randint pop
        const idx = Math.floor(Math.random() * this.currentRowGroup.length);
        const [ch] = this.currentRowGroup.splice(idx, 1);
        if (!ch) continue;
        ch.isVisible = true;
        ch.motion.activatePath("bounce");
        ch.activateScene("ball");
        this.activeChars.add(ch);
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.activeChars.size > 0 || this.currentRowGroup.length > 0 || this.pendingRowGroups.length > 0;
  }
}
