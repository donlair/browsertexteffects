import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SmokeEffect, type SmokeConfig, defaultSmokeConfig } from "../effects/smoke";

export { SmokeEffect, defaultSmokeConfig } from "../effects/smoke";
export type { SmokeConfig } from "../effects/smoke";

export const smokeEffect: EffectDefinition<SmokeConfig> = {
  defaultConfig: defaultSmokeConfig,
  create: ({ canvas }, config) => new SmokeEffect(canvas, config),
};

export const createSmokeEffect = createEffectFactory(smokeEffect);
export const createSmokeEffectOnScroll = createEffectOnScrollFactory(smokeEffect);
