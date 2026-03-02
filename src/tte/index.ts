import { Canvas } from "./canvas";
import { DOMRenderer } from "./renderer";
import { DecryptEffect, DecryptConfig, defaultDecryptConfig } from "./effects/decrypt";
import { SlideEffect, SlideConfig, defaultSlideConfig } from "./effects/slide";
import { WipeEffect, WipeConfig, defaultWipeConfig } from "./effects/wipe";
import { RandomSequenceEffect, RandomSequenceConfig, defaultRandomSequenceConfig } from "./effects/randomsequence";
import { MiddleOutEffect, MiddleOutConfig, defaultMiddleOutConfig } from "./effects/middleout";
import { ColorShiftEffect, ColorShiftConfig, defaultColorShiftConfig } from "./effects/colorshift";
import { ScatteredEffect, ScatteredConfig, defaultScatteredConfig } from "./effects/scattered";
import { PourEffect, PourConfig, defaultPourConfig } from "./effects/pour";
import { SweepEffect, SweepConfig, defaultSweepConfig } from "./effects/sweep";
import { ExpandEffect, ExpandConfig, defaultExpandConfig } from "./effects/expand";
import { WavesEffect, WavesConfig, defaultWavesConfig } from "./effects/waves";
import { RainEffect, RainConfig, defaultRainConfig } from "./effects/rain";
import { PrintEffect, PrintConfig, defaultPrintConfig } from "./effects/print";
import { BurnEffect, BurnConfig, defaultBurnConfig } from "./effects/burn";
import { MatrixEffect, MatrixConfig, defaultMatrixConfig } from "./effects/matrix";

export { color } from "./types";
export type { Color, GradientDirection, Grouping, EasingFunction } from "./types";
export type { DecryptConfig } from "./effects/decrypt";
export type { SlideConfig } from "./effects/slide";
export type { WipeConfig } from "./effects/wipe";
export type { RandomSequenceConfig } from "./effects/randomsequence";
export type { MiddleOutConfig } from "./effects/middleout";
export type { ColorShiftConfig } from "./effects/colorshift";
export type { ScatteredConfig } from "./effects/scattered";
export type { PourConfig } from "./effects/pour";
export type { SweepConfig } from "./effects/sweep";
export type { ExpandConfig } from "./effects/expand";
export type { WavesConfig } from "./effects/waves";
export type { RainConfig } from "./effects/rain";
export type { PrintConfig } from "./effects/print";
export type { BurnConfig } from "./effects/burn";
export type { MatrixConfig } from "./effects/matrix";
export { defaultDecryptConfig } from "./effects/decrypt";
export { defaultSlideConfig } from "./effects/slide";
export { defaultWipeConfig } from "./effects/wipe";
export { defaultRandomSequenceConfig } from "./effects/randomsequence";
export { defaultMiddleOutConfig } from "./effects/middleout";
export { defaultColorShiftConfig } from "./effects/colorshift";
export { defaultScatteredConfig } from "./effects/scattered";
export { defaultPourConfig } from "./effects/pour";
export { defaultSweepConfig } from "./effects/sweep";
export { defaultExpandConfig } from "./effects/expand";
export { defaultWavesConfig } from "./effects/waves";
export { defaultRainConfig } from "./effects/rain";
export { defaultPrintConfig } from "./effects/print";
export { defaultBurnConfig } from "./effects/burn";
export { defaultMatrixConfig } from "./effects/matrix";
export * as easing from "./easing";
export { EasingTracker, SequenceEaser, makeEasing } from "./easing";
export * as geometry from "./geometry";
export type { EventType, ActionType, EventCallback, EventAction } from "./events";

export type EffectName = "decrypt" | "slide" | "wipe" | "randomsequence" | "middleout" | "colorshift" | "scattered" | "pour" | "sweep" | "expand" | "waves" | "rain" | "print" | "burn" | "matrix";
export type EffectConfig =
  | Partial<DecryptConfig>
  | Partial<SlideConfig>
  | Partial<WipeConfig>
  | Partial<RandomSequenceConfig>
  | Partial<MiddleOutConfig>
  | Partial<ColorShiftConfig>
  | Partial<ScatteredConfig>
  | Partial<PourConfig>
  | Partial<SweepConfig>
  | Partial<ExpandConfig>
  | Partial<WavesConfig>
  | Partial<RainConfig>
  | Partial<PrintConfig>
  | Partial<BurnConfig>
  | Partial<MatrixConfig>;

export interface EffectHandle {
  start: () => void;
  stop: () => void;
}

export function createEffect(
  container: HTMLElement,
  text: string,
  effectName: EffectName,
  config?: EffectConfig & { lineHeight?: number; onComplete?: () => void },
): EffectHandle {
  const canvas = new Canvas(text, { includeSpaces: true });
  const renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  let animId: number | null = null;
  let effect: { step: () => boolean };

  if (effectName === "decrypt") {
    const cfg = { ...defaultDecryptConfig, ...config } as DecryptConfig;
    effect = new DecryptEffect(canvas, cfg);
  } else if (effectName === "slide") {
    const cfg = { ...defaultSlideConfig, ...config } as SlideConfig;
    effect = new SlideEffect(canvas, cfg);
  } else if (effectName === "wipe") {
    const cfg = { ...defaultWipeConfig, ...config } as WipeConfig;
    effect = new WipeEffect(canvas, cfg);
  } else if (effectName === "randomsequence") {
    const cfg = { ...defaultRandomSequenceConfig, ...config } as RandomSequenceConfig;
    effect = new RandomSequenceEffect(canvas, cfg);
  } else if (effectName === "middleout") {
    const cfg = { ...defaultMiddleOutConfig, ...config } as MiddleOutConfig;
    effect = new MiddleOutEffect(canvas, cfg);
  } else if (effectName === "scattered") {
    const cfg = { ...defaultScatteredConfig, ...config } as ScatteredConfig;
    effect = new ScatteredEffect(canvas, cfg);
  } else if (effectName === "pour") {
    const cfg = { ...defaultPourConfig, ...config } as PourConfig;
    effect = new PourEffect(canvas, cfg);
  } else if (effectName === "sweep") {
    const cfg = { ...defaultSweepConfig, ...config } as SweepConfig;
    effect = new SweepEffect(canvas, cfg);
  } else if (effectName === "waves") {
    const cfg = { ...defaultWavesConfig, ...config } as WavesConfig;
    effect = new WavesEffect(canvas, cfg);
  } else if (effectName === "rain") {
    const cfg = { ...defaultRainConfig, ...config } as RainConfig;
    effect = new RainEffect(canvas, cfg);
  } else if (effectName === "print") {
    const cfg = { ...defaultPrintConfig, ...config } as PrintConfig;
    effect = new PrintEffect(canvas, cfg);
  } else if (effectName === "burn") {
    const cfg = { ...defaultBurnConfig, ...config } as BurnConfig;
    effect = new BurnEffect(canvas, cfg);
  } else if (effectName === "matrix") {
    const cfg = { ...defaultMatrixConfig, ...config } as MatrixConfig;
    effect = new MatrixEffect(canvas, cfg);
  } else {
    const cfg = { ...defaultExpandConfig, ...config } as ExpandConfig;
    effect = new ExpandEffect(canvas, cfg);
  }

  const onComplete = config?.onComplete;

  function tick() {
    const hasMore = effect.step();
    renderer.render();
    if (hasMore) {
      animId = requestAnimationFrame(tick);
    } else {
      animId = null;
      if (onComplete) onComplete();
    }
  }

  return {
    start() {
      if (animId !== null) return;
      animId = requestAnimationFrame(tick);
    },
    stop() {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    },
  };
}

export function createEffectOnScroll(
  container: HTMLElement,
  text: string,
  effectName: EffectName,
  config?: EffectConfig,
): EffectHandle {
  const handle = createEffect(container, text, effectName, config);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          handle.start();
          observer.disconnect();
        }
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(container);

  return handle;
}
