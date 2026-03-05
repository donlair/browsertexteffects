import { type Color, type Coord, type EasingFunction, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { outSine } from "../easing";

export interface OrbittingVolleyConfig {
  launcherSymbols: string[];
  launcherMovementSpeed: number;
  launcherColor: Color;
  characterMovementSpeed: number;
  characterEasing: EasingFunction;
  volleySize: number;
  launchDelay: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultOrbittingVolleyConfig: OrbittingVolleyConfig = {
  launcherSymbols: ["█", "█", "█", "█"],
  launcherMovementSpeed: 0.8,
  launcherColor: color("888888"),
  characterMovementSpeed: 1.5,
  characterEasing: outSine,
  volleySize: 0.03,
  launchDelay: 30,
  finalGradientStops: [color("FFA15C"), color("44D492")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "radial",
};

interface LauncherState {
  char: EffectCharacter;
  perimIdx: number;
  magazine: EffectCharacter[];
}

let nextLauncherId = 200000;

function buildPerimeter(dims: { left: number; right: number; top: number; bottom: number }): Coord[] {
  const { left, right, top, bottom } = dims;
  const coords: Coord[] = [];

  // Top edge: left → right (exclusive of right corner)
  for (let col = left; col < right; col++) {
    coords.push({ column: col, row: top });
  }
  // Right edge: top → bottom (row decreasing, exclusive of bottom corner)
  for (let row = top; row > bottom; row--) {
    coords.push({ column: right, row });
  }
  // Bottom edge: right → left (exclusive of left corner)
  for (let col = right; col > left; col--) {
    coords.push({ column: col, row: bottom });
  }
  // Left edge: bottom → top (row increasing, exclusive of top corner)
  for (let row = bottom; row < top; row++) {
    coords.push({ column: left, row });
  }

  return coords;
}

export class OrbittingVolleyEffect {
  private canvas: Canvas;
  private config: OrbittingVolleyConfig;
  private launchers: LauncherState[] = [];
  private perimeter: Coord[] = [];
  private activeContentChars: Set<EffectCharacter> = new Set();
  private delayCounter: number;
  private totalChars: number;
  private pathCounter = 0;

  constructor(canvas: Canvas, config: OrbittingVolleyConfig) {
    this.canvas = canvas;
    this.config = config;
    this.totalChars = 0;
    // Python initializes delay to 0 so the first volley fires on tick 1
    this.delayCounter = 0;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const centerCol = Math.round((dims.left + dims.right) / 2);
    const centerRow = Math.round((dims.top + dims.bottom) / 2);

    // Sort non-space chars by distance from center ascending (center chars first)
    const nonSpaceChars = [...this.canvas.getNonSpaceCharacters()];
    this.totalChars = nonSpaceChars.length;
    nonSpaceChars.sort((a, b) => {
      const da = Math.hypot(a.inputCoord.column - centerCol, a.inputCoord.row - centerRow);
      const db = Math.hypot(b.inputCoord.column - centerCol, b.inputCoord.row - centerRow);
      return da - db;
    });

    // Build final gradient color mapping
    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    // Build "final" scene for each non-space char (gradient landing animation)
    for (const ch of nonSpaceChars) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMapping.get(key) || this.config.finalGradientStops[this.config.finalGradientStops.length - 1];
      const scene = ch.newScene("final");
      const charGradient = new Gradient(
        [this.config.finalGradientStops[0], finalColor],
        this.config.finalGradientSteps,
      );
      scene.applyGradientToSymbols(ch.inputSymbol, this.config.finalGradientFrames, charGradient);
    }

    // Hide all original characters initially
    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = false;
    }

    // Build perimeter array (clockwise)
    this.perimeter = buildPerimeter(dims);
    const perimLen = this.perimeter.length;

    // Create 4 synthetic launcher characters and inject into canvas
    const baseId = nextLauncherId;
    nextLauncherId += 4;

    for (let i = 0; i < 4; i++) {
      const startIdx = Math.floor((i * perimLen) / 4);
      const coord = this.perimeter[startIdx];
      const sym = this.config.launcherSymbols[i] ?? "█";
      const launcherChar = new EffectCharacter(baseId + i, sym, coord.column, coord.row);
      launcherChar.isVisible = true;
      launcherChar.currentVisual = { symbol: sym, fgColor: this.config.launcherColor.rgbHex };
      this.canvas.characters.push(launcherChar);

      this.launchers.push({
        char: launcherChar,
        perimIdx: startIdx,
        magazine: [],
      });
    }

    // Distribute sorted chars round-robin across launcher magazines
    for (let i = 0; i < nonSpaceChars.length; i++) {
      this.launchers[i % 4].magazine.push(nonSpaceChars[i]);
    }
  }

  private fireVolley(): void {
    const { volleySize, characterMovementSpeed, characterEasing, launcherColor } = this.config;
    const volleyCount = Math.max(1, Math.floor((volleySize * this.totalChars) / 4));
    const perimLen = this.perimeter.length;

    for (const launcher of this.launchers) {
      const count = Math.min(volleyCount, launcher.magazine.length);
      if (count === 0) continue;

      const launchCoord = { ...this.perimeter[Math.round(launcher.perimIdx) % perimLen] };

      for (let i = 0; i < count; i++) {
        const ch = launcher.magazine.shift();
        if (!ch) break;
        const pathId = `fly_${this.pathCounter++}`;

        ch.motion.setCoordinate(launchCoord);
        const path = ch.motion.newPath(pathId, { speed: characterMovementSpeed, ease: characterEasing });
        path.addWaypoint(ch.inputCoord);
        ch.motion.activatePath(pathId);

        ch.eventHandler.register("PATH_COMPLETE", pathId, "ACTIVATE_SCENE", "final");

        ch.isVisible = true;
        ch.currentVisual = { symbol: ch.inputSymbol, fgColor: launcherColor.rgbHex };

        this.activeContentChars.add(ch);
      }
    }
  }

  step(): boolean {
    const perimLen = this.perimeter.length;

    // Advance launcher positions along perimeter
    for (const launcher of this.launchers) {
      launcher.perimIdx = (launcher.perimIdx + this.config.launcherMovementSpeed) % perimLen;
      const coord = this.perimeter[Math.round(launcher.perimIdx) % perimLen];
      launcher.char.motion.setCoordinate(coord);
    }

    // Fire volleys on delay when magazines have chars
    const anyMagazineHasChars = this.launchers.some((l) => l.magazine.length > 0);
    if (anyMagazineHasChars) {
      this.delayCounter--;
      if (this.delayCounter <= 0) {
        this.fireVolley();
        this.delayCounter = this.config.launchDelay;
      }
    }

    // Tick active content chars and remove completed ones
    for (const ch of this.activeContentChars) {
      ch.tick();
      if (!ch.isActive) {
        this.activeContentChars.delete(ch);
      }
    }

    // Done when all magazines empty and no in-flight/landing chars remain
    const allEmpty = this.launchers.every((l) => l.magazine.length === 0);
    if (allEmpty && this.activeContentChars.size === 0) {
      for (const launcher of this.launchers) {
        launcher.char.isVisible = false;
      }
      return false;
    }

    return true;
  }
}
