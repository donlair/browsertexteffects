import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutCirc } from "../easing";

export type SweepDirection = "left_to_right" | "right_to_left";

export interface SweepConfig {
  sweepSymbols: string[];
  firstSweepDirection: SweepDirection;
  secondSweepDirection: SweepDirection;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultSweepConfig: SweepConfig = {
  sweepSymbols: ["█", "▓", "▒", "░"],
  firstSweepDirection: "right_to_left",
  secondSweepDirection: "left_to_right",
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 8,
  finalGradientDirection: "vertical",
};

function randGray(): string {
  const v = Math.floor(Math.random() * 128) + 64;
  const hex = v.toString(16).padStart(2, "0");
  return `${hex}${hex}${hex}`;
}

export class SweepEffect {
  private canvas: Canvas;
  private config: SweepConfig;
  private phase: "reveal" | "color" | "done" = "reveal";
  private groups: EffectCharacter[][] = [];
  private currentStep = 0;
  private totalSteps = 0;
  private lastGroupIndex = -1;
  private activeChars: Set<EffectCharacter> = new Set();
  private colorMapping: Map<string, Color> = new Map();

  constructor(canvas: Canvas, config: SweepConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) ch.isVisible = true;
    }

    this.setupPhase1();
  }

  private getColumnGroups(direction: SweepDirection): EffectCharacter[][] {
    const colMap = new Map<number, EffectCharacter[]>();
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      if (!colMap.has(ch.inputCoord.column)) colMap.set(ch.inputCoord.column, []);
      colMap.get(ch.inputCoord.column)?.push(ch);
    }

    const sortedKeys = [...colMap.keys()].sort((a, b) =>
      direction === "left_to_right" ? a - b : b - a,
    );

    return sortedKeys.map((k) => colMap.get(k)!);
  }

  private setupPhase1(): void {
    this.groups = this.getColumnGroups(this.config.firstSweepDirection);
    this.currentStep = 0;
    this.totalSteps = this.groups.length * 3;
    this.lastGroupIndex = -1;

    // Build reveal scenes
    for (const group of this.groups) {
      for (const ch of group) {
        const scene = ch.newScene("reveal");
        for (const sym of this.config.sweepSymbols) {
          scene.addFrame(sym, 5, randGray());
        }
        scene.addFrame(ch.inputSymbol, 1, "808080");
      }
    }
  }

  private setupPhase2(): void {
    this.groups = this.getColumnGroups(this.config.secondSweepDirection);
    this.currentStep = 0;
    this.totalSteps = this.groups.length * 3;
    this.lastGroupIndex = -1;

    // Build color scenes
    for (const group of this.groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const colorGradient = new Gradient([this.config.finalGradientStops[0], finalColor], this.config.sweepSymbols.length + 1);

        const scene = ch.newScene("color");
        const colors = colorGradient.spectrum;
        for (let i = 0; i < this.config.sweepSymbols.length; i++) {
          const c = colors[Math.min(i, colors.length - 1)];
          scene.addFrame(this.config.sweepSymbols[i], 5, c.rgbHex);
        }
        scene.addFrame(ch.inputSymbol, 1, finalColor.rgbHex);
      }
    }
  }

  step(): boolean {
    if (this.phase === "done") return false;

    // Sequence easer: determine target group index
    this.currentStep++;
    const progress = inOutCirc(Math.min(this.currentStep / this.totalSteps, 1));
    const targetGroupIndex = Math.min(
      Math.floor(progress * this.groups.length),
      this.groups.length - 1,
    );

    // Activate newly reached groups
    for (let i = this.lastGroupIndex + 1; i <= targetGroupIndex; i++) {
      for (const ch of this.groups[i]) {
        if (this.phase === "reveal") {
          ch.isVisible = true;
          ch.activateScene("reveal");
        } else {
          ch.activateScene("color");
        }
        this.activeChars.add(ch);
      }
    }
    this.lastGroupIndex = targetGroupIndex;

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    // Check if phase is complete
    if (this.currentStep >= this.totalSteps && this.activeChars.size === 0) {
      if (this.phase === "reveal") {
        this.phase = "color";
        this.activeChars.clear();
        this.setupPhase2();
        return true;
      } else {
        this.phase = "done";
        return false;
      }
    }

    return true;
  }
}
