export default {
  key: "scattered",
  name: "Scattered",
  description: "Characters begin at random positions across the canvas and travel to their final positions along motion paths, arriving with an eased back movement. A gradient is applied to characters as they settle into place.",
  config: [
    {
      name: "movementSpeed",
      type: "number",
      default: "0.5",
      description: "Speed at which characters travel to their final positions, in characters per frame.",
    },
    {
      name: "movementEasing",
      type: "EasingFunction",
      default: "inOutBack",
      description: "Easing function applied to the movement path. Controls the acceleration curve as characters approach their final positions.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["ff9048", "ab9dff", "bdffea"]',
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
      default: "9",
      description: "Number of frames over which each character transitions through the final gradient colors.",
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
const handle = createEffect(el, "Hello, World!", "scattered");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "scattered", {
  movementSpeed: 0.5,
  finalGradientStops: [color("ff9048"), color("ab9dff"), color("bdffea")],
  finalGradientSteps: 12,
  finalGradientFrames: 9,
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
