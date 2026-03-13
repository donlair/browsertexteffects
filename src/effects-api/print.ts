import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { PrintEffect, type PrintConfig, defaultPrintConfig } from "../effects/print";

export { PrintEffect, defaultPrintConfig } from "../effects/print";
export type { PrintConfig } from "../effects/print";

export const printEffect: EffectDefinition<PrintConfig> = {
  defaultConfig: defaultPrintConfig,
  create: ({ canvas }, config) => new PrintEffect(canvas, config),
  buildBeforeRenderer: true,
};

export const createPrintEffect = createEffectFactory(printEffect);
export const createPrintEffectOnScroll = createEffectOnScrollFactory(printEffect);
