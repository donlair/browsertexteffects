import { createEffectFactory, createEffectOnScrollFactory, type EffectDefinition } from "../core";
import { MatrixEffect, type MatrixConfig, defaultMatrixConfig } from "../effects/matrix";

export { MatrixEffect, defaultMatrixConfig } from "../effects/matrix";
export type { MatrixConfig } from "../effects/matrix";

export const matrixEffect: EffectDefinition<MatrixConfig> = {
  defaultConfig: defaultMatrixConfig,
  create: ({ canvas }, config) => new MatrixEffect(canvas, config),
};

export const createMatrixEffect = createEffectFactory(matrixEffect);
export const createMatrixEffectOnScroll = createEffectOnScrollFactory(matrixEffect);
