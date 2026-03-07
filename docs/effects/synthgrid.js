export default {
  key: "synthgrid",
  name: "Synth Grid",
  description: "A retro-futuristic grid expands across the canvas, then characters dissolve into view block by block through randomized symbols before the grid collapses away.",
  config: [
    {
      name: "gridRowSymbol",
      type: "string",
      default: '"─"',
      description: "Symbol used to draw horizontal grid lines.",
    },
    {
      name: "gridColumnSymbol",
      type: "string",
      default: '"│"',
      description: "Symbol used to draw vertical grid lines.",
    },
    {
      name: "gridGradientStops",
      type: "Color[]",
      default: '["CC00CC", "ffffff"]',
      description: "Color stops for the gradient applied to the grid lines.",
    },
    {
      name: "gridGradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between grid gradient color stops.",
    },
    {
      name: "gridGradientDirection",
      type: "GradientDirection",
      default: '"diagonal"',
      description: 'Direction of the grid gradient. One of "vertical", "horizontal", "radial", "diagonal".',
    },
    {
      name: "textGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the gradient applied to the final text characters.",
    },
    {
      name: "textGradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between text gradient color stops.",
    },
    {
      name: "textGradientDirection",
      type: "GradientDirection",
      default: '"vertical"',
      description: 'Direction of the text gradient. One of "vertical", "horizontal", "radial", "diagonal".',
    },
    {
      name: "textGenerationSymbols",
      type: "string[]",
      default: '["░", "▒", "▓"]',
      description: "Symbols cycled through during the dissolve animation before characters resolve to their final form.",
    },
    {
      name: "maxActiveBlocks",
      type: "number",
      default: "0.1",
      description: "Fraction of total blocks that can be dissolving simultaneously (e.g. 0.1 = 10% of blocks active at once).",
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "synthgrid");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "synthgrid", {
  gridGradientStops: ["CC00CC", "ffffff"],
  gridGradientDirection: "diagonal",
  textGradientStops: ["8A008A", "00D1FF", "ffffff"],
  textGradientDirection: "vertical",
  maxActiveBlocks: 0.2,
});
handle2.start();`,
};
