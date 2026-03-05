import { type Color, type GradientDirection, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface BeamsConfig {
  beamRowSymbols: string[];
  beamColumnSymbols: string[];
  beamDelay: number;
  beamRowSpeed: [number, number];
  beamColumnSpeed: [number, number];
  beamGradientStops: Color[];
  beamGradientSteps: number | number[];
  beamGradientFrames: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
  finalWipeSpeed: number;
}

export const defaultBeamsConfig: BeamsConfig = {
  beamRowSymbols: ["▂", "▁", "_"],
  beamColumnSymbols: ["▌", "▍", "▎", "▏"],
  beamDelay: 6,
  beamRowSpeed: [1.5, 6.0],
  beamColumnSpeed: [0.9, 1.5],
  beamGradientStops: [color("ffffff"), color("00D1FF"), color("8A008A")],
  beamGradientSteps: [2, 6],
  beamGradientFrames: 2,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical",
  finalWipeSpeed: 3,
};

interface BeamGroup {
  chars: EffectCharacter[];
  sceneId: "beam_row" | "beam_column";
  speed: number;
  counter: number;
  nextIdx: number;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class BeamsEffect {
  private canvas: Canvas;
  private config: BeamsConfig;
  private phase: "beams" | "wipe" = "beams";
  private beamDelay = 0; // counts down; launch when 0
  private pendingGroups: BeamGroup[] = [];
  private activeGroups: BeamGroup[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private wipeGroups: EffectCharacter[][] = [];
  private wipeIdx = 0;

  constructor(canvas: Canvas, config: BeamsConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    // Build gradients
    const beamGradient = new Gradient(config.beamGradientStops, config.beamGradientSteps);
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection,
    );

    // Build per-char scenes; chars start invisible (visible when beam hits)
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      const { column, row } = ch.inputCoord;
      const finalColor = colorMapping.get(coordKey(column, row)) ?? config.finalGradientStops[0];
      const dimColor = adjustBrightness(finalColor, 0.3);
      const fadeGradient = new Gradient([finalColor, dimColor], 10);
      const brightenGradient = new Gradient([dimColor, finalColor], 10);

      const rowScene = ch.newScene("beam_row");
      rowScene.applyGradientToSymbols(config.beamRowSymbols, config.beamGradientFrames, beamGradient);
      rowScene.applyGradientToSymbols(ch.inputSymbol, 2, fadeGradient);

      const colScene = ch.newScene("beam_column");
      colScene.applyGradientToSymbols(config.beamColumnSymbols, config.beamGradientFrames, beamGradient);
      colScene.applyGradientToSymbols(ch.inputSymbol, 2, fadeGradient);

      const brightenScene = ch.newScene("brighten");
      brightenScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, brightenGradient);
    }

    // Build row beam groups
    const allBeamGroups: BeamGroup[] = [];
    for (const chars of this.canvas.getCharactersGrouped("row", { includeSpaces: false })) {
      const sorted = [...chars].sort((a, b) => a.inputCoord.column - b.inputCoord.column);
      if (Math.random() < 0.5) sorted.reverse();
      allBeamGroups.push({
        chars: sorted,
        sceneId: "beam_row",
        speed: randRange(config.beamRowSpeed[0], config.beamRowSpeed[1]),
        counter: 0,
        nextIdx: 0,
      });
    }

    // Build column beam groups
    for (const chars of this.canvas.getCharactersGrouped("column", { includeSpaces: false })) {
      const sorted = [...chars].sort((a, b) => a.inputCoord.row - b.inputCoord.row);
      if (Math.random() < 0.5) sorted.reverse();
      allBeamGroups.push({
        chars: sorted,
        sceneId: "beam_column",
        speed: randRange(config.beamColumnSpeed[0], config.beamColumnSpeed[1]),
        counter: 0,
        nextIdx: 0,
      });
    }

    shuffle(allBeamGroups);
    this.pendingGroups = allBeamGroups;

    // Build diagonal wipe groups (top-left → bottom-right via column - row key)
    const diagMap = new Map<number, EffectCharacter[]>();
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      const key = ch.inputCoord.column - ch.inputCoord.row;
      if (!diagMap.has(key)) diagMap.set(key, []);
      diagMap.get(key)?.push(ch);
    }
    const sortedKeys = [...diagMap.keys()].sort((a, b) => a - b);
    this.wipeGroups = sortedKeys.map((k) => diagMap.get(k) ?? []);
  }

  step(): boolean {
    if (this.phase === "beams") {
      // Launch first batch immediately (beamDelay=0 initially), then every beamDelay ticks
      if (this.beamDelay === 0) {
        if (this.pendingGroups.length > 0) {
          const batchSize = randInt(1, 5);
          for (let i = 0; i < batchSize && this.pendingGroups.length > 0; i++) {
            const group = this.pendingGroups.shift();
            if (group) this.activeGroups.push(group);
          }
          this.beamDelay = this.config.beamDelay;
        }
      } else {
        this.beamDelay--;
      }

      for (const group of this.activeGroups) {
        group.counter += group.speed;
        // Python only advances when int(counter) > 1 (i.e. counter >= 2.0),
        // consuming int(counter) characters per tick then subtracting 1 per char.
        const steps = Math.floor(group.counter);
        if (steps > 1) {
          for (let s = 0; s < steps && group.nextIdx < group.chars.length; s++) {
            const ch = group.chars[group.nextIdx++];
            ch.isVisible = true;
            ch.activateScene(group.sceneId);
            this.activeChars.add(ch);
            group.counter -= 1;
          }
        }
      }
      this.activeGroups = this.activeGroups.filter((g) => g.nextIdx < g.chars.length);

      if (this.pendingGroups.length === 0 && this.activeGroups.length === 0 && this.activeChars.size === 0) {
        this.phase = "wipe";
      }
    }

    if (this.phase === "wipe") {
      const end = Math.min(this.wipeIdx + this.config.finalWipeSpeed, this.wipeGroups.length);
      for (let i = this.wipeIdx; i < end; i++) {
        for (const ch of this.wipeGroups[i]) {
          ch.isVisible = true;
          ch.activateScene("brighten");
          this.activeChars.add(ch);
        }
      }
      this.wipeIdx = end;
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) this.activeChars.delete(ch);
    }

    return (
      this.pendingGroups.length > 0 ||
      this.activeGroups.length > 0 ||
      this.activeChars.size > 0 ||
      this.wipeIdx < this.wipeGroups.length
    );
  }
}
