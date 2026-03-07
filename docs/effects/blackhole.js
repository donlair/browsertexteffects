export default {
  key: "blackhole",
  name: "Blackhole",
  description: "Characters are scattered across the canvas as a starfield. A ring of characters forms a rotating blackhole that pulls all remaining stars into its center. The ring then collapses inward and explodes outward, sending characters scattering before they settle into their final positions with a gradient bloom.",
  config: [
    {
      name: "blackholeColor",
      type: "Color",
      default: '"ffffff"',
      description: "Color of the characters forming the blackhole ring.",
    },
    {
      name: "starColors",
      type: "Color[]",
      default: '["ffcc0d", "ff7326", "ff194d", "bf2669", "702a8c", "049dbf"]',
      description: "Colors used for the star and explosion particles.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the gradient applied to characters in their final state.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "9",
      description: "Number of interpolation steps between final gradient color stops.",
    },
    {
      name: "finalGradientFrames",
      type: "number",
      default: "10",
      description: "Number of frames over which each step of the final gradient transition is displayed.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"diagonal"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "blackhole");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "blackhole", {
  blackholeColor: "ff0000",
  finalGradientStops: ["ff0000", "ffaa00", "ffffff"],
  finalGradientDirection: "radial",
});
handle2.start();`,
};
