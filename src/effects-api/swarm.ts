import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { SwarmEffect, type SwarmConfig, defaultSwarmConfig } from "../effects/swarm";

export { SwarmEffect, defaultSwarmConfig } from "../effects/swarm";
export type { SwarmConfig } from "../effects/swarm";

export const swarmEffect: EffectDefinition<SwarmConfig> = {
  defaultConfig: defaultSwarmConfig,
  create: ({ canvas }, config) => new SwarmEffect(canvas, config),
};

export const createSwarmEffect = createEffectFactory(swarmEffect);
export const createSwarmEffectOnScroll = createEffectOnScrollFactory(swarmEffect);
