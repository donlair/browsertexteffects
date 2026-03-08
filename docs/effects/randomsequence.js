export default {
  key: "randomsequence",
  name: "Random Sequence",
  description: "Characters appear in a random order, each fading in from a starting color to their final position color through a gradient transition.",
  config: [
    {
      name: "startingColor",
      type: "Color",
      default: '"000000"',
      description: "Color of each character at the start of its fade-in animation.",
    },
    {
      name: "speed",
      type: "number",
      default: "0.007",
      description: "Fraction of total characters activated per tick. Controls how quickly characters appear. Higher values reveal more characters per frame.",
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
      default: "8",
      description: "Number of animation frames per gradient step in the fade-to-final-color scene.",
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
const handle = createEffect(el, "Hello, World!", "randomsequence");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "randomsequence", {
  startingColor: color("000000"),
  speed: 0.01,
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
