export default {
  key: "highlight",
  name: "Highlight",
  description: "A highlight sweeps across the characters in a configurable direction, brightening each group as it passes before settling into a final gradient.",
  config: [
    {
      name: "highlightBrightness",
      type: "number",
      default: "1.75",
      description: "Brightness multiplier applied to each character's color at the peak of the highlight sweep. Values above 1 brighten; values below 1 darken.",
    },
    {
      name: "highlightDirection",
      type: "Grouping",
      default: '"diagonal"',
      description: 'Direction the highlight sweeps across the text. One of "row", "column", or "diagonal".',
    },
    {
      name: "highlightWidth",
      type: "number",
      default: "8",
      description: "Number of frames each character stays at peak brightness before fading back to its base color.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "FFFFFF"]',
      description: "Color stops for the gradient applied to characters in their final settled state.",
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
const handle = createEffect(el, "Hello, World!", "highlight");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "highlight", {
  highlightBrightness: 2.0,
  highlightDirection: "row",
  highlightWidth: 12,
  finalGradientStops: ["ff0080", "8000ff"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
