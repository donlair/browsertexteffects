import type { Coord, EasingFunction } from "./types";
import { findCoordOnBezierCurve, findLengthOfBezierCurve } from "./geometry";

export interface Waypoint {
  coord: Coord;
  /** Optional Bezier control point(s). Stored on the end waypoint of a segment (matches Python). */
  bezierControl?: Coord | Coord[];
}

interface Segment {
  start: Waypoint;
  end: Waypoint;
  distance: number;
}

export interface PathConfig {
  speed?: number;
  ease?: EasingFunction | null;
  loop?: boolean;
  totalLoops?: number;
  holdDuration?: number;
  layer?: number;
}

export class Path {
  id: string;
  speed: number;
  ease: EasingFunction | null;
  layer: number | undefined;
  waypoints: Waypoint[] = [];
  segments: Segment[] = [];
  totalDistance = 0;
  currentStep = 0;
  maxSteps = 0;
  currentSegmentIndex = -1;

  // Origin segment prepended by activatePath(); tracked so it can be replaced on loop re-activation
  originSegment: Segment | null = null;

  // Hold: pause at final position for N ticks after all loops complete
  holdDuration: number = 0;
  holdElapsed: number = 0;
  isHolding: boolean = false;

  // Loop: replay path traversal
  loop: boolean = false;
  totalLoops: number = 0; // 0 = infinite, N = play N total times
  currentLoop: number = 0;

  // Tracks distance progress (0–1) after easing; used by scene DISTANCE sync
  lastDistanceFactor: number = 0;

  constructor(id: string, speedOrConfig: number | PathConfig = 1, ease: EasingFunction | null = null) {
    this.id = id;
    if (typeof speedOrConfig === "object" && speedOrConfig !== null) {
      const cfg = speedOrConfig;
      this.speed = cfg.speed ?? 1;
      this.ease = cfg.ease ?? null;
      this.loop = cfg.loop ?? false;
      this.totalLoops = cfg.totalLoops ?? 0;
      this.holdDuration = cfg.holdDuration ?? 0;
      this.layer = cfg.layer;
    } else {
      this.speed = speedOrConfig;
      this.ease = ease;
    }
  }

  addWaypoint(coord: Coord, bezierControl?: Coord | Coord[]): void {
    const wp: Waypoint = bezierControl !== undefined ? { coord, bezierControl } : { coord };
    this.waypoints.push(wp);

    if (this.waypoints.length >= 2) {
      const prev = this.waypoints[this.waypoints.length - 2];
      const dist = wp.bezierControl !== undefined
        ? findLengthOfBezierCurve(prev.coord, wp.bezierControl, coord)
        : lineLength(prev.coord, coord);
      this.totalDistance += dist;
      this.segments.push({ start: prev, end: wp, distance: dist });
      this.maxSteps = Math.round(this.totalDistance / this.speed);
    }
  }

  step(): Coord {
    // Hold phase: stay at final position, count ticks
    if (this.isHolding) {
      this.holdElapsed++;
      return this.segments[this.segments.length - 1].end.coord;
    }

    if (!this.maxSteps || this.currentStep >= this.maxSteps || !this.totalDistance) {
      return this.segments[this.segments.length - 1].end.coord;
    }
    this.currentStep++;

    const distanceFactor = this.ease
      ? this.ease(this.currentStep / this.maxSteps)
      : this.currentStep / this.maxSteps;
    this.lastDistanceFactor = distanceFactor;

    let distToTravel = distanceFactor * this.totalDistance;

    let activeSegment = this.segments[this.segments.length - 1];
    let foundIndex = this.segments.length - 1;
    for (let i = 0; i < this.segments.length; i++) {
      if (distToTravel <= this.segments[i].distance) {
        activeSegment = this.segments[i];
        foundIndex = i;
        break;
      }
      distToTravel -= this.segments[i].distance;
    }
    this.currentSegmentIndex = foundIndex;

    if (activeSegment.distance === 0) {
      return activeSegment.end.coord;
    }

    const t = Math.min(distToTravel / activeSegment.distance, 1);
    if (activeSegment.end.bezierControl !== undefined) {
      const ctrl = Array.isArray(activeSegment.end.bezierControl)
        ? activeSegment.end.bezierControl
        : [activeSegment.end.bezierControl];
      return findCoordOnBezierCurve(activeSegment.start.coord, ctrl, activeSegment.end.coord, t);
    }
    return coordOnLine(activeSegment.start.coord, activeSegment.end.coord, t);
  }

  get isComplete(): boolean {
    return this.currentStep >= this.maxSteps;
  }

  get needsLoop(): boolean {
    if (!this.loop || !this.isComplete) return false;
    // Mirror Python guard: only loop if there are meaningful segments beyond the origin segment.
    // A zero-distance path (already at destination) has maxSteps=0 and isComplete immediately;
    // without this guard it would loop infinitely within a single move() call.
    if (this.segments.length <= 1) return false;
    if (this.totalLoops === 0) return true; // infinite
    return this.currentLoop < this.totalLoops - 1;
  }

  get isFullyComplete(): boolean {
    if (!this.isComplete) return false;
    if (this.isHolding) return this.holdElapsed >= this.holdDuration;
    if (this.holdDuration > 0 && !this.isHolding) return false;
    return true;
  }

  startHold(): void {
    this.isHolding = true;
    this.holdElapsed = 0;
  }
}

export class Motion {
  currentCoord: Coord;
  previousCoord: Coord;
  paths: Map<string, Path> = new Map();
  activePath: Path | null = null;
  private _holdJustStarted = false;
  private _pathJustActivated: string[] = [];
  private _pendingLayer: number | null = null;

  constructor(inputCoord: Coord) {
    this.currentCoord = { ...inputCoord };
    this.previousCoord = { column: -1, row: -1 };
  }

  setCoordinate(coord: Coord): void {
    this.currentCoord = { ...coord };
  }

  newPath(id: string, speedOrConfig: number | PathConfig = 1, ease: EasingFunction | null = null): Path {
    const p = new Path(id, speedOrConfig, ease);
    this.paths.set(id, p);
    return p;
  }

  activatePath(path: Path | string): void {
    const p = typeof path === "string" ? this.paths.get(path) as Path : path;
    this.activePath = p;

    // Remove old origin segment if present (happens on loop re-activation)
    // Matches Python: activate_path removes origin_segment before inserting a new one
    if (p.originSegment) {
      const idx = p.segments.indexOf(p.originSegment);
      if (idx !== -1) {
        p.segments.splice(idx, 1);
        p.totalDistance -= p.originSegment.distance;
      }
      p.originSegment = null;
    }

    // Prepend origin segment from current coord to first waypoint.
    // If the first waypoint has a bezier control, the origin segment curves along it (matches Python).
    const firstWp = p.waypoints[0];
    const dist = firstWp.bezierControl !== undefined
      ? findLengthOfBezierCurve(this.currentCoord, firstWp.bezierControl, firstWp.coord)
      : lineLength(this.currentCoord, firstWp.coord);
    const originSeg: Segment = {
      start: { coord: { ...this.currentCoord } },
      end: firstWp,
      distance: dist,
    };

    p.originSegment = originSeg;
    p.segments = [originSeg, ...p.segments];
    p.totalDistance += dist;

    p.currentStep = 0;
    p.currentLoop = 0;
    p.currentSegmentIndex = -1;
    p.isHolding = false;
    p.holdElapsed = 0;
    p.maxSteps = Math.round(p.totalDistance / p.speed);

    // Signal pending layer change; character.ts applies it after activatePath()
    if (p.layer !== undefined) {
      this._pendingLayer = p.layer;
    }

    // Signal PATH_ACTIVATED — matches Python: activate_path() always fires PATH_ACTIVATED.
    // character.ts tick() drains this queue and dispatches each event.
    this._pathJustActivated.push(p.id);
  }

  move(): void {
    this._holdJustStarted = false;
    this.previousCoord = { ...this.currentCoord };
    if (!this.activePath || this.activePath.segments.length === 0) return;

    this.currentCoord = this.activePath.step();

    if (this.activePath.isComplete) {
      // NOTE: TS intentionally checks loop BEFORE hold, opposite of Python's order.
      // Python: hold fires after every loop iteration (between loops).
      // TS: hold fires once after all loops complete (post-loop pause).
      // This semantic is intentional for TS-only effects (e.g. bouncyballs) that use
      // holdDuration as a final pause after all bounces, not an inter-bounce pause.
      if (this.activePath.needsLoop) {
        const loopingPath = this.activePath;
        const nextLoop = loopingPath.currentLoop + 1;
        this.activePath = null;
        this.activatePath(loopingPath);  // resets currentLoop to 0; sets _pathJustActivated
        loopingPath.currentLoop = nextLoop;
        return;
      }

      // Check if hold phase should start
      if (this.activePath.holdDuration > 0 && !this.activePath.isHolding) {
        this.activePath.startHold();
        this._holdJustStarted = true;
        return;
      }

      // Check if fully complete (traversal + hold done)
      if (this.activePath.isFullyComplete) {
        this.activePath = null;
      }
    }
  }

  get holdJustStarted(): boolean {
    return this._holdJustStarted;
  }

  get pathJustActivated(): string[] {
    return this._pathJustActivated;
  }

  clearPathJustActivated(): void {
    this._pathJustActivated = [];
  }

  // Removes and returns the last entry — used by ACTIVATE_PATH action handler to prevent
  // double-firing PATH_ACTIVATED after firing it immediately in the same tick.
  popPathJustActivated(): string | undefined {
    return this._pathJustActivated.pop();
  }

  get pendingLayer(): number | null {
    return this._pendingLayer;
  }

  clearPendingLayer(): void {
    this._pendingLayer = null;
  }

  movementIsComplete(): boolean {
    return this.activePath === null;
  }
}

function lineLength(a: Coord, b: Coord): number {
  const dc = b.column - a.column;
  const dr = b.row - a.row;
  // Double row diff to account for terminal char aspect ratio
  return Math.hypot(dc, 2 * dr);
}

function coordOnLine(start: Coord, end: Coord, t: number): Coord {
  return {
    column: Math.round((1 - t) * start.column + t * end.column),
    row: Math.round((1 - t) * start.row + t * end.row),
  };
}
