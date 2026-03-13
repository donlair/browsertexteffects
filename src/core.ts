import { Canvas } from "./canvas";
import { DOMRenderer } from "./renderer";

export interface EffectHandle {
  start: () => void;
  stop: () => void;
}

export interface CommonEffectOptions {
  lineHeight?: number;
  fillContainer?: boolean;
  extraRows?: number;
  onComplete?: () => void;
}

export type EffectConfigInput<TConfig extends object> = Partial<TConfig> & CommonEffectOptions;

export interface EffectInstance {
  step: () => boolean;
}

export interface EffectContext {
  canvas: Canvas;
  container: HTMLElement;
}

export interface EffectDefinition<TConfig extends object> {
  defaultConfig: TConfig;
  create: (context: EffectContext, config: TConfig) => EffectInstance;
  buildBeforeRenderer?: boolean;
}

function measureCellSize(container: HTMLElement, lineHeight: number): { w: number; h: number } {
  const probe = document.createElement("span");
  probe.textContent = "0";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.lineHeight = `${lineHeight}em`;
  container.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  container.removeChild(probe);
  return { w: rect.width, h: rect.height };
}

function padTextToFill(
  text: string,
  container: HTMLElement,
  lineHeight: number,
  extraRows: number = 0,
): string {
  const NBSP = "\u00A0";
  const cell = measureCellSize(container, lineHeight);
  if (cell.w === 0 || cell.h === 0) return text;

  let availWidth: number;
  let availHeight: number;
  const parent = container.parentElement;
  if (parent) {
    const cs = getComputedStyle(parent);
    availWidth = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    availHeight = parent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  } else {
    availWidth = container.clientWidth;
    availHeight = container.clientHeight;
  }
  if (availWidth <= 0 || availHeight <= 0) return text;

  const fillCols = Math.floor(availWidth / cell.w);
  const textLines = text.split("\n");
  const fillRows = Math.max(textLines.length, Math.floor(availHeight / cell.h)) + extraRows;

  const nbspLines = textLines.map((line) => line.replace(/ /g, NBSP));
  const paddedLines: string[] = nbspLines.map((line) => {
    if (line.length >= fillCols) return line;
    const totalPad = fillCols - line.length;
    const leftPad = Math.floor(totalPad / 2);
    const rightPad = totalPad - leftPad;
    return NBSP.repeat(leftPad) + line + NBSP.repeat(rightPad);
  });

  const emptyLine = NBSP.repeat(fillCols);
  const totalVertPad = fillRows - paddedLines.length;
  if (totalVertPad > 0) {
    const topPad = Math.floor(totalVertPad / 2);
    const bottomPad = totalVertPad - topPad;
    for (let i = 0; i < topPad; i++) paddedLines.unshift(emptyLine);
    for (let i = 0; i < bottomPad; i++) paddedLines.push(emptyLine);
  }

  return paddedLines.join("\n");
}

export function createEffectWith<TConfig extends object>(
  container: HTMLElement,
  text: string,
  effectDefinition: EffectDefinition<TConfig>,
  config?: EffectConfigInput<TConfig>,
): EffectHandle {
  const {
    lineHeight = 1.2,
    fillContainer = false,
    extraRows = 0,
    onComplete,
    ...effectConfigOverrides
  } = (config ?? {}) as EffectConfigInput<TConfig>;

  if (fillContainer) {
    text = padTextToFill(text, container, lineHeight, extraRows);
  }

  const canvas = new Canvas(text, { includeSpaces: true });
  const effectConfig = {
    ...effectDefinition.defaultConfig,
    ...effectConfigOverrides,
  } as TConfig;

  let animId: number | null = null;
  let effect: EffectInstance;
  let renderer: DOMRenderer;

  if (effectDefinition.buildBeforeRenderer) {
    effect = effectDefinition.create({ canvas, container }, effectConfig);
    renderer = new DOMRenderer(container, canvas, lineHeight);
  } else {
    renderer = new DOMRenderer(container, canvas, lineHeight);
    effect = effectDefinition.create({ canvas, container }, effectConfig);
  }

  function tick() {
    const hasMore = effect.step();
    renderer.render();
    if (hasMore) {
      animId = requestAnimationFrame(tick);
    } else {
      animId = null;
      onComplete?.();
    }
  }

  return {
    start() {
      if (animId !== null) return;
      animId = requestAnimationFrame(tick);
    },
    stop() {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    },
  };
}

export function createEffectOnScrollWith<TConfig extends object>(
  container: HTMLElement,
  text: string,
  effectDefinition: EffectDefinition<TConfig>,
  config?: EffectConfigInput<TConfig>,
): EffectHandle {
  const handle = createEffectWith(container, text, effectDefinition, config);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          handle.start();
          observer.disconnect();
        }
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(container);

  return handle;
}

export function createEffectFactory<TConfig extends object>(effectDefinition: EffectDefinition<TConfig>) {
  return (
    container: HTMLElement,
    text: string,
    config?: EffectConfigInput<TConfig>,
  ): EffectHandle => createEffectWith(container, text, effectDefinition, config);
}

export function createEffectOnScrollFactory<TConfig extends object>(effectDefinition: EffectDefinition<TConfig>) {
  return (
    container: HTMLElement,
    text: string,
    config?: EffectConfigInput<TConfig>,
  ): EffectHandle => createEffectOnScrollWith(container, text, effectDefinition, config);
}
