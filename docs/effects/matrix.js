export default {
  key: "matrix",
  name: "Matrix",
  description: "Characters are revealed through a Matrix-style digital rain effect — columns of glowing green symbols cascade downward, then resolve into the final text with a radial gradient.",
  config: [
    {
      name: "rainSymbols",
      type: "string[]",
      default: '["2","5","9","8","Z","*",")",":",".","\\"","=","+","-","¦","|","_","ｦ","ｱ","ｳ","ｴ","ｵ",...]',
      description: "Pool of symbols used during the rain phase. Defaults to a mix of ASCII characters and half-width katakana.",
    },
    {
      name: "rainGradientStops",
      type: "Color[]",
      default: '["92be92", "185318"]',
      description: "Color stops for the gradient used to color rain characters (light to dark green).",
    },
    {
      name: "highlightColor",
      type: "Color",
      default: '"dbffdb"',
      description: "Color of the leading character at the head of each rain column.",
    },
    {
      name: "rainTime",
      type: "number",
      default: "900",
      description: "Number of animation ticks the rain phase lasts before transitioning to the fill phase.",
    },
    {
      name: "columnDelayRange",
      type: "[number, number]",
      default: "[3, 9]",
      description: "Range [min, max] of frames to wait between spawning new rain columns.",
    },
    {
      name: "rainFallDelayRange",
      type: "[number, number]",
      default: "[2, 15]",
      description: "Range [min, max] of frames between each character reveal step within a column.",
    },
    {
      name: "symbolSwapChance",
      type: "number",
      default: "0.005",
      description: "Per-frame probability that a visible rain character randomly swaps to a new symbol.",
    },
    {
      name: "colorSwapChance",
      type: "number",
      default: "0.001",
      description: "Per-frame probability that a visible rain character randomly swaps to a new rain gradient color.",
    },
    {
      name: "resolveDelay",
      type: "number",
      default: "3",
      description: "Number of frames between resolving batches of characters into their final state.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["92be92", "336b33"]',
      description: "Color stops for the final gradient applied to resolved characters.",
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
      default: "3",
      description: "Number of frames each step of the final gradient transition is displayed per character.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"radial"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "matrix");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "matrix", {
  rainTime: 600,
  rainGradientStops: ["00ff41", "003b00"],
  highlightColor: "aaffaa",
  finalGradientStops: ["00ff41", "007a20"],
  finalGradientDirection: "radial",
});
handle2.start();`,
};
