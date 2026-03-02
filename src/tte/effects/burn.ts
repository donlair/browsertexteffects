import { Color, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";

export interface BurnConfig {
  burnSpeed: number;
  burnSymbols: string[];
  burnFrameDuration: number;
  burnColors: Color[];
  startingColor: Color;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBurnConfig: BurnConfig = {
  burnSpeed: 3,
  burnSymbols: ["▓", "▒", "░", "█", "▀", "▝", "."],
  burnFrameDuration: 3,
  burnColors: [color("ffffff"), color("fff75d"), color("fe650d"), color("8A003C"), color("510100")],
  startingColor: color("837373"),
  finalGradientStops: [color("00c3ff"), color("ffff1c")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical",
};

export class BurnEffect {
  private canvas: Canvas;
  private config: BurnConfig;
  private pendingChars: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();

  constructor(canvas: Canvas, config: BurnConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );
    const fireGradient = new Gradient(this.config.burnColors, 10);

    // Make spaces visible, show all chars in starting color
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.config.startingColor.rgbHex };
    }

    const nonSpace = this.canvas.getNonSpaceCharacters();

    // Build scenes for each character
    for (const ch of nonSpace) {
      // Burn scene: block chars in fire gradient colors
      const burnScene = ch.newScene("burn");
      burnScene.applyGradientToSymbols(
        this.config.burnSymbols,
        this.config.burnFrameDuration,
        fireGradient,
      );

      // Final scene: transition from last burn color to mapped final color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const lastBurnColor = this.config.burnColors[this.config.burnColors.length - 1];
      const finalScene = ch.newScene("final");
      const charGradient = new Gradient([lastBurnColor, finalColor], 10);
      finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);

      // Chain: burn complete → activate final
      ch.eventHandler.register("SCENE_COMPLETE", "burn", "ACTIVATE_SCENE", "final");
    }

    // Compute spanning tree order for organic spread
    this.pendingChars = buildSpanningTree(nonSpace);
  }

  step(): boolean {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      return false;
    }

    // Ignite chars
    let ignited = 0;
    while (this.pendingChars.length > 0 && ignited < this.config.burnSpeed) {
      const ch = this.pendingChars.shift()!;
      ch.activateScene("burn");
      this.activeChars.add(ch);
      ignited++;
    }

    // Tick active chars
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}

/**
 * Build a spanning tree over characters using Prim's algorithm with randomized weights.
 * Returns characters in the order they were added to the tree (organic spread pattern).
 * Starts from bottom-center to simulate fire rising upward.
 */
function buildSpanningTree(chars: EffectCharacter[]): EffectCharacter[] {
  if (chars.length === 0) return [];

  // Build coordinate → character lookup
  const coordMap = new Map<string, EffectCharacter>();
  for (const ch of chars) {
    coordMap.set(coordKey(ch.inputCoord.column, ch.inputCoord.row), ch);
  }

  // Find bottom-center starting character
  let startChar = chars[0];
  let bestScore = Infinity;
  const avgCol = chars.reduce((sum, ch) => sum + ch.inputCoord.column, 0) / chars.length;
  for (const ch of chars) {
    // Prefer bottom rows (low row number) and center columns
    const score = ch.inputCoord.row * 10 + Math.abs(ch.inputCoord.column - avgCol);
    if (score < bestScore) {
      bestScore = score;
      startChar = ch;
    }
  }

  const inTree = new Set<number>();
  const order: EffectCharacter[] = [];

  // Frontier: edges from tree to non-tree chars
  interface FrontierEntry {
    char: EffectCharacter;
    weight: number;
  }
  const frontier: FrontierEntry[] = [];

  function addToTree(ch: EffectCharacter) {
    inTree.add(ch.id);
    order.push(ch);

    // Add neighbors to frontier
    const { column, row } = ch.inputCoord;
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const neighbor = coordMap.get(coordKey(column + dc, row + dr));
        if (neighbor && !inTree.has(neighbor.id)) {
          const dist = Math.hypot(dc, dr * 2);
          frontier.push({ char: neighbor, weight: dist + Math.random() * 2 });
        }
      }
    }
  }

  addToTree(startChar);

  while (frontier.length > 0) {
    // Find minimum weight entry
    let minIdx = 0;
    for (let i = 1; i < frontier.length; i++) {
      if (frontier[i].weight < frontier[minIdx].weight) {
        minIdx = i;
      }
    }

    const entry = frontier[minIdx];
    frontier.splice(minIdx, 1);

    if (inTree.has(entry.char.id)) continue;
    addToTree(entry.char);
  }

  // Add any disconnected characters at the end
  for (const ch of chars) {
    if (!inTree.has(ch.id)) {
      order.push(ch);
    }
  }

  return order;
}
