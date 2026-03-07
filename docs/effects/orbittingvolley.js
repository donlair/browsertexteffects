export default {
  key: "orbittingvolley",
  name: "Orbitting Volley",
  description: "Four launchers orbit the perimeter of the canvas, periodically firing volleys of characters toward their final positions.",
  config: [
    {
      name: "launcherSymbols",
      type: "string[]",
      default: '["█", "█", "█", "█"]',
      description: "Symbols used for the four launcher characters that orbit the canvas perimeter.",
    },
    {
      name: "launcherMovementSpeed",
      type: "number",
      default: "0.8",
      description: "Speed at which launcher characters advance along the perimeter each tick (positions per tick).",
    },
    {
      name: "characterMovementSpeed",
      type: "number",
      default: "1.5",
      description: "Speed at which fired characters travel to their final positions (columns per tick).",
    },
    {
      name: "characterEasing",
      type: "EasingFunction",
      default: "outSine",
      description: "Easing function applied to each character's movement from its launch point to its final position.",
    },
    {
      name: "volleySize",
      type: "number",
      default: "0.03",
      description: "Fraction of the total character count fired per launcher per volley. For example, 0.03 fires roughly 3% of total characters per launcher each volley.",
    },
    {
      name: "launchDelay",
      type: "number",
      default: "30",
      description: "Number of ticks between each volley launch.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["FFA15C", "44D492"]',
      description: "Color stops for the gradient applied to characters at their final positions.",
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
      default: '"radial"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "orbittingvolley");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "orbittingvolley", {
  launcherMovementSpeed: 1.2,
  characterMovementSpeed: 2.0,
  volleySize: 0.05,
  launchDelay: 20,
  finalGradientStops: ["FFA15C", "44D492"],
  finalGradientDirection: "radial",
});
handle2.start();`,
};
