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

## Ported Effects (15/37)

These effects are already implemented in tte-js:

- [x] burn
- [x] colorshift
- [x] decrypt
- [x] expand
- [x] middleout
- [x] pour
- [x] print
- [x] rain
- [x] randomsequence
- [x] scattered
- [x] slide
- [x] sweep
- [x] waves
- [x] wipe

---

## Effects To Port (22 remaining)

### Tier 1 — High Impact, Lower Complexity

These are visually striking and don't require major new engine features.

- [x] **matrix** — Digital rain effect. Iconic, great for demos. Column-based animation with looping scenes and gradient colors. No new engine features needed.
- [ ] **highlight** — Simple color sweep across text. Useful as a subtle, practical effect.
- [ ] **unstable** — Glitchy/jittery text. Trendy aesthetic, likely straightforward.
- [ ] **errorcorrect** — Characters cycle through wrong chars before resolving. Similar pattern to decrypt.
- [ ] **overflow** — Characters overflow the container. Plays well on the web.

### Tier 2 — High Impact, Medium Complexity

These use geometry utilities (circle, distance, Bezier). `geometry.ts` is already started.

- [ ] **fireworks** — Characters launch and explode. Uses Bezier paths + circle geometry.
- [ ] **blackhole** — Characters spiral into center. Uses circle/distance geometry. May need spanning tree.
- [ ] **rings** — Concentric ring animation. Direct use of `findCoordsOnCircle`.
- [ ] **spotlights** — Moving spotlight reveal. Great for web hero sections.
- [ ] **bouncyballs** — Bouncy physics. Needs path loop/hold support.

### Tier 3 — High Complexity, Unique Value

These need more engine work (particle systems, spanning tree algorithms, multi-layer rendering).

- [ ] **smoke** — Particle effect. Requires a basic particle system.
- [ ] **bubbles** — Floating bubble pop. Particle-like behavior.
- [ ] **synthgrid** — Retro grid aesthetic. Complex but visually distinctive.
- [ ] **vhstape** — VHS distortion. Unique retro effect.
- [ ] **thunderstorm** — Multi-layered (lightning + rain). Complex but dramatic.

### Tier 4 — Lower Priority

- [ ] **beams** — Beams sweep across text.
- [ ] **binarypath** — Binary path tree algorithm animation.
- [ ] **crumble** — Characters crumble/disintegrate.
- [ ] **laseretch** — Laser etching effect.
- [ ] **orbittingvolley** — Characters orbit around center.
- [ ] **slice** — Slice animation.
- [ ] **spray** — Characters spray outward.
- [ ] **swarm** — Characters swarm in groups.

---

## Engine Gaps to Address

These are engine-level features present in the Python project that are missing or incomplete in tte-js. Effects that depend on them are noted.

- [x] **Geometry module** — `geometry.ts` committed and integrated. _Required by: fireworks, blackhole, rings, spotlights._
- [ ] **Path hold/loop support** — Python paths support `hold_time` and `loop`. JS `motion.ts` may need these. _Required by: bouncyballs, orbittingvolley._
- [ ] **Segment enter/exit events** — Python has `SEGMENT_ENTERED`/`SEGMENT_EXITED` events. JS only has `PATH_COMPLETE`/`PATH_ACTIVATED`/`PATH_HOLDING`. Some effects chain behavior per-segment. _Required by: beams, binarypath._
- [ ] **Text formatting** — Python supports bold, italic, dim, blink per-frame. JS only tracks symbol + color. Not critical but used by some effects. _Required by: vhstape, unstable (partially)._
- [ ] **Particle system** — Several effects dynamically create/destroy temporary characters. No equivalent in JS yet. _Required by: smoke, bubbles, fireworks (partially), spray._
- [ ] **Spanning tree algorithms** — Used by Python's burn, blackhole, binarypath. JS burn is already ported (may have an inline implementation). Verify if a shared module is needed. _Required by: blackhole, binarypath._

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
