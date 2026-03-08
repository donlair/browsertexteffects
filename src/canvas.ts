import type { Coord, Grouping } from "./types";
import { EffectCharacter } from "./character";

export interface CanvasDimensions {
  // Canvas bounds (same as text bounds when no anchor_canvas)
  left: number;
  right: number;
  bottom: number;
  top: number;
  width: number;
  height: number;
  centerRow: number;
  centerColumn: number;
  center: Coord;

  // Text bounds within the canvas
  textLeft: number;
  textRight: number;
  textTop: number;
  textBottom: number;
  textWidth: number;
  textHeight: number;
  textCenterRow: number;
  textCenterColumn: number;
  textCenter: Coord;
}

export class Canvas {
  characters: EffectCharacter[] = [];
  dims: CanvasDimensions;

  constructor(text: string, opts?: { includeSpaces?: boolean }) {
    const includeSpaces = opts?.includeSpaces ?? false;
    const lines = text.split("\n");
    // Remove leading/trailing empty lines (skip when includeSpaces, to preserve NBSP padding)
    if (!includeSpaces) {
      while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
      while (lines.length > 0 && lines[0].trim() === "") lines.shift();
    }

    let id = 0;
    let maxCol = 0;
    const numRows = lines.length;

    // When includeSpaces is true, we need maxLineLength to fill blank lines
    const maxLineLength = includeSpaces ? Math.max(...lines.map((l) => l.length), 0) : 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (line.trim().length === 0 && !includeSpaces) continue; // preserve row gap, skip chars
      // Row: top line = highest row number, bottom = 1
      const row = numRows - lineIdx;

      // For blank lines with includeSpaces, fill with spaces up to maxLineLength
      const effectiveLine = line.trim().length === 0 && includeSpaces ? " ".repeat(maxLineLength) : line;

      for (let colIdx = 0; colIdx < effectiveLine.length; colIdx++) {
        const ch = effectiveLine[colIdx];
        if (!includeSpaces && ch === " ") continue;
        const col = colIdx + 1; // 1-based columns
        const ec = new EffectCharacter(id++, ch, col, row);
        ec.isSpace = ch === " ";
        this.characters.push(ec);
        if (col > maxCol) maxCol = col;
      }
    }

    // Canvas bounds: match Python Canvas(top=numRows, right=maxCol, bottom=1, left=1)
    const left = 1;
    const right = maxCol;
    const bottom = 1;
    const top = numRows;
    const width = right;
    const height = top;

    // Center calculation matches Python: max(top // 2, bottom) + (1 if top%2 and top>1)
    // Equivalent to Math.ceil(top / 2) for top >= 1
    const centerRow = Math.ceil(top / 2);
    const centerColumn = Math.ceil(right / 2);

    // Text bounds from actual character coordinates
    const nonSpace = this.characters.filter((c) => !c.isSpace);
    const coords = nonSpace.length > 0 ? nonSpace : this.characters;

    const textLeft = coords.length > 0 ? Math.min(...coords.map((c) => c.inputCoord.column)) : left;
    const textRight = coords.length > 0 ? Math.max(...coords.map((c) => c.inputCoord.column)) : right;
    const textTop = coords.length > 0 ? Math.max(...coords.map((c) => c.inputCoord.row)) : top;
    const textBottom = coords.length > 0 ? Math.min(...coords.map((c) => c.inputCoord.row)) : bottom;
    const textWidth = Math.max(textRight - textLeft + 1, 1);
    const textHeight = Math.max(textTop - textBottom + 1, 1);
    const textCenterRow = textBottom + Math.floor((textTop - textBottom) / 2);
    const textCenterColumn = textLeft + Math.floor((textRight - textLeft) / 2);

    this.dims = {
      left,
      right,
      bottom,
      top,
      width,
      height,
      centerRow,
      centerColumn,
      center: { column: centerColumn, row: centerRow },
      textLeft,
      textRight,
      textTop,
      textBottom,
      textWidth,
      textHeight,
      textCenterRow,
      textCenterColumn,
      textCenter: { column: textCenterColumn, row: textCenterRow },
    };
  }

  getCharacters(): EffectCharacter[] {
    return this.characters;
  }

  getNonSpaceCharacters(): EffectCharacter[] {
    return this.characters.filter((ch) => !ch.isSpace);
  }

  /** Whether a coordinate falls within the canvas bounds. Matches Python Canvas.coord_is_in_canvas(). */
  coordIsInCanvas(coord: Coord): boolean {
    const { left, right, bottom, top } = this.dims;
    return left <= coord.column && coord.column <= right && bottom <= coord.row && coord.row <= top;
  }

  /** Whether a coordinate falls within the text boundary. Matches Python Canvas.coord_is_in_text(). */
  coordIsInText(coord: Coord): boolean {
    const { textLeft, textRight, textBottom, textTop } = this.dims;
    return (
      textLeft <= coord.column &&
      coord.column <= textRight &&
      textBottom <= coord.row &&
      coord.row <= textTop
    );
  }

  /** Random column within canvas (or text boundary). Matches Python Canvas.random_column(). */
  randomColumn(withinTextBoundary = false): number {
    const lo = withinTextBoundary ? this.dims.textLeft : this.dims.left;
    const hi = withinTextBoundary ? this.dims.textRight : this.dims.right;
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  /** Random row within canvas (or text boundary). Matches Python Canvas.random_row(). */
  randomRow(withinTextBoundary = false): number {
    const lo = withinTextBoundary ? this.dims.textBottom : this.dims.bottom;
    const hi = withinTextBoundary ? this.dims.textTop : this.dims.top;
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  /**
   * Random coordinate within or outside the canvas. Matches Python Canvas.random_coord().
   * outsideScope=true returns a coord on one of the 4 edges just outside the canvas.
   */
  randomCoord(opts?: { outsideScope?: boolean; withinTextBoundary?: boolean }): Coord {
    const { left, right, bottom, top } = this.dims;
    if (opts?.outsideScope) {
      const above: Coord = { column: this.randomColumn(), row: top + 1 };
      const below: Coord = { column: this.randomColumn(), row: bottom - 1 };
      const leftOf: Coord = { column: left - 1, row: this.randomRow() };
      const rightOf: Coord = { column: right + 1, row: this.randomRow() };
      const choices = [above, below, leftOf, rightOf];
      return choices[Math.floor(Math.random() * choices.length)];
    }
    return { column: this.randomColumn(opts?.withinTextBoundary), row: this.randomRow(opts?.withinTextBoundary) };
  }

  /** Look up a character by its input coordinate. Matches Python Terminal.get_character_by_input_coord(). */
  getCharacterByInputCoord(coord: Coord): EffectCharacter | undefined {
    return this.characters.find(
      (c) => c.inputCoord.column === coord.column && c.inputCoord.row === coord.row,
    );
  }

  getCharactersGrouped(grouping: Grouping, opts?: { includeSpaces?: boolean }): EffectCharacter[][] {
    const includeSpaces = opts?.includeSpaces ?? true;
    const pool = includeSpaces ? this.characters : this.getNonSpaceCharacters();
    // Sort ascending by row, then column — matches Python's all_characters.sort()
    const sorted = [...pool].sort(
      (a, b) => a.inputCoord.row - b.inputCoord.row || a.inputCoord.column - b.inputCoord.column,
    );

    if (grouping === "row" || grouping === "rowBottomToTop") {
      const rowMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        if (!rowMap.has(ch.inputCoord.row)) rowMap.set(ch.inputCoord.row, []);
        rowMap.get(ch.inputCoord.row)?.push(ch);
      }
      // ROW_TOP_TO_BOTTOM: highest row first; ROW_BOTTOM_TO_TOP: lowest row first
      const rows = [...rowMap.entries()].sort((a, b) =>
        grouping === "row" ? b[0] - a[0] : a[0] - b[0],
      );
      return rows.map(([, chars]) => chars);
    }

    if (grouping === "column" || grouping === "columnRightToLeft") {
      const colMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        if (!colMap.has(ch.inputCoord.column)) colMap.set(ch.inputCoord.column, []);
        colMap.get(ch.inputCoord.column)?.push(ch);
      }
      // COLUMN_LEFT_TO_RIGHT: ascending; COLUMN_RIGHT_TO_LEFT: descending
      const cols = [...colMap.entries()].sort((a, b) =>
        grouping === "column" ? a[0] - b[0] : b[0] - a[0],
      );
      return cols.map(([, chars]) => chars);
    }

    // DIAGONAL_BOTTOM_LEFT_TO_TOP_RIGHT: key = row+col, ascending (bottom-left first)
    // DIAGONAL_TOP_RIGHT_TO_BOTTOM_LEFT: key = row+col, descending
    if (grouping === "diagonal" || grouping === "diagonalTopRightToBottomLeft") {
      const diagMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        const key = ch.inputCoord.row + ch.inputCoord.column;
        if (!diagMap.has(key)) diagMap.set(key, []);
        diagMap.get(key)?.push(ch);
      }
      const diags = [...diagMap.entries()].sort((a, b) =>
        grouping === "diagonal" ? a[0] - b[0] : b[0] - a[0],
      );
      return diags.map(([, chars]) => chars);
    }

    // DIAGONAL_TOP_LEFT_TO_BOTTOM_RIGHT: key = col-row, ascending (top-left first in reversed coord space)
    // DIAGONAL_BOTTOM_RIGHT_TO_TOP_LEFT: key = col-row, descending
    if (grouping === "diagonalTopLeftToBottomRight" || grouping === "diagonalBottomRightToTopLeft") {
      const diagMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        const key = ch.inputCoord.column - ch.inputCoord.row;
        if (!diagMap.has(key)) diagMap.set(key, []);
        diagMap.get(key)?.push(ch);
      }
      const diags = [...diagMap.entries()].sort((a, b) =>
        grouping === "diagonalTopLeftToBottomRight" ? a[0] - b[0] : b[0] - a[0],
      );
      return diags.map(([, chars]) => chars);
    }

    // CENTER_TO_OUTSIDE / OUTSIDE_TO_CENTER: Manhattan distance from text center
    if (grouping === "centerToOutside" || grouping === "outsideToCenter") {
      const { textCenter } = this.dims;
      const distMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        const dist =
          Math.abs(ch.inputCoord.column - textCenter.column) +
          Math.abs(ch.inputCoord.row - textCenter.row);
        if (!distMap.has(dist)) distMap.set(dist, []);
        distMap.get(dist)?.push(ch);
      }
      const distances = [...distMap.keys()].sort((a, b) =>
        grouping === "centerToOutside" ? a - b : b - a,
      );
      return distances.map((d) => distMap.get(d) ?? []);
    }

    return [sorted];
  }
}
