import { Color, EasingFunction, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { outExpo } from "../easing";

export interface UnstableConfig {
  unstableColor: Color;
  explosionEase: EasingFunction;
  explosionSpeed: number;
  reassemblyEase: EasingFunction;
  reassemblySpeed: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultUnstableConfig: UnstableConfig = {
  unstableColor: color("ff9200"),
  explosionEase: outExpo,
  explosionSpeed: 1,
  reassemblyEase: outExpo,
  reassemblySpeed: 1,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class UnstableEffect {
  private canvas: Canvas;
  private config: UnstableConfig;
  private nonSpaceChars: EffectCharacter[] = [];
  private phase: "rumble" | "explosion" | "reassembly" = "rumble";
  private rumbleStep = 0;
  private rumbleModDelay = 18;
  private rumbleDelayCounter = 0;
  private holdTicks = 0;
  private explosionStarted = false;
  private reassemblyStarted = false;

  constructor(canvas: Canvas, config: UnstableConfig) {
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

    const nonSpace = this.canvas.getNonSpaceCharacters();
    this.nonSpaceChars = nonSpace;

    // Shuffle input coords for jumbled starting positions
    const inputCoords = nonSpace.map((ch) => ({ ...ch.inputCoord }));
    shuffle(inputCoords);

    for (let i = 0; i < nonSpace.length; i++) {
      const ch = nonSpace[i];
      const jumbledCoord = inputCoords[i];
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[0];

      // Pick random edge target for explosion
      const wall = randInt(0, 3);
      let edgeCol: number;
      let edgeRow: number;
      if (wall === 0) { // top
        edgeCol = randInt(dims.left, dims.right);
        edgeRow = dims.top + randInt(1, 3);
      } else if (wall === 1) { // bottom
        edgeCol = randInt(dims.left, dims.right);
        edgeRow = dims.bottom - randInt(1, 3);
      } else if (wall === 2) { // left
        edgeCol = dims.left - randInt(1, 3);
        edgeRow = randInt(dims.bottom, dims.top);
      } else { // right
        edgeCol = dims.right + randInt(1, 3);
        edgeRow = randInt(dims.bottom, dims.top);
      }

      // Explosion path
      const explosionPath = ch.motion.newPath("explosion", this.config.explosionSpeed, this.config.explosionEase);
      explosionPath.addWaypoint({ column: edgeCol, row: edgeRow });

      // Reassembly path
      const reassemblyPath = ch.motion.newPath("reassembly", this.config.reassemblySpeed, this.config.reassemblyEase);
      reassemblyPath.addWaypoint(ch.inputCoord);

      // Rumble scene: gradient from final color toward unstable color (looping)
      const rumbleScene = ch.newScene("rumble", true);
      const rumbleGradient = new Gradient([finalColor, this.config.unstableColor], 10);
      rumbleScene.applyGradientToSymbols(ch.inputSymbol, 3, rumbleGradient);

      // Final scene: gradient from unstable color back to final color
      const finalScene = ch.newScene("final");
      const finalSceneGradient = new Gradient([this.config.unstableColor, finalColor], 10);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 3, finalSceneGradient);

      // Place at jumbled position and make visible
      ch.motion.setCoordinate(jumbledCoord);
      ch.isVisible = true;
      ch.activateScene("rumble");
    }

    // Show spaces immediately
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) {
        ch.isVisible = true;
      }
    }
  }

  step(): boolean {
    if (this.phase === "rumble") {
      return this.stepRumble();
    } else if (this.phase === "explosion") {
      return this.stepExplosion();
    } else {
      return this.stepReassembly();
    }
  }

  private stepRumble(): boolean {
    this.rumbleStep++;

    // Apply jitter every rumbleModDelay ticks
    this.rumbleDelayCounter++;
    if (this.rumbleDelayCounter >= this.rumbleModDelay) {
      this.rumbleDelayCounter = 0;
      for (const ch of this.nonSpaceChars) {
        const jitterCol = ch.motion.currentCoord.column + randInt(-1, 1);
        const jitterRow = ch.motion.currentCoord.row + randInt(-1, 1);
        ch.motion.setCoordinate({ column: jitterCol, row: jitterRow });
      }
      // Accelerate jitter
      if (this.rumbleModDelay > 1) {
        this.rumbleModDelay--;
      }
    }

    // Tick all chars for scene advancement
    for (const ch of this.nonSpaceChars) {
      ch.tick();
    }

    if (this.rumbleStep >= 150) {
      this.phase = "explosion";
    }

    return true;
  }

  private stepExplosion(): boolean {
    if (!this.explosionStarted) {
      for (const ch of this.nonSpaceChars) {
        ch.motion.activatePath("explosion");
      }
      this.explosionStarted = true;
    }

    let allComplete = true;
    for (const ch of this.nonSpaceChars) {
      ch.tick();
      if (!ch.motion.movementIsComplete()) {
        allComplete = false;
      }
    }

    if (allComplete) {
      this.holdTicks++;
      if (this.holdTicks >= 30) {
        this.phase = "reassembly";
      }
    }

    return true;
  }

  private stepReassembly(): boolean {
    if (!this.reassemblyStarted) {
      for (const ch of this.nonSpaceChars) {
        ch.activateScene("final");
        ch.motion.activatePath("reassembly");
      }
      this.reassemblyStarted = true;
    }

    let anyActive = false;
    for (const ch of this.nonSpaceChars) {
      ch.tick();
      if (ch.isActive) {
        anyActive = true;
      }
    }

    return anyActive;
  }
}
