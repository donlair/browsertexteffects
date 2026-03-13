import { build } from "esbuild";

const cases = [
  {
    name: "root and core exports resolve",
    contents: `
      import { createEffectWith } from "browsertexteffects";
      import { createEffectOnScrollWith } from "browsertexteffects/core";
      console.log(typeof createEffectWith, typeof createEffectOnScrollWith);
    `,
    required: ["dist/index.js", "dist/core.js"],
    forbidden: ["dist/effects/decrypt.js", "dist/effects/matrix.js"],
  },
  {
    name: "direct helper import",
    contents: `
      import { createDecryptEffect } from "browsertexteffects/effects/decrypt";
      console.log(typeof createDecryptEffect);
    `,
    required: ["dist/effects/decrypt.js"],
    forbidden: ["dist/effects/matrix.js", "dist/effects/beams.js"],
  },
  {
    name: "generic core plus one effect",
    contents: `
      import { createEffectWith } from "browsertexteffects";
      import { decryptEffect } from "browsertexteffects/effects/decrypt";
      console.log(typeof createEffectWith, decryptEffect.defaultConfig.typingSpeed);
    `,
    required: ["dist/effects/decrypt.js"],
    forbidden: ["dist/effects/matrix.js", "dist/effects/beams.js"],
  },
  {
    name: "generic core plus two effects",
    contents: `
      import { createEffectWith } from "browsertexteffects";
      import { decryptEffect } from "browsertexteffects/effects/decrypt";
      import { matrixEffect } from "browsertexteffects/effects/matrix";
      console.log(typeof createEffectWith, decryptEffect.defaultConfig.typingSpeed, matrixEffect.defaultConfig.rainTime);
    `,
    required: ["dist/effects/decrypt.js", "dist/effects/matrix.js"],
    forbidden: ["dist/effects/beams.js", "dist/effects/wipe.js"],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyPackageImports() {
  const root = await import("browsertexteffects");
  const core = await import("browsertexteffects/core");
  const decrypt = await import("browsertexteffects/effects/decrypt");

  assert(typeof root.createEffectWith === "function", "root export createEffectWith did not resolve");
  assert(
    typeof core.createEffectOnScrollWith === "function",
    "core export createEffectOnScrollWith did not resolve",
  );
  assert(typeof decrypt.createDecryptEffect === "function", "effect helper export did not resolve");
}

async function verifyBundleCases() {
  for (const testCase of cases) {
    const result = await build({
      stdin: {
        contents: testCase.contents,
        resolveDir: process.cwd(),
        sourcefile: `${testCase.name.replace(/\s+/g, "-")}.js`,
        loader: "js",
      },
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      metafile: true,
    });

    const inputs = Object.keys(result.metafile.inputs);

    for (const required of testCase.required) {
      assert(inputs.some((input) => input.endsWith(required)), `${testCase.name}: missing ${required}`);
    }
    for (const forbidden of testCase.forbidden) {
      assert(!inputs.some((input) => input.endsWith(forbidden)), `${testCase.name}: unexpectedly included ${forbidden}`);
    }
  }
}

await verifyPackageImports();
await verifyBundleCases();
console.log("Bundle checks passed.");
