import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas, CanvasDimensions } from "../canvas";
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
  gridGradientStops: [color("CC00CC"), color("ffffff")],  // Python default: CC00CC
  gridGradientSteps: 12,
  gridGradientDirection: "diagonal",
  textGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  textGradientSteps: 12,
  textGradientDirection: "vertical",
  textGenerationSymbols: ["░", "▒", "▓"],
  maxActiveBlocks: 0.1,
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Matches Python's find_even_gap(): find the divisor closest to 20% of dimension
 * that divides `dimension - 2` evenly (or with remainder ≤ 1).
 */
function findEvenGap(dimension: number): number {
  const d = dimension - 2;
  if (d <= 0) return 0;
  const potential: number[] = [];
  for (let i = d; i > 4; i--) {
    if (d % i <= 1) potential.push(i);
  }
  if (potential.length === 0) return 4;
  const target = Math.floor(d / 5);
  return potential.reduce((best, g) => Math.abs(g - target) < Math.abs(best - target) ? g : best);
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
      span.style.width = `${Math.ceil(cellWidth)}px`;
      span.style.lineHeight = `${Math.round(cellHeight)}px`;
      span.textContent = symbol;
      const c = colorMapping.get(coordKey(col, row));
      if (c) span.style.color = `#${c.rgbHex}`;
      span.style.left = `${Math.round((col - 1) * cellWidth)}px`;
      span.style.top = `${Math.round((totalRows - row) * cellHeight)}px`;
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

  private _computeGaps(dims: CanvasDimensions): { rowGap: number; colGap: number } {
    let rowGap: number;
    let colGap: number;
    // Matches Python: if canvas.top > 2 * canvas.right (tall text), use row-primary gap
    if (dims.top > 2 * dims.right) {
      rowGap = findEvenGap(dims.top) + 1;
      colGap = rowGap * 2;
    } else {
      colGap = findEvenGap(dims.right) + 1;
      rowGap = Math.floor(colGap / 2);
    }
    return { rowGap: Math.max(1, rowGap), colGap: Math.max(1, colGap) };
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    // Grid gradient maps over full canvas bounds (matches Python: 1, top, 1, right)
    const gridGradient = new Gradient(config.gridGradientStops, config.gridGradientSteps);
    const gridColorMapping = gridGradient.buildCoordinateColorMapping(
      dims.bottom, dims.top, dims.left, dims.right,
      config.gridGradientDirection,
    );

    const textGradient = new Gradient(config.textGradientStops, config.textGradientSteps);
    this.textColorMapping = textGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.textGradientDirection,
    );
    this.textGradientSpectrum = textGradient.spectrum;

    const { rowGap, colGap } = this._computeGaps(dims);

    // Compute internal line positions (not including border positions)
    const internalRowLines: number[] = [];
    for (let r = dims.bottom + rowGap; r < dims.top; r += rowGap) {
      if (dims.top - r < 2) continue;
      internalRowLines.push(r);
    }
    const internalColLines: number[] = [];
    for (let c = dims.left + colGap; c < dims.right; c += colGap) {
      if (dims.right - c < 2) continue;
      internalColLines.push(c);
    }

    // Horizontal lines: border (bottom + top) + internal rows
    // Each spans full canvas width [left, right]
    for (const row of [dims.bottom, dims.top, ...internalRowLines]) {
      const positions: Array<{ col: number; row: number }> = [];
      for (let col = dims.left; col <= dims.right; col++) {
        positions.push({ col, row });
      }
      this.hLines.push(new GridLine(
        this.container, positions, config.gridRowSymbol,
        gridColorMapping, this.cellWidth, this.cellHeight, dims.top,
      ));
    }

    // Vertical lines: border (left + right) + internal cols
    // Span rows [bottom, top) exclusive of top (corners handled by h-lines), matching Python range(bottom, top)
    for (const col of [dims.left, dims.right, ...internalColLines]) {
      const positions: Array<{ col: number; row: number }> = [];
      for (let row = dims.bottom; row < dims.top; row++) {
        positions.push({ col, row });
      }
      this.vLines.push(new GridLine(
        this.container, positions, config.gridColumnSymbol,
        gridColorMapping, this.cellWidth, this.cellHeight, dims.top,
      ));
    }

    // Block boundaries: only internal lines divide blocks (borders are visual-only)
    // Ranges use [r1, r2) = left-closed, right-open — matching Python's range(prev, current)
    const rowBounds = [dims.bottom, ...internalRowLines, dims.top + 1];
    const colBounds = [dims.left, ...internalColLines, dims.right + 1];
    const allChars = [...this.canvas.getCharacters()];

    const blocks: EffectCharacter[][] = [];
    for (let ri = 0; ri < rowBounds.length - 1; ri++) {
      const r1 = rowBounds[ri];
      const r2 = rowBounds[ri + 1];
      for (let ci = 0; ci < colBounds.length - 1; ci++) {
        const c1 = colBounds[ci];
        const c2 = colBounds[ci + 1];
        const block = allChars.filter(
          ch =>
            ch.inputCoord.row >= r1 && ch.inputCoord.row < r2 &&
            ch.inputCoord.column >= c1 && ch.inputCoord.column < c2,
        );
        if (block.length > 0) blocks.push(block);
      }
    }
    shuffle(blocks);
    this.pendingBlocks = blocks;
    this.totalBlocks = blocks.length;

    // Build dissolve scenes: random 15-30 frames (matches Python's randint(15, 30))
    for (const ch of allChars) {
      const dissolveScene = ch.newScene("dissolve");
      const frameCount = randInt(15, 30);
      for (let i = 0; i < frameCount; i++) {
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
        // Tick all active characters first (matches Python: update() called after group pop)
        for (const ch of [...this.activeChars]) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }

        // At most one group per tick (matches Python behavior: single pop per __next__ call)
        const threshold = this.totalBlocks * this.config.maxActiveBlocks;
        if (this.activeBlockCount < threshold && this.pendingBlocks.length > 0) {
          const block = this.pendingBlocks.shift();
          if (block) this.activateBlock(block);
        }

        if (this.pendingBlocks.length === 0 && this.activeChars.size === 0 && this.activeBlockCount === 0) {
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

  // Reveal any non-space characters that were excluded from blocks (safety net)
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
