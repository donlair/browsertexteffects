var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/tte/scene.ts
function* cyclicDistribute(larger, smaller) {
  if (smaller.length === 0)
    return;
  const repeatFactor = Math.floor(larger.length / smaller.length);
  let overflow = larger.length % smaller.length;
  let smallerIdx = 0;
  let count = 0;
  let overflowUsed = false;
  for (const item of larger) {
    if (count >= repeatFactor) {
      if (overflow > 0) {
        if (overflowUsed) {
          smallerIdx++;
          count = 0;
          overflowUsed = false;
        } else {
          overflowUsed = true;
          overflow--;
        }
      } else {
        smallerIdx++;
        count = 0;
      }
    }
    count++;
    yield [item, smaller[smallerIdx]];
  }
}

class Scene {
  id;
  isLooping;
  frames = [];
  playedFrames = [];
  ease = null;
  frameIndexMap = [];
  easingTotalSteps = 0;
  easingCurrentStep = 0;
  sync = null;
  constructor(id, isLooping = false, options) {
    this.id = id;
    this.isLooping = isLooping;
    if (options) {
      this.ease = options.ease ?? null;
      this.sync = options.sync ?? null;
    }
  }
  addFrame(symbol, duration, fgColor = null, formatting) {
    const { bgColor = null, ...rest } = formatting ?? {};
    const frame = {
      visual: { symbol, fgColor, bgColor, ...rest },
      duration,
      ticksElapsed: 0
    };
    this.frames.push(frame);
    for (let i = 0;i < duration; i++) {
      this.frameIndexMap.push(frame);
    }
    this.easingTotalSteps += duration;
  }
  applyGradientToSymbols(symbols, duration, fgGradient, bgGradient = null) {
    const syms = typeof symbols === "string" ? [symbols] : symbols;
    const colorPairs = [];
    const fgColors = fgGradient?.spectrum ?? [];
    const bgColors = bgGradient?.spectrum ?? [];
    if (fgColors.length > 0 && bgColors.length > 0) {
      const larger = fgColors.length >= bgColors.length ? fgColors : bgColors;
      const smaller = fgColors.length >= bgColors.length ? bgColors : fgColors;
      const isLargerFg = fgColors.length >= bgColors.length;
      for (const [largerColor, smallerColor] of cyclicDistribute(larger, smaller)) {
        colorPairs.push(isLargerFg ? { fg: largerColor.rgbHex, bg: smallerColor.rgbHex } : { fg: smallerColor.rgbHex, bg: largerColor.rgbHex });
      }
    } else if (fgColors.length > 0) {
      for (const c of fgColors)
        colorPairs.push({ fg: c.rgbHex, bg: null });
    } else if (bgColors.length > 0) {
      for (const c of bgColors)
        colorPairs.push({ fg: null, bg: c.rgbHex });
    }
    if (colorPairs.length === 0)
      return;
    if (syms.length >= colorPairs.length) {
      for (const [sym, cp] of cyclicDistribute(syms, colorPairs)) {
        this.addFrame(sym, duration, cp.fg, { bgColor: cp.bg });
      }
    } else {
      for (const [cp, sym] of cyclicDistribute(colorPairs, syms)) {
        this.addFrame(sym, duration, cp.fg, { bgColor: cp.bg });
      }
    }
  }
  activate() {
    if (this.frames.length === 0)
      throw new Error(`Scene "${this.id}" has no frames`);
    return this.frames[0].visual;
  }
  getNextVisual() {
    const currentFrame = this.frames[0];
    const visual = currentFrame.visual;
    currentFrame.ticksElapsed++;
    if (currentFrame.ticksElapsed === currentFrame.duration) {
      currentFrame.ticksElapsed = 0;
      this.playedFrames.push(this.frames.shift());
      if (this.isLooping && this.frames.length === 0) {
        this.frames.push(...this.playedFrames);
        this.playedFrames = [];
      }
    }
    return visual;
  }
  get isComplete() {
    if (this.ease) {
      return this.easingCurrentStep >= this.easingTotalSteps || this.isLooping;
    }
    return this.frames.length === 0 || this.isLooping;
  }
  reset() {
    for (const f of this.frames) {
      f.ticksElapsed = 0;
      this.playedFrames.push(f);
    }
    this.frames = [...this.playedFrames];
    this.playedFrames = [];
    this.easingCurrentStep = 0;
  }
  getVisualAtIndex(index) {
    const i = Math.max(0, Math.min(index, this.frames.length - 1));
    return this.frames[i].visual;
  }
  getNextVisualEased() {
    const stepRatio = this.easingCurrentStep / Math.max(this.easingTotalSteps, 1);
    const easedRatio = this.ease(stepRatio);
    const frameIndex = Math.round(easedRatio * Math.max(this.easingTotalSteps - 1, 0));
    const clampedIndex = Math.max(0, Math.min(frameIndex, this.easingTotalSteps - 1));
    const frame = this.frameIndexMap[clampedIndex];
    this.easingCurrentStep++;
    if (this.easingCurrentStep >= this.easingTotalSteps) {
      if (this.isLooping) {
        this.easingCurrentStep = 0;
      } else {
        this.playedFrames.push(...this.frames);
        this.frames = [];
      }
    }
    return frame.visual;
  }
}

// src/tte/geometry.ts
var exports_geometry = {};
__export(exports_geometry, {
  findNormalizedDistanceFromCenter: () => findNormalizedDistanceFromCenter,
  findLengthOfLine: () => findLengthOfLine,
  findLengthOfBezierCurve: () => findLengthOfBezierCurve,
  findCoordsOnRect: () => findCoordsOnRect,
  findCoordsOnCircle: () => findCoordsOnCircle,
  findCoordsInRect: () => findCoordsInRect,
  findCoordsInCircle: () => findCoordsInCircle,
  findCoordOnLine: () => findCoordOnLine,
  findCoordOnBezierCurve: () => findCoordOnBezierCurve,
  extrapolateAlongRay: () => extrapolateAlongRay
});
function findCoordsOnCircle(origin, radius, coordsLimit = 0, unique = true) {
  const points = [];
  if (!radius)
    return points;
  const seen = new Set;
  if (!coordsLimit) {
    coordsLimit = Math.round(2 * Math.PI * radius);
  }
  const angleStep = 2 * Math.PI / coordsLimit;
  for (let i = 0;i < coordsLimit; i++) {
    const angle = angleStep * i;
    let x = origin.column + radius * Math.cos(angle);
    const xDiff = x - origin.column;
    x += xDiff;
    const y = origin.row + radius * Math.sin(angle);
    const point = { column: Math.round(x), row: Math.round(y) };
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
function findCoordsInCircle(center, diameter) {
  const coords = [];
  if (!diameter)
    return coords;
  const h = center.column;
  const k = center.row;
  const aSquared = diameter ** 2;
  const bSquared = (diameter / 2) ** 2;
  for (let x = h - diameter;x <= h + diameter; x++) {
    const xComponent = (x - h) ** 2 / aSquared;
    const maxYOffset = Math.floor((bSquared * (1 - xComponent)) ** 0.5);
    for (let y = k - maxYOffset;y <= k + maxYOffset; y++) {
      coords.push({ column: x, row: y });
    }
  }
  return coords;
}
function findCoordsInRect(origin, distance) {
  const coords = [];
  if (!distance)
    return coords;
  const left = origin.column - distance;
  const right = origin.column + distance;
  const top = origin.row - distance;
  const bottom = origin.row + distance;
  for (let col = left;col <= right; col++) {
    for (let row = top;row <= bottom; row++) {
      coords.push({ column: col, row });
    }
  }
  return coords;
}
function findCoordsOnRect(origin, halfWidth, halfHeight) {
  const coords = [];
  if (!halfWidth || !halfHeight)
    return coords;
  for (let col = origin.column - halfWidth;col <= origin.column + halfWidth; col++) {
    if (col === origin.column - halfWidth || col === origin.column + halfWidth) {
      for (let row = origin.row - halfHeight;row <= origin.row + halfHeight; row++) {
        coords.push({ column: col, row });
      }
    } else {
      coords.push({ column: col, row: origin.row - halfHeight });
      coords.push({ column: col, row: origin.row + halfHeight });
    }
  }
  return coords;
}
function extrapolateAlongRay(origin, target, offsetFromTarget) {
  const lineLen = findLengthOfLine(origin, target);
  const totalDistance = lineLen + offsetFromTarget;
  if (totalDistance === 0 || origin.column === target.column && origin.row === target.row) {
    return target;
  }
  const t = totalDistance / lineLen;
  const nextColumn = (1 - t) * origin.column + t * target.column;
  const nextRow = (1 - t) * origin.row + t * target.row;
  return { column: Math.round(nextColumn), row: Math.round(nextRow) };
}
function findCoordOnBezierCurve(start, control, end, t) {
  const points = [start, ...control, end];
  function deCasteljau(pts, t2) {
    if (pts.length === 1)
      return pts[0];
    const newPoints = [];
    for (let i = 0;i < pts.length - 1; i++) {
      const x = (1 - t2) * pts[i].column + t2 * pts[i + 1].column;
      const y = (1 - t2) * pts[i].row + t2 * pts[i + 1].row;
      newPoints.push({ column: x, row: y });
    }
    return deCasteljau(newPoints, t2);
  }
  const result = deCasteljau(points, t);
  return { column: Math.round(result.column), row: Math.round(result.row) };
}
function findCoordOnLine(start, end, t) {
  const x = (1 - t) * start.column + t * end.column;
  const y = (1 - t) * start.row + t * end.row;
  return { column: Math.round(x), row: Math.round(y) };
}
function findLengthOfBezierCurve(start, control, end) {
  const ctrlArray = Array.isArray(control) ? control : [control];
  let length = 0;
  let prevCoord = start;
  for (let i = 1;i <= 9; i++) {
    const coord = findCoordOnBezierCurve(start, ctrlArray, end, i / 10);
    length += findLengthOfLine(prevCoord, coord, true);
    prevCoord = coord;
  }
  return length;
}
function findLengthOfLine(coord1, coord2, doubleRowDiff = false) {
  const colDiff = coord2.column - coord1.column;
  const rowDiff = coord2.row - coord1.row;
  if (doubleRowDiff) {
    return Math.hypot(colDiff, 2 * rowDiff);
  }
  return Math.hypot(colDiff, rowDiff);
}
function findNormalizedDistanceFromCenter(bottom, top, left, right, coord) {
  const yOffset = bottom - 1;
  const xOffset = left - 1;
  const adjRight = right - xOffset;
  const adjTop = top - yOffset;
  const centerX = adjRight / 2;
  const centerY = adjTop / 2;
  const maxDistance = (adjRight ** 2 + (adjTop * 2) ** 2) ** 0.5;
  const distance = ((coord.column - xOffset - centerX) ** 2 + ((coord.row - yOffset - centerY) * 2) ** 2) ** 0.5;
  return distance / (maxDistance / 2);
}

// src/tte/motion.ts
class Path {
  id;
  speed;
  ease;
  layer;
  waypoints = [];
  segments = [];
  totalDistance = 0;
  currentStep = 0;
  maxSteps = 0;
  currentSegmentIndex = -1;
  originSegment = null;
  holdDuration = 0;
  holdElapsed = 0;
  isHolding = false;
  loop = false;
  totalLoops = 0;
  currentLoop = 0;
  lastDistanceFactor = 0;
  constructor(id, speedOrConfig = 1, ease = null) {
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
  addWaypoint(coord, bezierControl) {
    const wp = bezierControl !== undefined ? { coord, bezierControl } : { coord };
    this.waypoints.push(wp);
    if (this.waypoints.length >= 2) {
      const prev = this.waypoints[this.waypoints.length - 2];
      const dist = wp.bezierControl !== undefined ? findLengthOfBezierCurve(prev.coord, wp.bezierControl, coord) : lineLength(prev.coord, coord);
      this.totalDistance += dist;
      this.segments.push({ start: prev, end: wp, distance: dist });
      this.maxSteps = Math.round(this.totalDistance / this.speed);
    }
  }
  step() {
    if (this.isHolding) {
      this.holdElapsed++;
      return this.segments[this.segments.length - 1].end.coord;
    }
    if (!this.maxSteps || this.currentStep >= this.maxSteps || !this.totalDistance) {
      return this.segments[this.segments.length - 1].end.coord;
    }
    this.currentStep++;
    const distanceFactor = this.ease ? this.ease(this.currentStep / this.maxSteps) : this.currentStep / this.maxSteps;
    this.lastDistanceFactor = distanceFactor;
    let distToTravel = distanceFactor * this.totalDistance;
    let activeSegment = this.segments[this.segments.length - 1];
    let foundIndex = this.segments.length - 1;
    for (let i = 0;i < this.segments.length; i++) {
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
      const ctrl = Array.isArray(activeSegment.end.bezierControl) ? activeSegment.end.bezierControl : [activeSegment.end.bezierControl];
      return findCoordOnBezierCurve(activeSegment.start.coord, ctrl, activeSegment.end.coord, t);
    }
    return coordOnLine(activeSegment.start.coord, activeSegment.end.coord, t);
  }
  get isComplete() {
    return this.currentStep >= this.maxSteps;
  }
  get needsLoop() {
    if (!this.loop || !this.isComplete)
      return false;
    if (this.segments.length <= 1)
      return false;
    if (this.totalLoops === 0)
      return true;
    return this.currentLoop < this.totalLoops - 1;
  }
  get isFullyComplete() {
    if (!this.isComplete)
      return false;
    if (this.isHolding)
      return this.holdElapsed >= this.holdDuration;
    if (this.holdDuration > 0 && !this.isHolding)
      return false;
    return true;
  }
  startHold() {
    this.isHolding = true;
    this.holdElapsed = 0;
  }
}

class Motion {
  currentCoord;
  previousCoord;
  paths = new Map;
  activePath = null;
  _holdJustStarted = false;
  _pathJustActivated = [];
  _pendingLayer = null;
  constructor(inputCoord) {
    this.currentCoord = { ...inputCoord };
    this.previousCoord = { column: -1, row: -1 };
  }
  setCoordinate(coord) {
    this.currentCoord = { ...coord };
  }
  newPath(id, speedOrConfig = 1, ease = null) {
    const p = new Path(id, speedOrConfig, ease);
    this.paths.set(id, p);
    return p;
  }
  activatePath(path) {
    const p = typeof path === "string" ? this.paths.get(path) : path;
    this.activePath = p;
    if (p.originSegment) {
      const idx = p.segments.indexOf(p.originSegment);
      if (idx !== -1) {
        p.segments.splice(idx, 1);
        p.totalDistance -= p.originSegment.distance;
      }
      p.originSegment = null;
    }
    const firstWp = p.waypoints[0];
    const dist = firstWp.bezierControl !== undefined ? findLengthOfBezierCurve(this.currentCoord, firstWp.bezierControl, firstWp.coord) : lineLength(this.currentCoord, firstWp.coord);
    const originSeg = {
      start: { coord: { ...this.currentCoord } },
      end: firstWp,
      distance: dist
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
    if (p.layer !== undefined) {
      this._pendingLayer = p.layer;
    }
    this._pathJustActivated.push(p.id);
  }
  move() {
    this._holdJustStarted = false;
    this.previousCoord = { ...this.currentCoord };
    if (!this.activePath || this.activePath.segments.length === 0)
      return;
    this.currentCoord = this.activePath.step();
    if (this.activePath.isComplete) {
      if (this.activePath.needsLoop) {
        const loopingPath = this.activePath;
        const nextLoop = loopingPath.currentLoop + 1;
        this.activePath = null;
        this.activatePath(loopingPath);
        loopingPath.currentLoop = nextLoop;
        return;
      }
      if (this.activePath.holdDuration > 0 && !this.activePath.isHolding) {
        this.activePath.startHold();
        this._holdJustStarted = true;
        return;
      }
      if (this.activePath.isFullyComplete) {
        this.activePath = null;
      }
    }
  }
  get holdJustStarted() {
    return this._holdJustStarted;
  }
  get pathJustActivated() {
    return this._pathJustActivated;
  }
  clearPathJustActivated() {
    this._pathJustActivated = [];
  }
  popPathJustActivated() {
    return this._pathJustActivated.pop();
  }
  get pendingLayer() {
    return this._pendingLayer;
  }
  clearPendingLayer() {
    this._pendingLayer = null;
  }
  movementIsComplete() {
    return this.activePath === null;
  }
}
function lineLength(a, b) {
  const dc = b.column - a.column;
  const dr = b.row - a.row;
  return Math.hypot(dc, 2 * dr);
}
function coordOnLine(start, end, t) {
  return {
    column: Math.round((1 - t) * start.column + t * end.column),
    row: Math.round((1 - t) * start.row + t * end.row)
  };
}

// src/tte/events.ts
class EventHandler {
  registry = new Map;
  register(event, callerId, action, target = null) {
    const key = `${event}:${callerId}`;
    if (!this.registry.has(key)) {
      this.registry.set(key, []);
    }
    this.registry.get(key)?.push({ action, target });
  }
  getActions(event, callerId) {
    const key = `${event}:${callerId}`;
    return this.registry.get(key) ?? [];
  }
}

// src/tte/character.ts
class EffectCharacter {
  id;
  inputSymbol;
  inputCoord;
  isVisible = false;
  isSpace = false;
  layer = 0;
  scenes = new Map;
  activeScene = null;
  currentVisual;
  motion;
  eventHandler;
  constructor(id, symbol, col, row) {
    this.id = id;
    this.inputSymbol = symbol;
    this.inputCoord = { column: col, row };
    this.currentVisual = { symbol, fgColor: null };
    this.motion = new Motion(this.inputCoord);
    this.eventHandler = new EventHandler;
  }
  newScene(id, isLooping = false, options) {
    const scene = new Scene(id, isLooping, options);
    this.scenes.set(id, scene);
    return scene;
  }
  activateScene(sceneOrId) {
    const scene = typeof sceneOrId === "string" ? this.scenes.get(sceneOrId) : sceneOrId;
    if (!scene)
      return;
    this.activeScene = scene;
    this.currentVisual = scene.activate();
    this._handleActions("SCENE_ACTIVATED", scene.id);
  }
  tick() {
    const pathWasActive = this.motion.activePath;
    const prevSegIdx = pathWasActive?.currentSegmentIndex ?? -1;
    this.motion.move();
    if (this.motion.pendingLayer !== null) {
      this.layer = this.motion.pendingLayer;
      this.motion.clearPendingLayer();
    }
    if (pathWasActive && !pathWasActive.isHolding) {
      const newSegIdx = pathWasActive.currentSegmentIndex;
      if (prevSegIdx !== newSegIdx) {
        if (prevSegIdx >= 0) {
          this._handleActions("SEGMENT_EXITED", `${pathWasActive.id}:${prevSegIdx}`);
        }
        if (newSegIdx >= 0) {
          this._handleActions("SEGMENT_ENTERED", `${pathWasActive.id}:${newSegIdx}`);
        }
      }
    }
    if (pathWasActive && this.motion.holdJustStarted) {
      this._handleActions("PATH_HOLDING", pathWasActive.id);
    }
    for (const pathId of this.motion.pathJustActivated) {
      this._handleActions("PATH_ACTIVATED", pathId);
    }
    this.motion.clearPathJustActivated();
    if (pathWasActive && this.motion.activePath === null) {
      this._handleActions("PATH_COMPLETE", pathWasActive.id);
    }
    if (this.activeScene && this.activeScene.frames.length > 0) {
      const scene = this.activeScene;
      if (scene.sync && this.motion.activePath) {
        const path = this.motion.activePath;
        let progress;
        if (scene.sync === "STEP") {
          progress = Math.max(path.currentStep, 1) / Math.max(path.maxSteps, 1);
        } else {
          progress = path.lastDistanceFactor;
        }
        const frameIdx = Math.round((scene.frames.length - 1) * progress);
        this.currentVisual = scene.getVisualAtIndex(frameIdx);
      } else if (scene.sync && !this.motion.activePath) {
        this.currentVisual = scene.getVisualAtIndex(scene.frames.length - 1);
        scene.playedFrames.push(...scene.frames);
        scene.frames = [];
        const completedScene = scene;
        scene.reset();
        this.activeScene = null;
        this._handleActions("SCENE_COMPLETE", completedScene.id);
      } else if (scene.ease) {
        this.currentVisual = scene.getNextVisualEased();
        if (scene.isComplete) {
          const completedScene = scene;
          if (!scene.isLooping) {
            scene.reset();
            this.activeScene = null;
          }
          this._handleActions("SCENE_COMPLETE", completedScene.id);
        }
      } else {
        this.currentVisual = scene.getNextVisual();
        if (scene.isComplete) {
          const completedScene = scene;
          if (!scene.isLooping) {
            scene.reset();
            this.activeScene = null;
          }
          this._handleActions("SCENE_COMPLETE", completedScene.id);
        }
      }
    }
  }
  _handleActions(event, callerId) {
    const actions = this.eventHandler.getActions(event, callerId);
    for (const reg of actions) {
      switch (reg.action) {
        case "ACTIVATE_SCENE": {
          const scene = this.scenes.get(reg.target);
          if (scene)
            this.activateScene(scene);
          break;
        }
        case "ACTIVATE_PATH": {
          this.motion.activatePath(reg.target);
          if (this.motion.pendingLayer !== null) {
            this.layer = this.motion.pendingLayer;
            this.motion.clearPendingLayer();
          }
          this._handleActions("PATH_ACTIVATED", reg.target);
          this.motion.popPathJustActivated();
          break;
        }
        case "DEACTIVATE_PATH": {
          if (this.motion.activePath?.id === reg.target) {
            this.motion.activePath = null;
          }
          break;
        }
        case "DEACTIVATE_SCENE": {
          if (this.activeScene) {
            this.activeScene.reset();
            this.activeScene = null;
          }
          break;
        }
        case "RESET_APPEARANCE": {
          this.currentVisual = {
            symbol: this.inputSymbol,
            fgColor: null,
            bgColor: null,
            bold: false,
            italic: false,
            underline: false,
            blink: false,
            reverse: false,
            hidden: false,
            dim: false,
            strike: false
          };
          if (this.activeScene) {
            this.activeScene.reset();
            this.activeScene = null;
          }
          break;
        }
        case "SET_LAYER": {
          this.layer = reg.target;
          break;
        }
        case "SET_COORDINATE": {
          this.motion.setCoordinate(reg.target);
          break;
        }
        case "CALLBACK": {
          const cb = reg.target;
          if (cb)
            cb.callback(this, ...cb.args);
          break;
        }
      }
    }
  }
  get isActive() {
    const animActive = this.activeScene !== null && !this.activeScene.isComplete;
    const motionActive = !this.motion.movementIsComplete();
    return animActive || motionActive;
  }
}

// src/tte/canvas.ts
class Canvas {
  characters = [];
  dims;
  constructor(text, opts) {
    const includeSpaces = opts?.includeSpaces ?? false;
    const lines = text.split(`
`);
    while (lines.length > 0 && lines[lines.length - 1].trim() === "")
      lines.pop();
    while (lines.length > 0 && lines[0].trim() === "")
      lines.shift();
    let id = 0;
    let maxCol = 0;
    const numRows = lines.length;
    for (let lineIdx = 0;lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (line.trim().length === 0)
        continue;
      const row = numRows - lineIdx;
      for (let colIdx = 0;colIdx < line.length; colIdx++) {
        const ch = line[colIdx];
        if (!includeSpaces && ch === " ")
          continue;
        const col = colIdx + 1;
        const ec = new EffectCharacter(id++, ch, col, row);
        ec.isSpace = ch === " ";
        this.characters.push(ec);
        if (col > maxCol)
          maxCol = col;
      }
    }
    const left = 1;
    const right = maxCol;
    const bottom = 1;
    const top = numRows;
    const width = right;
    const height = top;
    const centerRow = Math.ceil(top / 2);
    const centerColumn = Math.ceil(right / 2);
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
      textCenter: { column: textCenterColumn, row: textCenterRow }
    };
  }
  getCharacters() {
    return this.characters;
  }
  getNonSpaceCharacters() {
    return this.characters.filter((ch) => !ch.isSpace);
  }
  coordIsInCanvas(coord) {
    const { left, right, bottom, top } = this.dims;
    return left <= coord.column && coord.column <= right && bottom <= coord.row && coord.row <= top;
  }
  coordIsInText(coord) {
    const { textLeft, textRight, textBottom, textTop } = this.dims;
    return textLeft <= coord.column && coord.column <= textRight && textBottom <= coord.row && coord.row <= textTop;
  }
  randomColumn(withinTextBoundary = false) {
    const lo = withinTextBoundary ? this.dims.textLeft : this.dims.left;
    const hi = withinTextBoundary ? this.dims.textRight : this.dims.right;
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
  randomRow(withinTextBoundary = false) {
    const lo = withinTextBoundary ? this.dims.textBottom : this.dims.bottom;
    const hi = withinTextBoundary ? this.dims.textTop : this.dims.top;
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
  randomCoord(opts) {
    const { left, right, bottom, top } = this.dims;
    if (opts?.outsideScope) {
      const above = { column: this.randomColumn(), row: top + 1 };
      const below = { column: this.randomColumn(), row: bottom - 1 };
      const leftOf = { column: left - 1, row: this.randomRow() };
      const rightOf = { column: right + 1, row: this.randomRow() };
      const choices = [above, below, leftOf, rightOf];
      return choices[Math.floor(Math.random() * choices.length)];
    }
    return { column: this.randomColumn(opts?.withinTextBoundary), row: this.randomRow(opts?.withinTextBoundary) };
  }
  getCharacterByInputCoord(coord) {
    return this.characters.find((c) => c.inputCoord.column === coord.column && c.inputCoord.row === coord.row);
  }
  getCharactersGrouped(grouping, opts) {
    const includeSpaces = opts?.includeSpaces ?? true;
    const pool = includeSpaces ? this.characters : this.getNonSpaceCharacters();
    const sorted = [...pool].sort((a, b) => a.inputCoord.row - b.inputCoord.row || a.inputCoord.column - b.inputCoord.column);
    if (grouping === "row" || grouping === "rowBottomToTop") {
      const rowMap = new Map;
      for (const ch of sorted) {
        if (!rowMap.has(ch.inputCoord.row))
          rowMap.set(ch.inputCoord.row, []);
        rowMap.get(ch.inputCoord.row)?.push(ch);
      }
      const rows = [...rowMap.entries()].sort((a, b) => grouping === "row" ? b[0] - a[0] : a[0] - b[0]);
      return rows.map(([, chars]) => chars);
    }
    if (grouping === "column" || grouping === "columnRightToLeft") {
      const colMap = new Map;
      for (const ch of sorted) {
        if (!colMap.has(ch.inputCoord.column))
          colMap.set(ch.inputCoord.column, []);
        colMap.get(ch.inputCoord.column)?.push(ch);
      }
      const cols = [...colMap.entries()].sort((a, b) => grouping === "column" ? a[0] - b[0] : b[0] - a[0]);
      return cols.map(([, chars]) => chars);
    }
    if (grouping === "diagonal" || grouping === "diagonalTopRightToBottomLeft") {
      const diagMap = new Map;
      for (const ch of sorted) {
        const key = ch.inputCoord.row + ch.inputCoord.column;
        if (!diagMap.has(key))
          diagMap.set(key, []);
        diagMap.get(key)?.push(ch);
      }
      const diags = [...diagMap.entries()].sort((a, b) => grouping === "diagonal" ? a[0] - b[0] : b[0] - a[0]);
      return diags.map(([, chars]) => chars);
    }
    if (grouping === "diagonalTopLeftToBottomRight" || grouping === "diagonalBottomRightToTopLeft") {
      const diagMap = new Map;
      for (const ch of sorted) {
        const key = ch.inputCoord.column - ch.inputCoord.row;
        if (!diagMap.has(key))
          diagMap.set(key, []);
        diagMap.get(key)?.push(ch);
      }
      const diags = [...diagMap.entries()].sort((a, b) => grouping === "diagonalTopLeftToBottomRight" ? a[0] - b[0] : b[0] - a[0]);
      return diags.map(([, chars]) => chars);
    }
    if (grouping === "centerToOutside" || grouping === "outsideToCenter") {
      const { textCenter } = this.dims;
      const distMap = new Map;
      for (const ch of sorted) {
        const dist = Math.abs(ch.inputCoord.column - textCenter.column) + Math.abs(ch.inputCoord.row - textCenter.row);
        if (!distMap.has(dist))
          distMap.set(dist, []);
        distMap.get(dist)?.push(ch);
      }
      const distances = [...distMap.keys()].sort((a, b) => grouping === "centerToOutside" ? a - b : b - a);
      return distances.map((d) => distMap.get(d) ?? []);
    }
    return [sorted];
  }
}

// src/tte/renderer.ts
class DOMRenderer {
  container;
  canvas;
  spanStates = new Map;
  preMode;
  rowToDisplayY = new Map;
  lineHeight;
  cellWidthPx = 0;
  cellHeightPx = 0;
  static blinkStyleInjected = false;
  static injectBlinkStyle() {
    if (DOMRenderer.blinkStyleInjected)
      return;
    const style = document.createElement("style");
    style.textContent = `@keyframes tte-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }`;
    document.head.appendChild(style);
    DOMRenderer.blinkStyleInjected = true;
  }
  constructor(container, canvas, lineHeight = 1.2) {
    this.container = container;
    this.canvas = canvas;
    this.lineHeight = lineHeight;
    this.preMode = container.tagName === "PRE";
    DOMRenderer.injectBlinkStyle();
    if (this.preMode) {
      this._buildPreDOM();
    } else {
      this._buildAbsoluteDOM();
    }
  }
  _buildPreDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    const rowMap = new Map;
    for (const ch of this.canvas.characters) {
      const row = ch.inputCoord.row;
      if (!rowMap.has(row))
        rowMap.set(row, []);
      rowMap.get(row)?.push(ch);
    }
    const sortedRows = [...rowMap.keys()].sort((a, b) => b - a);
    for (let i = 0;i < sortedRows.length; i++) {
      const rowChars = rowMap.get(sortedRows[i]) ?? [];
      rowChars.sort((a, b) => a.inputCoord.column - b.inputCoord.column);
      const maxCol = rowChars[rowChars.length - 1].inputCoord.column;
      const colToChar = new Map;
      for (const ch of rowChars) {
        colToChar.set(ch.inputCoord.column, ch);
      }
      for (let col = 1;col <= maxCol; col++) {
        const ch = colToChar.get(col);
        const span = document.createElement("span");
        if (ch) {
          span.textContent = ch.inputSymbol;
          span.style.opacity = "0";
          this.container.appendChild(span);
          this.spanStates.set(ch.id, {
            span,
            lastSymbol: ch.inputSymbol,
            lastColor: null,
            lastBgColor: null,
            lastOpacity: "0",
            lastTransform: "",
            lastLayer: 0,
            lastBold: false,
            lastItalic: false,
            lastUnderline: false,
            lastBlink: false,
            lastReverse: false,
            lastHidden: false,
            lastDim: false,
            lastStrike: false
          });
        } else {
          span.textContent = " ";
          this.container.appendChild(span);
        }
      }
      if (i < sortedRows.length - 1) {
        const gap = sortedRows[i] - sortedRows[i + 1];
        this.container.appendChild(document.createTextNode(`
`.repeat(gap)));
      }
    }
  }
  _measureCell() {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.lineHeight = `${this.lineHeight}em`;
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidthPx = rect.width;
    this.cellHeightPx = rect.height;
    this.container.removeChild(probe);
  }
  _buildAbsoluteDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    const rowsWithChars = new Set;
    for (const ch2 of this.canvas.characters) {
      rowsWithChars.add(ch2.inputCoord.row);
    }
    const sortedRows = [...rowsWithChars].sort((a, b) => b - a);
    const maxRow = sortedRows[0];
    const minRow = sortedRows[sortedRows.length - 1];
    for (const row of sortedRows) {
      this.rowToDisplayY.set(row, maxRow - row);
    }
    const totalRows = maxRow - minRow + 1;
    const maxCol = this.canvas.dims.textRight;
    this.container.style.position = "relative";
    this.container.style.overflow = "hidden";
    this._measureCell();
    const cw = this.cellWidthPx;
    const ch = this.cellHeightPx;
    this.container.style.width = `${Math.round(maxCol * cw)}px`;
    this.container.style.height = `${Math.round(totalRows * ch)}px`;
    for (const char of this.canvas.characters) {
      const displayY = this.rowToDisplayY.get(char.inputCoord.row) ?? 0;
      const col = char.inputCoord.column;
      const span = document.createElement("span");
      span.textContent = char.inputSymbol;
      span.style.position = "absolute";
      span.style.left = `${Math.round((col - 1) * cw)}px`;
      span.style.top = `${Math.round(displayY * ch)}px`;
      span.style.width = `${Math.ceil(cw)}px`;
      span.style.lineHeight = `${Math.round(ch)}px`;
      span.style.opacity = "0";
      this.container.appendChild(span);
      this.spanStates.set(char.id, {
        span,
        lastSymbol: char.inputSymbol,
        lastColor: null,
        lastBgColor: null,
        lastOpacity: "0",
        lastTransform: "",
        lastLayer: 0,
        lastBold: false,
        lastItalic: false,
        lastUnderline: false,
        lastBlink: false,
        lastReverse: false,
        lastHidden: false,
        lastDim: false,
        lastStrike: false
      });
    }
  }
  render() {
    const cw = this.cellWidthPx;
    const ch = this.cellHeightPx;
    for (const char of this.canvas.characters) {
      const state = this.spanStates.get(char.id);
      if (!state)
        continue;
      const opacity = char.isVisible ? "1" : "0";
      const symbol = char.currentVisual.symbol;
      const reverse = !!char.currentVisual.reverse;
      const fgColor = reverse ? char.currentVisual.bgColor ?? null : char.currentVisual.fgColor;
      const bgColor = reverse ? char.currentVisual.fgColor : char.currentVisual.bgColor ?? null;
      if (state.lastOpacity !== opacity) {
        state.span.style.opacity = opacity;
        state.lastOpacity = opacity;
      }
      if (state.lastSymbol !== symbol) {
        state.span.textContent = symbol;
        state.lastSymbol = symbol;
      }
      if (state.lastColor !== fgColor) {
        state.span.style.color = fgColor ? `#${fgColor}` : "";
        state.lastColor = fgColor;
      }
      if (state.lastBgColor !== bgColor) {
        state.span.style.backgroundColor = bgColor ? `#${bgColor}` : "";
        state.lastBgColor = bgColor;
      }
      const bold = !!char.currentVisual.bold;
      const italic = !!char.currentVisual.italic;
      const underline = !!char.currentVisual.underline;
      const blink = !!char.currentVisual.blink;
      const hidden = !!char.currentVisual.hidden;
      const dim = !!char.currentVisual.dim;
      const strike = !!char.currentVisual.strike;
      if (state.lastBold !== bold) {
        state.span.style.fontWeight = bold ? "bold" : "";
        state.lastBold = bold;
      }
      if (state.lastItalic !== italic) {
        state.span.style.fontStyle = italic ? "italic" : "";
        state.lastItalic = italic;
      }
      if (state.lastDim !== dim) {
        state.span.style.filter = dim ? "brightness(0.5)" : "";
        state.lastDim = dim;
      }
      if (state.lastBlink !== blink) {
        state.span.style.animation = blink ? "tte-blink 1s step-end infinite" : "";
        state.lastBlink = blink;
      }
      if (state.lastReverse !== reverse) {
        state.lastReverse = reverse;
      }
      if (state.lastHidden !== hidden) {
        state.span.style.visibility = hidden ? "hidden" : "";
        state.lastHidden = hidden;
      }
      if (state.lastUnderline !== underline || state.lastStrike !== strike) {
        const decorations = [];
        if (underline)
          decorations.push("underline");
        if (strike)
          decorations.push("line-through");
        state.span.style.textDecoration = decorations.join(" ");
        state.lastUnderline = underline;
        state.lastStrike = strike;
      }
      if (!this.preMode) {
        const colOffset = char.motion.currentCoord.column - char.inputCoord.column;
        const rowDiff = char.motion.currentCoord.row - char.inputCoord.row;
        const rowOffset = -rowDiff;
        const transform = colOffset === 0 && rowOffset === 0 ? "" : `translate(${Math.round(colOffset * cw)}px, ${Math.round(rowOffset * ch)}px)`;
        if (state.lastTransform !== transform) {
          state.span.style.transform = transform;
          state.lastTransform = transform;
        }
        if (char.layer !== state.lastLayer) {
          state.span.style.zIndex = String(char.layer);
          state.lastLayer = char.layer;
        }
      }
    }
  }
}

// src/tte/types.ts
var XTERM_TO_HEX = {
  0: "000000",
  1: "800000",
  2: "008000",
  3: "808000",
  4: "000080",
  5: "800080",
  6: "008080",
  7: "c0c0c0",
  8: "808080",
  9: "ff0000",
  10: "00ff00",
  11: "ffff00",
  12: "0000ff",
  13: "ff00ff",
  14: "00ffff",
  15: "ffffff",
  16: "000000",
  17: "00005f",
  18: "000087",
  19: "0000af",
  20: "0000d7",
  21: "0000ff",
  22: "005f00",
  23: "005f5f",
  24: "005f87",
  25: "005faf",
  26: "005fd7",
  27: "005fff",
  28: "008700",
  29: "00875f",
  30: "008787",
  31: "0087af",
  32: "0087d7",
  33: "0087ff",
  34: "00af00",
  35: "00af5f",
  36: "00af87",
  37: "00afaf",
  38: "00afd7",
  39: "00afff",
  40: "00d700",
  41: "00d75f",
  42: "00d787",
  43: "00d7af",
  44: "00d7d7",
  45: "00d7ff",
  46: "00ff00",
  47: "00ff5f",
  48: "00ff87",
  49: "00ffaf",
  50: "00ffd7",
  51: "00ffff",
  52: "5f0000",
  53: "5f005f",
  54: "5f0087",
  55: "5f00af",
  56: "5f00d7",
  57: "5f00ff",
  58: "5f5f00",
  59: "5f5f5f",
  60: "5f5f87",
  61: "5f5faf",
  62: "5f5fd7",
  63: "5f5fff",
  64: "5f8700",
  65: "5f875f",
  66: "5f8787",
  67: "5f87af",
  68: "5f87d7",
  69: "5f87ff",
  70: "5faf00",
  71: "5faf5f",
  72: "5faf87",
  73: "5fafaf",
  74: "5fafd7",
  75: "5fafff",
  76: "5fd700",
  77: "5fd75f",
  78: "5fd787",
  79: "5fd7af",
  80: "5fd7d7",
  81: "5fd7ff",
  82: "5fff00",
  83: "5fff5f",
  84: "5fff87",
  85: "5fffaf",
  86: "5fffd7",
  87: "5fffff",
  88: "870000",
  89: "87005f",
  90: "870087",
  91: "8700af",
  92: "8700d7",
  93: "8700ff",
  94: "875f00",
  95: "875f5f",
  96: "875f87",
  97: "875faf",
  98: "875fd7",
  99: "875fff",
  100: "878700",
  101: "87875f",
  102: "878787",
  103: "8787af",
  104: "8787d7",
  105: "8787ff",
  106: "87af00",
  107: "87af5f",
  108: "87af87",
  109: "87afaf",
  110: "87afd7",
  111: "87afff",
  112: "87d700",
  113: "87d75f",
  114: "87d787",
  115: "87d7af",
  116: "87d7d7",
  117: "87d7ff",
  118: "87ff00",
  119: "87ff5f",
  120: "87ff87",
  121: "87ffaf",
  122: "87ffd7",
  123: "87ffff",
  124: "af0000",
  125: "af005f",
  126: "af0087",
  127: "af00af",
  128: "af00d7",
  129: "af00ff",
  130: "af5f00",
  131: "af5f5f",
  132: "af5f87",
  133: "af5faf",
  134: "af5fd7",
  135: "af5fff",
  136: "af8700",
  137: "af875f",
  138: "af8787",
  139: "af87af",
  140: "af87d7",
  141: "af87ff",
  142: "afaf00",
  143: "afaf5f",
  144: "afaf87",
  145: "afafaf",
  146: "afafd7",
  147: "afafff",
  148: "afd700",
  149: "afd75f",
  150: "afd787",
  151: "afd7af",
  152: "afd7d7",
  153: "afd7ff",
  154: "afff00",
  155: "afff5f",
  156: "afff87",
  157: "afffaf",
  158: "afffd7",
  159: "afffff",
  160: "d70000",
  161: "d7005f",
  162: "d70087",
  163: "d700af",
  164: "d700d7",
  165: "d700ff",
  166: "d75f00",
  167: "d75f5f",
  168: "d75f87",
  169: "d75faf",
  170: "d75fd7",
  171: "d75fff",
  172: "d78700",
  173: "d7875f",
  174: "d78787",
  175: "d787af",
  176: "d787d7",
  177: "d787ff",
  178: "d7af00",
  179: "d7af5f",
  180: "d7af87",
  181: "d7afaf",
  182: "d7afd7",
  183: "d7afff",
  184: "d7d700",
  185: "d7d75f",
  186: "d7d787",
  187: "d7d7af",
  188: "d7d7d7",
  189: "d7d7ff",
  190: "d7ff00",
  191: "d7ff5f",
  192: "d7ff87",
  193: "d7ffaf",
  194: "d7ffd7",
  195: "d7ffff",
  196: "ff0000",
  197: "ff005f",
  198: "ff0087",
  199: "ff00af",
  200: "ff00d7",
  201: "ff00ff",
  202: "ff5f00",
  203: "ff5f5f",
  204: "ff5f87",
  205: "ff5faf",
  206: "ff5fd7",
  207: "ff5fff",
  208: "ff8700",
  209: "ff875f",
  210: "ff8787",
  211: "ff87af",
  212: "ff87d7",
  213: "ff87ff",
  214: "ffaf00",
  215: "ffaf5f",
  216: "ffaf87",
  217: "ffafaf",
  218: "ffafd7",
  219: "ffafff",
  220: "ffd700",
  221: "ffd75f",
  222: "ffd787",
  223: "ffd7af",
  224: "ffd7d7",
  225: "ffd7ff",
  226: "ffff00",
  227: "ffff5f",
  228: "ffff87",
  229: "ffffaf",
  230: "ffffd7",
  231: "ffffff",
  232: "080808",
  233: "121212",
  234: "1c1c1c",
  235: "262626",
  236: "303030",
  237: "3a3a3a",
  238: "444444",
  239: "4e4e4e",
  240: "585858",
  241: "626262",
  242: "6c6c6c",
  243: "767676",
  244: "808080",
  245: "8a8a8a",
  246: "949494",
  247: "9e9e9e",
  248: "a8a8a8",
  249: "b2b2b2",
  250: "bcbcbc",
  251: "c6c6c6",
  252: "d0d0d0",
  253: "dadada",
  254: "e4e4e4",
  255: "eeeeee"
};
function xtermToHex(xterm) {
  const hex = XTERM_TO_HEX[xterm];
  if (hex === undefined)
    throw new Error(`Invalid XTerm-256 color code: ${xterm}`);
  return hex;
}
function color(hex) {
  if (typeof hex === "number")
    return { rgbHex: xtermToHex(hex) };
  return { rgbHex: hex.replace("#", "") };
}
function colorPair(fg, bg) {
  return { fg, bg: bg ?? null };
}
function rgbInts(c) {
  const hex = c.rgbHex;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}
function adjustBrightness(c, factor) {
  const [r, g, b] = rgbInts(c);
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  const nr = clamp(r * factor);
  const ng = clamp(g * factor);
  const nb = clamp(b * factor);
  return color(nr.toString(16).padStart(2, "0") + ng.toString(16).padStart(2, "0") + nb.toString(16).padStart(2, "0"));
}

// src/tte/gradient.ts
class Gradient {
  spectrum;
  constructor(stops, steps = 1, loop = false) {
    const effectiveStops = loop && stops.length > 0 ? [...stops, stops[0]] : stops;
    this.spectrum = this._generate(effectiveStops, Array.isArray(steps) ? steps : [steps]);
  }
  getColorAtFraction(fraction) {
    if (fraction <= 0)
      return this.spectrum[0];
    if (fraction >= 1)
      return this.spectrum[this.spectrum.length - 1];
    for (let i = 1;i <= this.spectrum.length; i++) {
      if (fraction <= i / this.spectrum.length) {
        return this.spectrum[i - 1];
      }
    }
    return this.spectrum[this.spectrum.length - 1];
  }
  _generate(stops, steps) {
    if (stops.length === 0)
      return [];
    if (stops.length === 1) {
      const result = [];
      for (let i = 0;i < steps[0]; i++)
        result.push(stops[0]);
      return result;
    }
    const pairs = [];
    for (let i = 0;i < stops.length - 1; i++) {
      pairs.push([stops[i], stops[i + 1]]);
    }
    const pairSteps = pairs.map((_, i) => steps[Math.min(i, steps.length - 1)]);
    const spectrum = [];
    for (let pairIdx = 0;pairIdx < pairs.length; pairIdx++) {
      const [start, end] = pairs[pairIdx];
      const stepCount = pairSteps[pairIdx];
      const startRgb = rgbInts(start);
      const endRgb = rgbInts(end);
      const redDelta = Math.floor((endRgb[0] - startRgb[0]) / stepCount);
      const greenDelta = Math.floor((endRgb[1] - startRgb[1]) / stepCount);
      const blueDelta = Math.floor((endRgb[2] - startRgb[2]) / stepCount);
      const rangeStart = spectrum.length > 0 ? 1 : 0;
      for (let i = rangeStart;i < stepCount; i++) {
        const r = clamp(startRgb[0] + redDelta * i, 0, 255);
        const g = clamp(startRgb[1] + greenDelta * i, 0, 255);
        const b = clamp(startRgb[2] + blueDelta * i, 0, 255);
        spectrum.push(color(`${hex2(r)}${hex2(g)}${hex2(b)}`));
      }
      spectrum.push(end);
    }
    return spectrum;
  }
  buildCoordinateColorMapping(minRow, maxRow, minCol, maxCol, direction) {
    const mapping = new Map;
    const rowOffset = minRow - 1;
    const colOffset = minCol - 1;
    if (direction === "vertical") {
      for (let row = minRow;row <= maxRow; row++) {
        const fraction = (row - rowOffset) / (maxRow - rowOffset);
        const c = this.getColorAtFraction(fraction);
        for (let col = minCol;col <= maxCol; col++) {
          mapping.set(coordKey(col, row), c);
        }
      }
    } else if (direction === "horizontal") {
      for (let col = minCol;col <= maxCol; col++) {
        const fraction = (col - colOffset) / (maxCol - colOffset);
        const c = this.getColorAtFraction(fraction);
        for (let row = minRow;row <= maxRow; row++) {
          mapping.set(coordKey(col, row), c);
        }
      }
    } else if (direction === "diagonal") {
      for (let row = minRow;row <= maxRow; row++) {
        for (let col = minCol;col <= maxCol; col++) {
          const fraction = ((row - rowOffset) * 2 + (col - colOffset)) / ((maxRow - rowOffset) * 2 + (maxCol - colOffset));
          mapping.set(coordKey(col, row), this.getColorAtFraction(fraction));
        }
      }
    } else if (direction === "radial") {
      for (let row = minRow;row <= maxRow; row++) {
        for (let col = minCol;col <= maxCol; col++) {
          const dist = normalizedDistFromCenter(minRow, maxRow, minCol, maxCol, col, row);
          mapping.set(coordKey(col, row), this.getColorAtFraction(dist));
        }
      }
    }
    return mapping;
  }
}
function coordKey(col, row) {
  return `${col},${row}`;
}
function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
function hex2(n) {
  return n.toString(16).padStart(2, "0");
}
function normalizedDistFromCenter(bottom, top, left, right, col, row) {
  const yOffset = bottom - 1;
  const xOffset = left - 1;
  const adjRight = right - xOffset;
  const adjTop = top - yOffset;
  const cx = adjRight / 2;
  const cy = adjTop / 2;
  const maxDist = Math.sqrt(adjRight ** 2 + (adjTop * 2) ** 2);
  const dist = Math.sqrt((col - xOffset - cx) ** 2 + ((row - yOffset - cy) * 2) ** 2);
  return dist / (maxDist / 2);
}

// src/tte/effects/decrypt.ts
var defaultDecryptConfig = {
  typingSpeed: 2,
  ciphertextColors: [color("008000"), color("00cb00"), color("00ff00")],
  finalGradientStops: [color("eda000")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};
var KEYBOARD = range(33, 127);
var BLOCKS = range(9608, 9632);
var BOX_DRAWING = range(9472, 9599);
var MISC = range(174, 452);
var ENCRYPTED_SYMBOLS = [...KEYBOARD, ...BLOCKS, ...BOX_DRAWING, ...MISC].map((n) => String.fromCharCode(n));
function range(start, end) {
  const r = [];
  for (let i = start;i < end; i++)
    r.push(i);
  return r;
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class DecryptEffect {
  canvas;
  config;
  typingPending = [];
  decryptingChars = new Set;
  activeChars = new Set;
  phase = "typing";
  characterFinalColorMap = new Map;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
    const animChars = this.canvas.getNonSpaceCharacters();
    for (const ch of animChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      this.characterFinalColorMap.set(ch.id, colorMapping.get(key) || this.config.finalGradientStops[0]);
    }
    this.prepareTyping(animChars);
    this.prepareDecrypt(animChars);
  }
  prepareTyping(chars) {
    for (const ch of chars) {
      const scene = ch.newScene("typing");
      for (const block of ["▉", "▓", "▒", "░"]) {
        scene.addFrame(block, 2, randChoice(this.config.ciphertextColors).rgbHex);
      }
      scene.addFrame(randChoice(ENCRYPTED_SYMBOLS), 1, randChoice(this.config.ciphertextColors).rgbHex);
      this.typingPending.push(ch);
    }
  }
  prepareDecrypt(chars) {
    for (const ch of chars) {
      const cipherColor = randChoice(this.config.ciphertextColors);
      const fastScene = ch.newScene("fast_decrypt");
      for (let i = 0;i < 80; i++) {
        fastScene.addFrame(randChoice(ENCRYPTED_SYMBOLS), 2, cipherColor.rgbHex);
      }
      const slowScene = ch.newScene("slow_decrypt");
      const slowCount = randInt(1, 15);
      for (let i = 0;i < slowCount; i++) {
        const duration = randInt(0, 100) <= 30 ? randInt(35, 59) : randInt(3, 5);
        slowScene.addFrame(randChoice(ENCRYPTED_SYMBOLS), duration, cipherColor.rgbHex);
      }
      const finalColor = this.characterFinalColorMap.get(ch.id) ?? color("ffffff");
      const discoveredScene = ch.newScene("discovered");
      const discoveredGradient = new Gradient([color("ffffff"), finalColor], 10);
      discoveredScene.applyGradientToSymbols(ch.inputSymbol, 5, discoveredGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "fast_decrypt", "ACTIVATE_SCENE", "slow_decrypt");
      ch.eventHandler.register("SCENE_COMPLETE", "slow_decrypt", "ACTIVATE_SCENE", "discovered");
      this.decryptingChars.add(ch);
    }
  }
  step() {
    if (this.phase === "typing") {
      if (this.typingPending.length > 0 || this.activeChars.size > 0) {
        if (this.typingPending.length > 0 && Math.random() <= 0.75) {
          for (let i = 0;i < this.config.typingSpeed && this.typingPending.length > 0; i++) {
            const ch = this.typingPending.shift();
            if (!ch)
              break;
            ch.isVisible = true;
            ch.activateScene("typing");
            this.activeChars.add(ch);
          }
        }
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      this.phase = "decrypting";
      this.activeChars = new Set(this.decryptingChars);
      for (const ch of this.activeChars) {
        ch.activateScene("fast_decrypt");
      }
    }
    if (this.phase === "decrypting") {
      if (this.activeChars.size > 0) {
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      return false;
    }
    return false;
  }
}

// src/tte/easing.ts
var exports_easing = {};
__export(exports_easing, {
  outSine: () => outSine,
  outQuint: () => outQuint,
  outQuart: () => outQuart,
  outQuad: () => outQuad,
  outExpo: () => outExpo,
  outElastic: () => outElastic,
  outCubic: () => outCubic,
  outCirc: () => outCirc,
  outBounce: () => outBounce,
  outBack: () => outBack,
  makeEasing: () => makeEasing,
  linear: () => linear,
  inSine: () => inSine,
  inQuint: () => inQuint,
  inQuart: () => inQuart,
  inQuad: () => inQuad,
  inOutSine: () => inOutSine,
  inOutQuint: () => inOutQuint,
  inOutQuart: () => inOutQuart,
  inOutQuad: () => inOutQuad,
  inOutExpo: () => inOutExpo,
  inOutElastic: () => inOutElastic,
  inOutCubic: () => inOutCubic,
  inOutCirc: () => inOutCirc,
  inOutBounce: () => inOutBounce,
  inOutBack: () => inOutBack,
  inExpo: () => inExpo,
  inElastic: () => inElastic,
  inCubic: () => inCubic,
  inCirc: () => inCirc,
  inBounce: () => inBounce,
  inBack: () => inBack,
  SequenceEaser: () => SequenceEaser,
  EasingTracker: () => EasingTracker
});
var linear = (t) => t;
var inQuad = (t) => t ** 2;
var outQuad = (t) => 1 - (1 - t) * (1 - t);
var inOutQuad = (t) => t < 0.5 ? 2 * t ** 2 : 1 - (-2 * t + 2) ** 2 / 2;
var inCubic = (t) => t ** 3;
var outCubic = (t) => 1 - (1 - t) ** 3;
var inOutCubic = (t) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
var inSine = (t) => 1 - Math.cos(t * Math.PI / 2);
var outSine = (t) => Math.sin(t * Math.PI / 2);
var inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
var inExpo = (t) => t === 0 ? 0 : 2 ** (10 * t - 10);
var outExpo = (t) => t === 1 ? 1 : 1 - 2 ** (-10 * t);
var inOutExpo = (t) => {
  if (t === 0)
    return 0;
  if (t === 1)
    return 1;
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};
var inBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t ** 3 - c1 * t ** 2;
};
var outBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
var inOutBack = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5 ? (2 * t) ** 2 * ((c2 + 1) * 2 * t - c2) / 2 : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};
var inBounce = (t) => 1 - outBounce(1 - t);
var outBounce = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1)
    return n1 * t ** 2;
  if (t < 2 / d1)
    return n1 * (t - 1.5 / d1) ** 2 + 0.75;
  if (t < 2.5 / d1)
    return n1 * (t - 2.25 / d1) ** 2 + 0.9375;
  return n1 * (t - 2.625 / d1) ** 2 + 0.984375;
};
var inOutBounce = (t) => t < 0.5 ? (1 - outBounce(1 - 2 * t)) / 2 : (1 + outBounce(2 * t - 1)) / 2;
var inQuart = (t) => t ** 4;
var outQuart = (t) => 1 - (1 - t) ** 4;
var inOutQuart = (t) => t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
var inQuint = (t) => t ** 5;
var outQuint = (t) => 1 - (1 - t) ** 5;
var inOutQuint = (t) => t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
var inCirc = (t) => 1 - Math.sqrt(1 - t ** 2);
var outCirc = (t) => Math.sqrt(1 - (t - 1) ** 2);
var inOutCirc = (t) => t < 0.5 ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2 : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;
var inElastic = (t) => {
  const c4 = 2 * Math.PI / 3;
  if (t === 0)
    return 0;
  if (t === 1)
    return 1;
  return -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * c4);
};
var outElastic = (t) => {
  const c4 = 2 * Math.PI / 3;
  if (t === 0)
    return 0;
  if (t === 1)
    return 1;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
var inOutElastic = (t) => {
  const c5 = 2 * Math.PI / 4.5;
  if (t === 0)
    return 0;
  if (t === 1)
    return 1;
  if (t < 0.5) {
    return -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
  }
  return 2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c5) / 2 + 1;
};
function makeEasing(x1, y1, x2, y2) {
  function sampleCurveX(t) {
    return 3 * x1 * (1 - t) ** 2 * t + 3 * x2 * (1 - t) * t ** 2 + t ** 3;
  }
  function sampleCurveY(t) {
    return 3 * y1 * (1 - t) ** 2 * t + 3 * y2 * (1 - t) * t ** 2 + t ** 3;
  }
  function sampleCurveDerivativeX(t) {
    return 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t ** 2 * (1 - x2);
  }
  return (progress) => {
    if (progress <= 0)
      return 0;
    if (progress >= 1)
      return 1;
    let t = progress;
    for (let i = 0;i < 20; i++) {
      const xEst = sampleCurveX(t);
      const dx = xEst - progress;
      if (Math.abs(dx) < 0.00001)
        break;
      const d = sampleCurveDerivativeX(t);
      if (Math.abs(d) < 0.000001)
        break;
      t -= dx / d;
    }
    return sampleCurveY(t);
  };
}

class EasingTracker {
  easingFunction;
  totalSteps;
  currentStep = 0;
  progressRatio = 0;
  stepDelta = 0;
  easedValue = 0;
  _lastEasedValue = 0;
  _clamp;
  constructor(easingFunction, totalSteps = 100, clamp2 = false) {
    this.easingFunction = easingFunction;
    this.totalSteps = totalSteps;
    this._clamp = clamp2;
  }
  step() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.progressRatio = this.currentStep / this.totalSteps;
      this.easedValue = this.easingFunction(this.progressRatio);
      if (this._clamp) {
        this.easedValue = Math.max(0, Math.min(this.easedValue, 1));
      }
      this.stepDelta = this.easedValue - this._lastEasedValue;
      this._lastEasedValue = this.easedValue;
    }
    return this.easedValue;
  }
  reset() {
    this.currentStep = 0;
    this.progressRatio = 0;
    this.stepDelta = 0;
    this.easedValue = 0;
    this._lastEasedValue = 0;
  }
  isComplete() {
    return this.currentStep >= this.totalSteps;
  }
}

class SequenceEaser {
  sequence;
  easingTracker;
  added = [];
  removed = [];
  total = [];
  constructor(sequence, easingFunction, totalSteps = 100) {
    this.sequence = sequence;
    this.easingTracker = new EasingTracker(easingFunction, totalSteps, true);
  }
  step() {
    const previousEased = this.easingTracker.easedValue;
    const easedValue = this.easingTracker.step();
    const seqLen = this.sequence.length;
    if (seqLen === 0) {
      this.added = [];
      this.removed = [];
      this.total = [];
      return this.added;
    }
    const length = Math.floor(easedValue * seqLen);
    const previousLength = Math.floor(previousEased * seqLen);
    if (length > previousLength) {
      this.added = this.sequence.slice(previousLength, length);
      this.removed = [];
    } else if (length < previousLength) {
      this.added = [];
      this.removed = this.sequence.slice(length, previousLength);
    } else {
      this.added = [];
      this.removed = [];
    }
    this.total = this.sequence.slice(0, length);
    return this.added;
  }
  isComplete() {
    return this.easingTracker.isComplete();
  }
  reset() {
    this.easingTracker.reset();
    this.added = [];
    this.removed = [];
    this.total = [];
  }
}

// src/tte/effects/slide.ts
var defaultSlideConfig = {
  movementSpeed: 0.8,
  grouping: "row",
  gap: 2,
  reverseDirection: false,
  merge: false,
  movementEasing: inOutQuad,
  finalGradientStops: [color("833ab4"), color("fd1d1d"), color("fcb045")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical"
};

class SlideEffect {
  canvas;
  config;
  pendingGroups = [];
  activeGroups = [];
  activeChars = new Set;
  currentGap = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const characterFinalColor = new Map;
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      characterFinalColor.set(ch.id, colorMapping.get(key) || this.config.finalGradientStops[0]);
    }
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
    const groups = this.canvas.getCharactersGrouped(this.config.grouping, { includeSpaces: false });
    for (const group of groups) {
      for (const ch of group) {
        const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);
      }
    }
    for (let gi = 0;gi < groups.length; gi++) {
      const group = groups[gi];
      if (this.config.grouping === "row") {
        let startingColumn;
        if (this.config.merge && gi % 2 === 0) {
          startingColumn = dims.right + 1;
        } else {
          groups[gi] = groups[gi].slice().reverse();
          startingColumn = dims.left - 1;
        }
        if (this.config.reverseDirection && !this.config.merge) {
          groups[gi] = groups[gi].slice().reverse();
          startingColumn = dims.right + 1;
        }
        for (const ch of groups[gi]) {
          ch.motion.setCoordinate({ column: startingColumn, row: ch.inputCoord.row });
        }
      } else if (this.config.grouping === "column") {
        let startingRow;
        if (this.config.merge && gi % 2 === 0) {
          startingRow = dims.bottom - 1;
        } else {
          groups[gi] = groups[gi].slice().reverse();
          startingRow = dims.top + 1;
        }
        if (this.config.reverseDirection && !this.config.merge) {
          groups[gi] = groups[gi].slice().reverse();
          startingRow = dims.bottom - 1;
        }
        for (const ch of groups[gi]) {
          ch.motion.setCoordinate({ column: ch.inputCoord.column, row: startingRow });
        }
      } else if (this.config.grouping === "diagonalTopLeftToBottomRight") {
        const lastChar = group[group.length - 1];
        const distFromBottom = lastChar.inputCoord.row - (dims.bottom - 1);
        let startingCoord = {
          column: lastChar.inputCoord.column - distFromBottom,
          row: lastChar.inputCoord.row - distFromBottom
        };
        if (this.config.merge && gi % 2 === 0) {
          groups[gi] = groups[gi].slice().reverse();
          const firstChar = group[0];
          const distFromTop = dims.top + 1 - firstChar.inputCoord.row;
          startingCoord = {
            column: firstChar.inputCoord.column + distFromTop,
            row: firstChar.inputCoord.row + distFromTop
          };
        }
        if (this.config.reverseDirection && !this.config.merge) {
          groups[gi] = groups[gi].slice().reverse();
          const firstChar = group[0];
          const distFromTop = dims.top + 1 - firstChar.inputCoord.row;
          startingCoord = {
            column: firstChar.inputCoord.column + distFromTop,
            row: firstChar.inputCoord.row + distFromTop
          };
        }
        for (const ch of groups[gi]) {
          ch.motion.setCoordinate(startingCoord);
        }
      }
      for (const ch of group) {
        const charFinalColor = characterFinalColor.get(ch.id) || this.config.finalGradientStops[0];
        const scene = ch.newScene("gradient");
        const charGradient = new Gradient([this.config.finalGradientStops[0], charFinalColor], 10);
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
        ch.activateScene(scene);
      }
    }
    this.pendingGroups = groups;
  }
  step() {
    if (this.pendingGroups.length === 0 && this.activeChars.size === 0 && this.activeGroups.length === 0) {
      return false;
    }
    if (this.pendingGroups.length > 0) {
      if (this.currentGap >= this.config.gap) {
        const group = this.pendingGroups.shift();
        if (group)
          this.activeGroups.push(group);
        this.currentGap = 0;
      } else {
        this.currentGap++;
      }
    }
    for (const group of this.activeGroups) {
      if (group.length > 0) {
        const ch = group.shift();
        if (!ch)
          continue;
        ch.isVisible = true;
        ch.motion.activatePath("input_path");
        this.activeChars.add(ch);
      }
    }
    this.activeGroups = this.activeGroups.filter((g) => g.length > 0);
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingGroups.length > 0 || this.activeChars.size > 0 || this.activeGroups.length > 0;
  }
}

// src/tte/effects/wipe.ts
var defaultWipeConfig = {
  wipeDirection: "diagonalTopLeftToBottomRight",
  wipeEase: inOutCirc,
  wipeDelay: 0,
  finalGradientStops: [color("833ab4"), color("fd1d1d"), color("fcb045")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "vertical"
};

class WipeEffect {
  canvas;
  config;
  activeChars = new Set;
  easer;
  delayCounter;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.delayCounter = 0;
    this.easer = this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    const groups = this.canvas.getCharactersGrouped(this.config.wipeDirection, { includeSpaces: false });
    for (const group of groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const scene = ch.newScene("wipe");
        const wipeGradient = new Gradient([this.config.finalGradientStops[0], finalColor], this.config.finalGradientSteps);
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, wipeGradient);
      }
    }
    return new SequenceEaser(groups, this.config.wipeEase);
  }
  step() {
    if (this.activeChars.size === 0 && this.easer.isComplete()) {
      return false;
    }
    if (!this.easer.isComplete()) {
      if (this.delayCounter === 0) {
        this.easer.step();
        for (const group of this.easer.added) {
          for (const ch of group) {
            ch.isVisible = true;
            ch.activateScene("wipe");
            this.activeChars.add(ch);
          }
        }
        for (const group of this.easer.removed) {
          for (const ch of group) {
            if (ch.activeScene) {
              ch.activeScene.reset();
              ch.activeScene = null;
            }
            const wipeScene = ch.scenes.get("wipe");
            if (wipeScene)
              wipeScene.reset();
            ch.isVisible = false;
            this.activeChars.delete(ch);
          }
        }
        this.delayCounter = this.config.wipeDelay;
      } else {
        this.delayCounter--;
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return !this.easer.isComplete() || this.activeChars.size > 0;
  }
}

// src/tte/effects/randomsequence.ts
var defaultRandomSequenceConfig = {
  startingColor: color("000000"),
  speed: 0.007,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "vertical"
};
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class RandomSequenceEffect {
  canvas;
  config;
  pending = [];
  activeChars = new Set;
  charsPerTick;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.charsPerTick = 1;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    const animChars = this.canvas.getNonSpaceCharacters();
    this.charsPerTick = Math.max(Math.floor(this.config.speed * animChars.length), 1);
    for (const ch of animChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.startingColor, finalColor], 7);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
    }
    this.pending = shuffle(animChars);
  }
  step() {
    if (this.pending.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    for (let i = 0;i < this.charsPerTick && this.pending.length > 0; i++) {
      const ch = this.pending.pop();
      if (!ch)
        break;
      ch.isVisible = true;
      ch.activateScene("gradient");
      this.activeChars.add(ch);
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pending.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/middleout.ts
var defaultMiddleOutConfig = {
  startingColor: color("ffffff"),
  expandDirection: "vertical",
  centerMovementSpeed: 0.6,
  fullMovementSpeed: 0.6,
  centerEasing: inOutSine,
  fullEasing: inOutSine,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};

class MiddleOutEffect {
  canvas;
  config;
  animChars = [];
  activeChars = new Set;
  phase = "center";
  characterFinalColorMap = new Map;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    this.animChars = this.canvas.getNonSpaceCharacters();
    for (const ch of this.animChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      this.characterFinalColorMap.set(ch.id, colorMapping.get(key) || this.config.finalGradientStops[0]);
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.config.startingColor.rgbHex };
      ch.motion.setCoordinate(dims.center);
      const centerPath = ch.motion.newPath("center_path", this.config.centerMovementSpeed, this.config.centerEasing);
      if (this.config.expandDirection === "vertical") {
        centerPath.addWaypoint({ column: ch.inputCoord.column, row: dims.centerRow });
      } else {
        centerPath.addWaypoint({ column: dims.centerColumn, row: ch.inputCoord.row });
      }
      ch.motion.activatePath("center_path");
      this.activeChars.add(ch);
    }
  }
  startFullPhase() {
    for (const ch of this.animChars) {
      const fullPath = ch.motion.newPath("full_path", this.config.fullMovementSpeed, this.config.fullEasing);
      fullPath.addWaypoint(ch.inputCoord);
      ch.motion.activatePath("full_path");
      const finalColor = this.characterFinalColorMap.get(ch.id) ?? this.config.startingColor;
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.startingColor, finalColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, 6, charGradient);
      ch.activateScene("gradient");
      this.activeChars.add(ch);
    }
  }
  step() {
    if (this.phase === "done")
      return false;
    if (this.phase === "center") {
      if (this.activeChars.size > 0) {
        for (const ch of this.activeChars) {
          ch.motion.move();
          if (ch.motion.movementIsComplete()) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      this.phase = "full";
      this.startFullPhase();
      return true;
    }
    if (this.phase === "full") {
      if (this.activeChars.size > 0) {
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      this.phase = "done";
      return false;
    }
    return false;
  }
}

// src/tte/effects/colorshift.ts
var defaultColorShiftConfig = {
  gradientStops: [color("e81416"), color("ffa500"), color("faeb36"), color("79c314"), color("487de7"), color("4b369d"), color("70369d")],
  gradientSteps: 12,
  gradientFrames: 2,
  cycles: 3,
  travelDirection: "radial",
  reverseTravelDirection: false,
  finalGradientStops: [color("e81416"), color("ffa500"), color("faeb36"), color("79c314"), color("487de7"), color("4b369d"), color("70369d")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};

class ColorShiftEffect {
  canvas;
  config;
  activeChars = new Set;
  cyclesCompleted = new Map;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  loopTracker(character) {
    const count = (this.cyclesCompleted.get(character.id) || 0) + 1;
    this.cyclesCompleted.set(character.id, count);
    if (this.config.cycles === 0 || count < this.config.cycles) {
      character.activateScene("loop");
    } else {
      character.activateScene("final");
    }
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const finalColorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const waveGradient = new Gradient(this.config.gradientStops, this.config.gradientSteps, true);
    const spectrum = waveGradient.spectrum;
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    const maxCol = dims.textRight;
    const maxRow = dims.textTop;
    const minCol = dims.textLeft;
    const minRow = dims.textBottom;
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      ch.isVisible = true;
      let offset;
      const col = ch.inputCoord.column;
      const row = ch.inputCoord.row;
      if (this.config.travelDirection === "horizontal") {
        offset = maxCol > minCol ? (col - minCol) / (maxCol - minCol) : 0;
      } else if (this.config.travelDirection === "vertical") {
        offset = maxRow > minRow ? (row - minRow) / (maxRow - minRow) : 0;
      } else if (this.config.travelDirection === "diagonal") {
        const maxSum = maxRow - minRow + (maxCol - minCol);
        offset = maxSum > 0 ? (row - minRow + (col - minCol)) / maxSum : 0;
      } else {
        offset = findNormalizedDistanceFromCenter(minRow, maxRow, minCol, maxCol, ch.inputCoord);
      }
      if (this.config.reverseTravelDirection)
        offset = 1 - offset;
      const shift = Math.floor(offset * spectrum.length) % spectrum.length;
      const shifted = [...spectrum.slice(shift), ...spectrum.slice(0, shift)];
      const loopScene = ch.newScene("loop");
      for (const c of shifted) {
        loopScene.addFrame(ch.inputSymbol, this.config.gradientFrames, c.rgbHex);
      }
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = finalColorMapping.get(key) || this.config.finalGradientStops[0];
      const finalScene = ch.newScene("final");
      const lastShiftedColor = shifted[shifted.length - 1] ?? shifted[0];
      const charGradient = new Gradient([lastShiftedColor, finalColor], 8);
      finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.gradientFrames, charGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "loop", "CALLBACK", { callback: (c) => this.loopTracker(c), args: [] });
      ch.activateScene("loop");
      this.activeChars.add(ch);
    }
  }
  step() {
    if (this.activeChars.size === 0)
      return false;
    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0;
  }
}

// src/tte/effects/scattered.ts
var defaultScatteredConfig = {
  movementSpeed: 0.5,
  movementEasing: inOutBack,
  finalGradientStops: [color("ff9048"), color("ab9dff"), color("bdffea")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "vertical"
};
function randInt2(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class ScatteredEffect {
  canvas;
  config;
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      const startCol = randInt2(dims.left, dims.right);
      const startRow = randInt2(dims.bottom, dims.top);
      ch.motion.setCoordinate({ column: startCol, row: startRow });
      ch.isVisible = true;
      const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
      path.addWaypoint(ch.inputCoord);
      ch.eventHandler.register("PATH_ACTIVATED", "input_path", "SET_LAYER", 1);
      ch.eventHandler.register("PATH_COMPLETE", "input_path", "SET_LAYER", 0);
      ch.motion.activatePath("input_path");
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.finalGradientStops[0], finalColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.activateScene(scene);
      this.activeChars.add(ch);
    }
  }
  step() {
    if (this.activeChars.size === 0)
      return false;
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0;
  }
}

// src/tte/effects/pour.ts
var defaultPourConfig = {
  pourDirection: "down",
  pourSpeed: 2,
  movementSpeed: 0.5,
  gap: 1,
  startingColor: color("ffffff"),
  movementEasing: inQuad,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical"
};

class PourEffect {
  canvas;
  config;
  pendingGroups = [];
  currentGroup = [];
  activeChars = new Set;
  currentGap = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    const nonSpace = this.canvas.getNonSpaceCharacters();
    const isVertical = this.config.pourDirection === "down" || this.config.pourDirection === "up";
    const groupMap = new Map;
    for (const ch of nonSpace) {
      const key = isVertical ? ch.inputCoord.row : ch.inputCoord.column;
      if (!groupMap.has(key))
        groupMap.set(key, []);
      groupMap.get(key)?.push(ch);
    }
    const sortedKeys = [...groupMap.keys()];
    if (this.config.pourDirection === "down") {
      sortedKeys.sort((a, b) => a - b);
    } else if (this.config.pourDirection === "up") {
      sortedKeys.sort((a, b) => b - a);
    } else if (this.config.pourDirection === "left") {
      sortedKeys.sort((a, b) => a - b);
    } else {
      sortedKeys.sort((a, b) => b - a);
    }
    const groups = [];
    for (let i = 0;i < sortedKeys.length; i++) {
      let group = groupMap.get(sortedKeys[i]) ?? [];
      if (i % 2 === 1) {
        group = group.slice().reverse();
      }
      groups.push(group);
    }
    for (const group of groups) {
      for (const ch of group) {
        let startCoord;
        if (this.config.pourDirection === "down") {
          startCoord = { column: ch.inputCoord.column, row: dims.top };
        } else if (this.config.pourDirection === "up") {
          startCoord = { column: ch.inputCoord.column, row: dims.bottom };
        } else if (this.config.pourDirection === "left") {
          startCoord = { column: dims.right, row: ch.inputCoord.row };
        } else {
          startCoord = { column: dims.left, row: ch.inputCoord.row };
        }
        ch.motion.setCoordinate(startCoord);
        const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const scene = ch.newScene("gradient");
        const charGradient = new Gradient([this.config.startingColor, finalColor], this.config.finalGradientSteps);
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      }
    }
    this.pendingGroups = groups;
  }
  step() {
    if (this.pendingGroups.length === 0 && this.currentGroup.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    if (this.currentGroup.length === 0 && this.pendingGroups.length > 0) {
      const next = this.pendingGroups.shift();
      if (next)
        this.currentGroup = next;
    }
    if (this.currentGroup.length > 0) {
      if (this.currentGap === 0) {
        let activated = 0;
        while (this.currentGroup.length > 0 && activated < this.config.pourSpeed) {
          const ch = this.currentGroup.shift();
          if (!ch)
            break;
          ch.isVisible = true;
          ch.motion.activatePath("input_path");
          ch.activateScene("gradient");
          this.activeChars.add(ch);
          activated++;
        }
        this.currentGap = this.config.gap;
      } else {
        this.currentGap--;
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingGroups.length > 0 || this.currentGroup.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/sweep.ts
var defaultSweepConfig = {
  sweepSymbols: ["█", "▓", "▒", "░"],
  firstSweepDirection: "right_to_left",
  secondSweepDirection: "left_to_right",
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 8,
  finalGradientDirection: "vertical"
};
var SHADES_OF_GRAY = ["A0A0A0", "808080", "404040", "202020", "101010"];
function randGray() {
  return SHADES_OF_GRAY[Math.floor(Math.random() * SHADES_OF_GRAY.length)];
}

class SweepEffect {
  canvas;
  config;
  phase = "reveal";
  groups = [];
  currentStep = 0;
  totalSteps = 0;
  lastGroupIndex = -1;
  activeChars = new Set;
  colorMapping = new Map;
  finalGradient;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    this.finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = this.finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    this.setupPhase1();
  }
  getColumnGroups(direction) {
    const colMap = new Map;
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      if (!colMap.has(ch.inputCoord.column))
        colMap.set(ch.inputCoord.column, []);
      colMap.get(ch.inputCoord.column)?.push(ch);
    }
    const sortedKeys = [...colMap.keys()].sort((a, b) => direction === "left_to_right" ? a - b : b - a);
    return sortedKeys.map((k) => colMap.get(k) ?? []);
  }
  setupPhase1() {
    this.groups = this.getColumnGroups(this.config.firstSweepDirection);
    this.currentStep = 0;
    this.totalSteps = 100;
    this.lastGroupIndex = -1;
    for (const group of this.groups) {
      for (const ch of group) {
        const scene = ch.newScene("reveal");
        for (const sym of this.config.sweepSymbols) {
          scene.addFrame(sym, 5, randGray());
        }
        scene.addFrame(ch.inputSymbol, 1, "808080");
      }
    }
  }
  setupPhase2() {
    this.groups = this.getColumnGroups(this.config.secondSweepDirection);
    this.currentStep = 0;
    this.totalSteps = 100;
    this.lastGroupIndex = -1;
    for (const group of this.groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const spectrum = this.finalGradient.spectrum;
        const scene = ch.newScene("color");
        for (const sym of this.config.sweepSymbols) {
          const c = spectrum[Math.floor(Math.random() * spectrum.length)];
          scene.addFrame(sym, 5, c.rgbHex);
        }
        scene.addFrame(ch.inputSymbol, 1, finalColor.rgbHex);
      }
    }
  }
  step() {
    if (this.phase === "done")
      return false;
    this.currentStep++;
    const progress = inOutCirc(Math.min(this.currentStep / this.totalSteps, 1));
    const targetGroupIndex = Math.min(Math.floor(progress * this.groups.length), this.groups.length - 1);
    for (let i = this.lastGroupIndex + 1;i <= targetGroupIndex; i++) {
      for (const ch of this.groups[i]) {
        if (this.phase === "reveal") {
          ch.isVisible = true;
          ch.activateScene("reveal");
        } else {
          ch.activateScene("color");
        }
        this.activeChars.add(ch);
      }
    }
    this.lastGroupIndex = targetGroupIndex;
    const easerComplete = this.currentStep >= this.totalSteps;
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    if (easerComplete) {
      if (this.phase === "reveal") {
        this.phase = "color";
        this.setupPhase2();
      } else if (this.phase === "color" && this.activeChars.size === 0) {
        this.phase = "done";
        return false;
      }
    }
    return true;
  }
}

// src/tte/effects/expand.ts
var defaultExpandConfig = {
  movementSpeed: 0.35,
  expandEasing: inOutQuart,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 5,
  finalGradientDirection: "vertical"
};

class ExpandEffect {
  canvas;
  config;
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      ch.motion.setCoordinate(dims.center);
      ch.isVisible = true;
      const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.expandEasing);
      path.addWaypoint(ch.inputCoord);
      ch.eventHandler.register("PATH_ACTIVATED", "input_path", "SET_LAYER", 1);
      ch.eventHandler.register("PATH_COMPLETE", "input_path", "SET_LAYER", 0);
      ch.motion.activatePath("input_path");
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const scene = ch.newScene("gradient");
      const charGradient = new Gradient([this.config.finalGradientStops[0], finalColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.activateScene(scene);
      this.activeChars.add(ch);
    }
  }
  step() {
    if (this.activeChars.size === 0)
      return false;
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0;
  }
}

// src/tte/effects/waves.ts
var defaultWavesConfig = {
  waveSymbols: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"],
  waveCount: 7,
  waveFrameDuration: 2,
  waveDirection: "column_left_to_right",
  gap: 0,
  waveGradientStops: [color("f0ff65"), color("ffb102"), color("31a0d4"), color("ffb102"), color("f0ff65")],
  waveGradientSteps: 6,
  finalGradientStops: [color("ffb102"), color("31a0d4"), color("f0ff65")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal"
};

class WavesEffect {
  canvas;
  config;
  pendingGroups = [];
  activeChars = new Set;
  currentGap = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const waveGradient = new Gradient(this.config.waveGradientStops, this.config.waveGradientSteps);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    const directionGroupingMap = {
      column_left_to_right: "column",
      column_right_to_left: "columnRightToLeft",
      row_top_to_bottom: "row",
      row_bottom_to_top: "rowBottomToTop",
      center_to_outside: "centerToOutside",
      outside_to_center: "outsideToCenter"
    };
    const groups = this.canvas.getCharactersGrouped(directionGroupingMap[this.config.waveDirection], { includeSpaces: false });
    for (const group of groups) {
      for (const ch of group) {
        const waveScene = ch.newScene("wave");
        for (let i = 0;i < this.config.waveCount; i++) {
          waveScene.applyGradientToSymbols(this.config.waveSymbols, this.config.waveFrameDuration, waveGradient);
        }
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const finalScene = ch.newScene("final");
        const lastWaveColor = waveGradient.spectrum[waveGradient.spectrum.length - 1];
        const charGradient = new Gradient([lastWaveColor, finalColor], this.config.finalGradientSteps);
        finalScene.applyGradientToSymbols(ch.inputSymbol, 10, charGradient);
        ch.eventHandler.register("SCENE_COMPLETE", "wave", "ACTIVATE_SCENE", "final");
      }
    }
    this.pendingGroups = groups;
  }
  step() {
    if (this.pendingGroups.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    if (this.pendingGroups.length > 0) {
      if (this.currentGap >= this.config.gap) {
        const group = this.pendingGroups.shift();
        if (!group)
          return true;
        for (const ch of group) {
          ch.isVisible = true;
          ch.activateScene("wave");
          this.activeChars.add(ch);
        }
        this.currentGap = 0;
      } else {
        this.currentGap++;
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingGroups.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/rain.ts
var defaultRainConfig = {
  rainSymbols: ["o", ".", ",", "*", "|"],
  rainColors: [
    color("00315C"),
    color("004C8F"),
    color("0075DB"),
    color("3F91D9"),
    color("78B9F2"),
    color("9AC8F5"),
    color("B8D8F8"),
    color("E3EFFC")
  ],
  fallSpeed: 0.5,
  fallEasing: inQuart,
  charsPerTick: 2,
  finalGradientStops: [color("488bff"), color("b2e7de"), color("57eaf7")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "diagonal"
};

class RainEffect {
  canvas;
  config;
  pendingByRow = new Map;
  pendingRowQueue = [];
  pendingCurrent = [];
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      ch.motion.setCoordinate({ column: ch.inputCoord.column, row: dims.top });
      const path = ch.motion.newPath("fall", this.config.fallSpeed, this.config.fallEasing);
      path.addWaypoint(ch.inputCoord);
      const raindropColor = this.config.rainColors[Math.floor(Math.random() * this.config.rainColors.length)];
      const rainScene = ch.newScene("rain");
      rainScene.addFrame(this.config.rainSymbols[Math.floor(Math.random() * this.config.rainSymbols.length)], 1, raindropColor.rgbHex);
      ch.activateScene(rainScene);
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const fadeScene = ch.newScene("fade");
      const fadeGradient = new Gradient([raindropColor, finalColor], 7);
      fadeScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, fadeGradient);
      ch.eventHandler.register("PATH_COMPLETE", "fall", "ACTIVATE_SCENE", "fade");
      const row = ch.inputCoord.row;
      if (!this.pendingByRow.has(row))
        this.pendingByRow.set(row, []);
      this.pendingByRow.get(row)?.push(ch);
    }
    this.pendingRowQueue = [...this.pendingByRow.keys()].sort((a, b) => a - b);
  }
  step() {
    if (this.pendingRowQueue.length === 0 && this.pendingCurrent.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    if (this.pendingCurrent.length === 0 && this.pendingRowQueue.length > 0) {
      const nextRow = this.pendingRowQueue.shift();
      if (nextRow === undefined)
        return false;
      this.pendingCurrent = this.pendingByRow.get(nextRow) ?? [];
      this.pendingByRow.delete(nextRow);
    }
    let released = 0;
    while (this.pendingCurrent.length > 0 && released < this.config.charsPerTick) {
      const idx = Math.floor(Math.random() * this.pendingCurrent.length);
      const ch = this.pendingCurrent.splice(idx, 1)[0];
      ch.isVisible = true;
      ch.motion.activatePath("fall");
      this.activeChars.add(ch);
      released++;
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingRowQueue.length > 0 || this.pendingCurrent.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/print.ts
var defaultPrintConfig = {
  typingSpeed: 2,
  finalGradientStops: [color("02b8bd"), color("c1f0e3"), color("00ffa0")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal"
};

class PrintEffect {
  canvas;
  config;
  pendingRows = [];
  currentRow = [];
  allTypedChars = [];
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace)
        ch.isVisible = true;
    }
    const rows = this.canvas.getCharactersGrouped("row", { includeSpaces: false });
    for (const row of rows) {
      row.sort((a, b) => a.inputCoord.column - b.inputCoord.column);
    }
    for (const row of rows) {
      for (const ch of row) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const charGradient = new Gradient([color("ffffff"), finalColor], 5);
        const typingScene = ch.newScene("typing");
        typingScene.applyGradientToSymbols(["█", "▓", "▒", "░", ch.inputSymbol], 3, charGradient);
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: 1 });
      }
    }
    this.pendingRows = rows;
  }
  step() {
    if (this.pendingRows.length === 0 && this.currentRow.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    if (this.currentRow.length === 0 && this.pendingRows.length > 0) {
      for (const ch of this.allTypedChars) {
        const cur = ch.motion.currentCoord;
        ch.motion.setCoordinate({ column: cur.column, row: cur.row + 1 });
      }
      const next = this.pendingRows.shift();
      if (next)
        this.currentRow = next;
    }
    let typed = 0;
    while (this.currentRow.length > 0 && typed < this.config.typingSpeed) {
      const ch = this.currentRow.shift();
      if (!ch)
        break;
      ch.isVisible = true;
      ch.activateScene("typing");
      this.activeChars.add(ch);
      this.allTypedChars.push(ch);
      typed++;
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingRows.length > 0 || this.currentRow.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/graph.ts
var exports_graph = {};
__export(exports_graph, {
  getNeighbors: () => getNeighbors,
  buildSpanningTreeSimple: () => buildSpanningTreeSimple,
  buildSpanningTree: () => buildSpanningTree,
  buildCoordMap: () => buildCoordMap
});
function buildCoordMap(chars) {
  const map = new Map;
  for (const ch of chars) {
    map.set(coordKey(ch.inputCoord.column, ch.inputCoord.row), ch);
  }
  return map;
}
function getNeighbors(ch, coordMap, mode = 8) {
  const { column, row } = ch.inputCoord;
  const neighbors = [];
  if (mode === 4) {
    const offsets = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ];
    for (const [dc, dr] of offsets) {
      const n = coordMap.get(coordKey(column + dc, row + dr));
      if (n)
        neighbors.push(n);
    }
  } else {
    for (let dc = -1;dc <= 1; dc++) {
      for (let dr = -1;dr <= 1; dr++) {
        if (dc === 0 && dr === 0)
          continue;
        const n = coordMap.get(coordKey(column + dc, row + dr));
        if (n)
          neighbors.push(n);
      }
    }
  }
  return neighbors;
}
function findStartChar(chars, strategy) {
  if (typeof strategy === "object" && "char" in strategy) {
    return strategy.char;
  }
  if (strategy === "random") {
    return chars[Math.floor(Math.random() * chars.length)];
  }
  const avgCol = chars.reduce((sum, ch) => sum + ch.inputCoord.column, 0) / chars.length;
  const avgRow = chars.reduce((sum, ch) => sum + ch.inputCoord.row, 0) / chars.length;
  let best = chars[0];
  let bestScore = Infinity;
  for (const ch of chars) {
    let score;
    switch (strategy) {
      case "bottomCenter":
        score = ch.inputCoord.row * 10 + Math.abs(ch.inputCoord.column - avgCol);
        break;
      case "topCenter":
        score = -ch.inputCoord.row * 10 + Math.abs(ch.inputCoord.column - avgCol);
        break;
      case "center":
        score = Math.abs(ch.inputCoord.column - avgCol) + Math.abs(ch.inputCoord.row - avgRow);
        break;
    }
    if (score < bestScore) {
      bestScore = score;
      best = ch;
    }
  }
  return best;
}
var defaultWeightFn = (dc, dr) => Math.hypot(dc, dr * 2) + Math.random() * 2;
function buildSpanningTreeSimple(chars, options) {
  if (chars.length === 0)
    return [];
  const connectivity = options?.connectivity ?? 8;
  const startStrategy = options?.startStrategy ?? "random";
  const includeDisconnected = options?.includeDisconnected ?? true;
  const coordMap = buildCoordMap(chars);
  const startChar = findStartChar(chars, startStrategy);
  const linked = new Set;
  const linkOrder = [];
  function getUnlinkedNeighbors(ch) {
    return getNeighbors(ch, coordMap, connectivity).filter((n) => !linked.has(n.id));
  }
  function linkChar(ch) {
    linked.add(ch.id);
    linkOrder.push(ch);
  }
  linkChar(startChar);
  const edgeChars = getUnlinkedNeighbors(startChar).length > 0 ? [startChar] : [];
  while (edgeChars.length > 0) {
    const edgeIdx = Math.floor(Math.random() * edgeChars.length);
    const current = edgeChars.splice(edgeIdx, 1)[0];
    const unlinked = getUnlinkedNeighbors(current);
    if (unlinked.length === 0)
      continue;
    const nextIdx = Math.floor(Math.random() * unlinked.length);
    const next = unlinked.splice(nextIdx, 1)[0];
    linkChar(next);
    if (getUnlinkedNeighbors(current).length > 0) {
      edgeChars.push(current);
    }
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
function buildSpanningTree(chars, options) {
  if (chars.length === 0)
    return [];
  const connectivity = options?.connectivity ?? 8;
  const startStrategy = options?.startStrategy ?? "bottomCenter";
  const weightFn = options?.weightFn ?? defaultWeightFn;
  const includeDisconnected = options?.includeDisconnected ?? true;
  const traversal = options?.traversal ?? "insertion";
  const coordMap = buildCoordMap(chars);
  const startChar = findStartChar(chars, startStrategy);
  const inTree = new Set;
  const order = [];
  const treeChildren = new Map;
  const frontier = [];
  function addToTree(ch, parent) {
    inTree.add(ch.id);
    order.push(ch);
    if (parent) {
      if (!treeChildren.has(parent.id))
        treeChildren.set(parent.id, []);
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
    for (let i = 1;i < frontier.length; i++) {
      if (frontier[i].weight < frontier[minIdx].weight) {
        minIdx = i;
      }
    }
    const entry = frontier[minIdx];
    frontier.splice(minIdx, 1);
    if (inTree.has(entry.char.id))
      continue;
    addToTree(entry.char, entry.parent);
  }
  const disconnected = [];
  if (includeDisconnected) {
    for (const ch of chars) {
      if (!inTree.has(ch.id)) {
        disconnected.push(ch);
      }
    }
  }
  if (traversal === "bfs") {
    const bfsOrder = [];
    const queue = [startChar];
    while (queue.length > 0) {
      const ch = queue.shift();
      if (!ch)
        break;
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

// src/tte/effects/burn.ts
var defaultBurnConfig = {
  burnSpeed: 3,
  burnSymbols: ["'", ".", "▖", "▙", "█", "▜", "▀", "▝", "."],
  burnFrameDuration: 4,
  burnColors: [color("ffffff"), color("fff75d"), color("fe650d"), color("8A003C"), color("510100")],
  startingColor: color("837373"),
  finalGradientStops: [color("00c3ff"), color("ffff1c")],
  finalGradientSteps: 12,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical"
};

class BurnEffect {
  canvas;
  config;
  pendingChars = [];
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const fireGradient = new Gradient(this.config.burnColors, 10);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.config.startingColor.rgbHex };
    }
    const nonSpace = this.canvas.getNonSpaceCharacters();
    for (const ch of nonSpace) {
      const burnScene = ch.newScene("burn");
      burnScene.applyGradientToSymbols(this.config.burnSymbols, this.config.burnFrameDuration, fireGradient);
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const lastBurnColor = this.config.burnColors[this.config.burnColors.length - 1];
      const finalScene = ch.newScene("final");
      const charGradient = new Gradient([lastBurnColor, finalColor], 8);
      finalScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "burn", "ACTIVATE_SCENE", "final");
    }
    this.pendingChars = buildSpanningTreeSimple(nonSpace, { startStrategy: "random" });
  }
  step() {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    let ignited = 0;
    while (this.pendingChars.length > 0 && ignited < this.config.burnSpeed) {
      const ch = this.pendingChars.shift();
      if (!ch)
        break;
      ch.activateScene("burn");
      this.activeChars.add(ch);
      ignited++;
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/matrix.ts
var RAIN_SYMBOLS_COMMON = ["2", "5", "9", "8", "Z", "*", ")", ":", ".", '"', "=", "+", "-", "¦", "|", "_"];
var RAIN_SYMBOLS_KATA = [
  "ｦ",
  "ｱ",
  "ｳ",
  "ｴ",
  "ｵ",
  "ｶ",
  "ｷ",
  "ｹ",
  "ｺ",
  "ｻ",
  "ｼ",
  "ｽ",
  "ｾ",
  "ｿ",
  "ﾀ",
  "ﾂ",
  "ﾃ",
  "ﾅ",
  "ﾆ",
  "ﾇ",
  "ﾈ",
  "ﾊ",
  "ﾋ",
  "ﾎ",
  "ﾏ",
  "ﾐ",
  "ﾑ",
  "ﾒ",
  "ﾓ",
  "ﾔ",
  "ﾕ",
  "ﾗ",
  "ﾘ",
  "ﾜ"
];
var defaultMatrixConfig = {
  rainSymbols: [...RAIN_SYMBOLS_COMMON, ...RAIN_SYMBOLS_KATA],
  rainGradientStops: [color("92be92"), color("185318")],
  highlightColor: color("dbffdb"),
  rainTime: 900,
  columnDelayRange: [3, 9],
  rainFallDelayRange: [2, 15],
  symbolSwapChance: 0.005,
  colorSwapChance: 0.001,
  resolveDelay: 3,
  finalGradientStops: [color("92be92"), color("336b33")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "radial"
};
function randChoice2(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt3(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class RainColumn {
  pendingChars;
  visibleChars = [];
  allChars;
  length;
  fallDelay;
  fallTimer;
  startDelay;
  fillMode = false;
  exhausted = false;
  config;
  rainGradientColors;
  constructor(chars, config, startDelay, rainGradientColors) {
    this.allChars = chars;
    this.config = config;
    this.rainGradientColors = rainGradientColors;
    this.startDelay = startDelay;
    this.fallDelay = randInt3(config.rainFallDelayRange[0], config.rainFallDelayRange[1]);
    this.fallTimer = this.fallDelay;
    this.length = randInt3(Math.max(1, Math.floor(chars.length * 0.1)), chars.length);
    this.pendingChars = [...chars];
  }
  get isActive() {
    return this.startDelay <= 0 && !this.exhausted;
  }
  get isExhausted() {
    return this.exhausted;
  }
  getVisibleChars() {
    return this.visibleChars;
  }
  tick() {
    if (this.startDelay > 0) {
      this.startDelay--;
      return;
    }
    if (this.exhausted)
      return;
    this.fallTimer--;
    if (this.fallTimer <= 0) {
      this.fallTimer = this.fallDelay;
      if (this.pendingChars.length > 0) {
        const ch = this.pendingChars.shift();
        if (!ch)
          return;
        ch.isVisible = true;
        ch.currentVisual = {
          symbol: randChoice2(this.config.rainSymbols),
          fgColor: this.config.highlightColor.rgbHex
        };
        this.visibleChars.push(ch);
        if (this.visibleChars.length > 1) {
          const prev = this.visibleChars[this.visibleChars.length - 2];
          prev.currentVisual = {
            symbol: prev.currentVisual.symbol,
            fgColor: this.rainGradientColors.length > 0 ? randChoice2(this.rainGradientColors).rgbHex : this.config.rainGradientStops[0].rgbHex
          };
        }
      } else if (this.visibleChars.length > 0) {
        const lead = this.visibleChars[this.visibleChars.length - 1];
        if (lead.currentVisual.fgColor === this.config.highlightColor.rgbHex) {
          lead.currentVisual = {
            symbol: lead.currentVisual.symbol,
            fgColor: randChoice2(this.rainGradientColors).rgbHex
          };
        }
        if (!this.fillMode) {
          const tail = this.visibleChars.shift();
          if (tail)
            tail.isVisible = false;
        }
      }
      if (!this.fillMode && this.visibleChars.length > this.length) {
        const tail = this.visibleChars.shift();
        if (tail)
          tail.isVisible = false;
      }
      if (!this.fillMode && this.pendingChars.length === 0 && this.visibleChars.length === 0) {
        this.exhausted = true;
      }
      if (this.fillMode && this.pendingChars.length === 0) {
        this.exhausted = true;
      }
    }
    for (const ch of this.visibleChars) {
      if (Math.random() < this.config.symbolSwapChance) {
        ch.currentVisual = {
          symbol: randChoice2(this.config.rainSymbols),
          fgColor: ch.currentVisual.fgColor
        };
      }
      if (Math.random() < this.config.colorSwapChance) {
        ch.currentVisual = {
          symbol: ch.currentVisual.symbol,
          fgColor: this.rainGradientColors.length > 0 ? randChoice2(this.rainGradientColors).rgbHex : ch.currentVisual.fgColor
        };
      }
    }
  }
  enterFillMode() {
    this.fillMode = true;
    this.exhausted = false;
    this.fallDelay = randInt3(Math.max(1, Math.floor(this.config.rainFallDelayRange[0] / 3)), Math.max(1, Math.floor(this.config.rainFallDelayRange[1] / 3)));
    this.fallTimer = this.fallDelay;
    this.length = this.allChars.length;
    this.pendingChars = this.allChars.filter((ch) => !ch.isVisible);
  }
  reset(startDelay) {
    for (const ch of this.allChars) {
      ch.isVisible = ch.isSpace;
    }
    this.visibleChars = [];
    this.pendingChars = [...this.allChars];
    this.startDelay = startDelay;
    this.exhausted = false;
    this.fillMode = false;
    this.fallDelay = randInt3(this.config.rainFallDelayRange[0], this.config.rainFallDelayRange[1]);
    this.fallTimer = this.fallDelay;
    this.length = randInt3(Math.max(1, Math.floor(this.allChars.length * 0.1)), this.allChars.length);
  }
}

class MatrixEffect {
  canvas;
  config;
  columns = [];
  columnChars = [];
  phase = "rain";
  rainTicks = 0;
  resolvingChars = new Set;
  rainGradientColors = [];
  fullColumnState = [];
  resolveTimer = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const rainGradient = new Gradient(this.config.rainGradientStops, 6);
    this.rainGradientColors = rainGradient.spectrum;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
    const groups = this.canvas.getCharactersGrouped("column");
    for (const group of groups) {
      const sorted = [...group].sort((a, b) => b.inputCoord.row - a.inputCoord.row);
      this.columnChars.push(sorted);
    }
    for (const group of this.columnChars) {
      for (const ch of group) {
        if (ch.isSpace)
          continue;
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
        const resolveScene = ch.newScene("resolve");
        const resolveGradient = new Gradient([this.config.highlightColor, finalColor], 8);
        resolveScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, resolveGradient);
      }
    }
    for (const group of this.columnChars) {
      const delay = randInt3(0, this.config.columnDelayRange[1] * this.columnChars.length);
      this.columns.push(new RainColumn(group, this.config, delay, this.rainGradientColors));
    }
  }
  step() {
    if (this.phase === "rain") {
      this.rainTicks++;
      for (const col of this.columns) {
        col.tick();
        if (col.isExhausted) {
          col.reset(randInt3(this.config.columnDelayRange[0], this.config.columnDelayRange[1] * 3));
        }
      }
      if (this.rainTicks >= this.config.rainTime) {
        this.phase = "fill";
        for (const col of this.columns) {
          col.enterFillMode();
        }
      }
      return true;
    }
    if (this.phase === "fill") {
      let allFillDone = true;
      for (const col of this.columns) {
        if (!col.isExhausted) {
          col.tick();
          allFillDone = false;
        }
      }
      if (allFillDone) {
        this.phase = "resolve";
        for (const col of this.columns) {
          const visible = col.getVisibleChars().filter((ch) => !ch.isSpace);
          if (visible.length > 0) {
            this.fullColumnState.push({ chars: [...visible] });
          }
        }
        for (const group of this.columnChars) {
          for (const ch of group) {
            if (ch.isSpace) {
              ch.currentVisual = { symbol: ch.inputSymbol, fgColor: null };
            }
          }
        }
        this.resolveTimer = this.config.resolveDelay;
      }
      return true;
    }
    if (this.phase === "resolve") {
      for (const state of this.fullColumnState) {
        for (const ch of state.chars) {
          if (Math.random() < this.config.symbolSwapChance) {
            ch.currentVisual = { symbol: randChoice2(this.config.rainSymbols), fgColor: ch.currentVisual.fgColor };
          }
          if (Math.random() < this.config.colorSwapChance && this.rainGradientColors.length > 0) {
            ch.currentVisual = { symbol: ch.currentVisual.symbol, fgColor: randChoice2(this.rainGradientColors).rgbHex };
          }
        }
      }
      for (const state of this.fullColumnState) {
        if (state.chars.length > 0) {
          if (this.resolveTimer === 0) {
            const count = randInt3(1, 4);
            for (let i = 0;i < count && state.chars.length > 0; i++) {
              const idx = randInt3(0, state.chars.length - 1);
              const ch = state.chars.splice(idx, 1)[0];
              ch.activateScene("resolve");
              this.resolvingChars.add(ch);
            }
            this.resolveTimer = this.config.resolveDelay;
          } else {
            this.resolveTimer--;
          }
        }
      }
      this.fullColumnState = this.fullColumnState.filter((s) => s.chars.length > 0);
      for (const ch of this.resolvingChars) {
        ch.tick();
        if (!ch.isActive) {
          this.resolvingChars.delete(ch);
        }
      }
      if (this.fullColumnState.length === 0 && this.resolvingChars.size === 0) {
        return false;
      }
      return true;
    }
    return false;
  }
}

// src/tte/effects/highlight.ts
var defaultHighlightConfig = {
  highlightBrightness: 1.75,
  highlightDirection: "diagonal",
  highlightWidth: 8,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};

class HighlightEffect {
  canvas;
  config;
  colorMapping = new Map;
  easer;
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const baseColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: baseColor.rgbHex };
    }
    const groups = this.canvas.getCharactersGrouped(this.config.highlightDirection, { includeSpaces: false });
    this.easer = new SequenceEaser(groups, inOutCirc);
    for (const group of groups) {
      for (const ch of group) {
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const baseColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const brightColor = adjustBrightness(baseColor, this.config.highlightBrightness);
        const highlightGradient = new Gradient([baseColor, brightColor, brightColor, baseColor], [3, this.config.highlightWidth, 3]);
        const scene = ch.newScene("highlight");
        for (const c of highlightGradient.spectrum) {
          scene.addFrame(ch.inputSymbol, 2, c.rgbHex);
        }
      }
    }
  }
  step() {
    if (this.activeChars.size === 0 && this.easer.isComplete()) {
      return false;
    }
    this.easer.step();
    for (const group of this.easer.added) {
      for (const ch of group) {
        ch.activateScene("highlight");
        this.activeChars.add(ch);
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return true;
  }
}

// src/tte/effects/rings.ts
var defaultRingsConfig = {
  ringColors: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  ringGap: 0.1,
  spinDuration: 200,
  spinSpeed: [0.25, 1],
  disperseDuration: 200,
  spinDisperseCycles: 3,
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "vertical"
};
function shuffle2(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

class RingsEffect {
  canvas;
  config;
  activeChars = new Set;
  rings = [];
  center = { column: 1, row: 1 };
  colorMapping = new Map;
  charRingMap = new Map;
  phase = "start";
  phaseFrames = 0;
  cyclesRemaining;
  pathCounter = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.cyclesRemaining = config.spinDisperseCycles;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    this.center = dims.center;
    const minDim = Math.min(dims.right - dims.left + 1, dims.top - dims.bottom + 1);
    const gapPixels = Math.max(1, Math.round(this.config.ringGap * minDim));
    const maxRadius = Math.max(dims.right, dims.top);
    let radius = 1;
    let ringIdx = 0;
    while (radius < maxRadius) {
      const coords = findCoordsOnCircle(this.center, radius, 7 * radius);
      const inCanvas = coords.length === 0 ? 0 : coords.filter((c) => this.canvas.coordIsInCanvas(c)).length;
      if (coords.length === 0 || inCanvas / coords.length < 0.25)
        break;
      if (coords.length >= 3) {
        const speed = randRange(this.config.spinSpeed[0], this.config.spinSpeed[1]);
        this.rings.push({
          index: ringIdx,
          radius,
          coords,
          coordsReversed: [...coords].reverse(),
          speed,
          characters: [],
          clockwise: ringIdx % 2 === 0
        });
        ringIdx++;
      }
      radius += gapPixels;
    }
    if (this.rings.length === 0)
      return;
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    shuffle2(nonSpaceChars);
    let charIdx = 0;
    for (const ring of this.rings) {
      for (let i = 0;i < ring.coords.length && charIdx < nonSpaceChars.length; i++, charIdx++) {
        const ch = nonSpaceChars[charIdx];
        ring.characters.push(ch);
        this.charRingMap.set(ch.id, ring);
      }
      if (charIdx >= nonSpaceChars.length)
        break;
    }
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (!ch.isSpace) {
        this.activeChars.add(ch);
      }
    }
    for (const ring of this.rings) {
      const ringColor = this.config.ringColors[ring.index % this.config.ringColors.length];
      for (const ch of ring.characters) {
        const scene = ch.newScene("ring_color", true);
        scene.addFrame(ch.inputSymbol, 1, ringColor.rgbHex);
      }
    }
  }
  transitionToDisperse() {
    this.phase = "disperse";
    this.phaseFrames = 0;
    for (const ring of this.rings) {
      const disperseRadius = Math.max(2, Math.round(ring.radius * 0.5));
      for (const ch of ring.characters) {
        const disperseCoords = findCoordsInRect(this.center, disperseRadius);
        const target = disperseCoords[Math.floor(Math.random() * disperseCoords.length)];
        const pathId = `d${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, 0.5);
        path.addWaypoint(target);
        ch.motion.activatePath(pathId);
        ch.activateScene("ring_color");
      }
    }
  }
  transitionToSpin() {
    this.phase = "spin";
    this.phaseFrames = 0;
    for (const ring of this.rings) {
      const coords = ring.clockwise ? ring.coords : ring.coordsReversed;
      if (coords.length === 0)
        continue;
      for (const ch of ring.characters) {
        let closestIdx = 0;
        let closestDist = Infinity;
        for (let i = 0;i < coords.length; i++) {
          const dx = coords[i].column - ch.motion.currentCoord.column;
          const dy = coords[i].row - ch.motion.currentCoord.row;
          const dist = dx * dx + dy * dy;
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }
        const pathId = `s${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, ring.speed);
        const laps = 3;
        for (let lap = 0;lap < laps; lap++) {
          for (let i = 0;i < coords.length; i++) {
            const idx = (closestIdx + i) % coords.length;
            path.addWaypoint(coords[idx]);
          }
        }
        ch.motion.activatePath(pathId);
      }
    }
  }
  transitionToFinal() {
    this.phase = "final";
    this.phaseFrames = 0;
    for (const ring of this.rings) {
      for (const ch of ring.characters) {
        const pathId = `f${this.pathCounter++}`;
        const path = ch.motion.newPath(pathId, 0.5);
        path.addWaypoint(ch.inputCoord);
        ch.motion.activatePath(pathId);
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const scene = ch.newScene("gradient");
        const charGradient = new Gradient([this.config.finalGradientStops[0], finalColor], 10);
        scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
        ch.activateScene(scene);
      }
    }
  }
  step() {
    if (this.phase === "complete")
      return false;
    this.phaseFrames++;
    switch (this.phase) {
      case "start":
        if (this.phaseFrames >= 100) {
          this.transitionToDisperse();
        }
        break;
      case "disperse":
        for (const ch of this.activeChars) {
          ch.tick();
        }
        if (this.phaseFrames >= this.config.disperseDuration) {
          this.transitionToSpin();
        }
        break;
      case "spin":
        for (const ch of this.activeChars) {
          ch.tick();
        }
        if (this.phaseFrames >= this.config.spinDuration) {
          this.cyclesRemaining--;
          if (this.cyclesRemaining > 0) {
            this.transitionToDisperse();
          } else {
            this.transitionToFinal();
          }
        }
        break;
      case "final":
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        if (this.activeChars.size === 0) {
          this.phase = "complete";
          return false;
        }
        break;
    }
    return true;
  }
}

// src/tte/effects/errorcorrect.ts
var defaultErrorCorrectConfig = {
  errorPairs: 0.1,
  swapDelay: 6,
  errorColor: color("e74c3c"),
  correctColor: color("45bf55"),
  movementSpeed: 0.9,
  movementEasing: inOutCubic,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};

class ErrorCorrectEffect {
  canvas;
  config;
  activeChars = new Set;
  pairs = [];
  pairIndex = 0;
  delayCounter = 0;
  allPairsActivated = false;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const nonSpaceChars = [];
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      nonSpaceChars.push(ch);
    }
    const numPairs = Math.max(1, Math.floor(nonSpaceChars.length * this.config.errorPairs));
    const shuffled = [...nonSpaceChars];
    for (let i = shuffled.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const pairedSet = new Set;
    for (let i = 0;i < numPairs * 2 && i + 1 < shuffled.length; i += 2) {
      this.pairs.push({ a: shuffled[i], b: shuffled[i + 1], activated: false });
      pairedSet.add(shuffled[i]);
      pairedSet.add(shuffled[i + 1]);
    }
    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      if (pairedSet.has(ch)) {
        this.buildSwappedChar(ch, finalColor);
      } else {
        ch.isVisible = true;
        const scene = ch.newScene("final");
        const grad = new Gradient([this.config.finalGradientStops[0], finalColor], 8);
        scene.applyGradientToSymbols(ch.inputSymbol, 2, grad);
        ch.activateScene(scene);
        this.activeChars.add(ch);
      }
    }
  }
  buildSwappedChar(ch, finalColor) {
    const errorColor = this.config.errorColor.rgbHex;
    const correctColor = this.config.correctColor.rgbHex;
    const blockWipeUp = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const blockWipeDown = ["▇", "▆", "▅", "▄", "▃", "▂", "▁"];
    const spawnScene = ch.newScene("spawn");
    spawnScene.addFrame(ch.inputSymbol, 1, errorColor);
    ch.activateScene(spawnScene);
    ch.isVisible = true;
    const errorScene = ch.newScene("error");
    for (let i = 0;i < 10; i++) {
      errorScene.addFrame("▓", 3, errorColor);
      errorScene.addFrame(ch.inputSymbol, 3, "ffffff");
    }
    const firstWipe = ch.newScene("first_block_wipe");
    for (const block of blockWipeUp) {
      firstWipe.addFrame(block, 3, errorColor);
    }
    const correctingScene = ch.newScene("correcting");
    const correctGrad = new Gradient([this.config.errorColor, this.config.correctColor], 10);
    correctingScene.applyGradientToSymbols("█", 3, correctGrad);
    const lastWipe = ch.newScene("last_block_wipe");
    for (const block of blockWipeDown) {
      lastWipe.addFrame(block, 3, correctColor);
    }
    const finalScene = ch.newScene("final");
    const finalGrad = new Gradient([this.config.correctColor, finalColor], 10);
    finalScene.applyGradientToSymbols(ch.inputSymbol, 3, finalGrad);
    const path = ch.motion.newPath("correct_path", this.config.movementSpeed, this.config.movementEasing);
    path.addWaypoint(ch.inputCoord);
    ch.eventHandler.register("SCENE_COMPLETE", "error", "ACTIVATE_SCENE", "first_block_wipe");
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "ACTIVATE_PATH", "correct_path");
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "ACTIVATE_SCENE", "correcting");
    ch.eventHandler.register("PATH_ACTIVATED", "correct_path", "SET_LAYER", 1);
    ch.eventHandler.register("PATH_COMPLETE", "correct_path", "SET_LAYER", 0);
    ch.eventHandler.register("PATH_COMPLETE", "correct_path", "ACTIVATE_SCENE", "last_block_wipe");
    ch.eventHandler.register("SCENE_COMPLETE", "last_block_wipe", "ACTIVATE_SCENE", "final");
  }
  activatePair(pair) {
    pair.activated = true;
    const aCoord = pair.a.inputCoord;
    const bCoord = pair.b.inputCoord;
    pair.a.motion.setCoordinate({ column: bCoord.column, row: bCoord.row });
    pair.b.motion.setCoordinate({ column: aCoord.column, row: aCoord.row });
    pair.a.activateScene("error");
    pair.b.activateScene("error");
    this.activeChars.add(pair.a);
    this.activeChars.add(pair.b);
  }
  step() {
    if (this.pairIndex < this.pairs.length) {
      if (this.delayCounter === 0) {
        this.activatePair(this.pairs[this.pairIndex]);
        this.pairIndex++;
        this.delayCounter = this.config.swapDelay;
      } else {
        this.delayCounter--;
      }
    } else if (!this.allPairsActivated) {
      this.allPairsActivated = true;
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0 || this.pairIndex < this.pairs.length;
  }
}

// src/tte/effects/unstable.ts
var defaultUnstableConfig = {
  unstableColor: color("ff9200"),
  explosionEase: outExpo,
  explosionSpeed: 1,
  reassemblyEase: outExpo,
  reassemblySpeed: 1,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};
function randInt4(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle3(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

class UnstableEffect {
  canvas;
  config;
  nonSpaceChars = [];
  jumbledCoords = new Map;
  phase = "rumble";
  rumbleStep = 0;
  rumbleModDelay = 18;
  holdTicks = 0;
  explosionStarted = false;
  reassemblyStarted = false;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const nonSpace = this.canvas.getNonSpaceCharacters();
    this.nonSpaceChars = nonSpace;
    const inputCoords = nonSpace.map((ch) => ({ ...ch.inputCoord }));
    shuffle3(inputCoords);
    for (let i = 0;i < nonSpace.length; i++) {
      const ch = nonSpace[i];
      const jumbledCoord = inputCoords[i];
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      this.jumbledCoords.set(ch, { ...jumbledCoord });
      const wall = randInt4(0, 3);
      let edgeCol;
      let edgeRow;
      if (wall === 0) {
        edgeCol = dims.left;
        edgeRow = randInt4(dims.bottom, dims.top);
      } else if (wall === 1) {
        edgeCol = dims.right;
        edgeRow = randInt4(dims.bottom, dims.top);
      } else if (wall === 2) {
        edgeCol = randInt4(dims.left, dims.right);
        edgeRow = dims.bottom;
      } else {
        edgeCol = randInt4(dims.left, dims.right);
        edgeRow = dims.top;
      }
      const explosionPath = ch.motion.newPath("explosion", this.config.explosionSpeed, this.config.explosionEase);
      explosionPath.addWaypoint({ column: edgeCol, row: edgeRow });
      const reassemblyPath = ch.motion.newPath("reassembly", this.config.reassemblySpeed, this.config.reassemblyEase);
      reassemblyPath.addWaypoint(ch.inputCoord);
      const rumbleScene = ch.newScene("rumble");
      const rumbleGradient = new Gradient([finalColor, this.config.unstableColor], 12);
      rumbleScene.applyGradientToSymbols(ch.inputSymbol, 10, rumbleGradient);
      const finalScene = ch.newScene("final");
      const finalSceneGradient = new Gradient([this.config.unstableColor, finalColor], 12);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 3, finalSceneGradient);
      ch.motion.setCoordinate(jumbledCoord);
      ch.isVisible = true;
      ch.activateScene("rumble");
    }
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
  }
  step() {
    if (this.phase === "rumble") {
      return this.stepRumble();
    } else if (this.phase === "explosion") {
      return this.stepExplosion();
    } else {
      return this.stepReassembly();
    }
  }
  stepRumble() {
    this.rumbleStep++;
    for (const ch of this.nonSpaceChars) {
      const coord = this.jumbledCoords.get(ch);
      if (!coord)
        continue;
      ch.motion.setCoordinate(coord);
    }
    if (this.rumbleStep > 30 && this.rumbleStep % this.rumbleModDelay === 0) {
      const rowOffset = randInt4(-1, 1);
      const colOffset = randInt4(-1, 1);
      for (const ch of this.nonSpaceChars) {
        const base = this.jumbledCoords.get(ch);
        if (!base)
          continue;
        ch.motion.setCoordinate({ column: base.column + colOffset, row: base.row + rowOffset });
      }
      this.rumbleModDelay = Math.max(this.rumbleModDelay - 1, 1);
    }
    for (const ch of this.nonSpaceChars) {
      ch.tick();
    }
    if (this.rumbleStep >= 150) {
      this.phase = "explosion";
    }
    return true;
  }
  stepExplosion() {
    if (!this.explosionStarted) {
      for (const ch of this.nonSpaceChars) {
        ch.motion.activatePath("explosion");
      }
      this.explosionStarted = true;
    }
    let allComplete = true;
    for (const ch of this.nonSpaceChars) {
      ch.tick();
      if (!ch.motion.movementIsComplete()) {
        allComplete = false;
      }
    }
    if (allComplete) {
      this.holdTicks++;
      if (this.holdTicks >= 30) {
        this.phase = "reassembly";
      }
    }
    return true;
  }
  stepReassembly() {
    if (!this.reassemblyStarted) {
      for (const ch of this.nonSpaceChars) {
        ch.activateScene("final");
        ch.motion.activatePath("reassembly");
      }
      this.reassemblyStarted = true;
    }
    let anyActive = false;
    for (const ch of this.nonSpaceChars) {
      ch.tick();
      if (ch.isActive) {
        anyActive = true;
      }
    }
    return anyActive;
  }
}

// src/tte/effects/overflow.ts
var defaultOverflowConfig = {
  overflowGradientStops: [color("f2ebc0"), color("8dbfb3"), color("f2ebc0")],
  overflowCyclesRange: [2, 4],
  overflowSpeed: 3,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};
function randInt5(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle4(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
var nextCopyId = 1e5;

class OverflowEffect {
  canvas;
  config;
  pendingRows = [];
  activeRows = [];
  delay = 0;
  overflowGradient;
  finalColorMapping;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.overflowGradient = new Gradient(this.config.overflowGradientStops, Math.max(1, this.canvas.dims.top));
    this.finalColorMapping = new Map;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.finalColorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const rowGroups = this.canvas.getCharactersGrouped("row");
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }
    const numCycles = randInt5(this.config.overflowCyclesRange[0], this.config.overflowCyclesRange[1]);
    for (let cycle = 0;cycle < numCycles; cycle++) {
      const shuffled = shuffle4(rowGroups);
      for (const rowChars of shuffled) {
        const copyChars = [];
        for (const origCh of rowChars) {
          const copy = new EffectCharacter(nextCopyId++, origCh.inputSymbol, origCh.inputCoord.column, origCh.inputCoord.row);
          copy.isSpace = origCh.isSpace;
          copy.isVisible = false;
          copyChars.push(copy);
          this.canvas.characters.push(copy);
        }
        this.pendingRows.push({
          chars: copyChars,
          isFinal: false,
          targetRow: rowChars[0].inputCoord.row
        });
      }
    }
    for (const rowChars of rowGroups) {
      this.pendingRows.push({
        chars: rowChars,
        isFinal: true,
        targetRow: rowChars[0].inputCoord.row
      });
    }
  }
  step() {
    if (this.pendingRows.length === 0 && this.activeRows.length === 0) {
      return false;
    }
    if (this.delay > 0) {
      this.delay--;
      return true;
    }
    const rowsToProcess = randInt5(1, this.config.overflowSpeed);
    for (let i = 0;i < rowsToProcess && this.pendingRows.length > 0; i++) {
      for (const active of this.activeRows) {
        active.currentRow++;
        for (const ch of active.chars) {
          ch.motion.setCoordinate({ column: ch.inputCoord.column, row: active.currentRow });
        }
        if (!active.isFinal) {
          this.colorRowByPosition(active);
        }
      }
      const pending = this.pendingRows.shift();
      if (!pending)
        break;
      const startRow = 1;
      for (const ch of pending.chars) {
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: startRow });
        ch.isVisible = true;
      }
      if (pending.isFinal) {
        for (const ch of pending.chars) {
          if (!ch.isSpace) {
            const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
            const finalColor = this.finalColorMapping.get(key) || this.config.finalGradientStops[0];
            ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor.rgbHex };
          }
        }
      } else {
        this.colorRowByPosition({ chars: pending.chars, currentRow: startRow, isFinal: false, targetRow: pending.targetRow });
      }
      this.activeRows.push({
        chars: pending.chars,
        isFinal: pending.isFinal,
        currentRow: startRow,
        targetRow: pending.targetRow
      });
    }
    this.delay = randInt5(0, 3);
    const canvasTop = this.canvas.dims.top;
    this.activeRows = this.activeRows.filter((active) => {
      if (!active.isFinal && active.currentRow > canvasTop + 2) {
        for (const ch of active.chars) {
          ch.isVisible = false;
        }
        return false;
      }
      return true;
    });
    if (this.pendingRows.length === 0) {
      this.activeRows = this.activeRows.filter((active) => {
        if (!active.isFinal) {
          for (const ch of active.chars) {
            ch.isVisible = false;
          }
          return false;
        }
        return true;
      });
      const allSettled = this.activeRows.every((active) => active.currentRow === active.targetRow);
      if (allSettled) {
        for (const active of this.activeRows) {
          for (const ch of active.chars) {
            ch.motion.setCoordinate(ch.inputCoord);
          }
        }
        return false;
      }
    }
    return true;
  }
  colorRowByPosition(active) {
    const spectrum = this.overflowGradient.spectrum;
    if (spectrum.length === 0)
      return;
    const fraction = Math.min(active.currentRow / Math.max(1, this.canvas.dims.top), 1);
    const colorIdx = Math.min(Math.floor(fraction * spectrum.length), spectrum.length - 1);
    const rowColor = spectrum[colorIdx];
    for (const ch of active.chars) {
      if (!ch.isSpace) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: rowColor.rgbHex };
      }
    }
  }
}

// src/tte/effects/bouncyballs.ts
var defaultBouncyBallsConfig = {
  ballColors: [color("d1f4a5"), color("96e2a4"), color("5acda9")],
  ballSymbols: ["*", "o", "O", "0", "."],
  ballDelay: 4,
  movementSpeed: 0.45,
  movementEasing: outBounce,
  finalGradientStops: [color("f8ffae"), color("43c6ac")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "diagonal"
};
function randInt6(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class BouncyBallsEffect {
  canvas;
  config;
  activeChars = new Set;
  pendingRowGroups = [];
  currentRowGroup = [];
  ticksSinceLastDrop;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.ticksSinceLastDrop = config.ballDelay;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const rowMap = new Map;
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      const launchCol = ch.inputCoord.column;
      const launchRow = Math.round(dims.top * (1 + Math.random() * 0.5));
      ch.motion.setCoordinate({ column: launchCol, row: launchRow });
      const bouncePath = ch.motion.newPath("bounce", {
        speed: this.config.movementSpeed,
        ease: this.config.movementEasing
      });
      bouncePath.addWaypoint(ch.inputCoord);
      const ballColor = pick(this.config.ballColors);
      const ballSymbol = pick(this.config.ballSymbols);
      const ballScene = ch.newScene("ball", true);
      ballScene.addFrame(ballSymbol, 1, ballColor.rgbHex);
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const landScene = ch.newScene("land");
      const charGradient = new Gradient([ballColor, finalColor], 10);
      landScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.eventHandler.register("PATH_COMPLETE", "bounce", "ACTIVATE_SCENE", "land");
      const row = ch.inputCoord.row;
      if (!rowMap.has(row))
        rowMap.set(row, []);
      rowMap.get(row)?.push(ch);
    }
    const sortedRows = [...rowMap.keys()].sort((a, b) => a - b);
    this.pendingRowGroups = sortedRows.map((r) => rowMap.get(r) ?? []);
  }
  step() {
    this.ticksSinceLastDrop++;
    if (this.currentRowGroup.length === 0 && this.pendingRowGroups.length > 0) {
      const next = this.pendingRowGroups.shift();
      if (next)
        this.currentRowGroup = next;
    }
    if (this.currentRowGroup.length > 0 && this.ticksSinceLastDrop > this.config.ballDelay) {
      this.ticksSinceLastDrop = 0;
      const dropCount = randInt6(2, 6);
      for (let i = 0;i < dropCount && this.currentRowGroup.length > 0; i++) {
        const idx = Math.floor(Math.random() * this.currentRowGroup.length);
        const [ch] = this.currentRowGroup.splice(idx, 1);
        if (!ch)
          continue;
        ch.isVisible = true;
        ch.motion.activatePath("bounce");
        ch.activateScene("ball");
        this.activeChars.add(ch);
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0 || this.currentRowGroup.length > 0 || this.pendingRowGroups.length > 0;
  }
}

// src/tte/effects/fireworks.ts
var defaultFireworksConfig = {
  explodeAnywhere: false,
  fireworkColors: [
    color("88F7E2"),
    color("44D492"),
    color("F5EB67"),
    color("FFA15C"),
    color("FA233E")
  ],
  fireworkSymbol: "o",
  fireworkVolume: 0.05,
  launchDelay: 45,
  explodeDistance: 0.2,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientDirection: "horizontal"
};
function randInt7(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class FireworksEffect {
  canvas;
  config;
  activeChars = new Set;
  shells = [];
  shellQueue = [];
  frameCount = 0;
  nextLaunchFrame = 0;
  colorMapping = new Map;
  pathCounter = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    nonSpaceChars.sort((a, b) => a.inputCoord.row - b.inputCoord.row);
    const charsPerShell = Math.max(1, Math.round(nonSpaceChars.length * this.config.fireworkVolume));
    const explodeRadius = Math.min(15, Math.max(1, Math.round(dims.right * this.config.explodeDistance)));
    for (let i = 0;i < nonSpaceChars.length; i += charsPerShell) {
      const chars = nonSpaceChars.slice(i, i + charsPerShell);
      const shellColor = this.config.fireworkColors[Math.floor(Math.random() * this.config.fireworkColors.length)];
      const apexCol = randInt7(dims.left, dims.right - 1);
      const minRow = this.config.explodeAnywhere ? dims.bottom : Math.max(...chars.map((c) => c.inputCoord.row));
      const apexRow = randInt7(minRow, dims.top);
      const apex = { column: apexCol, row: apexRow };
      const launchColumn = randInt7(dims.left, dims.right);
      this.shells.push({ characters: chars, shellColor, apex, launchColumn, pathCounterBase: 0 });
    }
    this.shellQueue = [...this.shells];
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (ch.isSpace)
        continue;
      ch.currentVisual = { symbol: " ", fgColor: null };
    }
    for (const shell of this.shells) {
      shell.pathCounterBase = this.pathCounter;
      const circleCoords = findCoordsInCircle(shell.apex, explodeRadius);
      if (circleCoords.length === 0)
        continue;
      for (let ci = 0;ci < shell.characters.length; ci++) {
        const ch = shell.characters[ci];
        const targetOnCircle = circleCoords[ci % circleCoords.length];
        const launchScene = ch.newScene("launch", true);
        launchScene.addFrame(this.config.fireworkSymbol, 2, shell.shellColor.rgbHex);
        launchScene.addFrame(this.config.fireworkSymbol, 1, "ffffff");
        const bloomScene = ch.newScene("bloom");
        const bloomGrad = new Gradient([shell.shellColor, color("ffffff"), shell.shellColor], 5);
        bloomScene.applyGradientToSymbols(ch.inputSymbol, 2, bloomGrad);
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
        const fallScene = ch.newScene("fall");
        const fallGrad = new Gradient([shell.shellColor, finalColor], 15);
        fallScene.applyGradientToSymbols(ch.inputSymbol, 10, fallGrad);
        const launchStart = { column: shell.launchColumn, row: dims.bottom };
        const launchPath = ch.motion.newPath(`launch_${this.pathCounter}`, 0.35, outExpo);
        launchPath.addWaypoint(launchStart);
        launchPath.addWaypoint(shell.apex);
        const explodePath = ch.motion.newPath(`explode_${this.pathCounter}`, { speed: 0.2 + Math.random() * 0.2, ease: outCirc });
        explodePath.addWaypoint(targetOnCircle);
        const bloomControlPoint = extrapolateAlongRay(shell.apex, targetOnCircle, Math.floor(explodeRadius / 2));
        const bloomCoord = {
          column: bloomControlPoint.column,
          row: Math.max(1, bloomControlPoint.row - 7)
        };
        explodePath.addWaypoint(bloomCoord, bloomControlPoint);
        const fallPath = ch.motion.newPath(`fall_${this.pathCounter}`, 0.6, inOutQuart);
        const inputControlPoint = { column: bloomCoord.column, row: 1 };
        fallPath.addWaypoint(ch.inputCoord, inputControlPoint);
        const launchId = `launch_${this.pathCounter}`;
        const explodeId = `explode_${this.pathCounter}`;
        const fallId = `fall_${this.pathCounter}`;
        ch.eventHandler.register("PATH_COMPLETE", launchId, "ACTIVATE_PATH", explodeId);
        ch.eventHandler.register("PATH_COMPLETE", launchId, "ACTIVATE_SCENE", "bloom");
        ch.eventHandler.register("PATH_COMPLETE", explodeId, "ACTIVATE_PATH", fallId);
        ch.eventHandler.register("PATH_ACTIVATED", fallId, "ACTIVATE_SCENE", "fall");
        this.pathCounter++;
      }
    }
  }
  launchShell(shell) {
    for (let ci = 0;ci < shell.characters.length; ci++) {
      const ch = shell.characters[ci];
      const launchStart = { column: shell.launchColumn, row: this.canvas.dims.bottom };
      ch.motion.setCoordinate(launchStart);
      ch.activateScene("launch");
      ch.motion.activatePath(`launch_${shell.pathCounterBase + ci}`);
      this.activeChars.add(ch);
    }
  }
  step() {
    this.frameCount++;
    if (this.shellQueue.length > 0 && this.frameCount >= this.nextLaunchFrame) {
      const shell = this.shellQueue.shift();
      if (shell) {
        this.launchShell(shell);
        const jitter = 0.5 + Math.random();
        this.nextLaunchFrame = this.frameCount + Math.round(this.config.launchDelay * jitter);
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    if (this.shellQueue.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    return true;
  }
}

// src/tte/effects/spotlights.ts
var defaultSpotlightsConfig = {
  spotlightCount: 3,
  beamWidthRatio: 2,
  beamFalloff: 0.3,
  searchDuration: 550,
  searchSpeedRange: [0.35, 0.75],
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "vertical"
};
function randRange2(min, max) {
  return min + Math.random() * (max - min);
}
function randInt8(min, max) {
  return Math.floor(randRange2(min, max + 1));
}
function randomCoord(dims) {
  return {
    column: randInt8(dims.left, dims.right),
    row: randInt8(dims.bottom, dims.top)
  };
}
function randomControl(start, end, dims) {
  const midCol = (start.column + end.column) / 2;
  const midRow = (start.row + end.row) / 2;
  const spread = Math.max(dims.right - dims.left, dims.top - dims.bottom) * 0.4;
  return {
    column: Math.round(midCol + randRange2(-spread, spread)),
    row: Math.round(midRow + randRange2(-spread, spread))
  };
}

class SpotlightsEffect {
  canvas;
  config;
  spotlights = [];
  center;
  beamWidth;
  phase = "search";
  phaseFrames = 0;
  expandRadius = 0;
  maxExpandRadius;
  activeChars = new Set;
  colorMapping = new Map;
  charBaseColors = new Map;
  charDarkColors = new Map;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    const { dims } = canvas;
    this.center = {
      column: Math.round((dims.left + dims.right) / 2),
      row: Math.round((dims.top + dims.bottom) / 2)
    };
    const smallestDim = Math.min(dims.right, dims.top);
    this.beamWidth = Math.max(1, Math.floor(smallestDim / config.beamWidthRatio));
    this.maxExpandRadius = Math.floor(Math.max(dims.right, dims.top) / 1.5);
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const targetColor = this.colorMapping.get(key) || config.finalGradientStops[0];
      this.charBaseColors.set(ch.id, targetColor);
      this.charDarkColors.set(ch.id, adjustBrightness(targetColor, 0.2));
    }
    for (let i = 0;i < config.spotlightCount; i++) {
      const startCoord = randomCoord(dims);
      const endCoord = randomCoord(dims);
      const control = randomControl(startCoord, endCoord, dims);
      this.spotlights.push({
        coord: { ...startCoord },
        speed: randRange2(config.searchSpeedRange[0], config.searchSpeedRange[1]),
        pathStart: startCoord,
        pathControl: control,
        pathEnd: endCoord,
        pathProgress: 0,
        pathLength: Math.max(1, findLengthOfLine(startCoord, endCoord))
      });
    }
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.charDarkColors.get(ch.id)?.rgbHex ?? null };
      if (!ch.isSpace) {
        this.activeChars.add(ch);
      }
    }
  }
  newSpotlightPath(spotlight) {
    const { dims } = this.canvas;
    const newEnd = randomCoord(dims);
    spotlight.pathStart = { ...spotlight.coord };
    spotlight.pathEnd = newEnd;
    spotlight.pathControl = randomControl(spotlight.pathStart, newEnd, dims);
    spotlight.pathProgress = 0;
    spotlight.pathLength = Math.max(1, findLengthOfLine(spotlight.pathStart, newEnd));
  }
  moveSpotlights() {
    for (const sl of this.spotlights) {
      const step = sl.speed / sl.pathLength;
      sl.pathProgress = Math.min(1, sl.pathProgress + step);
      sl.coord = findCoordOnBezierCurve(sl.pathStart, [sl.pathControl], sl.pathEnd, sl.pathProgress);
      if (sl.pathProgress >= 1) {
        this.newSpotlightPath(sl);
      }
    }
  }
  convergeSpotlights() {
    for (const sl of this.spotlights) {
      const step = sl.speed / sl.pathLength;
      sl.pathProgress = Math.min(1, sl.pathProgress + step);
      const easedT = inOutSine(sl.pathProgress);
      sl.coord = {
        column: Math.round(sl.pathStart.column + (this.center.column - sl.pathStart.column) * easedT),
        row: Math.round(sl.pathStart.row + (this.center.row - sl.pathStart.row) * easedT)
      };
    }
  }
  illuminateCharacters() {
    for (const ch of this.activeChars) {
      const baseColor = this.charBaseColors.get(ch.id);
      if (!baseColor)
        continue;
      let minDist = Infinity;
      for (const sl of this.spotlights) {
        const dist = findLengthOfLine(ch.inputCoord, sl.coord, true);
        if (dist < minDist)
          minDist = dist;
      }
      if (minDist <= this.beamWidth) {
        const normalizedDist = minDist / this.beamWidth;
        const falloffStart = 1 - this.config.beamFalloff;
        let brightness;
        if (normalizedDist <= falloffStart) {
          brightness = 1;
        } else {
          brightness = 1 - (normalizedDist - falloffStart) / this.config.beamFalloff;
        }
        brightness = Math.max(0.2, brightness);
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: adjustBrightness(baseColor, brightness).rgbHex };
      } else {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.charDarkColors.get(ch.id)?.rgbHex ?? null };
      }
    }
  }
  illuminateByExpansion() {
    for (const ch of this.activeChars) {
      const dist = findLengthOfLine(ch.inputCoord, this.center, true);
      const baseColor = this.charBaseColors.get(ch.id);
      if (!baseColor)
        continue;
      if (dist <= this.expandRadius) {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: baseColor.rgbHex };
      } else if (dist <= this.expandRadius + this.beamWidth) {
        const edgeDist = dist - this.expandRadius;
        const brightness = Math.max(0.2, 1 - edgeDist / this.beamWidth);
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: adjustBrightness(baseColor, brightness).rgbHex };
      } else {
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.charDarkColors.get(ch.id)?.rgbHex ?? null };
      }
    }
  }
  transitionToConverge() {
    this.phase = "converge";
    this.phaseFrames = 0;
    for (const sl of this.spotlights) {
      sl.pathStart = { ...sl.coord };
      sl.pathProgress = 0;
      sl.pathLength = Math.max(1, findLengthOfLine(sl.coord, this.center));
      sl.speed = randRange2(0.3, 0.5);
    }
  }
  transitionToExpand() {
    this.phase = "expand";
    this.phaseFrames = 0;
    this.expandRadius = 0;
  }
  transitionToFinal() {
    this.phase = "final";
    this.phaseFrames = 0;
    for (const ch of this.activeChars) {
      const baseColor = this.charBaseColors.get(ch.id);
      if (!baseColor)
        continue;
      const scene = ch.newScene("final_gradient");
      const charGradient = new Gradient([this.config.finalGradientStops[0], baseColor], 10);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
      ch.activateScene(scene);
    }
  }
  step() {
    if (this.phase === "complete")
      return false;
    this.phaseFrames++;
    switch (this.phase) {
      case "search":
        this.moveSpotlights();
        this.illuminateCharacters();
        if (this.phaseFrames >= this.config.searchDuration) {
          this.transitionToConverge();
        }
        break;
      case "converge": {
        this.convergeSpotlights();
        this.illuminateCharacters();
        const allConverged = this.spotlights.every((sl) => sl.pathProgress >= 1);
        if (allConverged) {
          this.transitionToExpand();
        }
        break;
      }
      case "expand":
        this.expandRadius += 1;
        this.illuminateByExpansion();
        if (this.expandRadius > this.maxExpandRadius) {
          this.transitionToFinal();
        }
        break;
      case "final":
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        if (this.activeChars.size === 0) {
          this.phase = "complete";
          return false;
        }
        break;
    }
    return true;
  }
}

// src/tte/effects/vhstape.ts
var defaultVhstapeConfig = {
  glitchLineChance: 0.05,
  noiseChance: 0.004,
  totalGlitchTime: 600,
  maxGlitchLines: 3,
  glitchShiftRange: [4, 25],
  glitchLineDuration: 10,
  glitchWaveHeight: 3,
  glitchLineColors: [
    color("ffffff"),
    color("ff0000"),
    color("00ff00"),
    color("0000ff"),
    color("ffffff")
  ],
  glitchWaveColors: [
    color("ffffff"),
    color("ff0000"),
    color("00ff00"),
    color("0000ff"),
    color("ffffff")
  ],
  noiseColors: [
    color("1e1e1f"),
    color("3c3b3d"),
    color("6d6c70"),
    color("a2a1a6"),
    color("cbc9cf"),
    color("ffffff")
  ],
  noiseDuration: 30,
  noiseSymbols: ["#", "*", ".", ":"],
  redrawLineDelay: 4,
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};
function randInt9(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class VhstapeEffect {
  canvas;
  config;
  phase = "glitch";
  frameCount = 0;
  rowGroups = [];
  rowNumbers = [];
  rowMap = new Map;
  activeGlitchLines = [];
  glitchWaveIndex = 0;
  glitchWaveDirection = 1;
  noiseFrameCount = 0;
  redrawIndex = 0;
  redrawDelay = 0;
  colorMapping = new Map;
  allChars = [];
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    this.rowGroups = this.canvas.getCharactersGrouped("row");
    for (const group of this.rowGroups) {
      if (group.length > 0) {
        const rowNum = group[0].inputCoord.row;
        this.rowMap.set(rowNum, group);
        this.rowNumbers.push(rowNum);
      }
    }
    this.allChars = this.canvas.getCharacters();
    for (const ch of this.allChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
      const redrawScene = ch.newScene("redraw");
      redrawScene.addFrame("█", 6, "ffffff");
      redrawScene.addFrame(ch.inputSymbol, 1, finalColor.rgbHex);
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor.rgbHex };
    }
  }
  step() {
    this.frameCount++;
    if (this.phase === "glitch") {
      return this.stepGlitch();
    } else if (this.phase === "noise") {
      return this.stepNoise();
    } else {
      return this.stepRedraw();
    }
  }
  stepGlitch() {
    for (let i = this.activeGlitchLines.length - 1;i >= 0; i--) {
      const gl = this.activeGlitchLines[i];
      gl.remainingFrames--;
      gl.colorIndex = (gl.colorIndex + 1) % this.config.glitchLineColors.length;
      if (gl.remainingFrames <= 0) {
        this.restoreRow(gl.row);
        this.activeGlitchLines.splice(i, 1);
      } else {
        this.applyGlitchToRow(gl.row, gl.shiftAmount, gl.colorIndex);
      }
    }
    if (this.activeGlitchLines.length < this.config.maxGlitchLines) {
      if (Math.random() < this.config.glitchLineChance) {
        const activeRows2 = new Set(this.activeGlitchLines.map((gl) => gl.row));
        const available = this.rowNumbers.filter((r) => !activeRows2.has(r));
        if (available.length > 0) {
          const row = available[Math.floor(Math.random() * available.length)];
          const [minShift, maxShift] = this.config.glitchShiftRange;
          const shift = randInt9(minShift, maxShift) * (Math.random() < 0.5 ? 1 : -1);
          this.activeGlitchLines.push({
            row,
            remainingFrames: this.config.glitchLineDuration,
            shiftAmount: shift,
            colorIndex: Math.floor(Math.random() * this.config.glitchLineColors.length)
          });
        }
      }
    }
    if (this.rowNumbers.length > 1) {
      const halfHeight = Math.floor(this.config.glitchWaveHeight / 2);
      const activeRows2 = new Set(this.activeGlitchLines.map((gl) => gl.row));
      for (let offset = -halfHeight;offset <= halfHeight; offset++) {
        const idx = this.glitchWaveIndex + offset;
        if (idx >= 0 && idx < this.rowNumbers.length) {
          const rowNum = this.rowNumbers[idx];
          if (!activeRows2.has(rowNum)) {
            const waveShift = randInt9(1, 3) * (Math.random() < 0.5 ? 1 : -1);
            this.applyShiftToRow(rowNum, waveShift);
          }
        }
      }
      this.glitchWaveIndex += this.glitchWaveDirection;
      if (this.glitchWaveIndex >= this.rowNumbers.length || this.glitchWaveIndex < 0) {
        this.glitchWaveDirection *= -1;
        this.glitchWaveIndex += this.glitchWaveDirection * 2;
      }
    }
    if (Math.random() < this.config.noiseChance) {
      this.applyNoiseToAll();
    }
    const activeRows = new Set(this.activeGlitchLines.map((gl) => gl.row));
    for (const rowNum of this.rowNumbers) {
      if (!activeRows.has(rowNum)) {
        this.restoreRow(rowNum);
      }
    }
    if (this.frameCount >= this.config.totalGlitchTime) {
      for (const gl of this.activeGlitchLines) {
        this.restoreRow(gl.row);
      }
      this.activeGlitchLines = [];
      this.phase = "noise";
      this.noiseFrameCount = 0;
    }
    return true;
  }
  stepNoise() {
    this.noiseFrameCount++;
    this.applyNoiseToAll();
    if (this.noiseFrameCount >= this.config.noiseDuration) {
      this.phase = "redraw";
      this.redrawIndex = 0;
      this.redrawDelay = 0;
    }
    return true;
  }
  stepRedraw() {
    if (this.redrawIndex < this.rowNumbers.length) {
      if (this.redrawDelay <= 0) {
        const rowNum = this.rowNumbers[this.redrawIndex];
        const chars = this.rowMap.get(rowNum);
        if (chars) {
          for (const ch of chars) {
            ch.motion.setCoordinate(ch.inputCoord);
            ch.activateScene("redraw");
          }
        }
        this.redrawIndex++;
        this.redrawDelay = this.config.redrawLineDelay;
      } else {
        this.redrawDelay--;
      }
    }
    let anyActive = false;
    for (const ch of this.allChars) {
      ch.tick();
      if (ch.isActive) {
        anyActive = true;
      }
    }
    return anyActive || this.redrawIndex < this.rowNumbers.length;
  }
  applyGlitchToRow(row, shiftAmount, colorIndex) {
    const chars = this.rowMap.get(row);
    if (!chars)
      return;
    const glitchColor = this.config.glitchLineColors[colorIndex];
    for (const ch of chars) {
      ch.motion.setCoordinate({
        column: ch.inputCoord.column + shiftAmount,
        row: ch.inputCoord.row
      });
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: glitchColor.rgbHex };
    }
  }
  applyShiftToRow(row, shiftAmount) {
    const chars = this.rowMap.get(row);
    if (!chars)
      return;
    for (const ch of chars) {
      ch.motion.setCoordinate({
        column: ch.inputCoord.column + shiftAmount,
        row: ch.inputCoord.row
      });
    }
  }
  restoreRow(row) {
    const chars = this.rowMap.get(row);
    if (!chars)
      return;
    for (const ch of chars) {
      ch.motion.setCoordinate(ch.inputCoord);
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor.rgbHex };
    }
  }
  applyNoiseToAll() {
    for (const ch of this.allChars) {
      const sym = this.config.noiseSymbols[Math.floor(Math.random() * this.config.noiseSymbols.length)];
      const noiseColor = this.config.noiseColors[Math.floor(Math.random() * this.config.noiseColors.length)];
      ch.currentVisual = { symbol: sym, fgColor: noiseColor.rgbHex };
    }
  }
}

// src/tte/effects/blackhole.ts
var defaultBlackholeConfig = {
  blackholeColor: color("ffffff"),
  starColors: [
    color("ffcc0d"),
    color("ff7326"),
    color("ff194d"),
    color("bf2669"),
    color("702a8c"),
    color("049dbf")
  ],
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 9,
  finalGradientFrames: 10,
  finalGradientDirection: "diagonal"
};
var STAR_SYMBOLS = ["*", "'", "`", "¤", "•", "°", "·"];
var UNSTABLE_SYMBOLS = ["◦", "◎", "◉", "●", "◉", "◎", "◦"];
function shuffle5(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function randRange3(min, max) {
  return min + Math.random() * (max - min);
}
function randInt10(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class BlackholeEffect {
  canvas;
  config;
  ringChars = [];
  starfieldChars = [];
  activeRingChars = new Set;
  activeStarChars = new Set;
  activeChars = new Set;
  center = { column: 1, row: 1 };
  blackholeRadius = 3;
  ringCoords = [];
  phase = "forming";
  phaseFrames = 0;
  ringActivationDelays = [];
  colorMapping = new Map;
  pathCounter = 0;
  starfieldColors = [];
  consumedGradientMap = new Map;
  charStarColor = new Map;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    this.center = {
      column: Math.round((dims.left + dims.right) / 2),
      row: Math.round((dims.bottom + dims.top) / 2)
    };
    const canvasWidth = dims.right - dims.left + 1;
    const canvasHeight = dims.top - dims.bottom + 1;
    this.blackholeRadius = Math.max(3, Math.min(Math.round(canvasWidth * 0.3), Math.round(canvasHeight * 0.2)));
    const starfieldGradient = new Gradient([color("4a4a4d"), color("ffffff")], 6);
    this.starfieldColors = starfieldGradient.spectrum;
    for (const sc of this.starfieldColors) {
      const key = sc.rgbHex;
      if (!this.consumedGradientMap.has(key)) {
        this.consumedGradientMap.set(key, new Gradient([sc, color("000000")], 10));
      }
    }
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    shuffle5(nonSpaceChars);
    const ringCount = Math.min(Math.max(3, Math.round(this.blackholeRadius * 3)), nonSpaceChars.length);
    this.ringChars = nonSpaceChars.slice(0, ringCount);
    this.starfieldChars = nonSpaceChars.slice(ringCount);
    this.ringCoords = findCoordsOnCircle(this.center, this.blackholeRadius, ringCount);
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (!ch.isSpace) {
        const starSymbol = STAR_SYMBOLS[Math.floor(Math.random() * STAR_SYMBOLS.length)];
        const starColor = this.starfieldColors[Math.floor(Math.random() * this.starfieldColors.length)];
        this.charStarColor.set(ch, starColor);
        const starScene = ch.newScene("initial_star", true);
        starScene.addFrame(starSymbol, 1, starColor.rgbHex);
        ch.currentVisual = { symbol: starSymbol, fgColor: starColor.rgbHex };
        ch.activateScene("initial_star");
      }
    }
    for (const ch of this.starfieldChars) {
      const randomCoord2 = {
        column: randInt10(dims.left, dims.right),
        row: randInt10(dims.bottom, dims.top)
      };
      ch.motion.setCoordinate(randomCoord2);
    }
    const staggerStep = Math.max(Math.floor(100 / ringCount), 6);
    for (let i = 0;i < this.ringChars.length; i++) {
      const ch = this.ringChars[i];
      this.ringActivationDelays.push(i * staggerStep);
      const ringScene = ch.newScene("ring_color", true);
      ringScene.addFrame("*", 1, this.config.blackholeColor.rgbHex);
      const ringTarget = this.ringCoords[i % this.ringCoords.length];
      const formId = `form_${i}`;
      const formPath = ch.motion.newPath(formId, { speed: 0.7, ease: inOutSine });
      formPath.addWaypoint(ringTarget);
      const orbitId = `orbit_${i}`;
      const startIdx = i % this.ringCoords.length;
      const orbitPath = ch.motion.newPath(orbitId, {
        speed: 0.45,
        loop: true,
        totalLoops: 0
      });
      for (let j = 0;j < this.ringCoords.length; j++) {
        const idx = (startIdx + j) % this.ringCoords.length;
        orbitPath.addWaypoint(this.ringCoords[idx]);
      }
    }
  }
  transitionToConsuming() {
    this.phase = "consuming";
    this.phaseFrames = 0;
    for (let i = 0;i < this.ringChars.length; i++) {
      const ch = this.ringChars[i];
      ch.motion.activatePath(`orbit_${i}`);
    }
    for (const ch of this.starfieldChars) {
      const starColor = this.charStarColor.get(ch) || this.starfieldColors[0];
      const starSymbol = ch.currentVisual.symbol;
      const consumedScene = ch.newScene("consumed", false, { sync: "DISTANCE" });
      const consumedGrad = this.consumedGradientMap.get(starColor.rgbHex) || new Gradient([starColor, color("000000")], 10);
      consumedScene.applyGradientToSymbols(starSymbol, 1, consumedGrad);
      consumedScene.addFrame(" ", 1, null);
      const singId = `sing_${this.pathCounter++}`;
      const singPath = ch.motion.newPath(singId, {
        speed: randRange3(0.17, 0.3),
        ease: inExpo
      });
      singPath.addWaypoint(this.center);
      ch.eventHandler.register("PATH_ACTIVATED", singId, "ACTIVATE_SCENE", "consumed");
      ch.eventHandler.register("PATH_ACTIVATED", singId, "SET_LAYER", 2);
      ch.motion.activatePath(singId);
      this.activeStarChars.add(ch);
    }
  }
  transitionToCollapsing() {
    this.phase = "collapsing";
    this.phaseFrames = 0;
    const expandRingCoords = findCoordsOnCircle(this.center, this.blackholeRadius + 3, this.ringChars.length);
    let pointCharMade = false;
    for (let i = 0;i < this.ringChars.length; i++) {
      const ch = this.ringChars[i];
      ch.motion.activePath = null;
      const expandId = `expand_${this.pathCounter}`;
      const expandPath = ch.motion.newPath(expandId, { speed: 0.2, ease: inExpo });
      expandPath.addWaypoint(expandRingCoords[i % expandRingCoords.length]);
      const collapseId = `collapse_${this.pathCounter}`;
      const collapsePath = ch.motion.newPath(collapseId, { speed: 0.3, ease: inExpo });
      collapsePath.addWaypoint(this.center);
      ch.eventHandler.register("PATH_COMPLETE", expandId, "ACTIVATE_PATH", collapseId);
      if (!pointCharMade) {
        const unstableScene = ch.newScene("unstable");
        for (let rep = 0;rep < 3; rep++) {
          for (const sym of UNSTABLE_SYMBOLS) {
            const col = this.config.starColors[Math.floor(Math.random() * this.config.starColors.length)];
            unstableScene.addFrame(sym, 3, col.rgbHex);
          }
        }
        ch.eventHandler.register("PATH_COMPLETE", collapseId, "ACTIVATE_SCENE", "unstable");
        pointCharMade = true;
      }
      ch.motion.activatePath(expandId);
      this.pathCounter++;
    }
  }
  transitionToExploding() {
    this.phase = "exploding";
    this.phaseFrames = 0;
    for (const ch of this.ringChars) {
      ch.currentVisual = { symbol: " ", fgColor: null };
    }
    const allNonSpace = this.canvas.getNonSpaceCharacters();
    for (const ch of allNonSpace) {
      ch.motion.setCoordinate({ ...this.center });
      const explosionColor = this.config.starColors[Math.floor(Math.random() * this.config.starColors.length)];
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];
      const explosionScene = ch.newScene("explosion");
      const explosionGrad = new Gradient([explosionColor, finalColor], this.config.finalGradientFrames);
      explosionScene.applyGradientToSymbols(ch.inputSymbol, 20, explosionGrad);
      const scatterCoords = findCoordsInCircle(ch.inputCoord, 3);
      const scatterTarget = scatterCoords.length > 0 ? scatterCoords[Math.floor(Math.random() * scatterCoords.length)] : { ...ch.inputCoord };
      const scatterId = `scatter_${this.pathCounter}`;
      const scatterPath = ch.motion.newPath(scatterId, {
        speed: randRange3(0.3, 0.4),
        ease: outExpo
      });
      scatterPath.addWaypoint(scatterTarget);
      const returnId = `return_${this.pathCounter}`;
      const returnPath = ch.motion.newPath(returnId, {
        speed: randRange3(0.04, 0.06),
        ease: inCubic
      });
      returnPath.addWaypoint(ch.inputCoord);
      ch.eventHandler.register("PATH_COMPLETE", scatterId, "ACTIVATE_PATH", returnId);
      ch.eventHandler.register("PATH_COMPLETE", scatterId, "ACTIVATE_SCENE", "explosion");
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: explosionColor.rgbHex };
      ch.motion.activatePath(scatterId);
      this.activeChars.add(ch);
      this.pathCounter++;
    }
  }
  step() {
    if (this.phase === "complete")
      return false;
    this.phaseFrames++;
    switch (this.phase) {
      case "forming": {
        for (let i = 0;i < this.ringChars.length; i++) {
          const ch = this.ringChars[i];
          if (this.phaseFrames >= this.ringActivationDelays[i] && !this.activeRingChars.has(ch)) {
            ch.activateScene("ring_color");
            ch.motion.activatePath(`form_${i}`);
            this.activeRingChars.add(ch);
          }
        }
        for (const ch of this.activeRingChars) {
          ch.tick();
        }
        for (const ch of this.starfieldChars) {
          ch.tick();
        }
        if (this.activeRingChars.size === this.ringChars.length && [...this.activeRingChars].every((ch) => ch.motion.movementIsComplete())) {
          this.transitionToConsuming();
        }
        break;
      }
      case "consuming": {
        for (const ch of this.activeRingChars) {
          ch.tick();
        }
        for (const ch of this.activeStarChars) {
          ch.tick();
          if (ch.motion.movementIsComplete()) {
            ch.currentVisual = { symbol: " ", fgColor: null };
            this.activeStarChars.delete(ch);
          }
        }
        if (this.activeStarChars.size === 0) {
          this.transitionToCollapsing();
        }
        break;
      }
      case "collapsing": {
        for (const ch of this.activeRingChars) {
          ch.tick();
        }
        const allCollapsed = [...this.activeRingChars].every((ch) => !ch.isActive);
        if (allCollapsed) {
          this.transitionToExploding();
        }
        break;
      }
      case "exploding": {
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        if (this.activeChars.size === 0) {
          this.phase = "complete";
          return false;
        }
        break;
      }
    }
    return true;
  }
}

// src/tte/effects/smoke.ts
var defaultSmokeConfig = {
  startingColor: color("7A7A7A"),
  smokeSymbols: ["░", "▒", "▓", "▒", "░"],
  smokeGradientStops: [color("242424"), color("FFFFFF")],
  useWholeCanvas: false,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical"
};

class SmokeEffect {
  canvas;
  pendingChars = [];
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.build(config);
  }
  build(config) {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    const smokeGradientStops = [
      ...config.smokeGradientStops,
      ...[...config.finalGradientStops].reverse()
    ];
    const smokeGradient = new Gradient(smokeGradientStops, [3, 4]);
    const blackFallback = color("000000");
    const chars = this.canvas.getCharacters();
    for (const ch of chars) {
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: config.startingColor.rgbHex };
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const charFinalColor = colorMapping.get(key) ?? blackFallback;
      const paintGradient = new Gradient([...config.finalGradientStops, charFinalColor], 5);
      const smokeScene = ch.newScene("smoke");
      smokeScene.applyGradientToSymbols(config.smokeSymbols, 3, smokeGradient);
      const paintScene = ch.newScene("paint");
      paintScene.applyGradientToSymbols([ch.inputSymbol], 5, paintGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "smoke", "ACTIVATE_SCENE", "paint");
    }
    this.pendingChars = buildSpanningTree(chars, { startStrategy: "random", traversal: "bfs" });
  }
  step() {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      return false;
    }
    if (this.pendingChars.length > 0) {
      const ch = this.pendingChars.shift();
      if (!ch)
        return false;
      ch.activateScene("smoke");
      this.activeChars.add(ch);
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingChars.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/bubbles.ts
var defaultBubblesConfig = {
  bubbleColors: [color("d33aff"), color("7395c4"), color("43c2a7"), color("02ff7f")],
  popColor: color("ffffff"),
  bubbleSpeed: 0.5,
  bubbleDelay: 20,
  popCondition: "row",
  finalGradientStops: [color("d33aff"), color("02ff7f")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal"
};
function setCharCoordinates(bubble) {
  const anchor = { column: Math.round(bubble.anchorCol), row: Math.round(bubble.anchorRow) };
  const points = findCoordsOnCircle(anchor, bubble.radius, bubble.characters.length, false);
  for (let i = 0;i < bubble.characters.length; i++) {
    const point = points[i] ?? anchor;
    bubble.characters[i].motion.setCoordinate(point);
    if (point.row === bubble.lowestRow) {
      bubble.landed = true;
    }
  }
}
function moveBubble(bubble, speed, popCondition) {
  const dx = bubble.targetCol - bubble.anchorCol;
  const dy = bubble.lowestRow - bubble.anchorRow;
  const dist = Math.hypot(dx, dy);
  if (dist <= speed || dist === 0) {
    bubble.anchorCol = bubble.targetCol;
    bubble.anchorRow = bubble.lowestRow;
  } else {
    bubble.anchorCol += dx / dist * speed;
    bubble.anchorRow += dy / dist * speed;
  }
  setCharCoordinates(bubble);
  if (popCondition === "anywhere" && Math.random() < 0.002) {
    bubble.landed = true;
  }
}

class BubblesEffect {
  canvas;
  config;
  pendingBubbles = [];
  animatingBubbles = [];
  activeChars = new Set;
  stepsSinceLastBubble = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMap = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    const popColorHex = config.popColor.rgbHex;
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      ch.isVisible = false;
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMap.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const pop1 = ch.newScene("pop_1");
      pop1.addFrame("*", 9, popColorHex);
      const pop2 = ch.newScene("pop_2");
      pop2.addFrame("'", 9, popColorHex);
      const finalScene = ch.newScene("final_scene");
      const charGrad = new Gradient([config.popColor, finalColor], 8);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 6, charGrad);
      ch.eventHandler.register("SCENE_COMPLETE", "pop_1", "ACTIVATE_SCENE", "pop_2");
      ch.eventHandler.register("SCENE_COMPLETE", "pop_2", "ACTIVATE_SCENE", "final_scene");
      const finalPath = ch.motion.newPath("final", 0.3, inOutExpo);
      finalPath.addWaypoint(ch.inputCoord);
      ch.eventHandler.register("PATH_COMPLETE", "pop_out", "ACTIVATE_PATH", "final");
    }
    const allChars = [];
    for (const row of this.canvas.getCharactersGrouped("rowBottomToTop", { includeSpaces: false })) {
      allChars.push(...row);
    }
    while (allChars.length > 0) {
      const maxSize = Math.min(allChars.length, 20);
      const groupSize = allChars.length < 5 ? allChars.length : Math.floor(Math.random() * (maxSize - 5 + 1)) + 5;
      const group = allChars.splice(0, groupSize);
      const lowestRow = config.popCondition === "row" ? Math.min(...group.map((c) => c.inputCoord.row)) : dims.bottom;
      const radius = Math.max(Math.floor(group.length / 5), 1);
      const originCol = dims.left + Math.floor(Math.random() * (dims.right - dims.left + 1));
      const targetCol = dims.left + Math.floor(Math.random() * (dims.right - dims.left + 1));
      const bubbleColor = config.bubbleColors[Math.floor(Math.random() * config.bubbleColors.length)];
      for (const ch of group) {
        const sheenScene = ch.newScene("sheen");
        sheenScene.addFrame(ch.inputSymbol, 1, bubbleColor.rgbHex);
        ch.activateScene("sheen");
      }
      const bubble = {
        characters: group,
        radius,
        anchorCol: originCol,
        anchorRow: dims.top + 10,
        targetCol,
        lowestRow,
        landed: false
      };
      setCharCoordinates(bubble);
      this.pendingBubbles.push(bubble);
    }
  }
  popBubble(bubble) {
    const anchor = { column: Math.round(bubble.anchorCol), row: Math.round(bubble.anchorRow) };
    const outPoints = findCoordsOnCircle(anchor, bubble.radius + 3, bubble.characters.length);
    for (let i = 0;i < bubble.characters.length; i++) {
      const ch = bubble.characters[i];
      const point = outPoints[i] ?? anchor;
      const popOutPath = ch.motion.newPath("pop_out", 0.3, outExpo);
      popOutPath.addWaypoint(point);
    }
    for (const ch of bubble.characters) {
      ch.activateScene("pop_1");
      ch.motion.activatePath("pop_out");
      this.activeChars.add(ch);
    }
  }
  step() {
    if (this.pendingBubbles.length > 0 && this.stepsSinceLastBubble >= this.config.bubbleDelay) {
      const bubble = this.pendingBubbles.shift();
      if (!bubble)
        return true;
      for (const ch of bubble.characters) {
        ch.isVisible = true;
      }
      this.animatingBubbles.push(bubble);
      this.stepsSinceLastBubble = 0;
    }
    this.stepsSinceLastBubble++;
    for (const bubble of this.animatingBubbles) {
      if (bubble.landed) {
        this.popBubble(bubble);
      }
    }
    this.animatingBubbles = this.animatingBubbles.filter((b) => !b.landed);
    for (const bubble of this.animatingBubbles) {
      moveBubble(bubble, this.config.bubbleSpeed, this.config.popCondition);
      for (const ch of bubble.characters) {
        ch.tick();
      }
    }
    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingBubbles.length > 0 || this.animatingBubbles.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/spray.ts
var defaultSprayConfig = {
  sprayColors: [color("8A008A"), color("00D1FF"), color("ffffff")],
  spraySymbols: ["*", "·", ".", "+"],
  sourcePosition: "e",
  arcHeight: 4,
  flightSpeed: 0.3,
  flightEasing: outExpo,
  charsPerTick: 3,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "vertical"
};
function shuffle6(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

class SprayEffect {
  canvas;
  config;
  queue = [];
  activeChars = new Set;
  source;
  pathCounter = 0;
  releasedCount = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  resolveSource() {
    const { dims } = this.canvas;
    const midCol = Math.floor(dims.right / 2);
    const midRow = Math.floor(dims.top / 2);
    switch (this.config.sourcePosition) {
      case "n":
        return { column: midCol, row: dims.top };
      case "ne":
        return { column: dims.right - 1, row: dims.top };
      case "e":
        return { column: dims.right - 1, row: midRow };
      case "se":
        return { column: dims.right - 1, row: dims.bottom };
      case "s":
        return { column: midCol, row: dims.bottom };
      case "sw":
        return { column: dims.left, row: dims.bottom };
      case "w":
        return { column: dims.left, row: midRow };
      case "nw":
        return { column: dims.left, row: dims.top };
      case "center":
        return { column: dims.centerColumn, row: dims.centerRow };
    }
  }
  build() {
    const { dims } = this.canvas;
    this.source = this.resolveSource();
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
    const chars = [...this.canvas.getNonSpaceCharacters()];
    shuffle6(chars);
    for (const ch of chars) {
      const target = ch.inputCoord;
      const flightScene = ch.newScene("flight", true);
      for (const sym of this.config.spraySymbols) {
        for (const col of this.config.sprayColors) {
          flightScene.addFrame(sym, 1, col.rgbHex);
        }
      }
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const lastSprayColor = this.config.sprayColors[this.config.sprayColors.length - 1];
      const resolveScene = ch.newScene("resolve");
      const resolveGrad = new Gradient([lastSprayColor, finalColor], this.config.finalGradientFrames);
      resolveScene.applyGradientToSymbols(ch.inputSymbol, 1, resolveGrad);
      const S = this.source;
      const T = target;
      const midCol = Math.round((S.column + T.column) / 2);
      const midRow = Math.round((S.row + T.row) / 2) + this.config.arcHeight;
      const controlPoint = { column: midCol, row: midRow };
      const pathId = `arc_${this.pathCounter}`;
      const arcPath = ch.motion.newPath(pathId, this.config.flightSpeed, this.config.flightEasing);
      for (let s = 1;s <= 5; s++) {
        const t = s / 5;
        const pt = findCoordOnBezierCurve(S, [controlPoint], T, t);
        arcPath.addWaypoint(pt);
      }
      ch.eventHandler.register("PATH_COMPLETE", pathId, "ACTIVATE_SCENE", "resolve");
      this.pathCounter++;
    }
    this.queue = chars;
  }
  step() {
    const toRelease = Math.min(this.config.charsPerTick, this.queue.length);
    for (let i = 0;i < toRelease; i++) {
      const ch = this.queue.shift();
      if (!ch)
        break;
      ch.motion.setCoordinate(this.source);
      ch.isVisible = true;
      ch.activateScene("flight");
      ch.motion.activatePath(`arc_${this.releasedCount}`);
      this.releasedCount++;
      this.activeChars.add(ch);
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.queue.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/beams.ts
var defaultBeamsConfig = {
  beamRowSymbols: ["▂", "▁", "_"],
  beamColumnSymbols: ["▌", "▍", "▎", "▏"],
  beamDelay: 6,
  beamRowSpeed: [1.5, 6],
  beamColumnSpeed: [0.9, 1.5],
  beamGradientStops: [color("ffffff"), color("00D1FF"), color("8A008A")],
  beamGradientSteps: [2, 6],
  beamGradientFrames: 2,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical",
  finalWipeSpeed: 3
};
function shuffle7(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function randInt11(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randRange4(min, max) {
  return min + Math.random() * (max - min);
}

class BeamsEffect {
  canvas;
  config;
  phase = "beams";
  beamDelay = 0;
  pendingGroups = [];
  activeGroups = [];
  activeChars = new Set;
  wipeGroups = [];
  wipeIdx = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const beamGradient = new Gradient(config.beamGradientStops, config.beamGradientSteps);
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      const { column, row } = ch.inputCoord;
      const finalColor = colorMapping.get(coordKey(column, row)) ?? config.finalGradientStops[0];
      const dimColor = adjustBrightness(finalColor, 0.3);
      const fadeGradient = new Gradient([finalColor, dimColor], 10);
      const brightenGradient = new Gradient([dimColor, finalColor], 10);
      const rowScene = ch.newScene("beam_row");
      rowScene.applyGradientToSymbols(config.beamRowSymbols, config.beamGradientFrames, beamGradient);
      rowScene.applyGradientToSymbols(ch.inputSymbol, 2, fadeGradient);
      const colScene = ch.newScene("beam_column");
      colScene.applyGradientToSymbols(config.beamColumnSymbols, config.beamGradientFrames, beamGradient);
      colScene.applyGradientToSymbols(ch.inputSymbol, 2, fadeGradient);
      const brightenScene = ch.newScene("brighten");
      brightenScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, brightenGradient);
    }
    const allBeamGroups = [];
    for (const chars of this.canvas.getCharactersGrouped("row", { includeSpaces: false })) {
      const sorted = [...chars].sort((a, b) => a.inputCoord.column - b.inputCoord.column);
      if (Math.random() < 0.5)
        sorted.reverse();
      allBeamGroups.push({
        chars: sorted,
        sceneId: "beam_row",
        speed: randRange4(config.beamRowSpeed[0], config.beamRowSpeed[1]),
        counter: 0,
        nextIdx: 0
      });
    }
    for (const chars of this.canvas.getCharactersGrouped("column", { includeSpaces: false })) {
      const sorted = [...chars].sort((a, b) => a.inputCoord.row - b.inputCoord.row);
      if (Math.random() < 0.5)
        sorted.reverse();
      allBeamGroups.push({
        chars: sorted,
        sceneId: "beam_column",
        speed: randRange4(config.beamColumnSpeed[0], config.beamColumnSpeed[1]),
        counter: 0,
        nextIdx: 0
      });
    }
    shuffle7(allBeamGroups);
    this.pendingGroups = allBeamGroups;
    const diagMap = new Map;
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      const key = ch.inputCoord.column - ch.inputCoord.row;
      if (!diagMap.has(key))
        diagMap.set(key, []);
      diagMap.get(key)?.push(ch);
    }
    const sortedKeys = [...diagMap.keys()].sort((a, b) => a - b);
    this.wipeGroups = sortedKeys.map((k) => diagMap.get(k) ?? []);
  }
  step() {
    if (this.phase === "beams") {
      if (this.beamDelay === 0) {
        if (this.pendingGroups.length > 0) {
          const batchSize = randInt11(1, 5);
          for (let i = 0;i < batchSize && this.pendingGroups.length > 0; i++) {
            const group = this.pendingGroups.shift();
            if (group)
              this.activeGroups.push(group);
          }
          this.beamDelay = this.config.beamDelay;
        }
      } else {
        this.beamDelay--;
      }
      for (const group of this.activeGroups) {
        group.counter += group.speed;
        const steps = Math.floor(group.counter);
        if (steps > 1) {
          for (let s = 0;s < steps && group.nextIdx < group.chars.length; s++) {
            const ch = group.chars[group.nextIdx++];
            ch.isVisible = true;
            ch.activateScene(group.sceneId);
            this.activeChars.add(ch);
            group.counter -= 1;
          }
        }
      }
      this.activeGroups = this.activeGroups.filter((g) => g.nextIdx < g.chars.length);
      if (this.pendingGroups.length === 0 && this.activeGroups.length === 0 && this.activeChars.size === 0) {
        this.phase = "wipe";
      }
    }
    if (this.phase === "wipe") {
      const end = Math.min(this.wipeIdx + this.config.finalWipeSpeed, this.wipeGroups.length);
      for (let i = this.wipeIdx;i < end; i++) {
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
      if (!ch.isActive)
        this.activeChars.delete(ch);
    }
    return this.pendingGroups.length > 0 || this.activeGroups.length > 0 || this.activeChars.size > 0 || this.wipeIdx < this.wipeGroups.length;
  }
}

// src/tte/effects/slice.ts
var defaultSliceConfig = {
  sliceDirection: "vertical",
  movementSpeed: 0.25,
  movementEasing: inOutExpo,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "diagonal"
};

class SliceEffect {
  canvas;
  config;
  activeChars = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
    const { sliceDirection } = this.config;
    if (sliceDirection === "vertical") {
      const centerCol = dims.textCenterColumn;
      for (const ch of this.canvas.getCharacters().filter((ch2) => !ch2.isSpace)) {
        const speed = this.config.movementSpeed;
        const path = ch.motion.newPath("input_path", speed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);
        const startRow = ch.inputCoord.column <= centerCol ? dims.top + 1 : dims.bottom - 1;
        ch.motion.setCoordinate({ column: ch.inputCoord.column, row: startRow });
        this.addGradientScene(ch, colorMapping);
      }
    } else if (sliceDirection === "horizontal") {
      const speed = this.config.movementSpeed * 2;
      const centerRow = dims.textCenterRow;
      for (const ch of this.canvas.getCharacters().filter((ch2) => !ch2.isSpace)) {
        const path = ch.motion.newPath("input_path", speed, this.config.movementEasing);
        path.addWaypoint(ch.inputCoord);
        const startCol = ch.inputCoord.row <= centerRow ? dims.left - 1 : dims.right + 1;
        ch.motion.setCoordinate({ column: startCol, row: ch.inputCoord.row });
        this.addGradientScene(ch, colorMapping);
      }
    } else {
      const groups = this.canvas.getCharactersGrouped("diagonal", { includeSpaces: false });
      const splitIdx = Math.floor(groups.length / 2);
      const leftHalf = groups.slice(0, splitIdx);
      const rightHalf = groups.slice(splitIdx);
      for (const group of leftHalf) {
        for (const ch of group) {
          const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
          path.addWaypoint(ch.inputCoord);
          ch.motion.setCoordinate({ column: group[0].inputCoord.column, row: dims.bottom - 1 });
          this.addGradientScene(ch, colorMapping);
        }
      }
      for (const group of rightHalf) {
        for (const ch of group) {
          const path = ch.motion.newPath("input_path", this.config.movementSpeed, this.config.movementEasing);
          path.addWaypoint(ch.inputCoord);
          ch.motion.setCoordinate({ column: group[group.length - 1].inputCoord.column, row: dims.top + 1 });
          this.addGradientScene(ch, colorMapping);
        }
      }
    }
    for (const ch of this.canvas.getCharacters().filter((ch2) => !ch2.isSpace)) {
      ch.isVisible = true;
      ch.motion.activatePath("input_path");
      ch.activateScene("gradient_scene");
      this.activeChars.add(ch);
    }
  }
  addGradientScene(ch, colorMapping) {
    const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
    const charFinalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
    const scene = ch.newScene("gradient_scene");
    const charGradient = new Gradient([this.config.finalGradientStops[0], charFinalColor], this.config.finalGradientSteps);
    scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
  }
  step() {
    if (this.activeChars.size === 0)
      return false;
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0;
  }
}

// src/tte/effects/synthgrid.ts
var defaultSynthGridConfig = {
  gridRowSymbol: "─",
  gridColumnSymbol: "│",
  gridGradientStops: [color("CC00CC"), color("ffffff")],
  gridGradientSteps: 12,
  gridGradientDirection: "diagonal",
  textGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  textGradientSteps: 12,
  textGradientDirection: "vertical",
  textGenerationSymbols: ["░", "▒", "▓"],
  maxActiveBlocks: 0.1
};
function randInt12(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle8(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function findEvenGap(dimension) {
  const d = dimension - 2;
  if (d <= 0)
    return 0;
  const potential = [];
  for (let i = d;i > 4; i--) {
    if (d % i <= 1)
      potential.push(i);
  }
  if (potential.length === 0)
    return 4;
  const target = Math.floor(d / 5);
  return potential.reduce((best, g) => Math.abs(g - target) < Math.abs(best - target) ? g : best);
}
var LINE_HEIGHT = 1.2;

class GridLine {
  spans = [];
  visibleCount = 0;
  constructor(container, positions, symbol, colorMapping, cellWidth, cellHeight, totalRows) {
    for (const { col, row } of positions) {
      const span = document.createElement("span");
      span.style.position = "absolute";
      span.style.visibility = "hidden";
      span.style.lineHeight = `${LINE_HEIGHT}em`;
      span.textContent = symbol;
      const c = colorMapping.get(coordKey(col, row));
      if (c)
        span.style.color = `#${c.rgbHex}`;
      span.style.left = `${(col - 1) * cellWidth}px`;
      span.style.top = `${(totalRows - row) * cellHeight}px`;
      container.appendChild(span);
      this.spans.push(span);
    }
  }
  extend(n) {
    const target = Math.min(this.visibleCount + n, this.spans.length);
    for (let i = this.visibleCount;i < target; i++) {
      this.spans[i].style.visibility = "visible";
    }
    this.visibleCount = target;
  }
  collapse(n) {
    const target = Math.max(this.visibleCount - n, 0);
    for (let i = target;i < this.visibleCount; i++) {
      this.spans[i].style.visibility = "hidden";
    }
    this.visibleCount = target;
  }
  get fullyExtended() {
    return this.visibleCount === this.spans.length;
  }
  get fullyCollapsed() {
    return this.visibleCount === 0;
  }
  dispose() {
    for (const span of this.spans) {
      span.remove();
    }
    this.spans = [];
  }
}

class SynthGridEffect {
  canvas;
  config;
  container;
  phase = "grid_expand";
  hLines = [];
  vLines = [];
  pendingBlocks = [];
  activeChars = new Set;
  activeBlockCount = 0;
  totalBlocks = 0;
  textColorMapping = new Map;
  textGradientSpectrum = [];
  cellWidth = 0;
  cellHeight = 0;
  constructor(canvas, config, container) {
    this.canvas = canvas;
    this.config = config;
    this.container = container;
    this._measureCell();
    this.build();
  }
  _measureCell() {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.lineHeight = `${LINE_HEIGHT}em`;
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidth = rect.width;
    this.cellHeight = rect.height;
    this.container.removeChild(probe);
  }
  _computeGaps(dims) {
    let rowGap;
    let colGap;
    if (dims.top > 2 * dims.right) {
      rowGap = findEvenGap(dims.top) + 1;
      colGap = rowGap * 2;
    } else {
      colGap = findEvenGap(dims.right) + 1;
      rowGap = Math.floor(colGap / 2);
    }
    return { rowGap: Math.max(1, rowGap), colGap: Math.max(1, colGap) };
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const gridGradient = new Gradient(config.gridGradientStops, config.gridGradientSteps);
    const gridColorMapping = gridGradient.buildCoordinateColorMapping(dims.bottom, dims.top, dims.left, dims.right, config.gridGradientDirection);
    const textGradient = new Gradient(config.textGradientStops, config.textGradientSteps);
    this.textColorMapping = textGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.textGradientDirection);
    this.textGradientSpectrum = textGradient.spectrum;
    const { rowGap, colGap } = this._computeGaps(dims);
    const internalRowLines = [];
    for (let r = dims.bottom + rowGap;r < dims.top; r += rowGap) {
      if (dims.top - r < 2)
        continue;
      internalRowLines.push(r);
    }
    const internalColLines = [];
    for (let c = dims.left + colGap;c < dims.right; c += colGap) {
      if (dims.right - c < 2)
        continue;
      internalColLines.push(c);
    }
    for (const row of [dims.bottom, dims.top, ...internalRowLines]) {
      const positions = [];
      for (let col = dims.left;col <= dims.right; col++) {
        positions.push({ col, row });
      }
      this.hLines.push(new GridLine(this.container, positions, config.gridRowSymbol, gridColorMapping, this.cellWidth, this.cellHeight, dims.top));
    }
    for (const col of [dims.left, dims.right, ...internalColLines]) {
      const positions = [];
      for (let row = dims.bottom;row < dims.top; row++) {
        positions.push({ col, row });
      }
      this.vLines.push(new GridLine(this.container, positions, config.gridColumnSymbol, gridColorMapping, this.cellWidth, this.cellHeight, dims.top));
    }
    const rowBounds = [dims.bottom, ...internalRowLines, dims.top + 1];
    const colBounds = [dims.left, ...internalColLines, dims.right + 1];
    const nonSpaceChars = this.canvas.getNonSpaceCharacters();
    const blocks = [];
    for (let ri = 0;ri < rowBounds.length - 1; ri++) {
      const r1 = rowBounds[ri];
      const r2 = rowBounds[ri + 1];
      for (let ci = 0;ci < colBounds.length - 1; ci++) {
        const c1 = colBounds[ci];
        const c2 = colBounds[ci + 1];
        const block = nonSpaceChars.filter((ch) => ch.inputCoord.row >= r1 && ch.inputCoord.row < r2 && ch.inputCoord.column >= c1 && ch.inputCoord.column < c2);
        if (block.length > 0)
          blocks.push(block);
      }
    }
    shuffle8(blocks);
    this.pendingBlocks = blocks;
    this.totalBlocks = blocks.length;
    for (const ch of nonSpaceChars) {
      const dissolveScene = ch.newScene("dissolve");
      const frameCount = randInt12(15, 30);
      for (let i = 0;i < frameCount; i++) {
        const sym = config.textGenerationSymbols[Math.floor(Math.random() * config.textGenerationSymbols.length)];
        const paletteColor = this.textGradientSpectrum[Math.floor(Math.random() * this.textGradientSpectrum.length)];
        dissolveScene.addFrame(sym, 2, paletteColor.rgbHex);
      }
      const finalColor = this.textColorMapping.get(coordKey(ch.inputCoord.column, ch.inputCoord.row));
      dissolveScene.addFrame(ch.inputSymbol, 1, finalColor?.rgbHex ?? null);
    }
  }
  activateBlock(block) {
    this.activeBlockCount++;
    let remaining = block.length;
    for (const ch of block) {
      ch.isVisible = true;
      ch.eventHandler.register("SCENE_COMPLETE", "dissolve", "CALLBACK", {
        callback: (_char) => {
          remaining--;
          if (remaining === 0)
            this.activeBlockCount--;
        },
        args: []
      });
      ch.activateScene("dissolve");
      this.activeChars.add(ch);
    }
  }
  step() {
    switch (this.phase) {
      case "grid_expand": {
        for (const line of this.hLines)
          line.extend(3);
        for (const line of this.vLines)
          line.extend(1);
        if (this.hLines.every((l) => l.fullyExtended) && this.vLines.every((l) => l.fullyExtended)) {
          this.phase = "add_chars";
        }
        break;
      }
      case "add_chars": {
        for (const ch of [...this.activeChars]) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        const threshold = this.totalBlocks * this.config.maxActiveBlocks;
        if (this.activeBlockCount < threshold && this.pendingBlocks.length > 0) {
          const block = this.pendingBlocks.shift();
          if (block)
            this.activateBlock(block);
        }
        if (this.pendingBlocks.length === 0 && this.activeChars.size === 0 && this.activeBlockCount === 0) {
          this._revealGridLineChars();
          this.phase = "collapse";
        }
        break;
      }
      case "collapse": {
        for (const line of this.hLines)
          line.collapse(3);
        for (const line of this.vLines)
          line.collapse(1);
        if (this.hLines.every((l) => l.fullyCollapsed) && this.vLines.every((l) => l.fullyCollapsed)) {
          for (const line of [...this.hLines, ...this.vLines])
            line.dispose();
          this.hLines = [];
          this.vLines = [];
          this.phase = "complete";
        }
        break;
      }
      case "complete":
        return false;
    }
    return true;
  }
  _revealGridLineChars() {
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      if (!ch.isVisible) {
        ch.isVisible = true;
        const finalColor = this.textColorMapping.get(coordKey(ch.inputCoord.column, ch.inputCoord.row));
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: finalColor?.rgbHex ?? null };
      }
    }
  }
}

// src/tte/effects/binarypath.ts
function randInt13(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
var defaultBinaryPathConfig = {
  binaryColors: [color("044E29"), color("157e38"), color("45bf55"), color("95ed87")],
  movementSpeed: 1,
  activeBinaryGroups: 0.08,
  finalGradientStops: [color("00d500"), color("007500")],
  finalGradientSteps: 12,
  finalGradientFrames: 2,
  finalGradientDirection: "radial",
  finalWipeSpeed: 2
};
var nextDigitId = 3000000;

class BinaryPathEffect {
  canvas;
  config;
  container;
  cellWidthPx = 0;
  cellHeightPx = 0;
  totalRows;
  pendingGroups = [];
  activeGroups = new Set;
  collapsingChars = new Set;
  collapsedCount = 0;
  totalNonSpaceChars = 0;
  activeChars = new Set;
  wipeGroups = [];
  wipeIdx = 0;
  phase = "traveling";
  colorMapping = new Map;
  constructor(canvas, config, container) {
    this.canvas = canvas;
    this.config = config;
    this.container = container;
    this.totalRows = canvas.dims.top;
    this._measureCell();
    this.build();
  }
  _measureCell() {
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
  _positionSpan(span, coord) {
    span.style.left = `${(coord.column - 1) * this.cellWidthPx}px`;
    span.style.top = `${(this.totalRows - coord.row) * this.cellHeightPx}px`;
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    this.totalNonSpaceChars = nonSpaceChars.length;
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }
    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const dimColor = adjustBrightness(finalColor, 0.5);
      const collapseGrad = new Gradient([color("ffffff"), dimColor], 7);
      const collapseScene = ch.newScene("collapse");
      collapseScene.applyGradientToSymbols(ch.inputSymbol, 3, collapseGrad);
      ch.eventHandler.register("SCENE_COMPLETE", "collapse", "CALLBACK", {
        callback: (char) => {
          this.collapsingChars.delete(char);
          this.collapsedCount++;
        },
        args: []
      });
      const brightenGrad = new Gradient([dimColor, finalColor], 10);
      const brightenScene = ch.newScene("brighten");
      brightenScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, brightenGrad);
      const startCoord = this._randomExteriorCoord();
      const pathCoords = this._buildZigzagPath(startCoord, ch.inputCoord, dims.right);
      const binaryStr = ((ch.inputSymbol.codePointAt(0) ?? 0) & 255).toString(2).padStart(8, "0");
      const pendingDigits = [];
      for (let i = 0;i < 8; i++) {
        const digit = binaryStr[i];
        const digitColor = config.binaryColors[Math.floor(Math.random() * config.binaryColors.length)].rgbHex;
        const id = nextDigitId++;
        const digitCh = new EffectCharacter(id, digit, pathCoords[0].column, pathCoords[0].row);
        const pathId = `bp_${id}`;
        const path = digitCh.motion.newPath(pathId, { speed: config.movementSpeed });
        for (const c of pathCoords) {
          path.addWaypoint(c);
        }
        digitCh.motion.activatePath(pathId);
        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.display = "none";
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
        isComplete: false
      });
    }
    for (let i = this.pendingGroups.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pendingGroups[i], this.pendingGroups[j]] = [this.pendingGroups[j], this.pendingGroups[i]];
    }
    const diagMap = new Map;
    for (const ch of nonSpaceChars) {
      const key = ch.inputCoord.row + ch.inputCoord.column;
      if (!diagMap.has(key))
        diagMap.set(key, []);
      diagMap.get(key)?.push(ch);
    }
    const sortedKeys = [...diagMap.keys()].sort((a, b) => b - a);
    this.wipeGroups = sortedKeys.map((k) => diagMap.get(k) ?? []);
  }
  _buildZigzagPath(startCoord, targetCoord, canvasRight) {
    const path = [startCoord];
    let lastOrientation = Math.random() < 0.5 ? "col" : "row";
    while (path[path.length - 1].column !== targetCoord.column || path[path.length - 1].row !== targetCoord.row) {
      const last = path[path.length - 1];
      const colDir = Math.sign(targetCoord.column - last.column);
      const rowDir = Math.sign(targetCoord.row - last.row);
      const maxColDist = Math.abs(targetCoord.column - last.column);
      const maxRowDist = Math.abs(targetCoord.row - last.row);
      let next;
      if (lastOrientation === "col" && maxRowDist > 0) {
        const maxStep = Math.min(maxRowDist, Math.max(10, Math.floor(canvasRight * 0.2)));
        const step = randInt13(1, maxStep);
        next = { column: last.column, row: last.row + step * rowDir };
        lastOrientation = "row";
      } else if (lastOrientation === "row" && maxColDist > 0) {
        const step = randInt13(1, Math.min(maxColDist, 4));
        next = { column: last.column + step * colDir, row: last.row };
        lastOrientation = "col";
      } else {
        next = { column: targetCoord.column, row: targetCoord.row };
      }
      path.push(next);
    }
    path.push({ column: targetCoord.column, row: targetCoord.row });
    path.push({ column: targetCoord.column, row: targetCoord.row });
    return path;
  }
  _randomExteriorCoord() {
    const { dims } = this.canvas;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0:
        return { column: Math.floor(Math.random() * (dims.right + 2)), row: dims.top + 1 };
      case 1:
        return { column: dims.right + 1, row: Math.floor(Math.random() * (dims.top + 2)) };
      case 2:
        return { column: Math.floor(Math.random() * (dims.right + 2)), row: 0 };
      default:
        return { column: 0, row: Math.floor(Math.random() * (dims.top + 2)) };
    }
  }
  step() {
    if (this.phase === "traveling") {
      const maxActive = Math.max(1, Math.floor(this.totalNonSpaceChars * this.config.activeBinaryGroups));
      while (this.pendingGroups.length > 0 && this.activeGroups.size < maxActive) {
        const group = this.pendingGroups.shift();
        if (group)
          this.activeGroups.add(group);
      }
      for (const group of this.activeGroups) {
        if (group.pendingDigits.length > 0) {
          const digit = group.pendingDigits.shift();
          if (!digit)
            continue;
          digit.span.style.display = "";
          group.activeDigits.push(digit);
        }
      }
      for (const group of this.activeGroups) {
        for (const digit of [...group.activeDigits]) {
          digit.ch.tick();
          const coord = digit.ch.motion.currentCoord;
          this._positionSpan(digit.span, coord);
          if (!digit.ch.isActive) {
            digit.span.remove();
            const idx = group.activeDigits.indexOf(digit);
            if (idx !== -1)
              group.activeDigits.splice(idx, 1);
          }
        }
        if (group.pendingDigits.length === 0 && group.activeDigits.length === 0 && !group.isComplete) {
          group.isComplete = true;
          const ch = group.sourceChar;
          ch.isVisible = true;
          ch.activateScene("collapse");
          this.collapsingChars.add(ch);
        }
        if (group.isComplete)
          this.activeGroups.delete(group);
      }
      for (const ch of this.collapsingChars) {
        ch.tick();
      }
      if (this.pendingGroups.length === 0 && this.activeGroups.size === 0 && this.collapsingChars.size === 0 && this.collapsedCount === this.totalNonSpaceChars) {
        this.phase = "wipe";
      }
    }
    if (this.phase === "wipe") {
      const end = Math.min(this.wipeIdx + this.config.finalWipeSpeed, this.wipeGroups.length);
      for (let i = this.wipeIdx;i < end; i++) {
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
      if (!ch.isActive)
        this.activeChars.delete(ch);
    }
    return !(this.phase === "wipe" && this.wipeIdx >= this.wipeGroups.length && this.activeChars.size === 0);
  }
}

// src/tte/particles.ts
var nextParticleId = 2000000;

class ParticleSystem {
  container;
  particles = new Set;
  cellWidthPx = 0;
  cellHeightPx = 0;
  totalRows;
  lineHeight;
  constructor(container, canvasDims, lineHeight = 1.2) {
    this.container = container;
    this.totalRows = canvasDims.top;
    this.lineHeight = lineHeight;
    this._measureCell();
  }
  _measureCell() {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.lineHeight = `${this.lineHeight}em`;
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidthPx = rect.width;
    this.cellHeightPx = rect.height;
    this.container.removeChild(probe);
  }
  emit(config) {
    const id = nextParticleId++;
    const ch = new EffectCharacter(id, config.symbol, config.coord.column, config.coord.row);
    ch.isVisible = true;
    ch.currentVisual = {
      symbol: config.symbol,
      fgColor: config.fgColor ?? null
    };
    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.lineHeight = `${this.lineHeight}em`;
    span.textContent = config.symbol;
    span.style.color = config.fgColor ? `#${config.fgColor}` : "";
    this._positionSpan(span, config.coord);
    this.container.appendChild(span);
    const particle = {
      character: ch,
      span,
      ticksRemaining: config.ttl
    };
    this.particles.add(particle);
    return ch;
  }
  tick() {
    for (const p of this.particles) {
      p.character.tick();
      p.ticksRemaining--;
      if (p.ticksRemaining <= 0 || !p.character.isActive) {
        p.span.remove();
        this.particles.delete(p);
        continue;
      }
      const vis = p.character.currentVisual;
      p.span.textContent = vis.symbol;
      p.span.style.color = vis.fgColor ? `#${vis.fgColor}` : "";
      const coord = p.character.motion.currentCoord;
      this._positionSpan(p.span, coord);
    }
  }
  _positionSpan(span, coord) {
    span.style.left = `${(coord.column - 1) * this.cellWidthPx}px`;
    span.style.top = `${(this.totalRows - coord.row) * this.cellHeightPx}px`;
  }
  dispose() {
    for (const p of this.particles) {
      p.span.remove();
    }
    this.particles.clear();
  }
  get count() {
    return this.particles.size;
  }
}

// src/tte/effects/thunderstorm.ts
var defaultThunderstormConfig = {
  lightningColor: color("68A3E8"),
  glowingTextColor: color("EF5411"),
  textGlowTime: 6,
  raindropSymbols: ["\\", ".", ","],
  sparkSymbols: ["*", ".", "'"],
  sparkGlowColor: color("ff4d00"),
  sparkGlowTime: 18,
  stormDuration: 360,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "vertical"
};
var nextOverlayId = 4000000;

class ThunderstormEffect {
  canvas;
  config;
  container;
  cellWidthPx = 0;
  cellHeightPx = 0;
  totalRows;
  allNonSpaceChars = [];
  activeTextChars = new Set;
  coordToChar = new Map;
  rainDrops = [];
  particles;
  availableStrikeChars = [];
  pendingStrikeChars = [];
  activeStrikeChars = [];
  strikeInProgress = false;
  strikeProgressionDelay = 0;
  pendingGlowChars = [];
  pendingSparkSetups = [];
  phase = "pre-storm";
  stormTick = 0;
  constructor(canvas, config, container) {
    this.canvas = canvas;
    this.config = config;
    this.container = container;
    this.totalRows = canvas.dims.top;
    this.particles = new ParticleSystem(container, canvas.dims);
    this._measureCell();
    this.build();
  }
  _measureCell() {
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
  _positionSpan(span, col, row) {
    span.style.left = `${(col - 1) * this.cellWidthPx}px`;
    span.style.top = `${(this.totalRows - row) * this.cellHeightPx}px`;
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const stops = config.finalGradientStops;
      const finalColor = colorMapping.get(key) ?? stops[stops.length - 1];
      const fadedColor = adjustBrightness(finalColor, 0.5);
      const lightningFlashColor = adjustBrightness(finalColor, 1.7);
      const fadeGrad = new Gradient([finalColor, fadedColor], 7);
      const fadeScene = ch.newScene("fade");
      for (const c of fadeGrad.spectrum) {
        fadeScene.addFrame(ch.inputSymbol, 12, c.rgbHex);
      }
      const unfadeGrad = new Gradient([fadedColor, finalColor], 7);
      const unfadeScene = ch.newScene("unfade");
      for (const c of unfadeGrad.spectrum) {
        unfadeScene.addFrame(ch.inputSymbol, 12, c.rgbHex);
      }
      const flashGrad = new Gradient([fadedColor, lightningFlashColor], 7, true);
      const flashScene = ch.newScene("flash");
      for (const c of flashGrad.spectrum) {
        flashScene.addFrame(ch.inputSymbol, 6, c.rgbHex);
      }
      const glowGrad = new Gradient([config.glowingTextColor, fadedColor], 7);
      const glowScene = ch.newScene("glow");
      for (const c of glowGrad.spectrum) {
        glowScene.addFrame(ch.inputSymbol, config.textGlowTime, c.rgbHex);
      }
      ch.isVisible = true;
      this.coordToChar.set(key, ch);
      this.allNonSpaceChars.push(ch);
    }
    if (this.allNonSpaceChars.length > 0) {
      const refChar = this.allNonSpaceChars[0];
      refChar.eventHandler.register("SCENE_COMPLETE", "fade", "CALLBACK", {
        callback: () => {
          this.phase = "storm";
        },
        args: []
      });
    }
    this._buildRainDrops(50);
    this._buildStrikePool(200);
  }
  _buildRainDrops(count) {
    const { dims } = this.canvas;
    for (let i = 0;i < count; i++) {
      const spawnCol = randInt14(1 - dims.top, dims.right);
      const sym = randChoice3(this.config.raindropSymbols);
      const span = document.createElement("span");
      span.style.position = "absolute";
      span.style.lineHeight = "1.2em";
      span.textContent = sym;
      span.style.color = "#aaaaff";
      span.style.display = "none";
      this.container.appendChild(span);
      this.rainDrops.push({ col: spawnCol, row: dims.top + 1, speed: randFloat(0.5, 1.5), sym, span });
    }
  }
  _buildStrikePool(count) {
    for (let i = 0;i < count; i++) {
      const id = nextOverlayId++;
      const ch = new EffectCharacter(id, "|", 1, 1);
      const span = document.createElement("span");
      span.style.position = "absolute";
      span.style.lineHeight = "1.2em";
      span.style.display = "none";
      this.container.appendChild(span);
      this.availableStrikeChars.push({ ch, span, col: 1, row: 1, sym: "|" });
    }
  }
  _getStrikeChar() {
    if (this.availableStrikeChars.length === 0) {
      this._buildStrikePool(20);
    }
    const oc = this.availableStrikeChars.pop();
    oc.ch.scenes.clear();
    oc.ch.activeScene = null;
    oc.ch.eventHandler = new EventHandler;
    return oc;
  }
  _setupLightningStrike(branchNeighbor = null, branchChance = 0.05) {
    const { dims } = this.canvas;
    const { config } = this;
    let col = branchNeighbor ? branchNeighbor.col : randInt14(1, dims.right);
    let row = branchNeighbor ? branchNeighbor.row : dims.top;
    const strikeFlashColor = adjustBrightness(config.lightningColor, 1.7);
    const flashGrad = new Gradient([config.lightningColor, strikeFlashColor], 7, true);
    const fadeGrad = new Gradient([config.lightningColor, color("000000")], 6);
    let currentBranchChance = branchChance;
    let neighbor = branchNeighbor;
    while (row >= dims.bottom) {
      let sym;
      if (neighbor !== null) {
        if (neighbor.sym === "/") {
          col += 1;
          sym = Math.random() < 0.5 ? "|" : "\\";
        } else if (neighbor.sym === "\\") {
          col -= 1;
          sym = Math.random() < 0.5 ? "|" : "/";
        } else {
          const delta = Math.random() < 0.5 ? -1 : 1;
          col += delta;
          sym = delta === 1 ? "\\" : "/";
        }
        neighbor = null;
      } else {
        sym = randChoice3(["\\", "/", "|"]);
      }
      const oc = this._getStrikeChar();
      oc.col = col;
      oc.row = row;
      oc.sym = sym;
      const flashScn = oc.ch.newScene("flash");
      for (const c of flashGrad.spectrum) {
        flashScn.addFrame(sym, 6, c.rgbHex);
      }
      const fadeScn = oc.ch.newScene("fade");
      for (const c of fadeGrad.spectrum) {
        fadeScn.addFrame(sym, 2, c.rgbHex);
      }
      oc.ch.eventHandler.register("SCENE_COMPLETE", "flash", "ACTIVATE_SCENE", "fade");
      oc.ch.eventHandler.register("SCENE_COMPLETE", "fade", "CALLBACK", {
        callback: () => {
          oc.span.style.display = "none";
          const key = coordKey(Math.round(oc.col), Math.round(oc.row));
          const textCh = this.coordToChar.get(key);
          if (textCh?.isVisible) {
            textCh.activateScene("glow");
            this.pendingGlowChars.push(textCh);
          }
          oc.ch.scenes.clear();
          oc.ch.activeScene = null;
          oc.ch.eventHandler = new EventHandler;
          this.availableStrikeChars.push(oc);
          const idx = this.activeStrikeChars.indexOf(oc);
          if (idx !== -1)
            this.activeStrikeChars.splice(idx, 1);
          if (this.activeStrikeChars.length === 0 && this.pendingStrikeChars.length === 0) {
            this.strikeInProgress = false;
          }
        },
        args: []
      });
      row -= 1;
      if (sym === "\\")
        col += 1;
      else if (sym === "/")
        col -= 1;
      this.pendingStrikeChars.push(oc);
      if (branchNeighbor === null && Math.random() < currentBranchChance) {
        currentBranchChance -= 0.01;
        this._setupLightningStrike(oc, 0);
      }
    }
    if (this.pendingStrikeChars.length > 0) {
      const lastOc = this.pendingStrikeChars[this.pendingStrikeChars.length - 1];
      const sparkCount = randInt14(6, 10);
      for (let i = 0;i < sparkCount; i++) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.pendingSparkSetups.push({
          spawnCol: Math.round(lastOc.col),
          spawnRow: Math.round(lastOc.row),
          targetCol: lastOc.col + randInt14(4, 20) * dir
        });
      }
    }
  }
  _emitSparks() {
    const { dims } = this.canvas;
    const { config } = this;
    const sparkGrad = new Gradient([config.sparkGlowColor, color("000000")], 7);
    const ttl = config.sparkGlowTime * sparkGrad.spectrum.length + 40;
    for (const setup of this.pendingSparkSetups) {
      const targetCol = Math.max(1, Math.min(dims.right, Math.round(setup.targetCol)));
      const sparkCh = this.particles.emit({
        symbol: randChoice3(config.sparkSymbols),
        coord: { column: setup.spawnCol, row: setup.spawnRow },
        fgColor: config.sparkGlowColor.rgbHex,
        ttl
      });
      const sparkScn = sparkCh.newScene("glow");
      for (const c of sparkGrad.spectrum) {
        sparkScn.addFrame(sparkCh.inputSymbol, config.sparkGlowTime, c.rgbHex);
      }
      const pathId = `spark_${sparkCh.id}`;
      const sparkPath = sparkCh.motion.newPath(pathId, randFloat(0.1, 0.25));
      sparkPath.addWaypoint({ column: targetCol, row: dims.bottom });
      sparkCh.motion.activatePath(pathId);
      sparkCh.activateScene("glow");
    }
    this.pendingSparkSetups = [];
  }
  _stepLightningStrike() {
    if (this.strikeProgressionDelay > 0) {
      this.strikeProgressionDelay--;
      return;
    }
    if (this.pendingStrikeChars.length === 0)
      return;
    const count = randInt14(1, 3);
    for (let i = 0;i < count; i++) {
      if (this.pendingStrikeChars.length === 0)
        break;
      const oc = this.pendingStrikeChars.shift();
      if (!oc)
        break;
      this._positionSpan(oc.span, oc.col, oc.row);
      oc.span.textContent = oc.sym;
      oc.span.style.color = `#${this.config.lightningColor.rgbHex}`;
      oc.span.style.display = "";
      oc.ch.currentVisual = { symbol: oc.sym, fgColor: this.config.lightningColor.rgbHex };
      this.activeStrikeChars.push(oc);
      this.strikeProgressionDelay = 1;
      if (this.pendingStrikeChars.length === 0) {
        this._emitSparks();
        for (const s of this.activeStrikeChars) {
          s.ch.activateScene("flash");
        }
        for (const textCh of this.allNonSpaceChars) {
          textCh.activateScene("flash");
          this.activeTextChars.add(textCh);
        }
      }
    }
  }
  _rainTick() {
    const { dims } = this.canvas;
    for (const drop of this.rainDrops) {
      drop.col += drop.speed;
      drop.row -= drop.speed;
      if (drop.row < dims.bottom - 1) {
        drop.col = randInt14(1 - dims.top, dims.right);
        drop.row = dims.top + 1;
        drop.speed = randFloat(0.5, 1.5);
        drop.sym = randChoice3(this.config.raindropSymbols);
        drop.span.textContent = drop.sym;
      }
      const displayCol = Math.round(drop.col);
      const displayRow = Math.round(drop.row);
      if (displayCol >= 1 && displayCol <= dims.right && displayRow >= dims.bottom && displayRow <= dims.top) {
        this._positionSpan(drop.span, displayCol, displayRow);
        drop.span.style.display = "";
      } else {
        drop.span.style.display = "none";
      }
    }
  }
  step() {
    switch (this.phase) {
      case "pre-storm":
        for (const ch of this.allNonSpaceChars) {
          ch.activateScene("fade");
          this.activeTextChars.add(ch);
        }
        this.phase = "waiting";
        break;
      case "waiting":
        for (const ch of [...this.activeTextChars]) {
          ch.tick();
          if (!ch.isActive)
            this.activeTextChars.delete(ch);
        }
        break;
      case "storm":
        this.stormTick++;
        this._rainTick();
        if (!this.strikeInProgress && Math.random() < 0.008) {
          this.strikeInProgress = true;
          this._setupLightningStrike();
        }
        if (this.strikeInProgress) {
          this._stepLightningStrike();
        }
        for (const ch of this.pendingGlowChars) {
          this.activeTextChars.add(ch);
        }
        this.pendingGlowChars = [];
        for (const ch of [...this.activeTextChars]) {
          ch.tick();
          if (!ch.isActive)
            this.activeTextChars.delete(ch);
        }
        for (const oc of [...this.activeStrikeChars]) {
          oc.ch.tick();
          const vis = oc.ch.currentVisual;
          oc.span.textContent = vis.symbol;
          if (vis.fgColor)
            oc.span.style.color = `#${vis.fgColor}`;
        }
        this.particles.tick();
        if (this.stormTick >= this.config.stormDuration && !this.strikeInProgress) {
          for (const drop of this.rainDrops)
            drop.span.style.display = "none";
          for (const ch of this.allNonSpaceChars) {
            ch.activateScene("unfade");
            this.activeTextChars.add(ch);
          }
          this.phase = "complete";
        }
        break;
      case "complete":
        for (const ch of [...this.activeTextChars]) {
          ch.tick();
          if (!ch.isActive)
            this.activeTextChars.delete(ch);
        }
        break;
    }
    return this.phase !== "complete" || this.activeTextChars.size > 0;
  }
}
function randInt14(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function randChoice3(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// src/tte/effects/crumble.ts
var defaultCrumbleConfig = {
  finalGradientStops: [color("5CE1FF"), color("FF8C00")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal"
};
function shuffle9(arr) {
  for (let i = arr.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function randInt15(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
var DUST_SYMBOLS = ["*", ".", ","];

class CrumbleEffect {
  canvas;
  config;
  nonSpaceChars = [];
  phase = "falling";
  pendingChars = [];
  activeChars = new Set;
  unvacuumedChars = [];
  fallDelay = 12;
  maxFallDelay = 12;
  minFallDelay = 9;
  fallGroupMaxsize = 1;
  vacuumingStarted = false;
  resettingStarted = false;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) ?? this.config.finalGradientStops[0];
      const weakColor = adjustBrightness(finalColor, 0.65);
      const dustColor = adjustBrightness(finalColor, 0.55);
      ch.isVisible = true;
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: weakColor.rgbHex };
      const weakenGradient = new Gradient([weakColor, dustColor], 9);
      const weakenScn = ch.newScene("weaken");
      weakenScn.applyGradientToSymbols(ch.inputSymbol, 4, weakenGradient);
      const dustScn = ch.newScene("dust", true);
      for (let i = 0;i < 5; i++) {
        dustScn.addFrame(DUST_SYMBOLS[i % DUST_SYMBOLS.length], 1, dustColor.rgbHex);
      }
      const fallPath = ch.motion.newPath("fall", 0.65, outBounce);
      fallPath.addWaypoint({ column: ch.inputCoord.column, row: dims.bottom });
      const viaCol = Math.round(ch.inputCoord.column + (dims.centerColumn - ch.inputCoord.column) * 0.5);
      const topPath = ch.motion.newPath("top", 1, outQuint);
      topPath.addWaypoint({ column: viaCol, row: dims.centerRow });
      topPath.addWaypoint({ column: ch.inputCoord.column, row: dims.top });
      const inputPath = ch.motion.newPath("input", 1);
      inputPath.addWaypoint(ch.inputCoord);
      const flashGradient = new Gradient([finalColor, color("ffffff")], 6);
      const flashScn = ch.newScene("flash");
      flashScn.applyGradientToSymbols(ch.inputSymbol, 4, flashGradient);
      const strengthenGradient = new Gradient([color("ffffff"), finalColor], 9);
      const strengthenScn = ch.newScene("strengthen");
      strengthenScn.applyGradientToSymbols(ch.inputSymbol, 4, strengthenGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "weaken", "ACTIVATE_PATH", "fall");
      ch.eventHandler.register("SCENE_COMPLETE", "weaken", "SET_LAYER", 1);
      ch.eventHandler.register("SCENE_COMPLETE", "weaken", "ACTIVATE_SCENE", "dust");
      ch.eventHandler.register("PATH_COMPLETE", "input", "ACTIVATE_SCENE", "flash");
      ch.eventHandler.register("SCENE_COMPLETE", "flash", "ACTIVATE_SCENE", "strengthen");
      this.pendingChars.push(ch);
      this.nonSpaceChars.push(ch);
    }
    shuffle9(this.pendingChars);
  }
  step() {
    if (this.phase === "falling") {
      return this.stepFalling();
    } else if (this.phase === "vacuuming") {
      return this.stepVacuuming();
    } else {
      return this.stepResetting();
    }
  }
  stepFalling() {
    if (this.pendingChars.length > 0) {
      if (this.fallDelay === 0) {
        const groupSize = randInt15(1, this.fallGroupMaxsize);
        for (let i = 0;i < groupSize && this.pendingChars.length > 0; i++) {
          const ch = this.pendingChars.shift();
          if (!ch)
            break;
          ch.activateScene("weaken");
          this.activeChars.add(ch);
        }
        this.fallDelay = randInt15(this.minFallDelay, this.maxFallDelay);
        if (Math.random() < 0.6) {
          this.fallGroupMaxsize++;
          this.minFallDelay = Math.max(0, this.minFallDelay - 1);
          this.maxFallDelay = Math.max(0, this.maxFallDelay - 1);
        }
      } else {
        this.fallDelay--;
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    if (this.pendingChars.length === 0 && this.activeChars.size === 0) {
      this.phase = "vacuuming";
    }
    return true;
  }
  stepVacuuming() {
    if (!this.vacuumingStarted) {
      this.unvacuumedChars = [...this.nonSpaceChars];
      shuffle9(this.unvacuumedChars);
      this.vacuumingStarted = true;
    }
    const batchSize = randInt15(3, 10);
    for (let i = 0;i < batchSize && this.unvacuumedChars.length > 0; i++) {
      const ch = this.unvacuumedChars.shift();
      if (!ch)
        break;
      ch.motion.activatePath("top");
      this.activeChars.add(ch);
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    if (this.unvacuumedChars.length === 0 && this.activeChars.size === 0) {
      this.phase = "resetting";
    }
    return true;
  }
  stepResetting() {
    if (!this.resettingStarted) {
      for (const ch of this.nonSpaceChars) {
        ch.motion.activatePath("input");
        this.activeChars.add(ch);
      }
      this.resettingStarted = true;
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.activeChars.size > 0;
  }
}

// src/tte/effects/swarm.ts
var defaultSwarmConfig = {
  baseColors: [color("31a0d4")],
  flashColor: color("f2ea79"),
  swarmSize: 0.1,
  swarmCoordination: 0.8,
  swarmAreaCountRange: [2, 4],
  finalGradientStops: [color("31b900"), color("f0ff65")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "horizontal"
};
function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle10(arr) {
  const out = [...arr];
  for (let i = out.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

class SwarmEffect {
  canvas;
  config;
  activeChars = new Set;
  pendingSwarms = [];
  currentSwarm = null;
  callNext = true;
  currentGroupAreaIndex = 0;
  colorMapping = new Map;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()].sort((a, b) => {
      if (a.inputCoord.row !== b.inputCoord.row)
        return a.inputCoord.row - b.inputCoord.row;
      return b.inputCoord.column - a.inputCoord.column;
    });
    const swarmSize = Math.max(1, Math.round(nonSpaceChars.length * this.config.swarmSize));
    const swarms = this.makeSwarms(nonSpaceChars, swarmSize);
    const canvasRadius = Math.max(Math.floor(Math.min(dims.right, dims.top) / 2), 1);
    const localRadius = Math.max(Math.floor(Math.min(dims.right, dims.top) / 6), 1) * 2;
    for (let swarmIdx = 0;swarmIdx < swarms.length; swarmIdx++) {
      const groupChars = swarms[swarmIdx];
      const baseColor = randItem(this.config.baseColors);
      const swarmSpawn = this.canvas.randomCoord({ outsideScope: true });
      const areaCoordMap = [];
      const areaPathIds = [];
      let lastFocus = swarmSpawn;
      const areaCount = Math.floor(Math.random() * (this.config.swarmAreaCountRange[1] - this.config.swarmAreaCountRange[0] + 1)) + this.config.swarmAreaCountRange[0];
      while (areaCoordMap.length < areaCount) {
        const candidates = shuffle10(findCoordsOnCircle(lastFocus, canvasRadius));
        let nextFocus = this.canvas.randomCoord();
        for (const c of candidates) {
          if (this.canvas.coordIsInCanvas(c)) {
            nextFocus = c;
            break;
          }
        }
        const localCoords = findCoordsInCircle(lastFocus, localRadius);
        areaCoordMap.push(localCoords.length > 0 ? localCoords : [lastFocus]);
        areaPathIds.push(`${areaCoordMap.length - 1}_swarm_area`);
        lastFocus = nextFocus;
      }
      const swarmGrad = new Gradient([baseColor, this.config.flashColor], 7);
      const flashMirror = [
        ...swarmGrad.spectrum,
        ...Array(10).fill(this.config.flashColor),
        ...swarmGrad.spectrum.slice().reverse()
      ];
      for (const ch of groupChars) {
        const flashScene = ch.newScene("flash", false);
        for (const c of flashMirror) {
          flashScene.addFrame(ch.inputSymbol, 1, c.rgbHex);
        }
        const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
        const lastStop = this.config.finalGradientStops[this.config.finalGradientStops.length - 1];
        const finalColor = this.colorMapping.get(key) ?? lastStop;
        const landGrad = new Gradient([this.config.flashColor, finalColor], 10);
        const landScene = ch.newScene("land");
        for (const c of landGrad.spectrum) {
          landScene.addFrame(ch.inputSymbol, 3, c.rgbHex);
        }
        for (let areaIdx = 0;areaIdx < areaCoordMap.length; areaIdx++) {
          const localCoords = areaCoordMap[areaIdx];
          const areaPathId = areaPathIds[areaIdx];
          const outerPath = ch.motion.newPath(areaPathId, { speed: 0.4, ease: outSine });
          outerPath.addWaypoint(randItem(localCoords));
          ch.eventHandler.register("PATH_ACTIVATED", areaPathId, "ACTIVATE_SCENE", "flash");
          ch.eventHandler.register("PATH_ACTIVATED", areaPathId, "SET_LAYER", 1);
          ch.eventHandler.register("PATH_COMPLETE", areaPathId, "DEACTIVATE_SCENE");
          ch.eventHandler.register("PATH_COMPLETE", areaPathId, "ACTIVATE_PATH", `inner_${areaIdx}_0`);
          const inner0Id = `inner_${areaIdx}_0`;
          const inner0 = ch.motion.newPath(inner0Id, { speed: 0.18, ease: inOutSine });
          inner0.addWaypoint(randItem(localCoords));
          ch.eventHandler.register("PATH_COMPLETE", inner0Id, "ACTIVATE_PATH", `inner_${areaIdx}_1`);
          const inner1Id = `inner_${areaIdx}_1`;
          const inner1 = ch.motion.newPath(inner1Id, { speed: 0.18, ease: inOutSine });
          inner1.addWaypoint(randItem(localCoords));
          const nextPathId = areaIdx + 1 < areaCoordMap.length ? areaPathIds[areaIdx + 1] : "input_path";
          ch.eventHandler.register("PATH_COMPLETE", inner1Id, "ACTIVATE_PATH", nextPathId);
        }
        const inputPath = ch.motion.newPath("input_path", { speed: 0.45, ease: inOutQuad });
        inputPath.addWaypoint(ch.inputCoord);
        ch.eventHandler.register("PATH_ACTIVATED", "input_path", "ACTIVATE_SCENE", "flash");
        ch.eventHandler.register("PATH_COMPLETE", "input_path", "ACTIVATE_SCENE", "land");
        ch.eventHandler.register("PATH_COMPLETE", "input_path", "SET_LAYER", 0);
      }
      this.pendingSwarms.push({ chars: groupChars, spawnCoord: swarmSpawn, areaPathIds });
    }
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }
  }
  makeSwarms(chars, swarmSize) {
    const remaining = [...chars];
    const swarms = [];
    while (remaining.length > 0) {
      const newSwarm = [];
      for (let i = 0;i < swarmSize && remaining.length > 0; i++) {
        const ch = remaining.pop();
        if (ch)
          newSwarm.push(ch);
      }
      swarms.push(newSwarm);
    }
    if (swarms.length >= 2) {
      const finalSwarm = swarms[swarms.length - 1];
      if (finalSwarm.length < Math.floor(swarmSize / 2)) {
        swarms.pop();
        swarms[swarms.length - 1].push(...finalSwarm);
      }
    }
    return swarms;
  }
  launchSwarm(swarm) {
    for (const ch of swarm.chars) {
      ch.isVisible = true;
      ch.motion.setCoordinate(swarm.spawnCoord);
      ch.motion.activatePath(swarm.areaPathIds[0]);
      this.activeChars.add(ch);
    }
  }
  step() {
    if (this.pendingSwarms.length > 0 && this.callNext) {
      this.callNext = false;
      const swarm = this.pendingSwarms.pop();
      if (swarm) {
        this.currentSwarm = swarm;
        this.currentGroupAreaIndex = 0;
        this.launchSwarm(this.currentSwarm);
      }
    }
    if (this.currentSwarm !== null) {
      if (this.activeChars.size < this.currentSwarm.chars.length) {
        this.callNext = true;
      }
      for (const ch of this.currentSwarm.chars) {
        const pathId = ch.motion.activePath?.id;
        if (pathId?.includes("_swarm_area")) {
          const areaIdx = parseInt(pathId.split("_swarm_area")[0], 10);
          if (areaIdx > this.currentGroupAreaIndex) {
            this.currentGroupAreaIndex = areaIdx;
            for (const other of this.currentSwarm.chars) {
              if (other !== ch && Math.random() < this.config.swarmCoordination) {
                const path = other.motion.paths.get(pathId);
                if (path)
                  other.motion.activatePath(path);
              }
            }
            break;
          }
        }
      }
    }
    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    return this.pendingSwarms.length > 0 || this.activeChars.size > 0;
  }
}

// src/tte/effects/laseretch.ts
var defaultLaserEtchConfig = {
  etchSpeed: 1,
  etchDelay: 1,
  beamSymbols: ["/", "//", "▓"],
  beamGradientStops: [color("ffffff"), color("376cff")],
  beamGradientSteps: 6,
  beamFrameDuration: 2,
  searSymbols: ["▓", "▒", "░", "█"],
  searColors: [color("ffe680"), color("ff7b00"), color("8A003C"), color("510100")],
  searFrameDuration: 3,
  sparkSymbols: ["*", "·", "."],
  sparkGradientStops: [color("ffffff"), color("ffe680"), color("ff7b00"), color("1a0900")],
  sparkCoolingFrames: 7,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 8,
  finalGradientFrames: 4,
  finalGradientDirection: "vertical"
};
var nextLaserId = 900000;
var SPARK_POOL_SIZE = 2000;

class Laser {
  beamChars = [];
  isHidden = false;
  constructor(canvas, config) {
    const beamGradient = new Gradient(config.beamGradientStops, config.beamGradientSteps);
    const beamLength = canvas.dims.top;
    for (let i = 0;i < beamLength; i++) {
      const id = nextLaserId++;
      const sym = i === 0 ? "*" : "/";
      const ch = new EffectCharacter(id, sym, 0, 0);
      ch.isVisible = false;
      ch.layer = 2;
      const scene = ch.newScene("laser", true);
      const spectrum = beamGradient.spectrum;
      for (let f = 0;f < spectrum.length; f++) {
        const colorIdx = (f + i) % spectrum.length;
        scene.addFrame(sym, config.beamFrameDuration, spectrum[colorIdx].rgbHex);
      }
      canvas.characters.push(ch);
      this.beamChars.push(ch);
    }
  }
  reposition(target) {
    for (let i = 0;i < this.beamChars.length; i++) {
      const ch = this.beamChars[i];
      ch.motion.setCoordinate({
        column: target.column + i,
        row: target.row + i
      });
      if (!ch.isVisible) {
        ch.isVisible = true;
        ch.activateScene("laser");
      }
    }
  }
  hide() {
    this.isHidden = true;
    for (const ch of this.beamChars) {
      ch.isVisible = false;
      ch.activeScene = null;
    }
  }
  tick() {
    if (this.isHidden)
      return;
    for (const ch of this.beamChars) {
      if (ch.isVisible) {
        ch.tick();
      }
    }
  }
}

class LaserEtchEffect {
  canvas;
  config;
  pendingChars = [];
  activeChars = new Set;
  frameCount;
  laser;
  sparkPool = [];
  sparkIndex = 0;
  activeSparks = new Set;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.frameCount = config.etchDelay;
    this.laser = new Laser(canvas, config);
    this.buildSparkPool();
    this.build();
  }
  buildSparkPool() {
    const { config, canvas } = this;
    const sparkGradient = new Gradient(config.sparkGradientStops, config.sparkGradientStops.length);
    for (let i = 0;i < SPARK_POOL_SIZE; i++) {
      const id = nextLaserId++;
      const sym = config.sparkSymbols[Math.floor(Math.random() * config.sparkSymbols.length)];
      const ch = new EffectCharacter(id, sym, 0, 0);
      ch.isVisible = false;
      ch.layer = 1;
      const scene = ch.newScene("spark");
      scene.applyGradientToSymbols(config.sparkSymbols, config.sparkCoolingFrames, sparkGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "spark", "CALLBACK", {
        callback: (c) => {
          c.isVisible = false;
          this.activeSparks.delete(c);
        },
        args: []
      });
      canvas.characters.push(ch);
      this.sparkPool.push(ch);
    }
  }
  build() {
    const { dims } = this.canvas;
    const { config } = this;
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, config.finalGradientDirection);
    const beamGradient = new Gradient(config.beamGradientStops, config.beamGradientSteps);
    const searGradient = new Gradient(config.searColors, config.searColors.length);
    for (const ch of this.canvas.getCharacters()) {
      if (ch.layer === 2 || ch.layer === 1)
        continue;
      ch.isVisible = false;
    }
    const nonSpace = this.canvas.getNonSpaceCharacters();
    for (const ch of nonSpace) {
      const beamScene = ch.newScene("beam");
      beamScene.applyGradientToSymbols(config.beamSymbols, config.beamFrameDuration, beamGradient);
      const searScene = ch.newScene("sear");
      searScene.applyGradientToSymbols(config.searSymbols, config.searFrameDuration, searGradient);
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const lastSearColor = config.searColors[config.searColors.length - 1];
      const charGradient = new Gradient([lastSearColor, finalColor], config.finalGradientSteps);
      const finalScene = ch.newScene("final");
      finalScene.applyGradientToSymbols(ch.inputSymbol, config.finalGradientFrames, charGradient);
      ch.eventHandler.register("SCENE_COMPLETE", "beam", "ACTIVATE_SCENE", "sear");
      ch.eventHandler.register("SCENE_COMPLETE", "sear", "ACTIVATE_SCENE", "final");
    }
    this.pendingChars = buildSpanningTree(nonSpace, { startStrategy: "random" });
  }
  emitSparks(coord) {
    const { canvas } = this;
    const sparkCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0;i < sparkCount; i++) {
      const spark = this.sparkPool[this.sparkIndex % SPARK_POOL_SIZE];
      this.sparkIndex++;
      if (spark.isVisible) {
        spark.isVisible = false;
        this.activeSparks.delete(spark);
      }
      spark.motion.setCoordinate({ column: coord.column, row: coord.row });
      spark.motion.activePath = null;
      const fallColumn = coord.column + Math.floor(Math.random() * 20) - 10;
      const fallPath = spark.motion.newPath("fall", { speed: 0.3, ease: outSine });
      const bezierControl = {
        column: fallColumn,
        row: coord.row + Math.floor(Math.random() * 30) - 10
      };
      fallPath.addWaypoint({ column: fallColumn, row: canvas.dims.bottom }, bezierControl);
      spark.isVisible = true;
      spark.activateScene("spark");
      spark.motion.activatePath("fall");
      this.activeSparks.add(spark);
    }
  }
  step() {
    if (this.pendingChars.length === 0 && this.activeChars.size === 0 && this.activeSparks.size === 0) {
      return false;
    }
    this.frameCount++;
    if (this.frameCount > this.config.etchDelay) {
      this.frameCount = 0;
      for (let i = 0;i < this.config.etchSpeed; i++) {
        if (this.pendingChars.length > 0) {
          const ch = this.pendingChars.shift();
          if (!ch)
            break;
          ch.isVisible = true;
          ch.activateScene("beam");
          this.activeChars.add(ch);
          this.laser.reposition(ch.inputCoord);
          this.emitSparks(ch.inputCoord);
        }
      }
      if (this.pendingChars.length === 0) {
        this.laser.hide();
      }
    }
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }
    this.laser.tick();
    for (const spark of this.activeSparks) {
      spark.tick();
    }
    return true;
  }
}

// src/tte/effects/orbittingvolley.ts
var defaultOrbittingVolleyConfig = {
  launcherSymbols: ["█", "█", "█", "█"],
  launcherMovementSpeed: 0.8,
  launcherColor: color("888888"),
  characterMovementSpeed: 1.5,
  characterEasing: outSine,
  volleySize: 0.03,
  launchDelay: 30,
  finalGradientStops: [color("FFA15C"), color("44D492")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "radial"
};
var nextLauncherId = 200000;
function buildPerimeter(dims) {
  const { left, right, top, bottom } = dims;
  const coords = [];
  for (let col = left;col < right; col++) {
    coords.push({ column: col, row: top });
  }
  for (let row = top;row > bottom; row--) {
    coords.push({ column: right, row });
  }
  for (let col = right;col > left; col--) {
    coords.push({ column: col, row: bottom });
  }
  for (let row = bottom;row < top; row++) {
    coords.push({ column: left, row });
  }
  return coords;
}

class OrbittingVolleyEffect {
  canvas;
  config;
  launchers = [];
  perimeter = [];
  activeContentChars = new Set;
  delayCounter;
  totalChars;
  pathCounter = 0;
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.totalChars = 0;
    this.delayCounter = 0;
    this.build();
  }
  build() {
    const { dims } = this.canvas;
    const centerCol = Math.round((dims.left + dims.right) / 2);
    const centerRow = Math.round((dims.top + dims.bottom) / 2);
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    this.totalChars = nonSpaceChars.length;
    nonSpaceChars.sort((a, b) => {
      const da = Math.hypot(a.inputCoord.column - centerCol, a.inputCoord.row - centerRow);
      const db = Math.hypot(b.inputCoord.column - centerCol, b.inputCoord.row - centerRow);
      return da - db;
    });
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(dims.textBottom, dims.textTop, dims.textLeft, dims.textRight, this.config.finalGradientDirection);
    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[this.config.finalGradientStops.length - 1];
      const scene = ch.newScene("final");
      const charGradient = new Gradient([this.config.finalGradientStops[0], finalColor], this.config.finalGradientSteps);
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
    }
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }
    this.perimeter = buildPerimeter(dims);
    const perimLen = this.perimeter.length;
    const baseId = nextLauncherId;
    nextLauncherId += 4;
    for (let i = 0;i < 4; i++) {
      const startIdx = Math.floor(i * perimLen / 4);
      const coord = this.perimeter[startIdx];
      const sym = this.config.launcherSymbols[i] ?? "█";
      const launcherChar = new EffectCharacter(baseId + i, sym, coord.column, coord.row);
      launcherChar.isVisible = true;
      launcherChar.currentVisual = { symbol: sym, fgColor: this.config.launcherColor.rgbHex };
      this.canvas.characters.push(launcherChar);
      this.launchers.push({
        char: launcherChar,
        perimIdx: startIdx,
        magazine: []
      });
    }
    for (let i = 0;i < nonSpaceChars.length; i++) {
      this.launchers[i % 4].magazine.push(nonSpaceChars[i]);
    }
  }
  fireVolley() {
    const { volleySize, characterMovementSpeed, characterEasing, launcherColor } = this.config;
    const volleyCount = Math.max(1, Math.floor(volleySize * this.totalChars / 4));
    const perimLen = this.perimeter.length;
    for (const launcher of this.launchers) {
      const count = Math.min(volleyCount, launcher.magazine.length);
      if (count === 0)
        continue;
      const launchCoord = { ...this.perimeter[Math.round(launcher.perimIdx) % perimLen] };
      for (let i = 0;i < count; i++) {
        const ch = launcher.magazine.shift();
        if (!ch)
          break;
        const pathId = `fly_${this.pathCounter++}`;
        ch.motion.setCoordinate(launchCoord);
        const path = ch.motion.newPath(pathId, { speed: characterMovementSpeed, ease: characterEasing });
        path.addWaypoint(ch.inputCoord);
        ch.motion.activatePath(pathId);
        ch.eventHandler.register("PATH_COMPLETE", pathId, "ACTIVATE_SCENE", "final");
        ch.isVisible = true;
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: launcherColor.rgbHex };
        this.activeContentChars.add(ch);
      }
    }
  }
  step() {
    const perimLen = this.perimeter.length;
    for (const launcher of this.launchers) {
      launcher.perimIdx = (launcher.perimIdx + this.config.launcherMovementSpeed) % perimLen;
      const coord = this.perimeter[Math.round(launcher.perimIdx) % perimLen];
      launcher.char.motion.setCoordinate(coord);
    }
    const anyMagazineHasChars = this.launchers.some((l) => l.magazine.length > 0);
    if (anyMagazineHasChars) {
      this.delayCounter--;
      if (this.delayCounter <= 0) {
        this.fireVolley();
        this.delayCounter = this.config.launchDelay;
      }
    }
    for (const ch of this.activeContentChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeContentChars.delete(ch);
      }
    }
    const allEmpty = this.launchers.every((l) => l.magazine.length === 0);
    if (allEmpty && this.activeContentChars.size === 0) {
      for (const launcher of this.launchers) {
        launcher.char.isVisible = false;
      }
      return false;
    }
    return true;
  }
}

// src/tte/index.ts
function createEffect(container, text, effectName, config) {
  const canvas = new Canvas(text, { includeSpaces: true });
  let animId = null;
  let effect;
  let renderer;
  if (effectName === "overflow") {
    const cfg = { ...defaultOverflowConfig, ...config };
    effect = new OverflowEffect(canvas, cfg);
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  } else if (effectName === "orbittingvolley") {
    const cfg = { ...defaultOrbittingVolleyConfig, ...config };
    effect = new OrbittingVolleyEffect(canvas, cfg);
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  } else if (effectName === "laseretch") {
    const cfg = { ...defaultLaserEtchConfig, ...config };
    effect = new LaserEtchEffect(canvas, cfg);
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  } else {
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  }
  if (effectName === "overflow" || effectName === "orbittingvolley" || effectName === "laseretch") {} else if (effectName === "decrypt") {
    const cfg = { ...defaultDecryptConfig, ...config };
    effect = new DecryptEffect(canvas, cfg);
  } else if (effectName === "slide") {
    const cfg = { ...defaultSlideConfig, ...config };
    effect = new SlideEffect(canvas, cfg);
  } else if (effectName === "wipe") {
    const cfg = { ...defaultWipeConfig, ...config };
    effect = new WipeEffect(canvas, cfg);
  } else if (effectName === "randomsequence") {
    const cfg = { ...defaultRandomSequenceConfig, ...config };
    effect = new RandomSequenceEffect(canvas, cfg);
  } else if (effectName === "middleout") {
    const cfg = { ...defaultMiddleOutConfig, ...config };
    effect = new MiddleOutEffect(canvas, cfg);
  } else if (effectName === "colorshift") {
    const cfg = { ...defaultColorShiftConfig, ...config };
    effect = new ColorShiftEffect(canvas, cfg);
  } else if (effectName === "scattered") {
    const cfg = { ...defaultScatteredConfig, ...config };
    effect = new ScatteredEffect(canvas, cfg);
  } else if (effectName === "pour") {
    const cfg = { ...defaultPourConfig, ...config };
    effect = new PourEffect(canvas, cfg);
  } else if (effectName === "sweep") {
    const cfg = { ...defaultSweepConfig, ...config };
    effect = new SweepEffect(canvas, cfg);
  } else if (effectName === "waves") {
    const cfg = { ...defaultWavesConfig, ...config };
    effect = new WavesEffect(canvas, cfg);
  } else if (effectName === "rain") {
    const cfg = { ...defaultRainConfig, ...config };
    effect = new RainEffect(canvas, cfg);
  } else if (effectName === "print") {
    const cfg = { ...defaultPrintConfig, ...config };
    effect = new PrintEffect(canvas, cfg);
  } else if (effectName === "burn") {
    const cfg = { ...defaultBurnConfig, ...config };
    effect = new BurnEffect(canvas, cfg);
  } else if (effectName === "matrix") {
    const cfg = { ...defaultMatrixConfig, ...config };
    effect = new MatrixEffect(canvas, cfg);
  } else if (effectName === "highlight") {
    const cfg = { ...defaultHighlightConfig, ...config };
    effect = new HighlightEffect(canvas, cfg);
  } else if (effectName === "rings") {
    const cfg = { ...defaultRingsConfig, ...config };
    effect = new RingsEffect(canvas, cfg);
  } else if (effectName === "errorcorrect") {
    const cfg = { ...defaultErrorCorrectConfig, ...config };
    effect = new ErrorCorrectEffect(canvas, cfg);
  } else if (effectName === "unstable") {
    const cfg = { ...defaultUnstableConfig, ...config };
    effect = new UnstableEffect(canvas, cfg);
  } else if (effectName === "bouncyballs") {
    const cfg = { ...defaultBouncyBallsConfig, ...config };
    effect = new BouncyBallsEffect(canvas, cfg);
  } else if (effectName === "fireworks") {
    const cfg = { ...defaultFireworksConfig, ...config };
    effect = new FireworksEffect(canvas, cfg);
  } else if (effectName === "spotlights") {
    const cfg = { ...defaultSpotlightsConfig, ...config };
    effect = new SpotlightsEffect(canvas, cfg);
  } else if (effectName === "vhstape") {
    const cfg = { ...defaultVhstapeConfig, ...config };
    effect = new VhstapeEffect(canvas, cfg);
  } else if (effectName === "blackhole") {
    const cfg = { ...defaultBlackholeConfig, ...config };
    effect = new BlackholeEffect(canvas, cfg);
  } else if (effectName === "smoke") {
    const cfg = { ...defaultSmokeConfig, ...config };
    effect = new SmokeEffect(canvas, cfg);
  } else if (effectName === "bubbles") {
    const cfg = { ...defaultBubblesConfig, ...config };
    effect = new BubblesEffect(canvas, cfg);
  } else if (effectName === "spray") {
    const cfg = { ...defaultSprayConfig, ...config };
    effect = new SprayEffect(canvas, cfg);
  } else if (effectName === "beams") {
    const cfg = { ...defaultBeamsConfig, ...config };
    effect = new BeamsEffect(canvas, cfg);
  } else if (effectName === "slice") {
    const cfg = { ...defaultSliceConfig, ...config };
    effect = new SliceEffect(canvas, cfg);
  } else if (effectName === "synthgrid") {
    const cfg = { ...defaultSynthGridConfig, ...config };
    effect = new SynthGridEffect(canvas, cfg, container);
  } else if (effectName === "binarypath") {
    const cfg = { ...defaultBinaryPathConfig, ...config };
    effect = new BinaryPathEffect(canvas, cfg, container);
  } else if (effectName === "thunderstorm") {
    const cfg = { ...defaultThunderstormConfig, ...config };
    effect = new ThunderstormEffect(canvas, cfg, container);
  } else if (effectName === "crumble") {
    const cfg = { ...defaultCrumbleConfig, ...config };
    effect = new CrumbleEffect(canvas, cfg);
  } else if (effectName === "swarm") {
    const cfg = { ...defaultSwarmConfig, ...config };
    effect = new SwarmEffect(canvas, cfg);
  } else {
    const cfg = { ...defaultExpandConfig, ...config };
    effect = new ExpandEffect(canvas, cfg);
  }
  const onComplete = config?.onComplete;
  function tick() {
    const hasMore = effect.step();
    renderer.render();
    if (hasMore) {
      animId = requestAnimationFrame(tick);
    } else {
      animId = null;
      if (onComplete)
        onComplete();
    }
  }
  return {
    start() {
      if (animId !== null)
        return;
      animId = requestAnimationFrame(tick);
    },
    stop() {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }
  };
}
function createEffectOnScroll(container, text, effectName, config) {
  const handle = createEffect(container, text, effectName, config);
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        handle.start();
        observer.disconnect();
      }
    }
  }, { threshold: 0.1 });
  observer.observe(container);
  return handle;
}
export {
  xtermToHex,
  rgbInts,
  makeEasing,
  exports_graph as graph,
  exports_geometry as geometry,
  exports_easing as easing,
  defaultWipeConfig,
  defaultWavesConfig,
  defaultVhstapeConfig,
  defaultUnstableConfig,
  defaultThunderstormConfig,
  defaultSynthGridConfig,
  defaultSweepConfig,
  defaultSwarmConfig,
  defaultSprayConfig,
  defaultSpotlightsConfig,
  defaultSmokeConfig,
  defaultSlideConfig,
  defaultSliceConfig,
  defaultScatteredConfig,
  defaultRingsConfig,
  defaultRandomSequenceConfig,
  defaultRainConfig,
  defaultPrintConfig,
  defaultPourConfig,
  defaultOverflowConfig,
  defaultOrbittingVolleyConfig,
  defaultMiddleOutConfig,
  defaultMatrixConfig,
  defaultLaserEtchConfig,
  defaultHighlightConfig,
  defaultFireworksConfig,
  defaultExpandConfig,
  defaultErrorCorrectConfig,
  defaultDecryptConfig,
  defaultCrumbleConfig,
  defaultColorShiftConfig,
  defaultBurnConfig,
  defaultBubblesConfig,
  defaultBouncyBallsConfig,
  defaultBlackholeConfig,
  defaultBinaryPathConfig,
  defaultBeamsConfig,
  createEffectOnScroll,
  createEffect,
  colorPair,
  color,
  adjustBrightness,
  SequenceEaser,
  ParticleSystem,
  EventHandler,
  EasingTracker
};
