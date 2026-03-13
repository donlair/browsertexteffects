import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { BlackholeEffect, type BlackholeConfig, defaultBlackholeConfig } from "../effects/blackhole";

export { BlackholeEffect, defaultBlackholeConfig } from "../effects/blackhole";
export type { BlackholeConfig } from "../effects/blackhole";

export const blackholeEffect: EffectDefinition<BlackholeConfig> = {
  defaultConfig: defaultBlackholeConfig,
  create: ({ canvas }, config) => new BlackholeEffect(canvas, config),
};

export const createBlackholeEffect = createEffectFactory(blackholeEffect);
export const createBlackholeEffectOnScroll = createEffectOnScrollFactory(blackholeEffect);
