export default {
  key: "fireworks",
  name: "Fireworks",
  description: "Characters are grouped into shells that launch from the bottom of the canvas, explode at a random apex, and rain down to their final positions — each shell bursting with a distinct color and transitioning through a final gradient.",
  config: [
    {
      name: "explodeAnywhere",
      type: "boolean",
      default: "false",
      description: "When true, shells may explode at any row; when false, the apex is constrained to be above the characters in that shell.",
    },
    {
      name: "fireworkColors",
      type: "Color[]",
      default: '["88F7E2", "44D492", "F5EB67", "FFA15C", "FA233E"]',
      description: "Pool of colors randomly assigned to each shell's launch, bloom, and fall animations.",
    },
    {
      name: "fireworkSymbol",
      type: "string",
      default: '"o"',
      description: "Symbol displayed for the rising shell before it explodes.",
    },
    {
      name: "fireworkVolume",
      type: "number",
      default: "0.05",
      description: "Fraction of total characters per shell. Smaller values create more shells with fewer characters each.",
    },
    {
      name: "launchDelay",
      type: "number",
      default: "45",
      description: "Base number of frames between successive shell launches (randomized ±50%).",
    },
    {
      name: "explodeDistance",
      type: "number",
      default: "0.2",
      description: "Explosion radius as a fraction of canvas width. Controls how far characters scatter from the apex.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the gradient applied to characters in their final settled state.",
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
const handle = createEffect(el, "Hello, World!", "fireworks");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "fireworks", {
  fireworkColors: [color("ff0000"), color("ff8800"), color("ffff00")],
  launchDelay: 30,
  explodeDistance: 0.3,
  finalGradientStops: [color("ff0080"), color("8000ff")],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
