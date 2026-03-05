import type { EffectCharacter } from "./character";
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
  /** Traversal order for returned characters.
   *  "insertion" (default): Prim's insertion order — organic spread from start.
   *  "bfs": BFS over the spanning tree — wave-like flood fill from root.
   *  Matches Python's smoke effect which builds PrimsWeighted then traverses via BreadthFirst. */
  traversal?: "insertion" | "bfs";
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

/**
 * Builds a spanning tree using Python's PrimsSimple algorithm.
 *
 * Unlike the weighted variant, PrimsSimple uses uniform random selection:
 * on each step, a random "edge char" (a tree char with unlinked neighbors)
 * is chosen, then one of its unlinked neighbors is randomly linked in.
 * This matches Python's burn effect which uses PrimsSimple for organic ignition spread.
 *
 * @param chars - Characters to span (typically non-space characters)
 * @param options - Connectivity mode and start strategy
 * @returns Characters in link order (root first)
 */
export function buildSpanningTreeSimple(
  chars: EffectCharacter[],
  options?: Pick<SpanningTreeOptions, "connectivity" | "startStrategy" | "includeDisconnected">,
): EffectCharacter[] {
  if (chars.length === 0) return [];

  const connectivity = options?.connectivity ?? 8;
  const startStrategy = options?.startStrategy ?? "random";
  const includeDisconnected = options?.includeDisconnected ?? true;

  const coordMap = buildCoordMap(chars);
  const startChar = findStartChar(chars, startStrategy);

  const linked = new Set<number>();
  const linkOrder: EffectCharacter[] = [];

  function getUnlinkedNeighbors(ch: EffectCharacter): EffectCharacter[] {
    return getNeighbors(ch, coordMap, connectivity).filter((n) => !linked.has(n.id));
  }

  function linkChar(ch: EffectCharacter) {
    linked.add(ch.id);
    linkOrder.push(ch);
  }

  linkChar(startChar);

  const edgeChars: EffectCharacter[] = getUnlinkedNeighbors(startChar).length > 0
    ? [startChar]
    : [];

  while (edgeChars.length > 0) {
    // Pop a random edge char
    const edgeIdx = Math.floor(Math.random() * edgeChars.length);
    const current = edgeChars.splice(edgeIdx, 1)[0];

    const unlinked = getUnlinkedNeighbors(current);
    if (unlinked.length === 0) continue;

    // Link one random neighbor
    const nextIdx = Math.floor(Math.random() * unlinked.length);
    const next = unlinked.splice(nextIdx, 1)[0];
    linkChar(next);

    // Add current back if it still has unlinked neighbors
    if (getUnlinkedNeighbors(current).length > 0) {
      edgeChars.push(current);
    }

    // Add new char to edges if it has unlinked neighbors
    if (getUnlinkedNeighbors(next).length > 0) {
      edgeChars.push(next);
    }
  }

  if (includeDisconnected) {
    for (const ch of chars) {
      if (!linked.has(ch.id)) {
        linkOrder.push(ch);
      }
    }
  }

  return linkOrder;
}

export function buildSpanningTree(
  chars: EffectCharacter[],
  options?: SpanningTreeOptions,
): EffectCharacter[] {
  if (chars.length === 0) return [];

  const connectivity = options?.connectivity ?? 8;
  const startStrategy = options?.startStrategy ?? "bottomCenter";
  const weightFn = options?.weightFn ?? defaultWeightFn;
  const includeDisconnected = options?.includeDisconnected ?? true;
  const traversal = options?.traversal ?? "insertion";

  const coordMap = buildCoordMap(chars);
  const startChar = findStartChar(chars, startStrategy);

  const inTree = new Set<number>();
  const order: EffectCharacter[] = [];
  // Tree children map: parent id → list of children (used for BFS traversal)
  const treeChildren = new Map<number, EffectCharacter[]>();

  interface FrontierEntry {
    char: EffectCharacter;
    weight: number;
    parent: EffectCharacter;
  }
  const frontier: FrontierEntry[] = [];

  function addToTree(ch: EffectCharacter, parent: EffectCharacter | null) {
    inTree.add(ch.id);
    order.push(ch);
    if (parent) {
      if (!treeChildren.has(parent.id)) treeChildren.set(parent.id, []);
      treeChildren.get(parent.id)?.push(ch);
    }

    for (const neighbor of getNeighbors(ch, coordMap, connectivity)) {
      if (!inTree.has(neighbor.id)) {
        const dc = neighbor.inputCoord.column - ch.inputCoord.column;
        const dr = neighbor.inputCoord.row - ch.inputCoord.row;
        frontier.push({ char: neighbor, weight: weightFn(dc, dr), parent: ch });
      }
    }
  }

  addToTree(startChar, null);

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
    addToTree(entry.char, entry.parent);
  }

  const disconnected: EffectCharacter[] = [];
  if (includeDisconnected) {
    for (const ch of chars) {
      if (!inTree.has(ch.id)) {
        disconnected.push(ch);
      }
    }
  }

  if (traversal === "bfs") {
    // BFS traversal over the spanning tree edges (matches Python's BreadthFirst algo).
    // Produces wave-like expansion: chars at equal tree-distance from root are activated together.
    const bfsOrder: EffectCharacter[] = [];
    const queue: EffectCharacter[] = [startChar];
    while (queue.length > 0) {
      const ch = queue.shift();
      if (!ch) break;
      bfsOrder.push(ch);
      const children = treeChildren.get(ch.id) ?? [];
      queue.push(...children);
    }
    bfsOrder.push(...disconnected);
    return bfsOrder;
  }

  order.push(...disconnected);
  return order;
}
