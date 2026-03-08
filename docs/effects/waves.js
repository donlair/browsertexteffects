export default {
  key: "waves",
  name: "Waves",
  description: "Characters animate through a sequence of block symbols to simulate a wave of motion sweeping across the text, then settle into a final gradient color.",
  config: [
    {
      name: "waveSymbols",
      type: "string[]",
      default: '["▁","▂","▃","▄","▅","▆","▇","█","▇","▆","▅","▄","▃","▂","▁"]',
      description: "Sequence of symbols cycled through to produce the wave animation on each character.",
    },
    {
      name: "waveCount",
      type: "number",
      default: "7",
      description: "Number of times the wave symbol sequence repeats on each character before settling.",
    },
    {
      name: "waveFrameDuration",
      type: "number",
      default: "2",
      description: "Number of animation frames each wave symbol is displayed before advancing to the next.",
    },
    {
      name: "waveDirection",
      type: "WaveDirection",
      default: '"column_left_to_right"',
      description: 'Direction the wave sweeps across the text. One of "column_left_to_right", "column_right_to_left", "row_top_to_bottom", "row_bottom_to_top", "center_to_outside", "outside_to_center".',
    },
    {
      name: "waveGradientStops",
      type: "Color[]",
      default: '["f0ff65", "ffb102", "31a0d4", "ffb102", "f0ff65"]',
      description: "Color stops for the gradient applied to characters during the wave animation phase.",
    },
    {
      name: "waveGradientSteps",
      type: "number",
      default: "6",
      description: "Number of interpolation steps between wave gradient color stops.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["ffb102", "31a0d4", "f0ff65"]',
      description: "Color stops for the gradient applied to characters after the wave settles.",
    },
    {
      name: "finalGradientSteps",
      type: "number",
      default: "12",
      description: "Number of interpolation steps between final gradient color stops.",
    },
    {
      name: "waveEasing",
      type: "EasingFunction",
      default: "inOutSine",
      description: "Easing function applied to the wave animation timing.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"diagonal"',
      description: 'Direction of the final gradient. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "waves");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "waves", {
  waveCount: 7,
  waveDirection: "column_left_to_right",
  waveGradientStops: [color("f0ff65"), color("ffb102"), color("31a0d4"), color("ffb102"), color("f0ff65")],
  finalGradientStops: [color("ffb102"), color("31a0d4"), color("f0ff65")],
  finalGradientDirection: "diagonal",
});
handle2.start();`,
};
