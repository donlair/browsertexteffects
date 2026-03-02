import { EasingFunction } from "./types";

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

export const inOutQuart: EasingFunction = (t) =>
  t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

export const inOutCirc: EasingFunction = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
    : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;
