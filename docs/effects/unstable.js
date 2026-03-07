export default {
  key: "unstable",
  name: "Unstable",
  description: "Characters begin in jumbled positions and rumble with increasing intensity as they heat up to an unstable orange glow, then explode outward to the canvas edges. After a brief pause, they reassemble back to their correct positions with a final color gradient.",
  config: [
    {
      name: "unstableColor",
      type: "Color",
      default: '"ff9200"',
      description: "Color characters glow during the rumble and explosion phases.",
    },
    {
      name: "explosionEase",
      type: "EasingFunction",
      default: "outExpo",
      description: "Easing function controlling the speed curve of the outward explosion movement.",
    },
    {
      name: "explosionSpeed",
      type: "number",
      default: "1",
      description: "Speed of each character's movement during the explosion phase.",
    },
    {
      name: "reassemblyEase",
      type: "EasingFunction",
      default: "outExpo",
      description: "Easing function controlling the speed curve of the reassembly movement.",
    },
    {
      name: "reassemblySpeed",
      type: "number",
      default: "1",
      description: "Speed of each character's movement during the reassembly phase.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "FFFFFF"]',
      description: "Color stops for the final gradient applied to characters after reassembly.",
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
      description: 'Direction of the final gradient. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "unstable");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "unstable", {
  unstableColor: "ff9200",
  explosionSpeed: 1,
  reassemblySpeed: 1,
  finalGradientStops: ["8A008A", "00D1FF", "FFFFFF"],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
