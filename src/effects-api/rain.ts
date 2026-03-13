import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { RainEffect, type RainConfig, defaultRainConfig } from "../effects/rain";

export { RainEffect, defaultRainConfig } from "../effects/rain";
export type { RainConfig } from "../effects/rain";

export const rainEffect: EffectDefinition<RainConfig> = {
  defaultConfig: defaultRainConfig,
  create: ({ canvas }, config) => new RainEffect(canvas, config),
};

export const createRainEffect = createEffectFactory(rainEffect);
export const createRainEffectOnScroll = createEffectOnScrollFactory(rainEffect);
