export default {
  key: "smoke",
  name: "Smoke",
  description: "Characters billow in as smoke, transitioning through block shading symbols with a smoky gradient before settling into their final gradient colors.",
  config: [
    {
      name: "startingColor",
      type: "Color",
      default: '"7A7A7A"',
      description: "Color applied to each character at the start of the animation, before the smoke phase begins.",
    },
    {
      name: "smokeSymbols",
      type: "string[]",
      default: '["░", "▒", "▓", "▒", "░"]',
      description: "Sequence of symbols cycled through during the smoke animation phase.",
    },
    {
      name: "smokeGradientStops",
      type: "Color[]",
      default: '["242424", "FFFFFF"]',
      description: "Color stops for the smoke phase gradient, blended with the reversed final gradient stops to produce the full smoke color sequence.",
    },
    {
      name: "useWholeCanvas",
      type: "boolean",
      default: "false",
      description: "No-op in the browser renderer (DOM has no canvas fill characters concept). Included for API parity.",
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
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"vertical"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "smoke");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "smoke", {
  smokeSymbols: ["░", "▒", "▓", "▒", "░"],
  smokeGradientStops: [color("242424"), color("FFFFFF")],
  finalGradientStops: [color("8A008A"), color("00D1FF"), color("FFFFFF")],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
