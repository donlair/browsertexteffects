import { Color, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { outBounce, outExpo } from "../easing";

export interface CrumbleConfig {
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultCrumbleConfig: CrumbleConfig = {
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
};

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const DUST_SYMBOLS = ["*", ".", ",", "·"];
const DUST_COLOR = color("333333");

export class CrumbleEffect {
  private canvas: Canvas;
  private config: CrumbleConfig;
  private nonSpaceChars: EffectCharacter[] = [];
  private phase: "falling" | "vacuuming" | "resetting" = "falling";
  private fallQueue: EffectCharacter[] = [];
  private activeChars: EffectCharacter[] = [];
  private fallTick = 0;
  private releaseRate = 1;
  private vacuumingStarted = false;
  private resettingStarted = false;

  constructor(canvas: Canvas, config: CrumbleConfig) {
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

    const midCol = Math.round((dims.left + dims.right) / 2);
    const midRow = Math.round((dims.top + 1) / 2);

    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
        continue;
      }

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];

      // "fall" scene (looping) — cycles through dust symbols, fading from final color to dark gray
      const dustGradient = new Gradient([finalColor, DUST_COLOR], DUST_SYMBOLS.length);
      const fallScene = ch.newScene("fall", true);
      for (let i = 0; i < DUST_SYMBOLS.length; i++) {
        const frameColor = dustGradient.spectrum[i] || DUST_COLOR;
        fallScene.addFrame(DUST_SYMBOLS[i], 3, frameColor.rgbHex);
      }

      // "final" scene — white flash then gradient back to final color
      const finalScene = ch.newScene("final");
      finalScene.addFrame(ch.inputSymbol, 2, "FFFFFF");
      const finalSceneGradient = new Gradient([color("FFFFFF"), finalColor], 10);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 3, finalSceneGradient);

      // "fall" path — drop to row 1 (canvas bottom) with bounce easing
      const fallPath = ch.motion.newPath("fall", 0.3, outBounce);
      fallPath.addWaypoint({ column: ch.inputCoord.column, row: 1 });

      // "vacuum" path — sucked upward via midpoint to canvas top
      const vacuumPath = ch.motion.newPath("vacuum", 0.5, outExpo);
      vacuumPath.addWaypoint({ column: midCol, row: midRow });
      vacuumPath.addWaypoint({ column: ch.inputCoord.column, row: dims.top });

      // "return" path — back to original input position
      const returnPath = ch.motion.newPath("return", 0.7, outExpo);
      returnPath.addWaypoint(ch.inputCoord);

      ch.isVisible = false;
      this.fallQueue.push(ch);
      this.nonSpaceChars.push(ch);
    }

    shuffle(this.fallQueue);
  }

  step(): boolean {
    if (this.phase === "falling") {
      return this.stepFalling();
    } else if (this.phase === "vacuuming") {
      return this.stepVacuuming();
    } else {
      return this.stepResetting();
    }
  }

  private stepFalling(): boolean {
    this.fallTick++;

    // Increase release rate every 15 ticks, max 5
    if (this.fallTick % 15 === 0 && this.releaseRate < 5) {
      this.releaseRate++;
    }

    for (let i = 0; i < this.releaseRate && this.fallQueue.length > 0; i++) {
      const ch = this.fallQueue.shift()!;
      ch.isVisible = true;
      ch.activateScene("fall");
      ch.motion.activatePath("fall");
      this.activeChars.push(ch);
    }

    for (const ch of this.activeChars) {
      ch.tick();
    }

    if (this.fallQueue.length === 0 && this.activeChars.every((ch) => ch.motion.movementIsComplete())) {
      this.phase = "vacuuming";
    }

    return true;
  }

  private stepVacuuming(): boolean {
    if (!this.vacuumingStarted) {
      for (const ch of this.activeChars) {
        ch.motion.activatePath("vacuum");
      }
      this.vacuumingStarted = true;
    }

    for (const ch of this.activeChars) {
      ch.tick();
    }

    if (this.activeChars.every((ch) => ch.motion.movementIsComplete())) {
      this.phase = "resetting";
    }

    return true;
  }

  private stepResetting(): boolean {
    if (!this.resettingStarted) {
      for (const ch of this.activeChars) {
        ch.activateScene("final");
        ch.motion.activatePath("return");
      }
      this.resettingStarted = true;
    }

    for (const ch of this.activeChars) {
      ch.tick();
    }

    return this.activeChars.some((ch) => ch.isActive);
  }
}
