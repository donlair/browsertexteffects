# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
npm run build        # Build ESM bundle to dist/index.js
npm run dev          # Build with watch mode
```

Uses Node 22+ and npm. Build tool: esbuild. Package manager: npm.

## Architecture

**Animation pipeline**: Canvas → EffectCharacters → Scenes/Motion → DOMRenderer

- **Canvas** (`src/canvas.ts`): Parses text into a grid of `EffectCharacter` objects. Provides grouping methods (by row, column, diagonal).
- **EffectCharacter** (`src/character.ts`): Individual character with visual state (symbol, color), motion (path-based movement), scenes (animation frames), and events.
- **Scene/Frame** (`src/scene.ts`): Named animation sequences per character. Each scene has frames with visual state + duration. Supports looping.
- **Motion** (`src/motion.ts`): Path-based movement with waypoints, easing, and segment interpolation.
- **DOMRenderer** (`src/renderer.ts`): Two modes — PRE (inline spans) and Absolute (positioned spans). Caches DOM state to minimize updates.

## Effect System

Effects live in `src/effects/`. Each effect:
- Has a config interface with defaults
- Implements a `step()` method returning boolean (animation complete)
- Manages character state transitions through scenes and paths

37 built-in effects (see `src/effects/`).

## Public API

Entry point: `src/index.ts`. Two main exports:
- `createEffect(container, text, effectName, config?)` — creates and returns an `EffectHandle` with `start()`/`stop()`
- `createEffectOnScroll(container, text, effectName, config?)` — triggers on scroll visibility

## Coordinate System

1-based columns (left-to-right). Rows are **reversed**: top line = highest row number, bottom = 1. This applies to both input positions and animation waypoints.

## Publishing

npm package: `browsertexteffects`. GitHub repo: `donlair/browsertexteffects`.

```bash
# Bump version in package.json, then:
npm publish --otp=<code>   # 2FA required
```

`prepublishOnly` runs `npm run build` automatically, which bundles with esbuild and generates `.d.ts` files via `tsc --emitDeclarationOnly`.

## Docs / GitHub Pages

Showroom served from `docs/` on `main` branch via GitHub Pages.

```bash
npm run docs:build   # Rebuild docs/lib/bte.js
npm run docs:serve   # Local preview
```

The `docs.yml` GitHub Action auto-rebuilds `docs/lib/bte.js` on push to main.

## Testing

No test framework. Manual testing via HTML demo files (`test.html`, `ansi_art_demo.html`, etc.) opened in browser.
