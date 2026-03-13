import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { RandomSequenceEffect, type RandomSequenceConfig, defaultRandomSequenceConfig } from "../effects/randomsequence";

export { RandomSequenceEffect, defaultRandomSequenceConfig } from "../effects/randomsequence";
export type { RandomSequenceConfig } from "../effects/randomsequence";

export const randomSequenceEffect: EffectDefinition<RandomSequenceConfig> = {
  defaultConfig: defaultRandomSequenceConfig,
  create: ({ canvas }, config) => new RandomSequenceEffect(canvas, config),
};

export const createRandomSequenceEffect = createEffectFactory(randomSequenceEffect);
export const createRandomSequenceEffectOnScroll = createEffectOnScrollFactory(randomSequenceEffect);
