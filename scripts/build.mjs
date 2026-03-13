import { execFileSync } from "node:child_process";
import { rm, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { build, context } from "esbuild";

const DIST_DIR = "dist";
const WATCH_MODE = process.argv.includes("--watch");

async function collectFiles(dir, predicate, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, predicate, results);
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

function needsJsExtension(specifier) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return false;
  }
  if (specifier.endsWith("/")) {
    return false;
  }
  return extname(specifier) === "";
}

function rewriteModuleSpecifiers(source) {
  return source
    .replace(/(from\s+["'])(\.{1,2}\/[^"']+?)(["'])/g, (match, prefix, specifier, suffix) => {
      if (!needsJsExtension(specifier)) {
        return match;
      }
      return `${prefix}${specifier}.js${suffix}`;
    })
    .replace(/(import\s*\(\s*["'])(\.{1,2}\/[^"']+?)(["']\s*\))/g, (match, prefix, specifier, suffix) => {
      if (!needsJsExtension(specifier)) {
        return match;
      }
      return `${prefix}${specifier}.js${suffix}`;
    });
}

async function rewriteOutputSpecifiers() {
  const outputFiles = await collectFiles(
    DIST_DIR,
    (filePath) => filePath.endsWith(".js") || filePath.endsWith(".d.ts"),
  );

  await Promise.all(
    outputFiles.map(async (filePath) => {
      const original = await readFile(filePath, "utf8");
      const rewritten = rewriteModuleSpecifiers(original);
      if (rewritten !== original) {
        await writeFile(filePath, rewritten);
      }
    }),
  );
}

const rewritePlugin = {
  name: "rewrite-relative-specifiers",
  setup(buildApi) {
    buildApi.onEnd(async (result) => {
      if (result.errors.length > 0) {
        return;
      }
      await rewriteOutputSpecifiers();
    });
  },
};

async function buildJavaScript() {
  const entryPoints = await collectFiles("src", (filePath) => filePath.endsWith(".ts"));
  const buildOptions = {
    entryPoints,
    format: "esm",
    outdir: DIST_DIR,
    outbase: "src",
    platform: "browser",
    plugins: [rewritePlugin],
    write: true,
  };

  if (WATCH_MODE) {
    const buildContext = await context(buildOptions);
    await buildContext.watch();
    console.log("Watching for changes...");
    return;
  }

  await build(buildOptions);
}

async function main() {
  if (!WATCH_MODE) {
    await rm(DIST_DIR, { recursive: true, force: true });
  }

  await buildJavaScript();

  if (!WATCH_MODE) {
    execFileSync("tsc", ["--emitDeclarationOnly"], { stdio: "inherit" });
    await rewriteOutputSpecifiers();
  }
}

await main();
