import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { MiddleOutEffect, type MiddleOutConfig, defaultMiddleOutConfig } from "../effects/middleout";

export { MiddleOutEffect, defaultMiddleOutConfig } from "../effects/middleout";
export type { MiddleOutConfig } from "../effects/middleout";

export const middleOutEffect: EffectDefinition<MiddleOutConfig> = {
  defaultConfig: defaultMiddleOutConfig,
  create: ({ canvas }, config) => new MiddleOutEffect(canvas, config),
};

export const createMiddleOutEffect = createEffectFactory(middleOutEffect);
export const createMiddleOutEffectOnScroll = createEffectOnScrollFactory(middleOutEffect);
