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
  beamGradientSteps: number;
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
  beamGradientSteps: 6,
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
  private frameCount = 0;
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
    const dimColor = adjustBrightness(config.beamGradientStops[config.beamGradientStops.length - 1], 0.3);
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection,
    );

    // Init all chars to dim state
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (!ch.isSpace) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: dimColor.rgbHex };
      }
    }

    // Build per-char scenes
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      const { column, row } = ch.inputCoord;
      const finalColor = colorMapping.get(coordKey(column, row)) ?? config.finalGradientStops[0];

      const rowScene = ch.newScene("beam_row");
      rowScene.applyGradientToSymbols(config.beamRowSymbols, config.beamGradientFrames, beamGradient);
      rowScene.addFrame(ch.inputSymbol, 4, dimColor.rgbHex);

      const colScene = ch.newScene("beam_column");
      colScene.applyGradientToSymbols(config.beamColumnSymbols, config.beamGradientFrames, beamGradient);
      colScene.addFrame(ch.inputSymbol, 4, dimColor.rgbHex);

      const brightenGrad = new Gradient([dimColor, finalColor], config.finalGradientSteps);
      const brightenScene = ch.newScene("brighten");
      brightenScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, brightenGrad);
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
    this.wipeGroups = sortedKeys.map((k) => diagMap.get(k)!);
  }

  step(): boolean {
    this.frameCount++;

    if (this.phase === "beams") {
      if (this.frameCount % this.config.beamDelay === 0 && this.pendingGroups.length > 0) {
        const batchSize = randInt(1, 5);
        for (let i = 0; i < batchSize && this.pendingGroups.length > 0; i++) {
          this.activeGroups.push(this.pendingGroups.shift()!);
        }
      }

      for (const group of this.activeGroups) {
        group.counter += group.speed;
        while (group.counter >= 1 && group.nextIdx < group.chars.length) {
          const ch = group.chars[group.nextIdx++];
          ch.activateScene(group.sceneId);
          this.activeChars.add(ch);
          group.counter -= 1;
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
