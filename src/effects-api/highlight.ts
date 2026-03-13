import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { HighlightEffect, type HighlightConfig, defaultHighlightConfig } from "../effects/highlight";

export { HighlightEffect, defaultHighlightConfig } from "../effects/highlight";
export type { HighlightConfig } from "../effects/highlight";

export const highlightEffect: EffectDefinition<HighlightConfig> = {
  defaultConfig: defaultHighlightConfig,
  create: ({ canvas }, config) => new HighlightEffect(canvas, config),
};

export const createHighlightEffect = createEffectFactory(highlightEffect);
export const createHighlightEffectOnScroll = createEffectOnScrollFactory(highlightEffect);
