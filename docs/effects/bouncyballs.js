export default {
  key: "bouncyballs",
  name: "Bouncy Balls",
  description: "Characters fall from above the canvas as colored balls, bouncing into their final positions using an easing curve. Once landed, each character transitions through a color gradient to its final state.",
  config: [
    {
      name: "ballColors",
      type: "Color[]",
      default: '["d1f4a5", "96e2a4", "5acda9"]',
      description: "Colors randomly assigned to each ball as it falls.",
    },
    {
      name: "ballSymbols",
      type: "string[]",
      default: '["*", "o", "O", "0", "."]',
      description: "Symbols randomly assigned to each ball during the fall animation.",
    },
    {
      name: "ballDelay",
      type: "number",
      default: "4",
      description: "Number of frames between successive ball drops.",
    },
    {
      name: "movementSpeed",
      type: "number",
      default: "0.45",
      description: "Speed of ball movement along the drop path.",
    },
    {
      name: "movementEasing",
      type: "EasingFunction",
      default: "outBounce",
      description: "Easing function applied to ball movement. The default outBounce produces the characteristic bouncing landing.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["f8ffae", "43c6ac"]',
      description: "Color stops for the gradient applied to characters after they land.",
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
      description: "Number of frames over which each step of the final gradient transition is displayed.",
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
const handle = createEffect(el, "Hello, World!", "bouncyballs");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "bouncyballs", {
  ballColors: [color("ff6b6b"), color("ffd93d"), color("6bcb77")],
  ballDelay: 2,
  finalGradientStops: [color("f8ffae"), color("43c6ac")],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
