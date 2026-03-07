export default {
  key: "binarypath",
  name: "Binary Path",
  description: "Each character's ASCII binary representation travels along a zigzag path from outside the canvas to the character's position. Once all 8 bits arrive, the character collapses into view with a flash, then a diagonal wipe brightens everything to the final gradient.",
  config: [
    {
      name: "binaryColors",
      type: "Color[]",
      default: '["044E29", "157e38", "45bf55", "95ed87"]',
      description: "Colors used for the traveling binary digit characters. Each digit picks a random color from this list.",
    },
    {
      name: "movementSpeed",
      type: "number",
      default: "1",
      description: "Speed at which binary digits travel along their zigzag path toward the target character.",
    },
    {
      name: "activeBinaryGroups",
      type: "number",
      default: "0.08",
      description: "Fraction of total non-space characters that may have active binary groups traveling simultaneously. For example, 0.08 means up to 8% of characters are animating at once.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["00d500", "007500"]',
      description: "Color stops for the gradient applied to all characters in their final state.",
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
      default: "2",
      description: "Number of frames over which each step of the final brightening transition is displayed.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"radial"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
    {
      name: "finalWipeSpeed",
      type: "number",
      default: "2",
      description: "Number of diagonal character groups advanced per frame during the final brightening wipe.",
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "binarypath");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "binarypath", {
  movementSpeed: 2,
  activeBinaryGroups: 0.15,
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
