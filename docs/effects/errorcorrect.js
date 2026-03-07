export default {
  key: "errorcorrect",
  name: "Error Correct",
  description: "A fraction of character pairs are swapped to incorrect positions and highlighted in red, then each pair animates through a block-wipe correction sequence — travelling back to their correct positions and transitioning through green before settling into the final gradient.",
  config: [
    {
      name: "errorPairs",
      type: "number",
      default: "0.1",
      description: "Fraction of characters (0–1.0) to select for pair-swapping. For example, 0.1 pairs up 10% of characters.",
    },
    {
      name: "swapDelay",
      type: "number",
      default: "6",
      description: "Number of frames between successive pair activations.",
    },
    {
      name: "errorColor",
      type: "Color",
      default: '"e74c3c"',
      description: "Color applied to characters while they are in their erroneous (swapped) state.",
    },
    {
      name: "correctColor",
      type: "Color",
      default: '"45bf55"',
      description: "Color applied to characters as they are corrected and return to their proper position.",
    },
    {
      name: "movementSpeed",
      type: "number",
      default: "0.9",
      description: "Speed at which swapped characters travel back to their correct positions.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "FFFFFF"]',
      description: "Color stops for the gradient applied to characters in their final state.",
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
const handle = createEffect(el, "Hello, World!", "errorcorrect");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "errorcorrect", {
  errorPairs: 0.2,
  errorColor: "ff0000",
  correctColor: "00ff88",
  movementSpeed: 1.2,
  finalGradientStops: ["ff8800", "ffcc00"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
