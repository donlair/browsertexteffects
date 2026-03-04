import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsInCircle, findCoordsOnCircle } from "../geometry";
import { outCubic } from "../easing";

export interface SwarmConfig {
  baseColors: Color[];
  flashColor: Color;
  swarmSize: number;
  swarmCoordination: number;
  swarmAreaCountRange: [number, number];
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSwarmConfig: SwarmConfig = {
  baseColors: [color("31a0d4")],
  flashColor: color("f2ea79"),
  swarmSize: 0.1,
  swarmCoordination: 0.80,
  swarmAreaCountRange: [2, 4],
  finalGradientStops: [color("31b900"), color("f0ff65")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "horizontal",
};

interface SwarmGroup {
  chars: EffectCharacter[];
  spawnCoord: Coord;
  activationDelay: number;
  activated: boolean;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class SwarmEffect {
  private canvas: Canvas;
  private config: SwarmConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private pendingSwarms: SwarmGroup[] = [];
  private charPathId: Map<number, string> = new Map();
  private frameCount = 0;
  private colorMapping: Map<string, Color> = new Map();
  private pathCounter = 0;

  constructor(canvas: Canvas, config: SwarmConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    const center: Coord = {
      column: Math.round((dims.left + dims.right) / 2),
      row: Math.round((dims.top + dims.bottom) / 2),
    };

    const canvasWidth = dims.right - dims.left + 1;
    const canvasHeight = dims.top - dims.bottom + 1;

    // Build final gradient color mapping
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Place swarm area centers on a circle that circumscribes the canvas.
    // findCoordsOnCircle doubles the x-distance, so halve the radius so that
    // at angle=0 the point lands near the canvas right edge.
    const areaCircleRadius = Math.round(Math.max(canvasWidth / 4, canvasHeight / 2));
    const numAreas = randInt(this.config.swarmAreaCountRange[0], this.config.swarmAreaCountRange[1]);
    const areaCenters = findCoordsOnCircle(center, areaCircleRadius, numAreas);
    if (areaCenters.length === 0) areaCenters.push(center);

    // Local scatter radius within each area
    const localRadius = Math.max(3, Math.round(Math.min(canvasWidth, canvasHeight) * 0.12));

    const areaLocalCoords: Map<string, Coord[]> = new Map();
    for (const ac of areaCenters) {
      const key = `${ac.column},${ac.row}`;
      const pts = findCoordsInCircle(ac, localRadius * 2);
      areaLocalCoords.set(key, pts.length > 0 ? pts : [ac]);
    }

    // Sort non-space chars bottom→top, right→left (matches Python ordering)
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()].sort((a, b) => {
      if (a.inputCoord.row !== b.inputCoord.row) return a.inputCoord.row - b.inputCoord.row;
      return b.inputCoord.column - a.inputCoord.column;
    });

    const swarmSize = Math.max(1, Math.round(nonSpaceChars.length * this.config.swarmSize));

    let swarmIdx = 0;
    for (let i = 0; i < nonSpaceChars.length; i += swarmSize) {
      const groupChars = nonSpaceChars.slice(i, i + swarmSize);
      const baseColor = this.config.baseColors[swarmIdx % this.config.baseColors.length];

      // Each swarm visits a sequence of area centers (shared for coordinated movement)
      const numVisits = randInt(this.config.swarmAreaCountRange[0], this.config.swarmAreaCountRange[1]);
      const sharedAreaSequence: Coord[] = [];
      for (let v = 0; v < numVisits; v++) {
        sharedAreaSequence.push(areaCenters[v % areaCenters.length]);
      }

      const spawnCoord = sharedAreaSequence[0];
      const swarm: SwarmGroup = {
        chars: groupChars,
        spawnCoord,
        activationDelay: swarmIdx * 12,
        activated: false,
      };

      for (const ch of groupChars) {
        // Flash scene (looping): pulse between base and flash color during swarming
        const flashScene = ch.newScene("flash", true);
        flashScene.addFrame(ch.inputSymbol, 3, baseColor.rgbHex);
        flashScene.addFrame(ch.inputSymbol, 2, this.config.flashColor.rgbHex);

        // Landing scene: gradient from flash color to final position color
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const lastStop = this.config.finalGradientStops[this.config.finalGradientStops.length - 1];
        const finalColor = this.colorMapping.get(key) ?? lastStop;
        const landScene = ch.newScene("land");
        const landGrad = new Gradient([this.config.flashColor, finalColor], this.config.finalGradientSteps);
        landScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, landGrad);

        // Build swarm path: visits each area (with 2 inner scatter movements), then home
        const pathId = `sw_${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, { speed: 0.35, ease: outCubic });

        for (const areaCenter of sharedAreaSequence) {
          // swarmCoordination controls how often a char follows the shared area vs. a random one
          const useShared = Math.random() < this.config.swarmCoordination;
          const effectiveCenter = useShared ? areaCenter : randItem(areaCenters);
          const akey = `${effectiveCenter.column},${effectiveCenter.row}`;
          const pts = areaLocalCoords.get(akey) ?? [effectiveCenter];

          path.addWaypoint(randItem(pts)); // arrive at area
          path.addWaypoint(randItem(pts)); // inner movement 1
          path.addWaypoint(randItem(pts)); // inner movement 2
        }

        path.addWaypoint(ch.inputCoord); // return home

        ch.eventHandler.register("PATH_COMPLETE", pathId, "ACTIVATE_SCENE", "land");
        this.charPathId.set(ch.id, pathId);
      }

      this.pendingSwarms.push(swarm);
      swarmIdx++;
    }

    // All characters start visible but blank; they appear when their swarm launches
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (ch.isSpace) continue;
      ch.currentVisual = { symbol: " ", fgColor: null };
    }
  }

  private launchSwarm(swarm: SwarmGroup): void {
    swarm.activated = true;
    for (const ch of swarm.chars) {
      ch.motion.setCoordinate(swarm.spawnCoord);
      ch.activateScene("flash");
      ch.motion.activatePath(this.charPathId.get(ch.id)!);
      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    this.frameCount++;

    for (const swarm of this.pendingSwarms) {
      if (!swarm.activated && this.frameCount >= swarm.activationDelay) {
        this.launchSwarm(swarm);
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    const allLaunched = this.pendingSwarms.every(s => s.activated);
    return !(allLaunched && this.activeChars.size === 0);
  }
}
