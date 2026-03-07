export default {
  key: "crumble",
  name: "Crumble",
  description: "Characters weaken and crumble apart, falling to the bottom of the canvas as dust. They are then vacuumed up and rain back down into their final positions, brightening into the final gradient.",
  config: [
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["5CE1FF", "FF8C00"]',
      description: "Color stops for the gradient applied to characters in their final state.",
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
      default: '"diagonal"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "crumble");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "crumble", {
  finalGradientStops: ["ff4400", "ffcc00"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
