export default {
  key: "vhstape",
  name: "VHS Tape",
  description: "Simulates the glitchy, degraded look of an old VHS tape. Characters shift horizontally in glitch lines and waves with RGB color fringing, random static noise bursts across the screen, then the tape \"fast-forwards\" into a final gradient reveal.",
  config: [
    {
      name: "glitchLineColors",
      type: "Color[]",
      default: '["ffffff", "ff0000", "00ff00", "0000ff", "ffffff"]',
      description: "Color sequence cycled through during glitch line animations, producing an RGB fringe effect.",
    },
    {
      name: "glitchWaveColors",
      type: "Color[]",
      default: '["ffffff", "ff0000", "00ff00", "0000ff", "ffffff"]',
      description: "Color sequence used for glitch wave animations.",
    },
    {
      name: "noiseColors",
      type: "Color[]",
      default: '["1e1e1f", "3c3b3d", "6d6c70", "a2a1a6", "cbc9cf", "ffffff"]',
      description: "Color palette for the static/snow noise characters that appear during noise bursts.",
    },
    {
      name: "glitchLineChance",
      type: "number",
      default: "0.05",
      description: "Probability per frame that a random line will glitch horizontally. Range 0–1.",
    },
    {
      name: "noiseChance",
      type: "number",
      default: "0.004",
      description: "Probability per frame that a full-screen static noise burst will occur. Range 0–1.",
    },
    {
      name: "totalGlitchTime",
      type: "number",
      default: "600",
      description: "Number of animation frames spent in the glitching phase before transitioning to noise and redraw.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["ab48ff", "e7b2b2", "fffebd"]',
      description: "Color stops for the final gradient applied to characters after the tape redraw phase.",
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
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "vhstape");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "vhstape", {
  glitchLineChance: 0.05,
  noiseChance: 0.004,
  totalGlitchTime: 600,
  finalGradientStops: [color("ab48ff"), color("e7b2b2"), color("fffebd")],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
