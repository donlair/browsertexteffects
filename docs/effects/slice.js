export default {
  key: "slice",
  name: "Slice",
  description: "Characters are split into two halves that slide in from opposite sides and meet at the center, as if the text is being sliced together. Supports vertical, horizontal, and diagonal slice directions.",
  config: [
    {
      name: "sliceDirection",
      type: '"vertical" | "horizontal" | "diagonal"',
      default: '"vertical"',
      description: 'Direction of the slice. "vertical" splits characters left/right of center column; "horizontal" splits rows above/below center; "diagonal" splits along diagonal groups.',
    },
    {
      name: "movementSpeed",
      type: "number",
      default: "0.25",
      description: "Speed at which characters travel to their final positions, in characters per frame.",
    },
    {
      name: "movementEasing",
      type: "EasingFunction",
      default: "inOutExpo",
      description: "Easing function applied to the movement path. Controls the acceleration curve as characters slide into place.",
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
      default: '"diagonal"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "slice");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "slice", {
  sliceDirection: "horizontal",
  movementSpeed: 0.25,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientSteps: 12,
  finalGradientDirection: "diagonal",
});
handle2.start();`,
};
