import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inQuad } from "../easing";

export type PourDirection = "up" | "down" | "left" | "right";

export interface PourConfig {
  pourDirection: PourDirection;
  pourSpeed: number;
  movementSpeed: number;
  gap: number;
  startingColor: Color;
  movementEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultPourConfig: PourConfig = {
  pourDirection: "down",
  pourSpeed: 2,
  movementSpeed: 0.5,
  gap: 1,
  startingColor: color("ffffff"),
  movementEasing: inQuad,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical",
};

export class PourEffect {
  private canvas: Canvas;
  private config: PourConfig;
  private pendingGroups: EffectCharacter[][] = [];
  private currentGroup: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private currentGap = 0;

  constructor(canvas: Canvas, config: PourConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Make spaces visible
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    const nonSpace = this.canvas.getNonSpaceCharacters();

    // Group by axis perpendicular to pour direction
    const isVertical = this.config.pourDirection === "down" || this.config.pourDirection === "up";
    const groupMap = new Map<number, EffectCharacter[]>();

    for (const ch of nonSpace) {
      const key = isVertical ? ch.inputCoord.row : ch.inputCoord.column;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)?.push(ch);
    }

    // Sort groups
    const sortedKeys = [...groupMap.keys()];
    if (this.config.pourDirection === "down") {
      // Fill bottom first: sort rows ascending (bottom=1 first)
      sortedKeys.sort((a, b) => a - b);
    } else if (this.config.pourDirection === "up") {
      // Fill top first: sort rows descending (top first)
      sortedKeys.sort((a, b) => b - a);
    } else if (this.config.pourDirection === "left") {
      // Fill left first: sort columns ascending
      sortedKeys.sort((a, b) => a - b);
    } else {
      // Fill right first: sort columns descending
      sortedKeys.sort((a, b) => b - a);
    }

    // Build groups with serpentine ordering
    const groups: EffectCharacter[][] = [];
    for (let i = 0; i < sortedKeys.length; i++) {
      let group = groupMap.get(sortedKeys[i]) ?? [];
      if (i % 2 === 1) {
        group = group.slice().reverse();
      }
      groups.push(group);
    }

    // Set up starting positions and paths
    for (const group of groups) {
      for (const ch of group) {
        let startCoord: { column: number; row: number };
        if (this.config.pourDirection === "down") {
          startCoord = { column: ch.inputCoord.column, row: dims.top };
        } else if (this.config.pourDirection === "up") {
          startCoord = { column: ch.inputCoord.column, row: dims.bottom };
        } else if (this.config.pourDirection === "left") {
          startCoord = { column: dims.right, row: ch.inputCoord.row };
        } else {
          startCoord = { column: dims.left, row: ch.inputCoord.row };
        }

        ch.motion.setCoordinate(startCoord);

        const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);

        // Gradient scene
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const scene = ch.newScene("gradient");
        const charGradient = new Gradient([this.config.startingColor, finalColor], this.config.finalGradientSteps);
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      }
    }

    this.pendingGroups = groups;
  }

  step(): boolean {
    if (this.pendingGroups.length === 0 && this.currentGroup.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Fetch next group when current is exhausted
    if (this.currentGroup.length === 0 && this.pendingGroups.length > 0) {
      const next = this.pendingGroups.shift();
      if (next) this.currentGroup = next;
    }

    // Activate chars from current group, applying gap between each batch (matches Python)
    if (this.currentGroup.length > 0) {
      if (this.currentGap === 0) {
        let activated = 0;
        while (this.currentGroup.length > 0 && activated < this.config.pourSpeed) {
          const ch = this.currentGroup.shift();
          if (!ch) break;
          ch.isVisible = true;
          ch.motion.activatePath("input_path");
          ch.activateScene("gradient");
          this.activeChars.add(ch);
          activated++;
        }
        this.currentGap = this.config.gap;
      } else {
        this.currentGap--;
      }
    }

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingGroups.length > 0 || this.currentGroup.length > 0 || this.activeChars.size > 0;
  }
}
