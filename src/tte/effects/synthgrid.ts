import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface SynthGridConfig {
  gridRowSymbol: string;
  gridColumnSymbol: string;
  gridGradientStops: Color[];
  gridGradientSteps: number;
  gridGradientDirection: GradientDirection;
  textGradientStops: Color[];
  textGradientSteps: number;
  textGradientDirection: GradientDirection;
  textGenerationSymbols: string[];
  maxActiveBlocks: number;
}

export const defaultSynthGridConfig: SynthGridConfig = {
  gridRowSymbol: "─",
  gridColumnSymbol: "│",
  gridGradientStops: [color("ff00ff"), color("ffffff")],
  gridGradientSteps: 12,
  gridGradientDirection: "diagonal",
  textGradientStops: [color("8f00ff"), color("00ffff"), color("ffffff")],
  textGradientSteps: 12,
  textGradientDirection: "vertical",
  textGenerationSymbols: ["░", "▒", "▓"],
  maxActiveBlocks: 0.1,
};

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const LINE_HEIGHT = 1.2;

class GridLine {
  private spans: HTMLSpanElement[] = [];
  visibleCount = 0;

  constructor(
    container: HTMLElement,
    positions: Array<{ col: number; row: number }>,
    symbol: string,
    colorMapping: Map<string, Color>,
    cellWidth: number,
    cellHeight: number,
    totalRows: number,
  ) {
    for (const { col, row } of positions) {
      const span = document.createElement("span");
      span.style.position = "absolute";
      span.style.visibility = "hidden";
      span.style.lineHeight = `${LINE_HEIGHT}em`;
      span.textContent = symbol;
      const c = colorMapping.get(coordKey(col, row));
      if (c) span.style.color = `#${c.rgbHex}`;
      span.style.left = `${(col - 1) * cellWidth}px`;
      span.style.top = `${(totalRows - row) * cellHeight}px`;
      container.appendChild(span);
      this.spans.push(span);
    }
  }

  extend(n: number): void {
    const target = Math.min(this.visibleCount + n, this.spans.length);
    for (let i = this.visibleCount; i < target; i++) {
      this.spans[i].style.visibility = "visible";
    }
    this.visibleCount = target;
  }

  collapse(n: number): void {
    const target = Math.max(this.visibleCount - n, 0);
    for (let i = target; i < this.visibleCount; i++) {
      this.spans[i].style.visibility = "hidden";
    }
    this.visibleCount = target;
  }

  get fullyExtended(): boolean {
    return this.visibleCount === this.spans.length;
  }

  get fullyCollapsed(): boolean {
    return this.visibleCount === 0;
  }

  dispose(): void {
    for (const span of this.spans) {
      span.remove();
    }
    this.spans = [];
  }
}

type Phase = "grid_expand" | "add_chars" | "collapse" | "complete";

export class SynthGridEffect {
  private canvas: Canvas;
  private config: SynthGridConfig;
  private container: HTMLElement;
  private phase: Phase = "grid_expand";
  private hLines: GridLine[] = [];
  private vLines: GridLine[] = [];
  private pendingBlocks: EffectCharacter[][] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private activeBlockCount = 0;
  private totalBlocks = 0;
  private textColorMapping: Map<string, Color> = new Map();
  private textGradientSpectrum: Color[] = [];
  private cellWidth = 0;
  private cellHeight = 0;

  constructor(canvas: Canvas, config: SynthGridConfig, container: HTMLElement) {
    this.canvas = canvas;
    this.config = config;
    this.container = container;
    this._measureCell();
    this.build();
  }

  private _measureCell(): void {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.lineHeight = `${LINE_HEIGHT}em`;
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidth = rect.width;
    this.cellHeight = rect.height;
    this.container.removeChild(probe);
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const textGradient = new Gradient(config.textGradientStops, config.textGradientSteps);
    this.textColorMapping = textGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.textGradientDirection,
    );
    this.textGradientSpectrum = textGradient.spectrum;

    const gridGradient = new Gradient(config.gridGradientStops, config.gridGradientSteps);
    const gridColorMapping = gridGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.gridGradientDirection,
    );

    const longestDim = Math.max(dims.textRight, dims.textTop);
    const gap = Math.max(2, Math.round(longestDim * 0.2));

    const rowLines: number[] = [];
    for (let r = gap; r <= dims.textTop; r += gap) rowLines.push(r);
    const colLines: number[] = [];
    for (let c = gap; c <= dims.textRight; c += gap) colLines.push(c);

    for (const row of rowLines) {
      const positions: Array<{ col: number; row: number }> = [];
      for (let col = dims.textLeft; col <= dims.textRight; col++) {
        positions.push({ col, row });
      }
      this.hLines.push(new GridLine(
        this.container, positions, config.gridRowSymbol,
        gridColorMapping, this.cellWidth, this.cellHeight, dims.top,
      ));
    }

    for (const col of colLines) {
      const positions: Array<{ col: number; row: number }> = [];
      for (let row = dims.textTop; row >= dims.textBottom; row--) {
        positions.push({ col, row });
      }
      this.vLines.push(new GridLine(
        this.container, positions, config.gridColumnSymbol,
        gridColorMapping, this.cellWidth, this.cellHeight, dims.top,
      ));
    }

    const rowBounds = [0, ...rowLines, dims.textTop + 1];
    const colBounds = [0, ...colLines, dims.textRight + 1];
    const nonSpaceChars = this.canvas.getNonSpaceCharacters();

    const blocks: EffectCharacter[][] = [];
    for (let ri = 0; ri < rowBounds.length - 1; ri++) {
      const r1 = rowBounds[ri];
      const r2 = rowBounds[ri + 1];
      for (let ci = 0; ci < colBounds.length - 1; ci++) {
        const c1 = colBounds[ci];
        const c2 = colBounds[ci + 1];
        const block = nonSpaceChars.filter(
          ch =>
            ch.inputCoord.row > r1 && ch.inputCoord.row < r2 &&
            ch.inputCoord.column > c1 && ch.inputCoord.column < c2,
        );
        if (block.length > 0) blocks.push(block);
      }
    }
    shuffle(blocks);
    this.pendingBlocks = blocks;
    this.totalBlocks = blocks.length;

    for (const ch of nonSpaceChars) {
      const dissolveScene = ch.newScene("dissolve");
      for (let i = 0; i < 20; i++) {
        const sym = config.textGenerationSymbols[
          Math.floor(Math.random() * config.textGenerationSymbols.length)
        ];
        const paletteColor = this.textGradientSpectrum[
          Math.floor(Math.random() * this.textGradientSpectrum.length)
        ];
        dissolveScene.addFrame(sym, 2, paletteColor.rgbHex);
      }
      const finalColor = this.textColorMapping.get(coordKey(ch.inputCoord.column, ch.inputCoord.row));
      dissolveScene.addFrame(ch.inputSymbol, 1, finalColor?.rgbHex ?? null);
    }
  }

  private activateBlock(block: EffectCharacter[]): void {
    this.activeBlockCount++;
    let remaining = block.length;
    for (const ch of block) {
      ch.isVisible = true;
      ch.eventHandler.register("SCENE_COMPLETE", "dissolve", "CALLBACK", {
        callback: (_char: EffectCharacter) => {
          remaining--;
          if (remaining === 0) this.activeBlockCount--;
        },
        args: [],
      });
      ch.activateScene("dissolve");
      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    switch (this.phase) {
      case "grid_expand": {
        for (const line of this.hLines) line.extend(3);
        for (const line of this.vLines) line.extend(1);
        if (
          this.hLines.every(l => l.fullyExtended) &&
          this.vLines.every(l => l.fullyExtended)
        ) {
          this.phase = "add_chars";
        }
        break;
      }

      case "add_chars": {
        const maxConcurrent = Math.max(1, Math.ceil(this.config.maxActiveBlocks * this.totalBlocks));

        for (const ch of [...this.activeChars]) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }

        while (this.activeBlockCount < maxConcurrent && this.pendingBlocks.length > 0) {
          this.activateBlock(this.pendingBlocks.shift()!);
        }

        if (this.pendingBlocks.length === 0 && this.activeChars.size === 0) {
          this._revealGridLineChars();
          this.phase = "collapse";
        }
        break;
      }

      case "collapse": {
        for (const line of this.hLines) line.collapse(3);
        for (const line of this.vLines) line.collapse(1);
        if (
          this.hLines.every(l => l.fullyCollapsed) &&
          this.vLines.every(l => l.fullyCollapsed)
        ) {
          for (const line of [...this.hLines, ...this.vLines]) line.dispose();
          this.hLines = [];
          this.vLines = [];
          this.phase = "complete";
        }
        break;
      }

      case "complete":
        return false;
    }

    return true;
  }

  // Reveal any non-space characters that were excluded from blocks (on grid lines)
  private _revealGridLineChars(): void {
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      if (!ch.isVisible) {
        ch.isVisible = true;
        const finalColor = this.textColorMapping.get(
          coordKey(ch.inputCoord.column, ch.inputCoord.row),
        );
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor?.rgbHex ?? null };
      }
    }
  }
}
