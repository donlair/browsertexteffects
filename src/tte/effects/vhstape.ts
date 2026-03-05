import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface VhstapeConfig {
  glitchLineChance: number;
  noiseChance: number;
  totalGlitchTime: number;
  maxGlitchLines: number;
  glitchShiftRange: [number, number];
  glitchLineDuration: number;
  glitchWaveHeight: number;
  glitchLineColors: Color[];
  glitchWaveColors: Color[];
  noiseColors: Color[];
  noiseDuration: number;
  noiseSymbols: string[];
  redrawLineDelay: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultVhstapeConfig: VhstapeConfig = {
  glitchLineChance: 0.05,
  noiseChance: 0.004,
  totalGlitchTime: 600,
  maxGlitchLines: 3,
  glitchShiftRange: [4, 25],
  glitchLineDuration: 10,
  glitchWaveHeight: 3,
  glitchLineColors: [
    color("ffffff"), color("ff0000"), color("00ff00"), color("0000ff"), color("ffffff"),
  ],
  glitchWaveColors: [
    color("ffffff"), color("ff0000"), color("00ff00"), color("0000ff"), color("ffffff"),
  ],
  noiseColors: [
    color("1e1e1f"), color("3c3b3d"), color("6d6c70"), color("a2a1a6"), color("cbc9cf"), color("ffffff"),
  ],
  noiseDuration: 30,
  noiseSymbols: ["#", "*", ".", ":"],
  redrawLineDelay: 4,
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface GlitchingLine {
  row: number;
  remainingFrames: number;
  shiftAmount: number;
  colorIndex: number;
}

export class VhstapeEffect {
  private canvas: Canvas;
  private config: VhstapeConfig;
  private phase: "glitch" | "noise" | "redraw" = "glitch";
  private frameCount = 0;

  private rowGroups: EffectCharacter[][] = [];
  private rowNumbers: number[] = [];
  private rowMap: Map<number, EffectCharacter[]> = new Map();

  private activeGlitchLines: GlitchingLine[] = [];
  private glitchWaveIndex = 0;
  private glitchWaveDirection = 1;

  private noiseFrameCount = 0;

  private redrawIndex = 0;
  private redrawDelay = 0;

  private colorMapping: Map<string, Color> = new Map();
  private allChars: EffectCharacter[] = [];

  constructor(canvas: Canvas, config: VhstapeConfig) {
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

    this.rowGroups = this.canvas.getCharactersGrouped("row");
    for (const group of this.rowGroups) {
      if (group.length > 0) {
        const rowNum = group[0].inputCoord.row;
        this.rowMap.set(rowNum, group);
        this.rowNumbers.push(rowNum);
      }
    }

    this.allChars = this.canvas.getCharacters();

    for (const ch of this.allChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];

      const redrawScene = ch.newScene("redraw");
      redrawScene.addFrame("█", 6, "ffffff");
      redrawScene.addFrame(ch.inputSymbol, 1, finalColor.rgbHex);

      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor.rgbHex };
    }
  }

  step(): boolean {
    this.frameCount++;

    if (this.phase === "glitch") {
      return this.stepGlitch();
    } else if (this.phase === "noise") {
      return this.stepNoise();
    } else {
      return this.stepRedraw();
    }
  }

  private stepGlitch(): boolean {
    // Update existing glitch lines
    for (let i = this.activeGlitchLines.length - 1; i >= 0; i--) {
      const gl = this.activeGlitchLines[i];
      gl.remainingFrames--;
      gl.colorIndex = (gl.colorIndex + 1) % this.config.glitchLineColors.length;

      if (gl.remainingFrames <= 0) {
        this.restoreRow(gl.row);
        this.activeGlitchLines.splice(i, 1);
      } else {
        this.applyGlitchToRow(gl.row, gl.shiftAmount, gl.colorIndex);
      }
    }

    // Maybe activate new glitch lines
    if (this.activeGlitchLines.length < this.config.maxGlitchLines) {
      if (Math.random() < this.config.glitchLineChance) {
        const activeRows = new Set(this.activeGlitchLines.map(gl => gl.row));
        const available = this.rowNumbers.filter(r => !activeRows.has(r));
        if (available.length > 0) {
          const row = available[Math.floor(Math.random() * available.length)];
          const [minShift, maxShift] = this.config.glitchShiftRange;
          const shift = randInt(minShift, maxShift) * (Math.random() < 0.5 ? 1 : -1);
          this.activeGlitchLines.push({
            row,
            remainingFrames: this.config.glitchLineDuration,
            shiftAmount: shift,
            colorIndex: Math.floor(Math.random() * this.config.glitchLineColors.length),
          });
        }
      }
    }

    // Advance glitch wave
    if (this.rowNumbers.length > 1) {
      const halfHeight = Math.floor(this.config.glitchWaveHeight / 2);
      const activeRows = new Set(this.activeGlitchLines.map(gl => gl.row));
      for (let offset = -halfHeight; offset <= halfHeight; offset++) {
        const idx = this.glitchWaveIndex + offset;
        if (idx >= 0 && idx < this.rowNumbers.length) {
          const rowNum = this.rowNumbers[idx];
          if (!activeRows.has(rowNum)) {
            const waveShift = randInt(1, 3) * (Math.random() < 0.5 ? 1 : -1);
            this.applyShiftToRow(rowNum, waveShift);
          }
        }
      }
      this.glitchWaveIndex += this.glitchWaveDirection;
      if (this.glitchWaveIndex >= this.rowNumbers.length || this.glitchWaveIndex < 0) {
        this.glitchWaveDirection *= -1;
        this.glitchWaveIndex += this.glitchWaveDirection * 2;
      }
    }

    // Rare full-canvas noise burst
    if (Math.random() < this.config.noiseChance) {
      this.applyNoiseToAll();
    }

    // Restore non-glitching rows
    const activeRows = new Set(this.activeGlitchLines.map(gl => gl.row));
    for (const rowNum of this.rowNumbers) {
      if (!activeRows.has(rowNum)) {
        this.restoreRow(rowNum);
      }
    }

    // Check phase transition
    if (this.frameCount >= this.config.totalGlitchTime) {
      for (const gl of this.activeGlitchLines) {
        this.restoreRow(gl.row);
      }
      this.activeGlitchLines = [];
      this.phase = "noise";
      this.noiseFrameCount = 0;
    }

    return true;
  }

  private stepNoise(): boolean {
    this.noiseFrameCount++;
    this.applyNoiseToAll();

    if (this.noiseFrameCount >= this.config.noiseDuration) {
      this.phase = "redraw";
      this.redrawIndex = 0;
      this.redrawDelay = 0;
    }

    return true;
  }

  private stepRedraw(): boolean {
    if (this.redrawIndex < this.rowNumbers.length) {
      if (this.redrawDelay <= 0) {
        const rowNum = this.rowNumbers[this.redrawIndex];
        const chars = this.rowMap.get(rowNum);
        if (chars) {
          for (const ch of chars) {
            ch.motion.setCoordinate(ch.inputCoord);
            ch.activateScene("redraw");
          }
        }
        this.redrawIndex++;
        this.redrawDelay = this.config.redrawLineDelay;
      } else {
        this.redrawDelay--;
      }
    }

    let anyActive = false;
    for (const ch of this.allChars) {
      ch.tick();
      if (ch.isActive) {
        anyActive = true;
      }
    }

    return anyActive || this.redrawIndex < this.rowNumbers.length;
  }

  private applyGlitchToRow(row: number, shiftAmount: number, colorIndex: number): void {
    const chars = this.rowMap.get(row);
    if (!chars) return;
    const glitchColor = this.config.glitchLineColors[colorIndex];
    for (const ch of chars) {
      ch.motion.setCoordinate({
        column: ch.inputCoord.column + shiftAmount,
        row: ch.inputCoord.row,
      });
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: glitchColor.rgbHex };
    }
  }

  private applyShiftToRow(row: number, shiftAmount: number): void {
    const chars = this.rowMap.get(row);
    if (!chars) return;
    for (const ch of chars) {
      ch.motion.setCoordinate({
        column: ch.inputCoord.column + shiftAmount,
        row: ch.inputCoord.row,
      });
    }
  }

  private restoreRow(row: number): void {
    const chars = this.rowMap.get(row);
    if (!chars) return;
    for (const ch of chars) {
      ch.motion.setCoordinate(ch.inputCoord);
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor.rgbHex };
    }
  }

  private applyNoiseToAll(): void {
    for (const ch of this.allChars) {
      const sym = this.config.noiseSymbols[
        Math.floor(Math.random() * this.config.noiseSymbols.length)
      ];
      const noiseColor = this.config.noiseColors[
        Math.floor(Math.random() * this.config.noiseColors.length)
      ];
      ch.currentVisual = { symbol: sym, fgColor: noiseColor.rgbHex };
    }
  }
}
