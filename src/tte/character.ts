import { Coord } from "./types";
import { Scene, CharacterVisual } from "./scene";
import { Motion } from "./motion";
import { EventHandler } from "./events";

export class EffectCharacter {
  id: number;
  inputSymbol: string;
  inputCoord: Coord;
  isVisible = false;
  isSpace = false;

  scenes: Map<string, Scene> = new Map();
  activeScene: Scene | null = null;
  currentVisual: CharacterVisual;

  motion: Motion;
  eventHandler: EventHandler;

  constructor(id: number, symbol: string, col: number, row: number) {
    this.id = id;
    this.inputSymbol = symbol;
    this.inputCoord = { column: col, row };
    this.currentVisual = { symbol, fgColor: null };
    this.motion = new Motion(this.inputCoord);
    this.eventHandler = new EventHandler(this.scenes);
  }

  newScene(id: string, isLooping = false): Scene {
    const scene = new Scene(id, isLooping);
    this.scenes.set(id, scene);
    return scene;
  }

  activateScene(sceneOrId: Scene | string): void {
    const scene = typeof sceneOrId === "string" ? this.scenes.get(sceneOrId)! : sceneOrId;
    this.activeScene = scene;
    this.currentVisual = scene.activate();
  }

  tick(): void {
    // Advance motion
    this.motion.move();

    // Advance animation
    if (this.activeScene && this.activeScene.frames.length > 0) {
      this.currentVisual = this.activeScene.getNextVisual();

      if (this.activeScene.isComplete) {
        const completedScene = this.activeScene;
        if (!this.activeScene.isLooping) {
          this.activeScene.reset();
          this.activeScene = null;
        }
        // Handle SCENE_COMPLETE event
        const nextScene = this.eventHandler.handleEvent("SCENE_COMPLETE", completedScene.id);
        if (nextScene) {
          this.activateScene(nextScene);
        }
      }
    }
  }

  get isActive(): boolean {
    const animActive = this.activeScene !== null && !this.activeScene.isComplete;
    const motionActive = !this.motion.movementIsComplete();
    return animActive || motionActive;
  }
}
