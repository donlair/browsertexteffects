import { Color, GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { outExpo } from "../easing";

export interface BubblesConfig {
  bubbleColors: Color[];
  bubbleSymbols: string[];
  riseHeight: number;
  riseSpeed: number;
  wobbleAmount: number;
  bubblesPerTick: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBubblesConfig: BubblesConfig = {
  bubbleColors: [color("00d4ff"), color("87e8ff"), color("ffffff"), color("b0f0ff")],
  bubbleSymbols: ["○", "◯", "°"],
  riseHeight: 5,
  riseSpeed: 0.2,
  wobbleAmount: 1,
  bubblesPerTick: 3,
  finalGradientStops: [color("00d4ff"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 8,
  finalGradientDirection: "diagonal",
};

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class BubblesEffect {
  private canvas: Canvas;
  private config: BubblesConfig;
  private queue: EffectCharacter[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private risePathIds: Map<EffectCharacter, string> = new Map();
  private colorMapping: Map<string, Color> = new Map();

  constructor(canvas: Canvas, config: BubblesConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    this.colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    const chars = [...this.canvas.getNonSpaceCharacters()];
    shuffle(chars);
    this.queue = chars;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      ch.isVisible = true;

      const bubbleColor = config.bubbleColors[
        Math.floor(Math.random() * config.bubbleColors.length)
      ];

      // Looping bubble scene: cycles through bubble symbols
      const bubbleScene = ch.newScene("bubble", true);
      for (const sym of config.bubbleSymbols) {
        bubbleScene.addFrame(sym, 5, bubbleColor.rgbHex);
      }

      // Pop: brief bright flash then space
      const popScene = ch.newScene("pop");
      popScene.addFrame("*", 2, "ffffff");
      popScene.addFrame("✦", 2, "ffffff");
      popScene.addFrame("·", 2, bubbleColor.rgbHex);
      popScene.addFrame(" ", 1, null);

      // Restore: bubble color → final gradient color
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = this.colorMapping.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];
      const restoreGrad = new Gradient([bubbleColor, finalColor], config.finalGradientFrames);
      const restoreScene = ch.newScene("restore");
      restoreScene.applyGradientToSymbols(ch.inputSymbol, 1, restoreGrad);

      // Rise path: home → wobble midpoint → peak
      const riseId = `rise_${i}`;
      this.risePathIds.set(ch, riseId);
      const risePath = ch.motion.newPath(riseId, config.riseSpeed, outExpo);
      const midCol = ch.inputCoord.column + Math.round((Math.random() * 2 - 1) * config.wobbleAmount);
      risePath.addWaypoint({ column: midCol, row: ch.inputCoord.row + Math.floor(config.riseHeight / 2) });
      risePath.addWaypoint({ column: ch.inputCoord.column, row: ch.inputCoord.row + config.riseHeight });

      // Rise complete → pop scene
      ch.eventHandler.register("PATH_COMPLETE", riseId, "ACTIVATE_SCENE", "pop");

      // Pop complete → teleport home + restore
      ch.eventHandler.register("SCENE_COMPLETE", "pop", "SET_COORDINATE", ch.inputCoord);
      ch.eventHandler.register("SCENE_COMPLETE", "pop", "ACTIVATE_SCENE", "restore");
    }
  }

  step(): boolean {
    const toRelease = Math.min(this.config.bubblesPerTick, this.queue.length);
    for (let i = 0; i < toRelease; i++) {
      const ch = this.queue.shift()!;
      ch.motion.setCoordinate(ch.inputCoord);
      ch.activateScene("bubble");
      ch.motion.activatePath(this.risePathIds.get(ch)!);
      this.activeChars.add(ch);
    }

    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.queue.length > 0 || this.activeChars.size > 0;
  }
}
