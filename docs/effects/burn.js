export default {
  key: "burn",
  name: "Burn",
  description: "Characters ignite and burn through a fire gradient, spreading via a spanning tree from a random start point. Smoke particles drift upward as each character burns away before settling into a final gradient.",
  config: [
    {
      name: "burnSymbols",
      type: "string[]",
      default: `["'", ".", "▖", "▙", "█", "▜", "▀", "▝", "."]`,
      description: "Symbols cycled through during the burn animation to simulate fire.",
    },
    {
      name: "burnFrameDuration",
      type: "number",
      default: "4",
      description: "Number of frames each burn symbol is displayed before advancing to the next.",
    },
    {
      name: "burnColors",
      type: "Color[]",
      default: '["ffffff", "fff75d", "fe650d", "8A003C", "510100"]',
      description: "Color stops for the fire gradient applied during the burn phase, from bright white through orange to deep red.",
    },
    {
      name: "startingColor",
      type: "Color",
      default: '"837373"',
      description: "Initial color applied to all characters before they ignite.",
    },
    {
      name: "smokeChance",
      type: "number",
      default: "0.5",
      description: "Probability (0–1) that a smoke particle is emitted when a character finishes burning.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["00c3ff", "ffff1c"]',
      description: "Color stops for the gradient applied to characters after they finish burning.",
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
      default: "4",
      description: "Number of frames used to transition each character into its final gradient color.",
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
const handle = createEffect(el, "Hello, World!", "burn");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "burn", {
  burnColors: [color("ffff00"), color("ff8800"), color("ff0000"), color("880000")],
  smokeChance: 0.8,
  finalGradientStops: [color("00c3ff"), color("ffff1c")],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
