import { Scene } from "./scene";
import { Path } from "./motion";
import type { Coord } from "./types";

export type EventType =
  | "SCENE_COMPLETE"
  | "SCENE_ACTIVATED"
  | "PATH_COMPLETE"
  | "PATH_HOLDING"
  | "PATH_ACTIVATED"
  | "SEGMENT_ENTERED"
  | "SEGMENT_EXITED";

export type ActionType =
  | "ACTIVATE_SCENE"
  | "ACTIVATE_PATH"
  | "DEACTIVATE_PATH"
  | "SET_LAYER"
  | "SET_COORDINATE"
  | "CALLBACK";

export interface EventCallback {
  callback: (...args: any[]) => void;
  args: any[];
}

export interface EventAction {
  action: ActionType;
  target: string | number | Coord | EventCallback | null;
}

export class EventHandler {
  private registry: Map<string, EventAction[]> = new Map();
  private sceneMap: Map<string, Scene>;
  private pathMap: Map<string, Path>;

  constructor(sceneMap: Map<string, Scene>, pathMap?: Map<string, Path>) {
    this.sceneMap = sceneMap;
    this.pathMap = pathMap ?? new Map();
  }

  register(
    event: EventType,
    callerId: string,
    action: ActionType,
    target: string | number | Coord | EventCallback | null = null,
  ): void {
    const key = `${event}:${callerId}`;
    if (!this.registry.has(key)) {
      this.registry.set(key, []);
    }
    this.registry.get(key)!.push({ action, target });
  }

  handleEvent(
    event: EventType,
    callerId: string,
  ): Scene | null {
    const key = `${event}:${callerId}`;
    const actions = this.registry.get(key);
    if (!actions) return null;

    let activatedScene: Scene | null = null;

    for (const reg of actions) {
      switch (reg.action) {
        case "ACTIVATE_SCENE": {
          const scene = this.sceneMap.get(reg.target as string);
          if (scene && !activatedScene) activatedScene = scene;
          break;
        }
        case "ACTIVATE_PATH": {
          // Return null for scene; path activation is handled by character.tick()
          break;
        }
        case "DEACTIVATE_PATH": {
          break;
        }
        case "SET_LAYER": {
          break;
        }
        case "SET_COORDINATE": {
          break;
        }
        case "CALLBACK": {
          const cb = reg.target as EventCallback;
          if (cb) cb.callback(...cb.args);
          break;
        }
      }
    }

    return activatedScene;
  }

  getActions(event: EventType, callerId: string): EventAction[] {
    const key = `${event}:${callerId}`;
    return this.registry.get(key) ?? [];
  }
}
