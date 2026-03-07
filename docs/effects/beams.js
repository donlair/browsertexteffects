export default {
  key: "beams",
  name: "Beams",
  description: "Rows and columns of beams sweep across characters, illuminating each one as they pass. Characters fade in beneath the beam, then a final diagonal wipe brightens everything to the target gradient.",
  config: [
    {
      name: "beamRowSymbols",
      type: "string[]",
      default: '["▂", "▁", "_"]',
      description: "Characters used to render horizontal beam animation frames.",
    },
    {
      name: "beamColumnSymbols",
      type: "string[]",
      default: '["▌", "▍", "▎", "▏"]',
      description: "Characters used to render vertical beam animation frames.",
    },
    {
      name: "beamDelay",
      type: "number",
      default: "6",
      description: "Number of frames between successive beam group launches.",
    },
    {
      name: "beamRowSpeed",
      type: "[number, number]",
      default: "[1.5, 6.0]",
      description: "Speed range [min, max] for horizontal beams. Each beam picks a random speed within this range.",
    },
    {
      name: "beamColumnSpeed",
      type: "[number, number]",
      default: "[0.9, 1.5]",
      description: "Speed range [min, max] for vertical beams.",
    },
    {
      name: "beamGradientStops",
      type: "Color[]",
      default: '["ffffff", "00D1FF", "8A008A"]',
      description: "Color stops for the gradient applied to beam animation frames.",
    },
    {
      name: "beamGradientSteps",
      type: "number | number[]",
      default: "[2, 6]",
      description: "Interpolation steps between beam gradient stops. Pass an array to specify per-pair step counts.",
    },
    {
      name: "beamGradientFrames",
      type: "number",
      default: "2",
      description: "Number of animation frames displayed per gradient step in the beam sweep.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the gradient applied to all characters in their final state.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between final gradient stops.",
    },
    {
      name: "finalGradientFrames",
      type: "number",
      default: "4",
      description: "Number of frames over which the final gradient transition is applied.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"vertical"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
    {
      name: "finalWipeSpeed",
      type: "number",
      default: "3",
      description: "Number of diagonal character groups advanced per frame during the final brightening wipe.",
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "beams");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "beams", {
  beamDelay: 3,
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
