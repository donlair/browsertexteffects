import { Scene } from "./scene";

export type EventType = "SCENE_COMPLETE";
export type ActionType = "ACTIVATE_SCENE";

interface Registration {
  action: ActionType;
  targetSceneId: string;
}

export class EventHandler {
  private registry: Map<string, Registration[]> = new Map();
  private sceneMap: Map<string, Scene>;

  constructor(sceneMap: Map<string, Scene>) {
    this.sceneMap = sceneMap;
  }

  register(
    event: EventType,
    callerSceneId: string,
    action: ActionType,
    targetSceneId: string,
  ): void {
    const key = `${event}:${callerSceneId}`;
    if (!this.registry.has(key)) {
      this.registry.set(key, []);
    }
    this.registry.get(key)!.push({ action, targetSceneId });
  }

  handleEvent(
    event: EventType,
    callerSceneId: string,
  ): Scene | null {
    const key = `${event}:${callerSceneId}`;
    const registrations = this.registry.get(key);
    if (!registrations) return null;

    for (const reg of registrations) {
      if (reg.action === "ACTIVATE_SCENE") {
        const scene = this.sceneMap.get(reg.targetSceneId);
        if (scene) return scene;
      }
    }
    return null;
  }
}
