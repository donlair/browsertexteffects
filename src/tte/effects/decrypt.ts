import { type Color, color, type GradientDirection } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface DecryptConfig {
  typingSpeed: number;
  ciphertextColors: Color[];
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultDecryptConfig: DecryptConfig = {
  typingSpeed: 2,
  ciphertextColors: [color("008000"), color("00cb00"), color("00ff00")],
  finalGradientStops: [color("eda000")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

// Character ranges for cipher symbols
const KEYBOARD = range(33, 127);
const BLOCKS = range(9608, 9632);
const BOX_DRAWING = range(9472, 9599);
const MISC = range(174, 452);
const ENCRYPTED_SYMBOLS = [...KEYBOARD, ...BLOCKS, ...BOX_DRAWING, ...MISC].map((n) =>
  String.fromCharCode(n),
);

function range(start: number, end: number): number[] {
  const r: number[] = [];
  for (let i = start; i < end; i++) r.push(i);
  return r;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class DecryptEffect {
  private canvas: Canvas;
  private config: DecryptConfig;
  private typingPending: EffectCharacter[] = [];
  private decryptingChars: Set<EffectCharacter> = new Set();
  private activeChars: Set<EffectCharacter> = new Set();
  private phase: "typing" | "decrypting" = "typing";
  private characterFinalColorMap: Map<number, Color> = new Map();

  constructor(canvas: Canvas, config: DecryptConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom,
      dims.textTop,
      dims.textLeft,
      dims.textRight,
      this.config.finalGradientDirection,
    );

    // Make spaces visible immediately — they don't participate in animation
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }

    const animChars = this.canvas.getNonSpaceCharacters();
    for (const ch of animChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      this.characterFinalColorMap.set(ch.id, colorMapping.get(key) || this.config.finalGradientStops[0]);
    }

    this.prepareTyping(animChars);
    this.prepareDecrypt(animChars);
  }

  private prepareTyping(chars: EffectCharacter[]): void {
    for (const ch of chars) {
      const scene = ch.newScene("typing");
      for (const block of ["\u2589", "\u2593", "\u2592", "\u2591"]) {
        scene.addFrame(block, 2, randChoice(this.config.ciphertextColors).rgbHex);
      }
      scene.addFrame(randChoice(ENCRYPTED_SYMBOLS), 1, randChoice(this.config.ciphertextColors).rgbHex);
      this.typingPending.push(ch);
    }
  }

  private prepareDecrypt(chars: EffectCharacter[]): void {
    for (const ch of chars) {
      const cipherColor = randChoice(this.config.ciphertextColors);

      const fastScene = ch.newScene("fast_decrypt");
      for (let i = 0; i < 80; i++) {
        fastScene.addFrame(randChoice(ENCRYPTED_SYMBOLS), 2, cipherColor.rgbHex);
      }

      const slowScene = ch.newScene("slow_decrypt");
      const slowCount = randInt(1, 15);
      for (let i = 0; i < slowCount; i++) {
        const duration = randInt(0, 100) <= 30 ? randInt(35, 59) : randInt(3, 5);
        slowScene.addFrame(randChoice(ENCRYPTED_SYMBOLS), duration, cipherColor.rgbHex);
      }

      const finalColor = this.characterFinalColorMap.get(ch.id)!;
      const discoveredScene = ch.newScene("discovered");
      const discoveredGradient = new Gradient([color("ffffff"), finalColor], 10);
      discoveredScene.applyGradientToSymbols(ch.inputSymbol, 5, discoveredGradient);

      ch.eventHandler.register("SCENE_COMPLETE", "fast_decrypt", "ACTIVATE_SCENE", "slow_decrypt");
      ch.eventHandler.register("SCENE_COMPLETE", "slow_decrypt", "ACTIVATE_SCENE", "discovered");

      this.decryptingChars.add(ch);
    }
  }

  step(): boolean {
    if (this.phase === "typing") {
      if (this.typingPending.length > 0 || this.activeChars.size > 0) {
        if (this.typingPending.length > 0 && Math.random() <= 0.75) {
          for (let i = 0; i < this.config.typingSpeed && this.typingPending.length > 0; i++) {
            const ch = this.typingPending.shift()!;
            ch.isVisible = true;
            ch.activateScene("typing");
            this.activeChars.add(ch);
          }
        }

        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }

      this.phase = "decrypting";
      this.activeChars = new Set(this.decryptingChars);
      for (const ch of this.activeChars) {
        ch.activateScene("fast_decrypt");
      }
    }

    if (this.phase === "decrypting") {
      if (this.activeChars.size > 0) {
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }
        return true;
      }
      return false;
    }

    return false;
  }
}
