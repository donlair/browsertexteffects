export default {
  key: "spray",
  name: "Spray",
  description: "Characters spray out from a source position along arc paths, cycling through symbols and colors mid-flight before settling into their final gradient colors.",
  config: [
    {
      name: "sprayColors",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Colors cycled through by characters during the spray flight animation.",
    },
    {
      name: "spraySymbols",
      type: "string[]",
      default: '["*", "·", ".", "+"]',
      description: "Symbols cycled through by characters during the spray flight animation.",
    },
    {
      name: "sourcePosition",
      type: '"n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" | "center"',
      default: '"e"',
      description: "Edge or corner of the canvas from which characters are launched. \"center\" launches from the middle.",
    },
    {
      name: "arcHeight",
      type: "number",
      default: "4",
      description: "Height of the arc (in canvas rows) that each character follows from the source to its target position.",
    },
    {
      name: "flightSpeedRange",
      type: "[number, number]",
      default: "[0.6, 1.4]",
      description: "Min and max movement speed (in canvas units per frame) randomly assigned to each character during flight.",
    },
    {
      name: "flightEasing",
      type: "EasingFunction",
      default: "outExpo",
      description: "Easing function applied to each character's flight path. Controls how speed changes along the arc.",
    },
    {
      name: "sprayVolume",
      type: "number",
      default: "0.005",
      description: "Fraction of total characters launched per frame tick (e.g. 0.005 = 0.5% of characters). Controls spray density over time.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
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
      default: "8",
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
const handle = createEffect(el, "Hello, World!", "spray");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "spray", {
  sourcePosition: "w",
  arcHeight: 6,
  sprayColors: ["8A008A", "00D1FF", "ffffff"],
  finalGradientStops: ["8A008A", "00D1FF", "ffffff"],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
