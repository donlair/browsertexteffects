import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";
import { outExpo, inOutExpo } from "../easing";
import { findCoordsOnCircle } from "../geometry";

export interface BubblesConfig {
  bubbleColors: Color[];
  popColor: Color;
  bubbleSpeed: number;
  bubbleDelay: number;
  popCondition: "row" | "bottom" | "anywhere";
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultBubblesConfig: BubblesConfig = {
  bubbleColors: [color("d33aff"), color("7395c4"), color("43c2a7"), color("02ff7f")],
  popColor: color("ffffff"),
  bubbleSpeed: 0.5,
  bubbleDelay: 20,
  popCondition: "row",
  finalGradientStops: [color("d33aff"), color("02ff7f")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
};

interface BubbleState {
  characters: EffectCharacter[];
  radius: number;
  anchorCol: number;
  anchorRow: number;
  targetCol: number;
  lowestRow: number;
  landed: boolean;
}

function setCharCoordinates(bubble: BubbleState): void {
  const anchor = { column: Math.round(bubble.anchorCol), row: Math.round(bubble.anchorRow) };
  const points = findCoordsOnCircle(anchor, bubble.radius, bubble.characters.length, false);
  for (let i = 0; i < bubble.characters.length; i++) {
    const point = points[i] ?? anchor;
    bubble.characters[i].motion.setCoordinate(point);
    if (point.row === bubble.lowestRow) {
      bubble.landed = true;
    }
  }
}

function moveBubble(bubble: BubbleState, speed: number, popCondition: BubblesConfig["popCondition"]): void {
  const dx = bubble.targetCol - bubble.anchorCol;
  const dy = bubble.lowestRow - bubble.anchorRow;
  const dist = Math.hypot(dx, dy);
  if (dist <= speed || dist === 0) {
    bubble.anchorCol = bubble.targetCol;
    bubble.anchorRow = bubble.lowestRow;
  } else {
    bubble.anchorCol += (dx / dist) * speed;
    bubble.anchorRow += (dy / dist) * speed;
  }
  setCharCoordinates(bubble);
  if (popCondition === "anywhere" && Math.random() < 0.002) {
    bubble.landed = true;
  }
}

export class BubblesEffect {
  private canvas: Canvas;
  private config: BubblesConfig;
  private pendingBubbles: BubbleState[] = [];
  private animatingBubbles: BubbleState[] = [];
  private activeChars: Set<EffectCharacter> = new Set();
  private stepsSinceLastBubble: number = 0;

  constructor(canvas: Canvas, config: BubblesConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMap = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );
    const popColorHex = config.popColor.rgbHex;

    // Set up per-character scenes and paths
    for (const ch of this.canvas.getNonSpaceCharacters()) {
      ch.isVisible = false;

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const finalColor = colorMap.get(key) ?? config.finalGradientStops[config.finalGradientStops.length - 1];

      // pop_1: "*" × 9 frames at popColor
      const pop1 = ch.newScene("pop_1");
      pop1.addFrame("*", 9, popColorHex);

      // pop_2: "'" × 9 frames at popColor
      const pop2 = ch.newScene("pop_2");
      pop2.addFrame("'", 9, popColorHex);

      // final_scene: gradient from popColor → finalColor applied to inputSymbol, 6 frames per step
      const finalScene = ch.newScene("final_scene");
      const charGrad = new Gradient([config.popColor, finalColor], 8);
      finalScene.applyGradientToSymbols(ch.inputSymbol, 6, charGrad);

      // Scene chain: pop_1 → pop_2 → final_scene
      ch.eventHandler.register("SCENE_COMPLETE", "pop_1", "ACTIVATE_SCENE", "pop_2");
      ch.eventHandler.register("SCENE_COMPLETE", "pop_2", "ACTIVATE_SCENE", "final_scene");

      // Final path: back to input coord at speed 0.3 with inOutExpo
      const finalPath = ch.motion.newPath("final", 0.3, inOutExpo);
      finalPath.addWaypoint(ch.inputCoord);

      // When pop_out completes, activate the final path
      ch.eventHandler.register("PATH_COMPLETE", "pop_out", "ACTIVATE_PATH", "final");
    }

    // Group characters into bubbles, bottom-to-top row order, 5–20 chars per bubble
    const allChars: EffectCharacter[] = [];
    for (const row of this.canvas.getCharactersGrouped("rowBottomToTop", { includeSpaces: false })) {
      allChars.push(...row);
    }

    while (allChars.length > 0) {
      const maxSize = Math.min(allChars.length, 20);
      const groupSize = allChars.length < 5
        ? allChars.length
        : Math.floor(Math.random() * (maxSize - 5 + 1)) + 5;
      const group = allChars.splice(0, groupSize);

      const lowestRow = config.popCondition === "row"
        ? Math.min(...group.map((c) => c.inputCoord.row))
        : dims.bottom;

      const radius = Math.max(Math.floor(group.length / 5), 1);
      const originCol = dims.left + Math.floor(Math.random() * (dims.right - dims.left + 1));
      const targetCol = dims.left + Math.floor(Math.random() * (dims.right - dims.left + 1));

      // Bubble sheen: input symbol in a random bubble color (same for all chars in this bubble)
      const bubbleColor = config.bubbleColors[Math.floor(Math.random() * config.bubbleColors.length)];
      for (const ch of group) {
        const sheenScene = ch.newScene("sheen");
        sheenScene.addFrame(ch.inputSymbol, 1, bubbleColor.rgbHex);
        ch.activateScene("sheen");
      }

      const bubble: BubbleState = {
        characters: group,
        radius,
        anchorCol: originCol,
        anchorRow: dims.top + 10,
        targetCol,
        lowestRow,
        landed: false,
      };
      setCharCoordinates(bubble);
      this.pendingBubbles.push(bubble);
    }
  }

  private popBubble(bubble: BubbleState): void {
    const anchor = { column: Math.round(bubble.anchorCol), row: Math.round(bubble.anchorRow) };
    const outPoints = findCoordsOnCircle(anchor, bubble.radius + 3, bubble.characters.length);

    for (let i = 0; i < bubble.characters.length; i++) {
      const ch = bubble.characters[i];
      const point = outPoints[i] ?? anchor;
      const popOutPath = ch.motion.newPath("pop_out", 0.3, outExpo);
      popOutPath.addWaypoint(point);
    }

    for (const ch of bubble.characters) {
      ch.activateScene("pop_1");
      ch.motion.activatePath("pop_out");
      this.activeChars.add(ch);
    }
  }

  step(): boolean {
    if (this.pendingBubbles.length > 0 && this.stepsSinceLastBubble >= this.config.bubbleDelay) {
      const bubble = this.pendingBubbles.shift();
      if (!bubble) return true;
      for (const ch of bubble.characters) {
        ch.isVisible = true;
      }
      this.animatingBubbles.push(bubble);
      this.stepsSinceLastBubble = 0;
    }
    this.stepsSinceLastBubble++;

    // Pop landed bubbles
    for (const bubble of this.animatingBubbles) {
      if (bubble.landed) {
        this.popBubble(bubble);
      }
    }
    this.animatingBubbles = this.animatingBubbles.filter((b) => !b.landed);

    // Move remaining animating bubbles and step their animations
    for (const bubble of this.animatingBubbles) {
      moveBubble(bubble, this.config.bubbleSpeed, this.config.popCondition);
      for (const ch of bubble.characters) {
        ch.tick();
      }
    }

    // Tick active chars (post-pop: following pop_out → final paths)
    for (const ch of [...this.activeChars]) {
      ch.tick();
      if (!ch.isActive) {
        this.activeChars.delete(ch);
      }
    }

    return this.pendingBubbles.length > 0 || this.animatingBubbles.length > 0 || this.activeChars.size > 0;
  }
}
