import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { OrbittingVolleyEffect, type OrbittingVolleyConfig, defaultOrbittingVolleyConfig } from "../effects/orbittingvolley";

export { OrbittingVolleyEffect, defaultOrbittingVolleyConfig } from "../effects/orbittingvolley";
export type { OrbittingVolleyConfig } from "../effects/orbittingvolley";

export const orbittingVolleyEffect: EffectDefinition<OrbittingVolleyConfig> = {
  defaultConfig: defaultOrbittingVolleyConfig,
  create: ({ canvas }, config) => new OrbittingVolleyEffect(canvas, config),
  buildBeforeRenderer: true,
};

export const createOrbittingVolleyEffect = createEffectFactory(orbittingVolleyEffect);
export const createOrbittingVolleyEffectOnScroll = createEffectOnScrollFactory(orbittingVolleyEffect);
