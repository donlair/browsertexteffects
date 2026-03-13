import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { BubblesEffect, type BubblesConfig, defaultBubblesConfig } from "../effects/bubbles";

export { BubblesEffect, defaultBubblesConfig } from "../effects/bubbles";
export type { BubblesConfig } from "../effects/bubbles";

export const bubblesEffect: EffectDefinition<BubblesConfig> = {
  defaultConfig: defaultBubblesConfig,
  create: ({ canvas }, config) => new BubblesEffect(canvas, config),
};

export const createBubblesEffect = createEffectFactory(bubblesEffect);
export const createBubblesEffectOnScroll = createEffectOnScrollFactory(bubblesEffect);
