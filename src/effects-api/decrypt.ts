import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { DecryptEffect, type DecryptConfig, defaultDecryptConfig } from "../effects/decrypt";

export { DecryptEffect, defaultDecryptConfig } from "../effects/decrypt";
export type { DecryptConfig } from "../effects/decrypt";

export const decryptEffect: EffectDefinition<DecryptConfig> = {
  defaultConfig: defaultDecryptConfig,
  create: ({ canvas }, config) => new DecryptEffect(canvas, config),
};

export const createDecryptEffect = createEffectFactory(decryptEffect);
export const createDecryptEffectOnScroll = createEffectOnScrollFactory(decryptEffect);
