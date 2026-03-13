import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { FireworksEffect, type FireworksConfig, defaultFireworksConfig } from "../effects/fireworks";

export { FireworksEffect, defaultFireworksConfig } from "../effects/fireworks";
export type { FireworksConfig } from "../effects/fireworks";

export const fireworksEffect: EffectDefinition<FireworksConfig> = {
  defaultConfig: defaultFireworksConfig,
  create: ({ canvas }, config) => new FireworksEffect(canvas, config),
};

export const createFireworksEffect = createEffectFactory(fireworksEffect);
export const createFireworksEffectOnScroll = createEffectOnScrollFactory(fireworksEffect);
