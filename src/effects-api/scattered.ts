import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { ScatteredEffect, type ScatteredConfig, defaultScatteredConfig } from "../effects/scattered";

export { ScatteredEffect, defaultScatteredConfig } from "../effects/scattered";
export type { ScatteredConfig } from "../effects/scattered";

export const scatteredEffect: EffectDefinition<ScatteredConfig> = {
  defaultConfig: defaultScatteredConfig,
  create: ({ canvas }, config) => new ScatteredEffect(canvas, config),
};

export const createScatteredEffect = createEffectFactory(scatteredEffect);
export const createScatteredEffectOnScroll = createEffectOnScrollFactory(scatteredEffect);
