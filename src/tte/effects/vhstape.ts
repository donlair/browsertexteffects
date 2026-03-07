import { type Color, type GradientDirection, color } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import type { EffectCharacter } from "../character";

export interface VhstapeConfig {
  glitchLineColors: Color[];
  glitchWaveColors: Color[];
  noiseColors: Color[];
  glitchLineChance: number;
  noiseChance: number;
  totalGlitchTime: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientDirection: GradientDirection;
}

export const defaultVhstapeConfig: VhstapeConfig = {
  glitchLineColors: [
    color("ffffff"), color("ff0000"), color("00ff00"), color("0000ff"), color("ffffff"),
  ],
  glitchWaveColors: [
    color("ffffff"), color("ff0000"), color("00ff00"), color("0000ff"), color("ffffff"),
  ],
  noiseColors: [
    color("1e1e1f"), color("3c3b3d"), color("6d6c70"), color("a2a1a6"), color("cbc9cf"), color("ffffff"),
  ],
  glitchLineChance: 0.05,
  noiseChance: 0.004,
  totalGlitchTime: 600,
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientSteps: 12,
  finalGradientDirection: "vertical",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

class Line {
  characters: EffectCharacter[];
  private config: VhstapeConfig;
  private characterFinalColorMap: Map<EffectCharacter, Color>;

  constructor(
    characters: EffectCharacter[],
    config: VhstapeConfig,
    characterFinalColorMap: Map<EffectCharacter, Color>,
  ) {
    this.characters = characters;
    this.config = config;
    this.characterFinalColorMap = characterFinalColorMap;
    this.buildLineEffects();
  }

  private buildLineEffects(): void {
    const glitchLineColors = this.config.glitchLineColors;
    const snowChars = ["#", "*", ".", ":"];
    const noiseColors = this.config.noiseColors;
    const offset = randInt(4, 25);
    const direction = Math.random() < 0.5 ? -1 : 1;
    const holdTime = randInt(1, 50);

    for (const character of this.characters) {
      const finalColor = this.characterFinalColorMap.get(character)!;

      // Paths
      const glitchPath = character.motion.newPath("glitch", { speed: 2, holdDuration: holdTime });
      glitchPath.addWaypoint({
        column: character.inputCoord.column + offset * direction,
        row: character.inputCoord.row,
      });

      character.motion.newPath("restore", 2).addWaypoint({ ...character.inputCoord });

      character.motion.newPath("glitch_wave_mid", 2).addWaypoint({
        column: character.inputCoord.column + 8,
        row: character.inputCoord.row,
      });

      character.motion.newPath("glitch_wave_end", 2).addWaypoint({
        column: character.inputCoord.column + 14,
        row: character.inputCoord.row,
      });

      // Scenes
      const baseScn = character.newScene("base");
      baseScn.addFrame(character.inputSymbol, 1, finalColor.rgbHex);

      const glitchScnFwd = character.newScene("rgb_glitch_fwd", false, { sync: "STEP" });
      for (const c of glitchLineColors) {
        glitchScnFwd.addFrame(character.inputSymbol, 1, c.rgbHex);
      }

      const glitchScnBwd = character.newScene("rgb_glitch_bwd", false, { sync: "STEP" });
      for (const c of [...glitchLineColors].reverse()) {
        glitchScnBwd.addFrame(character.inputSymbol, 1, c.rgbHex);
      }

      const snowScn = character.newScene("snow");
      for (let i = 0; i < 25; i++) {
        snowScn.addFrame(randChoice(snowChars), 2, randChoice(noiseColors).rgbHex);
      }
      snowScn.addFrame(character.inputSymbol, 1, finalColor.rgbHex);

      const finalSnowScn = character.newScene("final_snow");
      for (let i = 0; i < 30; i++) {
        finalSnowScn.addFrame(randChoice(snowChars), 2, randChoice(noiseColors).rgbHex);
      }

      const finalRedrawScn = character.newScene("final_redraw");
      finalRedrawScn.addFrame("\u2588", 6, "ffffff");
      finalRedrawScn.addFrame(character.inputSymbol, 1, finalColor.rgbHex);

      // Events
      character.eventHandler.register("PATH_COMPLETE", "glitch", "ACTIVATE_PATH", "restore");
      character.eventHandler.register("PATH_ACTIVATED", "glitch", "ACTIVATE_SCENE", "rgb_glitch_fwd");
      character.eventHandler.register("PATH_ACTIVATED", "restore", "ACTIVATE_SCENE", "rgb_glitch_bwd");
      character.eventHandler.register("PATH_ACTIVATED", "glitch_wave_mid", "ACTIVATE_SCENE", "rgb_glitch_fwd");
      character.eventHandler.register("PATH_ACTIVATED", "glitch_wave_end", "ACTIVATE_SCENE", "rgb_glitch_fwd");
      character.eventHandler.register("SCENE_COMPLETE", "rgb_glitch_bwd", "ACTIVATE_SCENE", "base");
    }
  }

  snow(): void {
    for (const character of this.characters) {
      character.activateScene("snow");
    }
  }

  setHoldTime(holdTime: number): void {
    for (const character of this.characters) {
      const path = character.motion.paths.get("glitch")!;
      path.holdDuration = holdTime;
    }
  }

  glitch(final = false): void {
    for (const character of this.characters) {
      const glitchPath = character.motion.paths.get("glitch")!;
      const restorePath = character.motion.paths.get("restore")!;
      if (final) {
        glitchPath.holdDuration = 0;
        restorePath.holdDuration = 0;
      }
      glitchPath.speed = 40 / randInt(20, 40);
      restorePath.speed = 40 / randInt(20, 40);
      character.motion.activatePath(glitchPath);
    }
  }

  restore(): void {
    for (const character of this.characters) {
      const restorePath = character.motion.paths.get("restore")!;
      restorePath.speed = 40 / randInt(20, 40);
      character.motion.activatePath(restorePath);
    }
  }

  activatePath(pathId: string): void {
    for (const character of this.characters) {
      character.motion.activatePath(pathId);
    }
  }

  lineMovementComplete(): boolean {
    return this.characters.every(ch => ch.motion.movementIsComplete());
  }
}

export class VhstapeEffect {
  private canvas: Canvas;
  private config: VhstapeConfig;
  private lines: Map<number, Line> = new Map();
  private activeGlitchWaveTop: number | null = null;
  private activeGlitchWaveLines: Line[] = [];
  private activeGlitchLines: Line[] = [];
  private activeCharacters: Set<EffectCharacter> = new Set();

  private _phase: "glitching" | "noise" | "redraw" | "complete" = "glitching";
  private _glitchingStepsElapsed = 0;
  private _toRedraw: Line[] = [];
  private _redrawing = false;

  constructor(canvas: Canvas, config: VhstapeConfig) {
    this.canvas = canvas;
    this.config = config;
    this.build();
  }

  private build(): void {
    const { dims } = this.canvas;

    const finalGradient = new Gradient(this.config.finalGradientStops, this.config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      this.config.finalGradientDirection,
    );

    const characterFinalColorMap = new Map<EffectCharacter, Color>();
    for (const ch of this.canvas.getCharacters()) {
      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      characterFinalColorMap.set(ch, colorMapping.get(key) || this.config.finalGradientStops[0]);
    }

    const rowGroups = this.canvas.getCharactersGrouped("rowBottomToTop");
    for (let rowIndex = 0; rowIndex < rowGroups.length; rowIndex++) {
      this.lines.set(rowIndex, new Line(rowGroups[rowIndex], this.config, characterFinalColorMap));
    }

    for (const ch of this.canvas.getCharacters()) {
      ch.isVisible = true;
      ch.activateScene("base");
    }

    this._glitchingStepsElapsed = 0;
    this._phase = "glitching";
    this._toRedraw = [...this.lines.values()];
    this._redrawing = false;
  }

  private glitchWave(): void {
    if (!this.activeGlitchWaveTop) {
      if (this.canvas.dims.textHeight >= 3) {
        this.activeGlitchWaveTop = this.canvas.dims.textBottom + randInt(
          Math.max(3, Math.round(this.canvas.dims.textHeight * 0.5)),
          this.canvas.dims.textHeight,
        );
      } else {
        return;
      }
    }

    if (this.activeGlitchWaveLines.every(line => line.lineMovementComplete())) {
      if (this.activeGlitchWaveLines.length > 0) {
        const waveTopDelta = Math.random() < 0.3
          ? (Math.random() < 0.3 ? 1 : -1)
          : 0;
        this.activeGlitchWaveTop! += waveTopDelta;
        this.activeGlitchWaveTop = Math.max(2, Math.min(this.activeGlitchWaveTop!, this.canvas.dims.textTop));
      }

      const newWaveLines: Line[] = [];
      for (let lineIndex = this.activeGlitchWaveTop! - 2; lineIndex <= this.activeGlitchWaveTop!; lineIndex++) {
        const adjustedLineIndex = lineIndex - (this.canvas.dims.textBottom - 1);
        const line = this.lines.get(adjustedLineIndex);
        if (line) {
          newWaveLines.push(line);
        }
      }

      for (const line of this.activeGlitchWaveLines) {
        if (!newWaveLines.includes(line)) {
          line.restore();
          for (const ch of line.characters) this.activeCharacters.add(ch);
        }
      }
      this.activeGlitchWaveLines = newWaveLines;

      if (this.activeGlitchWaveTop! < this.canvas.dims.textBottom + 2) {
        for (const line of this.activeGlitchWaveLines) {
          line.restore();
          for (const ch of line.characters) this.activeCharacters.add(ch);
        }
        this.activeGlitchWaveTop = null;
        this.activeGlitchWaveLines = [];
      } else {
        const pathIds = ["glitch_wave_mid", "glitch_wave_end", "glitch_wave_mid"];
        for (let i = 0; i < this.activeGlitchWaveLines.length; i++) {
          this.activeGlitchWaveLines[i].activatePath(pathIds[i]);
          for (const ch of this.activeGlitchWaveLines[i].characters) {
            this.activeCharacters.add(ch);
          }
        }
      }
    }
  }

  step(): boolean {
    if (this._phase !== "complete" || this.activeCharacters.size > 0) {
      if (this._phase === "glitching") {
        if (
          this.activeGlitchWaveLines.length === 0 ||
          this.activeGlitchWaveLines.every(line => line.lineMovementComplete())
        ) {
          this.glitchWave();
        }

        this.activeGlitchLines = this.activeGlitchLines.filter(
          line => !line.lineMovementComplete(),
        );

        if (Math.random() < this.config.glitchLineChance && this.activeGlitchLines.length < 3) {
          const allLines = [...this.lines.values()];
          const glitchLine = randChoice(allLines);
          if (
            !this.activeGlitchWaveLines.includes(glitchLine) &&
            !this.activeGlitchLines.includes(glitchLine)
          ) {
            glitchLine.setHoldTime(randInt(20, 75));
            this.activeGlitchLines.push(glitchLine);
            glitchLine.glitch();
            for (const ch of glitchLine.characters) this.activeCharacters.add(ch);
          }
        }

        if (Math.random() < this.config.noiseChance) {
          for (const line of this.lines.values()) {
            line.snow();
            if (
              !this.activeGlitchWaveLines.includes(line) &&
              !this.activeGlitchLines.includes(line)
            ) {
              for (const ch of line.characters) this.activeCharacters.add(ch);
            }
          }
        }

        this._glitchingStepsElapsed++;
        if (this._glitchingStepsElapsed >= this.config.totalGlitchTime) {
          for (const line of this.activeGlitchWaveLines) {
            line.restore();
          }
          for (const line of this.activeGlitchLines) {
            line.restore();
          }
          this._phase = "noise";
        }

      } else if (this._phase === "noise") {
        if (this.activeCharacters.size === 0) {
          for (const ch of this.canvas.getCharacters()) {
            ch.activateScene("final_snow");
            this.activeCharacters.add(ch);
          }
          this._phase = "redraw";
        }

      } else if (this._phase === "redraw") {
        if (this._redrawing || this.activeCharacters.size === 0) {
          this._redrawing = true;
          if (this._toRedraw.length > 0) {
            const nextLine = this._toRedraw.pop()!;
            for (const ch of nextLine.characters) {
              ch.activateScene("final_redraw");
              this.activeCharacters.add(ch);
            }
          } else {
            this._phase = "complete";
          }
        }
      }

      for (const ch of this.activeCharacters) {
        ch.tick();
        if (!ch.isActive) {
          this.activeCharacters.delete(ch);
        }
      }

      return true;
    }
    return false;
  }
}
