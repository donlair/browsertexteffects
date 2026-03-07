import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsOnCircle, findCoordsInRect } from "../geometry";
import { outQuad, outSine, outCubic } from "../easing";

export interface RingsConfig {
  ringColors: Color[];
  ringGap: number;
  spinDuration: number;
  spinSpeed: [number, number];
  disperseDuration: number;
  spinDisperseCycles: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultRingsConfig: RingsConfig = {
  ringColors: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  ringGap: 0.1,
  spinDuration: 200,
  spinSpeed: [0.25, 1.0],
  disperseDuration: 200,
  spinDisperseCycles: 3,
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

interface RingData {
  index: number;
  radius: number;
  coords: Coord[];
  coordsReversed: Coord[];
  speed: number;
  characters: EffectCharacter[];
  clockwise: boolean;
  charRingPathId: Map<number, string>;      // charId → ring path id
  charRingStartCoord: Map<number, Coord>;   // charId → first ring coord (for initial disperse origin)
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
  private charFinalColorMap: Map<number, Color> = new Map();
  private charRingMap: Map<number, RingData> = new Map();
  private nonRingChars: EffectCharacter[] = [];
  private initialDisperseComplete = false;
  private gapPixels = 1;
  private phase: "start" | "disperse" | "spin" | "final" | "complete" = "start";
  private phaseFrames = 0;
  private cyclesRemaining: number;
  private pathCounter = 0;
  private charLastRingCoord: Map<number, Coord> = new Map();

  constructor(canvas: Canvas, config: RingsConfig) {
    this.canvas = canvas;
    this.config = config;
    this.cyclesRemaining = config.spinDisperseCycles;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    this.center = dims.center;

    // Python: ring_gap = max(round(min(canvas.top, canvas.right) * ring_gap), 1)
    const minDim = Math.min(dims.right - dims.left + 1, dims.top - dims.bottom + 1);
    this.gapPixels = Math.max(1, Math.round(this.config.ringGap * minDim));

    // Generate concentric rings
    const maxRadius = Math.max(dims.right, dims.top);
    let radius = 1;
    let ringIdx = 0;
    while (radius < maxRadius) {
      const coords = findCoordsOnCircle(this.center, radius, 7 * radius);
      const inCanvas = coords.length === 0 ? 0 : coords.filter(c => this.canvas.coordIsInCanvas(c)).length;
      if (coords.length === 0 || inCanvas / coords.length < 0.25) break;

      if (coords.length >= 3) {
        const speed = randRange(this.config.spinSpeed[0], this.config.spinSpeed[1]);
        this.rings.push({
          index: ringIdx,
          radius,
          coords,
          coordsReversed: [...coords].reverse(),
          speed,
          characters: [],
          clockwise: ringIdx % 2 === 0,
          charRingPathId: new Map(),
          charRingStartCoord: new Map(),
        });
        ringIdx++;
      }
      radius += this.gapPixels;
    }

    if (this.rings.length === 0) return;

    // Build final gradient color map
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      this.charFinalColorMap.set(ch.id, colorMapping.get(key) ?? this.config.finalGradientStops[0]);
    }

    // For all characters: build start scene (final color) and home path
    for (const ch of this.canvas.getCharacters()) {
      const finalColor = this.charFinalColorMap.get(ch.id)!;
      const startScene = ch.newScene("start", true);
      startScene.addFrame(ch.inputSymbol, 1, finalColor.rgbHex);
      ch.activateScene(startScene);

      const homePath = ch.motion.newPath("home", { speed: 0.8, ease: outQuad });
      homePath.addWaypoint(ch.inputCoord);

      ch.isVisible = true;
    }

    // Shuffle non-space chars and assign to rings capacity-first
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(nonSpaceChars);
    let charIdx = 0;
    for (const ring of this.rings) {
      const ringColor = this.config.ringColors[ring.index % this.config.ringColors.length];
      const coords = ring.clockwise ? ring.coords : ring.coordsReversed;

      for (let i = 0; i < ring.coords.length && charIdx < nonSpaceChars.length; i++, charIdx++) {
        const ch = nonSpaceChars[charIdx];
        ring.characters.push(ch);
        this.charRingMap.set(ch.id, ring);

        const charIndex = ring.characters.length - 1; // 0-based index in ring
        const finalColor = this.charFinalColorMap.get(ch.id)!;

        // Angular-offset ring path (looping)
        const pathId = `ring_${ch.id}`;
        const ringPath = ch.motion.newPath(pathId, { speed: ring.speed, loop: true });
        const startIdx = charIndex % coords.length;
        for (let j = 0; j < coords.length; j++) {
          ringPath.addWaypoint(coords[(startIdx + j) % coords.length]);
        }
        ring.charRingPathId.set(ch.id, pathId);
        ring.charRingStartCoord.set(ch.id, coords[startIdx]);

        // gradient scene: finalColor → ringColor (shown during spin approach)
        const gradientScene = ch.newScene("gradient", false);
        const gradientGrad = new Gradient([finalColor, ringColor], 8);
        gradientScene.applyGradientToSymbols(ch.inputSymbol, 3, gradientGrad);

        // disperse scene: ringColor → finalColor (shown during disperse and final return)
        const disperseScene = ch.newScene("disperse", false);
        const disperseGrad = new Gradient([ringColor, finalColor], 8);
        disperseScene.applyGradientToSymbols(ch.inputSymbol, 10, disperseGrad);
      }
      if (charIdx >= nonSpaceChars.length) break;
    }

    // Non-ring characters: external path (sent off-canvas)
    for (const ch of this.canvas.getCharacters()) {
      if (this.charRingMap.has(ch.id)) continue;
      const externalPath = ch.motion.newPath("external", { speed: 0.8, ease: outSine });
      externalPath.addWaypoint(this.canvas.randomCoord({ outsideScope: true }));
      this.nonRingChars.push(ch);
    }
  }

  private transitionToDisperse(): void {
    this.phase = "disperse";
    this.phaseFrames = 0;

    const isFirstDisperse = !this.initialDisperseComplete;
    if (isFirstDisperse) {
      this.initialDisperseComplete = true;
      for (const ch of this.nonRingChars) {
        ch.motion.activatePath("external");
        this.activeChars.add(ch);
      }
    } else {
      // Capture each ring char's current coord before switching paths (for condense target)
      for (const ring of this.rings) {
        for (const ch of ring.characters) {
          this.charLastRingCoord.set(ch.id, { ...ch.motion.currentCoord });
        }
      }
    }

    for (const ring of this.rings) {
      for (const ch of ring.characters) {
        // First disperse: origin = ring start coord; subsequent: origin = current coord (on ring)
        const origin = isFirstDisperse
          ? ring.charRingStartCoord.get(ch.id) ?? ch.motion.currentCoord
          : ch.motion.currentCoord;

        if (isFirstDisperse) {
          this.activeChars.add(ch);
        }

        // Looping 5-waypoint drift within gapPixels of origin
        const disperseCoords = findCoordsInRect(origin, this.gapPixels);
        if (disperseCoords.length === 0) continue;

        const dispersePathId = `disp_${ch.id}`;
        const dispersePath = ch.motion.newPath(dispersePathId, { speed: 0.14, loop: true });
        for (let i = 0; i < 5; i++) {
          dispersePath.addWaypoint(disperseCoords[Math.floor(Math.random() * disperseCoords.length)]);
        }

        if (isFirstDisperse) {
          // Glide quickly from home → first disperse waypoint, then start looping drift
          const initPathId = `init_${ch.id}`;
          const initPath = ch.motion.newPath(initPathId, { speed: 0.3, ease: outCubic });
          initPath.addWaypoint(dispersePath.waypoints[0].coord);
          ch.eventHandler.register("PATH_COMPLETE", initPathId, "ACTIVATE_PATH", dispersePathId);
          ch.motion.activatePath(initPathId);
        } else {
          ch.motion.activatePath(dispersePathId);
        }
        ch.activateScene("disperse");
      }
    }
  }

  private transitionToSpin(): void {
    this.phase = "spin";
    this.phaseFrames = 0;

    for (const ring of this.rings) {
      for (const ch of ring.characters) {
        const ringPathId = ring.charRingPathId.get(ch.id)!;
        const ringPath = ch.motion.paths.get(ringPathId)!;

        // Condense to last ring coord (or angular start on first spin), then event-chain to ring
        const condenseId = `cond_${this.pathCounter++}`;
        const condensePath = ch.motion.newPath(condenseId, 0.1);
        const condenseTgt = this.charLastRingCoord.get(ch.id) ?? ringPath.waypoints[0].coord;
        condensePath.addWaypoint(condenseTgt);
        ch.eventHandler.register("PATH_COMPLETE", condenseId, "ACTIVATE_PATH", ringPathId);
        ch.motion.activatePath(condenseId);
        ch.activateScene("gradient");
      }
    }
  }

  private transitionToFinal(): void {
    this.phase = "final";
    this.phaseFrames = 0;

    // All characters return home
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      ch.motion.activatePath("home");
      this.activeChars.add(ch);
    }

    // Ring chars show disperse scene (ringColor → finalColor) during return
    for (const ring of this.rings) {
      for (const ch of ring.characters) {
        ch.activateScene("disperse");
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
          if (!ch.isActive) {
            if (this.nonRingChars.includes(ch)) ch.isVisible = false;
            this.activeChars.delete(ch);
          }
        }
        if (this.phaseFrames >= this.config.disperseDuration) {
          this.transitionToSpin();
        }
        break;

      case "spin":
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            if (this.nonRingChars.includes(ch)) ch.isVisible = false;
            this.activeChars.delete(ch);
          }
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
