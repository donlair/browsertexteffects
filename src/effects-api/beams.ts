import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { BeamsEffect, type BeamsConfig, defaultBeamsConfig } from "../effects/beams";

export { BeamsEffect, defaultBeamsConfig } from "../effects/beams";
export type { BeamsConfig } from "../effects/beams";

export const beamsEffect: EffectDefinition<BeamsConfig> = {
  defaultConfig: defaultBeamsConfig,
  create: ({ canvas }, config) => new BeamsEffect(canvas, config),
};

export const createBeamsEffect = createEffectFactory(beamsEffect);
export const createBeamsEffectOnScroll = createEffectOnScrollFactory(beamsEffect);
