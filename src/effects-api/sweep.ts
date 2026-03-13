import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SweepEffect, type SweepConfig, defaultSweepConfig } from "../effects/sweep";

export { SweepEffect, defaultSweepConfig } from "../effects/sweep";
export type { SweepConfig } from "../effects/sweep";

export const sweepEffect: EffectDefinition<SweepConfig> = {
  defaultConfig: defaultSweepConfig,
  create: ({ canvas }, config) => new SweepEffect(canvas, config),
};

export const createSweepEffect = createEffectFactory(sweepEffect);
export const createSweepEffectOnScroll = createEffectOnScrollFactory(sweepEffect);
