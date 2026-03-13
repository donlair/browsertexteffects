import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { BinaryPathEffect, type BinaryPathConfig, defaultBinaryPathConfig } from "../effects/binarypath";

export { BinaryPathEffect, defaultBinaryPathConfig } from "../effects/binarypath";
export type { BinaryPathConfig } from "../effects/binarypath";

export const binaryPathEffect: EffectDefinition<BinaryPathConfig> = {
  defaultConfig: defaultBinaryPathConfig,
  create: ({ canvas, container }, config) => new BinaryPathEffect(canvas, config, container),
};

export const createBinaryPathEffect = createEffectFactory(binaryPathEffect);
export const createBinaryPathEffectOnScroll = createEffectOnScrollFactory(binaryPathEffect);
