import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { ThunderstormEffect, type ThunderstormConfig, defaultThunderstormConfig } from "../effects/thunderstorm";

export { ThunderstormEffect, defaultThunderstormConfig } from "../effects/thunderstorm";
export type { ThunderstormConfig } from "../effects/thunderstorm";

export const thunderstormEffect: EffectDefinition<ThunderstormConfig> = {
  defaultConfig: defaultThunderstormConfig,
  create: ({ canvas, container }, config) => new ThunderstormEffect(canvas, config, container),
};

export const createThunderstormEffect = createEffectFactory(thunderstormEffect);
export const createThunderstormEffectOnScroll = createEffectOnScrollFactory(thunderstormEffect);
