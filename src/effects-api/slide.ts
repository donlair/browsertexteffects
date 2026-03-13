import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SlideEffect, type SlideConfig, defaultSlideConfig } from "../effects/slide";

export { SlideEffect, defaultSlideConfig } from "../effects/slide";
export type { SlideConfig } from "../effects/slide";

export const slideEffect: EffectDefinition<SlideConfig> = {
  defaultConfig: defaultSlideConfig,
  create: ({ canvas }, config) => new SlideEffect(canvas, config),
};

export const createSlideEffect = createEffectFactory(slideEffect);
export const createSlideEffectOnScroll = createEffectOnScrollFactory(slideEffect);
