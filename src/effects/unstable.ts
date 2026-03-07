import { type Color, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
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
  private jumbledCoords = new Map<EffectCharacter, { column: number; row: number }>();
  private phase: "rumble" | "explosion" | "reassembly" = "rumble";
  private rumbleStep = 0;
  private rumbleModDelay = 18;
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

      // Store jumbled coord for rumble phase reset
      this.jumbledCoords.set(ch, { ...jumbledCoord });

      // Pick random edge target for explosion (matches Python: 0=left,1=right,2=bottom,3=top)
      const wall = randInt(0, 3);
      let edgeCol: number;
      let edgeRow: number;
      if (wall === 0) { // left
        edgeCol = dims.left;
        edgeRow = randInt(dims.bottom, dims.top);
      } else if (wall === 1) { // right
        edgeCol = dims.right;
        edgeRow = randInt(dims.bottom, dims.top);
      } else if (wall === 2) { // bottom
        edgeCol = randInt(dims.left, dims.right);
        edgeRow = dims.bottom;
      } else { // top
        edgeCol = randInt(dims.left, dims.right);
        edgeRow = dims.top;
      }

      // Explosion path
      const explosionPath = ch.motion.newPath("explosion", this.config.explosionSpeed, this.config.explosionEase);
      explosionPath.addWaypoint({ column: edgeCol, row: edgeRow });

      // Reassembly path
      const reassemblyPath = ch.motion.newPath("reassembly", this.config.reassemblySpeed, this.config.reassemblyEase);
      reassemblyPath.addWaypoint(ch.inputCoord);

      // Rumble scene: gradient from final color toward unstable color (non-looping, matches Python default)
      // steps=12, duration=10 matches Python exactly
      const rumbleScene = ch.newScene("rumble");
      const rumbleGradient = new Gradient([finalColor, this.config.unstableColor], 12);
      rumbleScene.applyGradientToSymbols(ch.inputSymbol, 10, rumbleGradient);

      // Final scene: gradient from unstable color back to final color
      // steps=12, duration=3 matches Python exactly
      const finalScene = ch.newScene("final");
      const finalSceneGradient = new Gradient([this.config.unstableColor, finalColor], 12);
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

    // Reset all chars to their jumbled positions each tick.
    // During rumble there is no active path, so motion.move() is a no-op — setCoordinate()
    // directly controls currentCoord. Python resets after rendering each jitter frame; TS
    // resets before tick(). Net effect: on non-jitter ticks chars sit at jumbledCoord; on
    // jitter ticks, the reset is overwritten below before tick(), so the renderer sees the
    // jitter. Functionally equivalent to Python's jitter-then-render-then-reset pattern.
    for (const ch of this.nonSpaceChars) {
      const coord = this.jumbledCoords.get(ch);
      if (!coord) continue;
      ch.motion.setCoordinate(coord);
    }

    // Apply jitter: Python condition is steps > 30 AND steps % mod_delay == 0.
    // All chars move by the SAME shared offset (synchronized shake, not independent drift).
    if (this.rumbleStep > 30 && this.rumbleStep % this.rumbleModDelay === 0) {
      const rowOffset = randInt(-1, 1);
      const colOffset = randInt(-1, 1);
      for (const ch of this.nonSpaceChars) {
        const base = this.jumbledCoords.get(ch);
        if (!base) continue;
        ch.motion.setCoordinate({ column: base.column + colOffset, row: base.row + rowOffset });
      }
      // Accelerate jitter frequency
      this.rumbleModDelay = Math.max(this.rumbleModDelay - 1, 1);
    }

    // Advance animation (scene frames) for all chars
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
