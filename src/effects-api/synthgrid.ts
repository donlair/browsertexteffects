import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SynthGridEffect, type SynthGridConfig, defaultSynthGridConfig } from "../effects/synthgrid";

export { SynthGridEffect, defaultSynthGridConfig } from "../effects/synthgrid";
export type { SynthGridConfig } from "../effects/synthgrid";

export const synthGridEffect: EffectDefinition<SynthGridConfig> = {
  defaultConfig: defaultSynthGridConfig,
  create: ({ canvas, container }, config) => new SynthGridEffect(canvas, config, container),
};

export const createSynthGridEffect = createEffectFactory(synthGridEffect);
export const createSynthGridEffectOnScroll = createEffectOnScrollFactory(synthGridEffect);
