import { Coord, EasingFunction } from "./types";

export interface Waypoint {
  coord: Coord;
}

interface Segment {
  start: Waypoint;
  end: Waypoint;
  distance: number;
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

  constructor(id: string, speed = 1, ease: EasingFunction | null = null) {
    this.id = id;
    this.speed = speed;
    this.ease = ease;
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
    if (!this.maxSteps || this.currentStep >= this.maxSteps || !this.totalDistance) {
      return this.segments[this.segments.length - 1].end.coord;
    }
    this.currentStep++;

    const distanceFactor = this.ease
      ? this.ease(this.currentStep / this.maxSteps)
      : this.currentStep / this.maxSteps;

    let distToTravel = distanceFactor * this.totalDistance;

    let activeSegment = this.segments[this.segments.length - 1];
    for (const seg of this.segments) {
      if (distToTravel <= seg.distance) {
        activeSegment = seg;
        break;
      }
      distToTravel -= seg.distance;
    }

    if (activeSegment.distance === 0) {
      return activeSegment.end.coord;
    }

    const t = Math.min(distToTravel / activeSegment.distance, 1);
    return coordOnLine(activeSegment.start.coord, activeSegment.end.coord, t);
  }

  get isComplete(): boolean {
    return this.currentStep >= this.maxSteps;
  }
}

export class Motion {
  currentCoord: Coord;
  previousCoord: Coord;
  paths: Map<string, Path> = new Map();
  activePath: Path | null = null;

  constructor(inputCoord: Coord) {
    this.currentCoord = { ...inputCoord };
    this.previousCoord = { column: -1, row: -1 };
  }

  setCoordinate(coord: Coord): void {
    this.currentCoord = { ...coord };
  }

  newPath(id: string, speed = 1, ease: EasingFunction | null = null): Path {
    const p = new Path(id, speed, ease);
    this.paths.set(id, p);
    return p;
  }

  activatePath(path: Path | string): void {
    const p = typeof path === "string" ? this.paths.get(path)! : path;
    this.activePath = p;

    // Create origin segment from current coord to first waypoint
    const firstWp = p.waypoints[0];
    const dist = lineLength(this.currentCoord, firstWp.coord);
    const originSeg: Segment = {
      start: { coord: { ...this.currentCoord } },
      end: firstWp,
      distance: dist,
    };

    // Remove old origin segment if present (identified as first segment with 'origin' start)
    if (p.segments.length > 0 && p.segments[0] !== p.segments[p.segments.length - 1]) {
      // If there's already an origin segment prepended, remove it
    }

    // Rebuild: origin + existing segments
    if (p.waypoints.length === 1) {
      p.segments = [originSeg];
      p.totalDistance = dist;
    } else {
      // Insert origin before existing segments
      p.segments.unshift(originSeg);
      p.totalDistance += dist;
    }

    p.currentStep = 0;
    p.maxSteps = Math.round(p.totalDistance / p.speed);
  }

  move(): void {
    this.previousCoord = { ...this.currentCoord };
    if (!this.activePath || this.activePath.segments.length === 0) return;

    this.currentCoord = this.activePath.step();

    if (this.activePath.currentStep >= this.activePath.maxSteps) {
      this.activePath = null;
    }
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
