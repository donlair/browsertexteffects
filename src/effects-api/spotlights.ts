import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SpotlightsEffect, type SpotlightsConfig, defaultSpotlightsConfig } from "../effects/spotlights";

export { SpotlightsEffect, defaultSpotlightsConfig } from "../effects/spotlights";
export type { SpotlightsConfig } from "../effects/spotlights";

export const spotlightsEffect: EffectDefinition<SpotlightsConfig> = {
  defaultConfig: defaultSpotlightsConfig,
  create: ({ canvas }, config) => new SpotlightsEffect(canvas, config),
};

export const createSpotlightsEffect = createEffectFactory(spotlightsEffect);
export const createSpotlightsEffectOnScroll = createEffectOnScrollFactory(spotlightsEffect);
