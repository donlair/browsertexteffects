import { type Color, type GradientDirection, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
  binaryColors: [color("044E29"), color("157e38"), color("45bf55"), color("95ed87")],
  movementSpeed: 1,
  activeBinaryGroups: 0.08,
  finalGradientStops: [color("00d500"), color("007500")],
  finalGradientSteps: 12,
  finalGradientFrames: 2,
  finalGradientDirection: "radial",
  finalWipeSpeed: 2,
};

interface BinaryDigit {
  ch: EffectCharacter;
  span: HTMLSpanElement;
}

interface BinaryGroup {
  sourceChar: EffectCharacter;
  pendingDigits: BinaryDigit[];
  activeDigits: BinaryDigit[];
  isComplete: boolean;
}

let nextDigitId = 3_000_000;

export class BinaryPathEffect {
  private canvas: Canvas;
  private config: BinaryPathConfig;
  private container: HTMLElement;
  private cellWidthPx = 0;
  private cellHeightPx = 0;
  private totalRows: number;

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
    this.container = container;
    this.totalRows = canvas.dims.top;
    this._measureCell();
    this.build();
  }

  private _measureCell(): void {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidthPx = rect.width;
    this.cellHeightPx = rect.height;
    this.container.removeChild(probe);
  }

  private _positionSpan(span: HTMLSpanElement, coord: { column: number; row: number }): void {
    span.style.left = `${(coord.column - 1) * this.cellWidthPx}px`;
    span.style.top = `${(this.totalRows - coord.row) * this.cellHeightPx}px`;
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

    // Source chars start invisible; shown only when their collapse scene fires
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }

    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      // Python uses adjustBrightness(finalColor, 0.5) for dim color
      const dimColor = adjustBrightness(finalColor, 0.5);

      const collapseGrad = new Gradient([color("ffffff"), dimColor], 7);
      const collapseScene = ch.newScene("collapse");
      collapseScene.applyGradientToSymbols(ch.inputSymbol, 3, collapseGrad);

      ch.eventHandler.register("SCENE_COMPLETE", "collapse", "CALLBACK", {
        callback: (char: EffectCharacter) => {
          this.collapsingChars.delete(char);
          this.collapsedCount++;
        },
        args: [],
      });

      // Python hardcodes steps=10 for brighten gradient, frames=2 per step
      const brightenGrad = new Gradient([dimColor, finalColor], 10);
      const brightenScene = ch.newScene("brighten");
      brightenScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, brightenGrad);

      // Generate shared zigzag path for all 8 digit chars of this source char
      const startCoord = this._randomExteriorCoord();
      const pathCoords = this._buildZigzagPath(startCoord, ch.inputCoord, dims.right);

      const binaryStr = ((ch.inputSymbol.codePointAt(0) ?? 0) & 0xFF).toString(2).padStart(8, "0");
      const pendingDigits: BinaryDigit[] = [];

      for (let i = 0; i < 8; i++) {
        const digit = binaryStr[i];
        const digitColor = config.binaryColors[Math.floor(Math.random() * config.binaryColors.length)].rgbHex;
        const id = nextDigitId++;
        const digitCh = new EffectCharacter(id, digit, pathCoords[0].column, pathCoords[0].row);

        const pathId = `bp_${id}`;
        const path = digitCh.motion.newPath(pathId, { speed: config.movementSpeed });
        for (const c of pathCoords) {
          path.addWaypoint(c);
        }
        // Activate path immediately (Python starts all 8 paths at build time);
        // span visibility is staggered one-per-tick in step()
        digitCh.motion.activatePath(pathId);

        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.display = "none"; // hidden until activated
        span.textContent = digit;
        span.style.color = `#${digitColor}`;
        this._positionSpan(span, pathCoords[0]);
        this.container.appendChild(span);

        pendingDigits.push({ ch: digitCh, span });
      }

      this.pendingGroups.push({
        sourceChar: ch,
        pendingDigits,
        activeDigits: [],
        isComplete: false,
      });
    }

    // Shuffle pending groups (Python pops random index)
    for (let i = this.pendingGroups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pendingGroups[i], this.pendingGroups[j]] = [this.pendingGroups[j], this.pendingGroups[i]];
    }

    // Diagonal wipe groups: top-right first (row + column descending matches Python's DIAGONAL_TOP_RIGHT_TO_BOTTOM_LEFT)
    const diagMap = new Map<number, EffectCharacter[]>();
    for (const ch of nonSpaceChars) {
      const key = ch.inputCoord.row + ch.inputCoord.column;
      if (!diagMap.has(key)) diagMap.set(key, []);
      diagMap.get(key)?.push(ch);
    }
    const sortedKeys = [...diagMap.keys()].sort((a, b) => b - a);
    this.wipeGroups = sortedKeys.map((k) => diagMap.get(k) ?? []);
  }

  /**
   * Generate a zigzag path from startCoord toward targetCoord, alternating between
   * vertical and horizontal segments with random step sizes. Matches Python's algorithm.
   */
  private _buildZigzagPath(
    startCoord: { column: number; row: number },
    targetCoord: { column: number; row: number },
    canvasRight: number,
  ): { column: number; row: number }[] {
    const path: { column: number; row: number }[] = [startCoord];
    let lastOrientation = Math.random() < 0.5 ? "col" : "row";

    while (
      path[path.length - 1].column !== targetCoord.column ||
      path[path.length - 1].row !== targetCoord.row
    ) {
      const last = path[path.length - 1];
      const colDir = Math.sign(targetCoord.column - last.column);
      const rowDir = Math.sign(targetCoord.row - last.row);
      const maxColDist = Math.abs(targetCoord.column - last.column);
      const maxRowDist = Math.abs(targetCoord.row - last.row);

      let next: { column: number; row: number };
      if (lastOrientation === "col" && maxRowDist > 0) {
        // Move vertically (along column), random step up to max row distance
        const maxStep = Math.min(maxRowDist, Math.max(10, Math.floor(canvasRight * 0.2)));
        const step = randInt(1, maxStep);
        next = { column: last.column, row: last.row + step * rowDir };
        lastOrientation = "row";
      } else if (lastOrientation === "row" && maxColDist > 0) {
        // Move horizontally (along row), random step up to 4 columns
        const step = randInt(1, Math.min(maxColDist, 4));
        next = { column: last.column + step * colDir, row: last.row };
        lastOrientation = "col";
      } else {
        next = { column: targetCoord.column, row: targetCoord.row };
      }
      path.push(next);
    }

    // Python appends target twice after the loop
    path.push({ column: targetCoord.column, row: targetCoord.row });
    path.push({ column: targetCoord.column, row: targetCoord.row });
    return path;
  }

  private _randomExteriorCoord(): { column: number; row: number } {
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

  step(): boolean {
    if (this.phase === "traveling") {
      const maxActive = Math.max(1, Math.floor(this.totalNonSpaceChars * this.config.activeBinaryGroups));
      while (this.pendingGroups.length > 0 && this.activeGroups.size < maxActive) {
        const group = this.pendingGroups.shift();
        if (group) this.activeGroups.add(group);
      }

      // Per tick: reveal one pending digit per active group (Python stagger — paths run from build time, visibility is staggered)
      for (const group of this.activeGroups) {
        if (group.pendingDigits.length > 0) {
          const digit = group.pendingDigits.shift();
          if (!digit) continue;
          digit.span.style.display = "";
          group.activeDigits.push(digit);
        }
      }

      // Tick all active digits and detect arrivals
      for (const group of this.activeGroups) {
        for (const digit of [...group.activeDigits]) {
          digit.ch.tick();
          const coord = digit.ch.motion.currentCoord;
          this._positionSpan(digit.span, coord);

          if (!digit.ch.isActive) {
            // Digit arrived at target
            digit.span.remove();
            const idx = group.activeDigits.indexOf(digit);
            if (idx !== -1) group.activeDigits.splice(idx, 1);
          }
        }

        // When all digits have arrived (both queues empty), activate source char collapse
        if (group.pendingDigits.length === 0 && group.activeDigits.length === 0 && !group.isComplete) {
          group.isComplete = true;
          const ch = group.sourceChar;
          ch.isVisible = true;
          ch.activateScene("collapse");
          this.collapsingChars.add(ch);
        }

        if (group.isComplete) this.activeGroups.delete(group);
      }

      // Tick collapsing source chars
      for (const ch of this.collapsingChars) {
        ch.tick();
      }

      if (
        this.pendingGroups.length === 0 &&
        this.activeGroups.size === 0 &&
        this.collapsingChars.size === 0 &&
        this.collapsedCount === this.totalNonSpaceChars
      ) {
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

    return !(this.phase === "wipe" && this.wipeIdx >= this.wipeGroups.length && this.activeChars.size === 0);
  }
}
