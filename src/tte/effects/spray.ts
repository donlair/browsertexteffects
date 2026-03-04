import { type Color, type Coord, type GradientDirection, type EasingFunction, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordOnBezierCurve } from "../geometry";
import { outExpo } from "../easing";

export interface SprayConfig {
  sprayColors: Color[];
  spraySymbols: string[];
  sourcePosition: "bottom-left" | "bottom-right" | "top-left" | "top-right" | "center";
  arcHeight: number;
  flightSpeed: number;
  flightEasing: EasingFunction;
  charsPerTick: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSprayConfig: SprayConfig = {
  sprayColors: [color("ff9900"), color("ffcc00"), color("ffffff")],
  spraySymbols: ["*", "·", ".", "+"],
  sourcePosition: "bottom-left",
  arcHeight: 4,
  flightSpeed: 0.3,
  flightEasing: outExpo,
  charsPerTick: 3,
  finalGradientStops: [color("ff9900"), color("ffcc00"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "diagonal",
};

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class SprayEffect {
  private canvas: Canvas;
  private config: SprayConfig;
  private queue: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private source!: Coord;
  private pathCounter = 0;
  private releasedCount = 0;

  constructor(canvas: Canvas, config: SprayConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private resolveSource(): Coord {
    const { dims } = this.canvas;
    switch (this.config.sourcePosition) {
      case "bottom-left":  return { column: dims.left,  row: dims.bottom };
      case "bottom-right": return { column: dims.right, row: dims.bottom };
      case "top-left":     return { column: dims.left,  row: dims.top };
      case "top-right":    return { column: dims.right, row: dims.top };
      case "center":       return {
        column: Math.round((dims.left + dims.right) / 2),
        row:    Math.round((dims.bottom + dims.top) / 2),
      };
    }
  }

  private build(): void {
    const { dims } = this.canvas;
    this.source = this.resolveSource();

    // Build final gradient color mapping
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // All characters start hidden
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }

    const chars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(chars);

    for (const ch of chars) {
      const target = ch.inputCoord;

      // "flight" scene — looping: cycles spraySymbols × sprayColors
      const flightScene = ch.newScene("flight", true);
      for (const sym of this.config.spraySymbols) {
        for (const col of this.config.sprayColors) {
          flightScene.addFrame(sym, 1, col.rgbHex);
        }
      }

      // "resolve" scene — gradient from last spray color → final position color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const lastSprayColor = this.config.sprayColors[this.config.sprayColors.length - 1];
      const resolveScene = ch.newScene("resolve");
      const resolveGrad = new Gradient([lastSprayColor, finalColor], this.config.finalGradientFrames);
      resolveScene.applyGradientToSymbols(ch.inputSymbol, 1, resolveGrad);

      // Arc path: source → target via Bezier curve
      const S = this.source;
      const T = target;
      const midCol = Math.round((S.column + T.column) / 2);
      const midRow = Math.round((S.row + T.row) / 2) + this.config.arcHeight;
      const controlPoint: Coord = { column: midCol, row: midRow };

      const pathId = `arc_${this.pathCounter}`;
      const arcPath = ch.motion.newPath(pathId, this.config.flightSpeed, this.config.flightEasing);

      for (let s = 1; s <= 5; s++) {
        const t = s / 5;
        const pt = findCoordOnBezierCurve(S, [controlPoint], T, t);
        arcPath.addWaypoint(pt);
      }

      // On arc complete → activate resolve scene
      ch.eventHandler.register("PATH_COMPLETE", pathId, "ACTIVATE_SCENE", "resolve");

      this.pathCounter++;
    }

    this.queue = chars;
  }

  step(): boolean {
    // Release charsPerTick chars from the queue
    const toRelease = Math.min(this.config.charsPerTick, this.queue.length);
    for (let i = 0; i < toRelease; i++) {
      const ch = this.queue.shift()!;
      ch.motion.setCoordinate(this.source);
      ch.isVisible = true;
      ch.activateScene("flight");
      ch.motion.activatePath(`arc_${this.releasedCount}`);
      this.releasedCount++;
      this.activeChars.add(ch);
    }

    // Tick active characters
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.queue.length > 0 || this.activeChars.size > 0;
  }
}
