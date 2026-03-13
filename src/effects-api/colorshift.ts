import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { ColorShiftEffect, type ColorShiftConfig, defaultColorShiftConfig } from "../effects/colorshift";

export { ColorShiftEffect, defaultColorShiftConfig } from "../effects/colorshift";
export type { ColorShiftConfig } from "../effects/colorshift";

export const colorShiftEffect: EffectDefinition<ColorShiftConfig> = {
  defaultConfig: defaultColorShiftConfig,
  create: ({ canvas }, config) => new ColorShiftEffect(canvas, config),
};

export const createColorShiftEffect = createEffectFactory(colorShiftEffect);
export const createColorShiftEffectOnScroll = createEffectOnScrollFactory(colorShiftEffect);
