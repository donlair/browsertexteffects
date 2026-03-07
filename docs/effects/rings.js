export default {
  key: "rings",
  name: "Rings",
  description: "Characters are arranged into concentric spinning rings that alternate clockwise and counter-clockwise rotation. The rings disperse and condense multiple times before characters return to their final positions.",
  config: [
    {
      name: "ringColors",
      type: "Color[]",
      default: '["ab48ff", "e7b2b2", "fffebd"]',
      description: "Colors applied to each ring in order, cycling if there are more rings than colors.",
    },
    {
      name: "ringGap",
      type: "number",
      default: "0.1",
      description: "Gap between rings as a fraction of the smallest canvas dimension. Determines ring spacing density.",
    },
    {
      name: "spinDuration",
      type: "number",
      default: "200",
      description: "Number of frames each spin phase lasts before transitioning to disperse or final.",
    },
    {
      name: "spinSpeed",
      type: "[number, number]",
      default: "[0.25, 1.0]",
      description: "Min and max speed for ring rotation. Each ring gets a random speed within this range.",
    },
    {
      name: "disperseDuration",
      type: "number",
      default: "200",
      description: "Number of frames each disperse phase lasts before transitioning back to spin.",
    },
    {
      name: "spinDisperseCycles",
      type: "number",
      default: "3",
      description: "Number of spin/disperse cycles to complete before the final return-home phase.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["ab48ff", "e7b2b2", "fffebd"]',
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
      default: '"vertical"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "rings");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "rings", {
  ringColors: ["ab48ff", "e7b2b2", "fffebd"],
  ringGap: 0.1,
  spinDuration: 200,
  spinSpeed: [0.25, 1.0],
  disperseDuration: 200,
  spinDisperseCycles: 3,
  finalGradientStops: ["ab48ff", "e7b2b2", "fffebd"],
  finalGradientDirection: "horizontal",
});
handle2.start();`,
};
