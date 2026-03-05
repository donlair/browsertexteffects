import { type Color, type Coord, type GradientDirection, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordOnBezierCurve, findLengthOfLine } from "../geometry";
import { inOutSine } from "../easing";

export interface SpotlightsConfig {
  spotlightCount: number;
  beamWidthRatio: number;
  beamFalloff: number;
  searchDuration: number;
  searchSpeedRange: [number, number];
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSpotlightsConfig: SpotlightsConfig = {
  spotlightCount: 3,
  beamWidthRatio: 2.0,
  beamFalloff: 0.3,
  searchDuration: 550,
  searchSpeedRange: [0.35, 0.75],
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "vertical",
};

interface Spotlight {
  coord: Coord;
  speed: number;
  // Bezier path state
  pathStart: Coord;
  pathControl: Coord;
  pathEnd: Coord;
  pathProgress: number;
  pathLength: number;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function randomCoord(dims: { left: number; right: number; top: number; bottom: number }): Coord {
  return {
    column: randInt(dims.left, dims.right),
    row: randInt(dims.bottom, dims.top),
  };
}

function randomControl(start: Coord, end: Coord, dims: { left: number; right: number; top: number; bottom: number }): Coord {
  const midCol = (start.column + end.column) / 2;
  const midRow = (start.row + end.row) / 2;
  const spread = Math.max(dims.right - dims.left, dims.top - dims.bottom) * 0.4;
  return {
    column: Math.round(midCol + randRange(-spread, spread)),
    row: Math.round(midRow + randRange(-spread, spread)),
  };
}

export class SpotlightsEffect {
  private canvas: Canvas;
  private config: SpotlightsConfig;
  private spotlights: Spotlight[] = [];
  private center: Coord;
  private beamWidth: number;
  private phase: "search" | "converge" | "expand" | "final" | "complete" = "search";
  private phaseFrames = 0;
  private expandRadius = 0;
  private maxExpandRadius: number;
  private activeChars: Set<EffectCharacter> = new Set();
  private colorMapping: Map<string, Color> = new Map();
  private charBaseColors: Map<number, Color> = new Map();
  private charDarkColors: Map<number, Color> = new Map();

  constructor(canvas: Canvas, config: SpotlightsConfig) {
    this.canvas = canvas;
    this.config = config;

    const { dims } = canvas;
    this.center = {
      column: Math.round((dims.left + dims.right) / 2),
      row: Math.round((dims.top + dims.bottom) / 2),
    };
    // Python: max(int(min(smallest_dim // ratio, smallest_dim)), 1)
    const smallestDim = Math.min(dims.right, dims.top);
    this.beamWidth = Math.max(1, Math.floor(smallestDim / config.beamWidthRatio));
    // Python expand completes when range > max(right, top) // 1.5
    this.maxExpandRadius = Math.floor(Math.max(dims.right, dims.top) / 1.5);

    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    // Build final gradient mapping
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    // Store each character's target color and dim color (0.2 brightness, matching Python)
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const targetColor = this.colorMapping.get(key) || config.finalGradientStops[0];
      this.charBaseColors.set(ch.id, targetColor);
      this.charDarkColors.set(ch.id, adjustBrightness(targetColor, 0.2));
    }

    // Create spotlights at random positions
    for (let i = 0; i < config.spotlightCount; i++) {
      const startCoord = randomCoord(dims);
      const endCoord = randomCoord(dims);
      const control = randomControl(startCoord, endCoord, dims);
      this.spotlights.push({
        coord: { ...startCoord },
        speed: randRange(config.searchSpeedRange[0], config.searchSpeedRange[1]),
        pathStart: startCoord,
        pathControl: control,
        pathEnd: endCoord,
        pathProgress: 0,
        pathLength: Math.max(1, findLengthOfLine(startCoord, endCoord)),
      });
    }

    // All characters start visible but dim (dark = 0.2 brightness of target, matching Python)
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.charDarkColors.get(ch.id)?.rgbHex ?? null };
      if (!ch.isSpace) {
        this.activeChars.add(ch);
      }
    }
  }

  private newSpotlightPath(spotlight: Spotlight): void {
    const { dims } = this.canvas;
    const newEnd = randomCoord(dims);
    spotlight.pathStart = { ...spotlight.coord };
    spotlight.pathEnd = newEnd;
    spotlight.pathControl = randomControl(spotlight.pathStart, newEnd, dims);
    spotlight.pathProgress = 0;
    spotlight.pathLength = Math.max(1, findLengthOfLine(spotlight.pathStart, newEnd));
  }

  private moveSpotlights(): void {
    for (const sl of this.spotlights) {
      const step = sl.speed / sl.pathLength;
      sl.pathProgress = Math.min(1, sl.pathProgress + step);
      sl.coord = findCoordOnBezierCurve(sl.pathStart, [sl.pathControl], sl.pathEnd, sl.pathProgress);

      if (sl.pathProgress >= 1) {
        this.newSpotlightPath(sl);
      }
    }
  }

  private convergeSpotlights(): void {
    // During convergence, spotlights follow a straight path to center with easing
    for (const sl of this.spotlights) {
      const step = sl.speed / sl.pathLength;
      sl.pathProgress = Math.min(1, sl.pathProgress + step);
      const easedT = inOutSine(sl.pathProgress);
      sl.coord = {
        column: Math.round(sl.pathStart.column + (this.center.column - sl.pathStart.column) * easedT),
        row: Math.round(sl.pathStart.row + (this.center.row - sl.pathStart.row) * easedT),
      };
    }
  }

  private illuminateCharacters(): void {
    for (const ch of this.activeChars) {
      const baseColor = this.charBaseColors.get(ch.id);
      if (!baseColor) continue;

      // Find minimum distance to any spotlight
      let minDist = Infinity;
      for (const sl of this.spotlights) {
        const dist = findLengthOfLine(ch.inputCoord, sl.coord, true);
        if (dist < minDist) minDist = dist;
      }

      // Calculate brightness based on distance
      if (minDist <= this.beamWidth) {
        const normalizedDist = minDist / this.beamWidth;
        const falloffStart = 1 - this.config.beamFalloff;
        let brightness: number;
        if (normalizedDist <= falloffStart) {
          brightness = 1.0;
        } else {
          brightness = 1.0 - (normalizedDist - falloffStart) / this.config.beamFalloff;
        }
        brightness = Math.max(0.2, brightness);
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: adjustBrightness(baseColor, brightness).rgbHex };
      } else {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.charDarkColors.get(ch.id)?.rgbHex ?? null };
      }
    }
  }

  private illuminateByExpansion(): void {
    for (const ch of this.activeChars) {
      const dist = findLengthOfLine(ch.inputCoord, this.center, true);
      const baseColor = this.charBaseColors.get(ch.id);
      if (!baseColor) continue;

      if (dist <= this.expandRadius) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: baseColor.rgbHex };
      } else if (dist <= this.expandRadius + this.beamWidth) {
        const edgeDist = dist - this.expandRadius;
        const brightness = Math.max(0.2, 1.0 - edgeDist / this.beamWidth);
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: adjustBrightness(baseColor, brightness).rgbHex };
      } else {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.charDarkColors.get(ch.id)?.rgbHex ?? null };
      }
    }
  }

  private transitionToConverge(): void {
    this.phase = "converge";
    this.phaseFrames = 0;
    for (const sl of this.spotlights) {
      sl.pathStart = { ...sl.coord };
      sl.pathProgress = 0;
      sl.pathLength = Math.max(1, findLengthOfLine(sl.coord, this.center));
      sl.speed = randRange(0.3, 0.5);
    }
  }

  private transitionToExpand(): void {
    this.phase = "expand";
    this.phaseFrames = 0;
    this.expandRadius = 0;
  }

  private transitionToFinal(): void {
    this.phase = "final";
    this.phaseFrames = 0;

    // Set all characters to their final gradient colors using scenes
    for (const ch of this.activeChars) {
      const baseColor = this.charBaseColors.get(ch.id);
      if (!baseColor) continue;
      const scene = ch.newScene("final_gradient");
      const charGradient = new Gradient([this.config.finalGradientStops[0], baseColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.activateScene(scene);
    }
  }

  step(): boolean {
    if (this.phase === "complete") return false;

    this.phaseFrames++;

    switch (this.phase) {
      case "search":
        this.moveSpotlights();
        this.illuminateCharacters();
        if (this.phaseFrames >= this.config.searchDuration) {
          this.transitionToConverge();
        }
        break;

      case "converge": {
        this.convergeSpotlights();
        this.illuminateCharacters();
        // Check if all spotlights have converged
        const allConverged = this.spotlights.every((sl) => sl.pathProgress >= 1);
        if (allConverged) {
          this.transitionToExpand();
        }
        break;
      }

      case "expand":
        this.expandRadius += 1;
        this.illuminateByExpansion();
        // Python: complete when illuminate_range > max(right, top) // 1.5
        if (this.expandRadius > this.maxExpandRadius) {
          this.transitionToFinal();
        }
        break;

      case "final":
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        if (this.activeChars.size === 0) {
          this.phase = "complete";
          return false;
        }
        break;
    }

    return true;
  }
}
