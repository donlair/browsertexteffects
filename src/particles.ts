import { EffectCharacter } from "./character";
import type { Coord } from "./types";
import type { CanvasDimensions } from "./canvas";

export interface ParticleConfig {
  symbol: string;
  coord: Coord;
  fgColor?: string | null;
  ttl: number;
}

interface Particle {
  character: EffectCharacter;
  span: HTMLSpanElement;
  ticksRemaining: number;
}

let nextParticleId = 2_000_000;

export class ParticleSystem {
  private container: HTMLElement;
  private particles: Set<Particle> = new Set();
  private cellWidthPx: number = 0;
  private cellHeightPx: number = 0;
  private totalRows: number;
  private lineHeight: number;

  constructor(
    container: HTMLElement,
    canvasDims: CanvasDimensions,
    lineHeight: number = 1.2,
  ) {
    this.container = container;
    this.totalRows = canvasDims.top;
    this.lineHeight = lineHeight;
    this._measureCell();
  }

  private _measureCell(): void {
    const probe = document.createElement("span");
    probe.textContent = "0";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.lineHeight = `${this.lineHeight}em`;
    this.container.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    this.cellWidthPx = rect.width;
    this.cellHeightPx = rect.height;
    this.container.removeChild(probe);
  }

  emit(config: ParticleConfig): EffectCharacter {
    const id = nextParticleId++;
    const ch = new EffectCharacter(id, config.symbol, config.coord.column, config.coord.row);
    ch.isVisible = true;
    ch.currentVisual = {
      symbol: config.symbol,
      fgColor: config.fgColor ?? null,
    };

    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.width = `${Math.ceil(this.cellWidthPx)}px`;
    span.style.lineHeight = `${Math.round(this.cellHeightPx)}px`;
    span.textContent = config.symbol;
    span.style.color = config.fgColor ? `#${config.fgColor}` : "";
    this._positionSpan(span, config.coord);
    this.container.appendChild(span);

    const particle: Particle = {
      character: ch,
      span,
      ticksRemaining: config.ttl,
    };
    this.particles.add(particle);
    return ch;
  }

  tick(): void {
    for (const p of this.particles) {
      p.character.tick();
      p.ticksRemaining--;

      if (p.ticksRemaining <= 0 || !p.character.isActive) {
        p.span.remove();
        this.particles.delete(p);
        continue;
      }

      // Update span from character state
      const vis = p.character.currentVisual;
      p.span.textContent = vis.symbol;
      p.span.style.color = vis.fgColor ? `#${vis.fgColor}` : "";

      // Update position from motion
      const coord = p.character.motion.currentCoord;
      this._positionSpan(p.span, coord);
    }
  }

  private _positionSpan(span: HTMLSpanElement, coord: Coord): void {
    span.style.left = `${Math.round((coord.column - 1) * this.cellWidthPx)}px`;
    span.style.top = `${Math.round((this.totalRows - coord.row) * this.cellHeightPx)}px`;
  }

  dispose(): void {
    for (const p of this.particles) {
      p.span.remove();
    }
    this.particles.clear();
  }

  get count(): number {
    return this.particles.size;
  }
}
