# BrowserTextEffects Docs Site — Implementation Plan

Full multi-page vanilla HTML/CSS/JS docs site. Dark GitHub theme. Live demos everywhere.

Modeled after the original [TerminalTextEffects docs](https://chrisbuilds.github.io/terminaltexteffects/), but with live interactive demos instead of GIFs.

## File Structure

```
docs/
  index.html                  Landing page (hero + gallery)
  getting-started.html        Install + basic usage guide
  api.html                    API reference
  effect.html                 Dynamic per-effect template (?name=beams)
  showroom.html               Current showroom (moved from index.html)
  css/
    shared.css                Design tokens, reset, shared components
    nav.css                   Navigation styles
    landing.css               Landing page styles
    docs.css                  Prose page styles (getting-started, api)
    effect.css                Per-effect page styles
    showroom.css              Extracted from current inline <style>
  js/
    nav.js                    Shared nav injection (ES module)
    effect-demo.js            Reusable live demo component
    landing.js                Landing page logic (hero animation, gallery)
    effect-page.js            Per-effect page controller
  effects/
    beams.js ... wipe.js      Per-effect content (37 files)
    _registry.js              Barrel file exporting all effect data
  lib/
    bte.js                    Existing bundled library (unchanged)
```

---

## Task 0: Infrastructure

Shared CSS, nav component, demo component, and showroom migration.

- [ ] **Write** — Create `css/shared.css` (design tokens from showroom), `css/nav.css`, `js/nav.js` (shared nav component), `js/effect-demo.js` (reusable live demo). Move `index.html` → `showroom.html`, extract inline styles to `css/showroom.css`, add shared nav.
- [ ] **Review** — Verify showroom works identically at new URL. Nav renders on showroom. Shared CSS tokens match existing design. Demo component plays/replays correctly.

---

## Task 1: Landing Page (`index.html`)

Hero with live animation, npm install snippet, feature highlights, effect gallery grid.

- [ ] **Write** — Create `index.html`, `css/landing.css`, `js/landing.js`. Sections: hero (live BTE animation on ASCII logo, tagline, install snippet, CTAs), feature grid (3 cards: "37 Effects", "Zero Dependencies", "Simple API"), quick usage (code + live demo), effect gallery (responsive grid of all 37 effects as cards linking to `effect.html?name=<key>`), footer.
- [ ] **Review** — Hero animation plays on load. Install snippet has copy button. Gallery cards link correctly. Responsive on mobile. Nav works.

---

## Task 2: Getting Started (`getting-started.html`)

Installation, basic usage, scroll-triggered effects, custom config.

- [ ] **Write** — Create `getting-started.html`, `css/docs.css`. Sections: installation (`npm install browsertexteffects`), basic usage (`createEffect` + `start()`), custom config (spreading defaults + overriding), scroll-triggered (`createEffectOnScroll`). Include live inline demos accompanying examples.
- [ ] **Review** — Code examples are copy-pasteable and accurate vs `src/index.ts` API. Live demos work. Prose reads well. Responsive.

---

## Task 3: API Reference (`api.html`)

Full public API documentation.

- [ ] **Write** — Create `api.html` (reuses `css/docs.css`). Document: `createEffect(container, text, effectName, config?)` → `EffectHandle`, `createEffectOnScroll(...)` → `EffectHandle`, `EffectHandle` interface (`start()`, `stop()`), all 37 effect names (linking to effect pages), `Color` type + `color()` helper, `GradientDirection` / `EasingFunction` enums, common config patterns (`finalGradientColors`, `finalGradientDirection`, etc.), all `default*Config` exports.
- [ ] **Review** — All documented signatures match actual exports in `src/index.ts`. Effect name links work. Types match `src/types.ts`. Responsive.

---

## Task 4: Effect Page Template (`effect.html`)

Dynamic template and registry barrel file.

- [ ] **Write** — Create `effect.html`, `css/effect.css`, `js/effect-page.js`, `effects/_registry.js`. Template reads `?name=` param, dynamically imports `./effects/${name}.js`. Sections: breadcrumb, effect name + description, "View in Showroom" link, live demo with Play/Replay, usage code example, config reference table (Parameter | Type | Default | Description), prev/next navigation. Each content file exports: `{ key, name, description, config: [{ name, type, default, description }], usage }`. Create `effects/beams.js` as the first content file to test with.
- [ ] **Review** — Template loads `?name=beams` correctly. Config table renders. Live demo plays. Prev/next links work. Invalid `?name=` shows error message. Responsive.

---

## Task 5: Effect — Binary Path (`effects/binarypath.js`)

- [ ] **Write** — Create `effects/binarypath.js` with config docs from `src/effects/binarypath.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=binarypath` loads correctly.

---

## Task 6: Effect — Blackhole (`effects/blackhole.js`)

- [ ] **Write** — Create `effects/blackhole.js` with config docs from `src/effects/blackhole.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=blackhole` loads correctly.

---

## Task 7: Effect — Bouncy Balls (`effects/bouncyballs.js`)

- [ ] **Write** — Create `effects/bouncyballs.js` with config docs from `src/effects/bouncyballs.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=bouncyballs` loads correctly.

---

## Task 8: Effect — Bubbles (`effects/bubbles.js`)

- [ ] **Write** — Create `effects/bubbles.js` with config docs from `src/effects/bubbles.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=bubbles` loads correctly.

---

## Task 9: Effect — Burn (`effects/burn.js`)

- [ ] **Write** — Create `effects/burn.js` with config docs from `src/effects/burn.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=burn` loads correctly.

---

## Task 10: Effect — Color Shift (`effects/colorshift.js`)

- [ ] **Write** — Create `effects/colorshift.js` with config docs from `src/effects/colorshift.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=colorshift` loads correctly.

---

## Task 11: Effect — Crumble (`effects/crumble.js`)

- [ ] **Write** — Create `effects/crumble.js` with config docs from `src/effects/crumble.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=crumble` loads correctly.

---

## Task 12: Effect — Decrypt (`effects/decrypt.js`)

- [ ] **Write** — Create `effects/decrypt.js` with config docs from `src/effects/decrypt.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=decrypt` loads correctly.

---

## Task 13: Effect — Error Correct (`effects/errorcorrect.js`)

- [ ] **Write** — Create `effects/errorcorrect.js` with config docs from `src/effects/errorcorrect.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=errorcorrect` loads correctly.

---

## Task 14: Effect — Expand (`effects/expand.js`)

- [ ] **Write** — Create `effects/expand.js` with config docs from `src/effects/expand.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=expand` loads correctly.

---

## Task 15: Effect — Fireworks (`effects/fireworks.js`)

- [ ] **Write** — Create `effects/fireworks.js` with config docs from `src/effects/fireworks.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=fireworks` loads correctly.

---

## Task 16: Effect — Highlight (`effects/highlight.js`)

- [ ] **Write** — Create `effects/highlight.js` with config docs from `src/effects/highlight.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=highlight` loads correctly.

---

## Task 17: Effect — Laser Etch (`effects/laseretch.js`)

- [ ] **Write** — Create `effects/laseretch.js` with config docs from `src/effects/laseretch.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=laseretch` loads correctly.

---

## Task 18: Effect — Matrix (`effects/matrix.js`)

- [ ] **Write** — Create `effects/matrix.js` with config docs from `src/effects/matrix.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=matrix` loads correctly.

---

## Task 19: Effect — Middle Out (`effects/middleout.js`)

- [ ] **Write** — Create `effects/middleout.js` with config docs from `src/effects/middleout.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=middleout` loads correctly.

---

## Task 20: Effect — Orbitting Volley (`effects/orbittingvolley.js`)

- [ ] **Write** — Create `effects/orbittingvolley.js` with config docs from `src/effects/orbittingvolley.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=orbittingvolley` loads correctly.

---

## Task 21: Effect — Overflow (`effects/overflow.js`)

- [ ] **Write** — Create `effects/overflow.js` with config docs from `src/effects/overflow.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=overflow` loads correctly.

---

## Task 22: Effect — Pour (`effects/pour.js`)

- [ ] **Write** — Create `effects/pour.js` with config docs from `src/effects/pour.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=pour` loads correctly.

---

## Task 23: Effect — Print (`effects/print.js`)

- [ ] **Write** — Create `effects/print.js` with config docs from `src/effects/print.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=print` loads correctly.

---

## Task 24: Effect — Rain (`effects/rain.js`)

- [ ] **Write** — Create `effects/rain.js` with config docs from `src/effects/rain.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=rain` loads correctly.

---

## Task 25: Effect — Random Sequence (`effects/randomsequence.js`)

- [ ] **Write** — Create `effects/randomsequence.js` with config docs from `src/effects/randomsequence.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=randomsequence` loads correctly.

---

## Task 26: Effect — Rings (`effects/rings.js`)

- [ ] **Write** — Create `effects/rings.js` with config docs from `src/effects/rings.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=rings` loads correctly.

---

## Task 27: Effect — Scattered (`effects/scattered.js`)

- [ ] **Write** — Create `effects/scattered.js` with config docs from `src/effects/scattered.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=scattered` loads correctly.

---

## Task 28: Effect — Slice (`effects/slice.js`)

- [ ] **Write** — Create `effects/slice.js` with config docs from `src/effects/slice.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=slice` loads correctly.

---

## Task 29: Effect — Slide (`effects/slide.js`)

- [ ] **Write** — Create `effects/slide.js` with config docs from `src/effects/slide.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=slide` loads correctly.

---

## Task 30: Effect — Smoke (`effects/smoke.js`)

- [ ] **Write** — Create `effects/smoke.js` with config docs from `src/effects/smoke.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=smoke` loads correctly.

---

## Task 31: Effect — Spotlights (`effects/spotlights.js`)

- [ ] **Write** — Create `effects/spotlights.js` with config docs from `src/effects/spotlights.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=spotlights` loads correctly.

---

## Task 32: Effect — Spray (`effects/spray.js`)

- [ ] **Write** — Create `effects/spray.js` with config docs from `src/effects/spray.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=spray` loads correctly.

---

## Task 33: Effect — Swarm (`effects/swarm.js`)

- [ ] **Write** — Create `effects/swarm.js` with config docs from `src/effects/swarm.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=swarm` loads correctly.

---

## Task 34: Effect — Sweep (`effects/sweep.js`)

- [ ] **Write** — Create `effects/sweep.js` with config docs from `src/effects/sweep.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=sweep` loads correctly.

---

## Task 35: Effect — Synth Grid (`effects/synthgrid.js`)

- [ ] **Write** — Create `effects/synthgrid.js` with config docs from `src/effects/synthgrid.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=synthgrid` loads correctly.

---

## Task 36: Effect — Thunderstorm (`effects/thunderstorm.js`)

- [ ] **Write** — Create `effects/thunderstorm.js` with config docs from `src/effects/thunderstorm.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=thunderstorm` loads correctly.

---

## Task 37: Effect — Unstable (`effects/unstable.js`)

- [ ] **Write** — Create `effects/unstable.js` with config docs from `src/effects/unstable.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=unstable` loads correctly.

---

## Task 38: Effect — VHS Tape (`effects/vhstape.js`)

- [ ] **Write** — Create `effects/vhstape.js` with config docs from `src/effects/vhstape.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=vhstape` loads correctly.

---

## Task 39: Effect — Waves (`effects/waves.js`)

- [ ] **Write** — Create `effects/waves.js` with config docs from `src/effects/waves.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=waves` loads correctly.

---

## Task 40: Effect — Wipe (`effects/wipe.js`)

- [ ] **Write** — Create `effects/wipe.js` with config docs from `src/effects/wipe.ts`. Add to `_registry.js`.
- [ ] **Review** — Config matches source defaults. `effect.html?name=wipe` loads correctly.

---

## Design Reference

**Shared nav**: Home | Getting Started | API Reference | Effects (dropdown) | Showroom | GitHub

**CSS tokens** (from existing showroom):
- `--bg-primary: #0d1117`, `--bg-secondary: #161b22`, `--bg-tertiary: #21262d`
- `--border-default: #30363d`, `--accent-blue: #58a6ff`
- `--font-mono: 'JetBrains Mono'`, `--font-sans: system fonts`

**Per-effect content file format**:
```js
// effects/beams.js
export default {
  key: "beams",
  name: "Beams",
  description: "Beams of light sweep across the characters, illuminating them as they pass.",
  config: [
    { name: "beamDelay", type: "number", default: "6", description: "Frames between beam launches." },
    { name: "finalGradientColors", type: "Color[]", default: '["#8A008A", "#00D1FF", "#ffffff"]', description: "Final gradient color stops." },
    // ...
  ],
  usage: `import { createEffect } from "browsertexteffects";\nconst handle = createEffect(el, text, "beams");\nhandle.start();`
};
```

**Key source files**:
- `src/index.ts` — Public API (createEffect, createEffectOnScroll, all config exports)
- `src/types.ts` — Color, GradientDirection, EasingFunction
- `src/effects/*.ts` — Effect configs and defaults
- `docs/index.html` — Current showroom (moving to showroom.html)
