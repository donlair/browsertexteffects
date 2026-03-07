export default {
  key: "decrypt",
  name: "Decrypt",
  description: "Characters appear as if being typed in one by one from a stream of cipher symbols, then all characters simultaneously cycle through random encrypted symbols before resolving to their final form — as if a decryption algorithm is cracking the text in real time.",
  config: [
    {
      name: "typingSpeed",
      type: "number",
      default: "2",
      description: "Number of characters revealed per frame during the initial typing phase.",
    },
    {
      name: "ciphertextColors",
      type: "Color[]",
      default: '["008000", "00cb00", "00ff00"]',
      description: "Colors randomly applied to cipher symbols during the typing and decryption phases.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["eda000"]',
      description: "Color stops for the gradient applied to characters in their final state.",
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
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "decrypt");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "decrypt", {
  typingSpeed: 4,
  ciphertextColors: ["00ffaa", "00cc88"],
  finalGradientStops: ["ff8800", "ffcc00"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
