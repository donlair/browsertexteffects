import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsOnCircle, findCoordsInRect } from "../geometry";

export interface RingsConfig {
  ringColors: Color[];
  ringGap: number;
  spinDuration: number;
  spinSpeed: [number, number];
  disperseDuration: number;
  spinDisperseCycles: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultRingsConfig: RingsConfig = {
  ringColors: [color("e33b00"), color("ff9900"), color("00aaff"), color("aa00ff")],
  ringGap: 0.1,
  spinDuration: 200,
  spinSpeed: [0.25, 1.0],
  disperseDuration: 200,
  spinDisperseCycles: 3,
  finalGradientStops: [color("e33b00"), color("ff9900"), color("00aaff")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "radial",
};

interface RingData {
  index: number;
  radius: number;
  coords: Coord[];
  coordsReversed: Coord[];
  speed: number;
  characters: EffectCharacter[];
  clockwise: boolean;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class RingsEffect {
  private canvas: Canvas;
  private config: RingsConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private rings: RingData[] = [];
  private center: Coord = { column: 1, row: 1 };
  private colorMapping: Map<string, Color> = new Map();
  private charRingMap: Map<number, RingData> = new Map();
  private phase: "start" | "disperse" | "spin" | "final" | "complete" = "start";
  private phaseFrames = 0;
  private cyclesRemaining: number;
  private pathCounter = 0;

  constructor(canvas: Canvas, config: RingsConfig) {
    this.canvas = canvas;
    this.config = config;
    this.cyclesRemaining = config.spinDisperseCycles;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    this.center = {
      column: Math.round((dims.left + dims.right) / 2),
      row: Math.round((dims.top + dims.bottom) / 2),
    };

    const maxDim = Math.max(dims.right - dims.left + 1, dims.top - dims.bottom + 1);
    const gapPixels = Math.max(1, Math.round(this.config.ringGap * maxDim));

    // Generate concentric rings
    let radius = gapPixels;
    let ringIdx = 0;
    while (radius <= maxDim * 1.5) {
      const coords = findCoordsOnCircle(this.center, radius);
      if (coords.length < 3) {
        radius += gapPixels;
        continue;
      }
      const speed = randRange(this.config.spinSpeed[0], this.config.spinSpeed[1]);
      this.rings.push({
        index: ringIdx,
        radius,
        coords,
        coordsReversed: [...coords].reverse(),
        speed,
        characters: [],
        clockwise: ringIdx % 2 === 0,
      });
      radius += gapPixels;
      ringIdx++;
    }

    if (this.rings.length === 0) return;

    // Shuffle non-space characters and assign round-robin to rings
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(nonSpaceChars);
    for (let i = 0; i < nonSpaceChars.length; i++) {
      const ring = this.rings[i % this.rings.length];
      ring.characters.push(nonSpaceChars[i]);
      this.charRingMap.set(nonSpaceChars[i].id, ring);
    }

    // Build gradient mapping for final phase
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Set all characters visible at home, build ring color scenes
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (!ch.isSpace) {
        this.activeChars.add(ch);
      }
    }

    for (const ring of this.rings) {
      const ringColor = this.config.ringColors[ring.index % this.config.ringColors.length];
      for (const ch of ring.characters) {
        const scene = ch.newScene("ring_color", true);
        scene.addFrame(ch.inputSymbol, 1, ringColor.rgbHex);
      }
    }
  }

  private transitionToDisperse(): void {
    this.phase = "disperse";
    this.phaseFrames = 0;

    for (const ring of this.rings) {
      const disperseRadius = Math.max(2, Math.round(ring.radius * 0.5));
      for (const ch of ring.characters) {
        // Scatter to random position near the ring
        const disperseCoords = findCoordsInRect(this.center, disperseRadius);
        const target = disperseCoords[Math.floor(Math.random() * disperseCoords.length)];

        const pathId = `d${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, 0.5);
        path.addWaypoint(target);
        ch.motion.activatePath(pathId);

        ch.activateScene("ring_color");
      }
    }
  }

  private transitionToSpin(): void {
    this.phase = "spin";
    this.phaseFrames = 0;

    for (const ring of this.rings) {
      const coords = ring.clockwise ? ring.coords : ring.coordsReversed;
      if (coords.length === 0) continue;

      for (const ch of ring.characters) {
        // Find closest coord on ring to current position
        let closestIdx = 0;
        let closestDist = Infinity;
        for (let i = 0; i < coords.length; i++) {
          const dx = coords[i].column - ch.motion.currentCoord.column;
          const dy = coords[i].row - ch.motion.currentCoord.row;
          const dist = dx * dx + dy * dy;
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }

        // Create path around ring with enough laps
        const pathId = `s${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, ring.speed);
        const laps = 3;
        for (let lap = 0; lap < laps; lap++) {
          for (let i = 0; i < coords.length; i++) {
            const idx = (closestIdx + i) % coords.length;
            path.addWaypoint(coords[idx]);
          }
        }
        ch.motion.activatePath(pathId);
      }
    }
  }

  private transitionToFinal(): void {
    this.phase = "final";
    this.phaseFrames = 0;

    for (const ring of this.rings) {
      for (const ch of ring.characters) {
        // Path back to home
        const pathId = `f${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, 0.5);
        path.addWaypoint(ch.inputCoord);
        ch.motion.activatePath(pathId);

        // Gradient scene (non-looping)
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const scene = ch.newScene("gradient");
        const charGradient = new Gradient([this.config.finalGradientStops[0], finalColor], 10);
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
        ch.activateScene(scene);
      }
    }
  }

  step(): boolean {
    if (this.phase === "complete") return false;

    this.phaseFrames++;

    switch (this.phase) {
      case "start":
        if (this.phaseFrames >= 100) {
          this.transitionToDisperse();
        }
        break;

      case "disperse":
        for (const ch of this.activeChars) {
          ch.tick();
        }
        if (this.phaseFrames >= this.config.disperseDuration) {
          this.transitionToSpin();
        }
        break;

      case "spin":
        for (const ch of this.activeChars) {
          ch.tick();
        }
        if (this.phaseFrames >= this.config.spinDuration) {
          this.cyclesRemaining--;
          if (this.cyclesRemaining > 0) {
            this.transitionToDisperse();
          } else {
            this.transitionToFinal();
          }
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
