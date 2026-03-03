import { EffectCharacter } from "./character";
import { coordKey } from "./gradient";

export type ConnectivityMode = 4 | 8;

export type StartStrategy =
  | "bottomCenter"
  | "topCenter"
  | "center"
  | "random"
  | { char: EffectCharacter };

export interface SpanningTreeOptions {
  connectivity?: ConnectivityMode;
  startStrategy?: StartStrategy;
  weightFn?: (dc: number, dr: number) => number;
  includeDisconnected?: boolean;
}

export function buildCoordMap(
  chars: EffectCharacter[],
): Map<string, EffectCharacter> {
  const map = new Map<string, EffectCharacter>();
  for (const ch of chars) {
    map.set(coordKey(ch.inputCoord.column, ch.inputCoord.row), ch);
  }
  return map;
}

export function getNeighbors(
  ch: EffectCharacter,
  coordMap: Map<string, EffectCharacter>,
  mode: ConnectivityMode = 8,
): EffectCharacter[] {
  const { column, row } = ch.inputCoord;
  const neighbors: EffectCharacter[] = [];

  if (mode === 4) {
    const offsets = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (const [dc, dr] of offsets) {
      const n = coordMap.get(coordKey(column + dc, row + dr));
      if (n) neighbors.push(n);
    }
  } else {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const n = coordMap.get(coordKey(column + dc, row + dr));
        if (n) neighbors.push(n);
      }
    }
  }

  return neighbors;
}

function findStartChar(
  chars: EffectCharacter[],
  strategy: StartStrategy,
): EffectCharacter {
  if (typeof strategy === "object" && "char" in strategy) {
    return strategy.char;
  }

  if (strategy === "random") {
    return chars[Math.floor(Math.random() * chars.length)];
  }

  const avgCol =
    chars.reduce((sum, ch) => sum + ch.inputCoord.column, 0) / chars.length;
  const avgRow =
    chars.reduce((sum, ch) => sum + ch.inputCoord.row, 0) / chars.length;

  let best = chars[0];
  let bestScore = Infinity;

  for (const ch of chars) {
    let score: number;
    switch (strategy) {
      case "bottomCenter":
        score =
          ch.inputCoord.row * 10 +
          Math.abs(ch.inputCoord.column - avgCol);
        break;
      case "topCenter":
        score =
          -ch.inputCoord.row * 10 +
          Math.abs(ch.inputCoord.column - avgCol);
        break;
      case "center":
        score =
          Math.abs(ch.inputCoord.column - avgCol) +
          Math.abs(ch.inputCoord.row - avgRow);
        break;
    }
    if (score < bestScore) {
      bestScore = score;
      best = ch;
    }
  }

  return best;
}

const defaultWeightFn = (dc: number, dr: number): number =>
  Math.hypot(dc, dr * 2) + Math.random() * 2;

export function buildSpanningTree(
  chars: EffectCharacter[],
  options?: SpanningTreeOptions,
): EffectCharacter[] {
  if (chars.length === 0) return [];

  const connectivity = options?.connectivity ?? 8;
  const startStrategy = options?.startStrategy ?? "bottomCenter";
  const weightFn = options?.weightFn ?? defaultWeightFn;
  const includeDisconnected = options?.includeDisconnected ?? true;

  const coordMap = buildCoordMap(chars);
  const startChar = findStartChar(chars, startStrategy);

  const inTree = new Set<number>();
  const order: EffectCharacter[] = [];

  interface FrontierEntry {
    char: EffectCharacter;
    weight: number;
  }
  const frontier: FrontierEntry[] = [];

  function addToTree(ch: EffectCharacter) {
    inTree.add(ch.id);
    order.push(ch);

    for (const neighbor of getNeighbors(ch, coordMap, connectivity)) {
      if (!inTree.has(neighbor.id)) {
        const dc = neighbor.inputCoord.column - ch.inputCoord.column;
        const dr = neighbor.inputCoord.row - ch.inputCoord.row;
        frontier.push({ char: neighbor, weight: weightFn(dc, dr) });
      }
    }
  }

  addToTree(startChar);

  while (frontier.length > 0) {
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

  if (includeDisconnected) {
    for (const ch of chars) {
      if (!inTree.has(ch.id)) {
        order.push(ch);
      }
    }
  }

  return order;
}
