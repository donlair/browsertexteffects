export default {
  key: "print",
  name: "Print",
  description: "Characters are typed onto the canvas line by line, simulating a dot-matrix or typewriter printer with a print head that returns to the start of each new line.",
  config: [
    {
      name: "typingSpeed",
      type: "number",
      default: "2",
      description: "Number of characters typed per tick. Higher values make the print head move faster across each line.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["02b8bd", "c1f0e3", "00ffa0"]',
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
      default: '"diagonal"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
    {
      name: "printHeadReturnSpeed",
      type: "number",
      default: "1.5",
      description: "Speed at which the print head travels back to the start of the next line (carriage return).",
    },
    {
      name: "printHeadEasing",
      type: "EasingFunction",
      default: '"inOutQuad"',
      description: "Easing function applied to the print head carriage return movement.",
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "print");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "print", {
  typingSpeed: 3,
  printHeadReturnSpeed: 2,
  finalGradientStops: ["02b8bd", "c1f0e3", "00ffa0"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
