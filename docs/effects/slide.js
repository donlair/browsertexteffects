export default {
  key: "slide",
  name: "Slide",
  description: "Characters slide in from outside the canvas boundary in groups (rows, columns, or diagonals), easing into their final positions with a gradient color transition.",
  config: [
    {
      name: "movementSpeed",
      type: "number",
      default: "0.8",
      description: "Speed at which characters travel to their final positions, in characters per frame.",
    },
    {
      name: "grouping",
      type: '"row" | "rowBottomToTop" | "column" | "columnRightToLeft" | "diagonal" | "diagonalTopRightToBottomLeft" | "diagonalTopLeftToBottomRight" | "diagonalBottomRightToTopLeft" | "centerToOutside" | "outsideToCenter"',
      default: '"row"',
      description: "How characters are grouped for the slide animation. Each group slides in together.",
    },
    {
      name: "gap",
      type: "number",
      default: "2",
      description: "Number of frames to wait between launching each successive group.",
    },
    {
      name: "reverseDirection",
      type: "boolean",
      default: "false",
      description: "When true, groups slide in from the opposite side (e.g. rows slide from right instead of left).",
    },
    {
      name: "merge",
      type: "boolean",
      default: "false",
      description: "When true, alternating groups slide in from opposite sides and meet in the middle.",
    },
    {
      name: "movementEasing",
      type: "EasingFunction",
      default: "inOutQuad",
      description: "Easing function applied to the movement path. Controls the acceleration curve as characters slide into place.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["833ab4", "fd1d1d", "fcb045"]',
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
      default: "6",
      description: "Number of frames over which each character transitions to its final gradient color.",
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
const handle = createEffect(el, "Hello, World!", "slide");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "slide", {
  grouping: "column",
  movementSpeed: 0.8,
  gap: 2,
  merge: true,
  finalGradientStops: [color("833ab4"), color("fd1d1d"), color("fcb045")],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
