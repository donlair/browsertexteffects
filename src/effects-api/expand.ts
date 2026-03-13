import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { ExpandEffect, type ExpandConfig, defaultExpandConfig } from "../effects/expand";

export { ExpandEffect, defaultExpandConfig } from "../effects/expand";
export type { ExpandConfig } from "../effects/expand";

export const expandEffect: EffectDefinition<ExpandConfig> = {
  defaultConfig: defaultExpandConfig,
  create: ({ canvas }, config) => new ExpandEffect(canvas, config),
};

export const createExpandEffect = createEffectFactory(expandEffect);
export const createExpandEffectOnScroll = createEffectOnScrollFactory(expandEffect);
