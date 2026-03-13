export { color, colorPair, rgbInts, adjustBrightness, xtermToHex } from "./types";
export type { Color, ColorPair, Coord, GradientDirection, Grouping, EasingFunction } from "./types";
export { createEffectWith, createEffectOnScrollWith } from "./core";
export type {
  CommonEffectOptions,
  EffectConfigInput,
  EffectContext,
  EffectDefinition,
  EffectHandle,
  EffectInstance,
} from "./core";
export * as easing from "./easing";
export { EasingTracker, SequenceEaser, makeEasing } from "./easing";
export * as geometry from "./geometry";
export * as graph from "./graph";
export { ParticleSystem } from "./particles";
export type { ParticleConfig } from "./particles";
export { EventHandler } from "./events";
export type { EventType, ActionType, EventCallback, EventAction } from "./events";
