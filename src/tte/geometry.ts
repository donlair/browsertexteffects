import type { Coord } from "./types";

export function findCoordsOnCircle(
  origin: Coord,
  radius: number,
  coordsLimit: number = 0,
  unique: boolean = true,
): Coord[] {
  const points: Coord[] = [];
  if (!radius) return points;

  const seen = new Set<string>();
  if (!coordsLimit) {
    coordsLimit = Math.round(2 * Math.PI * radius);
  }
  const angleStep = (2 * Math.PI) / coordsLimit;

  for (let i = 0; i < coordsLimit; i++) {
    const angle = angleStep * i;
    let x = origin.column + radius * Math.cos(angle);
    // correct for terminal character height/width ratio by doubling the x distance from origin
    const xDiff = x - origin.column;
    x += xDiff;
    const y = origin.row + radius * Math.sin(angle);
    const point: Coord = { column: Math.round(x), row: Math.round(y) };

    if (unique) {
      const key = `${point.column},${point.row}`;
      if (!seen.has(key)) {
        points.push(point);
      }
      seen.add(key);
    } else {
      points.push(point);
    }
  }

  return points;
}

export function findCoordsInCircle(center: Coord, diameter: number): Coord[] {
  const coords: Coord[] = [];
  if (!diameter) return coords;

  const h = center.column;
  const k = center.row;
  const aSquared = diameter ** 2;
  const bSquared = (diameter / 2) ** 2;

  for (let x = h - diameter; x <= h + diameter; x++) {
    const xComponent = ((x - h) ** 2) / aSquared;
    const maxYOffset = Math.floor((bSquared * (1 - xComponent)) ** 0.5);
    for (let y = k - maxYOffset; y <= k + maxYOffset; y++) {
      coords.push({ column: x, row: y });
    }
  }

  return coords;
}

export function findCoordsInRect(origin: Coord, distance: number): Coord[] {
  const coords: Coord[] = [];
  if (!distance) return coords;

  const left = origin.column - distance;
  const right = origin.column + distance;
  const top = origin.row - distance;
  const bottom = origin.row + distance;

  for (let col = left; col <= right; col++) {
    for (let row = top; row <= bottom; row++) {
      coords.push({ column: col, row });
    }
  }

  return coords;
}

export function findCoordsOnRect(
  origin: Coord,
  halfWidth: number,
  halfHeight: number,
): Coord[] {
  const coords: Coord[] = [];
  if (!halfWidth || !halfHeight) return coords;

  for (let col = origin.column - halfWidth; col <= origin.column + halfWidth; col++) {
    if (col === origin.column - halfWidth || col === origin.column + halfWidth) {
      for (let row = origin.row - halfHeight; row <= origin.row + halfHeight; row++) {
        coords.push({ column: col, row });
      }
    } else {
      coords.push({ column: col, row: origin.row - halfHeight });
      coords.push({ column: col, row: origin.row + halfHeight });
    }
  }

  return coords;
}

export function extrapolateAlongRay(
  origin: Coord,
  target: Coord,
  offsetFromTarget: number,
): Coord {
  const totalDistance = findLengthOfLine(origin, target) + offsetFromTarget;
  const lineLen = findLengthOfLine(origin, target);
  if (totalDistance === 0 || (origin.column === target.column && origin.row === target.row)) {
    return target;
  }
  const t = totalDistance / lineLen;
  const nextColumn = (1 - t) * origin.column + t * target.column;
  const nextRow = (1 - t) * origin.row + t * target.row;
  return { column: Math.round(nextColumn), row: Math.round(nextRow) };
}

export function findCoordOnBezierCurve(
  start: Coord,
  control: Coord[],
  end: Coord,
  t: number,
): Coord {
  const points: Coord[] = [start, ...control, end];

  function deCasteljau(pts: Coord[], t: number): Coord {
    if (pts.length === 1) return pts[0];
    const newPoints: Coord[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const x = (1 - t) * pts[i].column + t * pts[i + 1].column;
      const y = (1 - t) * pts[i].row + t * pts[i + 1].row;
      newPoints.push({ column: x, row: y });
    }
    return deCasteljau(newPoints, t);
  }

  const result = deCasteljau(points, t);
  return { column: Math.round(result.column), row: Math.round(result.row) };
}

export function findCoordOnLine(start: Coord, end: Coord, t: number): Coord {
  const x = (1 - t) * start.column + t * end.column;
  const y = (1 - t) * start.row + t * end.row;
  return { column: Math.round(x), row: Math.round(y) };
}

export function findLengthOfBezierCurve(
  start: Coord,
  control: Coord | Coord[],
  end: Coord,
): number {
  const ctrlArray = Array.isArray(control) ? control : [control];
  let length = 0;
  let prevCoord = start;
  for (let i = 1; i <= 9; i++) {
    const coord = findCoordOnBezierCurve(start, ctrlArray, end, i / 10);
    length += findLengthOfLine(prevCoord, coord, true);
    prevCoord = coord;
  }
  return length;
}

export function findLengthOfLine(
  coord1: Coord,
  coord2: Coord,
  doubleRowDiff: boolean = false,
): number {
  const colDiff = coord2.column - coord1.column;
  const rowDiff = coord2.row - coord1.row;
  if (doubleRowDiff) {
    return Math.hypot(colDiff, 2 * rowDiff);
  }
  return Math.hypot(colDiff, rowDiff);
}

export function findNormalizedDistanceFromCenter(
  bottom: number,
  top: number,
  left: number,
  right: number,
  coord: Coord,
): number {
  const yOffset = bottom - 1;
  const xOffset = left - 1;
  const adjRight = right - xOffset;
  const adjTop = top - yOffset;
  const centerX = adjRight / 2;
  const centerY = adjTop / 2;

  const maxDistance = ((adjRight ** 2) + ((adjTop * 2) ** 2)) ** 0.5;
  const distance = (
    ((coord.column - xOffset) - centerX) ** 2 +
    (((coord.row - yOffset) - centerY) * 2) ** 2
  ) ** 0.5;

  return distance / (maxDistance / 2);
}
