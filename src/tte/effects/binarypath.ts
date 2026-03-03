import { Color, GradientDirection, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { ParticleSystem } from "../particles";

export interface BinaryPathConfig {
  binaryColors: Color[];
  movementSpeed: number;
  activeBinaryGroups: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
  finalWipeSpeed: number;
}

export const defaultBinaryPathConfig: BinaryPathConfig = {
  binaryColors: [color("00ff41"), color("00cc33"), color("008f25")],
  movementSpeed: 0.5,
  activeBinaryGroups: 0.08,
  finalGradientStops: [color("ffffff"), color("00ff41")],
  finalGradientSteps: 12,
  finalGradientFrames: 2,
  finalGradientDirection: "radial",
  finalWipeSpeed: 2,
};

interface BinaryGroup {
  sourceChar: EffectCharacter;
  arrivedCount: number;
  isComplete: boolean;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class BinaryPathEffect {
  private canvas: Canvas;
  private config: BinaryPathConfig;
  private ps: ParticleSystem;
  private dimColor: Color;

  private pendingGroups: BinaryGroup[] = [];
  private activeGroups: Set<BinaryGroup> = new Set();
  private collapsingChars: Set<EffectCharacter> = new Set();
  private collapsedCount = 0;
  private totalNonSpaceChars = 0;
  private activeChars: Set<EffectCharacter> = new Set();
  private wipeGroups: EffectCharacter[][] = [];
  private wipeIdx = 0;
  private phase: "traveling" | "wipe" = "traveling";
  private colorMapping: Map<string, Color> = new Map();

  constructor(canvas: Canvas, config: BinaryPathConfig, container: HTMLElement) {
    this.canvas = canvas;
    this.config = config;
    this.dimColor = adjustBrightness(config.binaryColors[config.binaryColors.length - 1], 0.35);
    this.ps = new ParticleSystem(container, canvas.dims);
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    this.totalNonSpaceChars = nonSpaceChars.length;

    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (!ch.isSpace) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.dimColor.rgbHex };
      }
    }

    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];

      const collapseGrad = new Gradient([color("ffffff"), this.dimColor], 7);
      const collapseScene = ch.newScene("collapse");
      collapseScene.applyGradientToSymbols(ch.inputSymbol, 3, collapseGrad);

      ch.eventHandler.register("SCENE_COMPLETE", "collapse", "CALLBACK", {
        callback: (char: EffectCharacter) => {
          this.collapsingChars.delete(char);
          this.collapsedCount++;
        },
        args: [],
      });

      const brightenGrad = new Gradient([this.dimColor, finalColor], config.finalGradientSteps);
      const brightenScene = ch.newScene("brighten");
      brightenScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, brightenGrad);

      this.pendingGroups.push({ sourceChar: ch, arrivedCount: 0, isComplete: false });
    }

    shuffle(this.pendingGroups);

    // Diagonal wipe groups: key = row + column, descending → top-right first
    const diagMap = new Map<number, EffectCharacter[]>();
    for (const ch of nonSpaceChars) {
      const key = ch.inputCoord.row + ch.inputCoord.column;
      if (!diagMap.has(key)) diagMap.set(key, []);
      diagMap.get(key)!.push(ch);
    }
    const sortedKeys = [...diagMap.keys()].sort((a, b) => b - a);
    this.wipeGroups = sortedKeys.map((k) => diagMap.get(k)!);
  }

  private randomExteriorCoord(): { column: number; row: number } {
    const { dims } = this.canvas;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: // top
        return { column: Math.floor(Math.random() * (dims.right + 2)), row: dims.top + 1 };
      case 1: // right
        return { column: dims.right + 1, row: Math.floor(Math.random() * (dims.top + 2)) };
      case 2: // bottom
        return { column: Math.floor(Math.random() * (dims.right + 2)), row: 0 };
      default: // left
        return { column: 0, row: Math.floor(Math.random() * (dims.top + 2)) };
    }
  }

  private activateGroup(group: BinaryGroup): void {
    const { sourceChar } = group;
    const { config } = this;
    const target = sourceChar.inputCoord;
    const binaryStr = (sourceChar.inputSymbol.codePointAt(0)! & 0xFF).toString(2).padStart(8, "0");

    for (let i = 0; i < 8; i++) {
      const digit = binaryStr[i];
      const digitColor = config.binaryColors[Math.floor(Math.random() * config.binaryColors.length)].rgbHex;
      const startCoord = this.randomExteriorCoord();

      const pChar = this.ps.emit({
        symbol: digit,
        coord: startCoord,
        fgColor: digitColor,
        ttl: 9999,
      });

      const pathId = `bp_${pChar.id}`;
      const path = pChar.motion.newPath(pathId, { speed: config.movementSpeed });

      const horizontalFirst = Math.random() < 0.5;
      const corner = horizontalFirst
        ? { column: target.column, row: startCoord.row }
        : { column: startCoord.column, row: target.row };

      path.addWaypoint(corner);
      path.addWaypoint({ column: target.column, row: target.row });
      pChar.motion.activatePath(pathId);

      pChar.eventHandler.register("PATH_COMPLETE", pathId, "CALLBACK", {
        callback: (_digitChar: EffectCharacter) => {
          group.arrivedCount++;
          if (group.arrivedCount === 8) {
            group.isComplete = true;
            sourceChar.activateScene("collapse");
            this.collapsingChars.add(sourceChar);
          }
        },
        args: [],
      });
    }

    this.activeGroups.add(group);
  }

  step(): boolean {
    if (this.phase === "traveling") {
      const maxActive = Math.max(1, Math.round(this.totalNonSpaceChars * this.config.activeBinaryGroups));
      while (this.pendingGroups.length > 0 && this.activeGroups.size < maxActive) {
        this.activateGroup(this.pendingGroups.shift()!);
      }

      this.ps.tick();

      for (const group of this.activeGroups) {
        if (group.isComplete) this.activeGroups.delete(group);
      }

      for (const ch of [...this.collapsingChars]) {
        ch.tick();
      }

      if (
        this.pendingGroups.length === 0 &&
        this.activeGroups.size === 0 &&
        this.ps.count === 0 &&
        this.collapsedCount === this.totalNonSpaceChars
      ) {
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

    return !(this.phase === "wipe" && this.wipeIdx >= this.wipeGroups.length && this.activeChars.size === 0);
  }
}
