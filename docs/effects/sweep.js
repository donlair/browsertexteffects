export default {
  key: "sweep",
  name: "Sweep",
  description: "Two sweeps pass across the canvas — the first reveals characters in grayscale, the second applies the final gradient colors — each sweep moving in the configured direction.",
  config: [
    {
      name: "sweepSymbols",
      type: "string[]",
      default: '["█", "▓", "▒", "░"]',
      description: "Block characters cycled through during each sweep animation frame.",
    },
    {
      name: "firstSweepDirection",
      type: "SweepDirection",
      default: '"right_to_left"',
      description: 'Direction of the first (reveal) sweep. One of "left_to_right" or "right_to_left".',
    },
    {
      name: "secondSweepDirection",
      type: "SweepDirection",
      default: '"left_to_right"',
      description: 'Direction of the second (color) sweep. One of "left_to_right" or "right_to_left".',
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the gradient applied to characters after the second sweep.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "8",
      description: "Number of interpolation steps between final gradient color stops.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"vertical"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "sweep");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "sweep", {
  firstSweepDirection: "left_to_right",
  secondSweepDirection: "right_to_left",
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
