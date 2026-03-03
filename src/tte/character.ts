import { Coord } from "./types";
import { Scene, CharacterVisual } from "./scene";
import { Motion } from "./motion";
import { EventHandler, EventCallback } from "./events";

export class EffectCharacter {
  id: number;
  inputSymbol: string;
  inputCoord: Coord;
  isVisible = false;
  isSpace = false;
  layer: number = 0;

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
    this.eventHandler = new EventHandler(this.scenes, this.motion.paths);
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
    this._handleActions("SCENE_ACTIVATED", scene.id);
  }

  tick(): void {
    // Advance motion
    const pathWasActive = this.motion.activePath;
    const prevSegIdx = pathWasActive?.currentSegmentIndex ?? -1;
    this.motion.move();

    // Detect segment transitions
    if (pathWasActive && !pathWasActive.isHolding) {
      const newSegIdx = pathWasActive.currentSegmentIndex;
      if (prevSegIdx !== newSegIdx) {
        if (prevSegIdx >= 0) {
          this._handleActions("SEGMENT_EXITED", `${pathWasActive.id}:${prevSegIdx}`);
        }
        if (newSegIdx >= 0) {
          this._handleActions("SEGMENT_ENTERED", `${pathWasActive.id}:${newSegIdx}`);
        }
      }
    }

    // Check if hold phase just started
    if (pathWasActive && this.motion.holdJustStarted) {
      this._handleActions("PATH_HOLDING", pathWasActive.id);
    }

    // Check if path just completed
    if (pathWasActive && this.motion.activePath === null) {
      this._handleActions("PATH_COMPLETE", pathWasActive.id);
    }

    // Advance animation
    if (this.activeScene && this.activeScene.frames.length > 0) {
      this.currentVisual = this.activeScene.getNextVisual();

      if (this.activeScene.isComplete) {
        const completedScene = this.activeScene;
        if (!this.activeScene.isLooping) {
          this.activeScene.reset();
          this.activeScene = null;
        }
        this._handleActions("SCENE_COMPLETE", completedScene.id);
      }
    }
  }

  private _handleActions(event: "SCENE_COMPLETE" | "SCENE_ACTIVATED" | "PATH_COMPLETE" | "PATH_HOLDING" | "PATH_ACTIVATED" | "SEGMENT_ENTERED" | "SEGMENT_EXITED", callerId: string): void {
    const actions = this.eventHandler.getActions(event, callerId);
    for (const reg of actions) {
      switch (reg.action) {
        case "ACTIVATE_SCENE": {
          const scene = this.scenes.get(reg.target as string);
          if (scene) this.activateScene(scene);
          break;
        }
        case "ACTIVATE_PATH": {
          this.motion.activatePath(reg.target as string);
          this._handleActions("PATH_ACTIVATED", reg.target as string);
          break;
        }
        case "DEACTIVATE_PATH": {
          if (this.motion.activePath?.id === reg.target) {
            this.motion.activePath = null;
          }
          break;
        }
        case "SET_LAYER": {
          this.layer = reg.target as number;
          break;
        }
        case "SET_COORDINATE": {
          this.motion.setCoordinate(reg.target as Coord);
          break;
        }
        case "CALLBACK": {
          const cb = reg.target as EventCallback;
          if (cb) cb.callback(this, ...cb.args);
          break;
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
