export default {
  key: "middleout",
  name: "Middle Out",
  description: "All characters converge to the center of the canvas, then expand outward to their final positions with a color gradient transition.",
  config: [
    {
      name: "startingColor",
      type: "Color",
      default: '"ffffff"',
      description: "Color of each character during the convergence and initial expansion phase.",
    },
    {
      name: "expandDirection",
      type: '"vertical" | "horizontal"',
      default: '"vertical"',
      description: 'Axis along which characters first spread from center. "vertical" spreads to the correct row first; "horizontal" spreads to the correct column first.',
    },
    {
      name: "centerMovementSpeed",
      type: "number",
      default: "0.6",
      description: "Speed at which characters move to their intermediate center-axis position (columns or rows per tick).",
    },
    {
      name: "fullMovementSpeed",
      type: "number",
      default: "0.6",
      description: "Speed at which characters move from the center axis to their final positions.",
    },
    {
      name: "centerEasing",
      type: "EasingFunction",
      default: "inOutSine",
      description: "Easing function applied to the center-convergence movement phase.",
    },
    {
      name: "fullEasing",
      type: "EasingFunction",
      default: "inOutSine",
      description: "Easing function applied to the full-expansion movement phase.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "FFFFFF"]',
      description: "Color stops for the gradient applied to characters as they reach their final positions.",
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
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "middleout");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "middleout", {
  expandDirection: "horizontal",
  startingColor: color("00ffff"),
  centerMovementSpeed: 0.8,
  fullMovementSpeed: 0.8,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("ffffff")],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
