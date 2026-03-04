import type { Coord, EasingFunction } from "./types";

export interface Waypoint {
  coord: Coord;
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
}

export class Path {
  id: string;
  speed: number;
  ease: EasingFunction | null;
  waypoints: Waypoint[] = [];
  segments: Segment[] = [];
  totalDistance = 0;
  currentStep = 0;
  maxSteps = 0;
  currentSegmentIndex = -1;

  // Hold: pause at final position for N ticks after all loops complete
  holdDuration: number = 0;
  holdElapsed: number = 0;
  isHolding: boolean = false;

  // Loop: replay path traversal
  loop: boolean = false;
  totalLoops: number = 0; // 0 = infinite, N = play N total times
  currentLoop: number = 0;

  // Stored by activatePath() so loops can strip the origin segment
  waypointSegments: Segment[] = [];
  waypointDistance: number = 0;

  constructor(id: string, speedOrConfig: number | PathConfig = 1, ease: EasingFunction | null = null) {
    this.id = id;
    if (typeof speedOrConfig === "object" && speedOrConfig !== null) {
      const cfg = speedOrConfig;
      this.speed = cfg.speed ?? 1;
      this.ease = cfg.ease ?? null;
      this.loop = cfg.loop ?? false;
      this.totalLoops = cfg.totalLoops ?? 0;
      this.holdDuration = cfg.holdDuration ?? 0;
    } else {
      this.speed = speedOrConfig;
      this.ease = ease;
    }
  }

  addWaypoint(coord: Coord): void {
    const wp: Waypoint = { coord };
    this.waypoints.push(wp);

    if (this.waypoints.length >= 2) {
      const prev = this.waypoints[this.waypoints.length - 2];
      const dist = lineLength(prev.coord, coord);
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
    return coordOnLine(activeSegment.start.coord, activeSegment.end.coord, t);
  }

  get isComplete(): boolean {
    return this.currentStep >= this.maxSteps;
  }

  get needsLoop(): boolean {
    if (!this.loop || !this.isComplete) return false;
    if (this.totalLoops === 0) return true; // infinite
    return this.currentLoop < this.totalLoops - 1;
  }

  get isFullyComplete(): boolean {
    if (!this.isComplete) return false;
    if (this.isHolding) return this.holdElapsed >= this.holdDuration;
    if (this.holdDuration > 0 && !this.isHolding) return false;
    return true;
  }

  resetForLoop(): void {
    this.currentLoop++;
    this.currentStep = 0;

    // Strip origin segment, use only waypoint segments
    if (this.waypointSegments.length > 0) {
      this.segments = [...this.waypointSegments];
      this.totalDistance = this.waypointDistance;
      this.maxSteps = Math.round(this.totalDistance / this.speed);
    }
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
    const p = typeof path === "string" ? this.paths.get(path)! : path;
    this.activePath = p;

    // Snapshot waypoint-only segments before prepending origin
    p.waypointSegments = [...p.segments];
    p.waypointDistance = p.totalDistance;

    // Create origin segment from current coord to first waypoint
    const firstWp = p.waypoints[0];
    const dist = lineLength(this.currentCoord, firstWp.coord);
    const originSeg: Segment = {
      start: { coord: { ...this.currentCoord } },
      end: firstWp,
      distance: dist,
    };

    // Rebuild: origin + existing segments
    if (p.waypoints.length === 1) {
      p.segments = [originSeg];
      p.totalDistance = dist;
    } else {
      p.segments = [originSeg, ...p.waypointSegments];
      p.totalDistance = p.waypointDistance + dist;
    }

    p.currentStep = 0;
    p.currentLoop = 0;
    p.isHolding = false;
    p.holdElapsed = 0;
    p.maxSteps = Math.round(p.totalDistance / p.speed);
  }

  move(): void {
    this._holdJustStarted = false;
    this.previousCoord = { ...this.currentCoord };
    if (!this.activePath || this.activePath.segments.length === 0) return;

    this.currentCoord = this.activePath.step();

    if (this.activePath.isComplete) {
      // Check if we need to loop
      if (this.activePath.needsLoop) {
        this.currentCoord = { ...this.activePath.waypoints[0].coord };
        this.activePath.resetForLoop();
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
