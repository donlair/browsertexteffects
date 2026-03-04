import type { EasingFunction } from "./types";

export const linear: EasingFunction = (t) => t;

export const inQuad: EasingFunction = (t) => t ** 2;

export const outQuad: EasingFunction = (t) => 1 - (1 - t) * (1 - t);

export const inOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t ** 2 : 1 - (-2 * t + 2) ** 2 / 2;

export const inCubic: EasingFunction = (t) => t ** 3;

export const outCubic: EasingFunction = (t) => 1 - (1 - t) ** 3;

export const inOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

export const inSine: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);

export const outSine: EasingFunction = (t) => Math.sin((t * Math.PI) / 2);

export const inOutSine: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export const inExpo: EasingFunction = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10));

export const outExpo: EasingFunction = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

export const inOutExpo: EasingFunction = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};

export const inBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t ** 3 - c1 * t ** 2;
};

export const outBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export const inOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5
    ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
    : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

export const inBounce: EasingFunction = (t) => 1 - outBounce(1 - t);

export const outBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t ** 2;
  if (t < 2 / d1) return n1 * (t - 1.5 / d1) ** 2 + 0.75;
  if (t < 2.5 / d1) return n1 * (t - 2.25 / d1) ** 2 + 0.9375;
  return n1 * (t - 2.625 / d1) ** 2 + 0.984375;
};

export const inOutBounce: EasingFunction = (t) =>
  t < 0.5 ? (1 - outBounce(1 - 2 * t)) / 2 : (1 + outBounce(2 * t - 1)) / 2;

export const inQuart: EasingFunction = (t) => t ** 4;

export const outQuart: EasingFunction = (t) => 1 - (1 - t) ** 4;

export const inOutQuart: EasingFunction = (t) =>
  t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

export const inQuint: EasingFunction = (t) => t ** 5;

export const outQuint: EasingFunction = (t) => 1 - (1 - t) ** 5;

export const inOutQuint: EasingFunction = (t) =>
  t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;

export const inCirc: EasingFunction = (t) => 1 - Math.sqrt(1 - t ** 2);

export const outCirc: EasingFunction = (t) => Math.sqrt(1 - (t - 1) ** 2);

export const inOutCirc: EasingFunction = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
    : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;

export const inElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * c4);
};

export const outElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const inOutElastic: EasingFunction = (t) => {
  const c5 = (2 * Math.PI) / 4.5;
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) {
    return -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
  }
  return (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
};

export function makeEasing(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  function sampleCurveX(t: number): number {
    return 3 * x1 * (1 - t) ** 2 * t + 3 * x2 * (1 - t) * t ** 2 + t ** 3;
  }

  function sampleCurveY(t: number): number {
    return 3 * y1 * (1 - t) ** 2 * t + 3 * y2 * (1 - t) * t ** 2 + t ** 3;
  }

  function sampleCurveDerivativeX(t: number): number {
    return 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t ** 2 * (1 - x2);
  }

  return (progress: number): number => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    let t = progress;
    for (let i = 0; i < 20; i++) {
      const xEst = sampleCurveX(t);
      const dx = xEst - progress;
      if (Math.abs(dx) < 1e-5) break;
      const d = sampleCurveDerivativeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    return sampleCurveY(t);
  };
}

export class EasingTracker {
  easingFunction: EasingFunction;
  totalSteps: number;
  currentStep: number = 0;
  progressRatio: number = 0;
  stepDelta: number = 0;
  easedValue: number = 0;
  private _lastEasedValue: number = 0;
  private _clamp: boolean;

  constructor(easingFunction: EasingFunction, totalSteps: number = 100, clamp: boolean = false) {
    this.easingFunction = easingFunction;
    this.totalSteps = totalSteps;
    this._clamp = clamp;
  }

  step(): number {
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

  reset(): void {
    this.currentStep = 0;
    this.progressRatio = 0;
    this.stepDelta = 0;
    this.easedValue = 0;
    this._lastEasedValue = 0;
  }

  isComplete(): boolean {
    return this.currentStep >= this.totalSteps;
  }
}

export class SequenceEaser<T> {
  sequence: T[];
  easingTracker: EasingTracker;
  added: T[] = [];
  removed: T[] = [];
  total: T[] = [];

  constructor(sequence: T[], easingFunction: EasingFunction, totalSteps: number = 100) {
    this.sequence = sequence;
    this.easingTracker = new EasingTracker(easingFunction, totalSteps, true);
  }

  step(): T[] {
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

  isComplete(): boolean {
    return this.easingTracker.isComplete();
  }

  reset(): void {
    this.easingTracker.reset();
    this.added = [];
    this.removed = [];
    this.total = [];
  }
}
