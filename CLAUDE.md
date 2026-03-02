# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
bun run build        # Build ESM bundle to dist/index.js
bun run dev          # Build with watch mode
```

Uses Bun as both package manager and build tool. Single devDependency: TypeScript.

## Architecture

**Animation pipeline**: Canvas → EffectCharacters → Scenes/Motion → DOMRenderer

- **Canvas** (`src/tte/canvas.ts`): Parses text into a grid of `EffectCharacter` objects. Provides grouping methods (by row, column, diagonal).
- **EffectCharacter** (`src/tte/character.ts`): Individual character with visual state (symbol, color), motion (path-based movement), scenes (animation frames), and events.
- **Scene/Frame** (`src/tte/scene.ts`): Named animation sequences per character. Each scene has frames with visual state + duration. Supports looping.
- **Motion** (`src/tte/motion.ts`): Path-based movement with waypoints, easing, and segment interpolation.
- **DOMRenderer** (`src/tte/renderer.ts`): Two modes — PRE (inline spans) and Absolute (positioned spans). Caches DOM state to minimize updates.

## Effect System

Effects live in `src/tte/effects/`. Each effect:
- Has a config interface with defaults
- Implements a `step()` method returning boolean (animation complete)
- Manages character state transitions through scenes and paths

14 built-in effects: burn, colorshift, decrypt, expand, middleout, pour, print, rain, randomsequence, scattered, slide, sweep, waves, wipe.

## Public API

Entry point: `src/tte/index.ts`. Two main exports:
- `createEffect(container, text, effectName, config?)` — creates and returns an `EffectHandle` with `start()`/`stop()`
- `createEffectOnScroll(container, text, effectName, config?)` — triggers on scroll visibility

## Coordinate System

1-based columns (left-to-right). Rows are **reversed**: top line = highest row number, bottom = 1. This applies to both input positions and animation waypoints.

## Testing

No test framework. Manual testing via HTML demo files (`test.html`, `ansi_art_demo.html`, etc.) opened in browser.
