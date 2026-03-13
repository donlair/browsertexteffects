import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { WavesEffect, type WavesConfig, defaultWavesConfig } from "../effects/waves";

export { WavesEffect, defaultWavesConfig } from "../effects/waves";
export type { WavesConfig } from "../effects/waves";

export const wavesEffect: EffectDefinition<WavesConfig> = {
  defaultConfig: defaultWavesConfig,
  create: ({ canvas }, config) => new WavesEffect(canvas, config),
};

export const createWavesEffect = createEffectFactory(wavesEffect);
export const createWavesEffectOnScroll = createEffectOnScrollFactory(wavesEffect);
