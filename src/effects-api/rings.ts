import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { RingsEffect, type RingsConfig, defaultRingsConfig } from "../effects/rings";

export { RingsEffect, defaultRingsConfig } from "../effects/rings";
export type { RingsConfig } from "../effects/rings";

export const ringsEffect: EffectDefinition<RingsConfig> = {
  defaultConfig: defaultRingsConfig,
  create: ({ canvas }, config) => new RingsEffect(canvas, config),
};

export const createRingsEffect = createEffectFactory(ringsEffect);
export const createRingsEffectOnScroll = createEffectOnScrollFactory(ringsEffect);
