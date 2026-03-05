
import type { EasingFunction } from "./types";
import type { Gradient } from "./gradient";

export type SceneSyncMode = "STEP" | "DISTANCE";

// Distributes elements of a smaller sequence cyclically across a larger sequence.
// Matches Python's cyclic_distribution() used in Scene.apply_gradient_to_symbols().
function* cyclicDistribute<T, U>(larger: T[], smaller: U[]): Generator<[T, U]> {
  if (smaller.length === 0) return;
  const repeatFactor = Math.floor(larger.length / smaller.length);
  let overflow = larger.length % smaller.length;
  let smallerIdx = 0;
  let count = 0;
  let overflowUsed = false;

  for (const item of larger) {
    if (count >= repeatFactor) {
      if (overflow > 0) {
        if (overflowUsed) {
          smallerIdx++;
          count = 0;
          overflowUsed = false;
        } else {
          overflowUsed = true;
          overflow--;
        }
      } else {
        smallerIdx++;
        count = 0;
      }
    }
    count++;
    yield [item, smaller[smallerIdx]];
  }
}

export interface CharacterVisual {
  symbol: string;
  fgColor: string | null; // rgb hex string
  bgColor?: string | null; // rgb hex string
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  blink?: boolean;
  reverse?: boolean;
  hidden?: boolean;
  dim?: boolean;
  strike?: boolean;
}

export interface Frame {
  visual: CharacterVisual;
  duration: number;
  ticksElapsed: number;
}

export class Scene {
  id: string;
  isLooping: boolean;
  frames: Frame[] = [];
  playedFrames: Frame[] = [];

  // Scene-level easing: plays frames non-linearly via easing function (matches Python Scene.ease)
  ease: EasingFunction | null = null;
  // frameIndexMap[step] = Frame at that easing step; built in addFrame when ease is set
  frameIndexMap: Frame[] = [];
  easingTotalSteps: number = 0;
  easingCurrentStep: number = 0;

  // Scene sync: ties animation frame to motion path progress (matches Python Scene.SyncMetric)
  sync: SceneSyncMode | null = null;

  constructor(id: string, isLooping = false, options?: { ease?: EasingFunction | null; sync?: SceneSyncMode | null }) {
    this.id = id;
    this.isLooping = isLooping;
    if (options) {
      this.ease = options.ease ?? null;
      this.sync = options.sync ?? null;
    }
  }

  addFrame(
    symbol: string,
    duration: number,
    fgColor: string | null = null,
    formatting?: {
      bgColor?: string | null;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      blink?: boolean;
      reverse?: boolean;
      hidden?: boolean;
      dim?: boolean;
      strike?: boolean;
    },
  ): void {
    const { bgColor = null, ...rest } = formatting ?? {};
    const frame: Frame = {
      visual: { symbol, fgColor, bgColor, ...rest },
      duration,
      ticksElapsed: 0,
    };
    this.frames.push(frame);
    // Build frameIndexMap for easing: each frame contributes `duration` entries
    for (let i = 0; i < duration; i++) {
      this.frameIndexMap.push(frame);
    }
    this.easingTotalSteps += duration;
  }

  applyGradientToSymbols(
    symbols: string | string[],
    duration: number,
    fgGradient: Gradient | null,
    bgGradient: Gradient | null = null,
  ): void {
    const syms = typeof symbols === "string" ? [symbols] : symbols;

    // Build color pairs: zip fg and bg spectrum using cyclic distribution
    type ColorPairEntry = { fg: string | null; bg: string | null };
    const colorPairs: ColorPairEntry[] = [];

    const fgColors = fgGradient?.spectrum ?? [];
    const bgColors = bgGradient?.spectrum ?? [];

    if (fgColors.length > 0 && bgColors.length > 0) {
      // Pair both gradients using cyclic distribution (longer drives the iteration)
      const larger = fgColors.length >= bgColors.length ? fgColors : bgColors;
      const smaller = fgColors.length >= bgColors.length ? bgColors : fgColors;
      const isLargerFg = fgColors.length >= bgColors.length;
      for (const [largerColor, smallerColor] of cyclicDistribute(larger, smaller)) {
        colorPairs.push(isLargerFg
          ? { fg: largerColor.rgbHex, bg: smallerColor.rgbHex }
          : { fg: smallerColor.rgbHex, bg: largerColor.rgbHex });
      }
    } else if (fgColors.length > 0) {
      for (const c of fgColors) colorPairs.push({ fg: c.rgbHex, bg: null });
    } else if (bgColors.length > 0) {
      for (const c of bgColors) colorPairs.push({ fg: null, bg: c.rgbHex });
    }

    if (colorPairs.length === 0) return;

    if (syms.length >= colorPairs.length) {
      for (const [sym, cp] of cyclicDistribute(syms, colorPairs)) {
        this.addFrame(sym, duration, cp.fg, { bgColor: cp.bg });
      }
    } else {
      for (const [cp, sym] of cyclicDistribute(colorPairs, syms)) {
        this.addFrame(sym, duration, cp.fg, { bgColor: cp.bg });
      }
    }
  }

  activate(): CharacterVisual {
    if (this.frames.length === 0) throw new Error(`Scene "${this.id}" has no frames`);
    return this.frames[0].visual;
  }

  getNextVisual(): CharacterVisual {
    const currentFrame = this.frames[0];
    const visual = currentFrame.visual;
    currentFrame.ticksElapsed++;
    if (currentFrame.ticksElapsed === currentFrame.duration) {
      currentFrame.ticksElapsed = 0;
      this.playedFrames.push(this.frames.shift() as Frame);
      if (this.isLooping && this.frames.length === 0) {
        this.frames.push(...this.playedFrames);
        this.playedFrames = [];
      }
    }
    return visual;
  }

  get isComplete(): boolean {
    if (this.ease) {
      return this.easingCurrentStep >= this.easingTotalSteps || this.isLooping;
    }
    return this.frames.length === 0 || this.isLooping;
  }

  reset(): void {
    for (const f of this.frames) {
      f.ticksElapsed = 0;
      this.playedFrames.push(f);
    }
    this.frames = [...this.playedFrames];
    this.playedFrames = [];
    this.easingCurrentStep = 0;
  }

  /** Returns the visual at an absolute frame index without consuming frames (used by sync mode). */
  getVisualAtIndex(index: number): CharacterVisual {
    const i = Math.max(0, Math.min(index, this.frames.length - 1));
    return this.frames[i].visual;
  }

  /** Advances animation using easing; returns the visual for this tick. Matches Python _ease_animation. */
  getNextVisualEased(): CharacterVisual {
    // Python: elapsed_step_ratio = current_step / total_steps, then frame_index = round(ease(ratio) * (total_steps - 1))
    const stepRatio = this.easingCurrentStep / Math.max(this.easingTotalSteps, 1);
    const easedRatio = (this.ease as EasingFunction)(stepRatio);
    const frameIndex = Math.round(easedRatio * Math.max(this.easingTotalSteps - 1, 0));
    const clampedIndex = Math.max(0, Math.min(frameIndex, this.easingTotalSteps - 1));
    const frame = this.frameIndexMap[clampedIndex];
    this.easingCurrentStep++;
    if (this.easingCurrentStep >= this.easingTotalSteps) {
      if (this.isLooping) {
        this.easingCurrentStep = 0;
      } else {
        // Move all frames to played so isComplete returns true
        this.playedFrames.push(...this.frames);
        this.frames = [];
      }
    }
    return frame.visual;
  }
}
