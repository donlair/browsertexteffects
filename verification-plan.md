# TTE-JS Verification Plan

## Context

This plan tracks the systematic verification of the TypeScript port (`tte-js`) against the original Python implementation (`terminaltexteffects`). The goal is to ensure behavioral parity: same visual output, same animation logic, same configuration surface.

Verification proceeds bottom-up through the dependency tree — leaf modules first, composites later. This ensures fixes in foundational modules are in place before verifying higher-level code that depends on them.

Note that the Pythong implementation of the project is in `../terminaltexteffects/`


## How to Use This List

**For review tasks:** When completing a review item, insert correction sub-tasks immediately after the review item (before the next review task). Use the same checkbox format with `[FIX]` prefix. Example:
```
- [x] REVIEW: types.ts — Color, Coord, ColorPair
- [ ] [FIX] types.ts — adjustBrightness() ignores alpha channel
- [ ] [FIX] types.ts — Coord is not frozen/immutable like Python dataclass
- [ ] REVIEW: easing.ts — ...
```

**For fix tasks:** Implement the correction, mark complete, then the next reviewer picks up the next REVIEW item.

**For new discoveries:** If a fix reveals a downstream issue, insert a new REVIEW or FIX task in the appropriate position in the dependency order — not at the end.

---

...

### 6.2 — Extended Effects (added in tte-js)

> Note: Python has 37 effects, TS has 39. Effects below either have Python counterparts or are TS-only additions. Confirm status for each.

- [x] **REVIEW: effects/swarm.ts** vs `effects/swarm.py`
  - [x] [FIX] swarm.ts — base color was cycling deterministically (`baseColors[swarmIdx % len]`); fixed to use `randItem(baseColors)` matching Python's `random.choice()`
  - NOTE: flash scene `sync=Scene.SyncMetric.DISTANCE` (Python) not implemented — covered by GAP: Scene sync modes
- [x] **REVIEW: effects/laseretch.ts** vs `effects/laseretch.py`
  - [x] [FIX] laseretch.ts — `sparkCoolingFrames` default was 8, Python is 7; fixed to 7
  - [x] [FIX] laseretch.ts — `beamGradientSteps` default was 4, Python uses `steps=6`; fixed to 6
  - [x] [FIX] laseretch.ts — `sparkColors` was a hardcoded module-level 2-color array; moved to config as `sparkGradientStops` with Python's 4-color defaults (white, ffe680, ff7b00, 1a0900)
  - [x] [FIX] laseretch.ts — `etchDelay` semantics: Python's `etch_delay=N` means "wait N frames between activations" (period=N+1), but TS used `>=` causing `etchDelay=1` to activate every frame; fixed to `>` with `frameCount` initialized to `etchDelay` so first activation happens immediately like Python
  - NOTE: TS animation model is a creative reinterpretation (beam/sear/final scenes per character), not a faithful port of Python's single spawn scene + separate laser beam entity
  - NOTE: No visual laser beam overlay (Python has a diagonal `/`/`*` char beam that tracks across screen) — significant visual gap
  - NOTE: Spark motion is 1-waypoint diagonal path (TS) vs Bezier to canvas bottom (Python) — covered by GAP: Bezier waypoints
  - NOTE: Spark colors are random-picked from stops (TS) vs gradient-interpolated per spark (Python) — documented in code comment
- [x] **REVIEW: effects/orbittingvolley.ts** vs `effects/orbittingvolley.py`
  - [x] [FIX] orbittingvolley.ts — `delayCounter` was initialized to `config.launchDelay`, causing a full delay before the first volley; Python initializes `_delay = 0` so first volley fires on tick 1; fixed by initializing `delayCounter = 0`
  - NOTE: Launcher motion is a creative reinterpretation — Python has one main launcher traversing only the top edge with other 3 derived geometrically from its progress; TS has all 4 independently orbiting the full perimeter clockwise
  - NOTE: Launcher color — Python maps launcher color to current position via gradient; TS uses a static `launcherColor`
  - NOTE: Character in-flight color — Python sets final gradient color immediately on launch; TS shows `launcherColor` during flight then animates to final color via a "final" scene
  - NOTE: No animated final gradient scene in Python — characters simply appear in their final color on arrival

- [x] **REVIEW: effects/bouncyballs.ts** vs `effects/bouncyballs.py`
  - [x] [FIX] bouncyballs.ts — characters were shuffled globally and released randomly; Python groups by row (sorted ascending = bottom first) and releases each row group in full before starting the next — fixed to match
  - [x] [FIX] bouncyballs.ts — launch height was `dims.top + randInt(3, 8)`; Python uses `int(canvas.top * random.uniform(1.0, 1.5))` — fixed to `Math.round(dims.top * (1 + Math.random() * 0.5))`
  - [x] [FIX] bouncyballs.ts — dead `bounceCount` config (passed as `totalLoops`) had no effect due to `needsLoop` guard for single-segment paths; removed from config — Python uses no bounce count, visual bounce comes entirely from OUT_BOUNCE easing
  - [x] [FIX] bouncyballs.ts — PATH_HOLDING + PATH_COMPLETE both activated "land" scene, causing a reset mid-animation; Python only registers PATH_COMPLETE → final_scene — fixed to PATH_COMPLETE only
  - NOTE: Python pre-activates paths in build(); TS activates in step() when launching — functionally equivalent since pending chars don't tick

---

## Tier 7 — Public API & Integration

### 7.1 — `src/tte/index.ts`

- [x] **REVIEW: index.ts** — Verify public API surface
  - [x] [FIX] index.ts — `createEffectOnScroll` had narrower config type (`EffectConfig`) than `createEffect` (`EffectConfig & { lineHeight?: number; onComplete?: () => void }`); users couldn't pass `lineHeight` or `onComplete` via scroll API — fixed to match
  - [x] [FIX] index.ts — `colorPair`, `rgbInts`, `adjustBrightness` functions and `ColorPair`, `Coord` types were not exported from the public API; consumers needed them for effect configs — added to exports
  - [x] [FIX] index.ts — `EventHandler` class was not exported despite event types being exported; consumers building custom effects couldn't access it — added to exports
  - NOTE: Python has 37 effects, TS also has 37 (plan note said "39" — incorrect)
  - NOTE: `expand` is the final `else` branch (not `else if`) but this is TypeScript-safe since `EffectName` is an exhaustive union; all 37 values are explicitly dispatched
  - NOTE: `createEffect`/`createEffectOnScroll` lifecycle verified: start() is idempotent, stop() is safe, tick() calls step() then render(), onComplete fires after last render
  - NOTE: `createEffectOnScroll` IntersectionObserver verified: fires once (disconnect after trigger), returns handle for external stop()

---

## Known Gaps — Audit Complete

All gaps have been audited against the actual implementation. The original plan descriptions were stale.

- [x] **GAP: Bezier waypoints** — RESOLVED. `Waypoint.bezierControl?: Coord | Coord[]` exists in `motion.ts:4-8`. `Path.addWaypoint(coord, bezierControl?)` calls `findLengthOfBezierCurve()` from geometry.ts for distance calculation. Both single and multi-control-point Bezier curves are supported. Original plan description was incorrect.
- [x] **GAP: Scene sync modes** — RESOLVED. `Scene.sync: SceneSyncMode | null` in `scene.ts` supports "STEP" and "DISTANCE" modes (Python: FRAMERATE/DISTANCE). `character.ts:91-113` handles both sync modes — STEP uses `currentStep/maxSteps` ratio, DISTANCE uses `lastDistanceFactor`. Original plan description was incorrect.
- [x] **GAP: Scene-level easing** — RESOLVED. `Scene.ease: EasingFunction | null` exists in `scene.ts` with `getNextVisualEased()` implementing Python's `_ease_animation()`. `character.ts:115-125` handles the EASE mode separately from default sequential playback. Original plan description was incorrect.
- [x] **GAP: CharacterVisual formatting** — RESOLVED. `CharacterVisual` in `scene.ts:38-50` has all 8 fields: bold, italic, underline, blink, reverse, hidden, dim, strike. `renderer.ts:222-285` applies all — `reverse` is handled at lines 222-225 via fg/bg color swap; the other 7 are applied as CSS at lines 244-285. `RESET_APPEARANCE` action in `character.ts:180-197` clears all fields. Original plan description was incorrect.
- [x] **GAP: Animation RESET_APPEARANCE action** — Present in TS EventHandler (events.ts ActionType). Implemented in character.ts. Resolved.
- [x] **GAP: Multiple spanning tree algorithms** — RESOLVED. `buildSpanningTreeSimple` added to `graph.ts`, faithfully porting Python's `PrimsSimple` (random edge char selection → random neighbor linking). `burn.ts` updated to use it. Coverage:
  - `smoke.py` (PrimsWeighted + BreadthFirst) → TS `buildSpanningTree` with `traversal:"bfs"` ✓
  - `burn.py` (PrimsSimple) → TS `buildSpanningTreeSimple` with `startStrategy:"random"` ✓
  - `laseretch.py` (RecursiveBacktracker) → TS laseretch is a creative reinterpretation; difference is acceptable
  - Python AldousBroder not used by any built-in effect. No action needed.
- [x] **GAP: XTerm 256-color support** — RESOLVED. `xtermToHex(xterm: number): string` added to `types.ts` with full 256-entry lookup table matching Python's `hexterm.xterm_to_hex_map`. `color()` now accepts `string | number` — passing an integer converts via `xtermToHex()`, matching Python's `Color(color_value: int | str)`. `xtermToHex` exported from `index.ts` public API.
