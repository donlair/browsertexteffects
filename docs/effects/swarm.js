export default {
  key: "swarm",
  name: "Swarm",
  description: "Characters form swarms that sweep across the canvas in coordinated groups, flashing through colors before landing in their final gradient positions.",
  config: [
    {
      name: "baseColors",
      type: "Color[]",
      default: '["31a0d4"]',
      description: "Colors randomly assigned to swarms during their flight animation.",
    },
    {
      name: "flashColor",
      type: "Color",
      default: '"f2ea79"',
      description: "Color characters flash when entering a new swarm area or landing at their final position.",
    },
    {
      name: "swarmSize",
      type: "number",
      default: "0.1",
      description: "Fraction of total characters included in each swarm group (e.g. 0.1 = 10% of characters per swarm).",
    },
    {
      name: "swarmCoordination",
      type: "number",
      default: "0.8",
      description: "Probability (0–1) that a swarm member follows the group leader when it advances to the next area. Higher values produce tighter, more synchronized swarms.",
    },
    {
      name: "swarmAreaCountRange",
      type: "[number, number]",
      default: "[2, 4]",
      description: "Min and max number of intermediate areas each swarm visits before characters land at their final positions.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["31b900", "f0ff65"]',
      description: "Color stops for the gradient applied to characters at their final resting positions.",
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
      default: '"horizontal"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "swarm");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "swarm", {
  baseColors: [color("31a0d4"), color("8A008A")],
  flashColor: color("f2ea79"),
  swarmSize: 0.15,
  swarmCoordination: 0.9,
  finalGradientStops: [color("31b900"), color("f0ff65")],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
