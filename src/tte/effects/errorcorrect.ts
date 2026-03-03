import { Color, EasingFunction, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
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

    const errorColor = this.config.errorColor.rgbHex;
    const correctColor = this.config.correctColor.rgbHex;

    // Collect non-space characters
    const nonSpaceChars: EffectCharacter[] = [];
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }
      nonSpaceChars.push(ch);
    }

    // Determine how many pairs to create
    const numPairs = Math.max(1, Math.floor((nonSpaceChars.length * this.config.errorPairs) / 2));

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
        this.buildSwappedChar(ch, errorColor, correctColor, finalColor);
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

  private buildSwappedChar(
    ch: EffectCharacter,
    errorColor: string,
    correctColor: string,
    finalColor: Color,
  ): void {
    const blockWipeUp = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const blockWipeDown = ["▇", "▆", "▅", "▄", "▃", "▂", "▁"];

    // --- error scene: alternating block/symbol blink ---
    const errorScene = ch.newScene("error");
    for (let i = 0; i < 5; i++) {
      errorScene.addFrame("▓", 2, errorColor);
      errorScene.addFrame(ch.inputSymbol, 2, "ffffff");
    }

    // --- first_block_wipe: block wipe up in error color ---
    const firstWipe = ch.newScene("first_block_wipe");
    for (const block of blockWipeUp) {
      firstWipe.addFrame(block, 2, errorColor);
    }

    // --- correcting scene: gradient from error → correct color ---
    const correctingScene = ch.newScene("correcting");
    const correctGrad = new Gradient([this.config.errorColor, this.config.correctColor], 12);
    correctingScene.applyGradientToSymbols(ch.inputSymbol, 1, correctGrad);

    // --- last_block_wipe: block wipe down in correct color ---
    const lastWipe = ch.newScene("last_block_wipe");
    for (const block of blockWipeDown) {
      lastWipe.addFrame(block, 2, correctColor);
    }

    // --- final scene: gradient from correct → final gradient color ---
    const finalScene = ch.newScene("final");
    const finalGrad = new Gradient([this.config.correctColor, finalColor], 8);
    finalScene.applyGradientToSymbols(ch.inputSymbol, 2, finalGrad);

    // --- motion path back to input coord ---
    const path = ch.motion.newPath("correct_path", this.config.movementSpeed, this.config.movementEasing);
    path.addWaypoint(ch.inputCoord);

    // --- event chain ---
    // error scene complete → activate first_block_wipe
    ch.eventHandler.register("SCENE_COMPLETE", "error", "ACTIVATE_SCENE", "first_block_wipe");

    // first_block_wipe complete → activate path + correcting scene + raise layer
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "SET_LAYER", 1);
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "ACTIVATE_PATH", "correct_path");
    ch.eventHandler.register("SCENE_COMPLETE", "first_block_wipe", "ACTIVATE_SCENE", "correcting");

    // correcting scene complete → activate last_block_wipe
    ch.eventHandler.register("SCENE_COMPLETE", "correcting", "ACTIVATE_SCENE", "last_block_wipe");

    // last_block_wipe complete → activate final scene + drop layer
    ch.eventHandler.register("SCENE_COMPLETE", "last_block_wipe", "SET_LAYER", 0);
    ch.eventHandler.register("SCENE_COMPLETE", "last_block_wipe", "ACTIVATE_SCENE", "final");
  }

  private activatePair(pair: SwapPair): void {
    pair.activated = true;

    // Swap positions: a goes to b's input coord, b goes to a's input coord
    const aCoord = pair.a.inputCoord;
    const bCoord = pair.b.inputCoord;

    pair.a.motion.setCoordinate({ column: bCoord.column, row: bCoord.row });
    pair.b.motion.setCoordinate({ column: aCoord.column, row: aCoord.row });

    pair.a.isVisible = true;
    pair.b.isVisible = true;

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
