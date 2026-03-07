export default {
  key: "expand",
  name: "Expand",
  description: "All characters begin stacked at the center of the canvas and expand outward to their final positions, transitioning through a gradient as they settle.",
  config: [
    {
      name: "movementSpeed",
      type: "number",
      default: "0.35",
      description: "Speed at which characters travel from the center to their final positions.",
    },
    {
      name: "expandEasing",
      type: "EasingFunction",
      default: "inOutQuart",
      description: "Easing function applied to the expansion movement.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "FFFFFF"]',
      description: "Color stops for the gradient applied to characters in their final state.",
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
      default: "5",
      description: "Number of frames over which each character transitions through the final gradient.",
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
const handle = createEffect(el, "Hello, World!", "expand");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "expand", {
  movementSpeed: 0.5,
  finalGradientStops: ["ff8800", "ffcc00"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
