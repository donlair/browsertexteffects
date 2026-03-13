import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { BurnEffect, type BurnConfig, defaultBurnConfig } from "../effects/burn";

export { BurnEffect, defaultBurnConfig } from "../effects/burn";
export type { BurnConfig } from "../effects/burn";

export const burnEffect: EffectDefinition<BurnConfig> = {
  defaultConfig: defaultBurnConfig,
  create: ({ canvas }, config) => new BurnEffect(canvas, config),
  buildBeforeRenderer: true,
};

export const createBurnEffect = createEffectFactory(burnEffect);
export const createBurnEffectOnScroll = createEffectOnScrollFactory(burnEffect);
