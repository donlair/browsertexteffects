import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { PourEffect, type PourConfig, defaultPourConfig } from "../effects/pour";

export { PourEffect, defaultPourConfig } from "../effects/pour";
export type { PourConfig } from "../effects/pour";

export const pourEffect: EffectDefinition<PourConfig> = {
  defaultConfig: defaultPourConfig,
  create: ({ canvas }, config) => new PourEffect(canvas, config),
};

export const createPourEffect = createEffectFactory(pourEffect);
export const createPourEffectOnScroll = createEffectOnScrollFactory(pourEffect);
