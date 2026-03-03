import { Color, ColorPair, colorPair } from "./types";
import { Gradient } from "./gradient";

export interface CharacterVisual {
  symbol: string;
  fgColor: string | null; // rgb hex string
  bold?: boolean;
  italic?: boolean;
  dim?: boolean;
  blink?: boolean;
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
  private _isComplete = false;

  constructor(id: string, isLooping = false) {
    this.id = id;
    this.isLooping = isLooping;
  }

  addFrame(
    symbol: string,
    duration: number,
    fgColor: string | null = null,
    formatting?: { bold?: boolean; italic?: boolean; dim?: boolean; blink?: boolean },
  ): void {
    this.frames.push({
      visual: { symbol, fgColor, ...formatting },
      duration,
      ticksElapsed: 0,
    });
  }

  applyGradientToSymbols(
    symbols: string | string[],
    duration: number,
    fgGradient: Gradient,
  ): void {
    const syms = typeof symbols === "string" ? [symbols] : symbols;
    const colors = fgGradient.spectrum;

    if (syms.length >= colors.length) {
      // Distribute colors cyclically across symbols
      const repeatFactor = Math.floor(syms.length / colors.length);
      let overflow = syms.length % colors.length;
      let colorIdx = 0;
      let count = 0;
      let overflowUsed = false;

      for (const sym of syms) {
        this.addFrame(sym, duration, colors[colorIdx].rgbHex);
        count++;
        if (count >= repeatFactor) {
          if (overflow > 0) {
            if (overflowUsed) {
              colorIdx++;
              count = 0;
              overflowUsed = false;
            } else {
              overflowUsed = true;
              overflow--;
            }
          } else {
            colorIdx++;
            count = 0;
          }
        }
      }
    } else {
      // More colors than symbols — distribute symbols cyclically across colors
      const repeatFactor = Math.floor(colors.length / syms.length);
      let overflow = colors.length % syms.length;
      let symIdx = 0;
      let count = 0;
      let overflowUsed = false;

      for (const c of colors) {
        this.addFrame(syms[symIdx], duration, c.rgbHex);
        count++;
        if (count >= repeatFactor) {
          if (overflow > 0) {
            if (overflowUsed) {
              symIdx++;
              count = 0;
              overflowUsed = false;
            } else {
              overflowUsed = true;
              overflow--;
            }
          } else {
            symIdx++;
            count = 0;
          }
        }
      }
    }
  }

  activate(): CharacterVisual {
    return this.frames[0].visual;
  }

  getNextVisual(): CharacterVisual {
    const currentFrame = this.frames[0];
    const visual = currentFrame.visual;
    currentFrame.ticksElapsed++;
    if (currentFrame.ticksElapsed === currentFrame.duration) {
      currentFrame.ticksElapsed = 0;
      this.playedFrames.push(this.frames.shift()!);
      if (this.isLooping && this.frames.length === 0) {
        this.frames.push(...this.playedFrames);
        this.playedFrames = [];
      }
    }
    return visual;
  }

  get isComplete(): boolean {
    return this.frames.length === 0 || this.isLooping;
  }

  reset(): void {
    for (const f of this.frames) {
      f.ticksElapsed = 0;
      this.playedFrames.push(f);
    }
    this.frames = [...this.playedFrames];
    this.playedFrames = [];
  }
}
