import type { Coord, EasingFunction } from "./types";
import { Scene, type CharacterVisual, type SceneSyncMode } from "./scene";
import { Motion } from "./motion";
import { EventHandler, type EventCallback } from "./events";

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
    this.eventHandler = new EventHandler();
  }

  newScene(id: string, isLooping = false, options?: { ease?: EasingFunction | null; sync?: SceneSyncMode | null }): Scene {
    const scene = new Scene(id, isLooping, options);
    this.scenes.set(id, scene);
    return scene;
  }

  activateScene(sceneOrId: Scene | string): void {
    const scene = typeof sceneOrId === "string" ? this.scenes.get(sceneOrId) : sceneOrId;
    if (!scene) return;
    this.activeScene = scene;
    this.currentVisual = scene.activate();
    this._handleActions("SCENE_ACTIVATED", scene.id);
  }

  tick(): void {
    // Advance motion
    const pathWasActive = this.motion.activePath;
    const prevSegIdx = pathWasActive?.currentSegmentIndex ?? -1;
    this.motion.move();

    // Apply pending layer from path activation (loop re-activation or direct activatePath call)
    if (this.motion.pendingLayer !== null) {
      this.layer = this.motion.pendingLayer;
      this.motion.clearPendingLayer();
    }

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

    // Fire PATH_ACTIVATED for all pending activations (initial setup, loop restarts).
    // The queue may have multiple entries if activatePath() was called several times before
    // the first tick. ACTIVATE_PATH action handlers pop their own entry immediately, so
    // event-driven activations don't appear here a second time.
    for (const pathId of this.motion.pathJustActivated) {
      this._handleActions("PATH_ACTIVATED", pathId);
    }
    this.motion.clearPathJustActivated();

    // Check if path just completed
    if (pathWasActive && this.motion.activePath === null) {
      this._handleActions("PATH_COMPLETE", pathWasActive.id);
    }

    // Advance animation — three modes matching Python Animation.step_animation()
    if (this.activeScene && this.activeScene.frames.length > 0) {
      const scene = this.activeScene;

      if (scene.sync && this.motion.activePath) {
        // SYNC mode: frame index driven by motion path progress (frames are never consumed)
        const path = this.motion.activePath;
        let progress: number;
        if (scene.sync === "STEP") {
          progress = Math.max(path.currentStep, 1) / Math.max(path.maxSteps, 1);
        } else {
          // DISTANCE: use eased distance factor (matches Python last_distance_reached / total_distance)
          progress = path.lastDistanceFactor;
        }
        const frameIdx = Math.round((scene.frames.length - 1) * progress);
        this.currentVisual = scene.getVisualAtIndex(frameIdx);
        // Scene does not complete until path ends — handled by the else branch below

      } else if (scene.sync && !this.motion.activePath) {
        // SYNC mode but path finished: show last frame and complete the scene
        this.currentVisual = scene.getVisualAtIndex(scene.frames.length - 1);
        scene.playedFrames.push(...scene.frames);
        scene.frames = [];
        const completedScene = scene;
        scene.reset();
        this.activeScene = null;
        this._handleActions("SCENE_COMPLETE", completedScene.id);

      } else if (scene.ease) {
        // EASE mode: non-linear frame timing via easing function
        this.currentVisual = scene.getNextVisualEased();
        if (scene.isComplete) {
          const completedScene = scene;
          if (!scene.isLooping) {
            scene.reset();
            this.activeScene = null;
          }
          this._handleActions("SCENE_COMPLETE", completedScene.id);
        }

      } else {
        // DEFAULT mode: sequential frame playback
        this.currentVisual = scene.getNextVisual();
        if (scene.isComplete) {
          const completedScene = scene;
          if (!scene.isLooping) {
            scene.reset();
            this.activeScene = null;
          }
          this._handleActions("SCENE_COMPLETE", completedScene.id);
        }
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
          // Apply path layer if set
          if (this.motion.pendingLayer !== null) {
            this.layer = this.motion.pendingLayer;
            this.motion.clearPendingLayer();
          }
          // Fire PATH_ACTIVATED immediately (same tick as PATH_COMPLETE that triggered this),
          // then pop just this entry from the queue so tick()'s drain loop doesn't double-fire.
          this._handleActions("PATH_ACTIVATED", reg.target as string);
          this.motion.popPathJustActivated();
          break;
        }
        case "DEACTIVATE_PATH": {
          if (this.motion.activePath?.id === reg.target) {
            this.motion.activePath = null;
          }
          break;
        }
        case "DEACTIVATE_SCENE": {
          // Python deactivate_scene() unconditionally clears the active scene (no target check).
          if (this.activeScene) {
            this.activeScene.reset();
            this.activeScene = null;
          }
          break;
        }
        case "RESET_APPEARANCE": {
          // Resets character visual to input symbol with no formatting (matches Python behavior)
          this.currentVisual = {
            symbol: this.inputSymbol,
            fgColor: null,
            bgColor: null,
            bold: false,
            italic: false,
            underline: false,
            blink: false,
            reverse: false,
            hidden: false,
            dim: false,
            strike: false,
          };
          if (this.activeScene) {
            this.activeScene.reset();
            this.activeScene = null;
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
