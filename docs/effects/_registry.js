/**
 * _registry.js — Ordered list of all 37 effects.
 * Used by effect-page.js for prev/next navigation.
 */

export const EFFECTS = [
  { key: 'beams',           name: 'Beams' },
  { key: 'binarypath',      name: 'Binary Path' },
  { key: 'blackhole',       name: 'Blackhole' },
  { key: 'bouncyballs',     name: 'Bouncy Balls' },
  { key: 'bubbles',         name: 'Bubbles' },
  { key: 'burn',            name: 'Burn' },
  { key: 'colorshift',      name: 'Color Shift' },
  { key: 'crumble',         name: 'Crumble' },
  { key: 'decrypt',         name: 'Decrypt' },
  { key: 'errorcorrect',    name: 'Error Correct' },
  { key: 'expand',          name: 'Expand' },
  { key: 'fireworks',       name: 'Fireworks' },
  { key: 'highlight',       name: 'Highlight' },
  { key: 'laseretch',       name: 'Laser Etch' },
  { key: 'matrix',          name: 'Matrix' },
  { key: 'middleout',       name: 'Middle Out' },
  { key: 'orbittingvolley', name: 'Orbitting Volley' },
  { key: 'overflow',        name: 'Overflow' },
  { key: 'pour',            name: 'Pour' },
  { key: 'print',           name: 'Print' },
  { key: 'rain',            name: 'Rain' },
  { key: 'randomsequence',  name: 'Random Sequence' },
  { key: 'rings',           name: 'Rings' },
  { key: 'scattered',       name: 'Scattered' },
  { key: 'slice',           name: 'Slice' },
  { key: 'slide',           name: 'Slide' },
  { key: 'smoke',           name: 'Smoke' },
  { key: 'spotlights',      name: 'Spotlights' },
  { key: 'spray',           name: 'Spray' },
  { key: 'swarm',           name: 'Swarm' },
  { key: 'sweep',           name: 'Sweep' },
  { key: 'synthgrid',       name: 'Synth Grid' },
  { key: 'thunderstorm',    name: 'Thunderstorm' },
  { key: 'unstable',        name: 'Unstable' },
  { key: 'vhstape',         name: 'VHS Tape' },
  { key: 'waves',           name: 'Waves' },
  { key: 'wipe',            name: 'Wipe' },
];

/**
 * Returns the effect entries immediately before and after the given key,
 * for prev/next navigation.
 * @param {string} key
 * @returns {{ prev: { key: string, name: string } | null, next: { key: string, name: string } | null }}
 */
export function getAdjacentEffects(key) {
  const idx = EFFECTS.findIndex(e => e.key === key);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? EFFECTS[idx - 1] : null,
    next: idx < EFFECTS.length - 1 ? EFFECTS[idx + 1] : null,
  };
}
