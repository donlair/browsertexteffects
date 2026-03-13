import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { ErrorCorrectEffect, type ErrorCorrectConfig, defaultErrorCorrectConfig } from "../effects/errorcorrect";

export { ErrorCorrectEffect, defaultErrorCorrectConfig } from "../effects/errorcorrect";
export type { ErrorCorrectConfig } from "../effects/errorcorrect";

export const errorCorrectEffect: EffectDefinition<ErrorCorrectConfig> = {
  defaultConfig: defaultErrorCorrectConfig,
  create: ({ canvas }, config) => new ErrorCorrectEffect(canvas, config),
};

export const createErrorCorrectEffect = createEffectFactory(errorCorrectEffect);
export const createErrorCorrectEffectOnScroll = createEffectOnScrollFactory(errorCorrectEffect);
