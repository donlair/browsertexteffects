import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { WipeEffect, type WipeConfig, defaultWipeConfig } from "../effects/wipe";

export { WipeEffect, defaultWipeConfig } from "../effects/wipe";
export type { WipeConfig } from "../effects/wipe";

export const wipeEffect: EffectDefinition<WipeConfig> = {
  defaultConfig: defaultWipeConfig,
  create: ({ canvas }, config) => new WipeEffect(canvas, config),
};

export const createWipeEffect = createEffectFactory(wipeEffect);
export const createWipeEffectOnScroll = createEffectOnScrollFactory(wipeEffect);
