/**
 * effect-demo.js — Reusable live demo component
 *
 * Mounts a self-contained demo block (animation area + replay button)
 * into a container element. Used on landing, getting-started, api,
 * and per-effect pages.
 *
 * Usage:
 *   import { createDemo } from './js/effect-demo.js';
 *
 *   const demo = createDemo(containerEl, {
 *     text: 'Hello World',
 *     effect: 'beams',
 *     config: {},        // optional, defaults to effect defaults
 *     autoplay: true,    // optional, default true
 *   });
 *
 *   // Later:
 *   demo.destroy();
 */

import { createEffect } from '../lib/bte.js';

/**
 * @param {HTMLElement} container  - Element to mount the demo into
 * @param {object}      options
 * @param {string}      options.text    - Text to animate
 * @param {string}      options.effect  - Effect key (e.g. 'beams')
 * @param {object}      [options.config={}] - Override config for the effect
 * @param {boolean}     [options.autoplay=true] - Start animation immediately
 * @returns {{ replay: () => void, destroy: () => void }}
 */
export function createDemo(container, { text, effect, config = {}, autoplay = true }) {
  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'effect-demo';

  // Animation area
  const area = document.createElement('div');
  area.className = 'effect-demo__area';

  const textEl = document.createElement('div');
  textEl.className = 'effect-demo__text';
  area.appendChild(textEl);
  wrapper.appendChild(area);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'effect-demo__controls';

  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn';
  replayBtn.type = 'button';
  replayBtn.textContent = '↺ Replay';
  controls.appendChild(replayBtn);

  wrapper.appendChild(controls);
  container.appendChild(wrapper);

  let handle = null;

  function play() {
    if (handle) {
      handle.stop();
      handle = null;
    }
    textEl.replaceChildren();
    handle = createEffect(textEl, text, effect, config);
    handle.start();
  }

  replayBtn.addEventListener('click', play);

  if (autoplay) {
    // Use IntersectionObserver to play when first visible
    let played = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !played) {
          played = true;
          play();
          observer.disconnect();
        }
      }
    }, { threshold: 0.1 });
    observer.observe(wrapper);
  }

  return {
    replay() { play(); },
    destroy() {
      if (handle) {
        handle.stop();
        handle = null;
      }
      wrapper.remove();
    },
  };
}
