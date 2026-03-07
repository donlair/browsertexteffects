export default {
  key: "spotlights",
  name: "Spotlights",
  description: "Spotlights sweep across the text searching for characters, then converge to the center and expand outward to reveal the final gradient colors.",
  config: [
    {
      name: "spotlightCount",
      type: "number",
      default: "3",
      description: "Number of spotlights moving simultaneously during the search phase.",
    },
    {
      name: "beamWidthRatio",
      type: "number",
      default: "2.0",
      description: "Controls the spotlight beam width as a divisor of the smallest canvas dimension. Higher values produce narrower beams.",
    },
    {
      name: "beamFalloff",
      type: "number",
      default: "0.3",
      description: "Fraction of the beam radius over which brightness falls off from full to dim (0–1). Lower values produce a harder edge.",
    },
    {
      name: "searchDuration",
      type: "number",
      default: "550",
      description: "Number of frames the spotlights spend searching before converging to the center.",
    },
    {
      name: "searchSpeedRange",
      type: "[number, number]",
      default: "[0.35, 0.75]",
      description: "Min and max movement speed (in canvas units per frame) randomly assigned to each spotlight during the search phase.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["ab48ff", "e7b2b2", "fffebd"]',
      description: "Color stops for the gradient applied to characters at their final resting positions.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between final gradient color stops.",
    },
    {
      name: "finalGradientFrames",
      type: "number",
      default: "9",
      description: "Number of frames used to animate each character transitioning into its final gradient color.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"vertical"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "spotlights");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "spotlights", {
  spotlightCount: 2,
  beamWidthRatio: 3.0,
  searchDuration: 300,
  finalGradientStops: ["ab48ff", "e7b2b2", "fffebd"],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
