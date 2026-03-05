import { type Color, type GradientDirection, color, adjustBrightness } from "../types";
import { Gradient, coordKey } from "../gradient";
import type { Canvas } from "../canvas";
import { EffectCharacter } from "../character";
import { EventHandler } from "../events";
import { ParticleSystem } from "../particles";

export interface ThunderstormConfig {
  // Lightning strike color (bolt symbol color)
  lightningColor: Color;
  // Text glow color after a strike hits nearby characters
  glowingTextColor: Color;
  // Frames per glow step (duration of each glow gradient frame)
  textGlowTime: number;
  // Symbols used for falling rain drops
  raindropSymbols: string[];
  // Symbols used for lightning impact sparks
  sparkSymbols: string[];
  // Color for the spark glow at impact
  sparkGlowColor: Color;
  // Frames per spark glow step (duration of each spark gradient frame)
  sparkGlowTime: number;
  // Storm duration in ticks (~30 fps → 360 ≈ 12 s, matching Python's storm_time=12)
  stormDuration: number;
  finalGradientStops: Color[];
  finalGradientSteps: number;
  finalGradientFrames: number;
  finalGradientDirection: GradientDirection;
}

export const defaultThunderstormConfig: ThunderstormConfig = {
  lightningColor: color("68A3E8"),
  glowingTextColor: color("EF5411"),
  textGlowTime: 6,
  raindropSymbols: ["\\", ".", ","],
  sparkSymbols: ["*", ".", "'"],
  sparkGlowColor: color("ff4d00"),
  sparkGlowTime: 18,
  stormDuration: 360,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "vertical",
};

// Simple diagonal raindrop (no EffectCharacter — just a coord + span)
interface RainDrop {
  col: number;    // fractional canvas column
  row: number;    // fractional canvas row
  speed: number;  // canvas-units per tick (diagonal: +col, −row each tick)
  sym: string;
  span: HTMLSpanElement;
}

// Pooled overlay character for strike bolt segments
interface OverlayChar {
  ch: EffectCharacter;
  span: HTMLSpanElement;
  col: number;
  row: number;
  sym: string; // current bolt segment symbol (\ / |)
}

// Deferred spark emission config (sparks revealed when last bolt segment is shown)
interface SparkSetup {
  spawnCol: number;
  spawnRow: number;
  targetCol: number;
}

let nextOverlayId = 4_000_000;

export class ThunderstormEffect {
  private canvas: Canvas;
  private config: ThunderstormConfig;
  private container: HTMLElement;
  private cellWidthPx = 0;
  private cellHeightPx = 0;
  private totalRows: number;

  // Text characters (canvas EffectCharacters)
  private allNonSpaceChars: EffectCharacter[] = [];
  private activeTextChars: Set<EffectCharacter> = new Set();
  private coordToChar: Map<string, EffectCharacter> = new Map();

  // Rain overlay
  private rainDrops: RainDrop[] = [];

  // Lightning bolt overlay pool
  private particles: ParticleSystem;
  private availableStrikeChars: OverlayChar[] = [];
  private pendingStrikeChars: OverlayChar[] = [];   // queued to be revealed
  private activeStrikeChars: OverlayChar[] = [];    // revealed, animating
  private strikeInProgress = false;
  private strikeProgressionDelay = 0;
  private pendingGlowChars: EffectCharacter[] = [];
  private pendingSparkSetups: SparkSetup[] = [];

  // Phase state machine
  private phase: "pre-storm" | "waiting" | "storm" | "complete" = "pre-storm";
  private stormTick = 0;

  constructor(canvas: Canvas, config: ThunderstormConfig, container: HTMLElement) {
    this.canvas = canvas;
    this.config = config;
    this.container = container;
    this.totalRows = canvas.dims.top;
    this.particles = new ParticleSystem(container, canvas.dims);
    this._measureCell();
    this.build();
  }

  private _measureCell(): void {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidthPx = rect.width;
    this.cellHeightPx = rect.height;
    this.container.removeChild(probe);
  }

  private _positionSpan(span: HTMLSpanElement, col: number, row: number): void {
    span.style.left = `${(col - 1) * this.cellWidthPx}px`;
    span.style.top = `${(this.totalRows - row) * this.cellHeightPx}px`;
  }

  private build(): void {
    const { dims } = this.canvas;
    const { config } = this;

    // Build final gradient color mapping
    const finalGradient = new Gradient(config.finalGradientStops, config.finalGradientSteps);
    const colorMapping = finalGradient.buildCoordinateColorMapping(
      dims.textBottom, dims.textTop, dims.textLeft, dims.textRight,
      config.finalGradientDirection,
    );

    // Build text character scenes — all chars start visible (matching Python)
    for (const ch of this.canvas.getCharacters()) {
      if (ch.isSpace) { ch.isVisible = true; continue; }

      const key = coordKey(ch.inputCoord.column, ch.inputCoord.row);
      const stops = config.finalGradientStops;
      const finalColor = colorMapping.get(key) ?? (stops[stops.length - 1] as Color);
      const fadedColor = adjustBrightness(finalColor, 0.5);           // 50% brightness, matching Python
      const lightningFlashColor = adjustBrightness(finalColor, 1.7);  // 170% brightness, matching Python

      // fade: finalColor → fadedColor (dims text before storm); 7 steps × 12 frames
      const fadeGrad = new Gradient([finalColor, fadedColor], 7);
      const fadeScene = ch.newScene("fade");
      for (const c of fadeGrad.spectrum) {
        fadeScene.addFrame(ch.inputSymbol, 12, c.rgbHex);
      }

      // unfade: fadedColor → finalColor (restores text after storm); 7 steps × 12 frames
      const unfadeGrad = new Gradient([fadedColor, finalColor], 7);
      const unfadeScene = ch.newScene("unfade");
      for (const c of unfadeGrad.spectrum) {
        unfadeScene.addFrame(ch.inputSymbol, 12, c.rgbHex);
      }

      // flash: faded ↔ brightened (strike illumination pulse); round-trip gradient × 6 frames per step
      // loop=true on Gradient creates a round-trip palette; the Scene itself is non-looping (one-shot).
      const flashGrad = new Gradient([fadedColor, lightningFlashColor], 7, true);
      const flashScene = ch.newScene("flash");
      for (const c of flashGrad.spectrum) {
        flashScene.addFrame(ch.inputSymbol, 6, c.rgbHex);
      }

      // glow: glowingTextColor → fadedColor (post-strike cooldown); 7 steps × textGlowTime frames
      const glowGrad = new Gradient([config.glowingTextColor, fadedColor], 7);
      const glowScene = ch.newScene("glow");
      for (const c of glowGrad.spectrum) {
        glowScene.addFrame(ch.inputSymbol, config.textGlowTime, c.rgbHex);
      }

      ch.isVisible = true;
      this.coordToChar.set(key, ch);
      this.allNonSpaceChars.push(ch);
    }

    // Register SCENE_COMPLETE "fade" callback on reference char to trigger storm phase
    if (this.allNonSpaceChars.length > 0) {
      const refChar = this.allNonSpaceChars[0] as EffectCharacter;
      refChar.eventHandler.register("SCENE_COMPLETE", "fade", "CALLBACK", {
        callback: () => { this.phase = "storm"; },
        args: [],
      });
    }

    // Build rain drops (hidden until storm phase)
    this._buildRainDrops(50);

    // Pre-build strike char pool
    this._buildStrikePool(200);
  }

  private _buildRainDrops(count: number): void {
    const { dims } = this.canvas;
    for (let i = 0; i < count; i++) {
      // Python: spawn_column = randint(1 - canvas.top, canvas.right)
      const spawnCol = randInt(1 - dims.top, dims.right);
      const sym = randChoice(this.config.raindropSymbols);
      const span = document.createElement("span");
      span.style.position = "absolute";
      span.style.lineHeight = "1.2em";
      span.textContent = sym;
      span.style.color = "#aaaaff";
      span.style.display = "none";
      this.container.appendChild(span);
      this.rainDrops.push({ col: spawnCol, row: dims.top + 1, speed: randFloat(0.5, 1.5), sym, span });
    }
  }

  private _buildStrikePool(count: number): void {
    for (let i = 0; i < count; i++) {
      const id = nextOverlayId++;
      const ch = new EffectCharacter(id, "|", 1, 1);
      const span = document.createElement("span");
      span.style.position = "absolute";
      span.style.lineHeight = "1.2em";
      span.style.display = "none";
      this.container.appendChild(span);
      this.availableStrikeChars.push({ ch, span, col: 1, row: 1, sym: "|" });
    }
  }

  private _getStrikeChar(): OverlayChar {
    if (this.availableStrikeChars.length === 0) {
      this._buildStrikePool(20);
    }
    const oc = this.availableStrikeChars.pop() as OverlayChar;
    // Reset for reuse
    oc.ch.scenes.clear();
    oc.ch.activeScene = null;
    oc.ch.eventHandler = new EventHandler();
    return oc;
  }

  /**
   * Build a zigzag lightning bolt from the top of the canvas downward, matching Python's
   * `setup_lightning_strike()`. Each char gets flash+fade scenes. Branching: 5% chance
   * per segment (top-level only, decreases by 0.01 per branch). Sparks are deferred to
   * pendingSparkSetups and emitted when the last segment is revealed.
   */
  private _setupLightningStrike(branchNeighbor: OverlayChar | null = null, branchChance = 0.05): void {
    const { dims } = this.canvas;
    const { config } = this;

    let col = branchNeighbor ? branchNeighbor.col : randInt(1, dims.right);
    let row = branchNeighbor ? branchNeighbor.row : dims.top;

    // Strike char flash: looping-gradient palette, one-shot scene (matching Python's Gradient(..., loop=True))
    const strikeFlashColor = adjustBrightness(config.lightningColor, 1.7);
    const flashGrad = new Gradient([config.lightningColor, strikeFlashColor], 7, true);
    // Strike char fade: lightning color → black (terminal background approximation)
    const fadeGrad = new Gradient([config.lightningColor, color("000000")], 6);

    let currentBranchChance = branchChance;
    let neighbor = branchNeighbor;

    while (row >= dims.bottom) {
      let sym: string;
      if (neighbor !== null) {
        // Continuation from branch: follow neighbor's direction (matching Python's branch_neighbor checks)
        if (neighbor.sym === "/") {
          col += 1;
          sym = Math.random() < 0.5 ? "|" : "\\";
        } else if (neighbor.sym === "\\") {
          col -= 1;
          sym = Math.random() < 0.5 ? "|" : "/";
        } else {
          const delta = Math.random() < 0.5 ? -1 : 1;
          col += delta;
          sym = delta === 1 ? "\\" : "/";
        }
        neighbor = null;
      } else {
        sym = randChoice(["\\", "/", "|"]);
      }

      const oc = this._getStrikeChar();
      oc.col = col;
      oc.row = row;
      oc.sym = sym;

      // flash scene: looping-palette, one-shot (fires SCENE_COMPLETE once all frames play)
      const flashScn = oc.ch.newScene("flash");
      for (const c of flashGrad.spectrum) {
        flashScn.addFrame(sym, 6, c.rgbHex);
      }
      // fade scene: lightning → black
      const fadeScn = oc.ch.newScene("fade");
      for (const c of fadeGrad.spectrum) {
        fadeScn.addFrame(sym, 2, c.rgbHex);
      }

      // flash complete → activate fade
      oc.ch.eventHandler.register("SCENE_COMPLETE", "flash", "ACTIVATE_SCENE", "fade");

      // fade complete → hide span, trigger text glow, return char to pool, check strike done
      oc.ch.eventHandler.register("SCENE_COMPLETE", "fade", "CALLBACK", {
        callback: () => {
          oc.span.style.display = "none";
          // Activate glow on the text char at this bolt position
          const key = coordKey(Math.round(oc.col), Math.round(oc.row));
          const textCh = this.coordToChar.get(key);
          if (textCh?.isVisible) {
            textCh.activateScene("glow");
            this.pendingGlowChars.push(textCh);
          }
          // Return to pool
          oc.ch.scenes.clear();
          oc.ch.activeScene = null;
          oc.ch.eventHandler = new EventHandler();
          this.availableStrikeChars.push(oc);
          // Remove from active list
          const idx = this.activeStrikeChars.indexOf(oc);
          if (idx !== -1) this.activeStrikeChars.splice(idx, 1);
          // Mark strike complete when all segments finish
          if (this.activeStrikeChars.length === 0 && this.pendingStrikeChars.length === 0) {
            this.strikeInProgress = false;
          }
        },
        args: [],
      });

      row -= 1;
      if (sym === "\\") col += 1;
      else if (sym === "/") col -= 1;

      this.pendingStrikeChars.push(oc);

      // Branch (only from top-level calls, matching Python's `branch_neighbor is None` guard)
      if (branchNeighbor === null && Math.random() < currentBranchChance) {
        currentBranchChance -= 0.01;
        this._setupLightningStrike(oc, 0); // branches don't further branch
      }
    }

    // Setup sparks at the impact point of this bolt (deferred until last segment is revealed)
    if (this.pendingStrikeChars.length > 0) {
      const lastOc = this.pendingStrikeChars[this.pendingStrikeChars.length - 1] as OverlayChar;
      const sparkCount = randInt(6, 10);
      for (let i = 0; i < sparkCount; i++) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.pendingSparkSetups.push({
          spawnCol: Math.round(lastOc.col),
          spawnRow: Math.round(lastOc.row),
          targetCol: lastOc.col + randInt(4, 20) * dir,
        });
      }
    }
  }

  /** Emit sparks from pendingSparkSetups (called when the last bolt segment is revealed). */
  private _emitSparks(): void {
    const { dims } = this.canvas;
    const { config } = this;
    const sparkGrad = new Gradient([config.sparkGlowColor, color("000000")], 7);
    const ttl = config.sparkGlowTime * sparkGrad.spectrum.length + 40;

    for (const setup of this.pendingSparkSetups) {
      const targetCol = Math.max(1, Math.min(dims.right, Math.round(setup.targetCol)));
      const sparkCh = this.particles.emit({
        symbol: randChoice(config.sparkSymbols),
        coord: { column: setup.spawnCol, row: setup.spawnRow },
        fgColor: config.sparkGlowColor.rgbHex,
        ttl,
      });
      // Glow scene on spark
      const sparkScn = sparkCh.newScene("glow");
      for (const c of sparkGrad.spectrum) {
        sparkScn.addFrame(sparkCh.inputSymbol, config.sparkGlowTime, c.rgbHex);
      }
      // Path: arc to bottom (no bezier support — known gap vs Python's bezier_control)
      const pathId = `spark_${sparkCh.id}`;
      const sparkPath = sparkCh.motion.newPath(pathId, randFloat(0.1, 0.25));
      sparkPath.addWaypoint({ column: targetCol, row: dims.bottom });
      sparkCh.motion.activatePath(pathId);
      sparkCh.activateScene("glow");
    }
    this.pendingSparkSetups = [];
  }

  /**
   * Reveal pending bolt segments progressively: 1–3 per call, with a 1-tick gap between reveals.
   * When the last segment is revealed: emit sparks, activate flash on all bolt chars + all text chars.
   * Matching Python's `step_lightning_strike()`.
   */
  private _stepLightningStrike(): void {
    if (this.strikeProgressionDelay > 0) {
      this.strikeProgressionDelay--;
      return;
    }
    if (this.pendingStrikeChars.length === 0) return;

    const count = randInt(1, 3);
    for (let i = 0; i < count; i++) {
      if (this.pendingStrikeChars.length === 0) break;
      const oc = this.pendingStrikeChars.shift();
      if (!oc) break;
      this._positionSpan(oc.span, oc.col, oc.row);
      oc.span.textContent = oc.sym;
      oc.span.style.color = `#${this.config.lightningColor.rgbHex}`;
      oc.span.style.display = "";
      // Sync currentVisual so the storm tick loop reads the correct symbol/color
      // before the flash scene activates (EffectCharacter defaults to "|" at construction).
      oc.ch.currentVisual = { symbol: oc.sym, fgColor: this.config.lightningColor.rgbHex };
      this.activeStrikeChars.push(oc);
      this.strikeProgressionDelay = 1;

      // When the last segment is revealed: flash everything + emit sparks
      if (this.pendingStrikeChars.length === 0) {
        this._emitSparks();
        // Activate flash on all bolt segments simultaneously
        for (const s of this.activeStrikeChars) {
          s.ch.activateScene("flash");
        }
        // Activate flash on all text chars (matching Python: `for text_char in get_characters()`)
        for (const textCh of this.allNonSpaceChars) {
          textCh.activateScene("flash");
          this.activeTextChars.add(textCh);
        }
      }
    }
  }

  /** Move each rain drop diagonally (+1 col, −1 row per speed unit per tick), respawn at top. */
  private _rainTick(): void {
    const { dims } = this.canvas;
    for (const drop of this.rainDrops) {
      drop.col += drop.speed;
      drop.row -= drop.speed;
      // Respawn when below canvas
      if (drop.row < dims.bottom - 1) {
        drop.col = randInt(1 - dims.top, dims.right);
        drop.row = dims.top + 1;
        drop.speed = randFloat(0.5, 1.5);
        drop.sym = randChoice(this.config.raindropSymbols);
        drop.span.textContent = drop.sym;
      }
      const displayCol = Math.round(drop.col);
      const displayRow = Math.round(drop.row);
      if (displayCol >= 1 && displayCol <= dims.right && displayRow >= dims.bottom && displayRow <= dims.top) {
        this._positionSpan(drop.span, displayCol, displayRow);
        drop.span.style.display = "";
      } else {
        drop.span.style.display = "none";
      }
    }
  }

  step(): boolean {
    switch (this.phase) {
      case "pre-storm":
        // Trigger text fade-to-dim; phase → "waiting" (storm triggers via refChar callback)
        for (const ch of this.allNonSpaceChars) {
          ch.activateScene("fade");
          this.activeTextChars.add(ch);
        }
        this.phase = "waiting";
        break;

      case "waiting":
        // Tick fading text chars; refChar's SCENE_COMPLETE "fade" callback sets phase → "storm"
        for (const ch of [...this.activeTextChars]) {
          ch.tick();
          if (!ch.isActive) this.activeTextChars.delete(ch);
        }
        break;

      case "storm":
        this.stormTick++;
        this._rainTick();

        // Random lightning strike (matching Python's `random.random() < 0.008`)
        if (!this.strikeInProgress && Math.random() < 0.008) {
          this.strikeInProgress = true;
          this._setupLightningStrike();
        }
        if (this.strikeInProgress) {
          this._stepLightningStrike();
        }

        // Flush pending glow chars into active set (added by bolt-fade callbacks)
        for (const ch of this.pendingGlowChars) {
          this.activeTextChars.add(ch);
        }
        this.pendingGlowChars = [];

        // Tick text chars with active scenes (flash and glow are non-looping; remove when done)
        for (const ch of [...this.activeTextChars]) {
          ch.tick();
          if (!ch.isActive) this.activeTextChars.delete(ch);
        }

        // Tick bolt segments (flash → fade chain via scene events)
        for (const oc of [...this.activeStrikeChars]) {
          oc.ch.tick();
          const vis = oc.ch.currentVisual;
          oc.span.textContent = vis.symbol;
          if (vis.fgColor) oc.span.style.color = `#${vis.fgColor}`;
        }

        // Tick spark particles
        this.particles.tick();

        // Storm end: once stormDuration ticks elapsed and no active strike
        if (this.stormTick >= this.config.stormDuration && !this.strikeInProgress) {
          // Hide rain
          for (const drop of this.rainDrops) drop.span.style.display = "none";
          // Activate unfade (overrides any active flash/glow)
          for (const ch of this.allNonSpaceChars) {
            ch.activateScene("unfade");
            this.activeTextChars.add(ch);
          }
          this.phase = "complete";
        }
        break;

      case "complete":
        // Tick until all unfade scenes drain
        for (const ch of [...this.activeTextChars]) {
          ch.tick();
          if (!ch.isActive) this.activeTextChars.delete(ch);
        }
        break;
    }

    return this.phase !== "complete" || this.activeTextChars.size > 0;
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
