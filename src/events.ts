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
  | "DEACTIVATE_SCENE"
  | "RESET_APPEARANCE"
  | "SET_LAYER"
  | "SET_COORDINATE"
  | "CALLBACK";

export interface EventCallback {
  // biome-ignore lint/suspicious/noExplicitAny: generic escape hatch for typed callbacks
  callback: (...args: any[]) => void;
  args: unknown[];
}

export interface EventAction {
  action: ActionType;
  target: string | number | Coord | EventCallback | null;
}

export class EventHandler {
  private registry: Map<string, EventAction[]> = new Map();

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
    this.registry.get(key)?.push({ action, target });
  }

  getActions(event: EventType, callerId: string): EventAction[] {
    const key = `${event}:${callerId}`;
    return this.registry.get(key) ?? [];
  }
}
