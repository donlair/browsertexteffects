import { Color, EasingFunction, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { outBounce } from "../easing";

export interface BouncyBallsConfig {
  ballColors: Color[];
  ballSymbols: string[];
  ballDelay: number;
  movementSpeed: number;
  movementEasing: EasingFunction;
  bounceCount: number;
  holdFrames: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBouncyBallsConfig: BouncyBallsConfig = {
  ballColors: [color("d1f4a5"), color("96e2a4"), color("5acda9")],
  ballSymbols: ["*", "o", "O", "0", "."],
  ballDelay: 7,
  movementSpeed: 0.25,
  movementEasing: outBounce,
  bounceCount: 3,
  holdFrames: 15,
  finalGradientStops: [color("f8ffae"), color("43c6ac")],
  finalGradientSteps: 12,
  finalGradientFrames: 6,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class BouncyBallsEffect {
  private canvas: Canvas;
  private config: BouncyBallsConfig;
  private activeChars: Set<EffectCharacter> = new Set();
  private pendingChars: EffectCharacter[] = [];
  private tickCount = 0;
  private ticksSinceLastDrop = 0;

  constructor(canvas: Canvas, config: BouncyBallsConfig) {
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

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }

      // Start above the canvas top
      const launchCol = ch.inputCoord.column;
      const launchRow = dims.top + randInt(3, 8);
      ch.motion.setCoordinate({ column: launchCol, row: launchRow });

      // Bounce path: drop to input position, loop for repeated bounces
      const bouncePath = ch.motion.newPath("bounce", {
        speed: this.config.movementSpeed,
        ease: this.config.movementEasing,
        loop: true,
        totalLoops: this.config.bounceCount,
        holdDuration: this.config.holdFrames,
      });
      bouncePath.addWaypoint(ch.inputCoord);

      // Assign random ball color and symbol
      const ballColor = pick(this.config.ballColors);
      const ballSymbol = pick(this.config.ballSymbols);

      // Ball scene (plays during bounce) — uses ball symbol and color
      const ballScene = ch.newScene("ball", true);
      ballScene.addFrame(ballSymbol, 1, { fgColor: ballColor });

      // Landing scene — transitions from ball color to final color, restoring input symbol
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];
      const landScene = ch.newScene("land");
      const charGradient = new Gradient([ballColor, finalColor], 10);
      landScene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);

      // When hold starts or path completes, switch to landing scene
      ch.eventHandler.register("PATH_HOLDING", "bounce", "ACTIVATE_SCENE", "land");
      ch.eventHandler.register("PATH_COMPLETE", "bounce", "ACTIVATE_SCENE", "land");

      this.pendingChars.push(ch);
    }

    // Shuffle for staggered launch
    for (let i = this.pendingChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pendingChars[i], this.pendingChars[j]] = [this.pendingChars[j], this.pendingChars[i]];
    }
  }

  step(): boolean {
    this.tickCount++;
    this.ticksSinceLastDrop++;

    // Launch characters based on ballDelay
    if (this.pendingChars.length > 0 && this.ticksSinceLastDrop >= this.config.ballDelay) {
      this.ticksSinceLastDrop = 0;
      const dropCount = randInt(2, 6);
      for (let i = 0; i < dropCount && this.pendingChars.length > 0; i++) {
        const ch = this.pendingChars.shift()!;
        ch.isVisible = true;
        ch.motion.activatePath("bounce");
        ch.activateScene("ball");
        this.activeChars.add(ch);
      }
    }

    for (const ch of this.activeChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.activeChars.size > 0 || this.pendingChars.length > 0;
  }
}
