import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SliceEffect, type SliceConfig, defaultSliceConfig } from "../effects/slice";

export { SliceEffect, defaultSliceConfig } from "../effects/slice";
export type { SliceConfig } from "../effects/slice";

export const sliceEffect: EffectDefinition<SliceConfig> = {
  defaultConfig: defaultSliceConfig,
  create: ({ canvas }, config) => new SliceEffect(canvas, config),
};

export const createSliceEffect = createEffectFactory(sliceEffect);
export const createSliceEffectOnScroll = createEffectOnScrollFactory(sliceEffect);
