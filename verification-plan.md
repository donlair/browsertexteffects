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

## Tier 1 — Leaf Modules (No Internal Dependencies)

These have no imports from other `src/tte/` files and must be verified first.

### 1.1 — `src/tte/types.ts`
**Python reference:** `utils/graphics.py` (Color, ColorPair), `utils/geometry.py` (Coord)

- [ ] **REVIEW: types.ts** — Verify `Color`, `ColorPair`, `Coord`, `GradientDirection`, `EasingFunction`, `Grouping`
  - `Color` should represent both hex RGB and support XTerm-256 colors (Python supports both)
  - `Coord` in Python is a frozen hashable dataclass — verify TS equivalent is treated immutably
  - `colorPair()` — Python allows `None` for bg; verify TS handles absent bg
  - `adjustBrightness()` — Verify behavior matches Python's color manipulation
  - `rgbInts()` — Verify parsing of hex strings matches Python `Color.rgb_ints` property

### 1.2 — `src/tte/easing.ts`
**Python reference:** `utils/easing.py`

- [ ] **REVIEW: easing.ts** — Verify all easing functions and tracker classes
  - Python has 30+ easing functions — confirm all are present: linear, sine, quad, cubic, quart, quint, expo, circ, back, elastic, bounce (in/out/in_out variants)
  - `makeEasing(x1, y1, x2, y2)` — Verify cubic Bezier easing matches Python `make_easing()`
  - `EasingTracker` — Verify step tracking logic against Python implementation
  - `SequenceEaser<T>` — Verify generic sequence easing against Python `SequenceEaser`
  - Check for any functions in Python that are absent in TS

### 1.3 — `src/tte/gradient.ts`
**Python reference:** `utils/graphics.py` (Gradient class)

- [ ] **REVIEW: gradient.ts** — Verify Gradient class
  - Python supports VERTICAL, HORIZONTAL, DIAGONAL directions — verify TS supports same (plus "radial" which may be TS-only)
  - `constructor(stops, steps)` — Python `Gradient` takes stops + step counts; verify multi-stop interpolation logic matches
  - `getColorAtFraction()` — Verify linear interpolation of RGB values matches Python
  - `buildCoordinateColorMapping()` — Verify direction-based coordinate mapping matches Python `Gradient` output
  - `coordKey()` — Verify format is consistent across all usages

---

## Tier 2 — Core Animation & Motion

These depend only on Tier 1 modules.

### 2.1 — `src/tte/scene.ts`
**Python reference:** `engine/animation.py` (Scene, Frame, CharacterVisual, Animation)

- [ ] **REVIEW: scene.ts** — Verify Scene, Frame, CharacterVisual
  - `CharacterVisual` — Python has: bold, dim, italic, underline, blink, reverse, hidden, strike. Verify TS covers same set (note: TS may omit underline/reverse/hidden/strike)
  - `Frame.duration` semantics — verify tick counting matches Python
  - `Scene.addFrame()` — verify signature matches Python `add_frame()`
  - `Scene.applyGradientToSymbols()` — verify matches Python `apply_gradient_to_symbols()`
  - `Scene.activate()` → returns first visual; Python `activate()` does same
  - `Scene.isComplete` getter — verify edge cases (empty frames, looping)
  - **Gap check:** Python `Scene` has `sync` (SyncMetric: DISTANCE or FRAMERATE) for motion sync — verify if TS implements this or intentionally omits
  - **Gap check:** Python `Scene` has scene-level `ease` — verify if TS implements scene easing
  - **Gap check:** Python has `Animation` wrapper class managing all scenes; TS uses `character.scenes: Map<string, Scene>` — verify behavioral equivalence

### 2.2 — `src/tte/motion.ts`
**Python reference:** `engine/motion.py` (Motion, Path, Waypoint, Segment)

- [ ] **REVIEW: motion.ts** — Verify Motion, Path, Waypoint, Segment
  - `Waypoint` — Python has optional `bezier_control` coord for Bezier curves; verify if TS supports or intentionally omits
  - `Segment` — Python tracks `enter_event_triggered` / `exit_event_triggered` to avoid duplicate events; verify TS has same guard
  - `Path.step()` — Verify interpolation logic matches Python; check edge cases at path start/end
  - `Path` loop behavior — verify `totalLoops`, `currentLoop` counting matches Python
  - `Path` hold behavior — verify `holdDuration` triggers and `holdElapsed` counting matches Python
  - `Motion.move()` — Verify segment transitions match Python
  - `Motion.movementIsComplete()` — Verify terminal condition matches Python

### 2.3 — `src/tte/events.ts`
**Python reference:** `engine/base_character.py` (EventHandler, Event enum, Action enum)

- [ ] **REVIEW: events.ts** — Verify EventHandler, EventType, ActionType
  - **EventType** — Python has: SEGMENT_ENTERED, SEGMENT_EXITED, PATH_ACTIVATED, PATH_COMPLETE, PATH_HOLDING, SCENE_ACTIVATED, SCENE_COMPLETE. Verify TS covers all 7.
  - **ActionType** — Python has: ACTIVATE_PATH, ACTIVATE_SCENE, DEACTIVATE_PATH, DEACTIVATE_SCENE, RESET_APPEARANCE, SET_LAYER, SET_COORDINATE, CALLBACK. TS has 8 — verify `RESET_APPEARANCE` presence (Python has it, check TS)
  - `EventHandler.register()` — verify signature matches Python `register_event()`
  - `EventHandler.handleEvent()` — verify action dispatch matches Python `_handle_event()`
  - Verify SET_COORDINATE action correctly updates character position

---

## Tier 3 — Character & Canvas

These depend on Tier 1–2 modules.

### 3.1 — `src/tte/character.ts`
**Python reference:** `engine/base_character.py` (EffectCharacter)

- [ ] **REVIEW: character.ts** — Verify EffectCharacter
  - `tick()` — Core method; Python calls `motion.move()` then `animation.step_animation()` each tick; verify TS order and equivalence
  - `isActive` getter — Python determines this from motion and animation state; verify logic matches
  - `layer` — Python uses layer for z-ordering; verify TS `layer` field maps correctly
  - `isVisible` — verify default and toggling behavior
  - **Gap check:** Python has `links` and `neighbors` on EffectCharacter for graph algorithms; verify TS graph module achieves equivalent functionality
  - **Gap check:** Python `Animation` manages `active_scene` and `preexisting_colors` — verify TS character handles these correctly

### 3.2 — `src/tte/canvas.ts`
**Python reference:** `engine/terminal.py` (Canvas, Terminal.get_characters())

- [ ] **REVIEW: canvas.ts** — Verify Canvas, CanvasDimensions
  - Text parsing — verify multi-line text creates correct row/column grid
  - Coordinate system — verify 1-based columns, reversed rows (top = highest row number, bottom = 1) matches Python
  - `getCharactersGrouped()` — verify row/column/diagonal groupings match Python `Terminal.get_characters_sorted()`
  - `CanvasDimensions` — verify all boundary fields (textLeft, textRight, textTop, textBottom) are correct
  - **Gap check:** Python Terminal has `anchor_canvas` and `anchor_text` for positioning — verify if TS handles or defers to DOM

---

## Tier 4 — Utilities

These depend on Tier 1–3 modules.

### 4.1 — `src/tte/geometry.ts`
**Python reference:** `utils/geometry.py`

- [ ] **REVIEW: geometry.ts** — Verify all geometry functions
  - `findCoordsOnCircle()` — verify against Python `find_coords_on_circle()`
  - `findCoordsInCircle()` — verify against Python `find_coords_in_circle()` (ellipse support)
  - `findCoordsInRect()` / `findCoordsOnRect()` — verify against Python `find_coords_in_rect()`
  - `extrapolateAlongRay()` — verify against Python `find_coord_at_distance()`
  - `findCoordOnBezierCurve()` — verify Bezier math against Python
  - `findCoordOnLine()` — verify linear interpolation against Python
  - `findLengthOfBezierCurve()` / `findLengthOfLine()` — verify distance calculations
  - `findNormalizedDistanceFromCenter()` — verify normalization logic
  - **Gap check:** Python functions use `@lru_cache` for performance — verify TS doesn't recompute unnecessarily

### 4.2 — `src/tte/graph.ts`
**Python reference:** `utils/spanningtree/` (5 algorithms)

- [ ] **REVIEW: graph.ts** — Verify spanning tree and graph functions
  - `buildCoordMap()` — verify coord key format is consistent with `gradient.ts` `coordKey()`
  - `getNeighbors()` — verify 4-connectivity and 8-connectivity modes match Python
  - `buildSpanningTree()` — Python has 5 algorithms (Prim's simple, Prim's weighted, BreadthFirst, AldousBroder, RecursiveBacktracker); TS has one — verify which algorithm was ported and that it matches the Python equivalent
  - Verify `StartStrategy` options (bottomCenter, topCenter, center, random, specific char) match Python starting position options
  - Verify `weightFn` parameter allows equivalent weighted traversal

### 4.3 — `src/tte/particles.ts`
**Python reference:** *(no direct equivalent — TS-specific DOM feature)*

- [ ] **REVIEW: particles.ts** — Verify ParticleSystem correctness
  - Verify particles are cleaned up correctly (`ttl` countdown)
  - Verify `emit()` returns a usable EffectCharacter
  - Verify `dispose()` removes all DOM elements
  - Note: No Python equivalent — verify behavior is self-consistent and used correctly by effects that depend on it

---

## Tier 5 — Rendering

### 5.1 — `src/tte/renderer.ts`
**Python reference:** `engine/terminal.py` (Terminal rendering methods)

- [ ] **REVIEW: renderer.ts** — Verify DOMRenderer
  - PRE mode — verify span structure and inline style application
  - Absolute mode — verify positioned span coordinates match canvas grid positions
  - `render()` change detection — verify only dirty characters are updated
  - Color application — verify fg/bg CSS matches Python ANSI color output intent
  - Bold, italic, dim, blink — verify CSS classes/styles match Python `CharacterVisual.format_symbol()`
  - Layer ordering — verify z-index handling matches Python's layer system
  - **Gap check:** Python supports 8-bit XTerm colors and 24-bit RGB — verify TS renderer handles both

---

## Tier 6 — Effects

Each effect must be verified against its Python counterpart. Verify: config defaults, animation logic, character grouping strategy, motion paths, color/gradient usage.

### 6.1 — Classic Effects (original 14)

- [ ] **REVIEW: effects/burn.ts** vs `effects/burn.py`
- [ ] **REVIEW: effects/colorshift.ts** vs `effects/colorshift.py`
- [ ] **REVIEW: effects/decrypt.ts** vs `effects/decrypt.py`
- [ ] **REVIEW: effects/expand.ts** vs `effects/expand.py`
- [ ] **REVIEW: effects/middleout.ts** vs `effects/middleout.py`
- [ ] **REVIEW: effects/pour.ts** vs `effects/pour.py`
- [ ] **REVIEW: effects/print.ts** vs `effects/print.py`
- [ ] **REVIEW: effects/rain.ts** vs `effects/rain.py`
- [ ] **REVIEW: effects/randomsequence.ts** vs `effects/randomsequence.py`
- [ ] **REVIEW: effects/scattered.ts** vs `effects/scatter.py`
- [ ] **REVIEW: effects/slide.ts** vs `effects/slide.py`
- [ ] **REVIEW: effects/sweep.ts** vs `effects/sweep.py`
- [ ] **REVIEW: effects/waves.ts** vs `effects/waves.py`
- [ ] **REVIEW: effects/wipe.ts** vs `effects/wipe.py`

### 6.2 — Extended Effects (added in tte-js)

> Note: Python has 37 effects, TS has 39. Effects below either have Python counterparts or are TS-only additions. Confirm status for each.

- [ ] **REVIEW: effects/matrix.ts** vs `effects/matrix.py`
- [ ] **REVIEW: effects/highlight.ts** vs `effects/highlight.py`
- [ ] **REVIEW: effects/rings.ts** vs `effects/rings.py`
- [ ] **REVIEW: effects/errorcorrect.ts** vs `effects/errorcorrect.py`
- [ ] **REVIEW: effects/unstable.ts** vs `effects/unstable.py`
- [ ] **REVIEW: effects/overflow.ts** vs `effects/overflow.py`
- [ ] **REVIEW: effects/bouncyballs.ts** vs `effects/bouncyballs.py`
- [ ] **REVIEW: effects/fireworks.ts** vs `effects/fireworks.py`
- [ ] **REVIEW: effects/spotlights.ts** vs `effects/spotlights.py`
- [ ] **REVIEW: effects/vhstape.ts** vs `effects/vhstape.py`
- [ ] **REVIEW: effects/blackhole.ts** vs `effects/blackhole.py`
- [ ] **REVIEW: effects/smoke.ts** vs `effects/smoke.py`
- [ ] **REVIEW: effects/bubbles.ts** vs `effects/bubbles.py`
- [ ] **REVIEW: effects/spray.ts** vs `effects/spray.py`
- [ ] **REVIEW: effects/beams.ts** vs `effects/beams.py`
- [ ] **REVIEW: effects/slice.ts** vs `effects/slice.py`
- [ ] **REVIEW: effects/synthgrid.ts** vs `effects/synthgrid.py`
- [ ] **REVIEW: effects/binarypath.ts** vs `effects/binarypath.py`
- [ ] **REVIEW: effects/thunderstorm.ts** vs `effects/thunderstorm.py`
- [ ] **REVIEW: effects/crumble.ts** vs `effects/crumble.py`
- [ ] **REVIEW: effects/swarm.ts** vs `effects/swarm.py`
- [ ] **REVIEW: effects/laseretch.ts** vs `effects/laseretch.py`
- [ ] **REVIEW: effects/orbittingvolley.ts** vs `effects/orbittingvolley.py`

---

## Tier 7 — Public API & Integration

### 7.1 — `src/tte/index.ts`

- [ ] **REVIEW: index.ts** — Verify public API surface
  - `createEffect()` — verify start/stop lifecycle and animation loop
  - `createEffectOnScroll()` — verify IntersectionObserver integration
  - `EffectHandle` interface — verify start/stop are correctly wired
  - All 39 effect configs are exported
  - All utility namespaces are exported (easing, geometry, graph)
  - Verify no Python-only API features are missing that would block effect implementations

---

## Known Gaps to Investigate

These are structural differences identified during codebase exploration. Each must be resolved (either implemented or explicitly documented as intentional omission):

- [ ] **GAP: Bezier waypoints** — Python `Waypoint` has optional `bezier_control`; TS `Waypoint` only has `coord`. Impacts: motion paths in complex effects.
- [ ] **GAP: Scene sync modes** — Python `Scene` has `sync: SyncMetric` (DISTANCE/FRAMERATE) for synchronizing animation to motion. TS Scene lacks this. Impacts: effects that time animation to movement.
- [ ] **GAP: Scene-level easing** — Python `Scene` has its own easing function. Verify if TS effects implement this manually.
- [ ] **GAP: CharacterVisual formatting** — Python supports underline, reverse, hidden, strikethrough. TS supports only bold, italic, dim, blink. Impacts: effects using these styles.
- [ ] **GAP: Multiple spanning tree algorithms** — Python has 5 tree algorithms; TS has 1. Verify effects that use non-default algorithms in Python are still correct.
- [ ] **GAP: Animation RESET_APPEARANCE action** — Python ActionType includes `RESET_APPEARANCE`; verify if present in TS EventHandler.
- [ ] **GAP: XTerm 256-color support** — Python Color supports XTerm-256 codes; TS Color uses hex only. Impacts: any effect using XTerm color codes.
