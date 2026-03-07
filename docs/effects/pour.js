export default {
  key: "pour",
  name: "Pour",
  description: "Characters are poured onto the canvas from the edges, flowing into their final positions like liquid filling a container.",
  config: [
    {
      name: "pourDirection",
      type: '"up" | "down" | "left" | "right"',
      default: '"down"',
      description: 'Direction from which characters are poured onto the canvas. "down" fills from the bottom up, "up" fills from the top down, "left" fills from the right, "right" fills from the left.',
    },
    {
      name: "pourSpeed",
      type: "number",
      default: "2",
      description: "Number of characters activated per tick within the current group.",
    },
    {
      name: "movementSpeedRange",
      type: "[number, number]",
      default: "[0.4, 0.6]",
      description: "Range [min, max] for the speed at which each character travels to its final position. A random value in this range is chosen per character.",
    },
    {
      name: "gap",
      type: "number",
      default: "1",
      description: "Number of ticks to wait between activating batches of characters within a group.",
    },
    {
      name: "startingColor",
      type: "Color",
      default: '"ffffff"',
      description: "Color applied to characters when they first appear before transitioning to the final gradient.",
    },
    {
      name: "movementEasing",
      type: "EasingFunction",
      default: '"inQuad"',
      description: "Easing function applied to character movement along the path to the final position.",
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
      name: "finalGradientFrames",
      type: "number",
      default: "6",
      description: "Number of animation frames used to transition each character from the starting color to its final gradient color.",
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
const handle = createEffect(el, "Hello, World!", "pour");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "pour", {
  pourDirection: "right",
  pourSpeed: 3,
  movementSpeedRange: [0.3, 0.7],
  startingColor: "00ffff",
  finalGradientStops: ["8A008A", "00D1FF", "FFFFFF"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
