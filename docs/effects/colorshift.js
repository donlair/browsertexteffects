export default {
  key: "colorshift",
  name: "Color Shift",
  description: "Characters cycle through a spectrum gradient that shifts across the canvas, then settle into a final gradient. The offset of each character within the gradient is determined by its position, creating a flowing wave of color.",
  config: [
    {
      name: "gradientStops",
      type: "Color[]",
      default: '["e81416", "ffa500", "faeb36", "79c314", "487de7", "4b369d", "70369d"]',
      description: "Color stops for the cycling gradient during the animation phase.",
    },
    {
      name: "gradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between gradient color stops.",
    },
    {
      name: "gradientFrames",
      type: "number",
      default: "2",
      description: "Number of frames each gradient color is displayed before advancing.",
    },
    {
      name: "cycles",
      type: "number",
      default: "3",
      description: "Number of gradient cycles each character completes before settling into the final gradient. Set to 0 for infinite cycling.",
    },
    {
      name: "travelDirection",
      type: "GradientDirection",
      default: '"radial"',
      description: 'Direction used to calculate each character\'s offset into the gradient. One of "vertical", "horizontal", "radial", "diagonal".',
    },
    {
      name: "reverseTravelDirection",
      type: "boolean",
      default: "false",
      description: "When true, reverses the direction of gradient travel across the canvas.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["e81416", "ffa500", "faeb36", "79c314", "487de7", "4b369d", "70369d"]',
      description: "Color stops for the gradient applied to characters after cycling completes.",
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
const handle = createEffect(el, "Hello, World!", "colorshift");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "colorshift", {
  gradientStops: ["ff0000", "ff8800", "ffff00", "00ff00", "0088ff", "8800ff"],
  cycles: 5,
  travelDirection: "horizontal",
  finalGradientStops: ["ffffff", "888888"],
  finalGradientDirection: "radial",
});
handle2.start();`,
};
