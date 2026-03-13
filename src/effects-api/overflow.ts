import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { OverflowEffect, type OverflowConfig, defaultOverflowConfig } from "../effects/overflow";

export { OverflowEffect, defaultOverflowConfig } from "../effects/overflow";
export type { OverflowConfig } from "../effects/overflow";

export const overflowEffect: EffectDefinition<OverflowConfig> = {
  defaultConfig: defaultOverflowConfig,
  create: ({ canvas }, config) => new OverflowEffect(canvas, config),
  buildBeforeRenderer: true,
};

export const createOverflowEffect = createEffectFactory(overflowEffect);
export const createOverflowEffectOnScroll = createEffectOnScrollFactory(overflowEffect);
