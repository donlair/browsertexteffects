export default {
  key: "overflow",
  name: "Overflow",
  description: "Rows of characters scroll upward in a chaotic overflow before settling into their final positions with a gradient.",
  config: [
    {
      name: "overflowGradientStops",
      type: "Color[]",
      default: '["f2ebc0", "8dbfb3", "f2ebc0"]',
      description: "Color stops for the gradient applied to rows during the chaotic overflow phase.",
    },
    {
      name: "overflowCyclesRange",
      type: "[number, number]",
      default: "[2, 4]",
      description: "Range [min, max] for the number of chaotic overflow cycles before the final pass. A random value in this range is chosen each run.",
    },
    {
      name: "overflowSpeed",
      type: "number",
      default: "3",
      description: "Maximum number of rows processed per tick during the overflow animation.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "FFFFFF"]',
      description: "Color stops for the gradient applied to characters at their final resting positions.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between final gradient color stops.",
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
const handle = createEffect(el, "Hello, World!", "overflow");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "overflow", {
  overflowGradientStops: ["f2ebc0", "8dbfb3", "f2ebc0"],
  overflowCyclesRange: [3, 6],
  overflowSpeed: 5,
  finalGradientStops: ["8A008A", "00D1FF", "FFFFFF"],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
