export default {
  key: "thunderstorm",
  name: "Thunderstorm",
  description: "Characters dim as a storm rolls in, then lightning bolts streak down the canvas with realistic branching, rain falls diagonally, spark particles scatter on impact, and nearby text flashes and glows before the storm clears and characters return to full brightness.",
  config: [
    {
      name: "lightningColor",
      type: "Color",
      default: '"68A3E8"',
      description: "Color of the lightning bolt symbols.",
    },
    {
      name: "glowingTextColor",
      type: "Color",
      default: '"EF5411"',
      description: "Color characters briefly glow after a lightning strike hits nearby.",
    },
    {
      name: "textGlowTime",
      type: "number",
      default: "6",
      description: "Duration in frames of each step in the post-strike text glow gradient.",
    },
    {
      name: "raindropSymbols",
      type: "string[]",
      default: '["\\\\", ".", ","]',
      description: "Symbols used for falling rain drops.",
    },
    {
      name: "sparkSymbols",
      type: "string[]",
      default: '["*", ".", "\'"]',
      description: "Symbols used for lightning impact sparks.",
    },
    {
      name: "sparkGlowColor",
      type: "Color",
      default: '"ff4d00"',
      description: "Color of the glow on spark particles at impact.",
    },
    {
      name: "sparkGlowTime",
      type: "number",
      default: "18",
      description: "Duration in frames of each step in the spark glow gradient.",
    },
    {
      name: "stormDuration",
      type: "number",
      default: "360",
      description: "Number of ticks the storm phase lasts (~12 seconds at 30 fps).",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["8A008A", "00D1FF", "ffffff"]',
      description: "Color stops for the final gradient applied to characters after the storm clears.",
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
      description: "Duration in frames of each step in the final gradient transition.",
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
const handle = createEffect(el, "Hello, World!", "thunderstorm");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "thunderstorm", {
  lightningColor: "68A3E8",
  glowingTextColor: "EF5411",
  stormDuration: 180,
  finalGradientStops: ["8A008A", "00D1FF", "ffffff"],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
