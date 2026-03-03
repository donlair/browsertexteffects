# TTE-JS Porting Tracker

This document tracks the progress of porting effects and engine features from the original Python [terminaltexteffects](https://github.com/ChrisBuilds/terminaltexteffects) project to tte-js.

---

## How to Use This Document

- **Before starting work**: Check this doc for the next priority item and mark it `[~]` (in progress).
- **After completing work**: Mark the item `[x]` (done).
- **When you hit a blocker or discover a new issue**: Add it to the [Issues & Blockers](#issues--blockers) section at the bottom.
- **When you discover a new engine gap**: Add it to [Engine Gaps](#engine-gaps-to-address).
- **When scoping an effect**: Note any engine prerequisites it needs so future work is planned correctly.
- **Keep status current**: Update this doc in the same commit/PR as the code change.

### Status Key

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

---

## Ported Effects (35/37)

- [x] beams
- [x] binarypath
- [x] blackhole
- [x] bouncyballs
- [x] bubbles
- [x] burn
- [x] colorshift
- [x] decrypt
- [x] errorcorrect
- [x] expand
- [x] fireworks
- [x] highlight
- [x] matrix
- [x] middleout
- [x] overflow
- [x] pour
- [x] print
- [x] rain
- [x] randomsequence
- [x] rings
- [x] scattered
- [x] slide
- [x] smoke
- [x] spotlights
- [x] sweep
- [x] unstable
- [x] vhstape
- [x] waves
- [x] wipe

---

## Effects To Port (5 remaining)

### Tier 3 — High Complexity, Unique Value

These need more engine work (multi-layer rendering, complex state machines).

- [x] **synthgrid** — Retro grid aesthetic. Complex but visually distinctive.
- [x] **thunderstorm** — Multi-layered (lightning + rain). Complex but dramatic.

### Tier 4 — Lower Priority

- [x] **beams** — Beams sweep across text.
- [x] **binarypath** — Binary path tree algorithm animation.
- [x] **crumble** — Characters crumble/disintegrate.
- [x] **laseretch** — Laser etching effect.
- [x] **orbittingvolley** — Characters orbit around center.
- [x] **slice** — Slice animation.
- [x] **spray** — Characters spray outward.
- [x] **swarm** — Characters swarm in groups.

---

## Engine Gaps to Address

These are engine-level features present in the Python project that are missing or incomplete in tte-js. Effects that depend on them are noted.

- [x] **Geometry module** — `geometry.ts` committed and integrated. _Required by: fireworks, blackhole, rings, spotlights._
- [x] **Path hold/loop support** — `motion.ts` supports `loop`, `totalLoops`, and `holdDuration` in PathConfig. _Required by: bouncyballs, orbittingvolley._
- [x] **Segment enter/exit events** — `SEGMENT_ENTERED`/`SEGMENT_EXITED` events added to `EventType`. `Path` tracks `currentSegmentIndex`, `character.ts` detects transitions in `tick()`. CallerId format: `"pathId:segmentIndex"`. _Required by: beams, binarypath._
- [x] **Text formatting** — `CharacterVisual` now supports `bold`, `italic`, `dim`, `blink` per-frame. Renderer applies CSS (`font-weight`, `font-style`, `filter: brightness`, CSS animation). _Required by: vhstape, unstable (partially)._
- [x] **Particle system** — `ParticleSystem` class in `particles.ts`. Self-contained DOM span management, independent of `DOMRenderer`. Effects call `emit()` and `tick()` in their `step()`. _Required by: smoke, bubbles, fireworks (partially), spray._
- [x] **Spanning tree algorithms** — `graph.ts` module with `buildCoordMap`, `getNeighbors`, `buildSpanningTree` (parameterized: connectivity, start strategy, weight function). Burn effect refactored to use it. _Required by: blackhole, binarypath._

---

## Issues & Blockers

Track problems encountered during development here. Include the date, context, and resolution (if found).

<!--
Add entries like:

- **2026-03-02** — [effect/module name] Description of the issue.
  - Status: open / resolved
  - Resolution: How it was fixed (if applicable).
-->

_No issues logged yet._

---

## Notes

- The Python project has 3 archived/experimental effects (`spaceflight`, `tesselated`, `worm`) that are not in scope for porting.
- The coordinate system is 1-based columns, reversed rows (top = highest row number). This is already implemented in tte-js.
- The Python project supports XTerm-256 color codes. tte-js uses hex RGB only. Color conversion is not currently planned but could be added if needed.
