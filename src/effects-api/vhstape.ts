import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { VhstapeEffect, type VhstapeConfig, defaultVhstapeConfig } from "../effects/vhstape";

export { VhstapeEffect, defaultVhstapeConfig } from "../effects/vhstape";
export type { VhstapeConfig } from "../effects/vhstape";

export const vhstapeEffect: EffectDefinition<VhstapeConfig> = {
  defaultConfig: defaultVhstapeConfig,
  create: ({ canvas }, config) => new VhstapeEffect(canvas, config),
};

export const createVhstapeEffect = createEffectFactory(vhstapeEffect);
export const createVhstapeEffectOnScroll = createEffectOnScrollFactory(vhstapeEffect);
