import { EffectCharacter } from "./character";
import { Canvas } from "./canvas";

interface SpanState {
  span: HTMLSpanElement;
  lastSymbol: string;
  lastColor: string | null;
  lastOpacity: string;
  lastTransform: string;
}

export class DOMRenderer {
  private container: HTMLElement;
  private canvas: Canvas;
  private spanStates: Map<number, SpanState> = new Map();
  private preMode: boolean;

  // Absolute-mode fields
  private rowToDisplayY: Map<number, number> = new Map();
  private lineHeight: number;
  private cellWidthPx: number = 0;
  private cellHeightPx: number = 0;

  constructor(container: HTMLElement, canvas: Canvas, lineHeight: number = 1.2) {
    this.container = container;
    this.canvas = canvas;
    this.lineHeight = lineHeight;
    this.preMode = container.tagName === "PRE";

    if (this.preMode) {
      this._buildPreDOM();
    } else {
      this._buildAbsoluteDOM();
    }
  }

  // ── Pre mode: inline spans within lines ──────────────────────

  private _buildPreDOM(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Reconstruct lines from characters. Canvas rows are numbered highest=top, 1=bottom.
    // Group characters by row.
    const rowMap = new Map<number, EffectCharacter[]>();
    for (const ch of this.canvas.characters) {
      const row = ch.inputCoord.row;
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row)!.push(ch);
    }

    // Sort rows top-to-bottom (highest row number first)
    const sortedRows = [...rowMap.keys()].sort((a, b) => b - a);

    for (let i = 0; i < sortedRows.length; i++) {
      const rowChars = rowMap.get(sortedRows[i])!;
      // Sort by column
      rowChars.sort((a, b) => a.inputCoord.column - b.inputCoord.column);

      // Build a full line with spans for every column position
      const maxCol = rowChars[rowChars.length - 1].inputCoord.column;
      // Index characters by column for quick lookup
      const colToChar = new Map<number, EffectCharacter>();
      for (const ch of rowChars) {
        colToChar.set(ch.inputCoord.column, ch);
      }

      for (let col = 1; col <= maxCol; col++) {
        const ch = colToChar.get(col);
        const span = document.createElement("span");

        if (ch) {
          span.textContent = ch.inputSymbol;
          span.style.opacity = "0";
          this.container.appendChild(span);

          this.spanStates.set(ch.id, {
            span,
            lastSymbol: ch.inputSymbol,
            lastColor: null,
            lastOpacity: "0",
            lastTransform: "",
          });
        } else {
          // Gap position — space character with no associated EffectCharacter
          span.textContent = " ";
          this.container.appendChild(span);
        }
      }

      // Add newline between lines (not after last)
      if (i < sortedRows.length - 1) {
        this.container.appendChild(document.createTextNode("\n"));
      }
    }
  }

  // ── Absolute mode: original approach ─────────────────────────

  private _measureCell(): void {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.lineHeight = `${this.lineHeight}em`;
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidthPx = rect.width;
    this.cellHeightPx = rect.height;
    this.container.removeChild(probe);
  }

  private _buildAbsoluteDOM(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const rowsWithChars = new Set<number>();
    for (const ch of this.canvas.characters) {
      rowsWithChars.add(ch.inputCoord.row);
    }
    const sortedRows = [...rowsWithChars].sort((a, b) => b - a);

    for (let i = 0; i < sortedRows.length; i++) {
      this.rowToDisplayY.set(sortedRows[i], i);
    }

    const totalRows = sortedRows.length;
    const maxCol = this.canvas.dims.textRight;

    this.container.style.position = "relative";
    this.container.style.overflow = "hidden";

    this._measureCell();
    const cw = this.cellWidthPx;
    const ch = this.cellHeightPx;

    this.container.style.width = `${Math.round(maxCol * cw)}px`;
    this.container.style.height = `${Math.round(totalRows * ch)}px`;

    for (const char of this.canvas.characters) {
      const displayY = this.rowToDisplayY.get(char.inputCoord.row)!;
      const col = char.inputCoord.column;

      const span = document.createElement("span");
      span.textContent = char.inputSymbol;
      span.style.position = "absolute";
      span.style.left = `${Math.round((col - 1) * cw)}px`;
      span.style.top = `${Math.round(displayY * ch)}px`;
      span.style.width = `${Math.ceil(cw)}px`;
      span.style.lineHeight = `${Math.round(ch)}px`;
      span.style.opacity = "0";
      this.container.appendChild(span);

      this.spanStates.set(char.id, {
        span,
        lastSymbol: char.inputSymbol,
        lastColor: null,
        lastOpacity: "0",
        lastTransform: "",
      });
    }
  }

  // ── Render (shared, with pre-mode skipping transforms) ───────

  render(): void {
    const cw = this.cellWidthPx;
    const ch = this.cellHeightPx;

    for (const char of this.canvas.characters) {
      const state = this.spanStates.get(char.id);
      if (!state) continue;

      const opacity = char.isVisible ? "1" : "0";
      const symbol = char.currentVisual.symbol;
      const fgColor = char.currentVisual.fgColor;

      if (state.lastOpacity !== opacity) {
        state.span.style.opacity = opacity;
        state.lastOpacity = opacity;
      }
      if (state.lastSymbol !== symbol) {
        state.span.textContent = symbol;
        state.lastSymbol = symbol;
      }
      if (state.lastColor !== fgColor) {
        state.span.style.color = fgColor ? `#${fgColor}` : "";
        state.lastColor = fgColor;
      }

      // Transform only in absolute mode
      if (!this.preMode) {
        const colOffset = char.motion.currentCoord.column - char.inputCoord.column;
        const rowDiff = char.motion.currentCoord.row - char.inputCoord.row;
        const rowOffset = -rowDiff;
        const transform = colOffset === 0 && rowOffset === 0
          ? ""
          : `translate(${Math.round(colOffset * cw)}px, ${Math.round(rowOffset * ch)}px)`;

        if (state.lastTransform !== transform) {
          state.span.style.transform = transform;
          state.lastTransform = transform;
        }
      }
    }
  }
}
