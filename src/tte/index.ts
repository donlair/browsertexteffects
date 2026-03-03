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
import { HighlightEffect, HighlightConfig, defaultHighlightConfig } from "./effects/highlight";
import { RingsEffect, RingsConfig, defaultRingsConfig } from "./effects/rings";
import { ErrorCorrectEffect, ErrorCorrectConfig, defaultErrorCorrectConfig } from "./effects/errorcorrect";
import { UnstableEffect, UnstableConfig, defaultUnstableConfig } from "./effects/unstable";
import { OverflowEffect, OverflowConfig, defaultOverflowConfig } from "./effects/overflow";
import { BouncyBallsEffect, BouncyBallsConfig, defaultBouncyBallsConfig } from "./effects/bouncyballs";
import { FireworksEffect, FireworksConfig, defaultFireworksConfig } from "./effects/fireworks";
import { SpotlightsEffect, SpotlightsConfig, defaultSpotlightsConfig } from "./effects/spotlights";
import { VhstapeEffect, VhstapeConfig, defaultVhstapeConfig } from "./effects/vhstape";
import { BlackholeEffect, BlackholeConfig, defaultBlackholeConfig } from "./effects/blackhole";
import { SmokeEffect, SmokeConfig, defaultSmokeConfig } from "./effects/smoke";
import { BubblesEffect, BubblesConfig, defaultBubblesConfig } from "./effects/bubbles";
import { SprayEffect, SprayConfig, defaultSprayConfig } from "./effects/spray";
import { BeamsEffect, BeamsConfig, defaultBeamsConfig } from "./effects/beams";
import { SliceEffect, SliceConfig, defaultSliceConfig } from "./effects/slice";
import { SynthGridEffect, SynthGridConfig, defaultSynthGridConfig } from "./effects/synthgrid";
import { BinaryPathEffect, BinaryPathConfig, defaultBinaryPathConfig } from "./effects/binarypath";
import { ThunderstormEffect, ThunderstormConfig, defaultThunderstormConfig } from "./effects/thunderstorm";
import { CrumbleEffect, CrumbleConfig, defaultCrumbleConfig } from "./effects/crumble";
import { SwarmEffect, SwarmConfig, defaultSwarmConfig } from "./effects/swarm";
import { LaserEtchEffect, LaserEtchConfig, defaultLaserEtchConfig } from "./effects/laseretch";
import { OrbittingVolleyEffect, OrbittingVolleyConfig, defaultOrbittingVolleyConfig } from "./effects/orbittingvolley";

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
export type { HighlightConfig } from "./effects/highlight";
export type { RingsConfig } from "./effects/rings";
export type { ErrorCorrectConfig } from "./effects/errorcorrect";
export type { UnstableConfig } from "./effects/unstable";
export type { OverflowConfig } from "./effects/overflow";
export type { BouncyBallsConfig } from "./effects/bouncyballs";
export type { FireworksConfig } from "./effects/fireworks";
export type { SpotlightsConfig } from "./effects/spotlights";
export type { VhstapeConfig } from "./effects/vhstape";
export type { BlackholeConfig } from "./effects/blackhole";
export type { SmokeConfig } from "./effects/smoke";
export type { BubblesConfig } from "./effects/bubbles";
export type { SprayConfig } from "./effects/spray";
export type { BeamsConfig } from "./effects/beams";
export type { SliceConfig } from "./effects/slice";
export type { SynthGridConfig } from "./effects/synthgrid";
export type { BinaryPathConfig } from "./effects/binarypath";
export type { ThunderstormConfig } from "./effects/thunderstorm";
export type { CrumbleConfig } from "./effects/crumble";
export type { SwarmConfig } from "./effects/swarm";
export type { LaserEtchConfig } from "./effects/laseretch";
export type { OrbittingVolleyConfig } from "./effects/orbittingvolley";
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
export { defaultHighlightConfig } from "./effects/highlight";
export { defaultRingsConfig } from "./effects/rings";
export { defaultErrorCorrectConfig } from "./effects/errorcorrect";
export { defaultUnstableConfig } from "./effects/unstable";
export { defaultOverflowConfig } from "./effects/overflow";
export { defaultBouncyBallsConfig } from "./effects/bouncyballs";
export { defaultFireworksConfig } from "./effects/fireworks";
export { defaultSpotlightsConfig } from "./effects/spotlights";
export { defaultVhstapeConfig } from "./effects/vhstape";
export { defaultBlackholeConfig } from "./effects/blackhole";
export { defaultSmokeConfig } from "./effects/smoke";
export { defaultBubblesConfig } from "./effects/bubbles";
export { defaultSprayConfig } from "./effects/spray";
export { defaultBeamsConfig } from "./effects/beams";
export { defaultSliceConfig } from "./effects/slice";
export { defaultSynthGridConfig } from "./effects/synthgrid";
export { defaultBinaryPathConfig } from "./effects/binarypath";
export { defaultThunderstormConfig } from "./effects/thunderstorm";
export { defaultCrumbleConfig } from "./effects/crumble";
export { defaultSwarmConfig } from "./effects/swarm";
export { defaultLaserEtchConfig } from "./effects/laseretch";
export { defaultOrbittingVolleyConfig } from "./effects/orbittingvolley";
export * as easing from "./easing";
export { EasingTracker, SequenceEaser, makeEasing } from "./easing";
export * as geometry from "./geometry";
export * as graph from "./graph";
export { ParticleSystem } from "./particles";
export type { ParticleConfig } from "./particles";
export type { EventType, ActionType, EventCallback, EventAction } from "./events";

export type EffectName = "decrypt" | "slide" | "wipe" | "randomsequence" | "middleout" | "colorshift" | "scattered" | "pour" | "sweep" | "expand" | "waves" | "rain" | "print" | "burn" | "matrix" | "highlight" | "rings" | "errorcorrect" | "unstable" | "overflow" | "bouncyballs" | "fireworks" | "spotlights" | "vhstape" | "blackhole" | "smoke" | "bubbles" | "spray" | "beams" | "slice" | "synthgrid" | "binarypath" | "thunderstorm" | "crumble" | "swarm" | "laseretch" | "orbittingvolley";
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
  | Partial<MatrixConfig>
  | Partial<HighlightConfig>
  | Partial<RingsConfig>
  | Partial<ErrorCorrectConfig>
  | Partial<UnstableConfig>
  | Partial<OverflowConfig>
  | Partial<BouncyBallsConfig>
  | Partial<FireworksConfig>
  | Partial<SpotlightsConfig>
  | Partial<VhstapeConfig>
  | Partial<BlackholeConfig>
  | Partial<SmokeConfig>
  | Partial<BubblesConfig>
  | Partial<SprayConfig>
  | Partial<BeamsConfig>
  | Partial<SliceConfig>
  | Partial<SynthGridConfig>
  | Partial<BinaryPathConfig>
  | Partial<ThunderstormConfig>
  | Partial<CrumbleConfig>
  | Partial<SwarmConfig>
  | Partial<LaserEtchConfig>
  | Partial<OrbittingVolleyConfig>;

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
  let animId: number | null = null;
  let effect: { step: () => boolean };
  let renderer: DOMRenderer;

  // Effects that inject extra characters into canvas must be constructed before
  // the renderer so the renderer sees all characters.
  if (effectName === "overflow") {
    const cfg = { ...defaultOverflowConfig, ...config } as OverflowConfig;
    effect = new OverflowEffect(canvas, cfg);
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  } else if (effectName === "orbittingvolley") {
    const cfg = { ...defaultOrbittingVolleyConfig, ...config } as OrbittingVolleyConfig;
    effect = new OrbittingVolleyEffect(canvas, cfg);
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  } else {
    renderer = new DOMRenderer(container, canvas, config?.lineHeight);
  }

  if (effectName === "overflow" || effectName === "orbittingvolley") {
    // already constructed above
  } else if (effectName === "decrypt") {
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
  } else if (effectName === "highlight") {
    const cfg = { ...defaultHighlightConfig, ...config } as HighlightConfig;
    effect = new HighlightEffect(canvas, cfg);
  } else if (effectName === "rings") {
    const cfg = { ...defaultRingsConfig, ...config } as RingsConfig;
    effect = new RingsEffect(canvas, cfg);
  } else if (effectName === "errorcorrect") {
    const cfg = { ...defaultErrorCorrectConfig, ...config } as ErrorCorrectConfig;
    effect = new ErrorCorrectEffect(canvas, cfg);
  } else if (effectName === "unstable") {
    const cfg = { ...defaultUnstableConfig, ...config } as UnstableConfig;
    effect = new UnstableEffect(canvas, cfg);
  } else if (effectName === "bouncyballs") {
    const cfg = { ...defaultBouncyBallsConfig, ...config } as BouncyBallsConfig;
    effect = new BouncyBallsEffect(canvas, cfg);
  } else if (effectName === "fireworks") {
    const cfg = { ...defaultFireworksConfig, ...config } as FireworksConfig;
    effect = new FireworksEffect(canvas, cfg);
  } else if (effectName === "spotlights") {
    const cfg = { ...defaultSpotlightsConfig, ...config } as SpotlightsConfig;
    effect = new SpotlightsEffect(canvas, cfg);
  } else if (effectName === "vhstape") {
    const cfg = { ...defaultVhstapeConfig, ...config } as VhstapeConfig;
    effect = new VhstapeEffect(canvas, cfg);
  } else if (effectName === "blackhole") {
    const cfg = { ...defaultBlackholeConfig, ...config } as BlackholeConfig;
    effect = new BlackholeEffect(canvas, cfg);
  } else if (effectName === "smoke") {
    const cfg = { ...defaultSmokeConfig, ...config } as SmokeConfig;
    effect = new SmokeEffect(canvas, cfg, container);
  } else if (effectName === "bubbles") {
    const cfg = { ...defaultBubblesConfig, ...config } as BubblesConfig;
    effect = new BubblesEffect(canvas, cfg);
  } else if (effectName === "spray") {
    const cfg = { ...defaultSprayConfig, ...config } as SprayConfig;
    effect = new SprayEffect(canvas, cfg);
  } else if (effectName === "beams") {
    const cfg = { ...defaultBeamsConfig, ...config } as BeamsConfig;
    effect = new BeamsEffect(canvas, cfg);
  } else if (effectName === "slice") {
    const cfg = { ...defaultSliceConfig, ...config } as SliceConfig;
    effect = new SliceEffect(canvas, cfg);
  } else if (effectName === "synthgrid") {
    const cfg = { ...defaultSynthGridConfig, ...config } as SynthGridConfig;
    effect = new SynthGridEffect(canvas, cfg, container);
  } else if (effectName === "binarypath") {
    const cfg = { ...defaultBinaryPathConfig, ...config } as BinaryPathConfig;
    effect = new BinaryPathEffect(canvas, cfg, container);
  } else if (effectName === "thunderstorm") {
    const cfg = { ...defaultThunderstormConfig, ...config } as ThunderstormConfig;
    effect = new ThunderstormEffect(canvas, cfg, container);
  } else if (effectName === "crumble") {
    const cfg = { ...defaultCrumbleConfig, ...config } as CrumbleConfig;
    effect = new CrumbleEffect(canvas, cfg);
  } else if (effectName === "swarm") {
    const cfg = { ...defaultSwarmConfig, ...config } as SwarmConfig;
    effect = new SwarmEffect(canvas, cfg);
  } else if (effectName === "laseretch") {
    const cfg = { ...defaultLaserEtchConfig, ...config } as LaserEtchConfig;
    effect = new LaserEtchEffect(canvas, cfg, container);
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
