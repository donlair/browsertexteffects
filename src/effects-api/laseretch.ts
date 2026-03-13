import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { LaserEtchEffect, type LaserEtchConfig, defaultLaserEtchConfig } from "../effects/laseretch";

export { LaserEtchEffect, defaultLaserEtchConfig } from "../effects/laseretch";
export type { LaserEtchConfig } from "../effects/laseretch";

export const laserEtchEffect: EffectDefinition<LaserEtchConfig> = {
  defaultConfig: defaultLaserEtchConfig,
  create: ({ canvas }, config) => new LaserEtchEffect(canvas, config),
  buildBeforeRenderer: true,
};

export const createLaserEtchEffect = createEffectFactory(laserEtchEffect);
export const createLaserEtchEffectOnScroll = createEffectOnScrollFactory(laserEtchEffect);
