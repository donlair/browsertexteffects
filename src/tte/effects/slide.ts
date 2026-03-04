import { type Color, type Coord, type EasingFunction, type Grouping, color } from "../types";
import type { GradientDirection } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutQuad } from "../easing";

export interface SlideConfig {
  movementSpeed: number;
  grouping: Grouping;
  gap: number;
  reverseDirection: boolean;
  merge: boolean;
  movementEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSlideConfig: SlideConfig = {
  movementSpeed: 0.8,
  grouping: "row",
  gap: 2,
  reverseDirection: false,
  merge: false,
  movementEasing: inOutQuad,
  finalGradientStops: [color("833ab4"), color("fd1d1d"), color("fcb045")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical",
};

export class SlideEffect {
  private canvas: Canvas;
  private config: SlideConfig;
  private pendingGroups: EffectCharacter[][] = [];
  private activeGroups: EffectCharacter[][] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private currentGap = 0;

  constructor(canvas: Canvas, config: SlideConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom,
      dims.textTop,
      dims.textLeft,
      dims.textRight,
      this.config.finalGradientDirection,
    );

    const characterFinalColor = new Map<number, Color>();
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      characterFinalColor.set(ch.id, colorMapping.get(key) || this.config.finalGradientStops[0]);
    }

    // Make spaces visible immediately — they don't participate in animation
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }

    // Only group non-space characters for animation
    const groups = this.canvas.getCharactersGrouped(this.config.grouping, { includeSpaces: false });

    // Create input paths for all characters
    for (const group of groups) {
      for (const ch of group) {
        const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);
      }
    }

    // Set starting positions based on grouping
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];

      if (this.config.grouping === "row") {
        let startingColumn: number;
        if (this.config.merge && gi % 2 === 0) {
          startingColumn = dims.right + 1;
        } else {
          groups[gi] = groups[gi].slice().reverse();
          startingColumn = dims.left - 1;
        }
        if (this.config.reverseDirection && !this.config.merge) {
          groups[gi] = groups[gi].slice().reverse();
          startingColumn = dims.right + 1;
        }
        for (const ch of groups[gi]) {
          ch.motion.setCoordinate({ column: startingColumn, row: ch.inputCoord.row });
        }
      } else if (this.config.grouping === "column") {
        let startingRow: number;
        if (this.config.merge && gi % 2 === 0) {
          startingRow = dims.bottom - 1;
        } else {
          groups[gi] = groups[gi].slice().reverse();
          startingRow = dims.top + 1;
        }
        if (this.config.reverseDirection && !this.config.merge) {
          groups[gi] = groups[gi].slice().reverse();
          startingRow = dims.bottom - 1;
        }
        for (const ch of groups[gi]) {
          ch.motion.setCoordinate({ column: ch.inputCoord.column, row: startingRow });
        }
      } else if (this.config.grouping === "diagonal") {
        const lastChar = group[group.length - 1];
        const distFromBottom = lastChar.inputCoord.row - (dims.bottom - 1);
        let startingCoord: Coord = {
          column: lastChar.inputCoord.column - distFromBottom,
          row: lastChar.inputCoord.row - distFromBottom,
        };

        if (this.config.merge && gi % 2 === 0) {
          groups[gi] = groups[gi].slice().reverse();
          const firstChar = group[0];
          const distFromTop = (dims.top + 1) - firstChar.inputCoord.row;
          startingCoord = {
            column: firstChar.inputCoord.column + distFromTop,
            row: firstChar.inputCoord.row + distFromTop,
          };
        }
        if (this.config.reverseDirection && !this.config.merge) {
          groups[gi] = groups[gi].slice().reverse();
          const firstChar = group[0];
          const distFromTop = (dims.top + 1) - firstChar.inputCoord.row;
          startingCoord = {
            column: firstChar.inputCoord.column + distFromTop,
            row: firstChar.inputCoord.row + distFromTop,
          };
        }

        for (const ch of groups[gi]) {
          ch.motion.setCoordinate(startingCoord);
        }
      }

      // Create gradient animation for each character
      for (const ch of group) {
        const charFinalColor = characterFinalColor.get(ch.id) || this.config.finalGradientStops[0];
        const scene = ch.newScene("gradient");
        const charGradient = new Gradient(
          [this.config.finalGradientStops[0], charFinalColor],
          10,
        );
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
        ch.activateScene(scene);
      }
    }

    this.pendingGroups = groups;
  }

  step(): boolean {
    if (this.pendingGroups.length === 0 && this.activeChars.size === 0 && this.activeGroups.length === 0) {
      return false;
    }

    if (this.pendingGroups.length > 0) {
      if (this.currentGap >= this.config.gap) {
        this.activeGroups.push(this.pendingGroups.shift()!);
        this.currentGap = 0;
      } else {
        this.currentGap++;
      }
    }

    for (const group of this.activeGroups) {
      if (group.length > 0) {
        const ch = group.shift()!;
        ch.isVisible = true;
        ch.motion.activatePath("input_path");
        this.activeChars.add(ch);
      }
    }
    this.activeGroups = this.activeGroups.filter((g) => g.length > 0);

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingGroups.length > 0 || this.activeChars.size > 0 || this.activeGroups.length > 0;
  }
}
