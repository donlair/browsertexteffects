import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { BouncyBallsEffect, type BouncyBallsConfig, defaultBouncyBallsConfig } from "../effects/bouncyballs";

export { BouncyBallsEffect, defaultBouncyBallsConfig } from "../effects/bouncyballs";
export type { BouncyBallsConfig } from "../effects/bouncyballs";

export const bouncyBallsEffect: EffectDefinition<BouncyBallsConfig> = {
  defaultConfig: defaultBouncyBallsConfig,
  create: ({ canvas }, config) => new BouncyBallsEffect(canvas, config),
};

export const createBouncyBallsEffect = createEffectFactory(bouncyBallsEffect);
export const createBouncyBallsEffectOnScroll = createEffectOnScrollFactory(bouncyBallsEffect);
