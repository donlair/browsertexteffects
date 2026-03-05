import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { inOutCubic } from "../easing";

export interface ErrorCorrectConfig {
  errorPairs: number; // 0-1.0, fraction of chars to pair-swap
  swapDelay: number; // frames between pair activations
  errorColor: Color;
  correctColor: Color;
  movementSpeed: number;
  movementEasing: EasingFunction;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultErrorCorrectConfig: ErrorCorrectConfig = {
  errorPairs: 0.1,
  swapDelay: 6,
  errorColor: color("e74c3c"),
  correctColor: color("45bf55"),
  movementSpeed: 0.9,
  movementEasing: inOutCubic,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

interface SwapPair {
  a: EffectCharacter;
  b: EffectCharacter;
  activated: boolean;
}

export class ErrorCorrectEffect {
  private canvas: Canvas;
  private config: ErrorCorrectConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private pairs: SwapPair[] = [];
  private pairIndex = 0;
  private delayCounter = 0;
  private allPairsActivated = false;

  constructor(canvas: Canvas, config: ErrorCorrectConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Collect non-space characters
    const nonSpaceChars: EffectCharacter[] = [];
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      nonSpaceChars.push(ch);
    }

    // Determine how many pairs to create — Python: floor(error_pairs * total_chars) iterations each creating 1 pair
    const numPairs = Math.max(1, Math.floor(nonSpaceChars.length * this.config.errorPairs));

    // Shuffle and pick pairs
    const shuffled = [...nonSpaceChars];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const pairedSet = new Set<EffectCharacter>();
    for (let i = 0; i < numPairs * 2 && i + 1 < shuffled.length; i += 2) {
      this.pairs.push({ a: shuffled[i], b: shuffled[i + 1], activated: false });
      pairedSet.add(shuffled[i]);
      pairedSet.add(shuffled[i + 1]);
    }

    // Build scenes and paths for each character
    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];

      if (pairedSet.has(ch)) {
        this.buildSwappedChar(ch, finalColor);
      } else {
        // Non-swapped chars: just show with final gradient immediately
        ch.isVisible = true;
        const scene = ch.newScene("final");
        const grad = new Gradient([this.config.finalGradientStops[0], finalColor], 8);
        scene.applyGradientToSymbols(ch.inputSymbol, 2, grad);
        ch.activateScene(scene);
        this.activeChars.add(ch);
      }
    }
  }

  private buildSwappedChar(ch: EffectCharacter, finalColor: Color): void {
    const errorColor = this.config.errorColor.rgbHex;
    const correctColor = this.config.correctColor.rgbHex;
    const blockWipeUp = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const blockWipeDown = ["▇", "▆", "▅", "▄", "▃", "▂", "▁"];

    // Python: all chars (including swapped) start visible with a 1-frame initial_scene in error_color,
    // so swapped chars appear red while waiting for their pair turn
    const spawnScene = ch.newScene("spawn");
    spawnScene.addFrame(ch.inputSymbol, 1, errorColor);
    ch.activateScene(spawnScene);
    ch.isVisible = true;

    // --- error scene: alternating block/symbol blink (10 iterations, duration=3 each frame) ---
    const errorScene = ch.newScene("error");
    for (let i = 0; i < 10; i++) {
      errorScene.addFrame("▓", 3, errorColor);
      errorScene.addFrame(ch.inputSymbol, 3, "ffffff");
    }

    // --- first_block_wipe: block wipe up in error color (duration=3 per frame) ---
    const firstWipe = ch.newScene("first_block_wipe");
    for (const block of blockWipeUp) {
      firstWipe.addFrame(block, 3, errorColor);
    }

    // --- correcting scene: gradient from error → correct color, uses "█" symbol (steps=10, duration=3) ---
    const correctingScene = ch.newScene("correcting");
    const correctGrad = new Gradient([this.config.errorColor, this.config.correctColor], 10);
    correctingScene.applyGradientToSymbols("█", 3, correctGrad);

    // --- last_block_wipe: block wipe down in correct color (duration=3 per frame) ---
    const lastWipe = ch.newScene("last_block_wipe");
    for (const block of blockWipeDown) {
      lastWipe.addFrame(block, 3, correctColor);
    }

    // --- final scene: gradient from correct → final gradient color (steps=10, duration=3) ---
    const finalScene = ch.newScene("final");
    const finalGrad = new Gradient([this.config.correctColor, finalColor], 10);
    finalScene.applyGradientToSymbols(ch.inputSymbol, 3, finalGrad);

    // --- motion path back to input coord ---
    const path = ch.motion.newPath("correct_path", this.config.movementSpeed, this.config.movementEasing);
    path.addWaypoint(ch.inputCoord);

    // --- event chain (matches Python) ---
    // error scene complete → activate first_block_wipe
    ch.eventHandler.register("SCENE_COMPLETE", "error", "ACTIVATE_SCENE", "first_block_wipe");

    // first_block_wipe complete → activate path + correcting scene
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "ACTIVATE_PATH", "correct_path");
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "ACTIVATE_SCENE", "correcting");

    // path activated → raise layer (matches Python PATH_ACTIVATED → SET_LAYER 1)
    ch.eventHandler.register("PATH_ACTIVATED", "correct_path", "SET_LAYER", 1);

    // path complete → drop layer + activate last_block_wipe (matches Python PATH_COMPLETE events)
    ch.eventHandler.register("PATH_COMPLETE", "correct_path", "SET_LAYER", 0);
    ch.eventHandler.register("PATH_COMPLETE", "correct_path", "ACTIVATE_SCENE", "last_block_wipe");

    // last_block_wipe complete → activate final scene
    ch.eventHandler.register("SCENE_COMPLETE", "last_block_wipe", "ACTIVATE_SCENE", "final");
  }

  private activatePair(pair: SwapPair): void {
    pair.activated = true;

    // Swap positions: a goes to b's input coord, b goes to a's input coord
    const aCoord = pair.a.inputCoord;
    const bCoord = pair.b.inputCoord;

    pair.a.motion.setCoordinate({ column: bCoord.column, row: bCoord.row });
    pair.b.motion.setCoordinate({ column: aCoord.column, row: aCoord.row });

    // isVisible already set in buildSwappedChar; activate_scene("error") overrides spawn scene
    pair.a.activateScene("error");
    pair.b.activateScene("error");

    this.activeChars.add(pair.a);
    this.activeChars.add(pair.b);
  }

  step(): boolean {
    // Stagger pair activation
    if (this.pairIndex < this.pairs.length) {
      if (this.delayCounter === 0) {
        this.activatePair(this.pairs[this.pairIndex]);
        this.pairIndex++;
        this.delayCounter = this.config.swapDelay;
      } else {
        this.delayCounter--;
      }
    } else if (!this.allPairsActivated) {
      this.allPairsActivated = true;
    }

    // Tick all active characters
    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.activeChars.size > 0 || this.pairIndex < this.pairs.length;
  }
}
