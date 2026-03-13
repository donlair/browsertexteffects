import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { CrumbleEffect, type CrumbleConfig, defaultCrumbleConfig } from "../effects/crumble";

export { CrumbleEffect, defaultCrumbleConfig } from "../effects/crumble";
export type { CrumbleConfig } from "../effects/crumble";

export const crumbleEffect: EffectDefinition<CrumbleConfig> = {
  defaultConfig: defaultCrumbleConfig,
  create: ({ canvas }, config) => new CrumbleEffect(canvas, config),
};

export const createCrumbleEffect = createEffectFactory(crumbleEffect);
export const createCrumbleEffectOnScroll = createEffectOnScrollFactory(crumbleEffect);
