import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SprayEffect, type SprayConfig, defaultSprayConfig } from "../effects/spray";

export { SprayEffect, defaultSprayConfig } from "../effects/spray";
export type { SprayConfig } from "../effects/spray";

export const sprayEffect: EffectDefinition<SprayConfig> = {
  defaultConfig: defaultSprayConfig,
  create: ({ canvas }, config) => new SprayEffect(canvas, config),
};

export const createSprayEffect = createEffectFactory(sprayEffect);
export const createSprayEffectOnScroll = createEffectOnScrollFactory(sprayEffect);
