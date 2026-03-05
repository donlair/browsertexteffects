import { type Color, type Coord, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { findCoordsOnCircle, findCoordsInCircle } from "../geometry";
import { inOutSine, inExpo, outExpo, inCubic } from "../easing";

export interface BlackholeConfig {
  blackholeColor: Color;
  starColors: Color[];
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBlackholeConfig: BlackholeConfig = {
  blackholeColor: color("ffffff"),
  starColors: [
    color("ffcc0d"), color("ff7326"), color("ff194d"),
    color("bf2669"), color("702a8c"), color("049dbf"),
  ],
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 9,
  finalGradientFrames: 10,
  finalGradientDirection: "diagonal",
};

const STAR_SYMBOLS = ["*", "'", "`", "¤", "•", "°", "·"];
const UNSTABLE_SYMBOLS = ["◦", "◎", "◉", "●", "◉", "◎", "◦"];

type Phase = "forming" | "consuming" | "collapsing" | "exploding" | "complete";

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class BlackholeEffect {
  private canvas: Canvas;
  private config: BlackholeConfig;

  private ringChars: EffectCharacter[] = [];
  private starfieldChars: EffectCharacter[] = [];
  private activeRingChars: Set<EffectCharacter> = new Set();
  private activeStarChars: Set<EffectCharacter> = new Set();
  private activeChars: Set<EffectCharacter> = new Set();

  private center: Coord = { column: 1, row: 1 };
  private blackholeRadius = 3;
  private ringCoords: Coord[] = [];

  private phase: Phase = "forming";
  private phaseFrames = 0;

  private ringActivationDelays: number[] = [];
  private colorMapping: Map<string, Color> = new Map();
  private pathCounter = 0;

  constructor(canvas: Canvas, config: BlackholeConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    // Compute center
    this.center = {
      column: Math.round((dims.left + dims.right) / 2),
      row: Math.round((dims.bottom + dims.top) / 2),
    };

    // Compute blackhole radius
    const canvasWidth = dims.right - dims.left + 1;
    const canvasHeight = dims.top - dims.bottom + 1;
    this.blackholeRadius = Math.max(
      3,
      Math.min(Math.round(canvasWidth * 0.3), Math.round(canvasHeight * 0.2)),
    );

    // Build final gradient color mapping
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Partition characters
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(nonSpaceChars);

    const ringCount = Math.min(
      Math.max(3, Math.round(this.blackholeRadius * 3)),
      nonSpaceChars.length,
    );

    this.ringChars = nonSpaceChars.slice(0, ringCount);
    this.starfieldChars = nonSpaceChars.slice(ringCount);

    // Generate ring coords matching exactly ringCount evenly-spaced positions
    this.ringCoords = findCoordsOnCircle(this.center, this.blackholeRadius, ringCount);

    // All characters start invisible
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      if (!ch.isSpace) {
        ch.currentVisual = { symbol: " ", fgColor: null };
      }
    }

    // Build ring character scenes and paths
    const staggerStep = Math.max(Math.floor(100 / ringCount), 6);
    for (let i = 0; i < this.ringChars.length; i++) {
      const ch = this.ringChars[i];
      this.ringActivationDelays.push(i * staggerStep);

      // Ring color scene (looping)
      const ringScene = ch.newScene("ring_color", true);
      ringScene.addFrame("*", 1, this.config.blackholeColor.rgbHex);

      // Form path: current position → assigned ring coord
      const ringTarget = this.ringCoords[i % this.ringCoords.length];
      const formId = `form_${i}`;
      const formPath = ch.motion.newPath(formId, { speed: 0.7, ease: inOutSine });
      formPath.addWaypoint(ringTarget);

      // Orbit path: looping, traverse all ring coords
      const orbitId = `orbit_${i}`;
      const startIdx = i % this.ringCoords.length;
      const orbitPath = ch.motion.newPath(orbitId, {
        speed: 0.45,
        loop: true,
        totalLoops: 0,
      });
      for (let j = 0; j < this.ringCoords.length; j++) {
        const idx = (startIdx + j) % this.ringCoords.length;
        orbitPath.addWaypoint(this.ringCoords[idx]);
      }
      // Close the loop back to start
      orbitPath.addWaypoint(this.ringCoords[startIdx]);

      // Event: form path complete → activate orbit
      ch.eventHandler.register("PATH_COMPLETE", formId, "ACTIVATE_PATH", orbitId);
    }
  }

  private transitionToConsuming(): void {
    this.phase = "consuming";
    this.phaseFrames = 0;

    const { dims } = this.canvas;

    for (const ch of this.starfieldChars) {
      const starColor = this.config.starColors[
        Math.floor(Math.random() * this.config.starColors.length)
      ];
      const starSymbol = STAR_SYMBOLS[Math.floor(Math.random() * STAR_SYMBOLS.length)];

      // Star scene: looping, star symbol with star color fading toward black
      const starScene = ch.newScene("star", true);
      const fadeGrad = new Gradient([starColor, color("000000")], 6);
      starScene.applyGradientToSymbols(starSymbol, 2, fadeGrad);

      // Place at random canvas position
      const randomCoord: Coord = {
        column: randInt(dims.left, dims.right),
        row: randInt(dims.bottom, dims.top),
      };
      ch.motion.setCoordinate(randomCoord);

      // Singularity path: spiral waypoints toward center
      const singId = `sing_${this.pathCounter++}`;
      const singPath = ch.motion.newPath(singId, {
        speed: randRange(0.17, 0.30),
        ease: inExpo,
      });
      this.buildSpiralWaypoints(singPath, randomCoord);

      ch.currentVisual = { symbol: starSymbol, fgColor: starColor.rgbHex };
      ch.activateScene("star");
      ch.motion.activatePath(singId);
      this.activeStarChars.add(ch);
    }
  }

  private buildSpiralWaypoints(path: ReturnType<EffectCharacter["motion"]["newPath"]>, start: Coord): void {
    // Create intermediate waypoints at shrinking radii with angular offsets
    const steps = 4;
    const startAngle = Math.atan2(
      start.row - this.center.row,
      start.column - this.center.column,
    );

    for (let s = 1; s <= steps; s++) {
      const fraction = s / (steps + 1);
      const radius = this.blackholeRadius * (1 - fraction);
      if (radius < 1) break;

      // Rotate ~90 degrees per step for spiral feel
      const angle = startAngle + (Math.PI / 2) * s;
      const wp: Coord = {
        column: Math.round(this.center.column + radius * 2 * Math.cos(angle)),
        row: Math.round(this.center.row + radius * Math.sin(angle)),
      };
      path.addWaypoint(wp);
    }
    path.addWaypoint(this.center);
  }

  private transitionToCollapsing(): void {
    this.phase = "collapsing";
    this.phaseFrames = 0;

    // Generate expand positions: ring at radius+3, one position per ring char
    const expandRingCoords = findCoordsOnCircle(
      this.center,
      this.blackholeRadius + 3,
      this.ringChars.length,
    );

    let pointCharMade = false;
    for (let i = 0; i < this.ringChars.length; i++) {
      const ch = this.ringChars[i];
      ch.motion.activePath = null;

      const expandId = `expand_${this.pathCounter}`;
      const expandPath = ch.motion.newPath(expandId, { speed: 0.2, ease: inExpo });
      expandPath.addWaypoint(expandRingCoords[i % expandRingCoords.length]);

      const collapseId = `collapse_${this.pathCounter}`;
      const collapsePath = ch.motion.newPath(collapseId, { speed: 0.3, ease: inExpo });
      collapsePath.addWaypoint(this.center);

      // Event: expand complete → activate collapse
      ch.eventHandler.register("PATH_COMPLETE", expandId, "ACTIVATE_PATH", collapseId);

      // First char only: unstable scene activates after collapse completes
      if (!pointCharMade) {
        const unstableScene = ch.newScene("unstable");
        for (let rep = 0; rep < 3; rep++) {
          for (const sym of UNSTABLE_SYMBOLS) {
            const col = this.config.starColors[
              Math.floor(Math.random() * this.config.starColors.length)
            ];
            unstableScene.addFrame(sym, 3, col.rgbHex);
          }
        }
        ch.eventHandler.register("PATH_COMPLETE", collapseId, "ACTIVATE_SCENE", "unstable");
        pointCharMade = true;
      }

      ch.motion.activatePath(expandId);
      this.pathCounter++;
    }
  }

  private transitionToExploding(): void {
    this.phase = "exploding";
    this.phaseFrames = 0;

    // Hide all ring chars first
    for (const ch of this.ringChars) {
      ch.currentVisual = { symbol: " ", fgColor: null };
    }

    // ALL non-space chars participate
    const allNonSpace = this.canvas.getNonSpaceCharacters();

    for (const ch of allNonSpace) {
      // Place at center
      ch.motion.setCoordinate({ ...this.center });

      // Pick explosion color
      const explosionColor = this.config.starColors[
        Math.floor(Math.random() * this.config.starColors.length)
      ];

      // Final color from gradient mapping
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) || this.config.finalGradientStops[0];

      // Explosion scene: gradient from explosion color to final color
      const explosionScene = ch.newScene("explosion");
      const explosionGrad = new Gradient(
        [explosionColor, finalColor],
        this.config.finalGradientFrames,
      );
      explosionScene.applyGradientToSymbols(ch.inputSymbol, 20, explosionGrad);

      // Scatter target: random coord near inputCoord
      const scatterCoords = findCoordsInCircle(ch.inputCoord, 3);
      const scatterTarget = scatterCoords.length > 0
        ? scatterCoords[Math.floor(Math.random() * scatterCoords.length)]
        : { ...ch.inputCoord };

      // Path 1: center → scatter target
      const scatterId = `scatter_${this.pathCounter}`;
      const scatterPath = ch.motion.newPath(scatterId, {
        speed: randRange(0.3, 0.4),
        ease: outExpo,
      });
      scatterPath.addWaypoint(scatterTarget);

      // Path 2: scatter target → inputCoord
      const returnId = `return_${this.pathCounter}`;
      const returnPath = ch.motion.newPath(returnId, {
        speed: randRange(0.04, 0.06),
        ease: inCubic,
      });
      returnPath.addWaypoint(ch.inputCoord);

      // Event chain: scatter complete → activate return + explosion scene
      ch.eventHandler.register("PATH_COMPLETE", scatterId, "ACTIVATE_PATH", returnId);
      ch.eventHandler.register("PATH_COMPLETE", scatterId, "ACTIVATE_SCENE", "explosion");

      // Make visible and start
      ch.currentVisual = { symbol: ch.inputSymbol, fgColor: explosionColor.rgbHex };
      ch.motion.activatePath(scatterId);
      this.activeChars.add(ch);
      this.pathCounter++;
    }
  }

  step(): boolean {
    if (this.phase === "complete") return false;

    this.phaseFrames++;

    switch (this.phase) {
      case "forming": {
        // Stagger ring char activation
        for (let i = 0; i < this.ringChars.length; i++) {
          const ch = this.ringChars[i];
          if (
            this.phaseFrames >= this.ringActivationDelays[i] &&
            !this.activeRingChars.has(ch)
          ) {
            ch.currentVisual = { symbol: ch.inputSymbol, fgColor: this.config.blackholeColor.rgbHex };
            ch.activateScene("ring_color");
            ch.motion.activatePath(`form_${i}`);
            this.activeRingChars.add(ch);
          }
        }

        // Tick active ring chars
        for (const ch of this.activeRingChars) {
          ch.tick();
        }

        // Transition when all ring chars activated and all orbiting
        // (form path completed → orbit auto-activated via event)
        if (
          this.activeRingChars.size === this.ringChars.length &&
          [...this.activeRingChars].every(
            (ch) => ch.motion.activePath?.id.startsWith("orbit_"),
          )
        ) {
          this.transitionToConsuming();
        }
        break;
      }

      case "consuming": {
        // Tick ring chars (orbiting)
        for (const ch of this.activeRingChars) {
          ch.tick();
        }

        // Tick star chars; hide when they reach center
        for (const ch of this.activeStarChars) {
          ch.tick();
          if (ch.motion.movementIsComplete()) {
            ch.currentVisual = { symbol: " ", fgColor: null };
            this.activeStarChars.delete(ch);
          }
        }

        // Transition when all stars consumed
        if (this.activeStarChars.size === 0) {
          this.transitionToCollapsing();
        }
        break;
      }

      case "collapsing": {
        for (const ch of this.activeRingChars) {
          ch.tick();
        }

        // Transition when all ring chars have no active path or scene
        // (waits for collapse paths + unstable scene on first char to finish)
        const allCollapsed = [...this.activeRingChars].every((ch) => !ch.isActive);
        if (allCollapsed) {
          this.transitionToExploding();
        }
        break;
      }

      case "exploding": {
        for (const ch of this.activeChars) {
          ch.tick();
          if (!ch.isActive) {
            this.activeChars.delete(ch);
          }
        }

        if (this.activeChars.size === 0) {
          this.phase = "complete";
          return false;
        }
        break;
      }
    }

    return true;
  }
}
