export * from "../src/index.ts";
export * from "../src/effects-api/beams.ts";
export * from "../src/effects-api/binarypath.ts";
export * from "../src/effects-api/blackhole.ts";
export * from "../src/effects-api/bouncyballs.ts";
export * from "../src/effects-api/bubbles.ts";
export * from "../src/effects-api/burn.ts";
export * from "../src/effects-api/colorshift.ts";
export * from "../src/effects-api/crumble.ts";
export * from "../src/effects-api/decrypt.ts";
export * from "../src/effects-api/errorcorrect.ts";
export * from "../src/effects-api/expand.ts";
export * from "../src/effects-api/fireworks.ts";
export * from "../src/effects-api/highlight.ts";
export * from "../src/effects-api/laseretch.ts";
export * from "../src/effects-api/matrix.ts";
export * from "../src/effects-api/middleout.ts";
export * from "../src/effects-api/orbittingvolley.ts";
export * from "../src/effects-api/overflow.ts";
export * from "../src/effects-api/pour.ts";
export * from "../src/effects-api/print.ts";
export * from "../src/effects-api/rain.ts";
export * from "../src/effects-api/randomsequence.ts";
export * from "../src/effects-api/rings.ts";
export * from "../src/effects-api/scattered.ts";
export * from "../src/effects-api/slice.ts";
export * from "../src/effects-api/slide.ts";
export * from "../src/effects-api/smoke.ts";
export * from "../src/effects-api/spotlights.ts";
export * from "../src/effects-api/spray.ts";
export * from "../src/effects-api/swarm.ts";
export * from "../src/effects-api/sweep.ts";
export * from "../src/effects-api/synthgrid.ts";
export * from "../src/effects-api/thunderstorm.ts";
export * from "../src/effects-api/unstable.ts";
export * from "../src/effects-api/vhstape.ts";
export * from "../src/effects-api/waves.ts";
export * from "../src/effects-api/wipe.ts";

import { createEffectOnScrollWith, createEffectWith } from "../src/index.ts";
import { beamsEffect } from "../src/effects-api/beams.ts";
import { binaryPathEffect } from "../src/effects-api/binarypath.ts";
import { blackholeEffect } from "../src/effects-api/blackhole.ts";
import { bouncyBallsEffect } from "../src/effects-api/bouncyballs.ts";
import { bubblesEffect } from "../src/effects-api/bubbles.ts";
import { burnEffect } from "../src/effects-api/burn.ts";
import { colorShiftEffect } from "../src/effects-api/colorshift.ts";
import { crumbleEffect } from "../src/effects-api/crumble.ts";
import { decryptEffect } from "../src/effects-api/decrypt.ts";
import { errorCorrectEffect } from "../src/effects-api/errorcorrect.ts";
import { expandEffect } from "../src/effects-api/expand.ts";
import { fireworksEffect } from "../src/effects-api/fireworks.ts";
import { highlightEffect } from "../src/effects-api/highlight.ts";
import { laserEtchEffect } from "../src/effects-api/laseretch.ts";
import { matrixEffect } from "../src/effects-api/matrix.ts";
import { middleOutEffect } from "../src/effects-api/middleout.ts";
import { orbittingVolleyEffect } from "../src/effects-api/orbittingvolley.ts";
import { overflowEffect } from "../src/effects-api/overflow.ts";
import { pourEffect } from "../src/effects-api/pour.ts";
import { printEffect } from "../src/effects-api/print.ts";
import { rainEffect } from "../src/effects-api/rain.ts";
import { randomSequenceEffect } from "../src/effects-api/randomsequence.ts";
import { ringsEffect } from "../src/effects-api/rings.ts";
import { scatteredEffect } from "../src/effects-api/scattered.ts";
import { sliceEffect } from "../src/effects-api/slice.ts";
import { slideEffect } from "../src/effects-api/slide.ts";
import { smokeEffect } from "../src/effects-api/smoke.ts";
import { spotlightsEffect } from "../src/effects-api/spotlights.ts";
import { sprayEffect } from "../src/effects-api/spray.ts";
import { swarmEffect } from "../src/effects-api/swarm.ts";
import { sweepEffect } from "../src/effects-api/sweep.ts";
import { synthGridEffect } from "../src/effects-api/synthgrid.ts";
import { thunderstormEffect } from "../src/effects-api/thunderstorm.ts";
import { unstableEffect } from "../src/effects-api/unstable.ts";
import { vhstapeEffect } from "../src/effects-api/vhstape.ts";
import { wavesEffect } from "../src/effects-api/waves.ts";
import { wipeEffect } from "../src/effects-api/wipe.ts";

const EFFECT_DEFINITIONS = {
  beams: beamsEffect,
  binarypath: binaryPathEffect,
  blackhole: blackholeEffect,
  bouncyballs: bouncyBallsEffect,
  bubbles: bubblesEffect,
  burn: burnEffect,
  colorshift: colorShiftEffect,
  crumble: crumbleEffect,
  decrypt: decryptEffect,
  errorcorrect: errorCorrectEffect,
  expand: expandEffect,
  fireworks: fireworksEffect,
  highlight: highlightEffect,
  laseretch: laserEtchEffect,
  matrix: matrixEffect,
  middleout: middleOutEffect,
  orbittingvolley: orbittingVolleyEffect,
  overflow: overflowEffect,
  pour: pourEffect,
  print: printEffect,
  rain: rainEffect,
  randomsequence: randomSequenceEffect,
  rings: ringsEffect,
  scattered: scatteredEffect,
  slice: sliceEffect,
  slide: slideEffect,
  smoke: smokeEffect,
  spotlights: spotlightsEffect,
  spray: sprayEffect,
  swarm: swarmEffect,
  sweep: sweepEffect,
  synthgrid: synthGridEffect,
  thunderstorm: thunderstormEffect,
  unstable: unstableEffect,
  vhstape: vhstapeEffect,
  waves: wavesEffect,
  wipe: wipeEffect,
};

export { EFFECT_DEFINITIONS };

export function createEffect(container, text, effectName, config) {
  const effectDefinition = EFFECT_DEFINITIONS[effectName];
  if (!effectDefinition) {
    throw new Error(`Unknown effect "${effectName}"`);
  }
  return createEffectWith(container, text, effectDefinition, config);
}

export function createEffectOnScroll(container, text, effectName, config) {
  const effectDefinition = EFFECT_DEFINITIONS[effectName];
  if (!effectDefinition) {
    throw new Error(`Unknown effect "${effectName}"`);
  }
  return createEffectOnScrollWith(container, text, effectDefinition, config);
}
