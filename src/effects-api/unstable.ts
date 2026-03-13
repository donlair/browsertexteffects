import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { UnstableEffect, type UnstableConfig, defaultUnstableConfig } from "../effects/unstable";

export { UnstableEffect, defaultUnstableConfig } from "../effects/unstable";
export type { UnstableConfig } from "../effects/unstable";

export const unstableEffect: EffectDefinition<UnstableConfig> = {
  defaultConfig: defaultUnstableConfig,
  create: ({ canvas }, config) => new UnstableEffect(canvas, config),
};

export const createUnstableEffect = createEffectFactory(unstableEffect);
export const createUnstableEffectOnScroll = createEffectOnScrollFactory(unstableEffect);
