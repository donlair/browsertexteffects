export default {
  key: "bubbles",
  name: "Bubbles",
  description: "Characters are grouped into colorful bubbles that float upward from below the canvas. Each bubble pops when it reaches its target row, scattering characters outward before they settle into their final positions with a gradient transition.",
  config: [
    {
      name: "bubbleColors",
      type: "Color[]",
      default: '["d33aff", "7395c4", "43c2a7", "02ff7f"]',
      description: "Colors randomly assigned to bubbles. Each bubble picks one color for all its characters during the float phase.",
    },
    {
      name: "popColor",
      type: "Color",
      default: '"ffffff"',
      description: "Color applied to characters when a bubble pops.",
    },
    {
      name: "bubbleSpeed",
      type: "number",
      default: "0.5",
      description: "Speed at which bubbles float toward their target position, in canvas units per frame.",
    },
    {
      name: "bubbleDelay",
      type: "number",
      default: "20",
      description: "Number of frames between successive bubble launches.",
    },
    {
      name: "popCondition",
      type: '"row" | "bottom" | "anywhere"',
      default: '"row"',
      description: 'Determines when a bubble pops. "row" pops when the bubble reaches the lowest row of its characters. "bottom" pops at the bottom of the canvas. "anywhere" pops randomly at any point during travel.',
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["d33aff", "02ff7f"]',
      description: "Color stops for the gradient applied to characters after they settle into their final positions.",
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
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "bubbles");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "bubbles", {
  bubbleColors: [color("ff6b6b"), color("ffd93d"), color("6bcb77"), color("4d96ff")],
  bubbleSpeed: 0.8,
  popCondition: "bottom",
  finalGradientStops: [color("d33aff"), color("02ff7f")],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
