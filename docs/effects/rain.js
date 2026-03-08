export default {
  key: "rain",
  name: "Rain",
  description: "Characters fall from the top of the canvas like raindrops, appearing as rain symbols in blue hues before fading into their final colors at their destination.",
  config: [
    {
      name: "rainSymbols",
      type: "string[]",
      default: '["o", ".", ",", "*", "|"]',
      description: "Characters used to represent falling raindrops. One symbol is chosen randomly per character.",
    },
    {
      name: "rainColors",
      type: "Color[]",
      default: '["00315C", "004C8F", "0075DB", "3F91D9", "78B9F2", "9AC8F5", "B8D8F8", "E3EFFC"]',
      description: "Colors applied to falling raindrops. One color is chosen randomly per character.",
    },
    {
      name: "fallSpeed",
      type: "[number, number]",
      default: "[0.33, 0.57]",
      description: "Min and max speed range for raindrop fall. Each character gets a random speed within this range.",
    },
    {
      name: "fallEasing",
      type: "EasingFunction",
      default: '"inQuart"',
      description: "Easing function applied to the fall movement of each raindrop.",
    },
    {
      name: "charsPerTick",
      type: "number",
      default: "2",
      description: "Number of characters released to fall per animation tick. Controls how fast the rain starts.",
    },
    {
      name: "finalGradientStops",
      type: "Color[]",
      default: '["488bff", "b2e7de", "57eaf7"]',
      description: "Color stops for the gradient applied to characters at their final resting positions.",
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
      description: "Number of animation frames per gradient step in the fade-to-final-color scene.",
    },
    {
      name: "finalGradientDirection",
      type: "GradientDirection",
      default: '"diagonal"',
      description: 'Direction of the final gradient across the canvas. One of "vertical", "horizontal", "radial", "diagonal".',
    },
  ],
  usage: `import { createEffect, color } from "browsertexteffects";

const el = document.getElementById("my-text");
const handle = createEffect(el, "Hello, World!", "rain");
handle.start();

// With custom config:
const handle2 = createEffect(el, "Hello!", "rain", {
  rainSymbols: ["|", "/", "\\\\", "-"],
  fallSpeed: [0.5, 1.0],
  finalGradientStops: [color("488bff"), color("b2e7de"), color("57eaf7")],
  finalGradientDirection: "vertical",
});
handle2.start();`,
};
