export default {
  key: "laseretch",
  name: "Laser Etch",
  description: "A laser beam traverses the text in a depth-first spanning tree order, etching each character into existence with sparks and a glowing cool-down animation before settling into a final gradient.",
  config: [
    {
      name: "etchSpeed",
      type: "number",
      default: "1",
      description: "Number of characters etched per activation frame.",
    },
    {
      name: "etchDelay",
      type: "number",
      default: "1",
      description: "Number of frames to wait between each character activation.",
    },
    {
      name: "beamGradientStops",
      type: "Color[]",
      default: '["ffffff", "376cff"]',
      description: "Color stops for the laser beam gradient that cycles across the beam length.",
    },
    {
      name: "beamGradientSteps",
      type: "number",
      default: "6",
      description: "Number of interpolation steps between beam gradient color stops.",
    },
    {
      name: "beamFrameDuration",
      type: "number",
      default: "3",
      description: "Number of frames each color phase of the beam animation is displayed.",
    },
    {
      name: "sparkSymbols",
      type: "string[]",
      default: '[".", ",", "*"]',
      description: "Pool of symbols randomly chosen for spark particles emitted at the laser contact point.",
    },
    {
      name: "sparkGradientStops",
      type: "Color[]",
      default: '["ffffff", "ffe680", "ff7b00", "1a0900"]',
      description: "Color stops for the spark cooling gradient, transitioning from white-hot to dark ember.",
    },
    {
      name: "sparkCoolingFrames",
      type: "number",
      default: "7",
      description: "Number of frames each spark color phase is displayed as the spark cools.",
    },
    {
      name: "coolGradientStops",
      type: "Color[]",
      default: '["ffe680", "ff7b00"]',
      description: "Color stops for the cool-down gradient blended with the final color as each etched character settles.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the final gradient applied to all characters in their settled state.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "8",
      description: "Number of interpolation steps between final gradient color stops.",
    },
    {
      name: "finalGradientFrames",
      type: "number",
      default: "4",
      description: "Number of frames each step of the final gradient transition is displayed.",
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
const handle = createEffect(el, "Hello, World!", "laseretch");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "laseretch", {
  etchSpeed: 2,
  etchDelay: 0,
  beamGradientStops: ["ffffff", "ff4400"],
  sparkGradientStops: ["ffffff", "ffaa00", "ff2200", "220000"],
  finalGradientStops: ["ff0080", "8000ff"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
