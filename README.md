# BrowserTextEffects

37 animated text effects for the browser. Decrypt, matrix, burn, fireworks, rain, and more.

## Install

```bash
npm install browsertexteffects
```

## Usage

```html
<div id="target"></div>
```

```js
import { createEffect } from "browsertexteffects";

const handle = createEffect(
  document.getElementById("target"),
  "Hello, world!",
  "decrypt"
);

handle.start();
```

To trigger an effect when the element scrolls into view:

```js
import { createEffectOnScroll } from "browsertexteffects";

createEffectOnScroll(
  document.getElementById("target"),
  "Hello, world!",
  "matrix"
);
```

### Configuration

Every effect accepts an optional config object:

```js
import { createEffect, defaultDecryptConfig } from "browsertexteffects";

const handle = createEffect(container, text, "decrypt", {
  ...defaultDecryptConfig,
  speed: 2,
  onComplete: () => console.log("done"),
});
```

## Effects

| Effect | Description |
|--------|-------------|
| `beams` | Light beams sweep across text |
| `binarypath` | Binary digits trace paths to form text |
| `blackhole` | Characters spiral into a black hole |
| `bouncyballs` | Characters bounce into position |
| `bubbles` | Text rises into place like bubbles |
| `burn` | Text burns away or into place |
| `colorshift` | Colors shift across the text |
| `crumble` | Text crumbles apart or together |
| `decrypt` | Text decrypts character by character |
| `errorcorrect` | Simulates error correction on text |
| `expand` | Text expands outward from center |
| `fireworks` | Characters burst like fireworks |
| `highlight` | Highlight sweeps across text |
| `laseretch` | Laser etches text into place |
| `matrix` | Matrix-style falling characters |
| `middleout` | Text reveals from the middle outward |
| `orbittingvolley` | Characters orbit before landing |
| `overflow` | Text overflows into position |
| `pour` | Characters pour in from above |
| `print` | Typewriter-style printing |
| `rain` | Characters rain down the screen |
| `randomsequence` | Characters appear in random order |
| `rings` | Ring patterns reveal text |
| `scattered` | Characters scatter and reassemble |
| `slice` | Text slices into view |
| `slide` | Text slides in from a direction |
| `smoke` | Smoky text reveal |
| `spotlights` | Spotlights illuminate text |
| `spray` | Characters spray into place |
| `swarm` | Characters swarm into position |
| `sweep` | A sweep reveals the text |
| `synthgrid` | Synth-wave grid effect |
| `thunderstorm` | Lightning-flash text reveal |
| `unstable` | Text jitters and stabilizes |
| `vhstape` | VHS tape distortion effect |
| `waves` | Wave motion across the text |
| `wipe` | Text wipes on from an edge |

## API

### `createEffect(container, text, effectName, config?)`

Creates an effect and returns an `EffectHandle` with `start()` and `stop()` methods.

### `createEffectOnScroll(container, text, effectName, config?)`

Same as `createEffect`, but automatically starts when the container scrolls into view.

## Credits

TypeScript port of [TerminalTextEffects](https://github.com/ChrisBuilds/terminaltexteffects) by [ChrisBuilds](https://github.com/ChrisBuilds), adapted for the browser.

## License

MIT
