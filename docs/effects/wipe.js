export default {
  key: "wipe",
  name: "Wipe",
  description: "Characters are revealed in a sweeping wipe motion across the text, transitioning through a gradient as they appear.",
  config: [
    {
      name: "wipeDirection",
      type: "Grouping",
      default: '"diagonalTopLeftToBottomRight"',
      description: 'Direction of the wipe sweep. One of "row", "rowBottomToTop", "column", "columnRightToLeft", "diagonal", "diagonalTopRightToBottomLeft", "diagonalTopLeftToBottomRight", "diagonalBottomRightToTopLeft", "centerToOutside", "outsideToCenter".',
    },
    {
      name: "wipeEase",
      type: "EasingFunction",
      default: "inOutCirc",
      description: "Easing function applied to the timing of the wipe sweep across character groups.",
    },
    {
      name: "wipeDelay",
      type: "number",
      default: "0",
      description: "Number of frames to wait between each wipe step.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["833ab4", "fd1d1d", "fcb045"]',
      description: "Color stops for the gradient applied to characters after the wipe reveals them.",
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
      default: "3",
      description: "Number of frames each gradient step is displayed during the wipe transition animation.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"vertical"',
      description: 'Direction of the final gradient applied across the text. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "wipe");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "wipe", {
  wipeDirection: "diagonalTopLeftToBottomRight",
  wipeEase: "inOutCirc",
  wipeDelay: 0,
  finalGradientStops: ["833ab4", "fd1d1d", "fcb045"],
  finalGradientSteps: 12,
  finalGradientFrames: 3,
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
