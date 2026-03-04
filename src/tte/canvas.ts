import type { Grouping } from "./types";
import { EffectCharacter } from "./character";

export interface CanvasDimensions {
  textLeft: number;
  textRight: number;
  textTop: number;
  textBottom: number;
  right: number;
  top: number;
  left: number;
  bottom: number;
}

export class Canvas {
  characters: EffectCharacter[] = [];
  dims: CanvasDimensions;

  constructor(text: string, opts?: { includeSpaces?: boolean }) {
    const includeSpaces = opts?.includeSpaces ?? false;
    const lines = text.split("\n");
    // Remove leading/trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
    while (lines.length > 0 && lines[0].trim() === "") lines.shift();

    let id = 0;
    let maxCol = 0;
    const numRows = lines.length;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (line.trim().length === 0) continue; // preserve row gap, skip chars
      // Row: top line = highest row number, bottom = 1
      const row = numRows - lineIdx;

      for (let colIdx = 0; colIdx < line.length; colIdx++) {
        const ch = line[colIdx];
        if (!includeSpaces && ch === " ") continue;
        const col = colIdx + 1; // 1-based columns
        const ec = new EffectCharacter(id++, ch, col, row);
        ec.isSpace = ch === " ";
        this.characters.push(ec);
        if (col > maxCol) maxCol = col;
      }
    }

    this.dims = {
      textLeft: 1,
      textRight: maxCol,
      textTop: numRows,
      textBottom: 1,
      right: maxCol,
      top: numRows,
      left: 1,
      bottom: 1,
    };
  }

  getCharacters(): EffectCharacter[] {
    return this.characters;
  }

  getNonSpaceCharacters(): EffectCharacter[] {
    return this.characters.filter((ch) => !ch.isSpace);
  }

  getCharactersGrouped(grouping: Grouping, opts?: { includeSpaces?: boolean }): EffectCharacter[][] {
    const includeSpaces = opts?.includeSpaces ?? true;
    const pool = includeSpaces ? this.characters : this.getNonSpaceCharacters();
    const sorted = [...pool].sort(
      (a, b) => a.inputCoord.row - b.inputCoord.row || a.inputCoord.column - b.inputCoord.column,
    );

    if (grouping === "row") {
      const rowMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        if (!rowMap.has(ch.inputCoord.row)) rowMap.set(ch.inputCoord.row, []);
        rowMap.get(ch.inputCoord.row)?.push(ch);
      }
      const rows = [...rowMap.entries()].sort((a, b) => b[0] - a[0]);
      return rows.map(([, chars]) => chars);
    }

    if (grouping === "column") {
      const colMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        if (!colMap.has(ch.inputCoord.column)) colMap.set(ch.inputCoord.column, []);
        colMap.get(ch.inputCoord.column)?.push(ch);
      }
      const cols = [...colMap.entries()].sort((a, b) => a[0] - b[0]);
      return cols.map(([, chars]) => chars);
    }

    if (grouping === "diagonal") {
      const diagMap = new Map<number, EffectCharacter[]>();
      for (const ch of sorted) {
        const key = ch.inputCoord.row + ch.inputCoord.column;
        if (!diagMap.has(key)) diagMap.set(key, []);
        diagMap.get(key)?.push(ch);
      }
      const diags = [...diagMap.entries()].sort((a, b) => a[0] - b[0]);
      return diags.map(([, chars]) => chars);
    }

    return [sorted];
  }
}
