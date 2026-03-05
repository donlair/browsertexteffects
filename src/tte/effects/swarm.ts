import { type Color, type GradientDirection, color } from "../types";
import type { Coord } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsOnCircle, findCoordsInCircle } from "../geometry";
import { outSine, inOutSine, inOutQuad } from "../easing";

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
  /** `N_swarm_area` path IDs in launch order */
  areaPathIds: string[];
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class SwarmEffect {
  private canvas: Canvas;
  private config: SwarmConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private pendingSwarms: SwarmGroup[] = [];
  private currentSwarm: SwarmGroup | null = null;
  /** When true, pop the next swarm on the next step() call (matches Python call_next). */
  private callNext = true;
  /** Highest area index any char in currentSwarm has reached (for coordination). */
  private currentGroupAreaIndex = 0;
  private colorMapping: Map<string, Color> = new Map();

  constructor(canvas: Canvas, config: SwarmConfig) {
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

    // Sort non-space chars bottom→top, right→left (matches Python BOTTOM_TO_TOP_RIGHT_TO_LEFT)
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()].sort((a, b) => {
      if (a.inputCoord.row !== b.inputCoord.row) return a.inputCoord.row - b.inputCoord.row;
      return b.inputCoord.column - a.inputCoord.column;
    });

    const swarmSize = Math.max(1, Math.round(nonSpaceChars.length * this.config.swarmSize));
    const swarms = this.makeSwarms(nonSpaceChars, swarmSize);

    // Canvas radius (matches Python: max(min(canvas.right, canvas.top) // 2, 1))
    const canvasRadius = Math.max(Math.floor(Math.min(dims.right, dims.top) / 2), 1);
    // Local scatter radius (matches Python: max(min(canvas.right, canvas.top) // 6, 1) * 2)
    const localRadius = Math.max(Math.floor(Math.min(dims.right, dims.top) / 6), 1) * 2;

    for (let swarmIdx = 0; swarmIdx < swarms.length; swarmIdx++) {
      const groupChars = swarms[swarmIdx];
      // Python uses random.choice(config.base_color) — pick randomly, not cyclically
      const baseColor = randItem(this.config.baseColors);

      // One spawn coord outside canvas per swarm (matches Python random_coord(outside_scope=True))
      const swarmSpawn = this.canvas.randomCoord({ outsideScope: true });

      // Build area coordinate map chained from swarmSpawn (matches Python's while loop).
      // areaCoordMap[i] = local coords around the i-th focus (starting from swarmSpawn).
      const areaCoordMap: Coord[][] = [];
      const areaPathIds: string[] = [];
      let lastFocus: Coord = swarmSpawn;

      const areaCount = Math.floor(
        Math.random() * (this.config.swarmAreaCountRange[1] - this.config.swarmAreaCountRange[0] + 1),
      ) + this.config.swarmAreaCountRange[0];

      while (areaCoordMap.length < areaCount) {
        // Find next area center on a circle from lastFocus, preferring in-canvas coords
        const candidates = shuffle(findCoordsOnCircle(lastFocus, canvasRadius));
        let nextFocus: Coord = this.canvas.randomCoord();
        for (const c of candidates) {
          if (this.canvas.coordIsInCanvas(c)) {
            nextFocus = c;
            break;
          }
        }
        // Local coords around lastFocus (not nextFocus) — matches Python's map ordering
        const localCoords = findCoordsInCircle(lastFocus, localRadius);
        areaCoordMap.push(localCoords.length > 0 ? localCoords : [lastFocus]);
        areaPathIds.push(`${areaCoordMap.length - 1}_swarm_area`);
        lastFocus = nextFocus;
      }

      // Build flash gradient mirror (matches Python's swarm_gradient_mirror):
      // base→flash (7 steps) + 10 flash frames + flash→base reversed
      const swarmGrad = new Gradient([baseColor, this.config.flashColor], 7);
      const flashMirror: Color[] = [
        ...swarmGrad.spectrum,
        ...Array(10).fill(this.config.flashColor),
        ...swarmGrad.spectrum.slice().reverse(),
      ];

      for (const ch of groupChars) {
        // Flash scene: gradient mirror, 1 tick per frame, NOT looping (matches Python)
        const flashScene = ch.newScene("flash", false);
        for (const c of flashMirror) {
          flashScene.addFrame(ch.inputSymbol, 1, c.rgbHex);
        }

        // Landing scene: flash→final gradient, 3 ticks per frame (matches Python steps=10)
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const lastStop = this.config.finalGradientStops[this.config.finalGradientStops.length - 1];
        const finalColor = this.colorMapping.get(key) ?? lastStop;
        const landGrad = new Gradient([this.config.flashColor, finalColor], 10);
        const landScene = ch.newScene("land");
        for (const c of landGrad.spectrum) {
          landScene.addFrame(ch.inputSymbol, 3, c.rgbHex);
        }

        // Build per-area paths: outer (speed 0.4, outSine) + 2 inner (speed 0.18, inOutSine)
        // Chained via ACTIVATE_PATH events (replaces Python's chain_paths).
        for (let areaIdx = 0; areaIdx < areaCoordMap.length; areaIdx++) {
          const localCoords = areaCoordMap[areaIdx];
          const areaPathId = areaPathIds[areaIdx];

          // Outer path — entry to area
          const outerPath = ch.motion.newPath(areaPathId, { speed: 0.4, ease: outSine });
          outerPath.addWaypoint(randItem(localCoords));

          // Outer path events (matches Python)
          ch.eventHandler.register("PATH_ACTIVATED", areaPathId, "ACTIVATE_SCENE", "flash");
          ch.eventHandler.register("PATH_ACTIVATED", areaPathId, "SET_LAYER", 1);
          ch.eventHandler.register("PATH_COMPLETE", areaPathId, "DEACTIVATE_SCENE");
          ch.eventHandler.register("PATH_COMPLETE", areaPathId, "ACTIVATE_PATH", `inner_${areaIdx}_0`);

          // Inner path 0
          const inner0Id = `inner_${areaIdx}_0`;
          const inner0 = ch.motion.newPath(inner0Id, { speed: 0.18, ease: inOutSine });
          inner0.addWaypoint(randItem(localCoords));
          ch.eventHandler.register("PATH_COMPLETE", inner0Id, "ACTIVATE_PATH", `inner_${areaIdx}_1`);

          // Inner path 1 — chains to next area or input_path
          const inner1Id = `inner_${areaIdx}_1`;
          const inner1 = ch.motion.newPath(inner1Id, { speed: 0.18, ease: inOutSine });
          inner1.addWaypoint(randItem(localCoords));
          const nextPathId = areaIdx + 1 < areaCoordMap.length
            ? areaPathIds[areaIdx + 1]
            : "input_path";
          ch.eventHandler.register("PATH_COMPLETE", inner1Id, "ACTIVATE_PATH", nextPathId);
        }

        // Landing path — returns character to its input coordinate
        const inputPath = ch.motion.newPath("input_path", { speed: 0.45, ease: inOutQuad });
        inputPath.addWaypoint(ch.inputCoord);

        // Landing path events (matches Python)
        ch.eventHandler.register("PATH_ACTIVATED", "input_path", "ACTIVATE_SCENE", "flash");
        ch.eventHandler.register("PATH_COMPLETE", "input_path", "ACTIVATE_SCENE", "land");
        ch.eventHandler.register("PATH_COMPLETE", "input_path", "SET_LAYER", 0);
      }

      this.pendingSwarms.push({ chars: groupChars, spawnCoord: swarmSpawn, areaPathIds });
    }

    // All characters start hidden; they become visible when their swarm launches
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }
  }

  /**
   * Chunk characters into swarms and merge a small final swarm into the previous one.
   * Matches Python SwarmIterator.make_swarms().
   */
  private makeSwarms(chars: EffectCharacter[], swarmSize: number): EffectCharacter[][] {
    // Python pops from end of BOTTOM_TO_TOP_RIGHT_TO_LEFT list → top chars first
    const remaining = [...chars]; // sorted ascending row, descending col within row
    const swarms: EffectCharacter[][] = [];
    while (remaining.length > 0) {
      const newSwarm: EffectCharacter[] = [];
      for (let i = 0; i < swarmSize && remaining.length > 0; i++) {
        const ch = remaining.pop();
        if (ch) newSwarm.push(ch);
      }
      swarms.push(newSwarm);
    }
    // Merge final swarm into previous if it's smaller than half the swarm size
    if (swarms.length >= 2) {
      const finalSwarm = swarms[swarms.length - 1];
      if (finalSwarm.length < Math.floor(swarmSize / 2)) {
        swarms.pop();
        swarms[swarms.length - 1].push(...finalSwarm);
      }
    }
    return swarms;
  }

  private launchSwarm(swarm: SwarmGroup): void {
    for (const ch of swarm.chars) {
      ch.isVisible = true;
      ch.motion.setCoordinate(swarm.spawnCoord);
      ch.motion.activatePath(swarm.areaPathIds[0]);
      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    // Pop and launch the next swarm when ready (matches Python call_next logic)
    if (this.pendingSwarms.length > 0 && this.callNext) {
      this.callNext = false;
      // Python pops from end (last swarm = last built = bottom chars first)
      const swarm = this.pendingSwarms.pop();
      if (swarm) {
        this.currentSwarm = swarm;
        this.currentGroupAreaIndex = 0;
        this.launchSwarm(this.currentSwarm);
      }
    }

    if (this.currentSwarm !== null) {
      // When the total active character count drops below the current swarm size,
      // trigger the next swarm launch. Matches Python: len(active_characters) < len(current_swarm).
      if (this.activeChars.size < this.currentSwarm.chars.length) {
        this.callNext = true;
      }

      // Dynamic coordination: if any char advances to a higher area, push others there.
      // Matches Python's per-tick coordination logic in SwarmIterator.__next__().
      for (const ch of this.currentSwarm.chars) {
        const pathId = ch.motion.activePath?.id;
        if (pathId?.includes("_swarm_area")) {
          const areaIdx = parseInt(pathId.split("_swarm_area")[0], 10);
          if (areaIdx > this.currentGroupAreaIndex) {
            this.currentGroupAreaIndex = areaIdx;
            for (const other of this.currentSwarm.chars) {
              if (other !== ch && Math.random() < this.config.swarmCoordination) {
                const path = other.motion.paths.get(pathId);
                if (path) other.motion.activatePath(path);
              }
            }
            break; // Only handle one leader per tick (matches Python's break)
          }
        }
      }
    }

    // Tick all active characters
    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingSwarms.length > 0 || this.activeChars.size > 0;
  }
}
