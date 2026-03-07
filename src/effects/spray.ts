import { type Color, type Coord, type GradientDirection, type EasingFunction, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordOnBezierCurve } from "../geometry";
import { outExpo } from "../easing";

export interface SprayConfig {
  sprayColors: Color[];
  spraySymbols: string[];
  sourcePosition: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | "center";
  arcHeight: number;
  flightSpeedRange: [number, number];
  flightEasing: EasingFunction;
  sprayVolume: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSprayConfig: SprayConfig = {
  sprayColors: [color("8A008A"), color("00D1FF"), color("ffffff")],
  spraySymbols: ["*", "·", ".", "+"],
  sourcePosition: "e",
  arcHeight: 4,
  flightSpeedRange: [0.6, 1.4],
  flightEasing: outExpo,
  sprayVolume: 0.005,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

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
  private _volume = 1;

  constructor(canvas: Canvas, config: SprayConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private resolveSource(): Coord {
    const { dims } = this.canvas;
    const midCol = Math.floor(dims.right / 2);
    const midRow = Math.floor(dims.top / 2);
    switch (this.config.sourcePosition) {
      case "n":      return { column: midCol,          row: dims.top    };
      case "ne":     return { column: dims.right - 1,  row: dims.top    };
      case "e":      return { column: dims.right - 1,  row: midRow      };
      case "se":     return { column: dims.right - 1,  row: dims.bottom };
      case "s":      return { column: midCol,      row: dims.bottom };
      case "sw":     return { column: dims.left,   row: dims.bottom };
      case "w":      return { column: dims.left,   row: midRow      };
      case "nw":     return { column: dims.left,   row: dims.top    };
      case "center": return { column: dims.centerColumn, row: dims.centerRow };
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

    this._volume = Math.max(1, Math.floor(chars.length * this.config.sprayVolume));

    for (const ch of chars) {
      const target = ch.inputCoord;

      // "flight" scene — looping: cycles spraySymbols × sprayColors
      const flightScene = ch.newScene("flight", true);
      for (const sym of this.config.spraySymbols) {
        for (const col of this.config.sprayColors) {
          flightScene.addFrame(sym, 1, col.rgbHex);
        }
      }

      // "resolve" scene — gradient from random spectrum color → final position color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const randomSpectrumColor = finalGradient.spectrum[randInt(0, finalGradient.spectrum.length - 1)];
      const resolveScene = ch.newScene("resolve");
      const resolveGrad = new Gradient([randomSpectrumColor, finalColor], this.config.finalGradientFrames);
      resolveScene.applyGradientToSymbols(ch.inputSymbol, 1, resolveGrad);

      // Arc path: source → target via Bezier curve
      const S = this.source;
      const T = target;
      const midCol = Math.round((S.column + T.column) / 2);
      const midRow = Math.round((S.row + T.row) / 2) + this.config.arcHeight;
      const controlPoint: Coord = { column: midCol, row: midRow };

      const pathId = `arc_${this.pathCounter}`;
      const speed = randRange(this.config.flightSpeedRange[0], this.config.flightSpeedRange[1]);
      const arcPath = ch.motion.newPath(pathId, speed, this.config.flightEasing);

      for (let s = 1; s <= 4; s++) {
        const t = s / 5;
        const pt = findCoordOnBezierCurve(S, [controlPoint], T, t);
        arcPath.addWaypoint(pt);
      }
      arcPath.addWaypoint(ch.inputCoord);

      // On arc complete → activate resolve scene
      ch.eventHandler.register("PATH_COMPLETE", pathId, "ACTIVATE_SCENE", "resolve");

      this.pathCounter++;
    }

    this.queue = chars;
  }

  step(): boolean {
    // Release random number of chars from the queue
    const toRelease = randInt(1, this._volume);
    for (let i = 0; i < toRelease && this.queue.length > 0; i++) {
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
        ch.motion.setCoordinate(ch.inputCoord);
        this.activeChars.delete(ch);
      }
    }

    return this.queue.length > 0 || this.activeChars.size > 0;
  }
}
